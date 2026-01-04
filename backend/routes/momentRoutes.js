const express = require('express');
const router = express.Router();
const momentController = require('../controllers/momentController');

/**
 * @route   POST /api/moments/add
 * @desc    Create a new cultural memory (Uses GROQ AI for captions & insights)
 * @access  Private
 */
router.post('/add', momentController.addMoment);

/**
 * @route   GET /api/moments/user/:userId
 * @desc    Get all cultural moments for a specific tourist (Timeline)
 * @access  Private
 */
router.get('/user/:userId', momentController.getUserMoments);

/**
 * @route   GET /api/moments/detail/:id
 * @desc    Get full details of a specific moment (For Detail Screen)
 * @access  Private
 */
router.get('/detail/:id', momentController.getMomentDetail);

module.exports = router;