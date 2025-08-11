// backend/routes/ventasRoutes.js
const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/ventasController');
const authMiddleware = require('../middleware/authMiddleware');

// Proteger todas las rutas con autenticación
router.use(authMiddleware);

// Rutas para ventas
router.post('/', ventasController.getVentas);
router.get('/productos', ventasController.getProductosByFolio);

module.exports = router;