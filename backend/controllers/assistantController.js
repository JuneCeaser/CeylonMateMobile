// backend/controllers/assistantController.js
const fs = require("fs");
const Groq = require("groq-sdk");
const Experience = require("../models/experience");
const VerifiedQA = require("../models/VerifiedQA");
const UnknownQuestion = require("../models/UnknownQuestion");
const AssistantQALog = require("../models/AssistantQALog");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * ✅ NEW: check if question is about THIS experience
 * Returns: "RELEVANT" | "NOT_RELEVANT"
 */
async function checkRelevanceLLM({ question, exp }) {
  const expText = `
Title: ${exp.title}
Category: ${exp.category}
Summary: ${exp.publicSummary || ""}
Description: ${exp.description || ""}
Keywords: ${(exp.assistantKnowledge?.keywords || []).join(", ")}
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    max_tokens: 10,
    messages: [
      {
        role: "system",
        content: `Decide if the QUESTION is about THIS experience.
Return exactly one word: RELEVANT or NOT_RELEVANT.`
      },
      { role: "user", content: `EXPERIENCE:\n${expText}\n\nQUESTION:\n${question}` }
    ]
  });

  const out = (completion.choices?.[0]?.message?.content || "").trim().toUpperCase();
  return out.includes("NOT") ? "NOT_RELEVANT" : "RELEVANT";
}

/**
 * 1) Rule-based intent detection (fast + explainable)
 */
function detectIntent(qRaw = "") {
  const q = qRaw.toLowerCase().trim();

  if (!q) return "OTHER";
  if (q.includes("why")) return "WHY";
  if (q.includes("how")) return "HOW";
  if (q.includes("when") || q.includes("time")) return "WHEN";
  if (q.includes("where") || q.includes("place")) return "WHERE";
  if (q.includes("who")) return "WHO";
  if (q.includes("rule") || q.includes("allowed") || q.includes("not allowed") || q.includes("do i") || q.includes("can i")) return "RULES";
  if (q.includes("which")) return "WHICH";
  if (q.startsWith("what") || q.includes("what is") || q.includes("meaning")) return "WHAT";
  return "OTHER";
}

/**
 * 2) Convert assistantKnowledge to evidence text depending on intent
 */
function buildEvidenceFromKnowledge(assistantKnowledge = {}, intent = "OTHER") {
  const evidenceParts = [];

  const add = (label, text) => {
    const t = (text || "").trim();
    if (t) evidenceParts.push(`${label}: ${t}`);
  };

  add("Cultural background", assistantKnowledge.culturalBackground);

  const ingredients = assistantKnowledge.ingredients || [];
  const tools = assistantKnowledge.tools || [];
  const rituals = assistantKnowledge.rituals || [];
  const steps = assistantKnowledge.steps || [];
  const dosDonts = assistantKnowledge.dosDonts || {};
  const origins = assistantKnowledge.origins || {};

  // Intent-aware selection
  if (intent === "WHY") {
    ingredients.forEach(i => add(`Ingredient - ${i.name} (why)`, i.why));
    rituals.forEach(r => add(`Ritual - ${r.name} (why)`, r.why));
  } else if (intent === "HOW") {
    tools.forEach(t => add(`Tool - ${t.name} (how)`, t.how));
    steps.forEach(s => add(`Step ${s.step} (how)`, s.how));
  } else if (intent === "RULES") {
    (dosDonts.do || []).forEach(d => add("Do", d));
    (dosDonts.dont || []).forEach(d => add("Don't", d));
    rituals.forEach(r => add(`Ritual - ${r.name} (rules)`, r.rules));
  } else if (intent === "WHERE" || intent === "WHEN" || intent === "WHO") {
    add("Origin - where", origins.where);
    add("Origin - history", origins.history);
    rituals.forEach(r => add(`Ritual - ${r.name} (when)`, r.when));
  } else {
    // WHAT/WHICH/OTHER - include a broad mix
    ingredients.forEach(i => add(`Ingredient - ${i.name} (what)`, i.what));
    tools.forEach(t => add(`Tool - ${t.name} (what)`, t.what));
    rituals.forEach(r => add(`Ritual - ${r.name}`, `${r.why || ""} ${r.rules || ""}`));
    steps.slice(0, 5).forEach(s => add(`Step ${s.step}`, s.how));
    add("Origin - where", origins.where);
  }

  // Hard limit so prompt stays small
  const evidence = evidenceParts.join("\n").slice(0, 3500);
  return evidence;
}

/**
 * 3) Simple confidence from evidence length
 */
function computeConfidence(evidenceText = "") {
  const len = evidenceText.trim().length;
  if (len > 900) return 0.85;
  if (len > 500) return 0.70;
  if (len > 250) return 0.55;
  if (len > 120) return 0.45;
  return 0.25;
}

/**
 * 4) LLM answer generator (GROUNDED)
 */
async function generateAnswerLLM({ question, evidence, experienceTitle }) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.3,
    max_tokens: 350,
    messages: [
      {
        role: "system",
        content:
`You are a warm, professional Sri Lankan cultural guide.
CRITICAL RULES:
- Answer ONLY using the EVIDENCE.
- If EVIDENCE does not contain the answer, say you do not have enough verified context and ask 1 short clarifying question.
- Keep the response voice-friendly: 2 short paragraphs max, simple English.
- Never mention being an AI, never mention "context" or "evidence".
- If the user asks something unrelated to the current experience, politely refuse and redirect.`
      },
      {
        role: "user",
        content:
`Experience: ${experienceTitle}
EVIDENCE:
${evidence}

Question: ${question}`
      }
    ]
  });

  return completion.choices?.[0]?.message?.content?.trim() || "";
}

/**
 * 5) Verifier (hallucination control)
 */
async function verifyAnswer({ question, evidence, answer }) {
  if (!answer || !evidence) return { verdict: "SKIPPED", reason: "No answer/evidence" };

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.0,
    max_tokens: 120,
    messages: [
      {
        role: "system",
        content:
`You are a strict verifier.
Decide if the ANSWER is fully supported by the EVIDENCE.
Return exactly in this format:
VERDICT: SUPPORTED or UNSUPPORTED
REASON: <one short sentence>`
      },
      {
        role: "user",
        content:
`EVIDENCE:
${evidence}

QUESTION: ${question}

ANSWER:
${answer}`
      }
    ]
  });

  const text = completion.choices?.[0]?.message?.content || "";
  const verdict = text.includes("UNSUPPORTED") ? "UNSUPPORTED" : (text.includes("SUPPORTED") ? "SUPPORTED" : "SKIPPED");
  const reasonLine = text.split("\n").find(l => l.toLowerCase().startsWith("reason:"));
  const reason = reasonLine ? reasonLine.replace(/reason:\s*/i, "").trim() : "";
  return { verdict, reason };
}

/**
 * A) TEXT endpoint: POST /api/assistant/ask
 */
exports.askAssistant = async (req, res) => {
  try {
    const touristId = req.user?.id;
    const { experienceId, question } = req.body;

    if (!touristId) return res.status(401).json({ error: "Unauthorized" });
    if (!experienceId) return res.status(400).json({ error: "experienceId is required" });
    if (!question) return res.status(400).json({ error: "question is required" });

    const exp = await Experience.findById(experienceId);
    if (!exp) return res.status(404).json({ error: "Experience not found" });

    const intent = detectIntent(question);

    // 1) VERIFIED_QA first (fast, trusted)
    let verified = null;
    try {
      verified = await VerifiedQA.findOne(
        { experienceId: exp._id, $text: { $search: question } },
        { score: { $meta: "textScore" } }
      ).sort({ score: { $meta: "textScore" } });
    } catch (e) {
      verified = await VerifiedQA.findOne({
        experienceId: exp._id,
        question: { $regex: question.slice(0, 20), $options: "i" }
      });
    }

    if (verified && verified.answer) {
      const log = await AssistantQALog.create({
        touristId,
        experienceId: exp._id,
        question,
        answer: verified.answer,
        intent,
        action: "ANSWER",
        route: "VERIFIED_QA",
        confidence: 0.95,
        verifier: "SKIPPED"
      });

      return res.json({
        recognizedText: question,
        answer: verified.answer,
        meta: {
          intent,
          action: "ANSWER",
          route: "VERIFIED_QA",
          confidence: 0.95,
          verifier: "SKIPPED",
          logId: log._id
        }
      });
    }

    // 2) Hybrid retrieval from assistantKnowledge
    const evidence = buildEvidenceFromKnowledge(exp.assistantKnowledge || {}, intent);
    let confidence = computeConfidence(evidence);

    // ✅ NEW: OFF-TOPIC CHECK (prevents saving wrong experience unknowns)
    // Do this before unknown logging OR LLM answering.
    const relevance = await checkRelevanceLLM({ question, exp });
    if (relevance === "NOT_RELEVANT") {
      const msg = `That sounds like a different experience. Right now we're in "${exp.title}". Ask me something about this activity, or open the correct experience and ask there.`;

      const log = await AssistantQALog.create({
        touristId,
        experienceId: exp._id,
        question,
        answer: msg,
        intent,
        action: "REFUSE",
        route: "NONE",
        confidence,
        verifier: "SKIPPED"
      });

      return res.json({
        recognizedText: question,
        answer: msg,
        meta: {
          intent,
          action: "REFUSE",
          route: "NONE",
          confidence,
          verifier: "SKIPPED",
          logId: log._id
        }
      });
    }

    // 3) Confidence gate
    if (confidence < 0.50) {
      const reason = "Not enough verified knowledge found for this question.";
      await UnknownQuestion.create({
        experienceId: exp._id,
        touristId,
        question,
        intent,
        confidence,
        reason
      });

      const log = await AssistantQALog.create({
        touristId,
        experienceId: exp._id,
        question,
        answer: "I don’t have enough verified details for that yet. Could you ask it in another way or point to what part of the activity you mean?",
        intent,
        action: "REFUSE",
        route: "NONE",
        confidence,
        verifier: "SKIPPED"
      });

      return res.json({
        recognizedText: question,
        answer: log.answer,
        meta: {
          intent,
          action: "REFUSE",
          route: "NONE",
          confidence,
          verifier: "SKIPPED",
          logId: log._id
        }
      });
    }

    // 4) LLM grounded answer
    const answer = await generateAnswerLLM({
      question,
      evidence,
      experienceTitle: exp.title
    });

    // 5) Verifier
    const v = await verifyAnswer({ question, evidence, answer });
    let finalAction = "ANSWER";
    let finalAnswer = answer;
    let route = "EXPERIENCE";

    if (v.verdict === "UNSUPPORTED") {
      finalAction = "REFUSE";
      finalAnswer = "I’m not fully sure based on verified information for this experience. Could you clarify what exact part you mean (ingredient/tool/step/ritual)?";

      await UnknownQuestion.create({
        experienceId: exp._id,
        touristId,
        question,
        intent,
        confidence,
        reason: `Verifier blocked answer: ${v.reason || "unsupported"}`
      });
    }

    const log = await AssistantQALog.create({
      touristId,
      experienceId: exp._id,
      question,
      answer: finalAnswer,
      intent,
      action: finalAction,
      route: finalAction === "ANSWER" ? route : "NONE",
      confidence,
      verifier: v.verdict === "SKIPPED" ? "SKIPPED" : v.verdict
    });

    return res.json({
      recognizedText: question,
      answer: finalAnswer,
      meta: {
        intent,
        action: finalAction,
        route: finalAction === "ANSWER" ? route : "NONE",
        confidence,
        verifier: v.verdict === "SKIPPED" ? "SKIPPED" : v.verdict,
        logId: log._id
      }
    });

  } catch (err) {
    console.error("Assistant ask error:", err.message);
    return res.status(500).json({ error: "Assistant error" });
  }
};

/**
 * B) VOICE endpoint: POST /api/assistant/voice
 */
exports.voiceAssistant = async (req, res) => {
  try {
    const touristId = req.user?.id;
    if (!touristId) return res.status(401).json({ error: "Unauthorized" });

    if (!req.file) return res.status(400).json({ error: "No audio file" });

    const experienceId = req.body.experienceId;
    if (!experienceId) return res.status(400).json({ error: "experienceId is required" });

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: "whisper-large-v3",
      language: "en"
    });

    const recognizedText = (transcription.text || "").trim();
    req.body.question = recognizedText;

    return exports.askAssistant(req, res);

  } catch (err) {
    console.error("Assistant voice error:", err.message);
    return res.status(500).json({ error: "Voice assistant failed" });
  } finally {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  }
};

/**
 * C) GET history: /api/assistant/history
 */
exports.getMyHistory = async (req, res) => {
  try {
    const touristId = req.user?.id;
    const logs = await AssistantQALog.find({ touristId }).sort({ createdAt: -1 }).limit(200);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "History fetch failed" });
  }
};

/**
 * D) Host adds verified QA: /api/assistant/verifiedqa/add
 */
exports.addVerifiedQA = async (req, res) => {
  try {
    const hostId = req.user?.id;
    const { experienceId, question, answer, evidence } = req.body;

    if (!experienceId || !question || !answer) {
      return res.status(400).json({ error: "experienceId, question, answer required" });
    }

    const exp = await Experience.findById(experienceId);
    if (!exp) return res.status(404).json({ error: "Experience not found" });

    if (String(exp.host) !== String(hostId)) {
      return res.status(401).json({ error: "Unauthorized host" });
    }

    const doc = await VerifiedQA.create({
      experienceId: exp._id,
      hostId,
      question,
      answer,
      evidence: evidence || ""
    });

    res.status(201).json({ msg: "Verified QA added", verifiedQA: doc });
  } catch (err) {
    res.status(500).json({ error: "VerifiedQA add failed" });
  }
};

/**
 * E) Host sees unknown questions: /api/assistant/unknown/:experienceId
 */
exports.getUnknownForExperience = async (req, res) => {
  try {
    const hostId = req.user?.id;
    const { experienceId } = req.params;

    const exp = await Experience.findById(experienceId);
    if (!exp) return res.status(404).json({ error: "Experience not found" });

    if (String(exp.host) !== String(hostId)) {
      return res.status(401).json({ error: "Unauthorized host" });
    }

    const items = await UnknownQuestion.find({ experienceId: exp._id }).sort({ createdAt: -1 }).limit(200);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Unknown fetch failed" });
  }
};