const express = require('express');
const {
    updateLocationByToken,
    getVehicleByToken
} = require('../controllers/vehicleController');

const router = express.Router();

// PUBLIC ROUTES - No authentication required (uses tracking token instead)

// @route POST /api/gps/update
// @desc Update vehicle location using tracking token
// @access Public (requires valid tracking token in body)
router.post('/update', updateLocationByToken);

// @route GET /api/gps/status/:token
// @desc Get vehicle status and info by tracking token
// @access Public (requires valid tracking token in URL)
router.get('/status/:token', getVehicleByToken);

module.exports = router;
