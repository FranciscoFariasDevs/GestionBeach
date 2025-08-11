// backend/controllers/sucursalesController.js
const { sql, poolPromise } = require('../config/db');

// Obtener sucursales por usuario
exports.getSucursales = async (req, res) => {
  try {
    // Obtener usuario desde token JWT
    const userId = req.user.id;
    
    // Obtener pool de conexión
    const pool = await poolPromise;
    
    // OPCIÓN 1: Con permisos (si existe la tabla)
    try {
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
          SELECT DISTINCT SU.id, SU.nombre, SU.tipo_sucursal
          FROM permisos_usuario PU
          JOIN sucursales SU ON PU.sucursal_id = SU.id
          WHERE PU.usuario_id = @userId
          ORDER BY SU.nombre
        `);
      
      if (result.recordset.length > 0) {
        console.log(`✅ Sucursales con permisos: ${result.recordset.length}`);
        return res.json(result.recordset);
      }
    } catch (permError) {
      console.log('⚠️ Tabla permisos_usuario no existe o error en JOIN, usando fallback');
    }
    
    // OPCIÓN 2: Fallback - TODAS las sucursales
    // Basado en la estructura real: id, nombre, ip, base_datos, usuario, contrasena, tipo_sucursal, id_razon_social
    const fallbackResult = await pool.request()
      .query(`
        SELECT id, nombre, tipo_sucursal, ip, base_datos
        FROM sucursales
        ORDER BY nombre
      `);
    
    console.log(`✅ Sucursales encontradas: ${fallbackResult.recordset.length}`);
    return res.json(fallbackResult.recordset);
    
  } catch (error) {
    console.error('❌ Error al obtener sucursales:', error);
    return res.status(500).json({ 
      message: 'Error en el servidor al obtener sucursales',
      error: error.message 
    });
  }
};