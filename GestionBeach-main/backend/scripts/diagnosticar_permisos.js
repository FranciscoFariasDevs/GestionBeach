// backend/scripts/diagnosticar_permisos.js
const { sql, poolPromise } = require('../config/db');

const diagnosticar = async () => {
  console.log('\n🔍 === DIAGNÓSTICO DEL SISTEMA DE PERMISOS ===\n');

  try {
    const pool = await poolPromise;

    // 1. Verificar tablas
    console.log('📋 1. Verificando estructura de tablas...');
    const tablasResult = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME IN ('perfiles', 'modulos', 'perfil_modulo', 'perfil_modulo_sucursal', 'perfil_sucursal', 'sucursales', 'usuarios')
      ORDER BY TABLE_NAME
    `);

    console.log('   Tablas encontradas:');
    tablasResult.recordset.forEach(t => console.log(`   - ${t.TABLE_NAME}`));

    const tienePerfilModuloSucursal = tablasResult.recordset.some(
      t => t.TABLE_NAME === 'perfil_modulo_sucursal'
    );

    if (!tienePerfilModuloSucursal) {
      console.log('\n❌ ERROR: Tabla perfil_modulo_sucursal NO existe');
      console.log('   Ejecuta: node backend/scripts/setup_permisos_modulares.sql');
      process.exit(1);
    }

    console.log('   ✅ Todas las tablas necesarias existen\n');

    // 2. Estadísticas generales
    console.log('📊 2. Estadísticas generales...');

    const statsResult = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM perfiles) as total_perfiles,
        (SELECT COUNT(*) FROM modulos) as total_modulos,
        (SELECT COUNT(*) FROM sucursales) as total_sucursales,
        (SELECT COUNT(*) FROM perfil_modulo_sucursal) as total_permisos_modulares,
        (SELECT COUNT(*) FROM usuarios) as total_usuarios
    `);

    const stats = statsResult.recordset[0];
    console.log(`   - Perfiles: ${stats.total_perfiles}`);
    console.log(`   - Módulos: ${stats.total_modulos}`);
    console.log(`   - Sucursales: ${stats.total_sucursales}`);
    console.log(`   - Permisos modulares configurados: ${stats.total_permisos_modulares}`);
    console.log(`   - Usuarios: ${stats.total_usuarios}\n`);

    // 3. Perfiles y sus permisos
    console.log('👥 3. Perfiles y sus permisos modulares...');

    const perfilesResult = await pool.request().query(`
      SELECT
        p.id,
        p.nombre,
        COUNT(DISTINCT pms.modulo_id) as modulos_con_permisos,
        COUNT(DISTINCT pms.sucursal_id) as total_sucursales_asignadas,
        COUNT(*) as total_permisos
      FROM perfiles p
        LEFT JOIN perfil_modulo_sucursal pms ON pms.perfil_id = p.id
      GROUP BY p.id, p.nombre
      ORDER BY p.nombre
    `);

    perfilesResult.recordset.forEach(perfil => {
      console.log(`\n   📋 ${perfil.nombre} (ID: ${perfil.id})`);
      console.log(`      - Módulos con permisos: ${perfil.modulos_con_permisos || 0}`);
      console.log(`      - Sucursales asignadas: ${perfil.total_sucursales_asignadas || 0}`);
      console.log(`      - Total de permisos: ${perfil.total_permisos || 0}`);
    });

    console.log('\n');

    // 4. Módulos populares
    console.log('📦 4. Módulos más utilizados...');

    const modulosResult = await pool.request().query(`
      SELECT TOP 10
        m.nombre,
        COUNT(DISTINCT pms.perfil_id) as perfiles_asignados,
        COUNT(DISTINCT pms.sucursal_id) as sucursales_configuradas
      FROM modulos m
        LEFT JOIN perfil_modulo_sucursal pms ON pms.modulo_id = m.id
      GROUP BY m.nombre
      HAVING COUNT(DISTINCT pms.perfil_id) > 0
      ORDER BY COUNT(DISTINCT pms.perfil_id) DESC
    `);

    if (modulosResult.recordset.length === 0) {
      console.log('   ⚠️ No hay módulos con permisos configurados\n');
    } else {
      modulosResult.recordset.forEach(modulo => {
        console.log(`   - ${modulo.nombre}: ${modulo.perfiles_asignados} perfil(es), ${modulo.sucursales_configuradas} sucursal(es)`);
      });
      console.log('');
    }

    // 5. Usuarios sin permisos
    console.log('⚠️ 5. Usuarios sin permisos configurados...');

    const sinPermisosResult = await pool.request().query(`
      SELECT
        u.id,
        u.nombre,
        u.email,
        p.nombre as perfil_nombre
      FROM usuarios u
        LEFT JOIN perfiles p ON p.id = u.perfil_id
        LEFT JOIN perfil_modulo_sucursal pms ON pms.perfil_id = p.id
      WHERE u.perfil_id IS NOT NULL
        AND pms.id IS NULL
        AND p.nombre != 'Administrador'
    `);

    if (sinPermisosResult.recordset.length === 0) {
      console.log('   ✅ Todos los usuarios tienen permisos configurados\n');
    } else {
      console.log(`   ⚠️ ${sinPermisosResult.recordset.length} usuario(s) sin permisos:`);
      sinPermisosResult.recordset.forEach(user => {
        console.log(`      - ${user.nombre} (${user.email}) - Perfil: ${user.perfil_nombre}`);
      });
      console.log('');
    }

    // 6. Verificar índices
    console.log('🔍 6. Verificando índices optimizados...');

    const indicesResult = await pool.request().query(`
      SELECT name
      FROM sys.indexes
      WHERE object_id = OBJECT_ID('perfil_modulo_sucursal')
        AND name IS NOT NULL
      ORDER BY name
    `);

    console.log('   Índices encontrados:');
    indicesResult.recordset.forEach(idx => console.log(`   - ${idx.name}`));
    console.log('');

    // 7. Verificar constraints
    console.log('🔒 7. Verificando constraints...');

    const constraintsResult = await pool.request().query(`
      SELECT
        OBJECT_NAME(object_id) as constraint_name,
        type_desc
      FROM sys.objects
      WHERE parent_object_id = OBJECT_ID('perfil_modulo_sucursal')
        AND type IN ('F', 'UQ', 'C')
      ORDER BY type_desc, OBJECT_NAME(object_id)
    `);

    console.log('   Constraints encontrados:');
    constraintsResult.recordset.forEach(c => console.log(`   - ${c.constraint_name} (${c.type_desc})`));
    console.log('');

    // 8. Ejemplo de consulta de permisos
    console.log('💡 8. Ejemplo de consulta de permisos...');

    const ejemploResult = await pool.request().query(`
      SELECT TOP 5
        u.nombre as usuario,
        p.nombre as perfil,
        m.nombre as modulo,
        s.nombre as sucursal,
        pms.puede_leer,
        pms.puede_escribir,
        pms.puede_exportar
      FROM usuarios u
        INNER JOIN perfiles p ON p.id = u.perfil_id
        INNER JOIN perfil_modulo_sucursal pms ON pms.perfil_id = p.id
        INNER JOIN modulos m ON m.id = pms.modulo_id
        INNER JOIN sucursales s ON s.id = pms.sucursal_id
      ORDER BY u.nombre, m.nombre
    `);

    if (ejemploResult.recordset.length === 0) {
      console.log('   ⚠️ No hay ejemplos de permisos para mostrar\n');
    } else {
      console.log('   Ejemplos de permisos configurados:');
      ejemploResult.recordset.forEach(ejemplo => {
        const permisos = [];
        if (ejemplo.puede_leer) permisos.push('Leer');
        if (ejemplo.puede_escribir) permisos.push('Escribir');
        if (ejemplo.puede_exportar) permisos.push('Exportar');

        console.log(`\n   - Usuario: ${ejemplo.usuario}`);
        console.log(`     Perfil: ${ejemplo.perfil}`);
        console.log(`     Módulo: ${ejemplo.modulo}`);
        console.log(`     Sucursal: ${ejemplo.sucursal}`);
        console.log(`     Permisos: ${permisos.join(', ')}`);
      });
      console.log('');
    }

    // Resumen final
    console.log('\n✅ === DIAGNÓSTICO COMPLETADO ===\n');

    if (stats.total_permisos_modulares === 0) {
      console.log('⚠️ RECOMENDACIÓN: No hay permisos modulares configurados.');
      console.log('   Accede a /permisos-modulares para comenzar a configurar.\n');
    } else {
      console.log(`✅ Sistema funcionando correctamente con ${stats.total_permisos_modulares} permisos configurados.\n`);
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR en el diagnóstico:', error.message);
    console.error('\nDetalles:', error);
    process.exit(1);
  }
};

diagnosticar();
