// backend/controllers/empleadosController.js - VERSIÓN ACTUALIZADA CON TODOS LOS CAMPOS
const { sql, poolPromise } = require('../config/db');

// ✅ FUNCIÓN: Obtener todos los empleados - CON DETECCIÓN AUTOMÁTICA Y TODOS LOS CAMPOS
exports.getEmpleados = async (req, res) => {
  try {
    console.log('🔍 === INICIANDO getEmpleados ===');
    
    const pool = await poolPromise;
    const showInactive = req.query.showInactive === 'true';
    
    console.log('🔍 getEmpleados - showInactive:', showInactive);
    
    // ✅ DETECTAR ESTRUCTURA DE TABLAS
    console.log('🔍 Detectando estructura de tablas...');
    
    const empleadosFields = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'empleados'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('📋 Campos de empleados:', empleadosFields.recordset.map(f => f.COLUMN_NAME));
    
    // ✅ QUERY PRINCIPAL CON TODOS LOS CAMPOS POSIBLES
    let query = `
      SELECT 
        e.id,
        e.rut,
        e.nombre,
        e.apellido,
        e.activo
    `;
    
    // Agregar campos según existan en la tabla
    const camposAdicionales = [
      'codigo_empleado', 'numero_empleado', 'cargo', 'cargo_descripcion',
      'direccion', 'nacionalidad', 'correo_electronico', 'fecha_nacimiento', 
      'fecha_ingreso', 'fecha_termino', 'estado_civil', 'discapacidad', 'telefono',
      'id_razon_social', 'id_centro_costo', 'id_empresa', 'id_jefe', 'id_sucursal', 
      'descripcion', 'sueldo_base', 'monto_pensiones', 'propinas_promedio_12m',
      'otros_descuentos_legales', 'total_ingresos', 'total_descuentos_legales',
      'total_haberes', 'descuento_prestamo', 'descuento_sindicato',
      'created_at', 'updated_at'
    ];
    
    const camposExistentes = empleadosFields.recordset.map(f => f.COLUMN_NAME);
    
    camposAdicionales.forEach(campo => {
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
    
    query += ' ORDER BY e.nombre, e.apellido';
    
    console.log('🔍 Query SQL:', query);
    
    // ✅ EJECUTAR QUERY PRINCIPAL
    const result = await pool.request().query(query);
    console.log('📊 Empleados encontrados:', result.recordset.length);
    
    let empleadosConRelaciones = [...result.recordset];
    
    // ✅ CARGAR DATOS RELACIONADOS
    try {
      console.log('🏭 Detectando tabla de razones sociales...');
      
      const tablasRazones = await pool.request().query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME IN ('razones_sociales', 'razonessociales', 'razones_social', 'razon_social')
      `);
      
      let razonesSociales = [];
      
      if (tablasRazones.recordset.length > 0) {
        const tablaRazones = tablasRazones.recordset[0].TABLE_NAME;
        console.log('🏭 Tabla de razones sociales encontrada:', tablaRazones);
        
        const razonesFields = await pool.request().query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = '${tablaRazones}'
        `);
        
        const camposRazones = razonesFields.recordset.map(f => f.COLUMN_NAME);
        console.log('🏭 Campos de razones sociales:', camposRazones);
        
        let campoNombre = 'nombre_razon';
        if (camposRazones.includes('razon_social')) campoNombre = 'razon_social';
        else if (camposRazones.includes('nombre')) campoNombre = 'nombre';
        else if (camposRazones.includes('descripcion')) campoNombre = 'descripcion';
        
        console.log('🏭 Usando campo nombre:', campoNombre);
        
        const razonesSocialesResult = await pool.request()
          .query(`SELECT id, ${campoNombre} as nombre_razon FROM ${tablaRazones}`);
        
        razonesSociales = razonesSocialesResult.recordset;
        console.log('✅ Razones sociales cargadas:', razonesSociales.length);
      }
      
      // ✅ CARGAR SUCURSALES
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
        
        let campoNombreSucursal = 'nombre';
        if (camposSucursales.includes('nombre_sucursal')) campoNombreSucursal = 'nombre_sucursal';
        else if (camposSucursales.includes('descripcion')) campoNombreSucursal = 'descripcion';
        
        let querySucursales = `SELECT id, ${campoNombreSucursal} as nombre`;
        if (camposSucursales.includes('tipo_sucursal')) {
          querySucursales += `, tipo_sucursal`;
        }
        querySucursales += ` FROM sucursales`;
        
        const sucursalesResult = await pool.request().query(querySucursales);
        sucursales = sucursalesResult.recordset;
        console.log('✅ Sucursales cargadas:', sucursales.length);
      }
      
      // ✅ CARGAR CENTROS DE COSTO
      let centrosCostos = [];
      try {
        const centrosCostosResult = await pool.request().query(`
          SELECT id, nombre, descripcion 
          FROM centros_costos
        `);
        centrosCostos = centrosCostosResult.recordset;
        console.log('✅ Centros de costos cargados:', centrosCostos.length);
      } catch (error) {
        console.log('⚠️ Tabla centros_costos no encontrada');
      }
      
      // ✅ CARGAR EMPRESAS
      let empresas = [];
      try {
        const empresasResult = await pool.request().query(`
          SELECT id, nombre, razon_social 
          FROM empresas
        `);
        empresas = empresasResult.recordset;
        console.log('✅ Empresas cargadas:', empresas.length);
      } catch (error) {
        console.log('⚠️ Tabla empresas no encontrada');
      }
      
      // ✅ COMBINAR DATOS CON VALIDACIONES
      empleadosConRelaciones = result.recordset.map(empleado => {
        let empleadoCompleto = { ...empleado };
        
        // Agregar nombre de razón social
        if (empleado.id_razon_social && razonesSociales.length > 0) {
          const razonSocial = razonesSociales.find(rs => rs.id === empleado.id_razon_social);
          empleadoCompleto.nombre_razon = razonSocial ? razonSocial.nombre_razon : 'Sin razón social';
        } else {
          empleadoCompleto.nombre_razon = 'Sin razón social';
        }
        
        // Agregar nombre de sucursal
        if (empleado.id_sucursal && sucursales.length > 0) {
          const sucursal = sucursales.find(s => s.id === empleado.id_sucursal);
          empleadoCompleto.sucursal_nombre = sucursal ? sucursal.nombre : 'Sin sucursal';
        } else {
          empleadoCompleto.sucursal_nombre = 'Sin sucursal';
        }
        
        // Agregar nombre de centro de costo
        if (empleado.id_centro_costo && centrosCostos.length > 0) {
          const centro = centrosCostos.find(c => c.id === empleado.id_centro_costo);
          empleadoCompleto.centro_costo_nombre = centro ? (centro.nombre || centro.descripcion) : 'Sin centro de costo';
        } else {
          empleadoCompleto.centro_costo_nombre = 'Sin centro de costo';
        }
        
        // Agregar nombre de empresa
        if (empleado.id_empresa && empresas.length > 0) {
          const empresa = empresas.find(e => e.id === empleado.id_empresa);
          empleadoCompleto.empresa_nombre = empresa ? (empresa.nombre || empresa.razon_social) : 'Sin empresa';
        } else {
          empleadoCompleto.empresa_nombre = 'Sin empresa';
        }
        
        // Agregar nombre de jefe
        if (empleado.id_jefe) {
          const jefe = result.recordset.find(e => e.id === empleado.id_jefe);
          empleadoCompleto.jefe_nombre = jefe ? `${jefe.nombre} ${jefe.apellido}` : 'Sin jefe asignado';
        } else {
          empleadoCompleto.jefe_nombre = 'Sin jefe asignado';
        }
        
        return empleadoCompleto;
      });
      
    } catch (relacionError) {
      console.error('⚠️ Error al cargar datos relacionados:', relacionError.message);
      
      empleadosConRelaciones = result.recordset.map(empleado => ({
        ...empleado,
        nombre_razon: 'Error al cargar',
        sucursal_nombre: 'Error al cargar',
        centro_costo_nombre: 'Error al cargar',
        empresa_nombre: 'Error al cargar',
        jefe_nombre: 'Error al cargar'
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

// ✅ FUNCIÓN: Obtener un empleado por ID - CON TODOS LOS CAMPOS
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
    
    try {
      // Cargar datos relacionados con detección automática
      if (empleado.id_razon_social) {
        const tablasRazones = await pool.request().query(`
          SELECT TABLE_NAME 
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_NAME IN ('razones_sociales', 'razonessociales', 'razones_social', 'razon_social')
        `);
        
        if (tablasRazones.recordset.length > 0) {
          const tablaRazones = tablasRazones.recordset[0].TABLE_NAME;
          
          const razonesFields = await pool.request().query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = '${tablaRazones}'
          `);
          
          const camposRazones = razonesFields.recordset.map(f => f.COLUMN_NAME);
          let campoNombre = 'nombre_razon';
          if (camposRazones.includes('razon_social')) campoNombre = 'razon_social';
          else if (camposRazones.includes('nombre')) campoNombre = 'nombre';
          
          const razonSocialResult = await pool.request()
            .input('id', sql.Int, empleado.id_razon_social)
            .query(`SELECT ${campoNombre} as nombre_razon FROM ${tablaRazones} WHERE id = @id`);
          
          if (razonSocialResult.recordset.length > 0) {
            empleado.nombre_razon = razonSocialResult.recordset[0].nombre_razon;
          }
        }
      }
      
      // Cargar otros datos relacionados de manera similar...
      
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

// ✅ FUNCIÓN: Crear un nuevo empleado - CON TODOS LOS CAMPOS
exports.createEmpleado = async (req, res) => {
  try {
    console.log('📨 === CREANDO NUEVO EMPLEADO ===');
    console.log('📨 Datos recibidos:', JSON.stringify(req.body, null, 2));
    
    const { 
      rut, nombre, apellido, sucursales_ids, id_razon_social, id_centro_costo,
      id_empresa, id_jefe, codigo_empleado, numero_empleado, cargo, cargo_descripcion,
      direccion, nacionalidad, correo_electronico, fecha_nacimiento, fecha_ingreso, 
      fecha_termino, estado_civil, activo, discapacidad, telefono, descripcion,
      sueldo_base, monto_pensiones, propinas_promedio_12m, otros_descuentos_legales,
      total_ingresos, total_descuentos_legales, total_haberes, descuento_prestamo,
      descuento_sindicato
    } = req.body;
    
    // Validar datos requeridos
    if (!rut || !nombre || !apellido || !id_razon_social) {
      return res.status(400).json({ 
        success: false, 
        message: 'Datos incompletos. RUT, nombre, apellido y razón social son obligatorios' 
      });
    }
    
    // Validar y convertir id_razon_social a entero
    let razonSocialId;
    if (typeof id_razon_social === 'string') {
      razonSocialId = parseInt(id_razon_social, 10);
    } else {
      razonSocialId = id_razon_social;
    }
    
    if (isNaN(razonSocialId) || razonSocialId <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de razón social debe ser un número válido mayor a 0' 
      });
    }
    
    const pool = await poolPromise;
    
    // Verificar si ya existe un empleado con el mismo rut
    const checkResult = await pool.request()
      .input('rut', sql.VarChar, rut)
      .query('SELECT COUNT(*) as count FROM empleados WHERE rut = @rut');
    
    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ya existe un empleado con este RUT' 
      });
    }
    
    // Preparar fechas
    const now = new Date();
    let fechaNacimiento = null;
    let fechaIngreso = null;
    let fechaTermino = null;
    
    if (fecha_nacimiento) {
      fechaNacimiento = new Date(fecha_nacimiento);
      if (isNaN(fechaNacimiento.getTime())) {
        fechaNacimiento = null;
      }
    }
    
    if (fecha_ingreso) {
      fechaIngreso = new Date(fecha_ingreso);
      if (isNaN(fechaIngreso.getTime())) {
        fechaIngreso = new Date();
      }
    } else {
      fechaIngreso = new Date();
    }
    
    if (fecha_termino) {
      fechaTermino = new Date(fecha_termino);
      if (isNaN(fechaTermino.getTime())) {
        fechaTermino = null;
      }
    }
    
    // Convertir campos numéricos
    const parseNumeric = (value) => {
      if (value === undefined || value === null || value === '') return null;
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    };
    
    const parseInteger = (value) => {
      if (value === undefined || value === null || value === '') return null;
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? null : parsed;
    };
    
    // ✅ CREAR EMPLEADO CON TODOS LOS CAMPOS
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      // Detectar campos existentes en la tabla
      const empleadosFields = await pool.request().query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'empleados'
      `);
      
      const camposExistentes = empleadosFields.recordset.map(f => f.COLUMN_NAME);
      
      // Construir query dinámicamente según campos existentes
      let campos = ['rut', 'nombre', 'apellido', 'id_razon_social', 'created_at', 'updated_at'];
      let valores = ['@rut', '@nombre', '@apellido', '@id_razon_social', '@created_at', '@updated_at'];
      
      const camposOpcionales = [
        { campo: 'codigo_empleado', valor: codigo_empleado },
        { campo: 'numero_empleado', valor: numero_empleado },
        { campo: 'cargo', valor: cargo },
        { campo: 'cargo_descripcion', valor: cargo_descripcion },
        { campo: 'direccion', valor: direccion },
        { campo: 'nacionalidad', valor: nacionalidad },
        { campo: 'correo_electronico', valor: correo_electronico },
        { campo: 'fecha_nacimiento', valor: fechaNacimiento },
        { campo: 'fecha_ingreso', valor: fechaIngreso },
        { campo: 'fecha_termino', valor: fechaTermino },
        { campo: 'estado_civil', valor: estado_civil },
        { campo: 'activo', valor: activo !== undefined ? (activo ? 1 : 0) : 1 },
        { campo: 'discapacidad', valor: discapacidad !== undefined ? (discapacidad ? 1 : 0) : 0 },
        { campo: 'telefono', valor: telefono },
        { campo: 'descripcion', valor: descripcion },
        { campo: 'id_centro_costo', valor: parseInteger(id_centro_costo) },
        { campo: 'id_empresa', valor: parseInteger(id_empresa) },
        { campo: 'id_jefe', valor: parseInteger(id_jefe) },
        { campo: 'sueldo_base', valor: parseNumeric(sueldo_base) },
        { campo: 'monto_pensiones', valor: parseNumeric(monto_pensiones) },
        { campo: 'propinas_promedio_12m', valor: parseNumeric(propinas_promedio_12m) },
        { campo: 'otros_descuentos_legales', valor: parseNumeric(otros_descuentos_legales) },
        { campo: 'total_ingresos', valor: parseNumeric(total_ingresos) },
        { campo: 'total_descuentos_legales', valor: parseNumeric(total_descuentos_legales) },
        { campo: 'total_haberes', valor: parseNumeric(total_haberes) },
        { campo: 'descuento_prestamo', valor: parseNumeric(descuento_prestamo) },
        { campo: 'descuento_sindicato', valor: parseNumeric(descuento_sindicato) }
      ];
      
      // Agregar campos opcionales que existan en la tabla
      camposOpcionales.forEach(({ campo, valor }) => {
        if (camposExistentes.includes(campo)) {
          campos.push(campo);
          valores.push(`@${campo}`);
        }
      });
      
      const queryInsert = `
        INSERT INTO empleados (${campos.join(', ')})
        VALUES (${valores.join(', ')});
        SELECT SCOPE_IDENTITY() as id;
      `;
      
      // Preparar request con todos los parámetros
      const request = transaction.request()
        .input('rut', sql.VarChar, rut)
        .input('nombre', sql.VarChar, nombre)
        .input('apellido', sql.VarChar, apellido)
        .input('id_razon_social', sql.Int, razonSocialId)
        .input('created_at', sql.DateTime, now)
        .input('updated_at', sql.DateTime, now);
      
      // Agregar parámetros opcionales
      camposOpcionales.forEach(({ campo, valor }) => {
        if (camposExistentes.includes(campo)) {
          if (campo.includes('fecha') && valor) {
            request.input(campo, sql.Date, valor);
          } else if (campo === 'activo' || campo === 'discapacidad') {
            request.input(campo, sql.Bit, valor);
          } else if (campo.startsWith('id_') && valor) {
            request.input(campo, sql.Int, valor);
          } else if (campo.includes('sueldo') || campo.includes('monto') || campo.includes('total') || campo.includes('descuento') || campo.includes('propinas')) {
            request.input(campo, sql.Decimal(18, 2), valor);
          } else {
            request.input(campo, sql.VarChar, valor);
          }
        }
      });
      
      const result = await request.query(queryInsert);
      
      const nuevaId = result.recordset[0].id;
      console.log(`✅ Empleado creado con ID: ${nuevaId}`);
      
      // ✅ ASIGNAR SUCURSALES SI ESTÁN DISPONIBLES
      if (sucursales_ids && Array.isArray(sucursales_ids) && sucursales_ids.length > 0) {
        try {
          console.log('🏢 Intentando asignar sucursales:', sucursales_ids);
          
          // Verificar si la tabla empleados_sucursales existe
          await transaction.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'empleados_sucursales')
            CREATE TABLE empleados_sucursales (
              id INT IDENTITY(1,1) PRIMARY KEY,
              id_empleado INT NOT NULL,
              id_sucursal INT NOT NULL,
              created_at DATETIME DEFAULT GETDATE(),
              FOREIGN KEY (id_empleado) REFERENCES empleados(id),
              FOREIGN KEY (id_sucursal) REFERENCES sucursales(id)
            )
          `);
          
          for (const sucursalId of sucursales_ids) {
            const sucursalIdNum = parseInt(sucursalId);
            if (!isNaN(sucursalIdNum)) {
              await transaction.request()
                .input('id_empleado', sql.Int, nuevaId)
                .input('id_sucursal', sql.Int, sucursalIdNum)
                .query(`
                  INSERT INTO empleados_sucursales (id_empleado, id_sucursal, created_at)
                  VALUES (@id_empleado, @id_sucursal, GETDATE())
                `);
            }
          }
          
          console.log('✅ Sucursales asignadas correctamente');
        } catch (sucursalError) {
          console.warn('⚠️ No se pudieron asignar sucursales:', sucursalError.message);
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

// ✅ FUNCIÓN: Actualizar empleado - CON TODOS LOS CAMPOS
exports.updateEmpleado = async (req, res) => {
  try {
    console.log('🔄 === ACTUALIZANDO EMPLEADO ===');
    console.log('📨 Datos recibidos:', JSON.stringify(req.body, null, 2));
    console.log('🆔 ID:', req.params.id);
    
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de empleado debe ser un número válido' 
      });
    }
    
    const { 
      nombre, apellido, sucursales_ids, id_razon_social, id_centro_costo,
      id_empresa, id_jefe, codigo_empleado, numero_empleado, cargo, cargo_descripcion,
      direccion, nacionalidad, correo_electronico, fecha_nacimiento, fecha_ingreso, 
      fecha_termino, estado_civil, activo, discapacidad, telefono, descripcion,
      sueldo_base, monto_pensiones, propinas_promedio_12m, otros_descuentos_legales,
      total_ingresos, total_descuentos_legales, total_haberes, descuento_prestamo,
      descuento_sindicato
    } = req.body;

    // Validar datos básicos
    if (!nombre || !apellido) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nombre y apellido son obligatorios' 
      });
    }

    // Validar id_razon_social
    const razonSocialIdParsed = typeof id_razon_social === 'string'
      ? parseInt(id_razon_social, 10)
      : id_razon_social;

    if (isNaN(razonSocialIdParsed) || razonSocialIdParsed <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de razón social debe ser un número válido mayor a 0' 
      });
    }
    
    // Preparar fechas
    let fechaNacimientoValue = null;
    let fechaIngresoValue = null;
    let fechaTerminoValue = null;
    
    if (fecha_nacimiento) {
      fechaNacimientoValue = new Date(fecha_nacimiento);
      if (isNaN(fechaNacimientoValue.getTime())) {
        fechaNacimientoValue = null;
      }
    }
    
    if (fecha_ingreso) {
      fechaIngresoValue = new Date(fecha_ingreso);
      if (isNaN(fechaIngresoValue.getTime())) {
        fechaIngresoValue = new Date();
      }
    }
    
    if (fecha_termino) {
      fechaTerminoValue = new Date(fecha_termino);
      if (isNaN(fechaTerminoValue.getTime())) {
        fechaTerminoValue = null;
      }
    }
    
    // Convertir campos numéricos
    const parseNumeric = (value) => {
      if (value === undefined || value === null || value === '') return null;
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    };
    
    const parseInteger = (value) => {
      if (value === undefined || value === null || value === '') return null;
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? null : parsed;
    };
    
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

    // ✅ ACTUALIZAR EMPLEADO CON DETECCIÓN DE CAMPOS
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      // Detectar campos existentes
      const empleadosFields = await pool.request().query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'empleados'
      `);
      
      const camposExistentes = empleadosFields.recordset.map(f => f.COLUMN_NAME);
      
      // Construir update dinámicamente
      let setClauses = ['nombre = @nombre', 'apellido = @apellido', 'id_razon_social = @id_razon_social', 'updated_at = GETDATE()'];
      
      const camposOpcionales = [
        { campo: 'codigo_empleado', valor: codigo_empleado },
        { campo: 'numero_empleado', valor: numero_empleado },
        { campo: 'cargo', valor: cargo },
        { campo: 'cargo_descripcion', valor: cargo_descripcion },
        { campo: 'direccion', valor: direccion },
        { campo: 'nacionalidad', valor: nacionalidad },
        { campo: 'correo_electronico', valor: correo_electronico },
        { campo: 'fecha_nacimiento', valor: fechaNacimientoValue },
        { campo: 'fecha_ingreso', valor: fechaIngresoValue },
        { campo: 'fecha_termino', valor: fechaTerminoValue },
        { campo: 'estado_civil', valor: estado_civil },
        { campo: 'activo', valor: activo !== undefined ? (activo ? 1 : 0) : 1 },
        { campo: 'discapacidad', valor: discapacidad !== undefined ? (discapacidad ? 1 : 0) : 0 },
        { campo: 'telefono', valor: telefono },
        { campo: 'descripcion', valor: descripcion },
        { campo: 'id_centro_costo', valor: parseInteger(id_centro_costo) },
        { campo: 'id_empresa', valor: parseInteger(id_empresa) },
        { campo: 'id_jefe', valor: parseInteger(id_jefe) },
        { campo: 'sueldo_base', valor: parseNumeric(sueldo_base) },
        { campo: 'monto_pensiones', valor: parseNumeric(monto_pensiones) },
        { campo: 'propinas_promedio_12m', valor: parseNumeric(propinas_promedio_12m) },
        { campo: 'otros_descuentos_legales', valor: parseNumeric(otros_descuentos_legales) },
        { campo: 'total_ingresos', valor: parseNumeric(total_ingresos) },
        { campo: 'total_descuentos_legales', valor: parseNumeric(total_descuentos_legales) },
        { campo: 'total_haberes', valor: parseNumeric(total_haberes) },
        { campo: 'descuento_prestamo', valor: parseNumeric(descuento_prestamo) },
        { campo: 'descuento_sindicato', valor: parseNumeric(descuento_sindicato) }
      ];
      
      // Agregar SET clauses para campos existentes
      camposOpcionales.forEach(({ campo }) => {
        if (camposExistentes.includes(campo)) {
          setClauses.push(`${campo} = @${campo}`);
        }
      });
      
      const queryUpdate = `
        UPDATE empleados SET ${setClauses.join(', ')}
        WHERE id = @id
      `;
      
      // Preparar request
      const request = transaction.request()
        .input('id', sql.Int, id)
        .input('nombre', sql.NVarChar, nombre)
        .input('apellido', sql.NVarChar, apellido)
        .input('id_razon_social', sql.Int, razonSocialIdParsed);
      
      // Agregar parámetros opcionales
      camposOpcionales.forEach(({ campo, valor }) => {
        if (camposExistentes.includes(campo)) {
          if (campo.includes('fecha') && valor) {
            request.input(campo, sql.Date, valor);
          } else if (campo === 'activo' || campo === 'discapacidad') {
            request.input(campo, sql.Bit, valor);
          } else if (campo.startsWith('id_') && valor) {
            request.input(campo, sql.Int, valor);
          } else if (campo.includes('sueldo') || campo.includes('monto') || campo.includes('total') || campo.includes('descuento') || campo.includes('propinas')) {
            request.input(campo, sql.Decimal(18, 2), valor);
          } else {
            request.input(campo, sql.VarChar, valor);
          }
        }
      });
      
      await request.query(queryUpdate);

      // ✅ ACTUALIZAR SUCURSALES SI ESTÁN DISPONIBLES
      if (sucursales_ids && Array.isArray(sucursales_ids)) {
        try {
          console.log('🏢 Actualizando sucursales:', sucursales_ids);
          
          // Eliminar sucursales actuales
          await transaction.request()
            .input('id_empleado', sql.Int, id)
            .query('DELETE FROM empleados_sucursales WHERE id_empleado = @id_empleado');
          
          // Insertar nuevas sucursales
          for (const sucursalId of sucursales_ids) {
            const sucursalIdNum = parseInt(sucursalId);
            if (!isNaN(sucursalIdNum)) {
              await transaction.request()
                .input('id_empleado', sql.Int, id)
                .input('id_sucursal', sql.Int, sucursalIdNum)
                .query(`
                  INSERT INTO empleados_sucursales (id_empleado, id_sucursal, created_at)
                  VALUES (@id_empleado, @id_sucursal, GETDATE())
                `);
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

// ✅ RESTO DE FUNCIONES SIN CAMBIOS PERO IMPORTADAS COMPLETAS
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
    
    // Verificar que el empleado existe
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
      // Verificar si existe la tabla empleados_sucursales
      const tableCheck = await pool.request().query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'empleados_sucursales'
      `);
      
      if (tableCheck.recordset.length > 0) {
        console.log('🏢 Tabla empleados_sucursales encontrada, obteniendo sucursales...');
        
        // Detectar campos de sucursales
        const sucursalesFields = await pool.request().query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'sucursales'
        `);
        
        const camposSucursales = sucursalesFields.recordset.map(f => f.COLUMN_NAME);
        console.log('🏢 Campos disponibles en sucursales:', camposSucursales);
        
        // Construir query dinámicamente
        let selectFields = 's.id';
        
        // Agregar campo nombre
        if (camposSucursales.includes('nombre')) {
          selectFields += ', s.nombre';
        } else if (camposSucursales.includes('nombre_sucursal')) {
          selectFields += ', s.nombre_sucursal as nombre';
        }
        
        // Agregar campo tipo si existe
        if (camposSucursales.includes('tipo_sucursal')) {
          selectFields += ', s.tipo_sucursal';
        }
        
        const sucursalesResult = await pool.request()
          .input('id_empleado', sql.Int, id)
          .query(`
            SELECT ${selectFields}
            FROM empleados_sucursales es
            INNER JOIN sucursales s ON es.id_sucursal = s.id
            WHERE es.id_empleado = @id_empleado
            ORDER BY s.id
          `);
        
        console.log('🏢 Sucursales encontradas para empleado:', sucursalesResult.recordset.length);
        return res.json({ 
          success: true, 
          sucursales: sucursalesResult.recordset 
        });
      } else {
        console.warn('⚠️ Tabla empleados_sucursales no existe');
        return res.json({ 
          success: true, 
          sucursales: [] 
        });
      }
      
    } catch (error) {
      console.warn('⚠️ Error al obtener sucursales:', error.message);
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
    
    // Verificar que el empleado existe
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
      // Verificar si la tabla empleados_sucursales existe
      await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'empleados_sucursales')
        CREATE TABLE empleados_sucursales (
          id INT IDENTITY(1,1) PRIMARY KEY,
          id_empleado INT NOT NULL,
          id_sucursal INT NOT NULL,
          created_at DATETIME DEFAULT GETDATE(),
          FOREIGN KEY (id_empleado) REFERENCES empleados(id),
          FOREIGN KEY (id_sucursal) REFERENCES sucursales(id)
        )
      `);
      
      // Iniciar transacción
      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      
      try {
        // Eliminar sucursales actuales del empleado
        await transaction.request()
          .input('id_empleado', sql.Int, id)
          .query('DELETE FROM empleados_sucursales WHERE id_empleado = @id_empleado');
        
        // Insertar nuevas sucursales
        for (const sucursalId of sucursales_ids) {
          const sucursalIdNum = parseInt(sucursalId);
          if (!isNaN(sucursalIdNum)) {
            await transaction.request()
              .input('id_empleado', sql.Int, id)
              .input('id_sucursal', sql.Int, sucursalIdNum)
              .query(`
                INSERT INTO empleados_sucursales (id_empleado, id_sucursal, created_at)
                VALUES (@id_empleado, @id_sucursal, GETDATE())
              `);
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
      console.warn('⚠️ No se pudo actualizar sucursales, posible problema con tabla empleados_sucursales');
      return res.json({ 
        success: true, 
        message: 'Empleado actualizado (sin gestión de sucursales múltiples)' 
      });
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

exports.searchEmpleados = async (req, res) => {
  try {
    const query = req.query.query;
    const showInactive = req.query.showInactive === 'true';
    
    console.log('🔍 searchEmpleados - query:', query, 'showInactive:', showInactive);
    
    if (!query || query.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requiere un término de búsqueda' 
      });
    }
    
    const pool = await poolPromise;
    
    let sqlQuery = `
      SELECT 
        e.id,
        e.rut,
        e.nombre,
        e.apellido,
        e.cargo,
        e.activo
    `;
    
    // Detectar campos opcionales
    const empleadosFields = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'empleados'
    `);
    
    const camposExistentes = empleadosFields.recordset.map(f => f.COLUMN_NAME);
    const camposOpcionales = [
      'codigo_empleado', 'numero_empleado', 'direccion', 'nacionalidad', 
      'correo_electronico', 'telefono', 'estado_civil', 'discapacidad', 
      'id_razon_social', 'id_sucursal', 'sueldo_base', 'fecha_ingreso'
    ];
    
    camposOpcionales.forEach(campo => {
      if (camposExistentes.includes(campo)) {
        sqlQuery += `,\n        e.${campo}`;
      }
    });
    
    sqlQuery += `
      FROM empleados e
      WHERE (e.rut LIKE @query OR e.nombre LIKE @query OR e.apellido LIKE @query`;
    
    // Agregar campos de búsqueda opcionales
    if (camposExistentes.includes('cargo')) {
      sqlQuery += ' OR e.cargo LIKE @query';
    }
    if (camposExistentes.includes('telefono')) {
      sqlQuery += ' OR e.telefono LIKE @query';
    }
    if (camposExistentes.includes('correo_electronico')) {
      sqlQuery += ' OR e.correo_electronico LIKE @query';
    }
    if (camposExistentes.includes('codigo_empleado')) {
      sqlQuery += ' OR e.codigo_empleado LIKE @query';
    }
    if (camposExistentes.includes('numero_empleado')) {
      sqlQuery += ' OR e.numero_empleado LIKE @query';
    }
    
    sqlQuery += ')';
    
    // Aplicar filtro de activos en búsqueda
    if (!showInactive && camposExistentes.includes('activo')) {
      sqlQuery += ' AND e.activo = 1';
      console.log('🔍 Búsqueda: solo empleados activos');
    } else {
      console.log('🔍 Búsqueda: todos los empleados');
    }
    
    sqlQuery += ' ORDER BY e.nombre, e.apellido';
    
    const result = await pool.request()
      .input('query', sql.VarChar, `%${query}%`)
      .query(sqlQuery);
    
    console.log('🔍 Resultados de búsqueda:', result.recordset.length);
    
    return res.json({ success: true, empleados: result.recordset });
    
  } catch (error) {
    console.error('❌ Error al buscar empleados:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

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
    
    // Eliminar empleado y relaciones
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      // Eliminar primero las relaciones con sucursales (si existen)
      try {
        await transaction.request()
          .input('id', sql.Int, id)
          .query('DELETE FROM empleados_sucursales WHERE id_empleado = @id');
      } catch (error) {
        console.warn('⚠️ No se pudo eliminar de empleados_sucursales (tabla no existe)');
      }
      
      // Luego eliminar el empleado
      await transaction.request()
        .input('id', sql.Int, id)
        .query('DELETE FROM empleados WHERE id = @id');
      
      await transaction.commit();
      
      console.log(`✅ Empleado con ID ${id} eliminado permanentemente`);
      
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
    
    await pool.request()
      .input('id', sql.Int, id)
      .input('discapacidad', sql.Bit, discapacidad ? 1 : 0)
      .query('UPDATE empleados SET discapacidad = @discapacidad, updated_at = GETDATE() WHERE id = @id');
    
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

exports.getEmpleadosStats = async (req, res) => {
  try {
    const pool = await poolPromise;
    
    const estadoResult = await pool.request()
      .query(`
        SELECT 
          SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos,
          SUM(CASE WHEN activo = 0 THEN 1 ELSE 0 END) as inactivos,
          COUNT(*) as total
        FROM empleados
      `);
    
    const discapacidadResult = await pool.request()
      .query(`
        SELECT 
          SUM(CASE WHEN discapacidad = 1 THEN 1 ELSE 0 END) as con_discapacidad,
          SUM(CASE WHEN discapacidad = 0 THEN 1 ELSE 0 END) as sin_discapacidad
        FROM empleados
      `);
    
    return res.json({ 
      success: true, 
      estadisticas: {
        por_estado: estadoResult.recordset[0],
        por_discapacidad: discapacidadResult.recordset[0]
      }
    });
  } catch (error) {
    console.error('❌ Error al obtener estadísticas de empleados:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

exports.getEmpleadosBySucursal = async (req, res) => {
  try {
    const idSucursal = parseInt(req.params.id_sucursal);
    
    if (isNaN(idSucursal)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de sucursal debe ser un número válido' 
      });
    }
    
    const pool = await poolPromise;
    
    // Obtener empleados de la sucursal (compatibilidad con ambos sistemas)
    const empleadosResult = await pool.request()
      .input('id_sucursal', sql.Int, idSucursal)
      .query(`
        SELECT DISTINCT
          e.id,
          e.rut,
          e.nombre,
          e.apellido,
          e.cargo,
          e.correo_electronico,
          e.telefono,
          e.activo,
          e.discapacidad,
          e.fecha_ingreso
        FROM empleados e
        WHERE e.id_sucursal = @id_sucursal
        ORDER BY e.nombre, e.apellido
      `);
    
    return res.json({ 
      success: true, 
      empleados: empleadosResult.recordset 
    });
  } catch (error) {
    console.error('❌ Error al obtener empleados por sucursal:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

exports.importEmpleadosFromExcel = async (req, res) => {
  try {
    return res.status(501).json({
      success: false,
      message: 'Funcionalidad de importación desde Excel no implementada aún'
    });
  } catch (error) {
    console.error('❌ Error en importación de empleados:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

exports.validateRut = async (req, res) => {
  try {
    const { rut } = req.body;
    
    if (!rut) {
      return res.status(400).json({
        success: false,
        message: 'RUT es requerido'
      });
    }
    
    // Validación básica de RUT
    const validarRutChileno = (rut) => {
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
    
    const esValido = validarRutChileno(rut);
    
    // Si es válido, verificar si ya existe en la base de datos
    let existeEnBD = false;
    if (esValido) {
      try {
        const pool = await poolPromise;
        const checkResult = await pool.request()
          .input('rut', sql.VarChar, rut)
          .query('SELECT COUNT(*) as count FROM empleados WHERE rut = @rut');
        
        existeEnBD = checkResult.recordset[0].count > 0;
      } catch (error) {
        console.warn('⚠️ No se pudo verificar existencia del RUT en BD');
      }
    }
    
    return res.json({
      success: true,
      valido: esValido,
      existe: existeEnBD,
      message: esValido 
        ? (existeEnBD ? 'RUT válido pero ya existe en la base de datos' : 'RUT válido')
        : 'RUT inválido'
    });
    
  } catch (error) {
    console.error('❌ Error al validar RUT:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
};