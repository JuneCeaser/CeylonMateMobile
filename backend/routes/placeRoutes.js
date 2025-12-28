// routes/placeRoutes.js

const express = require('express');
const { getNearbyPlace, addPlace, getPlaceDetails, chatWithPlace } = require('../controllers/placeController');
const auth = require('../middleware/auth'); 

const router = express.Router();

router.get('/nearby', getNearbyPlace); 
router.get('/:id', getPlaceDetails);
router.post('/add', addPlace);

// NEW: Chat Route
router.post('/chat', chatWithPlace);

module.exports = router;