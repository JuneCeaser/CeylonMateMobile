const Newsletter = require("../models/Newsletter");

// Get latest 10 newsletters
const getNewsletters = async (req, res) => {
  try {
    // Fetch latest 10 newsletters sorted by creation date
    const newsletters = await Newsletter.find()
      .sort({ createdAt: -1 }) // Sort by latest first
      .limit(10); // Limit to 10 newsletters

    res.status(200).json(newsletters);
  } catch (error) {
    console.error("Error fetching newsletters:", error);
    res.status(500).json({
      message: "Error fetching newsletters",
      error: error.message,
    });
  }
};

module.exports = { getNewsletters };
