// backend/routes/rentabilidadRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/rentabilidadController');
const authMiddleware = require('../middleware/authMiddleware');

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

router.get('/sucursales', controller.getSucursales);
router.get('/datos', controller.getRentabilidad);

module.exports = router;
