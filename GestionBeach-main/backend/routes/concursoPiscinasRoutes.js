// backend/routes/concursoPiscinasRoutes.js
const express = require('express');
const router = express.Router();
const concursoPiscinasController = require('../controllers/concursoPiscinasController');

// Middleware de autenticación (opcional, descomenta si quieres proteger las rutas)
// const { verifyToken } = require('../middleware/auth');

// ============================================
// RUTAS PÚBLICAS DEL CONCURSO
// ============================================

// Test de funcionamiento
router.get('/test', concursoPiscinasController.testConcurso);

// Registrar nueva participación (con upload de imagen)
router.post(
  '/participar',
  concursoPiscinasController.uploadMiddleware,
  concursoPiscinasController.registrarParticipacion
);

// Verificar si una boleta ya participó
router.get('/verificar/:numero_boleta', concursoPiscinasController.verificarBoleta);

// Obtener estadísticas públicas del concurso
router.get('/estadisticas', concursoPiscinasController.obtenerEstadisticas);

// ============================================
// RUTAS ADMINISTRATIVAS (requieren autenticación)
// ============================================

// Obtener todas las participaciones
// Si quieres proteger esta ruta, agrega verifyToken como middleware
router.get('/participaciones', concursoPiscinasController.obtenerParticipaciones);

// Podrías agregar más rutas administrativas como:
// - Seleccionar ganadores
// - Actualizar estado de participaciones
// - Eliminar participaciones
// - Exportar datos

module.exports = router;