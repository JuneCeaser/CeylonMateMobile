// backend/models/experience.js
const mongoose = require("mongoose");

/**
 * ✅ Flexible assistant "sections"
 * Works for ANY experience:
 * - steps
 * - ethics/rules
 * - myths/history
 * - dress code
 * - safety
 * - FAQ-like knowledge
 */
const assistantSectionSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },   // e.g., "Ethics & Respect"
    content: { type: String, default: "" }, // long text
    tags: { type: [String], default: [] },  // ["ethics","rules"]
  },
  { _id: false }
);

/**
 * ✅ Optional structured FAQ
 */
const assistantFaqSchema = new mongoose.Schema(
  {
    q: { type: String, default: "" },
    a: { type: String, default: "" },
    tags: { type: [String], default: [] },
  },
  { _id: false }
);

/**
 * ✅ AI structured schema (optional content)
 * Host does NOT need to fill these manually.
 * This is mainly AUTO-GENERATED later.
 */
const assistantKnowledgeSchema = new mongoose.Schema(
  {
    // Always useful for any experience (AI-only)
    longDescription: { type: String, default: "" },
    culturalBackground: { type: String, default: "" },

    // Cooking-like structure (optional)
    ingredients: {
      type: [
        {
          name: { type: String, default: "" },
          what: { type: String, default: "" },
          why: { type: String, default: "" },
          notes: { type: String, default: "" },
        },
      ],
      default: [],
    },

    tools: {
      type: [
        {
          name: { type: String, default: "" },
          what: { type: String, default: "" },
          how: { type: String, default: "" },
          notes: { type: String, default: "" },
        },
      ],
      default: [],
    },

    rituals: {
      type: [
        {
          name: { type: String, default: "" },
          why: { type: String, default: "" },
          when: { type: String, default: "" },
          rules: { type: String, default: "" },
        },
      ],
      default: [],
    },

    // Steps optional
    steps: {
      type: [
        {
          step: { type: Number, default: 0 },
          how: { type: String, default: "" },
        },
      ],
      default: [],
    },

    // Do & Don't optional
    dosDonts: {
      do: { type: [String], default: [] },
      dont: { type: [String], default: [] },
    },

    origins: {
      where: { type: String, default: "" },
      history: { type: String, default: "" },
    },

    // ✅ SUPER IMPORTANT flexible fields
    sections: {
      type: [assistantSectionSchema],
      default: [],
    },

    faq: {
      type: [assistantFaqSchema],
      default: [],
    },

    keywords: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const experienceSchema = new mongoose.Schema({
  // ✅ Public fields (tourist can see)
  title: { type: String, required: true },

  // ✅ Tourist sees host name in listings + details
  hostName: { type: String, default: "" },

  /**
   * ✅ Tourist sees (short)
   */
  publicSummary: { type: String, default: "" },

  /**
   * ✅ Tourist sees (medium)
   */
  description: { type: String, required: true },

  /**
   * ✅ Host-only private long notes for AI
   * MUST be hidden from tourist API responses
   */
  hostFullNotes: { type: String, default: "" },

  category: {
    type: String,
    enum: ["Cooking", "Farming", "Handicraft", "Fishing", "Dancing"],
    required: true,
  },

  // ✅ Firebase UID of the host
  host: { type: String, required: true, index: true },

  price: { type: Number, required: true },
  duration: { type: String, default: "" },

  // Location (optional)
  location: {
    type: {
      type: String,
      enum: ["Point"],
      required: false,
      default: undefined,
    },
    coordinates: {
      type: [Number],
      required: false,
      default: undefined,
    },
  },

  /**
   * ✅ AI Knowledge (AUTO GENERATED or optional)
   * MUST NEVER be sent to tourist API
   */
  assistantKnowledge: {
    type: assistantKnowledgeSchema,
    default: () => ({}),
  },

  assistantKnowledgeMeta: {
    status: {
      type: String,
      enum: ["NOT_STARTED", "PENDING", "READY", "FAILED"],
      default: "NOT_STARTED",
    },
    lastGeneratedAt: { type: Date, default: null },
    error: { type: String, default: "" },
    model: { type: String, default: "" },
  },

  // Optional extra (you can keep)
  voiceGuideContent: {
    intro: { type: String, default: "" },
    steps: { type: [String], default: [] },
    culturalSignificance: { type: String, default: "" },
  },

  images: { type: [String], default: [] },

  /**
   * ✅ Match your frontend:
   * In experience-detail.js you use exp?.vrVideoUrl
   */
  vrVideoUrl: { type: String, default: "" },

  rating: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

// ✅ Map index (works only when location exists)
experienceSchema.index({ location: "2dsphere" });

// ✅ Prevent OverwriteModelError
module.exports =
  mongoose.models.Experience || mongoose.model("Experience", experienceSchema);