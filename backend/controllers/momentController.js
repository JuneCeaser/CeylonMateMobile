const Moment = require('../models/Moment');
const axios = require('axios');

/**
 * @desc    Pre-check if image is a famous landmark or a general activity
 * @route   POST /api/moments/pre-check
 */
exports.preCheckMoment = async (req, res) => {
    try {
        const { imageUrl } = req.body;

        const groqResponse = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: "meta-llama/llama-4-scout-17b-16e-instruct", 
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Analyze this image. If it's a famous Sri Lankan landmark (like Sigiriya, Temple of Tooth), return 'LANDMARK'. If it's a general activity (cooking, dancing, craft) or personal moment, return 'ACTIVITY'. Return JSON: {'type': 'LANDMARK' | 'ACTIVITY', 'confidence': 0-1}"
                            },
                            { type: "image_url", image_url: { url: imageUrl } }
                        ]
                    }
                ],
                response_format: { type: "json_object" }
            },
            { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` } }
        );

        const aiResult = JSON.parse(groqResponse.data.choices[0].message.content);
        res.status(200).json({ success: true, data: aiResult });
    } catch (error) {
        console.error("Pre-check Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * @desc    Add a new cultural memory with Vision AI identification and Co-Creation hints
 * @route   POST /api/moments/add
 */
exports.addMoment = async (req, res) => {
    try {
        const { userId, imageUrl, location, userDescription, manualLocation } = req.body;

        if (!userId || !imageUrl) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Default data structure for fallback
        let aiData = {
            caption: "Capturing a beautiful moment of Sri Lankan heritage.",
            historicalGem: "Sri Lanka's culture is a blend of ancient traditions.",
            experienceName: "Cultural Activity",
            city: "Sri Lanka",
            tags: ["#CeylonMate", "#SriLanka", "#Heritage"]
        };

        try {
            const groqResponse = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: "meta-llama/llama-4-scout-17b-16e-instruct", 
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: `Identify this Sri Lankan cultural site or activity. 
                                    User Hint: ${userDescription || "No hint provided"}.
                                    
                                    Requirements:
                                    1. 'caption': Narrative storytelling style.
                                    2. 'historicalGem': Unique cultural or historical fact.
                                    3. 'experienceName': Official name of the identified site.
                                    4. 'city': The specific city where this landmark is located (e.g., Kandy, Galle, Sigiriya).
                                    5. 'tags': Array of 5 hashtags. EACH TAG MUST start with the '#' symbol. Include '#CeylonMate' as the first tag.
                                    
                                    Return ONLY JSON: {"caption": "...", "historicalGem": "...", "experienceName": "...", "city": "...", "tags": ["#CeylonMate", "#tag2", "..."]}`
                                },
                                { type: "image_url", image_url: { url: imageUrl } }
                            ]
                        }
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.2
                },
                { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` } }
            );

            aiData = JSON.parse(groqResponse.data.choices[0].message.content);
        } catch (aiError) {
            console.error("Vision AI Error:", aiError.message);
        }

        // --- SMART LOCATION LOGIC ---
        // Priority 1: Use Manual Location (if user typed one for an activity).
        // Priority 2: Use AI Identified City (if AI found a landmark like Dalada Maligawa).
        // Priority 3: Fallback to Device GPS (the 'location' variable from the frontend).
        const finalLocation = manualLocation || (aiData.city && aiData.city !== "Sri Lanka" ? `${aiData.city}, Sri Lanka` : location);

        const newMoment = new Moment({
            userId,
            experienceName: aiData.experienceName, 
            imageUrl,
            location: finalLocation, 
            caption: aiData.caption,
            culturalInsight: aiData.historicalGem,
            hashtags: aiData.tags // AI now strictly provides tags starting with '#'
        });

        await newMoment.save();
        res.status(201).json({ success: true, data: newMoment });
    } catch (error) {
        console.error("Main Controller Error:", error.message);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
};

/**
 * @desc    Get user's memory timeline (Sorted by newest)
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
 * @desc    Get full details of a specific cultural moment
 */
exports.getMomentDetail = async (req, res) => {
    try {
        const moment = await Moment.findById(req.params.id);
        if (!moment) return res.status(404).json({ success: false, message: "Not found" });
        res.status(200).json({ success: true, data: moment });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * @desc    Delete a single cultural moment
 */
exports.deleteMoment = async (req, res) => {
    try {
        const moment = await Moment.findById(req.params.id);
        if (!moment) return res.status(404).json({ success: false, message: "Not found" });
        await moment.deleteOne();
        res.status(200).json({ success: true, message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * @desc    Delete all moments for a user
 */
exports.deleteAllUserMoments = async (req, res) => {
    try {
        const result = await Moment.deleteMany({ userId: req.params.userId });
        res.status(200).json({ 
            success: true, 
            message: `${result.deletedCount} moments deleted successfully` 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * @desc    AI Recommendation Logic based on history
 */
exports.getRecommendations = async (req, res) => {
    try {
        const { userId } = req.params;
        const userMoments = await Moment.find({ userId }).limit(10);
        
        if (userMoments.length === 0) return res.status(200).json({ success: true, data: [] });

        const visitedPlaces = userMoments.map(m => m.experienceName).join(", ");

        const groqResponse = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "system",
                        content: "You are a Sri Lankan Cultural Expert. Suggest 3 NEW cultural sites based on history."
                    },
                    {
                        role: "user",
                        content: `User visited: ${visitedPlaces}. Suggest 3 DIFFERENT sites. Return JSON array: [{"name": "...", "reason": "...", "location": "..."}]`
                    }
                ],
                response_format: { type: "json_object" }
            },
            { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` } }
        );

        const recommendations = JSON.parse(groqResponse.data.choices[0].message.content);
        res.status(200).json({ success: true, data: recommendations.data || recommendations });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};