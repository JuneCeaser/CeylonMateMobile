const BookingExperience = require('../models/bookingExperience');

/**
 * @desc    Get all booking requests assigned to the logged-in Host
 */
const getHostBookings = async (req, res) => {
    try {
        // Find bookings where host field matches the logged-in user ID
        const bookings = await BookingExperience.find({ host: req.user.id })
            .populate('experience', 'title price images') // Bring in Experience details
            .sort({ createdAt: -1 }); // Newest first

        res.status(200).json(bookings);
    } catch (err) {
        console.error("Fetch Host Bookings Error:", err.message);
        res.status(500).json({ error: "Failed to fetch booking requests" });
    }
};

/**
 * @desc    Update status of a booking (Confirm/Cancel)
 */
const updateStatus = async (req, res) => {
    try {
        const { status } = req.body; // 'confirmed' or 'cancelled'
        
        // Find booking by ID and ensure the host is the one requesting the update
        const booking = await BookingExperience.findOneAndUpdate(
            { _id: req.params.id, host: req.user.id },
            { status },
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({ error: "Booking request not found or unauthorized" });
        }

        res.status(200).json({ 
            msg: `Booking has been ${status} successfully`, 
            booking 
        });
    } catch (err) {
        console.error("Update Status Error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getHostBookings,
    updateStatus
};