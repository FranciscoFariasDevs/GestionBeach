// backend/routes/boletasFoliosRoutes.js
const express = require('express');
const router = express.Router();
const boletasFoliosController = require('../controllers/boletasFoliosController');

// GET /api/boletas-folios?year=2026&month=1 - Todas las sucursales
router.get('/', boletasFoliosController.getBoletasFolios);

// GET /api/boletas-folios/:sucursalId?year=2026&month=1 - Detalle de una sucursal
router.get('/:sucursalId', boletasFoliosController.getBoletasDetalle);

module.exports = router;
