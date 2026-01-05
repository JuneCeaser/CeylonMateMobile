const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); 
const bookingExperienceController = require('../controllers/bookingExperienceController');
const BookingExperience = require('../models/bookingExperience');

/**
 * @route   GET /api/bookings/host-availability/:hostId
 */
router.get('/host-availability/:hostId', bookingExperienceController.getHostAvailability);

/**
 * @route   POST /api/bookings/add
 * @desc    Create a new booking and prevent duplicate bookings by the same tourist
 * @access  Private (Tourist)
 */
router.post('/add', auth, async (req, res) => {
    try {
        const { experience, bookingDate } = req.body;
        const touristId = req.user.id;

        /**
         * 1. DUPLICATE CHECK: 
         * Check if THIS specific tourist has already requested THIS experience 
         * for THIS exact date and time.
         */
        const existingBooking = await BookingExperience.findOne({
            tourist: touristId,
            experience: experience,
            bookingDate: bookingDate,
            status: { $ne: 'cancelled_by_tourist' } // Only block if it's not a previously cancelled one
        });

        if (existingBooking) {
            return res.status(400).json({ 
                error: "You have already sent a booking request for this experience at this specific time." 
            });
        }

        // 2. Proceed to create booking if no duplicate found
        const bookingData = {
            ...req.body,
            tourist: touristId 
        };
        
        const newBooking = new BookingExperience(bookingData);
        await newBooking.save();
        
        res.status(201).json({ msg: "Booking request created successfully", newBooking });
    } catch (err) {
        console.error("Booking POST Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @route   GET /api/bookings/host/list
 */
router.get('/host/list', auth, bookingExperienceController.getHostBookings);

/**
 * @route   PATCH /api/bookings/update-status/:id
 */
router.patch('/update-status/:id', auth, bookingExperienceController.updateStatus);

/**
 * @route   GET /api/bookings/tourist/my-list
 */
router.get('/tourist/my-list', auth, async (req, res) => {
    try {
        const bookings = await BookingExperience.find({ tourist: req.user.id })
            .populate('experience') 
            .sort({ createdAt: -1 });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

module.exports = router;