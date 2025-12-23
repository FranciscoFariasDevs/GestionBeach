// routes/facturaXMLRoutes.js - RUTAS OPTIMIZADAS CON FILTROS DE FECHA
const express = require('express');
const router = express.Router();
const facturaXMLController = require('../controllers/facturaXMLController');
const authMiddleware = require('../middleware/authMiddleware');

// ==================== RUTAS ESPECÍFICAS PRIMERO (ANTES DE PARÁMETROS) ====================

// 🔧 CRÍTICO: Test de conexión (público para debugging)
router.get('/test', facturaXMLController.test);

// ==================== INFORMACIÓN DE EMPRESA ====================

// 🏢 OBTENER INFORMACIÓN DE LA EMPRESA (NUEVO)
// Frontend llama: api.get('/facturas-xml/empresa/info')
router.get('/empresa/info', authMiddleware, facturaXMLController.obtenerInformacionEmpresa);

// ==================== FACTURAS PENDIENTES (CON FILTROS OPTIMIZADOS) ====================

// 🔧 CRÍTICO: RUTAS ESPECÍFICAS DEBEN IR ANTES QUE /:id
// Frontend llama: api.get('/facturas-xml/pendientes') CON PARÁMETROS DE FILTRO
// Parámetros: ?page=1&limit=1000&fecha_desde=2024-01-01&fecha_hasta=2024-12-31&search=texto
router.get('/pendientes', authMiddleware, facturaXMLController.obtenerFacturasPendientes);

// 🔄 DETALLES DE FACTURA PENDIENTE
// Frontend llama: api.get('/facturas-xml/pendientes/${id}')
router.get('/pendientes/:id', authMiddleware, facturaXMLController.obtenerDetalleFacturaPendiente);

// ==================== ESTADÍSTICAS (CON FILTROS OPTIMIZADAS) ====================

// 📊 ESTADÍSTICAS CON FILTROS DE FECHA
// Frontend llama: api.get('/facturas-xml/estadisticas') CON PARÁMETROS
// Parámetros: ?fecha_desde=2024-01-01&fecha_hasta=2024-12-31&search=texto
router.get('/estadisticas', authMiddleware, facturaXMLController.estadisticas);

// ==================== CONFIGURACIÓN DEL SISTEMA ====================

// 🏢 OBTENER SUCURSALES DEL USUARIO (REQUERIDO POR FRONTEND)
// Frontend llama: api.get('/facturas-xml/lista/sucursales')
router.get('/lista/sucursales', authMiddleware, facturaXMLController.obtenerSucursalesUsuario);

// 🏭 OBTENER CENTROS DE COSTOS ACTIVOS
// Frontend llama: api.get('/facturas-xml/centros-costos/activos')
router.get('/centros-costos/activos', authMiddleware, facturaXMLController.obtenerCentrosCostos);

// ==================== BÚSQUEDA Y FILTROS ====================

// Buscar facturas con criterios múltiples (IMPLEMENTACIÓN BÁSICA)
router.get('/buscar/facturas', authMiddleware, (req, res) => {
  // Redirigir a la función principal con filtros
  res.json({
    success: true,
    message: 'Usar los filtros en /facturas-xml/pendientes o /facturas-xml/ con parámetros de fecha y búsqueda',
    redirect_to: {
      pendientes: '/facturas-xml/pendientes?fecha_desde=YYYY-MM-DD&fecha_hasta=YYYY-MM-DD&search=texto',
      procesadas: '/facturas-xml/?fecha_desde=YYYY-MM-DD&fecha_hasta=YYYY-MM-DD&search=texto'
    }
  });
});

// Obtener proveedores únicos desde TB_FACTURA_ENCABEZADO CON FILTROS
router.get('/lista/proveedores', authMiddleware, async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, search } = req.query;
    const { sql, poolPromise } = require('../config/db');
    const pool = await poolPromise;
    
    console.log('📋 Obteniendo proveedores con filtros:', { fecha_desde, fecha_hasta, search });
    
    // Construir filtros
    let whereClause = 'WHERE RUT_EMISOR IS NOT NULL AND RZN_EMISOR IS NOT NULL';
    let parameters = [];
    
    if (fecha_desde) {
      whereClause += ' AND FECHA_EMISION >= @fecha_desde';
      parameters.push({ name: 'fecha_desde', type: sql.Date, value: new Date(fecha_desde) });
    }
    
    if (fecha_hasta) {
      whereClause += ' AND FECHA_EMISION <= @fecha_hasta';
      parameters.push({ name: 'fecha_hasta', type: sql.Date, value: new Date(fecha_hasta) });
    }
    
    if (search && search.trim()) {
      whereClause += ' AND (RUT_EMISOR LIKE @busqueda OR RZN_EMISOR LIKE @busqueda)';
      parameters.push({ name: 'busqueda', type: sql.VarChar, value: `%${search.trim()}%` });
    }
    
    const query = `
      SELECT DISTINCT
        RUT_EMISOR as emisor_rut,
        RZN_EMISOR as emisor_razon_social,
        COUNT(*) as total_facturas,
        SUM(MONTO_TOTAL) as monto_total_acumulado,
        MAX(FECHA_EMISION) as ultima_factura,
        MIN(FECHA_EMISION) as primera_factura
      FROM TB_FACTURA_ENCABEZADO
      ${whereClause}
      GROUP BY RUT_EMISOR, RZN_EMISOR
      ORDER BY total_facturas DESC, monto_total_acumulado DESC
    `;
    
    let request = pool.request();
    parameters.forEach(param => {
      request = request.input(param.name, param.type, param.value);
    });
    
    const result = await request.query(query);
    
    const filtrosAplicados = [];
    if (fecha_desde) filtrosAplicados.push(`desde ${fecha_desde}`);
    if (fecha_hasta) filtrosAplicados.push(`hasta ${fecha_hasta}`);
    if (search) filtrosAplicados.push(`texto "${search}"`);
    
    const mensajeFiltros = filtrosAplicados.length > 0 
      ? ` (filtros: ${filtrosAplicados.join(', ')})` 
      : '';
    
    console.log(`✅ ${result.recordset.length} proveedores encontrados${mensajeFiltros}`);
    
    return res.json({
      success: true,
      data: result.recordset,
      filtros_aplicados: {
        fecha_desde: fecha_desde || null,
        fecha_hasta: fecha_hasta || null,
        busqueda: search || null
      },
      message: `${result.recordset.length} proveedores encontrados${mensajeFiltros}`
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo proveedores:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener proveedores: ' + error.message,
      error: error.message
    });
  }
});

// Obtener tipos de documento desde TB_FACTURA_ENCABEZADO CON FILTROS
router.get('/lista/tipos-documento', authMiddleware, async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta } = req.query;
    const { sql, poolPromise } = require('../config/db');
    const pool = await poolPromise;
    
    console.log('📋 Obteniendo tipos de documento con filtros:', { fecha_desde, fecha_hasta });
    
    // Construir filtros
    let whereClause = '';
    let parameters = [];
    
    if (fecha_desde || fecha_hasta) {
      const conditions = [];
      
      if (fecha_desde) {
        conditions.push('FECHA_EMISION >= @fecha_desde');
        parameters.push({ name: 'fecha_desde', type: sql.Date, value: new Date(fecha_desde) });
      }
      
      if (fecha_hasta) {
        conditions.push('FECHA_EMISION <= @fecha_hasta');
        parameters.push({ name: 'fecha_hasta', type: sql.Date, value: new Date(fecha_hasta) });
      }
      
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
    }
    
    // Como TB_FACTURA_ENCABEZADO no tiene campo tipo_documento, 
    // asumimos que todas son Facturas Electrónicas
    const query = `
      SELECT 
        'Factura Electrónica' as tipo_documento,
        COUNT(*) as cantidad,
        SUM(MONTO_TOTAL) as monto_total,
        MIN(FECHA_EMISION) as fecha_desde,
        MAX(FECHA_EMISION) as fecha_hasta
      FROM TB_FACTURA_ENCABEZADO
      ${whereClause}
      GROUP BY 'Factura Electrónica'
      ORDER BY cantidad DESC
    `;
    
    let request = pool.request();
    parameters.forEach(param => {
      request = request.input(param.name, param.type, param.value);
    });
    
    const result = await request.query(query);
    
    const filtrosAplicados = [];
    if (fecha_desde) filtrosAplicados.push(`desde ${fecha_desde}`);
    if (fecha_hasta) filtrosAplicados.push(`hasta ${fecha_hasta}`);
    
    const mensajeFiltros = filtrosAplicados.length > 0 
      ? ` (filtros: ${filtrosAplicados.join(', ')})` 
      : '';
    
    console.log(`✅ ${result.recordset.length} tipos de documento encontrados${mensajeFiltros}`);
    
    return res.json({
      success: true,
      data: result.recordset,
      filtros_aplicados: {
        fecha_desde: fecha_desde || null,
        fecha_hasta: fecha_hasta || null
      },
      message: `${result.recordset.length} tipos de documento encontrados${mensajeFiltros}`
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo tipos de documento:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener tipos de documento: ' + error.message,
      error: error.message
    });
  }
});

// ==================== REPORTES CON FILTROS DE FECHA ====================

// Reporte por centro de costos CON FILTROS DE FECHA OPTIMIZADO
router.get('/reportes/centro-costos', authMiddleware, async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, centro_costo } = req.query;
    const { sql, poolPromise } = require('../config/db');
    const pool = await poolPromise;
    
    console.log('📊 Generando reporte por centro de costos con filtros:', { fecha_desde, fecha_hasta, centro_costo });
    
    // Validar que al menos venga un filtro
    if (!fecha_desde && !fecha_hasta && !centro_costo) {
      return res.json({
        success: true,
        data: [],
        message: 'Aplica filtros de fecha o centro de costo para generar el reporte',
        optimizacion: true
      });
    }
    
    let whereClause = 'WHERE fe.estado = \'PROCESADA\'';
    let parameters = [];
    
    if (fecha_desde) {
      whereClause += ' AND fe.FECHA_EMISION >= @fecha_desde';
      parameters.push({ name: 'fecha_desde', type: sql.Date, value: new Date(fecha_desde) });
    }
    
    if (fecha_hasta) {
      whereClause += ' AND fe.FECHA_EMISION <= @fecha_hasta';
      parameters.push({ name: 'fecha_hasta', type: sql.Date, value: new Date(fecha_hasta) });
    }
    
    if (centro_costo) {
      whereClause += ' AND fe.id_centro_costo = @centro_costo';
      parameters.push({ name: 'centro_costo', type: sql.VarChar(10), value: centro_costo });
    }
    
    let query = `
      SELECT 
        fe.id_centro_costo as centro_id,
        ISNULL(cc.nombre, fe.id_centro_costo) as centro_nombre,
        ISNULL(cc.descripcion, 'Sin descripción') as centro_descripcion,
        COUNT(fe.ID) as total_facturas,
        SUM(fe.MONTO_NETO) as monto_neto_total,
        SUM(fe.IVA) as monto_iva_total,
        SUM(fe.MONTO_TOTAL) as monto_total_acumulado,
        AVG(fe.MONTO_TOTAL) as promedio_factura,
        MIN(fe.FECHA_EMISION) as primera_factura,
        MAX(fe.FECHA_EMISION) as ultima_factura,
        COUNT(DISTINCT fe.RUT_EMISOR) as proveedores_unicos
      FROM TB_FACTURA_ENCABEZADO fe
      LEFT JOIN centros_costos cc ON fe.id_centro_costo = cc.id
      ${whereClause} AND fe.id_centro_costo IS NOT NULL
      GROUP BY fe.id_centro_costo, cc.nombre, cc.descripcion
      ORDER BY monto_total_acumulado DESC
    `;
    
    let request = pool.request();
    parameters.forEach(param => {
      request = request.input(param.name, param.type, param.value);
    });
    
    const result = await request.query(query);
    
    const filtrosAplicados = [];
    if (fecha_desde) filtrosAplicados.push(`desde ${fecha_desde}`);
    if (fecha_hasta) filtrosAplicados.push(`hasta ${fecha_hasta}`);
    if (centro_costo) filtrosAplicados.push(`centro ${centro_costo}`);
    
    const mensajeFiltros = filtrosAplicados.length > 0 
      ? ` (filtros: ${filtrosAplicados.join(', ')})` 
      : '';
    
    console.log(`✅ Reporte por centro de costos generado${mensajeFiltros}`);
    
    return res.json({
      success: true,
      data: result.recordset,
      filtros_aplicados: {
        fecha_desde: fecha_desde || null,
        fecha_hasta: fecha_hasta || null,
        centro_costo: centro_costo || null
      },
      message: `Reporte por centro de costos generado${mensajeFiltros}`
    });
    
  } catch (error) {
    console.error('❌ Error en reporte por centro de costos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al generar reporte por centro de costos: ' + error.message,
      error: error.message
    });
  }
});

// Reporte de proveedores CON FILTROS DE FECHA OPTIMIZADO
router.get('/reportes/proveedores', authMiddleware, async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, centro_costo, proveedor_rut } = req.query;
    const { sql, poolPromise } = require('../config/db');
    const pool = await poolPromise;
    
    console.log('📊 Generando reporte de proveedores con filtros:', { fecha_desde, fecha_hasta, centro_costo, proveedor_rut });
    
    // Validar que al menos venga un filtro
    if (!fecha_desde && !fecha_hasta && !centro_costo && !proveedor_rut) {
      return res.json({
        success: true,
        data: [],
        message: 'Aplica filtros de fecha, centro de costo o proveedor para generar el reporte',
        optimizacion: true
      });
    }
    
    let whereClause = 'WHERE 1=1';
    let parameters = [];
    
    if (fecha_desde) {
      whereClause += ' AND fe.FECHA_EMISION >= @fecha_desde';
      parameters.push({ name: 'fecha_desde', type: sql.Date, value: new Date(fecha_desde) });
    }
    
    if (fecha_hasta) {
      whereClause += ' AND fe.FECHA_EMISION <= @fecha_hasta';
      parameters.push({ name: 'fecha_hasta', type: sql.Date, value: new Date(fecha_hasta) });
    }
    
    if (centro_costo) {
      whereClause += ' AND fe.id_centro_costo = @centro_costo';
      parameters.push({ name: 'centro_costo', type: sql.VarChar(10), value: centro_costo });
    }
    
    if (proveedor_rut) {
      whereClause += ' AND fe.RUT_EMISOR = @proveedor_rut';
      parameters.push({ name: 'proveedor_rut', type: sql.VarChar(20), value: proveedor_rut });
    }
    
    let query = `
      SELECT 
        fe.RUT_EMISOR as emisor_rut,
        fe.RZN_EMISOR as emisor_razon_social,
        'Comercial' as emisor_giro,
        COUNT(fe.ID) as total_facturas,
        SUM(fe.MONTO_NETO) as monto_neto_total,
        SUM(fe.IVA) as monto_iva_total,
        SUM(fe.MONTO_TOTAL) as monto_total_acumulado,
        AVG(fe.MONTO_TOTAL) as promedio_factura,
        MIN(fe.FECHA_EMISION) as primera_factura,
        MAX(fe.FECHA_EMISION) as ultima_factura,
        '' as centros_costos_utilizados,
        COUNT(CASE WHEN fe.estado = 'PROCESADA' THEN 1 END) as facturas_procesadas,
        COUNT(CASE WHEN ISNULL(fe.estado, 'PENDIENTE') = 'PENDIENTE' THEN 1 END) as facturas_pendientes
      FROM TB_FACTURA_ENCABEZADO fe
      ${whereClause}
      GROUP BY fe.RUT_EMISOR, fe.RZN_EMISOR
      ORDER BY monto_total_acumulado DESC
    `;
    
    let request = pool.request();
    parameters.forEach(param => {
      request = request.input(param.name, param.type, param.value);
    });
    
    const result = await request.query(query);
    
    const filtrosAplicados = [];
    if (fecha_desde) filtrosAplicados.push(`desde ${fecha_desde}`);
    if (fecha_hasta) filtrosAplicados.push(`hasta ${fecha_hasta}`);
    if (centro_costo) filtrosAplicados.push(`centro ${centro_costo}`);
    if (proveedor_rut) filtrosAplicados.push(`proveedor ${proveedor_rut}`);
    
    const mensajeFiltros = filtrosAplicados.length > 0 
      ? ` (filtros: ${filtrosAplicados.join(', ')})` 
      : '';
    
    console.log(`✅ Reporte de proveedores generado${mensajeFiltros}`);
    
    return res.json({
      success: true,
      data: result.recordset,
      filtros_aplicados: {
        fecha_desde: fecha_desde || null,
        fecha_hasta: fecha_hasta || null,
        centro_costo: centro_costo || null,
        proveedor_rut: proveedor_rut || null
      },
      message: `Reporte de proveedores generado${mensajeFiltros}`
    });
    
  } catch (error) {
    console.error('❌ Error en reporte de proveedores:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al generar reporte de proveedores: ' + error.message,
      error: error.message
    });
  }
});

// Estadísticas por reportes (ruta alternativa) - CON FILTROS
router.get('/reportes/estadisticas', authMiddleware, facturaXMLController.estadisticas);

// ==================== DETALLES Y DOCUMENTOS ====================

// Obtener detalles/productos de una factura desde TB_FACTURA_DETALLE
router.get('/:id/detalles', authMiddleware, async (req, res) => {
  try {
    const facturaId = parseInt(req.params.id);
    
    if (isNaN(facturaId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de factura debe ser un número válido'
      });
    }
    
    const { sql, poolPromise } = require('../config/db');
    const pool = await poolPromise;
    
    console.log(`📋 Obteniendo detalles de factura ID: ${facturaId}`);
    
    // Obtener datos principales de la factura
    const facturaResult = await pool.request()
      .input('id', sql.Int, facturaId)
      .query(`
        SELECT 
          f.*,
          ISNULL(s.nombre, 'Sucursal no encontrada') as sucursal_nombre,
          ISNULL(s.tipo_sucursal, 'N/A') as tipo_sucursal,
          ISNULL(cc.nombre, 'Centro no encontrado') as centro_costo_nombre,
          ISNULL(cc.descripcion, 'Sin descripción') as centro_costo_descripcion
        FROM TB_FACTURA_ENCABEZADO f
        LEFT JOIN sucursales s ON f.id_sucursal = s.id
        LEFT JOIN centros_costos cc ON f.id_centro_costo = cc.id
        WHERE f.ID = @id
      `);
    
    if (facturaResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }
    
    // Obtener productos/servicios desde TB_FACTURA_DETALLE
    const productosResult = await pool.request()
      .input('facturaId', sql.Int, facturaId)
      .query(`
        SELECT * 
        FROM TB_FACTURA_DETALLE 
        WHERE ID_FACTURA = @facturaId 
        ORDER BY ID
      `);
    
    const factura = facturaResult.recordset[0];
    
    // Formatear RUTs
    const formatearRUT = (rut) => {
      if (!rut) return '';
      const cleanRut = rut.replace(/[.-]/g, '');
      if (cleanRut.length < 2) return rut;
      
      const body = cleanRut.slice(0, -1);
      const verifier = cleanRut.slice(-1);
      const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return `${formattedBody}-${verifier}`;
    };
    
    factura.RUT_EMISOR = formatearRUT(factura.RUT_EMISOR);
    factura.RUT_RECEPTOR = formatearRUT(factura.RUT_RECEPTOR);
    
    console.log(`✅ Detalles de factura ${factura.FOLIO} obtenidos - ${productosResult.recordset.length} productos`);
    
    return res.json({
      success: true,
      data: {
        ...factura,
        productos: productosResult.recordset,
        resumen: {
          total_productos: productosResult.recordset.length,
          validaciones: {
            rut_emisor_valido: factura.RUT_EMISOR && factura.RUT_EMISOR.length >= 8,
            rut_receptor_valido: factura.RUT_RECEPTOR && factura.RUT_RECEPTOR.length >= 8,
            monto_coherente: factura.MONTO_TOTAL > 0,
            tiene_centro_costo: !!factura.id_centro_costo,
            tiene_sucursal: !!factura.id_sucursal,
            esta_procesada: factura.estado === 'PROCESADA'
          }
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo detalles de factura:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener detalles de factura: ' + error.message,
      error: error.message
    });
  }
});

// Timbre electrónico (no disponible en TB_FACTURA_ENCABEZADO)
router.get('/:id/timbre', authMiddleware, (req, res) => {
  return res.status(404).json({
    success: false,
    message: 'Timbre electrónico no disponible en el sistema actual',
    nota: 'Esta funcionalidad requiere tabla facturas_xml_timbres',
    alternativa: 'Usar endpoint /:id/detalles para obtener información completa de la factura'
  });
});

// XML original (no disponible en TB_FACTURA_ENCABEZADO)
router.get('/:id/xml-original', authMiddleware, (req, res) => {
  return res.status(404).json({
    success: false,
    message: 'XML original no disponible en el sistema actual',
    nota: 'Esta funcionalidad requiere columna xml_content en facturas_xml',
    alternativa: 'Usar endpoint /:id/detalles para obtener información estructurada de la factura'
  });
});

// ==================== RUTAS PRINCIPALES (DESPUÉS DE RUTAS ESPECÍFICAS) ====================

// FUNCIÓN OPTIMIZADA: Obtener todas las facturas procesadas CON FILTROS DE FECHA
// Frontend llama: api.get('/facturas-xml/') CON PARÁMETROS
// Parámetros: ?page=1&limit=1000&fecha_desde=2024-01-01&fecha_hasta=2024-12-31&search=texto
router.get('/', authMiddleware, facturaXMLController.obtenerFacturas);

// 🔧 CRÍTICO: Esta ruta DEBE ir AL FINAL para evitar conflictos
// Obtener factura específica por ID
router.get('/:id', authMiddleware, facturaXMLController.obtenerFacturaPorId);

// ==================== RUTAS POST/PUT/DELETE ====================

// PROCESAMIENTO DE FACTURAS SELECCIONADAS
// Frontend llama: api.post('/facturas-xml/procesar-seleccionadas')
router.post('/procesar-seleccionadas', authMiddleware, facturaXMLController.procesarFacturasSeleccionadas);

// Procesar nuevo XML de factura (FUNCIÓN MANUAL - OPCIONAL)
router.post('/procesar-xml', authMiddleware, facturaXMLController.procesarXML);

// Validar XML antes de procesarlo (FUNCIÓN MANUAL - OPCIONAL)
router.post('/validar-xml', authMiddleware, facturaXMLController.validarXML);

// Asignar centro de costos y sucursal a facturas (RUTA ALTERNATIVA)
router.post('/asignar-masivo', authMiddleware, facturaXMLController.procesarFacturasSeleccionadas);

// Actualizar asignaciones de una factura específica
router.put('/:id/asignaciones', authMiddleware, facturaXMLController.actualizarAsignaciones);

// Eliminar factura
router.delete('/:id', authMiddleware, facturaXMLController.eliminarFactura);

// ==================== RUTAS DE VERIFICACIÓN DEL SISTEMA ====================

// Verificar estado del sistema con tablas existentes
router.get('/sistema/verificar', authMiddleware, async (req, res) => {
  try {
    console.log('🔧 Verificando estado del sistema...');
    
    const { sql, poolPromise } = require('../config/db');
    const pool = await poolPromise;
    
    // Verificar estructura de TB_FACTURA_ENCABEZADO
    const columnasCheck = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'TB_FACTURA_ENCABEZADO'
      ORDER BY ORDINAL_POSITION
    `);
    
    const columnas = columnasCheck.recordset.map(row => row.COLUMN_NAME);
    
    const columnasNecesarias = {
      id_centro_costo: columnas.includes('id_centro_costo'),
      id_sucursal: columnas.includes('id_sucursal'),
      estado: columnas.includes('estado'),
      procesado_por: columnas.includes('procesado_por'),
      fecha_procesamiento: columnas.includes('fecha_procesamiento')
    };
    
    const sistemaListo = Object.values(columnasNecesarias).every(valor => valor === true);
    
    // Contar facturas CON RESUMEN POR FECHAS
    const conteoFacturas = await pool.request().query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN ISNULL(estado, 'PENDIENTE') = 'PENDIENTE' THEN 1 END) as pendientes,
        COUNT(CASE WHEN estado = 'PROCESADA' THEN 1 END) as procesadas,
        COUNT(DISTINCT RUT_EMISOR) as proveedores_unicos,
        MIN(FECHA_EMISION) as fecha_mas_antigua,
        MAX(FECHA_EMISION) as fecha_mas_reciente,
        SUM(MONTO_TOTAL) as monto_total_acumulado
      FROM TB_FACTURA_ENCABEZADO
    `);
    
    const conteo = conteoFacturas.recordset[0];
    
    // Verificar índices para optimización
    const indicesCheck = await pool.request().query(`
      SELECT
        i.name as indice_nombre,
        STUFF((
          SELECT ', ' + c2.name
          FROM sys.index_columns ic2
          INNER JOIN sys.columns c2 ON ic2.object_id = c2.object_id AND ic2.column_id = c2.column_id
          WHERE ic2.object_id = i.object_id AND ic2.index_id = i.index_id
          ORDER BY ic2.index_column_id
          FOR XML PATH(''), TYPE
        ).value('.', 'NVARCHAR(MAX)'), 1, 2, '') as columnas
      FROM sys.indexes i
      INNER JOIN sys.tables t ON i.object_id = t.object_id
      WHERE t.name = 'TB_FACTURA_ENCABEZADO' AND i.name IS NOT NULL
      GROUP BY i.object_id, i.index_id, i.name
      ORDER BY i.name
    `);
    
    const recomendacionesOptimizacion = [];
    const indicesExistentes = indicesCheck.recordset.map(idx => idx.columnas);
    
    // Verificar índices recomendados
    if (!indicesExistentes.some(idx => idx.includes('FECHA_EMISION'))) {
      recomendacionesOptimizacion.push('Crear índice en FECHA_EMISION para mejorar filtros de fecha');
    }
    
    if (!indicesExistentes.some(idx => idx.includes('estado'))) {
      recomendacionesOptimizacion.push('Crear índice en estado para mejorar filtros de estado');
    }
    
    if (!indicesExistentes.some(idx => idx.includes('RUT_EMISOR'))) {
      recomendacionesOptimizacion.push('Crear índice en RUT_EMISOR para mejorar búsquedas por proveedor');
    }
    
    console.log(`✅ Verificación completada - Sistema ${sistemaListo ? 'LISTO' : 'REQUIERE CONFIGURACIÓN'}`);
    
    return res.json({
      success: true,
      mensaje: 'Verificación del sistema completa',
      arquitectura: 'USANDO_TABLAS_EXISTENTES_OPTIMIZADA',
      sistema_listo: sistemaListo,
      columnas_necesarias: columnasNecesarias,
      estructura_tabla: columnasCheck.recordset,
      estadisticas: {
        total_facturas: conteo.total,
        facturas_pendientes: conteo.pendientes,
        facturas_procesadas: conteo.procesadas,
        proveedores_unicos: conteo.proveedores_unicos,
        fecha_mas_antigua: conteo.fecha_mas_antigua,
        fecha_mas_reciente: conteo.fecha_mas_reciente,
        monto_total_acumulado: conteo.monto_total_acumulado,
        rango_fechas_dias: conteo.fecha_mas_antigua && conteo.fecha_mas_reciente 
          ? Math.ceil((new Date(conteo.fecha_mas_reciente) - new Date(conteo.fecha_mas_antigua)) / (1000 * 60 * 60 * 24))
          : 0
      },
      indices_existentes: indicesCheck.recordset,
      recomendaciones_optimizacion: recomendacionesOptimizacion,
      filtros_recomendados: {
        usar_fechas: true,
        rango_sugerido: '30-90 días para consultas frecuentes',
        indices_sugeridos: [
          'CREATE INDEX IX_TB_FACTURA_ENCABEZADO_FECHA_EMISION ON TB_FACTURA_ENCABEZADO(FECHA_EMISION)',
          'CREATE INDEX IX_TB_FACTURA_ENCABEZADO_ESTADO ON TB_FACTURA_ENCABEZADO(estado)',
          'CREATE INDEX IX_TB_FACTURA_ENCABEZADO_RUT_EMISOR ON TB_FACTURA_ENCABEZADO(RUT_EMISOR)'
        ]
      },
      acciones_requeridas: sistemaListo ? recomendacionesOptimizacion : [
        !columnasNecesarias.id_centro_costo ? 'ALTER TABLE TB_FACTURA_ENCABEZADO ADD id_centro_costo VARCHAR(10) NULL' : null,
        !columnasNecesarias.id_sucursal ? 'ALTER TABLE TB_FACTURA_ENCABEZADO ADD id_sucursal INT NULL' : null,
        !columnasNecesarias.estado ? 'ALTER TABLE TB_FACTURA_ENCABEZADO ADD estado VARCHAR(20) DEFAULT \'PENDIENTE\'' : null,
        !columnasNecesarias.procesado_por ? 'ALTER TABLE TB_FACTURA_ENCABEZADO ADD procesado_por INT NULL' : null,
        !columnasNecesarias.fecha_procesamiento ? 'ALTER TABLE TB_FACTURA_ENCABEZADO ADD fecha_procesamiento DATETIME NULL' : null
      ].filter(Boolean)
    });
    
  } catch (error) {
    console.error('❌ Error verificando sistema:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verificando sistema',
      error: error.message
    });
  }
});

// ==================== DEBUG Y INFORMACIÓN ====================

// Ruta de información para debugging ACTUALIZADA
router.get('/info/rutas-disponibles', (req, res) => {
  res.json({
    success: true,
    mensaje: 'Rutas disponibles en módulo Facturas XML - SISTEMA OPTIMIZADO CON FILTROS DE FECHA',
    arquitectura: 'TB_FACTURA_ENCABEZADO + TB_FACTURA_DETALLE + FILTROS_OPTIMIZADOS',
    version: '2.0.0-OPTIMIZADA',
    rutasEsenciales: {
      'Test conexión': 'GET /api/facturas-xml/test ✅',
      'Verificar sistema': 'GET /api/facturas-xml/sistema/verificar ✅',
      'Información empresa': 'GET /api/facturas-xml/empresa/info ✅ (NUEVO)',
      'Estadísticas con filtros': 'GET /api/facturas-xml/estadisticas?fecha_desde=YYYY-MM-DD&fecha_hasta=YYYY-MM-DD ✅',
      'Listar facturas pendientes (FILTROS)': 'GET /api/facturas-xml/pendientes?fecha_desde=YYYY-MM-DD&fecha_hasta=YYYY-MM-DD&search=texto ✅',
      'Detalle factura pendiente': 'GET /api/facturas-xml/pendientes/{id} ✅',
      'Obtener sucursales usuario': 'GET /api/facturas-xml/lista/sucursales ✅',
      'Listar facturas procesadas (FILTROS)': 'GET /api/facturas-xml/?fecha_desde=YYYY-MM-DD&fecha_hasta=YYYY-MM-DD&search=texto ✅',
      'Procesar facturas seleccionadas': 'POST /api/facturas-xml/procesar-seleccionadas ✅',
      'Actualizar asignaciones': 'PUT /api/facturas-xml/{id}/asignaciones ✅',
      'Factura por ID': 'GET /api/facturas-xml/{id} ✅ (AL FINAL)',
      'Eliminar factura': 'DELETE /api/facturas-xml/{id} ✅'
    },
    rutasDeReportes: {
      'Reporte por centro de costos (FILTROS)': 'GET /api/facturas-xml/reportes/centro-costos?fecha_desde=YYYY-MM-DD&fecha_hasta=YYYY-MM-DD ✅',
      'Reporte de proveedores (FILTROS)': 'GET /api/facturas-xml/reportes/proveedores?fecha_desde=YYYY-MM-DD&fecha_hasta=YYYY-MM-DD ✅',
      'Lista de proveedores (FILTROS)': 'GET /api/facturas-xml/lista/proveedores?fecha_desde=YYYY-MM-DD&fecha_hasta=YYYY-MM-DD ✅',
      'Tipos de documento (FILTROS)': 'GET /api/facturas-xml/lista/tipos-documento?fecha_desde=YYYY-MM-DD&fecha_hasta=YYYY-MM-DD ✅'
    },
    parametrosDeFiltro: {
      fecha_desde: 'YYYY-MM-DD - Fecha inicio del rango (recomendado)',
      fecha_hasta: 'YYYY-MM-DD - Fecha fin del rango (recomendado)', 
      search: 'texto - Búsqueda en folio, RUT o razón social',
      page: 'número - Página para paginación (default: 1)',
      limit: 'número - Registros por página (default: 1000)',
      centro_costo: 'string - Filtro por centro de costo específico',
      proveedor_rut: 'string - Filtro por RUT de proveedor específico'
    },
    optimizaciones: {
      'Filtros obligatorios': 'Las consultas requieren al menos fecha_desde, fecha_hasta o search para evitar queries muy grandes',
      'Consultas condicionales': 'Sin filtros, se retorna array vacío con mensaje instructivo',
      'Índices recomendados': 'FECHA_EMISION, estado, RUT_EMISOR para mejor rendimiento',
      'Paginación inteligente': 'Límites ajustables según necesidades (100-2000 registros)'
    },
    funcionesOpcionales: {
      'Procesar XML manual': 'POST /api/facturas-xml/procesar-xml (OPCIONAL)',
      'Validar XML': 'POST /api/facturas-xml/validar-xml (OPCIONAL)',
      'Timbre electrónico': 'GET /api/facturas-xml/{id}/timbre (NO DISPONIBLE)',
      'XML original': 'GET /api/facturas-xml/{id}/xml-original (NO DISPONIBLE)'
    },
    diferenciasConVersionAnterior: [
      '✅ Requiere filtros de fecha o búsqueda para consultas principales',
      '✅ Retorna información de empresa y RUT receptor en tablas',
      '✅ Todas las rutas de reportes soportan filtros de fecha',
      '✅ Consultas optimizadas con CTE y paginación mejorada',
      '✅ Verificación de sistema incluye recomendaciones de índices',
      '✅ Manejo condicional de JOINs para máxima compatibilidad',
      '✅ Mensajes informativos cuando no se aplican filtros'
    ],
    configuracionRequerida: {
      columnas_necesarias: [
        'ALTER TABLE TB_FACTURA_ENCABEZADO ADD id_centro_costo VARCHAR(10) NULL',
        'ALTER TABLE TB_FACTURA_ENCABEZADO ADD id_sucursal INT NULL',
        'ALTER TABLE TB_FACTURA_ENCABEZADO ADD estado VARCHAR(20) DEFAULT \'PENDIENTE\'',
        'ALTER TABLE TB_FACTURA_ENCABEZADO ADD procesado_por INT NULL',
        'ALTER TABLE TB_FACTURA_ENCABEZADO ADD fecha_procesamiento DATETIME NULL'
      ],
      indices_recomendados: [
        'CREATE INDEX IX_TB_FACTURA_ENCABEZADO_FECHA_EMISION ON TB_FACTURA_ENCABEZADO(FECHA_EMISION)',
        'CREATE INDEX IX_TB_FACTURA_ENCABEZADO_ESTADO ON TB_FACTURA_ENCABEZADO(estado)',
        'CREATE INDEX IX_TB_FACTURA_ENCABEZADO_RUT_EMISOR ON TB_FACTURA_ENCABEZADO(RUT_EMISOR)',
        'CREATE INDEX IX_TB_FACTURA_ENCABEZADO_COMPUESTO ON TB_FACTURA_ENCABEZADO(estado, FECHA_EMISION)'
      ]
    }
  });
});

// 🔧 CRÍTICO: EXPORTACIÓN CORRECTA DEL ROUTER
module.exports = router;