// routes/estadoResultadosRoutes.js - RUTAS PARA ESTADO DE RESULTADOS
const express = require('express');
const router = express.Router();
const estadoResultadosController = require('../controllers/estadoResultadosController');
const authMiddleware = require('../middleware/authMiddleware');

// Proteger todas las rutas con autenticación
router.use(authMiddleware);

// ==================== RUTAS DE TESTING ====================

// Test de conexión
router.get('/test', estadoResultadosController.test);

// ==================== RUTAS DE CONFIGURACIÓN ====================

// Obtener sucursales disponibles
router.get('/sucursales', estadoResultadosController.obtenerSucursales);

// Obtener razones sociales disponibles
router.get('/razones-sociales', estadoResultadosController.obtenerRazonesSociales);

// ==================== RUTAS DE DATOS INDIVIDUALES ====================

// Obtener datos de ventas para estado de resultados
// GET /api/estado-resultados/ventas?fecha_desde=2024-01-01&fecha_hasta=2024-01-31&sucursal_id=1&razon_social_id=1
router.get('/ventas', estadoResultadosController.obtenerVentas);

// Obtener datos de compras para estado de resultados
// GET /api/estado-resultados/compras?fecha_desde=2024-01-01&fecha_hasta=2024-01-31&sucursal_id=1&razon_social_id=1
router.get('/compras', estadoResultadosController.obtenerCompras);

// Obtener datos de remuneraciones para estado de resultados
// GET /api/estado-resultados/remuneraciones?anio=2024&mes=1&sucursal_id=1&razon_social_id=1
router.get('/remuneraciones', estadoResultadosController.obtenerRemuneraciones);

// ==================== RUTA PRINCIPAL ====================

// Generar estado de resultados completo
// POST /api/estado-resultados/generar
// Body: { fecha_desde, fecha_hasta, sucursal_id, razon_social_id }
router.post('/generar', estadoResultadosController.generarEstadoResultados);

module.exports = router;