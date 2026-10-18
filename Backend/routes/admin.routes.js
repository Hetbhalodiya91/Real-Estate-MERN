import express from "express";
import {
  getAllUsers,
  blockUser,
  deleteUser,
  getAllProperties,
  deleteProperty,
  getAllInquiries,
  getDashboardStats,
  getPendingSellers,
  approveSeller,
  updatePropertyVerification,
} from "../controller/admin.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const adminRouter = express.Router();

adminRouter.use(protect, authorize("admin"));

// User management
adminRouter.get("/users", getAllUsers);
adminRouter.patch("/users/:id/block", blockUser);
adminRouter.delete("/users/:id", deleteUser);

// Property management
adminRouter.get("/properties", getAllProperties);
adminRouter.delete("/properties/:id", deleteProperty);
adminRouter.patch("/properties/:id/verification", updatePropertyVerification);

// Inquiry management
adminRouter.get("/inquiries", getAllInquiries);

// Dashboard stats
adminRouter.get("/stats", getDashboardStats);

// Seller approval
adminRouter.get("/pending-sellers", getPendingSellers);
adminRouter.patch("/approve-seller/:id", approveSeller);

export default adminRouter;
