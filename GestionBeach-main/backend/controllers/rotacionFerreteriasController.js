// backend/controllers/rotacionFerreteriasController.js - Rotación Ferreterías (migrado de Sin Rotacion.vb) - OPTIMIZADO
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
      requestTimeout: 30000,
      connectionTimeout: 10000
    },
    pool: { max: 5, min: 0, idleTimeoutMillis: 60000 }
  };

  const pool = await Promise.race([
    new sql.ConnectionPool(config).connect(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de conexion')), 10000))
  ]);

  poolCache.set(sucursal.id, { pool, lastUsed: Date.now() });
  console.log(`[Rotacion] Pool creado para ${sucursal.nombre} (cache: ${poolCache.size})`);
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

const esMultibodega = (sucursal) => {
  const nombre = (sucursal.nombre || '').toUpperCase();
  return nombre.includes('COELEMU') ||
         nombre.includes('QUIRIHUE') ||
         nombre.includes('MULTITIENDA');
};

// Helper para conectar a sucursal con validacion
const conectarSucursal = async (sucursalId, res) => {
  const sucursal = await obtenerSucursal(sucursalId);
  if (!sucursal) { res.status(404).json({ message: 'Sucursal no encontrada' }); return null; }
  try {
    const pool = await getPoolSucursal(sucursal);
    return { sucursal, pool };
  } catch (err) {
    res.status(503).json({ message: `No se pudo conectar a ${sucursal.nombre}`, error: err.message });
    return null;
  }
};

// ============ ENDPOINTS ============

// GET /api/rotacion-ferreterias/sucursales
exports.getSucursales = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`
        SELECT id, nombre, tipo_sucursal
        FROM sucursales
        WHERE tipo_sucursal IN ('FERRETERIA', 'MULTITIENDA')
          AND ip IS NOT NULL AND ip <> ''
        ORDER BY nombre
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error en getSucursales:', error);
    res.status(500).json({ message: 'Error al obtener sucursales', error: error.message });
  }
};

// GET /api/rotacion-ferreterias/productos-sin-rotacion
// OPTIMIZADO: NOT IN → NOT EXISTS (evita escaneo completo de tablas de ventas)
exports.getProductosSinRotacion = async (req, res) => {
  try {
    const sucursalId = parseInt(req.query.sucursalId);
    const fechaDesde = req.query.fechaDesde;
    const fechaHasta = req.query.fechaHasta;

    if (!sucursalId || !fechaDesde || !fechaHasta) {
      return res.status(400).json({ message: 'Se requiere sucursalId, fechaDesde y fechaHasta' });
    }

    const conn = await conectarSucursal(sucursalId, res);
    if (!conn) return;
    const { sucursal, pool: poolSucursal } = conn;

    const multibodega = esMultibodega(sucursal);
    const tablaStock = multibodega ? 'ERP_BOD_MERCADERIA_STOCK_MULTIBODEGA' : 'ERP_BOD_MERCADERIA_STOCK';
    const campoStock = multibodega ? 'BMS.MBS_EXISTENCIAS' : 'BMS.BMS_EXISTENCIAS';

    const t0 = Date.now();

    // OPTIMIZADO: usar NOT EXISTS en vez de NOT IN (mucho mas rapido)
    const query = `
      SELECT Codigo, Descripcion, Familia, Stock,
        ROUND(MP_MARGEN_COMERCIALIZACION, 2) AS margen,
        CONVERT(NUMERIC, [Costo Final Saf]) AS costo_final_saf,
        CONVERT(NUMERIC, ([Costo Final Saf] * Stock)) AS valorizado,
        MAX([Ultima Venta]) AS ultima_venta
      FROM (
        SELECT I.MP_CODIGO_PRODUCTO AS Codigo,
          I.MP_DESCRIPCION_PRODUCTO AS Descripcion,
          I.MP_MEDIDA AS Familia,
          ${campoStock} AS Stock,
          I.MP_COSTO_FINAL AS [Costo Final Saf],
          I.MP_MARGEN_COMERCIALIZACION,
          MAX(rbo.RBO_FECHA_INGRESO) AS [Ultima Venta]
        FROM ERP_MAESTRO_PRODUCTOS AS I
        JOIN ERP_FACT_DET_BOLETAS dbo ON dbo.MP_CODIGO_PRODUCTO = I.MP_CODIGO_PRODUCTO
        JOIN ERP_FACT_RES_BOLETAS rbo ON rbo.RBO_NUM_INTERNO_BO = dbo.RBO_NUM_INTERNO_BO
        JOIN ${tablaStock} BMS ON BMS.MP_CODIGO_PRODUCTO = I.MP_CODIGO_PRODUCTO
        WHERE I.TPROV_ID_TIPO_PROVEEDOR = 3 AND I.EP_ID_ESTADO = 2
        GROUP BY I.MP_CODIGO_PRODUCTO, I.MP_DESCRIPCION_PRODUCTO, ${campoStock}, I.MP_COSTO_FINAL, I.MP_MEDIDA, I.MP_MARGEN_COMERCIALIZACION
        UNION ALL
        SELECT I.MP_CODIGO_PRODUCTO AS Codigo,
          I.MP_DESCRIPCION_PRODUCTO AS Descripcion,
          I.MP_MEDIDA AS Familia,
          ${campoStock} AS Stock,
          I.MP_COSTO_FINAL AS [Costo Final Saf],
          I.MP_MARGEN_COMERCIALIZACION,
          MAX(rbo.RFC_FECHA_INGRESO) AS [Ultima Venta]
        FROM ERP_MAESTRO_PRODUCTOS AS I
        JOIN ERP_FACT_DET_FACTURA_CLIENTES dbo ON dbo.MP_CODIGO_PRODUCTO = I.MP_CODIGO_PRODUCTO
        JOIN ERP_FACT_RES_FACTURA_CLIENTES rbo ON rbo.RFC_NUM_INTERNO_FA_CLI = dbo.RFC_NUM_INTERNO_FA_CLI
        JOIN ${tablaStock} BMS ON BMS.MP_CODIGO_PRODUCTO = I.MP_CODIGO_PRODUCTO
        WHERE I.TPROV_ID_TIPO_PROVEEDOR = 3 AND I.EP_ID_ESTADO = 2
        GROUP BY I.MP_CODIGO_PRODUCTO, I.MP_DESCRIPCION_PRODUCTO, ${campoStock}, I.MP_COSTO_FINAL, I.MP_MEDIDA, I.MP_MARGEN_COMERCIALIZACION
      ) t
      WHERE Codigo <> 'CODIGO_GENERICO'
        AND NOT EXISTS (
          SELECT 1 FROM ERP_FACT_RES_BOLETAS M
          JOIN ERP_FACT_DET_BOLETAS D ON M.RBO_NUM_INTERNO_BO = D.RBO_NUM_INTERNO_BO
          WHERE D.MP_CODIGO_PRODUCTO = t.Codigo
            AND M.TPROV_ID_TIPO_PROVEEDOR = 3
            AND M.RBO_FECHA_INGRESO BETWEEN @fechaDesde AND @fechaHasta
        )
        AND NOT EXISTS (
          SELECT 1 FROM ERP_FACT_RES_FACTURA_CLIENTES M
          JOIN ERP_FACT_DET_FACTURA_CLIENTES D ON M.RFC_NUM_INTERNO_FA_CLI = D.RFC_NUM_INTERNO_FA_CLI
          WHERE D.MP_CODIGO_PRODUCTO = t.Codigo
            AND M.TPROV_ID_TIPO_PROVEEDOR = 3
            AND M.RFC_FECHA_INGRESO BETWEEN @fechaDesde AND @fechaHasta
        )
      GROUP BY Codigo, Descripcion, Stock, [Costo Final Saf], Familia, MP_MARGEN_COMERCIALIZACION
      ORDER BY Descripcion ASC
    `;

    const result = await poolSucursal.request()
      .input('fechaDesde', sql.VarChar, fechaDesde)
      .input('fechaHasta', sql.VarChar, fechaHasta)
      .query(query);

    const productos = result.recordset;
    const totalValorizado = productos.reduce((sum, p) => sum + (p.valorizado || 0), 0);

    const ms = Date.now() - t0;
    console.log(`[Rotacion] Productos sin rotacion - ${sucursal.nombre}: ${productos.length} productos en ${ms}ms`);

    res.json({
      sucursal: { id: sucursal.id, nombre: sucursal.nombre },
      total_productos: productos.length,
      total_valorizado: totalValorizado,
      productos,
      tiempo_ms: ms
    });
  } catch (error) {
    console.error('Error en getProductosSinRotacion:', error);
    res.status(500).json({ message: 'Error al consultar productos sin rotacion', error: error.message });
  }
};

// GET /api/rotacion-ferreterias/clientes-sin-compra
// OPTIMIZADO: NOT IN → LEFT JOIN IS NULL
exports.getClientesSinCompra = async (req, res) => {
  try {
    const sucursalId = parseInt(req.query.sucursalId);
    const fechaDesde = req.query.fechaDesde;
    const fechaHasta = req.query.fechaHasta;

    if (!sucursalId || !fechaDesde || !fechaHasta) {
      return res.status(400).json({ message: 'Se requiere sucursalId, fechaDesde y fechaHasta' });
    }

    const conn = await conectarSucursal(sucursalId, res);
    if (!conn) return;
    const { sucursal, pool: poolSucursal } = conn;

    const t0 = Date.now();

    // OPTIMIZADO: LEFT JOIN IS NULL en vez de NOT IN
    const query = `
      SELECT
        CAST(mc.MC_RUT_CLIENTE AS NVARCHAR) + '-' + CAST(mc.MC_DIGITO AS NVARCHAR) AS rut,
        mc.MC_RAZON_SOCIAL AS razon_social,
        MAX(tsc.TSC_NUMERO_TELEFONO) AS telefono,
        mc.MC_EMAIL AS correo,
        MAX(rbo.RFC_FECHA_INGRESO) AS ultima_venta
      FROM ERP_FACT_RES_FACTURA_CLIENTES rbo
      JOIN ERP_MAESTRO_CLIENTES mc ON mc.MC_RUT_CLIENTE = rbo.MC_RUT_CLIENTE
      JOIN ERP_SUCURSALES_CLIENTES sc ON sc.MC_RUT_CLIENTE = mc.MC_RUT_CLIENTE
      JOIN ERP_TELEFONOS_SUCURSAL_CLIENTE tsc ON tsc.SCLI_ID_SUCURSAL_CLIENTE = sc.SCLI_ID_SUCURSAL_CLIENTE
      LEFT JOIN ERP_FACT_RES_FACTURA_CLIENTES reciente
        ON reciente.MC_RUT_CLIENTE = mc.MC_RUT_CLIENTE
        AND reciente.TPROV_ID_TIPO_PROVEEDOR = 3
        AND reciente.RFC_FECHA_INGRESO BETWEEN @fechaDesde AND @fechaHasta
      WHERE rbo.TPROV_ID_TIPO_PROVEEDOR = 3
        AND reciente.MC_RUT_CLIENTE IS NULL
        AND YEAR(rbo.RFC_FECHA_INGRESO) > 2021
      GROUP BY mc.MC_RAZON_SOCIAL, mc.MC_RUT_CLIENTE, mc.MC_DIGITO, mc.MC_EMAIL
      ORDER BY mc.MC_RAZON_SOCIAL ASC
    `;

    const result = await poolSucursal.request()
      .input('fechaDesde', sql.VarChar, fechaDesde)
      .input('fechaHasta', sql.VarChar, fechaHasta)
      .query(query);

    const ms = Date.now() - t0;
    console.log(`[Rotacion] Clientes sin compra - ${sucursal.nombre}: ${result.recordset.length} clientes en ${ms}ms`);

    res.json({
      sucursal: { id: sucursal.id, nombre: sucursal.nombre },
      total_clientes: result.recordset.length,
      clientes: result.recordset,
      tiempo_ms: ms
    });
  } catch (error) {
    console.error('Error en getClientesSinCompra:', error);
    res.status(500).json({ message: 'Error al consultar clientes sin compra', error: error.message });
  }
};

// GET /api/rotacion-ferreterias/compras-sin-rotacion
exports.getComprasSinRotacion = async (req, res) => {
  try {
    const sucursalId = parseInt(req.query.sucursalId);
    const fechaDesde = req.query.fechaDesde;
    const fechaHasta = req.query.fechaHasta;

    if (!sucursalId || !fechaDesde || !fechaHasta) {
      return res.status(400).json({ message: 'Se requiere sucursalId, fechaDesde y fechaHasta' });
    }

    const conn = await conectarSucursal(sucursalId, res);
    if (!conn) return;
    const { sucursal, pool: poolSucursal } = conn;

    const multibodega = esMultibodega(sucursal);
    const tablaStock = multibodega ? 'ERP_BOD_MERCADERIA_STOCK_MULTIBODEGA' : 'ERP_BOD_MERCADERIA_STOCK';
    const campoStock = multibodega ? 'BMS.MBS_EXISTENCIAS' : 'BMS.BMS_EXISTENCIAS';

    const t0 = Date.now();

    const query = `
      WITH LastIngresos AS (
        SELECT
          res.ROC_NUMERO_ORDEN,
          det.MP_CODIGO_PRODUCTO,
          det.BDIGP_DESCRIPCION_PRODUCTO,
          det.BDIGP_CANTIDAD,
          det.BDIGP_TOTAL,
          res.BIGP_FECHA_HORA_RECEPCION_BODEGA,
          ROW_NUMBER() OVER (PARTITION BY det.MP_CODIGO_PRODUCTO ORDER BY res.BIGP_FECHA_HORA_RECEPCION_BODEGA DESC) AS rn
        FROM ERP_BOD_RES_INGRESO_GUIAS res
        JOIN ERP_BOD_DET_INGRESO_GUIAS det ON det.BIGP_FOLIO_INGRESO_PROVEEDOR = res.BIGP_FOLIO_INGRESO_PROVEEDOR
      )
      SELECT
        ROC_NUMERO_ORDEN AS numero_orden,
        LI.MP_CODIGO_PRODUCTO AS codigo,
        BDIGP_DESCRIPCION_PRODUCTO AS descripcion,
        BDIGP_CANTIDAD AS cantidad_ingresada,
        ROUND(mp.MP_MARGEN_COMERCIALIZACION, 2) AS margen,
        BDIGP_TOTAL AS total_ingresado,
        ${campoStock} AS stock_actual,
        BIGP_FECHA_HORA_RECEPCION_BODEGA AS fecha_ingreso
      FROM LastIngresos LI
      JOIN ${tablaStock} BMS ON BMS.MP_CODIGO_PRODUCTO = LI.MP_CODIGO_PRODUCTO
      JOIN ERP_MAESTRO_PRODUCTOS MP ON MP.MP_CODIGO_PRODUCTO = LI.MP_CODIGO_PRODUCTO
      WHERE rn = 1
        AND BIGP_FECHA_HORA_RECEPCION_BODEGA BETWEEN @fechaDesde AND @fechaHasta
        AND MP.MP_MARGEN_COMERCIALIZACION IS NOT NULL
      ORDER BY BIGP_FECHA_HORA_RECEPCION_BODEGA DESC
    `;

    const result = await poolSucursal.request()
      .input('fechaDesde', sql.VarChar, fechaDesde)
      .input('fechaHasta', sql.VarChar, fechaHasta)
      .query(query);

    const totalIngresado = result.recordset.reduce((sum, c) => sum + (c.total_ingresado || 0), 0);

    const ms = Date.now() - t0;
    console.log(`[Rotacion] Compras sin rotacion - ${sucursal.nombre}: ${result.recordset.length} registros en ${ms}ms`);

    res.json({
      sucursal: { id: sucursal.id, nombre: sucursal.nombre },
      total_compras: result.recordset.length,
      total_ingresado: totalIngresado,
      compras: result.recordset,
      tiempo_ms: ms
    });
  } catch (error) {
    console.error('Error en getComprasSinRotacion:', error);
    res.status(500).json({ message: 'Error al consultar compras sin rotacion', error: error.message });
  }
};
