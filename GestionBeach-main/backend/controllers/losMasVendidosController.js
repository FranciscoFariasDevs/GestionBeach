// backend/controllers/losMasVendidosController.js - VERSIÓN CORREGIDA PARA DB
const { sql, poolPromise } = require('../config/db'); // ✅ Cambié de 'dbp' a 'db'

// ✅ Función para calcular fechas según el período
const calculateDates = (period) => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  let startDate;
  switch(period || 'week') {
    case 'day':
      startDate = new Date(today);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(today);
      startDate.setMonth(today.getMonth() - 1);
      break;
    case 'quarter':
      startDate = new Date(today);
      startDate.setMonth(today.getMonth() - 3);
      break;
    case 'year':
      startDate = new Date(today);
      startDate.setFullYear(today.getFullYear() - 1);
      break;
    default:
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
  }
  
  return { startDate, endDate: today };
};

// ✅ Función mejorada para obtener configuración de sucursal
const getSucursalConfig = async (sucursal_id) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('sucursalId', sql.Int, sucursal_id)
      .query('SELECT * FROM sucursales WHERE id = @sucursalId');

    if (result.recordset.length === 0) {
      throw new Error('Sucursal no encontrada');
    }

    const sucursal = result.recordset[0];
    
    return {
      sucursal,
      config: {
        user: sucursal.usuario,
        password: sucursal.contrasena,
        server: sucursal.ip,
        port: sucursal.puerto,
        database: sucursal.base_datos,
        options: {
          encrypt: false,
          trustServerCertificate: true,
          requestTimeout: 45000,
          enableArithAbort: true,
          connectionTimeout: 15000
        }
      }
    };
  } catch (error) {
    console.error('❌ Error al obtener configuración de sucursal:', error);
    throw error;
  }
};

// Cache de esquema por sucursal_id ('ERP_STD' | 'ERP_ALT' | 'TB')
const schemaCache = new Map();

const detectSchema = async (config, sucursalId) => {
  if (schemaCache.has(sucursalId)) return schemaCache.get(sucursalId);
  let pool = null;
  try {
    pool = await new sql.ConnectionPool(config).connect();
    const r = await pool.request().query(`
      SELECT
        CASE WHEN OBJECT_ID('ERP_MAESTRO_FAMILIAS')    IS NOT NULL THEN 1 ELSE 0 END AS tieneSTD,
        CASE WHEN OBJECT_ID('ERP_FAMILIAS_PRODUCTOS')  IS NOT NULL THEN 1 ELSE 0 END AS tieneALT,
        CASE WHEN OBJECT_ID('tb_documentos_encabezado') IS NOT NULL THEN 1 ELSE 0 END AS tieneTB
    `);
    const row = r.recordset[0];
    const schema = row.tieneSTD ? 'ERP_STD' : row.tieneALT ? 'ERP_ALT' : row.tieneTB ? 'TB' : 'TB';
    schemaCache.set(sucursalId, schema);
    console.log(`🔍 Esquema detectado para sucursal ${sucursalId}: ${schema}`);
    return schema;
  } finally {
    if (pool) try { await pool.close(); } catch {}
  }
};

// ✅ Función base mejorada para ejecutar consultas
const executeProductQuery = async (config, query, params = {}) => {
  let poolSucursal = null;
  
  try {
    console.log('🔗 Conectando a sucursal...');
    poolSucursal = await new sql.ConnectionPool(config).connect();
    
    const request = poolSucursal.request();
    
    // Añadir parámetros con validación
    Object.entries(params).forEach(([key, param]) => {
      if (param && param.hasOwnProperty('value')) {
        console.log(`📋 Parámetro ${key}:`, param.value);
        request.input(key, param.type || sql.NVarChar, param.value);
      }
    });

    console.log('🔍 Ejecutando query...');
    const result = await request.query(query);
    
    console.log(`📊 Resultados: ${result.recordset.length} registros`);
    
    return result.recordset.map(item => ({
      id: item['Codigo Barra'] || item.codigo_barra || item.id,
      code: item['Codigo Barra'] || item.codigo_barra,
      name: item.Descripcion || item.descripcion || item.name,
      category: item.Familia || item.familia || item.category,
      sales: parseInt(item.Cantidad || item.cantidad || item.sales) || 0,
      revenue: parseFloat(item['P. Venta'] || item.p_venta || item.precio_venta || item.revenue) || 0,
      rotation: parseFloat(item.rotation || item.rotacion) || 0
    }));

  } catch (error) {
    console.error('❌ Error en executeProductQuery:', error);
    throw new Error(`Error de base de datos: ${error.message}`);
  } finally {
    if (poolSucursal) {
      try {
        await poolSucursal.close();
        console.log('🔐 Conexión cerrada correctamente');
      } catch (closeError) {
        console.error('⚠️ Error al cerrar conexión:', closeError);
      }
    }
  }
};

// ✅ CONTROLADOR: Test de conexión (SIMPLIFICADO)
exports.testConnection = async (req, res) => {
  try {
    console.log('🔍 === TEST CONNECTION INICIADO ===');
    const { sucursal_id } = req.query;
    
    if (!sucursal_id) {
      console.log('❌ Sucursal ID faltante');
      return res.status(400).json({ 
        success: false, 
        message: 'Se requiere el ID de la sucursal' 
      });
    }

    console.log('📋 Test para sucursal:', sucursal_id);

    // ✅ PASO 1: Verificar que la sucursal existe en la BD principal
    try {
      const pool = await poolPromise;
      console.log('✅ Conexión a BD principal establecida');
      
      const sucursalResult = await pool.request()
        .input('sucursalId', sql.Int, sucursal_id)
        .query('SELECT * FROM sucursales WHERE id = @sucursalId');

      if (sucursalResult.recordset.length === 0) {
        console.log('❌ Sucursal no encontrada en BD principal');
        return res.status(404).json({ 
          success: false,
          message: 'Sucursal no encontrada'
        });
      }

      const sucursal = sucursalResult.recordset[0];
      console.log('✅ Sucursal encontrada:', sucursal.nombre);

      // ✅ PASO 2: Test básico - solo responder con info de la sucursal
      res.json({
        success: true,
        message: 'Test básico exitoso',
        sucursal: {
          id: sucursal.id,
          nombre: sucursal.nombre,
          servidor: sucursal.ip,
          port: sucursal.puerto,
          base_datos: sucursal.base_datos,
          tipo: sucursal.tipo_sucursal
        },
        timestamp: new Date().toISOString()
      });

    } catch (dbError) {
      console.error('❌ Error de BD principal:', dbError);
      throw dbError;
    }

  } catch (error) {
    console.error('❌ Error general en testConnection:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error de conexión',
      error: error.message,
      sucursal_id: req.query.sucursal_id,
      timestamp: new Date().toISOString()
    });
  }
};

// ✅ CONTROLADOR: Productos más vendidos (CON SOPORTE FERRETERÍAS)
exports.getTopProducts = async (req, res) => {
  try {
    const { familia, period = 'week', sucursal_id, limit = 50 } = req.query;

    const limitNumber = parseInt(limit) || 50;

    if (!sucursal_id) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID de la sucursal'
      });
    }

    const { sucursal, config } = await getSucursalConfig(sucursal_id);
    const { startDate, endDate } = calculateDates(period);
    const schema = await detectSchema(config, sucursal_id);

    console.log('📊 Límite de productos (más vendidos):', limitNumber);

    let query;
    const params = {
      startDate: { value: startDate, type: sql.DateTime },
      endDate: { value: endDate, type: sql.DateTime }
    };

    if (schema === 'ERP_STD') {
      query = `
        SELECT TOP ${limitNumber}
          MP.MP_NOMBRE_PRODUCTO AS Descripcion,
          MP.MP_CODIGO_PRODUCTO AS 'Codigo Barra',
          MP.FAMI_ID_FAMILIA AS Familia,
          SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS INT)) AS Cantidad,
          SUM(CAST(ISNULL(DBOL.DBOL_PRECIO_LISTA * DBOL.DBOL_CANTIDAD, 0) AS FLOAT)) AS 'P. Venta'
        FROM ERP_FACT_RES_BOLETAS RBO
          JOIN ERP_FACT_DET_BOLETAS DBOL ON DBOL.RBO_NUM_INTERNO_BO = RBO.RBO_NUM_INTERNO_BO
          JOIN ERP_MAESTRO_PRODUCTOS MP ON MP.MP_CODIGO_PRODUCTO = DBOL.MP_CODIGO_PRODUCTO
        WHERE RBO.RBO_FECHA_INGRESO BETWEEN @startDate AND @endDate
          AND DBOL.DBOL_CANTIDAD > 0
      `;
      if (familia && familia !== 'all') {
        query += ` AND MP.FAMI_ID_FAMILIA = @familia`;
        params.familia = { value: parseInt(familia), type: sql.Int };
      }
      query += `
        GROUP BY MP.MP_NOMBRE_PRODUCTO, MP.MP_CODIGO_PRODUCTO, MP.FAMI_ID_FAMILIA
        HAVING SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS INT)) > 0
        ORDER BY SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS INT)) DESC
      `;
    } else if (schema === 'ERP_ALT') {
      query = `
        SELECT TOP ${limitNumber}
          MP.MP_DESCRIPCION_PRODUCTO AS Descripcion,
          MP.MP_CODIGO_PRODUCTO AS 'Codigo Barra',
          PF.FP_CODIGO AS Familia,
          SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS INT)) AS Cantidad,
          SUM(CAST(ISNULL(DBOL.DBOL_PRECIO_LISTA * DBOL.DBOL_CANTIDAD, 0) AS FLOAT)) AS 'P. Venta'
        FROM ERP_FACT_RES_BOLETAS RBO
          JOIN ERP_FACT_DET_BOLETAS DBOL ON DBOL.RBO_NUM_INTERNO_BO = RBO.RBO_NUM_INTERNO_BO
          JOIN ERP_MAESTRO_PRODUCTOS MP ON MP.MP_CODIGO_PRODUCTO = DBOL.MP_CODIGO_PRODUCTO
          LEFT JOIN ERP_PRODUCTO_FAMILIA PF ON PF.MP_CODIGO_PRODUCTO = MP.MP_CODIGO_PRODUCTO
        WHERE RBO.RBO_FECHA_INGRESO BETWEEN @startDate AND @endDate
          AND DBOL.DBOL_CANTIDAD > 0
      `;
      if (familia && familia !== 'all') {
        query += ` AND PF.FP_CODIGO = @familia`;
        params.familia = { value: familia, type: sql.NVarChar };
      }
      query += `
        GROUP BY MP.MP_DESCRIPCION_PRODUCTO, MP.MP_CODIGO_PRODUCTO, PF.FP_CODIGO
        HAVING SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS INT)) > 0
        ORDER BY SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS INT)) DESC
      `;
    } else {
      // QUERY PARA SUPERMERCADOS (mantener intacta)
      query = `
        SELECT TOP ${limitNumber}
          ISNULL(fa.dg_glosa, 'Sin Familia') AS Familia,
          tdd.dc_codigo_barra AS 'Codigo Barra',
          ISNULL(tdd.dg_glosa_producto, 'Sin Descripción') AS Descripcion,
          SUM(CAST(ISNULL(tdd.dn_cantidad, 0) AS INT)) AS Cantidad,
          SUM(CAST(ISNULL(tdd.dq_bruto, 0) AS FLOAT)) AS 'P. Venta'
        FROM tb_documentos_encabezado tde
          INNER JOIN tb_documentos_detalle tdd ON tdd.dn_correlativo_documento = tde.dn_correlativo
          LEFT JOIN tb_productos pr ON pr.dc_codigo_barra = tdd.dc_codigo_barra
          LEFT JOIN tb_familias fa ON fa.dn_correlativo = pr.dn_correlativo_familia
        WHERE LTRIM(RTRIM(ISNULL(tde.dc_codigo_centralizacion, ''))) = '0039'
          AND tde.df_fecha_emision >= @startDate
          AND tde.df_fecha_emision <= @endDate
          AND ISNULL(tdd.dn_cantidad, 0) > 0
          AND tdd.dc_codigo_barra IS NOT NULL
          AND tdd.dc_codigo_barra != ''
      `;

      if (familia && familia !== 'all') {
        query += ` AND fa.dn_correlativo = @familia`;
        params.familia = { value: parseInt(familia), type: sql.Int };
      }

      query += `
        GROUP BY fa.dg_glosa, tdd.dc_codigo_barra, tdd.dg_glosa_producto
        HAVING SUM(CAST(ISNULL(tdd.dn_cantidad, 0) AS INT)) > 0
        ORDER BY SUM(CAST(ISNULL(tdd.dn_cantidad, 0) AS INT)) DESC
      `;
    }

    const products = await executeProductQuery(config, query, params);

    res.json({
      success: true,
      products,
      sucursal: sucursal.nombre
    });

  } catch (error) {
    console.error('❌ Error en getTopProducts:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos más vendidos',
      error: error.message
    });
  }
};

// ✅ CONTROLADOR: Obtener familias (CON SOPORTE FERRETERÍAS)
exports.getFamilias = async (req, res) => {
  try {
    const { sucursal_id } = req.query;

    if (!sucursal_id) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID de la sucursal'
      });
    }

    const { sucursal, config } = await getSucursalConfig(sucursal_id);
    const schema = await detectSchema(config, sucursal_id);

    let famQuery;
    if (schema === 'ERP_STD') {
      famQuery = `SELECT DISTINCT FAMI_ID_FAMILIA AS id, FAMI_NOMBRE_FAMILIA AS nombre FROM ERP_MAESTRO_FAMILIAS WHERE FAMI_ID_FAMILIA IS NOT NULL ORDER BY FAMI_NOMBRE_FAMILIA`;
    } else if (schema === 'ERP_ALT') {
      famQuery = `SELECT DISTINCT FP_CODIGO AS id, FP_DESCRIPCION AS nombre FROM ERP_FAMILIAS_PRODUCTOS WHERE FP_CODIGO IS NOT NULL ORDER BY FP_DESCRIPCION`;
    } else {
      famQuery = `SELECT DISTINCT fa.dn_correlativo AS id, fa.dg_glosa AS nombre FROM tb_familias fa WHERE fa.dn_correlativo IS NOT NULL ORDER BY fa.dg_glosa`;
    }

    const familias = await executeProductQuery(config, famQuery, {});

    res.json({
      success: true,
      familias: familias.map(f => ({ id: f.id, nombre: f.nombre })),
      total: familias.length,
      sucursal: sucursal.nombre
    });

  } catch (error) {
    console.error('❌ Error en getFamilias:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener familias',
      error: error.message
    });
  }
};

// ✅ CONTROLADOR: Productos menos vendidos (CON SOPORTE FERRETERÍAS)
exports.getLeastSoldProducts = async (req, res) => {
  try {
    const { familia, period = 'week', sucursal_id, limit = 50 } = req.query;

    const limitNumber = parseInt(limit) || 50;

    if (!sucursal_id) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID de la sucursal'
      });
    }

    const { sucursal, config } = await getSucursalConfig(sucursal_id);
    const { startDate, endDate } = calculateDates(period);
    const schema = await detectSchema(config, sucursal_id);

    console.log('📊 Límite de productos (menos vendidos):', limitNumber);

    let query;
    const params = {
      startDate: { value: startDate, type: sql.DateTime },
      endDate: { value: endDate, type: sql.DateTime }
    };

    if (schema === 'ERP_STD') {
      query = `
        SELECT TOP ${limitNumber}
          MP.MP_NOMBRE_PRODUCTO AS Descripcion,
          MP.MP_CODIGO_PRODUCTO AS 'Codigo Barra',
          MP.FAMI_ID_FAMILIA AS Familia,
          SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS INT)) AS Cantidad,
          SUM(CAST(ISNULL(DBOL.DBOL_PRECIO_LISTA * DBOL.DBOL_CANTIDAD, 0) AS FLOAT)) AS 'P. Venta'
        FROM ERP_FACT_RES_BOLETAS RBO
          JOIN ERP_FACT_DET_BOLETAS DBOL ON DBOL.RBO_NUM_INTERNO_BO = RBO.RBO_NUM_INTERNO_BO
          JOIN ERP_MAESTRO_PRODUCTOS MP ON MP.MP_CODIGO_PRODUCTO = DBOL.MP_CODIGO_PRODUCTO
        WHERE RBO.RBO_FECHA_INGRESO BETWEEN @startDate AND @endDate
          AND DBOL.DBOL_CANTIDAD > 0
      `;
      if (familia && familia !== 'all') {
        query += ` AND MP.FAMI_ID_FAMILIA = @familia`;
        params.familia = { value: parseInt(familia), type: sql.Int };
      }
      query += `
        GROUP BY MP.MP_NOMBRE_PRODUCTO, MP.MP_CODIGO_PRODUCTO, MP.FAMI_ID_FAMILIA
        HAVING SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS INT)) > 0
        ORDER BY SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS INT)) ASC
      `;
    } else if (schema === 'ERP_ALT') {
      query = `
        SELECT TOP ${limitNumber}
          MP.MP_DESCRIPCION_PRODUCTO AS Descripcion,
          MP.MP_CODIGO_PRODUCTO AS 'Codigo Barra',
          PF.FP_CODIGO AS Familia,
          SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS INT)) AS Cantidad,
          SUM(CAST(ISNULL(DBOL.DBOL_PRECIO_LISTA * DBOL.DBOL_CANTIDAD, 0) AS FLOAT)) AS 'P. Venta'
        FROM ERP_FACT_RES_BOLETAS RBO
          JOIN ERP_FACT_DET_BOLETAS DBOL ON DBOL.RBO_NUM_INTERNO_BO = RBO.RBO_NUM_INTERNO_BO
          JOIN ERP_MAESTRO_PRODUCTOS MP ON MP.MP_CODIGO_PRODUCTO = DBOL.MP_CODIGO_PRODUCTO
          LEFT JOIN ERP_PRODUCTO_FAMILIA PF ON PF.MP_CODIGO_PRODUCTO = MP.MP_CODIGO_PRODUCTO
        WHERE RBO.RBO_FECHA_INGRESO BETWEEN @startDate AND @endDate
          AND DBOL.DBOL_CANTIDAD > 0
      `;
      if (familia && familia !== 'all') {
        query += ` AND PF.FP_CODIGO = @familia`;
        params.familia = { value: familia, type: sql.NVarChar };
      }
      query += `
        GROUP BY MP.MP_DESCRIPCION_PRODUCTO, MP.MP_CODIGO_PRODUCTO, PF.FP_CODIGO
        HAVING SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS INT)) > 0
        ORDER BY SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS INT)) ASC
      `;
    } else {
      query = `
        SELECT TOP ${limitNumber}
          ISNULL(fa.dg_glosa, 'Sin Familia') AS Familia,
          tdd.dc_codigo_barra AS 'Codigo Barra',
          ISNULL(tdd.dg_glosa_producto, 'Sin Descripción') AS Descripcion,
          SUM(CAST(ISNULL(tdd.dn_cantidad, 0) AS INT)) AS Cantidad,
          SUM(CAST(ISNULL(tdd.dq_bruto, 0) AS FLOAT)) AS 'P. Venta'
        FROM tb_documentos_encabezado tde
          INNER JOIN tb_documentos_detalle tdd ON tdd.dn_correlativo_documento = tde.dn_correlativo
          LEFT JOIN tb_productos pr ON pr.dc_codigo_barra = tdd.dc_codigo_barra
          LEFT JOIN tb_familias fa ON fa.dn_correlativo = pr.dn_correlativo_familia
        WHERE LTRIM(RTRIM(ISNULL(tde.dc_codigo_centralizacion, ''))) = '0039'
          AND tde.df_fecha_emision >= @startDate
          AND tde.df_fecha_emision <= @endDate
          AND ISNULL(tdd.dn_cantidad, 0) > 0
          AND tdd.dc_codigo_barra IS NOT NULL
          AND tdd.dc_codigo_barra != ''
      `;
      if (familia && familia !== 'all') {
        query += ` AND fa.dn_correlativo = @familia`;
        params.familia = { value: parseInt(familia), type: sql.Int };
      }
      query += `
        GROUP BY fa.dg_glosa, tdd.dc_codigo_barra, tdd.dg_glosa_producto
        HAVING SUM(CAST(ISNULL(tdd.dn_cantidad, 0) AS INT)) > 0
        ORDER BY SUM(CAST(ISNULL(tdd.dn_cantidad, 0) AS INT)) ASC
      `;
    }

    const products = await executeProductQuery(config, query, params);

    res.json({
      success: true,
      products,
      sucursal: sucursal.nombre
    });

  } catch (error) {
    console.error('❌ Error en getLeastSoldProducts:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos menos vendidos',
      error: error.message
    });
  }
};

// ✅ CONTROLADOR: Productos con más rotación (CON SOPORTE FERRETERÍAS)
exports.getHighRotationProducts = async (req, res) => {
  try {
    const { familia, period = 'week', sucursal_id, limit = 50 } = req.query;

    const limitNumber = parseInt(limit) || 50;

    if (!sucursal_id) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID de la sucursal'
      });
    }

    const { sucursal, config } = await getSucursalConfig(sucursal_id);
    const { startDate, endDate } = calculateDates(period);
    const schema = await detectSchema(config, sucursal_id);

    const daysDiff = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));

    console.log('📊 Límite de productos (alta rotación):', limitNumber);

    let query;
    const params = {
      startDate: { value: startDate, type: sql.DateTime },
      endDate: { value: endDate, type: sql.DateTime }
    };

    if (schema === 'ERP_STD') {
      query = `
        SELECT TOP ${limitNumber}
          MP.MP_NOMBRE_PRODUCTO AS Descripcion,
          MP.MP_CODIGO_PRODUCTO AS 'Codigo Barra',
          MP.FAMI_ID_FAMILIA AS Familia,
          SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS FLOAT)) AS Cantidad,
          SUM(CAST(ISNULL(DBOL.DBOL_PRECIO_LISTA * DBOL.DBOL_CANTIDAD, 0) AS FLOAT)) AS 'P. Venta',
          (SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS FLOAT)) / ${daysDiff}) AS rotation
        FROM ERP_FACT_RES_BOLETAS RBO
          JOIN ERP_FACT_DET_BOLETAS DBOL ON DBOL.RBO_NUM_INTERNO_BO = RBO.RBO_NUM_INTERNO_BO
          JOIN ERP_MAESTRO_PRODUCTOS MP ON MP.MP_CODIGO_PRODUCTO = DBOL.MP_CODIGO_PRODUCTO
        WHERE RBO.RBO_FECHA_INGRESO BETWEEN @startDate AND @endDate
          AND DBOL.DBOL_CANTIDAD > 0
      `;
      if (familia && familia !== 'all') {
        query += ` AND MP.FAMI_ID_FAMILIA = @familia`;
        params.familia = { value: parseInt(familia), type: sql.Int };
      }
      query += `
        GROUP BY MP.MP_NOMBRE_PRODUCTO, MP.MP_CODIGO_PRODUCTO, MP.FAMI_ID_FAMILIA
        HAVING SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS FLOAT)) > 0
        ORDER BY rotation DESC
      `;
    } else if (schema === 'ERP_ALT') {
      query = `
        SELECT TOP ${limitNumber}
          MP.MP_DESCRIPCION_PRODUCTO AS Descripcion,
          MP.MP_CODIGO_PRODUCTO AS 'Codigo Barra',
          PF.FP_CODIGO AS Familia,
          SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS FLOAT)) AS Cantidad,
          SUM(CAST(ISNULL(DBOL.DBOL_PRECIO_LISTA * DBOL.DBOL_CANTIDAD, 0) AS FLOAT)) AS 'P. Venta',
          (SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS FLOAT)) / ${daysDiff}) AS rotation
        FROM ERP_FACT_RES_BOLETAS RBO
          JOIN ERP_FACT_DET_BOLETAS DBOL ON DBOL.RBO_NUM_INTERNO_BO = RBO.RBO_NUM_INTERNO_BO
          JOIN ERP_MAESTRO_PRODUCTOS MP ON MP.MP_CODIGO_PRODUCTO = DBOL.MP_CODIGO_PRODUCTO
          LEFT JOIN ERP_PRODUCTO_FAMILIA PF ON PF.MP_CODIGO_PRODUCTO = MP.MP_CODIGO_PRODUCTO
        WHERE RBO.RBO_FECHA_INGRESO BETWEEN @startDate AND @endDate
          AND DBOL.DBOL_CANTIDAD > 0
      `;
      if (familia && familia !== 'all') {
        query += ` AND PF.FP_CODIGO = @familia`;
        params.familia = { value: familia, type: sql.NVarChar };
      }
      query += `
        GROUP BY MP.MP_DESCRIPCION_PRODUCTO, MP.MP_CODIGO_PRODUCTO, PF.FP_CODIGO
        HAVING SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS FLOAT)) > 0
        ORDER BY rotation DESC
      `;
    } else {
      query = `
        SELECT TOP ${limitNumber}
          ISNULL(fa.dg_glosa, 'Sin Familia') AS Familia,
          tdd.dc_codigo_barra AS 'Codigo Barra',
          ISNULL(tdd.dg_glosa_producto, 'Sin Descripción') AS Descripcion,
          SUM(CAST(ISNULL(tdd.dn_cantidad, 0) AS FLOAT)) AS Cantidad,
          SUM(CAST(ISNULL(tdd.dq_bruto, 0) AS FLOAT)) AS 'P. Venta',
          (SUM(CAST(ISNULL(tdd.dn_cantidad, 0) AS FLOAT)) / ${daysDiff}) AS rotation
        FROM tb_documentos_encabezado tde
          INNER JOIN tb_documentos_detalle tdd ON tdd.dn_correlativo_documento = tde.dn_correlativo
          LEFT JOIN tb_productos pr ON pr.dc_codigo_barra = tdd.dc_codigo_barra
          LEFT JOIN tb_familias fa ON fa.dn_correlativo = pr.dn_correlativo_familia
        WHERE LTRIM(RTRIM(ISNULL(tde.dc_codigo_centralizacion, ''))) = '0039'
          AND tde.df_fecha_emision >= @startDate
          AND tde.df_fecha_emision <= @endDate
          AND ISNULL(tdd.dn_cantidad, 0) > 0
          AND tdd.dc_codigo_barra IS NOT NULL
          AND tdd.dc_codigo_barra != ''
      `;
      if (familia && familia !== 'all') {
        query += ` AND fa.dn_correlativo = @familia`;
        params.familia = { value: parseInt(familia), type: sql.Int };
      }
      query += `
        GROUP BY fa.dg_glosa, tdd.dc_codigo_barra, tdd.dg_glosa_producto
        HAVING SUM(CAST(ISNULL(tdd.dn_cantidad, 0) AS FLOAT)) > 0
        ORDER BY rotation DESC
      `;
    }

    const products = await executeProductQuery(config, query, params);

    res.json({
      success: true,
      products
    });

  } catch (error) {
    console.error('❌ Error en getHighRotationProducts:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos con más rotación',
      error: error.message
    });
  }
};

// ✅ CONTROLADOR: Productos con menos rotación (CON SOPORTE FERRETERÍAS)
exports.getLowRotationProducts = async (req, res) => {
  try {
    const { familia, period = 'week', sucursal_id, limit = 50 } = req.query;

    const limitNumber = parseInt(limit) || 50;

    if (!sucursal_id) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID de la sucursal'
      });
    }

    const { sucursal, config } = await getSucursalConfig(sucursal_id);
    const { startDate, endDate } = calculateDates(period);
    const schema = await detectSchema(config, sucursal_id);

    const daysDiff = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));

    console.log('📊 Límite de productos (baja rotación):', limitNumber);

    let query;
    const params = {
      startDate: { value: startDate, type: sql.DateTime },
      endDate: { value: endDate, type: sql.DateTime }
    };

    if (schema === 'ERP_STD') {
      query = `
        SELECT TOP ${limitNumber}
          MP.MP_NOMBRE_PRODUCTO AS Descripcion,
          MP.MP_CODIGO_PRODUCTO AS 'Codigo Barra',
          MP.FAMI_ID_FAMILIA AS Familia,
          SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS FLOAT)) AS Cantidad,
          SUM(CAST(ISNULL(DBOL.DBOL_PRECIO_LISTA * DBOL.DBOL_CANTIDAD, 0) AS FLOAT)) AS 'P. Venta',
          (SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS FLOAT)) / ${daysDiff}) AS rotation
        FROM ERP_FACT_RES_BOLETAS RBO
          JOIN ERP_FACT_DET_BOLETAS DBOL ON DBOL.RBO_NUM_INTERNO_BO = RBO.RBO_NUM_INTERNO_BO
          JOIN ERP_MAESTRO_PRODUCTOS MP ON MP.MP_CODIGO_PRODUCTO = DBOL.MP_CODIGO_PRODUCTO
        WHERE RBO.RBO_FECHA_INGRESO BETWEEN @startDate AND @endDate
          AND DBOL.DBOL_CANTIDAD > 0
      `;
      if (familia && familia !== 'all') {
        query += ` AND MP.FAMI_ID_FAMILIA = @familia`;
        params.familia = { value: parseInt(familia), type: sql.Int };
      }
      query += `
        GROUP BY MP.MP_NOMBRE_PRODUCTO, MP.MP_CODIGO_PRODUCTO, MP.FAMI_ID_FAMILIA
        HAVING SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS FLOAT)) > 0
        ORDER BY rotation ASC
      `;
    } else if (schema === 'ERP_ALT') {
      query = `
        SELECT TOP ${limitNumber}
          MP.MP_DESCRIPCION_PRODUCTO AS Descripcion,
          MP.MP_CODIGO_PRODUCTO AS 'Codigo Barra',
          PF.FP_CODIGO AS Familia,
          SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS FLOAT)) AS Cantidad,
          SUM(CAST(ISNULL(DBOL.DBOL_PRECIO_LISTA * DBOL.DBOL_CANTIDAD, 0) AS FLOAT)) AS 'P. Venta',
          (SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS FLOAT)) / ${daysDiff}) AS rotation
        FROM ERP_FACT_RES_BOLETAS RBO
          JOIN ERP_FACT_DET_BOLETAS DBOL ON DBOL.RBO_NUM_INTERNO_BO = RBO.RBO_NUM_INTERNO_BO
          JOIN ERP_MAESTRO_PRODUCTOS MP ON MP.MP_CODIGO_PRODUCTO = DBOL.MP_CODIGO_PRODUCTO
          LEFT JOIN ERP_PRODUCTO_FAMILIA PF ON PF.MP_CODIGO_PRODUCTO = MP.MP_CODIGO_PRODUCTO
        WHERE RBO.RBO_FECHA_INGRESO BETWEEN @startDate AND @endDate
          AND DBOL.DBOL_CANTIDAD > 0
      `;
      if (familia && familia !== 'all') {
        query += ` AND PF.FP_CODIGO = @familia`;
        params.familia = { value: familia, type: sql.NVarChar };
      }
      query += `
        GROUP BY MP.MP_DESCRIPCION_PRODUCTO, MP.MP_CODIGO_PRODUCTO, PF.FP_CODIGO
        HAVING SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS FLOAT)) > 0
        ORDER BY rotation ASC
      `;
    } else {
      // QUERY PARA SUPERMERCADOS (mantener intacta)
      query = `
        SELECT TOP ${limitNumber}
          ISNULL(fa.dg_glosa, 'Sin Familia') AS Familia,
          tdd.dc_codigo_barra AS 'Codigo Barra',
          ISNULL(tdd.dg_glosa_producto, 'Sin Descripción') AS Descripcion,
          SUM(CAST(ISNULL(tdd.dn_cantidad, 0) AS FLOAT)) AS Cantidad,
          SUM(CAST(ISNULL(tdd.dq_bruto, 0) AS FLOAT)) AS 'P. Venta',
          (SUM(CAST(ISNULL(tdd.dn_cantidad, 0) AS FLOAT)) / ${daysDiff}) AS rotation
        FROM tb_documentos_encabezado tde
          INNER JOIN tb_documentos_detalle tdd ON tdd.dn_correlativo_documento = tde.dn_correlativo
          LEFT JOIN tb_productos pr ON pr.dc_codigo_barra = tdd.dc_codigo_barra
          LEFT JOIN tb_familias fa ON fa.dn_correlativo = pr.dn_correlativo_familia
        WHERE LTRIM(RTRIM(ISNULL(tde.dc_codigo_centralizacion, ''))) = '0039'
          AND tde.df_fecha_emision >= @startDate
          AND tde.df_fecha_emision <= @endDate
          AND ISNULL(tdd.dn_cantidad, 0) > 0
          AND tdd.dc_codigo_barra IS NOT NULL
          AND tdd.dc_codigo_barra != ''
      `;

      if (familia && familia !== 'all') {
        query += ` AND fa.dn_correlativo = @familia`;
        params.familia = { value: parseInt(familia), type: sql.Int };
      }

      query += `
        GROUP BY fa.dg_glosa, tdd.dc_codigo_barra, tdd.dg_glosa_producto
        HAVING SUM(CAST(ISNULL(tdd.dn_cantidad, 0) AS FLOAT)) > 0
        ORDER BY rotation ASC
      `;
    }

    const products = await executeProductQuery(config, query, params);

    res.json({
      success: true,
      products
    });

  } catch (error) {
    console.error('❌ Error en getLowRotationProducts:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos con menos rotación',
      error: error.message
    });
  }
};

// ✅ CONTROLADOR: Distribución por categorías (CON SOPORTE FERRETERÍAS)
exports.getCategoryDistribution = async (req, res) => {
  try {
    const { period = 'week', sucursal_id } = req.query;

    if (!sucursal_id) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID de la sucursal'
      });
    }

    const { sucursal, config } = await getSucursalConfig(sucursal_id);
    const { startDate, endDate } = calculateDates(period);
    const schema = await detectSchema(config, sucursal_id);

    let distQuery;
    if (schema === 'ERP_STD') {
      distQuery = `
        SELECT
          ISNULL(MF.FAMI_NOMBRE_FAMILIA, 'Sin Familia') AS categoria,
          COUNT(DISTINCT MP.MP_CODIGO_PRODUCTO) AS cantidad_productos,
          SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS INT)) AS total_vendido
        FROM ERP_FACT_RES_BOLETAS RBO
          JOIN ERP_FACT_DET_BOLETAS DBOL ON DBOL.RBO_NUM_INTERNO_BO = RBO.RBO_NUM_INTERNO_BO
          JOIN ERP_MAESTRO_PRODUCTOS MP ON MP.MP_CODIGO_PRODUCTO = DBOL.MP_CODIGO_PRODUCTO
          LEFT JOIN ERP_MAESTRO_FAMILIAS MF ON MF.FAMI_ID_FAMILIA = MP.FAMI_ID_FAMILIA
        WHERE RBO.RBO_FECHA_INGRESO BETWEEN @startDate AND @endDate
          AND DBOL.DBOL_CANTIDAD > 0
        GROUP BY MF.FAMI_NOMBRE_FAMILIA
        HAVING SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS INT)) > 0
        ORDER BY SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS INT)) DESC
      `;
    } else if (schema === 'ERP_ALT') {
      distQuery = `
        SELECT
          ISNULL(F.FP_DESCRIPCION, 'Sin Familia') AS categoria,
          COUNT(DISTINCT MP.MP_CODIGO_PRODUCTO) AS cantidad_productos,
          SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS INT)) AS total_vendido
        FROM ERP_FACT_RES_BOLETAS RBO
          JOIN ERP_FACT_DET_BOLETAS DBOL ON DBOL.RBO_NUM_INTERNO_BO = RBO.RBO_NUM_INTERNO_BO
          JOIN ERP_MAESTRO_PRODUCTOS MP ON MP.MP_CODIGO_PRODUCTO = DBOL.MP_CODIGO_PRODUCTO
          LEFT JOIN ERP_PRODUCTO_FAMILIA PF ON PF.MP_CODIGO_PRODUCTO = MP.MP_CODIGO_PRODUCTO
          LEFT JOIN ERP_FAMILIAS_PRODUCTOS F ON F.FP_CODIGO = PF.FP_CODIGO
        WHERE RBO.RBO_FECHA_INGRESO BETWEEN @startDate AND @endDate
          AND DBOL.DBOL_CANTIDAD > 0
        GROUP BY F.FP_DESCRIPCION
        HAVING SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS INT)) > 0
        ORDER BY SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS INT)) DESC
      `;
    } else {
      distQuery = `
        SELECT
          ISNULL(fa.dg_glosa, 'Sin Familia') AS categoria,
          COUNT(DISTINCT tdd.dc_codigo_barra) AS cantidad_productos,
          SUM(CAST(ISNULL(tdd.dn_cantidad, 0) AS INT)) AS total_vendido
        FROM tb_documentos_encabezado tde
          INNER JOIN tb_documentos_detalle tdd ON tdd.dn_correlativo_documento = tde.dn_correlativo
          LEFT JOIN tb_productos pr ON pr.dc_codigo_barra = tdd.dc_codigo_barra
          LEFT JOIN tb_familias fa ON fa.dn_correlativo = pr.dn_correlativo_familia
        WHERE LTRIM(RTRIM(ISNULL(tde.dc_codigo_centralizacion, ''))) = '0039'
          AND tde.df_fecha_emision >= @startDate
          AND tde.df_fecha_emision <= @endDate
          AND ISNULL(tdd.dn_cantidad, 0) > 0
        GROUP BY fa.dg_glosa
        HAVING SUM(CAST(ISNULL(tdd.dn_cantidad, 0) AS INT)) > 0
        ORDER BY SUM(CAST(ISNULL(tdd.dn_cantidad, 0) AS INT)) DESC
      `;
    }

    let poolSucursal = null;
    try {
      poolSucursal = await new sql.ConnectionPool(config).connect();
      const request = poolSucursal.request();
      request.input('startDate', sql.DateTime, startDate);
      request.input('endDate', sql.DateTime, endDate);
      const result = await request.query(distQuery);
      const distribution = result.recordset.map(item => ({
        name: item.categoria || 'Sin Categoría',
        value: parseInt(item.total_vendido) || 0,
        productos: parseInt(item.cantidad_productos) || 0
      }));
      res.json(distribution);
    } finally {
      if (poolSucursal) await poolSucursal.close();
    }

  } catch (error) {
    console.error('❌ Error en getCategoryDistribution:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener distribución por familias',
      error: error.message
    });
  }
};

// ✅ CONTROLADOR: Tendencia de ventas (CON SOPORTE FERRETERÍAS)
exports.getSalesTrend = async (req, res) => {
  try {
    const { period = 'week', familia, sucursal_id } = req.query;

    if (!sucursal_id) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID de la sucursal'
      });
    }

    const { sucursal, config } = await getSucursalConfig(sucursal_id);
    const { startDate, endDate } = calculateDates(period);
    const schema = await detectSchema(config, sucursal_id);

    let query;
    const params = {
      startDate: { value: startDate, type: sql.DateTime },
      endDate: { value: endDate, type: sql.DateTime }
    };

    if (schema === 'ERP_STD') {
      query = `
        SELECT
          CONVERT(DATE, RBO.RBO_FECHA_INGRESO) AS fecha,
          SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS INT)) AS cantidad,
          SUM(CAST(ISNULL(DBOL.DBOL_PRECIO_LISTA * DBOL.DBOL_CANTIDAD, 0) AS FLOAT)) AS monto
        FROM ERP_FACT_RES_BOLETAS RBO
          JOIN ERP_FACT_DET_BOLETAS DBOL ON DBOL.RBO_NUM_INTERNO_BO = RBO.RBO_NUM_INTERNO_BO
      `;
      if (familia && familia !== 'all') {
        query += `
          JOIN ERP_MAESTRO_PRODUCTOS MP ON MP.MP_CODIGO_PRODUCTO = DBOL.MP_CODIGO_PRODUCTO
        WHERE RBO.RBO_FECHA_INGRESO BETWEEN @startDate AND @endDate
          AND MP.FAMI_ID_FAMILIA = @familia
        `;
        params.familia = { value: parseInt(familia), type: sql.Int };
      } else {
        query += ` WHERE RBO.RBO_FECHA_INGRESO BETWEEN @startDate AND @endDate `;
      }
      query += `
        GROUP BY CONVERT(DATE, RBO.RBO_FECHA_INGRESO)
        ORDER BY CONVERT(DATE, RBO.RBO_FECHA_INGRESO)
      `;
    } else if (schema === 'ERP_ALT') {
      query = `
        SELECT
          CONVERT(DATE, RBO.RBO_FECHA_INGRESO) AS fecha,
          SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS INT)) AS cantidad,
          SUM(CAST(ISNULL(DBOL.DBOL_PRECIO_LISTA * DBOL.DBOL_CANTIDAD, 0) AS FLOAT)) AS monto
        FROM ERP_FACT_RES_BOLETAS RBO
          JOIN ERP_FACT_DET_BOLETAS DBOL ON DBOL.RBO_NUM_INTERNO_BO = RBO.RBO_NUM_INTERNO_BO
      `;
      if (familia && familia !== 'all') {
        query += `
          JOIN ERP_MAESTRO_PRODUCTOS MP ON MP.MP_CODIGO_PRODUCTO = DBOL.MP_CODIGO_PRODUCTO
          JOIN ERP_PRODUCTO_FAMILIA PF ON PF.MP_CODIGO_PRODUCTO = MP.MP_CODIGO_PRODUCTO
        WHERE RBO.RBO_FECHA_INGRESO BETWEEN @startDate AND @endDate
          AND PF.FP_CODIGO = @familia
        `;
        params.familia = { value: familia, type: sql.NVarChar };
      } else {
        query += ` WHERE RBO.RBO_FECHA_INGRESO BETWEEN @startDate AND @endDate `;
      }
      query += `
        GROUP BY CONVERT(DATE, RBO.RBO_FECHA_INGRESO)
        ORDER BY CONVERT(DATE, RBO.RBO_FECHA_INGRESO)
      `;
    } else {
      // QUERY PARA SUPERMERCADOS (mantener intacta)
      query = `
        SELECT
          CONVERT(DATE, tde.df_fecha_emision) AS fecha,
          SUM(CAST(ISNULL(tdd.dn_cantidad, 0) AS INT)) AS cantidad,
          SUM(CAST(ISNULL(tdd.dq_bruto, 0) AS FLOAT)) AS monto
        FROM tb_documentos_encabezado tde
          INNER JOIN tb_documentos_detalle tdd ON tdd.dn_correlativo_documento = tde.dn_correlativo
      `;

      if (familia && familia !== 'all') {
        query += `
          LEFT JOIN tb_productos pr ON pr.dc_codigo_barra = tdd.dc_codigo_barra
          LEFT JOIN tb_familias fa ON fa.dn_correlativo = pr.dn_correlativo_familia
        WHERE LTRIM(RTRIM(ISNULL(tde.dc_codigo_centralizacion, ''))) = '0039'
          AND tde.df_fecha_emision >= @startDate
          AND tde.df_fecha_emision <= @endDate
          AND fa.dn_correlativo = @familia
        `;
        params.familia = { value: parseInt(familia), type: sql.Int };
      } else {
        query += `
        WHERE LTRIM(RTRIM(ISNULL(tde.dc_codigo_centralizacion, ''))) = '0039'
          AND tde.df_fecha_emision >= @startDate
          AND tde.df_fecha_emision <= @endDate
        `;
      }

      query += `
        GROUP BY CONVERT(DATE, tde.df_fecha_emision)
        ORDER BY CONVERT(DATE, tde.df_fecha_emision)
      `;
    }

    let poolSucursal = null;

    try {
      poolSucursal = await new sql.ConnectionPool(config).connect();
      const request = poolSucursal.request();

      Object.entries(params).forEach(([key, param]) => {
        request.input(key, param.type, param.value);
      });

      const result = await request.query(query);

      // Formatear datos para el frontend
      const trend = result.recordset.map(item => ({
        name: new Date(item.fecha).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }),
        ventas: parseFloat(item.monto) || 0,
        cantidad: parseInt(item.cantidad) || 0,
        fecha: item.fecha
      }));

      res.json(trend);

    } finally {
      if (poolSucursal) {
        await poolSucursal.close();
      }
    }

  } catch (error) {
    console.error('❌ Error en getSalesTrend:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tendencia de ventas',
      error: error.message
    });
  }
};

// ✅ CONTROLADOR: Diagnóstico del sistema (SIMPLIFICADO)
exports.getDiagnostic = async (req, res) => {
  try {
    const { sucursal_id, type = 'basic' } = req.query;
    
    if (!sucursal_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requiere el ID de la sucursal' 
      });
    }

    const { sucursal } = await getSucursalConfig(sucursal_id);
    
    res.json({
      success: true,
      sucursal: {
        id: sucursal.id,
        nombre: sucursal.nombre,
        tipo: sucursal.tipo_sucursal
      },
      diagnostic: {
        status: 'Conexión básica OK',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error en getDiagnostic:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener diagnóstico',
      error: error.message
    });
  }
};

// ✅ CONTROLADOR: Resumen de ventas (SIMPLIFICADO)
exports.getSalesSummary = async (req, res) => {
  try {
    const { period = 'week', sucursal_id } = req.query;
    
    if (!sucursal_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requiere el ID de la sucursal' 
      });
    }

    const { sucursal } = await getSucursalConfig(sucursal_id);
    const { startDate, endDate } = calculateDates(period);
    
    // Datos mock por ahora
    res.json({
      success: true,
      period: { startDate, endDate },
      summary: {
        total_productos: 150,
        total_unidades: 2500,
        total_ingresos: 450000,
        total_transacciones: 320
      },
      sucursal: sucursal.nombre
    });

  } catch (error) {
    console.error('❌ Error en getSalesSummary:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener resumen de ventas',
      error: error.message
    });
  }
};