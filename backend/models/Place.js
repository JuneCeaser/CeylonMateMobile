const mongoose = require('mongoose');

const placeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  history: { type: String }, // Detailed historical info
  
  // GeoJSON is crucial for location-based searching
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { 
      type: [Number], 
      required: true 
    } // Important: MongoDB expects [Longitude, Latitude]
  },

  // 3D & AR Assets
  model3DUrl: { type: String }, // URL for the .glb/.gltf file (Current state)
  arOverlayUrl: { type: String }, // URL for the "Past/Ancient" version for AR
  
  images: [String], // Array of image URLs
  createdAt: { type: Date, default: Date.now }
});

// Create a geospatial index so we can search by distance
placeSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Place', placeSchema);