// backend/routes/assistantRoutes.js

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const auth = require("../middleware/auth");
const assistantController = require("../controllers/assistantController");

/**
 * Ensure uploads directory exists
 */
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Multer storage
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname || ".m4a");
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

/**
 * Restrict uploads to likely audio files
 */
const fileFilter = (req, file, cb) => {
  const mime = file.mimetype || "";

  const allowed =
    mime.startsWith("audio/") ||
    mime === "application/octet-stream" ||
    mime === "video/mp4";

  if (!allowed) {
    return cb(new Error("Only audio uploads are allowed"));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB
  },
});

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