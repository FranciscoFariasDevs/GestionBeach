// src/pages/EstadoResultados/utils.js - COMPLETO CON COSTOS PATRONALES

/**
 * Estructura base para el estado de resultados
 */
export const estructuraEstadoResultados = {
  sucursal: "",
  periodo: "",
  ingresos: {
    ventas: 0,
    otrosIngresos: {
      fletes: 0,
      total: 0
    },
    totalIngresos: 0
  },
  costos: {
    costoVentas: 0,
    compras: 0,
    mermaVenta: 0,
    totalCostos: 0
  },
  utilidadBruta: 0,
  gastosOperativos: {
    gastosVenta: {
      sueldos: 0, // Incluye TOTAL_CARGO con costos patronales
      fletes: 0,
      finiquitos: 0,
      mantenciones: 0,
      publicidad: 0,
      total: 0
    },
    gastosAdministrativos: {
      sueldos: 0, // Incluye TOTAL_CARGO con costos patronales
      seguros: 0,
      gastosComunes: 0,
      electricidad: 0,
      agua: 0,
      telefonia: 0,
      alarma: 0,
      internet: 0,
      facturasNet: 0,
      transbank: 0,
      patenteMunicipal: 0,
      contribuciones: 0,
      petroleo: 0,
      otros: 0,
      total: 0
    },
    totalGastosOperativos: 0
  },
  utilidadOperativa: 0,
  costoArriendo: 0,
  otrosIngresosFinancieros: 0,
  utilidadAntesImpuestos: 0,
  impuestos: 0,
  utilidadNeta: 0,
  estado: "borrador",
  fechaCreacion: new Date().toISOString(),
  fechaModificacion: new Date().toISOString(),
  fechaEnvio: null,
  usuarioCreacion: null,
  usuarioModificacion: null,
  usuarioEnvio: null,
  datosOriginales: {
    totalCompras: 0,
    totalRemuneraciones: 0, // Ahora es TOTAL_CARGO
    totalVentas: 0,
    numeroFacturas: 0,
    numeroVentas: 0,
    numeroEmpleados: 0,
    detalleRemuneraciones: {
      total_liquidos: 0,
      total_descuentos: 0,
      total_pago: 0,
      total_caja_compensacion: 0,
      total_afc: 0,
      total_sis: 0,
      total_ach: 0,
      total_imposiciones_patronales: 0,
      total_cargo: 0
    }
  }
};

/**
 * Función para generar datos iniciales limpios
 */
export const getInitialData = () => {
  return JSON.parse(JSON.stringify(estructuraEstadoResultados));
};

/**
 * Crear estado de resultados con datos reales del sistema
 * INCLUYE CÁLCULO DE COSTOS PATRONALES
 */
export const crearEstadoResultadosConDatosReales = (datosReales) => {
  const estructura = getInitialData();
  
  // Datos de ventas
  if (datosReales.ventas) {
    estructura.ingresos.ventas = datosReales.ventas.total || 0;
    estructura.datosOriginales.totalVentas = datosReales.ventas.total || 0;
    estructura.datosOriginales.numeroVentas = datosReales.ventas.cantidad || 0;
  }
  
  // Datos de compras
  if (datosReales.compras) {
    estructura.costos.compras = datosReales.compras.total || 0;
    estructura.datosOriginales.totalCompras = datosReales.compras.total || 0;
    estructura.datosOriginales.numeroFacturas = datosReales.compras.cantidad || 0;
  }
  
  // Datos de remuneraciones CON COSTOS PATRONALES
  if (datosReales.remuneraciones && datosReales.remuneraciones.resumen) {
    const resumen = datosReales.remuneraciones.resumen;
    
    // USAR TOTAL_CARGO en lugar de solo líquidos
    const totalCargo = resumen.total_cargo || 0;
    estructura.datosOriginales.totalRemuneraciones = totalCargo;
    estructura.datosOriginales.numeroEmpleados = resumen.cantidad_empleados || 0;
    
    // Guardar detalle completo
    estructura.datosOriginales.detalleRemuneraciones = {
      total_liquidos: resumen.total_liquidos || 0,
      total_descuentos: resumen.total_descuentos || 0,
      total_pago: resumen.total_pago || 0,
      total_caja_compensacion: resumen.total_caja_compensacion || 0,
      total_afc: resumen.total_afc || 0,
      total_sis: resumen.total_sis || 0,
      total_ach: resumen.total_ach || 0,
      total_imposiciones_patronales: resumen.total_imposiciones_patronales || 0,
      total_cargo: resumen.total_cargo || 0
    };
    
    // Distribución del TOTAL_CARGO (50% ventas, 50% admin)
    if (totalCargo > 0) {
      estructura.gastosOperativos.gastosVenta.sueldos = Math.round(totalCargo * 0.5);
      estructura.gastosOperativos.gastosAdministrativos.sueldos = Math.round(totalCargo * 0.5);
    }
  }
  
  // Estimar costo de ventas si hay compras
  if (estructura.costos.compras > 0) {
    estructura.costos.costoVentas = estructura.costos.compras * 0.81;
  }
  
  return recalculateTotals(estructura);
};

/**
 * Recalcula todos los totales y valores derivados
 */
export const recalculateTotals = (data) => {
  const newData = { ...data };
  
  // Recalcular total de otros ingresos
  if (newData.ingresos.otrosIngresos) {
    newData.ingresos.otrosIngresos.total = newData.ingresos.otrosIngresos.fletes || 0;
    newData.ingresos.totalIngresos = newData.ingresos.ventas + newData.ingresos.otrosIngresos.total;
  }
  
  // Recalcular total de costos
  if (newData.costos) {
    newData.costos.totalCostos = (newData.costos.costoVentas || 0) + 
                                  (newData.costos.compras || 0) + 
                                  (newData.costos.mermaVenta || 0);
  }
  
  // Recalcular utilidad bruta
  newData.utilidadBruta = newData.ingresos.ventas - newData.costos.totalCostos;
  
  // Recalcular totales de gastos operativos
  const gastosVenta = newData.gastosOperativos.gastosVenta;
  gastosVenta.total = (gastosVenta.sueldos || 0) + 
                      (gastosVenta.fletes || 0) + 
                      (gastosVenta.finiquitos || 0) + 
                      (gastosVenta.mantenciones || 0) + 
                      (gastosVenta.publicidad || 0);
  
  const gastosAdmin = newData.gastosOperativos.gastosAdministrativos;
  gastosAdmin.total = (gastosAdmin.sueldos || 0) + 
                      (gastosAdmin.seguros || 0) + 
                      (gastosAdmin.gastosComunes || 0) + 
                      (gastosAdmin.electricidad || 0) + 
                      (gastosAdmin.agua || 0) + 
                      (gastosAdmin.telefonia || 0) + 
                      (gastosAdmin.alarma || 0) + 
                      (gastosAdmin.internet || 0) + 
                      (gastosAdmin.facturasNet || 0) + 
                      (gastosAdmin.transbank || 0) + 
                      (gastosAdmin.patenteMunicipal || 0) + 
                      (gastosAdmin.contribuciones || 0) + 
                      (gastosAdmin.petroleo || 0) + 
                      (gastosAdmin.otros || 0);
  
  newData.gastosOperativos.totalGastosOperativos = gastosVenta.total + gastosAdmin.total;
  
  // Recalcular utilidad operativa
  newData.utilidadOperativa = newData.utilidadBruta - 
                              newData.gastosOperativos.totalGastosOperativos + 
                              (newData.ingresos.otrosIngresos.total || 0);
  
  // Recalcular utilidad antes de impuestos
  newData.utilidadAntesImpuestos = newData.utilidadOperativa - 
                                   (newData.costoArriendo || 0) + 
                                   (newData.otrosIngresosFinancieros || 0);
  
  // Recalcular impuestos (19%)
  newData.impuestos = Math.max(0, Math.round(newData.utilidadAntesImpuestos * 0.19));
  
  // Recalcular utilidad neta
  newData.utilidadNeta = newData.utilidadAntesImpuestos - newData.impuestos;
  
  return newData;
};

/**
 * Formatea un valor como moneda chilena
 */
export const formatCurrency = (value) => {
  const numValue = Number(value) || 0;
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(numValue);
};

/**
 * Calcula el porcentaje de un valor respecto a otro
 */
export const calcularPorcentaje = (value, total, decimals = 1) => {
  if (!total || total === 0) return 0;
  return Number(((value / total) * 100).toFixed(decimals));
};

/**
 * Obtiene el rango de fechas para un mes específico
 */
export const obtenerRangoDeFechas = (fechaSeleccionada) => {
  const fecha = new Date(fechaSeleccionada);
  const año = fecha.getFullYear();
  const mes = fecha.getMonth();
  
  const fechaDesde = new Date(año, mes, 1);
  const fechaHasta = new Date(año, mes + 1, 0);
  
  return {
    fechaDesde: fechaDesde.toISOString().split('T')[0],
    fechaHasta: fechaHasta.toISOString().split('T')[0]
  };
};

/**
 * Verifica si un campo es generado por el sistema
 */
export const isSystemGeneratedField = (field) => {
  const systemFields = [
    'ventas', 
    'costoVentas', 
    'compras',
    'sueldos', // Ahora incluye costos patronales
    'seguros'
  ];
  
  return systemFields.includes(field);
};

/**
 * Valida los datos del estado de resultados
 */
export const validarDatosEstadoResultados = (data) => {
  const errores = [];
  const advertencias = [];
  
  if (!data) {
    errores.push('No hay datos para validar');
    return { esValido: false, errores, advertencias };
  }
  
  // Validar ventas
  if (!data.ingresos || !data.ingresos.ventas || data.ingresos.ventas <= 0) {
    errores.push('Las ventas deben ser mayores a cero');
  }
  
  // Validar coherencia de utilidades
  if (data.utilidadBruta < 0) {
    advertencias.push('La utilidad bruta es negativa');
  }
  
  if (data.utilidadNeta < 0) {
    advertencias.push('La utilidad neta es negativa');
  }
  
  // Validar porcentajes
  const margenBruto = calcularPorcentaje(data.utilidadBruta, data.ingresos.ventas);
  if (margenBruto < 5) {
    advertencias.push('El margen bruto es muy bajo (< 5%)');
  } else if (margenBruto > 80) {
    advertencias.push('El margen bruto es inusualmente alto (> 80%)');
  }
  
  const margenNeto = calcularPorcentaje(data.utilidadNeta, data.ingresos.ventas);
  if (margenNeto < 1) {
    advertencias.push('El margen neto es muy bajo (< 1%)');
  }
  
  // Validar gastos operativos
  const gastosVsVentas = calcularPorcentaje(data.gastosOperativos.totalGastosOperativos, data.ingresos.ventas);
  if (gastosVsVentas > 50) {
    advertencias.push('Los gastos operativos representan más del 50% de las ventas');
  }
  
  // Validar que existan porcentajes si hay remuneraciones
  if (data.datosOriginales?.detalleRemuneraciones?.total_cargo > 0) {
    if (!data.datosOriginales.detalleRemuneraciones.total_caja_compensacion && 
        !data.datosOriginales.detalleRemuneraciones.total_afc) {
      advertencias.push('No se detectaron costos patronales. Verifique que estén configurados los porcentajes.');
    }
  }
  
  return {
    esValido: errores.length === 0,
    errores,
    advertencias
  };
};

/**
 * Genera un resumen ejecutivo del estado de resultados
 */
export const generarResumenEjecutivo = (data) => {
  if (!data) return null;
  
  const ventas = data.ingresos?.ventas || 0;
  const utilidadBruta = data.utilidadBruta || 0;
  const utilidadNeta = data.utilidadNeta || 0;
  const gastosOperativos = data.gastosOperativos?.totalGastosOperativos || 0;
  
  const ratios = {
    margenBruto: ventas > 0 ? calcularPorcentaje(utilidadBruta, ventas) : 0,
    margenNeto: ventas > 0 ? calcularPorcentaje(utilidadNeta, ventas) : 0,
    eficienciaOperativa: ventas > 0 ? calcularPorcentaje(gastosOperativos, ventas) : 0
  };
  
  const clasificarRendimiento = (ratio, tipo) => {
    if (ratio === 0) return 'Sin datos';
    
    switch(tipo) {
      case 'margenBruto':
        if (ratio >= 40) return 'Excelente';
        if (ratio >= 30) return 'Muy Bueno';
        if (ratio >= 20) return 'Bueno';
        if (ratio >= 10) return 'Regular';
        return 'Crítico';
      
      case 'margenNeto':
        if (ratio >= 15) return 'Excelente';
        if (ratio >= 10) return 'Muy Bueno';
        if (ratio >= 5) return 'Bueno';
        if (ratio >= 2) return 'Regular';
        return 'Crítico';
      
      case 'eficienciaOperativa':
        if (ratio === 0) return 'Sin gastos registrados';
        if (ratio <= 20) return 'Excelente';
        if (ratio <= 30) return 'Muy Bueno';
        if (ratio <= 40) return 'Bueno';
        if (ratio <= 50) return 'Regular';
        return 'Crítico';
      
      default:
        return 'Sin clasificar';
    }
  };
  
  return {
    hayDatos: ventas > 0,
    rendimiento: {
      margenBruto: {
        valor: ratios.margenBruto,
        clasificacion: clasificarRendimiento(ratios.margenBruto, 'margenBruto')
      },
      margenNeto: {
        valor: ratios.margenNeto,
        clasificacion: clasificarRendimiento(ratios.margenNeto, 'margenNeto')
      },
      eficienciaOperativa: {
        valor: ratios.eficienciaOperativa,
        clasificacion: clasificarRendimiento(ratios.eficienciaOperativa, 'eficienciaOperativa')
      }
    },
    montos: {
      ventas: formatCurrency(ventas),
      utilidadBruta: formatCurrency(utilidadBruta),
      utilidadNeta: formatCurrency(utilidadNeta),
      gastosOperativos: formatCurrency(gastosOperativos)
    },
    alertas: generarAlertas(data),
    estadoDatos: {
      tieneVentas: ventas > 0,
      tieneCompras: (data.datosOriginales?.totalCompras || 0) > 0,
      tieneRemuneraciones: (data.datosOriginales?.totalRemuneraciones || 0) > 0,
      facturasProcesadas: data.datosOriginales?.numeroFacturas || 0,
      ventasRegistradas: data.datosOriginales?.numeroVentas || 0,
      empleados: data.datosOriginales?.numeroEmpleados || 0,
      tieneCostosPatronales: (data.datosOriginales?.detalleRemuneraciones?.total_cargo || 0) > 0
    }
  };
};

/**
 * Genera alertas basadas en los datos
 */
export const generarAlertas = (data) => {
  const alertas = [];
  
  if (!data) return alertas;
  
  const ventas = data.ingresos?.ventas || 0;
  const utilidadBruta = data.utilidadBruta || 0;
  const utilidadNeta = data.utilidadNeta || 0;
  const gastosOperativos = data.gastosOperativos?.totalGastosOperativos || 0;
  
  if (ventas === 0) {
    alertas.push({
      tipo: 'info',
      mensaje: 'Sin datos de ventas',
      descripcion: 'No se han cargado datos de ventas para este período'
    });
    return alertas;
  }
  
  if (utilidadNeta < 0) {
    alertas.push({
      tipo: 'error',
      mensaje: 'Utilidad neta negativa',
      descripcion: 'La empresa está generando pérdidas en este período'
    });
  }
  
  if (utilidadBruta !== 0 && ventas > 0) {
    const margenBruto = calcularPorcentaje(utilidadBruta, ventas);
    if (margenBruto < 10) {
      alertas.push({
        tipo: 'warning',
        mensaje: 'Margen bruto bajo',
        descripcion: `El margen bruto es de ${margenBruto.toFixed(1)}%`
      });
    }
  }
  
  if (gastosOperativos > 0 && ventas > 0) {
    const gastosVsVentas = calcularPorcentaje(gastosOperativos, ventas);
    if (gastosVsVentas > 50) {
      alertas.push({
        tipo: 'warning',
        mensaje: 'Gastos operativos elevados',
        descripcion: `Los gastos operativos (incluidos costos patronales) representan el ${gastosVsVentas.toFixed(1)}% de las ventas`
      });
    }
  }
  
  // Alertas específicas de costos patronales
  if (data.datosOriginales?.detalleRemuneraciones) {
    const detalle = data.datosOriginales.detalleRemuneraciones;
    
    if (detalle.total_cargo === 0 && detalle.total_liquidos > 0) {
      alertas.push({
        tipo: 'warning',
        mensaje: 'Falta configuración de porcentajes',
        descripcion: 'Hay remuneraciones pero no se calcularon costos patronales. Configure los porcentajes en el módulo de Remuneraciones.'
      });
    }
    
    if (detalle.total_cargo > 0) {
      const costoPatronal = detalle.total_cargo - detalle.total_pago;
      const porcentajeCostoPatronal = calcularPorcentaje(costoPatronal, detalle.total_pago);
      
      alertas.push({
        tipo: 'info',
        mensaje: 'Costos patronales calculados',
        descripcion: `Los costos patronales representan un ${porcentajeCostoPatronal.toFixed(1)}% adicional sobre el pago directo a empleados (${formatCurrency(costoPatronal)})`
      });
    }
  }
  
  return alertas;
};

/**
 * Exporta los datos a CSV
 */
export const exportarACSV = (data) => {
  if (!data) return '';
  
  const ventas = data.ingresos?.ventas || 0;
  
  if (ventas === 0) {
    return 'Concepto,Monto,Porcentaje\nSin datos disponibles,0,0';
  }
  
  const lineas = [
    'Concepto,Monto,Porcentaje',
    `Ventas,${ventas},100.0`,
    `Costo de Ventas,${data.costos.costoVentas},${calcularPorcentaje(data.costos.costoVentas, ventas)}`,
    `Utilidad Bruta,${data.utilidadBruta},${calcularPorcentaje(data.utilidadBruta, ventas)}`,
    `Gastos de Venta (incl. costos patronales),${data.gastosOperativos.gastosVenta.total},${calcularPorcentaje(data.gastosOperativos.gastosVenta.total, ventas)}`,
    `Gastos Administrativos (incl. costos patronales),${data.gastosOperativos.gastosAdministrativos.total},${calcularPorcentaje(data.gastosOperativos.gastosAdministrativos.total, ventas)}`,
    `Utilidad Operativa,${data.utilidadOperativa},${calcularPorcentaje(data.utilidadOperativa, ventas)}`,
    `Impuestos,${data.impuestos},${calcularPorcentaje(data.impuestos, ventas)}`,
    `Utilidad Neta,${data.utilidadNeta},${calcularPorcentaje(data.utilidadNeta, ventas)}`
  ];
  
  // Agregar detalle de costos patronales si está disponible
  if (data.datosOriginales?.detalleRemuneraciones?.total_cargo > 0) {
    const detalle = data.datosOriginales.detalleRemuneraciones;
    lineas.push('');
    lineas.push('DETALLE COSTOS PATRONALES');
    lineas.push(`Total Pago Directo,${detalle.total_pago},`);
    lineas.push(`Caja Compensación,${detalle.total_caja_compensacion},`);
    lineas.push(`AFC,${detalle.total_afc},`);
    lineas.push(`SIS,${detalle.total_sis},`);
    lineas.push(`ACH,${detalle.total_ach},`);
    lineas.push(`Imposiciones,${detalle.total_imposiciones_patronales},`);
    lineas.push(`TOTAL CARGO,${detalle.total_cargo},`);
  }
  
  return lineas.join('\n');
};

/**
 * Formatea fecha para mostrar
 */
export const formatearFecha = (fecha) => {
  if (!fecha) return '';
  
  const fechaObj = new Date(fecha);
  return fechaObj.toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Formatea fecha y hora
 */
export const formatearFechaHora = (fecha) => {
  if (!fecha) return '';
  
  const fechaObj = new Date(fecha);
  return fechaObj.toLocaleString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Constantes
 */
export const ESTADOS_DOCUMENTO = {
  BORRADOR: 'borrador',
  GUARDADO: 'guardado',
  ENVIADO: 'enviado'
};

export const COLORES_ESTADO = {
  [ESTADOS_DOCUMENTO.BORRADOR]: 'warning',
  [ESTADOS_DOCUMENTO.GUARDADO]: 'info',
  [ESTADOS_DOCUMENTO.ENVIADO]: 'success'
};

export const TIPOS_GASTO = {
  ADMINISTRATIVOS: 'administrativos',
  VENTA: 'venta',
  OTROS: 'otros'
};

/**
 * Configuración de campos
 */
export const CAMPOS_CONFIGURACION = {
  manuales: [
    'gastosComunes', 'electricidad', 'agua', 'telefonia', 'alarma',
    'internet', 'facturasNet', 'transbank', 'patenteMunicipal',
    'contribuciones', 'petroleo', 'otros', 'fletes', 'finiquitos',
    'mantenciones', 'publicidad', 'mermaVenta', 'costoArriendo',
    'otrosIngresosFinancieros'
  ],
  sistema: [
    'ventas', 'costoVentas', 'compras', 
    'sueldos' // Ahora incluye costos patronales automáticamente
  ],
  calculados: [
    'utilidadBruta', 'utilidadOperativa', 'utilidadAntesImpuestos',
    'impuestos', 'utilidadNeta', 'totalIngresos', 'totalCostos',
    'totalGastosOperativos'
  ]
};

/**
 * Debug para desarrollo
 */
export const debugEstadoResultados = (data) => {
  console.group('DEBUG Estado de Resultados con Costos Patronales');
  
  if (!data) {
    console.warn('No hay datos para analizar');
    console.groupEnd();
    return;
  }
  
  console.log('Estructura de datos:', data);
  
  if (data.datosOriginales?.detalleRemuneraciones) {
    console.log('Detalle de remuneraciones:');
    console.log('  - Total Pago:', formatCurrency(data.datosOriginales.detalleRemuneraciones.total_pago));
    console.log('  - Caja Compensación:', formatCurrency(data.datosOriginales.detalleRemuneraciones.total_caja_compensacion));
    console.log('  - AFC:', formatCurrency(data.datosOriginales.detalleRemuneraciones.total_afc));
    console.log('  - SIS:', formatCurrency(data.datosOriginales.detalleRemuneraciones.total_sis));
    console.log('  - ACH:', formatCurrency(data.datosOriginales.detalleRemuneraciones.total_ach));
    console.log('  - Imposiciones:', formatCurrency(data.datosOriginales.detalleRemuneraciones.total_imposiciones_patronales));
    console.log('  - TOTAL CARGO:', formatCurrency(data.datosOriginales.detalleRemuneraciones.total_cargo));
  }
  
  console.log('Montos principales:');
  console.log('  - Ventas:', formatCurrency(data.ingresos?.ventas || 0));
  console.log('  - Utilidad Bruta:', formatCurrency(data.utilidadBruta || 0));
  console.log('  - Gastos Operativos:', formatCurrency(data.gastosOperativos?.totalGastosOperativos || 0));
  console.log('  - Utilidad Neta:', formatCurrency(data.utilidadNeta || 0));
  
  const validacion = validarDatosEstadoResultados(data);
  console.log('Validación:', validacion);
  
  const alertas = generarAlertas(data);
  if (alertas.length > 0) {
    console.log('Alertas:');
    alertas.forEach(alerta => {
      console.log(`  - ${alerta.tipo.toUpperCase()}: ${alerta.mensaje}`);
    });
  }
  
  console.groupEnd();
};

export default {
  estructuraEstadoResultados,
  getInitialData,
  crearEstadoResultadosConDatosReales,
  recalculateTotals,
  formatCurrency,
  calcularPorcentaje,
  obtenerRangoDeFechas,
  isSystemGeneratedField,
  validarDatosEstadoResultados,
  generarResumenEjecutivo,
  generarAlertas,
  exportarACSV,
  formatearFecha,
  formatearFechaHora,
  ESTADOS_DOCUMENTO,
  COLORES_ESTADO,
  TIPOS_GASTO,
  CAMPOS_CONFIGURACION,
  debugEstadoResultados
};

/**
 * Compara dos estados de resultados
 */
export const compararEstadosResultados = (actual, anterior) => {
  if (!actual || !anterior) return null;
  
  const calcularVariacion = (valorActual, valorAnterior) => {
    if (!valorAnterior || valorAnterior === 0) return 0;
    return ((valorActual - valorAnterior) / valorAnterior) * 100;
  };
  
  return {
    ventas: {
      actual: actual.ingresos.ventas,
      anterior: anterior.ingresos.ventas,
      variacion: calcularVariacion(actual.ingresos.ventas, anterior.ingresos.ventas)
    },
    utilidadBruta: {
      actual: actual.utilidadBruta,
      anterior: anterior.utilidadBruta,
      variacion: calcularVariacion(actual.utilidadBruta, anterior.utilidadBruta)
    },
    utilidadNeta: {
      actual: actual.utilidadNeta,
      anterior: anterior.utilidadNeta,
      variacion: calcularVariacion(actual.utilidadNeta, anterior.utilidadNeta)
    },
    gastosOperativos: {
      actual: actual.gastosOperativos.totalGastosOperativos,
      anterior: anterior.gastosOperativos.totalGastosOperativos,
      variacion: calcularVariacion(actual.gastosOperativos.totalGastosOperativos, anterior.gastosOperativos.totalGastosOperativos)
    }
  };
};

/**
 * Genera datos para gráficos
 */
export const generarDatosGraficos = (data) => {
  if (!data) return null;
  
  const ventas = data.ingresos?.ventas || 0;
  
  if (ventas === 0) {
    return {
      distribucionGastos: [],
      evolucionUtilidad: [],
      ratiosFinancieros: [],
      sinDatos: true,
      mensaje: 'No hay datos suficientes para generar gráficos'
    };
  }
  
  return {
    distribucionGastos: [
      { 
        nombre: 'Costos', 
        valor: data.costos?.totalCostos || 0, 
        porcentaje: calcularPorcentaje(data.costos?.totalCostos || 0, ventas) 
      },
      { 
        nombre: 'Gastos Venta', 
        valor: data.gastosOperativos?.gastosVenta?.total || 0, 
        porcentaje: calcularPorcentaje(data.gastosOperativos?.gastosVenta?.total || 0, ventas) 
      },
      { 
        nombre: 'Gastos Admin', 
        valor: data.gastosOperativos?.gastosAdministrativos?.total || 0, 
        porcentaje: calcularPorcentaje(data.gastosOperativos?.gastosAdministrativos?.total || 0, ventas) 
      },
      { 
        nombre: 'Utilidad Neta', 
        valor: data.utilidadNeta || 0, 
        porcentaje: calcularPorcentaje(data.utilidadNeta || 0, ventas) 
      }
    ].filter(item => item.valor > 0),
    
    evolucionUtilidad: [
      { concepto: 'Ventas', valor: ventas },
      { concepto: 'Utilidad Bruta', valor: data.utilidadBruta || 0 },
      { concepto: 'Utilidad Operativa', valor: data.utilidadOperativa || 0 },
      { concepto: 'Utilidad Neta', valor: data.utilidadNeta || 0 }
    ],
    
    ratiosFinancieros: [
      { 
        ratio: 'Margen Bruto', 
        valor: calcularPorcentaje(data.utilidadBruta || 0, ventas),
        disponible: (data.utilidadBruta || 0) !== 0
      },
      { 
        ratio: 'Margen Operativo', 
        valor: calcularPorcentaje(data.utilidadOperativa || 0, ventas),
        disponible: (data.utilidadOperativa || 0) !== 0
      },
      { 
        ratio: 'Margen Neto', 
        valor: calcularPorcentaje(data.utilidadNeta || 0, ventas),
        disponible: (data.utilidadNeta || 0) !== 0
      }
    ].filter(item => item.disponible),
    
    sinDatos: false,
    resumenDatos: {
      totalElementos: Object.keys(data.datosOriginales || {}).length,
      facturasProcesadas: data.datosOriginales?.numeroFacturas || 0,
      ventasRegistradas: data.datosOriginales?.numeroVentas || 0,
      periodoConDatos: ventas > 0
    }
  };
};

/**
 * Validadores de campo
 */
export const validarCampo = (campo, valor) => {
  const errores = [];
  
  if (isNaN(valor) || valor === null || valor === undefined) {
    errores.push(`${campo} debe ser un número válido`);
    return errores;
  }
  
  const numeroValor = Number(valor);
  
  const camposPositivos = ['ventas', 'costoVentas', 'compras'];
  if (camposPositivos.includes(campo) && numeroValor < 0) {
    errores.push(`${campo} no puede ser negativo`);
  }
  
  if (campo === 'ventas' && numeroValor === 0) {
    errores.push('Las ventas no pueden ser cero para un período activo');
  }
  
  if (campo.includes('porcentaje') && (numeroValor < 0 || numeroValor > 100)) {
    errores.push(`${campo} debe estar entre 0 y 100`);
  }
  
  return errores;
};