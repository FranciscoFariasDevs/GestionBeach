const { sql, poolPromise } = require('./backend/config/db');

async function crearPerfilesMeson() {
  try {
    const pool = await poolPromise;

    console.log('🔄 CREANDO PERFILES DE MESÓN\n');

    // 1. Obtener todas las sucursales
    const sucursalesRes = await pool.request().query('SELECT id, nombre FROM sucursales ORDER BY nombre');
    const sucursales = sucursalesRes.recordset;

    console.log('📍 SUCURSALES DISPONIBLES:');
    sucursales.forEach(s => console.log(`   ${s.id}: ${s.nombre}`));
    console.log('');

    // 2. Mapear sucursales principales
    const quirihue = sucursales.find(s => s.nombre.toLowerCase().includes('quirihue'));
    const coelemu = sucursales.find(s => s.nombre.toLowerCase().includes('coelemu fe'));
    const vicentePalacios = sucursales.find(s => s.nombre.toLowerCase().includes('vicente palacios 2908'));
    const camelias = sucursales.find(s => s.nombre.toLowerCase().includes('camelias'));
    const chillan = sucursales.find(s => s.nombre.toLowerCase().includes('rio viejo'));

    console.log('🎯 SUCURSALES IDENTIFICADAS:');
    console.log('   Quirihue:', quirihue?.nombre || 'NO ENCONTRADA');
    console.log('   Coelemu:', coelemu?.nombre || 'NO ENCONTRADA');
    console.log('   Vicente Palacios:', vicentePalacios?.nombre || 'NO ENCONTRADA');
    console.log('   Camelias:', camelias?.nombre || 'NO ENCONTRADA');
    console.log('   Chillán:', chillan?.nombre || 'NO ENCONTRADA');
    console.log('');

    // 3. Obtener IDs de módulos necesarios
    const productosRes = await pool.request()
      .input('nombre', sql.VarChar, 'Productos')
      .query('SELECT id FROM modulos WHERE nombre = @nombre');

    const consultarProductoRes = await pool.request()
      .input('nombre', sql.VarChar, 'Consultar Producto')
      .query('SELECT id FROM modulos WHERE nombre = @nombre');

    if (productosRes.recordset.length === 0) {
      console.log('❌ Módulo "Productos" no encontrado');
      process.exit(1);
    }

    if (consultarProductoRes.recordset.length === 0) {
      console.log('❌ Módulo "Consultar Producto" no encontrado');
      process.exit(1);
    }

    const productosId = productosRes.recordset[0].id;
    const consultarProductoId = consultarProductoRes.recordset[0].id;
    console.log(`📦 Módulo "Productos" ID: ${productosId}`);
    console.log(`📦 Módulo "Consultar Producto" ID: ${consultarProductoId}\n`);

    // 4. Configuración de perfiles a crear
    const perfilesACrear = [
      { nombre: 'Meson Quirihue', sucursal: quirihue },
      { nombre: 'Meson Coelemu', sucursal: coelemu },
      { nombre: 'Meson Vicente Palacios', sucursal: vicentePalacios },
      { nombre: 'Meson Camelias', sucursal: camelias },
      { nombre: 'Meson Chillán', sucursal: chillan }
    ];

    // 5. Crear cada perfil
    for (const config of perfilesACrear) {
      if (!config.sucursal) {
        console.log(`❌ Saltando ${config.nombre} - sucursal no encontrada`);
        continue;
      }

      console.log(`\n🔄 Creando perfil: ${config.nombre}`);

      // Verificar si ya existe
      const existeRes = await pool.request()
        .input('nombre', sql.VarChar, config.nombre)
        .query('SELECT id FROM perfiles WHERE nombre = @nombre');

      let perfilId;
      if (existeRes.recordset.length > 0) {
        perfilId = existeRes.recordset[0].id;
        console.log(`   ℹ️  Perfil ya existe con ID ${perfilId}, limpiando permisos...`);

        // Limpiar permisos anteriores
        await pool.request()
          .input('perfilId', sql.Int, perfilId)
          .query('DELETE FROM perfil_modulo_sucursal WHERE perfil_id = @perfilId');
      } else {
        // Crear perfil
        const createRes = await pool.request()
          .input('nombre', sql.VarChar, config.nombre)
          .input('descripcion', sql.VarChar, `Personal de mesón con acceso a consultar productos en ${config.sucursal.nombre}`)
          .query('INSERT INTO perfiles (nombre, descripcion, activo) VALUES (@nombre, @descripcion, 1); SELECT SCOPE_IDENTITY() AS id');
        perfilId = createRes.recordset[0].id;
        console.log(`   ✅ Perfil creado con ID ${perfilId}`);
      }

      // Asignar "Productos" (módulo padre) para su sucursal
      await pool.request()
        .input('perfilId', sql.Int, perfilId)
        .input('moduloId', sql.Int, productosId)
        .input('sucursalId', sql.Int, config.sucursal.id)
        .query('INSERT INTO perfil_modulo_sucursal (perfil_id, modulo_id, sucursal_id) VALUES (@perfilId, @moduloId, @sucursalId)');

      console.log(`   ✅ Productos (padre) → ${config.sucursal.nombre}`);

      // Asignar "Consultar Producto" para su sucursal
      await pool.request()
        .input('perfilId', sql.Int, perfilId)
        .input('moduloId', sql.Int, consultarProductoId)
        .input('sucursalId', sql.Int, config.sucursal.id)
        .query('INSERT INTO perfil_modulo_sucursal (perfil_id, modulo_id, sucursal_id) VALUES (@perfilId, @moduloId, @sucursalId)');

      console.log(`   ✅ Consultar Producto → ${config.sucursal.nombre}`);
      console.log(`   📊 Total permisos: 2 (Productos + Consultar Producto en su sucursal)`);
    }

    console.log('\n🎉 TODOS LOS PERFILES DE MESÓN CREADOS EXITOSAMENTE\n');

    // Verificación final
    console.log('📊 VERIFICACIÓN FINAL:\n');

    for (const config of perfilesACrear) {
      if (!config.sucursal) continue;

      const verificacion = await pool.request()
        .input('nombre', sql.VarChar, config.nombre)
        .query(`
          SELECT
            pf.id,
            pf.nombre,
            COUNT(DISTINCT pms.modulo_id) AS modulos,
            COUNT(DISTINCT pms.sucursal_id) AS sucursales,
            COUNT(*) AS total_permisos
          FROM perfiles pf
            LEFT JOIN perfil_modulo_sucursal pms ON pms.perfil_id = pf.id
          WHERE pf.nombre = @nombre
          GROUP BY pf.id, pf.nombre
        `);

      if (verificacion.recordset.length > 0) {
        const v = verificacion.recordset[0];
        console.log(`✅ ${v.nombre.padEnd(30)} → ${v.modulos} módulo(s), ${v.sucursales} sucursal(es), ${v.total_permisos} permiso(s)`);
      }
    }

    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

crearPerfilesMeson();
