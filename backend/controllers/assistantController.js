const fs = require("fs");
const Groq = require("groq-sdk");
const Experience = require("../models/experience");
const VerifiedQA = require("../models/VerifiedQA");
const UnknownQuestion = require("../models/UnknownQuestion");
const AssistantQALog = require("../models/AssistantQALog");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function getAssistantExperience(experienceId) {
  return Experience.findById(experienceId).select(
    "+assistantKnowledge +hostFullNotes +vrVideoUrl"
  );
}

function cleanText(value = "") {
  return String(value || "").trim();
}

function normalizeQuestion(q = "") {
  return String(q || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[?!.]+$/g, "");
}

function tokenize(text = "") {
  return normalizeQuestion(text)
    .split(" ")
    .map((w) => w.trim())
    .filter(Boolean);
}

function keywordOverlapScore(a = "", b = "") {
  const aTokens = new Set(tokenize(a));
  const bTokens = new Set(tokenize(b));

  if (!aTokens.size || !bTokens.size) return 0;

  let overlap = 0;
  for (const t of aTokens) {
    if (bTokens.has(t)) overlap += 1;
  }

  return overlap / Math.max(aTokens.size, 1);
}

function detectIntent(qRaw = "") {
  const q = qRaw.toLowerCase().trim();

  if (!q) return "OTHER";
  if (q.includes("why")) return "WHY";
  if (q.includes("how")) return "HOW";
  if (q.includes("when") || q.includes("time") || q.includes("period")) {
    return "WHEN";
  }
  if (q.includes("where") || q.includes("place") || q.includes("origin")) {
    return "WHERE";
  }
  if (q.includes("who")) return "WHO";
  if (
    q.includes("rule") ||
    q.includes("allowed") ||
    q.includes("not allowed") ||
    q.includes("can i") ||
    q.includes("should i") ||
    q.includes("must i")
  ) {
    return "RULES";
  }
  if (q.includes("which")) return "WHICH";
  if (q.startsWith("what") || q.includes("what is") || q.includes("meaning")) {
    return "WHAT";
  }
  return "OTHER";
}

function getIntentInstruction(intent = "OTHER") {
  switch (intent) {
    case "WHY":
      return "Focus on reasons, purpose, meaning, or cultural significance.";
    case "HOW":
      return "Focus on method, process, steps, or how something is done.";
    case "WHERE":
      return "Focus on place of origin, source, or location.";
    case "WHEN":
      return "Focus on time, historical period, or when something became common.";
    case "WHO":
      return "Focus on people or groups involved.";
    case "RULES":
      return "Focus on rules, etiquette, safety, respect, or what is allowed.";
    case "WHAT":
      return "Focus on definition, identity, material, or general explanation.";
    default:
      return "Answer the question directly using only the provided information.";
  }
}

function isClearlyRelevant(question = "", exp = {}) {
  const q = normalizeQuestion(question);

  const title = normalizeQuestion(exp.title || "");
  const category = normalizeQuestion(exp.category || "");

  const keywords = Array.isArray(exp.assistantKnowledge?.keywords)
    ? exp.assistantKnowledge.keywords.map((k) => normalizeQuestion(k))
    : [];

  const commonCulturalTerms = [
    "batik",
    "wax",
    "dye",
    "fabric",
    "cloth",
    "textile",
    "pattern",
    "art",
    "handicraft",
    "traditional art",
    "tradition",
    "cultural",
    "history",
    "origin",
    "workshop",
  ];

  const allTerms = [
    ...keywords,
    ...commonCulturalTerms,
    title,
    category,
    ...tokenize(title),
    ...tokenize(category),
  ].filter(Boolean);

  return allTerms.some((term) => term && q.includes(term));
}

function isClearlyOffTopic(question = "", exp = {}) {
  const q = normalizeQuestion(question);

  const experienceTerms = [
    normalizeQuestion(exp.title || ""),
    normalizeQuestion(exp.category || ""),
    ...(Array.isArray(exp.assistantKnowledge?.keywords)
      ? exp.assistantKnowledge.keywords.map((k) => normalizeQuestion(k))
      : []),
  ].filter(Boolean);

  const categorySpecificTerms = {
    handicraft: [
      "batik",
      "wax",
      "dye",
      "fabric",
      "cloth",
      "textile",
      "pattern",
      "design",
      "handicraft",
      "art",
      "painting",
      "studio",
      "workshop",
    ],
    dancing: ["dance", "dancing", "dancer", "steps", "performance", "rhythm"],
    cooking: ["cook", "cooking", "food", "recipe", "meal", "ingredients"],
    fishing: ["fish", "fishing", "boat", "net", "sea", "catch"],
    farming: ["farm", "farming", "crop", "paddy", "harvest", "field"],
  };

  const currentCategory = normalizeQuestion(exp.category || "");
  const relevantTerms = [
    ...experienceTerms,
    ...(currentCategory.includes("handicraft")
      ? categorySpecificTerms.handicraft
      : currentCategory.includes("dancing")
        ? categorySpecificTerms.dancing
        : currentCategory.includes("cooking")
          ? categorySpecificTerms.cooking
          : currentCategory.includes("fishing")
            ? categorySpecificTerms.fishing
            : currentCategory.includes("farming")
              ? categorySpecificTerms.farming
              : []),
  ];

  const mentionsRelevantTerm = relevantTerms.some(
    (term) => term && q.includes(term)
  );

  const unrelatedTopicGroups = {
    dancing: ["dance", "dancing", "dancer", "traditional dance", "dance moves"],
    cooking: ["cook", "cooking", "food", "recipe", "ingredients", "meal"],
    fishing: ["fish", "fishing", "boat", "net", "sea"],
    farming: ["farm", "farming", "crop", "paddy", "harvest"],
  };

  const matchedOtherTopic = Object.entries(unrelatedTopicGroups).find(
    ([topic, terms]) => {
      const currentTitle = normalizeQuestion(exp.title || "");
      const currentCategoryText = normalizeQuestion(exp.category || "");

      if (currentTitle.includes(topic) || currentCategoryText.includes(topic)) {
        return false;
      }

      return terms.some((term) => q.includes(term));
    }
  );

  return !mentionsRelevantTerm && !!matchedOtherTopic;
}

async function checkRelevanceLLM({ question, exp }) {
  const expText = `
Title: ${exp.title}
Category: ${exp.category}
Summary: ${exp.publicSummary || ""}
Description: ${exp.description || ""}
Host notes: ${exp.hostFullNotes || ""}
Keywords: ${(exp.assistantKnowledge?.keywords || []).join(", ")}
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    max_tokens: 10,
    messages: [
      {
        role: "system",
        content:
          "Decide if the QUESTION is about THIS cultural experience. Return exactly one word: RELEVANT or NOT_RELEVANT.",
      },
      {
        role: "user",
        content: `EXPERIENCE:\n${expText}\n\nQUESTION:\n${question}`,
      },
    ],
  });

  const out = (completion.choices?.[0]?.message?.content || "")
    .trim()
    .toUpperCase();

  return out.includes("NOT") ? "NOT_RELEVANT" : "RELEVANT";
}

function buildEvidenceFromKnowledge(assistantKnowledge = {}, intent = "OTHER") {
  const evidenceParts = [];

  const add = (label, text) => {
    const t = cleanText(text);
    if (t) evidenceParts.push(`${label}: ${t}`);
  };

  const ingredients = assistantKnowledge.ingredients || [];
  const tools = assistantKnowledge.tools || [];
  const rituals = assistantKnowledge.rituals || [];
  const steps = assistantKnowledge.steps || [];
  const dosDonts = assistantKnowledge.dosDonts || {};
  const origins = assistantKnowledge.origins || {};
  const sections = assistantKnowledge.sections || [];
  const faq = assistantKnowledge.faq || [];

  if (intent === "WHY") {
    add("Long description", assistantKnowledge.longDescription);
    add("Cultural background", assistantKnowledge.culturalBackground);

    ingredients.forEach((i) => {
      add(`Ingredient - ${i.name} (why)`, i.why);
      add(`Ingredient - ${i.name} (notes)`, i.notes);
    });

    rituals.forEach((r) => {
      add(`Ritual - ${r.name} (why)`, r.why);
    });

    sections.forEach((s) => add(`Section - ${s.title}`, s.content));
    faq.forEach((f) => add(`FAQ - ${f.q}`, f.a));
  } else if (intent === "HOW") {
    add("Long description", assistantKnowledge.longDescription);

    steps.forEach((s) => {
      add(`Step ${s.step}`, s.how || s.content || s.description);
    });

    tools.forEach((t) => {
      add(`Tool - ${t.name} (how)`, t.how);
      add(`Tool - ${t.name} (what)`, t.what);
    });

    ingredients.forEach((i) => {
      add(`Ingredient - ${i.name} (what)`, i.what);
    });

    sections.forEach((s) => add(`Section - ${s.title}`, s.content));
    faq.forEach((f) => add(`FAQ - ${f.q}`, f.a));
  } else if (intent === "RULES") {
    (dosDonts.do || []).forEach((d) => add("Do", d));
    (dosDonts.dont || []).forEach((d) => add("Don't", d));

    rituals.forEach((r) => add(`Ritual - ${r.name} (rules)`, r.rules));
    sections.forEach((s) => add(`Section - ${s.title}`, s.content));
    faq.forEach((f) => add(`FAQ - ${f.q}`, f.a));
  } else if (intent === "WHERE") {
    add("Origin - where", origins.where);
    add("Origin - history", origins.history);
    add("Long description", assistantKnowledge.longDescription);
    add("Cultural background", assistantKnowledge.culturalBackground);

    sections.forEach((s) => add(`Section - ${s.title}`, s.content));
    faq.forEach((f) => add(`FAQ - ${f.q}`, f.a));
  } else if (intent === "WHEN") {
    add("Origin - history", origins.history);
    add("Long description", assistantKnowledge.longDescription);
    add("Cultural background", assistantKnowledge.culturalBackground);

    rituals.forEach((r) => add(`Ritual - ${r.name} (when)`, r.when));
    sections.forEach((s) => add(`Section - ${s.title}`, s.content));
    faq.forEach((f) => add(`FAQ - ${f.q}`, f.a));
  } else if (intent === "WHO") {
    add("Long description", assistantKnowledge.longDescription);
    add("Cultural background", assistantKnowledge.culturalBackground);
    sections.forEach((s) => add(`Section - ${s.title}`, s.content));
    faq.forEach((f) => add(`FAQ - ${f.q}`, f.a));
  } else {
    add("Long description", assistantKnowledge.longDescription);
    add("Cultural background", assistantKnowledge.culturalBackground);

    ingredients.forEach((i) => {
      add(`Ingredient - ${i.name} (what)`, i.what);
      add(`Ingredient - ${i.name} (notes)`, i.notes);
    });

    tools.forEach((t) => add(`Tool - ${t.name} (what)`, t.what));

    rituals.forEach((r) =>
      add(`Ritual - ${r.name}`, `${r.why || ""} ${r.rules || ""}`)
    );

    steps.slice(0, 5).forEach((s) => add(`Step ${s.step}`, s.how));
    add("Origin - where", origins.where);
    add("Origin - history", origins.history);
    sections.forEach((s) => add(`Section - ${s.title}`, s.content));
    faq.slice(0, 8).forEach((f) => add(`FAQ - ${f.q}`, f.a));
  }

  return evidenceParts.join("\n").slice(0, 5000);
}

function buildEvidenceFromPublicExperience(exp = {}) {
  const parts = [];

  const add = (label, text) => {
    const t = cleanText(text);
    if (t) parts.push(`${label}: ${t}`);
  };

  add("Title", exp.title);
  add("Category", exp.category);
  add("Summary", exp.publicSummary);
  add("Description", exp.description);
  add("Host notes", exp.hostFullNotes);
  add("Duration", exp.duration);

  if (exp.location) {
    add("Location place", exp.location.placeName);
    add("Location city", exp.location.city);
    add("Location district", exp.location.district);
  }

  return parts.join("\n").slice(0, 2500);
}

function computeConfidence(evidenceText = "") {
  const len = evidenceText.trim().length;
  if (len > 1200) return 0.9;
  if (len > 800) return 0.8;
  if (len > 500) return 0.7;
  if (len > 250) return 0.55;
  if (len > 120) return 0.45;
  return 0.25;
}

async function findBestVerifiedQA(experienceId, cleanQuestion) {
  const questionNorm = normalizeQuestion(cleanQuestion);

  const exact = await VerifiedQA.findOne({
    experienceId,
    questionNorm,
  });

  if (exact) return exact;

  const candidates = await VerifiedQA.find({ experienceId })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(30);

  let best = null;
  let bestScore = 0;

  for (const item of candidates) {
    const s1 = keywordOverlapScore(cleanQuestion, item.question || "");
    const s2 = keywordOverlapScore(cleanQuestion, item.evidence || "");
    const s3 = keywordOverlapScore(cleanQuestion, item.answer || "");
    const score = Math.max(s1, s2 * 0.7, s3 * 0.5);

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (best && bestScore >= 0.45) {
    return best;
  }

  return null;
}

async function generateAnswerLLM({
  question,
  evidence,
  experienceTitle,
  intent,
}) {
  const intentInstruction = getIntentInstruction(intent);

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
    max_tokens: 260,
    messages: [
      {
        role: "system",
        content: `You are a warm, professional Sri Lankan cultural guide.

CRITICAL RULES:
- Answer ONLY using the information provided.
- Focus tightly on the user's exact question.
- ${intentInstruction}
- If the information does not clearly contain the answer, say you do not have enough verified detail.
- Do not give a generic summary unless the question asks for a general explanation.
- Keep the response voice-friendly.
- Use simple English.
- Keep the answer concise: maximum 2 short paragraphs.
- Never mention being an AI.
- Never mention "evidence" or "context".`,
      },
      {
        role: "user",
        content: `Experience: ${experienceTitle}
Intent: ${intent}

Question: ${question}

INFORMATION:
${evidence}`,
      },
    ],
  });

  return completion.choices?.[0]?.message?.content?.trim() || "";
}

async function verifyAnswer({ question, evidence, answer }) {
  if (!answer || !evidence) {
    return { verdict: "SKIPPED", reason: "No answer or information." };
  }

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    max_tokens: 120,
    messages: [
      {
        role: "system",
        content: `You are a strict verifier.

Decide if the ANSWER is fully supported by the INFORMATION.

Return exactly in this format:
VERDICT: SUPPORTED or UNSUPPORTED
REASON: <one short sentence>`,
      },
      {
        role: "user",
        content: `INFORMATION:
${evidence}

QUESTION:
${question}

ANSWER:
${answer}`,
      },
    ],
  });

  const text = completion.choices?.[0]?.message?.content || "";
  const verdict = text.includes("UNSUPPORTED")
    ? "UNSUPPORTED"
    : text.includes("SUPPORTED")
      ? "SUPPORTED"
      : "SKIPPED";

  const reasonLine = text
    .split("\n")
    .find((l) => l.toLowerCase().startsWith("reason:"));

  const reason = reasonLine
    ? reasonLine.replace(/reason:\s*/i, "").trim()
    : "";

  return { verdict, reason };
}

async function saveUnknownQuestion({
  experienceId,
  touristId,
  question,
  intent,
  confidence,
  reason,
  type = "NEEDS_HOST",
}) {
  try {
    await UnknownQuestion.create({
      experienceId,
      touristId,
      question,
      questionNorm: normalizeQuestion(question),
      intent,
      confidence,
      reason,
      type,
    });
  } catch (e) {
    console.log("UnknownQuestion save skipped:", e?.message || e);
  }
}

exports.askAssistant = async (req, res) => {
  try {
    const touristId = req.user?.id;
    const { experienceId, question } = req.body;

    if (!touristId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!experienceId) {
      return res.status(400).json({ error: "experienceId is required" });
    }

    if (!cleanText(question)) {
      return res.status(400).json({ error: "question is required" });
    }

    const exp = await getAssistantExperience(experienceId);
    if (!exp) {
      return res.status(404).json({ error: "Experience not found" });
    }

    const cleanQuestion = cleanText(question);
    const intent = detectIntent(cleanQuestion);

    const verified = await findBestVerifiedQA(exp._id, cleanQuestion);

    if (verified && verified.answer) {
      const log = await AssistantQALog.create({
        touristId,
        experienceId: exp._id,
        question: cleanQuestion,
        answer: verified.answer,
        intent,
        action: "ANSWER",
        route: "VERIFIED_QA",
        confidence: 0.95,
        verifier: "SKIPPED",
      });

      return res.json({
        recognizedText: cleanQuestion,
        answer: verified.answer,
        meta: {
          intent,
          action: "ANSWER",
          route: "VERIFIED_QA",
          confidence: 0.95,
          verifier: "SKIPPED",
          logId: log._id,
        },
      });
    }

    let relevance = "RELEVANT";

    const clearlyRelevant = isClearlyRelevant(cleanQuestion, exp);
    const clearlyOffTopic = isClearlyOffTopic(cleanQuestion, exp);

    if (clearlyOffTopic) {
      relevance = "NOT_RELEVANT";
    } else if (
      !clearlyRelevant &&
      ["OTHER", "WHICH", "WHY", "HOW", "WHEN", "WHERE", "WHAT"].includes(intent)
    ) {
      relevance = await checkRelevanceLLM({
        question: cleanQuestion,
        exp,
      });
    }

    if (relevance === "NOT_RELEVANT") {
      const msg = `That seems unrelated to this experience. Ask me something about "${exp.title}", and I’ll help.`;

      const log = await AssistantQALog.create({
        touristId,
        experienceId: exp._id,
        question: cleanQuestion,
        answer: msg,
        intent,
        action: "REFUSE",
        route: "NONE",
        confidence: 0.2,
        verifier: "SKIPPED",
      });

      return res.json({
        recognizedText: cleanQuestion,
        answer: msg,
        meta: {
          intent,
          action: "REFUSE",
          route: "NONE",
          confidence: 0.2,
          verifier: "SKIPPED",
          logId: log._id,
        },
      });
    }

    const knowledgeEvidence = buildEvidenceFromKnowledge(
      exp.assistantKnowledge || {},
      intent
    );

    const publicEvidence = buildEvidenceFromPublicExperience(exp);

    const combinedEvidence = [knowledgeEvidence, publicEvidence]
      .filter(Boolean)
      .join("\n\n")
      .trim();

    let confidence = computeConfidence(combinedEvidence);

    if (confidence < 0.45) {
      const fallback =
        "That is a good question. I do not have enough verified detail yet, but I’ll save it so the host can add a trusted answer later.";

      await saveUnknownQuestion({
        experienceId: exp._id,
        touristId,
        question: cleanQuestion,
        intent,
        confidence,
        reason: "Not enough verified knowledge found for this question.",
        type: "NEEDS_HOST",
      });

      const log = await AssistantQALog.create({
        touristId,
        experienceId: exp._id,
        question: cleanQuestion,
        answer: fallback,
        intent,
        action: "REFUSE",
        route: "NONE",
        confidence,
        verifier: "SKIPPED",
      });

      return res.json({
        recognizedText: cleanQuestion,
        answer: fallback,
        meta: {
          intent,
          action: "REFUSE",
          route: "NONE",
          confidence,
          verifier: "SKIPPED",
          logId: log._id,
        },
      });
    }

    const answer = await generateAnswerLLM({
      question: cleanQuestion,
      evidence: combinedEvidence,
      experienceTitle: exp.title,
      intent,
    });

    const v = await verifyAnswer({
      question: cleanQuestion,
      evidence: combinedEvidence,
      answer,
    });

    let finalAction = "ANSWER";
    let finalAnswer = answer;
    let route = "EXPERIENCE";

    const answerLooksUnknown =
      !cleanText(answer) ||
      /do not have enough verified detail/i.test(answer) ||
      /don't have enough verified detail/i.test(answer) ||
      /not enough verified detail/i.test(answer) ||
      /not fully sure/i.test(answer);

    if (answerLooksUnknown) {
      finalAction = "REFUSE";
      finalAnswer =
        "That is a good question. I do not have enough verified detail yet, but I’ll save it so the host can add a trusted answer later.";
      route = "NONE";

      await saveUnknownQuestion({
        experienceId: exp._id,
        touristId,
        question: cleanQuestion,
        intent,
        confidence,
        reason: "Generated answer indicates missing verified detail.",
        type: "NEEDS_HOST",
      });
    } else if (v.verdict === "UNSUPPORTED") {
      finalAction = "REFUSE";
      finalAnswer =
        "That is a good question. I’m not fully sure based on the verified details I have right now, so I’ll save it for host verification.";
      route = "NONE";

      await saveUnknownQuestion({
        experienceId: exp._id,
        touristId,
        question: cleanQuestion,
        intent,
        confidence,
        reason: `Verifier blocked answer: ${v.reason || "unsupported"}`,
        type: "NEEDS_HOST",
      });
    }

    if (finalAction === "REFUSE") {
      confidence = Math.min(confidence, 0.4);
    }

    const log = await AssistantQALog.create({
      touristId,
      experienceId: exp._id,
      question: cleanQuestion,
      answer: finalAnswer,
      intent,
      action: finalAction,
      route,
      confidence,
      verifier: v.verdict === "SKIPPED" ? "SKIPPED" : v.verdict,
    });

    return res.json({
      recognizedText: cleanQuestion,
      answer: finalAnswer,
      meta: {
        intent,
        action: finalAction,
        route,
        confidence,
        verifier: v.verdict === "SKIPPED" ? "SKIPPED" : v.verdict,
        logId: log._id,
      },
    });
  } catch (err) {
    console.error("Assistant ask error:", err.message);
    return res.status(500).json({ error: "Assistant error" });
  }
};

exports.voiceAssistant = async (req, res) => {
  try {
    const touristId = req.user?.id;
    if (!touristId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No audio file" });
    }

    const experienceId = req.body.experienceId;
    if (!experienceId) {
      return res.status(400).json({ error: "experienceId is required" });
    }

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: "whisper-large-v3",
      language: "en",
      temperature: 0,
    });

    const recognizedText = cleanText(transcription?.text);

    if (!recognizedText) {
      return res.status(400).json({
        error: "Could not recognize speech. Please speak clearly and try again.",
      });
    }

    req.body.question = recognizedText;
    req.body.experienceId = experienceId;

    return exports.askAssistant(req, res);
  } catch (err) {
    console.error("Assistant voice error:", err.message);
    return res.status(500).json({ error: "Voice assistant failed" });
  } finally {
    try {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (cleanupErr) {
      console.log(
        "Voice temp file cleanup error:",
        cleanupErr?.message || cleanupErr
      );
    }
  }
};

exports.getMyHistory = async (req, res) => {
  try {
    const touristId = req.user?.id;

    if (!touristId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const logs = await AssistantQALog.find({ touristId })
      .sort({ createdAt: -1 })
      .limit(200);

    return res.json(logs);
  } catch (err) {
    return res.status(500).json({ error: "History fetch failed" });
  }
};

exports.addVerifiedQA = async (req, res) => {
  try {
    const hostId = req.user?.id;
    const { experienceId, question, answer, evidence } = req.body;

    if (!experienceId || !question || !answer) {
      return res
        .status(400)
        .json({ error: "experienceId, question, answer required" });
    }

    const exp = await Experience.findById(experienceId).select(
      "+assistantKnowledge +hostFullNotes"
    );

    if (!exp) {
      return res.status(404).json({ error: "Experience not found" });
    }

    if (String(exp.host) !== String(hostId)) {
      return res.status(401).json({ error: "Unauthorized host" });
    }

    const cleanQ = cleanText(question);
    const questionNorm = normalizeQuestion(cleanQ);

    const doc = await VerifiedQA.findOneAndUpdate(
      {
        experienceId: exp._id,
        questionNorm,
      },
      {
        $set: {
          hostId,
          question: cleanQ,
          questionNorm,
          answer: cleanText(answer),
          evidence: cleanText(evidence || ""),
          source: "host_answered_unknown",
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    try {
      await UnknownQuestion.deleteMany({
        experienceId: exp._id,
        questionNorm,
        type: "NEEDS_HOST",
      });
    } catch (cleanupErr) {
      console.log(
        "Unknown cleanup skipped:",
        cleanupErr?.message || cleanupErr
      );
    }

    return res.status(201).json({ msg: "Verified QA added", verifiedQA: doc });
  } catch (err) {
    console.error("VerifiedQA add failed:", err.message);
    return res.status(500).json({ error: "VerifiedQA add failed" });
  }
};

exports.getUnknownForExperience = async (req, res) => {
  try {
    const hostId = req.user?.id;
    const { experienceId } = req.params;

    const exp = await Experience.findById(experienceId);
    if (!exp) {
      return res.status(404).json({ error: "Experience not found" });
    }

    if (String(exp.host) !== String(hostId)) {
      return res.status(401).json({ error: "Unauthorized host" });
    }

    const items = await UnknownQuestion.find({
      experienceId: exp._id,
      type: "NEEDS_HOST",
    })
      .sort({ createdAt: -1 })
      .limit(200);

    return res.json(items);
  } catch (err) {
    return res.status(500).json({ error: "Unknown fetch failed" });
  }
};