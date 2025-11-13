// backend/controllers/empleadosController.js - VERSION COMPLETA CORREGIDA CON TODAS LAS FUNCIONES
const { sql, poolPromise } = require('../config/db');

// MAPEO DE SUCURSALES - MISMO QUE EN EL FRONTEND
const MAPEO_SUCURSALES = {
  'FERRETERIA BEACH MARKET': 'VICENTE PALACIOS 2908, TOME',
  'FERRETERIA COELEMU BEACH': 'TRES ESQUINAS S/N, COELEMU FE', 
  'FERRETERIA CHILLAN': 'RIO VIEJO 999, CHILLAN',
  'FERRETERIA COELEMU': 'TRES ESQUINAS S/N, COELEMU FE',
  'FERRETERIA TOME CENTRO': 'LAS CAMELIAS 39, TOME',
  'MULTITIENDA TOME BEACH': 'VICENTE PALACIOS 3088, TOME',
  'FERRETERIA QUIRIHUE': 'RUTA EL CONQUISTADOR 1002, QUIRIHUE',
  'SUPER COELEMU': 'TRES ESQUINAS S/N, COELEMU MU',
  'SUPER ENRIQUE MOLINA': 'ENRIQUE MOLINA 596, TOME',
  'SUPER LORD COCHRANE': 'LORD COCHRANE 1127,TOME',
  'FERRETERIA DICHATO': 'DANIEL VERA 876, DICHATO',
  'MINIMARKET': 'DANIEL VERA 890, DICHATO',
  'PANADERIA': 'DANIEL VERA 891, DICHATO',
  'RANGUELMO': 'LOS CIPRESES 77, RANGUELMO'
};

// Función para mapear sucursal
const mapearSucursal = (nombreExcel) => {
  if (!nombreExcel) return null;
  
  const nombreLimpio = String(nombreExcel).trim().toUpperCase();
  
  // Buscar coincidencia exacta
  for (const [nombreOriginal, nombreMapeado] of Object.entries(MAPEO_SUCURSALES)) {
    if (nombreLimpio === nombreOriginal.toUpperCase()) {
      return nombreMapeado;
    }
  }
  
  // Buscar coincidencia parcial
  for (const [nombreOriginal, nombreMapeado] of Object.entries(MAPEO_SUCURSALES)) {
    if (nombreLimpio.includes(nombreOriginal.toUpperCase()) || 
        nombreOriginal.toUpperCase().includes(nombreLimpio)) {
      return nombreMapeado;
    }
  }
  
  return nombreExcel;
};

// Función para encontrar sucursal por nombre
const encontrarSucursalPorNombre = async (pool, nombreSucursal) => {
  if (!nombreSucursal) return null;
  
  try {
    // Primero buscar coincidencia exacta
    const resultadoExacto = await pool.request()
      .input('nombre', sql.VarChar, nombreSucursal)
      .query(`
        SELECT id, nombre FROM sucursales 
        WHERE nombre = @nombre
      `);
    
    if (resultadoExacto.recordset.length > 0) {
      return resultadoExacto.recordset[0];
    }
    
    // Buscar coincidencia parcial
    const resultadoParcial = await pool.request()
      .input('nombre', sql.VarChar, `%${nombreSucursal}%`)
      .query(`
        SELECT id, nombre FROM sucursales 
        WHERE nombre LIKE @nombre
      `);
    
    if (resultadoParcial.recordset.length > 0) {
      return resultadoParcial.recordset[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error buscando sucursal:', error);
    return null;
  }
};

// Función auxiliar para limpiar RUT
function limpiarRUT(rut) {
  if (!rut) return null;
  
  let rutLimpio = String(rut)
    .replace(/[.\-\s]/g, '')
    .toUpperCase()
    .trim();
  
  if (rutLimpio.length < 8) return null;
  
  if (!/^\d{7,8}[0-9K]$/.test(rutLimpio)) return null;
  
  return rutLimpio;
}

// ✅ FUNCIÓN: Obtener todos los empleados - ACTUALIZADA PARA BD REAL
exports.getEmpleados = async (req, res) => {
  try {
    console.log('📊 === INICIANDO getEmpleados ===');
    
    const pool = await poolPromise;
    const showInactive = req.query.showInactive === 'true';
    
    console.log('📊 getEmpleados - showInactive:', showInactive);
    
    // ✅ DETECTAR ESTRUCTURA DE TABLA EMPLEADOS
    console.log('📊 Detectando estructura de tabla empleados...');
    
    const empleadosFields = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'empleados'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('📋 Campos de empleados:', empleadosFields.recordset.map(f => f.COLUMN_NAME));
    
    // ✅ QUERY PRINCIPAL CON CAMPOS REALES DE LA BD
    let query = `
      SELECT 
        e.id,
        e.rut,
        e.nombre
    `;
    
    // Agregar campos según existan en la tabla real (según tu estructura)
    const camposEsperados = [
      'codigo', 'apellido', 'apellido_paterno', 'apellido_materno', 'fecha_nacimiento', 'sexo',
      'estado_civil', 'nacionalidad', 'direccion', 'telefono', 'email', 'correo_electronico',
      'persona_discapacidad', 'discapacidad', 'fecha_ingreso', 'fecha_termino', 'estado_contrato',
      'tipo_contrato', 'cod_departamento', 'desc_departamento', 'cargo', 
      'establecimiento', 'tipo_jornada', 'horas_semanales_pactadas', 'afecto_ajuste',
      'sueldo_base', 'afecto_benef_semana_corrida', 'dia_inicio_periodo',
      'dias_trabajados_semana', 'dia_inicio_semana', 'dia_descanso_convencional',
      'tipo_sueldo_base', 'valor_sueldo_base', 'comision_porcentaje',
      'valor_hora', 'cantidad_horas', 'valor_dia', 'cantidad_dias',
      'asig_zona_extrema', 'gratificacion_legal', 'porcentaje_gratif',
      'prevision', 'cotiz_especial', 'porcentaje_cotiz', 'tramo_asig_familiar',
      'es_jubilado', 'cargas_normales', 'cargas_maternales', 'cargas_invalidas',
      'seguro_cesantia', 'afecto_seguro_accidentes', 'isapre', 'tipo_pacto_isapre',
      'monto_pactado', 'moneda', 'monto_ges', 'monto_ges_n', 'cuenta_par',
      'institucion_par', 'moneda_par', 'aporte_apvi_1', 'monto_aporte_apvi_1',
      'regimen_apvi_1', 'forma_apvi_1', 'institucion_apvi_1', 'inicio_apvi_1',
      'moneda_apvi_1', 'aporte_apvi_2', 'monto_aporte_apvi_2', 'regimen_apvi_2',
      'forma_apvi_2', 'institucion_apvi_2', 'inicio_apvi_2', 'moneda_apvi_2',
      'aporte_apvc', 'monto_aporte_apvc', 'regimen_apvc', 'forma_apvc',
      'institucion_apvc', 'inicio_apvc', 'rut_afil_vol', 'nombre_afil_vol',
      'apellido_paterno_afil_vol', 'apellido_materno_afil_vol', 'afp_afil_vol',
      'cotiz_afil_vol', 'inicio_afil_vol', 'activo', 'created_at', 'updated_at',
      'id_razon_social', 'id_tipo_jornada', 'id_establecimiento', 'id_tipo_contrato',
      'id_estado_contrato', 'id_estado_civil'
    ];
    
    const camposExistentes = empleadosFields.recordset.map(f => f.COLUMN_NAME);
    
    camposEsperados.forEach(campo => {
      if (camposExistentes.includes(campo)) {
        query += `,\n        e.${campo}`;
      }
    });
    
    query += `\n      FROM empleados e`;
    
    // ✅ FILTRAR SOLO ACTIVOS SI NO SE SOLICITAN INACTIVOS
    if (!showInactive && camposExistentes.includes('activo')) {
      query += ' WHERE e.activo = 1';
      console.log('📋 Filtrando solo empleados activos');
    } else {
      console.log('📋 Mostrando todos los empleados');
    }
    
    query += ' ORDER BY e.nombre';
    if (camposExistentes.includes('apellido')) {
      query += ', e.apellido';
    } else if (camposExistentes.includes('apellido_paterno')) {
      query += ', e.apellido_paterno';
    }
    
    console.log('📊 Query SQL:', query);
    
    // ✅ EJECUTAR QUERY PRINCIPAL
    const result = await pool.request().query(query);
    console.log('📊 Empleados encontrados:', result.recordset.length);
    
    let empleadosConRelaciones = [...result.recordset];
    
    // ✅ CARGAR DATOS RELACIONADOS (SUCURSALES)
    try {
      console.log('🏢 Detectando tabla de sucursales...');
      
      const tablasSucursales = await pool.request().query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'sucursales'
      `);
      
      let sucursales = [];
      
      if (tablasSucursales.recordset.length > 0) {
        console.log('🏢 Tabla sucursales encontrada');
        
        const sucursalesFields = await pool.request().query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'sucursales'
        `);
        
        const camposSucursales = sucursalesFields.recordset.map(f => f.COLUMN_NAME);
        console.log('🏢 Campos de sucursales:', camposSucursales);
        
        let querySucursales = `SELECT id, nombre`;
        if (camposSucursales.includes('ip')) {
          querySucursales += `, ip`;
        }
        if (camposSucursales.includes('base_datos')) {
          querySucursales += `, base_datos`;
        }
        if (camposSucursales.includes('usuario')) {
          querySucursales += `, usuario`;
        }
        if (camposSucursales.includes('tipo_sucursal')) {
          querySucursales += `, tipo_sucursal`;
        }
        querySucursales += ` FROM sucursales`;
        
        const sucursalesResult = await pool.request().query(querySucursales);
        sucursales = sucursalesResult.recordset;
        console.log('✅ Sucursales cargadas:', sucursales.length);
      }
      
      // ✅ CARGAR EMPLEADOS_SUCURSALES (relación múltiple)
      let empleadosSucursales = [];
      try {
        const empleadosSucursalesResult = await pool.request().query(`
          SELECT es.id_empleado, es.id_sucursal, s.nombre as sucursal_nombre
          FROM empleados_sucursales es
          INNER JOIN sucursales s ON es.id_sucursal = s.id
          WHERE es.activo = 1
        `);
        empleadosSucursales = empleadosSucursalesResult.recordset;
        console.log('✅ Relaciones empleados-sucursales cargadas:', empleadosSucursales.length);
      } catch (error) {
        console.log('⚠️ Tabla empleados_sucursales no encontrada o sin datos');
      }
      
      // ✅ COMBINAR DATOS CON VALIDACIONES PARA BD REAL
      empleadosConRelaciones = result.recordset.map(empleado => {
        let empleadoCompleto = { ...empleado };
        
        // Crear nombre completo combinando apellidos si no existe el campo apellido
        if (!empleado.apellido && (empleado.apellido_paterno || empleado.apellido_materno)) {
          empleadoCompleto.apellido = [empleado.apellido_paterno, empleado.apellido_materno]
            .filter(Boolean).join(' ');
        }
        
        // Mapear email/correo_electronico para compatibilidad con frontend
        if (empleado.email && !empleado.correo_electronico) {
          empleadoCompleto.correo_electronico = empleado.email;
        } else if (!empleado.email && empleado.correo_electronico) {
          empleadoCompleto.email = empleado.correo_electronico;
        }
        
        // Mapear discapacidad/persona_discapacidad para compatibilidad con frontend
        if (empleado.persona_discapacidad !== undefined && empleado.discapacidad === undefined) {
          empleadoCompleto.discapacidad = empleado.persona_discapacidad;
        } else if (empleado.discapacidad !== undefined && empleado.persona_discapacidad === undefined) {
          empleadoCompleto.persona_discapacidad = empleado.discapacidad;
        }
        
        // 🆕 MANEJO MEJORADO DE SUCURSALES (múltiples)
        const sucursalesEmpleado = empleadosSucursales.filter(es => es.id_empleado === empleado.id);
        if (sucursalesEmpleado.length > 0) {
          empleadoCompleto.sucursales = sucursalesEmpleado.map(es => ({
            id: es.id_sucursal,
            nombre: es.sucursal_nombre
          }));
          empleadoCompleto.sucursal_nombre = sucursalesEmpleado[0].sucursal_nombre;
          empleadoCompleto.id_sucursal_principal = sucursalesEmpleado[0].id_sucursal;
        } else {
          // Fallback: buscar en campo establecimiento directo si existe
          if (empleado.establecimiento && sucursales.length > 0) {
            const sucursal = sucursales.find(s => 
              s.nombre === empleado.establecimiento || 
              s.nombre.includes(empleado.establecimiento) ||
              empleado.establecimiento.includes(s.nombre)
            );
            empleadoCompleto.sucursal_nombre = sucursal ? sucursal.nombre : empleado.establecimiento;
            empleadoCompleto.sucursales = sucursal ? [{ id: sucursal.id, nombre: sucursal.nombre }] : [];
          } else {
            empleadoCompleto.sucursal_nombre = empleado.establecimiento || 'Sin sucursal';
            empleadoCompleto.sucursales = [];
          }
        }
        
        return empleadoCompleto;
      });
      
    } catch (relacionError) {
      console.error('⚠️ Error al cargar datos relacionados:', relacionError.message);
      
      empleadosConRelaciones = result.recordset.map(empleado => ({
        ...empleado,
        apellido: empleado.apellido || [empleado.apellido_paterno, empleado.apellido_materno].filter(Boolean).join(' '),
        correo_electronico: empleado.correo_electronico || empleado.email,
        email: empleado.email || empleado.correo_electronico,
        discapacidad: empleado.discapacidad !== undefined ? empleado.discapacidad : empleado.persona_discapacidad,
        persona_discapacidad: empleado.persona_discapacidad !== undefined ? empleado.persona_discapacidad : empleado.discapacidad,
        sucursal_nombre: empleado.establecimiento || 'Sin sucursal',
        sucursales: []
      }));
    }
    
    console.log('✅ getEmpleados completado exitosamente');
    return res.json({ 
      success: true, 
      empleados: empleadosConRelaciones,
      debug: {
        total_empleados: empleadosConRelaciones.length,
        showInactive: showInactive,
        campos_detectados: empleadosFields.recordset.map(f => f.COLUMN_NAME)
      }
    });
    
  } catch (error) {
    console.error('❌ ERROR COMPLETO en getEmpleados:');
    console.error('❌ Message:', error.message);
    console.error('❌ Stack:', error.stack);
    
    return res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor al obtener empleados',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack,
        sqlState: error.state,
        sqlNumber: error.number
      } : 'Error interno del servidor'
    });
  }
};

// ✅ FUNCIÓN: Obtener un empleado por ID - ACTUALIZADA
exports.getEmpleadoById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de empleado debe ser un número válido' 
      });
    }
    
    const pool = await poolPromise;
    
    // Obtener datos básicos del empleado con todos los campos
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM empleados WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Empleado no encontrado' 
      });
    }
    
    let empleado = result.recordset[0];
    
    // Crear campos de compatibilidad
    if (!empleado.apellido && (empleado.apellido_paterno || empleado.apellido_materno)) {
      empleado.apellido = [empleado.apellido_paterno, empleado.apellido_materno]
        .filter(Boolean).join(' ');
    }
    
    if (empleado.email && !empleado.correo_electronico) {
      empleado.correo_electronico = empleado.email;
    } else if (!empleado.email && empleado.correo_electronico) {
      empleado.email = empleado.correo_electronico;
    }
    
    if (empleado.persona_discapacidad !== undefined && empleado.discapacidad === undefined) {
      empleado.discapacidad = empleado.persona_discapacidad;
    } else if (empleado.discapacidad !== undefined && empleado.persona_discapacidad === undefined) {
      empleado.persona_discapacidad = empleado.discapacidad;
    }
    
    try {
      // 🆕 CARGAR SUCURSALES MÚLTIPLES
      try {
        const sucursalesResult = await pool.request()
          .input('id_empleado', sql.Int, id)
          .query(`
            SELECT s.id, s.nombre
            FROM empleados_sucursales es
            INNER JOIN sucursales s ON es.id_sucursal = s.id
            WHERE es.id_empleado = @id_empleado AND es.activo = 1
          `);
        
        empleado.sucursales = sucursalesResult.recordset;
      } catch (sucError) {
        empleado.sucursales = [];
      }
      
    } catch (relacionError) {
      console.warn('⚠️ Error al cargar datos relacionados para empleado:', relacionError.message);
    }
    
    console.log('✅ Empleado obtenido correctamente:', empleado.id);
    return res.json({ success: true, empleado: empleado });
    
  } catch (error) {
    console.error('❌ Error al obtener empleado:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// ✅ FUNCIÓN CORREGIDA: Crear un nuevo empleado - CON MAPEO SUELDO_BASE CORREGIDO
exports.createEmpleado = async (req, res) => {
  try {
    console.log('🔨 === CREANDO NUEVO EMPLEADO ===');
    console.log('🔨 Datos recibidos:', JSON.stringify(req.body, null, 2));
    
    const datosRecibidos = req.body;
    
    // Validar datos requeridos SEGÚN TU BD
    if (!datosRecibidos.rut || !datosRecibidos.nombre) {
      return res.status(400).json({ 
        success: false, 
        message: 'Datos incompletos. RUT y nombre son obligatorios' 
      });
    }
    
    // 🆕 VALIDACIÓN MEJORADA DE RUT
    const rutLimpio = limpiarRUT(datosRecibidos.rut);
    if (!rutLimpio || rutLimpio.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'RUT inválido. Debe tener al menos 8 caracteres'
      });
    }
    
    const pool = await poolPromise;
    
    // Verificar si ya existe un empleado con el mismo rut
    const checkResult = await pool.request()
      .input('rut', sql.VarChar, rutLimpio)
      .query('SELECT COUNT(*) as count FROM empleados WHERE rut = @rut');
    
    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ya existe un empleado con este RUT' 
      });
    }
    
    // Detectar campos existentes en la tabla
    const empleadosFields = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'empleados'
    `);
    
    const camposExistentes = empleadosFields.recordset.map(f => f.COLUMN_NAME);
    console.log('📋 Campos disponibles en BD:', camposExistentes);
    
    // ✅ CREAR EMPLEADO CON TODOS LOS CAMPOS REALES
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      // 🔥 SOLUCIÓN AL PROBLEMA: CONSTRUIR APELLIDO OBLIGATORIO
      let apellidoCompleto = '';
      
      // Si viene apellido como campo único desde frontend
      if (datosRecibidos.apellido) {
        apellidoCompleto = datosRecibidos.apellido;
        const apellidos = datosRecibidos.apellido.split(' ');
        datosRecibidos.apellido_paterno = apellidos[0] || '';
        datosRecibidos.apellido_materno = apellidos.slice(1).join(' ') || '';
      } 
      // Si vienen apellidos separados desde Excel
      else if (datosRecibidos.apellido_paterno || datosRecibidos.apellido_materno) {
        apellidoCompleto = [datosRecibidos.apellido_paterno, datosRecibidos.apellido_materno]
          .filter(Boolean).join(' ');
      }
      
      // Si no hay apellido completo, usar solo apellido_paterno
      if (!apellidoCompleto && datosRecibidos.apellido_paterno) {
        apellidoCompleto = datosRecibidos.apellido_paterno;
      }
      
      // Si aún no hay apellido, es obligatorio
      if (!apellidoCompleto) {
        return res.status(400).json({
          success: false,
          message: 'Apellido es obligatorio'
        });
      }
      
      // Preparar fechas
      const now = new Date();
      let fechaNacimiento = null;
      let fechaIngreso = null;
      let fechaTermino = null;
      
      if (datosRecibidos.fecha_nacimiento) {
        fechaNacimiento = new Date(datosRecibidos.fecha_nacimiento);
        if (isNaN(fechaNacimiento.getTime())) {
          fechaNacimiento = null;
        }
      }
      
      if (datosRecibidos.fecha_ingreso) {
        fechaIngreso = new Date(datosRecibidos.fecha_ingreso);
        if (isNaN(fechaIngreso.getTime())) {
          fechaIngreso = new Date();
        }
      } else {
        fechaIngreso = new Date();
      }
      
      if (datosRecibidos.fecha_termino) {
        fechaTermino = new Date(datosRecibidos.fecha_termino);
        if (isNaN(fechaTermino.getTime())) {
          fechaTermino = null;
        }
      }
      
      // 🔥 FUNCIONES MEJORADAS PARA CONVERSIÓN NUMÉRICA
      const parseNumeric = (value) => {
        if (value === undefined || value === null || value === '') return null;
        if (typeof value === 'number') return value;
        
        // Limpiar el valor de caracteres no numéricos excepto punto y coma
        const cleanValue = String(value).replace(/[^\d.,\-]/g, '');
        if (cleanValue === '' || cleanValue === '-') return null;
        
        // Reemplazar coma por punto para conversión decimal
        const normalizedValue = cleanValue.replace(',', '.');
        const parsed = parseFloat(normalizedValue);
        return isNaN(parsed) ? null : parsed;
      };
      
      const parseInteger = (value) => {
        if (value === undefined || value === null || value === '') return null;
        if (typeof value === 'number') return Math.floor(value);
        
        const cleanValue = String(value).replace(/[^\d\-]/g, '');
        if (cleanValue === '' || cleanValue === '-') return null;
        
        const parsed = parseInt(cleanValue, 10);
        return isNaN(parsed) ? null : parsed;
      };
      
      // Construir query dinámicamente según campos existentes
      let campos = ['rut', 'nombre'];
      let valores = ['@rut', '@nombre'];
      
      // SIEMPRE agregar apellido ya que es obligatorio en tu BD
      if (camposExistentes.includes('apellido')) {
        campos.push('apellido');
        valores.push('@apellido');
      }
      
      // Mapeo COMPLETO para los campos de tu BD real
      const mapeoCompleto = {
        // Campos básicos - compatibilidad frontend
        'codigo_empleado': 'codigo',
        'correo_electronico': 'correo_electronico',
        'discapacidad': 'discapacidad',
        
        // Campos directos que coinciden
        'codigo': 'codigo',
        'apellido_paterno': 'apellido_paterno',
        'apellido_materno': 'apellido_materno',
        'fecha_nacimiento': 'fecha_nacimiento',
        'sexo': 'sexo',
        'estado_civil': 'estado_civil',
        'nacionalidad': 'nacionalidad',
        'direccion': 'direccion',
        'telefono': 'telefono',
        'email': 'email',
        'correo_electronico': 'correo_electronico',
        'persona_discapacidad': 'persona_discapacidad',
        'discapacidad': 'discapacidad',
        'fecha_ingreso': 'fecha_ingreso',
        'fecha_termino': 'fecha_termino',
        'estado_contrato': 'estado_contrato',
        'tipo_contrato': 'tipo_contrato',
        'cod_departamento': 'cod_departamento',
        'desc_departamento': 'desc_departamento',
        'cargo': 'cargo',
        'establecimiento': 'establecimiento',
        'tipo_jornada': 'tipo_jornada',
        'horas_semanales_pactadas': 'horas_semanales_pactadas',
        'afecto_ajuste': 'afecto_ajuste',
        'sueldo_base': 'sueldo_base', // 🔥 MAPEO DIRECTO SUELDO BASE
        'afecto_benef_semana_corrida': 'afecto_benef_semana_corrida',
        'dia_inicio_periodo': 'dia_inicio_periodo',
        'dias_trabajados_semana': 'dias_trabajados_semana',
        'dia_inicio_semana': 'dia_inicio_semana',
        'dia_descanso_convencional': 'dia_descanso_convencional',
        'tipo_sueldo_base': 'tipo_sueldo_base',
        'valor_sueldo_base': 'valor_sueldo_base',
        'comision_porcentaje': 'comision_porcentaje',
        'valor_hora': 'valor_hora',
        'cantidad_horas': 'cantidad_horas',
        'valor_dia': 'valor_dia',
        'cantidad_dias': 'cantidad_dias',
        'asig_zona_extrema': 'asig_zona_extrema',
        'gratificacion_legal': 'gratificacion_legal',
        'porcentaje_gratif': 'porcentaje_gratif',
        'prevision': 'prevision',
        'cotiz_especial': 'cotiz_especial',
        'porcentaje_cotiz': 'porcentaje_cotiz',
        'tramo_asig_familiar': 'tramo_asig_familiar',
        'es_jubilado': 'es_jubilado',
        'cargas_normales': 'cargas_normales',
        'cargas_maternales': 'cargas_maternales',
        'cargas_invalidas': 'cargas_invalidas',
        'seguro_cesantia': 'seguro_cesantia',
        'afecto_seguro_accidentes': 'afecto_seguro_accidentes',
        'isapre': 'isapre',
        'tipo_pacto_isapre': 'tipo_pacto_isapre',
        'monto_pactado': 'monto_pactado',
        'moneda': 'moneda',
        'monto_ges': 'monto_ges',
        'monto_ges_n': 'monto_ges_n',
        'cuenta_par': 'cuenta_par',
        'institucion_par': 'institucion_par',
        'moneda_par': 'moneda_par',
        'activo': 'activo',
        'id_razon_social': 'id_razon_social',
        'id_tipo_jornada': 'id_tipo_jornada',
        'id_establecimiento': 'id_establecimiento',
        'id_tipo_contrato': 'id_tipo_contrato',
        'id_estado_contrato': 'id_estado_contrato',
        'id_estado_civil': 'id_estado_civil'
      };
      
      // Preparar request con todos los parámetros
      const request = transaction.request()
        .input('rut', sql.VarChar, rutLimpio)
        .input('nombre', sql.VarChar, datosRecibidos.nombre);
      
      // AGREGAR APELLIDO OBLIGATORIO
      if (camposExistentes.includes('apellido')) {
        request.input('apellido', sql.VarChar, apellidoCompleto);
      }
      
      // Mapear establecimiento usando la tabla de mapeo
      if (datosRecibidos.establecimiento) {
        const establecimientoMapeado = mapearSucursal(datosRecibidos.establecimiento);
        datosRecibidos.establecimiento = establecimientoMapeado;
      }
      
      // 🔥 LOGGING ESPECÍFICO PARA SUELDO_BASE
      if (datosRecibidos.sueldo_base !== undefined) {
        console.log('💰 SUELDO_BASE detectado:');
        console.log('💰 Valor original:', datosRecibidos.sueldo_base, '(tipo:', typeof datosRecibidos.sueldo_base, ')');
        const sueldoParsed = parseNumeric(datosRecibidos.sueldo_base);
        console.log('💰 Valor parseado:', sueldoParsed);
        console.log('💰 Campo existe en BD:', camposExistentes.includes('sueldo_base'));
      }
      
      // 🔥 VALIDACIÓN MEJORADA PARA INCLUIR VALORES 0
      const esValorValido = (val) => {
        if (val === null || val === undefined) return false;
        if (val === '') return false;
        if (typeof val === 'number' && val === 0) return true; // 🔥 PERMITIR 0
        return true;
      };
      
      // Agregar campos dinámicamente
      Object.entries(datosRecibidos).forEach(([campo, valor]) => {
        const campoBD = mapeoCompleto[campo] || campo;
        
        if (camposExistentes.includes(campoBD) && 
            esValorValido(valor) && // 🔥 NUEVA VALIDACIÓN
            campo !== 'rut' && campo !== 'nombre' && campo !== 'sucursales_ids' &&
            campoBD !== 'apellido') { // Apellido ya se agregó arriba
          
          campos.push(campoBD);
          valores.push(`@${campoBD}`);
          
          console.log(`🔧 Procesando campo: ${campo} -> ${campoBD}, valor: ${valor}`);
          
          // 🔥 MANEJO ESPECÍFICO PARA SUELDO_BASE
          if (campoBD === 'sueldo_base') {
            const sueldoValor = parseNumeric(valor);
            console.log(`💰 Asignando sueldo_base: ${sueldoValor}`);
            request.input(campoBD, sql.Decimal(18, 2), sueldoValor);
          }
          // Asignar valor según el tipo de campo
          else if (campoBD.includes('fecha') && valor) {
            if (campoBD === 'fecha_nacimiento') {
              request.input(campoBD, sql.Date, fechaNacimiento);
            } else if (campoBD === 'fecha_ingreso') {
              request.input(campoBD, sql.Date, fechaIngreso);
            } else if (campoBD === 'fecha_termino') {
              request.input(campoBD, sql.Date, fechaTermino);
            } else {
              request.input(campoBD, sql.Date, new Date(valor));
            }
          } else if (campoBD === 'persona_discapacidad' || campoBD === 'discapacidad' || 
                     campoBD === 'es_jubilado' || campoBD === 'afecto_ajuste' || 
                     campoBD === 'afecto_benef_semana_corrida' || campoBD === 'seguro_cesantia' || 
                     campoBD === 'afecto_seguro_accidentes' || campoBD === 'activo') {
            request.input(campoBD, sql.Bit, valor ? 1 : 0);
          } else if (campoBD.includes('valor') || 
                     campoBD.includes('monto') || campoBD.includes('comision') || 
                     campoBD.includes('porcentaje') || campoBD.includes('aporte')) {
            request.input(campoBD, sql.Decimal(18, 2), parseNumeric(valor));
          } else if (campoBD === 'telefono') {
            // Telefono es numeric(12,0) según tu tabla
            request.input(campoBD, sql.Numeric(12, 0), parseInteger(valor));
          } else if (campoBD.includes('cargas') || campoBD.includes('cantidad') || 
                     campoBD.includes('horas') || campoBD.includes('dias') ||
                     campoBD.startsWith('id_')) {
            request.input(campoBD, sql.Int, parseInteger(valor));
          } else {
            request.input(campoBD, sql.VarChar, String(valor));
          }
        }
      });
      
      // Agregar activo por defecto si no existe
      if (camposExistentes.includes('activo') && !campos.includes('activo')) {
        campos.push('activo');
        valores.push('@activo');
        request.input('activo', sql.Bit, 1);
      }
      
      // Agregar timestamps si existen
      if (camposExistentes.includes('created_at')) {
        campos.push('created_at');
        valores.push('GETDATE()');
      }
      if (camposExistentes.includes('updated_at')) {
        campos.push('updated_at');
        valores.push('GETDATE()');
      }
      
      const queryInsert = `
        INSERT INTO empleados (${campos.join(', ')})
        VALUES (${valores.join(', ')});
        SELECT SCOPE_IDENTITY() as id;
      `;
      
      console.log('🔨 Query Insert:', queryInsert);
      console.log('🔨 Campos:', campos);
      
      const result = await request.query(queryInsert);
      
      const nuevaId = result.recordset[0].id;
      console.log(`✅ Empleado creado con ID: ${nuevaId}`);
      
      // ✅ ASIGNAR SUCURSALES SI ESTÁN DISPONIBLES
      if (datosRecibidos.sucursales_ids && Array.isArray(datosRecibidos.sucursales_ids) && 
          datosRecibidos.sucursales_ids.length > 0) {
        try {
          console.log('🏢 Intentando asignar sucursales:', datosRecibidos.sucursales_ids);
          
          // Crear tabla si no existe
          await transaction.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'empleados_sucursales')
            BEGIN
              CREATE TABLE empleados_sucursales (
                id INT IDENTITY(1,1) PRIMARY KEY,
                id_empleado INT NOT NULL,
                id_sucursal INT NOT NULL,
                activo BIT DEFAULT 1,
                created_at DATETIME DEFAULT GETDATE(),
                CONSTRAINT FK_empleados_sucursales_empleado 
                  FOREIGN KEY (id_empleado) REFERENCES empleados(id) ON DELETE CASCADE,
                CONSTRAINT FK_empleados_sucursales_sucursal 
                  FOREIGN KEY (id_sucursal) REFERENCES sucursales(id) ON DELETE CASCADE,
                CONSTRAINT UC_empleado_sucursal UNIQUE (id_empleado, id_sucursal)
              )
            END
          `);
          
          for (const sucursalId of datosRecibidos.sucursales_ids) {
            const sucursalIdNum = parseInt(sucursalId);
            if (!isNaN(sucursalIdNum)) {
              await transaction.request()
                .input('id_empleado', sql.Int, nuevaId)
                .input('id_sucursal', sql.Int, sucursalIdNum)
                .query(`
                  INSERT INTO empleados_sucursales (id_empleado, id_sucursal, activo, created_at)
                  VALUES (@id_empleado, @id_sucursal, 1, GETDATE())
                `);
            }
          }
          
          console.log('✅ Sucursales asignadas correctamente');
        } catch (sucursalError) {
          console.warn('⚠️ No se pudieron asignar sucursales:', sucursalError.message);
        }
      }
      
      // ✅ ASIGNAR SUCURSAL AUTOMÁTICAMENTE SI VIENE EN ESTABLECIMIENTO
      if (datosRecibidos.establecimiento && (!datosRecibidos.sucursales_ids || datosRecibidos.sucursales_ids.length === 0)) {
        try {
          const sucursalEncontrada = await encontrarSucursalPorNombre(pool, datosRecibidos.establecimiento);
          if (sucursalEncontrada) {
            console.log('🏢 Asignando sucursal automáticamente:', sucursalEncontrada.nombre);
            
            await transaction.request()
              .input('id_empleado', sql.Int, nuevaId)
              .input('id_sucursal', sql.Int, sucursalEncontrada.id)
              .query(`
                INSERT INTO empleados_sucursales (id_empleado, id_sucursal, activo, created_at)
                VALUES (@id_empleado, @id_sucursal, 1, GETDATE())
              `);
          }
        } catch (autoSucursalError) {
          console.warn('⚠️ No se pudo asignar sucursal automáticamente:', autoSucursalError.message);
        }
      }
      
      await transaction.commit();
      
      console.log('✅ Empleado creado exitosamente');
      
      return res.status(201).json({ 
        success: true, 
        message: 'Empleado creado exitosamente', 
        id: nuevaId
      });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error al crear empleado:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// ✅ FUNCIÓN CORREGIDA: Actualizar empleado - CON MAPEO SUELDO_BASE CORREGIDO
exports.updateEmpleado = async (req, res) => {
  try {
    console.log('🔄 === ACTUALIZANDO EMPLEADO ===');
    console.log('🔨 Datos recibidos:', JSON.stringify(req.body, null, 2));
    console.log('🆔 ID:', req.params.id);
    
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de empleado debe ser un número válido' 
      });
    }
    
    const datosRecibidos = req.body;

    // Validar datos básicos
    if (!datosRecibidos.nombre) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nombre es obligatorio' 
      });
    }

    const pool = await poolPromise;
    
    // Verificar si el empleado existe
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM empleados WHERE id = @id');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Empleado no encontrado' 
      });
    }

    // Detectar campos existentes
    const empleadosFields = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'empleados'
    `);
    
    const camposExistentes = empleadosFields.recordset.map(f => f.COLUMN_NAME);
    
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      // 🔥 CONSTRUIR APELLIDO SI ES OBLIGATORIO
      let apellidoCompleto = '';
      
      // Si viene apellido como campo único desde frontend
      if (datosRecibidos.apellido) {
        apellidoCompleto = datosRecibidos.apellido;
        const apellidos = datosRecibidos.apellido.split(' ');
        datosRecibidos.apellido_paterno = apellidos[0] || '';
        datosRecibidos.apellido_materno = apellidos.slice(1).join(' ') || '';
      } 
      // Si vienen apellidos separados desde Excel
      else if (datosRecibidos.apellido_paterno || datosRecibidos.apellido_materno) {
        apellidoCompleto = [datosRecibidos.apellido_paterno, datosRecibidos.apellido_materno]
          .filter(Boolean).join(' ');
      }
      
      // Si no hay apellido completo, usar el actual del empleado o requerir uno
      if (!apellidoCompleto && camposExistentes.includes('apellido')) {
        const empleadoActual = checkResult.recordset[0];
        if (empleadoActual.apellido) {
          apellidoCompleto = empleadoActual.apellido;
        } else {
          return res.status(400).json({
            success: false,
            message: 'Apellido es obligatorio'
          });
        }
      }
      
      // 🔥 FUNCIONES MEJORADAS PARA CONVERSIÓN NUMÉRICA (MISMAS QUE CREATE)
      const parseNumeric = (value) => {
        if (value === undefined || value === null || value === '') return null;
        if (typeof value === 'number') return value;
        
        const cleanValue = String(value).replace(/[^\d.,\-]/g, '');
        if (cleanValue === '' || cleanValue === '-') return null;
        
        const normalizedValue = cleanValue.replace(',', '.');
        const parsed = parseFloat(normalizedValue);
        return isNaN(parsed) ? null : parsed;
      };
      
      const parseInteger = (value) => {
        if (value === undefined || value === null || value === '') return null;
        if (typeof value === 'number') return Math.floor(value);
        
        const cleanValue = String(value).replace(/[^\d\-]/g, '');
        if (cleanValue === '' || cleanValue === '-') return null;
        
        const parsed = parseInt(cleanValue, 10);
        return isNaN(parsed) ? null : parsed;
      };
      
      // Usar el mismo mapeo que en createEmpleado
      const mapeoCompleto = {
        'codigo_empleado': 'codigo',
        'correo_electronico': 'correo_electronico',
        'discapacidad': 'discapacidad',
        'codigo': 'codigo',
        'apellido_paterno': 'apellido_paterno',
        'apellido_materno': 'apellido_materno',
        'fecha_nacimiento': 'fecha_nacimiento',
        'sexo': 'sexo',
        'estado_civil': 'estado_civil',
        'nacionalidad': 'nacionalidad',
        'direccion': 'direccion',
        'telefono': 'telefono',
        'email': 'email',
        'correo_electronico': 'correo_electronico',
        'persona_discapacidad': 'persona_discapacidad',
        'discapacidad': 'discapacidad',
        'fecha_ingreso': 'fecha_ingreso',
        'fecha_termino': 'fecha_termino',
        'estado_contrato': 'estado_contrato',
        'tipo_contrato': 'tipo_contrato',
        'cod_departamento': 'cod_departamento',
        'desc_departamento': 'desc_departamento',
        'cargo': 'cargo',
        'establecimiento': 'establecimiento',
        'tipo_jornada': 'tipo_jornada',
        'horas_semanales_pactadas': 'horas_semanales_pactadas',
        'afecto_ajuste': 'afecto_ajuste',
        'sueldo_base': 'sueldo_base', // 🔥 MAPEO DIRECTO SUELDO BASE
        'afecto_benef_semana_corrida': 'afecto_benef_semana_corrida',
        'dia_inicio_periodo': 'dia_inicio_periodo',
        'dias_trabajados_semana': 'dias_trabajados_semana',
        'dia_inicio_semana': 'dia_inicio_semana',
        'dia_descanso_convencional': 'dia_descanso_convencional',
        'tipo_sueldo_base': 'tipo_sueldo_base',
        'valor_sueldo_base': 'valor_sueldo_base',
        'comision_porcentaje': 'comision_porcentaje',
        'valor_hora': 'valor_hora',
        'cantidad_horas': 'cantidad_horas',
        'valor_dia': 'valor_dia',
        'cantidad_dias': 'cantidad_dias',
        'asig_zona_extrema': 'asig_zona_extrema',
        'gratificacion_legal': 'gratificacion_legal',
        'porcentaje_gratif': 'porcentaje_gratif',
        'prevision': 'prevision',
        'cotiz_especial': 'cotiz_especial',
        'porcentaje_cotiz': 'porcentaje_cotiz',
        'tramo_asig_familiar': 'tramo_asig_familiar',
        'es_jubilado': 'es_jubilado',
        'cargas_normales': 'cargas_normales',
        'cargas_maternales': 'cargas_maternales',
        'cargas_invalidas': 'cargas_invalidas',
        'seguro_cesantia': 'seguro_cesantia',
        'afecto_seguro_accidentes': 'afecto_seguro_accidentes',
        'isapre': 'isapre',
        'tipo_pacto_isapre': 'tipo_pacto_isapre',
        'monto_pactado': 'monto_pactado',
        'moneda': 'moneda',
        'monto_ges': 'monto_ges',
        'monto_ges_n': 'monto_ges_n',
        'cuenta_par': 'cuenta_par',
        'institucion_par': 'institucion_par',
        'moneda_par': 'moneda_par',
        'activo': 'activo',
        'id_razon_social': 'id_razon_social',
        'id_tipo_jornada': 'id_tipo_jornada',
        'id_establecimiento': 'id_establecimiento',
        'id_tipo_contrato': 'id_tipo_contrato',
        'id_estado_contrato': 'id_estado_contrato',
        'id_estado_civil': 'id_estado_civil'
      };
      
      // Construir update dinámicamente
      let setClauses = ['nombre = @nombre', 'updated_at = GETDATE()'];
      
      const request = transaction.request()
        .input('id', sql.Int, id)
        .input('nombre', sql.NVarChar, datosRecibidos.nombre);
      
      // Agregar apellido si existe y es obligatorio
      if (camposExistentes.includes('apellido') && apellidoCompleto) {
        setClauses.push('apellido = @apellido');
        request.input('apellido', sql.VarChar, apellidoCompleto);
      }
      
      // Mapear establecimiento usando la tabla de mapeo
      if (datosRecibidos.establecimiento) {
        const establecimientoMapeado = mapearSucursal(datosRecibidos.establecimiento);
        datosRecibidos.establecimiento = establecimientoMapeado;
      }
      
      // 🔥 LOGGING ESPECÍFICO PARA SUELDO_BASE EN UPDATE
      if (datosRecibidos.sueldo_base !== undefined) {
        console.log('💰 UPDATE - SUELDO_BASE detectado:');
        console.log('💰 Valor original:', datosRecibidos.sueldo_base, '(tipo:', typeof datosRecibidos.sueldo_base, ')');
        const sueldoParsed = parseNumeric(datosRecibidos.sueldo_base);
        console.log('💰 Valor parseado:', sueldoParsed);
        console.log('💰 Campo existe en BD:', camposExistentes.includes('sueldo_base'));
      }
      
      // 🔥 VALIDACIÓN MEJORADA PARA INCLUIR VALORES 0
      const esValorValido = (val) => {
        if (val === null || val === undefined) return false;
        if (val === '') return false;
        if (typeof val === 'number' && val === 0) return true; // 🔥 PERMITIR 0
        return true;
      };
      
      // Procesar todos los campos
      Object.entries(datosRecibidos).forEach(([campo, valor]) => {
        const campoBD = mapeoCompleto[campo] || campo;
        
        if (camposExistentes.includes(campoBD) && 
            campo !== 'nombre' && campo !== 'id' && campo !== 'sucursales_ids' &&
            campoBD !== 'apellido' && // Apellido ya se agregó arriba
            esValorValido(valor)) { // 🔥 NUEVA VALIDACIÓN
          
          setClauses.push(`${campoBD} = @${campoBD}`);
          
          console.log(`🔧 UPDATE - Procesando campo: ${campo} -> ${campoBD}, valor: ${valor}`);
          
          // 🔥 MANEJO ESPECÍFICO PARA SUELDO_BASE
          if (campoBD === 'sueldo_base') {
            const sueldoValor = parseNumeric(valor);
            console.log(`💰 UPDATE - Asignando sueldo_base: ${sueldoValor}`);
            request.input(campoBD, sql.Decimal(18, 2), sueldoValor);
          }
          // Asignar valores según tipo (misma lógica que createEmpleado)
          else if (campoBD.includes('fecha') && valor) {
            request.input(campoBD, sql.Date, new Date(valor));
          } else if (campoBD === 'persona_discapacidad' || campoBD === 'discapacidad' || 
                     campoBD === 'es_jubilado' || campoBD === 'afecto_ajuste' || 
                     campoBD === 'afecto_benef_semana_corrida' || campoBD === 'seguro_cesantia' || 
                     campoBD === 'afecto_seguro_accidentes' || campoBD === 'activo') {
            request.input(campoBD, sql.Bit, valor ? 1 : 0);
          } else if (campoBD.includes('valor') || 
                     campoBD.includes('monto') || campoBD.includes('comision') || 
                     campoBD.includes('porcentaje') || campoBD.includes('aporte')) {
            request.input(campoBD, sql.Decimal(18, 2), parseNumeric(valor));
          } else if (campoBD === 'telefono') {
            // Telefono es numeric(12,0) según tu tabla
            request.input(campoBD, sql.Numeric(12, 0), parseInteger(valor));
          } else if (campoBD.includes('cargas') || campoBD.includes('cantidad') || 
                     campoBD.includes('horas') || campoBD.includes('dias') ||
                     campoBD.startsWith('id_')) {
            request.input(campoBD, sql.Int, parseInteger(valor));
          } else {
            request.input(campoBD, sql.VarChar, String(valor || ''));
          }
        }
      });
      
      const queryUpdate = `
        UPDATE empleados SET ${setClauses.join(', ')}
        WHERE id = @id
      `;
      
      console.log('🔄 Query Update:', queryUpdate);
      
      await request.query(queryUpdate);

      // ✅ ACTUALIZAR SUCURSALES SI ESTÁN DISPONIBLES
      if (datosRecibidos.sucursales_ids && Array.isArray(datosRecibidos.sucursales_ids)) {
        try {
          console.log('🏢 Actualizando sucursales:', datosRecibidos.sucursales_ids);
          
          // Marcar como inactivas las sucursales actuales
          await transaction.request()
            .input('id_empleado', sql.Int, id)
            .query('UPDATE empleados_sucursales SET activo = 0 WHERE id_empleado = @id_empleado');
          
          // Insertar o reactivar nuevas sucursales
          for (const sucursalId of datosRecibidos.sucursales_ids) {
            const sucursalIdNum = parseInt(sucursalId);
            if (!isNaN(sucursalIdNum)) {
              // Verificar si ya existe la relación
              const existeResult = await transaction.request()
                .input('id_empleado', sql.Int, id)
                .input('id_sucursal', sql.Int, sucursalIdNum)
                .query(`
                  SELECT COUNT(*) as count 
                  FROM empleados_sucursales 
                  WHERE id_empleado = @id_empleado AND id_sucursal = @id_sucursal
                `);
              
              if (existeResult.recordset[0].count > 0) {
                // Reactivar relación existente
                await transaction.request()
                  .input('id_empleado', sql.Int, id)
                  .input('id_sucursal', sql.Int, sucursalIdNum)
                  .query(`
                    UPDATE empleados_sucursales 
                    SET activo = 1, updated_at = GETDATE()
                    WHERE id_empleado = @id_empleado AND id_sucursal = @id_sucursal
                  `);
              } else {
                // Crear nueva relación
                await transaction.request()
                  .input('id_empleado', sql.Int, id)
                  .input('id_sucursal', sql.Int, sucursalIdNum)
                  .query(`
                    INSERT INTO empleados_sucursales (id_empleado, id_sucursal, activo, created_at)
                    VALUES (@id_empleado, @id_sucursal, 1, GETDATE())
                  `);
              }
            }
          }
          
          console.log('✅ Sucursales actualizadas correctamente');
        } catch (sucursalError) {
          console.warn('⚠️ No se pudieron actualizar sucursales:', sucursalError.message);
        }
      }
      
      await transaction.commit();

      console.log('✅ Empleado actualizado correctamente');
      return res.status(200).json({
        success: true,
        message: 'Empleado actualizado correctamente'
      });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ Error en updateEmpleado:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el empleado',
      error: error.message
    });
  }
};

// ✅ FUNCIÓN: Eliminar empleado
exports.deleteEmpleado = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de empleado debe ser un número válido' 
      });
    }
    
    const pool = await poolPromise;
    
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM empleados WHERE id = @id');
    
    if (checkResult.recordset[0].count === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Empleado no encontrado' 
      });
    }
    
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      // Eliminar relaciones en empleados_sucursales
      try {
        await transaction.request()
          .input('id', sql.Int, id)
          .query('DELETE FROM empleados_sucursales WHERE id_empleado = @id');
      } catch (error) {
        console.warn('⚠️ No se pudo eliminar de empleados_sucursales');
      }
      
      // Eliminar relaciones en empleados_remuneraciones si existe
      try {
        await transaction.request()
          .input('id', sql.Int, id)
          .query('DELETE FROM empleados_remuneraciones WHERE id_empleado = @id');
      } catch (error) {
        console.warn('⚠️ No se pudo eliminar de empleados_remuneraciones');
      }
      
      // Eliminar empleado
      await transaction.request()
        .input('id', sql.Int, id)
        .query('DELETE FROM empleados WHERE id = @id');
      
      await transaction.commit();
      
      return res.json({ 
        success: true, 
        message: 'Empleado eliminado permanentemente de la base de datos' 
      });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error al eliminar empleado:', error);
    
    if (error.message && error.message.includes('REFERENCE constraint')) {
      return res.status(400).json({ 
        success: false, 
        message: 'No se puede eliminar el empleado porque tiene registros relacionados en otras tablas.',
        error: 'FOREIGN_KEY_CONSTRAINT' 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// ✅ FUNCIÓN: Buscar empleados
exports.searchEmpleados = async (req, res) => {
  try {
    const query = req.query.query;
    const showInactive = req.query.showInactive === 'true';
    
    if (!query || query.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requiere un término de búsqueda' 
      });
    }
    
    const pool = await poolPromise;
    
    const empleadosFields = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'empleados'
    `);
    
    const camposExistentes = empleadosFields.recordset.map(f => f.COLUMN_NAME);
    
    let sqlQuery = `
      SELECT 
        e.id,
        e.rut,
        e.nombre
    `;
    
    // Agregar campos adicionales si existen
    const camposOpcionales = [
      'apellido', 'apellido_paterno', 'apellido_materno', 'codigo', 'cargo', 'direccion', 
      'telefono', 'email', 'correo_electronico', 'establecimiento', 'activo'
    ];
    
    camposOpcionales.forEach(campo => {
      if (camposExistentes.includes(campo)) {
        sqlQuery += `,\n        e.${campo}`;
      }
    });
    
    sqlQuery += `
      FROM empleados e
      WHERE (e.rut LIKE @query OR e.nombre LIKE @query`;
    
    // Agregar campos de búsqueda opcionales
    if (camposExistentes.includes('apellido')) {
      sqlQuery += ' OR e.apellido LIKE @query';
    }
    if (camposExistentes.includes('apellido_paterno')) {
      sqlQuery += ' OR e.apellido_paterno LIKE @query';
    }
    if (camposExistentes.includes('apellido_materno')) {
      sqlQuery += ' OR e.apellido_materno LIKE @query';
    }
    if (camposExistentes.includes('cargo')) {
      sqlQuery += ' OR e.cargo LIKE @query';
    }
    if (camposExistentes.includes('telefono')) {
      sqlQuery += ' OR e.telefono LIKE @query';
    }
    if (camposExistentes.includes('email')) {
      sqlQuery += ' OR e.email LIKE @query';
    }
    if (camposExistentes.includes('correo_electronico')) {
      sqlQuery += ' OR e.correo_electronico LIKE @query';
    }
    if (camposExistentes.includes('codigo')) {
      sqlQuery += ' OR e.codigo LIKE @query';
    }
    if (camposExistentes.includes('establecimiento')) {
      sqlQuery += ' OR e.establecimiento LIKE @query';
    }
    
    sqlQuery += ')';
    
    if (!showInactive && camposExistentes.includes('activo')) {
      sqlQuery += ' AND e.activo = 1';
    }
    
    sqlQuery += ' ORDER BY e.nombre';
    if (camposExistentes.includes('apellido')) {
      sqlQuery += ', e.apellido';
    } else if (camposExistentes.includes('apellido_paterno')) {
      sqlQuery += ', e.apellido_paterno';
    }
    
    const result = await pool.request()
      .input('query', sql.VarChar, `%${query}%`)
      .query(sqlQuery);
    
    // Procesar resultados para compatibilidad
    const empleadosCompatibles = result.recordset.map(empleado => ({
      ...empleado,
      apellido: empleado.apellido || [empleado.apellido_paterno, empleado.apellido_materno].filter(Boolean).join(' '),
      correo_electronico: empleado.correo_electronico || empleado.email,
      email: empleado.email || empleado.correo_electronico,
      discapacidad: empleado.discapacidad !== undefined ? empleado.discapacidad : empleado.persona_discapacidad,
      persona_discapacidad: empleado.persona_discapacidad !== undefined ? empleado.persona_discapacidad : empleado.discapacidad
    }));
    
    return res.json({ success: true, empleados: empleadosCompatibles });
    
  } catch (error) {
    console.error('❌ Error al buscar empleados:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// ✅ FUNCIÓN: Obtener sucursales de un empleado
exports.getEmpleadoSucursales = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de empleado debe ser un número válido' 
      });
    }
    
    const pool = await poolPromise;
    
    const empleadoResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM empleados WHERE id = @id');
    
    if (empleadoResult.recordset[0].count === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Empleado no encontrado' 
      });
    }
    
    try {
      const sucursalesResult = await pool.request()
        .input('id_empleado', sql.Int, id)
        .query(`
          SELECT s.id, s.nombre
          FROM empleados_sucursales es
          INNER JOIN sucursales s ON es.id_sucursal = s.id
          WHERE es.id_empleado = @id_empleado AND es.activo = 1
          ORDER BY s.id
        `);
      
      return res.json({ 
        success: true, 
        sucursales: sucursalesResult.recordset 
      });
      
    } catch (error) {
      return res.json({ 
        success: true, 
        sucursales: [] 
      });
    }
    
  } catch (error) {
    console.error('❌ Error al obtener sucursales del empleado:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// ✅ FUNCIÓN: Actualizar sucursales de un empleado
exports.updateEmpleadoSucursales = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { sucursales_ids } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de empleado debe ser un número válido' 
      });
    }
    
    if (!Array.isArray(sucursales_ids)) {
      return res.status(400).json({ 
        success: false, 
        message: 'sucursales_ids debe ser un array' 
      });
    }
    
    const pool = await poolPromise;
    
    const empleadoResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM empleados WHERE id = @id');
    
    if (empleadoResult.recordset[0].count === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Empleado no encontrado' 
      });
    }
    
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      // Marcar como inactivos las sucursales actuales
      await transaction.request()
        .input('id_empleado', sql.Int, id)
        .query('UPDATE empleados_sucursales SET activo = 0 WHERE id_empleado = @id_empleado');
      
      // Insertar o reactivar sucursales
      for (const sucursalId of sucursales_ids) {
        const sucursalIdNum = parseInt(sucursalId);
        if (!isNaN(sucursalIdNum)) {
          // Verificar si ya existe la relación
          const existeResult = await transaction.request()
            .input('id_empleado', sql.Int, id)
            .input('id_sucursal', sql.Int, sucursalIdNum)
            .query(`
              SELECT COUNT(*) as count 
              FROM empleados_sucursales 
              WHERE id_empleado = @id_empleado AND id_sucursal = @id_sucursal
            `);
          
          if (existeResult.recordset[0].count > 0) {
            // Reactivar relación existente
            await transaction.request()
              .input('id_empleado', sql.Int, id)
              .input('id_sucursal', sql.Int, sucursalIdNum)
              .query(`
                UPDATE empleados_sucursales 
                SET activo = 1, updated_at = GETDATE()
                WHERE id_empleado = @id_empleado AND id_sucursal = @id_sucursal
              `);
          } else {
            // Crear nueva relación
            await transaction.request()
              .input('id_empleado', sql.Int, id)
              .input('id_sucursal', sql.Int, sucursalIdNum)
              .query(`
                INSERT INTO empleados_sucursales (id_empleado, id_sucursal, activo, created_at)
                VALUES (@id_empleado, @id_sucursal, 1, GETDATE())
              `);
          }
        }
      }
      
      await transaction.commit();
      
      return res.json({ 
        success: true, 
        message: 'Sucursales del empleado actualizadas correctamente' 
      });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error al actualizar sucursales del empleado:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// ✅ FUNCIÓN: Cambiar estado activo del empleado
exports.toggleActiveStatus = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { activo } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de empleado debe ser un número válido' 
      });
    }
    
    if (typeof activo !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        message: 'El valor de activo debe ser true o false' 
      });
    }
    
    const pool = await poolPromise;
    
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM empleados WHERE id = @id');
    
    if (checkResult.recordset[0].count === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Empleado no encontrado' 
      });
    }
    
    await pool.request()
      .input('id', sql.Int, id)
      .input('activo', sql.Bit, activo ? 1 : 0)
      .query('UPDATE empleados SET activo = @activo, updated_at = GETDATE() WHERE id = @id');
    
    return res.json({ 
      success: true, 
      message: `Empleado ${activo ? 'activado' : 'desactivado'} exitosamente` 
    });
  } catch (error) {
    console.error('❌ Error al cambiar estado del empleado:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// ✅ FUNCIÓN: Cambiar estado de discapacidad
exports.toggleDiscapacidadStatus = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { discapacidad } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de empleado debe ser un número válido' 
      });
    }
    
    if (typeof discapacidad !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        message: 'El valor de discapacidad debe ser true o false' 
      });
    }
    
    const pool = await poolPromise;
    
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM empleados WHERE id = @id');
    
    if (checkResult.recordset[0].count === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Empleado no encontrado' 
      });
    }
    
    // Detectar qué campo de discapacidad usar
    const empleadosFields = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'empleados' AND COLUMN_NAME IN ('discapacidad', 'persona_discapacidad')
    `);
    
    const campoDiscapacidad = empleadosFields.recordset.find(f => 
      f.COLUMN_NAME === 'persona_discapacidad' || f.COLUMN_NAME === 'discapacidad'
    );
    
    if (!campoDiscapacidad) {
      return res.status(400).json({
        success: false,
        message: 'Campo de discapacidad no encontrado en la base de datos'
      });
    }
    
    await pool.request()
      .input('id', sql.Int, id)
      .input('discapacidad', sql.Bit, discapacidad ? 1 : 0)
      .query(`UPDATE empleados SET ${campoDiscapacidad.COLUMN_NAME} = @discapacidad, updated_at = GETDATE() WHERE id = @id`);
    
    return res.json({ 
      success: true, 
      message: `Estado de discapacidad del empleado actualizado exitosamente` 
    });
  } catch (error) {
    console.error('❌ Error al cambiar estado de discapacidad del empleado:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// ✅ FUNCIÓN: Obtener estadísticas de empleados
exports.getEmpleadosStats = async (req, res) => {
  try {
    const pool = await poolPromise;
    
    // Detectar si existe el campo activo
    const empleadosFields = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'empleados'
    `);
    const camposExistentes = empleadosFields.recordset.map(f => f.COLUMN_NAME);
    
    let estadoQuery = 'SELECT COUNT(*) as total FROM empleados';
    
    if (camposExistentes.includes('activo')) {
      estadoQuery = `
        SELECT 
          SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos,
          SUM(CASE WHEN activo = 0 THEN 1 ELSE 0 END) as inactivos,
          COUNT(*) as total
        FROM empleados
      `;
    }
    
    const estadoResult = await pool.request().query(estadoQuery);
    
    let cargoQuery = 'SELECT COUNT(*) as total FROM empleados';
    if (camposExistentes.includes('cargo')) {
      cargoQuery = `
        SELECT 
          ISNULL(cargo, 'Sin especificar') as cargo,
          COUNT(*) as cantidad
        FROM empleados `;
      
      if (camposExistentes.includes('activo')) {
        cargoQuery += 'WHERE activo = 1 ';
      }
      
      cargoQuery += `
        GROUP BY cargo
        ORDER BY cantidad DESC
      `;
    }
    
    const cargoResult = await pool.request().query(cargoQuery);
    
    let sucursalQuery = 'SELECT \'Sin datos\' as sucursal, 0 as empleados';
    if (camposExistentes.includes('establecimiento')) {
      sucursalQuery = `
        SELECT 
          ISNULL(establecimiento, 'Sin especificar') as sucursal,
          COUNT(*) as empleados
        FROM empleados `;
      
      if (camposExistentes.includes('activo')) {
        sucursalQuery += 'WHERE activo = 1 ';
      }
      
      sucursalQuery += `
        GROUP BY establecimiento
        ORDER BY empleados DESC
      `;
    }
    
    const sucursalResult = await pool.request().query(sucursalQuery);
    
    return res.json({
      success: true,
      stats: {
        estado: estadoResult.recordset[0],
        por_cargo: cargoResult.recordset,
        por_sucursal: sucursalResult.recordset
      }
    });
  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};

// ✅ FUNCIÓN: Validar RUT
exports.validateRut = async (req, res) => {
  try {
    const { rut } = req.body;
    
    if (!rut) {
      return res.status(400).json({
        success: false,
        message: 'RUT es requerido'
      });
    }
    
    const rutLimpio = limpiarRUT(rut);
    
    if (!rutLimpio || rutLimpio.length < 8) {
      return res.json({
        success: true,
        valido: false,
        message: 'RUT inválido. Debe tener al menos 8 caracteres'
      });
    }
    
    const pool = await poolPromise;
    
    const existeResult = await pool.request()
      .input('rut', sql.VarChar, rutLimpio)
      .query('SELECT id, nombre FROM empleados WHERE rut = @rut');
    
    if (existeResult.recordset.length > 0) {
      const empleado = existeResult.recordset[0];
      return res.json({
        success: true,
        valido: false,
        existe: true,
        empleado: empleado,
        message: `RUT ya existe: ${empleado.nombre}`
      });
    }
    
    return res.json({
      success: true,
      valido: true,
      existe: false,
      message: 'RUT válido y disponible'
    });
    
  } catch (error) {
    console.error('❌ Error validando RUT:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al validar RUT',
      error: error.message
    });
  }
};

// ✅ FUNCIÓN: Obtener empleados por sucursal
exports.getEmpleadosBySucursal = async (req, res) => {
  try {
    const establecimiento = req.params.id_sucursal; // Puede ser nombre o ID
    
    if (!establecimiento) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID o nombre de sucursal es requerido' 
      });
    }
    
    const pool = await poolPromise;
    
    // Detectar campos existentes
    const empleadosFields = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'empleados'
    `);
    const camposExistentes = empleadosFields.recordset.map(f => f.COLUMN_NAME);
    
    try {
      let query = `
        SELECT 
          e.id,
          e.rut,
          e.nombre
      `;
      
      if (camposExistentes.includes('apellido')) {
        query += `, e.apellido`;
      }
      if (camposExistentes.includes('apellido_paterno')) {
        query += `, e.apellido_paterno`;
      }
      if (camposExistentes.includes('apellido_materno')) {
        query += `, e.apellido_materno`;
      }
      if (camposExistentes.includes('cargo')) {
        query += `, e.cargo`;
      }
      if (camposExistentes.includes('email')) {
        query += `, e.email`;
      }
      if (camposExistentes.includes('correo_electronico')) {
        query += `, e.correo_electronico`;
      }
      if (camposExistentes.includes('telefono')) {
        query += `, e.telefono`;
      }
      if (camposExistentes.includes('establecimiento')) {
        query += `, e.establecimiento`;
      }
      if (camposExistentes.includes('activo')) {
        query += `, e.activo`;
      }
      
      query += ` FROM empleados e WHERE `;
      
      // Buscar por establecimiento
      if (camposExistentes.includes('establecimiento')) {
        query += `e.establecimiento LIKE @establecimiento`;
      } else {
        query += `1 = 0`; // No hay campo establecimiento
      }
      
      if (camposExistentes.includes('activo')) {
        query += ` AND e.activo = 1`;
      }
      
      query += ` ORDER BY e.nombre`;
      if (camposExistentes.includes('apellido')) {
        query += `, e.apellido`;
      } else if (camposExistentes.includes('apellido_paterno')) {
        query += `, e.apellido_paterno`;
      }
      
      const result = await pool.request()
        .input('establecimiento', sql.VarChar, `%${establecimiento}%`)
        .query(query);
      
      return res.json({ 
        success: true, 
        empleados: result.recordset 
      });
      
    } catch (error) {
      return res.json({ 
        success: true, 
        empleados: [] 
      });
    }
    
  } catch (error) {
    console.error('❌ Error al obtener empleados por sucursal:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// 🔧 FUNCIÓN CORREGIDA: Actualizar razón social masivamente
exports.updateRazonSocialMasiva = async (req, res) => {
  try {
    const { empleados_ids, id_razon_social } = req.body;
    
    console.log('🏢 === ACTUALIZACION MASIVA RAZON SOCIAL ===');
    console.log('🏢 Empleados:', empleados_ids);
    console.log('🏢 Razón Social ID:', id_razon_social);
    console.log('🏢 Tipos:', typeof empleados_ids, typeof id_razon_social);
    
    // 🔧 VALIDACIONES MEJORADAS
    if (!Array.isArray(empleados_ids) || empleados_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar al menos un empleado'
      });
    }

    // Validar que todos los IDs de empleados sean números válidos
    const empleadosIdsNumericos = [];
    const idsInvalidos = [];
    
    empleados_ids.forEach(id => {
      const numericId = parseInt(id, 10);
      if (!isNaN(numericId) && numericId > 0) {
        empleadosIdsNumericos.push(numericId);
      } else {
        idsInvalidos.push(id);
      }
    });

    if (idsInvalidos.length > 0) {
      return res.status(400).json({
        success: false,
        message: `IDs de empleados inválidos: ${idsInvalidos.join(', ')}`
      });
    }

    if (empleadosIdsNumericos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se encontraron IDs de empleados válidos'
      });
    }

    // Validar ID de razón social
    const razonSocialIdNumerico = parseInt(id_razon_social, 10);
    if (!razonSocialIdNumerico || isNaN(razonSocialIdNumerico) || razonSocialIdNumerico <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe seleccionar una razón social válida'
      });
    }

    const pool = await poolPromise;
    
    // 🔧 VERIFICAR QUE LA RAZÓN SOCIAL EXISTE (usando tu estructura de tabla)
    const razonSocialCheck = await pool.request()
      .input('id_razon_social', sql.Int, razonSocialIdNumerico)
      .query('SELECT COUNT(*) as count, nombre_razon FROM razones_sociales WHERE id = @id_razon_social AND activo = 1 GROUP BY nombre_razon');
    
    if (razonSocialCheck.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'La razón social seleccionada no existe o está inactiva'
      });
    }

    const nombreRazonSocial = razonSocialCheck.recordset[0].nombre_razon;
    console.log('✅ Razón social válida:', nombreRazonSocial);

    // 🔧 VERIFICAR QUE TODOS LOS EMPLEADOS EXISTEN
    const placeholders = empleadosIdsNumericos.map((_, index) => `@emp${index}`).join(',');
    let empleadosCheckQuery = `SELECT id, nombre, apellido FROM empleados WHERE id IN (${placeholders})`;
    
    const empleadosCheckRequest = pool.request();
    empleadosIdsNumericos.forEach((id, index) => {
      empleadosCheckRequest.input(`emp${index}`, sql.Int, id);
    });
    
    const empleadosExistentes = await empleadosCheckRequest.query(empleadosCheckQuery);
    
    if (empleadosExistentes.recordset.length !== empleadosIdsNumericos.length) {
      const existenIds = empleadosExistentes.recordset.map(e => e.id);
      const noExistenIds = empleadosIdsNumericos.filter(id => !existenIds.includes(id));
      
      return res.status(400).json({
        success: false,
        message: `Los siguientes empleados no existen: ${noExistenIds.join(', ')}`
      });
    }

    console.log(`✅ Todos los ${empleadosIdsNumericos.length} empleados existen`);

    // 🔧 REALIZAR ACTUALIZACIÓN MASIVA EN TRANSACCIÓN
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    let actualizados = 0;
    let errores = 0;
    const erroresDetalle = [];

    try {
      for (const empleadoId of empleadosIdsNumericos) {
        try {
          await transaction.request()
            .input('id', sql.Int, empleadoId)
            .input('id_razon_social', sql.Int, razonSocialIdNumerico)
            .query('UPDATE empleados SET id_razon_social = @id_razon_social, updated_at = GETDATE() WHERE id = @id');
          
          actualizados++;
          console.log(`✅ Empleado ${empleadoId} actualizado`);
          
        } catch (error) {
          console.error(`❌ Error actualizando empleado ${empleadoId}:`, error);
          errores++;
          erroresDetalle.push(`Empleado ${empleadoId}: ${error.message}`);
        }
      }

      await transaction.commit();
      
    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }

    console.log(`🏢 Actualización completada: ${actualizados} exitosos, ${errores} errores`);

    const mensaje = `Actualización completada: ${actualizados} empleados actualizados con razón social "${nombreRazonSocial}"${errores > 0 ? `, ${errores} errores` : ''}`;

    return res.json({
      success: true,
      message: mensaje,
      actualizados,
      errores,
      razon_social: nombreRazonSocial,
      empleados_procesados: empleadosIdsNumericos.length,
      erroresDetalle: errores > 0 ? erroresDetalle.slice(0, 5) : [] // Máximo 5 errores en detalle
    });

  } catch (error) {
    console.error('❌ Error en actualización masiva de razón social:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
    });
  }
};

// ✅ FUNCIÓN: Obtener perfil del usuario autenticado
exports.getMiPerfil = async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const pool = await poolPromise;

    // Obtener información del empleado con su perfil
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT
          e.id,
          e.rut,
          e.nombre,
          e.email,
          e.telefono,
          e.cargo,
          e.foto_perfil,
          p.nombre as perfil_nombre,
          e.perfil_id
        FROM empleados e
        LEFT JOIN perfiles p ON e.perfil_id = p.id
        WHERE e.id = @userId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Empleado no encontrado'
      });
    }

    const empleado = result.recordset[0];

    // Obtener sucursales asignadas al perfil
    let sucursales = [];
    if (empleado.perfil_id) {
      const sucursalesResult = await pool.request()
        .input('perfilId', sql.Int, empleado.perfil_id)
        .query(`
          SELECT s.id, s.nombre
          FROM perfiles_sucursales ps
          INNER JOIN sucursales s ON ps.sucursal_id = s.id
          WHERE ps.perfil_id = @perfilId
        `);

      sucursales = sucursalesResult.recordset.map(s => s.nombre);
    }

    return res.json({
      success: true,
      data: {
        id: empleado.id,
        rut: empleado.rut,
        nombre: empleado.nombre,
        email: empleado.email,
        telefono: empleado.telefono,
        cargo: empleado.cargo,
        foto_perfil: empleado.foto_perfil,
        perfil_nombre: empleado.perfil_nombre,
        sucursales: sucursales
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener mi perfil:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener perfil',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

// ✅ FUNCIÓN: Actualizar perfil del usuario autenticado
exports.updateMiPerfil = async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const { nombre, email, telefono } = req.body;

    // Validaciones
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El nombre es obligatorio'
      });
    }

    const pool = await poolPromise;

    // Actualizar información
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('nombre', sql.NVarChar, nombre.trim())
      .input('email', sql.NVarChar, email ? email.trim() : null)
      .input('telefono', sql.NVarChar, telefono ? telefono.trim() : null)
      .query(`
        UPDATE empleados
        SET
          nombre = @nombre,
          email = @email,
          telefono = @telefono
        WHERE id = @userId
      `);

    console.log(`✅ Perfil actualizado para usuario ${userId}`);

    return res.json({
      success: true,
      message: 'Perfil actualizado correctamente'
    });

  } catch (error) {
    console.error('❌ Error al actualizar perfil:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar perfil',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

// ✅ FUNCIÓN: Subir foto de perfil
exports.uploadFotoPerfil = async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha recibido ninguna imagen'
      });
    }

    const filename = req.file.filename;
    const pool = await poolPromise;

    // Obtener foto anterior para eliminarla
    const perfilAnterior = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT foto_perfil FROM empleados WHERE id = @userId');

    const fotoAnterior = perfilAnterior.recordset[0]?.foto_perfil;

    // Actualizar foto en BD
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('filename', sql.NVarChar, filename)
      .query(`
        UPDATE empleados
        SET foto_perfil = @filename
        WHERE id = @userId
      `);

    // Eliminar foto anterior si existe
    if (fotoAnterior) {
      const fs = require('fs');
      const path = require('path');
      const oldPhotoPath = path.join(__dirname, '../uploads/perfiles', fotoAnterior);

      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
        console.log(`🗑️ Foto anterior eliminada: ${fotoAnterior}`);
      }
    }

    console.log(`✅ Foto de perfil actualizada para usuario ${userId}: ${filename}`);

    return res.json({
      success: true,
      message: 'Foto de perfil actualizada',
      data: {
        foto_perfil: filename
      }
    });

  } catch (error) {
    console.error('❌ Error al subir foto de perfil:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al subir la foto',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

// ✅ FUNCIÓN: Cambiar contraseña
exports.cambiarPassword = async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Validaciones
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Debes proporcionar la contraseña actual y la nueva'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    const pool = await poolPromise;
    const bcrypt = require('bcryptjs');

    // Obtener contraseña actual
    const userResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT password FROM empleados WHERE id = @userId');

    if (userResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const user = userResult.recordset[0];

    // Verificar contraseña actual
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'La contraseña actual es incorrecta'
      });
    }

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('password', sql.NVarChar, hashedPassword)
      .query(`
        UPDATE empleados
        SET password = @password
        WHERE id = @userId
      `);

    console.log(`✅ Contraseña actualizada para usuario ${userId}`);

    return res.json({
      success: true,
      message: 'Contraseña actualizada correctamente'
    });

  } catch (error) {
    console.error('❌ Error al cambiar contraseña:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cambiar la contraseña',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

module.exports = exports;