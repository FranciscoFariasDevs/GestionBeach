// backend/routes/modulosRoutes.js
const express = require('express');
const router = express.Router();
const perfilesController = require('../controllers/perfilesController');
const authMiddleware = require('../middleware/authMiddleware');

// GET todos los módulos disponibles (para usar en perfiles)
router.get('/', authMiddleware, perfilesController.getModulosDisponibles);

module.exports = router;