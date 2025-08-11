// routes/remuneracionesRoutes.js - Versión Corregida para Nueva Estructura
const express = require('express');
const router = express.Router();
const remuneracionesController = require('../controllers/remuneracionesController');
const authMiddleware = require('../middleware/authMiddleware');

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// ========== RUTAS ESPECÍFICAS PRIMERO (evitar colisiones) ==========

// Test y estadísticas
router.get('/test', remuneracionesController.test);
router.get('/estadisticas', remuneracionesController.estadisticas);

// Validación y procesamiento de Excel
router.post('/validar-excel', remuneracionesController.validarExcel);
router.post('/procesar-excel', remuneracionesController.procesarExcel);

// Crear período (POST específico)
router.post('/periodo', remuneracionesController.crearPeriodo);

// ========== RUTAS CON PARÁMETROS DE ID ==========

// Datos específicos de un período
router.get('/:id/datos', remuneracionesController.obtenerDatosPeriodo);
router.get('/:id/analisis', remuneracionesController.generarReporteAnalisis);

// ========== RUTAS CRUD GENÉRICAS ==========

// Listar todos los períodos
router.get('/', remuneracionesController.obtenerPeriodos);
router.get('/:id', remuneracionesController.obtenerPeriodoPorId);
router.put('/:id', remuneracionesController.actualizarPeriodo);
router.delete('/:id', remuneracionesController.eliminarPeriodo);

module.exports = router;