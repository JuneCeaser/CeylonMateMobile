const mongoose = require('mongoose');

const experienceSchema = new mongoose.Schema({
  title: { type: String, required: true }, // Name of the experience
  description: { type: String, required: true }, // Detailed description
  category: { 
    type: String, 
    enum: ['Cooking', 'Farming', 'Handicraft', 'Fishing', 'Dancing'], 
    required: true 
  },
  
  // Reference to the User (Host) who created this experience
  host: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },

  price: { type: Number, required: true },
  duration: { type: String }, // Duration (e.g., "3 Hours")
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number] // [Longitude, Latitude]
  },

  // Data for the future Voice Assistant
  voiceGuideContent: {
    intro: String,
    steps: [String],
    culturalSignificance: String
  },

  images: [String], // Array of image URLs
  video360Url: { type: String }, // Link for VR viewing
  rating: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Enable geospatial queries for location-based searches
experienceSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Experience', experienceSchema);