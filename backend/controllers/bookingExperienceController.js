const BookingExperience = require('../models/bookingExperience');

/**
 * @desc    Get host availability (Blocks both Confirmed and Pending slots)
 * @route   GET /api/bookings/host-availability/:hostId
 * @access  Public/Private
 */
const getHostAvailability = async (req, res) => {
    try {
        const { hostId } = req.params;

        /**
         * We fetch bookings where status is 'confirmed' OR 'pending'.
         * This ensures that as soon as a tourist makes a request, 
         * that time slot is reserved and hidden from others until the host decides.
         */
        const bookings = await BookingExperience.find({
            host: hostId,
            status: { $in: ['confirmed', 'pending'] }
        }).select('bookingDate'); // We only need the date to block the calendar

        res.status(200).json(bookings);
    } catch (err) {
        console.error("Availability Fetch Error:", err.message);
        res.status(500).json({ error: "Failed to fetch host availability" });
    }
};

/**
 * @desc    Get all booking requests assigned to the logged-in Host
 * @route   GET /api/bookings/host/list
 * @access  Private (Host only)
 */
const getHostBookings = async (req, res) => {
    try {
        // Find all bookings for this host and include experience details (title, price, image)
        const bookings = await BookingExperience.find({ host: req.user.id })
            .populate('experience', 'title price images') 
            .sort({ createdAt: -1 }); // Newest requests first

        res.status(200).json(bookings);
    } catch (err) {
        console.error("Fetch Host Bookings Error:", err.message);
        res.status(500).json({ error: "Failed to fetch booking requests" });
    }
};

/**
 * @desc    Update status of a booking (Confirm or Cancel)
 * @route   PATCH /api/bookings/update-status/:id
 * @access  Private (Host or Tourist)
 */
const updateStatus = async (req, res) => {
    try {
        const { status } = req.body; // Incoming status: 'confirmed' or 'cancelled'
        const bookingId = req.params.id;
        const userId = req.user.id;

        // 1. Verify if the booking exists
        const booking = await BookingExperience.findById(bookingId).populate('experience', 'title');
        if (!booking) {
            return res.status(404).json({ error: "Booking request not found" });
        }

        // 2. Determine user ownership
        const isHost = booking.host.toString() === userId.toString();
        const isTourist = booking.tourist.toString() === userId.toString();

        // 3. Authorization Check
        if (status === 'confirmed' && !isHost) {
            return res.status(403).json({ error: "Only the host can confirm this booking" });
        }

        if (status === 'cancelled' && !isHost && !isTourist) {
            return res.status(403).json({ error: "Unauthorized to cancel this booking" });
        }

        // 4. Prepare Status Updates
        let updateData = { status: status };

        // Handle logical status for cancellations
        if (status === 'cancelled') {
            if (isHost) {
                updateData.status = 'cancelled_by_host';
                updateData.cancelledBy = 'host';
            } else if (isTourist) {
                updateData.status = 'cancelled_by_tourist';
                updateData.cancelledBy = 'tourist';
            }
        }

        /**
         * 5. Double Booking Prevention (Race Condition)
         * Before confirming, we re-check if any other booking was confirmed 
         * at this exact time while this request was 'pending'.
         */
        if (status === 'confirmed') {
            const conflict = await BookingExperience.findOne({
                _id: { $ne: bookingId }, // Ignore current booking
                host: booking.host,
                bookingDate: booking.bookingDate,
                status: 'confirmed'
            });

            if (conflict) {
                return res.status(400).json({ 
                    error: "Availability mismatch: This slot was recently confirmed for another tourist." 
                });
            }
        }

        // 6. Update the record
        const updatedBooking = await BookingExperience.findByIdAndUpdate(
            bookingId,
            updateData,
            { new: true, runValidators: false } 
        ).populate('experience', 'title images');

        res.status(200).json({ 
            msg: `Booking successfully updated to: ${updateData.status}`, 
            booking: updatedBooking 
        });

    } catch (err) {
        console.error("Update Status Error:", err.message);
        res.status(500).json({ error: "Server error occurred during status update" });
    }
};

module.exports = {
    getHostAvailability, // Exported to be used in routes
    getHostBookings,
    updateStatus
};