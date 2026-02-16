// backend/routes/consultarProductoRoutes.js
const express = require('express');
const router = express.Router();
const consultarProductoController = require('../controllers/consultarProductoController');
const authMiddleware = require('../middleware/authMiddleware');

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

// GET /api/consultar-producto/sucursales - Listar sucursales disponibles
router.get('/sucursales', consultarProductoController.getSucursales);

// GET /api/consultar-producto/detalle?sucursalId=1&codigo=XXX - Detalle de producto
router.get('/detalle', consultarProductoController.getDetalleProducto);

// GET /api/consultar-producto/historico?sucursalId=1&codigo=XXX - Historico ventas del año
router.get('/historico', consultarProductoController.getHistorico);

// GET /api/consultar-producto/tarjeta-existencia?sucursalId=1&codigo=XXX - Tarjeta existencia del producto
router.get('/tarjeta-existencia', consultarProductoController.getTarjetaExistencia);

// GET /api/consultar-producto?sucursalId=1&filtro=vigente - Consultar productos
router.get('/', consultarProductoController.getProductos);

module.exports = router;
