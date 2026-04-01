// backend/routes/cotizacionesRoutes.js
const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/cotizacionesController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Subir foto de un ítem (devuelve la URL)
router.post('/upload-foto', ctrl.uploadFoto, ctrl.subirFoto);

// CRUD de cotizaciones
router.get('/',        ctrl.getCotizaciones);
router.post('/',       ctrl.crearCotizacion);
router.get('/:id',     ctrl.getCotizacionById);

// Acciones de gerente
router.put('/:id/aprobar',  ctrl.aprobarCotizacion);
router.put('/:id/rechazar', ctrl.rechazarCotizacion);

module.exports = router;
