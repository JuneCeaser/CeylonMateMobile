const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      default: "",
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    password: {
      type: String,
      default: "",
    },

    role: {
      type: String,
      enum: ["tourist", "host"],
      default: "tourist",
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    nicNumber: {
      type: String,
      default: "",
      trim: true,
    },

    bio: {
      type: String,
      default: "",
      trim: true,
    },

    location: {
      type: String,
      default: "",
      trim: true,
    },

    profileImage: {
      type: String,
      default: "",
      trim: true,
    },

    otp: {
      type: String,
      default: null,
    },

    otpExpires: {
      type: Date,
      default: null,
    },

    isVerified: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);