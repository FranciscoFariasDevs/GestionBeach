// backend/scripts/diagnosticar_empleados_completo.js
// Script para diagnosticar empleados sin sucursal o razón social

const { sql, poolPromise } = require('../config/db');

async function diagnosticarEmpleados() {
  console.log('🔍 === DIAGNÓSTICO COMPLETO DE EMPLEADOS ===\n');

  try {
    const pool = await poolPromise;

    // 1. EMPLEADOS SIN RAZÓN SOCIAL
    console.log('📊 1. EMPLEADOS SIN RAZÓN SOCIAL:');
    console.log('═'.repeat(80));

    const sinRazonSocial = await pool.request().query(`
      SELECT
        id,
        rut,
        nombre,
        apellido,
        establecimiento,
        activo
      FROM empleados
      WHERE id_razon_social IS NULL AND activo = 1
      ORDER BY nombre
    `);

    console.log(`Total: ${sinRazonSocial.recordset.length} empleados sin razón social\n`);

    if (sinRazonSocial.recordset.length > 0) {
      sinRazonSocial.recordset.forEach((emp, index) => {
        console.log(`${index + 1}. ${emp.nombre} ${emp.apellido || ''} (RUT: ${emp.rut})`);
        console.log(`   Establecimiento: ${emp.establecimiento || 'No especificado'}`);
        console.log(`   ID: ${emp.id}\n`);
      });
    }

    // 2. EMPLEADOS SIN SUCURSALES EN empleados_sucursales
    console.log('\n📊 2. EMPLEADOS SIN SUCURSALES (tabla empleados_sucursales):');
    console.log('═'.repeat(80));

    const sinSucursal = await pool.request().query(`
      SELECT
        e.id,
        e.rut,
        e.nombre,
        e.apellido,
        e.establecimiento,
        e.id_razon_social,
        rs.nombre_razon,
        e.activo
      FROM empleados e
      LEFT JOIN razones_sociales rs ON e.id_razon_social = rs.id
      LEFT JOIN empleados_sucursales es ON e.id = es.id_empleado AND es.activo = 1
      WHERE es.id IS NULL AND e.activo = 1
      ORDER BY e.nombre
    `);

    console.log(`Total: ${sinSucursal.recordset.length} empleados sin sucursal asignada\n`);

    if (sinSucursal.recordset.length > 0) {
      sinSucursal.recordset.forEach((emp, index) => {
        console.log(`${index + 1}. ${emp.nombre} ${emp.apellido || ''} (RUT: ${emp.rut})`);
        console.log(`   Establecimiento: ${emp.establecimiento || 'No especificado'}`);
        console.log(`   Razón Social: ${emp.nombre_razon || 'Sin asignar'}`);
        console.log(`   ID: ${emp.id}\n`);
      });
    }

    // 3. EMPLEADOS CON REMUNERACIONES PERO SIN SUCURSAL
    console.log('\n📊 3. EMPLEADOS CON REMUNERACIONES PERO SIN SUCURSAL:');
    console.log('═'.repeat(80));

    const conRemuneracionSinSucursal = await pool.request().query(`
      SELECT DISTINCT
        e.id,
        e.rut,
        e.nombre,
        e.apellido,
        e.establecimiento,
        e.id_razon_social,
        rs.nombre_razon,
        COUNT(DISTINCT dr.id) as cant_remuneraciones,
        MAX(p.mes) as ultimo_mes,
        MAX(p.anio) as ultimo_anio
      FROM empleados e
      INNER JOIN datos_remuneraciones dr ON
        REPLACE(REPLACE(REPLACE(UPPER(e.rut), '.', ''), '-', ''), ' ', '') =
        REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '')
      INNER JOIN periodos_remuneracion p ON dr.id_periodo = p.id_periodo
      LEFT JOIN razones_sociales rs ON e.id_razon_social = rs.id
      LEFT JOIN empleados_sucursales es ON e.id = es.id_empleado AND es.activo = 1
      WHERE es.id IS NULL AND e.activo = 1
      GROUP BY e.id, e.rut, e.nombre, e.apellido, e.establecimiento, e.id_razon_social, rs.nombre_razon
      ORDER BY cant_remuneraciones DESC, e.nombre
    `);

    console.log(`Total: ${conRemuneracionSinSucursal.recordset.length} empleados CON remuneraciones pero SIN sucursal\n`);
    console.log('⚠️ CRÍTICO: Estos empleados tienen sueldos pero no aparecerán en Estado de Resultados\n');

    if (conRemuneracionSinSucursal.recordset.length > 0) {
      conRemuneracionSinSucursal.recordset.forEach((emp, index) => {
        console.log(`${index + 1}. ${emp.nombre} ${emp.apellido || ''} (RUT: ${emp.rut})`);
        console.log(`   Establecimiento: ${emp.establecimiento || 'No especificado'}`);
        console.log(`   Razón Social: ${emp.nombre_razon || 'Sin asignar'}`);
        console.log(`   Remuneraciones: ${emp.cant_remuneraciones} registros`);
        console.log(`   Último período: ${emp.ultimo_mes}/${emp.ultimo_anio}`);
        console.log(`   ID: ${emp.id}\n`);
      });
    }

    // 4. RESUMEN DE SUCURSALES DISPONIBLES
    console.log('\n📊 4. SUCURSALES DISPONIBLES EN EL SISTEMA:');
    console.log('═'.repeat(80));

    const sucursales = await pool.request().query(`
      SELECT id, nombre, tipo_sucursal, id_razon_social
      FROM sucursales
      ORDER BY nombre
    `);

    console.log(`Total: ${sucursales.recordset.length} sucursales\n`);

    sucursales.recordset.forEach((suc, index) => {
      console.log(`${index + 1}. [ID: ${suc.id}] ${suc.nombre}`);
      console.log(`   Tipo: ${suc.tipo_sucursal || 'No especificado'}`);
      console.log(`   Razón Social ID: ${suc.id_razon_social || 'No especificada'}\n`);
    });

    // 5. ESTADÍSTICAS DE empleados_sucursales
    console.log('\n📊 5. ESTADÍSTICAS DE EMPLEADOS POR SUCURSAL:');
    console.log('═'.repeat(80));

    const estadisticas = await pool.request().query(`
      SELECT
        s.id,
        s.nombre as sucursal_nombre,
        COUNT(DISTINCT es.id_empleado) as cantidad_empleados,
        COUNT(DISTINCT CASE WHEN es.activo = 1 THEN es.id_empleado END) as empleados_activos,
        COUNT(DISTINCT CASE WHEN es.activo = 0 THEN es.id_empleado END) as empleados_inactivos
      FROM sucursales s
      LEFT JOIN empleados_sucursales es ON s.id = es.id_sucursal
      GROUP BY s.id, s.nombre
      ORDER BY cantidad_empleados DESC
    `);

    estadisticas.recordset.forEach(stat => {
      console.log(`${stat.sucursal_nombre}:`);
      console.log(`   Total empleados: ${stat.cantidad_empleados}`);
      console.log(`   Activos: ${stat.empleados_activos}`);
      console.log(`   Inactivos: ${stat.empleados_inactivos}\n`);
    });

    // 6. RECOMENDACIONES
    console.log('\n💡 RECOMENDACIONES:');
    console.log('═'.repeat(80));
    console.log('1. Para empleados CON remuneraciones pero SIN sucursal:');
    console.log('   - Ve al módulo de Remuneraciones');
    console.log('   - Selecciona un período');
    console.log('   - Usa la opción "Asignar Razón Social y Sucursal"');
    console.log('   - Asigna las sucursales correctas a cada empleado');
    console.log('');
    console.log('2. Para empleados sin razón social:');
    console.log('   - Ve al módulo de Empleados');
    console.log('   - Edita cada empleado');
    console.log('   - Asigna la razón social correspondiente');
    console.log('');
    console.log('3. Para verificar que los cambios se reflejen:');
    console.log('   - Ve al módulo de Estado de Resultados');
    console.log('   - Consulta el período y sucursal correspondiente');
    console.log('   - Verifica que aparezcan los sueldos en Gastos Operativos');
    console.log('');

    // 7. RESUMEN FINAL
    console.log('\n📈 RESUMEN FINAL:');
    console.log('═'.repeat(80));
    console.log(`Total empleados activos: ${sinSucursal.recordset.length + sinRazonSocial.recordset.length}`);
    console.log(`Sin razón social: ${sinRazonSocial.recordset.length}`);
    console.log(`Sin sucursal: ${sinSucursal.recordset.length}`);
    console.log(`Con remuneraciones pero sin sucursal (CRÍTICO): ${conRemuneracionSinSucursal.recordset.length}`);
    console.log('');

    if (conRemuneracionSinSucursal.recordset.length > 0) {
      console.log('⚠️ ACCIÓN REQUERIDA: Hay empleados con sueldos que no aparecerán en Estado de Resultados');
      console.log('   hasta que se les asigne una sucursal.');
    } else {
      console.log('✅ Todos los empleados con remuneraciones tienen sucursal asignada');
    }

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    console.error('Detalles:', error.message);
  }

  process.exit(0);
}

// Ejecutar
diagnosticarEmpleados();
