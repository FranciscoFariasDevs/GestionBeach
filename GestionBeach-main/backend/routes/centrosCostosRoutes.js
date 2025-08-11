// routes/centrosCostosRoutes.js - RUTAS CORREGIDAS
const express = require('express');
const router = express.Router();
const centrosCostosController = require('../controllers/centrosCostosController');
const authMiddleware = require('../middleware/authMiddleware');

// ==================== RUTAS PRINCIPALES ====================

// Test de conexión
router.get('/test', centrosCostosController.testCentrosCostos);

// Obtener todos los centros de costos
router.get('/', authMiddleware, centrosCostosController.getCentrosCostos);

// Buscar centros de costos
router.get('/buscar', authMiddleware, centrosCostosController.searchCentrosCostos);

// Obtener estadísticas
router.get('/estadisticas', authMiddleware, centrosCostosController.getEstadisticasCentrosCostos);

// Obtener centro de costos específico por ID
router.get('/:id', authMiddleware, centrosCostosController.getCentroCostoById);

// Crear nuevo centro de costos
router.post('/', authMiddleware, centrosCostosController.createCentroCosto);

// Actualizar centro de costos
router.put('/:id', authMiddleware, centrosCostosController.updateCentroCosto);

// Cambiar estado (activar/desactivar)
router.put('/:id/toggle-status', authMiddleware, centrosCostosController.toggleEstadoCentroCosto);

// Eliminar centro de costos
router.delete('/:id', authMiddleware, centrosCostosController.deleteCentroCosto);

module.exports = router;