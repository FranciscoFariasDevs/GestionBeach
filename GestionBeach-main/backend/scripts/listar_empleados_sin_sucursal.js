// Script para listar empleados sin sucursal asignada
const { sql, poolPromise } = require('../config/db');

async function listarEmpleadosSinSucursal() {
  try {
    console.log('🔍 Buscando empleados sin sucursal asignada...\n');

    const pool = await poolPromise;

    // Buscar empleados que no tienen sucursal o tienen sucursal inactiva
    const result = await pool.request()
      .query(`
        SELECT
          e.id,
          e.rut,
          e.nombre,
          e.apellido,
          e.id_razon_social,
          rs.nombre_razon as razon_social_nombre,
          COUNT(es.id) as num_sucursales_activas
        FROM empleados e
        LEFT JOIN razones_sociales rs ON e.id_razon_social = rs.id
        LEFT JOIN empleados_sucursales es ON es.id_empleado = e.id AND es.activo = 1
        WHERE e.activo = 1
        GROUP BY e.id, e.rut, e.nombre, e.apellido, e.id_razon_social, rs.nombre_razon
        HAVING COUNT(es.id) = 0
        ORDER BY e.nombre, e.apellido
      `);

    console.log(`📊 Total empleados sin sucursal: ${result.recordset.length}\n`);

    if (result.recordset.length === 0) {
      console.log('✅ Todos los empleados tienen sucursal asignada');
    } else {
      console.log('Lista de empleados sin sucursal:\n');
      result.recordset.forEach((emp, index) => {
        console.log(`${index + 1}. ID: ${emp.id} | RUT: ${emp.rut} | Nombre: ${emp.nombre} ${emp.apellido}`);
        console.log(`   Razón Social: ${emp.razon_social_nombre || 'SIN ASIGNAR'}\n`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

listarEmpleadosSinSucursal();
