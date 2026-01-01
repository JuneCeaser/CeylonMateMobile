const mongoose = require('mongoose');

const bookingExperienceSchema = new mongoose.Schema({
  // Link to the specific Experience being booked
  experience: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Experience', 
    required: true 
  },
  // The Tourist's Firebase UID
  tourist: { 
    type: String, 
    required: true 
  },
  touristName: { 
    type: String, 
    required: true 
  },
  // The Host's Firebase UID (yours)
  host: { 
    type: String, 
    required: true, 
    index: true 
  },
  bookingDate: { 
    type: Date, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled', 'completed'], 
    default: 'pending' 
  },
  guests: { 
    type: Number, 
    default: 1 
  },
  totalPrice: { 
    type: Number, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('BookingExperience', bookingExperienceSchema);