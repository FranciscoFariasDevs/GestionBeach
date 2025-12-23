const axios = require('axios');

async function testTotalCargo() {
  try {
    console.log('='.repeat(80));
    console.log('PROBANDO ENDPOINT DE REMUNERACIONES - SUCURSAL 75 NOV 2025');
    console.log('='.repeat(80));

    const response = await axios.get('http://localhost:3001/api/estado-resultados/remuneraciones', {
      params: {
        anio: 2025,
        mes: 11,
        sucursal_id: 75
        // NO enviamos razon_social_id para probar el nuevo código
      }
    });

    if (response.data.success) {
      const { resumen } = response.data.data;

      console.log('\n📊 RESUMEN GENERAL:');
      console.log(`   Total empleados: ${resumen.cantidad_empleados}`);
      console.log(`   Empleados únicos: ${resumen.empleados_unicos}`);
      console.log(`   Total Líquidos: $${resumen.total_liquidos.toLocaleString('es-CL')}`);
      console.log(`   Total Descuentos: $${resumen.total_descuentos.toLocaleString('es-CL')}`);
      console.log(`   Total Pago (Líquido + Descuentos): $${resumen.total_pago.toLocaleString('es-CL')}`);

      console.log('\n💼 COSTOS PATRONALES:');
      console.log(`   Caja Compensación: $${resumen.total_caja_compensacion.toLocaleString('es-CL')}`);
      console.log(`   AFC: $${resumen.total_afc.toLocaleString('es-CL')}`);
      console.log(`   SIS: $${resumen.total_sis.toLocaleString('es-CL')}`);
      console.log(`   ACH: $${resumen.total_ach.toLocaleString('es-CL')}`);
      console.log(`   Imposiciones Patronales: $${resumen.total_imposiciones_patronales.toLocaleString('es-CL')}`);

      const totalPatronales =
        resumen.total_caja_compensacion +
        resumen.total_afc +
        resumen.total_sis +
        resumen.total_ach +
        resumen.total_imposiciones_patronales;

      console.log(`   TOTAL COSTOS PATRONALES: $${totalPatronales.toLocaleString('es-CL')}`);

      console.log('\n💰 TOTAL CARGO:');
      console.log(`   Total Cargo: $${resumen.total_cargo.toLocaleString('es-CL')}`);
      console.log(`   (Debería ser: Total Pago + Costos Patronales = $${(resumen.total_pago + totalPatronales).toLocaleString('es-CL')})`);

      console.log('\n🛒 DESGLOSE VENTAS:');
      console.log(`   Empleados Ventas: ${resumen.ventas.cantidad_empleados_unicos}`);
      console.log(`   Total Líquidos Ventas: $${resumen.ventas.total_liquidos.toLocaleString('es-CL')}`);
      console.log(`   Total Descuentos Ventas: $${resumen.ventas.total_descuentos.toLocaleString('es-CL')}`);
      console.log(`   Total Pago Ventas: $${resumen.ventas.total_pago.toLocaleString('es-CL')}`);
      console.log(`   Total Costos Patronales Ventas: $${resumen.ventas.total_costos_patronales.toLocaleString('es-CL')}`);
      console.log(`   TOTAL CARGO VENTAS: $${resumen.ventas.total_cargo.toLocaleString('es-CL')}`);

      console.log('\n' + '='.repeat(80));
      console.log('VERIFICACIÓN:');

      const expectedTotalCargo = resumen.total_pago + totalPatronales;
      const actualTotalCargo = resumen.total_cargo;

      if (Math.abs(expectedTotalCargo - actualTotalCargo) < 10) {
        console.log('✅ CORRECTO - El total_cargo incluye costos patronales');
        console.log(`   Esperado: $${expectedTotalCargo.toLocaleString('es-CL')}`);
        console.log(`   Actual: $${actualTotalCargo.toLocaleString('es-CL')}`);
      } else {
        console.log('❌ ERROR - El total_cargo NO incluye costos patronales');
        console.log(`   Esperado: $${expectedTotalCargo.toLocaleString('es-CL')}`);
        console.log(`   Actual: $${actualTotalCargo.toLocaleString('es-CL')}`);
        console.log(`   Diferencia: $${Math.abs(expectedTotalCargo - actualTotalCargo).toLocaleString('es-CL')}`);
      }

      // Verificación específica para ventas
      const expectedTotalCargoVentas = resumen.ventas.total_pago + resumen.ventas.total_costos_patronales;
      const actualTotalCargoVentas = resumen.ventas.total_cargo;

      console.log('\n📌 VERIFICACIÓN ESPECÍFICA PARA VENTAS:');
      if (Math.abs(expectedTotalCargoVentas - actualTotalCargoVentas) < 10) {
        console.log('✅ CORRECTO - El total_cargo de ventas incluye costos patronales');
        console.log(`   Este es el valor que debería aparecer en "Costo o sueldo ventas"`);
        console.log(`   Valor: $${actualTotalCargoVentas.toLocaleString('es-CL')}`);
      } else {
        console.log('❌ ERROR - El total_cargo de ventas NO incluye costos patronales');
        console.log(`   Esperado: $${expectedTotalCargoVentas.toLocaleString('es-CL')}`);
        console.log(`   Actual: $${actualTotalCargoVentas.toLocaleString('es-CL')}`);
      }

      console.log('='.repeat(80));
    } else {
      console.log('❌ Error en la respuesta:', response.data.message);
    }
  } catch (error) {
    console.error('❌ Error al probar el endpoint:', error.message);
    if (error.response) {
      console.error('Detalles:', error.response.data);
    }
  }
}

testTotalCargo();
