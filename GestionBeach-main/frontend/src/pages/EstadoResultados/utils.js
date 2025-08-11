// src/pages/EstadoResultados/utils.js - Versión Corregida

/**
 * Estructura base para el estado de resultados (solo estructura, sin datos falsos)
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
    compras: 0, // Datos reales de facturas XML
    mermaVenta: 0,
    totalCostos: 0
  },
  utilidadBruta: 0,
  gastosOperativos: {
    gastosVenta: {
      sueldos: 0, // Datos reales de remuneraciones
      fletes: 0,
      finiquitos: 0,
      mantenciones: 0,
      publicidad: 0,
      total: 0
    },
    gastosAdministrativos: {
      sueldos: 0, // Datos reales de remuneraciones
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
    totalRemuneraciones: 0,
    totalVentas: 0,
    numeroFacturas: 0,
    numeroVentas: 0
  }
};

/**
 * Datos de ejemplo SOLO para testing (marcar claramente como test)
 */
export const mockDataForTesting = {
  ...estructuraEstadoResultados,
  sucursal: "SUCURSAL TEST",
  periodo: "Período de Prueba",
  // NOTA: Estos son datos de prueba, NO usar en producción
  ingresos: {
    ventas: 0, // Se debe llenar con datos reales
    otrosIngresos: { fletes: 0, total: 0 },
    totalIngresos: 0
  }
};

/**
 * Función para generar datos iniciales limpios (solo estructura, sin datos inventados)
 * @returns {Object} Estructura limpia para el estado de resultados
 */
export const getInitialData = () => {
  return JSON.parse(JSON.stringify(estructuraEstadoResultados));
};

/**
 * Crear estado de resultados con datos reales del sistema
 * @param {Object} datosReales - Datos obtenidos del sistema
 * @returns {Object} Estado de resultados con datos reales
 */
export const crearEstadoResultadosConDatosReales = (datosReales) => {
  const estructura = getInitialData();
  
  // Datos de ventas (reales)
  if (datosReales.ventas) {
    estructura.ingresos.ventas = datosReales.ventas.total || 0;
    estructura.datosOriginales.totalVentas = datosReales.ventas.total || 0;
    estructura.datosOriginales.numeroVentas = datosReales.ventas.cantidad || 0;
  }
  
  // Datos de compras (reales desde facturas XML)
  if (datosReales.compras) {
    estructura.costos.compras = datosReales.compras.total || 0;
    estructura.datosOriginales.totalCompras = datosReales.compras.total || 0;
    estructura.datosOriginales.numeroFacturas = datosReales.compras.cantidad || 0;
  }
  
  // Datos de remuneraciones (reales)
  if (datosReales.remuneraciones) {
    const totalRemuneraciones = datosReales.remuneraciones.total || 0;
    estructura.datosOriginales.totalRemuneraciones = totalRemuneraciones;
    
    // Distribuir remuneraciones de forma conservadora
    // Solo si hay datos reales, sino dejar en 0
    if (totalRemuneraciones > 0) {
      // Distribución básica sin inventar porcentajes
      estructura.gastosOperativos.gastosVenta.sueldos = Math.round(totalRemuneraciones * 0.5); // 50% conservador
      estructura.gastosOperativos.gastosAdministrativos.sueldos = Math.round(totalRemuneraciones * 0.5); // 50% conservador
    }
  }
  
  // Solo estimar costo de ventas si hay ventas reales y no tenemos el dato exacto
  if (estructura.ingresos.ventas > 0 && !datosReales.costoVentasReal) {
    // NOTA: Esto es una estimación básica. Idealmente debería venir del sistema
    estructura.costos.costoVentas = 0; // Dejar en 0 hasta tener datos reales
  }
  
  return recalculateTotals(estructura);
};

/**
 * Recalcula todos los totales y valores derivados del estado de resultados
 * @param {Object} data - Datos del estado de resultados
 * @returns {Object} - Los mismos datos con los totales actualizados
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
 * @param {number} value - Valor a formatear
 * @returns {string} - Valor formateado como moneda chilena
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
 * @param {number} value - Valor a calcular
 * @param {number} total - Total de referencia
 * @param {number} decimals - Decimales a mostrar
 * @returns {number} - Porcentaje calculado
 */
export const calcularPorcentaje = (value, total, decimals = 1) => {
  if (!total || total === 0) return 0;
  return Number(((value / total) * 100).toFixed(decimals));
};

/**
 * Obtiene el rango de fechas para un mes específico
 * @param {Date} fechaSeleccionada - Fecha seleccionada
 * @returns {Object} - Objeto con fechaDesde y fechaHasta
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
 * @param {string} field - Nombre del campo
 * @returns {boolean} - True si el campo es generado por el sistema
 */
export const isSystemGeneratedField = (field) => {
  const systemFields = [
    'ventas', 
    'costoVentas', 
    'compras',
    'sueldos', 
    'seguros'
  ];
  
  return systemFields.includes(field);
};

/**
 * Valida los datos del estado de resultados
 * @param {Object} data - Datos a validar
 * @returns {Object} - Resultado de la validación
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
  
  return {
    esValido: errores.length === 0,
    errores,
    advertencias
  };
};

/**
 * Genera un resumen ejecutivo del estado de resultados (solo con datos reales)
 * @param {Object} data - Datos del estado de resultados
 * @returns {Object} - Resumen ejecutivo
 */
export const generarResumenEjecutivo = (data) => {
  if (!data) return null;
  
  const ventas = data.ingresos?.ventas || 0;
  const utilidadBruta = data.utilidadBruta || 0;
  const utilidadNeta = data.utilidadNeta || 0;
  const gastosOperativos = data.gastosOperativos?.totalGastosOperativos || 0;
  
  // Solo calcular ratios si hay datos válidos
  const ratios = {
    margenBruto: ventas > 0 ? calcularPorcentaje(utilidadBruta, ventas) : 0,
    margenNeto: ventas > 0 ? calcularPorcentaje(utilidadNeta, ventas) : 0,
    eficienciaOperativa: ventas > 0 ? calcularPorcentaje(gastosOperativos, ventas) : 0
  };
  
  // Clasificar rendimiento solo si hay datos
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
      ventasRegistradas: data.datosOriginales?.numeroVentas || 0
    }
  };
};

/**
 * Genera alertas basadas en los datos reales del estado de resultados
 * @param {Object} data - Datos del estado de resultados
 * @returns {Array} - Array de alertas
 */
export const generarAlertas = (data) => {
  const alertas = [];
  
  if (!data) return alertas;
  
  const ventas = data.ingresos?.ventas || 0;
  const utilidadBruta = data.utilidadBruta || 0;
  const utilidadNeta = data.utilidadNeta || 0;
  const gastosOperativos = data.gastosOperativos?.totalGastosOperativos || 0;
  
  // Solo generar alertas si hay datos para analizar
  if (ventas === 0) {
    alertas.push({
      tipo: 'info',
      mensaje: 'Sin datos de ventas',
      descripcion: 'No se han cargado datos de ventas para este período'
    });
    return alertas; // No tiene sentido seguir analizando sin ventas
  }
  
  // Alerta por utilidad negativa
  if (utilidadNeta < 0) {
    alertas.push({
      tipo: 'error',
      mensaje: 'Utilidad neta negativa',
      descripcion: 'La empresa está generando pérdidas en este período'
    });
  }
  
  // Alerta por margen bruto bajo (solo si hay datos suficientes)
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
  
  // Alerta por gastos operativos altos (solo si hay gastos registrados)
  if (gastosOperativos > 0 && ventas > 0) {
    const gastosVsVentas = calcularPorcentaje(gastosOperativos, ventas);
    if (gastosVsVentas > 50) {
      alertas.push({
        tipo: 'warning',
        mensaje: 'Gastos operativos elevados',
        descripcion: `Los gastos operativos representan el ${gastosVsVentas.toFixed(1)}% de las ventas`
      });
    }
  }
  
  // Alerta por falta de datos
  if (data.datosOriginales) {
    const { numeroFacturas, numeroVentas, totalCompras, totalRemuneraciones } = data.datosOriginales;
    
    if (numeroFacturas === 0 && totalCompras === 0) {
      alertas.push({
        tipo: 'info',
        mensaje: 'Sin datos de compras',
        descripcion: 'No se encontraron facturas procesadas para este período'
      });
    }
    
    if (totalRemuneraciones === 0) {
      alertas.push({
        tipo: 'info',
        mensaje: 'Sin datos de remuneraciones',
        descripcion: 'No se encontraron datos de remuneraciones para este período'
      });
    }
    
    if (numeroVentas === 0) {
      alertas.push({
        tipo: 'info',
        mensaje: 'Sin registros de ventas',
        descripcion: 'No se encontraron registros de ventas para este período'
      });
    }
  }
  
  return alertas;
};

/**
 * Compara dos estados de resultados
 * @param {Object} actual - Estado actual
 * @param {Object} anterior - Estado anterior
 * @returns {Object} - Comparación
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
 * Exporta los datos del estado de resultados a formato CSV (solo datos reales)
 * @param {Object} data - Datos del estado de resultados
 * @returns {string} - Contenido CSV
 */
export const exportarACSV = (data) => {
  if (!data) return '';
  
  const ventas = data.ingresos?.ventas || 0;
  
  if (ventas === 0) {
    return 'Concepto,Monto,Porcentaje\nSin datos disponibles,0,0';
  }
  
  const lineas = [
    'Concepto,Monto,Porcentaje',
    `Ventas,${ventas},100.0`
  ];
  
  // Solo agregar líneas con datos reales
  if (data.costos?.costoVentas > 0) {
    lineas.push(`Costo de Ventas,${data.costos.costoVentas},${calcularPorcentaje(data.costos.costoVentas, ventas)}`);
  }
  
  if (data.costos?.compras > 0) {
    lineas.push(`Compras del Período,${data.costos.compras},${calcularPorcentaje(data.costos.compras, ventas)}`);
  }
  
  if (data.utilidadBruta !== 0) {
    lineas.push(`Utilidad Bruta,${data.utilidadBruta},${calcularPorcentaje(data.utilidadBruta, ventas)}`);
  }
  
  if (data.gastosOperativos?.gastosVenta?.total > 0) {
    lineas.push(`Gastos de Venta,${data.gastosOperativos.gastosVenta.total},${calcularPorcentaje(data.gastosOperativos.gastosVenta.total, ventas)}`);
  }
  
  if (data.gastosOperativos?.gastosAdministrativos?.total > 0) {
    lineas.push(`Gastos Administrativos,${data.gastosOperativos.gastosAdministrativos.total},${calcularPorcentaje(data.gastosOperativos.gastosAdministrativos.total, ventas)}`);
  }
  
  if (data.utilidadOperativa !== 0) {
    lineas.push(`Utilidad Operativa,${data.utilidadOperativa},${calcularPorcentaje(data.utilidadOperativa, ventas)}`);
  }
  
  if (data.costoArriendo > 0) {
    lineas.push(`Costo Arriendo,${data.costoArriendo},${calcularPorcentaje(data.costoArriendo, ventas)}`);
  }
  
  if (data.otrosIngresosFinancieros > 0) {
    lineas.push(`Otros Ingresos Financieros,${data.otrosIngresosFinancieros},${calcularPorcentaje(data.otrosIngresosFinancieros, ventas)}`);
  }
  
  if (data.utilidadAntesImpuestos !== 0) {
    lineas.push(`Utilidad Antes de Impuestos,${data.utilidadAntesImpuestos},${calcularPorcentaje(data.utilidadAntesImpuestos, ventas)}`);
  }
  
  if (data.impuestos > 0) {
    lineas.push(`Impuestos,${data.impuestos},${calcularPorcentaje(data.impuestos, ventas)}`);
  }
  
  if (data.utilidadNeta !== 0) {
    lineas.push(`Utilidad Neta,${data.utilidadNeta},${calcularPorcentaje(data.utilidadNeta, ventas)}`);
  }
  
  return lineas.join('\n');
};

/**
 * Genera datos para gráficos (solo con datos reales disponibles)
 * @param {Object} data - Datos del estado de resultados
 * @returns {Object} - Datos para gráficos
 */
export const generarDatosGraficos = (data) => {
  if (!data) return null;
  
  const ventas = data.ingresos?.ventas || 0;
  
  // Solo generar gráficos si hay datos de ventas
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
    ].filter(item => item.valor > 0), // Solo incluir items con valores reales
    
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
    ].filter(item => item.disponible), // Solo ratios con datos disponibles
    
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
 * Formatea fecha para mostrar
 * @param {string|Date} fecha - Fecha a formatear
 * @returns {string} - Fecha formateada
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
 * Formatea fecha y hora para mostrar
 * @param {string|Date} fecha - Fecha a formatear
 * @returns {string} - Fecha y hora formateada
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
 * Constantes para el estado de resultados
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
 * Configuración de campos del estado de resultados
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
    'ventas', 'costoVentas', 'compras', 'sueldos', 'seguros'
  ],
  calculados: [
    'utilidadBruta', 'utilidadOperativa', 'utilidadAntesImpuestos',
    'impuestos', 'utilidadNeta', 'totalIngresos', 'totalCostos',
    'totalGastosOperativos'
  ]
};

/**
 * Validadores de campo mejorados
 */
export const validarCampo = (campo, valor) => {
  const errores = [];
  
  // Validar que sea un número
  if (isNaN(valor) || valor === null || valor === undefined) {
    errores.push(`${campo} debe ser un número válido`);
    return errores;
  }
  
  const numeroValor = Number(valor);
  
  // Validar que no sea negativo para ciertos campos
  const camposPositivos = ['ventas', 'costoVentas', 'compras'];
  if (camposPositivos.includes(campo) && numeroValor < 0) {
    errores.push(`${campo} no puede ser negativo`);
  }
  
  // Validar rangos lógicos
  if (campo === 'ventas' && numeroValor === 0) {
    errores.push('Las ventas no pueden ser cero para un período activo');
  }
  
  if (campo.includes('porcentaje') && (numeroValor < 0 || numeroValor > 100)) {
    errores.push(`${campo} debe estar entre 0 y 100`);
  }
  
  return errores;
};

/**
 * Utilities para debugging con datos reales
 */
export const debugEstadoResultados = (data) => {
  console.group('🔍 Debug Estado de Resultados - Datos Reales');
  
  if (!data) {
    console.warn('❌ No hay datos para analizar');
    console.groupEnd();
    return;
  }
  
  console.log('📊 Estructura de datos:', data);
  
  // Verificar datos originales
  if (data.datosOriginales) {
    console.log('📈 Datos del sistema:');
    console.log(`  - Facturas procesadas: ${data.datosOriginales.numeroFacturas}`);
    console.log(`  - Ventas registradas: ${data.datosOriginales.numeroVentas}`);
    console.log(`  - Total compras: ${formatCurrency(data.datosOriginales.totalCompras)}`);
    console.log(`  - Total remuneraciones: ${formatCurrency(data.datosOriginales.totalRemuneraciones)}`);
    console.log(`  - Total ventas: ${formatCurrency(data.datosOriginales.totalVentas)}`);
  }
  
  // Verificar montos principales
  console.log('💰 Montos principales:');
  console.log(`  - Ventas: ${formatCurrency(data.ingresos?.ventas || 0)}`);
  console.log(`  - Utilidad Bruta: ${formatCurrency(data.utilidadBruta || 0)}`);
  console.log(`  - Gastos Operativos: ${formatCurrency(data.gastosOperativos?.totalGastosOperativos || 0)}`);
  console.log(`  - Utilidad Neta: ${formatCurrency(data.utilidadNeta || 0)}`);
  
  // Validación
  const validacion = validarDatosEstadoResultados(data);
  console.log('📋 Validación:', validacion);
  
  // Alertas
  const alertas = generarAlertas(data);
  if (alertas.length > 0) {
    console.log('⚠️ Alertas:');
    alertas.forEach(alerta => {
      console.log(`  - ${alerta.tipo.toUpperCase()}: ${alerta.mensaje}`);
    });
  }
  
  // Resumen ejecutivo
  const resumen = generarResumenEjecutivo(data);
  if (resumen && resumen.hayDatos) {
    console.log('📊 Ratios financieros:');
    console.log(`  - Margen Bruto: ${resumen.rendimiento.margenBruto.valor.toFixed(1)}% (${resumen.rendimiento.margenBruto.clasificacion})`);
    console.log(`  - Margen Neto: ${resumen.rendimiento.margenNeto.valor.toFixed(1)}% (${resumen.rendimiento.margenNeto.clasificacion})`);
  } else {
    console.log('❌ Sin datos suficientes para calcular ratios');
  }
  
  console.groupEnd();
};

// Mantener compatibilidad con mockData pero marcar como deprecated
export const mockData = mockDataForTesting;

export default {
  estructuraEstadoResultados,
  mockDataForTesting,
  mockData, // deprecated
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
  compararEstadosResultados,
  exportarACSV,
  generarDatosGraficos,
  formatearFecha,
  formatearFechaHora,
  ESTADOS_DOCUMENTO,
  COLORES_ESTADO,
  TIPOS_GASTO,
  CAMPOS_CONFIGURACION,
  validarCampo,
  debugEstadoResultados
};