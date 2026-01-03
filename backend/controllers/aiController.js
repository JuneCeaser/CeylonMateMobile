const { HfInference } = require("@huggingface/inference");
const mongoose = require("mongoose");
const Groq = require("groq-sdk");
const fs = require("fs");

// Initialize AI Service Instances using API keys from environment variables
const hf = new HfInference(process.env.HF_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * OPTIMIZATION: Model Warm-up
 * Hugging Face free-tier models often enter a "sleep" state after inactivity. 
 * This function performs a "ping" to wake the model during server startup.
 */
const warmupModel = async () => {
    try {
        await hf.featureExtraction({
            model: "sentence-transformers/all-MiniLM-L6-v2",
            inputs: "warmup",
            provider: "hf-inference",
        });
    } catch (e) {
        console.error("⚠️ AI Warmup failed.");
    }
};
warmupModel();

/**
 * HELPER: Robust Embedding Generator
 * Specifically designed to handle the "Model is loading" error from Hugging Face.
 * It retries the connection if the model is still initializing.
 */
const getEmbeddingsWithRetry = async (text, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await hf.featureExtraction({
                model: "sentence-transformers/all-MiniLM-L6-v2",
                inputs: text,
                provider: "hf-inference",
                options: { wait_for_model: true } // Force HF to wait until the model is ready
            });
        } catch (err) {
            if (i === retries - 1) throw err;
            // Wait 2 seconds before retrying if the model is busy
            await new Promise(res => setTimeout(res, 2000));
        }
    }
};

/**
 * @desc    Processes text-based cultural queries using RAG (Retrieval-Augmented Generation)
 * @route   POST /api/ai/cultural-assistant
 */
exports.getCulturalAdvice = async (req, res) => {
    try {
        const { question } = req.body;

        if (!question) {
            return res.status(400).json({ error: "Question is required." });
        }

        // 1. GENERATE VECTOR EMBEDDING (With improved retry logic)
        const queryVector = await getEmbeddingsWithRetry(question);

        // 2. VECTOR SEARCH IN MONGODB ATLAS
        const collection = mongoose.connection.db.collection("cultural_knowledge");
        const searchResults = await collection.aggregate([
            {
                $vectorSearch: {
                    index: "vector_index", 
                    path: "embedding",
                    queryVector: queryVector,
                    numCandidates: 10,
                    limit: 3, 
                },
            },
        ]).toArray();

        const retrievedInfo = searchResults.map(doc => doc.text).join("\n");

        // 3. GENERATE GROUNDED ANSWER VIA LLM (Llama 3.3)
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a friendly, warm, and professional Sri Lankan Local Guide. 

                    Instructions for your response:
                    - Speak naturally like a human guide talking to a friend. 
                    - Avoid using headings like "Overview", "Pro-Tips", or numbering.
                    - Start with a welcoming opening (e.g., "Ah, that's a great question!" or "I'd love to tell you about that.")
                    - Explain the cultural aspect simply and clearly in 2-3 short paragraphs.
                    - Integrate practical advice or "tips" naturally into your conversation instead of using bullet points.
                    - Use ONLY the provided context. If information is missing, give a general warm Sri Lankan greeting.
                    - NEVER say "Based on the context" or "I am an AI".`
                },
                {
                    role: "user",
                    content: `Context: ${retrievedInfo} \n\n Question: ${question}`
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.8,
            max_tokens: 300
        });

        res.json({ 
            answer: chatCompletion.choices[0].message.content,
            recognizedText: question 
        });

    } catch (error) {
        console.error("RAG Logic Error:", error.message);
        res.status(500).json({ error: "AI Assistant is warming up. Please try again in 5 seconds." });
    }
};

/**
 * @desc    Handles voice-based cultural queries using Whisper for STT
 * @route   POST /api/ai/cultural-assistant-voice
 */
exports.speechToText = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No audio file provided." });
        }

        // 1. SPEECH-TO-TEXT TRANSCRIPTION (Groq Whisper is usually instant)
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(req.file.path),
            model: "whisper-large-v3", 
            language: "en", 
        });

        const recognizedText = transcription.text;

        // 2. HANDOFF TO RAG LOGIC
        req.body.question = recognizedText;
        return exports.getCulturalAdvice(req, res);

    } catch (error) {
        console.error("STT Process Error:", error.message);
        res.status(500).json({ error: "Voice recognition failed. Please try again." });
    } finally {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    }
};