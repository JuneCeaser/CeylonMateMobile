const BookingExperience = require('../models/bookingExperience');

/**
 * @desc    Get all booking requests assigned to the logged-in Host
 * @access  Private (Host only)
 */
const getHostBookings = async (req, res) => {
    try {
        // Find bookings where 'host' field matches the logged-in user ID (Firebase UID)
        const bookings = await BookingExperience.find({ host: req.user.id })
            .populate('experience', 'title price images') 
            .sort({ createdAt: -1 });

        res.status(200).json(bookings);
    } catch (err) {
        console.error("Fetch Host Bookings Error:", err.message);
        res.status(500).json({ error: "Failed to fetch booking requests" });
    }
};

/**
 * @desc    Update status of a booking (Confirm/Cancel)
 * @access  Private (Host or Tourist)
 */
const updateStatus = async (req, res) => {
    try {
        const { status } = req.body; // Expecting 'confirmed' or 'cancelled'
        const bookingId = req.params.id;
        const userId = req.user.id;

        // 1. Find the booking first to check who is trying to update it
        const booking = await BookingExperience.findById(bookingId);

        if (!booking) {
            return res.status(404).json({ error: "Booking request not found" });
        }

        /**
         * 2. Permission Logic:
         * - If status is 'confirmed', ONLY the Host can do it.
         * - If status is 'cancelled', EITHER the Host OR the Tourist can do it.
         */
        const isHost = booking.host === userId;
        const isTourist = booking.tourist === userId;

        if (status === 'confirmed' && !isHost) {
            return res.status(403).json({ error: "Only the host can confirm this booking" });
        }

        if (status === 'cancelled' && !isHost && !isTourist) {
            return res.status(403).json({ error: "Unauthorized to cancel this booking" });
        }

        // 3. Perform the update
        booking.status = status;
        await booking.save();

        // Optional: Populate experience details before sending back to frontend
        await booking.populate('experience', 'title images');

        res.status(200).json({ 
            msg: `Booking has been ${status} successfully`, 
            booking 
        });
    } catch (err) {
        console.error("Update Status Error:", err.message);
        res.status(500).json({ error: "Server error during status update" });
    }
};

module.exports = {
    getHostBookings,
    updateStatus
};