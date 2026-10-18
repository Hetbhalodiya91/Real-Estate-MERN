import express from "express";
import {
  addWishlist,
  getWishlist,
  removeWishlist,
} from "../controller/wishlist.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const WishlistRouter = express.Router();

WishlistRouter.post("/:propertyId", protect, authorize("buyer"), addWishlist);
WishlistRouter.get("/", protect, authorize("buyer"), getWishlist);
WishlistRouter.delete(
  "/:propertyId",
  protect,
  authorize("buyer"),
  removeWishlist,
);

export default WishlistRouter;
