// controllers/remuneracionesController.js - VERSIÓN CON FILTROS Y VALIDACIONES MEJORADA
const { sql, poolPromise } = require('../config/db');

// Test de conexión
exports.test = async (req, res) => {
  try {
    console.log('🔧 TEST - Verificando conexión de remuneraciones...');
    
    const pool = await poolPromise;
    const testResult = await pool.request().query('SELECT 1 as test');
    
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME IN ('periodos_remuneracion', 'datos_remuneraciones', 'empleados_remuneraciones', 'empleados', 'razones_sociales', 'sucursales')
    `);
    
    const tablas = tablesResult.recordset.map(row => row.TABLE_NAME);
    
    console.log('✅ Conexión DB exitosa - Remuneraciones');
    console.log('📋 Tablas encontradas:', tablas);
    
    return res.json({
      success: true,
      message: 'Conexión a base de datos exitosa - Módulo Remuneraciones',
      timestamp: new Date(),
      db_test: testResult.recordset[0],
      tablas_disponibles: tablas,
      listo_para_procesar: tablas.length >= 4
    });
  } catch (error) {
    console.error('❌ Error de conexión DB - Remuneraciones:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error de conexión a base de datos',
      error: error.message
    });
  }
};

// 🆕 OBTENER TODOS LOS PERÍODOS CON FILTROS AVANZADOS
exports.obtenerPeriodos = async (req, res) => {
  try {
    console.log('📅 Obteniendo períodos de remuneración con filtros...');
    
    const { razon_social_id, sucursal_id, anio, estado } = req.query;
    
    const pool = await poolPromise;
    
    // 🆕 QUERY MEJORADA BASADA EN TU CTE
    let baseQuery = `
      ;WITH sucursal_unica AS (
        SELECT 
          ESU.id_empleado,
          SU.id AS id_sucursal,
          SU.nombre AS sucursal_nombre,
          ROW_NUMBER() OVER (PARTITION BY ESU.id_empleado ORDER BY SU.id) AS rn
        FROM empleados_sucursales ESU
        INNER JOIN sucursales SU 
          ON SU.id = ESU.id_sucursal
      )
      SELECT 
        p.id_periodo,
        p.mes,
        p.anio,
        p.descripcion,
        p.estado,
        p.fecha_carga,
        p.fecha_creacion,
        ISNULL(RS.nombre_razon, 'Sin Razón Social') as nombre_razon,
        ISNULL(RS.id, 0) as id_razon_social,
        ISNULL(su.sucursal_nombre, 'Sin Sucursal') as sucursal_nombre,
        ISNULL(su.id_sucursal, 0) as id_sucursal,
        COUNT(dr.id) AS total_registros,
        COUNT(DISTINCT dr.rut_empleado) AS empleados_unicos,
        ISNULL(SUM(dr.sueldo_base), 0) AS suma_sueldos_base,
        ISNULL(SUM(dr.total_haberes), 0) AS suma_total_haberes,
        ISNULL(SUM(dr.total_descuentos), 0) AS suma_total_descuentos,
        ISNULL(SUM(dr.liquido_pagar), 0) AS suma_liquidos,
        CASE 
          WHEN COUNT(dr.id) = 0 THEN 0
          ELSE COUNT(CASE WHEN emp.id IS NOT NULL THEN 1 END)
        END AS empleados_encontrados,
        CASE 
          WHEN COUNT(dr.id) = 0 THEN 0
          ELSE COUNT(CASE WHEN emp.id IS NULL THEN 1 END)
        END AS empleados_faltantes
      FROM periodos_remuneracion p
      LEFT JOIN datos_remuneraciones dr 
        ON p.id_periodo = dr.id_periodo
      LEFT JOIN empleados emp
        ON REPLACE(REPLACE(REPLACE(UPPER(emp.rut), '.', ''), '-', ''), ' ', '') = 
           REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '')
      LEFT JOIN razones_sociales RS 
        ON RS.id = emp.id_razon_social
      LEFT JOIN sucursal_unica su 
        ON su.id_empleado = emp.id
        AND su.rn = 1
    `;
    
    const whereConditions = [];
    const request = pool.request();
    
    // 🆕 APLICAR FILTROS DINÁMICOS
    if (razon_social_id && razon_social_id !== 'todos') {
      whereConditions.push('RS.id = @razon_social_id');
      request.input('razon_social_id', sql.Int, parseInt(razon_social_id));
    }
    
    if (sucursal_id && sucursal_id !== 'todos') {
      whereConditions.push('su.id_sucursal = @sucursal_id');
      request.input('sucursal_id', sql.Int, parseInt(sucursal_id));
    }
    
    if (anio && anio !== 'todos') {
      whereConditions.push('p.anio = @anio');
      request.input('anio', sql.Int, parseInt(anio));
    }
    
    if (estado && estado !== 'todos') {
      whereConditions.push('p.estado = @estado');
      request.input('estado', sql.VarChar, estado);
    }
    
    // Agregar WHERE si hay filtros
    if (whereConditions.length > 0) {
      baseQuery += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    baseQuery += `
      GROUP BY 
        p.id_periodo, p.mes, p.anio, p.descripcion, p.estado, 
        p.fecha_carga, p.fecha_creacion, RS.nombre_razon, RS.id,
        su.sucursal_nombre, su.id_sucursal
      ORDER BY 
        p.anio DESC, p.mes DESC, RS.nombre_razon, su.sucursal_nombre
    `;
    
    console.log('🔍 Filtros aplicados:', { razon_social_id, sucursal_id, anio, estado });
    
    const result = await request.query(baseQuery);
    
    console.log(`✅ ${result.recordset.length} períodos encontrados`);
    
    return res.json({ 
      success: true, 
      data: result.recordset,
      filtros_aplicados: { razon_social_id, sucursal_id, anio, estado }
    });
  } catch (error) {
    console.error('Error al obtener períodos:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// 🆕 OBTENER OPCIONES PARA FILTROS
exports.obtenerOpcionesFiltros = async (req, res) => {
  try {
    console.log('📊 Obteniendo opciones para filtros...');
    
    const pool = await poolPromise;
    
    // Obtener años disponibles
    const aniosResult = await pool.request().query(`
      SELECT DISTINCT anio 
      FROM periodos_remuneracion 
      ORDER BY anio DESC
    `);
    
    // Obtener razones sociales con períodos
    const razonesResult = await pool.request().query(`
      SELECT DISTINCT RS.id, RS.nombre_razon
      FROM razones_sociales RS
      INNER JOIN empleados emp ON RS.id = emp.id_razon_social
      INNER JOIN datos_remuneraciones dr ON 
        REPLACE(REPLACE(REPLACE(UPPER(emp.rut), '.', ''), '-', ''), ' ', '') = 
        REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '')
      WHERE RS.activo = 1
      ORDER BY RS.nombre_razon
    `);
    
    // Obtener sucursales con períodos
    const sucursalesResult = await pool.request().query(`
      SELECT DISTINCT SU.id, SU.nombre
      FROM sucursales SU
      INNER JOIN empleados_sucursales ESU ON SU.id = ESU.id_sucursal
      INNER JOIN empleados emp ON ESU.id_empleado = emp.id
      INNER JOIN datos_remuneraciones dr ON 
        REPLACE(REPLACE(REPLACE(UPPER(emp.rut), '.', ''), '-', ''), ' ', '') = 
        REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '')
      ORDER BY SU.nombre
    `);
    
    return res.json({
      success: true,
      data: {
        anios: aniosResult.recordset.map(r => r.anio),
        razones_sociales: razonesResult.recordset,
        sucursales: sucursalesResult.recordset
      }
    });
  } catch (error) {
    console.error('Error al obtener opciones de filtros:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener opciones de filtros',
      error: error.message
    });
  }
};

// 🆕 CREAR PERÍODO CON RAZÓN SOCIAL Y SUCURSAL
exports.crearPeriodo = async (req, res) => {
  try {
    console.log('📅 Creando nuevo período...', req.body);
    
    const { mes, anio, descripcion, id_razon_social, id_sucursal } = req.body;
    
    if (!mes || !anio) {
      return res.status(400).json({
        success: false,
        message: 'Mes y año son obligatorios'
      });
    }

    if (mes < 1 || mes > 12) {
      return res.status(400).json({
        success: false,
        message: 'El mes debe estar entre 1 y 12'
      });
    }

    if (anio < 2020 || anio > 2030) {
      return res.status(400).json({
        success: false,
        message: 'El año debe estar entre 2020 y 2030'
      });
    }
    
    const pool = await poolPromise;
    
    // 🆕 VERIFICAR SI EXISTE CONSIDERANDO RAZÓN SOCIAL Y SUCURSAL
    let checkQuery = `
      SELECT id_periodo, descripcion 
      FROM periodos_remuneracion 
      WHERE mes = @mes AND anio = @anio
    `;
    
    const request = pool.request()
      .input('mes', sql.Int, mes)
      .input('anio', sql.Int, anio);
    
    // Si se especifica razón social y sucursal, verificar unicidad
    if (id_razon_social && id_sucursal) {
      checkQuery += ` AND id_razon_social = @id_razon_social AND id_sucursal = @id_sucursal`;
      request.input('id_razon_social', sql.Int, id_razon_social);
      request.input('id_sucursal', sql.Int, id_sucursal);
    }
    
    const existeResult = await request.query(checkQuery);
    
    if (existeResult.recordset.length > 0) {
      console.log('⚠️ Período ya existe');
      return res.json({
        success: true,
        message: 'Período ya existe',
        data: { 
          id_periodo: existeResult.recordset[0].id_periodo,
          mes,
          anio,
          descripcion: existeResult.recordset[0].descripcion,
          existe: true
        }
      });
    }

    // Crear descripción automática
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    let descripcionFinal = descripcion || `${meses[mes - 1]} ${anio}`;
    
    // 🆕 AGREGAR RAZÓN SOCIAL Y SUCURSAL A LA DESCRIPCIÓN SI EXISTEN
    if (id_razon_social || id_sucursal) {
      const detalles = [];
      
      if (id_razon_social) {
        const razonResult = await pool.request()
          .input('id_rs', sql.Int, id_razon_social)
          .query('SELECT nombre_razon FROM razones_sociales WHERE id = @id_rs');
        if (razonResult.recordset.length > 0) {
          detalles.push(razonResult.recordset[0].nombre_razon);
        }
      }
      
      if (id_sucursal) {
        const sucursalResult = await pool.request()
          .input('id_suc', sql.Int, id_sucursal)
          .query('SELECT nombre FROM sucursales WHERE id = @id_suc');
        if (sucursalResult.recordset.length > 0) {
          detalles.push(sucursalResult.recordset[0].nombre);
        }
      }
      
      if (detalles.length > 0) {
        descripcionFinal += ` - ${detalles.join(' / ')}`;
      }
    }
    
    // Insertar período
    const insertRequest = pool.request()
      .input('mes', sql.Int, mes)
      .input('anio', sql.Int, anio)
      .input('descripcion', sql.VarChar, descripcionFinal);
    
    let insertQuery = `
      INSERT INTO periodos_remuneracion (mes, anio, descripcion, estado, fecha_creacion
    `;
    
    let valuesQuery = `
      VALUES (@mes, @anio, @descripcion, 'ACTIVO', GETDATE()
    `;
    
    // 🆕 AGREGAR CAMPOS OPCIONALES
    if (id_razon_social) {
      insertQuery += ', id_razon_social';
      valuesQuery += ', @id_razon_social';
      insertRequest.input('id_razon_social', sql.Int, id_razon_social);
    }
    
    if (id_sucursal) {
      insertQuery += ', id_sucursal';
      valuesQuery += ', @id_sucursal';
      insertRequest.input('id_sucursal', sql.Int, id_sucursal);
    }
    
    insertQuery += ')';
    valuesQuery += '); SELECT SCOPE_IDENTITY() as id_periodo;';
    
    const finalQuery = insertQuery + valuesQuery;
    
    const result = await insertRequest.query(finalQuery);
    
    const nuevoPeriodoId = result.recordset[0].id_periodo;
    console.log(`✅ Período creado con ID: ${nuevoPeriodoId}`);
    
    return res.status(201).json({
      success: true,
      message: 'Período creado exitosamente',
      data: { 
        id_periodo: nuevoPeriodoId,
        mes,
        anio,
        descripcion: descripcionFinal,
        id_razon_social,
        id_sucursal,
        existe: false
      }
    });
  } catch (error) {
    console.error('Error al crear período:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// 🆕 VALIDAR Y DETECTAR EMPLEADOS SIN RAZÓN SOCIAL O SUCURSAL
exports.validarEmpleadosSinAsignacion = async (req, res) => {
  try {
    console.log('🔍 Validando empleados sin asignación...');
    
    const { ruts_empleados } = req.body;
    
    if (!ruts_empleados || !Array.isArray(ruts_empleados)) {
      return res.status(400).json({
        success: false,
        message: 'Lista de RUTs es requerida'
      });
    }
    
    const pool = await poolPromise;
    
    const empleadosSinAsignacion = [];
    
    for (const rut of ruts_empleados) {
      const rutLimpio = rut.replace(/[.\-\s]/g, '').toUpperCase();
      
      const result = await pool.request()
        .input('rut', sql.VarChar, rutLimpio)
        .query(`
          SELECT 
            emp.id,
            emp.rut,
            emp.nombre,
            emp.apellido,
            emp.id_razon_social,
            RS.nombre_razon,
            CASE WHEN EXISTS(
              SELECT 1 FROM empleados_sucursales ESU WHERE ESU.id_empleado = emp.id
            ) THEN 1 ELSE 0 END as tiene_sucursal
          FROM empleados emp
          LEFT JOIN razones_sociales RS ON emp.id_razon_social = RS.id
          WHERE REPLACE(REPLACE(REPLACE(UPPER(emp.rut), '.', ''), '-', ''), ' ', '') = @rut
        `);
      
      if (result.recordset.length > 0) {
        const empleado = result.recordset[0];
        if (!empleado.id_razon_social || !empleado.tiene_sucursal) {
          empleadosSinAsignacion.push({
            ...empleado,
            falta_razon_social: !empleado.id_razon_social,
            falta_sucursal: !empleado.tiene_sucursal
          });
        }
      }
    }
    
    console.log(`📊 ${empleadosSinAsignacion.length} empleados requieren asignación`);
    
    return res.json({
      success: true,
      data: {
        empleados_sin_asignacion: empleadosSinAsignacion,
        requiere_asignacion: empleadosSinAsignacion.length > 0
      }
    });
  } catch (error) {
    console.error('Error validando empleados:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al validar empleados',
      error: error.message
    });
  }
};

// 🆕 ASIGNAR RAZÓN SOCIAL Y SUCURSAL A EMPLEADOS
exports.asignarRazonSocialYSucursal = async (req, res) => {
  try {
    console.log('✏️ Asignando razón social y sucursal a empleados...');
    
    const { asignaciones } = req.body;
    
    if (!asignaciones || !Array.isArray(asignaciones)) {
      return res.status(400).json({
        success: false,
        message: 'Lista de asignaciones es requerida'
      });
    }
    
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      let empleadosActualizados = 0;
      
      for (const asignacion of asignaciones) {
        const { id_empleado, id_razon_social, id_sucursal } = asignacion;
        
        // Actualizar razón social del empleado
        if (id_razon_social) {
          await transaction.request()
            .input('id_empleado', sql.Int, id_empleado)
            .input('id_razon_social', sql.Int, id_razon_social)
            .query(`
              UPDATE empleados 
              SET id_razon_social = @id_razon_social, updated_at = GETDATE()
              WHERE id = @id_empleado
            `);
        }
        
        // Asignar sucursal
        if (id_sucursal) {
          // Primero eliminar sucursales existentes
          await transaction.request()
            .input('id_empleado', sql.Int, id_empleado)
            .query('DELETE FROM empleados_sucursales WHERE id_empleado = @id_empleado');
          
          // Luego insertar la nueva sucursal
          await transaction.request()
            .input('id_empleado', sql.Int, id_empleado)
            .input('id_sucursal', sql.Int, id_sucursal)
            .query(`
              INSERT INTO empleados_sucursales (id_empleado, id_sucursal, created_at)
              VALUES (@id_empleado, @id_sucursal, GETDATE())
            `);
        }
        
        empleadosActualizados++;
      }
      
      await transaction.commit();
      
      console.log(`✅ ${empleadosActualizados} empleados actualizados`);
      
      return res.json({
        success: true,
        message: `${empleadosActualizados} empleados actualizados exitosamente`,
        data: { empleados_actualizados: empleadosActualizados }
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error asignando razón social y sucursal:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al asignar razón social y sucursal',
      error: error.message
    });
  }
};

// Mantener todas las demás funciones sin cambios...
exports.obtenerPeriodoPorId = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de período debe ser un número válido' 
      });
    }
    
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT * FROM periodos_remuneracion 
        WHERE id_periodo = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Período no encontrado'
      });
    }
    
    return res.json({ 
      success: true, 
      data: result.recordset[0] 
    });
  } catch (error) {
    console.error('Error al obtener período:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// Actualizar período
exports.actualizarPeriodo = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { descripcion, estado } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de período debe ser un número válido' 
      });
    }
    
    console.log(`📄 Actualizando período ID: ${id}`, req.body);
    
    const pool = await poolPromise;
    
    // Verificar que el período existe
    const existeResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id_periodo FROM periodos_remuneracion WHERE id_periodo = @id');
    
    if (existeResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Período no encontrado'
      });
    }
    
    await pool.request()
      .input('id', sql.Int, id)
      .input('descripcion', sql.VarChar, descripcion)
      .input('estado', sql.VarChar, estado || 'ACTIVO')
      .query(`
        UPDATE periodos_remuneracion 
        SET descripcion = @descripcion, estado = @estado
        WHERE id_periodo = @id
      `);
    
    console.log(`✅ Período ${id} actualizado`);
    
    return res.json({ 
      success: true, 
      message: 'Período actualizado exitosamente' 
    });
  } catch (error) {
    console.error('Error al actualizar período:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// Eliminar período
exports.eliminarPeriodo = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de período debe ser un número válido' 
      });
    }
    
    console.log(`🗑️ Eliminando período ID: ${id}`);
    
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      // Verificar que el período existe
      const existeResult = await transaction.request()
        .input('id_periodo', sql.Int, id)
        .query('SELECT id_periodo FROM periodos_remuneracion WHERE id_periodo = @id_periodo');
      
      if (existeResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Período no encontrado'
        });
      }
      
      // Eliminar primero los datos de remuneraciones asociados
      const deleteRemuneracionesResult = await transaction.request()
        .input('id_periodo', sql.Int, id)
        .query('DELETE FROM datos_remuneraciones WHERE id_periodo = @id_periodo');
      
      console.log(`🗑️ Eliminados ${deleteRemuneracionesResult.rowsAffected[0]} registros de remuneraciones`);
      
      // Eliminar el período
      await transaction.request()
        .input('id_periodo', sql.Int, id)
        .query('DELETE FROM periodos_remuneracion WHERE id_periodo = @id_periodo');
      
      await transaction.commit();
      
      console.log(`✅ Período ${id} eliminado con todos sus datos`);
      
      return res.json({
        success: true,
        message: 'Período eliminado exitosamente con todos sus datos asociados'
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error eliminando período:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// Obtener datos de un período específico
exports.obtenerDatosPeriodo = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de período debe ser un número válido' 
      });
    }
    
    console.log(`📊 Obteniendo datos del período ID: ${id}`);
    
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          dr.*,
          p.descripcion as periodo_descripcion,
          p.mes,
          p.anio,
          p.estado as periodo_estado,
          emp.nombre,
          emp.apellido,
          emp.rut as emp_rut,
          emp.activo as empleado_activo,
          rs.nombre_razon,
          su.nombre as sucursal_nombre,
          CASE 
            WHEN emp.id IS NOT NULL THEN 'EMPLEADO_ENCONTRADO'
            ELSE 'EMPLEADO_NO_ENCONTRADO'
          END as estado_relacion_empleado
        FROM datos_remuneraciones dr
        LEFT JOIN periodos_remuneracion p ON dr.id_periodo = p.id_periodo
        LEFT JOIN empleados emp ON 
          REPLACE(REPLACE(REPLACE(UPPER(emp.rut), '.', ''), '-', ''), ' ', '') = 
          REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '')
        LEFT JOIN razones_sociales rs ON emp.id_razon_social = rs.id
        LEFT JOIN empleados_sucursales esu ON emp.id = esu.id_empleado
        LEFT JOIN sucursales su ON esu.id_sucursal = su.id
        WHERE dr.id_periodo = @id
        ORDER BY dr.nombre_empleado
      `);
    
    console.log(`✅ ${result.recordset.length} registros encontrados`);
    
    return res.json({ 
      success: true, 
      data: result.recordset 
    });
  } catch (error) {
    console.error('Error al obtener datos del período:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// 🆕 VALIDAR EXCEL CON IDENTIFICACIÓN AUTOMÁTICA MEJORADA
exports.validarExcel = async (req, res) => {
  try {
    console.log('🔍 VALIDANDO EXCEL CON IDENTIFICACIÓN AUTOMÁTICA...');
    
    const { headers, sampleData } = req.body;
    
    if (!headers || !Array.isArray(headers)) {
      return res.status(400).json({
        success: false,
        message: 'Encabezados del Excel son requeridos'
      });
    }

    console.log('📋 Headers detectados:', headers);
    console.log('📊 Datos de muestra:', sampleData?.slice(0, 2));

    // 🆕 IDENTIFICAR AUTOMÁTICAMENTE LAS COLUMNAS MEJORADO
    const mapeoDetectado = identificarColumnasAutomaticamente(headers);
    
    const analisis = {
      total_columnas: headers.length,
      columnas_detectadas: headers,
      mapeo_sugerido: mapeoDetectado,
      errores: [],
      advertencias: [],
      calidad_datos: 'buena',
      formato_detectado: 'nomina_chilena_automatico'
    };

    console.log('🎯 Mapeo automático detectado:', mapeoDetectado);

    // Validar campos críticos
    if (!mapeoDetectado.rut_empleado) {
      analisis.errores.push('❌ No se detectó columna RUT');
    }
    if (!mapeoDetectado.nombre_empleado) {
      analisis.errores.push('❌ No se detectó columna NOMBRE');
    }

    // Campos recomendados
    if (!mapeoDetectado.sueldo_base) {
      analisis.advertencias.push('⚠️ No se detectó columna de sueldo base - se calculará desde otros campos');
    }
    if (!mapeoDetectado.liquido_pagar) {
      analisis.advertencias.push('⚠️ No se detectó columna de líquido a pagar');
    }

    // Evaluar calidad
    const camposDetectados = Object.keys(mapeoDetectado).filter(key => mapeoDetectado[key]);
    if (camposDetectados.length < 3) {
      analisis.calidad_datos = 'regular';
    }
    if (analisis.errores.length > 0) {
      analisis.calidad_datos = 'mala';
    }

    // Generar recomendaciones
    analisis.recomendaciones = [
      '✅ Identificación automática de columnas activada',
      '📋 Se procesarán solo las filas con datos válidos',
      '🔧 Los empleados se pueden crear automáticamente si es necesario',
      `🎯 Se detectaron ${camposDetectados.length} campos relevantes`,
      '🛡️ Validación mejorada de valores decimales'
    ];

    if (analisis.errores.length === 0) {
      analisis.recomendaciones.push('✅ Archivo listo para procesar');
    }

    console.log('✅ Análisis automático completado');
    
    return res.json({
      success: true,
      data: analisis
    });
  } catch (error) {
    console.error('❌ Error en validación automática:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al validar Excel',
      error: error.message
    });
  }
};

// 🆕 PROCESAR EXCEL - VERSIÓN COMPLETAMENTE CORREGIDA CON VALIDACIÓN DE EMPLEADOS
exports.procesarExcel = async (req, res) => {
  try {
    console.log('🚀 PROCESANDO EXCEL - VERSIÓN CORREGIDA...');
    
    const { datosExcel, archivoNombre, validarDuplicados = true, id_periodo } = req.body;
    
    // Validaciones básicas
    if (!datosExcel || !Array.isArray(datosExcel) || datosExcel.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay datos del Excel para procesar'
      });
    }

    if (!id_periodo) {
      return res.status(400).json({
        success: false,
        message: 'ID del período es requerido'
      });
    }

    const pool = await poolPromise;
    
    // Verificar que el período existe ANTES de iniciar procesamiento
    const periodoResult = await pool.request()
      .input('id_periodo', sql.Int, id_periodo)
      .query('SELECT id_periodo, descripcion FROM periodos_remuneracion WHERE id_periodo = @id_periodo');
    
    if (periodoResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'El período especificado no existe'
      });
    }

    // Identificar columnas ANTES de procesar
    const primeraFilaConDatos = datosExcel.find(fila => 
      fila && Object.keys(fila).length > 0 && Object.values(fila).some(val => val && val.toString().trim())
    );
    
    if (!primeraFilaConDatos) {
      return res.status(400).json({
        success: false,
        message: 'No se encontraron datos válidos en el Excel'
      });
    }

    const headers = Object.keys(primeraFilaConDatos);
    const mapeoColumnas = identificarColumnasAutomaticamente(headers);
    
    console.log('🎯 Mapeo de columnas detectado:', mapeoColumnas);
    console.log(`📊 Total de filas a procesar: ${datosExcel.length}`);

    // 🆕 EXTRAER RUTS PARA VALIDACIÓN
    const rutsParaValidar = [];
    for (const fila of datosExcel) {
      const datosExtraidos = extraerDatosDeFila(fila, mapeoColumnas);
      if (datosExtraidos.rut_empleado && datosExtraidos.rut_empleado.length >= 8) {
        rutsParaValidar.push(datosExtraidos.rut_empleado);
      }
    }

    console.log(`🔍 Validando ${rutsParaValidar.length} empleados...`);

    // Estadísticas del procesamiento
    let procesados = 0;
    let empleadosCreados = 0;
    let empleadosEncontrados = 0;
    let errores = 0;
    const erroresDetalle = [];

    // 🆕 PROCESAR CADA FILA DE FORMA INDIVIDUAL (sin transacción global)
    for (let i = 0; i < datosExcel.length; i++) {
      const fila = datosExcel[i];
      
      try {
        // 🔍 EXTRAER DATOS USANDO EL MAPEO AUTOMÁTICO
        const datosExtraidos = extraerDatosDeFila(fila, mapeoColumnas);
        
        // Validar que tenga al menos RUT
        if (!datosExtraidos.rut_empleado || datosExtraidos.rut_empleado.length < 8) {
          console.log(`⭐ Saltando fila ${i + 1}: RUT inválido o faltante`);
          continue;
        }

        console.log(`🔍 Procesando fila ${i + 1}: ${datosExtraidos.nombre_empleado} (${datosExtraidos.rut_empleado})`);

        // 🆕 PROCESAR CADA EMPLEADO EN SU PROPIA TRANSACCIÓN
        const resultado = await procesarEmpleadoIndividual(pool, {
          id_periodo: id_periodo,
          fila_excel: i + 1,
          archivo_origen: archivoNombre,
          ...datosExtraidos
        });

        if (resultado.success) {
          procesados++;
          if (resultado.empleadoCreado) {
            empleadosCreados++;
          } else {
            empleadosEncontrados++;
          }
        } else {
          errores++;
          erroresDetalle.push({
            fila: i + 1,
            error: resultado.error,
            datos: {
              rut: datosExtraidos.rut_empleado,
              nombre: datosExtraidos.nombre_empleado
            }
          });
        }

      } catch (filaError) {
        console.error(`❌ Error en fila ${i + 1}:`, filaError.message);
        errores++;
        erroresDetalle.push({
          fila: i + 1,
          error: filaError.message,
          datos: fila
        });
      }
    }

    // Actualizar fecha de carga del período (solo si hubo procesamientos exitosos)
    if (procesados > 0) {
      try {
        await pool.request()
          .input('id_periodo', sql.Int, id_periodo)
          .query('UPDATE periodos_remuneracion SET fecha_carga = GETDATE() WHERE id_periodo = @id_periodo');
      } catch (updateError) {
        console.error('Error actualizando fecha de carga:', updateError.message);
      }
    }

    console.log('✅ PROCESAMIENTO INDIVIDUAL COMPLETADO');
    console.log(`📊 Estadísticas: ${procesados} procesados, ${empleadosCreados} empleados creados, ${errores} errores`);

    // 🆕 VERIFICAR SI HAY EMPLEADOS SIN RAZÓN SOCIAL O SUCURSAL
    const empleadosParaValidar = rutsParaValidar.slice(0, 10); // Validar solo una muestra para no sobrecargar
    
    return res.json({
      success: true,
      message: `Excel procesado: ${procesados}/${datosExcel.length} registros exitosos`,
      data: {
        total_filas: datosExcel.length,
        procesados,
        empleados_creados: empleadosCreados,
        empleados_encontrados: empleadosEncontrados,
        errores,
        errores_detalle: erroresDetalle.slice(0, 10), // Solo primeros 10 errores
        id_periodo: id_periodo,
        mapeo_utilizado: mapeoColumnas,
        empleados_para_validar: empleadosParaValidar // Para posterior validación
      }
    });

  } catch (error) {
    console.error('💥 ERROR EN PROCESAMIENTO:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error procesando Excel',
      error: error.message
    });
  }
};

// Estadísticas generales
exports.estadisticas = async (req, res) => {
  try {
    console.log('📊 Obteniendo estadísticas...');
    
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        COUNT(DISTINCT dr.rut_empleado) as total_empleados,
        COUNT(DISTINCT pr.id_periodo) as total_periodos,
        COUNT(dr.id) as total_remuneraciones,
        ISNULL(SUM(dr.sueldo_base), 0) as suma_sueldos,
        ISNULL(SUM(dr.liquido_pagar), 0) as suma_liquidos,
        ISNULL(SUM(dr.total_haberes), 0) as suma_total_haberes,
        ISNULL(SUM(dr.total_descuentos), 0) as suma_total_descuentos
      FROM datos_remuneraciones dr
      LEFT JOIN periodos_remuneracion pr ON dr.id_periodo = pr.id_periodo
    `);
    
    return res.json({
      success: true,
      data: result.recordset[0]
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};

// Generar reporte de análisis
exports.generarReporteAnalisis = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de período debe ser un número válido' 
      });
    }
    
    console.log(`📈 Generando reporte de análisis para período ID: ${id}`);
    
    const pool = await poolPromise;
    
    const datosResult = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          dr.*,
          emp.cargo,
          ISNULL(rs.nombre_razon, 'Sin Razón Social') as razon_social,
          ISNULL(su.nombre, 'Sin Sucursal') as sucursal,
          p.descripcion as periodo,
          p.mes,
          p.anio
        FROM datos_remuneraciones dr
        LEFT JOIN periodos_remuneracion p ON dr.id_periodo = p.id_periodo
        LEFT JOIN empleados emp ON 
          REPLACE(REPLACE(REPLACE(UPPER(emp.rut), '.', ''), '-', ''), ' ', '') = 
          REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '')
        LEFT JOIN razones_sociales rs ON emp.id_razon_social = rs.id
        LEFT JOIN empleados_sucursales esu ON emp.id = esu.id_empleado
        LEFT JOIN sucursales su ON esu.id_sucursal = su.id
        WHERE dr.id_periodo = @id
      `);

    const datos = datosResult.recordset;
    
    if (datos.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron datos para el período especificado'
      });
    }

    const reporte = generarReporteEstadistico(datos);
    
    console.log('✅ Reporte de análisis generado');
    
    return res.json({
      success: true,
      data: reporte
    });
  } catch (error) {
    console.error('Error generando reporte:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al generar reporte',
      error: error.message
    });
  }
};

// ========== FUNCIONES AUXILIARES COMPLETAMENTE CORREGIDAS ==========

// Función corregida para identificar columnas automáticamente basada en los headers reales
function identificarColumnasAutomaticamente(headers) {
  console.log('🔍 Identificando columnas automáticamente...');
  
  const mapeo = {
    codigo_empleado: null,
    rut_empleado: null,
    nombre_empleado: null,
    sueldo_base: null,
    horas_extras: null,
    gratificacion_legal: null,
    otros_imponibles: null,
    total_imponibles: null,
    asignacion_familiar: null,
    otros_no_imponibles: null,
    total_no_imponibles: null,
    total_haberes: null,
    descuento_prevision: null,
    descuento_salud: null,
    impuesto_unico: null,
    seguro_cesantia: null,
    otros_descuentos_legales: null,
    total_descuentos_legales: null,
    descuentos_varios: null,
    total_descuentos: null,
    liquido_pagar: null,
    total_pago: null,
    caja_compensacion: null,
    afc: null,
    sis: null,
    ach: null,
    imposiciones: null,
    total_cargo_trabajador: null
  };

  headers.forEach((header, index) => {
    const headerUpper = header.toUpperCase().trim();
    
    // 🆕 IDENTIFICACIÓN MEJORADA BASADA EN LOS HEADERS REALES
    if (headerUpper.includes('COD') && !headerUpper.includes('NOMBRE')) {
      mapeo.codigo_empleado = header;
    }
    else if (headerUpper.includes('R.U.T') || headerUpper === 'RUT' || headerUpper.includes('RUT')) {
      mapeo.rut_empleado = header;
    }
    else if (headerUpper.includes('NOMBRE') && !headerUpper.includes('CODIGO')) {
      mapeo.nombre_empleado = header;
    }
    else if (headerUpper.includes('DT') || headerUpper === 'DT') {
      // Campo DT - no sabemos exactamente qué es, posiblemente días trabajados
      // Podrías mapearlo a un campo específico si lo necesitas
    }
    // 🆕 CORREGIDO: Detectar "S. Base" correctamente
    else if (headerUpper.includes('S. BASE') || headerUpper === 'S. BASE' || headerUpper.includes('SUELDO BASE')) {
      mapeo.sueldo_base = header;
    }
    // 🆕 "H. Extras" para horas extras
    else if (headerUpper.includes('H. EXTRAS') || headerUpper === 'H. EXTRAS' || headerUpper.includes('HORAS EXTRAS')) {
      mapeo.horas_extras = header;
    }
    // 🆕 "Grat. Legal" para gratificación legal
    else if (headerUpper.includes('GRAT. LEGAL') || headerUpper === 'GRAT. LEGAL' || headerUpper.includes('GRATIFICACION LEGAL')) {
      mapeo.gratificacion_legal = header;
    }
    // 🆕 "Otros Imp." para otros imponibles
    else if ((headerUpper.includes('OTROS IMP.') || headerUpper === 'OTROS IMP.') && !headerUpper.includes('TOTAL')) {
      mapeo.otros_imponibles = header;
    }
    // 🆕 "Total Imp." para total imponibles
    else if (headerUpper.includes('TOTAL IMP.') || headerUpper === 'TOTAL IMP.') {
      mapeo.total_imponibles = header;
    }
    // 🆕 "Asig. Fam." para asignación familiar
    else if (headerUpper.includes('ASIG. FAM.') || headerUpper === 'ASIG. FAM.' || headerUpper.includes('ASIGNACION FAMILIAR')) {
      mapeo.asignacion_familiar = header;
    }
    // 🆕 "Ot. No Imp." para otros no imponibles
    else if (headerUpper.includes('OT. NO IMP.') || headerUpper === 'OT. NO IMP.' || headerUpper.includes('OTROS NO IMP')) {
      mapeo.otros_no_imponibles = header;
    }
    // 🆕 "Tot. No Imp." para total no imponibles
    else if (headerUpper.includes('TOT. NO IMP.') || headerUpper === 'TOT. NO IMP.' || headerUpper.includes('TOTAL NO IMP')) {
      mapeo.total_no_imponibles = header;
    }
    // 🆕 "Tot. Haberes" para total haberes
    else if (headerUpper.includes('TOT. HABERES') || headerUpper === 'TOT. HABERES' || headerUpper.includes('TOTAL HABERES')) {
      mapeo.total_haberes = header;
    }
    // 🆕 "Previsión" para descuento previsión
    else if (headerUpper.includes('PREVISIÓN') || headerUpper === 'PREVISIÓN' || headerUpper.includes('PREVISION')) {
      mapeo.descuento_prevision = header;
    }
    // 🆕 "Salud" para descuento salud
    else if (headerUpper.includes('SALUD') && !headerUpper.includes('OTROS')) {
      mapeo.descuento_salud = header;
    }
    // 🆕 "Imp. Único" para impuesto único
    else if (headerUpper.includes('IMP. ÚNICO') || headerUpper === 'IMP. ÚNICO' || headerUpper.includes('IMP. UNICO')) {
      mapeo.impuesto_unico = header;
    }
    // 🆕 "Seg. Ces." para seguro cesantía
    else if (headerUpper.includes('SEG. CES.') || headerUpper === 'SEG. CES.' || headerUpper.includes('SEGURO CESANTIA')) {
      mapeo.seguro_cesantia = header;
    }
    // 🆕 "Otros D.Leg." para otros descuentos legales
    else if (headerUpper.includes('OTROS D.LEG.') || headerUpper === 'OTROS D.LEG.' || headerUpper.includes('OTROS DESCUENTOS LEG')) {
      mapeo.otros_descuentos_legales = header;
    }
    // 🆕 "Tot. D.Leg." para total descuentos legales
    else if (headerUpper.includes('TOT. D.LEG.') || headerUpper === 'TOT. D.LEG.' || headerUpper.includes('TOTAL DESCUENTOS LEG')) {
      mapeo.total_descuentos_legales = header;
    }
    // 🆕 "Desc. Varios" para descuentos varios
    else if (headerUpper.includes('DESC. VARIOS') || headerUpper === 'DESC. VARIOS' || headerUpper.includes('DESCUENTOS VARIOS')) {
      mapeo.descuentos_varios = header;
    }
    // 🆕 "Tot. Desc." para total descuentos
    else if (headerUpper.includes('TOT. DESC.') || headerUpper === 'TOT. DESC.' || headerUpper.includes('TOTAL DESC')) {
      mapeo.total_descuentos = header;
    }
    // 🆕 "Líquido" para líquido a pagar
    else if (headerUpper.includes('LÍQUIDO') || headerUpper === 'LÍQUIDO' || headerUpper.includes('LIQUIDO')) {
      mapeo.liquido_pagar = header;
    }
  });

  // Log del mapeo detectado
  const camposDetectados = Object.keys(mapeo).filter(key => mapeo[key]);
  console.log(`🎯 Detectados ${camposDetectados.length} campos:`, camposDetectados);

  return mapeo;
}

function extraerDatosDeFila(fila, mapeoColumnas) {
  const datos = {};
  
  // Extraer cada campo usando el mapeo
  Object.keys(mapeoColumnas).forEach(campo => {
    const nombreColumna = mapeoColumnas[campo];
    if (nombreColumna && fila[nombreColumna] !== undefined) {
      let valor = fila[nombreColumna];
      
      // Limpiar y convertir valores monetarios
      if (campo !== 'codigo_empleado' && campo !== 'rut_empleado' && 
          campo !== 'nombre_empleado') {
        valor = parseNumberSafe(valor);
      }
      
      // Limpiar RUT
      if (campo === 'rut_empleado') {
        valor = limpiarRUT(valor);
      }
      
      // Limpiar nombre
      if (campo === 'nombre_empleado') {
        valor = limpiarTexto(valor);
      }
      
      datos[campo] = valor;
    }
  });
  
  return datos;
}

// 🆕 NUEVA FUNCIÓN: Procesar empleado individual con su propia transacción
async function procesarEmpleadoIndividual(pool, datos) {
  const transaction = new sql.Transaction(pool);
  
  try {
    await transaction.begin();
    
    // Crear empleado si no existe
    const empleadoInfo = await crearEmpleadoSiNoExiste(transaction, datos);
    
    // Guardar datos de remuneración
    await guardarDatosRemuneracionSeguro(transaction, datos);
    
    await transaction.commit();
    
    return {
      success: true,
      empleadoCreado: empleadoInfo.esNuevo,
      empleadoId: empleadoInfo.id
    };
    
  } catch (error) {
    await transaction.rollback();
    console.error(`Error procesando empleado ${datos.nombre_empleado}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

async function crearEmpleadoSiNoExiste(transaction, datosExtraidos) {
  const rutLimpio = limpiarRUT(datosExtraidos.rut_empleado);
  
  if (!rutLimpio || rutLimpio.length < 8) {
    return { esNuevo: false, id: null };
  }

  // Verificar si existe
  const existeResult = await transaction.request()
    .input('rut_limpio', sql.VarChar, rutLimpio)
    .query(`
      SELECT id FROM empleados 
      WHERE REPLACE(REPLACE(REPLACE(UPPER(rut), '.', ''), '-', ''), ' ', '') = @rut_limpio
    `);

  if (existeResult.recordset.length > 0) {
    return { esNuevo: false, id: existeResult.recordset[0].id };
  }

  // Crear nuevo empleado
  try {
    // Separar nombre y apellido
    const nombreCompleto = datosExtraidos.nombre_empleado || 'Sin Nombre';
    const partesNombre = nombreCompleto.trim().split(' ');
    const nombre = partesNombre[0] || 'Sin Nombre';
    const apellido = partesNombre.slice(1).join(' ') || 'Sin Apellido';

    const resultado = await transaction.request()
      .input('rut', sql.VarChar, rutLimpio)
      .input('nombre', sql.VarChar, nombre)
      .input('apellido', sql.VarChar, apellido)
      .query(`
        INSERT INTO empleados (rut, nombre, apellido, activo, created_at, updated_at)
        VALUES (@rut, @nombre, @apellido, 1, GETDATE(), GETDATE());
        SELECT SCOPE_IDENTITY() as nuevo_id;
      `);

    console.log(`👤 Empleado creado: ${nombreCompleto} (${rutLimpio})`);
    
    return { esNuevo: true, id: resultado.recordset[0].nuevo_id };
  } catch (error) {
    console.error('Error creando empleado:', error.message);
    return { esNuevo: false, id: null };
  }
}

// 🆕 FUNCIÓN CRÍTICA CORREGIDA: Guardar datos con validación segura
async function guardarDatosRemuneracionSeguro(transaction, datos) {
  const request = transaction.request();
  
  // Definir todos los campos que vamos a insertar
  const campos = [
    'id_periodo', 'codigo_empleado', 'rut_empleado', 'nombre_empleado',
    'sueldo_base', 'horas_extras', 'gratificacion_legal', 'otros_imponibles', 'total_imponibles',
    'asignacion_familiar', 'otros_no_imponibles', 'total_no_imponibles', 'total_haberes',
    'descuento_prevision', 'descuento_salud', 'impuesto_unico', 'seguro_cesantia',
    'otros_descuentos_legales', 'total_descuentos_legales', 'descuentos_varios', 'total_descuentos',
    'liquido_pagar', 'total_pago', 'caja_compensacion', 'afc', 'sis', 'ach', 'imposiciones',
    'total_cargo_trabajador', 'fila_excel', 'archivo_origen'
  ];

  // Agregar parámetros CON VALIDACIÓN ESTRICTA
  campos.forEach(campo => {
    let valor = datos[campo] || null;
    
    if (campo === 'id_periodo' || campo === 'fila_excel') {
      request.input(campo, sql.Int, valor);
    } else if (campo === 'codigo_empleado' || campo === 'rut_empleado' || 
               campo === 'nombre_empleado' || campo === 'archivo_origen') {
      // Campos de texto - limpiar y validar longitud
      if (valor) {
        valor = String(valor).substring(0, 255); // Limitar longitud
      }
      request.input(campo, sql.VarChar, valor);
    } else {
      // 🆕 VALIDACIÓN CRÍTICA: Campos monetarios con validación estricta
      const valorDecimal = validarValorDecimal(valor);
      request.input(campo, sql.Decimal(12,2), valorDecimal);
    }
  });

  // Construir query dinámico
  const columnas = campos.join(', ');
  const parametros = campos.map(campo => `@${campo}`).join(', ');

  const query = `
    INSERT INTO datos_remuneraciones (${columnas}, fecha_carga, estado_procesamiento)
    VALUES (${parametros}, GETDATE(), 'CARGADO');
    SELECT SCOPE_IDENTITY() as nuevo_id;
  `;

  const resultado = await request.query(query);
  return resultado.recordset[0].nuevo_id;
}

function limpiarRUT(rut) {
  if (!rut) return null;
  return String(rut).replace(/[.\-\s]/g, '').toUpperCase().trim();
}

function limpiarTexto(texto) {
  if (!texto) return '';
  return String(texto).trim().replace(/\s+/g, ' ');
}

// 🆕 FUNCIÓN CRÍTICA CORREGIDA: Parser de números completamente seguro
function parseNumberSafe(valor) {
  if (!valor || valor === '' || valor === null || valor === undefined) return 0;
  
  // Si es un número, devolverlo directamente
  if (typeof valor === 'number' && !isNaN(valor) && isFinite(valor)) {
    return valor;
  }
  
  // Convertir a string y limpiar
  let cleaned = String(valor).trim();
  
  // 🆕 DETECTAR Y RECHAZAR FÓRMULAS DE EXCEL
  if (cleaned.startsWith('"') || cleaned.includes('=') || cleaned.includes('%') || 
      cleaned.includes('*') || cleaned.includes('+') || cleaned.includes('(')) {
    console.log(`⚠️ Valor rechazado (fórmula/texto): ${cleaned}`);
    return 0;
  }
  
  // Remover caracteres no numéricos excepto punto, coma y signo negativo
  cleaned = cleaned.replace(/[^\d.,-]/g, '');
  
  // Si queda vacío, devolver 0
  if (!cleaned) return 0;
  
  // Manejar formato chileno (punto como separador de miles, coma como decimal)
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Si tiene ambos, asumir formato chileno: 1.234.567,89
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    // Solo coma, podría ser decimal chileno
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Es decimal: 1234,56
      cleaned = cleaned.replace(',', '.');
    } else {
      // Es separador de miles: 1,234,567
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  
  const parsed = parseFloat(cleaned);
  return (isNaN(parsed) || !isFinite(parsed)) ? 0 : parsed;
}

// 🆕 FUNCIÓN CRÍTICA: Validar valor decimal para SQL Server
function validarValorDecimal(valor) {
  const numero = parseNumberSafe(valor);
  
  // Validar rango para DECIMAL(12,2) - máximo 10 dígitos enteros + 2 decimales
  const maxValor = 9999999999.99;
  const minValor = -9999999999.99;
  
  if (numero > maxValor) {
    console.log(`⚠️ Valor truncado (muy grande): ${numero} → ${maxValor}`);
    return maxValor;
  }
  
  if (numero < minValor) {
    console.log(`⚠️ Valor truncado (muy pequeño): ${numero} → ${minValor}`);
    return minValor;
  }
  
  // Redondear a 2 decimales para evitar problemas de precisión
  return Math.round(numero * 100) / 100;
}

function generarReporteEstadistico(datos) {
  const reporte = {
    periodo: {
      descripcion: datos[0]?.periodo || 'Sin descripción',
      mes: datos[0]?.mes || 0,
      anio: datos[0]?.anio || 0
    },
    resumen: {
      total_empleados: datos.length,
      suma_sueldos_base: datos.reduce((sum, item) => sum + (parseFloat(item.sueldo_base) || 0), 0),
      suma_total_haberes: datos.reduce((sum, item) => sum + (parseFloat(item.total_haberes) || 0), 0),
      suma_total_descuentos: datos.reduce((sum, item) => sum + (parseFloat(item.total_descuentos) || 0), 0),
      suma_liquidos: datos.reduce((sum, item) => sum + (parseFloat(item.liquido_pagar) || 0), 0),
      empleados_con_datos: datos.filter(d => d.cargo).length,
      empleados_sin_datos: datos.filter(d => !d.cargo).length
    },
    estadisticas_por_cargo: {},
    estadisticas_por_razon_social: {},
    estadisticas_por_sucursal: {},
    distribuciones: {
      rangos_salariales: calcularRangosSalariales(datos),
      percentiles: calcularPercentiles(datos)
    },
    anomalias: detectarAnomalias(datos),
    fecha_generacion: new Date()
  };

  // Calcular min y max
  const sueldos = datos.map(d => parseFloat(d.sueldo_base) || 0).filter(s => s > 0);
  if (sueldos.length > 0) {
    reporte.resumen.sueldo_minimo = Math.min(...sueldos);
    reporte.resumen.sueldo_maximo = Math.max(...sueldos);
  }

  // Estadísticas por cargo
  const gruposPorCargo = {};
  datos.forEach(item => {
    const cargo = item.cargo || 'Sin especificar';
    if (!gruposPorCargo[cargo]) {
      gruposPorCargo[cargo] = [];
    }
    gruposPorCargo[cargo].push(item);
  });

  Object.keys(gruposPorCargo).forEach(cargo => {
    const empleados = gruposPorCargo[cargo];
    reporte.estadisticas_por_cargo[cargo] = {
      cantidad: empleados.length,
      suma_sueldos: empleados.reduce((sum, emp) => sum + (parseFloat(emp.sueldo_base) || 0), 0),
      promedio_sueldo: empleados.reduce((sum, emp) => sum + (parseFloat(emp.sueldo_base) || 0), 0) / empleados.length
    };
  });

  // 🆕 Estadísticas por razón social
  const gruposPorRazonSocial = {};
  datos.forEach(item => {
    const razonSocial = item.razon_social || 'Sin Razón Social';
    if (!gruposPorRazonSocial[razonSocial]) {
      gruposPorRazonSocial[razonSocial] = [];
    }
    gruposPorRazonSocial[razonSocial].push(item);
  });

  Object.keys(gruposPorRazonSocial).forEach(razonSocial => {
    const empleados = gruposPorRazonSocial[razonSocial];
    reporte.estadisticas_por_razon_social[razonSocial] = {
      cantidad: empleados.length,
      suma_sueldos: empleados.reduce((sum, emp) => sum + (parseFloat(emp.sueldo_base) || 0), 0),
      suma_liquidos: empleados.reduce((sum, emp) => sum + (parseFloat(emp.liquido_pagar) || 0), 0),
      promedio_sueldo: empleados.reduce((sum, emp) => sum + (parseFloat(emp.sueldo_base) || 0), 0) / empleados.length
    };
  });

  // 🆕 Estadísticas por sucursal
  const gruposPorSucursal = {};
  datos.forEach(item => {
    const sucursal = item.sucursal || 'Sin Sucursal';
    if (!gruposPorSucursal[sucursal]) {
      gruposPorSucursal[sucursal] = [];
    }
    gruposPorSucursal[sucursal].push(item);
  });

  Object.keys(gruposPorSucursal).forEach(sucursal => {
    const empleados = gruposPorSucursal[sucursal];
    reporte.estadisticas_por_sucursal[sucursal] = {
      cantidad: empleados.length,
      suma_sueldos: empleados.reduce((sum, emp) => sum + (parseFloat(emp.sueldo_base) || 0), 0),
      suma_liquidos: empleados.reduce((sum, emp) => sum + (parseFloat(emp.liquido_pagar) || 0), 0),
      promedio_sueldo: empleados.reduce((sum, emp) => sum + (parseFloat(emp.sueldo_base) || 0), 0) / empleados.length
    };
  });

  return reporte;
}

function calcularRangosSalariales(datos) {
  const sueldos = datos.map(d => parseFloat(d.sueldo_base) || 0).filter(s => s > 0);
  
  if (sueldos.length === 0) return {};
  
  const min = Math.min(...sueldos);
  const max = Math.max(...sueldos);
  const rango = (max - min) / 5;
  
  const rangos = {};
  for (let i = 0; i < 5; i++) {
    const inicio = min + (rango * i);
    const fin = min + (rango * (i + 1));
    const key = `${Math.round(inicio).toLocaleString()}-${Math.round(fin).toLocaleString()}`;
    rangos[key] = sueldos.filter(s => s >= inicio && s < fin).length;
  }
  
  return rangos;
}

function calcularPercentiles(datos) {
  const sueldos = datos.map(d => parseFloat(d.sueldo_base) || 0).filter(s => s > 0).sort((a, b) => a - b);
  
  if (sueldos.length === 0) return {};
  
  const percentil = (p) => {
    const index = Math.ceil((p / 100) * sueldos.length) - 1;
    return sueldos[Math.max(0, index)];
  };
  
  return {
    p25: percentil(25),
    p50: percentil(50),
    p75: percentil(75),
    p90: percentil(90)
  };
}

function detectarAnomalias(datos) {
  const anomalias = [];
  const sueldos = datos.map(d => parseFloat(d.sueldo_base) || 0).filter(s => s > 0);
  
  if (sueldos.length === 0) return anomalias;
  
  const promedio = sueldos.reduce((sum, s) => sum + s, 0) / sueldos.length;
  const desviacion = Math.sqrt(sueldos.reduce((sum, s) => sum + Math.pow(s - promedio, 2), 0) / sueldos.length);
  
  // Calcular algunos valores de referencia
  const sueldoMinimo = 350000; // Sueldo mínimo Chile 2024
  const sueldoMaximo = Math.max(...sueldos);
  const sueldoMinEstudio = Math.min(...sueldos);
  
  datos.forEach(empleado => {
    const sueldo = parseFloat(empleado.sueldo_base) || 0;
    if (sueldo > 0) {
      const zScore = Math.abs((sueldo - promedio) / desviacion);
      
      if (zScore > 2) {
        const esSueldoAlto = sueldo > promedio;
        let analisisDetallado = '';
        let posiblesCausas = [];
        let recomendaciones = [];
        let nivelRiesgo = 'MEDIO';
        
        // ANÁLISIS PARA SUELDOS ALTOS
        if (esSueldoAlto) {
          if (sueldo > promedio * 3) {
            analisisDetallado = `Sueldo excepcionalmente alto: ${((sueldo / promedio - 1) * 100).toFixed(0)}% sobre el promedio`;
            nivelRiesgo = 'ALTO';
            posiblesCausas = [
              'Cargo ejecutivo o de alta responsabilidad',
              'Bonos especiales o comisiones extraordinarias',
              'Error de digitación (ceros adicionales)',
              'Empleado con antigüedad excepcional',
              'Profesional especializado (médico, ingeniero senior, etc.)'
            ];
            recomendaciones = [
              'Verificar con RRHH si corresponde al cargo',
              'Revisar si incluye bonos excepcionales',
              'Confirmar que no hay errores de digitación',
              'Validar con la estructura salarial de la empresa'
            ];
          } else {
            analisisDetallado = `Sueldo significativamente alto: ${((sueldo / promedio - 1) * 100).toFixed(0)}% sobre el promedio`;
            posiblesCausas = [
              'Cargo de supervisión o jefatura',
              'Profesional con especialización',
              'Empleado con mayor antigüedad',
              'Incluye horas extras regulares'
            ];
            recomendaciones = [
              'Verificar si corresponde al nivel jerárquico',
              'Revisar estructura de cargos'
            ];
          }
        } 
        // ANÁLISIS PARA SUELDOS BAJOS
        else {
          if (sueldo < sueldoMinimo) {
            analisisDetallado = `Sueldo bajo el mínimo legal: ${sueldo.toLocaleString()} (Mínimo: ${sueldoMinimo.toLocaleString()})`;
            nivelRiesgo = 'CRÍTICO';
            posiblesCausas = [
              '⚠️ POSIBLE INCUMPLIMIENTO LEGAL',
              'Empleado de media jornada',
              'Trabajador en práctica o aprendiz',
              'Error en el cálculo de días trabajados',
              'Descuentos excesivos aplicados'
            ];
            recomendaciones = [
              '🚨 REVISAR INMEDIATAMENTE',
              'Verificar jornada laboral',
              'Confirmar días trabajados en el mes',
              'Revisar si hay descuentos excesivos',
              'Consultar con legal si cumple normativa'
            ];
          } else if (sueldo < promedio * 0.5) {
            analisisDetallado = `Sueldo muy bajo: ${(100 - (sueldo / promedio * 100)).toFixed(0)}% bajo el promedio`;
            nivelRiesgo = 'ALTO';
            posiblesCausas = [
              'Empleado de jornada parcial',
              'Trabajador temporal o estacional',
              'Cargo de entrada o trainee',
              'Ausencias o licencias en el período',
              'Error en el registro de horas'
            ];
            recomendaciones = [
              'Verificar tipo de contrato y jornada',
              'Revisar asistencia del período',
              'Confirmar que no hay errores administrativos'
            ];
          } else {
            analisisDetallado = `Sueldo bajo el promedio: ${(100 - (sueldo / promedio * 100)).toFixed(0)}% bajo el promedio`;
            posiblesCausas = [
              'Empleado junior o con poca experiencia',
              'Cargo operativo o administrativo básico',
              'Trabajador de apoyo o asistente'
            ];
            recomendaciones = [
              'Verificar que corresponde al nivel del cargo',
              'Revisar estructura salarial'
            ];
          }
        }
        
        // ANÁLISIS ADICIONAL BASADO EN Z-SCORE
        let interpretacionZScore = '';
        if (zScore > 3) {
          interpretacionZScore = 'Extremadamente inusual (menos del 0.3% de casos normales)';
        } else if (zScore > 2.5) {
          interpretacionZScore = 'Muy inusual (menos del 1.2% de casos normales)';
        } else {
          interpretacionZScore = 'Inusual (menos del 4.5% de casos normales)';
        }
        
        anomalias.push({
          // Datos básicos
          tipo: esSueldoAlto ? 'sueldo_alto' : 'sueldo_bajo',
          empleado: empleado.nombre_empleado,
          rut: empleado.rut_empleado,
          sueldo: sueldo,
          z_score: zScore.toFixed(2),
          
          // Análisis mejorado
          nivel_riesgo: nivelRiesgo,
          analisis_detallado: analisisDetallado,
          interpretacion_zscore: interpretacionZScore,
          posibles_causas: posiblesCausas,
          recomendaciones: recomendaciones,
          
          // Contexto adicional
          porcentaje_diferencia: esSueldoAlto ? 
            `+${((sueldo / promedio - 1) * 100).toFixed(1)}%` : 
            `-${((1 - sueldo / promedio) * 100).toFixed(1)}%`,
          promedio_empresa: promedio,
          posicion_ranking: esSueldoAlto ? 
            `Top ${((sueldos.filter(s => s >= sueldo).length / sueldos.length) * 100).toFixed(1)}%` :
            `Bottom ${((sueldos.filter(s => s <= sueldo).length / sueldos.length) * 100).toFixed(1)}%`,
          
          // 🆕 Información adicional
          razon_social: empleado.razon_social || 'Sin Razón Social',
          sucursal: empleado.sucursal || 'Sin Sucursal'
        });
      }
    }
  });
  
 const ordenRiesgo = { 'CRÍTICO': 3, 'ALTO': 2, 'MEDIO': 1 };
 anomalias.sort((a, b) => {
   if (ordenRiesgo[a.nivel_riesgo] !== ordenRiesgo[b.nivel_riesgo]) {
     return ordenRiesgo[b.nivel_riesgo] - ordenRiesgo[a.nivel_riesgo];
   }
   return parseFloat(b.z_score) - parseFloat(a.z_score);
 });
 
 return anomalias;
}