const express = require('express');
const { 
  getNearbyPlace, 
  addPlace, 
  getPlaceDetails, 
  chatWithPlace,
  getAllPlaces, // 👈 Import these 3 new functions
  deletePlace, 
  updatePlace 
} = require('../controllers/placeController');

const router = express.Router();

// Mobile App Routes
router.get('/nearby', getNearbyPlace);
router.post('/chat', chatWithPlace);

// Admin Panel Routes
router.get('/all', getAllPlaces);      // 👈 Needed for Dashboard
router.post('/add', addPlace);         // Needed for Add Page
router.get('/:id', getPlaceDetails);   // Needed for Edit Page (Load Data)
router.put('/:id', updatePlace);       // 👈 Needed for Edit Page (Save Data)
router.delete('/:id', deletePlace);    // 👈 Needed for Delete Button

module.exports = router;