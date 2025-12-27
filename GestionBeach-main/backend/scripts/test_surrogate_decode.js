/**
 * Script para analizar y decodificar surrogates solitarios
 * El problema: "L\udc75ido" en lugar de "Líquido"
 */

const testStrings = [
  'L\udc75ido',           // Ejemplo del usuario
  'Líquido',              // Correcto
  'L\udc69quido',         // Otro ejemplo posible
  'L\udc69\udc71ido'      // Ejemplo con múltiples surrogates
];

console.log('='.repeat(80));
console.log('ANÁLISIS DE SURROGATES SOLITARIOS EN UNICODE');
console.log('='.repeat(80));
console.log('');

// Función para mostrar info detallada de un string
function analizarString(str, label) {
  console.log(`\n📝 ${label}:`);
  console.log(`   Texto: "${str}"`);
  console.log(`   Length: ${str.length}`);
  console.log('   Caracteres:');

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const code = str.charCodeAt(i);
    const hex = code.toString(16).toUpperCase().padStart(4, '0');
    const isSurrogate = (code >= 0xD800 && code <= 0xDFFF);

    console.log(`     [${i}] "${char}" → U+${hex} (${code}) ${isSurrogate ? '⚠️ SURROGATE!' : '✅'}`);
  }
}

// Función para detectar surrogates
function tieneSurrogates(str) {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0xD800 && code <= 0xDFFF) {
      return true;
    }
  }
  return false;
}

// Función para limpiar surrogates (método 1: eliminar)
function limpiarSurrogatesEliminar(str) {
  return str.replace(/[\uD800-\uDFFF]/g, '');
}

// Función para limpiar surrogates (método 2: reemplazar con placeholder)
function limpiarSurrogatesReemplazar(str) {
  return str.replace(/[\uD800-\uDFFF]/g, '?');
}

// Función para intentar decodificar surrogates a Latin-1
function decodificarSurrogateLatin1(str) {
  let resultado = '';

  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);

    // Si es un LOW surrogate en el rango DC00-DCFF
    if (code >= 0xDC00 && code <= 0xDCFF) {
      // El byte original probablemente era (code - 0xDC00)
      const byteLatin1 = code - 0xDC00;
      resultado += String.fromCharCode(byteLatin1);
    } else {
      resultado += str[i];
    }
  }

  return resultado;
}

// Función para decodificar usando UTF-8 manual
function decodificarSurrogateUTF8(str) {
  const bytes = [];

  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);

    if (code >= 0xDC00 && code <= 0xDCFF) {
      bytes.push(code - 0xDC00);
    } else if (code < 128) {
      bytes.push(code);
    } else {
      // Caracter multi-byte normal
      const encoded = Buffer.from(str[i], 'utf8');
      for (const byte of encoded) {
        bytes.push(byte);
      }
    }
  }

  return Buffer.from(bytes).toString('utf8');
}

console.log('\n' + '='.repeat(80));
console.log('PRUEBAS DE DECODIFICACIÓN');
console.log('='.repeat(80));

testStrings.forEach((str, idx) => {
  analizarString(str, `Ejemplo ${idx + 1}`);

  if (tieneSurrogates(str)) {
    console.log('\n   🔧 Intentando decodificar:');
    console.log(`     • Eliminando surrogates: "${limpiarSurrogatesEliminar(str)}"`);
    console.log(`     • Reemplazando con ?: "${limpiarSurrogatesReemplazar(str)}"`);
    console.log(`     • Decodificando como Latin-1: "${decodificarSurrogateLatin1(str)}"`);

    try {
      const utf8 = decodificarSurrogateUTF8(str);
      console.log(`     • Decodificando como UTF-8: "${utf8}"`);
    } catch (e) {
      console.log(`     • Decodificando como UTF-8: ERROR - ${e.message}`);
    }
  }
});

// Caso específico del usuario
console.log('\n' + '='.repeat(80));
console.log('SOLUCIÓN PARA "L\\udc75ido" → "Líquido"');
console.log('='.repeat(80));

const problematico = 'L\udc75ido';
const bytes = [];

// Extraer bytes
for (let i = 0; i < problematico.length; i++) {
  const code = problematico.charCodeAt(i);
  if (code >= 0xDC00 && code <= 0xDCFF) {
    bytes.push(code - 0xDC00);
  } else {
    bytes.push(code);
  }
}

console.log('\nBytes extraídos:', bytes.map(b => '0x' + b.toString(16).toUpperCase()).join(' '));

// Intentar decodificar como diferentes encodings
try {
  const latin1 = Buffer.from(bytes, 'latin1').toString('utf8');
  console.log('Como Latin-1:', latin1);
} catch (e) {
  console.log('Como Latin-1: ERROR');
}

try {
  const utf8 = Buffer.from(bytes).toString('utf8');
  console.log('Como UTF-8:', utf8);
} catch (e) {
  console.log('Como UTF-8: ERROR');
}

try {
  const cp1252 = Buffer.from(bytes).toString('latin1');
  console.log('Como CP1252/Latin1:', cp1252);
} catch (e) {
  console.log('Como CP1252: ERROR');
}

console.log('\n' + '='.repeat(80));
console.log('✅ SCRIPT COMPLETADO');
console.log('='.repeat(80));
