const mongoose = require('mongoose');

const experienceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['Cooking', 'Farming', 'Handicraft', 'Fishing', 'Dancing'], 
    required: true 
  },
  
  // CHANGED: String type to store Firebase UID
  host: { 
    type: String, 
    required: true,
    index: true 
  },

  price: { type: Number, required: true },
  duration: { type: String }, 
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number] 
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

experienceSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Experience', experienceSchema);