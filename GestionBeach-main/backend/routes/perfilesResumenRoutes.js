// backend/routes/perfilesResumenRoutes.js - SIN AUTENTICACIÓN
const express = require('express');
const router = express.Router();
const permisosModularesController = require('../controllers/permisosModularesController');

// Ruta de debug
router.get('/debug', (req, res) => {
  res.json({ message: 'Ruta de debug funcionando' });
});

// Esta ruta NO requiere autenticación para permitir cargar datos en el UI
router.get('/:perfil_id', permisosModularesController.getResumenPermisosPerfil);

module.exports = router;
