const Moment = require('../models/Moment');
const axios = require('axios');

/**
 * @desc    Add a new cultural memory with AI insights
 * @route   POST /api/moments/add
 */
exports.addMoment = async (req, res) => {
    try {
        const { userId, experienceName, imageUrl, location } = req.body;

        if (!userId || !experienceName || !imageUrl) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        let aiData = {
            caption: "Captured a beautiful moment in Sri Lanka!",
            historicalGem: "Sri Lanka has a rich history spanning over 2,500 years.",
            tags: ["#SriLanka", "#Travel", "#Heritage"]
        };

        try {
            // --- GROQ AI CALL: Generating Cultural Narrative ---
            const groqResponse = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        {
                            role: "system",
                            content: "You are an expert Sri Lankan Cultural Historian. Respond ONLY in valid JSON format."
                        },
                        {
                            role: "user",
                            content: `User visited '${experienceName}' in ${location || 'Sri Lanka'}. 
                            Generate:
                            1. A storytelling Instagram caption.
                            2. A 'Hidden Cultural Fact' (not commonly known).
                            3. Five trending hashtags.
                            
                            Return ONLY JSON:
                            {
                                "caption": "...",
                                "historicalGem": "...",
                                "tags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
                            }`
                        }
                    ],
                    response_format: { type: "json_object" }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log("GROQ Raw Response:", groqResponse.data.choices[0].message.content);
            aiData = JSON.parse(groqResponse.data.choices[0].message.content);
        } catch (aiError) {
            console.error("AI Generation Error (using fallback):", aiError.message);
            // AI එක fail වුණොත් fallback data පාවිච්චි කරන නිසා crash වෙන්නේ නැහැ
        }

        const newMoment = new Moment({
            userId,
            experienceName,
            imageUrl,
            location: location || "Sri Lanka",
            caption: aiData.caption,
            culturalInsight: aiData.historicalGem,
            hashtags: aiData.tags
        });

        await newMoment.save();

        res.status(201).json({
            success: true,
            message: "Moment preserved with AI insights!",
            data: newMoment
        });

    } catch (error) {
        console.error("Controller Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
};

/**
 * @desc    Get user's memory timeline
 * @route   GET /api/moments/user/:userId
 */
exports.getUserMoments = async (req, res) => {
    try {
        const moments = await Moment.find({ userId: req.params.userId }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: moments });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * @desc    Get details of a specific cultural moment
 * @route   GET /api/moments/detail/:id
 */
exports.getMomentDetail = async (req, res) => {
    try {
        const moment = await Moment.findById(req.params.id);
        
        if (!moment) {
            return res.status(404).json({ success: false, message: "Moment not found" });
        }
        
        res.status(200).json({ success: true, data: moment });
    } catch (error) {
        console.error("Detail Fetch Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};