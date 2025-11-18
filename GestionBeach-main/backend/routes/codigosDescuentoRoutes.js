// backend/routes/codigosDescuentoRoutes.js
const express = require('express');
const router = express.Router();
const codigosDescuentoController = require('../controllers/codigosDescuentoController');
const authMiddleware = require('../middleware/authMiddleware');

// Rutas públicas (para validar código en reserva)
router.post('/validar', codigosDescuentoController.validarCodigo);

// Rutas protegidas (solo admin)
router.get('/', authMiddleware, codigosDescuentoController.getCodigosDescuento);
router.get('/:id', authMiddleware, codigosDescuentoController.getCodigoById);
router.post('/', authMiddleware, codigosDescuentoController.crearCodigo);
router.put('/:id', authMiddleware, codigosDescuentoController.actualizarCodigo);
router.delete('/:id', authMiddleware, codigosDescuentoController.eliminarCodigo);
router.post('/incrementar-uso', authMiddleware, codigosDescuentoController.incrementarUso);

module.exports = router;
