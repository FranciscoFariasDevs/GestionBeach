# SOLUCIÓN: Empleados sin Sucursal - Estado de Resultados Vacío

## 🔍 Problema Identificado

**Síntoma:** Las remuneraciones no aparecen en el Estado de Resultados aunque existan en el sistema.

**Causa Raíz:** Los empleados no tienen sucursales asignadas correctamente en la tabla `empleados_sucursales`, lo que impide que sus sueldos se vinculen a las sucursales en el Estado de Resultados.

## 🔧 Correcciones Realizadas

### 1. **remuneracionesController.js** - Función `asignarRazonSocialYSucursal`

**Problema:**
```javascript
// ❌ ANTES - Eliminaba TODAS las sucursales del empleado
await transaction.request()
  .input('id_empleado', sql.Int, id_empleado)
  .query('DELETE FROM empleados_sucursales WHERE id_empleado = @id_empleado');

await transaction.request()
  .input('id_empleado', sql.Int, id_empleado)
  .input('id_sucursal', sql.Int, id_sucursal)
  .query(`
    INSERT INTO empleados_sucursales (id_empleado, id_sucursal, created_at)
    VALUES (@id_empleado, @id_sucursal, GETDATE())
  `);
```

**Solución:**
```javascript
// ✅ DESPUÉS - Agrega o reactiva la sucursal sin eliminar otras
const existeResult = await transaction.request()
  .input('id_empleado', sql.Int, id_empleado)
  .input('id_sucursal', sql.Int, id_sucursal)
  .query(`
    SELECT COUNT(*) as count
    FROM empleados_sucursales
    WHERE id_empleado = @id_empleado AND id_sucursal = @id_sucursal
  `);

if (existeResult.recordset[0].count > 0) {
  // Reactivar relación existente
  await transaction.request()
    .input('id_empleado', sql.Int, id_empleado)
    .input('id_sucursal', sql.Int, id_sucursal)
    .query(`
      UPDATE empleados_sucursales
      SET activo = 1, updated_at = GETDATE()
      WHERE id_empleado = @id_empleado AND id_sucursal = @id_sucursal
    `);
} else {
  // Crear nueva relación CON campo activo
  await transaction.request()
    .input('id_empleado', sql.Int, id_empleado)
    .input('id_sucursal', sql.Int, id_sucursal)
    .query(`
      INSERT INTO empleados_sucursales (id_empleado, id_sucursal, activo, created_at)
      VALUES (@id_empleado, @id_sucursal, 1, GETDATE())
    `);
}
```

**Beneficios:**
- ✅ Preserva las sucursales existentes del empleado
- ✅ Soporta correctamente empleados con múltiples sucursales
- ✅ Usa el campo `activo` para manejo de estado
- ✅ Evita duplicados

### 2. **Scripts de Diagnóstico y Reparación**

Creados dos scripts nuevos en `backend/scripts/`:

#### **diagnosticar_empleados_completo.js**
Identifica todos los problemas:
- Empleados sin razón social
- Empleados sin sucursales
- **CRÍTICO:** Empleados con remuneraciones pero sin sucursal (no aparecerán en Estado de Resultados)
- Estadísticas por sucursal
- Recomendaciones de solución

#### **reparar_empleados_sucursales.js**
Repara automáticamente:
- Asigna sucursales a empleados basándose en su campo `establecimiento`
- Busca coincidencias exactas y parciales
- Reporta empleados que requieren asignación manual

## 📋 Cómo Solucionar el Problema

### Paso 1: Diagnosticar el Estado Actual

```bash
cd backend
node scripts/diagnosticar_empleados_completo.js
```

Esto mostrará:
- Cuántos empleados tienen remuneraciones pero no aparecerán en Estado de Resultados
- Lista detallada de empleados problemáticos
- Estadísticas por sucursal

### Paso 2: Reparación Automática (Recomendado)

```bash
node scripts/reparar_empleados_sucursales.js
```

Este script:
1. Identificará empleados sin sucursal que tienen campo `establecimiento`
2. Los asignará automáticamente a la sucursal correspondiente
3. Reportará empleados que no pudo asignar automáticamente

### Paso 3: Asignación Manual (Para casos no resueltos)

#### Opción A: Desde el Módulo de Remuneraciones

1. Ve a **Remuneraciones**
2. Selecciona un **Período** (mes/año)
3. Click en **"Asignar Razón Social y Sucursal"**
4. Para cada empleado sin sucursal:
   - Selecciona la **Razón Social** correcta
   - Selecciona la **Sucursal** correcta
   - Click **"Guardar Asignaciones"**

#### Opción B: Desde el Módulo de Empleados

1. Ve a **Empleados**
2. Busca el empleado sin sucursal
3. Click en **"Editar"** (ícono de lápiz)
4. En la sección de sucursales:
   - Selecciona las sucursales del empleado
   - Puedes asignar **múltiples sucursales** si es un empleado administrativo
5. Click **"Guardar"**

### Paso 4: Verificar en Estado de Resultados

1. Ve a **Estado de Resultados**
2. Selecciona:
   - **Sucursal:** La sucursal a consultar
   - **Período:** El mes/año a consultar
   - **Razón Social:** La razón social correspondiente
3. Click **"Consultar Datos"**
4. En el panel derecho **"Estado de Resultados Detallado"**, busca:
   - **Gastos de Venta → Sueldos Ventas** (empleados de una sola sucursal)
   - **Gastos Administrativos → Sueldos Administrativos** (empleados de múltiples sucursales)

**Ambos valores deberían incluir los costos patronales:**
- Caja Compensación
- AFC
- SIS
- ACH
- Imposiciones

## 🔄 Flujo Correcto de Datos

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. IMPORTAR REMUNERACIONES                                      │
│    └─> Crea/actualiza empleados en tabla 'empleados'           │
│    └─> Guarda datos en 'datos_remuneraciones'                  │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. ASIGNAR SUCURSALES Y RAZONES SOCIALES                        │
│    ├─> Opción A: Desde Remuneraciones (asignarRazonSocialY...│
│    │    - Actualiza 'id_razon_social' en empleados             │
│    │    - AGREGA/REACTIVA en 'empleados_sucursales' (FIX!)     │
│    │                                                             │
│    └─> Opción B: Desde Empleados (updateEmpleado)              │
│        - Actualiza 'id_razon_social' en empleados              │
│        - Actualiza 'empleados_sucursales' con múltiples IDs    │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. ESTADO DE RESULTADOS - Consulta Remuneraciones               │
│    Query JOIN:                                                   │
│    - datos_remuneraciones (dr)                                  │
│    - empleados (e) via RUT matching                             │
│    - empleados_sucursales (es) WHERE activo = 1                 │
│    - sucursales (s)                                             │
│                                                                  │
│    Clasificación Automática:                                    │
│    - COUNT sucursales por empleado                              │
│    - Si > 1 sucursal → ADMINISTRATIVO (divide sueldo)          │
│    - Si = 1 sucursal → VENTAS (100% del sueldo)                │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. MOSTRAR EN FRONTEND                                           │
│    ├─> Gastos de Venta - Sueldos Ventas                        │
│    └─> Gastos Administrativos - Sueldos Administrativos        │
│        (Ambos incluyen costos patronales)                       │
└─────────────────────────────────────────────────────────────────┘
```

## ⚠️ Validaciones Importantes

### Antes de Consultar Estado de Resultados

1. **Verificar que el empleado existe:**
   ```sql
   SELECT * FROM empleados WHERE rut = '12345678-9'
   ```

2. **Verificar que tiene sucursales activas:**
   ```sql
   SELECT es.*, s.nombre
   FROM empleados_sucursales es
   JOIN sucursales s ON es.id_sucursal = s.id
   WHERE es.id_empleado = <ID> AND es.activo = 1
   ```

3. **Verificar que tiene remuneraciones:**
   ```sql
   SELECT dr.*, p.mes, p.anio
   FROM datos_remuneraciones dr
   JOIN periodos_remuneracion p ON dr.id_periodo = p.id_periodo
   JOIN empleados e ON
     REPLACE(REPLACE(REPLACE(UPPER(e.rut), '.', ''), '-', ''), ' ', '') =
     REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '')
   WHERE e.id = <ID>
   ```

4. **Verificar razón social:**
   ```sql
   SELECT id, rut, nombre, id_razon_social
   FROM empleados
   WHERE id = <ID>
   ```

## 🎯 Puntos Clave a Recordar

1. **NO hay duplicidad:** Cada empleado tiene un solo registro en `empleados`, pero puede tener múltiples registros en `empleados_sucursales` (una por cada sucursal asignada)

2. **Campo `activo`:** Siempre usar `activo = 1` para relaciones vigentes. NO eliminar registros, usar `activo = 0` para desactivar.

3. **Clasificación automática:**
   - **1 sucursal** → VENTAS (100% del sueldo)
   - **Múltiples sucursales** → ADMINISTRATIVO (sueldo dividido proporcionalmente)

4. **Costos patronales:** Ya están incluidos en los totales de "Sueldos Ventas" y "Sueldos Administrativos" que se muestran en Estado de Resultados.

5. **Matching por RUT:** El sistema vincula `datos_remuneraciones` con `empleados` usando el RUT (limpio, sin puntos ni guiones).

## ✅ Checklist de Validación Final

Después de aplicar las correcciones:

- [ ] Ejecutar script de diagnóstico - No debe mostrar empleados críticos
- [ ] Ejecutar script de reparación - Todos asignados exitosamente
- [ ] Verificar en Empleados - Todos tienen sucursales visibles
- [ ] Verificar en Remuneraciones - Todas muestran sucursal
- [ ] Verificar en Estado de Resultados:
  - [ ] Aparecen "Sueldos Ventas" con montos > 0
  - [ ] Aparecen "Sueldos Administrativos" con montos > 0
  - [ ] Totales coinciden con lo esperado
  - [ ] Al pasar mouse sobre sueldos, tooltip confirma costos patronales

## 📞 Soporte

Si después de seguir estos pasos aún no aparecen las remuneraciones:

1. Ejecuta nuevamente el script de diagnóstico
2. Verifica los logs del backend al consultar Estado de Resultados
3. Revisa la consola del navegador para errores
4. Comparte el output del script de diagnóstico para análisis

---

**Fecha de solución:** Diciembre 2024
**Archivos modificados:**
- `backend/controllers/remuneracionesController.js`
- `backend/scripts/diagnosticar_empleados_completo.js` (nuevo)
- `backend/scripts/reparar_empleados_sucursales.js` (nuevo)
