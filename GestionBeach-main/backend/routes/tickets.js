// backend/routes/tickets.js
const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { verificarToken, verificarPermisos } = require('../middleware/auth');

// ============================================
// RUTAS PÚBLICAS
// ============================================

// Crear nuevo ticket (público - no requiere autenticación)
router.post('/crear', ticketController.crearTicket);

// Obtener categorías (público)
router.get('/categorias', ticketController.obtenerCategorias);

// ============================================
// RUTAS PRIVADAS (Requieren autenticación)
// ============================================

// Obtener mis tickets
router.get('/mis-tickets', verificarToken, ticketController.obtenerMisTickets);

// Obtener detalle de un ticket
router.get('/:id', verificarToken, ticketController.obtenerDetalleTicket);

// Responder a un ticket
router.post('/:id/responder', verificarToken, ticketController.responderTicket);

// ============================================
// RUTAS DE ADMINISTRACIÓN (Solo SuperAdmin)
// ============================================

// Obtener todos los tickets
router.get(
  '/admin/todos',
  verificarToken,
  verificarPermisos(['SuperAdmin', 'Administrador', 'Soporte Técnico']),
  ticketController.obtenerTodosLosTickets
);

// Cambiar estado de un ticket
router.put(
  '/:id/estado',
  verificarToken,
  verificarPermisos(['SuperAdmin', 'Administrador', 'Soporte Técnico']),
  ticketController.cambiarEstadoTicket
);

// Asignar ticket a un usuario
router.put(
  '/:id/asignar',
  verificarToken,
  verificarPermisos(['SuperAdmin', 'Administrador', 'Soporte Técnico']),
  ticketController.asignarTicket
);

// Obtener estadísticas
router.get(
  '/admin/estadisticas',
  verificarToken,
  verificarPermisos(['SuperAdmin', 'Administrador', 'Soporte Técnico']),
  ticketController.obtenerEstadisticas
);

module.exports = router;
