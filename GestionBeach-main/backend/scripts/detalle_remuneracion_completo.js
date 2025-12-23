const { poolPromise, sql } = require('../config/db');

async function verDetalleCompleto() {
  try {
    const pool = await poolPromise;

    console.log('='.repeat(80));
    console.log('DETALLE COMPLETO DE REMUNERACIÓN - KARINA LAGOS');
    console.log('Sucursal: DANIEL VERA 1440 (ID 75) - Noviembre 2025');
    console.log('='.repeat(80));

    // Buscar el período
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

    // Buscar la remuneración completa
    const remuneracion = await pool.request()
      .input('id_periodo', sql.Int, idPeriodo)
      .query(`
        SELECT
          dr.*
        FROM datos_remuneraciones dr
        WHERE dr.id_periodo = @id_periodo
          AND REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '') = '176401613'
      `);

    if (remuneracion.recordset.length === 0) {
      console.log('❌ Remuneración no encontrada');
      await pool.close();
      return;
    }

    const rem = remuneracion.recordset[0];

    console.log('\n📋 DATOS DE LA REMUNERACIÓN:');
    console.log(`   Nombre: ${rem.nombre_empleado}`);
    console.log(`   RUT: ${rem.rut_empleado}`);
    console.log(`   Período: ${rem.id_periodo}`);

    console.log('\n💵 HABERES:');
    console.log(`   Sueldo Base: $${(rem.sueldo_base || 0).toLocaleString('es-CL')}`);
    console.log(`   Total Haberes: $${(rem.total_haberes || 0).toLocaleString('es-CL')}`);
    console.log(`   Total Imponibles: $${(rem.total_imponibles || 0).toLocaleString('es-CL')}`);

    console.log('\n💸 DESCUENTOS:');
    console.log(`   Total Descuentos: $${(rem.total_descuentos || 0).toLocaleString('es-CL')}`);
    console.log(`   Imposiciones (empleado): $${(rem.imposiciones || 0).toLocaleString('es-CL')}`);
    console.log(`   Seguro Cesantía: $${(rem.seguro_cesantia || 0).toLocaleString('es-CL')}`);

    console.log('\n💰 RESULTADO:');
    console.log(`   Líquido a Pagar: $${(rem.liquido_pagar || 0).toLocaleString('es-CL')}`);
    console.log(`   Total Costo (campo): $${(rem.total_costo || 0).toLocaleString('es-CL')}`);

    // Buscar porcentajes patronales si existen
    const porcentajes = await pool.request()
      .input('id_periodo', sql.Int, idPeriodo)
      .query(`
        SELECT TOP 1 *
        FROM porcentajes_por_periodo
        WHERE id_periodo = @id_periodo AND activo = 1
      `);

    if (porcentajes.recordset.length > 0) {
      const porc = porcentajes.recordset[0];
      console.log('\n📊 PORCENTAJES PATRONALES CONFIGURADOS:');
      console.log(`   Caja Compensación: ${porc.caja_compen}%`);
      console.log(`   AFC: ${porc.afc}%`);
      console.log(`   SIS: ${porc.sis}%`);
      console.log(`   ACH: ${porc.ach}%`);
      console.log(`   Imposiciones Patronales: ${porc.imposiciones}%`);

      // Calcular costos patronales
      const imponible = rem.total_imponibles || 0;
      const imposiciones = rem.imposiciones || 0;

      const cajaComp = (imponible * parseFloat(porc.caja_compen || 0)) / 100;
      const afc = (imponible * parseFloat(porc.afc || 0)) / 100;
      const sis = (imponible * parseFloat(porc.sis || 0)) / 100;
      const ach = (imposiciones * parseFloat(porc.ach || 0)) / 100;
      const impPatronales = (imponible * parseFloat(porc.imposiciones || 0)) / 100;

      const totalPatronales = cajaComp + afc + sis + ach + impPatronales;

      console.log('\n💼 COSTOS PATRONALES CALCULADOS:');
      console.log(`   Caja Compensación: $${cajaComp.toLocaleString('es-CL')}`);
      console.log(`   AFC: $${afc.toLocaleString('es-CL')}`);
      console.log(`   SIS: $${sis.toLocaleString('es-CL')}`);
      console.log(`   ACH: $${ach.toLocaleString('es-CL')}`);
      console.log(`   Imposiciones Patronales: $${impPatronales.toLocaleString('es-CL')}`);
      console.log(`   TOTAL COSTOS PATRONALES: $${totalPatronales.toLocaleString('es-CL')}`);

      const totalPago = (rem.liquido_pagar || 0) + (rem.total_descuentos || 0);
      const totalCargo = totalPago + totalPatronales;

      console.log('\n' + '='.repeat(80));
      console.log('CÁLCULO FINAL DEL COSTO:');
      console.log(`   1. Líquido a Pagar:      $${(rem.liquido_pagar || 0).toLocaleString('es-CL')}`);
      console.log(`   2. Descuentos:           $${(rem.total_descuentos || 0).toLocaleString('es-CL')}`);
      console.log(`   3. Total Pago (1+2):     $${totalPago.toLocaleString('es-CL')}`);
      console.log(`   4. Costos Patronales:    $${totalPatronales.toLocaleString('es-CL')}`);
      console.log(`   ───────────────────────────────────────────`);
      console.log(`   TOTAL CARGO (3+4):       $${totalCargo.toLocaleString('es-CL')}`);
      console.log('='.repeat(80));

      console.log('\n📌 CONCLUSIÓN:');
      console.log(`   El "Costo o sueldo ventas" de $750.000 debería ser: $${totalCargo.toLocaleString('es-CL')}`);

      if (Math.abs(totalCargo - 750000) < 10000) {
        console.log('   ✅ CORRECTO - Los valores coinciden (diferencia menor a $10.000)');
      } else {
        console.log(`   ⚠️ DISCREPANCIA - Diferencia: $${Math.abs(totalCargo - 750000).toLocaleString('es-CL')}`);
      }
    } else {
      console.log('\n⚠️ No se encontraron porcentajes patronales configurados');
    }

    await pool.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

verDetalleCompleto();
