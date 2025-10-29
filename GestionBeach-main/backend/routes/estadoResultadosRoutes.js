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

// ==================== RUTAS CRUD PARA ESTADOS DE RESULTADOS ====================

// Guardar nuevo estado de resultados
// POST /api/estado-resultados
// Body: { data: {...estadoResultados}, usuario: 'nombre_usuario' }
router.post('/', estadoResultadosController.guardarEstadoResultados);

// Listar estados de resultados con filtros
// GET /api/estado-resultados?sucursal_id=1&mes=1&anio=2024&estado=enviado
router.get('/', estadoResultadosController.listarEstadosResultados);

// Obtener un estado de resultados por ID
// GET /api/estado-resultados/:id
router.get('/:id', estadoResultadosController.obtenerEstadoResultadosPorId);

// Actualizar estado de resultados existente
// PUT /api/estado-resultados/:id
// Body: { data: {...estadoResultados}, usuario: 'nombre_usuario' }
router.put('/:id', estadoResultadosController.actualizarEstadoResultados);

// Enviar estado de resultados (cambiar a estado 'enviado')
// POST /api/estado-resultados/:id/enviar
// Body: { usuario: 'nombre_usuario' }
router.post('/:id/enviar', estadoResultadosController.enviarEstadoResultados);

module.exports = router;