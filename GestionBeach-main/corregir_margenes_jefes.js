const { sql, poolPromise } = require('./backend/config/db');

async function corregirMargenes() {
  try {
    const pool = await poolPromise;

    console.log('🔄 CORRIGIENDO MÁRGENES PARA JEFES DE LOCAL\n');

    // Obtener todas las sucursales
    const sucursalesRes = await pool.request().query('SELECT id, nombre FROM sucursales ORDER BY nombre');
    const sucursales = sucursalesRes.recordset;

    // Mapear sucursales
    const quirihue = sucursales.find(s => s.nombre.toLowerCase().includes('quirihue'));
    const coelemu = sucursales.find(s => s.nombre.toLowerCase().includes('coelemu fe'));
    const vicentePalacios = sucursales.find(s => s.nombre.toLowerCase().includes('vicente palacios 2908'));
    const camelias = sucursales.find(s => s.nombre.toLowerCase().includes('camelias'));
    const chillan = sucursales.find(s => s.nombre.toLowerCase().includes('rio viejo'));

    console.log('🏢 Sucursales identificadas:');
    console.log(`   Quirihue: ${quirihue?.nombre}`);
    console.log(`   Coelemu: ${coelemu?.nombre}`);
    console.log(`   Vicente Palacios: ${vicentePalacios?.nombre}`);
    console.log(`   Camelias: ${camelias?.nombre}`);
    console.log(`   Chillán: ${chillan?.nombre}`);
    console.log('');

    // Obtener ID del módulo Márgenes
    const margenesRes = await pool.request()
      .input('nombre', sql.VarChar, 'Margenes')
      .query('SELECT id FROM modulos WHERE nombre = @nombre');

    if (margenesRes.recordset.length === 0) {
      console.log('❌ Módulo Márgenes no encontrado');
      process.exit(1);
    }

    const margenesId = margenesRes.recordset[0].id;
    console.log(`📊 Módulo Márgenes ID: ${margenesId}\n`);

    // Configuración de jefes de local
    const jefesConfig = [
      { nombre: 'Jefe Local Quirihue', sucursal: quirihue },
      { nombre: 'Jefe Local Coelemu', sucursal: coelemu },
      { nombre: 'Jefe Local Vicente Palacios', sucursal: vicentePalacios },
      { nombre: 'Jefe Local Camelias', sucursal: camelias },
      { nombre: 'Jefe Local Chillán', sucursal: chillan }
    ];

    for (const config of jefesConfig) {
      if (!config.sucursal) {
        console.log(`⚠️  Saltando ${config.nombre} - sucursal no encontrada`);
        continue;
      }

      console.log(`🔄 Procesando: ${config.nombre}`);

      // Buscar el perfil
      const perfilRes = await pool.request()
        .input('nombre', sql.VarChar, config.nombre)
        .query('SELECT id FROM perfiles WHERE nombre = @nombre');

      if (perfilRes.recordset.length === 0) {
        console.log(`   ❌ Perfil no encontrado`);
        continue;
      }

      const perfilId = perfilRes.recordset[0].id;

      // Eliminar todos los permisos de Márgenes para este perfil
      await pool.request()
        .input('perfilId', sql.Int, perfilId)
        .input('moduloId', sql.Int, margenesId)
        .query('DELETE FROM perfil_modulo_sucursal WHERE perfil_id = @perfilId AND modulo_id = @moduloId');

      // Insertar SOLO la sucursal del jefe
      await pool.request()
        .input('perfilId', sql.Int, perfilId)
        .input('moduloId', sql.Int, margenesId)
        .input('sucursalId', sql.Int, config.sucursal.id)
        .query('INSERT INTO perfil_modulo_sucursal (perfil_id, modulo_id, sucursal_id) VALUES (@perfilId, @moduloId, @sucursalId)');

      console.log(`   ✅ Márgenes → Solo ${config.sucursal.nombre}\n`);
    }

    console.log('✅ CORRECCIÓN COMPLETADA\n');

    // Verificar resultado
    console.log('📊 VERIFICACIÓN:\n');
    const verificacion = await pool.request().query(`
      SELECT
        pf.nombre AS perfil,
        COUNT(DISTINCT pms.sucursal_id) AS cant_sucursales
      FROM perfiles pf
        INNER JOIN perfil_modulo_sucursal pms ON pms.perfil_id = pf.id
        INNER JOIN modulos m ON m.id = pms.modulo_id
      WHERE pf.nombre LIKE '%Jefe Local%'
        AND m.nombre = 'Margenes'
      GROUP BY pf.id, pf.nombre
      ORDER BY pf.nombre
    `);

    verificacion.recordset.forEach(r => {
      const emoji = r.cant_sucursales === 1 ? '✅' : '❌';
      console.log(`  ${emoji} ${r.perfil.padEnd(30)} → ${r.cant_sucursales} sucursal(es)`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

corregirMargenes();
