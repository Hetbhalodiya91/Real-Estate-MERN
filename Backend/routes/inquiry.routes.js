import express from "express";
import { authorize, protect } from "../middleware/auth.middleware.js";
import {
  getBuyerInquiries,
  getSellerInquiries,
  markAsRead,
  replyToInquiry,
  sendInquiry,
} from "../controller/inquiry.controller.js";

const inquiryRouter = express.Router();

inquiryRouter.post("/", protect, authorize("buyer"), sendInquiry);
inquiryRouter.get("/seller", protect, authorize("seller"), getSellerInquiries);
inquiryRouter.get("/buyer", protect, authorize("buyer"), getBuyerInquiries);
inquiryRouter.patch("/:id/reply", protect, authorize("seller"), replyToInquiry);
inquiryRouter.patch("/:id/read", protect, markAsRead);

export default inquiryRouter;
