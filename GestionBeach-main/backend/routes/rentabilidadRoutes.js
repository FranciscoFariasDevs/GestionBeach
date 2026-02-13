// backend/routes/rentabilidadRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/rentabilidadController');

router.get('/sucursales', controller.getSucursales);
router.get('/datos', controller.getRentabilidad);

module.exports = router;
