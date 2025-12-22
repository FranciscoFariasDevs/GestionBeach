// Script para probar el endpoint de obtener sucursales de un empleado
const { sql, poolPromise } = require('../config/db');

async function testGetSucursales() {
  try {
    console.log('🧪 Probando obtención de sucursales para empleados\n');

    const pool = await poolPromise;

    // IDs de empleados a probar
    const empleadosIds = [772, 592, 736]; // Marcela + 2 con activo=false

    for (const id_empleado of empleadosIds) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`👤 Probando empleado ID: ${id_empleado}`);
      console.log('='.repeat(60));

      // Obtener info del empleado
      const empleado = await pool.request()
        .input('id', sql.Int, id_empleado)
        .query('SELECT id, rut, nombre, apellido FROM empleados WHERE id = @id');

      if (empleado.recordset.length === 0) {
        console.log('❌ Empleado no encontrado');
        continue;
      }

      const emp = empleado.recordset[0];
      console.log(`Nombre: ${emp.nombre} ${emp.apellido}`);
      console.log(`RUT: ${emp.rut}\n`);

      // Simular la query del endpoint getEmpleadoSucursales
      const sucursalesResult = await pool.request()
        .input('id_empleado', sql.Int, id_empleado)
        .query(`
          SELECT s.id, s.nombre
          FROM empleados_sucursales es
          INNER JOIN sucursales s ON es.id_sucursal = s.id
          WHERE es.id_empleado = @id_empleado AND es.activo = 1
          ORDER BY s.id
        `);

      console.log(`Sucursales encontradas (activo=1): ${sucursalesResult.recordset.length}`);
      if (sucursalesResult.recordset.length > 0) {
        console.table(sucursalesResult.recordset);
      }

      // También mostrar todas las sucursales (sin filtro de activo)
      const todasSucursales = await pool.request()
        .input('id_empleado', sql.Int, id_empleado)
        .query(`
          SELECT s.id, s.nombre, es.activo
          FROM empleados_sucursales es
          INNER JOIN sucursales s ON es.id_sucursal = s.id
          WHERE es.id_empleado = @id_empleado
          ORDER BY s.id
        `);

      console.log(`\nTodas las sucursales (sin filtro): ${todasSucursales.recordset.length}`);
      if (todasSucursales.recordset.length > 0) {
        console.table(todasSucursales.recordset);
      }
    }

    console.log('\n✅ Prueba completada');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

testGetSucursales();
