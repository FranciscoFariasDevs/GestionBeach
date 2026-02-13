// backend/controllers/anulacionesController.js
const { sql, poolPromise } = require('../config/db');

// Pool cache (mismo patrón que guiasController)
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
    options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true, requestTimeout: 60000, connectTimeout: 15000 },
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

// GET /api/anulaciones/sucursales
exports.getSucursales = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(
      "SELECT id, nombre, tipo_sucursal FROM sucursales WHERE ip IS NOT NULL AND ip != '' ORDER BY nombre"
    );
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener sucursales', error: error.message });
  }
};

// GET /api/anulaciones/datos?sucursalId=X&fechaDesde=YYYY-MM-DD&fechaHasta=YYYY-MM-DD
exports.getAnulaciones = async (req, res) => {
  try {
    const sucursalId = parseInt(req.query.sucursalId);
    const fechaDesde = req.query.fechaDesde;
    const fechaHasta = req.query.fechaHasta;
    if (!sucursalId || !fechaDesde || !fechaHasta) {
      return res.status(400).json({ message: 'Se requiere sucursalId, fechaDesde y fechaHasta' });
    }

    const sucursal = await obtenerSucursal(sucursalId);
    if (!sucursal) return res.status(404).json({ message: 'Sucursal no encontrada' });

    let poolSuc;
    try { poolSuc = await getPoolSucursal(sucursal); }
    catch (err) { return res.status(503).json({ message: `No se pudo conectar a ${sucursal.nombre}`, error: err.message }); }

    const t0 = Date.now();

    const query = `
      SELECT DISTINCT
        RES.ROC_NUMERO_ORDEN AS NumVenta,
        MPE.MPE_NOMBRE_COMPLETO + ' ' + MPE.MPE_APELLIDO_PATERNO AS Responsable,
        RES.ROC_NETO AS Neto,
        RES.ROC_IVA AS Iva,
        RES.ROC_TOTAL AS Total,
        RES.ROC_FECHA_INGRESO AS FechaIngreso
      FROM ERP_OP_RES_ORDEN_COMPRA RES
      JOIN ERP_USUARIOS_SISTEMAS US ON US.US_ID_USUARIO_SISTEMA = RES.US_ID_USUARIO_SISTEMA
      JOIN ERP_MAESTRO_PERSONAS MPE ON MPE.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
      WHERE RES.EO_ID_ESTADO_ORDEN = '1'
        AND MPE.MPR_RUT_PROVEEDOR IS NOT NULL
        AND RES.ROC_FECHA_INGRESO BETWEEN @fechaDesde AND @fechaHasta
      ORDER BY RES.ROC_FECHA_INGRESO ASC
    `;

    const result = await poolSuc.request()
      .input('fechaDesde', sql.DateTime, fechaDesde + ' 00:00:00')
      .input('fechaHasta', sql.DateTime, fechaHasta + ' 23:59:59')
      .query(query);

    const totalNeto = result.recordset.reduce((s, r) => s + (r.Neto || 0), 0);
    const totalMonto = result.recordset.reduce((s, r) => s + (r.Total || 0), 0);

    console.log(`[Anulaciones] ${sucursal.nombre}: ${result.recordset.length} anulaciones en ${Date.now() - t0}ms`);

    res.json({
      anulaciones: result.recordset,
      total_registros: result.recordset.length,
      total_neto: totalNeto,
      total_monto: totalMonto,
      sucursal: sucursal.nombre,
      tiempo_ms: Date.now() - t0
    });
  } catch (error) {
    console.error('Error en getAnulaciones:', error);
    res.status(500).json({ message: 'Error al consultar anulaciones', error: error.message });
  }
};

// GET /api/anulaciones/detalle?sucursalId=X&numVenta=Y
exports.getDetalleAnulacion = async (req, res) => {
  try {
    const sucursalId = parseInt(req.query.sucursalId);
    const numVenta = req.query.numVenta;
    if (!sucursalId || !numVenta) {
      return res.status(400).json({ message: 'Se requiere sucursalId y numVenta' });
    }

    const sucursal = await obtenerSucursal(sucursalId);
    if (!sucursal) return res.status(404).json({ message: 'Sucursal no encontrada' });

    let poolSuc;
    try { poolSuc = await getPoolSucursal(sucursal); }
    catch (err) { return res.status(503).json({ message: `No se pudo conectar a ${sucursal.nombre}`, error: err.message }); }

    const query = `
      SELECT
        MP_CODIGO_PRODUCTO AS Codigo,
        DOC_DESCRIPCION_PRODUCTO AS Descripcion,
        DOC_CANTIDAD AS Cantidad,
        ROUND(MP_MARGEN_COMERCIALIZACION, 2) AS Margen,
        ROUND(MP_MARGEN_VENTA, 2) AS MargenAplicado,
        DOC_TOTAL AS Total
      FROM ERP_OP_DET_ORDEN_COMPRA
      WHERE ROC_NUMERO_ORDEN = @numVenta
    `;

    const result = await poolSuc.request()
      .input('numVenta', sql.VarChar, numVenta)
      .query(query);

    res.json({ productos: result.recordset });
  } catch (error) {
    console.error('Error en getDetalleAnulacion:', error);
    res.status(500).json({ message: 'Error al consultar detalle', error: error.message });
  }
};
