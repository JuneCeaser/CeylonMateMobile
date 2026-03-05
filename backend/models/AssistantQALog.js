const mongoose = require("mongoose");

const assistantQALogSchema = new mongoose.Schema({
  touristId: { type: String, required: true, index: true },
  experienceId: { type: mongoose.Schema.Types.ObjectId, ref: "Experience", required: true, index: true },

  question: { type: String, required: true },
  answer: { type: String, default: "" },

  intent: { type: String, default: "OTHER" },
  action: { type: String, enum: ["ANSWER", "CLARIFY", "REFUSE"], default: "ANSWER" },
  route: { type: String, enum: ["VERIFIED_QA", "EXPERIENCE", "NONE"], default: "EXPERIENCE" },

  confidence: { type: Number, default: 0 },
  verifier: { type: String, enum: ["SUPPORTED", "UNSUPPORTED", "SKIPPED"], default: "SKIPPED" },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("AssistantQALog", assistantQALogSchema);