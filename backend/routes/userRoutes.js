const express = require("express");
const {
  signup,
  verifyOTP,
  login,
  getUserDetails,
  deleteAccount,
  updateProfile,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
} = require("../controllers/userController");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

// Authentication
router.post("/signup", signup);
router.post("/verify", verifyOTP);
router.post("/login", login);

// Password Reset
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOTP);
router.post("/reset-password", resetPassword);

// Profile image upload only
router.post("/upload-profile-image", auth, upload.single("profileImage"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/profile-images/${req.file.filename}`;

    return res.status(200).json({
      msg: "Profile image uploaded successfully",
      imageUrl,
    });
  } catch (err) {
    console.error("Profile image upload error:", err);
    return res.status(500).json({ error: "Failed to upload profile image" });
  }
});

// Protected Routes
router.get("/me", auth, getUserDetails);
router.delete("/delete", auth, deleteAccount);
router.put("/update", auth, upload.single("profileImage"), updateProfile);

module.exports = router;