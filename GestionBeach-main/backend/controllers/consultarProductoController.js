// backend/controllers/consultarProductoController.js - Consultar Producto (migrado de sistema viejo VB)
const { sql, poolPromise } = require('../config/db');

// ============ CACHE DE CONEXIONES POR SUCURSAL ============
// Evita crear una conexion nueva en cada request (mejora rendimiento x10)
const poolCache = new Map(); // sucursalId -> { pool, lastUsed, config }

const getPoolSucursal = async (sucursal) => {
  const cached = poolCache.get(sucursal.id);

  // Si existe y sigue conectada, reutilizar
  if (cached && cached.pool && cached.pool.connected) {
    cached.lastUsed = Date.now();
    return cached.pool;
  }

  // Limpiar entrada vieja si existe
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
      requestTimeout: 15000,
      connectionTimeout: 10000
    },
    pool: { max: 5, min: 0, idleTimeoutMillis: 60000 }
  };

  const pool = await Promise.race([
    new sql.ConnectionPool(config).connect(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de conexion')), 10000))
  ]);

  poolCache.set(sucursal.id, { pool, lastUsed: Date.now() });
  console.log(`Pool creado para sucursal ${sucursal.nombre} (cache: ${poolCache.size})`);
  return pool;
};

// Limpiar pools inactivos cada 5 minutos
setInterval(() => {
  const ahora = Date.now();
  for (const [id, entry] of poolCache) {
    if (ahora - entry.lastUsed > 5 * 60 * 1000) {
      try { entry.pool.close(); } catch {}
      poolCache.delete(id);
      console.log(`Pool cerrado por inactividad: sucursal ${id}`);
    }
  }
}, 5 * 60 * 1000);

// ============ HELPERS ============

// Obtener datos de sucursal desde BD central
const obtenerSucursal = async (sucursalId) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('sucursal_id', sql.Int, sucursalId)
    .query('SELECT id, nombre, ip, base_datos, usuario, contrasena, tipo_sucursal, puerto FROM sucursales WHERE id = @sucursal_id');
  return result.recordset[0] || null;
};

// Determinar si la sucursal usa tabla MULTIBODEGA
const esMultibodega = (sucursal) => {
  const nombre = (sucursal.nombre || '').toUpperCase();
  return nombre.includes('COELEMU') ||
         nombre.includes('QUIRIHUE') ||
         nombre.includes('MULTITIENDA');
};

// Construir query de productos segun tipo de sucursal
const buildQuery = (multibodega, filtro) => {
  const estado = filtro === 'no_vigente' ? 3 : 2;

  if (multibodega) {
    // Coelemu / Quirihue: FULL JOIN con GROUP BY + SUM para evitar duplicados por bodega
    let whereExtra = '';
    if (filtro === 'limpiar') {
      whereExtra = `
        AND CONVERT(NUMERIC, ISNULL(MP.MP_COSTO_FINAL, 0)) * CONVERT(NUMERIC, ISNULL(SUM(BMS.MBS_EXISTENCIAS), 0)) > 0
        AND MP.MP_CODIGO_PRODUCTO NOT LIKE '%FLETE%'
        AND MP.MP_CODIGO_PRODUCTO NOT LIKE '%APORTE%'
        AND MP.MP_DESCRIPCION_PRODUCTO NOT LIKE '%PUBLICIDAD%'
        AND MP.MP_DESCRIPCION_PRODUCTO NOT LIKE '%SALDO%'
      `;
    }

    return `
      SELECT
        MP.MP_CODIGO_PRODUCTO AS codigo,
        MP.MP_DESCRIPCION_PRODUCTO AS descripcion,
        CAST(ROUND(ISNULL(SUM(BMS.MBS_EXISTENCIAS), 0), 1) AS NUMERIC(36,1)) AS stock,
        MP.MP_MEDIDA AS familia,
        CONVERT(NUMERIC, ISNULL(MP.MP_COSTO_FINAL, 0)) AS precio_compra,
        ISNULL(MP.MP_MARGEN_COMERCIALIZACION, 0) AS margen,
        CONVERT(NUMERIC, ISNULL(MP.MP_PRECIO_VENTA_NETO, 0)) AS neto,
        CONVERT(NUMERIC, ISNULL(MP.MP_PRECIO_VENTA_FINAL, 0)) AS precio_final,
        CONVERT(NUMERIC, ISNULL(MP.MP_COSTO_FINAL, 0)) * CONVERT(NUMERIC, ISNULL(SUM(BMS.MBS_EXISTENCIAS), 0)) AS valorizado
      FROM ERP_MAESTRO_PRODUCTOS MP
      FULL JOIN ERP_BOD_MERCADERIA_STOCK_MULTIBODEGA BMS
        ON BMS.MP_CODIGO_PRODUCTO = MP.MP_CODIGO_PRODUCTO
      WHERE MP.TPROV_ID_TIPO_PROVEEDOR = 3
        AND EP_ID_ESTADO = ${estado}
        AND MP.MP_CODIGO_PRODUCTO <> 'CODIGO_GENERICO'
        ${whereExtra}
      GROUP BY
        MP.MP_CODIGO_PRODUCTO,
        MP.MP_DESCRIPCION_PRODUCTO,
        MP.MP_MEDIDA,
        MP.MP_COSTO_FINAL,
        MP.MP_MARGEN_COMERCIALIZACION,
        MP.MP_PRECIO_VENTA_NETO,
        MP.MP_PRECIO_VENTA_FINAL
      ORDER BY MP.MP_DESCRIPCION_PRODUCTO ASC
    `;
  }

  // Sucursales normales: tabla de stock única, sin duplicados
  let whereExtra = '';
  if (filtro === 'limpiar') {
    whereExtra = `
      AND CONVERT(NUMERIC, ISNULL(MP.MP_COSTO_FINAL, 0)) * CONVERT(NUMERIC, ISNULL(BMS.BMS_EXISTENCIAS, 0)) > 0
      AND MP.MP_CODIGO_PRODUCTO NOT LIKE '%FLETE%'
      AND MP.MP_CODIGO_PRODUCTO NOT LIKE '%APORTE%'
      AND MP.MP_DESCRIPCION_PRODUCTO NOT LIKE '%PUBLICIDAD%'
      AND MP.MP_DESCRIPCION_PRODUCTO NOT LIKE '%SALDO%'
    `;
  }

  return `
    SELECT
      MP.MP_CODIGO_PRODUCTO AS codigo,
      MP.MP_DESCRIPCION_PRODUCTO AS descripcion,
      CAST(ROUND(ISNULL(BMS.BMS_EXISTENCIAS, 0), 1) AS NUMERIC(36,1)) AS stock,
      MP.MP_MEDIDA AS familia,
      CONVERT(NUMERIC, ISNULL(MP.MP_COSTO_FINAL, 0)) AS precio_compra,
      ISNULL(MP.MP_MARGEN_COMERCIALIZACION, 0) AS margen,
      CONVERT(NUMERIC, ISNULL(MP.MP_PRECIO_VENTA_NETO, 0)) AS neto,
      CONVERT(NUMERIC, ISNULL(MP.MP_PRECIO_VENTA_FINAL, 0)) AS precio_final,
      CONVERT(NUMERIC, ISNULL(MP.MP_COSTO_FINAL, 0)) * CONVERT(NUMERIC, ISNULL(BMS.BMS_EXISTENCIAS, 0)) AS valorizado
    FROM ERP_MAESTRO_PRODUCTOS MP
    FULL JOIN ERP_BOD_MERCADERIA_STOCK BMS
      ON BMS.MP_CODIGO_PRODUCTO = MP.MP_CODIGO_PRODUCTO
    WHERE MP.TPROV_ID_TIPO_PROVEEDOR = 3
      AND EP_ID_ESTADO = ${estado}
      AND MP.MP_CODIGO_PRODUCTO <> 'CODIGO_GENERICO'
      ${whereExtra}
    ORDER BY MP.MP_DESCRIPCION_PRODUCTO ASC
  `;
};

// ============ ENDPOINTS ============

// GET /api/consultar-producto?sucursalId=1&filtro=vigente|no_vigente|limpiar
exports.getProductos = async (req, res) => {
  try {
    const sucursalId = parseInt(req.query.sucursalId);
    const filtro = req.query.filtro || 'vigente';

    if (!sucursalId) {
      return res.status(400).json({ message: 'Se requiere sucursalId' });
    }

    const sucursal = await obtenerSucursal(sucursalId);
    if (!sucursal) return res.status(404).json({ message: 'Sucursal no encontrada' });
    if (!sucursal.ip || !sucursal.base_datos || !sucursal.usuario) {
      return res.status(400).json({ message: 'La sucursal no tiene datos de conexion configurados' });
    }

    let poolSucursal;
    try {
      poolSucursal = await getPoolSucursal(sucursal);
    } catch (connectionError) {
      return res.status(503).json({
        message: `No se pudo conectar a ${sucursal.nombre}`,
        error: connectionError.message
      });
    }

    const multibodega = esMultibodega(sucursal);
    const query = buildQuery(multibodega, filtro);
    const result = await poolSucursal.request().query(query);

    const productos = result.recordset;
    const totalValorizado = productos.reduce((sum, p) => sum + (p.valorizado || 0), 0);

    res.json({
      sucursal: { id: sucursal.id, nombre: sucursal.nombre, tipo_sucursal: sucursal.tipo_sucursal },
      filtro,
      total_productos: productos.length,
      total_valorizado: totalValorizado,
      productos
    });

    console.log(`Consultar Producto - ${sucursal.nombre}: ${productos.length} productos, valorizado $${Math.round(totalValorizado).toLocaleString()}`);
  } catch (error) {
    console.error('Error en getProductos:', error);
    res.status(500).json({ message: 'Error al consultar productos', error: error.message });
  }
};

// GET /api/consultar-producto/detalle?sucursalId=1&codigo=XXX
exports.getDetalleProducto = async (req, res) => {
  try {
    const sucursalId = parseInt(req.query.sucursalId);
    const codigo = req.query.codigo;

    if (!sucursalId || !codigo) {
      return res.status(400).json({ message: 'Se requiere sucursalId y codigo' });
    }

    const sucursal = await obtenerSucursal(sucursalId);
    if (!sucursal) return res.status(404).json({ message: 'Sucursal no encontrada' });

    let poolSucursal;
    try {
      poolSucursal = await getPoolSucursal(sucursal);
    } catch (connectionError) {
      return res.status(503).json({ message: `No se pudo conectar a ${sucursal.nombre}`, error: connectionError.message });
    }

    const multibodega = esMultibodega(sucursal);
    const tablaStock = multibodega
      ? 'ERP_BOD_MERCADERIA_STOCK_MULTIBODEGA BMS'
      : 'ERP_BOD_MERCADERIA_STOCK BMS';
    const campoStock = multibodega ? 'BMS.MBS_EXISTENCIAS' : 'BMS.BMS_EXISTENCIAS';

    const result = await poolSucursal.request()
      .input('codigo', sql.VarChar, codigo)
      .query(`
        SELECT
          MP.MP_CODIGO_PRODUCTO AS codigo,
          MP.MP_DESCRIPCION_PRODUCTO AS descripcion,
          CAST(ROUND(ISNULL(${campoStock}, 0), 1) AS NUMERIC(36,1)) AS stock,
          ISNULL(MP.MP_PRECIO_LISTA, 0) AS precio_lista,
          ISNULL(MP.MP_DESCUENTO1_NORMAL, 0) AS descuento1,
          ISNULL(MP.MP_DESCUENTO2_NORMAL, 0) AS descuento2,
          ISNULL(MP.MP_DESCUENTO3_NORMAL, 0) AS descuento3,
          ISNULL(MP.MP_DESCUENTO4_NORMAL, 0) AS descuento4,
          ISNULL(MP.MP_DESCUENTO5_NORMAL, 0) AS descuento5,
          ISNULL(MP.MP_DESCUENTO6_NORMAL, 0) AS descuento6,
          ISNULL(MP.MP_DESCUENTO7_NORMAL, 0) AS descuento7,
          ISNULL(MP.MP_DESCUENTO8_NORMAL, 0) AS descuento8,
          ISNULL(MP.MP_DESCUENTO9_NORMAL, 0) AS descuento9,
          ISNULL(MP.MP_DESCUENTO10_NORMAL, 0) AS descuento10,
          ISNULL(MP.MP_DESCUENTO1_OFERTA, 0) AS descuento_oferta1,
          ISNULL(MP.MP_DESCUENTO2_OFERTA, 0) AS descuento_oferta2,
          ISNULL(MP.MP_PRECIO_COSTO_NETO, 0) AS precio_costo_neto,
          ISNULL(MP.MP_FLETE, 0) AS flete_porcentaje,
          ISNULL(MP.MP_FACTOR_FLETE, 0) AS factor_flete,
          ISNULL(MP.MP_PRECIO_FINAL, 0) AS precio_final_detalle,
          ISNULL(MP.MP_COMISION_CADENA, 0) AS comision_cadena,
          ISNULL(MP.MP_COSTOS_VARIABLES, 0) AS costos_variables,
          ISNULL(MP.MP_COSTO_FINAL, 0) AS costo_final_saf,
          ISNULL(MP.MP_MARGEN_COMERCIALIZACION, 0) AS margen,
          CONVERT(NUMERIC, ISNULL(MP.MP_PRECIO_VENTA_NETO, 0)) AS precio_venta_neto,
          ISNULL(MP.MP_IVA, 0) AS iva,
          CONVERT(NUMERIC, ISNULL(MP.MP_PRECIO_VENTA_FINAL, 0)) AS precio_venta_total,
          ISNULL(MP.MP_RTU, 0) AS rtu
        FROM ERP_MAESTRO_PRODUCTOS MP
        FULL JOIN ${tablaStock}
          ON BMS.MP_CODIGO_PRODUCTO = MP.MP_CODIGO_PRODUCTO
        WHERE MP.TPROV_ID_TIPO_PROVEEDOR = 3
          AND EP_ID_ESTADO = 2
          AND MP.MP_CODIGO_PRODUCTO = @codigo
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.json(result.recordset[0]);
    console.log(`Detalle Producto - ${sucursal.nombre}: ${codigo}`);
  } catch (error) {
    console.error('Error en getDetalleProducto:', error);
    res.status(500).json({ message: 'Error al obtener detalle del producto', error: error.message });
  }
};

// GET /api/consultar-producto/sucursales - Listar sucursales disponibles
// GET /api/consultar-producto/historico?sucursalId=1&codigo=XXX&fechaDesde=2025-01-01&fechaHasta=2025-12-31
// Historico de ventas de un producto (Boletas + Facturas) - migrado de Historico.vb
exports.getHistorico = async (req, res) => {
  try {
    const sucursalId = parseInt(req.query.sucursalId);
    const codigo = req.query.codigo;
    const fechaDesde = req.query.fechaDesde;
    const fechaHasta = req.query.fechaHasta;
    if (!sucursalId || !codigo) return res.status(400).json({ message: 'Se requiere sucursalId y codigo' });

    const sucursal = await obtenerSucursal(sucursalId);
    if (!sucursal) return res.status(404).json({ message: 'Sucursal no encontrada' });

    let poolSuc;
    try { poolSuc = await getPoolSucursal(sucursal); }
    catch (err) { return res.status(503).json({ message: `No se pudo conectar a ${sucursal.nombre}`, error: err.message }); }

    const t0 = Date.now();

    // Si hay fechas usar rango, si no usar año actual
    const usarFechas = fechaDesde && fechaHasta;
    const filtroFechaBoleta = usarFechas
      ? 'RBO.RBO_FECHA_INGRESO >= @fechaDesde AND RBO.RBO_FECHA_INGRESO <= @fechaHasta'
      : 'YEAR(RBO.RBO_FECHA_INGRESO) = @anio';
    const filtroFechaFactura = usarFechas
      ? 'RFA.RFC_FECHA_INGRESO >= @fechaDesde AND RFA.RFC_FECHA_INGRESO <= @fechaHasta'
      : 'YEAR(RFA.RFC_FECHA_INGRESO) = @anio';

    const query = `
      SELECT [N Interno], Folio, [Rut Cliente], Cliente, Cantidad, Fecha,
             CONVERT(NUMERIC, Neto) AS Neto,
             CONVERT(NUMERIC, [Precio cIva]) AS PrecioConIva,
             Doc
      FROM (
        SELECT
          BO.RBO_NUM_INTERNO_BO AS [N Interno],
          RBO.RBO_NUMERO_BOLETA AS Folio,
          CAST(mc.MC_RUT_CLIENTE AS NVARCHAR) + '-' + CAST(MC.MC_DIGITO AS NVARCHAR) AS [Rut Cliente],
          mc.MC_RAZON_SOCIAL AS Cliente,
          BO.DBOL_CANTIDAD AS Cantidad,
          RBO.RBO_FECHA_INGRESO AS Fecha,
          BO.DBOL_PRECIO_LISTA AS Neto,
          BO.DBOL_PRECIO_FINAL AS [Precio cIva],
          'BO' AS Doc
        FROM ERP_MAESTRO_PRODUCTOS MP
        JOIN ERP_FACT_DET_BOLETAS BO ON BO.MP_CODIGO_PRODUCTO = MP.MP_CODIGO_PRODUCTO
        JOIN ERP_FACT_RES_BOLETAS RBO ON RBO.RBO_NUM_INTERNO_BO = BO.RBO_NUM_INTERNO_BO
        JOIN ERP_MAESTRO_CLIENTES MC ON MC.MC_RUT_CLIENTE = RBO.MC_RUT_CLIENTE
        WHERE MP.TPROV_ID_TIPO_PROVEEDOR = 3 AND MP.EP_ID_ESTADO = 2
          AND ${filtroFechaBoleta} AND MP.MP_CODIGO_PRODUCTO = @codigo
        UNION ALL
        SELECT
          FA.RFC_NUM_INTERNO_FA_CLI,
          RFA.RFC_NUMERO_FACTURA_CLI,
          CAST(mc.MC_RUT_CLIENTE AS NVARCHAR) + '-' + CAST(MC.MC_DIGITO AS NVARCHAR),
          mc.MC_RAZON_SOCIAL,
          FA.DFC_CANTIDAD,
          RFA.RFC_FECHA_INGRESO,
          FA.DFC_PRECIO_LISTA,
          FA.DFC_PRECIO_FINAL,
          'FA'
        FROM ERP_MAESTRO_PRODUCTOS MP
        JOIN ERP_FACT_DET_FACTURA_CLIENTES FA ON FA.MP_CODIGO_PRODUCTO = MP.MP_CODIGO_PRODUCTO
        JOIN ERP_FACT_RES_FACTURA_CLIENTES RFA ON RFA.RFC_NUM_INTERNO_FA_CLI = FA.RFC_NUM_INTERNO_FA_CLI
        JOIN ERP_MAESTRO_CLIENTES MC ON MC.MC_RUT_CLIENTE = RFA.MC_RUT_CLIENTE
        WHERE MP.TPROV_ID_TIPO_PROVEEDOR = 3 AND MP.EP_ID_ESTADO = 2
          AND ${filtroFechaFactura} AND MP.MP_CODIGO_PRODUCTO = @codigo
      ) T
      WHERE T.Cliente NOT LIKE '%CLIENTE FERRETERIA%'
      ORDER BY Fecha DESC
    `;

    const request = poolSuc.request().input('codigo', sql.VarChar, codigo);
    if (usarFechas) {
      request.input('fechaDesde', sql.Date, fechaDesde);
      request.input('fechaHasta', sql.Date, fechaHasta);
    } else {
      request.input('anio', sql.Int, new Date().getFullYear());
    }

    const result = await request.query(query);

    const ms = Date.now() - t0;
    const totalCantidad = result.recordset.reduce((s, r) => s + (r.Cantidad || 0), 0);
    const totalNeto = result.recordset.reduce((s, r) => s + (r.Neto || 0), 0);

    console.log(`[Historico] ${sucursal.nombre} - ${codigo}: ${result.recordset.length} docs en ${ms}ms`);

    res.json({
      documentos: result.recordset,
      cantidad_total: totalCantidad,
      neto_total: totalNeto,
      total_docs: result.recordset.length,
      fechaDesde: fechaDesde || null,
      fechaHasta: fechaHasta || null,
      tiempo_ms: ms
    });
  } catch (error) {
    console.error('Error en getHistorico:', error);
    res.status(500).json({ message: 'Error al consultar historico', error: error.message });
  }
};

// GET /api/consultar-producto/tarjeta-existencia?sucursalId=1&codigo=XXX&fechaDesde=2025-01-01&fechaHasta=2025-12-31
// Tarjeta de existencia de un producto (entradas/salidas) - migrado de Tarjeta Existencia.vb
exports.getTarjetaExistencia = async (req, res) => {
  try {
    const sucursalId = parseInt(req.query.sucursalId);
    const codigo = req.query.codigo;
    const fechaDesde = req.query.fechaDesde;
    const fechaHasta = req.query.fechaHasta;
    if (!sucursalId || !codigo || !fechaDesde || !fechaHasta) {
      return res.status(400).json({ message: 'Se requiere sucursalId, codigo, fechaDesde y fechaHasta' });
    }

    const sucursal = await obtenerSucursal(sucursalId);
    if (!sucursal) return res.status(404).json({ message: 'Sucursal no encontrada' });

    let poolSuc;
    try { poolSuc = await getPoolSucursal(sucursal); }
    catch (err) { return res.status(503).json({ message: `No se pudo conectar a ${sucursal.nombre}`, error: err.message }); }

    const t0 = Date.now();

    const query = `
      WITH base AS (
        SELECT
          ISNULL(COALESCE(rig.ROC_NUMERO_ORDEN, BTE.ROC_NUMERO_ORDEN), 0) AS num_oc,
          ISNULL(COALESCE(
            G.BEGC_NUMERO_GUIA_CLI,
            BTE.BIGP_FOLIO_INGRESO_PROVEEDOR,
            BTE.AJU_ID_AJUSTE,
            (SELECT TOP 1 B.RBO_NUMERO_BOLETA FROM ERP_FACT_RES_BOLETAS B WHERE B.ROC_NUMERO_ORDEN = BTE.ROC_NUMERO_ORDEN),
            (SELECT TOP 1 F.RFC_NUMERO_FACTURA_CLI FROM ERP_FACT_RES_FACTURA_CLIENTES F WHERE F.ROC_NUMERO_ORDEN = BTE.ROC_NUMERO_ORDEN)
          ), 0) AS folio,
          CASE
            WHEN COALESCE(TID.BTIG_DESCRIPCION_INGRESO, TED.BTEG_DESCRIPCION_EGRESO) IS NOT NULL
              THEN COALESCE(TID.BTIG_DESCRIPCION_INGRESO, TED.BTEG_DESCRIPCION_EGRESO)
            WHEN EXISTS (SELECT 1 FROM ERP_FACT_RES_BOLETAS B WHERE B.ROC_NUMERO_ORDEN = BTE.ROC_NUMERO_ORDEN)
              THEN 'BO'
            WHEN EXISTS (SELECT 1 FROM ERP_FACT_RES_FACTURA_CLIENTES F WHERE F.ROC_NUMERO_ORDEN = BTE.ROC_NUMERO_ORDEN)
              THEN 'FA'
            WHEN EXISTS (SELECT 1 FROM ERP_FACT_RES_NC_CLIENTE N WHERE N.ROC_NUMERO_ORDEN = BTE.ROC_NUMERO_ORDEN)
              THEN 'NC'
            WHEN G.BEGC_NUMERO_GUIA_CLI IS NULL THEN 'GV'
            ELSE NULL
          END AS detalle,
          BTEXIST_ENTRADA AS entrada,
          ISNULL(BTEXIST_SALIDA, 0) AS salida,
          BTEXIST_STOCK_ACTUAL AS stock,
          MPR.MPR_RAZON_SOCIAL AS proveedor,
          ISNULL(MC.MC_RAZON_SOCIAL, 'BEACHMARKET LTDA') AS cliente,
          BTEXIST_PRECIO_ENTRADA AS precio_entrada,
          BTEXIST_PRECIO_SALIDA AS precio_salida,
          BTEXIST_FECHA_INGRESO_MOV AS fecha,
          ROW_NUMBER() OVER (
            PARTITION BY
              BTE.BTEXIST_FECHA_HORA_INGRESO,
              BTE.BTEXIST_ENTRADA,
              ISNULL(BTE.BTEXIST_SALIDA, 0),
              BTE.BTEXIST_STOCK_ACTUAL,
              ISNULL(BTE.ROC_NUMERO_ORDEN, 0),
              ISNULL(BTE.BIGP_FOLIO_INGRESO_PROVEEDOR, 0),
              ISNULL(BTE.BEGC_FOLIO_EGRESO_CLI, 0),
              ISNULL(BTE.AJU_ID_AJUSTE, 0)
            ORDER BY (SELECT NULL)
          ) AS _rn
        FROM ERP_BOD_TARJETA_EXISTENCIAS BTE
        LEFT JOIN ERP_BOD_TIPO_EMISION_DOCUMENTO TED
          ON TED.BTEG_TIPO_EGRESO = BTE.BTEG_TIPO_EGRESO
        LEFT JOIN ERP_BOD_TIPO_INGRESO_DOCUMENTO TID
          ON TID.BTIG_TIPO_INGRESO = BTE.BTIG_TIPO_INGRESO
        LEFT JOIN ERP_OP_RES_ORDEN_COMPRA ROC
          ON ROC.ROC_NUMERO_ORDEN = BTE.ROC_NUMERO_ORDEN
        LEFT JOIN ERP_BOD_RES_INGRESO_GUIAS RIG
          ON RIG.BIGP_FOLIO_INGRESO_PROVEEDOR = BTE.BIGP_FOLIO_INGRESO_PROVEEDOR
        LEFT JOIN ERP_BOD_RES_EMISION_GUIAS G
          ON G.BEGC_FOLIO_EGRESO_CLI = BTE.BEGC_FOLIO_EGRESO_CLI
        LEFT JOIN ERP_MAESTRO_CLIENTES MC
          ON MC.MC_RUT_CLIENTE = COALESCE(ROC.MC_RUT_CLIENTE, RIG.MC_RUT_CLIENTE)
        LEFT JOIN (
          SELECT * FROM (
            SELECT *, ROW_NUMBER() OVER(PARTITION BY MPR_RUT_PROVEEDOR ORDER BY MPR_RUT_PROVEEDOR) AS rn
            FROM ERP_MAESTRO_PROVEEDORES
          ) t WHERE rn = 1
        ) MPR ON MPR.MPR_RUT_PROVEEDOR = COALESCE(rig.MPR_RUT_PROVEEDOR, roc.MPR_RUT_PROVEEDOR, BTE.MPR_RUT_PROVEEDOR)
        WHERE MP_CODIGO_PRODUCTO = @codigo
          AND (MC.ERS_ID_ESTADO = '1' OR MC.MC_RUT_CLIENTE IS NULL)
          AND BTEXIST_FECHA_HORA_INGRESO BETWEEN @fechaDesde AND @fechaHasta
      )
      SELECT num_oc, folio, detalle, entrada, salida, stock, proveedor, cliente, precio_entrada, precio_salida, fecha
      FROM base
      WHERE _rn = 1
      ORDER BY fecha DESC
    `;

    const result = await poolSuc.request()
      .input('codigo', sql.VarChar, codigo)
      .input('fechaDesde', sql.VarChar, fechaDesde + ' 00:00:00')
      .input('fechaHasta', sql.VarChar, fechaHasta + ' 23:59:59')
      .query(query);

    const registros = result.recordset;

    const movimientos = registros.map((r) => ({
      Fecha:        r.fecha,
      NumOC:        r.num_oc || 0,
      Folio:        r.folio || '-',
      Detalle:      r.detalle || '-',
      Ingreso:      r.entrada || 0,
      Egreso:       r.salida  || 0,
      Stock:        r.stock   ?? '-',
      Proveedor:    r.proveedor || '-',
      Cliente:      r.cliente   || '-',
      PrecioIngreso: r.precio_entrada || 0,
      PrecioEgreso:  r.precio_salida  || 0,
    }));

    const totalEntradas = registros.reduce((s, r) => s + (r.entrada || 0), 0);
    const totalSalidas  = registros.reduce((s, r) => s + (r.salida  || 0), 0);
    const stockActual   = movimientos.length > 0 ? (movimientos[0].Stock ?? 0) : 0;

    const ms = Date.now() - t0;
    console.log(`[Tarjeta Existencia] ${sucursal.nombre} - ${codigo}: ${registros.length} movimientos en ${ms}ms`);

    res.json({
      movimientos,
      total_movimientos: movimientos.length,
      total_entradas: totalEntradas,
      total_salidas: totalSalidas,
      stock_actual: stockActual,
      tiempo_ms: ms
    });
  } catch (error) {
    console.error('Error en getTarjetaExistencia:', error);
    res.status(500).json({ message: 'Error al consultar tarjeta existencia', error: error.message });
  }
};

exports.getSucursales = async (req, res) => {
  try {
    const pool = await poolPromise;
    const perfilId = req.user?.perfilId;

    console.log('🔍 [Consultar Producto] getSucursales - usuario:', req.user);

    if (!perfilId) {
      console.log('❌ [Consultar Producto] Token sin perfilId - requiere re-login');
      return res.status(401).json({
        message: 'Sesión expirada - por favor inicie sesión nuevamente',
        requiresRelogin: true
      });
    }

    // Obtener ID del módulo "Consultar Producto"
    const moduloResult = await pool.request()
      .input('nombre', sql.VarChar, 'Consultar Producto')
      .query('SELECT id FROM modulos WHERE nombre = @nombre');

    if (moduloResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Módulo Consultar Producto no encontrado' });
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

    console.log(`[Consultar Producto] Usuario con perfil ${perfilId} tiene acceso a ${result.recordset.length} sucursales`);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error en getSucursales (Consultar Producto):', error);
    res.status(500).json({ message: 'Error al obtener sucursales', error: error.message });
  }
};
