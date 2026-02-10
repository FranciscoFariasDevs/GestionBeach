// backend/controllers/consultarProductoController.js - Consultar Producto (migrado de sistema viejo VB)
const { sql, poolPromise } = require('../config/db');

// Helper para crear conexion a sucursal
const conectarSucursal = async (sucursal) => {
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
    pool: { max: 1, min: 0, idleTimeoutMillis: 5000 }
  };

  return await Promise.race([
    new sql.ConnectionPool(config).connect(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de conexion')), 10000))
  ]);
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
  const tablaStock = multibodega
    ? 'ERP_BOD_MERCADERIA_STOCK_MULTIBODEGA BMS'
    : 'ERP_BOD_MERCADERIA_STOCK BMS';

  const campoStock = multibodega ? 'BMS.MBS_EXISTENCIAS' : 'BMS.BMS_EXISTENCIAS';

  // EP_ID_ESTADO: 2 = vigente, 3 = no vigente
  const estado = filtro === 'no_vigente' ? 3 : 2;

  let whereExtra = '';
  if (filtro === 'limpiar') {
    whereExtra = `
      AND CONVERT(NUMERIC, ISNULL(MP.MP_COSTO_FINAL, 0)) * CONVERT(NUMERIC, ISNULL(${campoStock}, 0)) > 0
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
      CAST(ROUND(ISNULL(${campoStock}, 0), 1) AS NUMERIC(36,1)) AS stock,
      MP.MP_MEDIDA AS familia,
      CONVERT(NUMERIC, ISNULL(MP.MP_COSTO_FINAL, 0)) AS precio_compra,
      ISNULL(MP.MP_MARGEN_COMERCIALIZACION, 0) AS margen,
      CONVERT(NUMERIC, ISNULL(MP.MP_PRECIO_VENTA_NETO, 0)) AS neto,
      CONVERT(NUMERIC, ISNULL(MP.MP_PRECIO_VENTA_FINAL, 0)) AS precio_final,
      CONVERT(NUMERIC, ISNULL(MP.MP_COSTO_FINAL, 0)) * CONVERT(NUMERIC, ISNULL(${campoStock}, 0)) AS valorizado
    FROM ERP_MAESTRO_PRODUCTOS MP
    FULL JOIN ${tablaStock}
      ON BMS.MP_CODIGO_PRODUCTO = MP.MP_CODIGO_PRODUCTO
    WHERE MP.TPROV_ID_TIPO_PROVEEDOR = 3
      AND EP_ID_ESTADO = ${estado}
      AND MP.MP_CODIGO_PRODUCTO <> 'CODIGO_GENERICO'
      ${whereExtra}
    ORDER BY MP.MP_DESCRIPCION_PRODUCTO ASC
  `;
};

// GET /api/consultar-producto?sucursalId=1&filtro=vigente|no_vigente|limpiar
exports.getProductos = async (req, res) => {
  try {
    const sucursalId = parseInt(req.query.sucursalId);
    const filtro = req.query.filtro || 'vigente'; // vigente | no_vigente | limpiar

    if (!sucursalId) {
      return res.status(400).json({ message: 'Se requiere sucursalId' });
    }

    const pool = await poolPromise;

    const sucursalResult = await pool.request()
      .input('sucursal_id', sql.Int, sucursalId)
      .query('SELECT id, nombre, ip, base_datos, usuario, contrasena, tipo_sucursal, puerto FROM sucursales WHERE id = @sucursal_id');

    if (sucursalResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Sucursal no encontrada' });
    }

    const sucursal = sucursalResult.recordset[0];

    if (!sucursal.ip || !sucursal.base_datos || !sucursal.usuario) {
      return res.status(400).json({ message: 'La sucursal no tiene datos de conexion configurados' });
    }

    let poolSucursal;
    try {
      poolSucursal = await conectarSucursal(sucursal);
    } catch (connectionError) {
      return res.status(503).json({
        message: `No se pudo conectar a ${sucursal.nombre}`,
        error: connectionError.message
      });
    }

    try {
      const multibodega = esMultibodega(sucursal);
      const query = buildQuery(multibodega, filtro);
      const result = await poolSucursal.request().query(query);

      const productos = result.recordset;
      const totalValorizado = productos.reduce((sum, p) => sum + (p.valorizado || 0), 0);

      res.json({
        sucursal: {
          id: sucursal.id,
          nombre: sucursal.nombre,
          tipo_sucursal: sucursal.tipo_sucursal
        },
        filtro,
        total_productos: productos.length,
        total_valorizado: totalValorizado,
        productos
      });

      console.log(`Consultar Producto - ${sucursal.nombre}: ${productos.length} productos, valorizado $${Math.round(totalValorizado).toLocaleString()}`);
    } finally {
      try { await poolSucursal.close(); } catch {}
    }

  } catch (error) {
    console.error('Error en getProductos:', error);
    res.status(500).json({ message: 'Error al consultar productos', error: error.message });
  }
};

// GET /api/consultar-producto/sucursales - Listar sucursales disponibles
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
