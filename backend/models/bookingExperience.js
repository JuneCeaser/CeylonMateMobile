const mongoose = require("mongoose");

const bookingExperienceSchema = new mongoose.Schema({
  experience: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Experience",
    required: true,
  },

  tourist: {
    type: String,
    required: true,
    index: true,
  },

  touristName: {
    type: String,
    required: true,
  },

  touristImage: {
    type: String,
    default: "",
  },

  host: {
    type: String,
    required: true,
    index: true,
  },

  hostName: {
    type: String,
    required: true,
  },

  bookingDate: {
    type: Date,
    required: true,
  },

  status: {
    type: String,
    enum: [
      "pending",
      "confirmed",
      "cancelled",
      "cancelled_by_host",
      "cancelled_by_tourist",
      "completed",
    ],
    default: "pending",
  },

  cancelledBy: {
    type: String,
    enum: ["host", "tourist", null],
    default: null,
  },

  guests: {
    type: Number,
    default: 1,
    min: 1,
  },

  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },

  specialRequests: {
    type: String,
    default: "",
  },
}, {
  timestamps: true,
});

module.exports =
  mongoose.models.BookingExperience ||
  mongoose.model("BookingExperience", bookingExperienceSchema);