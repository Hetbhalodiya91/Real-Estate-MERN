import Inquiry from "../model/inquiry.model.js";
import Property from "../model/property.model.js";

export const sendInquiry = async (req, res) => {
  try {
    const { propertyId, message } = req.body;
    const property = await Property.findById(propertyId).populate("seller");

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    const inquiry = await Inquiry.create({
      property: property._id,
      buyer: req.user._id,
      seller: property.seller._id,
      message,
    });

    res.status(201).json({
      success: true,
      message: "Inquiry sent successfully",
      inquiry,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getSellerInquiries = async (req, res) => {
  try {
    const inquiries = await Inquiry.find({
      seller: req.user._id,
    })
      .populate("buyer", "name email phone")
      .populate("property", "title price images city")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: inquiries.length,
      inquiries,
    });
  } catch (err) {
    res.status(500).json({
      success: true,
      message: err.message,
    });
  }
};

export const getBuyerInquiries = async (req, res) => {
  try {
    const inquiries = await Inquiry.find({ buyer: req.user._id })
      .populate("seller", "name email")
      .populate("property", "title price images city")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: inquiries.length, inquiries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const replyToInquiry = async (req, res) => {
  try {
    const reply = req.body.reply?.trim();
    if (!reply) {
      return res.status(400).json({
        success: false,
        message: "Reply cannot be empty",
      });
    }

    const inquiry = await Inquiry.findOne({
      _id: req.params.id,
      seller: req.user._id,
    });
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    inquiry.sellerReply = reply;
    inquiry.repliedAt = new Date();
    inquiry.isRead = true;
    await inquiry.save();

    res.json({
      success: true,
      message: "Reply sent successfully",
      inquiry,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }
    if (
      req.user.role !== "admin" &&
      inquiry.seller.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot update this inquiry",
      });
    }
    inquiry.isRead = true;
    await inquiry.save();

    res.json({
      success: true,
      message: "Marked as read",
    });
  } catch (err) {
    res.status(500).json({
      success: true,
      message: err.message,
    });
  }
};
