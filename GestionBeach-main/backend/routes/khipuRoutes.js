// backend/routes/khipuRoutes.js
const express = require('express');
const router = express.Router();
const khipuController = require('../controllers/khipuController');

// Crear pago Khipu (público — llamado desde el navegador del cliente)
router.post('/crear', khipuController.crearPago);

// Webhook de confirmación (llamado por Khipu)
router.post('/confirmar', khipuController.confirmarPago);

// Verificar estado de un pago (llamado desde el frontend tras redirect)
router.get('/verificar/:payment_id', khipuController.verificarPago);

module.exports = router;
