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

        // 1. Fetch booking to check existing data and permissions
        const booking = await BookingExperience.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ error: "Booking request not found" });
        }

        const isHost = booking.host === userId;
        const isTourist = booking.tourist === userId;

        // 2. Authorization Logic
        if (status === 'confirmed' && !isHost) {
            return res.status(403).json({ error: "Only the host can confirm this booking" });
        }

        if (status === 'cancelled' && !isHost && !isTourist) {
            return res.status(403).json({ error: "Unauthorized to cancel this booking" });
        }

        // 3. Prepare Update Object
        let updateData = { status: status };

        /**
         * Handle Cancellation Audit:
         * If the status is 'cancelled', we determine the specific status 
         * and the initiator to save to the database.
         */
        if (status === 'cancelled') {
            if (isHost) {
                updateData.status = 'cancelled_by_host';
                updateData.cancelledBy = 'host';
            } else if (isTourist) {
                updateData.status = 'cancelled_by_tourist';
                updateData.cancelledBy = 'tourist';
            }
        }

        // 4. Perform Update
        // Note: runValidators is set to false to allow status updates even if 
        // older records are missing newer required fields (like hostName).
        const updatedBooking = await BookingExperience.findByIdAndUpdate(
            bookingId,
            updateData,
            { new: true, runValidators: false } 
        ).populate('experience', 'title images');

        res.status(200).json({ 
            msg: `Booking updated to ${updateData.status} successfully`, 
            booking: updatedBooking 
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