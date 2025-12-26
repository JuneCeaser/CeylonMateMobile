const mongoose = require('mongoose');

const experienceSchema = new mongoose.Schema({
  title: { type: String, required: true }, // e.g., "Traditional Fish Curry Cooking"
  description: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['Cooking', 'Farming', 'Handicraft', 'Fishing', 'Dancing'], 
    required: true 
  },
  
  // Meka thama wedagathma - Me experience eka karana Villager (Host) kawda?
  host: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', // User model ekata link karanawa
    required: true 
  },

  price: { type: Number, required: true },
  duration: { type: String }, // e.g., "2 Hours"
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number] // [Longitude, Latitude]
  },

  // Voice Assistant ekata ona data
  voiceGuideContent: {
    intro: String,
    steps: [String],
    culturalSignificance: String
  },

  images: [String],
  video360Url: { type: String }, // VR viewer eka hadanna ona link eka
  rating: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

experienceSchema.index({ location: '2dsphere' });
module.exports = mongoose.model('Experience', experienceSchema);