// backend/controllers/cargarInventarioController.js - Migrado de Cargar_Inventario.vb
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

// GET /api/cargar-inventario/sucursales
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

// GET /api/cargar-inventario/stock?sucursalId=X
exports.getStockSistema = async (req, res) => {
  try {
    const sucursalId = parseInt(req.query.sucursalId);
    if (!sucursalId) return res.status(400).json({ message: 'Se requiere sucursalId' });

    const sucursal = await obtenerSucursal(sucursalId);
    if (!sucursal) return res.status(404).json({ message: 'Sucursal no encontrada' });

    let poolSuc;
    try { poolSuc = await getPoolSucursal(sucursal); }
    catch (err) { return res.status(503).json({ message: `No se pudo conectar a ${sucursal.nombre}`, error: err.message }); }

    const t0 = Date.now();

    const query = `
      SELECT
        MP.MP_CODIGO_PRODUCTO AS Codigo,
        MP.MP_DESCRIPCION_PRODUCTO AS Descripcion,
        ISNULL(BMS.BMS_EXISTENCIAS, 0) AS Stock
      FROM ERP_MAESTRO_PRODUCTOS MP
      FULL JOIN ERP_BOD_MERCADERIA_STOCK BMS
        ON BMS.MP_CODIGO_PRODUCTO = MP.MP_CODIGO_PRODUCTO
      WHERE MP.TPROV_ID_TIPO_PROVEEDOR = 3
        AND EP_ID_ESTADO = 2
        AND MP.MP_CODIGO_PRODUCTO <> 'CODIGO_GENERICO'
      ORDER BY MP.MP_DESCRIPCION_PRODUCTO ASC
    `;

    const result = await poolSuc.request().query(query);

    console.log(`[Cargar Inventario] ${sucursal.nombre}: ${result.recordset.length} productos en ${Date.now() - t0}ms`);

    res.json({
      productos: result.recordset,
      total: result.recordset.length,
      sucursal: sucursal.nombre,
      tiempo_ms: Date.now() - t0
    });
  } catch (error) {
    console.error('Error en getStockSistema:', error);
    res.status(500).json({ message: 'Error al consultar stock', error: error.message });
  }
};

// POST /api/cargar-inventario/comparar
exports.compararInventario = async (req, res) => {
  try {
    const { sucursalId, excelData } = req.body;
    if (!sucursalId || !excelData || !Array.isArray(excelData)) {
      return res.status(400).json({ message: 'Se requiere sucursalId y excelData (array)' });
    }

    const sucursal = await obtenerSucursal(parseInt(sucursalId));
    if (!sucursal) return res.status(404).json({ message: 'Sucursal no encontrada' });

    let poolSuc;
    try { poolSuc = await getPoolSucursal(sucursal); }
    catch (err) { return res.status(503).json({ message: `No se pudo conectar a ${sucursal.nombre}`, error: err.message }); }

    const t0 = Date.now();

    const query = `
      SELECT
        MP.MP_CODIGO_PRODUCTO AS Codigo,
        MP.MP_DESCRIPCION_PRODUCTO AS Descripcion,
        ISNULL(BMS.BMS_EXISTENCIAS, 0) AS Stock
      FROM ERP_MAESTRO_PRODUCTOS MP
      FULL JOIN ERP_BOD_MERCADERIA_STOCK BMS
        ON BMS.MP_CODIGO_PRODUCTO = MP.MP_CODIGO_PRODUCTO
      WHERE MP.TPROV_ID_TIPO_PROVEEDOR = 3
        AND EP_ID_ESTADO = 2
        AND MP.MP_CODIGO_PRODUCTO <> 'CODIGO_GENERICO'
      ORDER BY MP.MP_DESCRIPCION_PRODUCTO ASC
    `;

    const result = await poolSuc.request().query(query);
    const productosBD = result.recordset;

    // Crear diccionario del Excel
    const dicExcel = {};
    excelData.forEach(row => {
      const codigo = String(row.Codigo || '').trim();
      if (codigo && !dicExcel[codigo]) {
        dicExcel[codigo] = parseFloat(row.Fisico) || 0;
      }
    });

    // Comparar
    const comparados = [];
    const noEncontrados = [];

    productosBD.forEach(prod => {
      const codigo = String(prod.Codigo).trim();
      if (dicExcel.hasOwnProperty(codigo)) {
        const fisico = dicExcel[codigo];
        const diferencia = fisico - (prod.Stock || 0);
        comparados.push({
          Codigo: codigo,
          Descripcion: prod.Descripcion,
          StockSistema: prod.Stock || 0,
          StockFisico: fisico,
          Diferencia: diferencia
        });
      } else {
        noEncontrados.push({
          Codigo: codigo,
          Descripcion: prod.Descripcion,
          StockSistema: prod.Stock || 0
        });
      }
    });

    // Productos en Excel que no están en BD
    const soloEnExcel = [];
    const codigosBD = new Set(productosBD.map(p => String(p.Codigo).trim()));
    excelData.forEach(row => {
      const codigo = String(row.Codigo || '').trim();
      if (codigo && !codigosBD.has(codigo)) {
        soloEnExcel.push({ Codigo: codigo, StockFisico: parseFloat(row.Fisico) || 0 });
      }
    });

    const ms = Date.now() - t0;
    console.log(`[Cargar Inventario] Comparacion ${sucursal.nombre}: ${comparados.length} coinciden, ${noEncontrados.length} no en excel, ${soloEnExcel.length} solo en excel. ${ms}ms`);

    res.json({
      comparados,
      noEncontrados,
      soloEnExcel,
      resumen: {
        totalBD: productosBD.length,
        totalExcel: excelData.length,
        coincidencias: comparados.length,
        noEnExcel: noEncontrados.length,
        soloEnExcel: soloEnExcel.length,
        conDiferencia: comparados.filter(c => c.Diferencia !== 0).length
      },
      sucursal: sucursal.nombre,
      tiempo_ms: ms
    });
  } catch (error) {
    console.error('Error en compararInventario:', error);
    res.status(500).json({ message: 'Error al comparar inventario', error: error.message });
  }
};
