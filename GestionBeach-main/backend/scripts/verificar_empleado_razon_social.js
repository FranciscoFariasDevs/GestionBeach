const { poolPromise } = require('../config/db');

(async () => {
  try {
    const pool = await poolPromise;

    const emp = await pool.request()
      .query("SELECT id, rut, nombre, apellido, id_razon_social FROM empleados WHERE rut LIKE '%17640161%'");

    console.log('Empleado Karina Lagos:');
    console.log(emp.recordset[0]);

    if (emp.recordset[0]?.id_razon_social) {
      const rs = await pool.request()
        .query(`SELECT id, nombre_razon FROM razones_sociales WHERE id = ${emp.recordset[0].id_razon_social}`);
      console.log('\nRazón Social:');
      console.log(rs.recordset[0]);
    } else {
      console.log('\n⚠️ El empleado NO tiene razón social asignada');
    }

    await pool.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
