// backend/controllers/proveedoresController.js
// Migración de Proveedores.vb — Dirección de Producto por Proveedor
const { sql, poolPromise } = require('../config/db');

// Pool cache por sucursal
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
    options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true, requestTimeout: 120000, connectTimeout: 15000 },
    pool: { max: 5, min: 0, idleTimeoutMillis: 60000 }
  };
  const pool = await Promise.race([
    new sql.ConnectionPool(config).connect(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de conexion')), 15000))
  ]);
  poolCache.set(sucursal.id, { pool, lastUsed: Date.now() });
  return pool;
};

setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of poolCache) {
    if (now - entry.lastUsed > 5 * 60 * 1000) {
      try { entry.pool.close(); } catch {}
      poolCache.delete(id);
    }
  }
}, 5 * 60 * 1000);

const obtenerSucursal = async (sucursalId) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', sql.Int, sucursalId)
    .query('SELECT id, nombre, ip, base_datos, usuario, contrasena, tipo_sucursal, puerto FROM sucursales WHERE id = @id');
  return result.recordset[0] || null;
};

// GET /api/proveedores/sucursales
exports.getSucursales = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(
      `SELECT id, nombre, tipo_sucursal FROM sucursales
       WHERE ip IS NOT NULL AND ip != ''
         AND nombre NOT LIKE '%Daniel vera 1440%'
         AND nombre NOT LIKE '%890-891%'
         AND nombre NOT LIKE '%Enrique molina 596%'
         AND nombre NOT LIKE '%Lord cochrane%'
         AND nombre NOT LIKE '%Tres esquinas coelemu%'
         AND nombre NOT LIKE '%Los cipreses 77%'
       ORDER BY nombre`
    );
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener sucursales', error: error.message });
  }
};

// Resumen SQL (igual que ObtenerResumenVendedores del VB)
const RESUMEN_SQL = `
  SELECT
    CONVERT(NVARCHAR(20), MPR_RUT_PROVEEDOR) + '-' + CONVERT(NVARCHAR(5), MPR_DIGITO) AS Rut,
    NombreProveedor AS Proveedor,
    SUM(CAST(DBOL_TOTAL / 1.19 AS DECIMAL(18,0))) AS Neto,
    SUM(CAST(DBOL_TOTAL - (DBOL_TOTAL / 1.19) AS DECIMAL(18,0))) AS Iva,
    SUM(CAST(DBOL_TOTAL AS DECIMAL(18,0))) AS Total,
    COUNT(DISTINCT NumInterno) AS CantDocumentos
  FROM (
    /* BOLETAS */
    SELECT
      PP.NumInterno,
      PP.MP_CODIGO_PRODUCTO,
      PP.DBOL_TOTAL,
      CONVERT(NVARCHAR(20), MP.MPR_RUT_PROVEEDOR) AS MPR_RUT_PROVEEDOR,
      MP.MPR_DIGITO,
      MP.MPR_RAZON_SOCIAL AS NombreProveedor,
      ROW_NUMBER() OVER (PARTITION BY PP.NumInterno, PP.MP_CODIGO_PRODUCTO, MP.MPR_RUT_PROVEEDOR
        ORDER BY MP.TPROV_ID_TIPO_PROVEEDOR DESC) AS RN_TIPO
    FROM (
      SELECT *,
        ROW_NUMBER() OVER (PARTITION BY NumInterno, MP_CODIGO_PRODUCTO ORDER BY CantProv DESC) AS RN
      FROM (
        SELECT rbo.RBO_NUM_INTERNO_BO AS NumInterno,
          DBO.MP_CODIGO_PRODUCTO, DBO.DBOL_TOTAL,
          BRI.MPR_RUT_PROVEEDOR, COUNT(*) AS CantProv
        FROM ERP_BOD_RES_INGRESO_GUIAS BRI
        JOIN ERP_BOD_TARJETA_EXISTENCIAS DTE ON DTE.BIGP_FOLIO_INGRESO_PROVEEDOR = BRI.BIGP_FOLIO_INGRESO_PROVEEDOR
        JOIN ERP_FACT_DET_BOLETAS DBO ON DBO.MP_CODIGO_PRODUCTO = DTE.MP_CODIGO_PRODUCTO
        JOIN ERP_FACT_RES_BOLETAS rbo ON rbo.RBO_NUM_INTERNO_BO = DBO.RBO_NUM_INTERNO_BO
        WHERE rbo.RBO_FECHA_INGRESO BETWEEN @fechaDesde AND @fechaHasta
        GROUP BY rbo.RBO_NUM_INTERNO_BO, DBO.MP_CODIGO_PRODUCTO, DBO.DBOL_TOTAL, BRI.MPR_RUT_PROVEEDOR
      ) C
    ) PP
    JOIN ERP_MAESTRO_PROVEEDORES MP ON MP.MPR_RUT_PROVEEDOR = PP.MPR_RUT_PROVEEDOR
    WHERE PP.RN = 1 AND MP.TPROV_ID_TIPO_PROVEEDOR IN (1,2)

    UNION ALL

    /* FACTURAS CLIENTES */
    SELECT
      PP.NumInterno,
      PP.MP_CODIGO_PRODUCTO,
      PP.DFC_TOTAL AS DBOL_TOTAL,
      CONVERT(NVARCHAR(20), MP.MPR_RUT_PROVEEDOR) AS MPR_RUT_PROVEEDOR,
      MP.MPR_DIGITO,
      MP.MPR_RAZON_SOCIAL AS NombreProveedor,
      ROW_NUMBER() OVER (PARTITION BY PP.NumInterno, PP.MP_CODIGO_PRODUCTO, MP.MPR_RUT_PROVEEDOR
        ORDER BY MP.TPROV_ID_TIPO_PROVEEDOR DESC) AS RN_TIPO
    FROM (
      SELECT *,
        ROW_NUMBER() OVER (PARTITION BY NumInterno, MP_CODIGO_PRODUCTO ORDER BY CantProv DESC) AS RN
      FROM (
        SELECT rfc.RFC_NUM_INTERNO_FA_CLI AS NumInterno,
          DBO.MP_CODIGO_PRODUCTO, CONVERT(DECIMAL(18,0), DBO.DFC_TOTAL * 1.19) AS DFC_TOTAL,
          BRI.MPR_RUT_PROVEEDOR, COUNT(*) AS CantProv
        FROM ERP_BOD_RES_INGRESO_GUIAS BRI
        JOIN ERP_BOD_TARJETA_EXISTENCIAS DTE ON DTE.BIGP_FOLIO_INGRESO_PROVEEDOR = BRI.BIGP_FOLIO_INGRESO_PROVEEDOR
        JOIN ERP_FACT_DET_FACTURA_CLIENTES DBO ON DBO.MP_CODIGO_PRODUCTO = DTE.MP_CODIGO_PRODUCTO
        JOIN ERP_FACT_RES_FACTURA_CLIENTES rfc ON rfc.RFC_NUM_INTERNO_FA_CLI = DBO.RFC_NUM_INTERNO_FA_CLI
        WHERE rfc.RFC_FECHA_INGRESO BETWEEN @fechaDesde AND @fechaHasta
        GROUP BY rfc.RFC_NUM_INTERNO_FA_CLI, DBO.MP_CODIGO_PRODUCTO, DBO.DFC_TOTAL, BRI.MPR_RUT_PROVEEDOR
      ) C
    ) PP
    JOIN ERP_MAESTRO_PROVEEDORES MP ON MP.MPR_RUT_PROVEEDOR = PP.MPR_RUT_PROVEEDOR
    WHERE PP.RN = 1 AND MP.TPROV_ID_TIPO_PROVEEDOR IN (1,2)
  ) T
  WHERE RN_TIPO = 1
  GROUP BY MPR_RUT_PROVEEDOR, MPR_DIGITO, NombreProveedor
  ORDER BY Total DESC
`;

// GET /api/proveedores/datos
exports.getProveedores = async (req, res) => {
  try {
    const { sucursalId, fechaDesde, fechaHasta } = req.query;
    if (!sucursalId || !fechaDesde || !fechaHasta)
      return res.status(400).json({ message: 'Se requiere sucursalId, fechaDesde y fechaHasta' });

    const sucursal = await obtenerSucursal(parseInt(sucursalId));
    if (!sucursal) return res.status(404).json({ message: 'Sucursal no encontrada' });

    let poolSuc;
    try { poolSuc = await getPoolSucursal(sucursal); }
    catch (err) { return res.status(503).json({ message: `No se pudo conectar a ${sucursal.nombre}`, error: err.message }); }

    const t0 = Date.now();
    const result = await poolSuc.request()
      .input('fechaDesde', sql.DateTime, fechaDesde + ' 00:00:01')
      .input('fechaHasta', sql.DateTime, fechaHasta + ' 23:59:59')
      .query(RESUMEN_SQL);

    const proveedores = result.recordset;
    const totalGeneral = proveedores.reduce((s, r) => s + (r.Total || 0), 0);
    const withPct = proveedores.map(r => ({
      ...r,
      Participacion: totalGeneral > 0 ? ((r.Total / totalGeneral) * 100).toFixed(2) : '0.00'
    }));

    console.log(`[Proveedores] ${sucursal.nombre}: ${proveedores.length} proveedores en ${Date.now() - t0}ms`);
    res.json({
      proveedores: withPct,
      total_registros: withPct.length,
      total_neto: withPct.reduce((s, r) => s + (r.Neto || 0), 0),
      total_iva: withPct.reduce((s, r) => s + (r.Iva || 0), 0),
      total_monto: totalGeneral,
      sucursal: sucursal.nombre,
      tiempo_ms: Date.now() - t0
    });
  } catch (error) {
    console.error('Error en getProveedores:', error);
    res.status(500).json({ message: 'Error al consultar proveedores', error: error.message });
  }
};

// GET /api/proveedores/detalle — documentos de venta para un proveedor específico
exports.getDetalleProveedor = async (req, res) => {
  try {
    const { sucursalId, fechaDesde, fechaHasta, rut } = req.query;
    if (!sucursalId || !fechaDesde || !fechaHasta || !rut)
      return res.status(400).json({ message: 'Se requiere sucursalId, fechaDesde, fechaHasta y rut' });

    const sucursal = await obtenerSucursal(parseInt(sucursalId));
    if (!sucursal) return res.status(404).json({ message: 'Sucursal no encontrada' });

    let poolSuc;
    try { poolSuc = await getPoolSucursal(sucursal); }
    catch (err) { return res.status(503).json({ message: `No se pudo conectar a ${sucursal.nombre}`, error: err.message }); }

    // Extraer RUT numérico (sin dígito verificador)
    const rutNum = rut.split('-')[0];

    const query = `
      SELECT Doc, Folio, Fecha, Codigo, Descripcion, Cantidad, Neto, Iva, Total FROM (
        /* BOLETAS */
        SELECT 'BO' AS Doc,
          rbo.RBO_NUMERO_BOLETA AS Folio,
          CONVERT(DATE, rbo.RBO_FECHA_INGRESO) AS Fecha,
          DBO.MP_CODIGO_PRODUCTO AS Codigo,
          DBO.DBOL_DESCRIPCION_PRODUCTO AS Descripcion,
          DBO.DBOL_CANTIDAD AS Cantidad,
          CAST(DBO.DBOL_TOTAL / 1.19 AS DECIMAL(18,0)) AS Neto,
          CAST(DBO.DBOL_TOTAL - (DBO.DBOL_TOTAL / 1.19) AS DECIMAL(18,0)) AS Iva,
          CAST(DBO.DBOL_TOTAL AS DECIMAL(18,0)) AS Total,
          CONVERT(NVARCHAR(20), BRI.MPR_RUT_PROVEEDOR) AS RutProv,
          ROW_NUMBER() OVER (PARTITION BY rbo.RBO_NUM_INTERNO_BO, DBO.MP_CODIGO_PRODUCTO ORDER BY CantProv DESC) AS RN
        FROM (
          SELECT rbo2.RBO_NUM_INTERNO_BO, DBO2.MP_CODIGO_PRODUCTO, BRI2.MPR_RUT_PROVEEDOR, COUNT(*) AS CantProv
          FROM ERP_BOD_RES_INGRESO_GUIAS BRI2
          JOIN ERP_BOD_TARJETA_EXISTENCIAS DTE2 ON DTE2.BIGP_FOLIO_INGRESO_PROVEEDOR = BRI2.BIGP_FOLIO_INGRESO_PROVEEDOR
          JOIN ERP_FACT_DET_BOLETAS DBO2 ON DBO2.MP_CODIGO_PRODUCTO = DTE2.MP_CODIGO_PRODUCTO
          JOIN ERP_FACT_RES_BOLETAS rbo2 ON rbo2.RBO_NUM_INTERNO_BO = DBO2.RBO_NUM_INTERNO_BO
          WHERE rbo2.RBO_FECHA_INGRESO BETWEEN @fechaDesde AND @fechaHasta
            AND CONVERT(NVARCHAR(20), BRI2.MPR_RUT_PROVEEDOR) = @rut
          GROUP BY rbo2.RBO_NUM_INTERNO_BO, DBO2.MP_CODIGO_PRODUCTO, BRI2.MPR_RUT_PROVEEDOR
        ) C
        JOIN ERP_FACT_DET_BOLETAS DBO ON DBO.MP_CODIGO_PRODUCTO = C.MP_CODIGO_PRODUCTO
        JOIN ERP_FACT_RES_BOLETAS rbo ON rbo.RBO_NUM_INTERNO_BO = C.RBO_NUM_INTERNO_BO
        JOIN ERP_BOD_RES_INGRESO_GUIAS BRI ON BRI.MPR_RUT_PROVEEDOR = C.MPR_RUT_PROVEEDOR

        UNION ALL

        /* FACTURAS CLIENTES */
        SELECT 'FA' AS Doc,
          rfc.RFC_NUMERO_FACTURA_CLI AS Folio,
          CONVERT(DATE, rfc.RFC_FECHA_INGRESO) AS Fecha,
          DBO.MP_CODIGO_PRODUCTO AS Codigo,
          DBO.DFC_DESCRIPCION_PRODUCTO AS Descripcion,
          DBO.DFC_CANTIDAD AS Cantidad,
          CAST(DBO.DFC_TOTAL AS DECIMAL(18,0)) AS Neto,
          CAST(DBO.DFC_TOTAL * 0.19 AS DECIMAL(18,0)) AS Iva,
          CAST(DBO.DFC_TOTAL * 1.19 AS DECIMAL(18,0)) AS Total,
          CONVERT(NVARCHAR(20), BRI.MPR_RUT_PROVEEDOR) AS RutProv,
          ROW_NUMBER() OVER (PARTITION BY rfc.RFC_NUM_INTERNO_FA_CLI, DBO.MP_CODIGO_PRODUCTO ORDER BY CantProv DESC) AS RN
        FROM (
          SELECT rfc2.RFC_NUM_INTERNO_FA_CLI, DBO2.MP_CODIGO_PRODUCTO, BRI2.MPR_RUT_PROVEEDOR, COUNT(*) AS CantProv
          FROM ERP_BOD_RES_INGRESO_GUIAS BRI2
          JOIN ERP_BOD_TARJETA_EXISTENCIAS DTE2 ON DTE2.BIGP_FOLIO_INGRESO_PROVEEDOR = BRI2.BIGP_FOLIO_INGRESO_PROVEEDOR
          JOIN ERP_FACT_DET_FACTURA_CLIENTES DBO2 ON DBO2.MP_CODIGO_PRODUCTO = DTE2.MP_CODIGO_PRODUCTO
          JOIN ERP_FACT_RES_FACTURA_CLIENTES rfc2 ON rfc2.RFC_NUM_INTERNO_FA_CLI = DBO2.RFC_NUM_INTERNO_FA_CLI
          WHERE rfc2.RFC_FECHA_INGRESO BETWEEN @fechaDesde AND @fechaHasta
            AND CONVERT(NVARCHAR(20), BRI2.MPR_RUT_PROVEEDOR) = @rut
          GROUP BY rfc2.RFC_NUM_INTERNO_FA_CLI, DBO2.MP_CODIGO_PRODUCTO, BRI2.MPR_RUT_PROVEEDOR
        ) C
        JOIN ERP_FACT_DET_FACTURA_CLIENTES DBO ON DBO.MP_CODIGO_PRODUCTO = C.MP_CODIGO_PRODUCTO
        JOIN ERP_FACT_RES_FACTURA_CLIENTES rfc ON rfc.RFC_NUM_INTERNO_FA_CLI = C.RFC_NUM_INTERNO_FA_CLI
        JOIN ERP_BOD_RES_INGRESO_GUIAS BRI ON BRI.MPR_RUT_PROVEEDOR = C.MPR_RUT_PROVEEDOR
      ) T
      WHERE RN = 1
      ORDER BY Fecha DESC, Folio
    `;

    const result = await poolSuc.request()
      .input('fechaDesde', sql.DateTime, fechaDesde + ' 00:00:01')
      .input('fechaHasta', sql.DateTime, fechaHasta + ' 23:59:59')
      .input('rut', sql.NVarChar, rutNum)
      .query(query);

    res.json({ productos: result.recordset });
  } catch (error) {
    console.error('Error en getDetalleProveedor:', error);
    res.status(500).json({ message: 'Error al consultar detalle', error: error.message });
  }
};
