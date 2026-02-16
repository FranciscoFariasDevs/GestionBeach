const { sql, poolPromise } = require('./backend/config/db');

async function protegerSuperAdmin() {
  try {
    const pool = await poolPromise;

    console.log('🔒 PROTEGIENDO Y REGENERANDO PERFIL SUPER ADMIN\n');

    // PASO 1: Verificar si existe el perfil Admin/Super Admin
    console.log('📋 Buscando perfil Super Admin...');
    const perfilResult = await pool.request().query(`
      SELECT id, nombre
      FROM perfiles
      WHERE nombre LIKE '%Admin%' OR nombre LIKE '%Administrador%'
      ORDER BY id
    `);

    let superAdminId;
    if (perfilResult.recordset.length === 0) {
      console.log('⚠️  No existe perfil Admin, creando...');
      const createResult = await pool.request()
        .input('nombre', sql.VarChar, 'Super Admin')
        .input('descripcion', sql.VarChar, 'Administrador del sistema con acceso total - PERFIL PROTEGIDO')
        .query(`
          INSERT INTO perfiles (nombre, descripcion, activo)
          VALUES (@nombre, @descripcion, 1);
          SELECT SCOPE_IDENTITY() AS id
        `);
      superAdminId = createResult.recordset[0].id;
      console.log(`✅ Perfil Super Admin creado con ID: ${superAdminId}`);
    } else {
      superAdminId = perfilResult.recordset[0].id;
      console.log(`✅ Perfil encontrado: ${perfilResult.recordset[0].nombre} (ID: ${superAdminId})`);
    }

    // PASO 2: Limpiar todos los permisos actuales del Super Admin
    console.log('\n🧹 Limpiando permisos actuales...');
    await pool.request()
      .input('perfilId', sql.Int, superAdminId)
      .query('DELETE FROM perfil_modulo_sucursal WHERE perfil_id = @perfilId');
    console.log('✅ Permisos limpiados');

    // PASO 3: Obtener TODOS los módulos
    console.log('\n📦 Obteniendo todos los módulos...');
    const modulos = await pool.request().query('SELECT id, nombre FROM modulos ORDER BY nombre');
    console.log(`✅ ${modulos.recordset.length} módulos encontrados`);

    // PASO 4: Obtener TODAS las sucursales
    console.log('\n🏢 Obteniendo todas las sucursales...');
    const sucursales = await pool.request().query('SELECT id, nombre FROM sucursales ORDER BY nombre');
    console.log(`✅ ${sucursales.recordset.length} sucursales encontradas`);

    // PASO 5: Asignar TODOS los módulos en TODAS las sucursales
    console.log('\n🔑 Asignando TODOS los permisos...');
    let permisos = 0;
    for (const modulo of modulos.recordset) {
      for (const sucursal of sucursales.recordset) {
        await pool.request()
          .input('perfilId', sql.Int, superAdminId)
          .input('moduloId', sql.Int, modulo.id)
          .input('sucursalId', sql.Int, sucursal.id)
          .query(`
            INSERT INTO perfil_modulo_sucursal (perfil_id, modulo_id, sucursal_id)
            VALUES (@perfilId, @moduloId, @sucursalId)
          `);
        permisos++;
      }
    }

    console.log(`✅ ${permisos} permisos asignados (${modulos.recordset.length} módulos × ${sucursales.recordset.length} sucursales)`);

    // PASO 6: Verificar asignación
    console.log('\n✅ VERIFICACIÓN FINAL:');
    const verificacion = await pool.request()
      .input('perfilId', sql.Int, superAdminId)
      .query(`
        SELECT
          COUNT(DISTINCT modulo_id) as modulos,
          COUNT(DISTINCT sucursal_id) as sucursales,
          COUNT(*) as total_permisos
        FROM perfil_modulo_sucursal
        WHERE perfil_id = @perfilId
      `);

    const v = verificacion.recordset[0];
    console.log(`  • Módulos con acceso: ${v.modulos}/${modulos.recordset.length}`);
    console.log(`  • Sucursales con acceso: ${v.sucursales}/${sucursales.recordset.length}`);
    console.log(`  • Total permisos: ${v.total_permisos}`);

    if (v.modulos === modulos.recordset.length && v.sucursales === sucursales.recordset.length) {
      console.log('\n🎉 SUPER ADMIN PROTEGIDO Y REGENERADO EXITOSAMENTE');
      console.log(`\n⚠️  IMPORTANTE: El perfil ID ${superAdminId} tiene acceso TOTAL al sistema`);
    } else {
      console.log('\n⚠️  ADVERTENCIA: Faltan permisos, revisa la configuración');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

protegerSuperAdmin();
