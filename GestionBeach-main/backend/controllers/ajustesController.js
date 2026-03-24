// backend/controllers/ajustesController.js - Ajustes de Bodega (migrado de Ajustes.vb)
const { sql, poolPromise } = require('../config/db');

// ============ CACHE DE CONEXIONES ============
const poolCache = new Map();

const getPoolSucursal = async (sucursal) => {
  const cached = poolCache.get(sucursal.id);
  if (cached && cached.pool && cached.pool.connected) {
    cached.lastUsed = Date.now();
    return cached.pool;
  }
  if (cached) {
    try { await cached.pool.close(); } catch {}
    poolCache.delete(sucursal.id);
  }
  const config = {
    user: sucursal.usuario, password: sucursal.contrasena || '',
    server: sucursal.ip, port: sucursal.puerto || 1433, database: sucursal.base_datos,
    options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true, requestTimeout: 120000, connectionTimeout: 10000 },
    pool: { max: 5, min: 0, idleTimeoutMillis: 60000 }
  };
  const pool = await Promise.race([
    new sql.ConnectionPool(config).connect(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de conexion')), 10000))
  ]);
  poolCache.set(sucursal.id, { pool, lastUsed: Date.now() });
  return pool;
};

setInterval(() => {
  const ahora = Date.now();
  for (const [id, entry] of poolCache) {
    if (ahora - entry.lastUsed > 5 * 60 * 1000) {
      try { entry.pool.close(); } catch {}
      poolCache.delete(id);
    }
  }
}, 5 * 60 * 1000);

const obtenerSucursal = async (sucursalId) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('sucursal_id', sql.Int, sucursalId)
    .query('SELECT id, nombre, ip, base_datos, usuario, contrasena, tipo_sucursal, puerto FROM sucursales WHERE id = @sucursal_id');
  return result.recordset[0] || null;
};

// ============ ENDPOINTS ============

exports.getSucursales = async (req, res) => {
  try {
    const pool = await poolPromise;
    const perfilId = req.user?.perfilId;

    console.log('[Ajustes] getSucursales - usuario:', req.user);

    if (!perfilId) {
      console.log('[Ajustes] Token sin perfilId - requiere re-login');
      return res.status(401).json({
        message: 'Sesión expirada - por favor inicie sesión nuevamente',
        requiresRelogin: true
      });
    }

    // Obtener ID del módulo "Ajustes"
    const moduloResult = await pool.request()
      .input('nombre', sql.VarChar, 'Ajustes')
      .query('SELECT id FROM modulos WHERE nombre = @nombre');

    if (moduloResult.recordset.length === 0) {
      // Si no existe el módulo, retornar todas las sucursales FERRETERIA/MULTITIENDA
      console.log('[Ajustes] Módulo Ajustes no encontrado en BD, retornando todas las sucursales');
      const result = await pool.request()
        .query(`
          SELECT DISTINCT id, nombre, tipo_sucursal
          FROM sucursales
          WHERE tipo_sucursal IN ('FERRETERIA', 'MULTITIENDA')
            AND ip IS NOT NULL AND ip <> ''
          ORDER BY nombre
        `);
      return res.json(result.recordset);
    }

    const moduloId = moduloResult.recordset[0].id;

    // Obtener sucursales permitidas para este perfil y módulo
    const result = await pool.request()
      .input('perfilId', sql.Int, perfilId)
      .input('moduloId', sql.Int, moduloId)
      .query(`
        SELECT DISTINCT s.id, s.nombre, s.tipo_sucursal
        FROM sucursales s
        INNER JOIN perfil_modulo_sucursal pms ON pms.sucursal_id = s.id
        WHERE pms.perfil_id = @perfilId
          AND pms.modulo_id = @moduloId
          AND s.tipo_sucursal IN ('FERRETERIA', 'MULTITIENDA')
          AND s.ip IS NOT NULL AND s.ip <> ''
        ORDER BY s.nombre
      `);

    console.log(`[Ajustes] Usuario con perfil ${perfilId} tiene acceso a ${result.recordset.length} sucursales`);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error en getSucursales (Ajustes):', error);
    res.status(500).json({ message: 'Error al obtener sucursales', error: error.message });
  }
};

// GET /api/ajustes/datos?sucursalId=1&fechaDesde=2025-02-01&fechaHasta=2025-02-10
exports.getAjustes = async (req, res) => {
  try {
    const sucursalId = parseInt(req.query.sucursalId);
    const fechaDesde = req.query.fechaDesde;
    const fechaHasta = req.query.fechaHasta;

    if (!sucursalId || !fechaDesde || !fechaHasta) {
      return res.status(400).json({ message: 'Se requiere sucursalId, fechaDesde y fechaHasta' });
    }

    const sucursal = await obtenerSucursal(sucursalId);
    if (!sucursal) return res.status(404).json({ message: 'Sucursal no encontrada' });

    let poolSucursal;
    try { poolSucursal = await getPoolSucursal(sucursal); }
    catch (err) { return res.status(503).json({ message: `No se pudo conectar a ${sucursal.nombre}`, error: err.message }); }

    const t0 = Date.now();

    console.log(`[Ajustes] Consultando ${sucursal.nombre} desde ${fechaDesde} hasta ${fechaHasta}`);

    const query = `
      SELECT
        bra.AJU_ID_AJUSTE AS id,
        mpe.MPE_NOMBRE_COMPLETO + ' ' + mpe.MPE_APELLIDO_PATERNO + ' ' + mpe.MPE_APELLIDO_MATERNO AS responsable,
        bra.AJU_OBSERVACION AS observacion,
        bta.TAJU_DESCRIPCION_TIPO_AJUSTE AS tipo_ajuste,
        bra.AJU_FECHA_INGRESO AS fecha,
        bdet.MP_CODIGO_PRODUCTO AS codigo,
        bdet.DAJU_DESCRIPCION_PRODUCTO AS descripcion,
        bdet.DAJU_CANTIDAD AS cantidad,
        bdet.DAJU_PRECIO AS unitario,
        bdet.DAJU_PRECIO * bdet.DAJU_CANTIDAD AS total_linea
      FROM ERP_BOD_RES_AJUSTES bra
      JOIN ERP_USUARIOS_SISTEMAS us ON us.US_ID_USUARIO_SISTEMA = bra.US_ID_USUARIO_SISTEMA
      JOIN ERP_MAESTRO_PERSONAS mpe ON mpe.MPE_RUT_PERSONA = us.MPE_RUT_PERSONA
      JOIN ERP_BOD_TIPO_AJUSTE bta ON bta.TAJU_ID_TIPO_AJUSTE = bra.TAJU_ID_TIPO_AJUSTE
      JOIN ERP_BOD_DET_AJUSTES bdet ON bdet.AJU_ID_AJUSTE = bra.AJU_ID_AJUSTE
      WHERE bra.AJU_FECHA_INGRESO BETWEEN @fechaDesde AND @fechaHasta
        AND bdet.DAJU_CANTIDAD <> 0
      ORDER BY bra.AJU_FECHA_INGRESO DESC, bra.AJU_ID_AJUSTE
    `;

    const result = await poolSucursal.request()
      .input('fechaDesde', sql.VarChar, fechaDesde + ' 01:00:00')
      .input('fechaHasta', sql.VarChar, fechaHasta + ' 23:59:59')
      .query(query);

    const rows = result.recordset;
    console.log(`[Ajustes] ${sucursal.nombre}: ${rows.length} filas raw obtenidas`);

    // Agrupar: un ajuste con array de productos
    const ajustesMap = {};
    rows.forEach(r => {
      if (!ajustesMap[r.id]) {
        ajustesMap[r.id] = {
          id: r.id, responsable: r.responsable, observacion: r.observacion,
          tipo_ajuste: r.tipo_ajuste, fecha: r.fecha,
          productos: [], total: 0
        };
      }
      ajustesMap[r.id].productos.push({
        codigo: r.codigo, descripcion: r.descripcion,
        cantidad: r.cantidad, unitario: r.unitario, total_linea: r.total_linea
      });
      ajustesMap[r.id].total += r.total_linea || 0;
    });
    const ajustes = Object.values(ajustesMap);

    const ms = Date.now() - t0;
    console.log(`[Ajustes] ${sucursal.nombre}: ${ajustes.length} ajustes agrupados en ${ms}ms`);
    if (ajustes.length > 0) {
      console.log('[Ajustes] muestra primer ajuste:', JSON.stringify({ ...ajustes[0], productos: `[${ajustes[0].productos.length} productos]` }));
    }

    res.json({ ajustes });
  } catch (error) {
    console.error('Error en getAjustes:', error);
    res.status(500).json({ message: 'Error al consultar ajustes', error: error.message });
  }
};
