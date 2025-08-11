const express = require('express');
const router = express.Router();
const losMasVendidosController = require('../controllers/losMasVendidosController');
const authMiddleware = require('../middleware/authMiddleware');

// Middleware para logging de todas las requests
router.use((req, res, next) => {
  console.log(`📍 LosMasVendidos Route: ${req.method} ${req.originalUrl}`, {
    params: req.params,
    query: req.query,
    body: Object.keys(req.body || {}),
    timestamp: new Date().toISOString()
  });
  next();
});

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// ✅ RUTAS PRINCIPALES DE PRODUCTOS - Asegurar orden correcto
router.get('/productos', losMasVendidosController.getTopProducts);
router.get('/menosvendidos', losMasVendidosController.getLeastSoldProducts);
router.get('/masrotacion', losMasVendidosController.getHighRotationProducts);
router.get('/menorrotacion', losMasVendidosController.getLowRotationProducts);

// ✅ RUTAS DE DATOS AUXILIARES
router.get('/familias', losMasVendidosController.getFamilias);
router.get('/distribucion', losMasVendidosController.getCategoryDistribution);
router.get('/tendencia', losMasVendidosController.getSalesTrend);

// ✅ RUTAS DE DEBUGGING (útiles para resolver problemas)
router.get('/test-connection', losMasVendidosController.testConnection);
router.get('/diagnostic', losMasVendidosController.getDiagnostic);
router.get('/summary', losMasVendidosController.getSalesSummary);

// Middleware para capturar errores específicos de estas rutas
router.use((error, req, res, next) => {
  console.error('❌ Error en losMasVendidosRoutes:', {
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    path: req.path,
    method: req.method,
    query: req.query
  });
  
  // Responder con formato consistente
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Error interno del servidor',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;