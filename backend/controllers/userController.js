const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
require("dotenv").config();

// Nodemailer transporter (Reusable)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// Helper: Send OTP
const sendOTP = async (email, otp) => {
  console.log(`DEBUG: The OTP for ${email} is: ${otp}`);
  console.log("Sending OTP to:", email);

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP is: ${otp}. It expires in 10 minutes.`,
    html: `<h2>Your OTP Code: <strong>${otp}</strong></h2><p>This code expires in 10 minutes.</p>`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("OTP email sent:", info.response);
  } catch (err) {
    console.error("Error sending OTP email:", err);
    throw new Error("Failed to send OTP email");
  }
};

// Signup
exports.signup = async (req, res) => {
  const { name, email, password, role, phone, nicNumber } = req.body;

  try {
    const normalizedEmail = String(email || "").trim().toLowerCase();

    let user = await User.findOne({ email: normalizedEmail });
    if (user) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    user = new User({
      name: String(name || "").trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: role || "tourist",
      phone: phone ? String(phone).trim() : "",
      nicNumber: nicNumber ? String(nicNumber).trim() : "",
      otp,
      otpExpires,
      isVerified: false,
    });

    await user.save();
    await sendOTP(user.email, otp);

    res.status(201).json({ msg: "OTP sent to your email" });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const normalizedEmail = String(email || "").trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) return res.status(400).json({ error: "User not found" });

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ error: "OTP has expired" });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;

    await user.save();

    res.status(200).json({ msg: "Email verified successfully" });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) return res.status(400).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    if (!user.isVerified) {
      return res.status(400).json({ error: "Email not verified" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || "",
        bio: user.bio || "",
        location: user.location || "",
        profileImage: user.profileImage || "",
        firebaseUid: user.firebaseUid || "",
      },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Forgot Password - Send OTP
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) return res.status(404).json({ error: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;

    await user.save();
    await sendOTP(user.email, otp);

    res.status(200).json({ msg: "OTP sent to your email" });
  } catch (err) {
    console.error("Forgot password error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Verify Reset OTP
exports.verifyResetOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ error: "OTP has expired" });
    }

    res.status(200).json({ msg: "OTP verified successfully" });
  } catch (err) {
    console.error("OTP verification error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  const { email, password, otp } = req.body;

  try {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP provided" });
    }

    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ error: "OTP has expired" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.otp = null;
    user.otpExpires = null;

    await user.save();

    res.status(200).json({ msg: "Password reset successfully" });
  } catch (err) {
    console.error("Password reset error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get User Details
exports.getUserDetails = async (req, res) => {
  try {
    const firebaseUid = String(req.user?.id || "").trim();
    const email = String(req.user?.email || "").trim().toLowerCase();

    let user = null;

    if (firebaseUid) {
      user = await User.findOne({ firebaseUid }).select("-password -otp -otpExpires");
    }

    if (!user && email) {
      user = await User.findOne({ email }).select("-password -otp -otpExpires");
    }

    if (!user) return res.status(404).json({ error: "User not found" });

    res.status(200).json(user);
  } catch (err) {
    console.error("Get user details error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update Profile
exports.updateProfile = async (req, res) => {
  const { name, phone, bio, location, removeProfileImage } = req.body;

  try {
    const firebaseUid = String(req.user?.id || "").trim();
    const email = String(req.user?.email || "").trim().toLowerCase();

    if (!firebaseUid && !email) {
      return res.status(401).json({ error: "User identity not found in token" });
    }

    let user = null;

    if (firebaseUid) {
      user = await User.findOne({ firebaseUid });
    }

    if (!user && email) {
      user = await User.findOne({ email });
    }

    if (!user) {
      user = new User({
        firebaseUid,
        email,
        name: name ? String(name).trim() : "User",
        phone: phone ? String(phone).trim() : "",
        bio: bio ? String(bio).trim() : "",
        location: location ? String(location).trim() : "",
        profileImage: "",
        role: "host",
        isVerified: true,
        password: "",
      });
    }

    if (firebaseUid) user.firebaseUid = firebaseUid;
    if (email) user.email = email;

    user.name = name !== undefined ? String(name).trim() : user.name;
    user.phone = phone !== undefined ? String(phone).trim() : user.phone;
    user.bio = bio !== undefined ? String(bio).trim() : user.bio;
    user.location = location !== undefined ? String(location).trim() : user.location;

    if (removeProfileImage === "true") {
      user.profileImage = "";
    }

    if (req.file) {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      user.profileImage = `${baseUrl}/uploads/profile-images/${req.file.filename}`;
    }

    await user.save();

    const safeUser = await User.findById(user._id).select("-password -otp -otpExpires");

    res.status(200).json({
      msg: "Profile updated successfully",
      user: safeUser,
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete Account
exports.deleteAccount = async (req, res) => {
  try {
    const firebaseUid = String(req.user?.id || "").trim();
    const email = String(req.user?.email || "").trim().toLowerCase();

    let deletedUser = null;

    if (firebaseUid) {
      deletedUser = await User.findOneAndDelete({ firebaseUid });
    }

    if (!deletedUser && email) {
      deletedUser = await User.findOneAndDelete({ email });
    }

    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ msg: "Account deleted successfully" });
  } catch (err) {
    console.error("Delete account error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};