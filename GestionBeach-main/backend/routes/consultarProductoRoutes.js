// backend/routes/consultarProductoRoutes.js
const express = require('express');
const router = express.Router();
const consultarProductoController = require('../controllers/consultarProductoController');

// GET /api/consultar-producto/sucursales - Listar sucursales disponibles
router.get('/sucursales', consultarProductoController.getSucursales);

// GET /api/consultar-producto?sucursalId=1&filtro=vigente - Consultar productos
router.get('/', consultarProductoController.getProductos);

module.exports = router;
