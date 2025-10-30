# Solución: Módulos no se guardan en Perfiles

## 🔴 **Problema Detectado**

Cuando intentas asignar 8 módulos a un perfil, solo se guardan 2 (Compras y Ventas).

**Causa**: Los otros 6 módulos **NO EXISTEN** en la tabla `modulos` de tu base de datos.

## ✅ **Solución Rápida (3 pasos)**

### **Paso 1: Ejecutar Script SQL**

Abre SQL Server Management Studio y ejecuta este script:

```
backend/scripts/insertar_todos_los_modulos.sql
```

Este script:
- ✅ Inserta los 21 módulos del sistema
- ✅ No duplica módulos existentes
- ✅ Funciona con o sin IDENTITY

**Resultado esperado:**
```
✅ Dashboard
✅ Estado Resultado
✅ Monitoreo
✅ Remuneraciones
✅ Inventario
✅ Ventas
✅ Productos
✅ Supermercados
✅ Ferreterías
✅ Multitiendas
✅ Compras
✅ Centros de Costos
✅ Facturas XML
✅ Tarjeta Empleado
✅ Empleados
✅ Cabañas
✅ Usuarios
✅ Perfiles
✅ Módulos
✅ Configuración
✅ Correo Electrónico

Total de módulos: 21
```

### **Paso 2: Reiniciar el Backend**

```bash
cd backend
npm start
```

Verás en la consola:
```
🔄 === SINCRONIZANDO MÓDULOS DEL SISTEMA ===
✅ Sincronización completada: 0 módulos nuevos, 21 módulos totales
```

### **Paso 3: Probar en la Intranet**

1. Ve a `/perfiles`
2. Crea o edita un perfil
3. Selecciona los módulos que quieras
4. Guarda

Ahora verás en los logs del backend:
```
🔄 === CREANDO PERFIL ===
📝 Nombre: Mi Perfil Test
📝 Módulos: ["Dashboard","Ventas","Productos","Compras","Empleados","Usuarios","Perfiles","Módulos"]
🔄 Asignando 8 módulos...
📊 Módulos disponibles en BD (21): [...]
🔍 Buscando módulo: "Dashboard"
✅ Módulo encontrado: ID=1, Nombre="Dashboard"
✅ Módulo "Dashboard" asignado correctamente
... (8 módulos)
✅ === PERFIL CREADO EXITOSAMENTE ===
📊 Resultado: { id: X, nombre: 'Mi Perfil Test', modulos: [8 módulos] }
```

## 🔍 **Verificar que Funcionó**

### Opción 1: Ver en el Frontend

1. Ve a `/perfiles`
2. Edita el perfil que creaste
3. Deberías ver todos los 8 módulos seleccionados

### Opción 2: Ejecutar Script de Diagnóstico

```
backend/scripts/diagnostico_perfiles_modulos.sql
```

Esto te mostrará:
- Total de módulos en BD
- Módulos asignados a cada perfil
- Si hay problemas

## 📋 **Lista Completa de Módulos**

Los 21 módulos que se insertarán:

1. **Dashboard** - Panel principal
2. **Estado Resultado** - Estados financieros
3. **Monitoreo** - Monitoreo de sucursales
4. **Remuneraciones** - Nóminas y pagos
5. **Inventario** - Sistema de inventarios
6. **Ventas** - Gestión de ventas
7. **Productos** - Catálogo de productos
8. **Supermercados** - Productos supermercados
9. **Ferreterías** - Productos ferreterías
10. **Multitiendas** - Productos multitiendas
11. **Compras** - Gestión de compras
12. **Centros de Costos** - Centros de costos
13. **Facturas XML** - Facturas XML
14. **Tarjeta Empleado** - Tarjetas de empleado
15. **Empleados** - Recursos humanos
16. **Cabañas** - Gestión de cabañas
17. **Usuarios** - Gestión de usuarios
18. **Perfiles** - Gestión de perfiles
19. **Módulos** - Gestión de módulos
20. **Configuración** - Configuración del sistema
21. **Correo Electrónico** - Sistema de correo

## 🚨 **Si Aún No Funciona**

### Problema 1: Tabla modulos no tiene IDENTITY

**Síntoma**: Los módulos se insertan pero con IDs duplicados

**Solución**: Ejecuta este script:
```
backend/scripts/setup_modulos_identity.sql
```

Luego ejecuta de nuevo:
```
backend/scripts/insertar_todos_los_modulos.sql
```

### Problema 2: Nombres no coinciden

**Síntoma**: En los logs del backend ves:
```
⚠️ Módulo "Algo" NO ENCONTRADO en la tabla modulos
```

**Solución**: Los nombres en el frontend deben coincidir EXACTAMENTE con los de la BD.

Ejecuta el diagnóstico:
```
backend/scripts/diagnostico_perfiles_modulos.sql
```

Y revisa la sección "2. MÓDULOS DISPONIBLES".

### Problema 3: Frontend envía nombres incorrectos

**Solución**: Revisa `frontend/src/pages/PerfilPage.jsx`

Asegúrate de que los nombres de módulos que se obtienen de `/api/modulos` coincidan exactamente.

## 🎯 **Próximos Pasos**

Una vez que funcione:

1. **Crea perfiles personalizados** para diferentes roles
2. **Asigna perfiles a usuarios** mediante `/usuarios`
3. **Verifica permisos** entrando con diferentes usuarios

## 📞 **Si Necesitas Ayuda**

1. Ejecuta el diagnóstico:
   ```
   backend/scripts/diagnostico_perfiles_modulos.sql
   ```

2. Copia los resultados de:
   - Sección 2: MÓDULOS DISPONIBLES
   - Sección 5: RESUMEN: MÓDULOS POR PERFIL

3. Copia los logs del backend cuando intentas crear un perfil

4. Comparte esa información para ayudarte mejor

---

## ✅ **Resumen Ejecutivo**

```bash
# 1. Ejecutar en SQL Server
backend/scripts/insertar_todos_los_modulos.sql

# 2. Reiniciar backend
cd backend
npm start

# 3. Probar en la intranet
# Ve a /perfiles y crea un perfil con 8 módulos

# ¡Listo! 🎉
```

---

**Notas importantes:**
- El script `insertar_todos_los_modulos.sql` es **seguro** - no duplica módulos existentes
- La sincronización automática del backend solo inserta módulos que NO existen
- Los logs detallados te dirán exactamente qué módulos se encontraron y cuáles no
