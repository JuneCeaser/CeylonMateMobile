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
        const { status } = req.body;
        const bookingId = req.params.id;
        const userId = req.user.id;

        // 1. Fetch booking to check permissions
        const booking = await BookingExperience.findById(bookingId);
        if (!booking) return res.status(404).json({ error: "Booking not found" });

        const isHost = booking.host === userId;
        const isTourist = booking.tourist === userId;

        // 2. Permission logic
        if (status === 'confirmed' && !isHost) {
            return res.status(403).json({ error: "Only the host can confirm" });
        }
        if (status === 'cancelled' && !isHost && !isTourist) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        // 3. Use findByIdAndUpdate to bypass validation of other required fields (like hostName)
        const updatedBooking = await BookingExperience.findByIdAndUpdate(
            bookingId,
            { status: status },
            { new: true, runValidators: false } // runValidators: false is key here
        ).populate('experience', 'title images');

        res.status(200).json({ 
            msg: `Booking ${status} successfully`, 
            booking: updatedBooking 
        });
    } catch (err) {
        console.error("Update Status Error:", err.message);
        res.status(500).json({ error: "Server error during update" });
    }
};

module.exports = {
    getHostBookings,
    updateStatus
};