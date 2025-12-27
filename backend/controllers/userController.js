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
    pass: process.env.GMAIL_PASS, // This must be the 16-char App Password
  },
});

// Helper: Send OTP
const sendOTP = async (email, otp) => {
  console.log(`DEBUG: The OTP for ${email} is: ${otp}`); // This line helps you see the OTP in your terminal while testing
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

// Signup function
exports.signup = async (req, res) => {
  const { name, email, password, role, phone, nicNumber } = req.body;
  
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // Expires in 10 mins

    user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'tourist',
      phone,
      nicNumber,
      otp,
      otpExpires,
      isVerified: false,
    });
    
    await user.save();
    await sendOTP(email, otp);

    res.status(201).json({ msg: "OTP sent to your email" });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Verify OTP function (Signup)
exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
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

// Login function
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    if (!user.isVerified)
      return res.status(400).json({ error: "Email not verified" });

    // Token expires in 7 days (safer than 1000h)
    const token = jwt.sign(
      { 
        id: user._id,
        role: user.role
       }, 
       process.env.JWT_SECRET, 
       {expiresIn: "7d", }
      );

    res.status(200).json({ 
        token, 
        user: { 
            id: user._id,
            name: user.name, 
            email: user.email,
            role: user.role        } 
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
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 mins
    await user.save();

    await sendOTP(email, otp);

    res.status(200).json({ msg: "OTP sent to your email" });
  } catch (err) {
    console.error("Forgot password error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Verify OTP for Password Reset (Just checks validity)
exports.verifyResetOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
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

// Reset Password (REQUIRES OTP to be sent again for security)
exports.resetPassword = async (req, res) => {
  const { email, password, otp } = req.body; // Added OTP here

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Validate OTP again before changing password
    if (!user.otp || user.otp !== otp) {
        return res.status(400).json({ error: "Invalid OTP provided" });
    }

    if (user.otpExpires < Date.now()) {
        return res.status(400).json({ error: "OTP has expired" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    
    // Clear OTP
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
    const user = await User.findById(req.user.id).select("-password -otp -otpExpires");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update Profile
exports.updateProfile = async (req, res) => {
  const { name } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.name = name || user.name;
    await user.save();

    res.status(200).json({ msg: "Profile updated", user });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete Account
exports.deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.status(200).json({ msg: "Account deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};