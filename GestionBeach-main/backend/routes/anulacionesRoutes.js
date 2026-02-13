const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/anulacionesController');

router.get('/sucursales', ctrl.getSucursales);
router.get('/datos', ctrl.getAnulaciones);
router.get('/detalle', ctrl.getDetalleAnulacion);

module.exports = router;
