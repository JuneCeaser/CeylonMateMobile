const { HfInference } = require("@huggingface/inference");
const mongoose = require("mongoose");
const Groq = require("groq-sdk");
const fs = require("fs");

// Initialize AI Service Instances
const hf = new HfInference(process.env.HF_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Using the high-accuracy model (768 dimensions)
const ACCURACY_MODEL = "sentence-transformers/all-mpnet-base-v2";

/**
 * OPTIMIZATION: Model Warm-up
 */
const warmupModel = async () => {
    try {
        await hf.featureExtraction({
            model: ACCURACY_MODEL,
            inputs: "warmup",
        });
        console.log("✅ AI accuracy model warmed up.");
    } catch (e) {
        console.error("⚠️ AI Warmup failed.");
    }
};
warmupModel();

/**
 * HELPER: Robust Embedding Generator
 * Updated to use the 768-dimensional model for better accuracy.
 */
const getEmbeddingsWithRetry = async (text, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await hf.featureExtraction({
                model: ACCURACY_MODEL,
                inputs: text,
                options: { wait_for_model: true } 
            });
        } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise(res => setTimeout(res, 2000));
        }
    }
};

/**
 * @desc    Processes text-based cultural queries using RAG
 * @route   POST /api/ai/cultural-assistant
 */
exports.getCulturalAdvice = async (req, res) => {
    try {
        const { question } = req.body;

        if (!question) {
            return res.status(400).json({ error: "Question is required." });
        }

        // 1. GENERATE VECTOR EMBEDDING (High Accuracy)
        const queryVector = await getEmbeddingsWithRetry(question);

        // 2. VECTOR SEARCH IN MONGODB ATLAS
        const collection = mongoose.connection.db.collection("cultural_knowledge");
        const searchResults = await collection.aggregate([
            {
                $vectorSearch: {
                    index: "vector_index", 
                    path: "embedding",
                    queryVector: queryVector,
                    numCandidates: 100, // Increased candidates for better match
                    limit: 5, // Providing more context to the LLM
                },
            },
        ]).toArray();

        // Join retrieved snippets
        const retrievedInfo = searchResults.map(doc => doc.text).join("\n\n");

        // 3. GENERATE GROUNDED ANSWER VIA LLM
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a friendly, warm, and professional Sri Lankan Local Guide. 

                    STRICT INSTRUCTIONS:
                    - Use ONLY the provided context to answer. 
                    - If the context doesn't have the answer, give a warm Sri Lankan greeting and politely explain you don't have that specific detail yet.
                    - Speak naturally like a human guide talking to a friend. 
                    - Avoid headings, bullet points, or numbering.
                    - Start with a welcoming opening.
                    - Explain the cultural aspect in 2-3 short, clear paragraphs.
                    - Never mention "Based on the context" or that you are an AI.`
                },
                {
                    role: "user",
                    content: `Context: ${retrievedInfo} \n\n Question: ${question}`
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.4, // Lower temperature for higher factual accuracy
            max_tokens: 400
        });

        res.json({ 
            answer: chatCompletion.choices[0].message.content,
            recognizedText: question 
        });

    } catch (error) {
        console.error("RAG Logic Error:", error.message);
        res.status(500).json({ error: "AI Assistant is optimizing. Please try again in a few seconds." });
    }
};

/**
 * @desc    Handles voice-based cultural queries using Whisper for STT
 * @route   POST /api/ai/cultural-assistant-voice
 */
exports.speechToText = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No audio file" });

        console.log("🎙️ Transcription starting...");
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(req.file.path),
            model: "whisper-large-v3",
            language: "en",
        });

        const recognizedText = transcription.text;
        console.log("✅ Recognized:", recognizedText);

        // Handoff to RAG logic
        req.body.question = recognizedText;
        return exports.getCulturalAdvice(req, res);

    } catch (error) {
        console.error("STT Process Error:", error.message);
        res.status(500).json({ error: "Voice recognition failed." });
    } finally {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    }
};