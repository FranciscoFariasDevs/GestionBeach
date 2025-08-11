// backend/routes/razonesSocialesRoutes.js
const express = require('express');
const router = express.Router();
const razonesSocialesController = require('../controllers/razonesSocialesController');
const authMiddleware = require('../middleware/authMiddleware');

// Proteger todas las rutas con autenticación
router.use(authMiddleware);

// Rutas específicas primero (para evitar colisiones con rutas genéricas)
router.get('/stats', razonesSocialesController.getRazonesSocialesStats);
router.get('/search', razonesSocialesController.searchRazonesSociales);
router.patch('/:id/toggle-active', razonesSocialesController.toggleActiveStatus);

// Rutas genéricas CRUD
router.get('/', razonesSocialesController.getRazonesSociales);
router.get('/:id', razonesSocialesController.getRazonSocialById);
router.post('/', razonesSocialesController.createRazonSocial);
router.put('/:id', razonesSocialesController.updateRazonSocial);
router.delete('/:id', razonesSocialesController.deleteRazonSocial);

module.exports = router;