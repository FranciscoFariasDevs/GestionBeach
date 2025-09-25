// controllers/estadoResultadosController.js - CONTROLADOR CENTRALIZADO PARA ESTADO DE RESULTADOS
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

// 📊 OBTENER DATOS DE VENTAS PARA ESTADO DE RESULTADOS
exports.obtenerVentas = async (req, res) => {
  try {
    console.log('🛒 Obteniendo datos de ventas para Estado de Resultados...');
    
    const { 
      fecha_desde, 
      fecha_hasta, 
      sucursal_id, 
      razon_social_id 
    } = req.query;
    
    // Validaciones
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
    
    // Query para obtener ventas
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
    
    // Filtro opcional por razón social
    if (razon_social_id && razon_social_id !== 'todos') {
      ventasQuery += ' AND rs.id = @razon_social_id';
      request.input('razon_social_id', sql.Int, parseInt(razon_social_id));
    }
    
    ventasQuery += ' ORDER BY v.fecha DESC';
    
    const result = await request.query(ventasQuery);
    
    // Calcular totales
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

// 📦 OBTENER DATOS DE COMPRAS (FACTURAS XML) PARA ESTADO DE RESULTADOS
exports.obtenerCompras = async (req, res) => {
  try {
    console.log('📦 Obteniendo datos de compras para Estado de Resultados...');
    
    const { 
      fecha_desde, 
      fecha_hasta, 
      sucursal_id, 
      razon_social_id 
    } = req.query;
    
    // Validaciones
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
    
    // Query para obtener compras desde facturas XML
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
    
    // Filtro opcional por razón social
    if (razon_social_id && razon_social_id !== 'todos') {
      comprasQuery += ' AND rs.id = @razon_social_id';
      request.input('razon_social_id', sql.Int, parseInt(razon_social_id));
    }
    
    comprasQuery += ' ORDER BY fe.FECHA_EMISION DESC';
    
    const result = await request.query(comprasQuery);
    
    // Calcular totales
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

// 👥 OBTENER DATOS DE REMUNERACIONES PARA ESTADO DE RESULTADOS
exports.obtenerRemuneraciones = async (req, res) => {
  try {
    console.log('👥 Obteniendo datos de remuneraciones para Estado de Resultados...');
    
    const { 
      anio, 
      mes, 
      sucursal_id, 
      razon_social_id 
    } = req.query;
    
    // Validaciones
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
    
    console.log('📅 Filtros remuneraciones:', {
      anio: parseInt(anio),
      mes: parseInt(mes),
      sucursal_id: parseInt(sucursal_id),
      razon_social_id: razon_social_id || 'todos'
    });
    
    // Query corregida basada en tu estructura
    let remuneracionesQuery = `
      SELECT 
        dr.liquido_pagar, 
        dr.seguro_cesantia,
        dr.sueldo_base,
        dr.total_haberes,
        dr.total_descuentos,
        dr.rut_empleado,
        dr.nombre_empleado,
        pr.mes,
        pr.anio,
        es.id_sucursal,
        e.id_razon_social,
        s.nombre as sucursal_nombre,
        rs.nombre_razon,
        e.nombre as empleado_nombre,
        e.apellido as empleado_apellido
      FROM datos_remuneraciones AS dr 
      INNER JOIN periodos_remuneracion AS pr ON pr.id_periodo = dr.id_periodo
      INNER JOIN empleados AS e ON REPLACE(REPLACE(REPLACE(UPPER(e.rut), '.', ''), '-', ''), ' ', '') = 
                                   REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '')
      INNER JOIN empleados_sucursales AS es ON es.id_empleado = e.id 
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
    
    // Filtro opcional por razón social
    if (razon_social_id && razon_social_id !== 'todos') {
      remuneracionesQuery += ' AND e.id_razon_social = @razon_social_id';
      request.input('razon_social_id', sql.Int, parseInt(razon_social_id));
    }
    
    remuneracionesQuery += ' ORDER BY dr.nombre_empleado';
    
    const result = await request.query(remuneracionesQuery);
    
    // Calcular totales
    const totalLiquidos = result.recordset.reduce((sum, rem) => sum + (rem.liquido_pagar || 0), 0);
    const totalSegurosCesantia = result.recordset.reduce((sum, rem) => sum + (rem.seguro_cesantia || 0), 0);
    const totalSueldosBase = result.recordset.reduce((sum, rem) => sum + (rem.sueldo_base || 0), 0);
    const totalHaberes = result.recordset.reduce((sum, rem) => sum + (rem.total_haberes || 0), 0);
    const totalDescuentos = result.recordset.reduce((sum, rem) => sum + (rem.total_descuentos || 0), 0);
    const cantidadEmpleados = result.recordset.length;
    
    console.log(`✅ Remuneraciones obtenidas: ${cantidadEmpleados} empleados`);
    console.log(`💰 Total líquidos: $${totalLiquidos.toLocaleString()}`);
    console.log(`🛡️ Total seguros cesantía: $${totalSegurosCesantia.toLocaleString()}`);
    
    return res.json({
      success: true,
      data: {
        remuneraciones: result.recordset,
        resumen: {
          total_liquidos: totalLiquidos,
          total_seguros_cesantia: totalSegurosCesantia,
          total_sueldos_base: totalSueldosBase,
          total_haberes: totalHaberes,
          total_descuentos: totalDescuentos,
          cantidad_empleados: cantidadEmpleados,
          promedio_liquido: cantidadEmpleados > 0 ? Math.round(totalLiquidos / cantidadEmpleados) : 0
        }
      },
      filtros: {
        anio: parseInt(anio),
        mes: parseInt(mes),
        sucursal_id: parseInt(sucursal_id),
        razon_social_id: razon_social_id || null
      },
      message: `${cantidadEmpleados} empleados con remuneraciones encontrados`
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

// 📈 GENERAR ESTADO DE RESULTADOS COMPLETO
exports.generarEstadoResultados = async (req, res) => {
  try {
    console.log('📈 Generando Estado de Resultados completo...');
    
    const { 
      fecha_desde, 
      fecha_hasta, 
      sucursal_id, 
      razon_social_id 
    } = req.body;
    
    // Validaciones
    if (!fecha_desde || !fecha_hasta || !sucursal_id) {
      return res.status(400).json({
        success: false,
        message: 'Fecha desde, fecha hasta y sucursal son requeridos'
      });
    }
    
    // Extraer año y mes de las fechas para remuneraciones
    const fechaInicio = new Date(fecha_desde);
    const anio = fechaInicio.getFullYear();
    const mes = fechaInicio.getMonth() + 1;
    
    console.log('🔄 Obteniendo datos de todos los módulos...');
    
    const pool = await poolPromise;
    
    // 1. Obtener datos de ventas
    const ventasData = await obtenerDatosVentas(pool, {
      fecha_desde,
      fecha_hasta,
      sucursal_id,
      razon_social_id
    });
    
    // 2. Obtener datos de compras
    const comprasData = await obtenerDatosCompras(pool, {
      fecha_desde,
      fecha_hasta,
      sucursal_id,
      razon_social_id
    });
    
    // 3. Obtener datos de remuneraciones
    const remuneracionesData = await obtenerDatosRemuneraciones(pool, {
      anio,
      mes,
      sucursal_id,
      razon_social_id
    });
    
    // 4. Construir estado de resultados
    const estadoResultados = construirEstadoResultados({
      ventas: ventasData,
      compras: comprasData,
      remuneraciones: remuneracionesData,
      filtros: { fecha_desde, fecha_hasta, sucursal_id, razon_social_id }
    });
    
    console.log('✅ Estado de Resultados generado exitosamente');
    
    return res.json({
      success: true,
      data: estadoResultados,
      message: 'Estado de Resultados generado exitosamente'
    });
    
  } catch (error) {
    console.error('❌ Error generando Estado de Resultados:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al generar Estado de Resultados',
      error: error.message
    });
  }
};

// 🏢 OBTENER SUCURSALES DISPONIBLES
exports.obtenerSucursales = async (req, res) => {
  try {
    const pool = await poolPromise;
    
    const result = await pool.request().query(`
      SELECT 
        id, 
        nombre, 
        tipo_sucursal,
        id_razon_social
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

// 🏭 OBTENER RAZONES SOCIALES DISPONIBLES
exports.obtenerRazonesSociales = async (req, res) => {
  try {
    const pool = await poolPromise;
    
    const result = await pool.request().query(`
      SELECT 
        id, 
        nombre_razon,
        rut,
        activo
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

// ==================== FUNCIONES AUXILIARES ====================

// Función auxiliar para obtener datos de ventas
async function obtenerDatosVentas(pool, filtros) {
  try {
    let ventasQuery = `
      SELECT 
        v.total as monto_total,
        v.fecha,
        v.sucursal_id
      FROM ventas v
      WHERE v.fecha BETWEEN @fecha_desde AND @fecha_hasta
        AND v.sucursal_id = @sucursal_id
        AND v.total > 0
    `;
    
    const request = pool.request()
      .input('fecha_desde', sql.Date, new Date(filtros.fecha_desde))
      .input('fecha_hasta', sql.Date, new Date(filtros.fecha_hasta))
      .input('sucursal_id', sql.Int, parseInt(filtros.sucursal_id));
    
    if (filtros.razon_social_id && filtros.razon_social_id !== 'todos') {
      ventasQuery += `
        AND EXISTS (
          SELECT 1 FROM sucursales s 
          WHERE s.id = v.sucursal_id AND s.id_razon_social = @razon_social_id
        )
      `;
      request.input('razon_social_id', sql.Int, parseInt(filtros.razon_social_id));
    }
    
    const result = await request.query(ventasQuery);
    
    return {
      registros: result.recordset,
      total: result.recordset.reduce((sum, venta) => sum + (venta.monto_total || 0), 0),
      cantidad: result.recordset.length
    };
    
  } catch (error) {
    console.error('Error obteniendo datos de ventas:', error);
    return { registros: [], total: 0, cantidad: 0 };
  }
}

// Función auxiliar para obtener datos de compras
async function obtenerDatosCompras(pool, filtros) {
  try {
    let comprasQuery = `
      SELECT 
        fe.MONTO_TOTAL as monto_total,
        fe.MONTO_NETO as monto_neto,
        fe.IVA as monto_iva,
        fe.FECHA_EMISION as fecha_emision
      FROM TB_FACTURA_ENCABEZADO fe
      WHERE fe.FECHA_EMISION BETWEEN @fecha_desde AND @fecha_hasta
        AND fe.estado = 'PROCESADA'
        AND fe.MONTO_TOTAL > 0
        AND fe.id_sucursal = @sucursal_id
    `;
    
    const request = pool.request()
      .input('fecha_desde', sql.Date, new Date(filtros.fecha_desde))
      .input('fecha_hasta', sql.Date, new Date(filtros.fecha_hasta))
      .input('sucursal_id', sql.Int, parseInt(filtros.sucursal_id));
    
    if (filtros.razon_social_id && filtros.razon_social_id !== 'todos') {
      comprasQuery += `
        AND EXISTS (
          SELECT 1 FROM sucursales s 
          WHERE s.id = fe.id_sucursal AND s.id_razon_social = @razon_social_id
        )
      `;
      request.input('razon_social_id', sql.Int, parseInt(filtros.razon_social_id));
    }
    
    const result = await request.query(comprasQuery);
    
    return {
      registros: result.recordset,
      total: result.recordset.reduce((sum, compra) => sum + (compra.monto_total || 0), 0),
      total_neto: result.recordset.reduce((sum, compra) => sum + (compra.monto_neto || 0), 0),
      total_iva: result.recordset.reduce((sum, compra) => sum + (compra.monto_iva || 0), 0),
      cantidad: result.recordset.length
    };
    
  } catch (error) {
    console.error('Error obteniendo datos de compras:', error);
    return { registros: [], total: 0, total_neto: 0, total_iva: 0, cantidad: 0 };
  }
}

// Función auxiliar para obtener datos de remuneraciones
async function obtenerDatosRemuneraciones(pool, filtros) {
  try {
    let remuneracionesQuery = `
      SELECT 
        dr.liquido_pagar, 
        dr.seguro_cesantia,
        dr.sueldo_base,
        dr.total_haberes,
        dr.total_descuentos
      FROM datos_remuneraciones AS dr 
      INNER JOIN periodos_remuneracion AS pr ON pr.id_periodo = dr.id_periodo
      INNER JOIN empleados AS e ON REPLACE(REPLACE(REPLACE(UPPER(e.rut), '.', ''), '-', ''), ' ', '') = 
                                   REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '')
      INNER JOIN empleados_sucursales AS es ON es.id_empleado = e.id 
      WHERE pr.anio = @anio
        AND pr.mes = @mes
        AND es.id_sucursal = @sucursal_id
        AND (dr.liquido_pagar IS NOT NULL OR dr.seguro_cesantia IS NOT NULL)
    `;
    
    const request = pool.request()
      .input('anio', sql.Int, filtros.anio)
      .input('mes', sql.Int, filtros.mes)
      .input('sucursal_id', sql.Int, parseInt(filtros.sucursal_id));
    
    if (filtros.razon_social_id && filtros.razon_social_id !== 'todos') {
      remuneracionesQuery += ' AND e.id_razon_social = @razon_social_id';
      request.input('razon_social_id', sql.Int, parseInt(filtros.razon_social_id));
    }
    
    const result = await request.query(remuneracionesQuery);
    
    return {
      registros: result.recordset,
      total_liquidos: result.recordset.reduce((sum, rem) => sum + (rem.liquido_pagar || 0), 0),
      total_seguros_cesantia: result.recordset.reduce((sum, rem) => sum + (rem.seguro_cesantia || 0), 0),
      total_sueldos_base: result.recordset.reduce((sum, rem) => sum + (rem.sueldo_base || 0), 0),
      total_haberes: result.recordset.reduce((sum, rem) => sum + (rem.total_haberes || 0), 0),
      total_descuentos: result.recordset.reduce((sum, rem) => sum + (rem.total_descuentos || 0), 0),
      cantidad: result.recordset.length
    };
    
  } catch (error) {
    console.error('Error obteniendo datos de remuneraciones:', error);
    return { 
      registros: [], 
      total_liquidos: 0, 
      total_seguros_cesantia: 0, 
      total_sueldos_base: 0,
      total_haberes: 0,
      total_descuentos: 0,
      cantidad: 0 
    };
  }
}

// Función para construir el estado de resultados
function construirEstadoResultados({ ventas, compras, remuneraciones, filtros }) {
  // Calcular distribución de sueldos (50% administrativos, 50% ventas por defecto)
  const totalSueldos = remuneraciones.total_sueldos_base || remuneraciones.total_liquidos;
  const sueldosAdministrativos = totalSueldos * 0.5;
  const sueldosVentas = totalSueldos * 0.5;
  
  // Construir estructura del estado de resultados
  const estadoResultados = {
    periodo: {
      fecha_desde: filtros.fecha_desde,
      fecha_hasta: filtros.fecha_hasta,
      sucursal_id: filtros.sucursal_id,
      razon_social_id: filtros.razon_social_id
    },
    
    // INGRESOS
    ingresos: {
      ventas: ventas.total,
      otros_ingresos: 0,
      total_ingresos: ventas.total
    },
    
    // COSTOS
    costos: {
      costo_ventas: compras.total * 0.81, // Estimación del 81% como costo directo
      compras: compras.total,
      inventario_inicial: 0,
      inventario_final: 0,
      total_costos: compras.total * 0.81
    },
    
    // UTILIDAD BRUTA
    utilidad_bruta: ventas.total - (compras.total * 0.81),
    
    // GASTOS OPERATIVOS
    gastos_operativos: {
      gastos_ventas: {
        sueldos_ventas: sueldosVentas,
        comisiones: 0,
        marketing: 0,
        transporte: 0,
        otros_gastos_ventas: 0,
        total_gastos_ventas: sueldosVentas
      },
      
      gastos_administrativos: {
        sueldos_administrativos: sueldosAdministrativos,
        seguros_cesantia: remuneraciones.total_seguros_cesantia,
        arriendo: 0,
        servicios_basicos: 0,
        servicios_profesionales: 0,
        depreciacion: 0,
        otros_gastos_admin: 0,
        total_gastos_administrativos: sueldosAdministrativos + remuneraciones.total_seguros_cesantia
      },
      
      total_gastos_operativos: sueldosVentas + sueldosAdministrativos + remuneraciones.total_seguros_cesantia
    },
    
    // UTILIDAD OPERATIVA
    utilidad_operativa: 0, // Se calcula abajo
    
    // OTROS INGRESOS Y GASTOS
    otros_ingresos_gastos: {
      ingresos_financieros: 0,
      gastos_financieros: 0,
      otros_ingresos: 0,
      otros_gastos: 0,
      total_otros: 0
    },
    
    // UTILIDAD ANTES DE IMPUESTOS
    utilidad_antes_impuestos: 0,
    
    // IMPUESTOS
    impuestos: 0,
    
    // UTILIDAD NETA
    utilidad_neta: 0,
    
    // DATOS ORIGINALES
    datos_originales: {
      ventas: ventas,
      compras: compras,
      remuneraciones: remuneraciones
    },
    
    // RATIOS FINANCIEROS
    ratios: {
      margen_bruto: 0,
      margen_operativo: 0,
      margen_neto: 0
    },
    
    fecha_generacion: new Date(),
    version: '1.0'
  };
  
  // Calcular utilidad operativa
  estadoResultados.utilidad_operativa = estadoResultados.utilidad_bruta - estadoResultados.gastos_operativos.total_gastos_operativos;
  
  // Calcular utilidad antes de impuestos
  estadoResultados.utilidad_antes_impuestos = estadoResultados.utilidad_operativa + estadoResultados.otros_ingresos_gastos.total_otros;
  
  // Calcular impuestos (19% si hay utilidades)
  estadoResultados.impuestos = estadoResultados.utilidad_antes_impuestos > 0 ? 
    Math.round(estadoResultados.utilidad_antes_impuestos * 0.19) : 0;
  
  // Calcular utilidad neta
  estadoResultados.utilidad_neta = estadoResultados.utilidad_antes_impuestos - estadoResultados.impuestos;
  
  // Calcular ratios
  if (ventas.total > 0) {
    estadoResultados.ratios.margen_bruto = ((estadoResultados.utilidad_bruta / ventas.total) * 100).toFixed(2);
    estadoResultados.ratios.margen_operativo = ((estadoResultados.utilidad_operativa / ventas.total) * 100).toFixed(2);
    estadoResultados.ratios.margen_neto = ((estadoResultados.utilidad_neta / ventas.total) * 100).toFixed(2);
  }
  
  return estadoResultados;
}

module.exports = exports;