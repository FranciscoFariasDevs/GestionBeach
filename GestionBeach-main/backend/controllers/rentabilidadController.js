// backend/controllers/rentabilidadController.js - Rentabilidad Ferreterías (migrado de Rentabilidad.vb + VerResumenHora.vb)
const { sql, poolPromise } = require('../config/db');

// ============ CACHE DE CONEXIONES POR SUCURSAL ============
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
    user: sucursal.usuario,
    password: sucursal.contrasena || '',
    server: sucursal.ip,
    port: sucursal.puerto || 1433,
    database: sucursal.base_datos,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      requestTimeout: 120000,
      connectionTimeout: 10000
    },
    pool: { max: 5, min: 0, idleTimeoutMillis: 60000 }
  };

  const pool = await Promise.race([
    new sql.ConnectionPool(config).connect(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de conexion')), 10000))
  ]);

  poolCache.set(sucursal.id, { pool, lastUsed: Date.now() });
  console.log(`[Rentabilidad] Pool creado para ${sucursal.nombre} (cache: ${poolCache.size})`);
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

// ============ HELPERS ============

const obtenerSucursal = async (sucursalId) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('sucursal_id', sql.Int, sucursalId)
    .query('SELECT id, nombre, ip, base_datos, usuario, contrasena, tipo_sucursal, puerto FROM sucursales WHERE id = @sucursal_id');
  return result.recordset[0] || null;
};

// ============ ENDPOINTS ============

// GET /api/rentabilidad/sucursales
exports.getSucursales = async (req, res) => {
  try {
    const pool = await poolPromise;
    const perfilId = req.user?.perfilId;

    console.log('🔍 [Rentabilidad] getSucursales - usuario:', req.user);

    if (!perfilId) {
      console.log('❌ [Rentabilidad] Token sin perfilId - requiere re-login');
      return res.status(401).json({
        message: 'Sesión expirada - por favor inicie sesión nuevamente',
        requiresRelogin: true
      });
    }

    // Obtener ID del módulo "Rentabilidad"
    const moduloResult = await pool.request()
      .input('nombre', sql.VarChar, 'Rentabilidad')
      .query('SELECT id FROM modulos WHERE nombre = @nombre');

    if (moduloResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Módulo Rentabilidad no encontrado' });
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

    res.json(result.recordset);
  } catch (error) {
    console.error('Error en getSucursales:', error);
    res.status(500).json({ message: 'Error al obtener sucursales', error: error.message });
  }
};

// GET /api/rentabilidad/datos?sucursalId=1&fechaDesde=2024-01-01&fechaHasta=2024-12-31
exports.getRentabilidad = async (req, res) => {
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
    try {
      poolSucursal = await getPoolSucursal(sucursal);
    } catch (err) {
      return res.status(503).json({ message: `No se pudo conectar a ${sucursal.nombre}`, error: err.message });
    }

    // Query migrada de Rentabilidad.vb - BOLETAS + FACTURAS con descuento de NC
    const query = `
      SELECT
        DATEPART(YEAR, Fecha) AS anio,
        DATEPART(WEEK, Fecha) AS semana,
        DATEPART(DAY, Fecha) AS dia_num,
        DATEPART(HOUR, Fecha) AS hora,
        Codigo AS codigo,
        Descripcion AS descripcion,
        CONVERT(NUMERIC, SUM(Cantidad)) AS cantidad,
        CONVERT(NUMERIC, SUM(Total)) AS venta,
        CONVERT(NUMERIC, SUM(Costo)) AS costo,
        CONVERT(NUMERIC, SUM(Utilidad)) AS utilidad,
        CONVERT(DECIMAL(18,2), (SUM(Utilidad)/SUM(Total))) AS rentabilidad,
        Fecha AS fecha
      FROM (
        SELECT MP.MP_CODIGO_PRODUCTO AS Codigo,
          MP.MP_DESCRIPCION_PRODUCTO AS Descripcion,
          CASE
            WHEN SUM(DBO.DBOL_CANTIDAD) IS NOT NULL AND SUM(DNC.DNC_CANTIDAD) IS NOT NULL
            THEN SUM(DBO.DBOL_CANTIDAD) - SUM(DNC.DNC_CANTIDAD)
            WHEN SUM(DNC.DNC_CANTIDAD) IS NULL
            THEN SUM(DBO.DBOL_CANTIDAD)
          END AS Cantidad,
          CASE
            WHEN SUM((DBO.DBOL_PRECIO_LISTA * DBO.DBOL_CANTIDAD)) IS NOT NULL AND SUM((DNC.DNC_PRECIO_LISTA * DNC.DNC_CANTIDAD)) IS NOT NULL
            THEN CONVERT(NUMERIC, SUM((DBO.DBOL_PRECIO_LISTA * DBO.DBOL_CANTIDAD)) - SUM((DNC.DNC_PRECIO_LISTA * DNC.DNC_CANTIDAD)))
            WHEN SUM((DNC.DNC_PRECIO_LISTA * DNC.DNC_CANTIDAD)) IS NULL
            THEN CONVERT(NUMERIC, SUM((DBO.DBOL_PRECIO_LISTA * DBO.DBOL_CANTIDAD)))
          END AS Total,
          CASE
            WHEN SUM((DBO.MP_COSTO_FINAL * DBO.DBOL_CANTIDAD)) IS NOT NULL AND SUM((DBO.MP_COSTO_FINAL * DNC.DNC_CANTIDAD)) IS NOT NULL
            THEN CONVERT(NUMERIC, SUM((DBO.MP_COSTO_FINAL * DBO.DBOL_CANTIDAD)) - SUM((DBO.MP_COSTO_FINAL * DNC.DNC_CANTIDAD)))
            WHEN SUM((DBO.MP_COSTO_FINAL * DNC.DNC_CANTIDAD)) IS NULL
            THEN CONVERT(NUMERIC, SUM((DBO.MP_COSTO_FINAL * DBO.DBOL_CANTIDAD)))
          END AS Costo,
          CASE
            WHEN SUM((DNC.DNC_PRECIO_LISTA * DNC.DNC_CANTIDAD) - (DBO.MP_COSTO_FINAL * DNC.DNC_CANTIDAD)) IS NOT NULL
              AND SUM((DBO.DBOL_PRECIO_LISTA * DBO.DBOL_CANTIDAD) - (DBO.MP_COSTO_FINAL * DBO.DBOL_CANTIDAD)) IS NOT NULL
            THEN CONVERT(NUMERIC, SUM((DBO.DBOL_PRECIO_LISTA * DBO.DBOL_CANTIDAD) - (DBO.MP_COSTO_FINAL * DBO.DBOL_CANTIDAD))
              - SUM((DNC.DNC_PRECIO_LISTA * DNC.DNC_CANTIDAD) - (DBO.MP_COSTO_FINAL * DNC.DNC_CANTIDAD)))
            WHEN SUM((DNC.DNC_PRECIO_LISTA * DNC.DNC_CANTIDAD) - (DBO.MP_COSTO_FINAL * DNC.DNC_CANTIDAD)) IS NULL
            THEN CONVERT(NUMERIC, SUM((DBO.DBOL_PRECIO_LISTA * DBO.DBOL_CANTIDAD) - (DBO.MP_COSTO_FINAL * DBO.DBOL_CANTIDAD)))
          END AS Utilidad,
          RBO_FECHA_INGRESO AS Fecha
        FROM ERP_FACT_DET_BOLETAS DBO
        JOIN ERP_FACT_RES_BOLETAS RBO ON RBO.RBO_NUM_INTERNO_BO = DBO.RBO_NUM_INTERNO_BO
        JOIN ERP_MAESTRO_PRODUCTOS MP ON MP.MP_CODIGO_PRODUCTO = DBO.MP_CODIGO_PRODUCTO
        FULL JOIN ERP_FACT_RES_NC_CLIENTE RNC ON RNC.ROC_NUMERO_ORDEN = RBO.ROC_NUMERO_ORDEN
        FULL JOIN ERP_FACT_DET_NC_CLIENTE DNC ON DNC.RNC_NUM_INTERNO_NC_CLI = RNC.RNC_NUM_INTERNO_NC_CLI
          AND DNC.MP_CODIGO_PRODUCTO = DBO.MP_CODIGO_PRODUCTO
        WHERE MP.TPROV_ID_TIPO_PROVEEDOR = 3
          AND RBO.RBO_FECHA_INGRESO BETWEEN @fechaDesde AND @fechaHasta
          AND MP.MP_CODIGO_PRODUCTO <> 'APORTE'
          AND MP.MP_CODIGO_PRODUCTO <> 'PUBLICIDAD'
        GROUP BY MP.MP_CODIGO_PRODUCTO, MP.MP_DESCRIPCION_PRODUCTO, RBO_FECHA_INGRESO

        UNION ALL

        SELECT MP.MP_CODIGO_PRODUCTO AS Codigo,
          MP.MP_DESCRIPCION_PRODUCTO AS Descripcion,
          CASE
            WHEN SUM(DFA.DFC_CANTIDAD) IS NOT NULL AND SUM(DNC.DNC_CANTIDAD) IS NOT NULL
            THEN SUM(DFA.DFC_CANTIDAD) - SUM(DNC.DNC_CANTIDAD)
            WHEN SUM(DNC.DNC_CANTIDAD) IS NULL
            THEN SUM(DFA.DFC_CANTIDAD)
          END AS Cantidad,
          CASE
            WHEN SUM((DFA.DFC_PRECIO_LISTA * DFA.DFC_CANTIDAD)) IS NOT NULL AND SUM((DNC.DNC_PRECIO_LISTA * DNC.DNC_CANTIDAD)) IS NOT NULL
            THEN CONVERT(NUMERIC, SUM((DFA.DFC_PRECIO_LISTA * DFA.DFC_CANTIDAD)) - SUM((DNC.DNC_PRECIO_LISTA * DNC.DNC_CANTIDAD)))
            WHEN SUM((DNC.DNC_PRECIO_LISTA * DNC.DNC_CANTIDAD)) IS NULL
            THEN CONVERT(NUMERIC, SUM((DFA.DFC_PRECIO_LISTA * DFA.DFC_CANTIDAD)))
          END AS Total,
          CASE
            WHEN SUM((DFA.MP_COSTO_FINAL * DFA.DFC_CANTIDAD)) IS NOT NULL AND SUM((DFA.MP_COSTO_FINAL * DNC.DNC_CANTIDAD)) IS NOT NULL
            THEN CONVERT(NUMERIC, SUM((DFA.MP_COSTO_FINAL * DFA.DFC_CANTIDAD)) - SUM((DFA.MP_COSTO_FINAL * DNC.DNC_CANTIDAD)))
            WHEN SUM((DFA.MP_COSTO_FINAL * DNC.DNC_CANTIDAD)) IS NULL
            THEN CONVERT(NUMERIC, SUM((DFA.MP_COSTO_FINAL * DFA.DFC_CANTIDAD)))
          END AS Costo,
          CASE
            WHEN SUM((DNC.DNC_PRECIO_LISTA * DNC.DNC_CANTIDAD) - (DFA.MP_COSTO_FINAL * DNC.DNC_CANTIDAD)) IS NOT NULL
              AND SUM((DFA.DFC_PRECIO_LISTA * DFA.DFC_CANTIDAD) - (DFA.MP_COSTO_FINAL * DFA.DFC_CANTIDAD)) IS NOT NULL
            THEN CONVERT(NUMERIC, SUM((DFA.DFC_PRECIO_LISTA * DFA.DFC_CANTIDAD) - (DFA.MP_COSTO_FINAL * DFA.DFC_CANTIDAD))
              - SUM((DNC.DNC_PRECIO_LISTA * DNC.DNC_CANTIDAD) - (DFA.MP_COSTO_FINAL * DNC.DNC_CANTIDAD)))
            WHEN SUM((DNC.DNC_PRECIO_LISTA * DNC.DNC_CANTIDAD) - (DFA.MP_COSTO_FINAL * DNC.DNC_CANTIDAD)) IS NULL
            THEN CONVERT(NUMERIC, SUM((DFA.DFC_PRECIO_LISTA * DFA.DFC_CANTIDAD) - (DFA.MP_COSTO_FINAL * DFA.DFC_CANTIDAD)))
          END AS Utilidad,
          RFC_FECHA_INGRESO AS Fecha
        FROM ERP_FACT_DET_FACTURA_CLIENTES DFA
        JOIN ERP_FACT_RES_FACTURA_CLIENTES RFA ON RFA.RFC_NUM_INTERNO_FA_CLI = DFA.RFC_NUM_INTERNO_FA_CLI
        JOIN ERP_MAESTRO_PRODUCTOS MP ON MP.MP_CODIGO_PRODUCTO = DFA.MP_CODIGO_PRODUCTO
        FULL JOIN ERP_FACT_RES_NC_CLIENTE RNC ON RNC.ROC_NUMERO_ORDEN = RFA.ROC_NUMERO_ORDEN
        FULL JOIN ERP_FACT_DET_NC_CLIENTE DNC ON DNC.RNC_NUM_INTERNO_NC_CLI = RNC.RNC_NUM_INTERNO_NC_CLI
          AND DNC.MP_CODIGO_PRODUCTO = DFA.MP_CODIGO_PRODUCTO
        WHERE MP.TPROV_ID_TIPO_PROVEEDOR = 3
          AND RFA.RFC_FECHA_INGRESO BETWEEN @fechaDesde AND @fechaHasta
          AND RFA.MC_RUT_CLIENTE NOT IN ('76236893','10429345','76775236','77204945')
          AND MP.MP_CODIGO_PRODUCTO <> 'APORTE'
          AND MP.MP_CODIGO_PRODUCTO <> 'PUBLICIDAD'
        GROUP BY MP.MP_CODIGO_PRODUCTO, MP.MP_DESCRIPCION_PRODUCTO, RFC_FECHA_INGRESO
      ) T
      GROUP BY Codigo, Descripcion, Fecha, DATEPART(HOUR, Fecha)
      HAVING SUM(T.Total) <> 0 AND SUM(T.Costo) <> 0 AND SUM(T.Utilidad) <> 0
      ORDER BY Fecha DESC, DATEPART(HOUR, Fecha) ASC
    `;

    const result = await poolSucursal.request()
      .input('fechaDesde', sql.VarChar, fechaDesde + ' 01:00:00')
      .input('fechaHasta', sql.VarChar, fechaHasta + ' 23:59:59')
      .query(query);

    const registros = result.recordset;

    // Calcular totales
    const totalVenta = registros.reduce((s, r) => s + (r.venta || 0), 0);
    const totalCosto = registros.reduce((s, r) => s + (r.costo || 0), 0);
    const totalUtilidad = registros.reduce((s, r) => s + (r.utilidad || 0), 0);
    const rentabilidadGlobal = totalVenta > 0 ? totalUtilidad / totalVenta : 0;

    // Calcular mejor hora por dia (VerResumenHora.vb)
    const ventaPorDiaHora = {};
    for (const r of registros) {
      if (!r.fecha) continue;
      const dia = new Date(r.fecha).toISOString().split('T')[0];
      const key = `${dia}_${r.hora}`;
      if (!ventaPorDiaHora[key]) {
        ventaPorDiaHora[key] = { dia, hora: r.hora, venta: 0 };
      }
      ventaPorDiaHora[key].venta += (r.venta || 0);
    }

    // Agrupar por dia y encontrar la mejor hora
    const mejorPorDia = {};
    for (const entry of Object.values(ventaPorDiaHora)) {
      if (!mejorPorDia[entry.dia] || entry.venta > mejorPorDia[entry.dia].venta) {
        mejorPorDia[entry.dia] = entry;
      }
    }

    const resumenHoras = Object.values(mejorPorDia)
      .sort((a, b) => a.dia.localeCompare(b.dia))
      .map(e => ({
        dia: e.dia,
        rango_hora: `${String(e.hora).padStart(2, '0')}:00 - ${String(e.hora + 1).padStart(2, '0')}:00`,
        venta: e.venta
      }));

    res.json({
      sucursal: { id: sucursal.id, nombre: sucursal.nombre },
      total_registros: registros.length,
      totales: {
        venta: totalVenta,
        costo: totalCosto,
        utilidad: totalUtilidad,
        rentabilidad: rentabilidadGlobal
      },
      resumen_horas: resumenHoras,
      registros
    });

    console.log(`[Rentabilidad] ${sucursal.nombre}: ${registros.length} registros, venta $${Math.round(totalVenta).toLocaleString()}, rentabilidad ${(rentabilidadGlobal * 100).toFixed(1)}%`);
  } catch (error) {
    console.error('Error en getRentabilidad:', error);
    res.status(500).json({ message: 'Error al consultar rentabilidad', error: error.message });
  }
};
