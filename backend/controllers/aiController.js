const { HfInference } = require("@huggingface/inference");
const mongoose = require("mongoose");
const Groq = require("groq-sdk");
const fs = require("fs");

// Initialize Hugging Face and Groq instances using environment variables
const hf = new HfInference(process.env.HF_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * @desc    Processes text-based cultural queries using RAG (Retrieval-Augmented Generation)
 * @route   POST /api/ai/cultural-assistant
 * @access  Private/Public
 */
exports.getCulturalAdvice = async (req, res) => {
    try {
        const { question } = req.body;

        if (!question) {
            return res.status(400).json({ error: "Question is required." });
        }

        // 1. GENERATE VECTOR EMBEDDING
        // Converts the user's plain-text question into a mathematical vector
        const queryVector = await hf.featureExtraction({
            model: "sentence-transformers/all-MiniLM-L6-v2",
            inputs: question,
        });

        // 2. VECTOR SEARCH IN MONGODB ATLAS
        // Performs a semantic search to find the most relevant cultural facts
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

        // Combine retrieved information into a single context block
        const retrievedInfo = searchResults.map(doc => doc.text).join("\n");

        // 3. GENERATE GROUNDED ANSWER VIA LLM (Llama 3.3)
        // System prompt ensures the AI acts as a guide and sticks to factual data
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an expert Sri Lankan Cultural Guide. 
                    Structure your response:
                    1. Brief Overview: Direct answer to the question.
                    2. Pro-Tips: Bulleted practical advice for tourists.
                    
                    Important Guidelines:
                    - Use ONLY the provided context.
                    - If information is missing, provide a general helpful Sri Lankan cultural tip.
                    - Keep the tone warm, welcoming, and professional.`
                },
                {
                    role: "user",
                    content: `Context: ${retrievedInfo} \n\n Question: ${question}`
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 500
        });

        res.json({ 
            answer: chatCompletion.choices[0].message.content,
            recognizedText: question 
        });

    } catch (error) {
        console.error("RAG Logic Error:", error.message);
        res.status(500).json({ error: "AI Assistant failed to process the request." });
    }
};

/**
 * @desc    Handles voice-based cultural queries using Whisper for STT
 * @route   POST /api/ai/cultural-assistant-voice
 * @access  Private/Public
 */
exports.speechToText = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No audio file provided." });
        }

        // 1. SPEECH-TO-TEXT TRANSCRIPTION
        // Sends the audio file stream to Groq Whisper for high-speed transcription
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(req.file.path),
            model: "whisper-large-v3", 
            language: "en", 
        });

        const recognizedText = transcription.text;
        console.log("🗣️ Recognized Speech:", recognizedText);

        // 2. HANDOFF TO RAG LOGIC
        // Inject the transcribed text back into the request body to reuse getCulturalAdvice
        req.body.question = recognizedText;

        return exports.getCulturalAdvice(req, res);

    } catch (error) {
        console.error("STT Process Error:", error.message);
        res.status(500).json({ error: "Voice recognition failed. Please try again." });
    } finally {
        // 3. FILE CLEANUP
        // Always delete the temporary upload file to prevent server storage bloat
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    }
};