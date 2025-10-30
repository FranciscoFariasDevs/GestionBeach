# Sistema de Permisos, Usuarios y Módulos

## 🎯 Resumen

El sistema de permisos ahora está completamente funcional con **sincronización automática de módulos**. Cada vez que inicies el backend, los módulos se sincronizarán automáticamente con la base de datos.

## ✅ Cambios Realizados

### 1. **Errores Corregidos**
- ✅ Error de sintaxis en `modulosController.js` (línea 409)
- ✅ Error de cierre de función en `sincronizarPantallas()` (línea 71)

### 2. **Módulos Sincronizados**
El backend ahora incluye **21 módulos completos**:

**Módulos Principales:**
- Dashboard
- Estado Resultado
- Monitoreo
- Remuneraciones
- Inventario
- Ventas
- Productos
- Compras
- Tarjeta Empleado
- Empleados
- **Cabañas** ⭐ (NUEVO)
- Usuarios
- Perfiles
- Módulos
- Configuración
- Correo Electrónico

**Submódulos (Productos):**
- Supermercados
- Ferreterías
- Multitiendas

**Submódulos (Compras):**
- Centros de Costos
- Facturas XML

### 3. **Sincronización Automática**

#### 🔄 Al Iniciar el Servidor
El servidor ahora sincroniza automáticamente todos los módulos cuando inicia:

```
🔄 === SINCRONIZANDO MÓDULOS DEL SISTEMA ===
  ✅ Módulo "Dashboard" sincronizado
  ✅ Módulo "Cabañas" sincronizado
  ✅ Módulo "Supermercados" sincronizado
  ...
✅ Sincronización completada: 6 módulos nuevos, 21 módulos totales
```

#### 🔄 Sincronización Manual
También puedes sincronizar manualmente mediante:

**POST** `http://localhost:5000/api/perfiles/sincronizar-modulos`

Respuesta:
```json
{
  "success": true,
  "message": "Módulos sincronizados correctamente",
  "totalModulos": 21,
  "modulosSistema": 21
}
```

## 📋 Requisitos Previos

### 1. **Configurar IDENTITY en la tabla modulos**

⚠️ **IMPORTANTE**: La tabla `modulos` debe tener IDENTITY configurado en el campo `id`.

**Verifica si necesitas ejecutar el script:**
```sql
SELECT COLUMNPROPERTY(OBJECT_ID('modulos'), 'id', 'IsIdentity') as IsIdentity
-- Si retorna 1: ✅ Ya está configurado
-- Si retorna 0: ❌ Ejecuta el script
```

**Ejecuta el script de configuración:**
```bash
# Ubicación: backend/scripts/setup_modulos_identity.sql
```

El script:
1. Verifica si IDENTITY ya está configurado
2. Crea una tabla temporal con IDENTITY
3. Migra los datos existentes
4. Preserva las relaciones perfil_modulo
5. Reemplaza la tabla original

## 🚀 Cómo Usar el Sistema

### 1. **Iniciar el Backend**

```bash
cd backend
npm start
```

Verás en la consola:
```
✅ Conexión a base de datos exitosa

🔄 === SINCRONIZANDO MÓDULOS DEL SISTEMA ===
  ✅ Módulo "Cabañas" sincronizado
  ✅ Módulo "Supermercados" sincronizado
✅ Sincronización completada: 3 módulos nuevos, 21 módulos totales
===========================================

🚀 ===== SERVIDOR INICIADO =====
```

### 2. **Crear un Perfil con Módulos**

#### Desde la UI (Frontend):

1. Ve a **Perfiles** en el menú lateral
2. Haz clic en **Crear Perfil**
3. Ingresa el nombre del perfil (ej: "Gerente de Ventas")
4. Selecciona los módulos que quieres asignar:
   - Dashboard ✅
   - Ventas ✅
   - Productos ✅
   - Cabañas ✅
   - etc.
5. Guarda el perfil

#### Mediante API (Backend):

**POST** `http://localhost:5000/api/perfiles`

```json
{
  "nombre": "Gerente de Ventas",
  "modulos": [
    "Dashboard",
    "Ventas",
    "Productos",
    "Supermercados",
    "Ferreterías",
    "Cabañas"
  ]
}
```

### 3. **Asignar Perfil a un Usuario**

#### Opción 1: Al crear el usuario

**POST** `http://localhost:5000/api/usuarios`

```json
{
  "username": "pancho",
  "password": "mipassword",
  "perfil_id": 11
}
```

#### Opción 2: Actualizar usuario existente

**PUT** `http://localhost:5000/api/usuarios/:id`

```json
{
  "perfil_id": 11
}
```

### 4. **Ver Perfiles Disponibles**

**GET** `http://localhost:5000/api/perfiles`

Respuesta:
```json
[
  {
    "id": 10,
    "nombre": "Super Admin"
  },
  {
    "id": 11,
    "nombre": "Gerencia"
  },
  {
    "id": 12,
    "nombre": "Finanzas"
  }
]
```

### 5. **Ver Módulos de un Perfil**

**GET** `http://localhost:5000/api/perfiles/:id`

Respuesta:
```json
{
  "id": 11,
  "nombre": "Gerencia",
  "modulos": [
    "Dashboard",
    "Estado Resultado",
    "Ventas",
    "Productos",
    "Cabañas"
  ],
  "moduloIds": [1, 2, 6, 7, 16]
}
```

## 🔧 Perfiles Predefinidos

| ID | Nombre | Descripción | Módulos Principales |
|----|--------|-------------|---------------------|
| 10 | Super Admin | Acceso total | Todos los módulos |
| 11 | Gerencia | Gestión completa excepto config crítica | Dashboard, Ventas, Productos, Cabañas, etc. |
| 12 | Finanzas | Módulos financieros | Dashboard, Estado Resultado, Remuneraciones, Cabañas |
| 13 | Recursos Humanos | Gestión de personal | Dashboard, Empleados, Remuneraciones, Tarjeta Empleado, Cabañas |
| 14 | Jefe de Local | Operaciones diarias | Dashboard, Ventas, Inventario, Productos, Cabañas |
| 15 | Solo Lectura | Solo consulta | Dashboard, Cabañas (solo lectura) |
| 16 | Administrador | Igual a Super Admin | Todos los módulos |

## 🆕 Agregar Nuevos Módulos

### Paso 1: Agregar al Frontend

Edita `frontend/src/layouts/DashboardLayout.jsx`:

```javascript
const allMenuItems = [
  // ... módulos existentes ...
  {
    text: 'Mi Nuevo Módulo',
    icon: <NuevoIcon />,
    path: '/mi-nuevo-modulo',
    orangeType: 'light'
  }
];
```

### Paso 2: Agregar al Backend

Edita `backend/controllers/perfilesController.js`:

```javascript
const modulosDelSistema = [
  'Dashboard',
  'Estado Resultado',
  // ... módulos existentes ...
  'Mi Nuevo Módulo'  // ⬅️ AGREGAR AQUÍ
];
```

Edita `backend/controllers/modulosController.js`:

```javascript
const pantallasDashboard = [
  // ... módulos existentes ...
  {
    id: 22,
    nombre: 'Mi Nuevo Módulo',
    descripcion: 'Descripción del módulo',
    ruta: '/mi-nuevo-modulo',
    icono: 'nuevo_icono'
  }
];
```

### Paso 3: Agregar al Sistema de Permisos

Edita `frontend/src/config/permissions.js`:

```javascript
export const MODULES = {
  // ... módulos existentes ...
  MI_NUEVO_MODULO: 'mi-nuevo-modulo'  // ⬅️ AGREGAR AQUÍ
};
```

### Paso 4: Reiniciar el Backend

```bash
npm restart
```

¡El módulo se sincronizará automáticamente! 🎉

## 🐛 Debug y Diagnóstico

### Verificar Estado del Sistema

**GET** `http://localhost:5000/api/perfiles/debug`

Respuesta completa con:
- Conexión a BD
- Perfiles existentes
- Módulos existentes
- Relaciones perfil_modulo
- Estructura de tablas

### Logs del Sistema

Revisa la consola del backend para ver:
```
🔍 === DEBUG PERFILES SOLICITADO ===
📋 Tablas encontradas: ['perfiles', 'modulos', 'perfil_modulo', 'usuarios']
🔑 Tabla modulos tiene IDENTITY: true
✅ 21 módulos disponibles para perfiles
```

## ⚠️ Problemas Comunes

### 1. "La tabla modulos NO tiene IDENTITY"

**Solución**: Ejecuta `backend/scripts/setup_modulos_identity.sql`

### 2. "No se pueden sincronizar módulos"

**Causas posibles**:
- Tabla modulos no existe
- IDENTITY no configurado
- Error de conexión a BD

**Solución**: Verifica la conexión y ejecuta el script de setup

### 3. "Los módulos no aparecen en el selector"

**Solución**: Llama al endpoint de sincronización manual:

```bash
curl -X POST http://localhost:5000/api/perfiles/sincronizar-modulos
```

### 4. "Usuario no ve los módulos asignados"

**Verificar**:
1. El usuario tiene `perfil_id` asignado
2. El perfil tiene módulos asociados
3. Los módulos existen en la tabla `modulos`
4. El frontend está actualizando los permisos correctamente

## 📊 Estructura de Base de Datos

```sql
-- Tabla de módulos
CREATE TABLE modulos (
  id INT IDENTITY(1,1) PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion VARCHAR(500),
  ruta VARCHAR(200),
  icono VARCHAR(50),
  activo BIT DEFAULT 1,
  fecha_creacion DATETIME DEFAULT GETDATE()
);

-- Tabla de perfiles
CREATE TABLE perfiles (
  id INT IDENTITY(1,1) PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion VARCHAR(500),
  activo BIT DEFAULT 1,
  fecha_creacion DATETIME DEFAULT GETDATE()
);

-- Relación perfil-módulo
CREATE TABLE perfil_modulo (
  perfil_id INT NOT NULL,
  modulo_id INT NOT NULL,
  PRIMARY KEY (perfil_id, modulo_id),
  FOREIGN KEY (perfil_id) REFERENCES perfiles(id),
  FOREIGN KEY (modulo_id) REFERENCES modulos(id)
);

-- Usuarios con perfil
ALTER TABLE usuarios
ADD perfil_id INT NULL,
FOREIGN KEY (perfil_id) REFERENCES perfiles(id);
```

## 🎉 ¡Listo!

Tu sistema de permisos ahora:
- ✅ Sincroniza módulos automáticamente
- ✅ Incluye todos los módulos del frontend (incluyendo Cabañas)
- ✅ Permite crear perfiles personalizados
- ✅ Asigna perfiles a usuarios
- ✅ Filtra el menú según permisos
- ✅ Es fácil de mantener y extender

---

**Contacto**: Si tienes problemas, revisa los logs del backend y usa el endpoint `/api/perfiles/debug` para diagnosticar.
