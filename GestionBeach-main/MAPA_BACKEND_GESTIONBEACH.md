# 🗺️ MAPA COMPLETO DEL BACKEND - GestionBeach

## 📁 ESTRUCTURA DE CARPETAS

```
backend/
│
├── 🚀 server.js                    # PUNTO DE ENTRADA (Puerto 5000)
│
├── 📦 config/                      # CONFIGURACIÓN
│   ├── db.js                       # DB Principal: GestionBeach
│   └── dbp.js                      # DB Secundaria: ERIZ
│
├── 🎯 controllers/                 # LÓGICA DE NEGOCIO (29 controladores)
│   ├── authController.js           # Login/Logout/JWT
│   ├── empleadosController.js      # Gestión de empleados
│   ├── remuneracionesController.js # Importación de Excel, cálculos
│   ├── estadoResultadosController.js # Estados financieros
│   ├── dashboardController.js      # Agregación de ventas multi-sucursal
│   ├── ticketController.js         # Sistema de soporte
│   ├── cabanasController.js        # Reservas de cabañas
│   ├── webpayController.js         # Pagos online
│   ├── concursoPiscinasController.js # Concursos
│   └── ... (20 más)
│
├── 🛣️  routes/                     # RUTAS API (25 archivos)
│   ├── authRoutes.js               # /api/auth
│   ├── tickets.js                  # /api/tickets
│   ├── remuneracionesRoutes.js     # /api/remuneraciones
│   └── ... (22 más)
│
├── 🛡️  middleware/                 # SEGURIDAD
│   ├── authMiddleware.js           # Validación JWT
│   └── cors.js                     # Configuración CORS
│
├── 🔧 services/                    # SERVICIOS EXTERNOS
│   ├── pdfService.js               # Generación de PDFs
│   └── whatsappService.js          # Twilio WhatsApp
│
├── 🤖 jobs/                        # TAREAS PROGRAMADAS
│   └── limpiarReservasPendientes.js # Limpieza automática
│
├── 📊 scripts/                     # UTILIDADES (25 scripts)
│   ├── Diagnóstico/
│   │   ├── diagnosticar_empleados_completo.js
│   │   ├── diagnosticar_duplicados_remuneraciones.js
│   │   └── reporte_final_completo.js
│   │
│   ├── Reparación/
│   │   ├── asignar_sucursales_inteligente.js
│   │   ├── asignar_por_razon_social.js
│   │   └── eliminar_duplicados_remuneraciones.js
│   │
│   └── Setup/
│       ├── crear_tabla_pendientes.js
│       └── crear_precios_temporada_cabanas.js
│
├── 📤 uploads/                     # ARCHIVOS SUBIDOS
│   ├── perfiles/                   # Fotos de empleados
│   └── concurso-piscinas/          # Fotos de concursos
│
└── 📄 public/reports/              # PDFs generados

```

---

## 🔄 ARQUITECTURA DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENTE (Frontend React)                     │
│                    http://192.168.100.150:3000                   │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP Requests
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXPRESS SERVER (server.js)                    │
│                         Puerto 5000                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  CORS Middleware + authMiddleware (JWT)                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │   RUTAS      │  │  SERVICIOS   │  │    JOBS      │
    │ (25 archivos)│  │   EXTERNOS   │  │  Automáticos │
    └──────┬───────┘  └──────────────┘  └──────────────┘
           │
           ▼
    ┌──────────────┐
    │ CONTROLADORES│
    │ (29 archivos)│
    └──────┬───────┘
           │
           ▼
    ┌─────────────────────────────────┐
    │   BASES DE DATOS SQL SERVER     │
    │                                  │
    │  • GestionBeach (Principal)     │
    │  • ERIZ (Productos)              │
    │  • DBs por Sucursal (Ventas)     │
    └──────────────────────────────────┘
```

---

## 🎯 MAPA DE CONTROLADORES POR MÓDULO

### 1️⃣ AUTENTICACIÓN Y USUARIOS
```
authController.js
├── POST /api/auth/login
│   └── Genera JWT token
│   └── Carga permisos de perfil + individuales
├── GET /api/auth/check
│   └── Valida sesión activa
└── POST /api/auth/logout

usuariosController.js
├── GET /api/usuarios
├── POST /api/usuarios          (Crear usuario)
├── PUT /api/usuarios/:id       (Actualizar usuario)
└── DELETE /api/usuarios/:id
```

### 2️⃣ RECURSOS HUMANOS (HR)
```
empleadosController.js (17 endpoints)
├── GET /api/empleados
│   └── Lista con filtros + paginación
├── POST /api/empleados
│   └── Crear con validación de RUT
├── PUT /api/empleados/:id
│   └── Actualizar + asignar sucursales
├── GET /api/empleados/:id/sucursales
│   └── Ver asignaciones multi-sucursal
├── POST /api/empleados/razon-social-masiva
│   └── Actualización masiva
├── GET /api/empleados/mi-perfil
├── PUT /api/empleados/mi-perfil
└── POST /api/empleados/upload-foto

remuneracionesController.js (15+ endpoints)
├── GET /api/remuneraciones/periodos
├── POST /api/remuneraciones/crear-periodo
├── POST /api/remuneraciones/validar-excel
│   └── Auto-detecta columnas
│   └── Soporte Unicode (ñ, tildes)
├── POST /api/remuneraciones/procesar-excel
│   └── Crea empleados automáticamente
│   └── Calcula costos con porcentajes
├── GET /api/remuneraciones/porcentajes/:periodo/:razon
└── POST /api/remuneraciones/porcentajes
```

### 3️⃣ FINANZAS
```
dashboardController.js
└── POST /api/dashboard/data
    ├── Agrega ventas de todas las sucursales
    ├── Conecta dinámicamente a DBs por sucursal
    ├── Calcula: Ventas, Costos, Utilidad, Margen
    └── Soporta: SUPER, FERRE, MULTITIENDA

estadoResultadosController.js
├── GET /api/estado-resultados/ventas
├── GET /api/estado-resultados/compras
├── GET /api/estado-resultados/remuneraciones
│   └── Clasifica automáticamente:
│       ├── 1 sucursal → Gastos de Venta
│       └── Múltiples → Gastos Administrativos
├── POST /api/estado-resultados/guardar
└── POST /api/estado-resultados/enviar

ventasController.js
├── POST /api/ventas
│   └── Ventas por sucursal + rango de fechas
└── GET /api/ventas/productos/:folio

centrosCostosController.js
├── GET /api/centros-costos
├── POST /api/centros-costos
└── PUT /api/centros-costos/:id
```

### 4️⃣ INVENTARIO Y PRODUCTOS
```
productoController.js
├── GET /api/productos
├── POST /api/productos
└── PUT /api/productos/:id

inventarioController.js
├── GET /api/inventario/productos-recientes
└── POST /api/inventario/generar-reporte-pdf

losMasVendidosController.js
├── GET /api/losmasvendidos/top
├── GET /api/losmasvendidos/least-sold
├── GET /api/losmasvendidos/high-rotation
├── GET /api/losmasvendidos/category-distribution
└── GET /api/losmasvendidos/trend

facturaXMLController.js
├── GET /api/facturas-xml
└── POST /api/facturas-xml/procesar
```

### 5️⃣ SISTEMA DE CABAÑAS Y RESERVAS
```
cabanasController.js
├── GET /api/cabanas
├── POST /api/cabanas
├── PUT /api/cabanas/:id
├── GET /api/cabanas/disponibilidad
│   └── Verifica disponibilidad por fechas
├── GET /api/cabanas/calendario-disponibilidad
├── GET /api/cabanas/reservas-tinajas
└── PUT /api/cabanas/precios-tinaja

reservasController.js
├── GET /api/cabanas/reservas
├── POST /api/cabanas/reservas
└── PUT /api/cabanas/reservas/:id

webpayController.js (Pagos Online)
├── POST /api/webpay/crear
│   └── Crea transacción en reservas_pendientes
│   └── Expira en 30 minutos
└── GET /api/webpay/confirmar
    └── Mueve a tabla reservas si pago exitoso

codigosDescuentoController.js
├── GET /api/codigos-descuento
├── POST /api/codigos-descuento/validar
└── POST /api/codigos-descuento
```

### 6️⃣ SOPORTE Y TICKETS
```
ticketController.js
├── GET /api/tickets/categorias          [PÚBLICO]
├── POST /api/tickets/crear              [AUTH]
├── GET /api/tickets/mis-tickets         [AUTH]
├── GET /api/tickets/admin/todos         [ADMIN]
├── GET /api/tickets/:id                 [AUTH]
├── POST /api/tickets/:id/responder      [AUTH]
├── PUT /api/tickets/:id/estado          [AUTH]
├── PUT /api/tickets/:id/asignar         [ADMIN]
└── GET /api/tickets/estadisticas        [ADMIN]

Estados: activo, en_proceso, resuelto, cerrado
Prioridades: critica, alta, media, baja
```

### 7️⃣ CONCURSOS Y PROMOCIONES
```
concursoPiscinasController.js
├── POST /api/concurso-piscinas/participar
│   └── Upload de boletas
│   └── OCR con cropping
├── GET /api/concurso-piscinas/participaciones
├── GET /api/concurso-piscinas/estadisticas
├── POST /api/concurso-piscinas/verificar-boleta
├── GET /api/concurso-piscinas/sorteo/participantes
└── PUT /api/concurso-piscinas/ganador/:id
```

### 8️⃣ CONFIGURACIÓN DEL SISTEMA
```
perfilesController.js
├── GET /api/perfiles
├── POST /api/perfiles
├── PUT /api/perfiles/:id
└── POST /api/perfiles/sincronizar-permisos

modulosController.js
├── GET /api/modulos
├── POST /api/modulos
└── PUT /api/modulos/:id

Módulos disponibles:
• Dashboard
• Estado Resultado
• Monitoreo
• Remuneraciones
• Inventario
• Ventas
• Empleados
• Tickets
• Cabañas

sucursalesController.js
├── GET /api/sucursales
├── POST /api/sucursales
└── PUT /api/sucursales/:id

Tipos: SUPERMERCADO, FERRETERIA, MULTITIENDA

razonesSocialesController.js
├── GET /api/razonessociales
└── POST /api/razonessociales

configuracionController.js
├── GET /api/configuracion/temporada
└── PUT /api/configuracion/temporada

monitoreoController.js
└── GET /api/monitoreo/health

mantencionesController.js
├── GET /api/maintenance
└── POST /api/maintenance
```

---

## 🔐 SISTEMA DE AUTENTICACIÓN

```
┌─────────────────────────────────────────────────┐
│        1. Usuario hace login                     │
│           POST /api/auth/login                   │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  2. authController.login()                       │
│     • Verifica credenciales en DB               │
│     • Genera JWT token                          │
│     • Carga permisos de perfil                  │
│     • Carga permisos individuales               │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  3. Frontend guarda token en localStorage       │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  4. Cada request incluye header:                │
│     Authorization: Bearer <token>               │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  5. authMiddleware.js valida token              │
│     • Decodifica JWT                            │
│     • Verifica expiración                       │
│     • Adjunta req.user con datos                │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  6. Controlador accede a req.user.id            │
│     y procesa la petición                       │
└─────────────────────────────────────────────────┘
```

---

## 💰 FLUJO: IMPORTACIÓN DE REMUNERACIONES

```
┌─────────────────────────────────────────────────┐
│  1. Usuario sube archivo Excel                  │
│     POST /api/remuneraciones/validar-excel      │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  2. validarExcel()                              │
│     • Lee archivo con xlsx                      │
│     • Auto-detecta columnas                     │
│     • Corrige caracteres Unicode (ñ, tildes)    │
│     • Valida formato de números chilenos        │
│     • Retorna preview + mapeo de columnas       │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  3. Usuario confirma mapeo + porcentajes        │
│     POST /api/remuneraciones/procesar-excel     │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  4. procesarExcel()                             │
│     Para cada fila:                             │
│     ├─ Busca empleado por RUT                   │
│     ├─ Si no existe → Crea empleado             │
│     ├─ Calcula costo total con porcentajes:     │
│     │  └─ Total = haberes + (haberes * %)       │
│     └─ Inserta en datos_remuneraciones          │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  5. Sistema verifica asignaciones               │
│     validarEmpleadosSinAsignacion()             │
│     • Detecta empleados sin sucursal            │
│     • Muestra alerta al usuario                 │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  6. Datos disponibles en Estado de Resultados   │
│     GET /api/estado-resultados/remuneraciones   │
│     • Empleados 1 sucursal → Gastos de Venta    │
│     • Empleados múltiples → Gastos Admin        │
└─────────────────────────────────────────────────┘
```

---

## 🏠 FLUJO: RESERVA DE CABAÑA CON PAGO

```
┌─────────────────────────────────────────────────┐
│  1. Usuario selecciona cabaña + fechas          │
│     GET /api/cabanas/disponibilidad             │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  2. Sistema verifica disponibilidad             │
│     verificarDisponibilidad()                   │
│     • Chequea fechas ocupadas                   │
│     • Calcula precio con temporada              │
│     • Aplica descuento si hay código            │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  3. Usuario confirma reserva                    │
│     POST /api/webpay/crear                      │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  4. webpayController.crearTransaccion()         │
│     • Crea registro en reservas_pendientes      │
│     • Genera token de Webpay                    │
│     • Establece expiración: 30 minutos          │
│     • Retorna URL de pago                       │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  5. Usuario redirigido a Webpay                 │
│     (Pasarela de pago externa)                  │
└─────────────────┬───────────────────────────────┘
                  │
         ┌────────┴────────┐
         ▼                 ▼
    [EXITOSO]         [FALLIDO]
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌──────────────────┐
│ 6a. Confirma    │  │ 6b. Cancela      │
│ GET /confirmar  │  │ Elimina pending  │
│ • Mueve a tabla │  │                  │
│   reservas      │  └──────────────────┘
│ • Marca pagado  │
└─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  7. Job automático cada X minutos               │
│     limpiarReservasPendientes.js                │
│     • Elimina pendientes > 30 min sin pagar     │
│     • Libera disponibilidad de cabañas          │
└─────────────────────────────────────────────────┘
```

---

## 📊 FLUJO: DASHBOARD MULTI-SUCURSAL

```
┌─────────────────────────────────────────────────┐
│  1. Usuario abre Dashboard                      │
│     POST /api/dashboard/data                    │
│     { fechaInicio, fechaFin, sucursales[] }     │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  2. dashboardController.getDashboardData()      │
│     • Obtiene lista de sucursales               │
│     • Filtra por selección del usuario          │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  3. Para cada sucursal:                         │
│     ├─ Identifica tipo (SUPER/FERRE/MULTI)      │
│     ├─ Conecta a BD específica                  │
│     ├─ Ejecuta query según tipo:                │
│     │  ├─ SUPER: Suma ventas - notas crédito    │
│     │  ├─ FERRE: Costo + margen                 │
│     │  └─ MULTI: Ventas netas                   │
│     └─ Acumula resultados                       │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  4. Agrega datos de todas las sucursales        │
│     totalVentas = Σ ventas                      │
│     totalCostos = Σ costos                      │
│     utilidad = ventas - costos                  │
│     margen = (utilidad / ventas) * 100          │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  5. Retorna JSON al frontend                    │
│     {                                           │
│       totalVentas: 10000000,                    │
│       totalCostos: 7000000,                     │
│       utilidad: 3000000,                        │
│       margen: 30,                               │
│       ventasPorSucursal: [...]                  │
│     }                                           │
└─────────────────────────────────────────────────┘
```

---

## 🎫 FLUJO: SISTEMA DE TICKETS

```
┌─────────────────────────────────────────────────┐
│  1. Usuario crea ticket                         │
│     POST /api/tickets/crear                     │
│     {                                           │
│       titulo, descripcion, categoria,           │
│       prioridad, id_usuario_creador             │
│     }                                           │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  2. ticketController.crearTicket()              │
│     • Inserta en tabla tickets                  │
│     • Estado inicial: "activo"                  │
│     • Fecha creación: NOW()                     │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  3. Admin asigna ticket                         │
│     PUT /api/tickets/:id/asignar                │
│     { id_usuario_asignado }                     │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  4. Usuario asignado responde                   │
│     POST /api/tickets/:id/responder             │
│     { respuesta }                               │
│     • Inserta en tickets_respuestas             │
│     • Actualiza estado a "en_proceso"           │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  5. Usuario creador puede responder             │
│     POST /api/tickets/:id/responder             │
│     (Conversación continúa)                     │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  6. Resolución del ticket                       │
│     PUT /api/tickets/:id/estado                 │
│     { estado: "resuelto" }                      │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  7. Cierre definitivo                           │
│     PUT /api/tickets/:id/estado                 │
│     { estado: "cerrado" }                       │
│     • Ticket archivado                          │
│     • No se permiten más respuestas             │
└─────────────────────────────────────────────────┘

Estados: activo → en_proceso → resuelto → cerrado
Prioridades: critica, alta, media, baja
```

---

## 🗄️ ARQUITECTURA DE BASES DE DATOS

```
┌────────────────────────────────────────────────────────────────┐
│              SQL SERVER: 192.168.100.200:1433                  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  GestionBeach (DB Principal)                             │ │
│  │  ├── empleados                                           │ │
│  │  ├── empleados_sucursales (relación N:M)                 │ │
│  │  ├── datos_remuneraciones                                │ │
│  │  ├── periodos_remuneracion                               │ │
│  │  ├── usuarios                                            │ │
│  │  ├── perfiles                                            │ │
│  │  ├── modulos                                             │ │
│  │  ├── perfil_modulo (permisos por perfil)                 │ │
│  │  ├── permisos_usuario (permisos individuales)            │ │
│  │  ├── sucursales                                          │ │
│  │  ├── razones_sociales                                    │ │
│  │  ├── tickets                                             │ │
│  │  ├── tickets_respuestas                                  │ │
│  │  ├── cabanas                                             │ │
│  │  ├── reservas                                            │ │
│  │  ├── reservas_pendientes (temporal para Webpay)          │ │
│  │  ├── codigos_descuento                                   │ │
│  │  ├── configuracion_temporada                             │ │
│  │  ├── concurso_piscinas_participaciones                   │ │
│  │  └── centros_costos                                      │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  ERIZ (DB Productos)                                     │ │
│  │  ├── productos                                           │ │
│  │  ├── categorias                                          │ │
│  │  └── inventario                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  DBs por Sucursal (Conexión Dinámica)                    │ │
│  │  ├── LORD_COCHRANE_DB                                    │ │
│  │  ├── DICHATO_DB                                          │ │
│  │  ├── COELEMU_DB                                          │ │
│  │  ├── ENRIQUE_MOLINA_DB                                   │ │
│  │  └── ... (otras sucursales)                              │ │
│  │                                                           │ │
│  │  Cada DB contiene:                                       │ │
│  │    • Ventas diarias                                      │ │
│  │    • Productos vendidos                                  │ │
│  │    • Costos                                              │ │
│  │    • Notas de crédito                                    │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔧 SCRIPTS UTILITARIOS - GUÍA RÁPIDA

### 📊 DIAGNÓSTICO

```bash
# Verificar empleados sin sucursal
node scripts/diagnosticar_empleados_simple.js
  └─ Resultado: ✅ 0 empleados críticos

# Reporte completo del sistema
node scripts/reporte_final_completo.js
  └─ Muestra: empleados, sucursales, duplicados, estado general

# Verificar duplicados de remuneraciones
node scripts/diagnosticar_duplicados_remuneraciones.js
  └─ Resultado: ✅ 0 duplicados
```

### 🔨 REPARACIÓN

```bash
# Asignar sucursales inteligentemente
node scripts/asignar_sucursales_inteligente.js
  └─ Usa mapeo de establecimientos a sucursales

# Asignar por razón social (fallback)
node scripts/asignar_por_razon_social.js
  └─ Para empleados sin establecimiento

# Eliminar duplicados de remuneraciones
node scripts/eliminar_duplicados_remuneraciones.js
  └─ Mantiene el registro más reciente (ID mayor)
```

### 🏗️ SETUP

```bash
# Crear tabla de reservas pendientes
node scripts/crear_tabla_pendientes.js

# Configurar precios de temporada
node scripts/crear_precios_temporada_cabanas.js

# Crear códigos de descuento
node scripts/crear_codigos_descuento_cabanas.js
```

---

## 🌐 CONFIGURACIÓN CORS

**Orígenes permitidos**:
- `http://localhost:3000` (desarrollo)
- `http://192.168.100.150:3000` (LAN)
- `http://intranet.beach.cl`
- `http://reservas.beach.cl`
- `http://concurso.beach.cl`

**Credenciales**: Habilitadas
**Métodos**: GET, POST, PUT, DELETE, OPTIONS

---

## 🔑 VARIABLES DE ENTORNO (.env)

```env
# Servidor
PORT=5000
NODE_ENV=production

# JWT
JWT_SECRET=your_secret_key_here

# Base de datos principal
DB_SERVER=192.168.100.200
DB_NAME=GestionBeach
DB_USER=sa
DB_PASSWORD=*1beachmarket

# Twilio WhatsApp
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
TWILIO_WHATSAPP_TO=whatsapp:+56995367372

# Webpay (si aplica)
WEBPAY_COMMERCE_CODE=xxxxxxxx
WEBPAY_API_KEY=xxxxxxxxxxxxxxxx
```

---

## 🚦 ENDPOINTS DE DIAGNÓSTICO

```bash
# Verificar que el servidor está corriendo
GET http://192.168.100.200:5000/api/ping
  └─ Respuesta: { message: "pong" }

# Verificar conexión a base de datos
GET http://192.168.100.200:5000/api/check-db
  └─ Respuesta: { dbConnected: true }

# Listar todas las rutas disponibles
GET http://192.168.100.200:5000/api/routes
  └─ Respuesta: Array de todas las rutas registradas

# Health check del sistema
GET http://192.168.100.200:5000/api/monitoreo/health
  └─ Respuesta: Estado de todos los servicios
```

---

## 📈 FLUJO DE DATOS: ESTADO DE RESULTADOS

```
1. Usuario selecciona período y sucursales
   └─ POST /api/estado-resultados/generar

2. Sistema obtiene datos de 3 fuentes:

   A. VENTAS
   └─ GET /api/estado-resultados/ventas
      ├─ Conecta a DB de cada sucursal
      ├─ Suma ventas del período
      └─ Agrupa por sucursal

   B. COMPRAS
   └─ GET /api/estado-resultados/compras
      ├─ Lee facturas_xml procesadas
      ├─ Filtra por fecha y sucursal
      └─ Suma costos

   C. REMUNERACIONES
   └─ GET /api/estado-resultados/remuneraciones
      ├─ Lee datos_remuneraciones
      ├─ Verifica empleados_sucursales
      ├─ Clasifica automáticamente:
      │  ├─ 1 sucursal → Gastos de Venta
      │  └─ Múltiples → Gastos Administrativos
      └─ Distribuye proporcionalmente si aplica

3. Cálculos finales
   ├─ Utilidad Bruta = Ventas - Compras
   ├─ Gastos Operacionales = Remuneraciones + Otros
   ├─ Utilidad Operacional = Utilidad Bruta - Gastos
   └─ Margen = (Utilidad / Ventas) * 100

4. Guardar y/o Enviar
   ├─ POST /api/estado-resultados/guardar
   └─ POST /api/estado-resultados/enviar
       └─ Genera PDF con pdfService.js
       └─ Envía por email
```

---

## 🎯 PATRONES ARQUITECTÓNICOS CLAVE

### 1. Multi-Tenant por Sucursal
- Cada sucursal tiene su propia BD de ventas
- Conexión dinámica según contexto
- Agregación centralizada en GestionBeach

### 2. Doble Sistema de Permisos
- **Permisos de Perfil**: Asignados al rol (Admin, Vendedor, etc.)
- **Permisos Individuales**: Sobrescriben los del perfil
- Combinación: `perfilPermisos.concat(usuarioPermisos)`

### 3. Transacciones SQL
- Operaciones críticas usan `sql.Transaction`
- Rollback automático en caso de error
- Ejemplo: Procesamiento de Excel de remuneraciones

### 4. Jobs Automáticos
- Limpieza de reservas pendientes expiradas
- Se inicia con el servidor
- Previene bloqueos de disponibilidad

### 5. Validación en Capas
```
Frontend (React)
    ↓
Middleware (JWT + CORS)
    ↓
Rutas (Express Router)
    ↓
Controladores (Validación de negocio)
    ↓
Base de Datos (Constraints + Foreign Keys)
```

---

## 🔥 PUNTOS CRÍTICOS A RECORDAR

### ✅ YA RESUELTOS
1. **Duplicados de Remuneraciones**: Eliminados (99 registros)
2. **Empleados sin Sucursal**: 100% asignados (228/228)
3. **Bug en asignación**: Corregido (ya no borra todas las sucursales)
4. **Clasificación automática**: Funcionando correctamente

### ⚠️ RECOMENDACIONES
1. **Backups**: Hacer backup antes de procesar Excel de remuneraciones
2. **Validación de RUT**: Siempre usar la función `validateRut()`
3. **Transacciones**: Usar en operaciones que afecten múltiples tablas
4. **Logs**: Revisar console.log en producción para errores
5. **CORS**: Actualizar origins si se agregan nuevos subdominios

---

## 📞 INTEGRACIONES EXTERNAS

### Twilio WhatsApp
- **Propósito**: Notificaciones de reservas
- **Endpoint**: `services/whatsappService.js`
- **Uso**: Confirmaciones, recordatorios, cambios

### Webpay Plus
- **Propósito**: Pagos online de reservas
- **Controlador**: `webpayController.js`
- **Flujo**: Crear → Redirigir → Confirmar

### OCR (Tesseract)
- **Propósito**: Leer boletas de concursos
- **Controlador**: `concursoPiscinasController.js`
- **Función**: `procesarOCRConCrop()`

---

## 🚀 INICIO DEL SISTEMA

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar .env
cp .env.example .env
nano .env  # Editar variables

# 3. Iniciar servidor
npm start
# o en desarrollo:
npm run dev

# 4. Verificar
curl http://localhost:5000/api/ping
```

**El servidor escucha en**: `0.0.0.0:5000`
**Accesible desde**: Cualquier IP en la red local

---

## 📊 MÉTRICAS DEL SISTEMA (Actual)

- **Empleados Totales**: 228 (100% activos)
- **Sucursales Asignadas**: 228/228 (100%)
- **Remuneraciones Registradas**: 515 registros
- **Empleados con Remuneraciones**: 227
- **Períodos de Pago**: 5 (2021-2025)
- **Duplicados**: 0 ✅
- **Empleados Críticos**: 0 ✅
- **Estado del Sistema**: ✅ **100% OPERATIVO**

---

## 📚 RESUMEN EJECUTIVO

**GestionBeach Backend** es un sistema ERP modular que gestiona:

- ✅ **Recursos Humanos**: Empleados, remuneraciones, asignaciones
- ✅ **Finanzas**: Dashboard, ventas, costos, estados de resultados
- ✅ **Inventario**: Productos, stock, análisis de ventas
- ✅ **Reservas**: Cabañas, pagos online, descuentos
- ✅ **Soporte**: Sistema de tickets multi-nivel
- ✅ **Promociones**: Concursos con upload de imágenes y OCR
- ✅ **Configuración**: Usuarios, perfiles, permisos, sucursales

**Tecnologías**: Node.js + Express + SQL Server + JWT
**Arquitectura**: Multi-tenant, multi-database, REST API
**Estado**: Producción estable

---

**Fecha de generación**: 2025-12-23
**Versión del sistema**: 1.0 Operativo
