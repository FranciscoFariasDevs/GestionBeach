// Script para asignar sucursal a Marcela Yuvoska
const { sql, poolPromise } = require('../config/db');

async function fixMarcelaSucursal() {
  try {
    console.log('🔧 Iniciando corrección de sucursal para Marcela Yuvoska...');

    const pool = await poolPromise;

    // 1. Buscar el empleado Marcela Yuvoska
    const empleadoResult = await pool.request()
      .query(`
        SELECT id, rut, nombre, apellido, id_razon_social
        FROM empleados
        WHERE UPPER(nombre) LIKE '%MARCELA%' AND UPPER(apellido) LIKE '%YUVOSKA%'
      `);

    if (empleadoResult.recordset.length === 0) {
      console.log('❌ No se encontró empleado Marcela Yuvoska');
      return;
    }

    const empleado = empleadoResult.recordset[0];
    console.log('✅ Empleado encontrado:', empleado);

    // 2. Buscar la sucursal "1440 daniel vera" o ID 75
    const sucursalResult = await pool.request()
      .query(`
        SELECT id, nombre
        FROM sucursales
        WHERE id = 75 OR UPPER(nombre) LIKE '%1440%' OR UPPER(nombre) LIKE '%DANIEL VERA%'
      `);

    if (sucursalResult.recordset.length === 0) {
      console.log('❌ No se encontró sucursal 1440 daniel vera');
      return;
    }

    const sucursal = sucursalResult.recordset[0];
    console.log('✅ Sucursal encontrada:', sucursal);

    // 3. Verificar si ya existe la relación
    const relacionResult = await pool.request()
      .input('id_empleado', sql.Int, empleado.id)
      .input('id_sucursal', sql.Int, sucursal.id)
      .query(`
        SELECT * FROM empleados_sucursales
        WHERE id_empleado = @id_empleado AND id_sucursal = @id_sucursal
      `);

    if (relacionResult.recordset.length > 0) {
      console.log('⚠️ La relación ya existe, actualizando a activo=1...');
      await pool.request()
        .input('id_empleado', sql.Int, empleado.id)
        .input('id_sucursal', sql.Int, sucursal.id)
        .query(`
          UPDATE empleados_sucursales
          SET activo = 1
          WHERE id_empleado = @id_empleado AND id_sucursal = @id_sucursal
        `);
      console.log('✅ Relación actualizada a activo=1');
    } else {
      console.log('📝 Creando nueva relación empleado-sucursal...');
      await pool.request()
        .input('id_empleado', sql.Int, empleado.id)
        .input('id_sucursal', sql.Int, sucursal.id)
        .query(`
          INSERT INTO empleados_sucursales (id_empleado, id_sucursal, activo, created_at)
          VALUES (@id_empleado, @id_sucursal, 1, GETDATE())
        `);
      console.log('✅ Relación creada exitosamente');
    }

    // 4. Verificar que tenga razón social
    if (!empleado.id_razon_social) {
      console.log('⚠️ El empleado no tiene razón social asignada');
      console.log('Por favor, asigne una razón social manualmente desde Empleados Page');
    } else {
      console.log(`✅ Empleado tiene razón social ID: ${empleado.id_razon_social}`);
    }

    console.log('\n🎉 ¡Corrección completada!');
    console.log('Ahora Marcela Yuvoska debería aparecer en Estado de Resultados');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

fixMarcelaSucursal();
