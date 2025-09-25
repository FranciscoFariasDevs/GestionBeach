// backend/routes/empleadosRoutes.js - VERSION CORREGIDA
const express = require('express');
const router = express.Router();
const empleadosController = require('../controllers/empleadosController');
const authMiddleware = require('../middleware/authMiddleware');

// ✅ RUTAS ESPECÍFICAS PRIMERO (para evitar colisiones)

// Estadísticas de empleados
router.get('/stats', authMiddleware, empleadosController.getEmpleadosStats);

// Búsqueda de empleados  
router.get('/search', authMiddleware, empleadosController.searchEmpleados);

// Validación de RUT
router.post('/validate-rut', authMiddleware, empleadosController.validateRut);

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