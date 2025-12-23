// backend/scripts/diagnosticar_empleados_simple.js
// Script simple para verificar empleados críticos

const { sql, poolPromise } = require('../config/db');

async function diagnosticar() {
  try {
    const pool = await poolPromise;

    // Empleados con remuneraciones pero sin sucursal
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

    console.log('\n═══════════════════════════════════════════');
    console.log('   VERIFICACIÓN FINAL');
    console.log('═══════════════════════════════════════════\n');

    if (totalCriticos === 0) {
      console.log('✅ PERFECTO: 0 empleados con remuneraciones sin sucursal');
      console.log('✅ Todos los empleados aparecerán en Estado de Resultados\n');
    } else {
      console.log(`⚠️ QUEDAN ${totalCriticos} empleados críticos sin sucursal`);
      console.log('⚠️ Estos NO aparecerán en Estado de Resultados\n');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }

  process.exit(0);
}

diagnosticar();
