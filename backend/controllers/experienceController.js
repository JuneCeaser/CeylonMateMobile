// backend/controllers/experienceController.js

const Experience = require("../models/experience");
const VerifiedQA = require("../models/VerifiedQA");
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function normalizeLocation(location) {
  if (!location || !location.coordinates || location.coordinates.length !== 2) return undefined;
  return location;
}

/**
 * Normalize question for duplicate prevention
 */
function normalizeQuestion(q = "") {
  return q
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[?]+$/g, "");
}

/**
 * Auto-create VerifiedQA from FAQ
 */
async function seedVerifiedQAFromFaq({ experienceId, hostId, faq = [] }) {

  const cleaned = (faq || [])
    .map(x => ({
      q: (x?.q || "").trim(),
      a: (x?.a || "").trim(),
      tags: Array.isArray(x?.tags) ? x.tags : []
    }))
    .filter(x => x.q && x.a);

  if (!cleaned.length) return;

  const docs = cleaned.map(x => ({
    experienceId,
    hostId,
    question: x.q,
    questionNorm: normalizeQuestion(x.q),
    answer: x.a,
    evidence: "Host FAQ",
    tags: x.tags
  }));

  try {
    await VerifiedQA.insertMany(docs, { ordered: false });
  } catch (err) {
    // ignore duplicate key errors
  }
}


/**
 * --- AI: convert host description -> structured assistantKnowledge ---
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

    if (!match) throw new Error("AI returned non-JSON output");

    parsed = JSON.parse(match[0]);
  }

  return parsed;
}


/**
 * CREATE EXPERIENCE
 */
exports.createExperience = async (req, res) => {

  try {

    console.log("✅ createExperience HIT");

    let experienceData = { ...req.body };

    experienceData.location = normalizeLocation(experienceData.location);

    experienceData.hostName = experienceData.hostName || "Local Expert";

    const newExperience = new Experience({
      ...experienceData,
      host: req.user.id,
      assistantKnowledgeMeta: {
        status: "PENDING",
        model: "llama-3.3-70b-versatile",
      },
    });

    await newExperience.save();


    /**
     * Auto-create VerifiedQA from host FAQ
     */
    if (experienceData?.assistantKnowledge?.faq) {

      await seedVerifiedQAFromFaq({
        experienceId: newExperience._id,
        hostId: req.user.id,
        faq: experienceData.assistantKnowledge.faq
      });
    }


    /**
     * Generate AI assistant knowledge
     */
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

      newExperience.assistantKnowledge = knowledge;

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

    res.status(201).json({
      msg: "Experience added successfully!",
      experience: newExperience
    });

  } catch (err) {
    console.error("Create Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};


/**
 * REGENERATE KNOWLEDGE
 */
exports.regenerateKnowledge = async (req, res) => {

  try {
    const exp = await Experience.findById(req.params.id);
    if (!exp) return res.status(404).json({ error: "Experience not found" });
    if (String(exp.host) !== String(req.user.id)) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    exp.assistantKnowledgeMeta = {
      status: "PENDING",
      model: "llama-3.3-70b-versatile",
      error: ""
    };

    await exp.save();

    const knowledge = await generateAssistantKnowledge({

      title: exp.title,
      category: exp.category,
      description: exp.description,
      publicSummary: exp.publicSummary || "",
      hostFullNotes: exp.hostFullNotes || "",
      stepsText: exp.stepsText || [],
      rulesText: exp.rulesText || [],
    });

    exp.assistantKnowledge = knowledge;

    exp.assistantKnowledgeMeta = {
      status: "READY",
      lastGeneratedAt: new Date(),
      model: "llama-3.3-70b-versatile",
      error: ""
    };
    await exp.save();
    res.json({
      msg: "assistantKnowledge regenerated",
      experience: exp
    });
  } catch (err) {
    console.error("Regenerate Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};


/**
 * UPDATE EXPERIENCE
 */

exports.updateExperience = async (req, res) => {
  try {

    let experience = await Experience.findById(req.params.id);
    if (!experience) return res.status(404).json({ error: "Experience not found" });
    if (String(experience.host) !== String(req.user.id)) {
      return res.status(401).json({ error: "Unauthorized access" });
    }
    let updateData = { ...req.body };
    if (updateData.location) updateData.location = normalizeLocation(updateData.location);
    if (!updateData.hostName) {
      updateData.hostName = experience.hostName || "Local Expert";
    }


    /**
     * If FAQ updated → create VerifiedQA
     */

    if (updateData?.assistantKnowledge?.faq) {
      await seedVerifiedQAFromFaq({
        experienceId: req.params.id,
        hostId: req.user.id,
        faq: updateData.assistantKnowledge.faq
      });
    }
    experience = await Experience.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    res.json({
      msg: "Experience updated successfully",
      experience
    });
  } catch (err) {
    console.error("Update Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};


/**
 * DELETE EXPERIENCE
 */
exports.deleteExperience = async (req, res) => {

  try {
    const experience = await Experience.findById(req.params.id);
    if (!experience) return res.status(404).json({ error: "Experience not found" });
    if (String(experience.host) !== String(req.user.id)) {
      return res.status(401).json({
        error: "Unauthorized access",
        debug: {
          experienceHost: experience.host,
          tokenUserId: req.user.id
        },
      });
    }
    await experience.deleteOne();
    res.json({ msg: "Experience deleted successfully" });
  } catch (err) {
    console.error("Delete Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};


/**
 * GET ALL EXPERIENCES (PUBLIC SAFE)
 */
exports.getAllExperiences = async (req, res) => {

  try {
    const { category, search } = req.query;
    let query = {};
    if (category) query.category = category;
    if (search) query.title = { $regex: search, $options: "i" };
    const experiences = await Experience.find(query)
      .select("-hostFullNotes -assistantKnowledge -assistantKnowledgeMeta")
      .sort({ createdAt: -1 });
    res.json(experiences);
  } catch (err) {
    console.error("Get All Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};


/**
 * GET SINGLE EXPERIENCE (PUBLIC SAFE)
 */
exports.getExperienceById = async (req, res) => {

  try {
    const experience = await Experience.findById(req.params.id)
      .select("-hostFullNotes -assistantKnowledge -assistantKnowledgeMeta");
    if (!experience) return res.status(404).json({ error: "Experience not found" });
    res.json(experience);
  } catch (err) {
    console.error("Fetch Single Error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};


/**
 * GET EXPERIENCE FOR HOST (PRIVATE)
 */
exports.getMyExperienceById = async (req, res) => {

  try {
    const exp = await Experience.findById(req.params.id);
    if (!exp) return res.status(404).json({ error: "Experience not found" });
    if (String(exp.host) !== String(req.user.id)) {
      return res.status(401).json({ error: "Unauthorized access" });
    }
    res.json(exp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/**
 * GET MY EXPERIENCES
 */
exports.getMyExperiences = async (req, res) => {
  try {
    const experiences = await Experience.find({ host: req.user.id })
      .sort({ createdAt: -1 });
    res.json(experiences);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};