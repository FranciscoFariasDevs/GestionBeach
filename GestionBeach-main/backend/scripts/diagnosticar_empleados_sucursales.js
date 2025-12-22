// Script para diagnosticar el estado de empleados_sucursales
const { sql, poolPromise } = require('../config/db');

async function diagnosticar() {
  try {
    console.log('🔍 Diagnóstico de empleados_sucursales\n');

    const pool = await poolPromise;

    // 1. Verificar estructura de la tabla
    console.log('📊 Estructura de la tabla empleados_sucursales:');
    const estructura = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'empleados_sucursales'
      ORDER BY ORDINAL_POSITION
    `);
    console.table(estructura.recordset);

    // 2. Contar registros por valor de activo
    console.log('\n📈 Distribución de registros por valor de activo:');
    const distribucion = await pool.request().query(`
      SELECT
        activo,
        COUNT(*) as cantidad
      FROM empleados_sucursales
      GROUP BY activo
      ORDER BY activo
    `);
    console.table(distribucion.recordset);

    // 3. Verificar Marcela Yuvoska (ID 772)
    console.log('\n👤 Estado de Marcela Yuvoska (ID 772):');
    const marcela = await pool.request()
      .input('id_empleado', sql.Int, 772)
      .query(`
        SELECT
          es.id,
          es.id_empleado,
          es.id_sucursal,
          es.activo,
          s.nombre as nombre_sucursal,
          e.nombre + ' ' + e.apellido as nombre_empleado
        FROM empleados_sucursales es
        INNER JOIN empleados e ON es.id_empleado = e.id
        LEFT JOIN sucursales s ON es.id_sucursal = s.id
        WHERE es.id_empleado = @id_empleado
      `);

    if (marcela.recordset.length === 0) {
      console.log('❌ No se encontraron registros en empleados_sucursales para Marcela Yuvoska');
    } else {
      console.table(marcela.recordset);
    }

    // 4. Listar empleados con sucursales pero activo = NULL o 0
    console.log('\n⚠️ Empleados con sucursales donde activo NO es 1:');
    const empleadosSinActivo = await pool.request().query(`
      SELECT TOP 20
        e.id,
        e.rut,
        e.nombre + ' ' + e.apellido as nombre_completo,
        s.nombre as sucursal,
        es.activo,
        e.id_razon_social
      FROM empleados_sucursales es
      INNER JOIN empleados e ON es.id_empleado = e.id
      LEFT JOIN sucursales s ON es.id_sucursal = s.id
      WHERE (es.activo IS NULL OR es.activo != 1)
      ORDER BY e.id
    `);
    console.log(`Total encontrados: ${empleadosSinActivo.recordset.length}`);
    if (empleadosSinActivo.recordset.length > 0) {
      console.table(empleadosSinActivo.recordset);
    }

    // 5. Contar cuántos empleados NO tienen ninguna entrada en empleados_sucursales
    console.log('\n📊 Empleados sin ninguna entrada en empleados_sucursales:');
    const sinSucursales = await pool.request().query(`
      SELECT COUNT(*) as total
      FROM empleados e
      LEFT JOIN empleados_sucursales es ON e.id = es.id_empleado
      WHERE es.id IS NULL AND e.activo = 1
    `);
    console.log(`Total: ${sinSucursales.recordset[0].total} empleados activos sin sucursales`);

    console.log('\n✅ Diagnóstico completado');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

diagnosticar();
