const mongoose = require("mongoose");

const assistantHistorySchema = new mongoose.Schema({
  experienceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Experience",
  },

  touristId: String,

  question: String,

  answer: String,

  confidence: Number,

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("AssistantHistory", assistantHistorySchema);