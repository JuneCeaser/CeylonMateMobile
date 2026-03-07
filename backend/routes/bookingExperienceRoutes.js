const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const bookingExperienceController = require("../controllers/bookingExperienceController");

/**
 * Public availability routes
 */
router.get(
  "/host-availability/:hostId",
  bookingExperienceController.getHostAvailability
);

router.get(
  "/experience-availability/:experienceId",
  bookingExperienceController.getExperienceAvailability
);

/**
 * Create booking
 */
router.post("/add", auth, bookingExperienceController.createBooking);

/**
 * Host list
 */
router.get("/host/list", auth, bookingExperienceController.getHostBookings);

/**
 * Update booking status
 */
router.patch("/update-status/:id", auth, bookingExperienceController.updateStatus);

/**
 * Tourist list
 */
router.get("/tourist/my-list", auth, bookingExperienceController.getTouristBookings);

module.exports = router;