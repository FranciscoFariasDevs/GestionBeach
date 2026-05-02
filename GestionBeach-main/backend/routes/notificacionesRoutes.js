const router = require('express').Router();
const ctrl = require('../controllers/notificacionesController');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);
router.get('/',              ctrl.getMisNotificaciones);
router.put('/leer-todas',    ctrl.marcarTodasLeidas);
router.put('/:id/leer',      ctrl.marcarLeida);
router.delete('/:id',        ctrl.eliminarNotificacion);

module.exports = router;
