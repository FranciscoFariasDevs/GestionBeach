// routes/remuneracionesRoutes.js - Versión Corregida con Autenticación Condicional
const express = require('express');
const router = express.Router();
const remuneracionesController = require('../controllers/remuneracionesController');

// Middleware de autenticación condicional
const authMiddleware = (req, res, next) => {
  const publicRoutes = ['/test', '/ping'];
  const isPublicRoute = publicRoutes.some(route => req.path === route);
  
  if (isPublicRoute) {
    console.log(`🔓 Ruta pública: ${req.path}`);
    return next();
  }
  
  // Aplicar autenticación para rutas protegidas
  const authMiddlewareActual = require('../middleware/authMiddleware');
  return authMiddlewareActual(req, res, next);
};

// Aplicar middleware condicional
router.use(authMiddleware);

// ========== RUTAS PÚBLICAS DE DIAGNÓSTICO ==========
router.get('/test', remuneracionesController.test);
router.get('/ping', (req, res) => {
  res.json({
    success: true,
    message: 'Endpoint de remuneraciones funcionando',
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
});

// ========== RUTAS PROTEGIDAS ==========

// Estadísticas
router.get('/estadisticas', remuneracionesController.estadisticas);

// Filtros y validaciones
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
