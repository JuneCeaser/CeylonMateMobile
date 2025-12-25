const express = require('express');
const { getNearbyPlace, addPlace, getPlaceDetails } = require('../controllers/placeController');
const auth = require('../middleware/auth'); // If you want to protect these routes

const router = express.Router();

// GET /api/places/nearby?lat=6.9271&lng=79.8612
router.get('/nearby', getNearbyPlace); 

// GET /api/places/:id (Get full details for 3D view)
router.get('/:id', getPlaceDetails);

// POST /api/places/add (Protect this with 'auth' so only you can add places)
router.post('/add', auth, addPlace);

module.exports = router;