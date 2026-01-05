const mongoose = require('mongoose');

const experienceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['Cooking', 'Farming', 'Handicraft', 'Fishing', 'Dancing'], 
    required: true 
  },
  
  // Firebase UID of the host
  host: { 
    type: String, 
    required: true,
    index: true 
  },

  price: { type: Number, required: true },
  duration: { type: String }, 
  
  // UPDATED: Location logic to avoid GeoJSON errors
  location: {
    type: { 
      type: String, 
      enum: ['Point'],
      required: false // Removed default 'Point' to prevent auto-insertion
    },
    coordinates: {
      type: [Number],
      required: false
    }
  },

  voiceGuideContent: {
    intro: String,
    steps: [String],
    culturalSignificance: String
  },

  images: [String], 
  video360Url: { type: String }, 
  rating: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Index for map-based searches (only works if location data is valid)
experienceSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Experience', experienceSchema);