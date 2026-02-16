const express = require('express');
const router = express.Router();
const controller = require('../controllers/resumenValorizadoController');
const authMiddleware = require('../middleware/authMiddleware');

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

router.get('/datos', controller.getDatos);

module.exports = router;
