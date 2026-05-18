// controllers/remuneracionesController.js - VERSIÓN FINAL CORREGIDA CON PORCENTAJES Y UNICODE
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
      AND TABLE_NAME IN ('periodos_remuneracion', 'datos_remuneraciones', 'empleados_remuneraciones', 'empleados', 'razones_sociales', 'sucursales', 'porcentajes_por_periodo')
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
      listo_para_procesar: tablas.length >= 5
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
// 🔥 CORREGIDO: Divide los sueldos de empleados administrativos entre sus sucursales
exports.obtenerPeriodos = async (req, res) => {
  try {
    console.log('📅 Obteniendo períodos de remuneración con filtros...');

    const { razon_social_id, sucursal_id, anio, estado } = req.query;

    const pool = await poolPromise;

    // 🔥 QUERY CORREGIDO: Usa subquery para contar sucursales y dividir sueldos
    let baseQuery = `
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
        ISNULL(SU.nombre, 'Sin Sucursal') as sucursal_nombre,
        ISNULL(SU.id, 0) as id_sucursal,
        COUNT(dr.id) AS total_registros,
        COUNT(DISTINCT dr.rut_empleado) AS empleados_unicos,
        -- 🔥 CORREGIDO: Dividir sueldos según número de sucursales del empleado
        ISNULL(SUM(
          CASE
            WHEN COALESCE(emp_suc_count.num_sucursales, 1) > 1
            THEN CAST(dr.sueldo_base AS DECIMAL(18,2)) / CAST(emp_suc_count.num_sucursales AS DECIMAL(18,2))
            ELSE CAST(dr.sueldo_base AS DECIMAL(18,2))
          END
        ), 0) AS suma_sueldos_base,
        ISNULL(SUM(
          CASE
            WHEN COALESCE(emp_suc_count.num_sucursales, 1) > 1
            THEN CAST(dr.total_haberes AS DECIMAL(18,2)) / CAST(emp_suc_count.num_sucursales AS DECIMAL(18,2))
            ELSE CAST(dr.total_haberes AS DECIMAL(18,2))
          END
        ), 0) AS suma_total_haberes,
        ISNULL(SUM(
          CASE
            WHEN COALESCE(emp_suc_count.num_sucursales, 1) > 1
            THEN CAST(dr.total_descuentos AS DECIMAL(18,2)) / CAST(emp_suc_count.num_sucursales AS DECIMAL(18,2))
            ELSE CAST(dr.total_descuentos AS DECIMAL(18,2))
          END
        ), 0) AS suma_total_descuentos,
        ISNULL(SUM(
          CASE
            WHEN COALESCE(emp_suc_count.num_sucursales, 1) > 1
            THEN CAST(dr.liquido_pagar AS DECIMAL(18,2)) / CAST(emp_suc_count.num_sucursales AS DECIMAL(18,2))
            ELSE CAST(dr.liquido_pagar AS DECIMAL(18,2))
          END
        ), 0) AS suma_liquidos
      FROM periodos_remuneracion p
      LEFT JOIN datos_remuneraciones dr
        ON p.id_periodo = dr.id_periodo
      LEFT JOIN empleados emp
        ON REPLACE(REPLACE(REPLACE(UPPER(emp.rut), '.', ''), '-', ''), ' ', '') =
           REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '')
      -- Contar sucursales vigentes en el período del registro (date-aware)
      CROSS APPLY (
        SELECT COUNT(DISTINCT es2.id_sucursal) AS num_sucursales
        FROM empleados_sucursales es2
        WHERE es2.id_empleado = emp.id
          AND es2.fecha_inicio <= EOMONTH(DATEFROMPARTS(p.anio, p.mes, 1))
          AND (es2.fecha_fin IS NULL OR es2.fecha_fin >= DATEFROMPARTS(p.anio, p.mes, 1))
      ) emp_suc_count
      LEFT JOIN razones_sociales RS
        ON RS.id = emp.id_razon_social
      LEFT JOIN empleados_sucursales ESU
        ON ESU.id_empleado = emp.id
        AND ESU.fecha_inicio <= EOMONTH(DATEFROMPARTS(p.anio, p.mes, 1))
        AND (ESU.fecha_fin IS NULL OR ESU.fecha_fin >= DATEFROMPARTS(p.anio, p.mes, 1))
      LEFT JOIN sucursales SU
        ON SU.id = ESU.id_sucursal
    `;
    
    const whereConditions = [];
    const request = pool.request();
    
    if (razon_social_id && razon_social_id !== 'todos') {
      whereConditions.push('RS.id = @razon_social_id');
      request.input('razon_social_id', sql.Int, parseInt(razon_social_id));
    }
    
    if (sucursal_id && sucursal_id !== 'todos') {
      whereConditions.push('SU.id = @sucursal_id');
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
    
    if (whereConditions.length > 0) {
      baseQuery += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    baseQuery += `
      GROUP BY
        p.id_periodo, p.mes, p.anio, p.descripcion, p.estado,
        p.fecha_carga, p.fecha_creacion, RS.nombre_razon, RS.id,
        SU.nombre, SU.id
      ORDER BY
        p.anio DESC, p.mes DESC, RS.nombre_razon, SU.nombre
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
    
    const aniosResult = await pool.request().query(`
      SELECT DISTINCT anio 
      FROM periodos_remuneracion 
      ORDER BY anio DESC
    `);
    
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
    
    let checkQuery = `
      SELECT id_periodo, descripcion 
      FROM periodos_remuneracion 
      WHERE mes = @mes AND anio = @anio
    `;
    
    const request = pool.request()
      .input('mes', sql.Int, mes)
      .input('anio', sql.Int, anio);
    
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

    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    let descripcionFinal = descripcion || `${meses[mes - 1]} ${anio}`;
    
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
        
        if (id_sucursal) {
          // 🔥 FIX: NO ELIMINAR TODAS LAS SUCURSALES
          // Verificar si la relación ya existe
          const existeResult = await transaction.request()
            .input('id_empleado', sql.Int, id_empleado)
            .input('id_sucursal', sql.Int, id_sucursal)
            .query(`
              SELECT COUNT(*) as count
              FROM empleados_sucursales
              WHERE id_empleado = @id_empleado AND id_sucursal = @id_sucursal
            `);

          if (existeResult.recordset[0].count > 0) {
            // Reactivar relación existente
            await transaction.request()
              .input('id_empleado', sql.Int, id_empleado)
              .input('id_sucursal', sql.Int, id_sucursal)
              .query(`
                UPDATE empleados_sucursales
                SET activo = 1, updated_at = GETDATE()
                WHERE id_empleado = @id_empleado AND id_sucursal = @id_sucursal
              `);
            console.log(`✅ Sucursal ${id_sucursal} reactivada para empleado ${id_empleado}`);
          } else {
            // Crear nueva relación CON campo activo
            await transaction.request()
              .input('id_empleado', sql.Int, id_empleado)
              .input('id_sucursal', sql.Int, id_sucursal)
              .query(`
                INSERT INTO empleados_sucursales (id_empleado, id_sucursal, activo, created_at)
                VALUES (@id_empleado, @id_sucursal, 1, GETDATE())
              `);
            console.log(`✅ Sucursal ${id_sucursal} asignada a empleado ${id_empleado}`);
          }
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

// 🆕 GESTIÓN DE PORCENTAJES POR PERÍODO Y RAZÓN SOCIAL
exports.obtenerPorcentajesPorPeriodo = async (req, res) => {
  try {
    const { id_periodo, id_razon_social } = req.params;
    
    console.log(`🔍 Obteniendo porcentajes para período ${id_periodo} y razón social ${id_razon_social}`);
    
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id_periodo', sql.Int, parseInt(id_periodo))
      .input('id_razon_social', sql.Int, parseInt(id_razon_social))
      .query(`
        SELECT 
          ppp.*,
          pr.descripcion as periodo_descripcion,
          rs.nombre_razon
        FROM porcentajes_por_periodo ppp
        INNER JOIN periodos_remuneracion pr ON ppp.id_periodo = pr.id_periodo
        INNER JOIN razones_sociales rs ON ppp.id_razon_social = rs.id
        WHERE ppp.id_periodo = @id_periodo 
        AND ppp.id_razon_social = @id_razon_social
        AND ppp.activo = 1
      `);
    
    return res.json({
      success: true,
      data: result.recordset.length > 0 ? result.recordset[0] : null
    });
  } catch (error) {
    console.error('Error al obtener porcentajes:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener porcentajes',
      error: error.message
    });
  }
};

exports.guardarPorcentajesPorPeriodo = async (req, res) => {
  try {
    const { id_periodo, id_razon_social, porcentajes, observaciones } = req.body;
    
    console.log('💾 Guardando porcentajes:', { id_periodo, id_razon_social, porcentajes });
    
    // Validar datos requeridos
    if (!id_periodo || !id_razon_social || !porcentajes) {
      return res.status(400).json({
        success: false,
        message: 'ID período, ID razón social y porcentajes son requeridos'
      });
    }
    
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      // Verificar si ya existe un registro
      const existeResult = await transaction.request()
        .input('id_periodo', sql.Int, id_periodo)
        .input('id_razon_social', sql.Int, id_razon_social)
        .query(`
          SELECT id FROM porcentajes_por_periodo 
          WHERE id_periodo = @id_periodo AND id_razon_social = @id_razon_social
        `);
      
      if (existeResult.recordset.length > 0) {
        // Actualizar registro existente
        await transaction.request()
          .input('id_periodo', sql.Int, id_periodo)
          .input('id_razon_social', sql.Int, id_razon_social)
          .input('caja_compen', sql.Decimal(5,2), porcentajes.caja_compen || 0)
          .input('afc', sql.Decimal(5,2), porcentajes.afc || 0)
          .input('sis', sql.Decimal(5,2), porcentajes.sis || 0)
          .input('ach', sql.Decimal(5,2), porcentajes.ach || 0)
          .input('imposiciones', sql.Decimal(5,2), porcentajes.imposiciones || 0)
          .input('observaciones', sql.VarChar, observaciones || null)
          .query(`
            UPDATE porcentajes_por_periodo 
            SET 
              caja_compen = @caja_compen,
              afc = @afc,
              sis = @sis,
              ach = @ach,
              imposiciones = @imposiciones,
              observaciones = @observaciones,
              updated_at = GETDATE()
            WHERE id_periodo = @id_periodo AND id_razon_social = @id_razon_social
          `);
        
        console.log('✅ Porcentajes actualizados');
      } else {
        // Crear nuevo registro
        await transaction.request()
          .input('id_periodo', sql.Int, id_periodo)
          .input('id_razon_social', sql.Int, id_razon_social)
          .input('caja_compen', sql.Decimal(5,2), porcentajes.caja_compen || 0)
          .input('afc', sql.Decimal(5,2), porcentajes.afc || 0)
          .input('sis', sql.Decimal(5,2), porcentajes.sis || 0)
          .input('ach', sql.Decimal(5,2), porcentajes.ach || 0)
          .input('imposiciones', sql.Decimal(5,2), porcentajes.imposiciones || 0)
          .input('observaciones', sql.VarChar, observaciones || null)
          .query(`
            INSERT INTO porcentajes_por_periodo (
              id_periodo, id_razon_social, caja_compen, afc, sis, ach, 
              imposiciones, observaciones, activo, created_at
            )
            VALUES (
              @id_periodo, @id_razon_social, @caja_compen, @afc, @sis, @ach,
              @imposiciones, @observaciones, 1, GETDATE()
            )
          `);
        
        console.log('✅ Porcentajes creados');
      }
      
      await transaction.commit();
      
      return res.json({
        success: true,
        message: 'Porcentajes guardados exitosamente'
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error al guardar porcentajes:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al guardar porcentajes',
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
      
      // Eliminar porcentajes asociados
      await transaction.request()
        .input('id_periodo', sql.Int, id)
        .query('DELETE FROM porcentajes_por_periodo WHERE id_periodo = @id_periodo');
      
      // Eliminar datos de remuneraciones asociados
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

// 🔥 CORREGIDO: Ahora calcula costos patronales y filtra por sucursal/razón social
exports.obtenerDatosPeriodo = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // 🔥 NUEVO: Obtener filtros de query params
    const { sucursal_id, razon_social_id } = req.query;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de período debe ser un número válido'
      });
    }

    console.log(`📊 Obteniendo datos del período ID: ${id} con filtros:`, {
      sucursal_id: sucursal_id || 'todas',
      razon_social_id: razon_social_id || 'todas'
    });

    const pool = await poolPromise;

    // 🔥 PASO 1: Construir query con filtros opcionales
    let query = `
      SELECT
        dr.*,
        p.descripcion as periodo_descripcion,
        p.mes,
        p.anio,
        p.estado as periodo_estado,
        emp.id as empleado_id,
        emp.nombre,
        emp.apellido,
        emp.rut as emp_rut,
        emp.activo as empleado_activo,
        emp.id_razon_social,
        rs.nombre_razon,
        su.id as sucursal_id,
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
      LEFT JOIN empleados_sucursales esu ON emp.id = esu.id_empleado AND esu.activo = 1
      LEFT JOIN sucursales su ON esu.id_sucursal = su.id
      WHERE dr.id_periodo = @id
    `;

    const request = pool.request().input('id', sql.Int, id);

    // 🔥 FILTRAR POR SUCURSAL si se especifica
    if (sucursal_id && sucursal_id !== 'todos' && sucursal_id !== 'undefined') {
      query += ` AND su.id = @sucursal_id`;
      request.input('sucursal_id', sql.Int, parseInt(sucursal_id));
      console.log(`🔍 Filtrando por sucursal ID: ${sucursal_id}`);
    }

    // 🔥 FILTRAR POR RAZÓN SOCIAL si se especifica
    if (razon_social_id && razon_social_id !== 'todos' && razon_social_id !== 'undefined') {
      query += ` AND emp.id_razon_social = @razon_social_id`;
      request.input('razon_social_id', sql.Int, parseInt(razon_social_id));
      console.log(`🔍 Filtrando por razón social ID: ${razon_social_id}`);
    }

    query += ` ORDER BY dr.nombre_empleado`;

    const result = await request.query(query);

    console.log(`📊 ${result.recordset.length} registros encontrados`);

    // 🔥 PASO 2: Obtener porcentajes por razón social para este período
    const porcentajesResult = await pool.request()
      .input('id_periodo', sql.Int, id)
      .query(`
        SELECT id_razon_social, caja_compen, afc, sis, ach, imposiciones
        FROM porcentajes_por_periodo
        WHERE id_periodo = @id_periodo AND activo = 1
      `);

    // Crear mapa de porcentajes por razón social
    const porcentajesPorRS = {};
    porcentajesResult.recordset.forEach(p => {
      porcentajesPorRS[p.id_razon_social] = {
        caja_compen: parseFloat(p.caja_compen || 0),
        afc: parseFloat(p.afc || 0),
        sis: parseFloat(p.sis || 0),
        ach: parseFloat(p.ach || 0),
        imposiciones: parseFloat(p.imposiciones || 0)
      };
    });

    console.log(`📊 Porcentajes cargados para ${Object.keys(porcentajesPorRS).length} razones sociales`);

    // 🔥 PASO 3: Calcular costos patronales para cada empleado
    // 🔥 SOBRESCRIBIR campos originales con valores calculados para que el frontend los muestre
    const datosConCostos = result.recordset.map(empleado => {
      const totalImponibles = parseFloat(empleado.total_imponibles || 0);
      const idRazonSocial = empleado.id_razon_social;
      const porcentajes = porcentajesPorRS[idRazonSocial] || {
        caja_compen: 0, afc: 0, sis: 0, ach: 0, imposiciones: 0
      };

      // Calcular costos patronales basados en total_imponibles × porcentaje
      const caja_compensacion_calculada = Math.round((totalImponibles * porcentajes.caja_compen) / 100);
      const afc_calculada = Math.round((totalImponibles * porcentajes.afc) / 100);
      const sis_calculado = Math.round((totalImponibles * porcentajes.sis) / 100);
      const ach_calculado = Math.round((totalImponibles * porcentajes.ach) / 100);
      const imposiciones_calculadas = Math.round((totalImponibles * porcentajes.imposiciones) / 100);
      const total_costos_patronales = caja_compensacion_calculada + afc_calculada + sis_calculado + ach_calculado + imposiciones_calculadas;
      const total_costo_calculado = Math.round(parseFloat(empleado.liquido_pagar || 0) + parseFloat(empleado.total_descuentos || 0) + total_costos_patronales);

      return {
        ...empleado,
        // 🔥 SOBRESCRIBIR campos originales con valores calculados
        caja_compensacion: caja_compensacion_calculada,
        afc: afc_calculada,
        sis: sis_calculado,
        ach: ach_calculado,
        imposiciones: imposiciones_calculadas,
        total_costo: total_costo_calculado,
        // Campos adicionales para mostrar
        total_costos_patronales,
        // Porcentajes aplicados (para mostrar en UI)
        porcentajes_aplicados: {
          caja_compen: porcentajes.caja_compen,
          afc: porcentajes.afc,
          sis: porcentajes.sis,
          ach: porcentajes.ach,
          imposiciones: porcentajes.imposiciones
        }
      };
    });

    console.log(`✅ Costos patronales calculados para ${datosConCostos.length} empleados`);

    return res.json({
      success: true,
      data: datosConCostos
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

// 🆕 VALIDAR EXCEL CON IDENTIFICACIÓN AUTOMÁTICA MEJORADA Y UNICODE
exports.validarExcel = async (req, res) => {
  try {
    console.log('🔍 VALIDANDO EXCEL CON IDENTIFICACIÓN AUTOMÁTICA Y UNICODE...');
    
    const { headers, sampleData } = req.body;
    
    if (!headers || !Array.isArray(headers)) {
      return res.status(400).json({
        success: false,
        message: 'Encabezados del Excel son requeridos'
      });
    }

    console.log('📋 Headers detectados:', headers);
    console.log('📊 Datos de muestra:', sampleData?.slice(0, 2));

    // 🆕 LIMPIAR UNICODE EN HEADERS
    const headersLimpios = headers.map(header => limpiarUnicode(header));
    console.log('🧹 Headers después de limpiar Unicode:', headersLimpios);

    // 🆕 IDENTIFICAR AUTOMÁTICAMENTE LAS COLUMNAS MEJORADO CON UNICODE
    const mapeoDetectado = identificarColumnasAutomaticamenteConUnicode(headersLimpios);
    
    const analisis = {
      total_columnas: headersLimpios.length,
      columnas_detectadas: headersLimpios,
      headers_originales: headers,
      mapeo_sugerido: mapeoDetectado,
      errores: [],
      advertencias: [],
      calidad_datos: 'buena',
      formato_detectado: 'nomina_chilena_automatico_unicode'
    };

    console.log('🎯 Mapeo automático detectado con Unicode:', mapeoDetectado);

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
      '✅ Identificación automática de columnas con soporte Unicode activada',
      '📋 Se procesarán solo las filas con datos válidos',
      '🔧 Los empleados se pueden crear automáticamente si es necesario',
      `🎯 Se detectaron ${camposDetectados.length} campos relevantes`,
      '🛡️ Validación mejorada de valores decimales y separadores de miles',
      '🌐 Soporte completo para caracteres especiales (ñ, tildes)'
    ];

    if (analisis.errores.length === 0) {
      analisis.recomendaciones.push('✅ Archivo listo para procesar');
    }

    console.log('✅ Análisis automático completado con soporte Unicode');
    
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

// 🚨 FUNCIÓN CRÍTICA CORREGIDA: PROCESAR EXCEL CON PORCENTAJES OBLIGATORIOS Y UNICODE
exports.procesarExcel = async (req, res) => {
  try {
    console.log('🚀 PROCESANDO EXCEL - VERSIÓN CORREGIDA CON PORCENTAJES Y UNICODE...');
    
    const { datosExcel, archivoNombre, validarDuplicados = true, id_periodo, mapeoColumnas, porcentajes, id_razon_social } = req.body;
    
    console.log('🎯 DATOS RECIBIDOS:', {
      totalFilas: datosExcel?.length,
      periodo: id_periodo,
      archivo: archivoNombre,
      razonSocial: id_razon_social,
      porcentajes: porcentajes,
      mapeoColumnas: mapeoColumnas
    });
    
    // 🔥 VALIDACIONES CRÍTICAS
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

    if (!id_razon_social) {
      return res.status(400).json({
        success: false,
        message: 'ID de razón social es requerido'
      });
    }

    if (!porcentajes) {
      return res.status(400).json({
        success: false,
        message: 'Porcentajes son obligatorios para procesar la nómina'
      });
    }

    if (!mapeoColumnas || typeof mapeoColumnas !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Mapeo de columnas es requerido desde el frontend'
      });
    }

    const pool = await poolPromise;
    
    // Verificar que el período existe
    const periodoResult = await pool.request()
      .input('id_periodo', sql.Int, id_periodo)
      .query('SELECT id_periodo, descripcion FROM periodos_remuneracion WHERE id_periodo = @id_periodo');
    
    if (periodoResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'El período especificado no existe'
      });
    }

    // Verificar que el mapeo tenga campos críticos
    if (!mapeoColumnas.rut_empleado || !mapeoColumnas.nombre_empleado) {
      return res.status(400).json({
        success: false,
        message: 'El mapeo debe incluir al menos RUT y Nombre del empleado'
      });
    }

    console.log('🆕 GUARDANDO PORCENTAJES EN BASE DE DATOS...');
    
    // 🔥 GUARDAR PORCENTAJES OBLIGATORIAMENTE
    try {
      await guardarPorcentajesEnBD(pool, id_periodo, id_razon_social, porcentajes);
      console.log('✅ Porcentajes guardados exitosamente');
    } catch (porcentajesError) {
      console.error('❌ Error guardando porcentajes:', porcentajesError);
      return res.status(500).json({
        success: false,
        message: 'Error al guardar porcentajes: ' + porcentajesError.message
      });
    }

    console.log('🎯 USANDO MAPEO DEL FRONTEND CON UNICODE:', mapeoColumnas);
    console.log(`📊 Total de filas a procesar: ${datosExcel.length}`);

    // 🆕 EXTRAER RUTS PARA VALIDACIÓN CON UNICODE
    const rutsParaValidar = [];
    for (const fila of datosExcel) {
      const datosExtraidos = extraerDatosDeFilaConUnicode(fila, mapeoColumnas);
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

    // 🆕 PROCESAR CADA FILA CON UNICODE Y CÁLCULO DE TOTAL_COSTO
    for (let i = 0; i < datosExcel.length; i++) {
      const fila = datosExcel[i];
      
      try {
        // 🔍 EXTRAER DATOS USANDO EL MAPEO DEL FRONTEND CON UNICODE
        const datosExtraidos = extraerDatosDeFilaConUnicode(fila, mapeoColumnas);
        
        // Validar que tenga al menos RUT
        if (!datosExtraidos.rut_empleado || datosExtraidos.rut_empleado.length < 8) {
          console.log(`⭕ Saltando fila ${i + 1}: RUT inválido o faltante`);
          continue;
        }

        console.log(`🔍 Procesando fila ${i + 1}: ${datosExtraidos.nombre_empleado} (${datosExtraidos.rut_empleado})`);
        console.log(`💰 Líquido a pagar: ${datosExtraidos.liquido_pagar}`);

        // 🆕 CALCULAR COSTOS PATRONALES Y TOTAL_COSTO USANDO LOS PORCENTAJES
        const costosPatronales = calcularTotalCosto(datosExtraidos, porcentajes);
        datosExtraidos.caja_compensacion = costosPatronales.caja_compensacion;
        datosExtraidos.afc = costosPatronales.afc;
        datosExtraidos.sis = costosPatronales.sis;
        datosExtraidos.ach = costosPatronales.ach;
        datosExtraidos.imposiciones = costosPatronales.imposiciones;
        datosExtraidos.total_costo = costosPatronales.total_costo;

        console.log(`💹 Costos patronales calculados: Caja=${costosPatronales.caja_compensacion}, AFC=${costosPatronales.afc}, SIS=${costosPatronales.sis}, ACH=${costosPatronales.ach}, Imp=${costosPatronales.imposiciones}`);

        // 🆕 PROCESAR CADA EMPLEADO EN SU PROPIA TRANSACCIÓN
        const resultado = await procesarEmpleadoIndividualConUnicode(pool, {
          id_periodo: id_periodo,
          id_razon_social: id_razon_social,
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
              nombre: datosExtraidos.nombre_empleado,
              liquido: datosExtraidos.liquido_pagar
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

    // Actualizar fecha de carga del período
    if (procesados > 0) {
      try {
        await pool.request()
          .input('id_periodo', sql.Int, id_periodo)
          .query('UPDATE periodos_remuneracion SET fecha_carga = GETDATE() WHERE id_periodo = @id_periodo');
      } catch (updateError) {
        console.error('Error actualizando fecha de carga:', updateError.message);
      }
    }

    console.log('✅ PROCESAMIENTO INDIVIDUAL COMPLETADO CON PORCENTAJES');
    console.log(`📊 Estadísticas: ${procesados} procesados, ${empleadosCreados} empleados creados, ${errores} errores`);

    // 🆕 VERIFICAR SI HAY EMPLEADOS SIN ASIGNACIÓN
    const empleadosParaValidar = rutsParaValidar.slice(0, 10);
    
    return res.json({
      success: true,
      message: `Excel procesado: ${procesados}/${datosExcel.length} registros exitosos con porcentajes guardados`,
      data: {
        total_filas: datosExcel.length,
        procesados,
        empleados_creados: empleadosCreados,
        empleados_encontrados: empleadosEncontrados,
        errores,
        errores_detalle: erroresDetalle.slice(0, 10),
        id_periodo: id_periodo,
        id_razon_social: id_razon_social,
        porcentajes_guardados: porcentajes,
        mapeo_utilizado: mapeoColumnas,
        empleados_para_validar: empleadosParaValidar
      }
    });

  } catch (error) {
    console.error('💥 ERROR EN PROCESAMIENTO CON PORCENTAJES:', error.message);
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

// ========== FUNCIONES AUXILIARES MEJORADAS CON UNICODE ==========

// 🆕 FUNCIÓN PARA LIMPIAR UNICODE Y CARACTERES ESPECIALES
function limpiarUnicode(texto) {
  if (!texto) return '';
  
  return String(texto)
    // Normalizar Unicode a forma canónica
    .normalize('NFD')
    // Reemplazar caracteres problemáticos comunes
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã/g, 'Ñ')
    .replace(/Ã/g, 'Á')
    .replace(/Ã‰/g, 'É')
    .replace(/Ã/g, 'Í')
    .replace(/Ã"/g, 'Ó')
    .replace(/Ãš/g, 'Ú')
    // Limpiar caracteres de control y espacios extra
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ÚNICA FUNCIÓN CORREGIDA: Identificar columnas automáticamente con Unicode
function identificarColumnasAutomaticamenteConUnicode(headers) {
  console.log('🔍 Identificando columnas automáticamente con soporte Unicode...');
  
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
    const headerLimpio = limpiarUnicode(header);
    const headerUpper = headerLimpio.toUpperCase().trim();
    
    // 🆕 IDENTIFICACIÓN MEJORADA CON SOPORTE UNICODE
    if (headerUpper.includes('COD') && !headerUpper.includes('NOMBRE')) {
      mapeo.codigo_empleado = header;
    }
    else if (headerUpper.includes('R.U.T') || headerUpper === 'RUT' || headerUpper.includes('RUT')) {
      mapeo.rut_empleado = header;
    }
    else if (headerUpper.includes('NOMBRE') && !headerUpper.includes('CODIGO')) {
      mapeo.nombre_empleado = header;
    }
    else if (headerUpper.includes('S. BASE') || headerUpper === 'S. BASE' || headerUpper.includes('SUELDO BASE')) {
      mapeo.sueldo_base = header;
    }
    else if (headerUpper.includes('H. EXTRAS') || headerUpper === 'H. EXTRAS' || headerUpper.includes('HORAS EXTRAS')) {
      mapeo.horas_extras = header;
    }
    else if (headerUpper.includes('GRAT. LEGAL') || headerUpper === 'GRAT. LEGAL' || headerUpper.includes('GRATIFICACION LEGAL')) {
      mapeo.gratificacion_legal = header;
    }
    else if ((headerUpper.includes('OTROS IMP.') || headerUpper === 'OTROS IMP.') && !headerUpper.includes('TOTAL')) {
      mapeo.otros_imponibles = header;
    }
    else if (headerUpper.includes('TOTAL IMP.') || headerUpper === 'TOTAL IMP.') {
      mapeo.total_imponibles = header;
    }
    else if (headerUpper.includes('ASIG. FAM.') || headerUpper === 'ASIG. FAM.' || headerUpper.includes('ASIGNACION FAMILIAR')) {
      mapeo.asignacion_familiar = header;
    }
    else if (headerUpper.includes('OT. NO IMP.') || headerUpper === 'OT. NO IMP.' || headerUpper.includes('OTROS NO IMP')) {
      mapeo.otros_no_imponibles = header;
    }
    else if (headerUpper.includes('TOT. NO IMP.') || headerUpper === 'TOT. NO IMP.' || headerUpper.includes('TOTAL NO IMP')) {
      mapeo.total_no_imponibles = header;
    }
    else if (headerUpper.includes('TOT. HABERES') || headerUpper === 'TOT. HABERES' || headerUpper.includes('TOTAL HABERES')) {
      mapeo.total_haberes = header;
    }
    else if (headerUpper.includes('PREVISION') || headerUpper === 'PREVISION' || headerUpper.includes('PREVISION')) {
      mapeo.descuento_prevision = header;
    }
    else if (headerUpper.includes('SALUD') && !headerUpper.includes('OTROS')) {
      mapeo.descuento_salud = header;
    }
    else if (headerUpper.includes('IMP. UNICO') || headerUpper === 'IMP. UNICO' || headerUpper.includes('IMP. UNICO')) {
      mapeo.impuesto_unico = header;
    }
    else if (headerUpper.includes('SEG. CES.') || headerUpper === 'SEG. CES.' || headerUpper.includes('SEGURO CESANTIA')) {
      mapeo.seguro_cesantia = header;
    }
    else if (headerUpper.includes('OTROS D.LEG.') || headerUpper === 'OTROS D.LEG.' || headerUpper.includes('OTROS DESCUENTOS LEG')) {
      mapeo.otros_descuentos_legales = header;
    }
    else if (headerUpper.includes('TOT. D.LEG.') || headerUpper === 'TOT. D.LEG.' || headerUpper.includes('TOTAL DESCUENTOS LEG')) {
      mapeo.total_descuentos_legales = header;
    }
    else if (headerUpper.includes('DESC. VARIOS') || headerUpper === 'DESC. VARIOS' || headerUpper.includes('DESCUENTOS VARIOS')) {
      mapeo.descuentos_varios = header;
    }
    else if (headerUpper.includes('TOT. DESC.') || headerUpper === 'TOT. DESC.' || headerUpper.includes('TOTAL DESC')) {
      mapeo.total_descuentos = header;
    }
    // 🔥 CRÍTICO: Detección corregida de LÍQUIDO con Unicode
    else if (headerUpper.includes('LIQUIDO') || headerUpper === 'LIQUIDO' || 
             headerUpper.includes('LIQUIDO A PAGAR') || 
             headerUpper.includes('LIQUIDO PAGAR') || 
             headerUpper.includes('LIQ.') || headerUpper === 'LIQ.' ||
             headerUpper.includes('NETO') || headerUpper.includes('NET') ||
             (headerUpper.includes('PAGAR') && headerUpper.includes('LIQ'))) {
      mapeo.liquido_pagar = header;
      console.log(`🎯 LÍQUIDO DETECTADO CON UNICODE: "${header}" mapeado correctamente`);
    }
  });

  // Log del mapeo detectado
  const camposDetectados = Object.keys(mapeo).filter(key => mapeo[key]);
  console.log(`🎯 Detectados ${camposDetectados.length} campos con Unicode:`, camposDetectados);

  return mapeo;
}

// 🆕 FUNCIÓN PARA EXTRAER DATOS CON UNICODE Y COMO STRINGS
function extraerDatosDeFilaConUnicode(fila, mapeoColumnas) {
  const datos = {};
  
  Object.keys(mapeoColumnas).forEach(campo => {
    const nombreColumna = mapeoColumnas[campo];
    if (nombreColumna && fila[nombreColumna] !== undefined) {
      let valor = fila[nombreColumna];
      
      if (campo !== 'codigo_empleado' && campo !== 'rut_empleado' && 
          campo !== 'nombre_empleado') {
        // 🔥 CRÍTICO: TRATAR COMO STRING PRIMERO Y LUEGO CONVERTIR
        valor = parseNumberChilenoMejoradoConString(valor, campo);
      }
      
      if (campo === 'rut_empleado') {
        valor = limpiarRUT(valor);
      }
      
      if (campo === 'nombre_empleado') {
        valor = limpiarTextoConUnicode(valor);
      }
      
      datos[campo] = valor;
      
      // 🔥 LOG CRÍTICO PARA LÍQUIDO
      if (campo === 'liquido_pagar') {
        console.log(`💰 LÍQUIDO EXTRAÍDO CON UNICODE: Campo "${nombreColumna}" -> Valor: ${valor}`);
      }
    }
  });
  
  return datos;
}

// 🆕 FUNCIÓN PARA LIMPIAR TEXTO CON UNICODE
function limpiarTextoConUnicode(texto) {
  if (!texto) return '';
  return limpiarUnicode(String(texto)).replace(/\s+/g, ' ');
}

// 🔥 FUNCIÓN CRÍTICA: PARSE DE NÚMEROS CHILENOS COMO STRING PRIMERO
function parseNumberChilenoMejoradoConString(valor, nombreCampo) {
  if (!valor || valor === '' || valor === null || valor === undefined) return 0;
  
  // Convertir a string primero para evitar truncamiento
  let valorString = String(valor).trim();
  
  // Limpiar Unicode
  valorString = limpiarUnicode(valorString);
  
  // Si ya es un número y es razonable, aplicar lógica inteligente
  if (typeof valor === 'number' && !isNaN(valor) && isFinite(valor)) {
    return aplicarMultiplicacionInteligentePorCampo(valor, nombreCampo);
  }
  
  // Detectar y rechazar fórmulas o caracteres extraños
  if (valorString.startsWith('"') || valorString.includes('=') || valorString.includes('%') || 
      valorString.includes('*') || valorString.includes('+') || valorString.includes('(')) {
    return 0;
  }
  
  // Limpiar solo caracteres no numéricos, manteniendo puntos y comas
  valorString = valorString.replace(/[^\d.,-]/g, '');
  
  if (!valorString) return 0;
  
  let numeroFinal;
  
  // 🆕 MANEJO MEJORADO DE SEPARADORES CHILENOS
  if (valorString.includes(',') && valorString.includes('.')) {
    // Formato: 1.234.567,89 (punto como separador de miles, coma como decimal)
    // O formato: 1,234,567.89 (coma como separador de miles, punto como decimal)
    const ultimaComa = valorString.lastIndexOf(',');
    const ultimoPunto = valorString.lastIndexOf('.');
    
    if (ultimoPunto > ultimaComa) {
      // Formato americano: 1,234,567.89
      numeroFinal = parseFloat(valorString.replace(/,/g, ''));
    } else {
      // Formato chileno: 1.234.567,89
      numeroFinal = parseFloat(valorString.replace(/\./g, '').replace(',', '.'));
    }
  } else if (valorString.includes(',')) {
    const partes = valorString.split(',');
    if (partes.length === 2 && partes[1].length <= 2) {
      // Formato: 123456,89 (coma como decimal)
      numeroFinal = parseFloat(valorString.replace(',', '.'));
    } else {
      // Formato: 123,456,789 (coma como separador de miles)
      numeroFinal = parseFloat(valorString.replace(/,/g, ''));
    }
  } else if (valorString.includes('.')) {
    const partes = valorString.split('.');
    if (partes.length === 2 && partes[1].length <= 2) {
      // Podría ser decimal: 123456.89
      numeroFinal = parseFloat(valorString);
    } else {
      // Separador de miles: 123.456.789
      numeroFinal = parseFloat(valorString.replace(/\./g, ''));
    }
  } else {
    // Solo números: 123456
    numeroFinal = parseFloat(valorString);
  }
  
  if (isNaN(numeroFinal) || !isFinite(numeroFinal)) {
    console.log(`⚠️ Valor no convertible: "${valor}" -> 0`);
    return 0;
  }
  
  // 🚨 APLICAR LÓGICA INTELIGENTE SELECTIVA POR CAMPO
  return aplicarMultiplicacionInteligentePorCampo(numeroFinal, nombreCampo);
}

// 🚨 FUNCIÓN CRÍTICA: MULTIPLICACIÓN INTELIGENTE SOLO PARA CAMPOS ESPECÍFICOS
function aplicarMultiplicacionInteligentePorCampo(numero, nombreCampo) {
  if (numero <= 0) return numero;
  
  // 🔥 CAMPOS QUE NO DEBEN MULTIPLICARSE
  const camposExcluidos = [
    'seguro_cesantia',
    'afc',
    'sis', 
    'impuesto_unico',
    'descuento_prevision',
    'descuento_salud',
    'otros_descuentos_legales',
    'descuentos_varios',
    'caja_compensacion'
  ];
  
  if (camposExcluidos.includes(nombreCampo)) {
    console.log(`🚫 SIN MULTIPLICACIÓN (campo excluido): ${nombreCampo} = ${numero}`);
    return numero;
  }
  
  // 🎯 CAMPOS QUE SÍ PUEDEN NECESITAR MULTIPLICACIÓN
  const camposParaMultiplicar = [
    'sueldo_base',
    'horas_extras', 
    'gratificacion_legal',
    'otros_imponibles',
    'total_imponibles',
    'asignacion_familiar',
    'otros_no_imponibles',
    'total_no_imponibles',
    'total_haberes',
    'liquido_pagar',
    'total_pago',
    'total_descuentos',
    'total_descuentos_legales'
  ];
  
  if (camposParaMultiplicar.includes(nombreCampo)) {
    const resultado = aplicarMultiplicacionInteligente(numero);
    if (resultado !== numero) {
      console.log(`🔢 MULTIPLICACIÓN APLICADA: ${nombreCampo} = ${numero} -> ${resultado}`);
    }
    return resultado;
  }
  
  console.log(`➡️ SIN CAMBIOS: ${nombreCampo} = ${numero}`);
  return numero;
}

// 🚀 FUNCIÓN ORIGINAL: LÓGICA INTELIGENTE DE MULTIPLICACIÓN
function aplicarMultiplicacionInteligente(numero) {
  if (numero <= 0) return numero;
  
  const SUELDO_MINIMO_CHILE = 350000;
  const SUELDO_PROMEDIO_CHILE = 600000;
  const SUELDO_ALTO_CHILE = 2000000;
  
  if (numero >= 50 && numero <= 999) {
    return numero * 1000;
  }
  
  if (numero >= 10 && numero < SUELDO_MINIMO_CHILE) {
    if (numero >= 10 && numero <= 999) {
      return numero * 1000;
    } else if (numero >= 1000 && numero < 100000) {
      if (numero < 10000) {
        return numero * 100;
      } else {
        return numero * 10;
      }
    }
  }
  
  if (numero > 0 && numero < 100 && numero % 1 !== 0) {
    return numero * 10000;
  }
  
  if (numero >= SUELDO_MINIMO_CHILE && numero <= 10000000) {
    return numero;
  }
  
  if (numero > 10000000) {
    return numero;
  }
  
  return numero;
}

// 🆕 FUNCIÓN PARA CALCULAR COSTOS PATRONALES Y TOTAL_COSTO USANDO PORCENTAJES
// 🔥 TODOS los costos patronales se calculan sobre TOTAL_IMPONIBLES × %porcentaje
function calcularTotalCosto(datosRemuneracion, porcentajes) {
  try {
    const sueldoBase = parseFloat(datosRemuneracion.sueldo_base || 0);
    const totalImponibles = parseFloat(datosRemuneracion.total_imponibles || sueldoBase);

    // 🔥 CALCULAR TODOS LOS COSTOS PATRONALES SOBRE TOTAL_IMPONIBLES
    const costoCajaCompensacion = totalImponibles * (parseFloat(porcentajes.caja_compen || 0) / 100);
    const costoAFC = totalImponibles * (parseFloat(porcentajes.afc || 0) / 100);
    const costoSIS = totalImponibles * (parseFloat(porcentajes.sis || 0) / 100);
    const costoACH = totalImponibles * (parseFloat(porcentajes.ach || 0) / 100); // ← SOBRE TOTAL_IMPONIBLES
    const costoImposiciones = totalImponibles * (parseFloat(porcentajes.imposiciones || 0) / 100);

    // Total costo = sueldo base + todos los costos del empleador
    const totalCosto = sueldoBase + costoCajaCompensacion + costoAFC + costoSIS + costoACH + costoImposiciones;

    console.log(`💹 Cálculo costos patronales sobre total_imponibles (${totalImponibles}):`);
    console.log(`   Caja Comp: ${costoCajaCompensacion} (${porcentajes.caja_compen}%)`);
    console.log(`   AFC: ${costoAFC} (${porcentajes.afc}%)`);
    console.log(`   SIS: ${costoSIS} (${porcentajes.sis}%)`);
    console.log(`   ACH: ${costoACH} (${porcentajes.ach}%) ✅`);
    console.log(`   Imp.Patronales: ${costoImposiciones} (${porcentajes.imposiciones}%)`);
    console.log(`   Total Costo: ${totalCosto}`);

    // Retornar objeto con todos los valores para guardar en BD
    return {
      caja_compensacion: Math.round(costoCajaCompensacion),
      afc: Math.round(costoAFC),
      sis: Math.round(costoSIS),
      ach: Math.round(costoACH),
      imposiciones: Math.round(costoImposiciones),
      total_costo: Math.round(totalCosto)
    };
  } catch (error) {
    console.error('Error calculando costos patronales:', error);
    return {
      caja_compensacion: 0,
      afc: 0,
      sis: 0,
      ach: 0,
      imposiciones: 0,
      total_costo: 0
    };
  }
}

// 🆕 FUNCIÓN PARA GUARDAR PORCENTAJES EN BD
async function guardarPorcentajesEnBD(pool, id_periodo, id_razon_social, porcentajes) {
  const transaction = new sql.Transaction(pool);
  
  try {
    await transaction.begin();
    
    // Verificar si ya existe
    const existeResult = await transaction.request()
      .input('id_periodo', sql.Int, id_periodo)
      .input('id_razon_social', sql.Int, id_razon_social)
      .query(`
        SELECT id FROM porcentajes_por_periodo 
        WHERE id_periodo = @id_periodo AND id_razon_social = @id_razon_social
      `);
    
    if (existeResult.recordset.length > 0) {
      // Actualizar
      await transaction.request()
        .input('id_periodo', sql.Int, id_periodo)
        .input('id_razon_social', sql.Int, id_razon_social)
        .input('caja_compen', sql.Decimal(5,2), parseFloat(porcentajes.caja_compen || 0))
        .input('afc', sql.Decimal(5,2), parseFloat(porcentajes.afc || 0))
        .input('sis', sql.Decimal(5,2), parseFloat(porcentajes.sis || 0))
        .input('ach', sql.Decimal(5,2), parseFloat(porcentajes.ach || 0))
        .input('imposiciones', sql.Decimal(5,2), parseFloat(porcentajes.imposiciones || 0))
        .query(`
          UPDATE porcentajes_por_periodo 
          SET 
            caja_compen = @caja_compen,
            afc = @afc,
            sis = @sis,
            ach = @ach,
            imposiciones = @imposiciones,
            updated_at = GETDATE()
          WHERE id_periodo = @id_periodo AND id_razon_social = @id_razon_social
        `);
    } else {
      // Crear nuevo
      await transaction.request()
        .input('id_periodo', sql.Int, id_periodo)
        .input('id_razon_social', sql.Int, id_razon_social)
        .input('caja_compen', sql.Decimal(5,2), parseFloat(porcentajes.caja_compen || 0))
        .input('afc', sql.Decimal(5,2), parseFloat(porcentajes.afc || 0))
        .input('sis', sql.Decimal(5,2), parseFloat(porcentajes.sis || 0))
        .input('ach', sql.Decimal(5,2), parseFloat(porcentajes.ach || 0))
        .input('imposiciones', sql.Decimal(5,2), parseFloat(porcentajes.imposiciones || 0))
        .query(`
          INSERT INTO porcentajes_por_periodo (
            id_periodo, id_razon_social, caja_compen, afc, sis, ach, 
            imposiciones, activo, created_at
          )
          VALUES (
            @id_periodo, @id_razon_social, @caja_compen, @afc, @sis, @ach,
            @imposiciones, 1, GETDATE()
          )
        `);
    }
    
    await transaction.commit();
    console.log('✅ Porcentajes guardados en BD');
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// 🆕 PROCESAR EMPLEADO INDIVIDUAL CON UNICODE
async function procesarEmpleadoIndividualConUnicode(pool, datos) {
  const transaction = new sql.Transaction(pool);
  
  try {
    await transaction.begin();
    
    const empleadoInfo = await crearEmpleadoSiNoExisteConUnicode(transaction, datos);
    await guardarDatosRemuneracionSeguroConUnicode(transaction, datos);
    
    await transaction.commit();
    
    console.log(`✅ Empleado procesado con Unicode: ${datos.nombre_empleado} - Líquido: ${datos.liquido_pagar}`);
    
    return {
      success: true,
      empleadoCreado: empleadoInfo.esNuevo,
      empleadoId: empleadoInfo.id
    };
    
  } catch (error) {
    await transaction.rollback();
    console.error(`❌ Error procesando empleado ${datos.nombre_empleado}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// 🆕 CREAR EMPLEADO CON UNICODE
async function crearEmpleadoSiNoExisteConUnicode(transaction, datosExtraidos) {
  const rutLimpio = limpiarRUT(datosExtraidos.rut_empleado);
  
  if (!rutLimpio || rutLimpio.length < 8) {
    return { esNuevo: false, id: null };
  }

  const existeResult = await transaction.request()
    .input('rut_limpio', sql.VarChar, rutLimpio)
    .query(`
      SELECT id FROM empleados 
      WHERE REPLACE(REPLACE(REPLACE(UPPER(rut), '.', ''), '-', ''), ' ', '') = @rut_limpio
    `);

  if (existeResult.recordset.length > 0) {
    return { esNuevo: false, id: existeResult.recordset[0].id };
  }

  try {
    const nombreCompleto = limpiarTextoConUnicode(datosExtraidos.nombre_empleado || 'Sin Nombre');

    // Parsear nombre formato chileno: "APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2"
    let nombre, apellido;

    if (nombreCompleto.includes(',')) {
      // Si tiene coma: "Apellido1 Apellido2, Nombre1 Nombre2"
      const partes = nombreCompleto.split(',');
      apellido = partes[0].trim() || 'Sin Apellido';
      nombre = partes[1]?.trim() || 'Sin Nombre';
    } else {
      // Sin coma: formato chileno "APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2"
      const partes = nombreCompleto.trim().split(' ').filter(p => p.length > 0);

      if (partes.length <= 2) {
        // Solo 1-2 partes: primer elemento nombre, resto apellido
        nombre = partes[0] || 'Sin Nombre';
        apellido = partes.slice(1).join(' ') || 'Sin Apellido';
      } else {
        // 3+ partes: los 2 primeros son apellidos, el resto son nombres
        apellido = partes.slice(0, 2).join(' ');
        nombre = partes.slice(2).join(' ');
      }
    }

    const resultado = await transaction.request()
      .input('rut', sql.VarChar, rutLimpio)
      .input('nombre', sql.VarChar, nombre)
      .input('apellido', sql.VarChar, apellido)
      .input('id_razon_social', sql.Int, datosExtraidos.id_razon_social || null)
      .query(`
        INSERT INTO empleados (rut, nombre, apellido, id_razon_social, activo, created_at, updated_at)
        VALUES (@rut, @nombre, @apellido, @id_razon_social, 1, GETDATE(), GETDATE());
        SELECT SCOPE_IDENTITY() as nuevo_id;
      `);

    const nuevoId = resultado.recordset[0].nuevo_id;
    console.log(`👤 Empleado creado con Unicode: ${nombreCompleto} (${rutLimpio}) - ID: ${nuevoId}`);

    // 🆕 CREAR ENTRADA EN empleados_sucursales si hay sucursal
    if (datosExtraidos.id_sucursal) {
      try {
        await transaction.request()
          .input('id_empleado', sql.Int, nuevoId)
          .input('id_sucursal', sql.Int, datosExtraidos.id_sucursal)
          .query(`
            INSERT INTO empleados_sucursales (id_empleado, id_sucursal, activo, created_at)
            VALUES (@id_empleado, @id_sucursal, 1, GETDATE())
          `);
        console.log(`✅ Empleado asignado a sucursal ID: ${datosExtraidos.id_sucursal}`);
      } catch (sucError) {
        console.error('⚠️ Error asignando sucursal al empleado:', sucError.message);
      }
    }

    return { esNuevo: true, id: nuevoId };
  } catch (error) {
    console.error('Error creando empleado:', error.message);
    return { esNuevo: false, id: null };
  }
}

// 🆕 GUARDAR DATOS CON UNICODE Y TOTAL_COSTO
async function guardarDatosRemuneracionSeguroConUnicode(transaction, datos) {
  const request = transaction.request();
  
  const campos = [
    'id_periodo', 'codigo_empleado', 'rut_empleado', 'nombre_empleado',
    'sueldo_base', 'horas_extras', 'gratificacion_legal', 'otros_imponibles', 'total_imponibles',
    'asignacion_familiar', 'otros_no_imponibles', 'total_no_imponibles', 'total_haberes',
    'descuento_prevision', 'descuento_salud', 'impuesto_unico', 'seguro_cesantia',
    'otros_descuentos_legales', 'total_descuentos_legales', 'descuentos_varios', 'total_descuentos',
    'liquido_pagar', 'total_pago', 'caja_compensacion', 'afc', 'sis', 'ach', 'imposiciones',
    'total_cargo_trabajador', 'total_costo', 'fila_excel', 'archivo_origen'
  ];

  campos.forEach(campo => {
    let valor = datos[campo] || null;
    
    if (campo === 'id_periodo' || campo === 'fila_excel') {
      request.input(campo, sql.Int, valor);
    } else if (campo === 'codigo_empleado' || campo === 'rut_empleado' || 
               campo === 'nombre_empleado' || campo === 'archivo_origen') {
      if (valor) {
        valor = limpiarTextoConUnicode(String(valor)).substring(0, 255);
      }
      request.input(campo, sql.VarChar, valor);
    } else {
      const valorDecimal = validarValorDecimal(valor);
      request.input(campo, sql.Decimal(12,2), valorDecimal);
      
      // 🔥 LOG CRÍTICO PARA LÍQUIDO Y TOTAL_COSTO
      if (campo === 'liquido_pagar') {
        console.log(`💰 GUARDANDO LÍQUIDO CON UNICODE: ${valorDecimal} (original: ${valor})`);
      }
      if (campo === 'total_costo') {
        console.log(`💹 GUARDANDO TOTAL_COSTO: ${valorDecimal} (original: ${valor})`);
      }
    }
  });

  const columnas = campos.join(', ');
  const parametros = campos.map(campo => `@${campo}`).join(', ');

  const query = `
    INSERT INTO datos_remuneraciones (${columnas}, fecha_carga, estado_procesamiento)
    VALUES (${parametros}, GETDATE(), 'CARGADO');
    SELECT SCOPE_IDENTITY() as nuevo_id;
  `;

  const resultado = await request.query(query);
  console.log(`💾 Registro guardado con Unicode y total_costo ID: ${resultado.recordset[0].nuevo_id}`);
  return resultado.recordset[0].nuevo_id;
}

// RESTO DE FUNCIONES SIN CAMBIOS
function limpiarRUT(rut) {
  if (!rut) return null;
  return limpiarUnicode(String(rut)).replace(/[.\-\s]/g, '').toUpperCase();
}

function validarValorDecimal(valor) {
  const numero = typeof valor === 'number' ? valor : parseFloat(valor) || 0;
  
  const maxValor = 9999999999.99;
  const minValor = -9999999999.99;
  
  if (numero > maxValor) {
    return maxValor;
  }
  
  if (numero < minValor) {
    return minValor;
  }
  
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
      suma_total_costos: datos.reduce((sum, item) => sum + (parseFloat(item.total_costo) || 0), 0),
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

  const sueldos = datos.map(d => parseFloat(d.sueldo_base) || 0).filter(s => s > 0);
  if (sueldos.length > 0) {
    reporte.resumen.sueldo_minimo = Math.min(...sueldos);
    reporte.resumen.sueldo_maximo = Math.max(...sueldos);
  }

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
  
  const sueldoMinimo = 350000;
  
  datos.forEach(empleado => {
    const sueldo = parseFloat(empleado.sueldo_base) || 0;
    if (sueldo > 0) {
      const zScore = Math.abs((sueldo - promedio) / desviacion);
      
      if (zScore > 2) {
        const esSueldoAlto = sueldo > promedio;
        let analisisDetallado = '';
        let nivelRiesgo = 'MEDIO';
        
        if (esSueldoAlto) {
          if (sueldo > promedio * 3) {
            analisisDetallado = `Sueldo excepcionalmente alto: ${((sueldo / promedio - 1) * 100).toFixed(0)}% sobre el promedio`;
            nivelRiesgo = 'ALTO';
          } else {
            analisisDetallado = `Sueldo significativamente alto: ${((sueldo / promedio - 1) * 100).toFixed(0)}% sobre el promedio`;
          }
        } else {
          if (sueldo < sueldoMinimo) {
            analisisDetallado = `Sueldo bajo el mínimo legal: ${sueldo.toLocaleString()} (Mínimo: ${sueldoMinimo.toLocaleString()})`;
            nivelRiesgo = 'CRÍTICO';
          } else if (sueldo < promedio * 0.5) {
            analisisDetallado = `Sueldo muy bajo: ${(100 - (sueldo / promedio * 100)).toFixed(0)}% bajo el promedio`;
            nivelRiesgo = 'ALTO';
          } else {
            analisisDetallado = `Sueldo bajo el promedio: ${(100 - (sueldo / promedio * 100)).toFixed(0)}% bajo el promedio`;
          }
        }
        
        anomalias.push({
          tipo: esSueldoAlto ? 'sueldo_alto' : 'sueldo_bajo',
          empleado: empleado.nombre_empleado,
          rut: empleado.rut_empleado,
          sueldo: sueldo,
          z_score: zScore.toFixed(2),
          nivel_riesgo: nivelRiesgo,
          analisis_detallado: analisisDetallado,
          promedio_empresa: promedio,
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