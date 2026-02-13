// backend/routes/rotacionFerreteriasRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/rotacionFerreteriasController');

// GET /api/rotacion-ferreterias/sucursales
router.get('/sucursales', controller.getSucursales);

// GET /api/rotacion-ferreterias/productos-sin-rotacion?sucursalId=1&fechaDesde=...&fechaHasta=...
router.get('/productos-sin-rotacion', controller.getProductosSinRotacion);

// GET /api/rotacion-ferreterias/clientes-sin-compra?sucursalId=1&fechaDesde=...&fechaHasta=...
router.get('/clientes-sin-compra', controller.getClientesSinCompra);

// GET /api/rotacion-ferreterias/compras-sin-rotacion?sucursalId=1&fechaDesde=...&fechaHasta=...
router.get('/compras-sin-rotacion', controller.getComprasSinRotacion);

module.exports = router;
