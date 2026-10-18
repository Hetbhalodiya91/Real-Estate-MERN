import Wishlist from "../model/wishlist.model.js";
import Property from "../model/property.model.js";

export const addWishlist = async (req, res) => {
  try {
    const propertyId = req.params.propertyId;
    const property = await Property.findOne({
      _id: propertyId,
      verificationStatus: "APPROVED",
      status: "sale",
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Approved property not found",
      });
    }

    const existing = await Wishlist.findOne({
      user: req.user._id,
      property: propertyId,
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Already in wishlist",
      });
    }

    await Wishlist.create({
      user: req.user._id,
      property: propertyId,
    });

    res.status(201).json({
      success: true,
      message: "Added to wishlist",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Get all wishlist properties of logged-in user

export const getWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.find({
      user: req.user._id,
    }).populate({
      path: "property",
      match: { verificationStatus: "APPROVED", status: "sale" },
    });

    return res.status(200).json(wishlist.filter((item) => item.property));
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const removeWishlist = async (req, res) => {
  try {
    const { propertyId } = req.params;

    const result = await Wishlist.findOneAndDelete({
      user: req.user._id,
      property: propertyId,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Wishlist item not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Removed from wishlist",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
