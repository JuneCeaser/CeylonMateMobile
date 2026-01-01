const express = require('express');
const router = express.Router();

// 🟢 Import as 'auth' to match your original auth.js style
const auth = require('../middleware/auth'); 

const bookingExperienceController = require('../controllers/bookingExperienceController');
const BookingExperience = require('../models/bookingExperience');

// English Comments for clarity
/**
 * @route   POST /api/bookings/add
 * @desc    Create a dummy booking for testing purposes
 */
router.post('/add', async (req, res) => {
    try {
        const newBooking = new BookingExperience(req.body);
        await newBooking.save();
        res.status(201).json({ msg: "Booking created successfully", newBooking });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route   GET /api/bookings/host/list
 * @desc    Get all bookings for the logged-in Host
 * @access  Private (Using original auth middleware)
 */
router.get('/host/list', auth, bookingExperienceController.getHostBookings);

/**
 * @route   PATCH /api/bookings/update-status/:id
 * @desc    Accept or Decline a booking request
 * @access  Private
 */
router.patch('/update-status/:id', auth, bookingExperienceController.updateStatus);

module.exports = router;