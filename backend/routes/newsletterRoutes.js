const express = require("express");
const { getNewsletters } = require("../controllers/newsletterController");
const router = express.Router();

// Routes
router.get("/", getNewsletters);

module.exports = router;
