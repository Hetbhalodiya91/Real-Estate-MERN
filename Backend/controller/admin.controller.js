import User from "../model/userModel.js";
import Property from "../model/property.model.js";
import Inquiry from "../model/inquiry.model.js";
import Payment from "../model/payment.model.js";
import Razorpay from "razorpay";
import sendEmail from "../util/sendEmail.js";

const LISTING_FEE = Number(process.env.PROPERTY_LISTING_FEE || "499");

const escapeHtml = (value = "") =>
  String(value).replace(/[&<>\"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '\"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

export const blockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    user.isBlock = !user.isBlock;
    await user.save();

    res.json({
      success: true,
      message: user.isBlock ? "User Blocked" : "User Unblocked",
      isBlock: user.isBlock,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

export const getAllProperties = async (req, res) => {
  try {
    const properties = await Property.find().populate(
      "seller",
      "name email phone",
    );

    res.json({
      success: true,
      count: properties.length,
      properties,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

export const deleteProperty = async (req, res) => {
  try {
    await Property.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: "Property Deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

export const updatePropertyVerification = async (req, res) => {
  try {
    const { status } = req.body;
    const reason =
      typeof req.body.reason === "string" ? req.body.reason.trim() : "";
    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Verification status must be APPROVED or REJECTED",
      });
    }

    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (property.paymentStatus !== "PAID") {
      return res.status(400).json({
        success: false,
        message: "The listing fee must be paid before verification",
      });
    }

    let refundPayment;
    let refund;
    if (status === "REJECTED") {
      if (!reason) {
        return res.status(400).json({
          success: false,
          message: "A rejection reason is required",
        });
      }
      if (reason.length > 1000) {
        return res.status(400).json({
          success: false,
          message: "Rejection reason must be 1000 characters or fewer",
        });
      }

      refundPayment = await Payment.findOne({
        property: property._id,
        status: "SUCCESS",
      }).sort({ paidAt: -1 });
      if (!refundPayment?.transactionId) {
        return res.status(400).json({
          success: false,
          message:
            "A verified Razorpay payment is required to refund this listing",
        });
      }
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return res.status(503).json({
          success: false,
          message: "Razorpay credentials are not configured on the server",
        });
      }

      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
      refund = await razorpay.payments.refund(refundPayment.transactionId, {
        amount: Math.round(refundPayment.amount * 100),
        notes: { propertyId: String(property._id), reason },
      });

      refundPayment.status = "REFUNDED";
      refundPayment.refundId = refund.id;
      refundPayment.refundReason = reason;
      refundPayment.refundedAt = refund.created_at
        ? new Date(refund.created_at * 1000)
        : new Date();
      await refundPayment.save();
      property.rejectionReason = reason;
      property.paymentStatus = "REFUNDED";
    }

    property.verificationStatus = status;
    property.isVerified = status === "APPROVED";
    await property.save();

    let notificationSent = null;
    if (status === "REJECTED") {
      const seller = await User.findById(property.seller).select("name email");
      if (seller?.email) {
        try {
          await sendEmail({
            to: seller.email,
            subject: `Listing rejected: ${property.title}`,
            text: `<p>Hello ${escapeHtml(seller.name || "Seller")},</p><p>Your property listing <strong>${escapeHtml(property.title)}</strong> was rejected.</p><p><strong>Reason:</strong> ${escapeHtml(reason)}</p><p>Your listing fee refund has been initiated to your original payment account. It should appear within 2-3 working days.</p>`,
          });
          notificationSent = true;
        } catch (emailError) {
          console.error("PROPERTY_REJECTION_EMAIL_ERROR:", emailError);
          notificationSent = false;
        }
      } else {
        notificationSent = false;
      }
    }

    res.json({
      success: true,
      message:
        status === "REJECTED"
          ? notificationSent
            ? "Property rejected, refund initiated, and seller notified by email"
            : "Property rejected and refund initiated, but seller email could not be sent"
          : `Property ${status.toLowerCase()} successfully`,
      property,
      notificationSent,
      refundId: refund?.id,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getAllInquiries = async (req, res) => {
  try {
    const inquiries = await Inquiry.find()
      .populate("buyer", "name email")
      .populate("seller", "name email")
      .populate("property", "title price")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: inquiries.length,
      inquiries,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const [pendingSellers, propertyTotals, paymentTotals] = await Promise.all([
      User.countDocuments({ role: "seller", isApproved: false }),
      Property.aggregate([
        {
          $addFields: {
            normalizedVerificationStatus: {
              $toUpper: {
                $ifNull: [
                  "$verificationStatus",
                  { $cond: ["$isVerified", "APPROVED", "PENDING"] },
                ],
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            totalProperties: { $sum: 1 },
            pendingVerifications: {
              $sum: {
                $cond: [
                  { $eq: ["$normalizedVerificationStatus", "PENDING"] },
                  1,
                  0,
                ],
              },
            },
            approvedProperties: {
              $sum: {
                $cond: [
                  { $eq: ["$normalizedVerificationStatus", "APPROVED"] },
                  1,
                  0,
                ],
              },
            },
            rejectedProperties: {
              $sum: {
                $cond: [
                  { $eq: ["$normalizedVerificationStatus", "REJECTED"] },
                  1,
                  0,
                ],
              },
            },
            activeListings: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$normalizedVerificationStatus", "APPROVED"] },
                      { $eq: ["$status", "sale"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            soldProperties: {
              $sum: { $cond: [{ $eq: ["$status", "sold"] }, 1, 0] },
            },
          },
        },
        { $project: { _id: 0 } },
      ]),
      Payment.aggregate([
        { $match: { status: { $in: ["SUCCESS", "REFUNDED"] } } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            amount: { $sum: "$amount" },
          },
        },
      ]),
    ]);
    const {
      totalProperties = 0,
      pendingVerifications = 0,
      approvedProperties = 0,
      rejectedProperties = 0,
      activeListings = 0,
      soldProperties = 0,
    } = propertyTotals[0] || {};
    const paymentStats = Object.fromEntries(
      paymentTotals.map(({ _id, count, amount }) => [_id, { count, amount }]),
    );
    const totalFeesCollected = approvedProperties * LISTING_FEE;
    const totalRefunds = rejectedProperties * LISTING_FEE;

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalProperties,
        activeListings,
        soldProperties,
        pendingVerifications,
        approvedProperties,
        rejectedProperties,
        pendingSellers,
        listingFee: LISTING_FEE,
        successfulPayments:
          (paymentStats.SUCCESS?.count || 0) +
          (paymentStats.REFUNDED?.count || 0),
        refundedPayments: paymentStats.REFUNDED?.count || 0,
        totalFeesCollected,
        totalRefunds,
        netRevenue: totalFeesCollected - totalRefunds,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

export const getPendingSellers = async (req, res) => {
  try {
    const pendingSellers = await User.find({
      role: "seller",
      isApproved: false,
    }).select("-password");

    res.json({
      success: true,
      count: pendingSellers.length,
      pendingSellers,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

export const approveSeller = async (req, res) => {
  try {
    const seller = await User.findById(req.params.id);
    if (!seller || seller.role !== "seller") {
      return res.status(404).json({
        success: false,
        message: "You are not a seller or seller not found",
      });
    }

    seller.isApproved = true;
    await seller.save();

    res.json({
      success: true,
      message: "Seller approved Successfully",
      seller,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};
