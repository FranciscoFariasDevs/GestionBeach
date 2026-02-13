const express = require('express');
const router = express.Router();
const controller = require('../controllers/guiasController');

router.get('/sucursales', controller.getSucursales);
router.get('/sucursales-destino', controller.getSucursalesDestino);
router.get('/envio', controller.getGuiasEnvio);
router.get('/detalle', controller.getDetalleGuia);
router.get('/emitidas', controller.getGuiasEmitidas);
router.get('/detalle-emitida', controller.getDetalleGuiaEmitida);
router.get('/interempresa', controller.getGuiasInterempresa);

module.exports = router;
