const express = require('express');
const router = express.Router();
const perfilesController = require('../controllers/perfilesController');
const authMiddleware = require('../middleware/authMiddleware');

// Ruta de debug (sin auth para facilitar testing)
router.get('/debug', perfilesController.getDebugPerfiles);

// Rutas principales de perfiles
router.get('/', authMiddleware, perfilesController.getAllPerfiles);
router.get('/:id', authMiddleware, perfilesController.getPerfilById);
router.post('/', authMiddleware, perfilesController.createPerfil);
router.put('/:id', authMiddleware, perfilesController.updatePerfil);
router.delete('/:id', authMiddleware, perfilesController.deletePerfil);

module.exports = router;
