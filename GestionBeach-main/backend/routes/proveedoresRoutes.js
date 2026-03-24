// backend/routes/proveedoresRoutes.js
const express = require('express');
const router  = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const ctrl = require('../controllers/proveedoresController');

router.get('/sucursales', authMiddleware, ctrl.getSucursales);
router.get('/datos',      authMiddleware, ctrl.getProveedores);
router.get('/detalle',    authMiddleware, ctrl.getDetalleProveedor);

module.exports = router;
