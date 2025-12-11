// backend/routes/configuracionRoutes.js
const express = require('express');
const router = express.Router();
const configuracionController = require('../controllers/configuracionController');
const authMiddleware = require('../middleware/authMiddleware');

// Ruta pública para obtener temporada
router.get('/temporada', configuracionController.getTemporadaActual);

// Ruta protegida para actualizar temporada (solo admin)
router.put('/temporada', authMiddleware, configuracionController.actualizarTemporada);

module.exports = router;
