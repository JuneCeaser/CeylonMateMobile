const express = require("express");
const axios = require("axios");
const User = require("../models/userModel");

const router = express.Router();

// Test route to get recommendations from Python server
router.post("/test", async (req, res) => {
  try {
    const { interests } = req.body;

    const response = await axios.post("http://127.0.0.1:5002/recommend", {
      interests,
    });

    res.json(response.data);
  } catch (error) {
    console.error("Recommendation route error:", error.message);
    res.status(500).json({
      message: "Failed to fetch recommendations",
      error: error.message,
    });
  }
});

router.post("/save-interests", async (req, res) => {
  try {
    const { firebaseUid, interests } = req.body;

    if (!firebaseUid || !Array.isArray(interests)) {
      return res.status(400).json({
        message: "firebaseUid and interests array are required",
      });
    }

    const user = await User.findOne({ firebaseUid });

    if (!user) {
      return res.status(404).json({
        message: "User not found in MongoDB",
      });
    }

    if (user.role !== "tourist") {
      return res.status(400).json({
        message: "Only tourists can save recommendation interests",
      });
    }

    user.recommendationProfile = {
      interests,
    };

    await user.save();

    res.json({
      message: "Interests saved successfully",
      recommendationProfile: user.recommendationProfile,
    });
  } catch (error) {
    console.error("Save interests error:", error.message);
    res.status(500).json({
      message: "Failed to save interests",
      error: error.message,
    });
  }
});

module.exports = router;