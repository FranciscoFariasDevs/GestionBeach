# SOLUCIÓN: Duplicados de Remuneraciones y Asignación de Sucursales/Razones Sociales

## 🔍 Problemas Identificados y Resueltos

### 1. **Duplicidad de Remuneraciones** ✅ RESUELTO

**Síntoma:**
- El mismo empleado aparecía múltiples veces (2x) en el mismo período
- Los montos en Estado de Resultados estaban inflados (duplicados)

**Diagnóstico:**
- 99 empleados tenían remuneraciones duplicadas
- Períodos afectados: Noviembre 2025 (50 empleados) y Febrero 2021 (49 empleados)

**Solución Aplicada:**
- ✅ Creado script de diagnóstico: `backend/scripts/diagnosticar_duplicados_remuneraciones.js`
- ✅ Creado script de limpieza: `backend/scripts/eliminar_duplicados_remuneraciones.js`
- ✅ **Ejecutado script de limpieza: 99 registros duplicados eliminados**
- ✅ Se mantuvo el registro con ID más alto (más reciente) para cada empleado/período

### 2. **Empleados sin Sucursales** ✅ PARCIALMENTE RESUELTO

**Síntoma:**
- 80 empleados tenían remuneraciones pero no aparecían en Estado de Resultados
- Causa: No tenían sucursales asignadas en `empleados_sucursales`

**Solución Aplicada:**
- ✅ Creado script de diagnóstico: `backend/scripts/diagnosticar_empleados_completo.js`
- ✅ Creado script de reparación: `backend/scripts/reparar_empleados_sucursales.js`
- ✅ **Ejecutado script de reparación: 29 empleados asignados automáticamente**
- ⚠️ **Pendiente: 37 empleados requieren asignación manual**

### 3. **Bug en asignarRazonSocialYSucursal** ✅ RESUELTO

**Síntoma:**
- Al asignar sucursal desde Remuneraciones, se eliminaban TODAS las sucursales del empleado
- Empleados con múltiples sucursales perdían las demás al asignar una nueva

**Solución Aplicada:**
- ✅ Corregido `remuneracionesController.js` función `asignarRazonSocialYSucursal`
- ✅ Ahora verifica si la relación existe y la reactiva en lugar de eliminar todo
- ✅ Usa correctamente el campo `activo` para manejo de estado
- ✅ Soporta correctamente empleados con múltiples sucursales

## 📋 Scripts Creados

### Diagnóstico de Remuneraciones
```bash
cd backend
node scripts/diagnosticar_duplicados_remuneraciones.js
```
**Muestra:**
- Empleados con remuneraciones duplicadas por período
- Total de registros a eliminar
- Estadísticas por período

### Limpieza de Duplicados
```bash
node scripts/eliminar_duplicados_remuneraciones.js
```
**Acción:**
- Elimina remuneraciones duplicadas
- Mantiene el registro con ID más alto (más reciente)
- Verificación final de que no queden duplicados

### Diagnóstico de Empleados
```bash
node scripts/diagnosticar_empleados_completo.js
```
**Muestra:**
- Empleados sin razón social
- Empleados sin sucursales
- **CRÍTICO:** Empleados con remuneraciones pero sin sucursal
- Estadísticas por sucursal
- Recomendaciones de solución

### Reparación de Sucursales
```bash
node scripts/reparar_empleados_sucursales.js
```
**Acción:**
- Asigna automáticamente sucursales basándose en el campo `establecimiento`
- Busca coincidencias exactas y parciales
- Reporta empleados que requieren asignación manual

## 🎯 Tareas Pendientes

### 37 Empleados Requieren Asignación Manual de Sucursales

Estos empleados tienen remuneraciones pero no se pudo asignar sucursal automáticamente porque:
- No tienen campo `establecimiento`
- El establecimiento no coincide con ninguna sucursal
- Tienen establecimiento genérico ("OBRAS EN CONSTRUCCION", "ADMINISTRACION", etc.)

**Opción A: Desde Remuneraciones (Recomendado para múltiples)**

1. Ve a **Remuneraciones**
2. Selecciona **Período** (ej: Julio 2025)
3. Click **"Asignar Razón Social y Sucursal"**
4. Para cada empleado sin sucursal:
   - Selecciona **Razón Social**
   - Selecciona **Sucursal**
5. Click **"Guardar Asignaciones"**

**Opción B: Desde Empleados (Para pocos empleados)**

1. Ve a **Empleados**
2. Usa el filtro "Sin Sucursal" o busca el empleado
3. Click **Editar** (ícono lápiz)
4. Selecciona las **Sucursales** correctas
5. Click **"Guardar"**

### Lista de Empleados que Requieren Asignación Manual

1. CAROLINA ANDREA FLORES CARRASCO - "SUPER COLELEMU"
2. XIMENA ANDREA RUIZ VASQUEZ - "SUPER COLELEMU"
3. MARIA TERESA ACUÑA CONSTANZO - "SUPERMERCADOENRIQUEMOLINA"
4. PAULA ANDREA GUIÑEZ VERGARA - "SUPER E.MOLINA"
5. GUILLERMO HERNAN CEBALLOS CORNEJO - "SUPER LORCOCHRANE"
6. JOHANS ANDRES CABRERA JARA - "SUPER E.MOLINA"
7. CLAUDIA ANDREA ROMERO ALARCON - "SUPER COLEMU"
8. NANCY CECILIA HIDALGO FUENTEALBA - "SUPERMERCADO"
9. JUAN ANTONIO CORTES BETANCUR - "SUPERMERCADO"
10. JULIO CESAR RIVERO MEDINA - "VARIOS LOCALES"
11. ERIKA ISAURA SALAZAR ALARCON - "CENTRO COMERCIAL"
12. PATRICIA ADELINA QUINTANA AGUILERA - "FERRETERIA V.PALACIOS"
13. PAULA ANDREA SALGADO MONTOYA - "SUPERMERCADO BEACH"
14. MAURICIO ALEJANDRO VEGA VILO - "GESTION ADM."
15. EVELYN PILAR PONCE GUTIERREZ - "SUPERMERCADO BEACH"
16. MARIA PAZ ERIZ FLORES - "SUPERMERCADO BEACH"
17. LUCAS EVANGELISTA RETAMAL VILLABLANCA - "OBRAS EN CONSTRUCCION"
18. SEBASTIAN ALEXANDER MUNOZ GUINEZ - "OBRAS EN CONSTRUCCION"
19. ALEX DANIEL BARRIENTOS LEAL - "OBRAS EN CONSTRUCCION"
20. MANUEL JESUS PONCE FLORES - "OBRAS EN CONSTRUCCION"
21. AQUILES ALEJANDRO ESPINOZA LAGOS - "OBRAS EN CONSTRUCCION"
22. HERNAN DANIEL RETAMAL VILLABLANCA - "OBRAS EN CONSTRUCCION"
23. ALEJANDRO DEL TRANSITO VELOZO RETAMAL - "MANTENCION ELECTRICA"
24. KEVIN NICOLAS SOLIS CUEVAS - "OBRAS EN CONTRUCCION"
25. DIEGO ALONSO REYES ROA - "ADMINISTRACION"
26. MIGUEL EDUARDO GARRIDO DOMINGUEZ - "GERENCIAL"
27. VICTOR MANUEL AVENDANO BELTRAN - "OBRAS EN CONTRUCCION"
28. DEBORA IMARA ARTEAGA HERNANDEZ - "ADMINISTRACION"
29. VICENTE ALEJANDRO MEZA CUEVAS - "FERRETERIA V.PALACIOS"
30. FRANCISCO JAVIER FARIAS ESPINOZA - "TODOS LOS LOCALES BEACH"
31. MAURICIO EUGENIO CONCHA RIFFO - "NOGUEIRA 1150, V.PALACIOS 2807..."
32. FRANCISCO ALBERTO CAMAÑO SALAZAR - "NOGUEIRA 1150, COLIUMO..."
33. JUAN GERARDO CABRERA LAVIN - "FERETERIA"
34. DOMENICA ESTEFANIA FLORES RIVAS - "SUPERMERCADO"
35. OMIRIXA YAIMARU GONZALEZ PALMAR - "SUPERMERCADO"
36. SALOMON NICOLAS RETAMAL GRANADINO - "FERRETERIA V.PALACIOS"
37. EDUARDO ANDRES SANHUEZA MARTINEZ - "FERRETERIA V.PALACIOS"

## 📊 Resultados Esperados

Después de completar la asignación manual de los 37 empleados:

### En Estado de Resultados

1. Ve a **Estado de Resultados**
2. Selecciona:
   - **Sucursal:** (cualquier sucursal)
   - **Período:** (ej: Julio 2025)
   - **Razón Social:** (correspondiente)
3. Verifica:
   - ✅ **Sueldos Ventas** con montos correctos (no duplicados)
   - ✅ **Sueldos Administrativos** con montos correctos (no duplicados)
   - ✅ Totales reflejan la realidad (eliminados los 99 duplicados)

### Clasificación Automática

El sistema clasifica automáticamente:
- **1 sucursal** → VENTAS (100% del sueldo a esa sucursal)
- **Múltiples sucursales** → ADMINISTRATIVO (sueldo dividido proporcionalmente)

## 🔒 Prevención de Duplicados Futuros

### Validación Requerida en Importación de Remuneraciones

**Pendiente**: Agregar validación en el proceso de importación para prevenir duplicados:

```javascript
// En remuneracionesController.js - función de importación
// ANTES de insertar, verificar:
const duplicadoExiste = await pool.request()
  .input('rut_empleado', sql.VarChar, rutLimpio)
  .input('id_periodo', sql.Int, periodoId)
  .query(`
    SELECT COUNT(*) as count
    FROM datos_remuneraciones
    WHERE rut_empleado = @rut_empleado AND id_periodo = @id_periodo
  `);

if (duplicadoExiste.recordset[0].count > 0) {
  // Actualizar registro existente en lugar de insertar
  // O mostrar advertencia al usuario
}
```

### Recomendaciones

1. **No importar el mismo archivo Excel múltiples veces**
2. **Verificar período antes de importar**
3. **Ejecutar script de diagnóstico periódicamente:**
   ```bash
   node scripts/diagnosticar_duplicados_remuneraciones.js
   ```

## ✅ Checklist de Verificación Final

Después de aplicar todas las correcciones:

- [x] Script de limpieza de duplicados ejecutado (99 eliminados)
- [x] Script de reparación de sucursales ejecutado (29 asignados)
- [ ] 37 empleados asignados manualmente
- [ ] Verificado en Estado de Resultados - Montos correctos
- [ ] Verificado en Remuneraciones - Sin duplicados
- [ ] Validación de duplicados agregada a importación (opcional)

## 📞 Comandos Útiles

### Diagnosticar Problemas
```bash
cd backend

# Ver empleados sin sucursal
node scripts/diagnosticar_empleados_completo.js

# Ver duplicados de remuneraciones
node scripts/diagnosticar_duplicados_remuneraciones.js
```

### Solucionar Problemas
```bash
# Asignar sucursales automáticamente
node scripts/reparar_empleados_sucursales.js

# Eliminar duplicados de remuneraciones
node scripts/eliminar_duplicados_remuneraciones.js
```

---

**Fecha de solución:** Diciembre 2024
**Archivos modificados:**
- `backend/controllers/remuneracionesController.js` (corregido bug de sucursales)
- `backend/scripts/diagnosticar_duplicados_remuneraciones.js` (nuevo)
- `backend/scripts/eliminar_duplicados_remuneraciones.js` (nuevo)
- `backend/scripts/diagnosticar_empleados_completo.js` (actualizado)
- `backend/scripts/reparar_empleados_sucursales.js` (nuevo)
