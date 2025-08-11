// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
// Cambia la ruta para que apunte a la ubicación correcta del controlador
const authController = require('../controllers/authController');

// Rutas de autenticación
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/check', authController.check);

module.exports = router;