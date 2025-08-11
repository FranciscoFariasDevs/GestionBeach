// backend/routes/empleadosRoutes.js - CORREGIDO Y SIMPLIFICADO
const express = require('express');
const router = express.Router();
const empleadosController = require('../controllers/empleadosController');
const authMiddleware = require('../middleware/authMiddleware');

// ✅ APLICAR MIDDLEWARE DE AUTENTICACIÓN A TODAS LAS RUTAS
router.use(authMiddleware);

// ✅ RUTAS ESPECÍFICAS PRIMERO (para evitar colisiones con rutas genéricas)

// Estadísticas de empleados
router.get('/stats', empleadosController.getEmpleadosStats);

// Búsqueda de empleados  
router.get('/search', empleadosController.searchEmpleados);

// Validación de RUT
router.post('/validate-rut', empleadosController.validateRut);

// ✅ RUTAS PARA GESTIÓN DE SUCURSALES
// Obtener empleados por sucursal
router.get('/sucursal/:id_sucursal', empleadosController.getEmpleadosBySucursal);

// Obtener sucursales de un empleado específico
router.get('/:id/sucursales', empleadosController.getEmpleadoSucursales);

// Actualizar sucursales de un empleado
router.put('/:id/sucursales', empleadosController.updateEmpleadoSucursales);

// ✅ RUTAS PARA CAMBIO DE ESTADO
// Activar/desactivar empleado
router.patch('/:id/toggle-active', empleadosController.toggleActiveStatus);

// Cambiar estado de discapacidad
router.patch('/:id/toggle-discapacidad', empleadosController.toggleDiscapacidadStatus);

// ✅ RUTA PARA IMPORTACIÓN (futura implementación)
router.post('/import-excel', empleadosController.importEmpleadosFromExcel);

// ✅ RUTAS CRUD BÁSICAS (al final para evitar conflictos)
// Listar todos los empleados
router.get('/', empleadosController.getEmpleados);

// Obtener empleado por ID específico
router.get('/:id', empleadosController.getEmpleadoById);

// Crear nuevo empleado
router.post('/', empleadosController.createEmpleado);

// Actualizar empleado existente
router.put('/:id', empleadosController.updateEmpleado);

// Eliminar empleado
router.delete('/:id', empleadosController.deleteEmpleado);

module.exports = router;