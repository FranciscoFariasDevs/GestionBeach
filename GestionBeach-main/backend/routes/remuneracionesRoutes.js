// routes/remuneracionesRoutes.js - Versión con Filtros y Validaciones
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

// 🆕 NUEVAS RUTAS PARA FILTROS Y VALIDACIONES
router.get('/opciones-filtros', remuneracionesController.obtenerOpcionesFiltros);
router.post('/validar-empleados-sin-asignacion', remuneracionesController.validarEmpleadosSinAsignacion);
router.post('/asignar-razon-social-sucursal', remuneracionesController.asignarRazonSocialYSucursal);

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

// Listar todos los períodos (con filtros opcionales via query params)
router.get('/', remuneracionesController.obtenerPeriodos);
router.get('/:id', remuneracionesController.obtenerPeriodoPorId);
router.put('/:id', remuneracionesController.actualizarPeriodo);
router.delete('/:id', remuneracionesController.eliminarPeriodo);

module.exports = router;