const Experience = require('../models/experience');
const User = require('../models/userModel');

exports.getRecommendations = async (req, res) => {
    try {
        const { userId } = req.params; // This is the Firebase UID

        // Try to find user in MongoDB
        let user = await User.findOne({ firebaseUid: userId });

        // SAFEGUARD: If user is not in MongoDB, return empty data instead of 404
        if (!user) {
            console.log("User not found in MongoDB. Sending empty recommendations.");
            return res.status(200).json({ success: true, data: [] });
        }

        const allExperiences = await Experience.find({});
        const userInterests = user.preferences?.activityInterests || [];

        // Simple Content-based filtering logic
        const scoredExperiences = allExperiences.map(exp => {
            const expTags = exp.tags || [];
            // Count matching tags
            const matches = expTags.filter(tag => userInterests.includes(tag)).length;
            
            // Calculate a basic match percentage
            const matchScore = userInterests.length > 0 
                ? Math.round((matches / userInterests.length) * 100) 
                : 0;

            return { ...exp._doc, matchScore };
        });

        // Sort by highest match score
        const recommendations = scoredExperiences
            .filter(exp => exp.matchScore > 0)
            .sort((a, b) => b.matchScore - a.matchScore);

        res.status(200).json({ success: true, data: recommendations });
    } catch (error) {
        console.error("Recommender Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};