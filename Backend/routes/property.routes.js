import express from "express";
import { getAllProperties } from "../controller/property.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";
import {
  addProperty,
  getMyProperty,
  getMyPropertyDetails,
  getPropertyCounts,
  getPropertyDetails,
  updateProperty,
  deleteProperty,
  updatePropertyStatus,
  getSellerDashboard,
} from "../controller/property.controller.js";

const propertyRouts = express.Router();

propertyRouts.get("/", getAllProperties);

// protect the routes that only seller can do these works
propertyRouts.post(
  "/",
  protect,
  authorize("seller"),
  upload.array("images", 10),
  addProperty,
);
propertyRouts.get("/my", protect, authorize("seller"), getMyProperty);
propertyRouts.get(
  "/my/:id",
  protect,
  authorize("seller"),
  getMyPropertyDetails,
);
propertyRouts.put(
  "/:id",
  protect,
  authorize("seller"),
  upload.array("images", 10),
  updateProperty,
);
propertyRouts.delete("/:id", protect, authorize("seller"), deleteProperty);
propertyRouts.patch(
  "/:id/status",
  protect,
  authorize("seller"),
  updatePropertyStatus,
);
propertyRouts.get("/counts", getPropertyCounts);
propertyRouts.get("/:id", getPropertyDetails);
propertyRouts.get(
  "/seller/dashboard",
  protect,
  authorize("seller"),
  getSellerDashboard,
);

export default propertyRouts;
