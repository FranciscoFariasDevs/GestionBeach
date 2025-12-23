// backend/scripts/diagnosticar_duplicados_remuneraciones.js
// Script para detectar remuneraciones duplicadas

const { sql, poolPromise } = require('../config/db');

async function diagnosticarDuplicados() {
  console.log('🔍 === DIAGNÓSTICO DE REMUNERACIONES DUPLICADAS ===\n');

  try {
    const pool = await poolPromise;

    // 1. BUSCAR DUPLICADOS POR RUT + PERIODO
    console.log('📊 1. DUPLICADOS POR RUT + PERÍODO:');
    console.log('═'.repeat(80));

    const duplicadosPorPeriodo = await pool.request().query(`
      SELECT
        dr.rut_empleado,
        dr.nombre_empleado,
        dr.id_periodo,
        p.mes,
        p.anio,
        p.descripcion as periodo_descripcion,
        COUNT(*) as cantidad_registros,
        SUM(dr.total_haberes) as total_haberes_sum,
        SUM(dr.total_descuentos) as total_descuentos_sum,
        SUM(dr.liquido_pagar) as liquido_pagar_sum
      FROM datos_remuneraciones dr
      INNER JOIN periodos_remuneracion p ON dr.id_periodo = p.id_periodo
      GROUP BY dr.rut_empleado, dr.nombre_empleado, dr.id_periodo, p.mes, p.anio, p.descripcion
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC, p.anio DESC, p.mes DESC, dr.nombre_empleado
    `);

    console.log(`Total empleados con duplicados: ${duplicadosPorPeriodo.recordset.length}\n`);

    if (duplicadosPorPeriodo.recordset.length > 0) {
      console.log('⚠️ CRÍTICO: Hay empleados con múltiples remuneraciones en el mismo período\n');

      let totalRegistrosDuplicados = 0;
      for (let index = 0; index < duplicadosPorPeriodo.recordset.length; index++) {
        const dup = duplicadosPorPeriodo.recordset[index];

        // Obtener IDs de los duplicados
        const idsResult = await pool.request()
          .input('rut', sql.VarChar, dup.rut_empleado)
          .input('id_periodo', sql.Int, dup.id_periodo)
          .query(`
            SELECT id FROM datos_remuneraciones
            WHERE rut_empleado = @rut AND id_periodo = @id_periodo
            ORDER BY id
          `);

        const ids = idsResult.recordset.map(r => r.id).join(', ');

        console.log(`${index + 1}. ${dup.nombre_empleado} (RUT: ${dup.rut_empleado})`);
        console.log(`   Período: ${dup.mes}/${dup.anio} - ${dup.periodo_descripcion}`);
        console.log(`   Cantidad de registros: ${dup.cantidad_registros}`);
        console.log(`   IDs duplicados: ${ids}`);
        console.log(`   Total Haberes: $${dup.total_haberes_sum?.toLocaleString('es-CL') || 0}`);
        console.log(`   Total Descuentos: $${dup.total_descuentos_sum?.toLocaleString('es-CL') || 0}`);
        console.log(`   Líquido a Pagar: $${dup.liquido_pagar_sum?.toLocaleString('es-CL') || 0}`);
        console.log('');

        totalRegistrosDuplicados += (dup.cantidad_registros - 1); // -1 porque uno es el original
      }

      console.log(`\n📈 Total de registros duplicados a eliminar: ${totalRegistrosDuplicados}\n`);
    } else {
      console.log('✅ No se encontraron duplicados por RUT + Período\n');
    }

    // 2. DETALLE DE DUPLICADOS (mostrar diferencias)
    if (duplicadosPorPeriodo.recordset.length > 0) {
      console.log('\n📊 2. DETALLE DE REGISTROS DUPLICADOS (primeros 10):');
      console.log('═'.repeat(80));

      for (let i = 0; i < Math.min(10, duplicadosPorPeriodo.recordset.length); i++) {
        const dup = duplicadosPorPeriodo.recordset[i];

        // Obtener IDs de los duplicados
        const idsResult = await pool.request()
          .input('rut', sql.VarChar, dup.rut_empleado)
          .input('id_periodo', sql.Int, dup.id_periodo)
          .query(`
            SELECT id FROM datos_remuneraciones
            WHERE rut_empleado = @rut AND id_periodo = @id_periodo
            ORDER BY id
          `);

        const ids = idsResult.recordset.map(r => r.id);

        console.log(`\n[${i + 1}] ${dup.nombre_empleado} - Período ${dup.mes}/${dup.anio}`);
        console.log('─'.repeat(80));

        for (const id of ids) {
          const detalle = await pool.request()
            .input('id', sql.Int, id)
            .query(`
              SELECT
                id,
                total_haberes,
                total_descuentos,
                liquido_pagar,
                created_at
              FROM datos_remuneraciones
              WHERE id = @id
            `);

          if (detalle.recordset.length > 0) {
            const reg = detalle.recordset[0];
            console.log(`   ID: ${reg.id}`);
            console.log(`   Haberes: $${reg.total_haberes?.toLocaleString('es-CL') || 0}`);
            console.log(`   Descuentos: $${reg.total_descuentos?.toLocaleString('es-CL') || 0}`);
            console.log(`   Líquido: $${reg.liquido_pagar?.toLocaleString('es-CL') || 0}`);
            console.log(`   Creado: ${reg.created_at}`);
            console.log('');
          }
        }
      }
    }

    // 3. ESTADÍSTICAS POR PERÍODO
    console.log('\n📊 3. ESTADÍSTICAS DE DUPLICADOS POR PERÍODO:');
    console.log('═'.repeat(80));

    const estadisticasPeriodo = await pool.request().query(`
      SELECT
        p.id_periodo,
        p.mes,
        p.anio,
        p.descripcion,
        COUNT(DISTINCT dr.rut_empleado) as total_empleados_unicos,
        COUNT(*) as total_registros,
        COUNT(*) - COUNT(DISTINCT dr.rut_empleado) as registros_duplicados
      FROM datos_remuneraciones dr
      INNER JOIN periodos_remuneracion p ON dr.id_periodo = p.id_periodo
      GROUP BY p.id_periodo, p.mes, p.anio, p.descripcion
      HAVING COUNT(*) > COUNT(DISTINCT dr.rut_empleado)
      ORDER BY p.anio DESC, p.mes DESC
    `);

    if (estadisticasPeriodo.recordset.length > 0) {
      estadisticasPeriodo.recordset.forEach(stat => {
        console.log(`Período: ${stat.mes}/${stat.anio} - ${stat.descripcion}`);
        console.log(`   Empleados únicos: ${stat.total_empleados_unicos}`);
        console.log(`   Total registros: ${stat.total_registros}`);
        console.log(`   Duplicados: ${stat.registros_duplicados}`);
        console.log('');
      });
    } else {
      console.log('✅ No hay duplicados en ningún período\n');
    }

    // 4. RECOMENDACIONES
    console.log('\n💡 RECOMENDACIONES:');
    console.log('═'.repeat(80));

    if (duplicadosPorPeriodo.recordset.length > 0) {
      console.log('1. Ejecutar script de limpieza de duplicados:');
      console.log('   node scripts/eliminar_duplicados_remuneraciones.js');
      console.log('');
      console.log('2. Verificar proceso de importación de remuneraciones');
      console.log('   - Revisar que no se importen archivos múltiples veces');
      console.log('   - Agregar validación antes de insertar');
      console.log('');
      console.log('3. Después de limpiar, verificar en Estado de Resultados');
      console.log('   - Los totales deberían ser correctos');
      console.log('   - No debería haber inflación de montos');
    } else {
      console.log('✅ No se requiere acción - No hay duplicados');
    }

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    console.error('Detalles:', error.message);
  }

  process.exit(0);
}

// Ejecutar
diagnosticarDuplicados();
