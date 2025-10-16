// backend/routes/cabanasRoutes.js
const express = require('express');
const router = express.Router();
const cabanasController = require('../controllers/cabanasController');
const reservasController = require('../controllers/reservasController');
const twilioController = require('../controllers/twilioWhatsAppControllerV2'); // 🔄 Usando versión V2 mejorada

// ============================================
// RUTAS DE CABAÑAS
// ============================================

// CRUD de cabañas
router.get('/cabanas', cabanasController.obtenerCabanas);
router.get('/cabanas/:id', cabanasController.obtenerCabanaPorId);
router.post('/cabanas', cabanasController.crearCabana);
router.put('/cabanas/:id', cabanasController.actualizarCabana);
router.delete('/cabanas/:id', cabanasController.eliminarCabana);

// Disponibilidad
router.get('/cabanas/disponibilidad/verificar', cabanasController.verificarDisponibilidad);
router.get('/cabanas/disponibilidad/calendario', cabanasController.obtenerCalendarioDisponibilidad);

// ============================================
// RUTAS DE RESERVAS
// ============================================

// CRUD de reservas
router.get('/reservas', reservasController.obtenerReservas);
router.get('/reservas/:id', reservasController.obtenerReservaPorId);
router.post('/reservas', reservasController.crearReserva);
router.put('/reservas/:id', reservasController.actualizarReserva);
router.delete('/reservas/:id/cancelar', reservasController.cancelarReserva);

// Check-in / Check-out
router.post('/reservas/:id/checkin', reservasController.realizarCheckIn);
router.post('/reservas/:id/checkout', reservasController.realizarCheckOut);

// Estadísticas
router.get('/reservas/stats/general', reservasController.obtenerEstadisticas);

// ============================================
// RUTAS DE WHATSAPP (TWILIO)
// ============================================

// Webhooks de Twilio (público - sin autenticación)
router.post('/whatsapp/webhook/incoming', twilioController.webhookIncoming);
router.post('/whatsapp/webhook/status', twilioController.webhookStatus);

// Endpoint GET para verificar que la URL funciona (solo para pruebas)
router.get('/whatsapp/webhook/incoming', (req, res) => {
  res.json({
    success: true,
    message: '✅ Webhook está activo',
    info: 'Este endpoint debe ser configurado como POST en Twilio',
    url_correcta: req.protocol + '://' + req.get('host') + req.originalUrl,
    metodo_correcto: 'POST',
    configuracion_twilio: 'Copia esta URL y configúrala como POST en Twilio Console'
  });
});

// API de WhatsApp (requiere autenticación)
router.post('/whatsapp/enviar', twilioController.enviarMensajeManual);
router.get('/whatsapp/conversaciones', twilioController.obtenerConversaciones);
router.get('/whatsapp/conversaciones/:telefono', twilioController.obtenerMensajesConversacion);

// Test
router.get('/whatsapp/test', twilioController.testEnvio);

module.exports = router;
