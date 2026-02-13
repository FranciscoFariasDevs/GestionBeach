// backend/controllers/margenesController.js - Márgenes por Vendedor (migrado de Margen.vb)
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
    const result = await pool.request()
      .query(`SELECT id, nombre, tipo_sucursal FROM sucursales
              WHERE tipo_sucursal IN ('FERRETERIA', 'MULTITIENDA') AND ip IS NOT NULL AND ip <> '' ORDER BY nombre`);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener sucursales', error: error.message });
  }
};

// GET /api/margenes/datos?sucursalId=1&fechaDesde=2025-02-01&fechaHasta=2025-02-10
exports.getMargenes = async (req, res) => {
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

    // Query 1: Resumen por vendedor (Boletas + Facturas)
    const queryResumen = `
      SELECT Vendedor,
        SUM([Venta Neto S/Dcto]) AS venta_sin_dcto,
        SUM([Venta Neto S/Dcto]) - SUM([Costo Neto Total]) AS utilidad_sin_dcto,
        CASE WHEN SUM([Venta Neto S/Dcto]) <> 0
          THEN ((SUM([Venta Neto S/Dcto]) - SUM([Costo Neto Total])) / SUM([Venta Neto S/Dcto])) * 100
          ELSE 0 END AS margen_sin_dcto,
        SUM([Costo Neto Total]) AS costo_neto,
        SUM([Venta Neto C/Dcto]) AS venta_con_dcto,
        SUM([Venta Neto C/Dcto]) - SUM([Costo Neto Total]) AS utilidad_con_dcto,
        CASE WHEN SUM([Venta Neto C/Dcto]) <> 0
          THEN ((SUM([Venta Neto C/Dcto]) - SUM([Costo Neto Total])) / SUM([Venta Neto C/Dcto])) * 100
          ELSE 0 END AS margen_con_dcto
      FROM (
        SELECT
          CAST(MPA.MPE_NOMBRE_COMPLETO AS NVARCHAR) + ' ' +
          CAST(MPA.MPE_APELLIDO_PATERNO AS NVARCHAR) + ' ' +
          CAST(MPA.MPE_APELLIDO_MATERNO AS NVARCHAR) AS Vendedor,
          SUM(ISNULL((DOC.MP_COSTO_FINAL * (1 + DOC.MP_MARGEN_COMERCIALIZACION / 100)) * DOC.DOC_CANTIDAD, 0)) AS [Venta Neto S/Dcto],
          SUM(ISNULL(DOC.MP_COSTO_FINAL * DOC.DOC_CANTIDAD, 0)) AS [Costo Neto Total],
          SUM(ISNULL((DOC.DOC_PRECIO_LISTA * DOC.DOC_CANTIDAD), 0)) AS [Venta Neto C/Dcto]
        FROM ERP_FACT_RES_BOLETAS RBO
        JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON ROC.ROC_NUMERO_ORDEN = RBO.ROC_NUMERO_ORDEN
        JOIN ERP_OP_DET_ORDEN_COMPRA DOC ON DOC.ROC_NUMERO_ORDEN = ROC.ROC_NUMERO_ORDEN
        JOIN ERP_USUARIOS_SISTEMAS US ON US.US_ID_USUARIO_SISTEMA = ROC.US_ID_USUARIO_SISTEMA
        JOIN ERP_MAESTRO_PERSONAS MPA ON MPA.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
        WHERE RBO.RBO_FECHA_INGRESO BETWEEN @fechaDesde AND @fechaHasta
          AND MPA.TPERS_ID_TIPO_PERSONA IN ('3', '1')
          AND DOC.MP_MARGEN_COMERCIALIZACION <> 0
        GROUP BY MPE_NOMBRE_COMPLETO, MPE_APELLIDO_PATERNO, MPE_APELLIDO_MATERNO
        UNION ALL
        SELECT
          CAST(MPA.MPE_NOMBRE_COMPLETO AS NVARCHAR) + ' ' +
          CAST(MPA.MPE_APELLIDO_PATERNO AS NVARCHAR) + ' ' +
          CAST(MPA.MPE_APELLIDO_MATERNO AS NVARCHAR) AS Vendedor,
          ROUND(SUM(ISNULL((DOC.MP_COSTO_FINAL * (1 + DOC.MP_MARGEN_COMERCIALIZACION / 100)) * DOC.DOC_CANTIDAD, 0)), 0),
          ROUND(SUM(ISNULL(DOC.MP_COSTO_FINAL * DOC.DOC_CANTIDAD, 0)), 0),
          ROUND(SUM(ISNULL((DOC.DOC_PRECIO_LISTA * DOC.DOC_CANTIDAD), 0)), 0)
        FROM ERP_FACT_RES_FACTURA_CLIENTES RFA
        JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON ROC.ROC_NUMERO_ORDEN = RFA.ROC_NUMERO_ORDEN
        JOIN ERP_OP_DET_ORDEN_COMPRA DOC ON DOC.ROC_NUMERO_ORDEN = ROC.ROC_NUMERO_ORDEN
        JOIN ERP_USUARIOS_SISTEMAS US ON US.US_ID_USUARIO_SISTEMA = ROC.US_ID_USUARIO_SISTEMA
        JOIN ERP_MAESTRO_PERSONAS MPA ON MPA.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
        WHERE RFA.RFC_FECHA_INGRESO BETWEEN @fechaDesde AND @fechaHasta
          AND MPA.TPERS_ID_TIPO_PERSONA IN ('3', '1')
          AND DOC.MP_MARGEN_COMERCIALIZACION <> 0
          AND RFA.MC_RUT_CLIENTE NOT IN ('77204945','10429345','76236893','76955204','78061914','76446632','96726970')
          AND DOC.DOC_DESCRIPCION_PRODUCTO NOT LIKE '%APORTE%'
          AND DOC.DOC_DESCRIPCION_PRODUCTO NOT LIKE '%PUBLICIDAD%'
          AND DOC.DOC_DESCRIPCION_PRODUCTO NOT LIKE '%ARRIENDO%'
          AND DOC.DOC_DESCRIPCION_PRODUCTO NOT LIKE '%EXPO%'
        GROUP BY MPE_NOMBRE_COMPLETO, MPE_APELLIDO_PATERNO, MPE_APELLIDO_MATERNO
      ) T
      GROUP BY Vendedor
      ORDER BY venta_con_dcto DESC
    `;

    // Query NC: Notas de credito por vendedor (se restan) - igual que Margen.vb
    const queryNC = `
      SELECT
        Vendedor,
        -(SUM([Venta Neto S/Dcto])) AS venta_sin_dcto,
        -(SUM([Venta Neto S/Dcto]) - SUM([Costo Neto Total])) AS utilidad_sin_dcto,
        -((SUM([Venta Neto S/Dcto]) - SUM([Costo Neto Total])) / NULLIF(SUM([Venta Neto S/Dcto]), 0) * 100) AS margen_sin_dcto,
        -(SUM([Costo Neto Total])) AS costo_neto,
        -(SUM([Venta Neto C/Dcto])) AS venta_con_dcto,
        -(SUM([Venta Neto C/Dcto]) - SUM([Costo Neto Total])) AS utilidad_con_dcto,
        -((SUM([Venta Neto C/Dcto]) - SUM([Costo Neto Total])) / NULLIF(SUM([Venta Neto C/Dcto]), 0) * 100) AS margen_con_dcto
      FROM (
        SELECT
          'NOTAS DE CREDITO' AS Vendedor,
          ROUND(SUM(ISNULL(DOC.MP_COSTO_FINAL * DNC.DNC_CANTIDAD, 0)), 0) AS [Costo Neto Total],
          ROUND(SUM(ISNULL((DNC.DNC_PRECIO_LISTA * DNC.DNC_CANTIDAD), 0)), 0) AS [Venta Neto C/Dcto],
          ROUND(SUM(ISNULL(((DOC.MP_COSTO_FINAL * (1+(DOC.MP_MARGEN_COMERCIALIZACION/100)))*DNC.DNC_CANTIDAD), 0)), 0) AS [Venta Neto S/Dcto]
        FROM ERP_FACT_RES_NC_CLIENTE RNC
        JOIN ERP_FACT_DET_NC_CLIENTE DNC ON RNC.RNC_NUM_INTERNO_NC_CLI = DNC.RNC_NUM_INTERNO_NC_CLI
        JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON ROC.ROC_NUMERO_ORDEN = RNC.ROC_NUMERO_ORDEN
        JOIN ERP_OP_DET_ORDEN_COMPRA DOC ON ROC.ROC_NUMERO_ORDEN = DOC.ROC_NUMERO_ORDEN AND DOC.MP_CODIGO_PRODUCTO = DNC.MP_CODIGO_PRODUCTO
        JOIN ERP_USUARIOS_SISTEMAS US ON US.US_ID_USUARIO_SISTEMA = RNC.US_ID_USUARIO_SISTEMA
        JOIN ERP_MAESTRO_PERSONAS MPA ON MPA.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
        WHERE RNC.RNC_FECHA_INGRESO BETWEEN @fechaDesde AND @fechaHasta
          AND MPA.TPERS_ID_TIPO_PERSONA IN ('3', '1')
          AND RNC.MC_RUT_CLIENTE NOT IN ('77204945','10429345','76236893','76955204','78061914','76446632','96726970')
          AND DNC.DNC_DESCRIPCION_PRODUCTO NOT LIKE '%APORTE%'
          AND DNC.DNC_DESCRIPCION_PRODUCTO NOT LIKE '%PUBLICIDAD%'
          AND DNC.DNC_DESCRIPCION_PRODUCTO NOT LIKE '%ARRIENDO%'
          AND DNC.DNC_DESCRIPCION_PRODUCTO NOT LIKE '%EXPO%'
      ) T
      GROUP BY Vendedor
    `;

    // Query 2: Detalle por documento
    const queryDetalle = `
      SELECT [N Doc] AS numero_doc, Vendedor,
        SUM([Venta Neto S/Dcto]) AS venta_sin_dcto,
        SUM([Venta Neto S/Dcto]) - SUM([Costo Neto Total]) AS utilidad_sin_dcto,
        CASE WHEN SUM([Venta Neto S/Dcto]) <> 0
          THEN ((SUM([Venta Neto S/Dcto]) - SUM([Costo Neto Total])) / SUM([Venta Neto S/Dcto])) * 100
          ELSE 0 END AS margen_sin_dcto,
        SUM([Costo Neto Total]) AS costo_neto,
        SUM([Venta Neto C/Dcto]) AS venta_con_dcto,
        SUM([Venta Neto C/Dcto]) - SUM([Costo Neto Total]) AS utilidad_con_dcto,
        CASE WHEN SUM([Venta Neto C/Dcto]) <> 0
          THEN ((SUM([Venta Neto C/Dcto]) - SUM([Costo Neto Total])) / SUM([Venta Neto C/Dcto])) * 100
          ELSE 0 END AS margen_con_dcto,
        Doc AS tipo_doc
      FROM (
        SELECT RBO.RBO_NUMERO_BOLETA AS [N Doc],
          CAST(MPA.MPE_NOMBRE_COMPLETO AS NVARCHAR) + ' ' + CAST(MPA.MPE_APELLIDO_PATERNO AS NVARCHAR) + ' ' + CAST(MPA.MPE_APELLIDO_MATERNO AS NVARCHAR) AS Vendedor,
          SUM(ISNULL((DOC.MP_COSTO_FINAL * (1 + DOC.MP_MARGEN_COMERCIALIZACION / 100)) * DOC.DOC_CANTIDAD, 0)) AS [Venta Neto S/Dcto],
          SUM(ISNULL(DOC.MP_COSTO_FINAL * DOC.DOC_CANTIDAD, 0)) AS [Costo Neto Total],
          SUM(ISNULL((DOC.DOC_PRECIO_LISTA * DOC.DOC_CANTIDAD), 0)) AS [Venta Neto C/Dcto],
          'BO' AS Doc
        FROM ERP_FACT_RES_BOLETAS RBO
        JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON ROC.ROC_NUMERO_ORDEN = RBO.ROC_NUMERO_ORDEN
        JOIN ERP_OP_DET_ORDEN_COMPRA DOC ON DOC.ROC_NUMERO_ORDEN = ROC.ROC_NUMERO_ORDEN
        JOIN ERP_USUARIOS_SISTEMAS US ON US.US_ID_USUARIO_SISTEMA = ROC.US_ID_USUARIO_SISTEMA
        JOIN ERP_MAESTRO_PERSONAS MPA ON MPA.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
        WHERE RBO.RBO_FECHA_INGRESO BETWEEN @fechaDesde AND @fechaHasta
          AND MPA.TPERS_ID_TIPO_PERSONA IN ('3', '1') AND DOC.MP_MARGEN_COMERCIALIZACION <> 0
        GROUP BY RBO_NUMERO_BOLETA, MPE_NOMBRE_COMPLETO, MPE_APELLIDO_PATERNO, MPE_APELLIDO_MATERNO
        UNION ALL
        SELECT RFA.RFC_NUMERO_FACTURA_CLI,
          CAST(MPA.MPE_NOMBRE_COMPLETO AS NVARCHAR) + ' ' + CAST(MPA.MPE_APELLIDO_PATERNO AS NVARCHAR) + ' ' + CAST(MPA.MPE_APELLIDO_MATERNO AS NVARCHAR),
          SUM(ISNULL((DOC.MP_COSTO_FINAL * (1 + DOC.MP_MARGEN_COMERCIALIZACION / 100)) * DOC.DOC_CANTIDAD, 0)),
          SUM(ISNULL(DOC.MP_COSTO_FINAL * DOC.DOC_CANTIDAD, 0)),
          SUM(ISNULL((DOC.DOC_PRECIO_LISTA * DOC.DOC_CANTIDAD), 0)),
          'FA'
        FROM ERP_FACT_RES_FACTURA_CLIENTES RFA
        JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON ROC.ROC_NUMERO_ORDEN = RFA.ROC_NUMERO_ORDEN
        JOIN ERP_OP_DET_ORDEN_COMPRA DOC ON DOC.ROC_NUMERO_ORDEN = ROC.ROC_NUMERO_ORDEN
        JOIN ERP_USUARIOS_SISTEMAS US ON US.US_ID_USUARIO_SISTEMA = ROC.US_ID_USUARIO_SISTEMA
        JOIN ERP_MAESTRO_PERSONAS MPA ON MPA.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
        WHERE RFA.RFC_FECHA_INGRESO BETWEEN @fechaDesde AND @fechaHasta
          AND MPA.TPERS_ID_TIPO_PERSONA IN ('3', '1') AND DOC.MP_MARGEN_COMERCIALIZACION <> 0
          AND RFA.MC_RUT_CLIENTE NOT IN ('77204945','10429345','76236893','76955204','78061914','76446632','96726970')
          AND DOC.DOC_DESCRIPCION_PRODUCTO NOT LIKE '%APORTE%' AND DOC.DOC_DESCRIPCION_PRODUCTO NOT LIKE '%PUBLICIDAD%'
          AND DOC.DOC_DESCRIPCION_PRODUCTO NOT LIKE '%ARRIENDO%' AND DOC.DOC_DESCRIPCION_PRODUCTO NOT LIKE '%EXPO%'
          AND RFC_ORIGEN='CAJA'
          GROUP BY RFC_NUMERO_FACTURA_CLI, MPE_NOMBRE_COMPLETO, MPE_APELLIDO_PATERNO, MPE_APELLIDO_MATERNO
      ) T
      GROUP BY [N Doc], Doc, Vendedor
      ORDER BY Vendedor, [N Doc]
    `;

    const [resResumen, resNC, resDetalle] = await Promise.all([
      poolSucursal.request()
        .input('fechaDesde', sql.VarChar, fechaDesde + ' 01:00:00')
        .input('fechaHasta', sql.VarChar, fechaHasta + ' 23:59:59')
        .query(queryResumen),
      poolSucursal.request()
        .input('fechaDesde', sql.VarChar, fechaDesde + ' 01:00:00')
        .input('fechaHasta', sql.VarChar, fechaHasta + ' 23:59:59')
        .query(queryNC),
      poolSucursal.request()
        .input('fechaDesde', sql.VarChar, fechaDesde + ' 01:00:00')
        .input('fechaHasta', sql.VarChar, fechaHasta + ' 23:59:59')
        .query(queryDetalle)
    ]);

    let vendedores = resResumen.recordset;
    const nc = resNC.recordset[0];

    // Agregar notas de credito como fila extra
    if (nc && (nc.venta_con_dcto !== 0 || nc.venta_sin_dcto !== 0)) {
      vendedores.push(nc);
    }

    // Calcular totales globales
    const totVentaSD = vendedores.reduce((s, v) => s + (v.venta_sin_dcto || 0), 0);
    const totCosto = vendedores.reduce((s, v) => s + (v.costo_neto || 0), 0);
    const totUtilidadSD = vendedores.reduce((s, v) => s + (v.utilidad_sin_dcto || 0), 0);
    const totVentaCD = vendedores.reduce((s, v) => s + (v.venta_con_dcto || 0), 0);
    const totUtilidadCD = vendedores.reduce((s, v) => s + (v.utilidad_con_dcto || 0), 0);

    const ms = Date.now() - t0;
    console.log(`[Margenes] ${sucursal.nombre}: ${vendedores.length} vendedores, ${resDetalle.recordset.length} docs en ${ms}ms`);

    res.json({
      sucursal: { id: sucursal.id, nombre: sucursal.nombre },
      vendedores,
      documentos: resDetalle.recordset,
      totales: {
        venta_sin_dcto: totVentaSD,
        costo_neto: totCosto,
        utilidad_sin_dcto: totUtilidadSD,
        margen_sin_dcto: totVentaSD > 0 ? (totUtilidadSD / totVentaSD) * 100 : 0,
        venta_con_dcto: totVentaCD,
        utilidad_con_dcto: totUtilidadCD,
        margen_con_dcto: totVentaCD > 0 ? (totUtilidadCD / totVentaCD) * 100 : 0
      },
      tiempo_ms: ms
    });
  } catch (error) {
    console.error('Error en getMargenes:', error);
    res.status(500).json({ message: 'Error al consultar margenes', error: error.message });
  }
};
