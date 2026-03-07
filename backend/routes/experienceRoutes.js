// backend/routes/experienceRoutes.js

const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const upload = require("../middleware/upload");

const {
  createExperience,
  getAllExperiences,
  getExperienceById,
  updateExperience,
  deleteExperience,
  getMyExperiences,
  regenerateKnowledge,
  getMyExperienceById,
} = require("../controllers/experienceController");

/**
 * Upload fields
 */
const uploadExperienceMedia = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "vrImage", maxCount: 1 },
]);

/**
 * IMPORTANT:
 * Put fixed/specific routes BEFORE "/:id"
 * Otherwise "/:id" can catch them.
 */

// -------------------- PRIVATE (Host) --------------------

// Get only logged-in host's experiences
router.get("/my/list", auth, getMyExperiences);

// Get one experience for host (includes hidden AI + hostFullNotes)
router.get("/my/one/:id", auth, getMyExperienceById);

// Create experience (host)
router.post("/add", auth, uploadExperienceMedia, createExperience);

// Regenerate assistant knowledge (host)
router.post("/:id/regenerate-knowledge", auth, regenerateKnowledge);

// Update experience (host)
router.put("/update/:id", auth, uploadExperienceMedia, updateExperience);

// Delete experience (host)
router.delete("/delete/:id", auth, deleteExperience);

// -------------------- PUBLIC --------------------

// Get all experiences (tourist/public)
router.get("/", getAllExperiences);

// Get single experience (tourist/public)
router.get("/:id", getExperienceById);

module.exports = router;