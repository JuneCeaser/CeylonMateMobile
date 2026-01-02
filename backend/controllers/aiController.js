const { HfInference } = require("@huggingface/inference");
const mongoose = require("mongoose");
const Groq = require("groq-sdk");
const fs = require("fs");

const hf = new HfInference(process.env.HF_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- 1. Main Function for Text Queries (RAG Logic) ---
exports.getCulturalAdvice = async (req, res) => {
    try {
        const { question, context } = req.body;

        if (!question) {
            return res.status(400).json({ error: "Question is required." });
        }

        // 1. Convert question to Vector (Embedding) using Hugging Face
        const queryVector = await hf.featureExtraction({
            model: "sentence-transformers/all-MiniLM-L6-v2",
            inputs: question,
        });

        // 2. Vector Search in MongoDB Atlas
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

        // Join the found facts into one string for context
        const retrievedInfo = searchResults.map(doc => doc.text).join("\n");

        // 3. Generate Answer from Groq (Llama 3) using the retrieved info
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an expert Sri Lankan Cultural Guide. 
                    Keep your responses concise, friendly, and limited to 2-3 short paragraphs.
            
                    Structure your response:
                    1. Brief Overview: Direct answer to the question.
                    2. Pro-Tips: Practical advice for the tourist.
            
                    Important Guidelines:
                    - Use ONLY the provided context.
                    - DO NOT say "I don't have more information" or "Based on the context". 
                    - If information is missing, politely provide a general helpful cultural tip related to the topic instead of a refusal.`
                },
                {
                    role: "user",
                    content: `Retrieved Source Data: ${retrievedInfo} \n\n Question: ${question}`
                }
            ],
            model: "llama-3.3-70b-versatile",
        });
        res.json({ 
            answer: chatCompletion.choices[0].message.content,
            recognizedText: question // Return what the AI "heard"
        });

    } catch (error) {
        console.error("AI Controller Error:", error.message);
        res.status(500).json({ error: "AI Assistant failed to process request." });
    }
};

// --- 2. Optimized Function for Voice Queries (Using Groq Whisper) ---
exports.speechToText = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No audio file uploaded." });
        }

        // Use Groq's high-speed Whisper API for transcription
        // We pass the file stream directly to Groq
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(req.file.path),
            model: "whisper-large-v3", // Industry standard for speed and accuracy
            language: "en", // Specifically look for English
        });

        const recognizedText = transcription.text;
        console.log("🗣️ Groq Recognized Speech:", recognizedText);

        // Now, we use the recognized text as the 'question' and call the RAG logic
        req.body.question = recognizedText;
        req.body.context = "Voice Input: Cultural Exploration";

        // Re-use the existing text advice logic to get the final answer
        return exports.getCulturalAdvice(req, res);

    } catch (error) {
        console.error("Groq STT Error:", error.message);
        res.status(500).json({ error: "Speech recognition failed. Please try again." });
    } finally {
        // Clean up: delete the temporary uploaded file to save space
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    }
};