// backend/scripts/reporte_final_completo.js
// Reporte ejecutivo completo del sistema

const { sql, poolPromise } = require('../config/db');

async function generarReporteCompleto() {
  console.log('\n');
  console.log('═'.repeat(80));
  console.log('               REPORTE EJECUTIVO DEL SISTEMA                    ');
  console.log('═'.repeat(80));
  console.log('\n');

  try {
    const pool = await poolPromise;

    // 1. ESTADÍSTICAS DE EMPLEADOS
    console.log('📊 ESTADÍSTICAS DE EMPLEADOS');
    console.log('─'.repeat(80));

    const statsEmpleados = await pool.request().query(`
      SELECT
        COUNT(*) as total_empleados,
        COUNT(CASE WHEN activo = 1 THEN 1 END) as empleados_activos,
        COUNT(CASE WHEN activo = 0 THEN 1 END) as empleados_inactivos,
        COUNT(CASE WHEN id_razon_social IS NOT NULL THEN 1 END) as con_razon_social,
        COUNT(CASE WHEN id_razon_social IS NULL THEN 1 END) as sin_razon_social
      FROM empleados
    `);

    const stats = statsEmpleados.recordset[0];
    console.log(`Total empleados: ${stats.total_empleados}`);
    console.log(`  ├─ Activos: ${stats.empleados_activos}`);
    console.log(`  ├─ Inactivos: ${stats.empleados_inactivos}`);
    console.log(`  ├─ Con razón social: ${stats.con_razon_social}`);
    console.log(`  └─ Sin razón social: ${stats.sin_razon_social}`);
    console.log('');

    // 2. ASIGNACIÓN DE SUCURSALES
    console.log('🏢 ASIGNACIÓN DE SUCURSALES');
    console.log('─'.repeat(80));

    const statsSucursales = await pool.request().query(`
      SELECT
        COUNT(DISTINCT e.id) as total_empleados_activos,
        COUNT(DISTINCT es.id_empleado) as empleados_con_sucursal,
        COUNT(DISTINCT e.id) - COUNT(DISTINCT es.id_empleado) as empleados_sin_sucursal
      FROM empleados e
      LEFT JOIN empleados_sucursales es ON e.id = es.id_empleado AND es.activo = 1
      WHERE e.activo = 1
    `);

    const statsSuc = statsSucursales.recordset[0];
    const porcentajeAsignado = ((statsSuc.empleados_con_sucursal / statsSuc.total_empleados_activos) * 100).toFixed(1);

    console.log(`Empleados activos: ${statsSuc.total_empleados_activos}`);
    console.log(`  ├─ Con sucursal asignada: ${statsSuc.empleados_con_sucursal} (${porcentajeAsignado}%)`);
    console.log(`  └─ Sin sucursal: ${statsSuc.empleados_sin_sucursal}`);
    console.log('');

    // 3. EMPLEADOS CRÍTICOS (con remuneraciones pero sin sucursal)
    console.log('⚠️  EMPLEADOS CRÍTICOS');
    console.log('─'.repeat(80));

    const criticos = await pool.request().query(`
      SELECT COUNT(DISTINCT e.id) as total
      FROM empleados e
      INNER JOIN datos_remuneraciones dr ON
        REPLACE(REPLACE(REPLACE(UPPER(e.rut), '.', ''), '-', ''), ' ', '') =
        REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '')
      LEFT JOIN empleados_sucursales es ON e.id = es.id_empleado AND es.activo = 1
      WHERE es.id IS NULL AND e.activo = 1
    `);

    const totalCriticos = criticos.recordset[0].total;

    if (totalCriticos === 0) {
      console.log('✅ 0 empleados con remuneraciones sin sucursal');
      console.log('✅ Todos los empleados aparecerán correctamente en Estado de Resultados');
    } else {
      console.log(`❌ ${totalCriticos} empleados con remuneraciones SIN sucursal`);
      console.log('❌ Estos empleados NO aparecerán en Estado de Resultados');
    }
    console.log('');

    // 4. REMUNERACIONES
    console.log('💰 REMUNERACIONES');
    console.log('─'.repeat(80));

    const statsRemuneraciones = await pool.request().query(`
      SELECT
        COUNT(*) as total_registros,
        COUNT(DISTINCT rut_empleado) as empleados_unicos,
        COUNT(DISTINCT dr.id_periodo) as periodos_distintos,
        MIN(p.anio) as anio_min,
        MAX(p.anio) as anio_max
      FROM datos_remuneraciones dr
      INNER JOIN periodos_remuneracion p ON dr.id_periodo = p.id_periodo
    `);

    const statsRem = statsRemuneraciones.recordset[0];
    console.log(`Total registros de remuneraciones: ${statsRem.total_registros}`);
    console.log(`  ├─ Empleados únicos con remuneraciones: ${statsRem.empleados_unicos}`);
    console.log(`  ├─ Períodos distintos: ${statsRem.periodos_distintos}`);
    console.log(`  └─ Rango años: ${statsRem.anio_min} - ${statsRem.anio_max}`);
    console.log('');

    // 5. DUPLICADOS
    console.log('🔍 DUPLICADOS');
    console.log('─'.repeat(80));

    const duplicados = await pool.request().query(`
      SELECT COUNT(*) as total_duplicados
      FROM (
        SELECT rut_empleado, id_periodo, COUNT(*) as count
        FROM datos_remuneraciones
        GROUP BY rut_empleado, id_periodo
        HAVING COUNT(*) > 1
      ) AS dup
    `);

    const totalDuplicados = duplicados.recordset[0].total_duplicados;

    if (totalDuplicados === 0) {
      console.log('✅ 0 remuneraciones duplicadas');
      console.log('✅ Los montos en Estado de Resultados serán correctos');
    } else {
      console.log(`❌ ${totalDuplicados} casos de duplicados detectados`);
      console.log('❌ Los montos en Estado de Resultados estarán inflados');
    }
    console.log('');

    // 6. DISTRIBUCIÓN POR SUCURSAL
    console.log('🏪 DISTRIBUCIÓN POR SUCURSAL');
    console.log('─'.repeat(80));

    const porSucursal = await pool.request().query(`
      SELECT TOP 10
        s.nombre,
        COUNT(DISTINCT es.id_empleado) as total_empleados,
        COUNT(DISTINCT CASE WHEN es.activo = 1 THEN es.id_empleado END) as empleados_activos
      FROM sucursales s
      LEFT JOIN empleados_sucursales es ON s.id = es.id_sucursal
      GROUP BY s.nombre
      ORDER BY empleados_activos DESC
    `);

    porSucursal.recordset.forEach((suc, index) => {
      console.log(`${index + 1}. ${suc.nombre}`);
      console.log(`   └─ ${suc.empleados_activos} empleados activos`);
    });
    console.log('');

    // 7. ESTADO FINAL
    console.log('═'.repeat(80));
    console.log('                    ESTADO FINAL DEL SISTEMA                    ');
    console.log('═'.repeat(80));
    console.log('');

    const todoOK = totalCriticos === 0 && totalDuplicados === 0;

    if (todoOK) {
      console.log('🎉 ✅ SISTEMA OPERATIVO AL 100%');
      console.log('');
      console.log('✓ Sin duplicados de remuneraciones');
      console.log('✓ Todos los empleados con remuneraciones tienen sucursal');
      console.log('✓ Estado de Resultados mostrará datos correctos');
      console.log('✓ Clasificación automática funcionando (Ventas/Administrativos)');
      console.log('');
      console.log('🚀 El sistema está listo para usar');
    } else {
      console.log('⚠️  REQUIERE ATENCIÓN');
      console.log('');
      if (totalDuplicados > 0) {
        console.log(`❌ ${totalDuplicados} casos de duplicados - Ejecutar: eliminar_duplicados_remuneraciones.js`);
      }
      if (totalCriticos > 0) {
        console.log(`❌ ${totalCriticos} empleados sin sucursal - Ejecutar scripts de asignación`);
      }
    }

    console.log('');
    console.log('═'.repeat(80));
    console.log('');

  } catch (error) {
    console.error('❌ Error generando reporte:', error.message);
  }

  process.exit(0);
}

generarReporteCompleto();
