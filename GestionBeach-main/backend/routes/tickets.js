// backend/routes/tickets.js
const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const authMiddleware = require('../middleware/authMiddleware');

// ── Públicas ──────────────────────────────────────────────────────────────────
router.get('/categorias', ticketController.obtenerCategorias);
router.get('/departamentos', ticketController.obtenerDepartamentos);

// ── Crear ticket (con departamentos) ─────────────────────────────────────────
router.post('/crear', authMiddleware, ticketController.uploadMiddleware, ticketController.crearTicketDept);

// ── Admin / Gerencia ──────────────────────────────────────────────────────────
router.get('/admin/estadisticas', authMiddleware, ticketController.obtenerEstadisticas);
router.get('/admin/todos',        authMiddleware, ticketController.obtenerTodosLosTickets);
router.get('/admin/mantenciones', authMiddleware, ticketController.obtenerMantencionesAdmin);
router.get('/admin/analytics',    authMiddleware, ticketController.obtenerAnalyticsDept);
router.get('/gerencia/tablero',   authMiddleware, ticketController.obtenerTableroGerencia);

// ── Gestión de departamentos ──────────────────────────────────────────────────
router.get('/mis-departamentos',                  authMiddleware, ticketController.obtenerMisDepartamentos);
router.get('/dept/:dept_id/usuarios',             authMiddleware, ticketController.obtenerUsuariosDept);
router.post('/dept/asignar-usuario',              authMiddleware, ticketController.asignarUsuarioDept);

// ── Mis tickets (filtrado por departamento) ───────────────────────────────────
router.get('/mis-tickets', authMiddleware, ticketController.obtenerMisTicketsDept);

// ── Notificaciones ────────────────────────────────────────────────────────────
router.get('/mis-notificaciones',                 authMiddleware, ticketController.obtenerNotificacionesTickets);
router.get('/notificaciones/todas',               authMiddleware, ticketController.obtenerNotificaciones);
router.put('/notificaciones/marcar-todas',        authMiddleware, ticketController.marcarTodasLeidas);
router.put('/notificaciones/:id/leer',            authMiddleware, ticketController.marcarNotificacionLeida);

// ── Detalle y acciones sobre ticket ──────────────────────────────────────────
router.get('/:id',                authMiddleware, ticketController.obtenerDetalleTicket);
router.post('/:id/responder',     authMiddleware, ticketController.uploadMiddleware, ticketController.responderTicket);
router.put('/:id/estado',         authMiddleware, ticketController.cambiarEstadoTicket);
router.put('/:id/asignar',        authMiddleware, ticketController.asignarTicket);
router.post('/:id/imagen',        authMiddleware, ticketController.uploadMiddleware, ticketController.subirImagenTicket);

// ── Entregar parte de departamento ────────────────────────────────────────────
router.put('/:ticket_id/dept/:dept_id/entregar', authMiddleware, ticketController.marcarDeptEntregado);

module.exports = router;
