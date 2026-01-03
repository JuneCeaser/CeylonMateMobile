const Experience = require('../models/experience');

/**
 * @desc    Create a new cultural experience
 * @route   POST /api/experiences/add
 * @access  Private (Host only)
 */
exports.createExperience = async (req, res) => {
    try {
        let experienceData = { ...req.body };

        // FIX: Strict GeoJSON Validation
        if (!experienceData.location || 
            !experienceData.location.coordinates || 
            experienceData.location.coordinates.length !== 2) {
            experienceData.location = undefined; 
        }

        const newExperience = new Experience({
            ...experienceData,
            host: req.user.id // Assign host ID from authenticated user token
        });

        await newExperience.save();
        res.status(201).json({ msg: "Experience added successfully!", experience: newExperience });
    } catch (err) {
        console.error("Create Error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * @desc    Update an existing experience
 * @route   PUT /api/experiences/update/:id
 * @access  Private (Owner only)
 */
exports.updateExperience = async (req, res) => {
    try {
        let experience = await Experience.findById(req.params.id);
        if (!experience) return res.status(404).json({ error: "Experience not found" });

        // Authorization check
        if (experience.host.toString() !== req.user.id.toString()) {
            return res.status(401).json({ error: "Unauthorized access" });
        }

        let updateData = { ...req.body };

        // FIX: Location Validation for Update
        if (updateData.location && (!updateData.location.coordinates || updateData.location.coordinates.length !== 2)) {
            updateData.location = undefined; 
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

/**
 * @desc    Delete an experience
 * @route   DELETE /api/experiences/delete/:id
 * @access  Private (Owner only)
 */
exports.deleteExperience = async (req, res) => {
    try {
        const experience = await Experience.findById(req.params.id);
        if (!experience) return res.status(404).json({ error: "Experience not found" });

        if (experience.host.toString() !== req.user.id.toString()) {
            return res.status(401).json({ error: "Unauthorized access" });
        }

        await experience.deleteOne();
        res.json({ msg: "Experience deleted successfully" });
    } catch (err) {
        console.error("Delete Error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * @desc    Get all experiences with optional filters
 * @route   GET /api/experiences
 * @access  Public (Tourists)
 */
/**
 * @desc    Get all experiences with optional filters
 * @route   GET /api/experiences
 * @access  Public (Tourists)
 */
exports.getAllExperiences = async (req, res) => {
    try {
        const { category, search } = req.query;
        let query = {};

        if (category) query.category = category;
        if (search) query.title = { $regex: search, $options: 'i' };

        // 1. Fetch experiences and populate the 'host' field with the 'name' from the User model
        const experiences = await Experience.find(query)
            .populate('host', 'name') 
            .sort({ createdAt: -1 });

        // 2. TRANSFORM DATA: Loop through and flatten 'host.name' to 'hostName' 
        // This ensures the frontend card can simply use 'item.hostName'
        const formattedExperiences = experiences.map(exp => {
            const expObj = exp.toObject();
            return {
                ...expObj,
                hostName: exp.host?.name || "Local Guide", // Extract name or use fallback
                host: exp.host?._id || expObj.host // Keep the ID for references
            };
        });
            
        res.json(formattedExperiences);
    } catch (err) {
        console.error("Get All Error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * @desc    Get all experiences created by the logged-in host
 * @route   GET /api/experiences/my/list
 * @access  Private (Host only)
 */
exports.getMyExperiences = async (req, res) => {
    try {
        const experiences = await Experience.find({ host: req.user.id }).sort({ createdAt: -1 });
        res.json(experiences);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @desc    Get a single experience by its database ID
 * @route   GET /api/experiences/:id
 * @access  Public
 */
exports.getExperienceById = async (req, res) => {
    try {
        /**
         * FIX: Added .populate('host', 'name')
         * This joins the User collection to get the Host's name.
         * Without this, the mobile app cannot send 'hostName' in the booking request.
         */
        const experience = await Experience.findById(req.params.id).populate('host', 'name');
        
        if (!experience) return res.status(404).json({ error: "Experience not found" });

        // Transform the object to make it easy for the frontend to read hostName directly
        const experienceObj = experience.toObject();
        experienceObj.hostName = experience.host?.name || "Local Host";
        experienceObj.host = experience.host?._id || experienceObj.host;

        res.status(200).json(experienceObj);
    } catch (err) {
        console.error("Fetch Single Error:", err.message);
        res.status(500).json({ error: "Server error" });
    }
};