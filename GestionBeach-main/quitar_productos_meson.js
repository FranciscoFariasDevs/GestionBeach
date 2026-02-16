const { sql, poolPromise } = require('./backend/config/db');

async function quitarProductosMeson() {
  try {
    const pool = await poolPromise;

    console.log('🔄 QUITANDO MÓDULO PRODUCTOS DE PERFILES DE MESÓN\n');

    // Obtener ID del módulo Productos
    const productosRes = await pool.request()
      .input('nombre', sql.VarChar, 'Productos')
      .query('SELECT id FROM modulos WHERE nombre = @nombre');

    if (productosRes.recordset.length === 0) {
      console.log('❌ Módulo Productos no encontrado');
      process.exit(1);
    }

    const productosId = productosRes.recordset[0].id;
    console.log(`📦 Módulo Productos ID: ${productosId}\n`);

    // Obtener todos los perfiles de Mesón
    const perfilesMeson = await pool.request()
      .query("SELECT id, nombre FROM perfiles WHERE nombre LIKE 'Meson %' ORDER BY nombre");

    console.log(`📋 Encontrados ${perfilesMeson.recordset.length} perfiles de Mesón:\n`);

    for (const perfil of perfilesMeson.recordset) {
      console.log(`🔄 Procesando: ${perfil.nombre}`);

      // Eliminar el módulo Productos (pero mantener Consultar Producto)
      const result = await pool.request()
        .input('perfilId', sql.Int, perfil.id)
        .input('moduloId', sql.Int, productosId)
        .query('DELETE FROM perfil_modulo_sucursal WHERE perfil_id = @perfilId AND modulo_id = @moduloId');

      console.log(`   ✅ Módulo Productos eliminado (${result.rowsAffected[0]} filas)\n`);
    }

    console.log('✅ PROCESO COMPLETADO\n');

    // Verificación final
    console.log('📊 VERIFICACIÓN FINAL:\n');

    for (const perfil of perfilesMeson.recordset) {
      const permisos = await pool.request()
        .input('perfilId', sql.Int, perfil.id)
        .query(`
          SELECT m.nombre
          FROM perfil_modulo_sucursal pms
            INNER JOIN modulos m ON m.id = pms.modulo_id
          WHERE pms.perfil_id = @perfilId
          ORDER BY m.nombre
        `);

      console.log(`${perfil.nombre}:`);
      if (permisos.recordset.length === 0) {
        console.log('   ⚠️  Sin módulos');
      } else {
        permisos.recordset.forEach(p => {
          console.log(`   ✅ ${p.nombre}`);
        });
      }
      console.log('');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

quitarProductosMeson();
