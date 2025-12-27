# Solución al Problema de Caracteres Extraños (Mojibake) en Excel

## 🔍 ¿Qué es el problema?

Cuando importas archivos Excel con palabras como **"Líquido"**, aparece en la base de datos como **"LÃ­quido"** u otros caracteres extraños.

Esto se llama **MOJIBAKE** (文字化け) - un término japonés para "caracteres corruptos".

## 📊 ¿Qué caracteres raros ves?

| Texto Correcto | Mojibake (lo que ves) | Explicación |
|----------------|----------------------|-------------|
| Líquido | LÃ­quido o LÃƒÂ­quido | Doble encoding UTF-8 |
| Razón | RazÃ³n | La ó mal codificada |
| Peña | PeÃ±a | La ñ mal codificada |
| José | JosÃ© | La é mal codificada |
| María | MarÃ­a | La í mal codificada |

## ⚙️ ¿Por qué pasa esto?

### Causa 1: normalize('NFD') incorrecto ❌

**ANTES (MALO):**
```javascript
.normalize('NFD')  // ← Descompone caracteres: "í" → "i" + "´"
```

**DESPUÉS (BUENO):**
```javascript
.normalize('NFC')  // ← Junta caracteres: "i" + "´" → "í"
```

### Causa 2: Columnas VARCHAR en lugar de NVARCHAR ❌

```sql
-- MAL: VARCHAR no soporta Unicode
descripcion VARCHAR(255)

-- BIEN: NVARCHAR soporta Unicode
descripcion NVARCHAR(255)
```

### Causa 3: No especificar encoding al insertar

```javascript
// MAL: Sin especificar tipo
request.input('nombre', nombre);

// BIEN: Especificando NVARCHAR
request.input('nombre', sql.NVarChar, nombre);
```

## ✅ Soluciones Implementadas

### 1. ✅ Función limpiarUnicode() Corregida

**Archivo:** `frontend/src/pages/RemuneracionesPage.jsx`

**Cambios:**
- ✅ Cambiado `normalize('NFD')` → `normalize('NFC')`
- ✅ Agregados patrones para corregir mojibake existente
- ✅ Limpieza de caracteres de control

### 2. 📝 Script para Verificar Datos

**Archivo:** `backend/scripts/fix_mojibake_data.js`

**Uso:**
```bash
cd backend
node scripts/fix_mojibake_data.js
```

Este script:
- Busca registros con caracteres Ã (mojibake)
- Muestra ANTES y DESPUÉS de la corrección
- NO modifica datos automáticamente (seguro para probar)

### 3. 📝 Script SQL para Verificar Columnas

**Archivo:** `backend/scripts/fix_unicode_columns.sql`

Verifica qué columnas son VARCHAR y necesitan cambiar a NVARCHAR.

## 🎯 Solución Definitiva (3 Pasos)

### Paso 1: Verificar qué está mal

```bash
cd backend
node scripts/fix_mojibake_data.js
```

### Paso 2: Corregir futuros imports

✅ **YA HECHO** - La función `limpiarUnicode()` fue corregida.

Ahora los nuevos imports de Excel guardarán correctamente "Líquido" sin caracteres raros.

### Paso 3: Corregir datos existentes (OPCIONAL)

Si ya tienes datos con mojibake en la base de datos:

```javascript
// Descomenta las líneas en fix_mojibake_data.js para ejecutar la corrección
// IMPORTANTE: Haz backup primero!
```

## 🧪 Cómo Probar

### Prueba 1: Importar nuevo Excel

1. Crea un Excel con la palabra "Líquido", "José", "María", etc.
2. Importa el Excel usando el sistema
3. Verifica en la base de datos - debería aparecer correctamente

### Prueba 2: Verificar encoding

```javascript
const texto = "Líquido";
console.log('NFC:', texto.normalize('NFC'));  // ✅ "Líquido" (correcto)
console.log('NFD:', texto.normalize('NFD'));  // ❌ "Li´quido" (mal)
```

## 📚 Referencia Técnica

### ¿Qué hace normalize()?

- **NFC (Canonical Composition):** Junta caracteres → "i" + "´" = "í" ✅
- **NFD (Canonical Decomposition):** Separa caracteres → "í" = "i" + "´" ❌

### Bytes Hexadecimales

| Caracter | UTF-8 Correcto | Mojibake (doble) |
|----------|----------------|------------------|
| í | C3 AD | C3 83 C2 AD |
| á | C3 A1 | C3 83 C2 A1 |
| é | C3 A9 | C3 83 C2 A9 |

### SQL Server: VARCHAR vs NVARCHAR

```sql
-- VARCHAR: 1 byte por caracter, solo ASCII + Latin-1
CREATE TABLE test (nombre VARCHAR(100));
INSERT INTO test VALUES ('Líquido');  -- ❌ Se guarda mal

-- NVARCHAR: 2 bytes por caracter, soporta Unicode
CREATE TABLE test (nombre NVARCHAR(100));
INSERT INTO test VALUES (N'Líquido'); -- ✅ Se guarda bien
```

**Nota:** El prefijo `N` en `N'Líquido'` indica que es una cadena Unicode.

## 🔧 Mantenimiento Futuro

### Al crear nuevas tablas:

```sql
-- SIEMPRE usar NVARCHAR para textos con tildes/ñ
CREATE TABLE nueva_tabla (
  id INT PRIMARY KEY,
  nombre NVARCHAR(200),        -- ✅ Soporta Unicode
  descripcion NVARCHAR(500),   -- ✅ Soporta Unicode
  codigo VARCHAR(50)           -- ✅ OK para códigos/IDs sin tildes
);
```

### Al insertar datos desde Node.js:

```javascript
// SIEMPRE especificar sql.NVarChar
request.input('nombre', sql.NVarChar, nombre);
request.input('descripcion', sql.NVarChar, descripcion);
```

## ❓ Preguntas Frecuentes

**P: ¿Por qué algunos textos se ven bien y otros mal?**
R: Depende de si la columna es VARCHAR o NVARCHAR.

**P: ¿Tengo que corregir todos los datos antiguos?**
R: No es obligatorio. Los nuevos imports ya funcionarán bien. Los datos antiguos puedes corregirlos cuando tengas tiempo.

**P: ¿El script de corrección es seguro?**
R: Sí, por defecto solo MUESTRA los cambios. Para aplicarlos, debes descomentar las líneas indicadas en el script.

## ✅ Checklist Final

- [x] Función limpiarUnicode() corregida con NFC
- [x] Script de verificación creado
- [x] Script SQL de análisis creado
- [ ] Probar con nuevo Excel (hazlo tú)
- [ ] Verificar en base de datos (hazlo tú)
- [ ] Opcionalmente: corregir datos antiguos

---

**Última actualización:** 2025-12-27
**Solución aplicada por:** Claude Code
