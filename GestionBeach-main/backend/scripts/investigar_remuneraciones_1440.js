const { poolPromise, sql } = require('../config/db');

async function investigarRemuneraciones() {
  try {
    const pool = await poolPromise;

    console.log('='.repeat(80));
    console.log('INVESTIGANDO REMUNERACIONES - DANIEL VERA 1440, DICHATO (ID 75)');
    console.log('Período: Noviembre 2025');
    console.log('='.repeat(80));

    // 1. Verificar si existe la sucursal
    const sucursal = await pool.request()
      .input('id', sql.Int, 75)
      .query('SELECT id, nombre, tipo_sucursal, id_razon_social FROM sucursales WHERE id = @id');

    if (sucursal.recordset.length === 0) {
      console.log('❌ No se encontró la sucursal 75');
      await pool.close();
      return;
    }

    console.log('\n✅ Sucursal encontrada:');
    console.log(sucursal.recordset[0]);

    // 2. Buscar el período de noviembre 2025
    const periodo = await pool.request()
      .input('anio', sql.Int, 2025)
      .input('mes', sql.Int, 11)
      .query('SELECT id_periodo, mes, anio FROM periodos_remuneracion WHERE anio = @anio AND mes = @mes');

    if (periodo.recordset.length === 0) {
      console.log('\n❌ No se encontró el período noviembre 2025');
      await pool.close();
      return;
    }

    console.log('\n✅ Período encontrado:');
    console.log(periodo.recordset[0]);
    const idPeriodo = periodo.recordset[0].id_periodo;

    // 3. Buscar empleados asignados a esta sucursal
    const empleadosSucursal = await pool.request()
      .input('sucursal_id', sql.Int, 75)
      .query(`
        SELECT
          e.id,
          e.rut,
          e.nombre,
          e.apellido,
          es.id_sucursal
        FROM empleados e
        INNER JOIN empleados_sucursales es ON es.id_empleado = e.id
        WHERE es.id_sucursal = @sucursal_id
          AND es.activo = 1
        ORDER BY e.nombre
      `);

    console.log(`\n📊 Registros empleados-sucursal para ID 75: ${empleadosSucursal.recordset.length}`);

    // 4. Contar cuántas sucursales tiene cada empleado
    const empleadosConSucursales = await pool.request()
      .query(`
        SELECT
          e.id,
          e.rut,
          e.nombre,
          e.apellido,
          COUNT(es.id_sucursal) as num_sucursales
        FROM empleados e
        INNER JOIN empleados_sucursales es ON es.id_empleado = e.id
        WHERE es.activo = 1
          AND e.id IN (
            SELECT DISTINCT id_empleado
            FROM empleados_sucursales
            WHERE id_sucursal = 75 AND activo = 1
          )
        GROUP BY e.id, e.rut, e.nombre, e.apellido
        ORDER BY num_sucursales DESC, e.nombre
      `);

    console.log(`\n👥 Empleados únicos: ${empleadosConSucursales.recordset.length}`);

    // 5. Para cada empleado, buscar sus remuneraciones en noviembre 2025
    let totalLiquidoVentas = 0;
    let totalLiquidoAdmin = 0;
    let countVentas = 0;
    let countAdmin = 0;

    for (const emp of empleadosConSucursales.recordset) {
      const rutLimpio = emp.rut.replace(/\./g, '').replace(/-/g, '').replace(/ /g, '').toUpperCase();

      const remuneracion = await pool.request()
        .input('id_periodo', sql.Int, idPeriodo)
        .query(`
          SELECT
            dr.rut_empleado,
            dr.nombre_empleado,
            dr.liquido_pagar,
            dr.total_descuentos,
            dr.sueldo_base,
            dr.total_haberes
          FROM datos_remuneraciones dr
          WHERE dr.id_periodo = @id_periodo
            AND REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '') = '${rutLimpio}'
        `);

      if (remuneracion.recordset.length > 0) {
        const rem = remuneracion.recordset[0];
        const tipo = emp.num_sucursales > 1 ? 'ADMIN' : 'VENTAS';
        const liquidoAsignado = emp.num_sucursales > 1
          ? rem.liquido_pagar / emp.num_sucursales
          : rem.liquido_pagar;

        console.log(`\n  👤 ${emp.nombre} ${emp.apellido} (RUT: ${emp.rut})`);
        console.log(`     Tipo: ${tipo} (trabaja en ${emp.num_sucursales} sucursal${emp.num_sucursales > 1 ? 'es' : ''})`);
        console.log(`     Líquido total: $${(rem.liquido_pagar || 0).toLocaleString('es-CL')}`);
        console.log(`     Líquido asignado a sucursal 75: $${(liquidoAsignado || 0).toLocaleString('es-CL')}`);
        console.log(`     Sueldo base: $${(rem.sueldo_base || 0).toLocaleString('es-CL')}`);

        if (tipo === 'VENTAS') {
          totalLiquidoVentas += liquidoAsignado || 0;
          countVentas++;
        } else {
          totalLiquidoAdmin += liquidoAsignado || 0;
          countAdmin++;
        }
      } else {
        console.log(`\n  👤 ${emp.nombre} ${emp.apellido} - ⚠️ SIN REMUNERACIÓN en nov 2025`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('RESUMEN FINAL:');
    console.log(`  🛒 VENTAS: ${countVentas} empleados - Total Líquido: $${totalLiquidoVentas.toLocaleString('es-CL')}`);
    console.log(`  👔 ADMIN: ${countAdmin} empleados - Total Líquido: $${totalLiquidoAdmin.toLocaleString('es-CL')}`);
    console.log(`  💰 TOTAL GENERAL: $${(totalLiquidoVentas + totalLiquidoAdmin).toLocaleString('es-CL')}`);
    console.log('='.repeat(80));
    console.log('\n📌 NOTA: El "Costo o sueldo ventas" que ves ($750,000) debería coincidir');
    console.log('         con el "Total Líquido VENTAS" + costos patronales de ventas.');

    await pool.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

investigarRemuneraciones();
