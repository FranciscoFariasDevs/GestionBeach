const { poolPromise, sql } = require('../config/db');

/**
 * Script para corregir caracteres mal codificados (mojibake) en la base de datos
 * Esto corrige textos como "LÃ­quido" a "Líquido"
 */

// Función para limpiar mojibake
function limpiarMojibake(texto) {
  if (!texto) return texto;

  let resultado = String(texto);

  // Reemplazar patrones comunes de mojibake
  resultado = resultado
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã±/g, 'ñ')
    .replace(/ÃƒÂ¡/g, 'á')
    .replace(/ÃƒÂ©/g, 'é')
    .replace(/ÃƒÂ­/g, 'í')
    .replace(/ÃƒÂ³/g, 'ó')
    .replace(/ÃƒÂº/g, 'ú')
    .replace(/ÃƒÂ±/g, 'ñ');

  return resultado;
}

(async () => {
  try {
    console.log('='.repeat(80));
    console.log('CORRIGIENDO CARACTERES MAL CODIFICADOS (MOJIBAKE)');
    console.log('='.repeat(80));
    console.log('');

    const pool = await poolPromise;

    // PASO 1: Identificar registros con mojibake o surrogates
    console.log('📋 Paso 1: Buscando registros con caracteres mal codificados...\n');

    // Buscar en datos_remuneraciones
    const buscarQuery = `
      SELECT TOP 100
        id,
        nombre_empleado,
        concepto_descripcion
      FROM datos_remuneraciones
      WHERE nombre_empleado LIKE '%Ã%'
         OR concepto_descripcion LIKE '%Ã%'
         OR nombre_empleado LIKE '%�%'
         OR concepto_descripcion LIKE '%�%'
    `;

    const resultBuscar = await pool.request().query(buscarQuery);

    if (resultBuscar.recordset.length === 0) {
      console.log('✅ No se encontraron registros con mojibake.');
      console.log('   Todos los datos están correctamente codificados.');
      await pool.close();
      process.exit(0);
    }

    console.log(`⚠️  Encontrados ${resultBuscar.recordset.length} registros con posibles problemas:\n`);

    resultBuscar.recordset.slice(0, 10).forEach((r, idx) => {
      console.log(`${idx + 1}. ID: ${r.id}`);
      if (r.nombre_empleado && (r.nombre_empleado.includes('Ã') || r.nombre_empleado.includes('�'))) {
        console.log(`   Campo: nombre_empleado`);
        console.log(`   ANTES: ${r.nombre_empleado}`);
        console.log(`   DESPUÉS: ${limpiarMojibake(r.nombre_empleado)}`);
      }
      if (r.concepto_descripcion && (r.concepto_descripcion.includes('Ã') || r.concepto_descripcion.includes('�'))) {
        console.log(`   Campo: concepto_descripcion`);
        console.log(`   ANTES: ${r.concepto_descripcion}`);
        console.log(`   DESPUÉS: ${limpiarMojibake(r.concepto_descripcion)}`);
      }
      console.log('');
    });

    console.log('\n='.repeat(80));
    console.log(`📊 TOTAL: ${resultBuscar.recordset.length} registros con mojibake encontrados`);
    console.log('='.repeat(80));

    await pool.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
})();
