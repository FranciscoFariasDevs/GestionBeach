const { sql, poolPromise } = require('./backend/config/db');

async function simplificarPermisos() {
  try {
    const pool = await poolPromise;

    console.log('🔄 SIMPLIFICANDO SISTEMA DE PERMISOS\n');

    // PASO 1: Verificar estado actual
    console.log('📊 ESTADO ACTUAL:');
    const perfil_modulo_count = await pool.request().query('SELECT COUNT(*) as total FROM perfil_modulo');
    const perfil_modulo_sucursal_count = await pool.request().query('SELECT COUNT(*) as total FROM perfil_modulo_sucursal');
    const perfil_sucursal_count = await pool.request().query('SELECT COUNT(*) as total FROM perfil_sucursal');

    console.log(`  - perfil_modulo: ${perfil_modulo_count.recordset[0].total} registros`);
    console.log(`  - perfil_modulo_sucursal: ${perfil_modulo_sucursal_count.recordset[0].total} registros`);
    console.log(`  - perfil_sucursal: ${perfil_sucursal_count.recordset[0].total} registros`);
    console.log('');

    // PASO 2: Eliminar tablas obsoletas
    console.log('🗑️  ELIMINANDO TABLAS OBSOLETAS:\n');

    // Eliminar perfil_sucursal (sistema viejo)
    console.log('  Eliminando perfil_sucursal (sistema viejo)...');
    await pool.request().query(`
      IF OBJECT_ID('perfil_sucursal', 'U') IS NOT NULL
        DROP TABLE perfil_sucursal
    `);
    console.log('  ✅ perfil_sucursal eliminada');

    // Eliminar perfil_modulo (redundante)
    console.log('  Eliminando perfil_modulo (redundante)...');
    await pool.request().query(`
      IF OBJECT_ID('perfil_modulo', 'U') IS NOT NULL
        DROP TABLE perfil_modulo
    `);
    console.log('  ✅ perfil_modulo eliminada');

    // Eliminar permisos_usuario (en desuso)
    console.log('  Eliminando permisos_usuario (en desuso)...');
    await pool.request().query(`
      IF OBJECT_ID('permisos_usuario', 'U') IS NOT NULL
        DROP TABLE permisos_usuario
    `);
    console.log('  ✅ permisos_usuario eliminada');

    console.log('\n✅ SISTEMA SIMPLIFICADO\n');
    console.log('📋 TABLA ÚNICA DE PERMISOS: perfil_modulo_sucursal');
    console.log('   - perfil_id: ID del perfil');
    console.log('   - modulo_id: ID del módulo');
    console.log('   - sucursal_id: ID de la sucursal');
    console.log('   - fecha_creacion: Timestamp\n');

    console.log('🎯 CÓMO FUNCIONA AHORA:');
    console.log('   1. Cada registro en perfil_modulo_sucursal da acceso a UN módulo en UNA sucursal');
    console.log('   2. Para dar acceso a todas las sucursales, crear un registro por cada sucursal');
    console.log('   3. No hay ambigüedad - todo está en una sola tabla\n');

    // Verificar integridad
    console.log('🔍 VERIFICANDO INTEGRIDAD:\n');
    const perfiles = await pool.request().query('SELECT COUNT(*) as total FROM perfiles');
    const modulos = await pool.request().query('SELECT COUNT(*) as total FROM modulos');
    const sucursales = await pool.request().query('SELECT COUNT(*) as total FROM sucursales');
    const permisos = await pool.request().query('SELECT COUNT(*) as total FROM perfil_modulo_sucursal');

    console.log(`  ✅ Perfiles: ${perfiles.recordset[0].total}`);
    console.log(`  ✅ Módulos: ${modulos.recordset[0].total}`);
    console.log(`  ✅ Sucursales: ${sucursales.recordset[0].total}`);
    console.log(`  ✅ Permisos asignados: ${permisos.recordset[0].total}\n`);

    console.log('🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

simplificarPermisos();
