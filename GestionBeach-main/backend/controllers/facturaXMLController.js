// controllers/facturaXMLController.js - VERSIÓN OPTIMIZADA CON FILTROS DE FECHA
const { sql, poolPromise } = require('../config/db');
const xml2js = require('xml2js');

// ==================== UTILIDADES GENERALES ====================

// Formatear RUT chileno
const formatearRUT = (rut) => {
  if (!rut) return '';
  const cleanRut = rut.replace(/[.-]/g, '');
  if (cleanRut.length < 2) return rut;
  
  const body = cleanRut.slice(0, -1);
  const verifier = cleanRut.slice(-1);
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedBody}-${verifier}`;
};

// Función para truncar texto según longitud máxima de columna
const truncarTexto = (texto, maxLength) => {
  if (!texto) return '';
  return texto.toString().substring(0, maxLength);
};

// Validar RUT chileno
const validarRUT = (rut) => {
  if (!rut) return false;
  
  const rutLimpio = rut.replace(/[.-]/g, '');
  if (rutLimpio.length < 8) return false;
  
  const cuerpo = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1).toUpperCase();
  
  if (!/^\d+$/.test(cuerpo)) return false;
  if (dv !== 'K' && !/^\d$/.test(dv)) return false;
  
  let suma = 0;
  let multiplicador = 2;
  
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo.charAt(i)) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  
  const resto = suma % 11;
  const dvCalculado = resto === 0 ? '0' : resto === 1 ? 'K' : (11 - resto).toString();
  
  return dv === dvCalculado;
};

// Construir WHERE clause para filtros de fecha y búsqueda
const construirFiltros = (params) => {
  let whereClause = '';
  let sqlParams = [];
  
  const conditions = [];
  
  // Filtro de fecha desde
  if (params.fecha_desde) {
    conditions.push('fe.FECHA_EMISION >= @fecha_desde');
    sqlParams.push({ name: 'fecha_desde', type: sql.Date, value: new Date(params.fecha_desde) });
  }
  
  // Filtro de fecha hasta
  if (params.fecha_hasta) {
    conditions.push('fe.FECHA_EMISION <= @fecha_hasta');
    sqlParams.push({ name: 'fecha_hasta', type: sql.Date, value: new Date(params.fecha_hasta) });
  }
  
  // Filtro de búsqueda de texto
  if (params.search && params.search.trim()) {
    conditions.push(`(
      fe.FOLIO LIKE @busqueda OR 
      fe.RZN_EMISOR LIKE @busqueda OR 
      fe.RUT_EMISOR LIKE @busqueda OR
      fe.RZN_RECEPTOR LIKE @busqueda OR
      fe.RUT_RECEPTOR LIKE @busqueda
    )`);
    sqlParams.push({ name: 'busqueda', type: sql.VarChar, value: `%${params.search.trim()}%` });
  }
  
  if (conditions.length > 0) {
    whereClause = 'AND ' + conditions.join(' AND ');
  }
  
  return { whereClause, sqlParams };
};

// Convertir XML a objeto JavaScript
const parseXML = async (xmlContent) => {
  const parser = new xml2js.Parser({
    explicitArray: false,
    ignoreAttrs: false,
    mergeAttrs: true
  });
  
  try {
    return await parser.parseStringPromise(xmlContent);
  } catch (error) {
    throw new Error('Error al parsear XML: ' + error.message);
  }
};

// ==================== CONTROLADORES PRINCIPALES ====================

// Test de conexión
exports.test = async (req, res) => {
  try {
    console.log('🔧 TEST - Verificando conexión y tablas existentes...');
    
    const pool = await poolPromise;
    const testResult = await pool.request().query('SELECT 1 as test');
    
    try {
      // Verificar tablas existentes
      const tablesCheck = await pool.request().query(`
        SELECT 
          COUNT(CASE WHEN TABLE_NAME = 'TB_FACTURA_ENCABEZADO' THEN 1 END) as encabezado_exists,
          COUNT(CASE WHEN TABLE_NAME = 'TB_FACTURA_DETALLE' THEN 1 END) as detalle_exists,
          COUNT(CASE WHEN TABLE_NAME = 'centros_costos' THEN 1 END) as centros_costos_exists,
          COUNT(CASE WHEN TABLE_NAME = 'sucursales' THEN 1 END) as sucursales_exists
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME IN ('TB_FACTURA_ENCABEZADO', 'TB_FACTURA_DETALLE', 'centros_costos', 'sucursales')
      `);
      
      // Verificar columnas necesarias en TB_FACTURA_ENCABEZADO
      const columnasCheck = await pool.request().query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'TB_FACTURA_ENCABEZADO'
      `);
      
      const columnas = columnasCheck.recordset.map(row => row.COLUMN_NAME);
      const tablesExist = tablesCheck.recordset[0];
      
      const columnasNecesarias = {
        id_centro_costo: columnas.includes('id_centro_costo'),
        id_sucursal: columnas.includes('id_sucursal'),
        estado: columnas.includes('estado'),
        procesado_por: columnas.includes('procesado_por'),
        fecha_procesamiento: columnas.includes('fecha_procesamiento')
      };
      
      const sistemaListo = tablesExist.encabezado_exists > 0 && 
                          tablesExist.detalle_exists > 0 && 
                          Object.values(columnasNecesarias).every(val => val === true);
      
      console.log('✅ Conexión DB exitosa - Sistema con tablas existentes');
      
      return res.json({
        success: true,
        message: 'Conexión exitosa - Sistema usando tablas existentes',
        timestamp: new Date(),
        db_test: testResult.recordset[0],
        tables_status: {
          tb_factura_encabezado: tablesExist.encabezado_exists > 0,
          tb_factura_detalle: tablesExist.detalle_exists > 0,
          centros_costos: tablesExist.centros_costos_exists > 0,
          sucursales: tablesExist.sucursales_exists > 0
        },
        columnas_necesarias: columnasNecesarias,
        sistema_listo: sistemaListo,
        arquitectura: 'USANDO_TABLAS_EXISTENTES',
        acciones_requeridas: sistemaListo ? [] : [
          !columnasNecesarias.id_centro_costo ? 'Agregar columna id_centro_costo a TB_FACTURA_ENCABEZADO' : null,
          !columnasNecesarias.id_sucursal ? 'Agregar columna id_sucursal a TB_FACTURA_ENCABEZADO' : null,
          !columnasNecesarias.estado ? 'Agregar columna estado a TB_FACTURA_ENCABEZADO' : null,
          !columnasNecesarias.procesado_por ? 'Agregar columna procesado_por a TB_FACTURA_ENCABEZADO' : null,
          !columnasNecesarias.fecha_procesamiento ? 'Agregar columna fecha_procesamiento a TB_FACTURA_ENCABEZADO' : null
        ].filter(Boolean)
      });
      
    } catch (tableError) {
      console.log('⚠️ Error verificando tablas:', tableError.message);
      return res.json({
        success: true,
        message: 'Conexión exitosa - Error verificando estructura',
        timestamp: new Date(),
        db_test: testResult.recordset[0],
        sistema_listo: false,
        error_verificacion: tableError.message
      });
    }
  } catch (error) {
    console.error('❌ Error de conexión DB:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error de conexión a base de datos',
      error: error.message
    });
  }
};

// ==================== FACTURAS PENDIENTES ====================

// FUNCIÓN OPTIMIZADA: Obtener facturas pendientes CON FILTROS DE FECHA
exports.obtenerFacturasPendientes = async (req, res) => {
  try {
    console.log('📄 === OBTENIENDO FACTURAS PENDIENTES CON FILTROS ===');
    
    const pool = await poolPromise;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000;
    const { fecha_desde, fecha_hasta, search } = req.query;
    
    console.log('📋 Parámetros recibidos:', { 
      page, 
      limit, 
      fecha_desde, 
      fecha_hasta, 
      search: search ? `"${search}"` : 'sin búsqueda'
    });
    
    // Validar que al menos venga un filtro para evitar consultas muy grandes
    if (!fecha_desde && !fecha_hasta && !search) {
      console.log('⚠️ Sin filtros aplicados - retornando array vacío para optimización');
      return res.json({
        success: true,
        data: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalRecords: 0,
          recordsPerPage: limit,
          hasNextPage: false,
          hasPrevPage: false
        },
        message: 'Aplica filtros de fecha o búsqueda para cargar los datos',
        optimizacion: true
      });
    }
    
    const startRow = ((page - 1) * limit) + 1;
    const endRow = page * limit;
    
    // Construir filtros
    const { whereClause, sqlParams } = construirFiltros({ fecha_desde, fecha_hasta, search });
    
    console.log('🔍 Filtros construidos:', whereClause || 'sin filtros adicionales');
    
    // Consulta optimizada para facturas pendientes CON FILTROS
    const consulta = `
      WITH FacturasPaginadas AS (
        SELECT 
          fe.ID,
          fe.NOMBRE_ARCHIVO,
          fe.RUT_EMISOR,
          fe.RZN_EMISOR,
          fe.RUT_RECEPTOR,
          fe.RZN_RECEPTOR,
          fe.FOLIO,
          fe.FECHA_EMISION,
          fe.MONTO_NETO,
          fe.IVA,
          fe.MONTO_TOTAL,
          ISNULL((SELECT COUNT(*) FROM TB_FACTURA_DETALLE WHERE ID_FACTURA = fe.ID), 0) as total_productos,
          ISNULL(fe.estado, 'PENDIENTE') as estado,
          fe.id_centro_costo,
          fe.id_sucursal,
          ROW_NUMBER() OVER (ORDER BY fe.FECHA_EMISION DESC, fe.ID DESC) as RowNum
        FROM TB_FACTURA_ENCABEZADO fe
        WHERE ISNULL(fe.estado, 'PENDIENTE') = 'PENDIENTE'
        ${whereClause}
      )
      SELECT 
        ID, NOMBRE_ARCHIVO, RUT_EMISOR, RZN_EMISOR, RUT_RECEPTOR, RZN_RECEPTOR,
        FOLIO, FECHA_EMISION, MONTO_NETO, IVA, MONTO_TOTAL, total_productos, estado,
        id_centro_costo, id_sucursal
      FROM FacturasPaginadas
      WHERE RowNum BETWEEN @startRow AND @endRow
    `;
    
    const consultaTotal = `
      SELECT COUNT(*) as total 
      FROM TB_FACTURA_ENCABEZADO fe
      WHERE ISNULL(estado, 'PENDIENTE') = 'PENDIENTE'
      ${whereClause}
    `;
    
    console.log('🔍 Ejecutando consulta principal con filtros...');
    
    // Ejecutar consulta principal
    const requestPrincipal = pool.request()
      .input('startRow', sql.Int, startRow)
      .input('endRow', sql.Int, endRow);
    
    // Agregar parámetros de filtros
    sqlParams.forEach(param => {
      requestPrincipal.input(param.name, param.type, param.value);
    });
    
    const facturas = await requestPrincipal.query(consulta);
    
    // Ejecutar consulta de total
    const requestTotal = pool.request();
    sqlParams.forEach(param => {
      requestTotal.input(param.name, param.type, param.value);
    });
    
    const totalResult = await requestTotal.query(consultaTotal);
    
    const total = totalResult.recordset[0].total;
    const totalPages = Math.ceil(total / limit);
    
    // Formatear RUTs
    const facturasFormateadas = facturas.recordset.map(factura => ({
      ...factura,
      RUT_EMISOR: formatearRUT(factura.RUT_EMISOR),
      RUT_RECEPTOR: formatearRUT(factura.RUT_RECEPTOR)
    }));
    
    const filtrosAplicados = [];
    if (fecha_desde) filtrosAplicados.push(`desde ${fecha_desde}`);
    if (fecha_hasta) filtrosAplicados.push(`hasta ${fecha_hasta}`);
    if (search) filtrosAplicados.push(`texto "${search}"`);
    
    const mensajeFiltros = filtrosAplicados.length > 0 
      ? ` (filtros: ${filtrosAplicados.join(', ')})` 
      : '';
    
    console.log(`✅ ${facturas.recordset.length} facturas pendientes obtenidas de ${total} total${mensajeFiltros}`);
    
    return res.json({ 
      success: true, 
      data: facturasFormateadas,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalRecords: total,
        recordsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      filtros_aplicados: {
        fecha_desde: fecha_desde || null,
        fecha_hasta: fecha_hasta || null,
        busqueda: search || null
      },
      message: `${facturas.recordset.length} facturas pendientes encontradas${mensajeFiltros}`
    });
    
  } catch (error) {
    console.error('❌ Error al obtener facturas pendientes:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al obtener facturas pendientes: ' + error.message,
      error: error.message
    });
  }
};

// Obtener detalles de una factura pendiente
exports.obtenerDetalleFacturaPendiente = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de factura debe ser un número válido' 
      });
    }
    
    const pool = await poolPromise;
    
    // Obtener encabezado
    const encabezadoResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM TB_FACTURA_ENCABEZADO WHERE ID = @id');
    
    if (encabezadoResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Factura pendiente no encontrada'
      });
    }
    
    // Obtener detalles
    const detalleResult = await pool.request()
      .input('facturaId', sql.Int, id)
      .query('SELECT * FROM TB_FACTURA_DETALLE WHERE ID_FACTURA = @facturaId ORDER BY ID');
    
    const factura = encabezadoResult.recordset[0];
    factura.RUT_EMISOR = formatearRUT(factura.RUT_EMISOR);
    factura.RUT_RECEPTOR = formatearRUT(factura.RUT_RECEPTOR);
    factura.detalles = detalleResult.recordset;
    
    return res.json({
      success: true,
      data: factura
    });
    
  } catch (error) {
    console.error('❌ Error al obtener detalle de factura pendiente:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al obtener detalle de factura pendiente',
      error: error.message
    });
  }
};

// FUNCIÓN CORREGIDA: Procesar facturas seleccionadas (actualizar en TB_FACTURA_ENCABEZADO)
exports.procesarFacturasSeleccionadas = async (req, res) => {
  let transaction = null;
  
  try {
    console.log('🚀 === PROCESAMIENTO CON TABLAS EXISTENTES ===');
    
    const { facturasIds, centroCostos, sucursal } = req.body;
    const userId = req.user?.id || 1; // Valor por defecto si no hay usuario
    
    console.log('📋 DATOS RECIBIDOS:');
    console.log('- Facturas IDs:', facturasIds);
    console.log('- Centro costos:', centroCostos);
    console.log('- Sucursal:', sucursal);
    console.log('- Usuario:', userId);
    
    if (!facturasIds || !Array.isArray(facturasIds) || facturasIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere al menos una factura seleccionada'
      });
    }

    if (!centroCostos || !sucursal) {
      return res.status(400).json({
        success: false,
        message: 'Centro de costos y sucursal son requeridos'
      });
    }

    const pool = await poolPromise;
    transaction = pool.transaction();
    await transaction.begin();
    
    const facturasActualizadas = [];
    const facturasError = [];
    
    for (const facturaId of facturasIds) {
      try {
        console.log(`🔄 Procesando factura ID: ${facturaId}`);
        
        // 1. VERIFICAR QUE LA FACTURA EXISTE EN TB_FACTURA_ENCABEZADO
        const facturaCheck = await transaction.request()
          .input('id', sql.Int, facturaId)
          .query('SELECT ID, FOLIO, RZN_EMISOR, MONTO_TOTAL, ISNULL(estado, \'PENDIENTE\') as estado FROM TB_FACTURA_ENCABEZADO WHERE ID = @id');
        
        if (facturaCheck.recordset.length === 0) {
          facturasError.push({ id: facturaId, error: 'Factura no encontrada' });
          continue;
        }
        
        const factura = facturaCheck.recordset[0];
        
        // 2. VERIFICAR QUE NO ESTÉ YA PROCESADA
        if (factura.estado === 'PROCESADA') {
          facturasError.push({ 
            id: facturaId, 
            error: 'Factura ya procesada anteriormente',
            folio: factura.FOLIO 
          });
          continue;
        }
        
        console.log(`📋 Procesando factura: ${factura.FOLIO} - ${factura.RZN_EMISOR}`);
        
        // 3. ACTUALIZAR LA FACTURA CON CENTRO DE COSTOS Y SUCURSAL
        await transaction.request()
          .input('id', sql.Int, facturaId)
          .input('centroCosto', sql.VarChar(10), centroCostos)
          .input('sucursal', sql.Int, parseInt(sucursal))
          .input('userId', sql.Int, userId)
          .input('estado', sql.VarChar(20), 'PROCESADA')
          .input('fechaProcesamiento', sql.DateTime, new Date())
          .query(`
            UPDATE TB_FACTURA_ENCABEZADO 
            SET 
              id_centro_costo = @centroCosto,
              id_sucursal = @sucursal,
              procesado_por = @userId,
              estado = @estado,
              fecha_procesamiento = @fechaProcesamiento
            WHERE ID = @id
          `);
        
        facturasActualizadas.push({
          id: facturaId,
          folio: factura.FOLIO,
          emisor: factura.RZN_EMISOR,
          monto: factura.MONTO_TOTAL,
          centro_costo: centroCostos,
          sucursal: sucursal
        });
        
        console.log(`✅ Factura ${facturaId} procesada exitosamente`);
        
      } catch (facturaError) {
        console.error(`❌ Error procesando factura ${facturaId}:`, facturaError.message);
        facturasError.push({ 
          id: facturaId, 
          error: facturaError.message 
        });
      }
    }
    
    await transaction.commit();
    console.log('✅ Transacción confirmada');
    
    return res.status(200).json({
      success: true,
      message: `✅ ${facturasActualizadas.length} facturas procesadas exitosamente`,
      data: {
        procesadas: facturasActualizadas,
        errores: facturasError,
        resumen: {
          total_solicitadas: facturasIds.length,
          exitosas: facturasActualizadas.length,
          errores: facturasError.length
        }
      }
    });
    
  } catch (generalError) {
    console.error('💥 === ERROR GENERAL ===', generalError.message);
    
    if (transaction) {
      try {
        await transaction.rollback();
        console.log('🔄 Rollback realizado');
      } catch (rollbackError) {
        console.error('❌ Error en rollback:', rollbackError.message);
      }
    }
    
    return res.status(500).json({
      success: false,
      message: 'Error general en procesamiento: ' + generalError.message,
      error: generalError.message
    });
  }
};

// ==================== FACTURAS PROCESADAS ====================

// FUNCIÓN OPTIMIZADA: Obtener facturas procesadas CON FILTROS DE FECHA
exports.obtenerFacturas = async (req, res) => {
  try {
    console.log('📄 === OBTENIENDO FACTURAS PROCESADAS CON FILTROS ===');
    
    const pool = await poolPromise;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000;
    const { fecha_desde, fecha_hasta, search } = req.query;
    
    console.log('📋 Parámetros recibidos:', { 
      page, 
      limit, 
      fecha_desde, 
      fecha_hasta, 
      search: search ? `"${search}"` : 'sin búsqueda'
    });
    
    // Validar que al menos venga un filtro para evitar consultas muy grandes
    if (!fecha_desde && !fecha_hasta && !search) {
      console.log('⚠️ Sin filtros aplicados - retornando array vacío para optimización');
      return res.json({
        success: true,
        data: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalRecords: 0,
          recordsPerPage: limit,
          hasNextPage: false,
          hasPrevPage: false
        },
        message: 'Aplica filtros de fecha o búsqueda para cargar los datos',
        optimizacion: true
      });
    }
    
    const startRow = ((page - 1) * limit) + 1;
    const endRow = page * limit;
    
    // Construir filtros
    const { whereClause, sqlParams } = construirFiltros({ fecha_desde, fecha_hasta, search });
    
    console.log('🔍 Filtros construidos:', whereClause || 'sin filtros adicionales');
    
    // Intentar consulta con JOINs primero
    try {
      console.log('🔍 Intentando consulta con JOINs...');
      
      const consulta = `
        WITH FacturasProcesadasPaginadas AS (
          SELECT 
            fe.ID as id,
            fe.NOMBRE_ARCHIVO as archivo_nombre,
            fe.RUT_EMISOR as emisor_rut,
            fe.RZN_EMISOR as emisor_razon_social,
            fe.RUT_RECEPTOR as receptor_rut,
            fe.RZN_RECEPTOR as receptor_razon_social,
            fe.FOLIO as folio,
            fe.FECHA_EMISION as fecha_emision,
            fe.MONTO_TOTAL as monto_total,
            fe.estado,
            fe.id_centro_costo,
            fe.id_sucursal,
            fe.fecha_procesamiento,
            ISNULL(s.nombre, 'Sucursal no encontrada') as sucursal_nombre,
            ISNULL(s.tipo_sucursal, 'N/A') as tipo_sucursal,
            ISNULL(cc.nombre, 'Centro no encontrado') as centro_costo_nombre,
            ROW_NUMBER() OVER (ORDER BY fe.fecha_procesamiento DESC, fe.FECHA_EMISION DESC) as RowNum
          FROM TB_FACTURA_ENCABEZADO fe
          LEFT JOIN sucursales s ON fe.id_sucursal = s.id
          LEFT JOIN centros_costos cc ON fe.id_centro_costo = cc.id
          WHERE fe.estado = 'PROCESADA'
          ${whereClause}
        )
        SELECT 
          id, archivo_nombre, emisor_rut, emisor_razon_social, receptor_rut, receptor_razon_social,
          folio, fecha_emision, monto_total, estado, id_centro_costo, id_sucursal, fecha_procesamiento,
          sucursal_nombre, tipo_sucursal, centro_costo_nombre
        FROM FacturasProcesadasPaginadas
        WHERE RowNum BETWEEN @startRow AND @endRow
      `;
      
      const consultaTotal = `
        SELECT COUNT(*) as total 
        FROM TB_FACTURA_ENCABEZADO fe
        LEFT JOIN sucursales s ON fe.id_sucursal = s.id
        LEFT JOIN centros_costos cc ON fe.id_centro_costo = cc.id
        WHERE fe.estado = 'PROCESADA'
        ${whereClause}
      `;
      
      const requestPrincipal = pool.request()
        .input('startRow', sql.Int, startRow)
        .input('endRow', sql.Int, endRow);
      
      sqlParams.forEach(param => {
        requestPrincipal.input(param.name, param.type, param.value);
      });
      
      const facturas = await requestPrincipal.query(consulta);
      
      const requestTotal = pool.request();
      sqlParams.forEach(param => {
        requestTotal.input(param.name, param.type, param.value);
      });
      
      const totalResult = await requestTotal.query(consultaTotal);
      const total = totalResult.recordset[0].total;
      const totalPages = Math.ceil(total / limit);
      
      // Formatear RUTs
      const facturasFormateadas = facturas.recordset.map(factura => ({
        ...factura,
        emisor_rut: formatearRUT(factura.emisor_rut),
        receptor_rut: formatearRUT(factura.receptor_rut)
      }));
      
      const filtrosAplicados = [];
      if (fecha_desde) filtrosAplicados.push(`desde ${fecha_desde}`);
      if (fecha_hasta) filtrosAplicados.push(`hasta ${fecha_hasta}`);
      if (search) filtrosAplicados.push(`texto "${search}"`);
      
      const mensajeFiltros = filtrosAplicados.length > 0 
        ? ` (filtros: ${filtrosAplicados.join(', ')})` 
        : '';
      
      console.log(`✅ ${facturas.recordset.length} facturas procesadas obtenidas de ${total} total (con JOINs)${mensajeFiltros}`);
      
      return res.json({ 
        success: true, 
        data: facturasFormateadas,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalRecords: total,
          recordsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        filtros_aplicados: {
          fecha_desde: fecha_desde || null,
          fecha_hasta: fecha_hasta || null,
          busqueda: search || null
        },
        message: `${facturas.recordset.length} facturas procesadas cargadas${mensajeFiltros}`
      });
      
    } catch (joinError) {
      console.log('⚠️ Error con JOINs, usando consulta simple:', joinError.message);
      
      // Consulta simple sin JOINs si las tablas relacionadas no existen
      const consultaSimple = `
        WITH FacturasProcesadasPaginadas AS (
          SELECT 
            fe.ID as id,
            fe.NOMBRE_ARCHIVO as archivo_nombre,
            fe.RUT_EMISOR as emisor_rut,
            fe.RZN_EMISOR as emisor_razon_social,
            fe.RUT_RECEPTOR as receptor_rut,
            fe.RZN_RECEPTOR as receptor_razon_social,
            fe.FOLIO as folio,
            fe.FECHA_EMISION as fecha_emision,
            fe.MONTO_TOTAL as monto_total,
            fe.estado,
            fe.id_centro_costo,
            fe.id_sucursal,
            fe.fecha_procesamiento,
            'Consultar manualmente' as sucursal_nombre,
            'N/A' as tipo_sucursal,
            'Consultar manualmente' as centro_costo_nombre,
            ROW_NUMBER() OVER (ORDER BY fe.fecha_procesamiento DESC, fe.FECHA_EMISION DESC) as RowNum
          FROM TB_FACTURA_ENCABEZADO fe
          WHERE fe.estado = 'PROCESADA'
          ${whereClause}
        )
        SELECT 
          id, archivo_nombre, emisor_rut, emisor_razon_social, receptor_rut, receptor_razon_social,
          folio, fecha_emision, monto_total, estado, id_centro_costo, id_sucursal, fecha_procesamiento,
          sucursal_nombre, tipo_sucursal, centro_costo_nombre
        FROM FacturasProcesadasPaginadas
        WHERE RowNum BETWEEN @startRow AND @endRow
      `;
      
      const consultaTotalSimple = `
        SELECT COUNT(*) as total 
        FROM TB_FACTURA_ENCABEZADO fe
        WHERE fe.estado = 'PROCESADA'
        ${whereClause}
      `;
      
      const requestSimple = pool.request()
        .input('startRow', sql.Int, startRow)
        .input('endRow', sql.Int, endRow);
      
      sqlParams.forEach(param => {
        requestSimple.input(param.name, param.type, param.value);
      });
      
      const facturasSimple = await requestSimple.query(consultaSimple);
      
      const requestTotalSimple = pool.request();
      sqlParams.forEach(param => {
        requestTotalSimple.input(param.name, param.type, param.value);
      });
      
      const totalSimple = await requestTotalSimple.query(consultaTotalSimple);
      const totalRecordsSimple = totalSimple.recordset[0].total;
      const totalPagesSimple = Math.ceil(totalRecordsSimple / limit);
      
      // Formatear RUTs
      const facturasSimpleFormateadas = facturasSimple.recordset.map(factura => ({
        ...factura,
        emisor_rut: formatearRUT(factura.emisor_rut),
        receptor_rut: formatearRUT(factura.receptor_rut)
      }));
      
      const filtrosAplicados = [];
      if (fecha_desde) filtrosAplicados.push(`desde ${fecha_desde}`);
      if (fecha_hasta) filtrosAplicados.push(`hasta ${fecha_hasta}`);
      if (search) filtrosAplicados.push(`texto "${search}"`);
      
      const mensajeFiltros = filtrosAplicados.length > 0 
        ? ` (filtros: ${filtrosAplicados.join(', ')})` 
        : '';
      
      console.log(`✅ ${facturasSimple.recordset.length} facturas procesadas obtenidas de ${totalRecordsSimple} total (consulta simple)${mensajeFiltros}`);
      
      return res.json({ 
        success: true, 
        data: facturasSimpleFormateadas,
        pagination: {
          currentPage: page,
          totalPages: totalPagesSimple,
          totalRecords: totalRecordsSimple,
          recordsPerPage: limit,
          hasNextPage: page < totalPagesSimple,
          hasPrevPage: page > 1
        },
        filtros_aplicados: {
          fecha_desde: fecha_desde || null,
          fecha_hasta: fecha_hasta || null,
          busqueda: search || null
        },
        message: `${facturasSimple.recordset.length} facturas procesadas (modo simplificado)${mensajeFiltros}`,
        advertencia: 'Tablas relacionadas no disponibles'
      });
    }
    
  } catch (error) {
    console.error('❌ Error al obtener facturas procesadas:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al obtener facturas procesadas: ' + error.message,
      error: error.message
    });
  }
};

// Obtener factura procesada por ID
exports.obtenerFacturaPorId = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de factura debe ser un número válido' 
      });
    }
    
    const pool = await poolPromise;
    
    // Intentar consulta con JOINs primero
    try {
      const facturaResult = await pool.request()
        .input('id', sql.Int, id)
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
      
      // Obtener detalles
      const detallesResult = await pool.request()
        .input('facturaId', sql.Int, id)
        .query('SELECT * FROM TB_FACTURA_DETALLE WHERE ID_FACTURA = @facturaId ORDER BY ID');
      
      const factura = facturaResult.recordset[0];
      factura.RUT_EMISOR = formatearRUT(factura.RUT_EMISOR);
      factura.RUT_RECEPTOR = formatearRUT(factura.RUT_RECEPTOR);
      factura.detalles = detallesResult.recordset;
      
      return res.json({
        success: true,
        data: factura
      });
      
    } catch (joinError) {
      console.log('⚠️ Error con JOINs, intentando consulta simple:', joinError.message);
      
      // Consulta simple sin JOINs
      const facturaSimple = await pool.request()
        .input('id', sql.Int, id)
        .query('SELECT * FROM TB_FACTURA_ENCABEZADO WHERE ID = @id');
      
      if (facturaSimple.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Factura no encontrada'
        });
      }
      
      const factura = facturaSimple.recordset[0];
      factura.RUT_EMISOR = formatearRUT(factura.RUT_EMISOR);
      factura.RUT_RECEPTOR = formatearRUT(factura.RUT_RECEPTOR);
      factura.sucursal_nombre = 'Consultar manualmente';
      factura.tipo_sucursal = 'N/A';
      factura.centro_costo_nombre = 'Consultar manualmente';
      factura.centro_costo_descripcion = 'Sin descripción';
      
      // Obtener detalles
      try {
        const detallesResult = await pool.request()
          .input('facturaId', sql.Int, id)
          .query('SELECT * FROM TB_FACTURA_DETALLE WHERE ID_FACTURA = @facturaId ORDER BY ID');
        factura.detalles = detallesResult.recordset;
      } catch (detalleError) {
        factura.detalles = [];
      }
      
      return res.json({
        success: true,
        data: factura,
        advertencia: 'Datos de tablas relacionadas no disponibles'
      });
    }
    
  } catch (error) {
    console.error('❌ Error al obtener factura:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al obtener factura: ' + error.message,
      error: error.message
    });
  }
};

// ==================== ESTADÍSTICAS ====================

// FUNCIÓN OPTIMIZADA: Estadísticas CON FILTROS DE FECHA
exports.estadisticas = async (req, res) => {
  try {
    console.log('📊 === OBTENIENDO ESTADÍSTICAS CON FILTROS ===');
    
    const pool = await poolPromise;
    const { fecha_desde, fecha_hasta, search } = req.query;
    
    console.log('📋 Filtros para estadísticas:', { 
      fecha_desde, 
      fecha_hasta, 
      search: search ? `"${search}"` : 'sin búsqueda'
    });
    
    // Construir filtros
    const { whereClause, sqlParams } = construirFiltros({ fecha_desde, fecha_hasta, search });
    const whereCondition = whereClause ? `WHERE 1=1 ${whereClause}` : '';
    
    console.log('🔍 WHERE clause para estadísticas:', whereCondition || 'sin filtros');
    
    // ESTADÍSTICAS GENERALES CON FILTROS
    const consultaEstadisticas = `
      SELECT 
        COUNT(*) as total_facturas,
        COUNT(CASE WHEN ISNULL(estado, 'PENDIENTE') = 'PENDIENTE' THEN 1 END) as total_facturas_pendientes,
        COUNT(CASE WHEN estado = 'PROCESADA' THEN 1 END) as total_facturas_procesadas,
        COUNT(DISTINCT RUT_EMISOR) as total_proveedores,
        ISNULL(SUM(MONTO_TOTAL), 0) as monto_total_general,
        ISNULL(SUM(CASE WHEN ISNULL(estado, 'PENDIENTE') = 'PENDIENTE' THEN MONTO_TOTAL END), 0) as monto_total_pendientes,
        ISNULL(SUM(CASE WHEN estado = 'PROCESADA' THEN MONTO_TOTAL END), 0) as monto_total_procesadas,
        ISNULL(SUM(MONTO_NETO), 0) as monto_neto_total,
        ISNULL(SUM(IVA), 0) as monto_iva_total
      FROM TB_FACTURA_ENCABEZADO fe
      ${whereCondition}
    `;
    
    const requestEstadisticas = pool.request();
    sqlParams.forEach(param => {
      requestEstadisticas.input(param.name, param.type, param.value);
    });
    
    const estadisticasGenerales = await requestEstadisticas.query(consultaEstadisticas);
    const stats = estadisticasGenerales.recordset[0];
    
    // ESTADÍSTICAS POR SUCURSAL (solo facturas procesadas) CON FILTROS
    let estadisticasSucursal = [];
    try {
      const consultaSucursal = `
        SELECT 
          ISNULL(s.nombre, CAST(fe.id_sucursal AS VARCHAR)) as sucursal,
          ISNULL(s.tipo_sucursal, 'N/A') as tipo_sucursal,
          COUNT(fe.ID) as facturas,
          ISNULL(SUM(fe.MONTO_TOTAL), 0) as monto_total,
          ISNULL(AVG(fe.MONTO_TOTAL), 0) as promedio_factura,
          MAX(fe.fecha_procesamiento) as ultima_factura
        FROM TB_FACTURA_ENCABEZADO fe
        LEFT JOIN sucursales s ON fe.id_sucursal = s.id
        WHERE fe.estado = 'PROCESADA' AND fe.id_sucursal IS NOT NULL
        ${whereClause}
        GROUP BY fe.id_sucursal, s.nombre, s.tipo_sucursal
        ORDER BY monto_total DESC
      `;
      
      const requestSucursal = pool.request();
      sqlParams.forEach(param => {
        requestSucursal.input(param.name, param.type, param.value);
      });
      
      const sucursalResult = await requestSucursal.query(consultaSucursal);
      estadisticasSucursal = sucursalResult.recordset;
    } catch (sucursalError) {
      console.log('⚠️ Error en estadísticas por sucursal:', sucursalError.message);
      // Consulta simple sin JOIN
      try {
        const consultaSucursalSimple = `
          SELECT 
            CAST(fe.id_sucursal AS VARCHAR) as sucursal,
            'Consultar manualmente' as tipo_sucursal,
            COUNT(fe.ID) as facturas,
            ISNULL(SUM(fe.MONTO_TOTAL), 0) as monto_total,
            ISNULL(AVG(fe.MONTO_TOTAL), 0) as promedio_factura,
            MAX(fe.fecha_procesamiento) as ultima_factura
          FROM TB_FACTURA_ENCABEZADO fe
          WHERE fe.estado = 'PROCESADA' AND fe.id_sucursal IS NOT NULL
          ${whereClause}
          GROUP BY fe.id_sucursal
          ORDER BY monto_total DESC
        `;
        
        const requestSucursalSimple = pool.request();
        sqlParams.forEach(param => {
          requestSucursalSimple.input(param.name, param.type, param.value);
        });
        
        const sucursalSimple = await requestSucursalSimple.query(consultaSucursalSimple);
        estadisticasSucursal = sucursalSimple.recordset;
      } catch (simpleError) {
        console.log('⚠️ Error en estadísticas por sucursal simple');
      }
    }
    
    // ESTADÍSTICAS POR CENTRO DE COSTO (solo facturas procesadas) CON FILTROS
    let estadisticasCentroCosto = [];
    try {
      const consultaCentroCosto = `
        SELECT 
          ISNULL(cc.nombre, fe.id_centro_costo) as centro_costo,
          fe.id_centro_costo as centro_id,
          COUNT(fe.ID) as facturas,
          ISNULL(SUM(fe.MONTO_TOTAL), 0) as monto_total,
          ISNULL(AVG(fe.MONTO_TOTAL), 0) as promedio_factura
        FROM TB_FACTURA_ENCABEZADO fe
        LEFT JOIN centros_costos cc ON fe.id_centro_costo = cc.id
        WHERE fe.estado = 'PROCESADA' AND fe.id_centro_costo IS NOT NULL
        ${whereClause}
        GROUP BY fe.id_centro_costo, cc.nombre
        ORDER BY monto_total DESC
      `;
      
      const requestCentroCosto = pool.request();
      sqlParams.forEach(param => {
        requestCentroCosto.input(param.name, param.type, param.value);
      });
      
      const centroCostoResult = await requestCentroCosto.query(consultaCentroCosto);
      estadisticasCentroCosto = centroCostoResult.recordset;
    } catch (centroError) {
      console.log('⚠️ Error en estadísticas por centro de costo:', centroError.message);
      // Consulta simple sin JOIN
      try {
        const consultaCentroSimple = `
          SELECT 
            fe.id_centro_costo as centro_costo,
            fe.id_centro_costo as centro_id,
            COUNT(fe.ID) as facturas,
            ISNULL(SUM(fe.MONTO_TOTAL), 0) as monto_total,
            ISNULL(AVG(fe.MONTO_TOTAL), 0) as promedio_factura
          FROM TB_FACTURA_ENCABEZADO fe
          WHERE fe.estado = 'PROCESADA' AND fe.id_centro_costo IS NOT NULL
          ${whereClause}
          GROUP BY fe.id_centro_costo
          ORDER BY monto_total DESC
        `;
        
        const requestCentroSimple = pool.request();
        sqlParams.forEach(param => {
          requestCentroSimple.input(param.name, param.type, param.value);
        });
        
        const centroSimple = await requestCentroSimple.query(consultaCentroSimple);
        estadisticasCentroCosto = centroSimple.recordset;
      } catch (simpleError) {
        console.log('⚠️ Error en estadísticas por centro de costo simple');
      }
    }
    
    // CONSTRUIR RESPUESTA FINAL
    const estadisticasCompletas = {
      total_facturas: stats.total_facturas || 0,
      total_facturas_pendientes: stats.total_facturas_pendientes || 0,
      total_facturas_procesadas: stats.total_facturas_procesadas || 0,
      total_proveedores: stats.total_proveedores || 0,
      monto_total: stats.monto_total_general || 0,
      monto_total_pendientes: stats.monto_total_pendientes || 0,
      monto_total_procesadas: stats.monto_total_procesadas || 0,
      por_sucursal: estadisticasSucursal || [],
      por_centro_costo: estadisticasCentroCosto || []
    };
    
    const filtrosAplicados = [];
    if (fecha_desde) filtrosAplicados.push(`desde ${fecha_desde}`);
    if (fecha_hasta) filtrosAplicados.push(`hasta ${fecha_hasta}`);
    if (search) filtrosAplicados.push(`texto "${search}"`);
    
    const mensajeFiltros = filtrosAplicados.length > 0 
      ? ` (filtros: ${filtrosAplicados.join(', ')})` 
      : '';
    
    console.log(`✅ Estadísticas completas construidas desde TB_FACTURA_ENCABEZADO${mensajeFiltros}`);
    
    return res.json({
      success: true,
      data: estadisticasCompletas,
      filtros_aplicados: {
        fecha_desde: fecha_desde || null,
        fecha_hasta: fecha_hasta || null,
        busqueda: search || null
      },
      message: `Estadísticas obtenidas exitosamente${mensajeFiltros}`,
      timestamp: new Date(),
      fuente: 'TB_FACTURA_ENCABEZADO'
    });
    
  } catch (error) {
    console.error('💥 === ERROR GENERAL EN ESTADÍSTICAS ===', error.message);
    
    // Estadísticas vacías en caso de error
    const estadisticasVacias = {
      total_facturas: 0,
      total_facturas_procesadas: 0,
      total_facturas_pendientes: 0,
      total_proveedores: 0,
      monto_total: 0,
      monto_total_pendientes: 0,
      monto_total_procesadas: 0,
      por_sucursal: [],
      por_centro_costo: []
    };
    
    return res.json({
      success: true,
      data: estadisticasVacias,
      message: 'Error al obtener estadísticas: ' + error.message,
      fuente: 'ERROR_FALLBACK'
    });
  }
};

// ==================== INFORMACIÓN DE EMPRESA ====================

// Nueva función para obtener información de empresa
exports.obtenerInformacionEmpresa = async (req, res) => {
  try {
    const pool = await poolPromise;
    
    // Intentar obtener información de empresa desde alguna tabla de configuración
    // Si no existe, devolver información por defecto
    try {
      const empresaResult = await pool.request().query(`
        SELECT TOP 1
          razon_social,
          rut,
          base_datos,
          created_at
        FROM configuracion_empresa
        ORDER BY created_at DESC
      `);
      
      if (empresaResult.recordset.length > 0) {
        return res.json({
          success: true,
          data: empresaResult.recordset[0]
        });
      }
    } catch (empresaError) {
      console.log('⚠️ Tabla configuracion_empresa no encontrada, usando datos por defecto');
    }
    
    // Datos por defecto si no existe configuración
    const empresaPorDefecto = {
      razon_social: "Empresa Ejemplo S.A.",
      rut: "76.123.456-7",
      base_datos: "Sistema Principal",
      created_at: new Date()
    };
    
    return res.json({
      success: true,
      data: empresaPorDefecto,
      message: 'Información por defecto - Configurar tabla configuracion_empresa para datos reales'
    });
    
  } catch (error) {
    console.error('❌ Error al obtener información de empresa:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener información de empresa',
      error: error.message
    });
  }
};

// ==================== FUNCIONES DE SOPORTE ====================

// Obtener sucursales del usuario
exports.obtenerSucursalesUsuario = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado. Token JWT inválido.'
      });
    }

    const pool = await poolPromise;
    
    try {
      const result = await pool.request()
        .query(`
          SELECT 
            id, 
            nombre, 
            tipo_sucursal,
            ip,
            base_datos,
            id_razon_social
          FROM sucursales 
          ORDER BY nombre
        `);

      return res.json({
        success: true,
        data: result.recordset,
        message: `${result.recordset.length} sucursales disponibles`,
        usuario_id: userId
      });
      
    } catch (tableError) {
      // Si la tabla sucursales no existe, devolver datos por defecto
      const sucursalesPorDefecto = [
        { id: 1, nombre: 'Sucursal Principal', tipo_sucursal: 'PRINCIPAL', ip: 'localhost', base_datos: 'principal', id_razon_social: 1 },
        { id: 2, nombre: 'Sucursal Secundaria', tipo_sucursal: 'SECUNDARIA', ip: 'localhost', base_datos: 'secundaria', id_razon_social: 1 }
      ];
      
      return res.json({
        success: true,
        data: sucursalesPorDefecto,
        message: 'Datos por defecto - Crear tabla sucursales para datos reales',
        usuario_id: userId
      });
    }

  } catch (error) {
    console.error('❌ Error al obtener sucursales:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener sucursales',
      error: error.message
    });
  }
};

// Obtener centros de costos
exports.obtenerCentrosCostos = async (req, res) => {
  try {
    const pool = await poolPromise;
    
    try {
      const result = await pool.request()
        .query(`
          SELECT 
            id, 
            nombre, 
            descripcion, 
            activo,
            created_at,
            updated_at
          FROM centros_costos 
          WHERE activo = 1 
          ORDER BY nombre
        `);
      
      return res.json({
        success: true,
        data: result.recordset
      });
      
    } catch (tableError) {
      const centrosPorDefecto = [
        { id: 'ADM', nombre: 'Administración', descripcion: 'Gastos administrativos generales', activo: true },
        { id: 'VEN', nombre: 'Ventas', descripcion: 'Gastos del área comercial', activo: true },
        { id: 'PRO', nombre: 'Producción', descripcion: 'Costos de producción y manufactura', activo: true },
        { id: 'LOG', nombre: 'Logística', descripcion: 'Transporte y almacenamiento', activo: true },
        { id: 'MKT', nombre: 'Marketing', descripcion: 'Publicidad y promoción', activo: true }
      ];
      
      return res.json({
        success: true,
        data: centrosPorDefecto,
        message: 'Datos por defecto - Crear tabla centros_costos para datos reales'
      });
    }
    
  } catch (error) {
    console.error('❌ Error al obtener centros de costos:', error);
    return res.json({
      success: true,
      data: [],
      message: 'Error de conexión - Lista vacía'
    });
  }
};

// Actualizar asignaciones de una factura específica
exports.actualizarAsignaciones = async (req, res) => {
  try {
    const facturaId = parseInt(req.params.id);
    const { centroCostos, sucursal } = req.body;
    const userId = req.user?.id || 1;
    
    if (isNaN(facturaId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de factura debe ser un número válido' 
      });
    }

    if (!centroCostos || !sucursal) {
      return res.status(400).json({
        success: false,
        message: 'Centro de costos y sucursal son requeridos'
      });
    }

    const pool = await poolPromise;
    
    // Verificar que la factura existe
    const facturaCheck = await pool.request()
      .input('id', sql.Int, facturaId)
      .query('SELECT ID, FOLIO, RZN_EMISOR FROM TB_FACTURA_ENCABEZADO WHERE ID = @id');
    
    if (facturaCheck.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }
    
    // Actualizar asignaciones
    await pool.request()
      .input('id', sql.Int, facturaId)
      .input('centroCosto', sql.VarChar(10), centroCostos)
      .input('sucursal', sql.Int, parseInt(sucursal))
      .input('userId', sql.Int, userId)
      .input('estado', sql.VarChar(20), 'PROCESADA')
      .input('fechaProcesamiento', sql.DateTime, new Date())
      .query(`
        UPDATE TB_FACTURA_ENCABEZADO 
        SET 
          id_centro_costo = @centroCosto,
          id_sucursal = @sucursal,
          procesado_por = @userId,
          estado = @estado,
          fecha_procesamiento = @fechaProcesamiento
        WHERE ID = @id
      `);
    
    const factura = facturaCheck.recordset[0];
    
    return res.json({
      success: true,
      message: `Asignaciones actualizadas para factura ${factura.FOLIO}`,
      data: {
        id: facturaId,
        folio: factura.FOLIO,
        emisor: factura.RZN_EMISOR,
        nuevoCentroCosto: centroCostos,
        nuevaSucursal: sucursal,
        timestamp: new Date()
      }
    });
    
  } catch (error) {
    console.error('❌ Error actualizando asignaciones:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar asignaciones de la factura',
      error: error.message
    });
  }
};

// ==================== FUNCIONES XML MANUAL (OPCIONAL) ====================

// Procesar XML manual (si se desea mantener esta funcionalidad)
exports.procesarXML = async (req, res) => {
  try {
    console.log('🚀 === PROCESAMIENTO XML MANUAL ===');
    
    const { xmlContent, archivoNombre, analisis, centroCostos, sucursal } = req.body;
    const userId = req.user?.id || 1;
    
    if (!xmlContent || !analisis || !centroCostos || !sucursal) {
      return res.status(400).json({
        success: false,
        message: 'Datos incompletos para procesar XML'
      });
    }

    const pool = await poolPromise;
    
    // Verificar si ya existe una factura con el mismo folio y emisor
    const existeResult = await pool.request()
      .input('folio', sql.VarChar(20), analisis.documento.folio)
      .input('rutEmisor', sql.VarChar(20), analisis.emisor.rut)
      .query('SELECT COUNT(*) as count FROM TB_FACTURA_ENCABEZADO WHERE FOLIO = @folio AND RUT_EMISOR = @rutEmisor');
    
    if (existeResult.recordset[0].count > 0) {
      return res.status(409).json({
        success: false,
        message: 'Esta factura ya existe en el sistema'
      });
    }
    
    // Insertar nueva factura en TB_FACTURA_ENCABEZADO
    const insertResult = await pool.request()
      .input('nombre_archivo', sql.VarChar(255), truncarTexto(archivoNombre, 255))
      .input('folio', sql.VarChar(20), truncarTexto(analisis.documento.folio, 20))
      .input('fecha_emision', sql.DateTime, new Date(analisis.documento.fechaEmision))
      .input('rut_emisor', sql.VarChar(20), truncarTexto(analisis.emisor.rut, 20))
      .input('rzn_emisor', sql.VarChar(255), truncarTexto(analisis.emisor.razonSocial, 255))
      .input('rut_receptor', sql.VarChar(20), truncarTexto(analisis.receptor.rut, 20))
      .input('rzn_receptor', sql.VarChar(255), truncarTexto(analisis.receptor.razonSocial, 255))
      .input('monto_neto', sql.Decimal(15, 2), parseFloat(analisis.totales.neto || 0))
      .input('iva', sql.Decimal(15, 2), parseFloat(analisis.totales.iva || 0))
      .input('monto_total', sql.Decimal(15, 2), parseFloat(analisis.totales.total || 0))
      .input('id_centro_costo', sql.VarChar(10), centroCostos)
      .input('id_sucursal', sql.Int, parseInt(sucursal))
      .input('procesado_por', sql.Int, userId)
      .input('estado', sql.VarChar(20), 'PROCESADA')
      .input('fecha_procesamiento', sql.DateTime, new Date())
      .query(`
        INSERT INTO TB_FACTURA_ENCABEZADO (
          NOMBRE_ARCHIVO, FOLIO, FECHA_EMISION, RUT_EMISOR, RZN_EMISOR,
          RUT_RECEPTOR, RZN_RECEPTOR, MONTO_NETO, IVA, MONTO_TOTAL,
          id_centro_costo, id_sucursal, procesado_por, estado, fecha_procesamiento
        )
        VALUES (
          @nombre_archivo, @folio, @fecha_emision, @rut_emisor, @rzn_emisor,
          @rut_receptor, @rzn_receptor, @monto_neto, @iva, @monto_total,
          @id_centro_costo, @id_sucursal, @procesado_por, @estado, @fecha_procesamiento
        );
        SELECT SCOPE_IDENTITY() as nuevoId;
      `);
    
    const nuevaFacturaId = insertResult.recordset[0].nuevoId;
    
    // Insertar detalles si existen
    let productosInsertados = 0;
    if (analisis.detalles && Array.isArray(analisis.detalles)) {
      for (const detalle of analisis.detalles) {
        try {
          await pool.request()
            .input('id_factura', sql.Int, nuevaFacturaId)
            .input('codigo_item', sql.VarChar(50), truncarTexto(detalle.codigo || '', 50))
            .input('nombre_item', sql.VarChar(255), truncarTexto(detalle.nombre || 'Producto sin descripción', 255))
            .input('cantidad', sql.Decimal(10, 2), parseFloat(detalle.cantidad || 1))
            .input('precio', sql.Decimal(15, 2), parseFloat(detalle.precio || 0))
            .input('monto', sql.Decimal(15, 2), parseFloat(detalle.total || 0))
            .query(`
              INSERT INTO TB_FACTURA_DETALLE (
                ID_FACTURA, CODIGO_ITEM, NOMBRE_ITEM, CANTIDAD, PRECIO, MONTO
              )
              VALUES (
                @id_factura, @codigo_item, @nombre_item, @cantidad, @precio, @monto
              )
            `);
          productosInsertados++;
        } catch (detalleError) {
          console.error('⚠️ Error insertando producto:', detalleError.message);
        }
      }
    }
    
    return res.status(201).json({
      success: true,
      message: 'Factura XML procesada exitosamente',
      data: {
        id: nuevaFacturaId,
        folio: analisis.documento.folio,
        emisor: analisis.emisor.razonSocial,
        monto_total: analisis.totales.total,
        productos_insertados: productosInsertados,
        centro_costo: centroCostos,
        sucursal: sucursal
      }
    });
    
  } catch (error) {
    console.error('💥 === ERROR PROCESAMIENTO XML MANUAL ===', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar XML manual: ' + error.message,
      error: error.message
    });
  }
};

// Validar XML
exports.validarXML = async (req, res) => {
  try {
    const { xmlContent } = req.body;
    
    if (!xmlContent) {
      return res.status(400).json({
        success: false,
        message: 'Contenido XML requerido'
      });
    }
    
    // Parsear XML
    const xmlObj = await parseXML(xmlContent);
    
    // Validaciones básicas
    const errores = [];
    const advertencias = [];
    
    // Validar estructura DTE
    if (!xmlObj.DTE) {
      errores.push('No es un documento DTE válido');
    }
    
    // Validar tipo de documento
    const tipoDTE = xmlObj.DTE?.Documento?.Encabezado?.IdDoc?.TipoDTE;
    if (tipoDTE !== '33') {
      errores.push('Solo se permiten Facturas Electrónicas (tipo 33)');
    }
    
    // Validar RUT emisor
    const rutEmisor = xmlObj.DTE?.Documento?.Encabezado?.Emisor?.RUTEmisor;
    if (!rutEmisor || !validarRUT(rutEmisor)) {
      errores.push('RUT del emisor inválido');
    }
    
    // Validar RUT receptor
    const rutReceptor = xmlObj.DTE?.Documento?.Encabezado?.Receptor?.RUTRecep;
    if (!rutReceptor || !validarRUT(rutReceptor)) {
      errores.push('RUT del receptor inválido');
    }
    
    // Validar folio
    const folio = xmlObj.DTE?.Documento?.Encabezado?.IdDoc?.Folio;
    if (!folio) {
      errores.push('Folio del documento requerido');
    }
    
    // Validar monto total
    const montoTotal = xmlObj.DTE?.Documento?.Encabezado?.Totales?.MntTotal;
    if (!montoTotal || parseFloat(montoTotal) <= 0) {
      advertencias.push('Monto total cero o inválido');
    }
    
    return res.json({
      success: true,
      data: {
        valido: errores.length === 0,
        errores: errores,
        advertencias: advertencias,
        folio: folio,
        emisor: xmlObj.DTE?.Documento?.Encabezado?.Emisor?.RznSoc,
        monto_total: montoTotal
      }
    });
    
  } catch (error) {
    console.error('❌ Error validando XML:', error);
    return res.status(400).json({
      success: false,
      message: 'Error al validar XML: ' + error.message,
      error: error.message
    });
  }
};

// Eliminar factura
exports.eliminarFactura = async (req, res) => {
  let transaction = null;
  
  try {
    const facturaId = parseInt(req.params.id);
    const userId = req.user?.id || 1;
    
    if (isNaN(facturaId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de factura debe ser un número válido'
      });
    }
    
    const pool = await poolPromise;
    transaction = pool.transaction();
    await transaction.begin();
    
    // Verificar que la factura existe
    const facturaCheck = await transaction.request()
      .input('id', sql.Int, facturaId)
      .query('SELECT ID, FOLIO, RZN_EMISOR FROM TB_FACTURA_ENCABEZADO WHERE ID = @id');
    
    if (facturaCheck.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }
    
    const factura = facturaCheck.recordset[0];
    
    // Eliminar detalles primero
    await transaction.request()
      .input('facturaId', sql.Int, facturaId)
      .query('DELETE FROM TB_FACTURA_DETALLE WHERE ID_FACTURA = @facturaId');
    
    // Eliminar factura principal
    await transaction.request()
      .input('id', sql.Int, facturaId)
      .query('DELETE FROM TB_FACTURA_ENCABEZADO WHERE ID = @id');
    
    await transaction.commit();
    
    return res.json({
      success: true,
      message: `Factura ${factura.FOLIO} eliminada exitosamente`,
      data: {
        id: facturaId,
        folio: factura.FOLIO,
        emisor: factura.RZN_EMISOR,
        eliminado_por: userId,
        timestamp: new Date()
      }
    });
    
  } catch (error) {
    console.error('❌ Error eliminando factura:', error);
    
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('❌ Error en rollback:', rollbackError.message);
      }
    }
    
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar factura: ' + error.message,
      error: error.message
    });
  }
};

module.exports = exports;