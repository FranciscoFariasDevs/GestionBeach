const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/cargarInventarioController');

router.get('/sucursales', ctrl.getSucursales);
router.get('/stock', ctrl.getStockSistema);
router.post('/comparar', ctrl.compararInventario);

module.exports = router;
