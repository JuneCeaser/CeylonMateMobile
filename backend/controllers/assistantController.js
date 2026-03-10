const fs = require("fs");
const Groq = require("groq-sdk");
const Experience = require("../models/experience");
const VerifiedQA = require("../models/VerifiedQA");
const UnknownQuestion = require("../models/UnknownQuestion");
const AssistantQALog = require("../models/AssistantQALog");

// Initialize Groq LLM client for answer generation, verification, and voice transcription
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Confidence thresholds used in decision logic
// Questions below CLARIFY_THRESHOLD are refused; between thresholds ask for clarification
const ANSWER_THRESHOLD = 0.75;    // Min confidence to directly answer
const CLARIFY_THRESHOLD = 0.5;    // Min confidence to ask for clarification (else refuse)

// Stopwords to exclude from keyword matching - improves relevance by focusing on meaningful terms
const STOPWORDS = new Set([
  "a","an","and","are","as","at","be","but","by","can","could","did","do","does","for","from","get","give","had","has","have","how","i","in","into","is","it","its","me","my","of","on","or","please","should","tell","that","the","their","them","this","to","was","we","what","when","where","which","who","why","with","would","you","your","about","explain","mean","means","meaning","there","here","these","those","am","will","just","like","more","less","very","really","traditional","culture","cultural","experience",
]);

// Fetch experience with assistant knowledge fields
async function getAssistantExperience(experienceId) {
  return Experience.findById(experienceId).select(
    "+assistantKnowledge +hostFullNotes +vrVideoUrl"
  );
}

function cleanText(value = "") {
  return String(value || "").trim();
}

/**
 * Normalize question for consistent comparison
 * Lowercases, removes punctuation, collapses spaces
 * Used for exact match queries and heuristic scoring
 */
function normalizeQuestion(q = "") {
  return String(q || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[?!.]+$/g, "");
}

function tokenize(text = "") {
  return normalizeQuestion(text)
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .filter((w) => w.length > 1)
    .filter((w) => !STOPWORDS.has(w));
}

/**
 * Remove duplicates from array and clean null/empty values
 * Preserves order, useful for deduplicating keyword lists
 */
function uniqueStrings(values = []) {
  return [
    ...new Set(
      values
        .filter(Boolean)
        .map((v) => String(v).trim())
        .filter(Boolean)
    ),
  ];
}

function keywordOverlapDetails(a = "", b = "") {
  const aTokens = new Set(tokenize(a));
  const bTokens = new Set(tokenize(b));

  if (!aTokens.size || !bTokens.size) {
    return {
      score: 0,
      overlapCount: 0,
      overlapTokens: [],
      aSize: aTokens.size,
      bSize: bTokens.size,
    };
  }

  const overlapTokens = [];
  for (const token of aTokens) {
    if (bTokens.has(token)) overlapTokens.push(token);
  }

  return {
    score: overlapTokens.length / Math.max(aTokens.size, 1),
    overlapCount: overlapTokens.length,
    overlapTokens,
    aSize: aTokens.size,
    bSize: bTokens.size,
  };
}

// INTENT DETECTION - Categorize questions by type for routing

function detectIntent(qRaw = "") {
  const q = qRaw.toLowerCase().trim();

  if (!q) return "OTHER";

  if (q.includes("tool") || q.includes("tools") || q.includes("equipment")) {
    return "TOOLS";
  }

  if (
    q.includes("material") ||
    q.includes("materials") ||
    q.includes("ingredient") ||
    q.includes("ingredients") ||
    q.includes("fabric") ||
    q.includes("wax") ||
    q.includes("dye") ||
    q.includes("colors") ||
    q.includes("colour")
  ) {
    return "MATERIALS";
  }

  if (
    q.includes("step") ||
    q.includes("steps") ||
    q.includes("process") ||
    q.includes("procedure")
  ) {
    return "STEPS";
  }

  if (
    q.includes("history") ||
    q.includes("origin") ||
    q.includes("originate") ||
    q.includes("developed") ||
    q.includes("century") ||
    q.includes("started")
  ) {
    return "HISTORY";
  }

  if (q.includes("why")) return "WHY";
  if (q.includes("how")) return "HOW";

  if (q.includes("when") || q.includes("time") || q.includes("period")) {
    return "WHEN";
  }

  if (q.includes("where") || q.includes("place")) {
    return "WHERE";
  }

  if (q.includes("who")) return "WHO";

  if (
    q.includes("rule") ||
    q.includes("allowed") ||
    q.includes("not allowed") ||
    q.includes("can i") ||
    q.includes("should i") ||
    q.includes("must i") ||
    q.includes("safe") ||
    q.includes("respect") ||
    q.includes("etiquette")
  ) {
    return "RULES";
  }

  if (q.includes("which")) return "WHICH";

  if (
    q.startsWith("what") ||
    q.includes("what is") ||
    q.includes("meaning") ||
    q.includes("mean")
  ) {
    return "WHAT";
  }

  return "OTHER";
}

/**
 * Get LLM instruction strings tailored to detected intent
 * Ensures the AI focuses on the right type of information when answering
 */
function getIntentInstruction(intent = "OTHER") {
  switch (intent) {
    case "TOOLS":
      return "Focus only on tools or equipment used in this experience.";
    case "MATERIALS":
      return "Focus only on materials, ingredients, fabric, wax, dyes, or physical items used.";
    case "STEPS":
      return "Focus on step-by-step process or sequence.";
    case "HISTORY":
      return "Focus on historical background, development, or origin.";
    case "WHY":
      return "Focus on reasons, purpose, meaning, or cultural significance.";
    case "HOW":
      return "Focus on method, process, or how something is done.";
    case "WHERE":
      return "Focus on place of origin, source, or location.";
    case "WHEN":
      return "Focus on time, period, or when something happens.";
    case "WHO":
      return "Focus on people or groups involved.";
    case "RULES":
      return "Focus on rules, etiquette, safety, respect, or what is allowed.";
    case "WHAT":
      return "Focus on definition, identity, or general explanation.";
    case "WHICH":
      return "Help the user identify or choose the correct item using the provided information.";
    default:
      return "Answer the question directly using only the provided information.";
  }
}


//Check if transcript is too weak to process as a real question, Helps avoid processing accidental/junk audio input
function isWeakTranscript(text = "") {
  const q = normalizeQuestion(text);

  if (!q) return true;
  if (q.length < 4) return true;

  const blockedExact = new Set([
    "thank you","thank you for watching",
    "thanks","thanks for watching","okay",
    "ok","hello","hi","hmm","um","huh","yes","no",
  ]);

  if (blockedExact.has(q)) return true;

  const tokens = tokenize(q);
  if (tokens.length === 0) return true;

  return false;
}

// EVIDENCE COLLECTION & RANKING - Extract and score relevant information

/**
 * Build searchable profile from experience
 * Extracts all text content from experience and assistant knowledge
 * Creates token set for efficient keyword matching
 */
function buildExperienceProfile(exp = {}) {
  const ak = exp.assistantKnowledge || {};

  const rawTerms = [
    exp.title,
    exp.category,
    exp.publicSummary,
    exp.description,
    exp.hostFullNotes,
    ...(ak.keywords || []),
    ...(ak.ingredients || []).flatMap((x) => [
      x?.name,
      x?.what,
      x?.why,
      x?.notes,
    ]),
    ...(ak.tools || []).flatMap((x) => [x?.name, x?.what, x?.how, x?.notes]),
    ...(ak.rituals || []).flatMap((x) => [x?.name, x?.why, x?.when, x?.rules]),
    ...(ak.steps || []).flatMap((x) => [
      x?.title,
      x?.how,
      x?.content,
      x?.description,
    ]),
    ...(ak.sections || []).flatMap((x) => [
      x?.title,
      x?.content,
      ...(x?.tags || []),
    ]),
    ...(ak.faq || []).flatMap((x) => [x?.q, x?.a, ...(x?.tags || [])]),
    ak?.origins?.where,
    ak?.origins?.history,
    ak?.culturalBackground,
    ak?.longDescription,
    exp?.location?.placeName,
    exp?.location?.city,
    exp?.location?.district,
  ];

  const textParts = uniqueStrings(rawTerms);
  const tokens = uniqueStrings(textParts.flatMap((part) => tokenize(part)));

  return {
    text: textParts.join("\n"),
    textParts,
    tokens,
  };
}

//Checks keyword overlap and title/category matches, Efficiently filters obviously off-topic questions before LLM call
function judgeRelevanceHeuristically(question = "", exp = {}) {
  const qTokens = tokenize(question);
  const profile = buildExperienceProfile(exp);
  const profileTokenSet = new Set(profile.tokens);

  const matchedTokens = qTokens.filter((t) => profileTokenSet.has(t));
  const overlapScore =
    qTokens.length > 0 ? matchedTokens.length / Math.max(qTokens.length, 1) : 0;

  const normalizedQ = normalizeQuestion(question);
  const normalizedTitle = normalizeQuestion(exp.title || "");
  const normalizedCategory = normalizeQuestion(exp.category || "");

  const strongTitleMatch =
    normalizedTitle.length > 0 && normalizedQ.includes(normalizedTitle);

  const strongCategoryMatch =
    normalizedCategory.length > 0 && normalizedQ.includes(normalizedCategory);

  const relevant =
    strongTitleMatch ||
    strongCategoryMatch ||
    matchedTokens.length >= 2 ||
    overlapScore >= 0.45;

  const likelyOffTopic =
    !relevant && qTokens.length >= 2 && matchedTokens.length === 0;

  return {
    relevant,
    likelyOffTopic,
    overlapScore,
    matchedTokens: uniqueStrings(matchedTokens),
    questionTokenCount: qTokens.length,
  };
}

//Use LLM to determine if question is relevant to experience
//Called when heuristic check is uncertain, Provides more nuanced relevance judgment than keyword matching
async function checkRelevanceLLM({ question, exp }) {
  const ak = exp.assistantKnowledge || {};

  const compactContext = `
Title: ${cleanText(exp.title)}
Category: ${cleanText(exp.category)}
Summary: ${cleanText(exp.publicSummary)}
Description: ${cleanText(exp.description)}
Host Notes: ${cleanText(exp.hostFullNotes)}
Keywords: ${(ak.keywords || []).join(", ")}
FAQ Questions: ${(ak.faq || [])
    .map((x) => x?.q)
    .filter(Boolean)
    .slice(0, 8)
    .join(" | ")}
Section Titles: ${(ak.sections || [])
    .map((x) => x?.title)
    .filter(Boolean)
    .slice(0, 8)
    .join(" | ")}
Tools: ${(ak.tools || [])
    .map((x) => x?.name)
    .filter(Boolean)
    .slice(0, 8)
    .join(", ")}
Ingredients: ${(ak.ingredients || [])
    .map((x) => x?.name)
    .filter(Boolean)
    .slice(0, 8)
    .join(", ")}
Rituals: ${(ak.rituals || [])
    .map((x) => x?.name)
    .filter(Boolean)
    .slice(0, 8)
    .join(", ")}
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    max_tokens: 12,
    messages: [
      {
        role: "system",
        content:
          "Decide whether the QUESTION is specifically about THIS cultural experience. Return exactly one word: RELEVANT or NOT_RELEVANT.",
      },
      {
        role: "user",
        content: `EXPERIENCE:\n${compactContext}\n\nQUESTION:\n${question}`,
      },
    ],
  });

  const out = (completion.choices?.[0]?.message?.content || "")
    .trim()
    .toUpperCase();

  return out.includes("NOT") ? "NOT_RELEVANT" : "RELEVANT";
}

//Create a scored evidence item for ranking
//Tracks label, source, and keyword overlap for later ranking
function makeEvidenceItem(label, text, sourceKey, question = "") {
  const clean = cleanText(text);
  if (!clean) return null;

  const overlap = keywordOverlapDetails(question, `${label} ${clean}`);
  return {
    label,
    text: clean,
    sourceKey,
    overlapScore: overlap.score,
    overlapCount: overlap.overlapCount,
    overlapTokens: overlap.overlapTokens,
  };
}

//Extract all candidate evidence from experience
//Creates evidence items with relevance scores for later ranking
function collectEvidenceCandidates(exp = {}, question = "", intent = "OTHER") {
  const ak = exp.assistantKnowledge || {};
  const items = [];

  const push = (label, text, sourceKey) => {
    const item = makeEvidenceItem(label, text, sourceKey, question);
    if (item) items.push(item);
  };

  push("Title", exp.title, "title");
  push("Category", exp.category, "category");
  push("Summary", exp.publicSummary, "publicSummary");
  push("Description", exp.description, "description");
  push("Host notes", exp.hostFullNotes, "hostFullNotes");
  push("Duration", exp.duration, "duration");
  push("Location place", exp?.location?.placeName, "location.placeName");
  push("Location city", exp?.location?.city, "location.city");
  push("Location district", exp?.location?.district, "location.district");

  push(
    "Long description",
    ak.longDescription,
    "assistantKnowledge.longDescription"
  );
  push(
    "Cultural background",
    ak.culturalBackground,
    "assistantKnowledge.culturalBackground"
  );
  push("Origin - where", ak?.origins?.where, "assistantKnowledge.origins.where");
  push(
    "Origin - history",
    ak?.origins?.history,
    "assistantKnowledge.origins.history"
  );

  (ak.keywords || []).forEach((k, idx) => {
    push(`Keyword ${idx + 1}`, k, `assistantKnowledge.keywords.${idx}`);
  });

  (ak.ingredients || []).forEach((x, idx) => {
    push(
      `Ingredient - ${x?.name} name`,
      x?.name,
      `assistantKnowledge.ingredients.${idx}.name`
    );
    push(
      `Ingredient - ${x?.name} what`,
      x?.what,
      `assistantKnowledge.ingredients.${idx}.what`
    );
    push(
      `Ingredient - ${x?.name} why`,
      x?.why,
      `assistantKnowledge.ingredients.${idx}.why`
    );
    push(
      `Ingredient - ${x?.name} notes`,
      x?.notes,
      `assistantKnowledge.ingredients.${idx}.notes`
    );
  });

  (ak.tools || []).forEach((x, idx) => {
    push(
      `Tool - ${x?.name} name`,
      x?.name,
      `assistantKnowledge.tools.${idx}.name`
    );
    push(
      `Tool - ${x?.name} what`,
      x?.what,
      `assistantKnowledge.tools.${idx}.what`
    );
    push(
      `Tool - ${x?.name} how`,
      x?.how,
      `assistantKnowledge.tools.${idx}.how`
    );
    push(
      `Tool - ${x?.name} notes`,
      x?.notes,
      `assistantKnowledge.tools.${idx}.notes`
    );
  });

  (ak.rituals || []).forEach((x, idx) => {
    push(
      `Ritual - ${x?.name} why`,
      x?.why,
      `assistantKnowledge.rituals.${idx}.why`
    );
    push(
      `Ritual - ${x?.name} when`,
      x?.when,
      `assistantKnowledge.rituals.${idx}.when`
    );
    push(
      `Ritual - ${x?.name} rules`,
      x?.rules,
      `assistantKnowledge.rituals.${idx}.rules`
    );
  });

  (ak.steps || []).forEach((x, idx) => {
    push(
      `Step ${x?.step || idx + 1}`,
      x?.how || x?.content || x?.description,
      `assistantKnowledge.steps.${idx}`
    );
  });

  (ak.dosDonts?.do || []).forEach((item, idx) => {
    push(`Do ${idx + 1}`, item, `assistantKnowledge.dosDonts.do.${idx}`);
  });

  (ak.dosDonts?.dont || []).forEach((item, idx) => {
    push(`Don't ${idx + 1}`, item, `assistantKnowledge.dosDonts.dont.${idx}`);
  });

  (ak.sections || []).forEach((x, idx) => {
    push(
      `Section - ${x?.title}`,
      x?.content,
      `assistantKnowledge.sections.${idx}.content`
    );
    (x?.tags || []).forEach((tag, tagIdx) => {
      push(
        `Section tag - ${x?.title}`,
        tag,
        `assistantKnowledge.sections.${idx}.tags.${tagIdx}`
      );
    });
  });

  (ak.faq || []).forEach((x, idx) => {
    push(`FAQ Question - ${x?.q}`, x?.q, `assistantKnowledge.faq.${idx}.q`);
    push(`FAQ - ${x?.q}`, x?.a, `assistantKnowledge.faq.${idx}.a`);
    (x?.tags || []).forEach((tag, tagIdx) => {
      push(
        `FAQ tag - ${x?.q}`,
        tag,
        `assistantKnowledge.faq.${idx}.tags.${tagIdx}`
      );
    });
  });

  const intentPreferredKeys = {
    TOOLS: ["tools", "tool", "equipment"],
    MATERIALS: ["ingredients","material","materials","fabric","wax","dye","colors",],
    STEPS: ["steps", "step", "how", "process", "procedure"],
    HISTORY: ["origins", "history", "background", "when"],
    WHY: ["why", "culturalBackground", "origins.history", "rituals"],
    HOW: ["steps", "tools", "how", "process"],
    WHERE: ["origins.where", "location", "place"],
    WHEN: ["origins.history", "when", "rituals"],
    WHO: ["host", "people", "rituals"],
    RULES: ["dos", "dont", "rules", "safety", "respect"],
    WHAT: ["what", "description", "summary", "background"],
    WHICH: ["faq", "tools", "ingredients", "steps"],
    OTHER: ["description", "summary", "background"],
  };

  const preferred = intentPreferredKeys[intent] || intentPreferredKeys.OTHER;

  const sorted = items
    .map((item) => {
      let bonus = 0;
      const keyText = `${item.label} ${item.sourceKey}`.toLowerCase();

      if (preferred.some((p) => keyText.includes(String(p).toLowerCase()))) {
        bonus += 0.18;
      }

      if (item.overlapCount >= 2) bonus += 0.18;
      else if (item.overlapCount === 1) bonus += 0.08;

      if (item.text.length > 15 && item.text.length < 450) bonus += 0.05;

      return {
        ...item,
        rankScore: item.overlapScore + bonus,
      };
    })
    .sort((a, b) => b.rankScore - a.rankScore);

  return sorted;
}

//Select best evidence pieces from all candidates
function buildEvidenceBundle(exp = {}, question = "", intent = "OTHER") {
  const ranked = collectEvidenceCandidates(exp, question, intent);
  const topRelevant = ranked.filter((x) => x.rankScore > 0.08).slice(0, 10);
  const fallback = ranked.slice(0, 6);
  const selected = topRelevant.length ? topRelevant : fallback;

  const evidenceText = selected
    .map((x) => `${x.label}: ${x.text}`)
    .join("\n")
    .slice(0, 5000);

  const matchedEvidenceCount = selected.filter((x) => x.overlapCount > 0).length;
  const bestRankScore = selected[0]?.rankScore || 0;
  const matchedTokens = uniqueStrings(
    selected.flatMap((x) => x.overlapTokens || [])
  );

  return {
    evidenceText,
    selected,
    matchedEvidenceCount,
    bestRankScore,
    matchedTokens,
  };
}

//Calculate confidence score for response
function computeConfidence({
  exactVerified = false,
  fuzzyScore = 0,
  relevanceScore = 0,
  evidenceMatchCount = 0,
  evidenceBestScore = 0,
}) {
  if (exactVerified) return 0.95;
  if (fuzzyScore >= 0.86) return 0.9;

  let score = 0.18;

  score += Math.min(fuzzyScore, 0.45) * 0.3;
  score += Math.min(relevanceScore, 1) * 0.25;
  score += Math.min(evidenceBestScore, 1) * 0.25;
  score += Math.min(evidenceMatchCount / 5, 1) * 0.2;

  return Number(Math.max(0, Math.min(0.92, score)).toFixed(2));
}

//Find exact question match in verified Q&A database
//Checks normalized question text,Highest confidence matches - used if found
async function findExactVerifiedQA(experienceId, cleanQuestion) {
  const questionNorm = normalizeQuestion(cleanQuestion);

  return VerifiedQA.findOne({
    experienceId,
    questionNorm,
  });
}

//Find best fuzzy match in verified Q&A database
//Scores candidates by keyword overlap in question/evidence/answer fields. Used when exact match not found but similar question exists
async function findBestVerifiedQA(experienceId, cleanQuestion, intent) {
  const candidates = await VerifiedQA.find({ experienceId })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(60);

  let best = null;
  let bestScore = 0;

  for (const item of candidates) {
    const itemIntent = item.intent || detectIntent(item.question || "");

    if (
      intent !== "OTHER" &&
      itemIntent !== "OTHER" &&
      itemIntent !== intent
    ) {
      continue;
    }

    const qVsQuestion = keywordOverlapDetails(cleanQuestion, item.question || "");
    const qVsEvidence = keywordOverlapDetails(cleanQuestion, item.evidence || "");
    const qVsAnswer = keywordOverlapDetails(cleanQuestion, item.answer || "");

    const overlapCount = Math.max(
      qVsQuestion.overlapCount,
      qVsEvidence.overlapCount,
      qVsAnswer.overlapCount
    );

    if (overlapCount < 2) continue;

    let score = Math.max(
      qVsQuestion.score,
      qVsEvidence.score * 0.72,
      qVsAnswer.score * 0.42
    );

    if (itemIntent === intent) {
      score += 0.12;
    }

    const normalizedItemQuestion = normalizeQuestion(item.question || "");
    const normalizedUserQuestion = normalizeQuestion(cleanQuestion || "");

    if (
      normalizedItemQuestion &&
      normalizedUserQuestion &&
      normalizedItemQuestion === normalizedUserQuestion
    ) {
      score += 0.2;
    }

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (best && bestScore >= 0.78) {
    return { item: best, score: Number(bestScore.toFixed(2)) };
  }

  return { item: null, score: 0 };
}

//Generate answer using LLM
async function generateAnswerLLM({
  question,
  evidence,
  experienceTitle,
  intent,
}) {
  const intentInstruction = getIntentInstruction(intent);

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.12,
    max_tokens: 220,
    messages: [
      {
        role: "system",
        content: `You are a warm, professional Sri Lankan cultural guide.

CRITICAL RULES:
- Answer ONLY using the information provided.
- Focus tightly on the exact question.
- ${intentInstruction}
- Prefer a direct answer first, especially for yes/no questions.
- If the information does not clearly contain the answer, say exactly: "I do not have enough verified detail yet."
- Do not invent or assume.
- Do not give a generic summary unless asked.
- Keep it easy to understand.
- Maximum 2 short paragraphs.
- Never mention being an AI.
- Never mention "evidence", "context", "database", or "retrieval".`,
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

//Verify that generated answer is supported by provided evidence
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

Decide whether the ANSWER is fully supported by the INFORMATION.

Important:
- If the answer adds facts not present in the information, mark UNSUPPORTED.
- If the answer is more specific than the information allows, mark UNSUPPORTED.
- If the answer is a reasonable restatement of the information, mark SUPPORTED.

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

//Save unanswered/unclear question for host review
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
    const questionNorm = normalizeQuestion(question);

    const existing = await UnknownQuestion.findOne({
      experienceId,
      questionNorm,
      type,
    });

    if (existing) return existing;

    return UnknownQuestion.create({
      experienceId,
      touristId,
      question,
      questionNorm,
      intent,
      confidence,
      reason,
      type,
    });
  } catch (e) {
    console.log("UnknownQuestion save skipped:", e?.message || e);
    return null;
  }
}

// MESSAGE BUILDERS - Friendly fallback messages
//Message when question is relevant but needs more specific details, Guides user to ask more specific follow-up questions
function buildClarifyMessage(exp = {}) {
  return `I need a little more detail to answer correctly about "${exp.title}". Please ask in a more specific way, for example about the materials, tools, steps, meaning, history, or rules.`;
}

function buildOffTopicMessage(exp = {}) {
  return `That question seems unrelated to this experience. Please ask something specifically about "${exp.title}".`;
}

//Message when question is on-topic but not yet in knowledge base
function buildUnknownMessage() {
  return "That is a good question. I do not have enough verified detail yet, but I’ll save it so the host can add a trusted answer later.";
}

exports.askAssistant = async (req, res) => {
  try {
    const touristId = req.user?.id;
    const { experienceId, question } = req.body;

    // Verify user is authenticated
    if (!touristId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!experienceId) {
      return res.status(400).json({ error: "experienceId is required" });
    }

    if (!cleanText(question)) {
      return res.status(400).json({ error: "question is required" });
    }

    // Fetch experience with all assistant knowledge data
    const exp = await getAssistantExperience(experienceId);
    if (!exp) {
      return res.status(404).json({ error: "Experience not found" });
    }

    const cleanQuestion = cleanText(question);

    // Reject noise: empty text, fillers, incomplete words
    if (isWeakTranscript(cleanQuestion)) {
      return res.status(400).json({
        error:
          "No clear question detected. Please ask a short question about this experience.",
        recognizedText: cleanQuestion,
        meta: {
          intent: "OTHER",
          action: "REFUSE",
          route: "NONE",
          confidence: 0.1,
          verifier: "SKIPPED",
        },
      });
    }

    const intent = detectIntent(cleanQuestion);

    // Route 1: Check for exact match in verified Q&A database
    const exactVerified = await findExactVerifiedQA(exp._id, cleanQuestion);
    if (exactVerified?.answer) {
      const log = await AssistantQALog.create({
        touristId,
        experienceId: exp._id,
        question: cleanQuestion,
        answer: exactVerified.answer,
        intent,
        action: "ANSWER",
        route: "VERIFIED_QA",
        confidence: 0.95,
        verifier: "SKIPPED",
      });

      return res.json({
        recognizedText: cleanQuestion,
        answer: exactVerified.answer,
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

    // Route 2: Assess question relevance to this specific experience
    const relevanceHeuristic = judgeRelevanceHeuristically(cleanQuestion, exp);
    let relevance = relevanceHeuristic.relevant ? "RELEVANT" : "UNCERTAIN";

    if (relevanceHeuristic.likelyOffTopic) {
      relevance = "NOT_RELEVANT";
    } else if (!relevanceHeuristic.relevant) {
      relevance = await checkRelevanceLLM({
        question: cleanQuestion,
        exp,
      });
    }

    if (relevance === "NOT_RELEVANT") {
      const msg = buildOffTopicMessage(exp);

      await saveUnknownQuestion({
        experienceId: exp._id,
        touristId,
        question: cleanQuestion,
        intent,
        confidence: 0.2,
        reason: "Question is unrelated to this specific experience.",
        type: "OFF_TOPIC",
      });

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

    // Route 3: Search for similar verified Q&A matches
    const fuzzyVerified = await findBestVerifiedQA(
      exp._id,
      cleanQuestion,
      intent
    );

    if (fuzzyVerified.item?.answer) {
      const fuzzyConfidence = fuzzyVerified.score >= 0.86 ? 0.9 : 0.82;

      const log = await AssistantQALog.create({
        touristId,
        experienceId: exp._id,
        question: cleanQuestion,
        answer: fuzzyVerified.item.answer,
        intent,
        action: "ANSWER",
        route: "VERIFIED_QA",
        confidence: fuzzyConfidence,
        verifier: "SKIPPED",
      });

      return res.json({
        recognizedText: cleanQuestion,
        answer: fuzzyVerified.item.answer,
        meta: {
          intent,
          action: "ANSWER",
          route: "VERIFIED_QA",
          confidence: fuzzyConfidence,
          verifier: "SKIPPED",
          logId: log._id,
        },
      });
    }

    // Route 4: Build evidence bundle from experience knowledge
    const evidenceBundle = buildEvidenceBundle(exp, cleanQuestion, intent);

    // Calculate confidence using multiple signals
    let confidence = computeConfidence({
      exactVerified: false,
      fuzzyScore: fuzzyVerified.score,
      relevanceScore: relevanceHeuristic.overlapScore,
      evidenceMatchCount: evidenceBundle.matchedEvidenceCount,
      evidenceBestScore: evidenceBundle.bestRankScore,
    });

    if (!evidenceBundle.evidenceText || confidence < CLARIFY_THRESHOLD) {
      const fallback = buildUnknownMessage();
      const finalConfidence = Math.min(confidence, 0.4);

      await saveUnknownQuestion({
        experienceId: exp._id,
        touristId,
        question: cleanQuestion,
        intent,
        confidence: finalConfidence,
        reason:
          "Relevant question but not enough verified evidence for safe answering.",
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
        confidence: finalConfidence,
        verifier: "SKIPPED",
      });

      return res.json({
        recognizedText: cleanQuestion,
        answer: fallback,
        meta: {
          intent,
          action: "REFUSE",
          route: "NONE",
          confidence: finalConfidence,
          verifier: "SKIPPED",
          logId: log._id,
        },
      });
    }

    if (confidence >= CLARIFY_THRESHOLD && confidence < ANSWER_THRESHOLD) {
      const clarifyMsg = buildClarifyMessage(exp);

      await saveUnknownQuestion({
        experienceId: exp._id,
        touristId,
        question: cleanQuestion,
        intent,
        confidence,
        reason:
          "Relevant cultural question but assistant lacked enough verified knowledge.",
        type: "NEEDS_HOST",
      });

      const log = await AssistantQALog.create({
        touristId,
        experienceId: exp._id,
        question: cleanQuestion,
        answer: clarifyMsg,
        intent,
        action: "CLARIFY",
        route: "NONE",
        confidence,
        verifier: "SKIPPED",
      });

      return res.json({
        recognizedText: cleanQuestion,
        answer: clarifyMsg,
        meta: {
          intent,
          action: "CLARIFY",
          route: "NONE",
          confidence,
          verifier: "SKIPPED",
          logId: log._id,
        },
      });
    }

    // Route 5: Generate answer using LLM with collected evidence
    const answer = await generateAnswerLLM({
      question: cleanQuestion,
      evidence: evidenceBundle.evidenceText,
      experienceTitle: exp.title,
      intent,
    });

    const answerLooksUnknown =
      !cleanText(answer) ||
      /i do not have enough verified detail yet/i.test(answer) ||
      /not enough verified detail/i.test(answer) ||
      /i do not know/i.test(answer);

    if (answerLooksUnknown) {
      const fallback = buildUnknownMessage();
      const finalConfidence = Math.min(confidence, 0.45);

      await saveUnknownQuestion({
        experienceId: exp._id,
        touristId,
        question: cleanQuestion,
        intent,
        confidence: finalConfidence,
        reason:
          "Generator could not produce a supported answer from current experience evidence.",
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
        confidence: Math.min(finalConfidence, 0.4),
        verifier: "SKIPPED",
      });

      return res.json({
        recognizedText: cleanQuestion,
        answer: fallback,
        meta: {
          intent,
          action: "REFUSE",
          route: "NONE",
          confidence: Math.min(finalConfidence, 0.4),
          verifier: "SKIPPED",
          logId: log._id,
        },
      });
    }

    // Route 6: Verify that answer is supported by evidence
    // This catches hallucinations where LLM invents unsupported information
    const verification = await verifyAnswer({
      question: cleanQuestion,
      evidence: evidenceBundle.evidenceText,
      answer,
    });

    let finalAction = "ANSWER";
    let finalRoute = "EXPERIENCE";
    let finalAnswer = answer;
    let finalConfidence = confidence;

    if (verification.verdict === "UNSUPPORTED") {
      finalAction = "REFUSE";
      finalRoute = "NONE";
      finalAnswer = buildUnknownMessage();
      finalConfidence = Math.min(confidence, 0.4);

      await saveUnknownQuestion({
        experienceId: exp._id,
        touristId,
        question: cleanQuestion,
        intent,
        confidence: finalConfidence,
        reason: `Verifier blocked answer: ${
          verification.reason || "unsupported"
        }`,
        type: "NEEDS_HOST",
      });
    }

    // Log interaction for analytics and debugging
    const log = await AssistantQALog.create({
      touristId,
      experienceId: exp._id,
      question: cleanQuestion,
      answer: finalAnswer,
      intent,
      action: finalAction,
      route: finalRoute,
      confidence: finalConfidence,
      verifier:
        verification.verdict === "SKIPPED" ? "SKIPPED" : verification.verdict,
    });

    return res.json({
      recognizedText: cleanQuestion,
      answer: finalAnswer,
      meta: {
        intent,
        action: finalAction,
        route: finalRoute,
        confidence: finalConfidence,
        verifier:
          verification.verdict === "SKIPPED" ? "SKIPPED" : verification.verdict,
        logId: log._id,
      },
    });
  } catch (err) {
    console.error("Assistant ask error:", err.message);
    return res.status(500).json({ error: "Assistant error" });
  }
};

/**
 * POST /api/assistant/voice
 * Voice-based question handler with speech-to-text
 */
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

    // Transcribe audio to text using Groq Whisper model
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: "whisper-large-v3",
      language: "en",
      temperature: 0,
    });

    // Validate transcription output quality
    const recognizedText = cleanText(transcription?.text);

    if (!recognizedText || isWeakTranscript(recognizedText)) {
      return res.status(400).json({
        error:
          "No clear question detected. Please ask a short question about this experience.",
        recognizedText: recognizedText || "",
        meta: {
          intent: "OTHER",
          action: "REFUSE",
          route: "NONE",
          confidence: 0.1,
          verifier: "SKIPPED",
        },
      });
    }

    // Pass transcription to text handler for processing
    req.body.question = recognizedText;
    req.body.experienceId = experienceId;

    return exports.askAssistant(req, res);
  } catch (err) {
    console.error("Assistant voice error:", err.message);
    return res.status(500).json({ error: "Voice assistant failed" });
  } finally {
    // Clean up temporary audio file regardless of success/failure
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

/**
 * GET /api/assistant/history
 * Retrieve question/answer history for logged-in tourist
 * Used to show chat history in the app
 */
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

/**
 * POST /api/assistant/verified-qa
 * Host endpoint to add verified answers for unknown questions
 * Helps improve assistant over time by building trusted answer database
 */
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
    const detectedIntent = detectIntent(cleanQ);

    // Create or update verified Q&A record
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
          intent: detectedIntent,
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

    // Clean up corresponding unknown question entries after host provides answer
    try {
      await UnknownQuestion.deleteMany({
        experienceId: exp._id,
        questionNorm,
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

/**
 * GET /api/assistant/unknown/:experienceId
 * Host endpoint to view all unanswered questions from tourists
 * Helps hosts identify knowledge gaps to fill in their experience data
 */
exports.getUnknownForExperience = async (req, res) => {
  try {
    const hostId = req.user?.id;
    const { experienceId } = req.params;

    // Verify experience exists
    const exp = await Experience.findById(experienceId);
    if (!exp) {
      return res.status(404).json({ error: "Experience not found" });
    }

    // Only the host can view unknown questions for their experience
    if (String(exp.host) !== String(hostId)) {
      return res.status(401).json({ error: "Unauthorized host" });
    }

    // Fetch unanswered questions sorted by newest first
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