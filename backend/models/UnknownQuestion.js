const mongoose = require("mongoose");

const unknownQuestionSchema = new mongoose.Schema({
  experienceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Experience", 
    required: true, 
    index: true 
  },

  touristId: { type: String, required: true }, // firebase uid

  question: { type: String, required: true },

  intent: { type: String, default: "OTHER" },

  confidence: { type: Number, default: 0 },

  reason: { type: String, default: "" },

  // ⭐ NEW FIELD
  type: { 
    type: String, 
    enum: ["NEEDS_HOST", "OFF_TOPIC"], 
    default: "NEEDS_HOST"
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("UnknownQuestion", unknownQuestionSchema);