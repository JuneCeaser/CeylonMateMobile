const mongoose = require("mongoose");

const unknownQuestionSchema = new mongoose.Schema(
  {
    experienceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Experience",
      required: true,
      index: true,
    },

    touristId: {
      type: String,
      required: true,
      trim: true,
    },

    question: {
      type: String,
      required: true,
      trim: true,
    },

    questionNorm: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    intent: {
      type: String,
      default: "OTHER",
      trim: true,
    },

    confidence: {
      type: Number,
      default: 0,
    },

    reason: {
      type: String,
      default: "",
      trim: true,
    },

    type: {
      type: String,
      enum: ["NEEDS_HOST", "OFF_TOPIC"],
      default: "NEEDS_HOST",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.UnknownQuestion ||
  mongoose.model("UnknownQuestion", unknownQuestionSchema);