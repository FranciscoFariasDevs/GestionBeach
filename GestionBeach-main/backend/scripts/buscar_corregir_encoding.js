const { poolPromise, sql } = require('../config/db');

/**
 * Script para buscar y corregir problemas de encoding en todas las tablas
 */

// Función para limpiar mojibake y surrogates
function limpiarTexto(texto) {
  if (!texto) return texto;

  let resultado = String(texto);

  // Limpiar surrogates solitarios
  const tieneSurrogates = /[\uD800-\uDFFF]/.test(resultado);
  if (tieneSurrogates) {
    let bytes = [];
    for (let i = 0; i < resultado.length; i++) {
      const code = resultado.charCodeAt(i);
      if (code >= 0xDC00 && code <= 0xDCFF) {
        bytes.push(code - 0xDC00);
      } else {
        bytes.push(code);
      }
    }
    resultado = bytes.map(b => String.fromCharCode(b)).join('');
  }

  // Limpiar mojibake común
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
    console.log('BUSCANDO Y CORRIGIENDO PROBLEMAS DE ENCODING');
    console.log('='.repeat(80));
    console.log('');

    const pool = await poolPromise;

    const tablas = [
      { nombre: 'datos_remuneraciones', columnas: ['nombre_empleado', 'observaciones'] },
      { nombre: 'periodos_remuneracion', columnas: ['periodo_descripcion'] },
      { nombre: 'empleados_remuneraciones', columnas: ['nombres', 'apellido_paterno', 'apellido_materno'] }
    ];

    let totalEncontrados = 0;
    let totalCorregidos = 0;

    for (const tabla of tablas) {
      console.log('\n' + '='.repeat(80));
      console.log(`📋 Tabla: ${tabla.nombre}`);
      console.log('='.repeat(80));

      // Construir query para buscar problemas
      const whereConditions = tabla.columnas
        .map(col => `${col} LIKE '%Ã%' OR ${col} LIKE '%�%'`)
        .join(' OR ');

      const selectQuery = `
        SELECT TOP 100 id, ${tabla.columnas.join(', ')}
        FROM ${tabla.nombre}
        WHERE ${whereConditions}
      `;

      try {
        const result = await pool.request().query(selectQuery);

        if (result.recordset.length === 0) {
          console.log('✅ No se encontraron problemas en esta tabla\n');
          continue;
        }

        console.log(`⚠️  Encontrados ${result.recordset.length} registros con problemas\n`);
        totalEncontrados += result.recordset.length;

        // Mostrar primeros 5 ejemplos
        result.recordset.slice(0, 5).forEach((registro, idx) => {
          console.log(`${idx + 1}. ID: ${registro.id}`);

          tabla.columnas.forEach(columna => {
            const valor = registro[columna];
            if (valor && (valor.includes('Ã') || valor.includes('�'))) {
              const limpio = limpiarTexto(valor);
              console.log(`   📝 ${columna}:`);
              console.log(`      ANTES: "${valor}"`);
              console.log(`      DESPUÉS: "${limpio}"`);
            }
          });
          console.log('');
        });

        // Preguntar si corregir (por ahora solo mostrar)
        console.log(`\n💡 Para corregir estos ${result.recordset.length} registros:`);
        console.log(`   1. Verifica que las correcciones sean correctas`);
        console.log(`   2. Descomenta la sección de UPDATE en el script`);
        console.log(`   3. Vuelve a ejecutar el script\n`);

        /*
        // DESCOMENTAR ESTA SECCIÓN PARA APLICAR CORRECCIONES
        console.log('🔧 Aplicando correcciones...\n');

        for (const registro of result.recordset) {
          const updates = [];
          const params = [];

          tabla.columnas.forEach((columna, idx) => {
            const valor = registro[columna];
            if (valor && (valor.includes('Ã') || valor.includes('�'))) {
              const limpio = limpiarTexto(valor);
              const paramName = `param${idx}`;
              updates.push(`${columna} = @${paramName}`);
              params.push({ nombre: paramName, valor: limpio });
            }
          });

          if (updates.length > 0) {
            const updateQuery = `
              UPDATE ${tabla.nombre}
              SET ${updates.join(', ')}
              WHERE id = @id
            `;

            const request = pool.request();
            request.input('id', sql.Int, registro.id);

            params.forEach(p => {
              request.input(p.nombre, sql.NVarChar, p.valor);
            });

            await request.query(updateQuery);
            totalCorregidos++;

            if (totalCorregidos % 10 === 0) {
              console.log(`   Progreso: ${totalCorregidos} registros corregidos...`);
            }
          }
        }

        console.log(`✅ Corregidos ${totalCorregidos} registros en ${tabla.nombre}\n`);
        */

      } catch (error) {
        console.error(`❌ Error en tabla ${tabla.nombre}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN FINAL');
    console.log('='.repeat(80));
    console.log(`Total de registros con problemas encontrados: ${totalEncontrados}`);
    console.log(`Total de registros corregidos: ${totalCorregidos}`);

    if (totalCorregidos === 0 && totalEncontrados > 0) {
      console.log('\n⚠️  Para aplicar las correcciones:');
      console.log('   1. Revisa los ejemplos mostrados arriba');
      console.log('   2. Haz un backup de la base de datos');
      console.log('   3. Descomenta la sección de UPDATE en el script');
      console.log('   4. Vuelve a ejecutar: node scripts/buscar_corregir_encoding.js');
    }

    console.log('\n' + '='.repeat(80));

    await pool.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR GENERAL:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
})();
