// backend/routes/webpayRoutes.js
const express = require('express');
const router = express.Router();
const webpayController = require('../controllers/webpayController');

// ============================================
// RUTAS PÚBLICAS (Sin autenticación)
// ============================================

/**
 * POST /api/webpay/crear
 * Crea una nueva transacción de pago con Webpay
 * Body: { reserva_id, monto, descripcion }
 */
router.post('/crear', webpayController.crearTransaccion);

/**
 * POST/GET /api/webpay/confirmar
 * Callback de Webpay después del pago
 * Webpay redirige aquí con el token_ws
 */
router.post('/confirmar', webpayController.confirmarTransaccion);
router.get('/confirmar', webpayController.confirmarTransaccion);

/**
 * GET /api/webpay/transaccion/:token
 * Consulta el estado de una transacción por token
 */
router.get('/transaccion/:token', webpayController.consultarTransaccion);

/**
 * GET /api/webpay/reserva/:reserva_id/transacciones
 * Obtiene todas las transacciones de una reserva
 */
router.get('/reserva/:reserva_id/transacciones', webpayController.getTransaccionesByReserva);

/**
 * POST /api/webpay/reembolsar
 * Procesa un reembolso/anulación de una transacción
 * Body: { token, monto (opcional), motivo }
 * NOTA: Requiere autenticación en producción
 */
router.post('/reembolsar', webpayController.reembolsarTransaccion);

module.exports = router;
