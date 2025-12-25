const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

// Middleware that extracts user info from token but doesn't block requests if token is invalid
const noAuth = async (req, res, next) => {
  try {
    const token = req.header("x-auth-token");

    if (!token) {
      // No token provided, but we'll still continue
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by id (without returning password)
    const user = await User.findById(decoded.id).select("-password -otp");

    if (!user) {
      return next();
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (err) {
    // Token is invalid, but we'll continue anyway
    next();
  }
};

module.exports = noAuth;
