const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');

// This route matches the 'api.get' call in your Dashboard
router.get('/:userId', recommendationController.getRecommendations);

module.exports = router;