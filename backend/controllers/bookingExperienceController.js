const BookingExperience = require("../models/bookingExperience");
const Experience = require("../models/experience");

const normalizeBookingDate = (value) => {
  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return null;
  }

  d.setHours(0, 0, 0, 0);
  return d;
};

const formatRequestedTime = (value) => {
  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * @desc    Get host availability using hostId
 * @route   GET /api/bookings/host-availability/:hostId
 * @access  Public/Private
 */
const getHostAvailability = async (req, res) => {
  try {
    const { hostId } = req.params;

    const bookings = await BookingExperience.find({
      host: hostId,
      status: "confirmed",
    }).select("bookingDate");

    res.status(200).json(bookings);
  } catch (err) {
    console.error("Availability Fetch Error:", err.message);
    res.status(500).json({ error: "Failed to fetch host availability" });
  }
};

/**
 * @desc    Get availability by experienceId
 * @route   GET /api/bookings/experience-availability/:experienceId
 * @access  Public
 */
const getExperienceAvailability = async (req, res) => {
  try {
    const { experienceId } = req.params;

    const exp = await Experience.findById(experienceId).select("host");
    if (!exp) {
      return res.status(404).json({ error: "Experience not found" });
    }

    const bookings = await BookingExperience.find({
      host: exp.host,
      status: "confirmed",
    }).select("bookingDate");

    res.status(200).json(bookings);
  } catch (err) {
    console.error("Experience Availability Fetch Error:", err.message);
    res.status(500).json({ error: "Failed to fetch experience availability" });
  }
};

/**
 * @desc    Create a new booking
 * @route   POST /api/bookings/add
 * @access  Private (Tourist)
 */
const createBooking = async (req, res) => {
  try {
    const touristId = req.user.id;

    const {
      experience,
      touristName,
      touristImage,
      bookingDate,
      guests,
      totalPrice,
      specialRequests,
    } = req.body;

    if (!experience || !bookingDate || !guests || !totalPrice) {
      return res.status(400).json({
        error: "experience, bookingDate, guests, and totalPrice are required",
      });
    }

    const normalizedBookingDate = normalizeBookingDate(bookingDate);

    if (!normalizedBookingDate) {
      return res.status(400).json({ error: "Invalid booking date" });
    }

    const requestedTime = formatRequestedTime(bookingDate);

    const exp = await Experience.findById(experience);
    if (!exp) {
      return res.status(404).json({ error: "Experience not found" });
    }

    const existingBooking = await BookingExperience.findOne({
      tourist: touristId,
      experience: exp._id,
      bookingDate: normalizedBookingDate,
      status: {
        $nin: ["cancelled_by_tourist", "cancelled_by_host", "cancelled"],
      },
    });

    if (existingBooking) {
      return res.status(400).json({
        error: "You have already sent a booking request for this date.",
      });
    }

    const confirmedDate = await BookingExperience.findOne({
      host: exp.host,
      bookingDate: normalizedBookingDate,
      status: "confirmed",
    });

    if (confirmedDate) {
      return res.status(400).json({
        error: "This date is already booked. Please choose another date.",
      });
    }

    const newBooking = await BookingExperience.create({
      experience: exp._id,
      tourist: touristId,
      touristName: touristName || "Traveler",
      touristImage: touristImage || "",
      host: exp.host,
      hostName: exp.hostName || "Host",
      bookingDate: normalizedBookingDate,
      requestedTime,
      guests: Number(guests),
      totalPrice: Number(totalPrice),
      specialRequests: specialRequests || "",
      status: "pending",
    });

    res.status(201).json({
      msg: "Booking request created successfully",
      newBooking,
    });
  } catch (err) {
    console.error("Booking POST Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * @desc    Get all booking requests assigned to the logged-in Host
 * @route   GET /api/bookings/host/list
 * @access  Private (Host only)
 */
const getHostBookings = async (req, res) => {
  try {
    const bookings = await BookingExperience.find({ host: req.user.id })
      .populate("experience", "title price images")
      .sort({ createdAt: -1 });

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
    const { status } = req.body;
    const bookingId = req.params.id;
    const userId = req.user.id;

    const booking = await BookingExperience.findById(bookingId).populate(
      "experience",
      "title"
    );

    if (!booking) {
      return res.status(404).json({ error: "Booking request not found" });
    }

    const isHost = booking.host.toString() === userId.toString();
    const isTourist = booking.tourist.toString() === userId.toString();

    if (status === "confirmed" && !isHost) {
      return res
        .status(403)
        .json({ error: "Only the host can confirm this booking" });
    }

    if (status === "cancelled" && !isHost && !isTourist) {
      return res.status(403).json({ error: "Unauthorized to cancel this booking" });
    }

    let updateData = { status };

    if (status === "cancelled") {
      if (isHost) {
        updateData.status = "cancelled_by_host";
        updateData.cancelledBy = "host";
      } else if (isTourist) {
        updateData.status = "cancelled_by_tourist";
        updateData.cancelledBy = "tourist";
      }
    }

    if (status === "confirmed") {
      const conflict = await BookingExperience.findOne({
        _id: { $ne: bookingId },
        host: booking.host,
        bookingDate: booking.bookingDate,
        status: "confirmed",
      });

      if (conflict) {
        return res.status(400).json({
          error: "This date has already been confirmed for another tourist.",
        });
      }
    }

    const updatedBooking = await BookingExperience.findByIdAndUpdate(
      bookingId,
      updateData,
      { new: true, runValidators: false }
    ).populate("experience", "title images");

    res.status(200).json({
      msg: `Booking successfully updated to: ${updateData.status}`,
      booking: updatedBooking,
    });
  } catch (err) {
    console.error("Update Status Error:", err.message);
    res.status(500).json({ error: "Server error occurred during status update" });
  }
};

/**
 * @desc    Get tourist bookings
 * @route   GET /api/bookings/tourist/my-list
 * @access  Private
 */
const getTouristBookings = async (req, res) => {
  try {
    const bookings = await BookingExperience.find({ tourist: req.user.id })
      .populate("experience")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

module.exports = {
  getHostAvailability,
  getExperienceAvailability,
  createBooking,
  getHostBookings,
  updateStatus,
  getTouristBookings,
};