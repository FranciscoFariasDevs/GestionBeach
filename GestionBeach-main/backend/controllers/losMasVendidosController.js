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

// ✅ CONTROLADOR: Obtener familias (SIMPLIFICADO)
exports.getFamilias = async (req, res) => {
  try {
    console.log('🔍 === GET FAMILIAS INICIADO ===');
    const { sucursal_id } = req.query;
    
    if (!sucursal_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requiere el ID de la sucursal' 
      });
    }

    // ✅ PASO 1: Verificar sucursal en BD principal
    const pool = await poolPromise;
    const sucursalResult = await pool.request()
      .input('sucursalId', sql.Int, sucursal_id)
      .query('SELECT * FROM sucursales WHERE id = @sucursalId');

    if (sucursalResult.recordset.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Sucursal no encontrada'
      });
    }

    const sucursal = sucursalResult.recordset[0];
    console.log('✅ Procesando familias para:', sucursal.nombre);

    // ✅ PASO 2: Conectar a BD de la sucursal
    const config = {
      user: sucursal.usuario,
      password: sucursal.contrasena,
      server: sucursal.ip,
      port: sucursal.puerto,
      database: sucursal.base_datos,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        requestTimeout: 30000,
        enableArithAbort: true
      }
    };

    let poolSucursal = null;
    
    try {
      console.log('🔗 Conectando a BD de sucursal...');
      poolSucursal = await new sql.ConnectionPool(config).connect();
      console.log('✅ Conexión a BD sucursal establecida');
      
      const query = `
        SELECT 
          dn_correlativo AS id,
          ISNULL(LTRIM(RTRIM(dg_glosa)), 'Sin Nombre') AS nombre
        
        FROM tb_familias
        WHERE dg_glosa IS NOT NULL 
          AND LTRIM(RTRIM(dg_glosa)) != ''
        ORDER BY dg_glosa
      `;
      
      const result = await poolSucursal.request().query(query);
      
      console.log('📋 Familias encontradas:', result.recordset.length);
      
      res.json(result.recordset);
      
    } finally {
      if (poolSucursal) {
        await poolSucursal.close();
        console.log('🔐 Conexión BD sucursal cerrada');
      }
    }

  } catch (error) {
    console.error('❌ Error en getFamilias:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener familias',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

  // ✅ CONTROLADOR: Productos más vendidos (CON SOPORTE PARA LÍMITE)
exports.getTopProducts = async (req, res) => {
  try {
    console.log('🔍 === GET TOP PRODUCTS INICIADO ===');
    const { familia, period = 'week', sucursal_id, limit = 50 } = req.query;

    console.log('📋 Parámetros recibidos:', { familia, period, sucursal_id, limit });

    if (!sucursal_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requiere el ID de la sucursal' 
      });
    }

    // ✅ PASO 1: Obtener configuración de sucursal
    const { sucursal, config } = await getSucursalConfig(sucursal_id);
    const { startDate, endDate } = calculateDates(period);
    
    console.log('📅 Período calculado:', { startDate, endDate });
    console.log('🏢 Sucursal:', sucursal.nombre);
    console.log('📊 Límite de productos:', limit);
    
    // ✅ PASO 2: Query con límite dinámico
    let query = `
      SELECT TOP ${parseInt(limit) || 50}
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
    
    const params = {
      startDate: { value: startDate, type: sql.DateTime },
      endDate: { value: endDate, type: sql.DateTime }
    };
    
    if (familia && familia !== 'all') {
      query += ` AND ISNULL(fa.dg_glosa, '') = @familia`;
      params.familia = { value: familia, type: sql.NVarChar };
    }
    
    query += `
      GROUP BY fa.dg_glosa, tdd.dc_codigo_barra, tdd.dg_glosa_producto
      HAVING SUM(CAST(ISNULL(tdd.dn_cantidad, 0) AS INT)) > 0
      ORDER BY SUM(CAST(ISNULL(tdd.dn_cantidad, 0) AS INT)) DESC
    `;

    const products = await executeProductQuery(config, query, params);
    
    res.json({
      success: true,
      products,
      periodo: { startDate, endDate },
      total_encontrados: products.length,
      sucursal: sucursal.nombre
    });

  } catch (error) {
    console.error('❌ Error en getTopProducts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener productos más vendidos',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// ✅ CONTROLADOR: Productos menos vendidos (CON LÍMITE)
exports.getLeastSoldProducts = async (req, res) => {
  try {
    const { familia, period = 'week', sucursal_id, limit = 50 } = req.query;

    if (!sucursal_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requiere el ID de la sucursal' 
      });
    }

    const { sucursal, config } = await getSucursalConfig(sucursal_id);
    const { startDate, endDate } = calculateDates(period);
    
    let query = `
      SELECT TOP ${parseInt(limit) || 50}
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
    
    const params = {
      startDate: { value: startDate, type: sql.DateTime },
      endDate: { value: endDate, type: sql.DateTime }
    };
    
    if (familia && familia !== 'all') {
      query += ` AND ISNULL(fa.dg_glosa, '') = @familia`;
      params.familia = { value: familia, type: sql.NVarChar };
    }
    
    query += `
      GROUP BY fa.dg_glosa, tdd.dc_codigo_barra, tdd.dg_glosa_producto
      HAVING SUM(CAST(ISNULL(tdd.dn_cantidad, 0) AS INT)) > 0
      ORDER BY SUM(CAST(ISNULL(tdd.dn_cantidad, 0) AS INT)) ASC
    `;

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

// ✅ CONTROLADOR: Productos con más rotación (CON LÍMITE)
exports.getHighRotationProducts = async (req, res) => {
  try {
    const { familia, period = 'week', sucursal_id, limit = 50 } = req.query;

    if (!sucursal_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requiere el ID de la sucursal' 
      });
    }

    const { sucursal, config } = await getSucursalConfig(sucursal_id);
    const { startDate, endDate } = calculateDates(period);
    
    const daysDiff = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
    
    let query = `
      SELECT TOP ${parseInt(limit) || 50}
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
    
    const params = {
      startDate: { value: startDate, type: sql.DateTime },
      endDate: { value: endDate, type: sql.DateTime }
    };
    
    if (familia && familia !== 'all') {
      query += ` AND ISNULL(fa.dg_glosa, '') = @familia`;
      params.familia = { value: familia, type: sql.NVarChar };
    }
    
    query += `
      GROUP BY fa.dg_glosa, tdd.dc_codigo_barra, tdd.dg_glosa_producto
      HAVING SUM(CAST(ISNULL(tdd.dn_cantidad, 0) AS FLOAT)) > 0
      ORDER BY rotation DESC
    `;

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

// ✅ CONTROLADOR: Productos con menos rotación (CON LÍMITE)
exports.getLowRotationProducts = async (req, res) => {
  try {
    const { familia, period = 'week', sucursal_id, limit = 50 } = req.query;

    if (!sucursal_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requiere el ID de la sucursal' 
      });
    }

    const { sucursal, config } = await getSucursalConfig(sucursal_id);
    const { startDate, endDate } = calculateDates(period);
    
    const daysDiff = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
    
    let query = `
      SELECT TOP ${parseInt(limit) || 50}
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
    
    const params = {
      startDate: { value: startDate, type: sql.DateTime },
      endDate: { value: endDate, type: sql.DateTime }
    };
    
    if (familia && familia !== 'all') {
      query += ` AND ISNULL(fa.dg_glosa, '') = @familia`;
      params.familia = { value: familia, type: sql.NVarChar };
    }
    
    query += `
      GROUP BY fa.dg_glosa, tdd.dc_codigo_barra, tdd.dg_glosa_producto
      HAVING SUM(CAST(ISNULL(tdd.dn_cantidad, 0) AS FLOAT)) > 0
      ORDER BY rotation ASC
    `;

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

// ✅ CONTROLADOR: Distribución por categorías (SIMPLIFICADO)
exports.getCategoryDistribution = async (req, res) => {
  try {
    const { period = 'week', sucursal_id } = req.query;
    
    if (!sucursal_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requiere el ID de la sucursal' 
      });
    }

    // Por ahora devolvemos datos mock para evitar errores
    const mockData = [
      { name: 'Bebidas', value: 25.5 },
      { name: 'Lácteos', value: 18.3 },
      { name: 'Panadería', value: 15.2 },
      { name: 'Carnes', value: 12.8 },
      { name: 'Frutas y Verduras', value: 11.1 },
      { name: 'Limpieza', value: 9.7 },
      { name: 'Otros', value: 7.4 }
    ];
    
    res.json(mockData);

  } catch (error) {
    console.error('❌ Error en getCategoryDistribution:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener distribución por familias',
      error: error.message
    });
  }
};

// ✅ CONTROLADOR: Tendencia de ventas (SIMPLIFICADO)
exports.getSalesTrend = async (req, res) => {
  try {
    const { period = 'week', familia, sucursal_id } = req.query;
    
    if (!sucursal_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requiere el ID de la sucursal' 
      });
    }

    // Por ahora devolvemos datos mock para evitar errores
    const mockData = [
      { name: 'Lun', ventas: 45000 },
      { name: 'Mar', ventas: 52000 },
      { name: 'Mié', ventas: 48000 },
      { name: 'Jue', ventas: 61000 },
      { name: 'Vie', ventas: 55000 },
      { name: 'Sáb', ventas: 67000 },
      { name: 'Dom', ventas: 43000 }
    ];
    
    res.json(mockData);

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