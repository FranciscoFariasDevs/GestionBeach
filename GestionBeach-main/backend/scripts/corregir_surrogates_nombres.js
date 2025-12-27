const { poolPromise, sql } = require('../config/db');

/**
 * Script para corregir surrogates (?) en nombres de empleados
 * Corrige: MU?Z → MUÑOZ, PE?RANDA → PEÑARANDA, etc.
 */

// Función para detectar y corregir surrogates
function corregirSurrogates(texto) {
  if (!texto) return texto;

  let resultado = String(texto);

  // Detectar si tiene surrogates (caracteres en rango 0xD800-0xDFFF)
  const tieneSurrogates = /[\uD800-\uDFFF]/.test(resultado);

  if (tieneSurrogates) {
    // Intentar reconstruir desde bytes
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

  // Patrones comunes de nombres chilenos con Ñ
  resultado = resultado
    .replace(/MU\?Z/gi, 'MUÑOZ')
    .replace(/PE\?RANDA/gi, 'PEÑARANDA')
    .replace(/PE\?A/gi, 'PEÑA')
    .replace(/CUITI\?/gi, 'CUITIÑO')
    .replace(/AVENDA\?/gi, 'AVENDAÑO')
    .replace(/CASTA\?EDA/gi, 'CASTAÑEDA')
    .replace(/ORDO\?EZ/gi, 'ORDOÑEZ')
    .replace(/ESPA\?A/gi, 'ESPAÑA')
    .replace(/MONTOYA\?/gi, 'MONTOYA')
    .replace(/IBA\?EZ/gi, 'IBAÑEZ')
    .replace(/I\?IGUEZ/gi, 'IÑIGUEZ')
    .replace(/CORDE\?A/gi, 'CORDEÑA')
    .replace(/NU\?EZ/gi, 'NUÑEZ')
    .replace(/BENA\?ENTE/gi, 'BENAVENTE')
    .replace(/ZU\?IGA/gi, 'ZUÑIGA');

  // Si quedan otros ? que no matchearon, intentar reemplazar genericamente
  // Solo si hay vocal antes o después del ?
  resultado = resultado
    .replace(/([AEIOU])\?([AEIOU])/gi, '$1Ñ$2')
    .replace(/([AEIOU])\?/gi, '$1Ñ');

  // Casos especiales donde la Ñ está al final y se perdió la vocal
  resultado = resultado
    .replace(/ACU\u00D1$/g, 'ACUÑA')  // ACUÑ → ACUÑA
    .replace(/ACU\u00D1\s/g, 'ACUÑA ') // ACUÑ seguido de espacio
    .replace(/GUI\u00D1Z/gi, 'GUIÑEZ') // GUIÑZ → GUIÑEZ
    .replace(/ZU\u00D1IGA/gi, 'ZUÑIGA') // Por si acaso

  return resultado;
}

(async () => {
  try {
    console.log('='.repeat(80));
    console.log('CORRIGIENDO SURROGATES EN NOMBRES DE EMPLEADOS');
    console.log('='.repeat(80));
    console.log('');

    const pool = await poolPromise;

    // PASO 1: Encontrar registros con surrogates
    console.log('📋 PASO 1: Buscando registros con surrogates...\n');

    const buscarQuery = `
      SELECT id, nombre_empleado
      FROM datos_remuneraciones
      WHERE nombre_empleado LIKE '%?%'
         OR nombre_empleado LIKE '%�%'
         OR CAST(nombre_empleado AS VARBINARY(MAX)) LIKE '%DC%'
    `;

    const resultado = await pool.request().query(buscarQuery);

    if (resultado.recordset.length === 0) {
      console.log('✅ No se encontraron registros con surrogates');
      await pool.close();
      process.exit(0);
    }

    console.log(`⚠️  Encontrados ${resultado.recordset.length} registros con surrogates\n`);

    // PASO 2: Mostrar ejemplos de corrección
    console.log('📝 PASO 2: Vista previa de correcciones:\n');

    const correccionesPreview = [];
    resultado.recordset.slice(0, 10).forEach((registro, idx) => {
      const original = registro.nombre_empleado;
      const corregido = corregirSurrogates(original);

      if (original !== corregido) {
        correccionesPreview.push({
          id: registro.id,
          original,
          corregido
        });

        console.log(`${idx + 1}. ID: ${registro.id}`);
        console.log(`   ANTES: "${original}"`);
        console.log(`   DESPUÉS: "${corregido}"`);
        console.log('');
      }
    });

    if (correccionesPreview.length === 0) {
      console.log('ℹ️  Los registros encontrados ya están correctos o no se pueden corregir automáticamente\n');
      await pool.close();
      process.exit(0);
    }

    // PASO 3: Aplicar correcciones
    console.log('\n' + '='.repeat(80));
    console.log('🔧 PASO 3: Aplicando correcciones...\n');

    let corregidos = 0;
    let errores = 0;

    for (const registro of resultado.recordset) {
      const original = registro.nombre_empleado;
      const corregido = corregirSurrogates(original);

      if (original !== corregido) {
        try {
          const updateQuery = `
            UPDATE datos_remuneraciones
            SET nombre_empleado = @nombre_corregido
            WHERE id = @id
          `;

          const request = pool.request();
          request.input('id', sql.Int, registro.id);
          request.input('nombre_corregido', sql.NVarChar, corregido);

          await request.query(updateQuery);
          corregidos++;

          if (corregidos % 10 === 0) {
            console.log(`   ✅ Progreso: ${corregidos} registros corregidos...`);
          }
        } catch (error) {
          console.error(`   ❌ Error corrigiendo ID ${registro.id}:`, error.message);
          errores++;
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN FINAL');
    console.log('='.repeat(80));
    console.log(`✅ Registros corregidos exitosamente: ${corregidos}`);
    console.log(`❌ Errores durante corrección: ${errores}`);
    console.log(`📋 Total procesados: ${resultado.recordset.length}`);
    console.log('='.repeat(80));

    await pool.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
})();
