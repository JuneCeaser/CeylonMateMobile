const mongoose = require('mongoose');

const placeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  history: { type: String },
  
  // 👇 ADD THIS NEW SECTION
  facts: [
    {
      label: { type: String }, // e.g., "Height"
      value: { type: String }  // e.g., "122 meters"
    }
  ],
  // -----------------------

  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } 
  },
  model3DUrl: { type: String },
  arOverlayUrl: { type: String },
  images: [String],
  createdAt: { type: Date, default: Date.now }
});

placeSchema.index({ location: '2dsphere' });
module.exports = mongoose.model('Place', placeSchema);