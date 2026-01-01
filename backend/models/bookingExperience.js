const mongoose = require('mongoose');

const bookingExperienceSchema = new mongoose.Schema({
  // Reference to the cultural experience document in the 'Experience' collection
  experience: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Experience', 
    required: true 
  },
  
  // The Firebase UID of the tourist making the booking
  // Indexed to make searching for "My Bookings" faster
  tourist: { 
    type: String, 
    required: true,
    index: true 
  },
  
  // Name of the tourist for display purposes on the host's side
  touristName: { 
    type: String, 
    required: true 
  },
  
  // Profile image URL of the tourist (Optional)
  touristImage: { 
    type: String 
  },
  
  // The Firebase UID of the host providing the experience
  host: { 
    type: String, 
    required: true, 
    index: true 
  },
  
  // Name of the host to easily display on the tourist's "My Bookings" page
  hostName: { 
    type: String,
    required: true 
  },
  
  // The specific date selected for the experience
  bookingDate: { 
    type: Date, 
    required: true 
  },
  
  // Current status of the booking lifecycle
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled', 'completed'], 
    default: 'pending' 
  },
  
  // Number of people attending the experience
  guests: { 
    type: Number, 
    default: 1 
  },
  
  // Total calculated price for the booking (LKR)
  totalPrice: { 
    type: Number, 
    required: true 
  },
  
  // Additional notes or requirements provided by the tourist (Optional)
  specialRequests: { 
    type: String
  },
  
  // Timestamp when the booking record was created
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

/**
 * Optional: Prevent duplicate bookings for the same experience by the same user 
 * on the same day to avoid spam.
 */
// bookingExperienceSchema.index({ experience: 1, tourist: 1, bookingDate: 1 }, { unique: true });

module.exports = mongoose.model('BookingExperience', bookingExperienceSchema);