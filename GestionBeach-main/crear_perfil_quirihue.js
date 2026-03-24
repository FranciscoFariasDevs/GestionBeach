const { sql, poolPromise } = require('./backend/config/db');

async function crearPerfil() {
  try {
    const pool = await poolPromise;

    // 1. Obtener sucursales
    const sucursalesRes = await pool.request().query('SELECT id, nombre FROM sucursales ORDER BY nombre');
    const sucursales = sucursalesRes.recordset;
    console.log('📍 Sucursales:', sucursales.map(s => `${s.id}:${s.nombre}`).join(', '));

    const quirihue = sucursales.find(s => s.nombre.toLowerCase().includes('quirihue'));
    if (!quirihue) {
      console.error('❌ No se encontró la sucursal Quirihue');
      process.exit(1);
    }
    console.log('✅ Quirihue ID:', quirihue.id);

    // 2. Obtener módulos
    const modulosRes = await pool.request().query('SELECT id, nombre FROM modulos ORDER BY nombre');
    const modulos = modulosRes.recordset;

    const ventas = modulos.find(m => m.nombre === 'Ventas');
    const correo = modulos.find(m => m.nombre.includes('Correo'));
    const modulosProductos = modulos.filter(m =>
      m.nombre.includes('Consultar Producto') ||
      m.nombre.includes('Rotacion') ||
      m.nombre.includes('Rentabilidad') ||
      m.nombre.includes('Margenes') ||
      m.nombre.includes('Guias') ||
      m.nombre.includes('Resumen Valorizado') ||
      m.nombre.includes('Stocks') ||
      m.nombre.includes('Anulaciones') ||
      m.nombre.includes('Cargar Inventario')
    );

    console.log('📦 Módulo Ventas:', ventas?.id);
    console.log('📧 Módulo Correo:', correo?.id);
    console.log('🛒 Módulos de Productos:', modulosProductos.map(m => m.nombre).join(', '));

    // 3. Verificar si existe el perfil
    const perfilRes = await pool.request()
      .input('nombre', sql.VarChar, 'Jefe Local Quirihue')
      .query('SELECT id FROM perfiles WHERE nombre = @nombre');

    let perfilId;
    if (perfilRes.recordset.length > 0) {
      perfilId = perfilRes.recordset[0].id;
      console.log('✅ Perfil existe con ID:', perfilId);

      // Limpiar permisos anteriores
      await pool.request()
        .input('perfilId', sql.Int, perfilId)
        .query('DELETE FROM perfil_modulo_sucursal WHERE perfil_id = @perfilId');
      console.log('🗑️  Permisos anteriores eliminados');
    } else {
      // Crear perfil
      const createRes = await pool.request()
        .input('nombre', sql.VarChar, 'Jefe Local Quirihue')
        .input('descripcion', sql.VarChar, 'Jefe de Local con acceso a Quirihue en Ventas y todos los módulos de Productos')
        .query('INSERT INTO perfiles (nombre, descripcion, activo) VALUES (@nombre, @descripcion, 1); SELECT SCOPE_IDENTITY() AS id');
      perfilId = createRes.recordset[0].id;
      console.log('✅ Perfil creado con ID:', perfilId);
    }

    // 4. Asignar Ventas solo a Quirihue
    if (ventas) {
      await pool.request()
        .input('perfilId', sql.Int, perfilId)
        .input('moduloId', sql.Int, ventas.id)
        .input('sucursalId', sql.Int, quirihue.id)
        .query('INSERT INTO perfil_modulo_sucursal (perfil_id, modulo_id, sucursal_id) VALUES (@perfilId, @moduloId, @sucursalId)');
      console.log('✅ Ventas -> Quirihue asignado');
    }

    // 5. Asignar Correo a todas las sucursales
    if (correo) {
      for (const suc of sucursales) {
        await pool.request()
          .input('perfilId', sql.Int, perfilId)
          .input('moduloId', sql.Int, correo.id)
          .input('sucursalId', sql.Int, suc.id)
          .query('INSERT INTO perfil_modulo_sucursal (perfil_id, modulo_id, sucursal_id) VALUES (@perfilId, @moduloId, @sucursalId)');
      }
      console.log('✅ Correo -> TODAS las sucursales (' + sucursales.length + ')');
    }

    // 6. Asignar módulos de Productos a todas las sucursales
    for (const modulo of modulosProductos) {
      for (const suc of sucursales) {
        await pool.request()
          .input('perfilId', sql.Int, perfilId)
          .input('moduloId', sql.Int, modulo.id)
          .input('sucursalId', sql.Int, suc.id)
          .query('INSERT INTO perfil_modulo_sucursal (perfil_id, modulo_id, sucursal_id) VALUES (@perfilId, @moduloId, @sucursalId)');
      }
      console.log('✅ ' + modulo.nombre + ' -> TODAS (' + sucursales.length + ')');
    }

    // 7. Asignar módulos a perfil_modulo
    const modulosIds = [ventas.id, correo.id, ...modulosProductos.map(m => m.id)];

    // Limpiar módulos anteriores
    await pool.request()
      .input('perfilId', sql.Int, perfilId)
      .query('DELETE FROM perfil_modulo WHERE perfil_id = @perfilId');

    for (const moduloId of modulosIds) {
      await pool.request()
        .input('perfilId', sql.Int, perfilId)
        .input('moduloId', sql.Int, moduloId)
        .query('INSERT INTO perfil_modulo (perfil_id, modulo_id) VALUES (@perfilId, @moduloId)');
    }

    console.log('');
    console.log('🎉 PERFIL "Jefe Local Quirihue" CONFIGURADO:');
    console.log('   ✅ Ventas: Solo Quirihue');
    console.log('   ✅ Correo: Todas las sucursales');
    console.log('   ✅ Módulos Productos (' + modulosProductos.length + '): Todas las sucursales');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

crearPerfil();
