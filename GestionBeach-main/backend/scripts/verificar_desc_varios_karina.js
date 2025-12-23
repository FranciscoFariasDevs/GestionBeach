const { poolPromise, sql } = require('../config/db');

(async () => {
  try {
    const pool = await poolPromise;

    // Buscar el período de noviembre 2025
    const periodo = await pool.request()
      .input('anio', sql.Int, 2025)
      .input('mes', sql.Int, 11)
      .query('SELECT id_periodo FROM periodos_remuneracion WHERE anio = @anio AND mes = @mes');

    if (periodo.recordset.length === 0) {
      console.log('❌ Período no encontrado');
      await pool.close();
      return;
    }

    const idPeriodo = periodo.recordset[0].id_periodo;

    // Buscar remuneración de Karina
    const rem = await pool.request()
      .input('id_periodo', sql.Int, idPeriodo)
      .query(`
        SELECT
          dr.nombre_empleado,
          dr.rut_empleado,
          dr.sueldo_base,
          dr.total_haberes,
          dr.total_imponibles,
          dr.liquido_pagar,
          dr.total_descuentos,
          dr.descuentos_varios,
          dr.imposiciones,
          dr.seguro_cesantia,
          dr.total_costo
        FROM datos_remuneraciones dr
        WHERE dr.id_periodo = @id_periodo
          AND REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '') = '176401613'
      `);

    if (rem.recordset.length === 0) {
      console.log('❌ Remuneración no encontrada');
      await pool.close();
      return;
    }

    const r = rem.recordset[0];

    console.log('='.repeat(80));
    console.log('VERIFICACIÓN DE DESC. VARIOS - KARINA LAGOS');
    console.log('='.repeat(80));
    console.log(`\n📋 Empleado: ${r.nombre_empleado}`);
    console.log(`    RUT: ${r.rut_empleado}`);

    console.log('\n💵 HABERES:');
    console.log(`    Sueldo Base: $${(r.sueldo_base || 0).toLocaleString('es-CL')}`);
    console.log(`    Total Haberes: $${(r.total_haberes || 0).toLocaleString('es-CL')}`);
    console.log(`    Total Imponibles: $${(r.total_imponibles || 0).toLocaleString('es-CL')}`);

    console.log('\n💸 DESCUENTOS:');
    console.log(`    Total Descuentos: $${(r.total_descuentos || 0).toLocaleString('es-CL')}`);
    console.log(`    Descuentos Varios: $${(r.descuentos_varios || 0).toLocaleString('es-CL')}`);
    console.log(`    Imposiciones (AFP/Salud): $${(r.imposiciones || 0).toLocaleString('es-CL')}`);
    console.log(`    Seguro Cesantía: $${(r.seguro_cesantia || 0).toLocaleString('es-CL')}`);

    console.log('\n💰 LÍQUIDO Y COSTO:');
    console.log(`    Líquido a Pagar: $${(r.liquido_pagar || 0).toLocaleString('es-CL')}`);
    console.log(`    Total Costo (campo DB): $${(r.total_costo || 0).toLocaleString('es-CL')}`);

    console.log('\n' + '='.repeat(80));
    console.log('VERIFICACIÓN DE FÓRMULA:');
    console.log('='.repeat(80));

    const descVarios = r.descuentos_varios || 0;
    const totalDescuentos = r.total_descuentos || 0;

    console.log(`\n¿Desc. Varios incluye todos los descuentos?`);
    if (Math.abs(descVarios - totalDescuentos) < 10) {
      console.log(`✅ SÍ - Desc. Varios ($${descVarios.toLocaleString('es-CL')}) = Total Descuentos ($${totalDescuentos.toLocaleString('es-CL')})`);
    } else {
      console.log(`❌ NO - Desc. Varios ($${descVarios.toLocaleString('es-CL')}) ≠ Total Descuentos ($${totalDescuentos.toLocaleString('es-CL')})`);
      console.log(`   Diferencia: $${Math.abs(descVarios - totalDescuentos).toLocaleString('es-CL')}`);
    }

    console.log('\n📊 FÓRMULA DEL USUARIO:');
    console.log('   Costo = Líquido + Desc. Varios + Costos Patronales');
    const subtotal = r.liquido_pagar + descVarios;
    console.log(`   = $${r.liquido_pagar.toLocaleString('es-CL')} + $${descVarios.toLocaleString('es-CL')} + Costos Patronales`);
    console.log(`   = $${subtotal.toLocaleString('es-CL')} + Costos Patronales`);

    console.log('\n📊 VERIFICACIÓN CON TOTAL HABERES:');
    const verificacion = r.liquido_pagar + descVarios;
    console.log(`   Líquido + Desc. Varios = $${verificacion.toLocaleString('es-CL')}`);
    console.log(`   Total Haberes = $${r.total_haberes.toLocaleString('es-CL')}`);

    if (Math.abs(verificacion - r.total_haberes) < 10) {
      console.log(`   ✅ COINCIDEN - La fórmula es correcta`);
    } else {
      console.log(`   ⚠️ NO COINCIDEN - Diferencia: $${Math.abs(verificacion - r.total_haberes).toLocaleString('es-CL')}`);
    }

    console.log('='.repeat(80));

    await pool.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
