// Script para probar validación de códigos de descuento
const { poolPromise } = require('../config/db');

async function testCodigoDescuento() {
  try {
    const pool = await poolPromise;

    console.log('\n📦 === PRUEBA DE CÓDIGOS DE DESCUENTO ===\n');

    // 1. Crear un código de monto fijo para todas las cabañas
    console.log('1️⃣ Creando código de monto fijo (10000) para todas las cabañas...');
    const codigo1 = await pool.request().query(`
      INSERT INTO codigos_descuento (
        codigo, descripcion, tipo_descuento, valor_descuento,
        fecha_inicio, fecha_fin, activo, aplica_todas_cabanas
      )
      VALUES (
        'MONTO10K', 'Descuento de $10,000', 'monto_fijo', 10000,
        '2024-12-11', '2024-12-17', 1, 1
      );
      SELECT SCOPE_IDENTITY() as id;
    `);
    console.log(`✅ Código creado con ID: ${codigo1.recordset[0].id}`);

    // 2. Crear un código de porcentaje para cabaña específica
    console.log('\n2️⃣ Creando código de porcentaje (15%) para cabaña específica...');
    const codigo2 = await pool.request().query(`
      INSERT INTO codigos_descuento (
        codigo, descripcion, tipo_descuento, valor_descuento,
        fecha_inicio, fecha_fin, activo, aplica_todas_cabanas
      )
      VALUES (
        'PORC15', 'Descuento de 15%', 'porcentaje', 15,
        '2024-12-11', '2024-12-31', 1, 0
      );
      SELECT SCOPE_IDENTITY() as id;
    `);
    const codigoId2 = codigo2.recordset[0].id;
    console.log(`✅ Código creado con ID: ${codigoId2}`);

    // Asociar a cabaña 1
    await pool.request().query(`
      INSERT INTO codigos_descuento_cabanas (codigo_descuento_id, cabana_id)
      VALUES (${codigoId2}, 1)
    `);
    console.log('✅ Código asociado a Cabaña 1');

    // 3. Probar validación de fechas
    console.log('\n3️⃣ Probando validación de fechas...');

    // Caso 1: Reserva dentro del rango (debe pasar)
    console.log('\n   📅 Caso 1: Reserva del 12 al 15 de diciembre (DEBE PASAR)');
    const validacion1 = await pool.request().query(`
      SELECT
        id, codigo, tipo_descuento, valor_descuento, fecha_inicio, fecha_fin
      FROM codigos_descuento
      WHERE codigo = 'MONTO10K'
    `);

    if (validacion1.recordset.length > 0) {
      const cod = validacion1.recordset[0];
      const fechaInicioReserva = new Date('2024-12-12');
      const fechaFinReserva = new Date('2024-12-15');
      const fechaInicioCodigo = new Date(cod.fecha_inicio);
      const fechaFinCodigo = new Date(cod.fecha_fin);

      if (fechaInicioReserva >= fechaInicioCodigo && fechaFinReserva <= fechaFinCodigo) {
        console.log('   ✅ VÁLIDO - Reserva dentro del rango');
        console.log(`   📊 Descuento: ${cod.tipo_descuento} = ${cod.valor_descuento}`);
      } else {
        console.log('   ❌ INVÁLIDO - Fuera de rango');
      }
    }

    // Caso 2: Reserva fuera del rango (debe fallar)
    console.log('\n   📅 Caso 2: Reserva del 31 dic al 5 enero (DEBE FALLAR)');
    const fechaInicioReserva2 = new Date('2024-12-31');
    const fechaFinReserva2 = new Date('2025-01-05');
    const fechaInicioCodigo = new Date('2024-12-11');
    const fechaFinCodigo = new Date('2024-12-17');

    if (fechaInicioReserva2 >= fechaInicioCodigo && fechaFinReserva2 <= fechaFinCodigo) {
      console.log('   ❌ ERROR - No debería pasar');
    } else {
      console.log('   ✅ CORRECTO - Rechazado por estar fuera de rango');
      if (fechaFinReserva2 > fechaFinCodigo) {
        console.log(`   💬 Mensaje: "Este código solo es válido hasta el ${fechaFinCodigo.toLocaleDateString('es-CL')}"`);
      }
    }

    // 4. Verificar valores numéricos
    console.log('\n4️⃣ Verificando valores numéricos de descuentos...');
    const codigos = await pool.request().query(`
      SELECT codigo, tipo_descuento, valor_descuento
      FROM codigos_descuento
      WHERE codigo IN ('MONTO10K', 'PORC15')
    `);

    codigos.recordset.forEach(cod => {
      console.log(`\n   📋 Código: ${cod.codigo}`);
      console.log(`   📊 Tipo: ${cod.tipo_descuento}`);
      console.log(`   💰 Valor: ${cod.valor_descuento} (tipo: ${typeof cod.valor_descuento})`);
      console.log(`   🔢 parseFloat: ${parseFloat(cod.valor_descuento)}`);

      // Simular cálculo
      const subtotal = 100000;
      let descuento;
      if (cod.tipo_descuento === 'porcentaje') {
        descuento = subtotal * (parseFloat(cod.valor_descuento) / 100);
      } else {
        descuento = parseFloat(cod.valor_descuento);
      }
      console.log(`   💵 Descuento calculado sobre $100,000: $${descuento.toLocaleString('es-CL')}`);
    });

    console.log('\n✅ === PRUEBAS COMPLETADAS ===\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testCodigoDescuento();
