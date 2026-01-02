const express = require('express');
const router = express.Router();

// Middleware to verify JWT tokens and attach user info to req.user
const auth = require('../middleware/auth'); 

const bookingExperienceController = require('../controllers/bookingExperienceController');
const BookingExperience = require('../models/bookingExperience');

/**
 * @route   POST /api/bookings/add
 * @desc    Create a new cultural experience booking
 * @access  Private (Requires Tourist login)
 */
router.post('/add', auth, async (req, res) => {
    try {
        // 🔍 DEBUG: Check if data (especially hostName) is being received from the Frontend
        console.log("Incoming Booking Data:", req.body);

        /**
         * The 'hostName' is a required field in your Mongoose Model.
         * If the Frontend does not send 'hostName', this request will throw a Validation Error.
         */
        const bookingData = {
            ...req.body,
            tourist: req.user.id // Automatically assign the Tourist UID from the JWT token
        };
        
        const newBooking = new BookingExperience(bookingData);
        await newBooking.save();
        
        res.status(201).json({ msg: "Booking created successfully", newBooking });
    } catch (err) {
        // 🔴 ERROR LOGGING: Detailed error output for backend troubleshooting
        console.error("Booking POST Error Details:", err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route   GET /api/bookings/host/list
 * @desc    Fetch all booking requests assigned to the logged-in Host
 * @access  Private (Requires Host login)
 */
router.get('/host/list', auth, bookingExperienceController.getHostBookings);

/**
 * @route   PATCH /api/bookings/update-status/:id
 * @desc    Confirm or Cancel a booking request
 * @access  Private (Requires Host or Tourist authorization)
 */
router.patch('/update-status/:id', auth, bookingExperienceController.updateStatus);

/**
 * @route   GET /api/bookings/tourist/my-list
 * @desc    Retrieve all bookings made by the currently logged-in Tourist
 * @access  Private (Requires Tourist login)
 */
router.get('/tourist/my-list', auth, async (req, res) => {
    try {
        // Search by the 'tourist' field to match your Schema definitions
        const bookings = await BookingExperience.find({ tourist: req.user.id })
            .populate('experience') // Attach full Experience details (Title, Image, etc.)
            .sort({ createdAt: -1 }); // Order by newest booking first

        res.json(bookings);
    } catch (err) {
        console.error("Error fetching tourist bookings:", err.message);
        res.status(500).json({ error: "Server Error occurred while fetching your bookings" });
    }
});

module.exports = router;