# Sistema de Administración de Cabañas con WhatsApp (Twilio)

## 📋 Descripción

Sistema completo de administración de cabañas que incluye:
- ✅ CRUD de cabañas
- ✅ CRUD de reservas (manual y automático)
- ✅ Gestión de disponibilidad y calendario
- ✅ Integración con WhatsApp vía Twilio para respuestas automáticas
- ✅ Historial de conversaciones
- ✅ Dashboard administrativo

---

## 🗄️ Base de Datos

### Paso 1: Crear las tablas

Ejecuta el script SQL en SQL Server Management Studio:

```bash
C:\...\GestionBeach-main\backend\database\cabanas_reservas.sql
```

Este script creará las siguientes tablas:
- `cabanas` - Información de cada cabaña
- `reservas_cabanas` - Reservas de clientes
- `mensajes_whatsapp` - Historial de mensajes de WhatsApp
- `plantillas_respuestas` - Plantillas de respuestas automáticas
- `bloqueos_cabanas` - Control de disponibilidad

---

## 🔧 Configuración de Twilio

### Paso 1: Obtener credenciales

Ya tienes tus credenciales:
- **Account SID**: `ACd8e5a39aea566708a6f5eb37a4f27352`
- **Auth Token**: `[TU_AUTH_TOKEN]` (reemplázalo en el código)
- **WhatsApp Number**: `+14155238886` (Sandbox de Twilio)

### Paso 2: Instalar el paquete de Twilio

```bash
cd backend
npm install twilio
```

### Paso 3: Configurar variables de entorno

Crea o edita el archivo `.env` en la carpeta `backend/`:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACd8e5a39aea566708a6f5eb37a4f27352
TWILIO_AUTH_TOKEN=TU_AUTH_TOKEN_AQUI
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### Paso 4: Configurar Webhook en Twilio

1. Ve a https://console.twilio.com/
2. Navega a **Messaging** > **Try it out** > **Send a WhatsApp message**
3. En la sección **Sandbox settings**, configura el Webhook:

**Webhook URL:**
```
http://TU_IP:5000/api/cabanas/whatsapp/webhook/incoming
```

Si estás en desarrollo local y necesitas exponer tu servidor, usa **ngrok**:

```bash
ngrok http 5000
```

Copia la URL generada (ej: `https://abc123.ngrok.io`) y configúrala en Twilio:
```
https://abc123.ngrok.io/api/cabanas/whatsapp/webhook/incoming
```

---

## 🚀 Backend - Configuración

### Paso 1: Registrar las rutas en `server.js`

Edita `backend/server.js` y agrega:

```javascript
// Rutas de cabañas y WhatsApp
const cabanasRoutes = require('./routes/cabanasRoutes');
app.use('/api/cabanas', cabanasRoutes);
```

### Paso 2: Reiniciar el servidor

```bash
cd backend
npm start
```

### Paso 3: Probar el endpoint de test

Abre tu navegador y ve a:
```
http://localhost:5000/api/cabanas/whatsapp/test
```

Esto enviará un mensaje de prueba a WhatsApp.

---

## 📱 Configurar Sandbox de WhatsApp

1. Entra a la consola de Twilio: https://console.twilio.com/
2. Ve a **Messaging** > **Try it out** > **Send a WhatsApp message**
3. Verás un código como: `join ABC-DEF`
4. Desde tu WhatsApp personal (+56942652034), envía ese código al número `+1 415 523 8886`
5. Recibirás un mensaje de confirmación
6. Ahora puedes enviar mensajes de prueba

---

## 🤖 Respuestas Automáticas

El sistema detecta automáticamente el intent (intención) del mensaje usando palabras clave:

### Plantillas preconfiguradas:

1. **Saludo**: "hola", "buenos días", "hey"
   - Responde con menú de opciones

2. **Consulta Disponibilidad**: "disponibilidad", "disponible", "fechas"
   - Solicita fechas de entrada/salida

3. **Info Cabañas**: "cabañas", "precios", "cuánto cuesta"
   - Muestra catálogo de cabañas con precios

4. **Hacer Reserva**: "reservar", "quiero reservar"
   - Solicita datos completos del cliente

5. **Despedida**: "gracias", "chao", "adiós"
   - Mensaje de despedida

### Personalizar respuestas

Puedes editar las respuestas en la tabla `plantillas_respuestas`:

```sql
UPDATE dbo.plantillas_respuestas
SET mensaje_respuesta = 'Tu nuevo mensaje aquí'
WHERE nombre = 'Saludo';
```

---

## 🖥️ Frontend - AdminCabañasPage

El frontend incluye:

### Componentes principales:

1. **Dashboard**: Estadísticas generales
2. **Lista de Cabañas**: Ver y gestionar cabañas
3. **Crear/Editar Cabaña**: Formulario de cabaña
4. **Calendario de Disponibilidad**: Ver ocupación
5. **Gestión de Reservas**: CRUD de reservas
6. **WhatsApp Manager**: Ver y responder conversaciones

### Ruta del frontend:

```
/admin/cabanas
```

---

## 🌐 API Endpoints

### Cabañas

```
GET    /api/cabanas                    - Obtener todas las cabañas
GET    /api/cabanas/:id                - Obtener una cabaña
POST   /api/cabanas                    - Crear cabaña
PUT    /api/cabanas/:id                - Actualizar cabaña
DELETE /api/cabanas/:id                - Eliminar cabaña
```

### Disponibilidad

```
GET /api/cabanas/disponibilidad/verificar?cabana_id=1&fecha_inicio=2025-10-15&fecha_fin=2025-10-20
GET /api/cabanas/disponibilidad/calendario?cabana_id=1
```

### Reservas

```
GET    /api/cabanas/reservas           - Obtener todas las reservas
GET    /api/cabanas/reservas/:id       - Obtener una reserva
POST   /api/cabanas/reservas           - Crear reserva
PUT    /api/cabanas/reservas/:id       - Actualizar reserva
DELETE /api/cabanas/reservas/:id/cancelar - Cancelar reserva
POST   /api/cabanas/reservas/:id/checkin  - Check-in
POST   /api/cabanas/reservas/:id/checkout - Check-out
GET    /api/cabanas/reservas/stats/general - Estadísticas
```

### WhatsApp

```
POST /api/cabanas/whatsapp/webhook/incoming  - Webhook de Twilio (mensajes entrantes)
POST /api/cabanas/whatsapp/webhook/status    - Webhook de estado
POST /api/cabanas/whatsapp/enviar            - Enviar mensaje manual
GET  /api/cabanas/whatsapp/conversaciones    - Ver conversaciones
GET  /api/cabanas/whatsapp/conversaciones/:telefono - Mensajes de una conversación
GET  /api/cabanas/whatsapp/test              - Test de envío
```

---

## 🧪 Pruebas

### 1. Test de envío de WhatsApp

```bash
curl http://localhost:5000/api/cabanas/whatsapp/test
```

### 2. Enviar mensaje manual

```bash
curl -X POST http://localhost:5000/api/cabanas/whatsapp/enviar \
  -H "Content-Type: application/json" \
  -d '{
    "telefono": "+56942652034",
    "mensaje": "Hola, este es un mensaje de prueba"
  }'
```

### 3. Crear reserva

```bash
curl -X POST http://localhost:5000/api/cabanas/reservas \
  -H "Content-Type: application/json" \
  -d '{
    "cabana_id": 1,
    "cliente_nombre": "Juan",
    "cliente_apellido": "Pérez",
    "cliente_telefono": "+56912345678",
    "cliente_email": "juan@email.com",
    "fecha_inicio": "2025-10-15",
    "fecha_fin": "2025-10-18",
    "cantidad_personas": 4,
    "precio_por_noche": 50000,
    "precio_total": 150000,
    "estado": "confirmada",
    "origen": "manual"
  }'
```

---

## 📊 Flujo de Trabajo

### Reserva por WhatsApp:

1. Cliente envía mensaje: "Hola, quiero reservar"
2. Sistema detecta intent "reserva"
3. Sistema solicita datos necesarios
4. Cliente proporciona información
5. Sistema verifica disponibilidad
6. Sistema crea reserva automáticamente
7. Sistema confirma por WhatsApp

### Reserva Manual:

1. Admin ingresa a `/admin/cabanas`
2. Va a "Nueva Reserva"
3. Completa formulario
4. Sistema verifica disponibilidad
5. Crea reserva y bloquea calendario

---

## 🔐 Seguridad

### Recomendaciones:

1. **No subas tu Auth Token a Git**:
   - Usa variables de entorno (`.env`)
   - Agrega `.env` al `.gitignore`

2. **Valida Webhooks de Twilio**:
   ```javascript
   const twilio = require('twilio');

   // Middleware de validación
   const validateTwilioRequest = (req, res, next) => {
     const twilioSignature = req.headers['x-twilio-signature'];
     const url = `https://tu-dominio.com${req.originalUrl}`;

     const isValid = twilio.validateRequest(
       authToken,
       twilioSignature,
       url,
       req.body
     );

     if (isValid) {
       next();
     } else {
       res.status(403).send('Forbidden');
     }
   };
   ```

3. **Agrega autenticación a las rutas de admin**

---

## 📝 Notas

- El Sandbox de Twilio solo permite enviar mensajes a números que se unieron al sandbox
- Para producción, necesitas aprobar un WhatsApp Business Account
- Los mensajes se guardan en la BD para auditoría
- Puedes agregar más plantillas de respuestas según necesites

---

## 🐛 Troubleshooting

### Error: "Authentication Error" en Twilio
**Solución**: Verifica que tu `TWILIO_AUTH_TOKEN` sea correcto

### Error: "Forbidden" en webhook
**Solución**: Asegúrate de que la URL del webhook sea accesible públicamente (usa ngrok en desarrollo)

### No llegan mensajes automáticos
**Solución**:
1. Verifica que el webhook esté configurado en Twilio
2. Revisa los logs del servidor
3. Verifica que el número esté unido al sandbox

### Error: "Invalid To Phone Number"
**Solución**: El número debe tener formato `whatsapp:+56912345678` (incluir código de país con +)

---

## 📞 Contacto

Sistema desarrollado para Cabañas Beach
WhatsApp: +56942652034

---

¡Listo! 🎉 El sistema está configurado y funcionando.
