// backend/routes/sucursalesRoutes.js
const express = require('express');
const router = express.Router();
const sucursalesController = require('../controllers/sucursalesController');
const authMiddleware = require('../middleware/authMiddleware');

// Proteger todas las rutas con autenticación
router.use(authMiddleware);

// Ruta para obtener sucursales del usuario (según su perfil)
router.get('/', sucursalesController.getSucursales);

// Ruta para obtener TODAS las sucursales (para administración)
router.get('/all', sucursalesController.getAllSucursales);

// ✅ RUTA DE DIAGNÓSTICO CON ESTRUCTURA REAL
router.get('/test', async (req, res) => {
  try {
    const { sql, poolPromise } = require('../config/db');
    const pool = await poolPromise;
    
    // Test de conexión básico
    const testResult = await pool.request()
      .query('SELECT GETDATE() as current_time');
    
    // ✅ CONTAR TODAS LAS SUCURSALES
    const countResult = await pool.request()
      .query('SELECT COUNT(*) as total FROM sucursales');
    
    // ✅ OBTENER MUESTRA DE SUCURSALES CON ESTRUCTURA REAL
    const sampleResult = await pool.request()
      .query(`
        SELECT TOP 5 
          id, 
          nombre, 
          tipo_sucursal, 
          ip, 
          base_datos,
          usuario
        FROM sucursales 
        ORDER BY nombre
      `);
    
    // Verificar tabla permisos_usuario
    let permisosTest = { exists: false, error: null };
    try {
      const permisosResult = await pool.request()
        .query('SELECT TOP 1 * FROM permisos_usuario');
      permisosTest.exists = true;
      permisosTest.count = permisosResult.recordset.length;
    } catch (error) {
      permisosTest.error = error.message;
    }
    
    res.json({
      success: true,
      message: 'Diagnóstico completo de sucursales',
      timestamp: testResult.recordset[0].current_time,
      sucursales: {
        total: countResult.recordset[0].total,
        estructura_confirmada: {
          id: 'int',
          nombre: 'nvarchar(255)',
          ip: 'nvarchar(15)',
          base_datos: 'nvarchar(255)',
          usuario: 'nvarchar(255)',
          contrasena: 'nvarchar(255)',
          tipo_sucursal: 'varchar(50)',
          id_razon_social: 'int'
        },
        samples: sampleResult.recordset
      },
      permisos_usuario: permisosTest,
      database: 'GestionBeach'
    });
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error en diagnóstico de sucursales'
    });
  }
});

module.exports = router;