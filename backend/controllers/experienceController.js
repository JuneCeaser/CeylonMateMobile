const Experience = require('../models/experience');

// Create Experience
exports.createExperience = async (req, res) => {
    try {
        const newExperience = new Experience({
            ...req.body,
            host: req.user.id 
        });

        await newExperience.save();
        res.status(201).json({ msg: "Experience added successfully!", experience: newExperience });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update Experience
exports.updateExperience = async (req, res) => {
    try {
        let experience = await Experience.findById(req.params.id);
        if (!experience) return res.status(404).json({ error: "Experience not found" });

        if (experience.host !== req.user.id) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        experience = await Experience.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ msg: "Experience updated successfully", experience });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Delete Experience
exports.deleteExperience = async (req, res) => {
    try {
        const experience = await Experience.findById(req.params.id);
        if (!experience) return res.status(404).json({ error: "Experience not found" });

        if (experience.host !== req.user.id) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        await experience.deleteOne();
        res.json({ msg: "Experience deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get All (For Tourists)
exports.getAllExperiences = async (req, res) => {
    try {
        const { category, search } = req.query;
        let query = {};

        if (category) query.category = category;
        if (search) query.title = { $regex: search, $options: 'i' };

        const experiences = await Experience.find(query);
        res.json(experiences);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get My List (For Host)
exports.getMyExperiences = async (req, res) => {
    try {
        const experiences = await Experience.find({ host: req.user.id });
        res.json(experiences);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get Single ID
exports.getExperienceById = async (req, res) => {
    try {
        const experience = await Experience.findById(req.params.id);
        if (!experience) return res.status(404).json({ error: "Experience not found" });
        res.status(200).json(experience);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
};