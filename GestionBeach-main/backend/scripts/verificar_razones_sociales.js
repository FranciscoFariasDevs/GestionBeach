// Verificar razones sociales y porcentajes
const { sql, poolPromise } = require('../config/db');

async function verificar() {
  try {
    const pool = await poolPromise;

    console.log('🔍 === VERIFICACIÓN RAZONES SOCIALES ===\n');

    // 1. Todas las razones sociales
    console.log('1️⃣ Razones sociales existentes:');
    const rs = await pool.request().query('SELECT id, nombre_razon, rut FROM razones_sociales WHERE activo = 1');
    rs.recordset.forEach(r => console.log(`   ID ${r.id}: ${r.nombre_razon} (${r.rut})`));

    // 2. Porcentajes configurados para noviembre 2025
    console.log('\n2️⃣ Porcentajes para noviembre 2025:');
    const porc = await pool.request().query(`
      SELECT pp.*, rs.nombre_razon
      FROM porcentajes_por_periodo pp
      INNER JOIN periodos_remuneracion pr ON pr.id_periodo = pp.id_periodo
      LEFT JOIN razones_sociales rs ON rs.id = pp.id_razon_social
      WHERE pr.anio = 2025 AND pr.mes = 11
    `);
    porc.recordset.forEach(p => console.log(`   ${p.nombre_razon} (RS ID: ${p.id_razon_social}): ACH=${p.ach}%`));

    // 3. Empleados y sus razones sociales
    console.log('\n3️⃣ Empleados de noviembre 2025 y sus razones sociales:');
    const emps = await pool.request().query(`
      SELECT e.id, e.nombre, e.apellido, e.rut, e.id_razon_social, rs.nombre_razon
      FROM empleados e
      LEFT JOIN razones_sociales rs ON e.id_razon_social = rs.id
      WHERE e.id IN (
        SELECT DISTINCT e2.id
        FROM datos_remuneraciones dr
        INNER JOIN periodos_remuneracion pr ON pr.id_periodo = dr.id_periodo
        INNER JOIN empleados e2 ON
          REPLACE(REPLACE(REPLACE(UPPER(e2.rut), '.', ''), '-', ''), ' ', '') =
          REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '')
        WHERE pr.anio = 2025 AND pr.mes = 11
      )
    `);
    emps.recordset.forEach(e => console.log(`   ${e.nombre} ${e.apellido}: RS ID=${e.id_razon_social} (${e.nombre_razon || 'SIN RAZÓN SOCIAL'})`));

    // 4. Verificar si hay match entre empleados y porcentajes
    console.log('\n4️⃣ Verificando si los empleados tienen porcentajes ACH configurados:');
    for (const emp of emps.recordset) {
      const match = porc.recordset.find(p => p.id_razon_social === emp.id_razon_social);
      if (match) {
        console.log(`   ✅ ${emp.nombre} ${emp.apellido}: tiene porcentajes (ACH=${match.ach}%)`);
      } else {
        console.log(`   ❌ ${emp.nombre} ${emp.apellido}: NO TIENE PORCENTAJES para su razón social (ID=${emp.id_razon_social})`);
      }
    }

    console.log('\n✅ Verificación completada');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

verificar();
