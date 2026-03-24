const { sql, poolPromise } = require('./backend/config/db');

async function crearPerfilesJefes() {
  try {
    const pool = await poolPromise;

    // 1. Obtener todas las sucursales
    const sucursalesRes = await pool.request().query('SELECT id, nombre FROM sucursales ORDER BY nombre');
    const sucursales = sucursalesRes.recordset;

    console.log('📍 SUCURSALES DISPONIBLES:');
    sucursales.forEach(s => console.log(`   ${s.id}: ${s.nombre}`));
    console.log('');

    // 2. Mapear sucursales a nombres
    const coelemu = sucursales.find(s => s.nombre.toLowerCase().includes('coelemu'));
    const vicentePalacios = sucursales.find(s => s.nombre.toLowerCase().includes('vicente palacios'));
    const camelias = sucursales.find(s => s.nombre.toLowerCase().includes('camelias'));
    const chillan = sucursales.find(s => s.nombre.toLowerCase().includes('chillan'));

    console.log('🎯 SUCURSALES IDENTIFICADAS:');
    console.log('   Coelemu:', coelemu?.nombre || 'NO ENCONTRADA');
    console.log('   Vicente Palacios:', vicentePalacios?.nombre || 'NO ENCONTRADA');
    console.log('   Camelias:', camelias?.nombre || 'NO ENCONTRADA');
    console.log('   Chillán:', chillan?.nombre || 'NO ENCONTRADA');
    console.log('');

    // 3. Verificar módulo "Los Más Vendidos"
    let losMasVendidosRes = await pool.request()
      .input('nombre', sql.VarChar, 'Los Más Vendidos')
      .query('SELECT id FROM modulos WHERE nombre = @nombre');

    let losMasVendidosId;
    if (losMasVendidosRes.recordset.length === 0) {
      console.log('🔄 Creando módulo "Los Más Vendidos"...');
      const createRes = await pool.request()
        .input('nombre', sql.VarChar, 'Los Más Vendidos')
        .input('descripcion', sql.VarChar, 'Módulo de productos más vendidos')
        .input('ruta', sql.VarChar, '/los-mas-vendidos')
        .input('icono', sql.VarChar, 'trending_up')
        .query('INSERT INTO modulos (nombre, descripcion, ruta, icono) VALUES (@nombre, @descripcion, @ruta, @icono); SELECT SCOPE_IDENTITY() AS id');
      losMasVendidosId = createRes.recordset[0].id;
      console.log('✅ Módulo "Los Más Vendidos" creado con ID:', losMasVendidosId);
    } else {
      losMasVendidosId = losMasVendidosRes.recordset[0].id;
      console.log('✅ Módulo "Los Más Vendidos" ya existe con ID:', losMasVendidosId);
    }
    console.log('');

    // 4. Obtener IDs de módulos necesarios
    const modulosRes = await pool.request().query('SELECT id, nombre FROM modulos');
    const modulos = modulosRes.recordset;

    const ventas = modulos.find(m => m.nombre === 'Ventas');
    const correo = modulos.find(m => m.nombre.includes('Correo'));
    const productos = modulos.find(m => m.nombre === 'Productos');
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

    // 5. Configuración de perfiles a crear
    const perfilesACrear = [
      { nombre: 'Jefe Local Coelemu', sucursal: coelemu },
      { nombre: 'Jefe Local Vicente Palacios', sucursal: vicentePalacios },
      { nombre: 'Jefe Local Camelias', sucursal: camelias },
      { nombre: 'Jefe Local Chillán', sucursal: chillan }
    ];

    // 6. Crear cada perfil
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
        await pool.request()
          .input('perfilId', sql.Int, perfilId)
          .query('DELETE FROM perfil_modulo WHERE perfil_id = @perfilId');
      } else {
        // Crear perfil
        const createRes = await pool.request()
          .input('nombre', sql.VarChar, config.nombre)
          .input('descripcion', sql.VarChar, `Jefe de Local con acceso a ${config.sucursal.nombre}`)
          .query('INSERT INTO perfiles (nombre, descripcion, activo) VALUES (@nombre, @descripcion, 1); SELECT SCOPE_IDENTITY() AS id');
        perfilId = createRes.recordset[0].id;
        console.log(`   ✅ Perfil creado con ID ${perfilId}`);
      }

      // Asignar Ventas solo a su sucursal
      await pool.request()
        .input('perfilId', sql.Int, perfilId)
        .input('moduloId', sql.Int, ventas.id)
        .input('sucursalId', sql.Int, config.sucursal.id)
        .query('INSERT INTO perfil_modulo_sucursal (perfil_id, modulo_id, sucursal_id) VALUES (@perfilId, @moduloId, @sucursalId)');
      console.log(`   ✅ Ventas -> ${config.sucursal.nombre}`);

      // Asignar Los Más Vendidos solo a su sucursal
      await pool.request()
        .input('perfilId', sql.Int, perfilId)
        .input('moduloId', sql.Int, losMasVendidosId)
        .input('sucursalId', sql.Int, config.sucursal.id)
        .query('INSERT INTO perfil_modulo_sucursal (perfil_id, modulo_id, sucursal_id) VALUES (@perfilId, @moduloId, @sucursalId)');
      console.log(`   ✅ Los Más Vendidos -> ${config.sucursal.nombre}`);

      // Asignar Correo a todas las sucursales
      for (const suc of sucursales) {
        await pool.request()
          .input('perfilId', sql.Int, perfilId)
          .input('moduloId', sql.Int, correo.id)
          .input('sucursalId', sql.Int, suc.id)
          .query('INSERT INTO perfil_modulo_sucursal (perfil_id, modulo_id, sucursal_id) VALUES (@perfilId, @moduloId, @sucursalId)');
      }
      console.log(`   ✅ Correo -> TODAS (${sucursales.length})`);

      // Asignar Productos (padre) a todas las sucursales
      for (const suc of sucursales) {
        await pool.request()
          .input('perfilId', sql.Int, perfilId)
          .input('moduloId', sql.Int, productos.id)
          .input('sucursalId', sql.Int, suc.id)
          .query('INSERT INTO perfil_modulo_sucursal (perfil_id, modulo_id, sucursal_id) VALUES (@perfilId, @moduloId, @sucursalId)');
      }
      console.log(`   ✅ Productos -> TODAS (${sucursales.length})`);

      // Asignar módulos de Productos (hijos) a todas las sucursales
      for (const modulo of modulosProductos) {
        for (const suc of sucursales) {
          await pool.request()
            .input('perfilId', sql.Int, perfilId)
            .input('moduloId', sql.Int, modulo.id)
            .input('sucursalId', sql.Int, suc.id)
            .query('INSERT INTO perfil_modulo_sucursal (perfil_id, modulo_id, sucursal_id) VALUES (@perfilId, @moduloId, @sucursalId)');
        }
      }
      console.log(`   ✅ Módulos Productos (${modulosProductos.length}) -> TODAS`);

      // Asignar módulos a perfil_modulo
      const modulosIds = [ventas.id, losMasVendidosId, correo.id, productos.id, ...modulosProductos.map(m => m.id)];
      for (const moduloId of modulosIds) {
        await pool.request()
          .input('perfilId', sql.Int, perfilId)
          .input('moduloId', sql.Int, moduloId)
          .query('INSERT INTO perfil_modulo (perfil_id, modulo_id) VALUES (@perfilId, @moduloId)');
      }
      console.log(`   ✅ ${modulosIds.length} módulos asignados a perfil_modulo`);
    }

    console.log('\n🎉 TODOS LOS PERFILES CREADOS EXITOSAMENTE\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

crearPerfilesJefes();
