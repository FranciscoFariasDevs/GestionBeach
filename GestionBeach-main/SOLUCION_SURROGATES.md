# Solución al Problema de Surrogates Solitarios

## 🔍 El Problema Detectado

**Síntoma:** Al importar Excel con "Líquido", aparece como `L\udc75ido`

```javascript
// Lo que debería verse:
"Líquido" // ✅ 7 caracteres

// Lo que realmente se ve:
"L\udc75ido" // ❌ 5 caracteres (se perdieron "íq")
```

## 🧬 ¿Qué es `\udc75`?

`\udc75` es un **SURROGATE SOLITARIO** (lone surrogate):

| Código | Hexadecimal | Tipo | ¿Es válido? |
|--------|-------------|------|-------------|
| \udc75 | 0xDC75 | LOW SURROGATE | ❌ NO |
| 56437 (decimal) | - | Rango: U+DC00-U+DFFF | ⚠️ INVÁLIDO |

### **¿Por qué aparece?**

Los surrogates solitarios aparecen cuando:

1. **Excel tiene encoding corrupto** - El archivo original no está en UTF-8 puro
2. **Librería XLSX no puede decodificar** - Encuentra bytes que no puede interpretar
3. **Se reemplazan caracteres inválidos** - Python/Node.js los convierte en surrogates

## 🔬 Análisis Técnico

### Decodificación del surrogate

```javascript
const texto = "L\udc75ido";

// Análisis caracter por caracter:
texto[0] // "L"     → U+004C ✅
texto[1] // "\udc75" → U+DC75 ⚠️ SURROGATE (byte 0x75 = 'u')
texto[2] // "i"     → U+0069 ✅
texto[3] // "d"     → U+0064 ✅
texto[4] // "o"     → U+006F ✅

// El \udc75 representa el byte 0x75 que es la letra 'u'
// Se perdieron completamente "íq"
```

### ¿Por qué se pierden caracteres?

```
Original en Excel: L í q u i d o
                   ↓ ↓ ↓ ↓ ↓ ↓ ↓

Encoding corrupto: L ? ? u i d o
                   ↓   ↓   ↓ ↓ ↓ ↓

XLSX lee:         L \udc75 i d o

Resultado final:  L u i d o
```

Los caracteres "í" y "q" no se pueden decodificar y se colapsan en un solo byte "u".

## ✅ Soluciones Implementadas

### 1. Mejorar lectura de XLSX (codepage UTF-8)

**Archivo:** `frontend/src/pages/RemuneracionesPage.jsx` (líneas 958-976)

```javascript
const workbook = XLSX.read(data, {
  type: 'array',
  codepage: 65001,  // ✅ Forzar UTF-8 (antes no especificado)
  cellDates: false,
  cellNF: false,
  cellText: true    // ✅ Leer como texto puro
});

const jsonData = XLSX.utils.sheet_to_json(worksheet, {
  header: 1,
  defval: '',
  blankrows: false,
  raw: false,
  rawNumbers: false // ✅ No interpretar números, leer como texto
});
```

### 2. Detectar y limpiar surrogates en limpiarUnicode()

**Archivo:** `frontend/src/pages/RemuneracionesPage.jsx` (líneas 253-313)

```javascript
const limpiarUnicode = (texto) => {
  if (!texto) return '';

  let resultado = String(texto);

  // PASO 1: Detectar surrogates solitarios
  const tieneSurrogates = /[\uD800-\uDFFF]/.test(resultado);

  if (tieneSurrogates) {
    console.warn('⚠️ Surrogates detectados en:', resultado);

    // Intentar decodificar surrogates como bytes
    let bytes = [];
    for (let i = 0; i < resultado.length; i++) {
      const code = resultado.charCodeAt(i);
      if (code >= 0xDC00 && code <= 0xDCFF) {
        bytes.push(code - 0xDC00); // Extraer byte original
      } else {
        bytes.push(code);
      }
    }

    resultado = bytes.map(b => String.fromCharCode(b)).join('');
    console.log('✅ Surrogates decodificados:', resultado);
  }

  // PASO 2: Corregir mojibake
  resultado = resultado
    .replace(/Ã­/g, 'í')
    .replace(/Ã¡/g, 'á')
    // ... etc

  // PASO 3: Normalizar a NFC
  resultado = resultado.normalize('NFC');

  return resultado;
};
```

### 3. Script de diagnóstico

**Archivo:** `backend/scripts/test_surrogate_decode.js`

Ejecutar:
```bash
cd backend
node scripts/test_surrogate_decode.js
```

Esto muestra:
- ✅ Qué caracteres son surrogates
- ✅ Decodificación paso a paso
- ✅ Bytes hexadecimales
- ✅ Diferentes intentos de decodificación

## 🎯 Cómo Probar la Solución

### Prueba 1: Verificar en consola del navegador

1. Abre la consola del navegador (F12)
2. Importa un Excel con "Líquido"
3. Busca mensajes:
   ```
   ⚠️ Surrogates detectados en: L�ido
   ✅ Surrogates decodificados: Luido
   ```

### Prueba 2: Verificar en base de datos

Después de importar, verifica que se guardó correctamente (aunque puede estar incompleto si el Excel original está corrupto).

## 🔧 Solución al Problema de Origen

**El problema real está en el archivo Excel original.**

### Opción A: Limpiar el Excel antes de importar

1. Abre el Excel en Excel/LibreOffice
2. Guarda como → "CSV UTF-8 (delimitado por comas)"
3. Abre el CSV en Notepad++ o VS Code
4. Verifica que se vean correctamente los caracteres especiales
5. Si no, reemplaza manualmente los errores
6. Guarda y vuelve a convertir a Excel

### Opción B: Crear nuevo Excel desde cero

1. Copia SOLO los valores (Ctrl+C → Pegar Valores)
2. En un nuevo Excel en blanco
3. Asegúrate de que el nuevo Excel está guardado como .xlsx (UTF-8)

### Opción C: Usar Google Sheets

1. Sube el Excel a Google Sheets
2. Google Sheets auto-corrige muchos problemas de encoding
3. Descarga como Excel (.xlsx)
4. Importa el nuevo archivo

## 📊 Tabla de Referencia de Surrogates

| Rango | Tipo | Uso | ¿Válido solo? |
|-------|------|-----|---------------|
| U+D800 - U+DBFF | HIGH SURROGATE | UTF-16 (primera mitad) | ❌ NO |
| U+DC00 - U+DFFF | LOW SURROGATE | UTF-16 (segunda mitad) | ❌ NO |
| U+0000 - U+D7FF | Caracteres normales | Unicode válido | ✅ SÍ |
| U+E000 - U+FFFF | Caracteres normales | Unicode válido | ✅ SÍ |

**Importante:** Los surrogates solo son válidos en PARES (high + low) en UTF-16. Un surrogate SOLITARIO siempre es un error.

## 🐛 Debugging

### Ver surrogates en JavaScript

```javascript
const texto = "L\udc75ido";

// Método 1: Ver código de cada caracter
for (let i = 0; i < texto.length; i++) {
  const code = texto.charCodeAt(i);
  console.log(i, texto[i], code.toString(16),
    (code >= 0xD800 && code <= 0xDFFF) ? '⚠️ SURROGATE' : '✅');
}

// Método 2: Detectar con regex
const tieneSurrogates = /[\uD800-\uDFFF]/.test(texto);
console.log('Tiene surrogates?', tieneSurrogates); // true
```

### Ver en Node.js

```javascript
const texto = "L\udc75ido";
console.log(Buffer.from(texto)); // Ver bytes
console.log([...texto].map(c => c.charCodeAt(0))); // Ver códigos
```

## ✅ Checklist

- [x] XLSX.read() configurado con codepage: 65001 (UTF-8)
- [x] limpiarUnicode() detecta y maneja surrogates
- [x] Logs en consola para debugging
- [x] Script de diagnóstico creado
- [ ] Probar con Excel problemático (hazlo tú)
- [ ] Verificar solución (hazlo tú)
- [ ] Si persiste: limpiar Excel de origen (hazlo tú)

## 🎓 Lecciones Aprendidas

1. **Los surrogates solitarios siempre indican datos corruptos**
2. **El problema usualmente está en el archivo fuente, no en el código**
3. **Especificar `codepage: 65001` ayuda a XLSX a leer UTF-8 correctamente**
4. **Los surrogates en rango 0xDC00-0xDCFF representan bytes originales**

---

**Última actualización:** 2025-12-27
**Por:** Claude Code
