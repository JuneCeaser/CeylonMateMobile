const mongoose = require('mongoose');

const placeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  history: { type: String },
  
  facts: [
    { label: { type: String }, value: { type: String } }
  ],

  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } 
  },

 
  model3DNowUrl: { type: String },  // The "Modern" view
  model3DThenUrl: { type: String }, // The "Ancient" view

  arOverlayUrl: { type: String },
  images: [String],
  createdAt: { type: Date, default: Date.now }
});

placeSchema.index({ location: '2dsphere' });
module.exports = mongoose.model('Place', placeSchema);