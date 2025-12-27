const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['tourist', 'host'],     // Define user roles
    default: 'tourist'  
  },
  phone: { type: String, },
  nicNumber: { type: String, },
  otp: { type: String, required: false, default: null },
  otpExpires: { type: Date, default: null }, // Field to track expiration
  isVerified: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', userSchema);