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
  resetPassword
} = require("../controllers/userController");
const auth = require("../middleware/auth");

const router = express.Router();

// Authentication
router.post("/signup", signup);
router.post("/verify", verifyOTP);
router.post("/login", login);

// Password Reset
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOTP); // Optional: Use for UI check
router.post("/reset-password", resetPassword); // Actual reset

// Protected Routes
router.get("/me", auth, getUserDetails);
router.delete("/delete", auth, deleteAccount);
router.put("/update", auth, updateProfile);

module.exports = router;