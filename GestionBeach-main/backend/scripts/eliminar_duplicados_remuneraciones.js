// backend/scripts/eliminar_duplicados_remuneraciones.js
// Script para eliminar remuneraciones duplicadas (mantiene el registro con ID más alto)

const { sql, poolPromise } = require('../config/db');

async function eliminarDuplicados() {
  console.log('🔧 === ELIMINACIÓN DE REMUNERACIONES DUPLICADAS ===\n');

  try {
    const pool = await poolPromise;

    // 1. Identificar duplicados
    console.log('🔍 Identificando duplicados...\n');

    const duplicadosPorPeriodo = await pool.request().query(`
      SELECT
        dr.rut_empleado,
        dr.nombre_empleado,
        dr.id_periodo,
        COUNT(*) as cantidad_registros
      FROM datos_remuneraciones dr
      GROUP BY dr.rut_empleado, dr.nombre_empleado, dr.id_periodo
      HAVING COUNT(*) > 1
    `);

    console.log(`Empleados con duplicados: ${duplicadosPorPeriodo.recordset.length}\n`);

    if (duplicadosPorPeriodo.recordset.length === 0) {
      console.log('✅ No hay duplicados para eliminar');
      process.exit(0);
      return;
    }

    // 2. Obtener IDs a eliminar (todos excepto el más reciente - mayor ID)
    console.log('📋 Recopilando IDs a eliminar...\n');

    let idsAEliminar = [];
    let totalDuplicadosEliminar = 0;

    for (const dup of duplicadosPorPeriodo.recordset) {
      // Obtener todos los IDs para este empleado + período
      const idsResult = await pool.request()
        .input('rut', sql.VarChar, dup.rut_empleado)
        .input('id_periodo', sql.Int, dup.id_periodo)
        .query(`
          SELECT id
          FROM datos_remuneraciones
          WHERE rut_empleado = @rut AND id_periodo = @id_periodo
          ORDER BY id DESC
        `);

      const ids = idsResult.recordset.map(r => r.id);

      // Mantener el primero (ID más alto = más reciente) y eliminar los demás
      const idsParaEliminar = ids.slice(1);
      idsAEliminar.push(...idsParaEliminar);

      totalDuplicadosEliminar += idsParaEliminar.length;

      console.log(`${dup.nombre_empleado} (RUT: ${dup.rut_empleado})`);
      console.log(`   Período: ${dup.id_periodo}`);
      console.log(`   Total registros: ${ids.length}`);
      console.log(`   Mantener ID: ${ids[0]}`);
      console.log(`   Eliminar IDs: ${idsParaEliminar.join(', ')}`);
      console.log('');
    }

    console.log(`\n📈 Total de registros a eliminar: ${totalDuplicadosEliminar}\n`);

    // 3. Confirmación (puedes comentar esto si quieres que se ejecute automáticamente)
    console.log('⚠️ ADVERTENCIA: Esta operación eliminará permanentemente los registros duplicados.');
    console.log('   Se mantendrá el registro con el ID más alto para cada empleado/período.\n');

    // 4. Eliminar duplicados
    if (idsAEliminar.length > 0) {
      console.log('🗑️ Eliminando duplicados...\n');

      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        let eliminados = 0;

        // Eliminar en lotes de 100 para evitar límites de parámetros
        const batchSize = 100;
        for (let i = 0; i < idsAEliminar.length; i += batchSize) {
          const batch = idsAEliminar.slice(i, i + batchSize);

          const placeholders = batch.map((_, index) => `@id${index}`).join(',');
          const request = transaction.request();

          batch.forEach((id, index) => {
            request.input(`id${index}`, sql.Int, id);
          });

          await request.query(`
            DELETE FROM datos_remuneraciones
            WHERE id IN (${placeholders})
          `);

          eliminados += batch.length;
          console.log(`   Progreso: ${eliminados}/${idsAEliminar.length} registros eliminados`);
        }

        await transaction.commit();

        console.log(`\n✅ Eliminación completada exitosamente`);
        console.log(`   Total eliminados: ${eliminados} registros duplicados`);
      } catch (error) {
        await transaction.rollback();
        console.error('❌ Error durante la eliminación. Cambios revertidos.');
        throw error;
      }
    }

    // 5. Verificación final
    console.log('\n🔍 Verificando que no queden duplicados...\n');

    const verificacion = await pool.request().query(`
      SELECT
        dr.rut_empleado,
        dr.nombre_empleado,
        dr.id_periodo,
        COUNT(*) as cantidad_registros
      FROM datos_remuneraciones dr
      GROUP BY dr.rut_empleado, dr.id_periodo
      HAVING COUNT(*) > 1
    `);

    if (verificacion.recordset.length === 0) {
      console.log('✅ Verificación exitosa: No quedan duplicados\n');
    } else {
      console.log(`⚠️ Advertencia: Aún quedan ${verificacion.recordset.length} empleados con duplicados\n`);
    }

    console.log('💡 SIGUIENTE PASO:');
    console.log('   Verifica en Estado de Resultados que los montos ahora sean correctos.\n');

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Detalles:', error.message);
  }

  process.exit(0);
}

// Ejecutar
eliminarDuplicados();
