// backend/scripts/reparar_empleados_sucursales.js
// Script para asignar automáticamente sucursales a empleados basándose en su establecimiento

const { sql, poolPromise } = require('../config/db');

async function repararEmpleadosSucursales() {
  console.log('🔧 === REPARACIÓN AUTOMÁTICA DE EMPLEADOS-SUCURSALES ===\n');

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    // 1. Obtener empleados sin sucursal
    const empleadosSinSucursal = await pool.request().query(`
      SELECT
        e.id,
        e.rut,
        e.nombre,
        e.apellido,
        e.establecimiento
      FROM empleados e
      LEFT JOIN empleados_sucursales es ON e.id = es.id_empleado AND es.activo = 1
      WHERE es.id IS NULL AND e.activo = 1 AND e.establecimiento IS NOT NULL
    `);

    console.log(`Empleados a procesar: ${empleadosSinSucursal.recordset.length}\n`);

    if (empleadosSinSucursal.recordset.length === 0) {
      console.log('✅ No hay empleados que requieran asignación automática');
      await transaction.commit();
      process.exit(0);
      return;
    }

    // 2. Obtener todas las sucursales
    const sucursalesResult = await pool.request().query(`
      SELECT id, nombre
      FROM sucursales
    `);

    const sucursales = sucursalesResult.recordset;
    console.log(`Sucursales disponibles: ${sucursales.length}\n`);

    let procesados = 0;
    let asignados = 0;
    let noEncontrados = [];

    // 3. Procesar cada empleado
    for (const empleado of empleadosSinSucursal.recordset) {
      procesados++;
      const establecimiento = empleado.establecimiento || '';

      console.log(`[${procesados}/${empleadosSinSucursal.recordset.length}] Procesando: ${empleado.nombre} ${empleado.apellido || ''}`);
      console.log(`   Establecimiento: ${establecimiento}`);

      // Buscar sucursal que coincida con el establecimiento
      let sucursalEncontrada = null;

      // 1. Buscar coincidencia exacta
      sucursalEncontrada = sucursales.find(s =>
        s.nombre.toUpperCase() === establecimiento.toUpperCase()
      );

      // 2. Si no hay coincidencia exacta, buscar coincidencia parcial
      if (!sucursalEncontrada) {
        sucursalEncontrada = sucursales.find(s =>
          s.nombre.toUpperCase().includes(establecimiento.toUpperCase()) ||
          establecimiento.toUpperCase().includes(s.nombre.toUpperCase())
        );
      }

      // 3. Si aún no se encuentra, buscar por palabras clave
      if (!sucursalEncontrada) {
        const palabrasClave = establecimiento.toUpperCase().split(/[\s,]+/);
        for (const palabra of palabrasClave) {
          if (palabra.length >= 4) { // Palabras de al menos 4 caracteres
            sucursalEncontrada = sucursales.find(s =>
              s.nombre.toUpperCase().includes(palabra)
            );
            if (sucursalEncontrada) break;
          }
        }
      }

      if (sucursalEncontrada) {
        // Asignar sucursal
        try {
          await transaction.request()
            .input('id_empleado', sql.Int, empleado.id)
            .input('id_sucursal', sql.Int, sucursalEncontrada.id)
            .query(`
              INSERT INTO empleados_sucursales (id_empleado, id_sucursal, activo, created_at)
              VALUES (@id_empleado, @id_sucursal, 1, GETDATE())
            `);

          console.log(`   ✅ Asignado a sucursal: ${sucursalEncontrada.nombre} (ID: ${sucursalEncontrada.id})`);
          asignados++;
        } catch (error) {
          console.log(`   ⚠️ Error al asignar: ${error.message}`);
        }
      } else {
        console.log(`   ❌ No se encontró sucursal coincidente`);
        noEncontrados.push({
          id: empleado.id,
          nombre: `${empleado.nombre} ${empleado.apellido || ''}`,
          rut: empleado.rut,
          establecimiento: establecimiento
        });
      }

      console.log('');
    }

    await transaction.commit();

    // 4. Resumen
    console.log('\n═'.repeat(80));
    console.log('📊 RESUMEN DE LA REPARACIÓN:');
    console.log('═'.repeat(80));
    console.log(`Total procesados: ${procesados}`);
    console.log(`Asignados exitosamente: ${asignados}`);
    console.log(`No encontrados: ${noEncontrados.length}\n`);

    if (noEncontrados.length > 0) {
      console.log('⚠️ EMPLEADOS QUE REQUIEREN ASIGNACIÓN MANUAL:');
      console.log('═'.repeat(80));
      noEncontrados.forEach((emp, index) => {
        console.log(`${index + 1}. ${emp.nombre} (RUT: ${emp.rut})`);
        console.log(`   Establecimiento: ${emp.establecimiento}`);
        console.log(`   ID: ${emp.id}\n`);
      });

      console.log('💡 Para estos empleados:');
      console.log('   1. Ve al módulo de Empleados');
      console.log('   2. Edita cada empleado manualmente');
      console.log('   3. Asigna las sucursales correctas\n');
    }

    console.log('✅ Reparación completada');
    console.log('\n💡 Siguiente paso: Verifica en Estado de Resultados que ahora aparezcan las remuneraciones\n');

  } catch (error) {
    console.error('❌ Error en reparación:', error);
    console.error('Detalles:', error.message);
    try {
      await transaction.rollback();
      console.log('⚠️ Cambios revertidos');
    } catch (rollbackError) {
      console.error('❌ Error al revertir cambios:', rollbackError.message);
    }
  }

  process.exit(0);
}

// Ejecutar
repararEmpleadosSucursales();
