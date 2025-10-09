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
        es.id_sucursal,
        e.id AS id_empleado,
        e.id_razon_social,
        s.nombre as sucursal_nombre,
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
      INNER JOIN empleados_sucursales AS es ON es.id_empleado = e.id AND es.activo = 1
      LEFT JOIN EmpleadoSucursales ems ON ems.id_empleado = e.id
      LEFT JOIN sucursales s ON es.id_sucursal = s.id
      LEFT JOIN razones_sociales rs ON e.id_razon_social = rs.id
      WHERE pr.anio = @anio
        AND pr.mes = @mes
        AND es.id_sucursal = @sucursal_id
        AND (dr.liquido_pagar IS NOT NULL OR dr.seguro_cesantia IS NOT NULL)
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

module.exports = exports;