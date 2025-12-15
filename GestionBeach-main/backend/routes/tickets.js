// backend/routes/tickets.js
const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const authMiddleware = require('../middleware/authMiddleware');

// ============================================
// RUTAS PÚBLICAS
// ============================================

// Obtener categorías (público)
router.get('/categorias', ticketController.obtenerCategorias);

// Crear nuevo ticket (requiere autenticación)
router.post('/crear', authMiddleware, ticketController.crearTicket);

// ============================================
// RUTAS DE ADMINISTRACIÓN (Solo SuperAdmin)
// ============================================
// IMPORTANTE: Estas rutas deben estar ANTES de /:id para que no sean capturadas por el parámetro dinámico

// Obtener estadísticas
router.get('/admin/estadisticas', authMiddleware, ticketController.obtenerEstadisticas);

// Obtener todos los tickets
router.get('/admin/todos', authMiddleware, ticketController.obtenerTodosLosTickets);

// ============================================
// RUTAS PRIVADAS (Requieren autenticación)
// ============================================

// Obtener mis tickets
router.get('/mis-tickets', authMiddleware, ticketController.obtenerMisTickets);

// Obtener detalle de un ticket
router.get('/:id', authMiddleware, ticketController.obtenerDetalleTicket);

// Responder a un ticket
router.post('/:id/responder', authMiddleware, ticketController.responderTicket);

// Cambiar estado de un ticket
router.put('/:id/estado', authMiddleware, ticketController.cambiarEstadoTicket);

// Asignar ticket a un usuario
router.put('/:id/asignar', authMiddleware, ticketController.asignarTicket);

module.exports = router;
