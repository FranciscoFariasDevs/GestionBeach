// backend/scripts/fix_permisos_mantenciones.js
// Corrige los permisos del módulo Mantenciones:
// Lo elimina de los perfiles que no deben tener acceso.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sql, poolPromise } = require('../config/db');

const PERFILES_AUTORIZADOS = [10, 11, 35]; // Super Admin, Gerencia, Jefe de electricidad

async function fixPermisosMantenciones() {
  try {
    const pool = await poolPromise;
    console.log('✅ Conectado a la base de datos\n');

    // 1. Obtener ID del módulo
    const moduloResult = await pool.request()
      .query(`SELECT id, nombre FROM modulos WHERE nombre = 'Mantenciones'`);

    if (moduloResult.recordset.length === 0) {
      console.error('❌ No se encontró el módulo "Mantenciones" en la BD');
      console.error('   Verifica que el servidor haya sincronizado los módulos al menos una vez.');
      process.exit(1);
    }

    const moduloId = moduloResult.recordset[0].id;
    console.log(`📦 Módulo Mantenciones → ID: ${moduloId}\n`);

    // 2. Mostrar estado actual
    const antesResult = await pool.request()
      .input('moduloId', sql.Int, moduloId)
      .query(`
        SELECT p.id, p.nombre, COUNT(pms.id) as sucursales
        FROM perfiles p
        INNER JOIN perfil_modulo_sucursal pms ON pms.perfil_id = p.id
        WHERE pms.modulo_id = @moduloId
        GROUP BY p.id, p.nombre
        ORDER BY p.id
      `);

    console.log('📊 Perfiles con Mantenciones ANTES del fix:');
    if (antesResult.recordset.length === 0) {
      console.log('   (ninguno)');
    } else {
      antesResult.recordset.forEach(r => {
        const autorizado = PERFILES_AUTORIZADOS.includes(r.id) ? '✅' : '❌';
        console.log(`   ${autorizado} [${r.id}] ${r.nombre} — ${r.sucursales} sucursales`);
      });
    }

    // 3. Eliminar de perfiles no autorizados
    const deleteResult = await pool.request()
      .input('moduloId', sql.Int, moduloId)
      .query(`
        DELETE FROM perfil_modulo_sucursal
        WHERE modulo_id = @moduloId
        AND perfil_id NOT IN (${PERFILES_AUTORIZADOS.join(',')})
      `);

    console.log(`\n🗑️  Registros eliminados: ${deleteResult.rowsAffected[0]}`);

    // 4. Mostrar estado final
    const despuesResult = await pool.request()
      .input('moduloId', sql.Int, moduloId)
      .query(`
        SELECT p.id, p.nombre, COUNT(pms.id) as sucursales
        FROM perfiles p
        INNER JOIN perfil_modulo_sucursal pms ON pms.perfil_id = p.id
        WHERE pms.modulo_id = @moduloId
        GROUP BY p.id, p.nombre
        ORDER BY p.id
      `);

    console.log('\n📊 Perfiles con Mantenciones DESPUÉS del fix:');
    if (despuesResult.recordset.length === 0) {
      console.log('   (ninguno — asigna sucursales desde Admin → Perfiles)');
    } else {
      despuesResult.recordset.forEach(r => {
        console.log(`   ✅ [${r.id}] ${r.nombre} — ${r.sucursales} sucursales`);
      });
    }

    console.log('\n✅ Fix aplicado correctamente.');
    console.log('🔔 Si Gerencia o Jefe de Local no tienen sucursales asignadas,');
    console.log('   hazlo desde Admin → Perfiles → editar perfil → módulo Mantenciones.');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixPermisosMantenciones();
