const express = require('express');
const router = express.Router();
const momentController = require('../controllers/momentController');

/**
 * @route   POST /api/moments/pre-check
 * @desc    AI analyzes image to determine if it's a Landmark or Activity
 * @note    Used to toggle manual input fields in the frontend
 */
router.post('/pre-check', momentController.preCheckMoment);

/**
 * @route   POST /api/moments/add
 * @desc    Create a new cultural memory with Vision AI and User hints
 */
router.post('/add', momentController.addMoment);

/**
 * @route   GET /api/moments/recommend/:userId
 * @desc    Fetch AI recommendations based on user's travel history
 */
router.get('/recommend/:userId', momentController.getRecommendations);

/**
 * @route   GET /api/moments/user/:userId
 * @desc    Retrieve all cultural moments for a specific user (Timeline)
 */
router.get('/user/:userId', momentController.getUserMoments);

/**
 * @route   GET /api/moments/detail/:id
 * @desc    Retrieve full details for a specific cultural moment
 */
router.get('/detail/:id', momentController.getMomentDetail);

/**
 * @route   DELETE /api/moments/:id
 * @desc    Delete a single cultural moment by ID
 */
router.delete('/:id', momentController.deleteMoment); 

/**
 * @route   DELETE /api/moments/user/all/:userId
 * @desc    Delete all cultural moments belonging to a specific user
 */
router.delete('/user/all/:userId', momentController.deleteAllUserMoments); 

module.exports = router;