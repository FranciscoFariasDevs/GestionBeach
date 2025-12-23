// backend/scripts/listar_criticos.js
const { sql, poolPromise } = require('../config/db');

async function listarCriticos() {
  try {
    const pool = await poolPromise;

    const criticos = await pool.request().query(`
      SELECT DISTINCT
        e.id,
        e.rut,
        e.nombre,
        e.apellido,
        e.establecimiento,
        e.id_razon_social,
        COUNT(dr.id) as cant_remuneraciones
      FROM empleados e
      INNER JOIN datos_remuneraciones dr ON
        REPLACE(REPLACE(REPLACE(UPPER(e.rut), '.', ''), '-', ''), ' ', '') =
        REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '')
      LEFT JOIN empleados_sucursales es ON e.id = es.id_empleado AND es.activo = 1
      WHERE es.id IS NULL AND e.activo = 1
      GROUP BY e.id, e.rut, e.nombre, e.apellido, e.establecimiento, e.id_razon_social
      ORDER BY cant_remuneraciones DESC
    `);

    console.log(`\n⚠️ EMPLEADOS CRÍTICOS (${criticos.recordset.length}):\n`);
    console.log('═'.repeat(80));

    criticos.recordset.forEach((emp, index) => {
      console.log(`${index + 1}. ${emp.nombre} ${emp.apellido || ''} (RUT: ${emp.rut})`);
      console.log(`   ID: ${emp.id}`);
      console.log(`   Establecimiento: ${emp.establecimiento || 'Sin establecimiento'}`);
      console.log(`   Razón Social ID: ${emp.id_razon_social || 'Sin asignar'}`);
      console.log(`   Remuneraciones: ${emp.cant_remuneraciones}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
  }

  process.exit(0);
}

listarCriticos();
