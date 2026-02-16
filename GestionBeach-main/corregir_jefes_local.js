const { sql, poolPromise } = require('./backend/config/db');

async function corregirJefesLocal() {
  try {
    const pool = await poolPromise;

    console.log('🔄 CORRIGIENDO PERMISOS DE JEFES DE LOCAL\n');

    // Obtener todas las sucursales
    const sucursalesRes = await pool.request().query('SELECT id, nombre FROM sucursales ORDER BY nombre');
    const sucursales = sucursalesRes.recordset;

    console.log('🏢 Sucursales disponibles:');
    sucursales.forEach(s => console.log(`   ${s.id}: ${s.nombre}`));
    console.log('');

    // Mapear sucursales
    const quirihue = sucursales.find(s => s.nombre.toLowerCase().includes('quirihue'));
    const coelemu = sucursales.find(s => s.nombre.toLowerCase().includes('coelemu'));
    const vicentePalacios = sucursales.find(s => s.nombre.toLowerCase().includes('vicente palacios'));
    const camelias = sucursales.find(s => s.nombre.toLowerCase().includes('camelias'));
    const chillan = sucursales.find(s => s.nombre.toLowerCase().includes('chillan'));

    // Obtener IDs de módulos que deben tener SOLO su sucursal
    const modulosRestringidos = await pool.request().query(`
      SELECT id, nombre
      FROM modulos
      WHERE nombre IN ('Ventas', 'Los Más Vendidos', 'Rentabilidad', 'Resumen Valorizado', 'Margenes')
    `);

    console.log('🔒 Módulos con restricción de sucursal:');
    modulosRestringidos.recordset.forEach(m => console.log(`   ${m.id}: ${m.nombre}`));
    console.log('');

    const modulosRestringidosIds = modulosRestringidos.recordset.map(m => m.id);

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

      console.log(`\n🔄 Procesando: ${config.nombre} (Sucursal: ${config.sucursal.nombre})`);

      // Buscar el perfil
      const perfilRes = await pool.request()
        .input('nombre', sql.VarChar, config.nombre)
        .query('SELECT id FROM perfiles WHERE nombre = @nombre');

      if (perfilRes.recordset.length === 0) {
        console.log(`   ❌ Perfil no encontrado`);
        continue;
      }

      const perfilId = perfilRes.recordset[0].id;
      console.log(`   ✅ Perfil ID: ${perfilId}`);

      // Para cada módulo restringido, eliminar todas las sucursales excepto la suya
      for (const moduloId of modulosRestringidosIds) {
        const modulo = modulosRestringidos.recordset.find(m => m.id === moduloId);

        // Eliminar todos los permisos de este módulo para este perfil
        await pool.request()
          .input('perfilId', sql.Int, perfilId)
          .input('moduloId', sql.Int, moduloId)
          .query('DELETE FROM perfil_modulo_sucursal WHERE perfil_id = @perfilId AND modulo_id = @moduloId');

        // Insertar SOLO la sucursal del jefe
        await pool.request()
          .input('perfilId', sql.Int, perfilId)
          .input('moduloId', sql.Int, moduloId)
          .input('sucursalId', sql.Int, config.sucursal.id)
          .query('INSERT INTO perfil_modulo_sucursal (perfil_id, modulo_id, sucursal_id) VALUES (@perfilId, @moduloId, @sucursalId)');

        console.log(`   🔒 ${modulo.nombre.padEnd(25)} → Solo ${config.sucursal.nombre}`);
      }
    }

    console.log('\n✅ CORRECCIÓN COMPLETADA\n');

    // Verificar resultado
    console.log('📊 VERIFICACIÓN:\n');
    for (const config of jefesConfig) {
      if (!config.sucursal) continue;

      const perfilRes = await pool.request()
        .input('nombre', sql.VarChar, config.nombre)
        .query('SELECT id FROM perfiles WHERE nombre = @nombre');

      if (perfilRes.recordset.length === 0) continue;

      const perfilId = perfilRes.recordset[0].id;

      console.log(`${config.nombre}:`);

      const permisos = await pool.request()
        .input('perfilId', sql.Int, perfilId)
        .query(`
          SELECT
            m.nombre AS modulo,
            COUNT(DISTINCT pms.sucursal_id) AS cant_sucursales
          FROM modulos m
            INNER JOIN perfil_modulo_sucursal pms ON pms.modulo_id = m.id
          WHERE pms.perfil_id = @perfilId
            AND m.nombre IN ('Ventas', 'Los Más Vendidos', 'Rentabilidad', 'Resumen Valorizado')
          GROUP BY m.nombre
          ORDER BY m.nombre
        `);

      permisos.recordset.forEach(p => {
        const emoji = p.cant_sucursales === 1 ? '✅' : '❌';
        console.log(`  ${emoji} ${p.modulo.padEnd(25)} → ${p.cant_sucursales} sucursal(es)`);
      });
      console.log('');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

corregirJefesLocal();
