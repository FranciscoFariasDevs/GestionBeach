// controllers/estadoResultadosController.js - COMPLETO CON CLASIFICACIÓN AUTOMÁTICA ADMIN/VENTAS
const { sql, poolPromise } = require('../config/db');

// Test de conexión del módulo
exports.test = async (req, res) => {
  try {
    console.log('📊 TEST - Estado de Resultados Controller');
    const pool = await poolPromise;
    const testResult = await pool.request().query('SELECT 1 as test');
    return res.json({
      success: true,
      message: 'Estado de Resultados Controller funcionando',
      timestamp: new Date(),
      db_test: testResult.recordset[0],
      modulo: 'estado_resultados'
    });
  } catch (error) {
    console.error('❌ Error en test Estado Resultados:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error de conexión',
      error: error.message
    });
  }
};

// OBTENER DATOS DE VENTAS PARA ESTADO DE RESULTADOS
exports.obtenerVentas = async (req, res) => {
  try {
    console.log('🛒 Obteniendo datos de ventas para Estado de Resultados...');
    const { fecha_desde, fecha_hasta, sucursal_id, razon_social_id } = req.query;
    
    if (!fecha_desde || !fecha_hasta) {
      return res.status(400).json({
        success: false,
        message: 'Fecha desde y fecha hasta son requeridas'
      });
    }
    
    if (!sucursal_id) {
      return res.status(400).json({
        success: false,
        message: 'ID de sucursal es requerido'
      });
    }
    
    const pool = await poolPromise;
    
    console.log('📅 Filtros aplicados:', {
      fecha_desde,
      fecha_hasta,
      sucursal_id,
      razon_social_id: razon_social_id || 'todos'
    });
    
    let ventasQuery = `
      SELECT 
        v.id,
        v.fecha,
        v.total as monto_total,
        v.sucursal_id,
        v.numero_boleta,
        v.tipo_venta,
        v.metodo_pago,
        s.nombre as sucursal_nombre,
        rs.nombre_razon
      FROM ventas v
      LEFT JOIN sucursales s ON v.sucursal_id = s.id
      LEFT JOIN razones_sociales rs ON s.id_razon_social = rs.id
      WHERE v.fecha BETWEEN @fecha_desde AND @fecha_hasta
        AND v.sucursal_id = @sucursal_id
        AND v.total > 0
    `;
    
    const request = pool.request()
      .input('fecha_desde', sql.Date, new Date(fecha_desde))
      .input('fecha_hasta', sql.Date, new Date(fecha_hasta))
      .input('sucursal_id', sql.Int, parseInt(sucursal_id));
    
    if (razon_social_id && razon_social_id !== 'todos') {
      ventasQuery += ' AND rs.id = @razon_social_id';
      request.input('razon_social_id', sql.Int, parseInt(razon_social_id));
    }
    
    ventasQuery += ' ORDER BY v.fecha DESC';
    const result = await request.query(ventasQuery);
    
    const totalVentas = result.recordset.reduce((sum, venta) => sum + (venta.monto_total || 0), 0);
    const cantidadVentas = result.recordset.length;
    
    console.log(`✅ Ventas obtenidas: ${cantidadVentas} registros, total: $${totalVentas.toLocaleString()}`);
    
    return res.json({
      success: true,
      data: {
        ventas: result.recordset,
        resumen: {
          total_ventas: totalVentas,
          cantidad_ventas: cantidadVentas,
          promedio_venta: cantidadVentas > 0 ? Math.round(totalVentas / cantidadVentas) : 0
        }
      },
      filtros: {
        fecha_desde,
        fecha_hasta,
        sucursal_id,
        razon_social_id: razon_social_id || null
      },
      message: `${cantidadVentas} ventas encontradas`
    });
  } catch (error) {
    console.error('❌ Error obteniendo ventas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener datos de ventas',
      error: error.message
    });
  }
};

// OBTENER DATOS DE COMPRAS (FACTURAS XML) PARA ESTADO DE RESULTADOS
exports.obtenerCompras = async (req, res) => {
  try {
    console.log('📦 Obteniendo datos de compras para Estado de Resultados...');
    const { fecha_desde, fecha_hasta, sucursal_id, razon_social_id } = req.query;
    
    if (!fecha_desde || !fecha_hasta) {
      return res.status(400).json({
        success: false,
        message: 'Fecha desde y fecha hasta son requeridas'
      });
    }
    
    if (!sucursal_id) {
      return res.status(400).json({
        success: false,
        message: 'ID de sucursal es requerido'
      });
    }
    
    const pool = await poolPromise;
    
    let comprasQuery = `
      SELECT 
        fe.ID as id,
        fe.FOLIO as folio,
        fe.FECHA_EMISION as fecha_emision,
        fe.RUT_EMISOR as rut_proveedor,
        fe.RZN_EMISOR as razon_social_proveedor,
        fe.MONTO_NETO as monto_neto,
        fe.IVA as monto_iva,
        fe.MONTO_TOTAL as monto_total,
        fe.id_sucursal,
        fe.estado,
        s.nombre as sucursal_nombre,
        rs.nombre_razon
      FROM TB_FACTURA_ENCABEZADO fe
      LEFT JOIN sucursales s ON fe.id_sucursal = s.id
      LEFT JOIN razones_sociales rs ON s.id_razon_social = rs.id
      WHERE fe.FECHA_EMISION BETWEEN @fecha_desde AND @fecha_hasta
        AND fe.estado = 'PROCESADA'
        AND fe.MONTO_TOTAL > 0
        AND fe.id_sucursal = @sucursal_id
    `;
    
    const request = pool.request()
      .input('fecha_desde', sql.Date, new Date(fecha_desde))
      .input('fecha_hasta', sql.Date, new Date(fecha_hasta))
      .input('sucursal_id', sql.Int, parseInt(sucursal_id));
    
    if (razon_social_id && razon_social_id !== 'todos') {
      comprasQuery += ' AND rs.id = @razon_social_id';
      request.input('razon_social_id', sql.Int, parseInt(razon_social_id));
    }
    
    comprasQuery += ' ORDER BY fe.FECHA_EMISION DESC';
    const result = await request.query(comprasQuery);
    
    const totalCompras = result.recordset.reduce((sum, compra) => sum + (compra.monto_total || 0), 0);
    const totalNeto = result.recordset.reduce((sum, compra) => sum + (compra.monto_neto || 0), 0);
    const totalIva = result.recordset.reduce((sum, compra) => sum + (compra.monto_iva || 0), 0);
    const cantidadFacturas = result.recordset.length;
    
    console.log(`✅ Compras obtenidas: ${cantidadFacturas} facturas, total: $${totalCompras.toLocaleString()}`);
    
    return res.json({
      success: true,
      data: {
        compras: result.recordset,
        resumen: {
          total_compras: totalCompras,
          total_neto: totalNeto,
          total_iva: totalIva,
          cantidad_facturas: cantidadFacturas,
          promedio_factura: cantidadFacturas > 0 ? Math.round(totalCompras / cantidadFacturas) : 0
        }
      },
      filtros: {
        fecha_desde,
        fecha_hasta,
        sucursal_id,
        razon_social_id: razon_social_id || null
      },
      message: `${cantidadFacturas} facturas de compra encontradas`
    });
  } catch (error) {
    console.error('❌ Error obteniendo compras:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener datos de compras',
      error: error.message
    });
  }
};

// 🔥 FUNCIÓN PRINCIPAL: OBTENER REMUNERACIONES CON CLASIFICACIÓN AUTOMÁTICA ADMIN/VENTAS
exports.obtenerRemuneraciones = async (req, res) => {
  try {
    console.log('👥 === OBTENIENDO REMUNERACIONES CON CLASIFICACIÓN AUTOMÁTICA ===');
    const { anio, mes, sucursal_id, razon_social_id } = req.query;
    
    if (!anio || !mes) {
      return res.status(400).json({
        success: false,
        message: 'Año y mes son requeridos'
      });
    }
    
    if (!sucursal_id) {
      return res.status(400).json({
        success: false,
        message: 'ID de sucursal es requerido'
      });
    }
    
    const pool = await poolPromise;
    
    console.log('📅 Filtros aplicados:', {
      anio: parseInt(anio),
      mes: parseInt(mes),
      sucursal_id: parseInt(sucursal_id),
      razon_social_id: razon_social_id || 'todos'
    });
    
    // 🔥 QUERY CON CTE PARA CONTAR SUCURSALES Y CLASIFICAR EMPLEADOS
    // 🔧 MODIFICADO: Cambiar INNER JOIN a LEFT JOIN para incluir empleados sin sucursal explícita
    let remuneracionesQuery = `
      WITH EmpleadoSucursales AS (
        -- CTE para contar cuántas sucursales tiene cada empleado
        SELECT
          id_empleado,
          COUNT(DISTINCT id_sucursal) as num_sucursales,
          STRING_AGG(CAST(id_sucursal AS VARCHAR), ',') as sucursales_ids
        FROM empleados_sucursales
        WHERE activo = 1
        GROUP BY id_empleado
      )
      SELECT
        -- Datos de remuneración
        dr.liquido_pagar,
        dr.seguro_cesantia,
        dr.sueldo_base,
        dr.total_haberes,
        dr.total_descuentos,
        dr.total_imponibles,
        dr.imposiciones,
        dr.rut_empleado,
        dr.nombre_empleado,
        dr.total_costo,

        -- Datos del período
        pr.mes,
        pr.anio,
        pr.id_periodo,

        -- Datos de empleado y sucursal
        COALESCE(es.id_sucursal, @sucursal_id) as id_sucursal,
        e.id AS id_empleado,
        e.id_razon_social,
        COALESCE(s.nombre, 'Sucursal Seleccionada') as sucursal_nombre,
        rs.nombre_razon,
        e.nombre as empleado_nombre,
        e.apellido as empleado_apellido,

        -- 🔥 CLASIFICACIÓN AUTOMÁTICA
        COALESCE(ems.num_sucursales, 1) as num_sucursales,
        ems.sucursales_ids,
        CASE
          WHEN COALESCE(ems.num_sucursales, 1) > 1 THEN 'ADMINISTRATIVO'
          ELSE 'VENTAS'
        END as tipo_empleado,

        -- 🔥 CALCULAR PORCIÓN DEL SUELDO PARA ESTA SUCURSAL
        -- Si es administrativo (múltiples sucursales), dividir entre todas
        -- Si es ventas (una sucursal), asignar el 100%
        CASE
          WHEN COALESCE(ems.num_sucursales, 1) > 1
          THEN CAST(dr.liquido_pagar AS DECIMAL(18,2)) / CAST(ems.num_sucursales AS DECIMAL(18,2))
          ELSE CAST(dr.liquido_pagar AS DECIMAL(18,2))
        END as liquido_pagar_asignado,

        CASE
          WHEN COALESCE(ems.num_sucursales, 1) > 1
          THEN CAST(dr.total_descuentos AS DECIMAL(18,2)) / CAST(ems.num_sucursales AS DECIMAL(18,2))
          ELSE CAST(dr.total_descuentos AS DECIMAL(18,2))
        END as descuentos_asignados,

        CASE
          WHEN COALESCE(ems.num_sucursales, 1) > 1
          THEN CAST(dr.sueldo_base AS DECIMAL(18,2)) / CAST(ems.num_sucursales AS DECIMAL(18,2))
          ELSE CAST(dr.sueldo_base AS DECIMAL(18,2))
        END as sueldo_base_asignado,

        CASE
          WHEN COALESCE(ems.num_sucursales, 1) > 1
          THEN CAST(dr.total_haberes AS DECIMAL(18,2)) / CAST(ems.num_sucursales AS DECIMAL(18,2))
          ELSE CAST(dr.total_haberes AS DECIMAL(18,2))
        END as total_haberes_asignado,

        CASE
          WHEN COALESCE(ems.num_sucursales, 1) > 1
          THEN CAST(dr.total_imponibles AS DECIMAL(18,2)) / CAST(ems.num_sucursales AS DECIMAL(18,2))
          ELSE CAST(dr.total_imponibles AS DECIMAL(18,2))
        END as total_imponibles_asignado,

        CASE
          WHEN COALESCE(ems.num_sucursales, 1) > 1
          THEN CAST(dr.imposiciones AS DECIMAL(18,2)) / CAST(ems.num_sucursales AS DECIMAL(18,2))
          ELSE CAST(dr.imposiciones AS DECIMAL(18,2))
        END as imposiciones_asignadas

      FROM datos_remuneraciones AS dr
      INNER JOIN periodos_remuneracion AS pr ON pr.id_periodo = dr.id_periodo
      INNER JOIN empleados AS e ON
        REPLACE(REPLACE(REPLACE(UPPER(e.rut), '.', ''), '-', ''), ' ', '') =
        REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '')
      LEFT JOIN empleados_sucursales AS es ON es.id_empleado = e.id AND es.activo = 1 AND es.id_sucursal = @sucursal_id
      LEFT JOIN EmpleadoSucursales ems ON ems.id_empleado = e.id
      LEFT JOIN sucursales s ON es.id_sucursal = s.id
      LEFT JOIN razones_sociales rs ON e.id_razon_social = rs.id
      WHERE pr.anio = @anio
        AND pr.mes = @mes
        AND (dr.liquido_pagar IS NOT NULL OR dr.seguro_cesantia IS NOT NULL)
        AND (es.id_sucursal = @sucursal_id OR es.id_sucursal IS NULL OR ems.num_sucursales > 1)
    `;
    
    const request = pool.request()
      .input('anio', sql.Int, parseInt(anio))
      .input('mes', sql.Int, parseInt(mes))
      .input('sucursal_id', sql.Int, parseInt(sucursal_id));
    
    if (razon_social_id && razon_social_id !== 'todos') {
      remuneracionesQuery += ' AND e.id_razon_social = @razon_social_id';
      request.input('razon_social_id', sql.Int, parseInt(razon_social_id));
    }
    
    remuneracionesQuery += ' ORDER BY tipo_empleado DESC, dr.nombre_empleado';
    
    console.log('🔍 Ejecutando query con clasificación automática...');
    const result = await request.query(remuneracionesQuery);
    
    console.log(`📊 Registros obtenidos: ${result.recordset.length}`);
    
    // 🔥 CALCULAR TOTALES SEPARADOS POR TIPO DE EMPLEADO
    let totalLiquidosAdmin = 0;
    let totalLiquidosVentas = 0;
    let totalDescuentosAdmin = 0;
    let totalDescuentosVentas = 0;
    let totalSueldosBaseAdmin = 0;
    let totalSueldosBaseVentas = 0;
    let totalHaberesAdmin = 0;
    let totalHaberesVentas = 0;
    let empleadosAdmin = new Set();
    let empleadosVentas = new Set();
    
    // Arrays para tracking detallado
    const empleadosAdminDetalle = [];
    const empleadosVentasDetalle = [];
    
    result.recordset.forEach(rem => {
      const liquidoAsignado = parseFloat(rem.liquido_pagar_asignado) || 0;
      const descuentosAsignados = parseFloat(rem.descuentos_asignados) || 0;
      const sueldoBaseAsignado = parseFloat(rem.sueldo_base_asignado) || 0;
      const haberesAsignados = parseFloat(rem.total_haberes_asignado) || 0;
      
      if (rem.tipo_empleado === 'ADMINISTRATIVO') {
        totalLiquidosAdmin += liquidoAsignado;
        totalDescuentosAdmin += descuentosAsignados;
        totalSueldosBaseAdmin += sueldoBaseAsignado;
        totalHaberesAdmin += haberesAsignados;
        empleadosAdmin.add(rem.rut_empleado);
        
        empleadosAdminDetalle.push({
          rut: rem.rut_empleado,
          nombre: rem.nombre_empleado,
          num_sucursales: rem.num_sucursales,
          liquido_asignado: liquidoAsignado,
          sucursal: rem.sucursal_nombre
        });
      } else {
        totalLiquidosVentas += liquidoAsignado;
        totalDescuentosVentas += descuentosAsignados;
        totalSueldosBaseVentas += sueldoBaseAsignado;
        totalHaberesVentas += haberesAsignados;
        empleadosVentas.add(rem.rut_empleado);
        
        empleadosVentasDetalle.push({
          rut: rem.rut_empleado,
          nombre: rem.nombre_empleado,
          num_sucursales: rem.num_sucursales,
          liquido_asignado: liquidoAsignado,
          sucursal: rem.sucursal_nombre
        });
      }
    });
    
    const totalPagoAdmin = totalLiquidosAdmin + totalDescuentosAdmin;
    const totalPagoVentas = totalLiquidosVentas + totalDescuentosVentas;
    
    console.log('📊 CLASIFICACIÓN DE EMPLEADOS:');
    console.log(`   👔 ADMINISTRATIVOS: ${empleadosAdmin.size} empleados únicos`);
    empleadosAdminDetalle.forEach(emp => {
      console.log(`      - ${emp.nombre} (${emp.num_sucursales} sucursales) → $${emp.liquido_asignado.toLocaleString()} en ${emp.sucursal}`);
    });
    console.log(`   🛒 VENTAS: ${empleadosVentas.size} empleados únicos`);
    empleadosVentasDetalle.forEach(emp => {
      console.log(`      - ${emp.nombre} (${emp.num_sucursales} sucursal) → $${emp.liquido_asignado.toLocaleString()} en ${emp.sucursal}`);
    });
    
    // 🔥 CALCULAR COSTOS PATRONALES POR TIPO
    let costosPatronalesAdmin = {
      total_caja_compensacion: 0,
      total_afc: 0,
      total_sis: 0,
      total_ach: 0,
      total_imposiciones_patronales: 0
    };
    
    let costosPatronalesVentas = {
      total_caja_compensacion: 0,
      total_afc: 0,
      total_sis: 0,
      total_ach: 0,
      total_imposiciones_patronales: 0
    };
    
    let porcentajesAplicados = null;
    
    if (razon_social_id && razon_social_id !== 'todos') {
      try {
        const periodoResult = await pool.request()
          .input('anio', sql.Int, parseInt(anio))
          .input('mes', sql.Int, parseInt(mes))
          .query('SELECT id_periodo FROM periodos_remuneracion WHERE anio = @anio AND mes = @mes');

        if (periodoResult.recordset.length > 0) {
          const id_periodo = periodoResult.recordset[0].id_periodo;
          
          const porcentajesResult = await pool.request()
            .input('id_periodo', sql.Int, id_periodo)
            .input('id_razon_social', sql.Int, parseInt(razon_social_id))
            .query(`
              SELECT caja_compen, afc, sis, ach, imposiciones
              FROM porcentajes_por_periodo
              WHERE id_periodo = @id_periodo 
              AND id_razon_social = @id_razon_social
              AND activo = 1
            `);

          if (porcentajesResult.recordset.length > 0) {
            const porcentajes = porcentajesResult.recordset[0];
            porcentajesAplicados = porcentajes;
            
            console.log('📊 Aplicando porcentajes:', porcentajes);
            
            result.recordset.forEach(rem => {
              // Usar los valores ya asignados (divididos si es administrativo)
              const imponibleAsignado = parseFloat(rem.total_imponibles_asignado || 0);
              const imposicionesAsignadas = parseFloat(rem.imposiciones_asignadas || 0);
              
              const costos = {
                caja: (imponibleAsignado * parseFloat(porcentajes.caja_compen || 0)) / 100,
                afc: (imponibleAsignado * parseFloat(porcentajes.afc || 0)) / 100,
                sis: (imponibleAsignado * parseFloat(porcentajes.sis || 0)) / 100,
                ach: (imposicionesAsignadas * parseFloat(porcentajes.ach || 0)) / 100,
                imposiciones: (imponibleAsignado * parseFloat(porcentajes.imposiciones || 0)) / 100
              };
              
              if (rem.tipo_empleado === 'ADMINISTRATIVO') {
                costosPatronalesAdmin.total_caja_compensacion += costos.caja;
                costosPatronalesAdmin.total_afc += costos.afc;
                costosPatronalesAdmin.total_sis += costos.sis;
                costosPatronalesAdmin.total_ach += costos.ach;
                costosPatronalesAdmin.total_imposiciones_patronales += costos.imposiciones;
              } else {
                costosPatronalesVentas.total_caja_compensacion += costos.caja;
                costosPatronalesVentas.total_afc += costos.afc;
                costosPatronalesVentas.total_sis += costos.sis;
                costosPatronalesVentas.total_ach += costos.ach;
                costosPatronalesVentas.total_imposiciones_patronales += costos.imposiciones;
              }
            });
            
            console.log('✅ Costos patronales calculados por tipo');
          } else {
            console.log('⚠️ No se encontraron porcentajes configurados para este período');
          }
        }
      } catch (error) {
        console.log('⚠️ No se pudieron calcular costos patronales:', error.message);
      }
    }
    
    const totalCostosPatronalesAdmin = 
      costosPatronalesAdmin.total_caja_compensacion +
      costosPatronalesAdmin.total_afc +
      costosPatronalesAdmin.total_sis +
      costosPatronalesAdmin.total_ach +
      costosPatronalesAdmin.total_imposiciones_patronales;
    
    const totalCostosPatronalesVentas = 
      costosPatronalesVentas.total_caja_compensacion +
      costosPatronalesVentas.total_afc +
      costosPatronalesVentas.total_sis +
      costosPatronalesVentas.total_ach +
      costosPatronalesVentas.total_imposiciones_patronales;
    
    const totalCargoAdmin = totalPagoAdmin + totalCostosPatronalesAdmin;
    const totalCargoVentas = totalPagoVentas + totalCostosPatronalesVentas;
    const totalCargo = totalCargoAdmin + totalCargoVentas;
    
    console.log('\n💼 === RESUMEN FINAL ===');
    console.log(`👔 ADMINISTRATIVOS:`);
    console.log(`   - Empleados únicos: ${empleadosAdmin.size}`);
    console.log(`   - Total Pago: $${totalPagoAdmin.toLocaleString()}`);
    console.log(`   - Costos Patronales: $${totalCostosPatronalesAdmin.toLocaleString()}`);
    console.log(`   - TOTAL CARGO: $${totalCargoAdmin.toLocaleString()}`);
    console.log(`\n🛒 VENTAS:`);
    console.log(`   - Empleados únicos: ${empleadosVentas.size}`);
    console.log(`   - Total Pago: $${totalPagoVentas.toLocaleString()}`);
    console.log(`   - Costos Patronales: $${totalCostosPatronalesVentas.toLocaleString()}`);
    console.log(`   - TOTAL CARGO: $${totalCargoVentas.toLocaleString()}`);
    console.log(`\n💰 TOTAL GENERAL: $${totalCargo.toLocaleString()}`);
    
    return res.json({
      success: true,
      data: {
        remuneraciones: result.recordset,
        resumen: {
          // Totales generales
          total_liquidos: totalLiquidosAdmin + totalLiquidosVentas,
          total_descuentos: totalDescuentosAdmin + totalDescuentosVentas,
          total_sueldos_base: totalSueldosBaseAdmin + totalSueldosBaseVentas,
          total_haberes: totalHaberesAdmin + totalHaberesVentas,
          total_pago: totalPagoAdmin + totalPagoVentas,
          total_cargo: totalCargo,
          cantidad_empleados: result.recordset.length,
          empleados_unicos: empleadosAdmin.size + empleadosVentas.size,
          
          // 🔥 NUEVO: Totales por tipo de empleado
          administrativos: {
            total_liquidos: totalLiquidosAdmin,
            total_descuentos: totalDescuentosAdmin,
            total_sueldos_base: totalSueldosBaseAdmin,
            total_haberes: totalHaberesAdmin,
            total_pago: totalPagoAdmin,
            total_cargo: totalCargoAdmin,
            cantidad_empleados_unicos: empleadosAdmin.size,
            total_caja_compensacion: costosPatronalesAdmin.total_caja_compensacion,
            total_afc: costosPatronalesAdmin.total_afc,
            total_sis: costosPatronalesAdmin.total_sis,
            total_ach: costosPatronalesAdmin.total_ach,
            total_imposiciones_patronales: costosPatronalesAdmin.total_imposiciones_patronales,
            total_costos_patronales: totalCostosPatronalesAdmin
          },
          
          ventas: {
            total_liquidos: totalLiquidosVentas,
            total_descuentos: totalDescuentosVentas,
            total_sueldos_base: totalSueldosBaseVentas,
            total_haberes: totalHaberesVentas,
            total_pago: totalPagoVentas,
            total_cargo: totalCargoVentas,
            cantidad_empleados_unicos: empleadosVentas.size,
            total_caja_compensacion: costosPatronalesVentas.total_caja_compensacion,
            total_afc: costosPatronalesVentas.total_afc,
            total_sis: costosPatronalesVentas.total_sis,
            total_ach: costosPatronalesVentas.total_ach,
            total_imposiciones_patronales: costosPatronalesVentas.total_imposiciones_patronales,
            total_costos_patronales: totalCostosPatronalesVentas
          },
          
          // Costos patronales totales (para compatibilidad)
          total_caja_compensacion: costosPatronalesAdmin.total_caja_compensacion + costosPatronalesVentas.total_caja_compensacion,
          total_afc: costosPatronalesAdmin.total_afc + costosPatronalesVentas.total_afc,
          total_sis: costosPatronalesAdmin.total_sis + costosPatronalesVentas.total_sis,
          total_ach: costosPatronalesAdmin.total_ach + costosPatronalesVentas.total_ach,
          total_imposiciones_patronales: costosPatronalesAdmin.total_imposiciones_patronales + costosPatronalesVentas.total_imposiciones_patronales,
          
          // Metadata
          promedio_liquido: (empleadosAdmin.size + empleadosVentas.size) > 0 
            ? Math.round((totalLiquidosAdmin + totalLiquidosVentas) / (empleadosAdmin.size + empleadosVentas.size)) 
            : 0
        },
        porcentajes_aplicados: porcentajesAplicados
      },
      filtros: {
        anio: parseInt(anio),
        mes: parseInt(mes),
        sucursal_id: parseInt(sucursal_id),
        razon_social_id: razon_social_id || null
      },
      message: `${result.recordset.length} remuneraciones clasificadas (${empleadosAdmin.size} admin, ${empleadosVentas.size} ventas)`
    });
  } catch (error) {
    console.error('❌ Error obteniendo remuneraciones:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener datos de remuneraciones',
      error: error.message
    });
  }
};

// OBTENER SUCURSALES DISPONIBLES
exports.obtenerSucursales = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT id, nombre, tipo_sucursal, id_razon_social
      FROM sucursales 
      ORDER BY nombre
    `);
    return res.json({
      success: true,
      data: result.recordset,
      message: `${result.recordset.length} sucursales encontradas`
    });
  } catch (error) {
    console.error('❌ Error obteniendo sucursales:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener sucursales',
      error: error.message
    });
  }
};

// OBTENER RAZONES SOCIALES DISPONIBLES
exports.obtenerRazonesSociales = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT id, nombre_razon, rut, activo
      FROM razones_sociales
      WHERE activo = 1
      ORDER BY nombre_razon
    `);
    return res.json({
      success: true,
      data: result.recordset,
      message: `${result.recordset.length} razones sociales encontradas`
    });
  } catch (error) {
    console.error('❌ Error obteniendo razones sociales:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener razones sociales',
      error: error.message
    });
  }
};

// ==================== FUNCIONES PARA GUARDAR ESTADOS DE RESULTADOS ====================

// GUARDAR ESTADO DE RESULTADOS (CREAR NUEVO)
exports.guardarEstadoResultados = async (req, res) => {
  try {
    console.log('💾 Guardando estado de resultados...');
    const { data, usuario } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'Datos del estado de resultados son requeridos'
      });
    }

    const pool = await poolPromise;

    // Extraer datos del objeto
    const {
      sucursal,
      periodo,
      ingresos,
      costos,
      utilidadBruta,
      utilidadOperativa,
      utilidadAntesImpuestos,
      utilidadNeta,
      gastosOperativos,
      costoArriendo,
      otrosIngresosFinancieros,
      impuestos,
      estado,
      datosOriginales
    } = data;

    const result = await pool.request()
      .input('sucursal_id', sql.Int, datosOriginales.sucursal)
      .input('sucursal_nombre', sql.NVarChar, sucursal)
      .input('razon_social_id', sql.Int, datosOriginales.razonSocialId || null)
      .input('razon_social_nombre', sql.NVarChar, datosOriginales.razonSocialNombre || null)
      .input('periodo', sql.NVarChar, periodo)
      .input('mes', sql.Int, datosOriginales.periodo?.mes)
      .input('anio', sql.Int, datosOriginales.periodo?.año)

      // Ingresos
      .input('ventas', sql.Decimal(18, 2), ingresos.ventas)
      .input('otros_ingresos_fletes', sql.Decimal(18, 2), ingresos.otrosIngresos?.fletes || 0)
      .input('otros_ingresos_total', sql.Decimal(18, 2), ingresos.otrosIngresos?.total || 0)
      .input('total_ingresos', sql.Decimal(18, 2), ingresos.totalIngresos)

      // Costos
      .input('costo_ventas', sql.Decimal(18, 2), costos.costoVentas)
      .input('compras_totales', sql.Decimal(18, 2), costos.compras)
      .input('merma_venta', sql.Decimal(18, 2), costos.mermaVenta || 0)
      .input('total_costos', sql.Decimal(18, 2), costos.totalCostos)

      // Utilidades
      .input('utilidad_bruta', sql.Decimal(18, 2), utilidadBruta)
      .input('utilidad_operativa', sql.Decimal(18, 2), utilidadOperativa)
      .input('utilidad_antes_impuestos', sql.Decimal(18, 2), utilidadAntesImpuestos)
      .input('utilidad_neta', sql.Decimal(18, 2), utilidadNeta)

      // Gastos Administrativos
      .input('gastos_admin_sueldos', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.sueldos || 0)
      .input('gastos_admin_seguros', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.seguros || 0)
      .input('gastos_admin_gastos_comunes', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.gastosComunes || 0)
      .input('gastos_admin_electricidad', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.electricidad || 0)
      .input('gastos_admin_agua', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.agua || 0)
      .input('gastos_admin_telefonia', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.telefonia || 0)
      .input('gastos_admin_alarma', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.alarma || 0)
      .input('gastos_admin_internet', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.internet || 0)
      .input('gastos_admin_facturas_net', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.facturasNet || 0)
      .input('gastos_admin_transbank', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.transbank || 0)
      .input('gastos_admin_patente_municipal', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.patenteMunicipal || 0)
      .input('gastos_admin_contribuciones', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.contribuciones || 0)
      .input('gastos_admin_petroleo', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.petroleo || 0)
      .input('gastos_admin_otros', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.otros || 0)
      .input('gastos_admin_total', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.total || 0)

      // Gastos de Venta
      .input('gastos_venta_sueldos', sql.Decimal(18, 2), gastosOperativos.gastosVenta?.sueldos || 0)
      .input('gastos_venta_fletes', sql.Decimal(18, 2), gastosOperativos.gastosVenta?.fletes || 0)
      .input('gastos_venta_finiquitos', sql.Decimal(18, 2), gastosOperativos.gastosVenta?.finiquitos || 0)
      .input('gastos_venta_mantenciones', sql.Decimal(18, 2), gastosOperativos.gastosVenta?.mantenciones || 0)
      .input('gastos_venta_publicidad', sql.Decimal(18, 2), gastosOperativos.gastosVenta?.publicidad || 0)
      .input('gastos_venta_total', sql.Decimal(18, 2), gastosOperativos.gastosVenta?.total || 0)

      // Totales
      .input('total_gastos_operativos', sql.Decimal(18, 2), gastosOperativos.totalGastosOperativos)

      // Otros
      .input('costo_arriendo', sql.Decimal(18, 2), costoArriendo || 0)
      .input('otros_ingresos_financieros', sql.Decimal(18, 2), otrosIngresosFinancieros || 0)
      .input('impuestos', sql.Decimal(18, 2), impuestos || 0)

      // Metadata
      .input('numero_facturas', sql.Int, datosOriginales.numeroFacturas || 0)
      .input('numero_ventas', sql.Int, datosOriginales.numeroVentas || 0)
      .input('numero_empleados', sql.Int, datosOriginales.numeroEmpleados || 0)
      .input('empleados_admin', sql.Int, datosOriginales.clasificacion?.empleados_admin || 0)
      .input('empleados_ventas', sql.Int, datosOriginales.clasificacion?.empleados_ventas || 0)
      .input('total_compras_valor', sql.Decimal(18, 2), datosOriginales.totalCompras || 0)
      .input('total_remuneraciones_valor', sql.Decimal(18, 2), datosOriginales.totalRemuneraciones || 0)

      // JSON
      .input('datos_originales_json', sql.NVarChar(sql.MAX), JSON.stringify(datosOriginales))
      .input('detalle_remuneraciones_json', sql.NVarChar(sql.MAX), JSON.stringify(datosOriginales.detalleRemuneraciones || {}))

      // Control
      .input('estado', sql.NVarChar, estado || 'borrador')
      .input('creado_por', sql.NVarChar, usuario || 'sistema')
      .query(`
        INSERT INTO estados_resultados (
          sucursal_id, sucursal_nombre, razon_social_id, razon_social_nombre,
          periodo, mes, anio,
          ventas, otros_ingresos_fletes, otros_ingresos_total, total_ingresos,
          costo_ventas, compras_totales, merma_venta, total_costos,
          utilidad_bruta, utilidad_operativa, utilidad_antes_impuestos, utilidad_neta,
          gastos_admin_sueldos, gastos_admin_seguros, gastos_admin_gastos_comunes,
          gastos_admin_electricidad, gastos_admin_agua, gastos_admin_telefonia,
          gastos_admin_alarma, gastos_admin_internet, gastos_admin_facturas_net,
          gastos_admin_transbank, gastos_admin_patente_municipal, gastos_admin_contribuciones,
          gastos_admin_petroleo, gastos_admin_otros, gastos_admin_total,
          gastos_venta_sueldos, gastos_venta_fletes, gastos_venta_finiquitos,
          gastos_venta_mantenciones, gastos_venta_publicidad, gastos_venta_total,
          total_gastos_operativos,
          costo_arriendo, otros_ingresos_financieros, impuestos,
          numero_facturas, numero_ventas, numero_empleados, empleados_admin, empleados_ventas,
          total_compras_valor, total_remuneraciones_valor,
          datos_originales_json, detalle_remuneraciones_json,
          estado, creado_por, fecha_creacion
        )
        OUTPUT INSERTED.*
        VALUES (
          @sucursal_id, @sucursal_nombre, @razon_social_id, @razon_social_nombre,
          @periodo, @mes, @anio,
          @ventas, @otros_ingresos_fletes, @otros_ingresos_total, @total_ingresos,
          @costo_ventas, @compras_totales, @merma_venta, @total_costos,
          @utilidad_bruta, @utilidad_operativa, @utilidad_antes_impuestos, @utilidad_neta,
          @gastos_admin_sueldos, @gastos_admin_seguros, @gastos_admin_gastos_comunes,
          @gastos_admin_electricidad, @gastos_admin_agua, @gastos_admin_telefonia,
          @gastos_admin_alarma, @gastos_admin_internet, @gastos_admin_facturas_net,
          @gastos_admin_transbank, @gastos_admin_patente_municipal, @gastos_admin_contribuciones,
          @gastos_admin_petroleo, @gastos_admin_otros, @gastos_admin_total,
          @gastos_venta_sueldos, @gastos_venta_fletes, @gastos_venta_finiquitos,
          @gastos_venta_mantenciones, @gastos_venta_publicidad, @gastos_venta_total,
          @total_gastos_operativos,
          @costo_arriendo, @otros_ingresos_financieros, @impuestos,
          @numero_facturas, @numero_ventas, @numero_empleados, @empleados_admin, @empleados_ventas,
          @total_compras_valor, @total_remuneraciones_valor,
          @datos_originales_json, @detalle_remuneraciones_json,
          @estado, @creado_por, GETDATE()
        )
      `);

    console.log('✅ Estado de resultados guardado:', result.recordset[0].id);

    return res.status(201).json({
      success: true,
      message: 'Estado de resultados guardado exitosamente',
      data: result.recordset[0]
    });

  } catch (error) {
    console.error('❌ Error guardando estado de resultados:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al guardar estado de resultados',
      error: error.message
    });
  }
};

// ACTUALIZAR ESTADO DE RESULTADOS EXISTENTE
exports.actualizarEstadoResultados = async (req, res) => {
  try {
    console.log('📝 Actualizando estado de resultados...');
    const { id } = req.params;
    const { data, usuario } = req.body;

    if (!id || !data) {
      return res.status(400).json({
        success: false,
        message: 'ID y datos del estado de resultados son requeridos'
      });
    }

    const pool = await poolPromise;

    // Verificar que el estado de resultados existe y no está enviado
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id, estado FROM estados_resultados WHERE id = @id');

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Estado de resultados no encontrado'
      });
    }

    if (checkResult.recordset[0].estado === 'enviado') {
      return res.status(400).json({
        success: false,
        message: 'No se puede modificar un estado de resultados enviado'
      });
    }

    // Actualizar
    const {
      ingresos,
      costos,
      utilidadBruta,
      utilidadOperativa,
      utilidadAntesImpuestos,
      utilidadNeta,
      gastosOperativos,
      costoArriendo,
      otrosIngresosFinancieros,
      impuestos,
      estado,
      datosOriginales
    } = data;

    const result = await pool.request()
      .input('id', sql.Int, id)
      // Ingresos
      .input('ventas', sql.Decimal(18, 2), ingresos.ventas)
      .input('otros_ingresos_fletes', sql.Decimal(18, 2), ingresos.otrosIngresos?.fletes || 0)
      .input('otros_ingresos_total', sql.Decimal(18, 2), ingresos.otrosIngresos?.total || 0)
      .input('total_ingresos', sql.Decimal(18, 2), ingresos.totalIngresos)

      // Costos
      .input('costo_ventas', sql.Decimal(18, 2), costos.costoVentas)
      .input('merma_venta', sql.Decimal(18, 2), costos.mermaVenta || 0)
      .input('total_costos', sql.Decimal(18, 2), costos.totalCostos)

      // Utilidades
      .input('utilidad_bruta', sql.Decimal(18, 2), utilidadBruta)
      .input('utilidad_operativa', sql.Decimal(18, 2), utilidadOperativa)
      .input('utilidad_antes_impuestos', sql.Decimal(18, 2), utilidadAntesImpuestos)
      .input('utilidad_neta', sql.Decimal(18, 2), utilidadNeta)

      // Gastos Administrativos
      .input('gastos_admin_gastos_comunes', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.gastosComunes || 0)
      .input('gastos_admin_electricidad', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.electricidad || 0)
      .input('gastos_admin_agua', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.agua || 0)
      .input('gastos_admin_telefonia', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.telefonia || 0)
      .input('gastos_admin_alarma', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.alarma || 0)
      .input('gastos_admin_internet', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.internet || 0)
      .input('gastos_admin_facturas_net', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.facturasNet || 0)
      .input('gastos_admin_transbank', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.transbank || 0)
      .input('gastos_admin_patente_municipal', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.patenteMunicipal || 0)
      .input('gastos_admin_contribuciones', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.contribuciones || 0)
      .input('gastos_admin_petroleo', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.petroleo || 0)
      .input('gastos_admin_otros', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.otros || 0)
      .input('gastos_admin_total', sql.Decimal(18, 2), gastosOperativos.gastosAdministrativos?.total || 0)

      // Gastos de Venta
      .input('gastos_venta_fletes', sql.Decimal(18, 2), gastosOperativos.gastosVenta?.fletes || 0)
      .input('gastos_venta_finiquitos', sql.Decimal(18, 2), gastosOperativos.gastosVenta?.finiquitos || 0)
      .input('gastos_venta_mantenciones', sql.Decimal(18, 2), gastosOperativos.gastosVenta?.mantenciones || 0)
      .input('gastos_venta_publicidad', sql.Decimal(18, 2), gastosOperativos.gastosVenta?.publicidad || 0)
      .input('gastos_venta_total', sql.Decimal(18, 2), gastosOperativos.gastosVenta?.total || 0)

      // Totales
      .input('total_gastos_operativos', sql.Decimal(18, 2), gastosOperativos.totalGastosOperativos)

      // Otros
      .input('costo_arriendo', sql.Decimal(18, 2), costoArriendo || 0)
      .input('otros_ingresos_financieros', sql.Decimal(18, 2), otrosIngresosFinancieros || 0)
      .input('impuestos', sql.Decimal(18, 2), impuestos || 0)

      // Control
      .input('estado', sql.NVarChar, estado || 'guardado')
      .input('modificado_por', sql.NVarChar, usuario || 'sistema')
      .query(`
        UPDATE estados_resultados
        SET
          ventas = @ventas,
          otros_ingresos_fletes = @otros_ingresos_fletes,
          otros_ingresos_total = @otros_ingresos_total,
          total_ingresos = @total_ingresos,
          costo_ventas = @costo_ventas,
          merma_venta = @merma_venta,
          total_costos = @total_costos,
          utilidad_bruta = @utilidad_bruta,
          utilidad_operativa = @utilidad_operativa,
          utilidad_antes_impuestos = @utilidad_antes_impuestos,
          utilidad_neta = @utilidad_neta,
          gastos_admin_gastos_comunes = @gastos_admin_gastos_comunes,
          gastos_admin_electricidad = @gastos_admin_electricidad,
          gastos_admin_agua = @gastos_admin_agua,
          gastos_admin_telefonia = @gastos_admin_telefonia,
          gastos_admin_alarma = @gastos_admin_alarma,
          gastos_admin_internet = @gastos_admin_internet,
          gastos_admin_facturas_net = @gastos_admin_facturas_net,
          gastos_admin_transbank = @gastos_admin_transbank,
          gastos_admin_patente_municipal = @gastos_admin_patente_municipal,
          gastos_admin_contribuciones = @gastos_admin_contribuciones,
          gastos_admin_petroleo = @gastos_admin_petroleo,
          gastos_admin_otros = @gastos_admin_otros,
          gastos_admin_total = @gastos_admin_total,
          gastos_venta_fletes = @gastos_venta_fletes,
          gastos_venta_finiquitos = @gastos_venta_finiquitos,
          gastos_venta_mantenciones = @gastos_venta_mantenciones,
          gastos_venta_publicidad = @gastos_venta_publicidad,
          gastos_venta_total = @gastos_venta_total,
          total_gastos_operativos = @total_gastos_operativos,
          costo_arriendo = @costo_arriendo,
          otros_ingresos_financieros = @otros_ingresos_financieros,
          impuestos = @impuestos,
          estado = @estado,
          modificado_por = @modificado_por,
          fecha_modificacion = GETDATE()
        WHERE id = @id
      `);

    console.log('✅ Estado de resultados actualizado:', id);

    return res.json({
      success: true,
      message: 'Estado de resultados actualizado exitosamente',
      id: parseInt(id)
    });

  } catch (error) {
    console.error('❌ Error actualizando estado de resultados:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar estado de resultados',
      error: error.message
    });
  }
};

// ENVIAR ESTADO DE RESULTADOS (cambiar estado a 'enviado')
exports.enviarEstadoResultados = async (req, res) => {
  try {
    console.log('📤 Enviando estado de resultados...');
    const { id } = req.params;
    const { usuario } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID del estado de resultados es requerido'
      });
    }

    const pool = await poolPromise;

    // Verificar que existe
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id, estado FROM estados_resultados WHERE id = @id');

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Estado de resultados no encontrado'
      });
    }

    if (checkResult.recordset[0].estado === 'enviado') {
      return res.status(400).json({
        success: false,
        message: 'El estado de resultados ya ha sido enviado'
      });
    }

    // Cambiar estado a enviado
    await pool.request()
      .input('id', sql.Int, id)
      .input('enviado_por', sql.NVarChar, usuario || 'sistema')
      .query(`
        UPDATE estados_resultados
        SET estado = 'enviado',
            enviado_por = @enviado_por,
            fecha_envio = GETDATE()
        WHERE id = @id
      `);

    console.log('✅ Estado de resultados enviado:', id);

    return res.json({
      success: true,
      message: 'Estado de resultados enviado exitosamente',
      id: parseInt(id)
    });

  } catch (error) {
    console.error('❌ Error enviando estado de resultados:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al enviar estado de resultados',
      error: error.message
    });
  }
};

// LISTAR ESTADOS DE RESULTADOS CON FILTROS
exports.listarEstadosResultados = async (req, res) => {
  try {
    console.log('📋 Listando estados de resultados...');
    const { sucursal_id, mes, anio, estado, limit = 50, offset = 0 } = req.query;

    const pool = await poolPromise;
    let query = `
      SELECT
        id, sucursal_id, sucursal_nombre, razon_social_id, razon_social_nombre,
        periodo, mes, anio,
        ventas, total_ingresos, total_costos,
        utilidad_bruta, utilidad_operativa, utilidad_neta,
        total_gastos_operativos,
        estado, creado_por, fecha_creacion, modificado_por, fecha_modificacion,
        enviado_por, fecha_envio,
        numero_facturas, numero_ventas, numero_empleados,
        empleados_admin, empleados_ventas
      FROM estados_resultados
      WHERE 1=1
    `;

    const request = pool.request();

    if (sucursal_id) {
      query += ' AND sucursal_id = @sucursal_id';
      request.input('sucursal_id', sql.Int, sucursal_id);
    }

    if (mes) {
      query += ' AND mes = @mes';
      request.input('mes', sql.Int, mes);
    }

    if (anio) {
      query += ' AND anio = @anio';
      request.input('anio', sql.Int, anio);
    }

    if (estado) {
      query += ' AND estado = @estado';
      request.input('estado', sql.NVarChar, estado);
    }

    query += `
      ORDER BY anio DESC, mes DESC, fecha_creacion DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    request.input('offset', sql.Int, parseInt(offset));
    request.input('limit', sql.Int, parseInt(limit));

    const result = await request.query(query);

    return res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length,
      message: `${result.recordset.length} estados de resultados encontrados`
    });

  } catch (error) {
    console.error('❌ Error listando estados de resultados:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al listar estados de resultados',
      error: error.message
    });
  }
};

// OBTENER UN ESTADO DE RESULTADOS POR ID
exports.obtenerEstadoResultadosPorId = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID del estado de resultados es requerido'
      });
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM estados_resultados WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Estado de resultados no encontrado'
      });
    }

    // Parsear JSON fields
    const data = result.recordset[0];
    if (data.datos_originales_json) {
      data.datosOriginales = JSON.parse(data.datos_originales_json);
    }
    if (data.detalle_remuneraciones_json) {
      data.detalleRemuneraciones = JSON.parse(data.detalle_remuneraciones_json);
    }

    return res.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('❌ Error obteniendo estado de resultados:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estado de resultados',
      error: error.message
    });
  }
};

module.exports = exports;