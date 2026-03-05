// backend/routes/assistantRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const auth = require("../middleware/auth");
const assistantController = require("../controllers/assistantController");

// Ensure uploads dir
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

/**
 * Tourist endpoints
 */
router.post("/ask", auth, assistantController.askAssistant);
router.post("/voice", auth, upload.single("audio"), assistantController.voiceAssistant);
router.get("/history", auth, assistantController.getMyHistory);

/**
 * Host endpoints
 */
router.post("/verifiedqa/add", auth, assistantController.addVerifiedQA);
router.get("/unknown/:experienceId", auth, assistantController.getUnknownForExperience);

module.exports = router;