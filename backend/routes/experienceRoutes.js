const express = require('express');
const router = express.Router();

// Import controller functions
const { 
    createExperience, 
    getAllExperiences, 
    getExperienceById,
    updateExperience,
    deleteExperience,
    getMyExperiences
} = require('../controllers/experienceController');

// Import authentication middlewares
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

/**
 * PUBLIC ROUTES (For Tourists)
 */
router.get('/', getAllExperiences); // List all or search/filter
router.get('/:id', getExperienceById); // View single details

/**
 * PRIVATE ROUTES (For Hosts Only)
 */
router.get('/my/list', auth, roleAuth('host'), getMyExperiences); // View own dashboard
router.post('/add', auth, roleAuth('host'), createExperience); // Create new
router.put('/update/:id', auth, roleAuth('host'), updateExperience); // Edit existing
router.delete('/delete/:id', auth, roleAuth('host'), deleteExperience); // Delete existing

module.exports = router;