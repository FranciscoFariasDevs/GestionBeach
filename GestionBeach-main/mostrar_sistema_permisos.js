const { sql, poolPromise } = require('./backend/config/db');

async function mostrarSistema() {
  try {
    const pool = await poolPromise;

    console.log('\n' + '='.repeat(80));
    console.log('🎯 SISTEMA DE PERMISOS - VERSIÓN SIMPLIFICADA');
    console.log('='.repeat(80) + '\n');

    console.log('📋 TABLA ÚNICA DE PERMISOS:\n');
    console.log('   Tabla: perfil_modulo_sucursal');
    console.log('   Columnas:');
    console.log('     - perfil_id    (ID del perfil)');
    console.log('     - modulo_id    (ID del módulo)');
    console.log('     - sucursal_id  (ID de la sucursal)\n');

    console.log('💡 CÓMO FUNCIONA:\n');
    console.log('   Cada fila = 1 permiso para 1 módulo en 1 sucursal');
    console.log('   Para dar acceso a TODAS las sucursales → crear 1 fila por cada sucursal');
    console.log('   Para dar acceso a 1 SOLA sucursal → crear solo 1 fila con esa sucursal\n');

    console.log('🗑️  TABLAS ELIMINADAS (ya no existen):\n');
    console.log('   ❌ perfil_modulo          → Causaba ambigüedad');
    console.log('   ❌ perfil_sucursal        → Sistema viejo, redundante');
    console.log('   ❌ permisos_usuario       → En desuso\n');

    console.log('='.repeat(80) + '\n');

    // Mostrar ejemplo práctico
    console.log('📊 EJEMPLO PRÁCTICO - Jefe Local Quirihue:\n');

    const ejemplo = await pool.request().query(`
      SELECT TOP 10
        pf.nombre AS perfil,
        m.nombre AS modulo,
        s.nombre AS sucursal
      FROM perfil_modulo_sucursal pms
        INNER JOIN perfiles pf ON pf.id = pms.perfil_id
        INNER JOIN modulos m ON m.id = pms.modulo_id
        INNER JOIN sucursales s ON s.id = pms.sucursal_id
      WHERE pf.nombre LIKE '%Quirihue%'
      ORDER BY m.nombre, s.nombre
    `);

    console.log('   Primeros 10 permisos:');
    ejemplo.recordset.forEach(r => {
      console.log(`     • ${r.modulo.padEnd(25)} → ${r.sucursal}`);
    });

    console.log('\n' + '='.repeat(80) + '\n');

    // Contar permisos por perfil
    console.log('📈 RESUMEN DE PERMISOS POR PERFIL:\n');

    const resumen = await pool.request().query(`
      SELECT
        pf.id,
        pf.nombre,
        COUNT(DISTINCT pms.modulo_id) AS modulos,
        COUNT(DISTINCT pms.sucursal_id) AS sucursales,
        COUNT(*) AS total_permisos
      FROM perfiles pf
        LEFT JOIN perfil_modulo_sucursal pms ON pms.perfil_id = pf.id
      GROUP BY pf.id, pf.nombre
      ORDER BY pf.id
    `);

    resumen.recordset.forEach(r => {
      const protegido = r.id === 10 ? ' 🔒 PROTEGIDO' : '';
      console.log(`   ${r.id.toString().padStart(2)}. ${r.nombre.padEnd(30)} → ${r.modulos} módulos, ${r.sucursales} sucursales (${r.total_permisos} permisos)${protegido}`);
    });

    console.log('\n' + '='.repeat(80) + '\n');

    // Análisis de jefes de local
    console.log('🔍 ANÁLISIS DE JEFES DE LOCAL:\n');

    const jefes = await pool.request().query(`
      SELECT DISTINCT pf.id, pf.nombre
      FROM perfiles pf
      WHERE pf.nombre LIKE '%Jefe Local%'
      ORDER BY pf.id
    `);

    for (const jefe of jefes.recordset) {
      console.log(`\n   ${jefe.nombre}:`);

      const modulos = await pool.request()
        .input('perfilId', sql.Int, jefe.id)
        .query(`
          SELECT
            m.nombre AS modulo,
            COUNT(DISTINCT pms.sucursal_id) AS cant_sucursales
          FROM modulos m
            LEFT JOIN perfil_modulo_sucursal pms ON pms.modulo_id = m.id AND pms.perfil_id = @perfilId
            LEFT JOIN sucursales s ON s.id = pms.sucursal_id
          WHERE pms.perfil_id IS NOT NULL
          GROUP BY m.id, m.nombre
          ORDER BY m.nombre
        `);

      const total_sucursales = await pool.request().query('SELECT COUNT(*) as total FROM sucursales');
      const todas = total_sucursales.recordset[0].total;

      modulos.recordset.forEach(m => {
        const acceso = m.cant_sucursales === todas ? 'TODAS' : `${m.cant_sucursales} sucursal(es)`;
        const emoji = m.cant_sucursales === 1 ? '🔒' : '🌍';
        console.log(`     ${emoji} ${m.modulo.padEnd(30)} → ${acceso}`);
      });
    }

    console.log('\n' + '='.repeat(80) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

mostrarSistema();
