const express = require('express');
const router = express.Router();

// 🟢 Authentication middleware to verify JWT tokens
const auth = require('../middleware/auth'); 

const bookingExperienceController = require('../controllers/bookingExperienceController');
const BookingExperience = require('../models/bookingExperience');

/**
 * @route   POST /api/bookings/add
 * @desc    Create a new booking (Used by Tourists)
 * @access  Private (Recommended to add 'auth' to capture tourist ID automatically)
 */
router.post('/add', auth, async (req, res) => {
    try {
        // Automatically assign the logged-in user's ID to the 'tourist' field
        const bookingData = {
            ...req.body,
            tourist: req.user.id 
        };
        
        const newBooking = new BookingExperience(bookingData);
        await newBooking.save();
        res.status(201).json({ msg: "Booking created successfully", newBooking });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route   GET /api/bookings/host/list
 * @desc    Get all booking requests for the logged-in Host
 * @access  Private
 */
router.get('/host/list', auth, bookingExperienceController.getHostBookings);

/**
 * @route   PATCH /api/bookings/update-status/:id
 * @desc    Accept (confirm) or Decline (cancel) a booking request
 * @access  Private
 */
router.patch('/update-status/:id', auth, bookingExperienceController.updateStatus);

/**
 * 🟢 UPDATED ROUTE
 * @route   GET /api/bookings/tourist/my-list
 * @desc    Get all bookings made by the currently logged-in Tourist
 * @access  Private
 */
router.get('/tourist/my-list', auth, async (req, res) => {
    try {
        /**
         * CHANGE MADE HERE:
         * Changed 'touristId' to 'tourist' to match your Schema in bookingExperience.js
         */
        const bookings = await BookingExperience.find({ tourist: req.user.id })
            .populate('experience') // Fetches experience details like Title and Images
            .sort({ createdAt: -1 }); 

        console.log(`Found ${bookings.length} bookings for user ${req.user.id}`);
        res.json(bookings);
    } catch (err) {
        console.error("Error fetching tourist bookings:", err.message);
        res.status(500).json({ error: "Server Error while fetching bookings" });
    }
});

module.exports = router;