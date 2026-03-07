// backend/controllers/experienceController.js

const Experience = require("../models/experience");
const VerifiedQA = require("../models/VerifiedQA");
const UnknownQuestion = require("../models/UnknownQuestion");
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function parsePossiblyJson(value) {
  if (!value) return value;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch (err) {
    return value;
  }
}

function parseBoolean(value, defaultValue = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  return defaultValue;
}

function normalizeLocation(location) {
  const parsed = parsePossiblyJson(location);

  if (!parsed || typeof parsed !== "object") return undefined;

  const coordinates = Array.isArray(parsed.coordinates)
    ? parsed.coordinates.map((n) => Number(n))
    : undefined;

  const hasValidCoordinates =
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    !Number.isNaN(coordinates[0]) &&
    !Number.isNaN(coordinates[1]);

  const normalized = {
    type: "Point",
    coordinates: hasValidCoordinates ? coordinates : undefined,
    address: parsed.address || "",
    city: parsed.city || "",
    district: parsed.district || "",
    placeName: parsed.placeName || "",
    shareExactLocation: parseBoolean(parsed.shareExactLocation, false),
  };

  const hasAnyText =
    normalized.address ||
    normalized.city ||
    normalized.district ||
    normalized.placeName;

  if (!hasValidCoordinates && !hasAnyText) {
    return undefined;
  }

  return normalized;
}

function toPublicExperience(experienceDoc) {
  if (!experienceDoc) return null;

  const exp =
    typeof experienceDoc.toObject === "function"
      ? experienceDoc.toObject()
      : experienceDoc;

  return {
    _id: exp._id,
    title: exp.title || "",
    hostName: exp.hostName || "",
    publicSummary: exp.publicSummary || "",
    description: exp.description || "",
    category: exp.category || "",
    price: exp.price || 0,
    duration: exp.duration || "",
    location: exp.location || undefined,
    images: Array.isArray(exp.images) ? exp.images : [],
    vrPreview: exp.vrPreview?.url
      ? {
          type: "image",
          url: exp.vrPreview.url,
        }
      : { type: "image", url: "" },
    rating: exp.rating || 0,
    createdAt: exp.createdAt || null,
    updatedAt: exp.updatedAt || null,
  };
}

function normalizeStringArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);

  const parsed = parsePossiblyJson(value);
  if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);

  return [];
}

function normalizeQuestion(q = "") {
  return String(q || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[?!.]+$/g, "");
}

/**
 * Sync VerifiedQA from host FAQ
 * - inserts new FAQs
 * - updates edited FAQs
 * - deletes removed FAQs
 */
async function syncVerifiedQAFromFaq({ experienceId, hostId, faq = [] }) {
  const cleaned = (faq || [])
    .map((x) => ({
      q: (x?.q || "").trim(),
      a: (x?.a || "").trim(),
      tags: Array.isArray(x?.tags)
        ? x.tags.map((t) => String(t).trim()).filter(Boolean)
        : [],
    }))
    .filter((x) => x.q && x.a);

  const normalizedQuestions = cleaned.map((x) => normalizeQuestion(x.q));

  await VerifiedQA.deleteMany({
    experienceId,
    source: "host_faq",
    questionNorm: { $nin: normalizedQuestions },
  });

  for (const x of cleaned) {
    const questionNorm = normalizeQuestion(x.q);

    await VerifiedQA.findOneAndUpdate(
      {
        experienceId,
        questionNorm,
      },
      {
        $set: {
          hostId,
          question: x.q,
          questionNorm,
          answer: x.a,
          evidence: "Host FAQ",
          tags: x.tags,
          source: "host_faq",
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
  }
}

/**
 * AI: convert host description -> structured assistantKnowledge
 */
async function generateAssistantKnowledge({
  title,
  category,
  description,
  publicSummary = "",
  hostFullNotes = "",
  stepsText = [],
  rulesText = [],
}) {
  const system = `
You are an expert Sri Lankan cultural knowledge structurer.
Convert the given experience description into STRICT JSON (no markdown, no extra text).
If something is unknown, use empty string or empty array.

Return ONLY a JSON object with EXACT keys:

{
  "culturalBackground": "",
  "ingredients": [{"name":"","what":"","why":"","notes":""}],
  "tools": [{"name":"","what":"","how":"","notes":""}],
  "rituals": [{"name":"","why":"","when":"","rules":""}],
  "steps": [{"step":1,"how":""}],
  "dosDonts": {"do":[""],"dont":[""]},
  "origins": {"where":"","history":""}
}
`;

  const user = `
TITLE: ${title}
CATEGORY: ${category}

TOURIST-FACING SUMMARY:
${publicSummary}

HOST FULL NOTES (PRIVATE A-Z):
${hostFullNotes}

HOST DESCRIPTION:
${description}

OPTIONAL STEPS:
${stepsText.join("\n")}

OPTIONAL RULES:
${rulesText.join("\n")}
`;

  const resp = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
    max_tokens: 900,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const raw = resp.choices?.[0]?.message?.content?.trim() || "{}";

  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const match = raw.match(/\{[\s\S]*\}$/);

    if (!match) {
      throw new Error("AI returned non-JSON output");
    }

    parsed = JSON.parse(match[0]);
  }

  return parsed;
}

function mergeAssistantKnowledgePreservingHost(
  existingKnowledge,
  generatedKnowledge
) {
  const existing = existingKnowledge?.toObject?.() || existingKnowledge || {};
  const generated = generatedKnowledge || {};

  return {
    ...existing,
    ...generated,
    faq: Array.isArray(existing.faq) ? existing.faq : [],
    keywords: Array.isArray(existing.keywords) ? existing.keywords : [],
  };
}

/**
 * CREATE EXPERIENCE
 */
const createExperience = async (req, res) => {
  try {
    const experienceData = { ...req.body };

    experienceData.assistantKnowledge =
      parsePossiblyJson(experienceData.assistantKnowledge) || {};

    experienceData.location = normalizeLocation(experienceData.location);
    experienceData.hostName = experienceData.hostName || "Local Expert";

    if (experienceData.price !== undefined) {
      experienceData.price = Number(experienceData.price);
    }

    experienceData.stepsText = normalizeStringArray(experienceData.stepsText);
    experienceData.rulesText = normalizeStringArray(experienceData.rulesText);

    if (req.files?.image?.[0]) {
      experienceData.images = [
        `${req.protocol}://${req.get("host")}/uploads/experiences/${req.files.image[0].filename}`,
      ];
    } else if (!Array.isArray(experienceData.images)) {
      experienceData.images = [];
    }

    if (req.files?.vrImage?.[0]) {
      experienceData.vrPreview = {
        type: "image",
        url: `${req.protocol}://${req.get("host")}/uploads/vr360/${req.files.vrImage[0].filename}`,
      };
    } else {
      const parsedVrPreview = parsePossiblyJson(experienceData.vrPreview);
      experienceData.vrPreview = parsedVrPreview?.url
        ? { type: "image", url: parsedVrPreview.url }
        : { type: "image", url: "" };
    }

    experienceData.vrVideoUrl = "";

    const newExperience = new Experience({
      ...experienceData,
      host: req.user.id,
      assistantKnowledgeMeta: {
        status: "PENDING",
        model: "llama-3.3-70b-versatile",
        error: "",
      },
    });

    await newExperience.save();

    if (Array.isArray(experienceData?.assistantKnowledge?.faq)) {
      await syncVerifiedQAFromFaq({
        experienceId: newExperience._id,
        hostId: req.user.id,
        faq: experienceData.assistantKnowledge.faq,
      });
    }

    try {
      const knowledge = await generateAssistantKnowledge({
        title: newExperience.title,
        category: newExperience.category,
        description: newExperience.description,
        publicSummary: newExperience.publicSummary || "",
        hostFullNotes: newExperience.hostFullNotes || "",
        stepsText: newExperience.stepsText || [],
        rulesText: newExperience.rulesText || [],
      });

      newExperience.assistantKnowledge = mergeAssistantKnowledgePreservingHost(
        newExperience.assistantKnowledge,
        knowledge
      );

      newExperience.assistantKnowledgeMeta = {
        status: "READY",
        lastGeneratedAt: new Date(),
        model: "llama-3.3-70b-versatile",
        error: "",
      };

      await newExperience.save();
    } catch (aiErr) {
      newExperience.assistantKnowledgeMeta = {
        status: "FAILED",
        lastGeneratedAt: new Date(),
        model: "llama-3.3-70b-versatile",
        error: aiErr.message || "Knowledge generation failed",
      };

      await newExperience.save();
    }

    return res.status(201).json({
      msg: "Experience added successfully!",
      experience: newExperience,
    });
  } catch (err) {
    console.error("Create Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * REGENERATE ASSISTANT KNOWLEDGE
 */
const regenerateKnowledge = async (req, res) => {
  try {
    const experience = await Experience.findById(req.params.id).select(
      "+hostFullNotes +assistantKnowledge +vrVideoUrl"
    );

    if (!experience) {
      return res.status(404).json({ error: "Experience not found" });
    }

    if (String(experience.host) !== String(req.user.id)) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    experience.assistantKnowledgeMeta = {
      ...(experience.assistantKnowledgeMeta || {}),
      status: "PENDING",
      model: "llama-3.3-70b-versatile",
      error: "",
    };

    await experience.save();

    try {
      const knowledge = await generateAssistantKnowledge({
        title: experience.title,
        category: experience.category,
        description: experience.description,
        publicSummary: experience.publicSummary || "",
        hostFullNotes: experience.hostFullNotes || "",
        stepsText: experience.stepsText || [],
        rulesText: experience.rulesText || [],
      });

      experience.assistantKnowledge = mergeAssistantKnowledgePreservingHost(
        experience.assistantKnowledge,
        knowledge
      );

      experience.assistantKnowledgeMeta = {
        status: "READY",
        lastGeneratedAt: new Date(),
        model: "llama-3.3-70b-versatile",
        error: "",
      };

      await experience.save();

      return res.status(200).json({
        msg: "Assistant knowledge regenerated successfully",
        experience,
      });
    } catch (aiErr) {
      experience.assistantKnowledgeMeta = {
        status: "FAILED",
        lastGeneratedAt: new Date(),
        model: "llama-3.3-70b-versatile",
        error: aiErr.message || "Knowledge generation failed",
      };

      await experience.save();

      return res.status(500).json({
        error: "Failed to regenerate assistant knowledge",
        details: aiErr.message,
      });
    }
  } catch (err) {
    console.error("Regenerate Knowledge Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * UPDATE EXPERIENCE
 */
const updateExperience = async (req, res) => {
  try {
    let experience = await Experience.findById(req.params.id).select(
      "+hostFullNotes +assistantKnowledge +vrVideoUrl"
    );

    if (!experience) {
      return res.status(404).json({ error: "Experience not found" });
    }

    if (String(experience.host) !== String(req.user.id)) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    const updateData = { ...req.body };

    updateData.assistantKnowledge =
      parsePossiblyJson(updateData.assistantKnowledge) || {};

    if (updateData.location !== undefined) {
      updateData.location = normalizeLocation(updateData.location);
    }

    if (updateData.price !== undefined) {
      updateData.price = Number(updateData.price);
    }

    updateData.stepsText = normalizeStringArray(updateData.stepsText);
    updateData.rulesText = normalizeStringArray(updateData.rulesText);

    if (req.files?.image?.[0]) {
      updateData.images = [
        `${req.protocol}://${req.get("host")}/uploads/experiences/${req.files.image[0].filename}`,
      ];
    } else {
      updateData.images = Array.isArray(experience.images) ? experience.images : [];
    }

    if (req.files?.vrImage?.[0]) {
      updateData.vrPreview = {
        type: "image",
        url: `${req.protocol}://${req.get("host")}/uploads/vr360/${req.files.vrImage[0].filename}`,
      };
    } else {
      const parsedVrPreview = parsePossiblyJson(updateData.vrPreview);
      updateData.vrPreview = parsedVrPreview?.url
        ? { type: "image", url: parsedVrPreview.url }
        : experience.vrPreview || { type: "image", url: "" };
    }

    updateData.vrVideoUrl = "";

    experience = await Experience.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("+hostFullNotes +assistantKnowledge +vrVideoUrl");

    if (Array.isArray(updateData?.assistantKnowledge?.faq)) {
      await syncVerifiedQAFromFaq({
        experienceId: experience._id,
        hostId: req.user.id,
        faq: updateData.assistantKnowledge.faq,
      });
    }

    try {
      const knowledge = await generateAssistantKnowledge({
        title: experience.title,
        category: experience.category,
        description: experience.description,
        publicSummary: experience.publicSummary || "",
        hostFullNotes: experience.hostFullNotes || "",
        stepsText: experience.stepsText || [],
        rulesText: experience.rulesText || [],
      });

      experience.assistantKnowledge = mergeAssistantKnowledgePreservingHost(
        experience.assistantKnowledge,
        knowledge
      );

      experience.assistantKnowledgeMeta = {
        status: "READY",
        lastGeneratedAt: new Date(),
        model: "llama-3.3-70b-versatile",
        error: "",
      };

      await experience.save();
    } catch (aiErr) {
      experience.assistantKnowledgeMeta = {
        ...(experience.assistantKnowledgeMeta || {}),
        status: "FAILED",
        lastGeneratedAt: new Date(),
        model: "llama-3.3-70b-versatile",
        error: aiErr.message || "Knowledge generation failed",
      };

      await experience.save();
    }

    return res.json({
      msg: "Experience updated successfully",
      experience,
    });
  } catch (err) {
    console.error("Update Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE EXPERIENCE
 */
const deleteExperience = async (req, res) => {
  try {
    const experience = await Experience.findById(req.params.id);

    if (!experience) {
      return res.status(404).json({ error: "Experience not found" });
    }

    if (String(experience.host) !== String(req.user.id)) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    await experience.deleteOne();

    await VerifiedQA.deleteMany({
      experienceId: req.params.id,
    });

    await UnknownQuestion.deleteMany({
      experienceId: req.params.id,
    });

    return res.json({ msg: "Experience deleted successfully" });
  } catch (err) {
    console.error("Delete Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET ALL EXPERIENCES (PUBLIC SAFE)
 */
const getAllExperiences = async (req, res) => {
  try {
    const { category, search } = req.query;

    const query = {};

    if (category) query.category = category;
    if (search) query.title = { $regex: search, $options: "i" };

    const experiences = await Experience.find(query).sort({ createdAt: -1 });

    const safeExperiences = experiences.map(toPublicExperience);

    return res.json(safeExperiences);
  } catch (err) {
    console.error("Get All Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET SINGLE EXPERIENCE (PUBLIC SAFE)
 */
const getExperienceById = async (req, res) => {
  try {
    const experience = await Experience.findById(req.params.id);

    if (!experience) {
      return res.status(404).json({ error: "Experience not found" });
    }

    return res.json(toPublicExperience(experience));
  } catch (err) {
    console.error("Fetch Single Error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * GET EXPERIENCE FOR HOST (PRIVATE)
 */
const getMyExperienceById = async (req, res) => {
  try {
    const exp = await Experience.findById(req.params.id).select(
      "+hostFullNotes +assistantKnowledge +vrVideoUrl"
    );

    if (!exp) {
      return res.status(404).json({ error: "Experience not found" });
    }

    if (String(exp.host) !== String(req.user.id)) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    return res.json(exp);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET MY EXPERIENCES
 */
const getMyExperiences = async (req, res) => {
  try {
    const experiences = await Experience.find({ host: req.user.id })
      .select("+hostFullNotes +assistantKnowledge +vrVideoUrl")
      .sort({ createdAt: -1 });

    return res.json(experiences);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createExperience,
  getAllExperiences,
  getExperienceById,
  updateExperience,
  deleteExperience,
  getMyExperiences,
  regenerateKnowledge,
  getMyExperienceById,
};