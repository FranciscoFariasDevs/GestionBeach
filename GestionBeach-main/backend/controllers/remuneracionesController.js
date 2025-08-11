// controllers/remuneracionesController.js - VERSIÓN COMPLETAMENTE CORREGIDA
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
      AND TABLE_NAME IN ('periodos_remuneracion', 'datos_remuneraciones', 'empleados_remuneraciones')
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
      listo_para_procesar: tablas.length >= 2
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

// Obtener todos los períodos
exports.obtenerPeriodos = async (req, res) => {
  try {
    console.log('📅 Obteniendo períodos de remuneración...');
    
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        p.id_periodo,
        p.mes,
        p.anio,
        p.descripcion,
        p.estado,
        p.fecha_carga,
        p.fecha_creacion,
        COUNT(dr.id) as total_registros,
        COUNT(DISTINCT dr.rut_empleado) as empleados_unicos,
        ISNULL(SUM(dr.sueldo_base), 0) as suma_sueldos_base,
        ISNULL(SUM(dr.total_haberes), 0) as suma_total_haberes,
        ISNULL(SUM(dr.total_descuentos), 0) as suma_total_descuentos,
        ISNULL(SUM(dr.liquido_pagar), 0) as suma_liquidos,
        CASE 
          WHEN COUNT(dr.id) = 0 THEN 0
          ELSE COUNT(CASE WHEN er.id IS NOT NULL THEN 1 END)
        END as empleados_encontrados,
        CASE 
          WHEN COUNT(dr.id) = 0 THEN 0
          ELSE COUNT(CASE WHEN er.id IS NULL THEN 1 END)
        END as empleados_faltantes
      FROM periodos_remuneracion p
      LEFT JOIN datos_remuneraciones dr ON p.id_periodo = dr.id_periodo
      LEFT JOIN empleados_remuneraciones er ON 
        REPLACE(REPLACE(REPLACE(UPPER(er.rut), '.', ''), '-', ''), ' ', '') = 
        REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '')
      GROUP BY p.id_periodo, p.mes, p.anio, p.descripcion, p.estado, p.fecha_carga, p.fecha_creacion
      ORDER BY p.anio DESC, p.mes DESC
    `);
    
    console.log(`✅ ${result.recordset.length} períodos encontrados`);
    
    return res.json({ 
      success: true, 
      data: result.recordset 
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
// Crear nuevo período
exports.crearPeriodo = async (req, res) => {
  try {
    console.log('📅 Creando nuevo período...', req.body);
    
    const { mes, anio, descripcion } = req.body;
    
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
    
    // Verificar si ya existe
    const existeResult = await pool.request()
      .input('mes', sql.Int, mes)
      .input('anio', sql.Int, anio)
      .query('SELECT id_periodo, descripcion FROM periodos_remuneracion WHERE mes = @mes AND anio = @anio');
    
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

    // Crear descripción automática si no se proporciona
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const descripcionFinal = descripcion || `${meses[mes - 1]} ${anio}`;
    
    const result = await pool.request()
      .input('mes', sql.Int, mes)
      .input('anio', sql.Int, anio)
      .input('descripcion', sql.VarChar, descripcionFinal)
      .query(`
        INSERT INTO periodos_remuneracion (mes, anio, descripcion, estado, fecha_creacion)
        VALUES (@mes, @anio, @descripcion, 'ACTIVO', GETDATE());
        SELECT SCOPE_IDENTITY() as id_periodo;
      `);
    
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
    
    console.log(`🔄 Actualizando período ID: ${id}`, req.body);
    
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
          er.nombre_completo,
          er.rut as emp_rut,
          er.activo as empleado_activo,
          CASE 
            WHEN er.id IS NOT NULL THEN 'EMPLEADO_ENCONTRADO'
            ELSE 'EMPLEADO_NO_ENCONTRADO'
          END as estado_relacion_empleado
        FROM datos_remuneraciones dr
        LEFT JOIN periodos_remuneracion p ON dr.id_periodo = p.id_periodo
        LEFT JOIN empleados_remuneraciones er ON REPLACE(REPLACE(REPLACE(UPPER(er.rut), '.', ''), '-', ''), ' ', '') = 
                                                 REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '')
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

// 🆕 PROCESAR EXCEL - VERSIÓN COMPLETAMENTE CORREGIDA
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
          console.log(`⏭️ Saltando fila ${i + 1}: RUT inválido o faltante`);
          continue;
        }

        console.log(`📝 Procesando fila ${i + 1}: ${datosExtraidos.nombre_empleado} (${datosExtraidos.rut_empleado})`);

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
        mapeo_utilizado: mapeoColumnas
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
          er.cargo,
          er.departamento,
          p.descripcion as periodo,
          p.mes,
          p.anio
        FROM datos_remuneraciones dr
        LEFT JOIN periodos_remuneracion p ON dr.id_periodo = p.id_periodo
        LEFT JOIN empleados_remuneraciones er ON REPLACE(REPLACE(REPLACE(UPPER(er.rut), '.', ''), '-', ''), ' ', '') = 
                                                 REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '')
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
    
    // 🆕 IDENTIFICACIÓN MEJORADA DE CAMPOS
    if (headerUpper.includes('COD') && !headerUpper.includes('NOMBRE')) {
      mapeo.codigo_empleado = header;
    }
    else if (headerUpper.includes('RUT') || headerUpper === 'R.U.T') {
      mapeo.rut_empleado = header;
    }
    else if (headerUpper.includes('NOMBRE') && !headerUpper.includes('CODIGO')) {
      mapeo.nombre_empleado = header;
    }
    // 🆕 CORREGIDO: Detectar sueldo base correctamente
    else if (headerUpper.includes('S. BASE') || headerUpper.includes('SUELDO BASE') || headerUpper === 'S. BASE') {
      mapeo.sueldo_base = header;
    }
    else if (headerUpper.includes('H. EXTRAS') || headerUpper.includes('HORAS EXTRAS')) {
      mapeo.horas_extras = header;
    }
    else if (headerUpper.includes('GRAT. LEGAL') || headerUpper.includes('GRATIFICACION LEGAL')) {
      mapeo.gratificacion_legal = header;
    }
    else if (headerUpper.includes('OTROS IMP.') && !headerUpper.includes('TOTAL')) {
      mapeo.otros_imponibles = header;
    }
    else if (headerUpper.includes('TOT. HABERES')) {
      mapeo.total_haberes = header;
    }
    else if (headerUpper.includes('PREVISION') || headerUpper.includes('PREVISIÓN')) {
      mapeo.descuento_prevision = header;
    }
    else if (headerUpper.includes('SALUD') && !headerUpper.includes('OTROS')) {
      mapeo.descuento_salud = header;
    }
    else if (headerUpper.includes('IMP. UNICO')) {
      mapeo.impuesto_unico = header;
    }
    else if (headerUpper.includes('SEG. CES.')) {
      mapeo.seguro_cesantia = header;
    }
    else if (headerUpper.includes('OTROS D.LEG.')) {
      mapeo.otros_descuentos_legales = header;
    }
    else if (headerUpper.includes('TOT. D.LEG.')) {
      mapeo.total_descuentos_legales = header;
    }
    else if (headerUpper.includes('DESC. VARIOS')) {
      mapeo.descuentos_varios = header;
    }
    else if (headerUpper.includes('TOT. DESC.')) {
      mapeo.total_descuentos = header;
    }
    else if (headerUpper.includes('LIQUIDO') || headerUpper.includes('LÍQUIDO')) {
      mapeo.liquido_pagar = header;
    }
    else if (headerUpper.includes('TOTAL PAGO')) {
      mapeo.total_pago = header;
    }
    else if (headerUpper.includes('CAJA COMPENSACION')) {
      mapeo.caja_compensacion = header;
    }
    else if (headerUpper.includes('AFC')) {
      mapeo.afc = header;
    }
    else if (headerUpper.includes('SIS')) {
      mapeo.sis = header;
    }
    else if (headerUpper.includes('ACH')) {
      mapeo.ach = header;
    }
    else if (headerUpper.includes('IMPOSICIONES')) {
      mapeo.imposiciones = header;
    }
    else if (headerUpper.includes('TOTAL CARGO TRABAJADOR')) {
      mapeo.total_cargo_trabajador = header;
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
      SELECT id FROM empleados_remuneraciones 
      WHERE REPLACE(REPLACE(REPLACE(UPPER(rut), '.', ''), '-', ''), ' ', '') = @rut_limpio
    `);

  if (existeResult.recordset.length > 0) {
    return { esNuevo: false, id: existeResult.recordset[0].id };
  }

  // Crear nuevo empleado
  try {
    const resultado = await transaction.request()
      .input('rut', sql.VarChar, rutLimpio)
      .input('nombre_completo', sql.VarChar, datosExtraidos.nombre_empleado || 'Sin Nombre')
      .query(`
        INSERT INTO empleados_remuneraciones (rut, nombre_completo, fecha_creacion)
        VALUES (@rut, @nombre_completo, GETDATE());
        SELECT SCOPE_IDENTITY() as nuevo_id;
      `);

    console.log(`👤 Empleado creado: ${datosExtraidos.nombre_empleado} (${rutLimpio})`);
    
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
            analisisDetallado = `Sueldo bajo el mínimo legal: $${sueldo.toLocaleString()} (Mínimo: $${sueldoMinimo.toLocaleString()})`;
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
            `Bottom ${((sueldos.filter(s => s <= sueldo).length / sueldos.length) * 100).toFixed(1)}%`
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