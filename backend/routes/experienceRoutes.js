const express = require('express');
const router = express.Router();

const { 
    createExperience, 
    getAllExperiences, 
    getExperienceById,
    updateExperience,
    deleteExperience,
    getMyExperiences
} = require('../controllers/experienceController');

const auth = require('../middleware/auth');

// Public
router.get('/', getAllExperiences); 
router.get('/:id', getExperienceById);

// Private (Host) - Simplified Auth
router.get('/my/list', auth, getMyExperiences); 
router.post('/add', auth, createExperience); 
router.put('/update/:id', auth, updateExperience); 
router.delete('/delete/:id', auth, deleteExperience); 

module.exports = router;