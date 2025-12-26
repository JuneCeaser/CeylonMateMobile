const Experience = require('../models/experience');

/**
 * @desc    Create a new experience
 * @route   POST /api/experiences/add
 * @access  Private (Host only)
 */
exports.createExperience = async (req, res) => {
    try {
        // Create new experience instance with spread data from request body
        // The 'host' field is automatically populated using the user ID from the 'auth' middleware
        const newExperience = new Experience({
            ...req.body,
            host: req.user.id 
        });

        // Save to MongoDB
        await newExperience.save();
        res.status(201).json({ msg: "Experience added successfully!", experience: newExperience });
    } catch (err) {
        console.error("Create Experience Error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * @desc    Get all experiences with optional category filtering
 * @route   GET /api/experiences?category=Cooking
 * @access  Public
 */
exports.getAllExperiences = async (req, res) => {
    try {
        let query = {};

        // If 'category' is provided in the URL, add it to the search query
        if (req.query.category) {
            query.category = req.query.category;
        }

        // Find experiences based on the query (filter or all)
        const experiences = await Experience.find(query).populate('host', 'name email');
        
        res.status(200).json(experiences);
    } catch (err) {
        console.error("Get Experiences Error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * @desc    Get a single experience by its ID
 * @route   GET /api/experiences/:id
 * @access  Public
 */
exports.getExperienceById = async (req, res) => {
    try {
        // Find a specific experience by its MongoDB _id
        const experience = await Experience.findById(req.params.id).populate('host', 'name email');
        
        // If no experience is found, return 404
        if (!experience) {
            return res.status(404).json({ error: "Experience not found" });
        }
        
        res.status(200).json(experience);
    } catch (err) {
        // Handle invalid MongoDB ObjectIDs to avoid server crash
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ error: "Experience not found" });
        }
        console.error("Get Single Experience Error:", err.message);
        res.status(500).json({ error: "Server error" });
    }
};