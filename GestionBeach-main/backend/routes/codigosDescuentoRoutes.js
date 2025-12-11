// backend/routes/codigosDescuentoRoutes.js
const express = require('express');
const router = express.Router();
const codigosDescuentoController = require('../controllers/codigosDescuentoController');
const authMiddleware = require('../middleware/authMiddleware');

// Rutas públicas (para validar código en reserva)
router.post('/validar', codigosDescuentoController.validarCodigo);
router.post('/incrementar-uso', codigosDescuentoController.incrementarUso); // 🌐 Público para incrementar desde reservas públicas

// Rutas protegidas (solo admin)
router.get('/', authMiddleware, codigosDescuentoController.getCodigosDescuento);
router.get('/:id', authMiddleware, codigosDescuentoController.getCodigoById);
router.get('/:id/cabanas', authMiddleware, codigosDescuentoController.getCabanasByCodigo);
router.post('/', authMiddleware, codigosDescuentoController.crearCodigo);
router.put('/:id', authMiddleware, codigosDescuentoController.actualizarCodigo);
router.delete('/:id', authMiddleware, codigosDescuentoController.eliminarCodigo);

module.exports = router;
