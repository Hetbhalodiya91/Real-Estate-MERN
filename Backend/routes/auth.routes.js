import express from "express";
import {
  register,
  login,
  getMe,
  resetPassword,
  forgotPassword,
  verifyEmail,
  resendVerificationCode,
} from "../controller/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const authRoutes = express.Router();

// Register route
authRoutes.post("/register", register);
// Login route
authRoutes.post("/login", login);
//get current user
authRoutes.get("/me", protect, getMe);
//forgot password
authRoutes.post("/forgot-password", forgotPassword);
//reset password
authRoutes.post("/reset-password/:resetToken", resetPassword);
//verify email
authRoutes.post("/verify-email", verifyEmail);
authRoutes.post("/resend-verification-code", resendVerificationCode);

export default authRoutes;
