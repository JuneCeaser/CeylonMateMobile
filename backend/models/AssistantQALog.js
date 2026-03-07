const mongoose = require("mongoose");

const assistantQALogSchema = new mongoose.Schema(
  {
    touristId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    experienceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Experience",
      required: true,
      index: true,
    },

    question: {
      type: String,
      required: true,
      trim: true,
    },

    answer: {
      type: String,
      default: "",
      trim: true,
    },

    intent: {
      type: String,
      default: "OTHER",
      trim: true,
    },

    action: {
      type: String,
      enum: ["ANSWER", "CLARIFY", "REFUSE"],
      default: "ANSWER",
      index: true,
    },

    route: {
      type: String,
      enum: ["VERIFIED_QA", "EXPERIENCE", "NONE"],
      default: "EXPERIENCE",
      index: true,
    },

    confidence: {
      type: Number,
      default: 0,
    },

    verifier: {
      type: String,
      enum: ["SUPPORTED", "UNSUPPORTED", "SKIPPED"],
      default: "SKIPPED",
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.AssistantQALog ||
  mongoose.model("AssistantQALog", assistantQALogSchema);