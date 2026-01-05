const mongoose = require('mongoose');

const MomentSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // Firebase UID එක
    experienceName: { type: String, required: true }, 
    imageUrl: { type: String, required: true },
    caption: { type: String },
    culturalInsight: { type: String }, 
    hashtags: [{ type: String }],
    location: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Moment', MomentSchema);