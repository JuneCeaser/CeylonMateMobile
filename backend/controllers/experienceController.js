const Experience = require('../models/experience');

/**
 * @desc    Create a new experience (Host Only)
 * @route   POST /api/experiences/add
 */
exports.createExperience = async (req, res) => {
    try {
        const newExperience = new Experience({
            ...req.body,
            host: req.user.id // Taken from the 'auth' middleware
        });

        await newExperience.save();
        res.status(201).json({ msg: "Experience added successfully!", experience: newExperience });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @desc    Update an existing experience (Host Only - Owner check included)
 * @route   PUT /api/experiences/update/:id
 */
exports.updateExperience = async (req, res) => {
    try {
        let experience = await Experience.findById(req.params.id);
        if (!experience) return res.status(404).json({ error: "Experience not found" });

        // Security check: Only the owner (host) can update this
        if (experience.host.toString() !== req.user.id) {
            return res.status(401).json({ error: "Unauthorized: You can only edit your own experiences" });
        }

        experience = await Experience.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ msg: "Experience updated successfully", experience });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @desc    Delete an experience (Host Only - Owner check included)
 * @route   DELETE /api/experiences/delete/:id
 */
exports.deleteExperience = async (req, res) => {
    try {
        const experience = await Experience.findById(req.params.id);
        if (!experience) return res.status(404).json({ error: "Experience not found" });

        // Security check: Only the owner (host) can delete this
        if (experience.host.toString() !== req.user.id) {
            return res.status(401).json({ error: "Unauthorized: You can only delete your own experiences" });
        }

        await experience.deleteOne();
        res.json({ msg: "Experience deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @desc    Get all experiences with filters (Tourist Search)
 * @route   GET /api/experiences?category=Cooking&search=Curry
 */
exports.getAllExperiences = async (req, res) => {
    try {
        const { category, search } = req.query;
        let query = {};

        // Filter by category if provided
        if (category) query.category = category;
        
        // Search by title using regex (case-insensitive)
        if (search) query.title = { $regex: search, $options: 'i' };

        const experiences = await Experience.find(query).populate('host', 'name email phone');
        res.json(experiences);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @desc    Get list of experiences added by the logged-in Host
 * @route   GET /api/experiences/my/list
 */
exports.getMyExperiences = async (req, res) => {
    try {
        const experiences = await Experience.find({ host: req.user.id });
        res.json(experiences);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @desc    Get full details of a single experience by ID
 * @route   GET /api/experiences/:id
 */
exports.getExperienceById = async (req, res) => {
    try {
        const experience = await Experience.findById(req.params.id).populate('host', 'name email phone');
        if (!experience) return res.status(404).json({ error: "Experience not found" });
        res.status(200).json(experience);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
};