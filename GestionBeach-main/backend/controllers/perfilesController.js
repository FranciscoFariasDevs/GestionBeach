// backend/controllers/perfilesController.js - VERSIÓN COMPLETA Y FUNCIONAL
const { sql, poolPromise } = require('../config/db');

// Registro central de módulos - ÚNICA FUENTE DE VERDAD
const modulosConfig = require('../config/modulosConfig');
const modulosDelSistema = modulosConfig.map(m => m.nombre);

// Verificar estructura completa de BD incluyendo permisos_usuario
const verificarEstructuraBD = async () => {
  try {
    const pool = await poolPromise;
    
    console.log('🔍 Verificando estructura completa de BD...');
    
    // Verificar tablas existentes
    const tablasResult = await pool.request()
      .query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE' 
        AND TABLE_NAME IN ('perfiles', 'modulos', 'perfil_modulo', 'permisos_usuario', 'usuarios')
        ORDER BY TABLE_NAME
      `);
    
    const tablas = tablasResult.recordset.map(row => row.TABLE_NAME);
    console.log('📋 Tablas encontradas:', tablas);
    
    // Verificar si modulos tiene IDENTITY
    const identityResult = await pool.request()
      .query(`
        SELECT COLUMNPROPERTY(OBJECT_ID('modulos'), 'id', 'IsIdentity') as IsIdentity
      `);
    
    const tieneIdentity = identityResult.recordset[0]?.IsIdentity === 1;
    console.log('🔑 Tabla modulos tiene IDENTITY:', tieneIdentity);
    
    if (!tieneIdentity) {
      console.warn('⚠️ La tabla modulos NO tiene IDENTITY configurado. Ejecuta el script SQL primero.');
    }
    
    return { tablas, tieneIdentity };
    
  } catch (error) {
    console.error('❌ Error verificando estructura BD:', error.message);
    return { tablas: [], tieneIdentity: false };
  }
};

// Función para sincronizar módulos básicos en la BD
const sincronizarModulos = async () => {
  try {
    const { tieneIdentity } = await verificarEstructuraBD();
    
    if (!tieneIdentity) {
      console.error('❌ La tabla modulos no tiene IDENTITY. Ejecuta el script SQL primero.');
      return false;
    }
    
    const pool = await poolPromise;
    
    console.log('🔄 Sincronizando módulos del sistema...');
    
    for (const nombreModulo of modulosDelSistema) {
      try {
        // Verificar si el módulo existe
        const existeResult = await pool.request()
          .input('nombre', sql.VarChar, nombreModulo)
          .query('SELECT id FROM modulos WHERE nombre = @nombre');
        
        if (existeResult.recordset.length === 0) {
          // Verificar columnas disponibles
          const columnsCheck = await pool.request()
            .query(`
              SELECT COLUMN_NAME
              FROM INFORMATION_SCHEMA.COLUMNS
              WHERE TABLE_NAME = 'modulos'
            `);

          const columnas = columnsCheck.recordset.map(r => r.COLUMN_NAME.toLowerCase());
          const tieneRuta = columnas.includes('ruta');
          const tieneIcono = columnas.includes('icono');

          // Insertar con columnas adaptativas
          if (tieneRuta && tieneIcono) {
            await pool.request()
              .input('nombre', sql.VarChar, nombreModulo)
              .input('descripcion', sql.VarChar, `Módulo: ${nombreModulo}`)
              .input('ruta', sql.VarChar, `/${nombreModulo.toLowerCase().replace(/\s+/g, '-')}`)
              .input('icono', sql.VarChar, 'extension')
              .query(`
                INSERT INTO modulos (nombre, descripcion, ruta, icono)
                VALUES (@nombre, @descripcion, @ruta, @icono)
              `);
          } else {
            await pool.request()
              .input('nombre', sql.VarChar, nombreModulo)
              .input('descripcion', sql.VarChar, `Módulo: ${nombreModulo}`)
              .query(`
                INSERT INTO modulos (nombre, descripcion)
                VALUES (@nombre, @descripcion)
              `);
          }
          console.log(`✅ Módulo "${nombreModulo}" creado`);
        }
      } catch (error) {
        console.warn(`⚠️ Error creando módulo "${nombreModulo}":`, error.message);
      }
    }
    
    console.log('✅ Sincronización de módulos completada');
    return true;
  } catch (error) {
    console.error('❌ Error en sincronización de módulos:', error.message);
    return false;
  }
};

// OBTENER TODOS LOS MÓDULOS DISPONIBLES (para el selector)
exports.getModulosDisponibles = async (req, res) => {
  try {
    const sincronizado = await sincronizarModulos();
    
    if (!sincronizado) {
      throw new Error('No se pudieron sincronizar los módulos');
    }
    
    const pool = await poolPromise;
    
    // Obtener módulos de la BD
    const result = await pool.request()
      .query(`
        SELECT id, nombre, 
               COALESCE(descripcion, nombre) as descripcion,
               COALESCE(ruta, '') as ruta,
               COALESCE(icono, 'extension') as icono
        FROM modulos 
        ORDER BY nombre
      `);
    
    // Enriquecer con claves del config central
    const clavesMap = {};
    modulosConfig.forEach(c => { clavesMap[c.nombre] = c.claves; });

    const modulosConClaves = result.recordset.map(m => ({
      ...m,
      claves: clavesMap[m.nombre] || []
    }));

    console.log(`✅ ${modulosConClaves.length} módulos disponibles para perfiles`);
    res.status(200).json(modulosConClaves);

  } catch (error) {
    console.error('❌ Error al obtener módulos:', error);

    // Fallback: devolver lista predefinida con claves
    const modulosFallback = modulosConfig.map((m, index) => ({
      id: index + 1,
      nombre: m.nombre,
      descripcion: `Módulo: ${m.nombre}`,
      ruta: `/${m.nombre.toLowerCase().replace(/\s+/g, '-')}`,
      icono: 'extension',
      claves: m.claves
    }));

    console.log('📋 Devolviendo módulos predefinidos como fallback');
    res.status(200).json(modulosFallback);
  }
};

// OBTENER TODOS LOS PERFILES
exports.getAllPerfiles = async (req, res) => {
  try {
    const pool = await poolPromise;
    
    const result = await pool.request()
      .query(`SELECT id, nombre FROM perfiles ORDER BY id`);
    
    console.log(`✅ ${result.recordset.length} perfiles cargados`);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('❌ Error al obtener perfiles:', error);
    res.status(500).json({ 
      message: 'Error al obtener perfiles', 
      error: error.message 
    });
  }
};

// OBTENER UN PERFIL POR ID CON SUS MÓDULOS Y SUCURSALES
exports.getPerfilById = async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await poolPromise;

    // Obtener perfil
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`SELECT id, nombre FROM perfiles WHERE id = @id`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Perfil no encontrado' });
    }

    const perfil = result.recordset[0];

    // Obtener módulos del perfil
    try {
      const modulosResult = await pool.request()
        .input('perfilId', sql.Int, id)
        .query(`
          SELECT m.id, m.nombre, m.descripcion
          FROM modulos m
          INNER JOIN perfil_modulo pm ON pm.modulo_id = m.id
          WHERE pm.perfil_id = @perfilId
          ORDER BY m.nombre
        `);

      perfil.modulos = modulosResult.recordset.map(row => row.nombre);
      perfil.moduloIds = modulosResult.recordset.map(row => row.id);

      console.log(`✅ Perfil ${id} cargado con ${perfil.modulos.length} módulos`);
    } catch (error) {
      console.warn('⚠️ Error obteniendo módulos del perfil:', error.message);
      perfil.modulos = [];
      perfil.moduloIds = [];
    }

    // Obtener sucursales del perfil
    try {
      const sucursalesResult = await pool.request()
        .input('perfilId', sql.Int, id)
        .query(`
          SELECT s.id, s.nombre, s.tipo_sucursal
          FROM sucursales s
          INNER JOIN perfil_sucursal ps ON ps.sucursal_id = s.id
          WHERE ps.perfil_id = @perfilId
          ORDER BY s.nombre
        `);

      perfil.sucursales = sucursalesResult.recordset.map(row => row.id);
      perfil.sucursalesDetalle = sucursalesResult.recordset;

      console.log(`✅ Perfil ${id} tiene ${perfil.sucursales.length} sucursales asignadas`);
    } catch (error) {
      console.warn('⚠️ Error obteniendo sucursales del perfil:', error.message);
      perfil.sucursales = [];
      perfil.sucursalesDetalle = [];
    }

    res.status(200).json(perfil);
  } catch (error) {
    console.error('❌ Error al obtener perfil:', error);
    res.status(500).json({
      message: 'Error al obtener perfil',
      error: error.message
    });
  }
};

// CREAR UN NUEVO PERFIL - VERSIÓN OPTIMIZADA
exports.createPerfil = async (req, res) => {
  let transaction;

  try {
    const { nombre, modulos, sucursales } = req.body;

    console.log('🔄 === CREANDO PERFIL ===');
    console.log('📝 Nombre:', nombre);
    console.log('📝 Módulos recibidos:', modulos);
    console.log('📝 Sucursales recibidas:', sucursales);

    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({
        message: 'El nombre del perfil es requerido'
      });
    }

    await sincronizarModulos();

    const pool = await poolPromise;

    // Verificar nombre único
    const checkNombre = await pool.request()
      .input('nombre', sql.VarChar, nombre.trim())
      .query('SELECT id FROM perfiles WHERE nombre = @nombre');

    if (checkNombre.recordset.length > 0) {
      return res.status(400).json({ message: 'Ya existe un perfil con ese nombre' });
    }

    // Iniciar transacción
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Crear el perfil
    const insertResult = await transaction.request()
      .input('nombre', sql.VarChar, nombre.trim())
      .input('descripcion', sql.VarChar, `Perfil: ${nombre.trim()}`)
      .input('activo', sql.Bit, 1)
      .query(`
        INSERT INTO perfiles (nombre, descripcion, activo, fecha_creacion)
        VALUES (@nombre, @descripcion, @activo, GETDATE());
        SELECT SCOPE_IDENTITY() AS id;
      `);

    const perfilId = insertResult.recordset[0].id;
    console.log(`✅ Perfil creado con ID: ${perfilId}`);

    // Asignar módulos - VERSIÓN OPTIMIZADA
    const modulosAsignados = [];
    const modulosNoEncontrados = [];

    if (Array.isArray(modulos) && modulos.length > 0) {
      console.log(`🔄 Asignando ${modulos.length} módulos...`);

      // Obtener TODOS los módulos de la BD de una vez
      const todosModulosResult = await pool.request()
        .query('SELECT id, nombre FROM modulos');

      const modulosMap = {};
      todosModulosResult.recordset.forEach(m => {
        modulosMap[m.nombre.trim()] = m.id;
      });

      console.log(`📊 Módulos disponibles en BD:`, Object.keys(modulosMap));

      // Construir VALUES para INSERT masivo
      const valuesToInsert = [];

      for (const nombreModulo of modulos) {
        const nombreTrimmed = nombreModulo.trim();
        const moduloId = modulosMap[nombreTrimmed];

        if (moduloId) {
          valuesToInsert.push(`(${perfilId}, ${moduloId})`);
          modulosAsignados.push(nombreTrimmed);
          console.log(`✅ Módulo "${nombreTrimmed}" (ID=${moduloId}) preparado`);
        } else {
          console.warn(`⚠️ Módulo "${nombreTrimmed}" NO ENCONTRADO`);
          modulosNoEncontrados.push(nombreTrimmed);
        }
      }

      // INSERT masivo de todos los módulos de una vez
      if (valuesToInsert.length > 0) {
        const insertQuery = `
          INSERT INTO perfil_modulo (perfil_id, modulo_id)
          VALUES ${valuesToInsert.join(', ')}
        `;

        await transaction.request().query(insertQuery);
        console.log(`✅ ${valuesToInsert.length} módulos insertados correctamente`);
      }

      if (modulosNoEncontrados.length > 0) {
        console.warn(`⚠️ === MÓDULOS NO ENCONTRADOS (${modulosNoEncontrados.length}) ===`);
        console.warn(`📋 Lista:`, modulosNoEncontrados);
      }
    }

    // Asignar sucursales
    const sucursalesAsignadas = [];

    if (Array.isArray(sucursales) && sucursales.length > 0) {
      console.log(`🔄 Asignando ${sucursales.length} sucursales...`);

      // Construir VALUES para INSERT masivo de sucursales
      const sucursalesToInsert = [];

      for (const sucursalId of sucursales) {
        if (sucursalId) {
          sucursalesToInsert.push(`(${perfilId}, ${sucursalId})`);
          sucursalesAsignadas.push(sucursalId);
          console.log(`✅ Sucursal ID=${sucursalId} preparada`);
        }
      }

      // INSERT masivo de sucursales
      if (sucursalesToInsert.length > 0) {
        const insertSucursalesQuery = `
          INSERT INTO perfil_sucursal (perfil_id, sucursal_id)
          VALUES ${sucursalesToInsert.join(', ')}
        `;

        await transaction.request().query(insertSucursalesQuery);
        console.log(`✅ ${sucursalesToInsert.length} sucursales insertadas correctamente`);
      }
    }

    // Confirmar transacción
    await transaction.commit();

    const resultado = {
      id: perfilId,
      nombre: nombre.trim(),
      modulos: modulosAsignados,
      totalModulosAsignados: modulosAsignados.length,
      sucursales: sucursalesAsignadas,
      totalSucursalesAsignadas: sucursalesAsignadas.length
    };

    console.log('✅ === PERFIL CREADO EXITOSAMENTE ===');
    console.log(`📊 Total: ${modulosAsignados.length}/${modulos ? modulos.length : 0} módulos asignados`);
    console.log(`📊 Total: ${sucursalesAsignadas.length}/${sucursales ? sucursales.length : 0} sucursales asignadas`);

    res.status(201).json(resultado);

  } catch (error) {
    // Rollback en caso de error
    if (transaction) {
      try {
        await transaction.rollback();
        console.log('🔄 Transacción revertida');
      } catch (rollbackError) {
        console.error('❌ Error en rollback:', rollbackError.message);
      }
    }

    console.error('❌ === ERROR CREANDO PERFIL ===');
    console.error('💥 Error completo:', error);

    res.status(500).json({
      message: 'Error al crear perfil',
      error: error.message
    });
  }
};

// ACTUALIZAR UN PERFIL - VERSIÓN OPTIMIZADA
exports.updatePerfil = async (req, res) => {
  let transaction;

  try {
    const { id } = req.params;
    const { nombre, modulos, sucursales } = req.body;

    console.log('🔄 === ACTUALIZANDO PERFIL ===');
    console.log('📝 ID:', id);
    console.log('📝 Nombre:', nombre);
    console.log('📝 Módulos recibidos:', modulos);
    console.log('📝 Sucursales recibidas:', sucursales);

    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({
        message: 'El nombre del perfil es requerido'
      });
    }

    const pool = await poolPromise;

    // Verificar que el perfil existe
    const checkPerfil = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id, nombre FROM perfiles WHERE id = @id');

    if (checkPerfil.recordset.length === 0) {
      return res.status(404).json({ message: 'Perfil no encontrado' });
    }

    // Verificar nombre único (excepto el mismo perfil)
    const checkNombre = await pool.request()
      .input('nombre', sql.VarChar, nombre.trim())
      .input('id', sql.Int, id)
      .query('SELECT id FROM perfiles WHERE nombre = @nombre AND id != @id');

    if (checkNombre.recordset.length > 0) {
      return res.status(400).json({ message: 'Ya existe un perfil con ese nombre' });
    }

    // Iniciar transacción
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Actualizar nombre del perfil
    await transaction.request()
      .input('id', sql.Int, id)
      .input('nombre', sql.VarChar, nombre.trim())
      .query('UPDATE perfiles SET nombre = @nombre WHERE id = @id');

    console.log(`✅ Nombre del perfil ${id} actualizado`);

    // Eliminar módulos existentes
    await transaction.request()
      .input('perfilId', sql.Int, id)
      .query('DELETE FROM perfil_modulo WHERE perfil_id = @perfilId');

    console.log(`🗑️ Módulos anteriores eliminados`);

    // Eliminar sucursales existentes
    await transaction.request()
      .input('perfilId', sql.Int, id)
      .query('DELETE FROM perfil_sucursal WHERE perfil_id = @perfilId');

    console.log(`🗑️ Sucursales anteriores eliminadas`);

    // Asignar nuevos módulos - VERSIÓN OPTIMIZADA
    const modulosAsignados = [];
    const modulosNoEncontrados = [];

    if (Array.isArray(modulos) && modulos.length > 0) {
      console.log(`🔄 Reasignando ${modulos.length} módulos...`);

      // Obtener TODOS los módulos de la BD de una vez
      const todosModulosResult = await pool.request()
        .query('SELECT id, nombre FROM modulos');

      const modulosMap = {};
      todosModulosResult.recordset.forEach(m => {
        modulosMap[m.nombre.trim()] = m.id;
      });

      console.log(`📊 Módulos disponibles en BD:`, Object.keys(modulosMap));

      // Construir VALUES para INSERT masivo
      const valuesToInsert = [];

      for (const nombreModulo of modulos) {
        const nombreTrimmed = nombreModulo.trim();
        const moduloId = modulosMap[nombreTrimmed];

        if (moduloId) {
          valuesToInsert.push(`(${id}, ${moduloId})`);
          modulosAsignados.push(nombreTrimmed);
          console.log(`✅ Módulo "${nombreTrimmed}" (ID=${moduloId}) preparado`);
        } else {
          console.warn(`⚠️ Módulo "${nombreTrimmed}" NO ENCONTRADO`);
          modulosNoEncontrados.push(nombreTrimmed);
        }
      }

      // INSERT masivo de todos los módulos de una vez
      if (valuesToInsert.length > 0) {
        const insertQuery = `
          INSERT INTO perfil_modulo (perfil_id, modulo_id)
          VALUES ${valuesToInsert.join(', ')}
        `;

        await transaction.request().query(insertQuery);
        console.log(`✅ ${valuesToInsert.length} módulos insertados correctamente`);
      }

      if (modulosNoEncontrados.length > 0) {
        console.warn(`⚠️ === MÓDULOS NO ENCONTRADOS (${modulosNoEncontrados.length}) ===`);
        console.warn(`📋 Lista:`, modulosNoEncontrados);
      }
    }

    // Asignar nuevas sucursales
    const sucursalesAsignadas = [];

    if (Array.isArray(sucursales) && sucursales.length > 0) {
      console.log(`🔄 Reasignando ${sucursales.length} sucursales...`);

      // Construir VALUES para INSERT masivo de sucursales
      const sucursalesToInsert = [];

      for (const sucursalId of sucursales) {
        if (sucursalId) {
          sucursalesToInsert.push(`(${id}, ${sucursalId})`);
          sucursalesAsignadas.push(sucursalId);
          console.log(`✅ Sucursal ID=${sucursalId} preparada`);
        }
      }

      // INSERT masivo de sucursales
      if (sucursalesToInsert.length > 0) {
        const insertSucursalesQuery = `
          INSERT INTO perfil_sucursal (perfil_id, sucursal_id)
          VALUES ${sucursalesToInsert.join(', ')}
        `;

        await transaction.request().query(insertSucursalesQuery);
        console.log(`✅ ${sucursalesToInsert.length} sucursales insertadas correctamente`);
      }
    }

    // Confirmar transacción
    await transaction.commit();

    const resultado = {
      id: parseInt(id),
      nombre: nombre.trim(),
      modulos: modulosAsignados,
      totalModulosAsignados: modulosAsignados.length,
      sucursales: sucursalesAsignadas,
      totalSucursalesAsignadas: sucursalesAsignadas.length
    };

    console.log('✅ === PERFIL ACTUALIZADO EXITOSAMENTE ===');
    console.log(`📊 Total: ${modulosAsignados.length}/${modulos ? modulos.length : 0} módulos asignados`);
    console.log(`📊 Total: ${sucursalesAsignadas.length}/${sucursales ? sucursales.length : 0} sucursales asignadas`);
    res.status(200).json(resultado);
    
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('Error en rollback:', rollbackError.message);
      }
    }
    
    console.error('❌ Error al actualizar perfil:', error);
    res.status(500).json({ 
      message: 'Error al actualizar perfil', 
      error: error.message 
    });
  }
};

// ELIMINAR UN PERFIL
exports.deletePerfil = async (req, res) => {
  let transaction;
  
  try {
    const { id } = req.params;
    
    const pool = await poolPromise;
    
    // Verificar que el perfil existe
    const checkPerfil = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id, nombre FROM perfiles WHERE id = @id');
    
    if (checkPerfil.recordset.length === 0) {
      return res.status(404).json({ message: 'Perfil no encontrado' });
    }
    
    const perfilNombre = checkPerfil.recordset[0].nombre;
    
    // Verificar si hay usuarios con este perfil
    try {
      const usersResult = await pool.request()
        .input('perfilId', sql.Int, id)
        .query('SELECT COUNT(*) as count FROM usuarios WHERE perfil_id = @perfilId');
      
      if (usersResult.recordset[0].count > 0) {
        return res.status(400).json({ 
          message: 'No se puede eliminar el perfil porque hay usuarios asociados a él' 
        });
      }
    } catch (error) {
      console.log('⚠️ No se pudo verificar usuarios asociados');
    }
    
    // Iniciar transacción
    transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    // Eliminar asociaciones de módulos
    await transaction.request()
      .input('perfilId', sql.Int, id)
      .query('DELETE FROM perfil_modulo WHERE perfil_id = @perfilId');
    
    // Eliminar el perfil
    await transaction.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM perfiles WHERE id = @id');
    
    // Confirmar transacción
    await transaction.commit();
    
    console.log(`✅ Perfil "${perfilNombre}" eliminado`);
    res.status(200).json({ message: 'Perfil eliminado correctamente' });
    
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('Error en rollback:', rollbackError.message);
      }
    }
    
    console.error('❌ Error al eliminar perfil:', error);
    res.status(500).json({ 
      message: 'Error al eliminar perfil', 
      error: error.message 
    });
  }
};

// ENDPOINT PARA SINCRONIZACIÓN MANUAL DE MÓDULOS
exports.sincronizarModulos = async (req, res) => {
  try {
    console.log('🔄 === SINCRONIZACIÓN MANUAL DE MÓDULOS SOLICITADA ===');

    const resultado = await sincronizarModulos();

    if (resultado) {
      const pool = await poolPromise;
      const modulosResult = await pool.request()
        .query('SELECT COUNT(*) as total FROM modulos');

      const total = modulosResult.recordset[0].total;

      res.status(200).json({
        success: true,
        message: 'Módulos sincronizados correctamente',
        totalModulos: total,
        modulosSistema: modulosDelSistema.length
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error al sincronizar módulos. Verifica que la tabla modulos tenga IDENTITY configurado.'
      });
    }
  } catch (error) {
    console.error('❌ Error en sincronización manual:', error);
    res.status(500).json({
      success: false,
      message: 'Error al sincronizar módulos',
      error: error.message
    });
  }
};

// ENDPOINT DE DEBUG PARA VERIFICAR EL ESTADO
exports.getDebugPerfiles = async (req, res) => {
  try {
    const pool = await poolPromise;
    
    console.log('🔍 === DEBUG PERFILES SOLICITADO ===');
    
    // Verificar conexión
    const testConnection = await pool.request()
      .query('SELECT GETDATE() as timestamp, @@VERSION as version');
    
    // Obtener perfiles
    const perfilesResult = await pool.request()
      .query('SELECT id, nombre, descripcion, activo FROM perfiles ORDER BY id');
    
    // Obtener módulos
    const modulosResult = await pool.request()
      .query('SELECT id, nombre, descripcion FROM modulos ORDER BY id');
    
    // Obtener relaciones
    const relacionesResult = await pool.request()
      .query(`
        SELECT pm.perfil_id, pm.modulo_id, p.nombre as perfil_nombre, m.nombre as modulo_nombre
        FROM perfil_modulo pm
        INNER JOIN perfiles p ON pm.perfil_id = p.id
        INNER JOIN modulos m ON pm.modulo_id = m.id
        ORDER BY pm.perfil_id, pm.modulo_id
      `);
    
    // Verificar estructura de tablas
    const estructuraResult = await pool.request()
      .query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE' 
        AND TABLE_NAME IN ('perfiles', 'modulos', 'perfil_modulo', 'permisos_usuario', 'usuarios')
        ORDER BY TABLE_NAME
      `);
    
    const debugInfo = {
      timestamp: testConnection.recordset[0].timestamp,
      version: testConnection.recordset[0].version.substring(0, 50) + '...',
      tablas: estructuraResult.recordset.map(row => row.TABLE_NAME),
      perfiles: {
        total: perfilesResult.recordset.length,
        data: perfilesResult.recordset
      },
      modulos: {
        total: modulosResult.recordset.length,
        data: modulosResult.recordset
      },
      relaciones: {
        total: relacionesResult.recordset.length,
        data: relacionesResult.recordset
      }
    };
    
    console.log('📊 Debug Info:', debugInfo);
    res.json(debugInfo);
    
  } catch (error) {
    console.error('❌ Error en debug perfiles:', error);
    res.status(500).json({ 
      message: 'Error al obtener información de debug', 
      error: error.message,
      stack: error.stack
    });
  }
};