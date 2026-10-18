import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 2000,
    },
    price: {
      type: Number,
      required: true,
      min: 1000,
      max: 1000000000,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    area: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    pincode: {
      type: String,
      required: true,
      match: [/^[0-9]{6}$/, "Pincode must be exactly 6 digits"],
    },
    propertyType: {
      type: String,
      enum: [
        "flat",
        "apartment",
        "villa",
        "house",
        "studio",
        "penthouse",
        "office",
        "townhouse",
        "plot",
        "commercial",
      ],
      required: true,
    },
    bhk: {
      type: String,
    },
    bathrooms: {
      type: Number,
      min: 1,
      max: 20,
    },
    areaSize: {
      type: Number,
      min: 100,
      max: 1000000,
    },
    furnishing: {
      type: String,
      enum: ["furnished", "semi-furnished", "unfurnished"],
    },
    amenities: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      enum: ["sale", "sold"],
      default: "sale",
    },
    listingType: {
      type: String,
      enum: ["sale", "rent"],
      default: "sale",
    },
    images: [{ type: String }],
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    viewedBy: [{ type: String }],
    paymentStatus: {
      type: String,
      enum: [
        "NOT_REQUIRED",
        "PENDING",
        "PROCESSING",
        "PAID",
        "FAILED",
        "REFUNDED",
      ],
      default: "PENDING",
    },
    verificationStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    listingFee: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const Property = mongoose.model("Property", propertySchema);

export default Property;
