// backend/controllers/stocksController.js - Stocks (migrado de Stocks.vb)
const { sql, poolPromise } = require('../config/db');

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

// GET /api/stocks/datos?sucursalId=18&tipo=sobre_stock|bajo_minimo|bajo_critico|todo
exports.getStocks = async (req, res) => {
  try {
    const { sucursalId, tipo } = req.query;
    if (!sucursalId || !tipo) return res.status(400).json({ message: 'Se requiere sucursalId y tipo' });

    const sucursal = await obtenerSucursal(parseInt(sucursalId));
    if (!sucursal) return res.status(404).json({ message: 'Sucursal no encontrada' });

    let poolSuc;
    try { poolSuc = await getPoolSucursal(sucursal); }
    catch (err) { return res.status(503).json({ message: `No se pudo conectar a ${sucursal.nombre}`, error: err.message }); }

    const t0 = Date.now();

    let whereCondition;
    let orderBy;
    switch (tipo) {
      case 'sobre_stock':
        whereCondition = 'BMS_EXISTENCIAS > BMS_STOCK_MAXIMO AND BMS_STOCK_MAXIMO > 0 AND BMS_STOCK_MAXIMO IS NOT NULL';
        orderBy = 'BMS_STOCK_MAXIMO ASC';
        break;
      case 'bajo_minimo':
        whereCondition = 'BMS_EXISTENCIAS < BMS_STOCK_MINIMO AND BMS_EXISTENCIAS > BMS_STOCK_CRITICO AND BMS_STOCK_MAXIMO > 0 AND BMS_STOCK_MAXIMO IS NOT NULL';
        orderBy = 'BMS_STOCK_MINIMO ASC';
        break;
      case 'bajo_critico':
        whereCondition = 'BMS_EXISTENCIAS < BMS_STOCK_CRITICO AND BMS_STOCK_MAXIMO > 0 AND BMS_STOCK_MAXIMO IS NOT NULL';
        orderBy = 'BMS_STOCK_CRITICO ASC';
        break;
      case 'todo':
        whereCondition = '1=1';
        orderBy = 'mp.MP_DESCRIPCION_PRODUCTO ASC';
        break;
      default:
        return res.status(400).json({ message: 'Tipo invalido. Use: sobre_stock, bajo_minimo, bajo_critico, todo' });
    }

    const query = `
      SELECT mp.MP_CODIGO_PRODUCTO AS codigo,
             mp.MP_DESCRIPCION_PRODUCTO AS descripcion,
             mp.MP_MEDIDA AS familia,
             BMS_EXISTENCIAS AS existencia,
             BMS_STOCK_MAXIMO AS stock_maximo,
             BMS_STOCK_MINIMO AS stock_minimo,
             BMS_STOCK_CRITICO AS stock_critico
      FROM ERP_BOD_MERCADERIA_STOCK bms
      JOIN ERP_MAESTRO_PRODUCTOS mp ON mp.MP_CODIGO_PRODUCTO = bms.MP_CODIGO_PRODUCTO
      WHERE mp.TPROV_ID_TIPO_PROVEEDOR = 3 AND mp.EP_ID_ESTADO = 2
        AND ${whereCondition}
      ORDER BY ${orderBy}
    `;

    const result = await poolSuc.request().query(query);

    const ms = Date.now() - t0;
    console.log(`[Stocks] ${sucursal.nombre} (${tipo}): ${result.recordset.length} productos en ${ms}ms`);

    res.json({
      productos: result.recordset,
      cantidad: result.recordset.length,
      sucursal: { id: sucursal.id, nombre: sucursal.nombre },
      tipo,
      tiempo_ms: ms
    });
  } catch (error) {
    console.error('Error en getStocks:', error);
    res.status(500).json({ message: 'Error al consultar stocks', error: error.message });
  }
};
