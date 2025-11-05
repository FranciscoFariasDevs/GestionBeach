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

// Procesar OCR con coordenadas del crop (NUEVO)
router.post(
  '/ocr-crop',
  concursoPiscinasController.uploadMiddleware,
  concursoPiscinasController.procesarOCRConCrop
);

// Registrar nueva participación (con upload de imagen)
router.post(
  '/participar',
  concursoPiscinasController.uploadMiddleware,
  concursoPiscinasController.registrarParticipacion
);

// Verificar si una boleta ya participó
router.get('/verificar/:numero_boleta', concursoPiscinasController.verificarBoleta);

// Validar boleta sin registrar (solo para verificar existencia en BD)
router.post('/validar-boleta', concursoPiscinasController.validarBoletaSinRegistrar);

// Obtener estadísticas públicas del concurso
router.get('/estadisticas', concursoPiscinasController.obtenerEstadisticas);

// ============================================
// RUTAS ADMINISTRATIVAS (requieren autenticación)
// ============================================

// Obtener todas las participaciones
// Si quieres proteger esta ruta, agrega verifyToken como middleware
router.get('/participaciones', concursoPiscinasController.obtenerParticipaciones);

// Obtener participantes para sorteo (activos y válidos)
router.get('/sorteo/participantes', concursoPiscinasController.obtenerParticipantesSorteo);

// Marcar ganador del sorteo
router.post('/sorteo/ganador', concursoPiscinasController.marcarGanador);

module.exports = router;