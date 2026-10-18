import Property from "../model/property.model.js";
import Inquiry from "../model/inquiry.model.js";
import { uploadToCloudinary } from "../util/uploadToCloudinary.js";
import jwt from "jsonwebtoken";
import { STATES } from "mongoose";

export const addProperty = async (req, res) => {
  try {
    let imageUrls = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.buffer, "properties");

        imageUrls.push(result.secure_url);
      }
    }
    console.log("1");
    const property = await Property.create({
      title: req.body.title,
      description: req.body.description,
      price: Number(req.body.price),
      city: req.body.city,
      area: req.body.area,
      pincode: req.body.pincode,
      propertyType: req.body.propertyType,
      bhk: req.body.bhk ? String(req.body.bhk) : undefined,
      bathrooms: req.body.bathrooms ? Number(req.body.bathrooms) : undefined,
      areaSize: req.body.areaSize ? Number(req.body.areaSize) : undefined,
      furnishing: req.body.furnishing || undefined,
      status: "sale",
      listingType: req.body.listingType || "sale",
      images: imageUrls,
      seller: req.user._id,
      amenities: req.body.amenities
        ? Array.isArray(req.body.amenities)
          ? req.body.amenities
          : (() => {
              try {
                return JSON.parse(req.body.amenities);
              } catch (e) {
                return req.body.amenities.split(",");
              }
            })()
        : [],
      // Payment and verification status initialized
      paymentStatus: "PENDING",
      verificationStatus: "PENDING",
      // The fee is recorded only after the Razorpay payment is verified.
      listingFee: 0,
    });

    res.status(200).json({
      success: true,
      property,
      message:
        "Property created successfully. Please complete payment to proceed with admin verification.",
    });
  } catch (error) {
    console.error("ADD_PROPERTY_ERROR:", error);
    const statusCode = ["ValidationError", "CastError"].includes(error.name)
      ? 400
      : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Internal server error while adding property",
    });
  }
};

export const getMyProperty = async (req, res) => {
  try {
    const properties = await Property.find({
      seller: req.user._id,
    });

    res.json({
      success: true,
      properties,
    });
  } catch (error) {
    console.error("ADD_PROPERTY_ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error while adding property",
    });
  }
};

export const getMyPropertyDetails = async (req, res) => {
  try {
    const property = await Property.findOne({
      _id: req.params.id,
      seller: req.user._id,
    }).populate("seller", "name email phone profilePic");

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found for this seller",
      });
    }

    return res.status(200).json({ success: true, property });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to load property details",
    });
  }
};

// UPDATE PROPERTY
export const updateProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (property.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const fields = [
      "title",
      "description",
      "price",
      "city",
      "area",
      "pincode",
      "propertyType",
      "bhk",
      "bathrooms",
      "areaSize",
      "furnishing",
      "status",
      "listingType",
      "amenities",
    ];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "amenities" && typeof req.body[field] === "string") {
          try {
            property[field] = JSON.parse(req.body[field]);
          } catch (e) {
            property[field] = req.body[field].split(",");
          }
        } else {
          property[field] = req.body[field];
        }
      }
    });

    if (req.body.existingImages) {
      try {
        const existing = JSON.parse(req.body.existingImages);
        property.images = Array.isArray(existing) ? existing : property.images;
      } catch (e) {
        console.error("Failed to parse existingImages:", e);
      }
    }

    if (req.files && req.files.length > 0) {
      let newImages = [];
      for (let file of req.files) {
        const result = await uploadToCloudinary(file.buffer, "properties");
        newImages.push(result.secure_url);
      }
      property.images = [...property.images, ...newImages];
    }

    await property.save();

    res.json({
      success: true,
      message: "Property updated",
      property,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ALL PROPERTIES
export const getAllProperties = async (req, res) => {
  try {
    const {
      city,
      area,
      pincode,
      propertyType,
      bhk,
      furnishing,
      status,
      listingType,
      minPrice,
      maxPrice,
      amenities,
      sort,
      seller,
    } = req.query;

    let query = {
      status: "sale",
      verificationStatus: "APPROVED",
    };

    if (seller) query.seller = seller;
    if (city) query.city = new RegExp(city, "i");
    if (area) query.area = new RegExp(area, "i");
    if (pincode) query.pincode = pincode;

    if (propertyType) {
      query.propertyType = { $in: propertyType.toLowerCase().split(",") };
    }
    if (bhk) {
      if (bhk === "5+") {
        query.bhk = { $gte: "5" };
      } else {
        query.bhk = bhk;
      }
    }
    if (furnishing) {
      const furnishingArray = furnishing.split(",");
      query.furnishing = {
        $in: furnishingArray.map((f) => new RegExp(`^${f.trim()}$`, "i")),
      };
    }
    if (status) query.status = status;
    if (listingType) query.listingType = listingType;

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice && !isNaN(minPrice)) query.price.$gte = Number(minPrice);
      if (maxPrice && !isNaN(maxPrice)) query.price.$lte = Number(maxPrice);
      if (Object.keys(query.price).length === 0) delete query.price;
    }

    if (amenities) {
      query.amenities = {
        $in: amenities.split(",").map((a) => a.trim()),
      };
    }

    let sortOption = { createdAt: -1 };
    if (sort === "priceLow") sortOption = { price: 1 };
    if (sort === "priceHigh") sortOption = { price: -1 };
    if (sort === "latest") sortOption = { createdAt: -1 };

    const properties = await Property.find(query)
      .populate("seller", "name phone profilePic")
      .sort(sortOption);

    res.json({
      success: true,
      count: properties.length,
      properties,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching properties",
      error: error.message,
    });
  }
};

// delete a property

export const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property is not found",
      });
    }

    if (property.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not Authorized",
      });
    }

    for (let imageUrl of property.images) {
      const publicId = imageUrl.split("/").pop().split(".")[0];

      await cloudinary.uploader.destroy("properties/" + publicId);
    }

    // Delete property from MongoDB
    await property.deleteOne();

    res.status(200).json({
      success: true,
      message: "Property deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching properties",
      error: error.message,
    });
  }
};

// update status

export const updatePropertyStatus = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Check ownership
    if (property.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not Authorized",
      });
    }

    property.status = req.body.status;

    await property.save();

    res.status(200).json({
      success: true,
      message: "Property status updated successfully",
      property,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getPropertyDetails = async (req, res) => {
  try {
    const property = await Property.findOne({
      _id: req.params.id,
      verificationStatus: "APPROVED",
    }).populate("seller", "name email phone profilePic");

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    let visitorId = req.ip;

    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded?.id) {
          visitorId = decoded.id;
        }
      } catch (err) {
        console.log("Invalid token, using IP address");
      }
    }

    const sellerId = property.seller?._id?.toString();
    const visitorIdString = visitorId?.toString();

    const isSellerChecking =
      sellerId && visitorIdString ? sellerId === visitorIdString : false;

    const alreadyViewed = Array.isArray(property.viewedBy)
      ? property.viewedBy.some((id) => id?.toString() === visitorIdString)
      : false;

    if (!isSellerChecking && !alreadyViewed && visitorIdString) {
      property.views = (property.views || 0) + 1;

      if (!Array.isArray(property.viewedBy)) {
        property.viewedBy = [];
      }

      property.viewedBy.push(visitorIdString);

      await property.save();
    }

    const similarProperties = await Property.find({
      _id: { $ne: property._id },
      city: property.city,
      propertyType: property.propertyType,
      status: property.status,
      verificationStatus: "APPROVED",
    })
      .limit(4)
      .select("title price images city area propertyType bhk areaSize status");

    return res.status(200).json({
      success: true,
      property,
      similarProperties,
    });
  } catch (error) {
    console.error("GET_PROPERTY_DETAILS_ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// seller dashboard
export const getSellerDashboard = async (req, res) => {
  try {
    const sellerId = req.user._id;

    const totalProperties = await Property.countDocuments({
      seller: sellerId,
    });

    const activeListings = await Property.countDocuments({
      seller: sellerId,
      status: "sale",
    });

    const soldProperties = await Property.countDocuments({
      seller: sellerId,
      status: "sold",
    });

    const totalInquiries = await Inquiry.countDocuments({ seller: sellerId });

    const viewData = await Property.aggregate([
      { $match: { seller: sellerId } },
      { $group: { _id: null, totalViews: { $sum: "$views" } } },
    ]);

    const totalViews = viewData.length > 0 ? viewData[0].totalViews : 0;

    res.json({
      success: true,
      STATES: {
        totalProperties,
        activeListings,
        soldProperties,
        totalInquiries,
        totalViews,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// get property counts by type
export const getPropertyCounts = async (req, res) => {
  try {
    const counts = await Property.aggregate([
      { $match: { status: "sale" } },
      {
        $group: {
          _id: "$propertyType",
          count: { $sum: 1 },
        },
      },
    ]);

    const formattedCounts = counts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    res.json({
      success: true,
      counts: formattedCounts,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
