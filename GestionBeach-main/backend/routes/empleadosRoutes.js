// backend/routes/empleadosRoutes.js - VERSION CORREGIDA
const express = require('express');
const router = express.Router();
const empleadosController = require('../controllers/empleadosController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de Multer para fotos de perfil
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/perfiles');

    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const userId = req.user?.id || req.userId || 'unknown';
    const ext = path.extname(file.originalname);
    const filename = `perfil_${userId}_${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  // Aceptar solo imágenes
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter: fileFilter
});

// ✅ RUTAS ESPECÍFICAS PRIMERO (para evitar colisiones)

// Rutas de perfil personal (ANTES de las rutas con parámetros)
router.get('/mi-perfil', authMiddleware, empleadosController.getMiPerfil);
router.put('/mi-perfil', authMiddleware, empleadosController.updateMiPerfil);
router.post('/mi-perfil/foto', authMiddleware, upload.single('foto_perfil'), empleadosController.uploadFotoPerfil);
router.put('/mi-perfil/password', authMiddleware, empleadosController.cambiarPassword);

// Estadísticas de empleados
router.get('/stats', authMiddleware, empleadosController.getEmpleadosStats);

// Búsqueda de empleados  
router.get('/search', authMiddleware, empleadosController.searchEmpleados);

// Validación de RUT
router.post('/validate-rut', authMiddleware, empleadosController.validateRut);

// 🔥 NUEVAS RUTAS: Validar RUTs y crear empleados múltiples
router.post('/validar-ruts', authMiddleware, empleadosController.validarRuts);
router.post('/crear-multiple', authMiddleware, empleadosController.crearMultiple);

// ✅ RUTA PARA ASIGNACIÓN MASIVA DE RAZÓN SOCIAL (MOVIDA ARRIBA)
router.put('/razon-social-masiva', authMiddleware, empleadosController.updateRazonSocialMasiva);

// ✅ RUTAS PARA GESTIÓN DE SUCURSALES
router.get('/sucursal/:id_sucursal', authMiddleware, empleadosController.getEmpleadosBySucursal);
router.get('/:id/sucursales', authMiddleware, empleadosController.getEmpleadoSucursales);
router.put('/:id/sucursales', authMiddleware, empleadosController.updateEmpleadoSucursales);

// ✅ RUTAS PARA CAMBIO DE ESTADO
router.patch('/:id/toggle-active', authMiddleware, empleadosController.toggleActiveStatus);
router.patch('/:id/toggle-discapacidad', authMiddleware, empleadosController.toggleDiscapacidadStatus);

// ✅ RUTAS CRUD BÁSICAS
router.get('/', authMiddleware, empleadosController.getEmpleados);
router.get('/:id', authMiddleware, empleadosController.getEmpleadoById);
router.post('/', authMiddleware, empleadosController.createEmpleado);
router.put('/:id', authMiddleware, empleadosController.updateEmpleado);
router.delete('/:id', authMiddleware, empleadosController.deleteEmpleado);

module.exports = router;