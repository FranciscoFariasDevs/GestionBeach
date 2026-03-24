const express = require('express');
const router = express.Router();
const controller = require('../controllers/guiasController');

router.get('/sucursales', controller.getSucursales);
router.get('/sucursales-destino', controller.getSucursalesDestino);
router.get('/envio', controller.getGuiasEnvio);
router.get('/detalle', controller.getDetalleGuia);
router.get('/emitidas', controller.getGuiasEmitidas);
router.get('/detalle-emitida', controller.getDetalleGuiaEmitida);
router.get('/centro-costos',        controller.getCentroCostos);
router.get('/centro-costos-detalle', controller.getCentroCostosDetalle);

module.exports = router;
