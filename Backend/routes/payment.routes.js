import express from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";
import {
  createPayment,
  verifyPayment,
  failPayment,
  getMyPayments,
  getPaymentDetails,
} from "../controller/payment.controller.js";

const paymentRoutes = express.Router();

// All payment routes require authentication and seller role
paymentRoutes.use(protect);
paymentRoutes.use(authorize("seller", "admin"));

// Create payment
paymentRoutes.post("/create", authorize("seller"), createPayment);

// Verify payment
paymentRoutes.post("/verify", authorize("seller"), verifyPayment);
paymentRoutes.post("/fail", authorize("seller"), failPayment);

// Get payment history for current seller
paymentRoutes.get("/my", authorize("seller"), getMyPayments);

// Get payment details by ID
paymentRoutes.get("/:id", getPaymentDetails);

export default paymentRoutes;
