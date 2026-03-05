// backend/routes/experienceRoutes.js
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");

const {
  createExperience,
  getAllExperiences,
  getExperienceById,
  updateExperience,
  deleteExperience,
  getMyExperiences,
  regenerateKnowledge,
  getMyExperienceById, // ✅ NEW
} = require("../controllers/experienceController");

/**
 * ✅ IMPORTANT ROUTE ORDER RULE:
 * Put fixed/specific routes BEFORE "/:id"
 * Otherwise "/:id" will catch them.
 */

// -------------------- PRIVATE (Host) --------------------

// Get only logged-in host's experiences
router.get("/my/list", auth, getMyExperiences);

// ✅ NEW: Get one experience for host (includes hidden AI + hostFullNotes)
router.get("/my/one/:id", auth, getMyExperienceById);

// Create experience (host)
router.post("/add", auth, createExperience);

// Regenerate assistantKnowledge (host)
router.post("/:id/regenerate-knowledge", auth, regenerateKnowledge);

// Update experience (host)
router.put("/update/:id", auth, updateExperience);

// Delete experience (host)
router.delete(
  "/delete/:id",
  auth,
  (req, res, next) => {
    console.log("✅ DELETE route hit:", req.params.id);
    console.log("🔐 Token user id:", req.user?.id);
    next();
  },
  deleteExperience
);

// -------------------- PUBLIC --------------------

// Get all experiences (tourist/public)
router.get("/", getAllExperiences);

// Get single experience (public) - must be LAST because it is dynamic
router.get("/:id", getExperienceById);

module.exports = router;