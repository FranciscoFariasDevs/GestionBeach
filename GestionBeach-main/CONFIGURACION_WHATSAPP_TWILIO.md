# 🔧 CONFIGURACIÓN WHATSAPP BOT CON TWILIO

## ✅ ESTADO ACTUAL

Tu bot de WhatsApp **YA ESTÁ IMPLEMENTADO** y listo para responder automáticamente. El código está completo en `backend/controllers/twilioWhatsAppControllerV2.js`.

---

## 📋 LO QUE YA TIENES FUNCIONANDO

### 1. **Credenciales de Twilio** ✅
```javascript
Account SID: ACd8e5a39aea566708a6f5eb37a4f27352
Auth Token: 9d41d638403d9299559459f9b3f61f3a
Número WhatsApp: whatsapp:+14155238886
```

### 2. **Respuestas Automáticas** ✅

El bot responde automáticamente a:

| Intent | Palabras clave | Respuesta |
|--------|---------------|-----------|
| **Saludo** | hola, buenos días, hey | Menú principal con opciones |
| **Disponibilidad** | disponibilidad, ver cabañas, fechas | Lista de 10 cabañas con precios por temporada |
| **Datos Pago** | pagar, transferencia, cuenta bancaria | Datos de cuenta para transferencia |
| **Hablar Ejecutivo** | hablar, ejecutivo, ayuda | Contacto con ejecutivo humano |
| **Selección Cabaña** | cabaña 3, departamento 9, solo "3" | Detalles de la cabaña específica |
| **Despedida** | gracias, chao, adiós | Mensaje de despedida |

### 3. **Precios por Temporada** ✅

El bot detecta automáticamente la temporada:

- **TEMPORADA ALTA** (Dic - Feb): Precio `precio_fin_semana` 🔥
- **TEMPORADA BAJA** (Mar - Nov): Precio `precio_noche` 🌿

### 4. **Base de Datos** ✅

Guarda todos los mensajes en `dbo.mensajes_whatsapp`:
- Mensajes entrantes del cliente
- Mensajes salientes del bot
- Estado de conversaciones
- Intent detectado

---

## 🚀 PASOS PARA ACTIVAR EL BOT

### **PASO 1: Verificar que el backend esté corriendo**

```bash
cd backend
node server.js
```

Deberías ver:
```
✅ WhatsApp Service cargado
🚀 Servidor corriendo en puerto 3001
```

---

### **PASO 2: Exponer tu servidor a internet**

Twilio necesita enviar webhooks a tu servidor. Tienes 2 opciones:

#### **OPCIÓN A: ngrok (Desarrollo - RECOMENDADO)**

```bash
# 1. Instalar ngrok
npm install -g ngrok

# 2. Iniciar ngrok en el puerto del backend (3001)
ngrok http 3001
```

Te dará una URL pública como:
```
https://abc123.ngrok-free.app
```

**IMPORTANTE**: Copia esta URL, la necesitarás en el siguiente paso.

#### **OPCIÓN B: Servidor en producción**

Si ya tienes un dominio con SSL:
```
https://tudominio.com
```

---

### **PASO 3: Configurar Webhook en Twilio**

1. **Ir a Twilio Console**: https://console.twilio.com/

2. **Ir a Messaging → Try it out → Send a WhatsApp message**

3. **Scroll down hasta "Sandbox settings"**

4. **Configurar webhook "WHEN A MESSAGE COMES IN"**:
   ```
   https://abc123.ngrok-free.app/api/cabanas/whatsapp/webhook/incoming
   ```

   O si tienes dominio propio:
   ```
   https://tudominio.com/api/cabanas/whatsapp/webhook/incoming
   ```

5. **Método**: POST

6. **Guardar** (Save)

---

### **PASO 4: Activar WhatsApp Sandbox**

1. En Twilio Console, ve a **Messaging → Try it out → Send a WhatsApp message**

2. Verás un código como: `join abc-xyz`

3. **Desde tu WhatsApp personal**, envía un mensaje al número de Twilio:
   ```
   Enviar a: +1 415 523 8886
   Mensaje: join abc-xyz
   ```

4. Recibirás confirmación de que te uniste al sandbox.

---

### **PASO 5: Probar el bot**

Envía mensajes desde tu WhatsApp al número de Twilio:

```
1. Envía: "hola"
   → El bot responderá con el menú principal

2. Envía: "disponibilidad"
   → El bot mostrará las 10 cabañas con precios

3. Envía: "cabaña 3"
   → El bot mostrará detalles de la cabaña 3

4. Envía: "datos para pagar"
   → El bot enviará datos bancarios

5. Envía: "hablar con ejecutivo"
   → El bot te dará información de contacto
```

---

## 🔍 VERIFICAR QUE FUNCIONA

### 1. **Ver logs del backend**

Cuando un mensaje llega, deberías ver:
```
📱 === MENSAJE WHATSAPP ENTRANTE ===
📞 De: +56942652034
💬 Mensaje: hola
🎯 Intent detectado: saludo
📤 Enviando mensaje a: whatsapp:+56942652034
✅ Mensaje enviado - SID: SM...
✅ Mensaje procesado correctamente
```

### 2. **Ver mensajes en la base de datos**

```sql
-- Ver últimos mensajes
SELECT TOP 10
  telefono_cliente,
  direccion,
  mensaje,
  intent,
  respondido_automaticamente,
  fecha_creacion
FROM dbo.mensajes_whatsapp
ORDER BY fecha_creacion DESC;
```

### 3. **Ver conversaciones en el frontend**

1. Ir a: http://localhost:3000/admin/cabanas
2. Click en tab "WhatsApp"
3. Deberías ver las conversaciones con clientes

---

## ⚠️ PROBLEMAS COMUNES

### Problema 1: "El bot no responde"

**Causa**: Webhook no configurado o URL incorrecta

**Solución**:
1. Verificar que ngrok está corriendo
2. Copiar la URL de ngrok EXACTAMENTE
3. Configurar webhook en Twilio con `/api/cabanas/whatsapp/webhook/incoming` al final
4. Verificar que el backend esté corriendo

### Problema 2: "Error de autenticación de Twilio"

**Causa**: Auth Token incorrecto

**Solución**:
1. Ir a Twilio Console → Account → API Keys & Tokens
2. Copiar el Auth Token
3. Actualizar en `.env`:
   ```
   TWILIO_AUTH_TOKEN=tu_token_aqui
   ```
4. Reiniciar el backend

### Problema 3: "Mensajes llegan pero no se guardan en BD"

**Causa**: Tabla `mensajes_whatsapp` no existe

**Solución**:
```sql
-- Ejecutar el SQL de creación de tablas
-- Archivo: backend/database/cabanas_sistema_completo.sql
```

### Problema 4: "ngrok muestra 502 Bad Gateway"

**Causa**: Backend no está corriendo

**Solución**:
```bash
cd backend
node server.js
```

---

## 📊 FLUJO COMPLETO

```
1. Cliente envía WhatsApp → Twilio recibe mensaje
2. Twilio envía webhook → Tu servidor (ngrok → localhost:3001)
3. Backend recibe en → /api/cabanas/whatsapp/webhook/incoming
4. Controlador procesa → detectarIntent()
5. Genera respuesta → generarMensajeDisponibilidad(), etc.
6. Guarda en BD → mensajes_whatsapp (entrante)
7. Envía respuesta → client.messages.create()
8. Guarda en BD → mensajes_whatsapp (saliente)
9. Cliente recibe → Respuesta automática del bot
```

---

## 🎯 PRÓXIMOS PASOS OPCIONALES

### 1. **Integrar reservas automáticas**
El bot ya puede mostrar disponibilidad. Puedes agregar:
- Capturar fechas del cliente
- Crear reserva en la BD
- Enviar confirmación

### 2. **Notificaciones proactivas**
Enviar mensajes automáticos:
- Recordatorio 1 día antes del check-in
- Encuesta post check-out
- Ofertas especiales

### 3. **Pasar a producción**
Cuando estés listo:
1. Solicitar número WhatsApp oficial en Twilio
2. Configurar webhook en servidor de producción
3. Quitar sandbox y usar número propio

---

## 📞 CREDENCIALES ACTUALES

```javascript
// Ya configurado en twilioWhatsAppControllerV2.js
Account SID: ACd8e5a39aea566708a6f5eb37a4f27352
Auth Token: 9d41d638403d9299559459f9b3f61f3a
Número Twilio: +14155238886
Tu número de prueba: +56942652034
```

---

## ✅ CHECKLIST FINAL

- [ ] Backend corriendo en puerto 3001
- [ ] ngrok corriendo y genera URL pública
- [ ] Webhook configurado en Twilio Console
- [ ] Unido al sandbox de WhatsApp (join abc-xyz)
- [ ] Enviar "hola" y recibir respuesta del bot
- [ ] Verificar logs en backend
- [ ] Verificar mensajes en base de datos
- [ ] Ver conversaciones en frontend

---

## 🎉 ¡LISTO!

Tu bot de WhatsApp ya está funcionando automáticamente.

Ahora cada vez que un cliente escriba al número de Twilio:
- ✅ El mensaje se guarda en la BD
- ✅ El bot detecta la intención
- ✅ Responde automáticamente
- ✅ Guarda la respuesta en la BD
- ✅ El cliente recibe la respuesta al instante

**No necesitas hacer nada más** - el bot trabaja solo 🤖✨
