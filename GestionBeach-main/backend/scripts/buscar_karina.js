const { poolPromise } = require('../config/db');

(async () => {
  try {
    const pool = await poolPromise;

    const emp = await pool.request()
      .query("SELECT TOP 10 id, rut, nombre, apellido, id_razon_social FROM empleados WHERE nombre LIKE '%KARINA%' OR apellido LIKE '%LAGOS%'");

    console.log(`Empleados encontrados: ${emp.recordset.length}`);
    emp.recordset.forEach(e => {
      console.log(`\n  ID: ${e.id}`);
      console.log(`  RUT: ${e.rut}`);
      console.log(`  Nombre: ${e.nombre} ${e.apellido}`);
      console.log(`  Razón Social ID: ${e.id_razon_social || 'NULL'}`);
    });

    await pool.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
