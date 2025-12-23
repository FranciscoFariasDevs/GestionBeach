// backend/scripts/asignar_por_razon_social.js
// Asignar sucursal por defecto basándose en razón social

const { sql, poolPromise } = require('../config/db');

// Mapeo de razones sociales a sucursales predeterminadas
const SUCURSAL_POR_RAZON_SOCIAL = {
  1: 'DANIEL VERA 890, DICHATO',     // JAIME EDUARDO ERIZ FLORES
  2: 'LORD COCHRANE 1127,TOME',      // BEACH MARKET LTDA
  3: 'LORD COCHRANE 1127,TOME',      // ERIZ HERMANOS SPA
  4: 'LORD COCHRANE 1127,TOME',      // GESTIÓN BEACH SPA
  // Sin razón social (null)
  'null': 'LORD COCHRANE 1127,TOME'   // Sucursal principal por defecto
};

async function asignarPorRazonSocial() {
  console.log('🎯 === ASIGNACIÓN FINAL POR RAZÓN SOCIAL ===\n');

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Obtener empleados sin establecimiento y sin sucursal
    const empleadosSinSucursal = await pool.request().query(`
      SELECT DISTINCT e.id, e.rut, e.nombre, e.apellido, e.id_razon_social
      FROM empleados e
      INNER JOIN datos_remuneraciones dr ON
        REPLACE(REPLACE(REPLACE(UPPER(e.rut), '.', ''), '-', ''), ' ', '') =
        REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '')
      LEFT JOIN empleados_sucursales es ON e.id = es.id_empleado AND es.activo = 1
      WHERE es.id IS NULL
        AND e.activo = 1
        AND (e.establecimiento IS NULL OR e.establecimiento = '')
    `);

    console.log(`📋 Empleados a procesar: ${empleadosSinSucursal.recordset.length}\n`);

    if (empleadosSinSucursal.recordset.length === 0) {
      console.log('✅ No hay empleados sin sucursal');
      await transaction.commit();
      return;
    }

    // Obtener sucursales
    const sucursalesResult = await pool.request().query(`
      SELECT id, nombre FROM sucursales
    `);

    const sucursalesMap = new Map();
    sucursalesResult.recordset.forEach(s => {
      sucursalesMap.set(s.nombre.toUpperCase(), s.id);
    });

    let asignados = 0;

    // Procesar cada empleado
    for (const empleado of empleadosSinSucursal.recordset) {
      const razonSocialId = empleado.id_razon_social || 'null';
      const sucursalNombre = SUCURSAL_POR_RAZON_SOCIAL[razonSocialId] || SUCURSAL_POR_RAZON_SOCIAL['null'];

      console.log(`Procesando: ${empleado.nombre} ${empleado.apellido || ''}`);
      console.log(`   Razón Social ID: ${razonSocialId}`);
      console.log(`   Asignando a: ${sucursalNombre}`);

      const sucursalId = sucursalesMap.get(sucursalNombre.toUpperCase());

      if (!sucursalId) {
        console.log(`   ❌ Sucursal no encontrada\n`);
        continue;
      }

      // Verificar si ya existe
      const existe = await transaction.request()
        .input('id_empleado', sql.Int, empleado.id)
        .input('id_sucursal', sql.Int, sucursalId)
        .query(`
          SELECT COUNT(*) as count
          FROM empleados_sucursales
          WHERE id_empleado = @id_empleado AND id_sucursal = @id_sucursal
        `);

      if (existe.recordset[0].count > 0) {
        // Reactivar
        await transaction.request()
          .input('id_empleado', sql.Int, empleado.id)
          .input('id_sucursal', sql.Int, sucursalId)
          .query(`
            UPDATE empleados_sucursales
            SET activo = 1
            WHERE id_empleado = @id_empleado AND id_sucursal = @id_sucursal
          `);
        console.log(`   ✅ Reactivado\n`);
      } else {
        // Insertar
        await transaction.request()
          .input('id_empleado', sql.Int, empleado.id)
          .input('id_sucursal', sql.Int, sucursalId)
          .query(`
            INSERT INTO empleados_sucursales (id_empleado, id_sucursal, activo, created_at)
            VALUES (@id_empleado, @id_sucursal, 1, GETDATE())
          `);
        console.log(`   ✅ Asignado\n`);
      }

      asignados++;
    }

    await transaction.commit();

    console.log('\n═'.repeat(80));
    console.log('📊 RESUMEN FINAL:');
    console.log('═'.repeat(80));
    console.log(`Total procesados: ${empleadosSinSucursal.recordset.length}`);
    console.log(`Asignados exitosamente: ${asignados}`);
    console.log('\n✅ ASIGNACIÓN COMPLETADA\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    try {
      await transaction.rollback();
    } catch (e) {}
  }

  process.exit(0);
}

asignarPorRazonSocial();
