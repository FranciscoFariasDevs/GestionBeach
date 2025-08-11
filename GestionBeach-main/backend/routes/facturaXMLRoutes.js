// routes/facturaXMLRoutes.js - RUTAS CORREGIDAS PARA SISTEMA CON TABLAS EXISTENTES
const express = require('express');
const router = express.Router();
const facturaXMLController = require('../controllers/facturaXMLController');
const authMiddleware = require('../middleware/authMiddleware');

// ==================== RUTAS ESPECÍFICAS PRIMERO (ANTES DE PARÁMETROS) ====================

// 🔧 CRÍTICO: Test de conexión (público para debugging)
router.get('/test', facturaXMLController.test);

// 🔧 CRÍTICO: RUTAS ESPECÍFICAS DEBEN IR ANTES QUE /:id
// Frontend llama: api.get('/facturas-xml/pendientes')
router.get('/pendientes', authMiddleware, facturaXMLController.obtenerFacturasPendientes);

// 📊 ESTADÍSTICAS (RUTA CORREGIDA PARA FRONTEND)
// Frontend llama: api.get('/facturas-xml/estadisticas')
router.get('/estadisticas', authMiddleware, facturaXMLController.estadisticas);

// 🏢 OBTENER SUCURSALES DEL USUARIO (REQUERIDO POR FRONTEND)
// Frontend llama: api.get('/facturas-xml/lista/sucursales')
router.get('/lista/sucursales', authMiddleware, facturaXMLController.obtenerSucursalesUsuario);

// 🔄 DETALLES DE FACTURA PENDIENTE
// Frontend llama: api.get('/facturas-xml/pendientes/${id}')
router.get('/pendientes/:id', authMiddleware, facturaXMLController.obtenerDetalleFacturaPendiente);

// ==================== BÚSQUEDA Y FILTROS ====================

// Buscar facturas con criterios múltiples
router.get('/buscar/facturas', authMiddleware, (req, res) => {
  // Implementación básica de búsqueda en TB_FACTURA_ENCABEZADO
  res.json({
    success: true,
    message: 'Función de búsqueda no implementada - usar filtros en frontend',
    data: []
  });
});

// Obtener proveedores únicos desde TB_FACTURA_ENCABEZADO
router.get('/lista/proveedores', authMiddleware, async (req, res) => {
  try {
    const { sql, poolPromise } = require('../config/db');
    const pool = await poolPromise;
    
    const result = await pool.request().query(`
      SELECT DISTINCT
        RUT_EMISOR as emisor_rut,
        RZN_EMISOR as emisor_razon_social,
        COUNT(*) as total_facturas,
        SUM(MONTO_TOTAL) as monto_total_acumulado,
        MAX(FECHA_EMISION) as ultima_factura
      FROM TB_FACTURA_ENCABEZADO
      WHERE RUT_EMISOR IS NOT NULL AND RZN_EMISOR IS NOT NULL
      GROUP BY RUT_EMISOR, RZN_EMISOR
      ORDER BY total_facturas DESC, monto_total_acumulado DESC
    `);
    
    return res.json({
      success: true,
      data: result.recordset,
      message: `${result.recordset.length} proveedores encontrados`
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

// Obtener tipos de documento desde TB_FACTURA_ENCABEZADO
router.get('/lista/tipos-documento', authMiddleware, async (req, res) => {
  try {
    const { sql, poolPromise } = require('../config/db');
    const pool = await poolPromise;
    
    // Como TB_FACTURA_ENCABEZADO no tiene campo tipo_documento, 
    // asumimos que todas son Facturas Electrónicas
    const result = await pool.request().query(`
      SELECT 
        'Factura Electrónica' as tipo_documento,
        COUNT(*) as cantidad
      FROM TB_FACTURA_ENCABEZADO
      GROUP BY 'Factura Electrónica'
      ORDER BY cantidad DESC
    `);
    
    return res.json({
      success: true,
      data: result.recordset,
      message: `${result.recordset.length} tipos de documento encontrados`
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

// ==================== CENTROS DE COSTOS ====================

// Obtener centros de costos activos (MANTENER COMPATIBILIDAD)
router.get('/centros-costos/activos', authMiddleware, facturaXMLController.obtenerCentrosCostos);

// ==================== REPORTES ADICIONALES ====================

// Reporte por centro de costos desde TB_FACTURA_ENCABEZADO
router.get('/reportes/centro-costos', authMiddleware, async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta } = req.query;
    const { sql, poolPromise } = require('../config/db');
    const pool = await poolPromise;
    
    let whereClause = 'WHERE fe.estado = \'PROCESADA\'';
    let parameters = [];
    
    if (fecha_desde && fecha_hasta) {
      whereClause += ' AND fe.FECHA_EMISION BETWEEN @fecha_desde AND @fecha_hasta';
      parameters.push({ name: 'fecha_desde', type: sql.DateTime, value: new Date(fecha_desde) });
      parameters.push({ name: 'fecha_hasta', type: sql.DateTime, value: new Date(fecha_hasta) });
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
    
    return res.json({
      success: true,
      data: result.recordset,
      message: 'Reporte por centro de costos generado',
      filtros: {
        fecha_desde: fecha_desde || 'Sin filtro',
        fecha_hasta: fecha_hasta || 'Sin filtro'
      }
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

// Reporte de proveedores desde TB_FACTURA_ENCABEZADO
router.get('/reportes/proveedores', authMiddleware, async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, centro_costo } = req.query;
    const { sql, poolPromise } = require('../config/db');
    const pool = await poolPromise;
    
    let whereClause = 'WHERE 1=1';
    let parameters = [];
    
    if (fecha_desde && fecha_hasta) {
      whereClause += ' AND fe.FECHA_EMISION BETWEEN @fecha_desde AND @fecha_hasta';
      parameters.push({ name: 'fecha_desde', type: sql.DateTime, value: new Date(fecha_desde) });
      parameters.push({ name: 'fecha_hasta', type: sql.DateTime, value: new Date(fecha_hasta) });
    }
    
    if (centro_costo) {
      whereClause += ' AND fe.id_centro_costo = @centro_costo';
      parameters.push({ name: 'centro_costo', type: sql.VarChar(10), value: centro_costo });
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
        STRING_AGG(DISTINCT fe.id_centro_costo, ', ') as centros_costos_utilizados
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
    
    return res.json({
      success: true,
      data: result.recordset,
      message: 'Reporte de proveedores generado',
      filtros: {
        fecha_desde: fecha_desde || 'Sin filtro',
        fecha_hasta: fecha_hasta || 'Sin filtro',
        centro_costo: centro_costo || 'Todos'
      }
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

// Estadísticas por reportes (ruta alternativa)
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
            monto_coherente: factura.MONTO_TOTAL > 0
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
    nota: 'Esta funcionalidad requiere tabla facturas_xml_timbres'
  });
});

// XML original (no disponible en TB_FACTURA_ENCABEZADO)
router.get('/:id/xml-original', authMiddleware, (req, res) => {
  return res.status(404).json({
    success: false,
    message: 'XML original no disponible en el sistema actual',
    nota: 'Esta funcionalidad requiere columna xml_content en facturas_xml'
  });
});

// ==================== RUTAS PRINCIPALES (DESPUÉS DE RUTAS ESPECÍFICAS) ====================

// Obtener todas las facturas procesadas con filtros y paginación
router.get('/', authMiddleware, facturaXMLController.obtenerFacturas);

// 🔧 CRÍTICO: Esta ruta DEBE ir AL FINAL para evitar conflictos
// Obtener factura específica por ID
router.get('/:id', authMiddleware, facturaXMLController.obtenerFacturaPorId);

// ==================== RUTAS POST/PUT/DELETE ====================

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
    const { sql, poolPromise } = require('../config/db');
    const pool = await poolPromise;
    
    // Verificar estructura de TB_FACTURA_ENCABEZADO
    const columnasCheck = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'TB_FACTURA_ENCABEZADO'
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
    
    // Contar facturas
    const conteoFacturas = await pool.request().query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN ISNULL(estado, 'PENDIENTE') = 'PENDIENTE' THEN 1 END) as pendientes,
        COUNT(CASE WHEN estado = 'PROCESADA' THEN 1 END) as procesadas
      FROM TB_FACTURA_ENCABEZADO
    `);
    
    const conteo = conteoFacturas.recordset[0];
    
    return res.json({
      success: true,
      mensaje: 'Verificación del sistema completa',
      arquitectura: 'USANDO_TABLAS_EXISTENTES',
      sistema_listo: sistemaListo,
      columnas_necesarias: columnasNecesarias,
      estadisticas: {
        total_facturas: conteo.total,
        facturas_pendientes: conteo.pendientes,
        facturas_procesadas: conteo.procesadas
      },
      acciones_requeridas: sistemaListo ? [] : [
        !columnasNecesarias.id_centro_costo ? 'ALTER TABLE TB_FACTURA_ENCABEZADO ADD id_centro_costo VARCHAR(10) NULL' : null,
        !columnasNecesarias.id_sucursal ? 'ALTER TABLE TB_FACTURA_ENCABEZADO ADD id_sucursal INT NULL' : null,
        !columnasNecesarias.estado ? 'ALTER TABLE TB_FACTURA_ENCABEZADO ADD estado VARCHAR(20) DEFAULT \'PENDIENTE\'' : null,
        !columnasNecesarias.procesado_por ? 'ALTER TABLE TB_FACTURA_ENCABEZADO ADD procesado_por INT NULL' : null,
        !columnasNecesarias.fecha_procesamiento ? 'ALTER TABLE TB_FACTURA_ENCABEZADO ADD fecha_procesamiento DATETIME NULL' : null
      ].filter(Boolean)
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error verificando sistema',
      error: error.message
    });
  }
});

// ==================== DEBUG Y INFORMACIÓN ====================

// Ruta de información para debugging
router.get('/info/rutas-disponibles', (req, res) => {
  res.json({
    success: true,
    mensaje: 'Rutas disponibles en módulo Facturas XML - SISTEMA CON TABLAS EXISTENTES',
    arquitectura: 'TB_FACTURA_ENCABEZADO + TB_FACTURA_DETALLE',
    rutasEsenciales: {
      'Test conexión': 'GET /api/facturas-xml/test ✅',
      'Verificar sistema': 'GET /api/facturas-xml/sistema/verificar ✅',
      'Estadísticas': 'GET /api/facturas-xml/estadisticas ✅',
      'Listar facturas pendientes': 'GET /api/facturas-xml/pendientes ✅',
      'Detalle factura pendiente': 'GET /api/facturas-xml/pendientes/{id} ✅',
      'Obtener sucursales usuario': 'GET /api/facturas-xml/lista/sucursales ✅',
      'Listar facturas procesadas': 'GET /api/facturas-xml/ ✅',
      'Procesar facturas seleccionadas': 'POST /api/facturas-xml/procesar-seleccionadas ✅',
      'Actualizar asignaciones': 'PUT /api/facturas-xml/{id}/asignaciones ✅',
      'Factura por ID': 'GET /api/facturas-xml/{id} ✅ (AL FINAL)',
      'Eliminar factura': 'DELETE /api/facturas-xml/{id} ✅'
    },
    funcionesOpcionales: {
      'Procesar XML manual': 'POST /api/facturas-xml/procesar-xml (OPCIONAL)',
      'Validar XML': 'POST /api/facturas-xml/validar-xml (OPCIONAL)',
      'Timbre electrónico': 'GET /api/facturas-xml/{id}/timbre (NO DISPONIBLE)',
      'XML original': 'GET /api/facturas-xml/{id}/xml-original (NO DISPONIBLE)'
    },
    diferenciasConVersionOriginal: [
      '✅ Usa TB_FACTURA_ENCABEZADO en lugar de facturas_xml',
      '✅ Usa TB_FACTURA_DETALLE en lugar de facturas_xml_descuentos_recargos', 
      '✅ Estado se controla con columna estado en TB_FACTURA_ENCABEZADO',
      '❌ No tiene timbre electrónico (requiere tabla separada)',
      '❌ No almacena XML original (requiere columna xml_content)',
      '✅ Mantiene toda la funcionalidad de centro de costos y sucursales'
    ],
    configuracionRequerida: {
      columnas_necesarias: [
        'ALTER TABLE TB_FACTURA_ENCABEZADO ADD id_centro_costo VARCHAR(10) NULL',
        'ALTER TABLE TB_FACTURA_ENCABEZADO ADD id_sucursal INT NULL',
        'ALTER TABLE TB_FACTURA_ENCABEZADO ADD estado VARCHAR(20) DEFAULT \'PENDIENTE\'',
        'ALTER TABLE TB_FACTURA_ENCABEZADO ADD procesado_por INT NULL',
        'ALTER TABLE TB_FACTURA_ENCABEZADO ADD fecha_procesamiento DATETIME NULL'
      ]
    }
  });
});

// 🔧 CRÍTICO: EXPORTACIÓN CORRECTA DEL ROUTER
module.exports = router;