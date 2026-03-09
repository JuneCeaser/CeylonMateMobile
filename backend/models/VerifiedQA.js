const mongoose = require("mongoose");

const verifiedQASchema = new mongoose.Schema(
  {
    experienceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Experience",
      required: true,
      index: true,
    },

    hostId: {
      type: String,
      required: true,
    },

    question: {
      type: String,
      required: true,
      trim: true,
    },

    questionNorm: {
      type: String,
      required: true,
      trim: true,
    },

    intent: {
      type: String,
      default: "OTHER",
      trim: true,
      index: true,
    },

    answer: {
      type: String,
      required: true,
      trim: true,
    },

    evidence: {
      type: String,
      default: "",
      trim: true,
    },

    tags: {
      type: [String],
      default: [],
    },

    source: {
      type: String,
      enum: ["host_faq", "host_answered_unknown", "admin", "manual"],
      default: "host_faq",
    },
  },
  { timestamps: true }
);

verifiedQASchema.index(
  { experienceId: 1, questionNorm: 1 },
  { unique: true }
);

verifiedQASchema.index({
  question: "text",
  answer: "text",
  evidence: "text",
});

module.exports =
  mongoose.models.VerifiedQA || mongoose.model("VerifiedQA", verifiedQASchema);