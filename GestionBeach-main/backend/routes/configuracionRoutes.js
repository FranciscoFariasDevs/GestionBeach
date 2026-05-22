// backend/routes/configuracionRoutes.js
const express = require('express');
const router = express.Router();
const configuracionController = require('../controllers/configuracionController');
const authMiddleware = require('../middleware/authMiddleware');

// Ruta pública para obtener temporada
router.get('/temporada', configuracionController.getTemporadaActual);

// Ruta protegida para actualizar temporada (solo admin)
router.put('/temporada', authMiddleware, configuracionController.actualizarTemporada);

// Pasarela de pago activa (pública para que el cliente la lea)
router.get('/pasarela', configuracionController.getPasarelaPago);
// Solo admin puede cambiar la pasarela
router.put('/pasarela', authMiddleware, configuracionController.actualizarPasarelaPago);

module.exports = router;
