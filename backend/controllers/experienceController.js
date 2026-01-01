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

        if (experience.host.toString() !== req.user.id.toString()) {
            return res.status(401).json({ error: "Unauthorized access" });
        }

        // Prepare the update data
        let updateData = { ...req.body };

        // FIX: If location is present but invalid (missing coordinates), remove it from update
        if (updateData.location && (!updateData.location.coordinates || updateData.location.coordinates.length !== 2)) {
            delete updateData.location; 
        }

        experience = await Experience.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        res.json({ msg: "Experience updated successfully", experience });
    } catch (err) {
        console.error("Update Error:", err.message);
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