import Payment from "../model/payment.model.js";
import Property from "../model/property.model.js";
import Razorpay from "razorpay";
import crypto from "crypto";

const LISTING_FEE = parseInt(process.env.PROPERTY_LISTING_FEE || "499", 10);

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Helper function to validate payment methods
const isValidPaymentMethod = (method) => {
  return ["UPI", "CARD", "NET_BANKING", "WALLET"].includes(method);
};

/**
 * POST /api/payments/create
 * Initialize a payment for a property
 * Requires authentication and user must be the property owner/seller
 */
export const createPayment = async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        success: false,
        message: "Razorpay credentials are not configured on the server",
      });
    }

    const { propertyId, paymentMethod } = req.body;
    const sellerId = req.user._id;

    // Validation: propertyId
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: "Property ID is required",
      });
    }

    // Validation: paymentMethod
    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Payment method is required",
      });
    }

    if (!isValidPaymentMethod(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid payment method. Valid options: UPI, CARD, NET_BANKING, WALLET",
      });
    }

    // Verify property exists
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Verify user is the property owner
    if (property.seller.toString() !== sellerId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized. You are not the owner of this property",
      });
    }

    if (property.paymentStatus === "PAID") {
      return res.status(400).json({
        success: false,
        message: "This property's listing fee has already been paid.",
      });
    }

    const pendingPayment = await Payment.findOne({
      property: propertyId,
      seller: sellerId,
      status: "PENDING",
    }).sort({ createdAt: -1 });

    if (pendingPayment) {
      if (!pendingPayment.gatewayOrderId) {
        const razorpayOrder = await razorpay.orders.create({
          amount: pendingPayment.amount * 100,
          currency: pendingPayment.currency,
          receipt: `receipt_${pendingPayment._id}`,
        });
        pendingPayment.gatewayOrderId = razorpayOrder.id;
      }
      pendingPayment.paymentMethod = paymentMethod;
      await pendingPayment.save();

      return res.status(200).json({
        success: true,
        message: "Resuming your pending payment",
        payment: {
          id: pendingPayment._id,
          amount: pendingPayment.amount,
          currency: pendingPayment.currency,
          status: pendingPayment.status,
          paymentMethod: pendingPayment.paymentMethod,
          gatewayOrderId: pendingPayment.gatewayOrderId,
        },
      });
    }

    // Protect against concurrent payment requests for the same property.
    const paymentLock = await Property.findOneAndUpdate(
      {
        _id: propertyId,
        paymentStatus: { $nin: ["PAID", "PROCESSING"] },
      },
      { $set: { paymentStatus: "PROCESSING" } },
      { new: true },
    );

    if (!paymentLock) {
      return res.status(400).json({
        success: false,
        message:
          "A payment is already in progress or has already been completed for this property.",
      });
    }

    // Create payment record
    const payment = await Payment.create({
      seller: sellerId,
      property: propertyId,
      amount: LISTING_FEE,
      currency: "INR",
      paymentMethod,
      status: "PENDING",
    });

    // Create Razorpay order. Remove the local pending record if the gateway rejects it.
    let razorpayOrder;
    try {
      razorpayOrder = await razorpay.orders.create({
        amount: LISTING_FEE * 100, // Razorpay expects amount in paise
        currency: "INR",
        receipt: `receipt_${payment._id}`,
      });
    } catch (error) {
      await Payment.findByIdAndDelete(payment._id);
      await Property.findByIdAndUpdate(propertyId, {
        $set: { paymentStatus: "PENDING" },
      });
      throw error;
    }

    // Store Razorpay order ID in payment record
    payment.gatewayOrderId = razorpayOrder.id;
    await payment.save();

    res.status(201).json({
      success: true,
      message: "Payment initialized successfully",
      payment: {
        id: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        gatewayOrderId: razorpayOrder.id,
      },
    });
  } catch (error) {
    console.error("CREATE_PAYMENT_ERROR:", error);
    if (error.statusCode === 401 || error.error?.code === "BAD_REQUEST_ERROR") {
      return res.status(502).json({
        success: false,
        message:
          "Razorpay rejected the server credentials. Generate a matching Key ID and Key Secret in the Razorpay dashboard.",
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error while creating payment",
    });
  }
};

export const failPayment = async (req, res) => {
  try {
    const { paymentId } = req.body;
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required",
      });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }
    if (payment.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this payment",
      });
    }
    if (["FAILED", "CANCELLED"].includes(payment.status)) {
      return res.json({ success: true, message: "Payment attempt is closed" });
    }
    if (payment.status !== "PENDING") {
      return res.status(409).json({
        success: false,
        message: "This payment can no longer be marked as failed",
      });
    }

    payment.status = "FAILED";
    await payment.save();
    await Property.findOneAndUpdate(
      { _id: payment.property, paymentStatus: "PROCESSING" },
      { $set: { paymentStatus: "PENDING" } },
    );

    return res.json({ success: true, message: "Payment attempt closed" });
  } catch (error) {
    console.error("FAIL_PAYMENT_ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to close payment attempt",
    });
  }
};

/**
 * POST /api/payments/verify
 * Verify payment and update property status
 * TODO: Integrate Razorpay signature verification
 */
export const verifyPayment = async (req, res) => {
  try {
    const { paymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      req.body;
    const sellerId = req.user._id;

    // Validation
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required",
      });
    }

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: "Missing Razorpay payment details",
      });
    }

    // Fetch payment record
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (payment.status === "SUCCESS") {
      return res.status(400).json({
        success: false,
        message: "This payment has already been verified.",
      });
    }

    // Verify seller owns this payment
    if (payment.seller.toString() !== sellerId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized. You cannot verify this payment",
      });
    }

    // Verify order ID matches
    if (razorpayOrderId !== payment.gatewayOrderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID mismatch. Payment verification failed.",
      });
    }

    // Validate Razorpay signature
    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      await Property.findByIdAndUpdate(payment.property, {
        $set: { paymentStatus: "PENDING" },
      });
      payment.status = "FAILED";
      await payment.save();
      return res.status(400).json({
        success: false,
        message: "Payment verification failed. Invalid signature.",
      });
    }

    // Update payment status
    payment.status = "SUCCESS";
    payment.transactionId = razorpayPaymentId;
    payment.paidAt = new Date();
    await payment.save();

    // Mark the property as paid atomically so concurrent verifications cannot duplicate it.
    const property = await Property.findOneAndUpdate(
      {
        _id: payment.property,
        paymentStatus: { $in: ["PENDING", "PROCESSING"] },
      },
      {
        $set: {
          paymentStatus: "PAID",
          verificationStatus: "PENDING",
          listingFee: payment.amount,
        },
      },
      { new: true },
    );

    if (!property) {
      return res.status(400).json({
        success: false,
        message: "This property has already been paid and verified.",
      });
    }

    res.json({
      success: true,
      message: "Payment verified successfully",
      payment: {
        id: payment._id,
        status: payment.status,
        transactionId: payment.transactionId,
        paidAt: payment.paidAt,
      },
    });
  } catch (error) {
    console.error("VERIFY_PAYMENT_ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error while verifying payment",
    });
  }
};

/**
 * GET /api/payments/my
 * Get payment history for authenticated seller
 */
export const getMyPayments = async (req, res) => {
  try {
    const sellerId = req.user._id;

    const payments = await Payment.find({ seller: sellerId })
      .populate("property", "title description price images")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      payments: payments.map((payment) => ({
        id: payment._id,
        property: payment.property,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        transactionId: payment.transactionId,
        createdAt: payment.createdAt,
        paidAt: payment.paidAt,
      })),
    });
  } catch (error) {
    console.error("GET_MY_PAYMENTS_ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error while fetching payments",
    });
  }
};

/**
 * GET /api/payments/:id
 * Get payment details by ID
 * Seller can only view their own payments
 */
export const getPaymentDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const payment = await Payment.findById(id).populate(
      "property",
      "title description price images",
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Verify user is the payment owner or admin
    if (
      payment.seller.toString() !== userId.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this payment",
      });
    }

    res.json({
      success: true,
      payment: {
        id: payment._id,
        seller: payment.seller,
        property: payment.property,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        transactionId: payment.transactionId,
        gatewayOrderId: payment.gatewayOrderId,
        createdAt: payment.createdAt,
        paidAt: payment.paidAt,
      },
    });
  } catch (error) {
    console.error("GET_PAYMENT_DETAILS_ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error while fetching payment",
    });
  }
};
