// backend/routes/permisosModularesRoutes.js
const express = require('express');
const router = express.Router();
const permisosModularesController = require('../controllers/permisosModularesController');
const authMiddleware = require('../middleware/authMiddleware');

// Ruta de prueba (sin auth)
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Ruta sin auth funcionando' });
});

// Rutas sin autenticación (para carga de UI)
router.get('/resumen/:perfil_id', permisosModularesController.getResumenPermisosPerfil);

// Rutas con autenticación
router.get('/sucursales', authMiddleware, permisosModularesController.getSucursalesPermitidas);
router.post('/sucursales', authMiddleware, permisosModularesController.asignarSucursalesModulo);
router.get('/mis-sucursales', authMiddleware, permisosModularesController.getMisSucursalesPermitidas);

module.exports = router;
