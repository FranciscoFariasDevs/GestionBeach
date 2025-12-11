============================================
SISTEMA DE TICKETS - INSTALACIÓN
============================================

CAMBIOS REALIZADOS:
==================

1. FRONTEND:
   - ✅ Creada página pública "Reportar Problema" (/reportar-problema)
   - ✅ Creada página privada "Mis Tickets" (/mis-tickets)
   - ✅ Agregado botón flotante en HomePage para acceso público
   - ✅ Agregado enlace en footer de HomePage
   - ✅ Agregado "Mis Tickets" al menú del dashboard (solo para admins)
   - ✅ Configurado sistema de permisos CASL

2. BACKEND:
   - ✅ Creado ticketController.js (compatible con SQL Server)
   - ✅ Creada ruta /api/tickets con endpoints públicos y privados
   - ✅ Registrada ruta en server.js
   - ✅ Implementado servicio de emails (emailService.js)

3. BASE DE DATOS:
   - ✅ Script SQL Server listo: tickets_sin_foreign_keys.sql
   - ⚠️ IMPORTANTE: NO elimina tablas existentes, solo crea las nuevas

INSTRUCCIONES DE INSTALACIÓN:
==============================

PASO 1: EJECUTAR SCRIPT SQL
----------------------------
1. Abrir SQL Server Management Studio (SSMS)
2. Conectarse a la base de datos "gestionbeach"
3. Abrir el archivo: backend/scripts/tickets_sin_foreign_keys.sql
4. Ejecutar el script completo (F5)
5. Verificar que no haya errores en los mensajes

El script creará las siguientes tablas:
   - tickets
   - ticket_respuestas
   - ticket_historial
   - ticket_categorias
   - ticket_notificaciones
   - ticket_plantillas_respuesta

Y también creará:
   - 2 vistas (vista_estadisticas_tickets, vista_tickets_por_usuario)
   - 2 procedimientos (generar_numero_ticket, marcar_tickets_vencidos)
   - 1 trigger (trg_tickets_update)

PASO 2: REINICIAR BACKEND (si está corriendo)
----------------------------------------------
1. Detener el servidor backend (Ctrl+C)
2. Reiniciar: node server.js
3. Verificar que no haya errores al iniciar

PASO 3: PROBAR EL SISTEMA
--------------------------
A) Acceso Público (sin login):
   1. Ir a http://localhost:3000 (HomePage)
   2. Ver el botón morado flotante en la esquina inferior derecha
   3. Hacer clic en el botón o en "Reportar Problema" del footer
   4. Llenar el formulario y enviar un ticket
   5. Verificar que se muestra el número de ticket

B) Acceso Admin (con login):
   1. Iniciar sesión como SuperAdmin o Administrador
   2. En el menú lateral, buscar "Mis Tickets"
   3. Ver todos los tickets reportados
   4. Abrir un ticket y ver detalles
   5. Responder al ticket

CARACTERÍSTICAS DEL SISTEMA:
=============================

PÁGINA PÚBLICA "Reportar Problema":
- Accesible sin login
- Formulario con:
  * Categoría (Técnico, Permisos, Bug, Consulta, Mejora, Urgente)
  * Prioridad (Baja, Media, Alta, Crítica)
  * Asunto
  * Mensaje
  * Nombre, Email, Teléfono
  * Sucursal y Departamento (opcionales)
- Genera número de ticket automático
- Pantalla de confirmación con número de ticket

PÁGINA PRIVADA "Mis Tickets" (Admin):
- Solo accesible para SuperAdmin y Administrador
- Dashboard con estadísticas:
  * Total de tickets
  * Tickets activos
  * En proceso
  * Resueltos
  * Cancelados
  * Vencidos
  * Críticos
  * Alta prioridad
- Filtros por estado (tabs)
- Lista de todos los tickets con:
  * Número de ticket
  * Asunto
  * Estado con badge de color
  * Prioridad
  * Reportado por
  * Fecha
- Modal para ver detalles completos
- Posibilidad de responder tickets

ESTADOS DE TICKETS:
- activo: Recién creado
- en_proceso: En atención
- resuelto: Solucionado
- cancelado: Cancelado
- vencido: Pasó el tiempo de respuesta

PRIORIDADES:
- baja (verde)
- media (amarillo)
- alta (naranja)
- critica (rojo)

RUTAS API CREADAS:
==================

Públicas:
- POST /api/tickets/crear - Crear nuevo ticket
- GET /api/tickets/categorias - Obtener categorías

Privadas (requieren login):
- GET /api/tickets/mis-tickets - Obtener tickets del usuario
- GET /api/tickets/:id - Obtener detalles de un ticket
- POST /api/tickets/:id/responder - Responder un ticket

Admin (requieren permisos):
- GET /api/tickets/admin/todos - Obtener todos los tickets
- PUT /api/tickets/:id/estado - Cambiar estado de ticket
- PUT /api/tickets/:id/asignar - Asignar ticket a usuario
- GET /api/tickets/admin/estadisticas - Estadísticas generales

NOTAS IMPORTANTES:
==================

1. El botón flotante es visible para TODOS los usuarios en la HomePage
2. La tabla "tickets" NO tiene foreign keys a usuarios/sucursales para evitar conflictos
3. Las relaciones son solo lógicas, no hay restricciones de integridad
4. Los tickets se pueden crear sin que el usuario esté registrado
5. El sistema guarda nombre, email y teléfono del reportante aunque no tenga usuario

SOLUCIÓN DE PROBLEMAS:
======================

Si hay error "error al cargar tickets":
1. Verificar que el script SQL se ejecutó correctamente
2. Verificar que las tablas se crearon
3. Revisar la consola del backend por errores
4. Verificar la conexión a SQL Server

Si el botón no aparece en HomePage:
1. Limpiar caché del navegador
2. Recargar la página con Ctrl+F5
3. Verificar que el frontend se reinició

Si no se puede enviar tickets:
1. Verificar que el backend está corriendo
2. Revisar la consola del navegador (F12)
3. Verificar que las rutas están registradas

============================================
FIN DEL DOCUMENTO
============================================
