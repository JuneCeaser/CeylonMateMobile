const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 1. Ensure 'uploads' directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// 2. Configure Multer Storage (Saves to disk temporarily)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        // Unique filename to avoid overwrite: timestamp + original extension
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

/**
 * ROUTES
 */

// --- Text-based AI Assistant ---
router.post("/cultural-assistant", aiController.getCulturalAdvice);

// --- Voice-based AI Assistant ---
// Expects an audio file in the field named 'audio'
router.post("/cultural-assistant-voice", upload.single("audio"), aiController.speechToText);

module.exports = router;