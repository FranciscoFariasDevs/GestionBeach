// backend/controllers/sucursalesController.js
const { sql, poolPromise } = require('../config/db');

// Obtener sucursales por usuario (basado en su perfil)
exports.getSucursales = async (req, res) => {
  try {
    // Obtener usuario desde token JWT
    const userId = req.user.id;

    console.log(`🔍 Obteniendo sucursales para usuario ID: ${userId}`);

    // Obtener pool de conexión
    const pool = await poolPromise;

    // OPCIÓN 1: Buscar sucursales basadas en el perfil del usuario
    try {
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
          SELECT DISTINCT s.id, s.nombre, s.tipo_sucursal, s.ip, s.base_datos
          FROM usuarios u
          INNER JOIN perfiles p ON u.perfil_id = p.id
          INNER JOIN perfil_sucursal ps ON ps.perfil_id = p.id
          INNER JOIN sucursales s ON ps.sucursal_id = s.id
          WHERE u.id = @userId
          ORDER BY s.nombre
        `);

      if (result.recordset.length > 0) {
        console.log(`✅ Usuario tiene ${result.recordset.length} sucursales asignadas por perfil`);
        return res.json(result.recordset);
      } else {
        console.log(`⚠️ Usuario no tiene sucursales asignadas en su perfil`);
      }
    } catch (perfilError) {
      console.log('⚠️ Error obteniendo sucursales por perfil:', perfilError.message);
    }

    // OPCIÓN 2: Fallback - TODAS las sucursales (para usuarios sin perfil o superadmin)
    const fallbackResult = await pool.request()
      .query(`
        SELECT id, nombre, tipo_sucursal, ip, base_datos
        FROM sucursales
        ORDER BY nombre
      `);

    console.log(`✅ Fallback: Devolviendo todas las sucursales (${fallbackResult.recordset.length})`);
    return res.json(fallbackResult.recordset);

  } catch (error) {
    console.error('❌ Error al obtener sucursales:', error);
    return res.status(500).json({
      message: 'Error en el servidor al obtener sucursales',
      error: error.message
    });
  }
};

// Obtener TODAS las sucursales (para el selector en Perfiles)
exports.getAllSucursales = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .query(`
        SELECT id, nombre, tipo_sucursal, ip
        FROM sucursales
        ORDER BY nombre
      `);

    console.log(`✅ Total de sucursales disponibles: ${result.recordset.length}`);
    res.json(result.recordset);

  } catch (error) {
    console.error('❌ Error al obtener todas las sucursales:', error);
    return res.status(500).json({
      message: 'Error al obtener sucursales',
      error: error.message
    });
  }
};