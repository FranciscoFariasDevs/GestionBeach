// backend/controllers/sucursalesController.js
const { sql, poolPromise } = require('../config/db');
const { cache } = require('../config/redis');

const TTL_SUCURSALES = 86400; // 24 horas

// Obtener sucursales por usuario (basado en su perfil)
exports.getSucursales = async (req, res) => {
  try {
    const userId   = req.user.id;
    const username = req.user.username;

    // ── Caché ──────────────────────────────────────────────────────────
    const cacheKey = `gb:sucursales:usuario:${userId}`;
    const cached   = await cache.get(cacheKey);
    if (cached) {
      console.log(`✅ Sucursales de usuario ${userId} desde caché`);
      return res.json(cached);
    }

    console.log(`🔍 Obteniendo sucursales para usuario: ${username} (ID: ${userId})`);
    const pool = await poolPromise;

    const userResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT u.perfil_id, p.nombre as perfil_nombre
        FROM usuarios u
        LEFT JOIN perfiles p ON u.perfil_id = p.id
        WHERE u.id = @userId
      `);

    const perfilId    = userResult.recordset[0]?.perfil_id;
    const perfilNombre = userResult.recordset[0]?.perfil_nombre;
    console.log(`👤 Usuario tiene perfil_id: ${perfilId} (${perfilNombre})`);

    let sucursales;

    if (perfilId === 10 || perfilId === 16 || username === 'NOVLUI') {
      console.log('🔓 Usuario con acceso total - Devolviendo TODAS las sucursales');
      const allResult = await pool.request().query(`
        SELECT id, nombre, tipo_sucursal, ip, base_datos
        FROM sucursales
        ORDER BY nombre
      `);
      sucursales = allResult.recordset;
    } else {
      const result = await pool.request()
        .input('perfilId', sql.Int, perfilId)
        .query(`
          SELECT DISTINCT s.id, s.nombre, s.tipo_sucursal, s.ip, s.base_datos
          FROM perfil_sucursal ps
          INNER JOIN sucursales s ON ps.sucursal_id = s.id
          WHERE ps.perfil_id = @perfilId
          ORDER BY s.nombre
        `);
      sucursales = result.recordset;
    }

    await cache.set(cacheKey, sucursales, TTL_SUCURSALES);
    console.log(`✅ ${sucursales.length} sucursales cargadas y guardadas en caché`);
    return res.json(sucursales);

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
    const cacheKey = 'gb:sucursales:all';
    const cached   = await cache.get(cacheKey);
    if (cached) {
      console.log('✅ Todas las sucursales desde caché');
      return res.json(cached);
    }

    const pool   = await poolPromise;
    const result = await pool.request().query(`
      SELECT id, nombre, tipo_sucursal, ip
      FROM sucursales
      ORDER BY nombre
    `);

    await cache.set(cacheKey, result.recordset, TTL_SUCURSALES);
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