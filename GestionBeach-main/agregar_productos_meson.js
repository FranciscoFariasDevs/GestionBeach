const { sql, poolPromise } = require('./backend/config/db');

async function agregarProductosMeson() {
  try {
    const pool = await poolPromise;

    console.log('🔄 AGREGANDO MÓDULO PRODUCTOS A PERFILES DE MESÓN\n');

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

      // Obtener la sucursal del perfil desde su permiso de Consultar Producto
      const sucursalRes = await pool.request()
        .input('perfilId', sql.Int, perfil.id)
        .query(`
          SELECT DISTINCT sucursal_id
          FROM perfil_modulo_sucursal
          WHERE perfil_id = @perfilId
        `);

      if (sucursalRes.recordset.length === 0) {
        console.log(`   ⚠️  Sin sucursal asignada, saltando...`);
        continue;
      }

      const sucursalId = sucursalRes.recordset[0].sucursal_id;

      // Verificar si ya tiene el módulo Productos
      const yaExiste = await pool.request()
        .input('perfilId', sql.Int, perfil.id)
        .input('moduloId', sql.Int, productosId)
        .input('sucursalId', sql.Int, sucursalId)
        .query(`
          SELECT COUNT(*) as count
          FROM perfil_modulo_sucursal
          WHERE perfil_id = @perfilId
            AND modulo_id = @moduloId
            AND sucursal_id = @sucursalId
        `);

      if (yaExiste.recordset[0].count > 0) {
        console.log(`   ℹ️  Ya tiene módulo Productos`);
        continue;
      }

      // Agregar el módulo Productos
      await pool.request()
        .input('perfilId', sql.Int, perfil.id)
        .input('moduloId', sql.Int, productosId)
        .input('sucursalId', sql.Int, sucursalId)
        .query('INSERT INTO perfil_modulo_sucursal (perfil_id, modulo_id, sucursal_id) VALUES (@perfilId, @moduloId, @sucursalId)');

      console.log(`   ✅ Módulo Productos agregado\n`);
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
      permisos.recordset.forEach(p => {
        console.log(`   ✅ ${p.nombre}`);
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

agregarProductosMeson();
