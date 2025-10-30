// backend/controllers/modulosController.js - AJUSTADO A TU ESTRUCTURA DE BD
const { sql, poolPromise } = require('../config/db');

// Lista de pantallas/módulos del dashboard - SINCRONIZADA CON DASHBOARDLAYOUT
const pantallasDashboard = [
  { id: 1, nombre: 'Dashboard', descripcion: 'Panel principal del sistema', ruta: '/dashboard', icono: 'dashboard' },
  { id: 2, nombre: 'Estado Resultado', descripcion: 'Estados financieros del holding', ruta: '/estado-resultado', icono: 'assessment' },
  { id: 3, nombre: 'Monitoreo', descripcion: 'Monitoreo de sucursales', ruta: '/monitoreo', icono: 'monitor_heart' },
  { id: 4, nombre: 'Remuneraciones', descripcion: 'Gestión de nóminas y pagos', ruta: '/remuneraciones', icono: 'attach_money' },
  { id: 5, nombre: 'Inventario', descripcion: 'Sistema de inventarios', ruta: '/inventario', icono: 'inventory_2' },
  { id: 6, nombre: 'Ventas', descripcion: 'Gestión de ventas', ruta: '/ventas', icono: 'shopping_cart' },
  { id: 7, nombre: 'Productos', descripcion: 'Catálogo de productos', ruta: '/productos', icono: 'trending_up' },
  { id: 8, nombre: 'Supermercados', descripcion: 'Productos - Supermercados', ruta: '/productos/supermercados', icono: 'store' },
  { id: 9, nombre: 'Ferreterías', descripcion: 'Productos - Ferreterías', ruta: '/productos/ferreterias', icono: 'store' },
  { id: 10, nombre: 'Multitiendas', descripcion: 'Productos - Multitiendas', ruta: '/productos/multitiendas', icono: 'store' },
  { id: 11, nombre: 'Compras', descripcion: 'Gestión de compras', ruta: '/compras', icono: 'shopping_bag' },
  { id: 12, nombre: 'Centros de Costos', descripcion: 'Gestión de Centros de Costos', ruta: '/compras/centros-costos', icono: 'business_center' },
  { id: 13, nombre: 'Facturas XML', descripcion: 'Gestión de Facturas XML', ruta: '/compras/facturas-xml', icono: 'receipt' },
  { id: 14, nombre: 'Tarjeta Empleado', descripcion: 'Gestión de tarjetas de empleado', ruta: '/tarjeta-empleado', icono: 'badge' },
  { id: 15, nombre: 'Empleados', descripcion: 'Recursos humanos', ruta: '/empleados', icono: 'people' },
  { id: 16, nombre: 'Cabañas', descripcion: 'Gestión de Cabañas y Reservas', ruta: '/admin/cabanas', icono: 'cottage' },
  { id: 17, nombre: 'Usuarios', descripcion: 'Gestión de usuarios', ruta: '/usuarios', icono: 'person' },
  { id: 18, nombre: 'Perfiles', descripcion: 'Gestión de perfiles', ruta: '/perfiles', icono: 'security' },
  { id: 19, nombre: 'Módulos', descripcion: 'Gestión de módulos', ruta: '/modulos', icono: 'view_module' },
  { id: 20, nombre: 'Configuración', descripcion: 'Configuración del sistema', ruta: '/configuracion', icono: 'settings' },
  { id: 21, nombre: 'Correo Electrónico', descripcion: 'Sistema de correo electrónico', ruta: '/correo', icono: 'email' }
];

// Función para sincronizar pantallas con la base de datos usando tu estructura
const sincronizarPantallas = async () => {
  try {
    const pool = await poolPromise;
    
    console.log('🔄 Sincronizando pantallas del dashboard con tu estructura BD...');
    
    for (const pantalla of pantallasDashboard) {
      try {
        // Verificar si existe la pantalla por nombre
        const existeResult = await pool.request()
          .input('nombre', sql.VarChar, pantalla.nombre)
          .query('SELECT id FROM modulos WHERE nombre = @nombre');
        
        if (existeResult.recordset.length === 0) {
          // No existe, insertar con las columnas que tienes
          await pool.request()
            .input('nombre', sql.VarChar, pantalla.nombre)
            .input('descripcion', sql.VarChar, pantalla.descripcion)
            .input('ruta', sql.VarChar, pantalla.ruta)
            .input('icono', sql.VarChar, pantalla.icono)
            .query(`
              INSERT INTO modulos (nombre, descripcion, ruta, icono)
              VALUES (@nombre, @descripcion, @ruta, @icono)
            `);
          console.log(`✅ Pantalla "${pantalla.nombre}" sincronizada`);
        }
      } catch (error) {
        // Si falla la inserción completa, intentar solo con nombre y descripción
        try {
          await pool.request()
            .input('nombre', sql.VarChar, pantalla.nombre)
            .input('descripcion', sql.VarChar, pantalla.descripcion)
            .query(`
              INSERT INTO modulos (nombre, descripcion)
              VALUES (@nombre, @descripcion)
            `);
          console.log(`✅ Pantalla "${pantalla.nombre}" sincronizada (básico)`);
        } catch (error2) {
          console.warn(`⚠️ Error sincronizando "${pantalla.nombre}":`, error2.message);
        }
      }
    }
    
    console.log('✅ Sincronización de pantallas completada');
  } catch (error) {
    console.error('❌ Error en sincronización:', error.message);
  }
};

// Endpoint para debug - obtener info completa del sistema
exports.getDebugInfo = async (req, res) => {
  try {
    const pool = await poolPromise;
    
    console.log('🔍 === DEBUG INFO SOLICITADO ===');
    
    // Obtener módulos
    const modulosResult = await pool.request()
      .query('SELECT id, nombre, descripcion FROM modulos ORDER BY id');
    
    // Obtener perfiles  
    const perfilesResult = await pool.request()
      .query('SELECT id, nombre FROM perfiles ORDER BY id');
    
    // Obtener relaciones
    const relacionesResult = await pool.request()
      .query(`
        SELECT pm.perfil_id, pm.modulo_id, p.nombre as perfil_nombre, m.nombre as modulo_nombre
        FROM perfil_modulo pm
        INNER JOIN perfiles p ON pm.perfil_id = p.id
        INNER JOIN modulos m ON pm.modulo_id = m.id
        ORDER BY pm.perfil_id, pm.modulo_id
      `);
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      modulos: {
        total: modulosResult.recordset.length,
        data: modulosResult.recordset
      },
      perfiles: {
        total: perfilesResult.recordset.length,
        data: perfilesResult.recordset
      },
      relaciones: {
        total: relacionesResult.recordset.length,
        data: relacionesResult.recordset
      },
      modulosPredefinidos: pantallasDashboard.length
    };
    
    console.log('📊 Debug Info generado:', debugInfo);
    res.json(debugInfo);
    
  } catch (error) {
    console.error('❌ Error en debug info:', error);
    res.status(500).json({ 
      message: 'Error al obtener información de debug', 
      error: error.message 
    });
  }
};

// Obtener todos los módulos
exports.getAllModulos = async (req, res) => {
  try {
    // Sincronizar pantallas primero
    await sincronizarPantallas();
    
    const pool = await poolPromise;
    
    // Obtener módulos de la base de datos usando tu estructura
    const result = await pool.request()
      .query(`
        SELECT id, nombre, 
               COALESCE(descripcion, '') as descripcion,
               COALESCE(ruta, '') as ruta,
               COALESCE(icono, 'extension') as icono
        FROM modulos
        ORDER BY id
      `);
    
    if (result.recordset.length > 0) {
      console.log(`✅ ${result.recordset.length} módulos cargados desde BD`);
      
      // Enriquecer con datos predefinidos si faltan
      const modulosCompletos = result.recordset.map(modulo => {
        const pantallaPredefinida = pantallasDashboard.find(p => p.nombre === modulo.nombre);
        
        return {
          id: modulo.id,
          nombre: modulo.nombre,
          descripcion: modulo.descripcion || (pantallaPredefinida ? pantallaPredefinida.descripcion : ''),
          ruta: modulo.ruta || (pantallaPredefinida ? pantallaPredefinida.ruta : `/${modulo.nombre.toLowerCase().replace(/\s+/g, '-')}`),
          icono: modulo.icono !== 'extension' ? modulo.icono : (pantallaPredefinida ? pantallaPredefinida.icono : 'extension')
        };
      });
      
      return res.status(200).json(modulosCompletos);
    }
    
    // Si no hay datos en BD, devolver pantallas predefinidas
    console.log('📋 Devolviendo pantallas predefinidas del dashboard');
    res.status(200).json(pantallasDashboard);
    
  } catch (error) {
    console.error('❌ Error al obtener módulos:', error);
    res.status(500).json({ 
      message: 'Error al obtener módulos', 
      error: error.message 
    });
  }
};

// Obtener un módulo por ID
exports.getModuloById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT id, nombre, 
               COALESCE(descripcion, '') as descripcion,
               COALESCE(ruta, '') as ruta,
               COALESCE(icono, 'extension') as icono
        FROM modulos 
        WHERE id = @id
      `);
    
    if (result.recordset.length === 0) {
      // Buscar en pantallas predefinidas
      const pantallaPredefinida = pantallasDashboard.find(p => p.id === parseInt(id));
      if (pantallaPredefinida) {
        return res.status(200).json(pantallaPredefinida);
      }
      
      return res.status(404).json({ message: 'Módulo no encontrado' });
    }
    
    const modulo = result.recordset[0];
    const pantalla = pantallasDashboard.find(p => p.nombre === modulo.nombre);
    
    // Combinar datos de BD con información predefinida
    const moduloCompleto = {
      id: modulo.id,
      nombre: modulo.nombre,
      descripcion: modulo.descripcion || (pantalla ? pantalla.descripcion : ''),
      ruta: modulo.ruta || (pantalla ? pantalla.ruta : `/${modulo.nombre.toLowerCase().replace(/\s+/g, '-')}`),
      icono: modulo.icono !== 'extension' ? modulo.icono : (pantalla ? pantalla.icono : 'extension')
    };
    
    res.status(200).json(moduloCompleto);
  } catch (error) {
    console.error('❌ Error al obtener módulo:', error);
    res.status(500).json({ 
      message: 'Error al obtener módulo', 
      error: error.message 
    });
  }
};

// Crear un nuevo módulo personalizado
exports.createModulo = async (req, res) => {
  try {
    const { nombre, descripcion, ruta, icono } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }
    
    // Verificar que no sea una pantalla predefinida
    const pantallaExiste = pantallasDashboard.find(p => 
      p.nombre.toLowerCase() === nombre.toLowerCase()
    );
    
    if (pantallaExiste) {
      return res.status(400).json({ 
        message: 'No se puede crear una pantalla que ya existe en el sistema' 
      });
    }
    
    const pool = await poolPromise;
    
    // Verificar nombre único en BD
    const checkNombre = await pool.request()
      .input('nombre', sql.VarChar, nombre)
      .query('SELECT id FROM modulos WHERE nombre = @nombre');
    
    if (checkNombre.recordset.length > 0) {
      return res.status(400).json({ message: 'Ya existe un módulo con ese nombre' });
    }
    
    // Crear módulo personalizado usando tu estructura
    const insertResult = await pool.request()
      .input('nombre', sql.VarChar, nombre)
      .input('descripcion', sql.VarChar, descripcion || `Pantalla personalizada: ${nombre}`)
      .input('ruta', sql.VarChar, ruta || `/${nombre.toLowerCase().replace(/\s+/g, '-')}`)
      .input('icono', sql.VarChar, icono || 'extension')
      .query(`
        INSERT INTO modulos (nombre, descripcion, ruta, icono)
        VALUES (@nombre, @descripcion, @ruta, @icono);
        SELECT SCOPE_IDENTITY() AS id
      `);
    
    const newModuloId = insertResult.recordset[0].id;
    
    const newModulo = {
      id: newModuloId,
      nombre,
      descripcion: descripcion || `Pantalla personalizada: ${nombre}`,
      ruta: ruta || `/${nombre.toLowerCase().replace(/\s+/g, '-')}`,
      icono: icono || 'extension'
    };
    
    console.log(`✅ Módulo personalizado "${nombre}" creado con ID: ${newModuloId}`);
    res.status(201).json(newModulo);
    
  } catch (error) {
    console.error('❌ Error al crear módulo:', error);
    res.status(500).json({ 
      message: 'Error al crear módulo', 
      error: error.message 
    });
  }
};

// Actualizar un módulo
exports.updateModulo = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, ruta, icono } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }
    
    const pool = await poolPromise;
    
    // Verificar que existe
    const checkModulo = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id, nombre FROM modulos WHERE id = @id');
    
    if (checkModulo.recordset.length === 0) {
      return res.status(404).json({ message: 'Módulo no encontrado' });
    }
    
    // Verificar que no sea una pantalla predefinida (opcional, puedes permitir editar)
    const currentNombre = checkModulo.recordset[0].nombre;
    const esPredefinida = pantallasDashboard.find(p => p.nombre === currentNombre);
    
    if (esPredefinida) {
      console.log(`⚠️ Editando módulo predefinido: ${currentNombre}`);
    }
    
    // Actualizar usando tu estructura
    await pool.request()
      .input('id', sql.Int, id)
      .input('nombre', sql.VarChar, nombre)
      .input('descripcion', sql.VarChar, descripcion || null)
      .input('ruta', sql.VarChar, ruta || null)
      .input('icono', sql.VarChar, icono || 'extension')
      .query(`
        UPDATE modulos
        SET nombre = @nombre, 
            descripcion = @descripcion, 
            ruta = @ruta, 
            icono = @icono
        WHERE id = @id
      `);
    
    const updatedModulo = {
      id: parseInt(id),
      nombre,
      descripcion: descripcion || null,
      ruta: ruta || null,
      icono: icono || 'extension'
    };
    
    console.log(`✅ Módulo ${id} actualizado`);
    res.status(200).json(updatedModulo);
    
  } catch (error) {
    console.error('❌ Error al actualizar módulo:', error);
    res.status(500).json({ 
      message: 'Error al actualizar módulo', 
      error: error.message 
    });
  }
};

// Eliminar un módulo
exports.deleteModulo = async (req, res) => {
  try {
    const { id } = req.params;
    
    const pool = await poolPromise;
    
    // Verificar que existe
    const checkModulo = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id, nombre FROM modulos WHERE id = @id');
    
    if (checkModulo.recordset.length === 0) {
      return res.status(404).json({ message: 'Módulo no encontrado' });
    }
    
    const moduloNombre = checkModulo.recordset[0].nombre;
    
    // Verificar si hay perfiles usando este módulo (tabla perfil_modulo)
    const checkPerfiles = await pool.request()
      .input('moduloId', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM perfil_modulo WHERE modulo_id = @moduloId');
    
    if (checkPerfiles.recordset[0].count > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar el módulo porque está asignado a uno o más perfiles' 
      });
    }
    
    // Verificar que no sea una pantalla esencial del sistema
    const esPredefinida = pantallasDashboard.find(p => p.nombre === moduloNombre);
    if (esPredefinida) {
      return res.status(400).json({ 
        message: 'No se pueden eliminar los módulos predefinidos del sistema' 
      });
    }
    
    // Eliminar módulo
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM modulos WHERE id = @id');
    
    console.log(`✅ Módulo "${moduloNombre}" eliminado`);
    res.status(200).json({ message: 'Módulo eliminado correctamente' });
    
  } catch (error) {
    console.error('❌ Error al eliminar módulo:', error);
    res.status(500).json({
      message: 'Error al eliminar módulo',
      error: error.message
    });
  }
};