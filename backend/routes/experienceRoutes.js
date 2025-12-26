const express = require('express');
const router = express.Router();
// Import controllers
const { 
    createExperience, 
    getAllExperiences, 
    getExperienceById 
} = require('../controllers/experienceController');

// Import authentication middlewares
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

/**
 * ROUTE: GET /api/experiences
 * DESC: Fetches all listed experiences for tourists
 * ACCESS: Public
 */
router.get('/', getAllExperiences);

/**
 * ROUTE: GET /api/experiences/:id
 * DESC: Fetches full details of a single experience using its unique ID
 * ACCESS: Public
 */
router.get('/:id', getExperienceById);

/**
 * ROUTE: POST /api/experiences/add
 * DESC: Allows a registered villager (Host) to add a new service
 * ACCESS: Private (Requires valid JWT token + 'host' role)
 */
router.post('/add', auth, roleAuth('host'), createExperience);

module.exports = router;