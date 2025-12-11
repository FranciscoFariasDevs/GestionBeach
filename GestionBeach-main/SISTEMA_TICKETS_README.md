# 🎫 Sistema de Tickets - Documentación

## 📋 Descripción General

Sistema completo de gestión de tickets de soporte técnico con las siguientes características:

### ✨ Características Principales

- **Reportar Problema (Público)**: Cualquier persona puede reportar un problema sin necesidad de autenticación
- **Mis Tickets (Privado)**: Los usuarios autenticados pueden ver y gestionar sus tickets
- **Panel de Administración**: SuperAdmin puede ver todos los tickets, asignar, cambiar estados
- **Notificaciones**: Sistema de notificaciones para usuarios y administradores
- **Historial**: Registro completo de todos los cambios en cada ticket
- **Categorías**: Clasificación de tickets por tipo de problema
- **Prioridades**: Sistema de SLA basado en prioridad (crítica, alta, media, baja)
- **Estados**: Activo, En Proceso, Resuelto, Cancelado, Vencido

---

## 🚀 Instalación

### 1. Base de Datos

Ejecuta el script SQL para crear todas las tablas necesarias:

```bash
mysql -u root -p nombre_base_datos < backend/scripts/create_sistema_tickets.sql
```

O desde MySQL Workbench/phpMyAdmin:
- Abre el archivo `backend/scripts/create_sistema_tickets.sql`
- Ejecuta todo el script

### 2. Backend - Configurar Rutas

Edita `backend/server.js` y agrega las rutas de tickets:

```javascript
// Importar rutas de tickets
const ticketsRoutes = require('./routes/tickets');

// Registrar rutas (después de las otras rutas)
app.use('/api/tickets', ticketsRoutes);
```

### 3. Frontend - Configurar Rutas

Edita `frontend/src/App.jsx` y agrega las nuevas rutas:

```javascript
// Importar páginas
import ReportarProblemaPage from './pages/ReportarProblemaPage';
import MisTicketsPage from './pages/MisTicketsPage';

// Dentro del Router, agregar las rutas:

// RUTA PÚBLICA (no requiere autenticación)
<Route path="/reportar-problema" element={<ReportarProblemaPage />} />

// RUTA PRIVADA (requiere autenticación y perfil SuperAdmin)
<Route
  path="/mis-tickets"
  element={
    <RutaPrivada perfilesPermitidos={['SuperAdmin', 'Administrador', 'Soporte Técnico']}>
      <MisTicketsPage />
    </RutaPrivada>
  }
/>
```

### 4. Agregar Enlace en el Menú

Para agregar "Reportar Problema" en el navbar o footer público:

```javascript
<Link to="/reportar-problema">
  <Button>Reportar Problema</Button>
</Link>
```

Para agregar "Mis Tickets" en el menú de administración:

```javascript
// En el sidebar o menú de admin
<Link to="/mis-tickets">
  <ListItem button>
    <ListItemIcon><AssignmentIcon /></ListItemIcon>
    <ListItemText primary="Mis Tickets" />
  </ListItem>
</Link>
```

---

## 📊 Estructura de la Base de Datos

### Tabla Principal: `tickets`

- **Información básica**: número_ticket, asunto, mensaje
- **Usuario reportante**: usuario_id, nombre, email, teléfono, sucursal, departamento
- **Estado y prioridad**: estado (activo/en_proceso/resuelto/cancelado/vencido), prioridad (baja/media/alta/critica)
- **Asignación**: asignado_a (ID del técnico/admin)
- **Tiempos**: fecha_creacion, fecha_vencimiento, fecha_resolucion, tiempo_respuesta, tiempo_resolucion

### Tablas Relacionadas

- `ticket_respuestas`: Respuestas y comentarios en cada ticket
- `ticket_historial`: Registro de todos los cambios
- `ticket_categorias`: Categorías predefinidas de problemas
- `ticket_notificaciones`: Notificaciones para usuarios
- `ticket_plantillas_respuesta`: Respuestas rápidas predefinidas

---

## 🎨 Diseño y UX

### Página "Reportar Problema" (Público)

- **Diseño**: Gradiente morado atractivo, formulario grande y claro
- **Campos**: Categoría, Prioridad, Asunto, Mensaje, Datos de contacto
- **Experiencia**: Confirmación visual al crear ticket con número de tracking
- **Responsive**: Optimizado para móvil y desktop

### Página "Mis Tickets" (Privado)

- **Dashboard**: Estadísticas en cards de colores
- **Tabs**: Filtros por estado (Todos, Activos, Resueltos, Cancelados, Vencidos)
- **Lista**: Tickets con información visual (colores por estado, chips de prioridad)
- **Detalle**: Modal con historial completo y formulario de respuesta
- **Responsive**: Adaptado a todos los tamaños de pantalla

---

## 🔐 Permisos y Roles

### Usuario Normal (Cualquier perfil autenticado)
- Puede crear tickets
- Puede ver sus propios tickets
- Puede responder a sus tickets
- NO puede ver tickets de otros usuarios

### SuperAdmin / Administrador / Soporte Técnico
- Puede ver TODOS los tickets
- Puede asignar tickets a técnicos
- Puede cambiar el estado de tickets
- Puede ver respuestas internas
- Puede agregar notas internas (no visibles para el usuario)
- Acceso a estadísticas completas

### Usuario No Autenticado (Público)
- Solo puede reportar problemas
- NO puede ver tickets existentes

---

## 📧 Notificaciones

El sistema incluye notificaciones automáticas:

1. **Al crear un ticket**: Se notifica a todos los SuperAdmin/Administrador/Soporte Técnico
2. **Al responder**: Se notifica al usuario que creó el ticket
3. **Al asignar**: Se notifica al técnico asignado
4. **Al cambiar estado**: Se registra en el historial

---

## 🔔 SLA (Service Level Agreement)

Tiempos de respuesta según prioridad:

- **Crítica**: 1 hora
- **Alta**: 4 horas
- **Media**: 24 horas
- **Baja**: 72 horas

Los tickets que superan su fecha de vencimiento se marcan automáticamente como "Vencidos" mediante un evento programado que se ejecuta cada hora.

---

## 🛠️ API Endpoints

### Públicos (no requieren autenticación)

```
POST /api/tickets/crear
- Crea un nuevo ticket
- Body: { asunto, mensaje, nombre_reportante, email_reportante, telefono_reportante?, departamento?, prioridad, categoria? }

GET /api/tickets/categorias
- Obtiene todas las categorías disponibles
```

### Privados (requieren autenticación)

```
GET /api/tickets/mis-tickets
- Obtiene los tickets del usuario autenticado
- Query params: estado?, limite?, pagina?

GET /api/tickets/:id
- Obtiene el detalle de un ticket
- Solo el dueño o admins pueden ver

POST /api/tickets/:id/responder
- Agrega una respuesta a un ticket
- Body: { mensaje, es_interno? }
```

### Admin (requieren perfil SuperAdmin/Administrador/Soporte)

```
GET /api/tickets/admin/todos
- Obtiene todos los tickets del sistema
- Query params: estado?, prioridad?, categoria?, busqueda?, limite?, pagina?

PUT /api/tickets/:id/estado
- Cambia el estado de un ticket
- Body: { estado, comentario? }

PUT /api/tickets/:id/asignar
- Asigna un ticket a un técnico
- Body: { asignado_a }

GET /api/tickets/admin/estadisticas
- Obtiene estadísticas completas
```

---

## 🎯 Próximos Pasos Sugeridos

1. **Agregar carga de archivos**: Permitir adjuntar imágenes/documentos a los tickets
2. **Integrar email**: Enviar notificaciones por email usando el servicio emailService.js
3. **Chat en tiempo real**: Implementar WebSockets para respuestas en tiempo real
4. **Reportes**: Dashboard con gráficos de rendimiento y métricas
5. **SLA avanzado**: Alertas cuando un ticket está por vencer
6. **Búsqueda avanzada**: Filtros más complejos y búsqueda full-text
7. **Plantillas de respuesta**: UI para gestionar plantillas rápidas
8. **Base de conocimiento**: Artículos de ayuda vinculados a categorías

---

## 🐛 Troubleshooting

### Error: "Cannot find module './routes/tickets'"
**Solución**: Verifica que el archivo `backend/routes/tickets.js` exista y esté en la ruta correcta.

### Error: "Table 'tickets' doesn't exist"
**Solución**: Ejecuta el script SQL `create_sistema_tickets.sql` en tu base de datos.

### No aparecen las rutas en el frontend
**Solución**: Verifica que hayas importado los componentes en App.jsx y agregado las rutas correctamente.

### Error de permisos al acceder a "Mis Tickets"
**Solución**: Asegúrate de que el usuario tenga el perfil 'SuperAdmin', 'Administrador' o 'Soporte Técnico'.

### Las categorías no se muestran
**Solución**: Verifica que se hayan insertado las categorías predefinidas ejecutando la parte de INSERT del script SQL.

---

## 📞 Soporte

Para problemas técnicos con el sistema de tickets:
- Reporta un problema usando el mismo sistema 😄
- O contacta al equipo de desarrollo

---

## 🎨 Personalización

### Cambiar colores de estados

Edita las funciones `obtenerColorEstado()` y `obtenerColorPrioridad()` en:
- `frontend/src/pages/MisTicketsPage.jsx`

### Agregar más categorías

Inserta nuevas categorías en la tabla `ticket_categorias`:

```sql
INSERT INTO ticket_categorias (nombre, descripcion, color, icono, sla_horas, orden)
VALUES ('Nueva Categoría', 'Descripción', '#FF5722', 'IconName', 12, 7);
```

### Modificar tiempos de SLA

Edita la tabla `ticket_categorias` y modifica la columna `sla_horas` según tus necesidades.

---

¡Sistema de Tickets listo para usar! 🎉
