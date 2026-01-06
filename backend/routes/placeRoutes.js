const express = require('express');
const { 
  getNearbyPlace, 
  addPlace, 
  getPlaceDetails, 
  chatWithPlace,
  getAllPlaces, 
  deletePlace, 
  updatePlace 
} = require('../controllers/placeController');

const router = express.Router();

// Mobile App Routes
router.get('/nearby', getNearbyPlace);
router.post('/chat', chatWithPlace);

// Admin Panel Routes
router.get('/all', getAllPlaces);     
router.post('/add', addPlace);         // Needed for Add Page
router.get('/:id', getPlaceDetails);   // Needed for Edit Page (Load Data)
router.put('/:id', updatePlace);      
router.delete('/:id', deletePlace);  

module.exports = router;