// backend/routes/monitorOrdenesRoutes.js - Monitor Ordenes de Compra
const express = require('express');
const router = express.Router();
const controller = require('../controllers/monitorOrdenesController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/sucursales', controller.getSucursales);
router.get('/ordenes', controller.getOrdenes);
router.get('/consolidado', controller.getConsolidado);
router.get('/monitor-central', controller.getMonitorCentral);

module.exports = router;
