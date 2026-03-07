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
    }, // firebase uid

    question: {
      type: String,
      required: true,
      trim: true,
    },

    // Normalized version of question to prevent duplicates
    questionNorm: {
      type: String,
      required: true,
      trim: true,
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

/**
 * Prevent duplicate question for the same experience
 */
verifiedQASchema.index(
  { experienceId: 1, questionNorm: 1 },
  { unique: true }
);

/**
 * Text search index for assistant retrieval
 */
verifiedQASchema.index({
  question: "text",
  answer: "text",
  evidence: "text",
});

module.exports = mongoose.model("VerifiedQA", verifiedQASchema);