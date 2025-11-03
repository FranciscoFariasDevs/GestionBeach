// backend/controllers/sucursalesController.js
const { sql, poolPromise } = require('../config/db');

// Obtener sucursales por usuario (basado en su perfil)
exports.getSucursales = async (req, res) => {
  try {
    // Obtener usuario desde token JWT
    const userId = req.user.id;
    const username = req.user.username;

    console.log(`🔍 Obteniendo sucursales para usuario: ${username} (ID: ${userId})`);

    // Obtener pool de conexión
    const pool = await poolPromise;

    // Primero obtener el perfil del usuario
    const userResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT u.perfil_id, p.nombre as perfil_nombre
        FROM usuarios u
        LEFT JOIN perfiles p ON u.perfil_id = p.id
        WHERE u.id = @userId
      `);

    const perfilId = userResult.recordset[0]?.perfil_id;
    const perfilNombre = userResult.recordset[0]?.perfil_nombre;

    console.log(`👤 Usuario tiene perfil_id: ${perfilId} (${perfilNombre})`);

    // SUPER ADMIN (10) y ADMINISTRADOR (16) ven TODAS las sucursales
    if (perfilId === 10 || perfilId === 16 || username === 'NOVLUI') {
      console.log('🔓 Usuario con acceso total - Devolviendo TODAS las sucursales');
      const allResult = await pool.request()
        .query(`
          SELECT id, nombre, tipo_sucursal, ip, base_datos
          FROM sucursales
          ORDER BY nombre
        `);

      console.log(`✅ Total sucursales: ${allResult.recordset.length}`);
      return res.json(allResult.recordset);
    }

    // OTROS PERFILES: Buscar sucursales basadas en el perfil
    const result = await pool.request()
      .input('perfilId', sql.Int, perfilId)
      .query(`
        SELECT DISTINCT s.id, s.nombre, s.tipo_sucursal, s.ip, s.base_datos
        FROM perfil_sucursal ps
        INNER JOIN sucursales s ON ps.sucursal_id = s.id
        WHERE ps.perfil_id = @perfilId
        ORDER BY s.nombre
      `);

    if (result.recordset.length > 0) {
      console.log(`✅ Usuario tiene ${result.recordset.length} sucursales asignadas por perfil`);
      return res.json(result.recordset);
    } else {
      console.log(`⚠️ Usuario no tiene sucursales asignadas - Devolviendo array vacío`);
      return res.json([]);
    }

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