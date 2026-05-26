// backend/routes/comparadorRoutes.js
const express = require('express');
const router  = express.Router();
const controller   = require('../controllers/comparadorController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// GET /api/comparador/productos?busqueda=&campo=descripcion|codigo
router.get('/productos', controller.getProductos);

module.exports = router;
