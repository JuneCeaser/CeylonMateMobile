const mongoose = require("mongoose");

/**
 * Flexible assistant sections
 */
const assistantSectionSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    content: { type: String, default: "" },
    tags: { type: [String], default: [] },
  },
  { _id: false }
);

/**
 * FAQ structure
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
 * AI structured knowledge
 * PRIVATE - for assistant only
 */
const assistantKnowledgeSchema = new mongoose.Schema(
  {
    longDescription: { type: String, default: "" },
    culturalBackground: { type: String, default: "" },

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

    steps: {
      type: [
        {
          step: { type: Number, default: 0 },
          how: { type: String, default: "" },
        },
      ],
      default: [],
    },

    dosDonts: {
      do: { type: [String], default: [] },
      dont: { type: [String], default: [] },
    },

    origins: {
      where: { type: String, default: "" },
      history: { type: String, default: "" },
    },

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

/**
 * 360 VR preview structure
 * IMPORTANT:
 * Tourist side should only use 360 image preview, not VR video.
 */
const vrPreviewSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["image"],
      default: "image",
    },
    url: { type: String, default: "" },
  },
  { _id: false }
);

/**
 * Location schema
 */
const locationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: undefined,
    },
    coordinates: {
      type: [Number], // [lng, lat]
      default: undefined,
    },
    address: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      default: "",
    },
    district: {
      type: String,
      default: "",
    },
    placeName: {
      type: String,
      default: "",
    },
    shareExactLocation: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const experienceSchema = new mongoose.Schema(
  {
    /**
     * PUBLIC TOURIST FIELDS
     */
    title: {
      type: String,
      required: true,
      trim: true,
    },

    hostName: {
      type: String,
      default: "",
      trim: true,
    },

    publicSummary: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: ["Cooking", "Farming", "Handicraft", "Fishing", "Dancing"],
      required: true,
    },

    /**
     * PRIVATE HOST NOTES (AI ONLY)
     * MUST NEVER go to tourist response
     */
    hostFullNotes: {
      type: String,
      default: "",
      trim: true,
      select: false,
    },

    /**
     * Optional helper arrays used by AI generation
     */
    stepsText: {
      type: [String],
      default: [],
    },

    rulesText: {
      type: [String],
      default: [],
    },

    /**
     * Firebase UID
     */
    host: {
      type: String,
      required: true,
      index: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    duration: {
      type: String,
      default: "",
      trim: true,
    },

    /**
     * Optional location
     */
    location: {
      type: locationSchema,
      default: undefined,
    },

    /**
     * EXPERIENCE MEDIA
     */
    images: {
      type: [String],
      default: [],
    },

    /**
     * 360 VR preview image only
     */
    vrPreview: {
      type: vrPreviewSchema,
      default: () => ({ type: "image", url: "" }),
    },

    /**
     * Backward compatibility only.
     * Do not use on tourist UI anymore.
     */
    vrVideoUrl: {
      type: String,
      default: "",
      select: false,
    },

    /**
     * AI KNOWLEDGE (PRIVATE)
     */
    assistantKnowledge: {
      type: assistantKnowledgeSchema,
      default: () => ({}),
      select: false,
    },

    assistantKnowledgeMeta: {
      status: {
        type: String,
        enum: ["NOT_STARTED", "PENDING", "READY", "FAILED"],
        default: "NOT_STARTED",
      },

      lastGeneratedAt: {
        type: Date,
        default: null,
      },

      error: {
        type: String,
        default: "",
      },

      model: {
        type: String,
        default: "",
      },
    },

    /**
     * Optional voice guide content
     * Keep private unless you intentionally expose a safe subset later
     */
    voiceGuideContent: {
      intro: { type: String, default: "" },
      steps: { type: [String], default: [] },
      culturalSignificance: { type: String, default: "" },
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Map index
 */
experienceSchema.index({ location: "2dsphere" });

/**
 * Prevent model overwrite
 */
module.exports =
  mongoose.models.Experience ||
  mongoose.model("Experience", experienceSchema);