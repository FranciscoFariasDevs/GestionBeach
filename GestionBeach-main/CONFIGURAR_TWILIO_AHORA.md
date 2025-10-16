# 🚀 CONFIGURAR TWILIO - PASO A PASO

## ✅ YA TIENES LISTO

- ✅ ngrok corriendo: `https://4b5c19b56869.ngrok-free.app`
- ✅ Backend corriendo en puerto 5000
- ✅ El endpoint está funcionando (el error "Cannot GET" es normal)

---

## 🔍 VERIFICAR QUE LA URL FUNCIONA

**1. Abre tu navegador y ve a:**
```
https://4b5c19b56869.ngrok-free.app/api/cabanas/whatsapp/webhook/incoming
```

Deberías ver:
```json
{
  "success": true,
  "message": "✅ Webhook está activo",
  "info": "Este endpoint debe ser configurado como POST en Twilio",
  "metodo_correcto": "POST"
}
```

Si ves esto, ¡la URL funciona! ✅

---

## 📱 CONFIGURAR EN TWILIO (5 PASOS)

### **PASO 1: Ir a Twilio Console**

Abre: https://console.twilio.com/

---

### **PASO 2: Ir a WhatsApp Sandbox**

1. En el menú izquierdo, click en **"Messaging"**
2. Click en **"Try it out"**
3. Click en **"Send a WhatsApp message"**

O directo: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn

---

### **PASO 3: Unirte al Sandbox**

En esa página verás un código como:

```
join abc-xyz-123
```

**Desde tu WhatsApp personal:**
1. Agregar contacto: **+1 415 523 8886**
2. Enviar mensaje: **join abc-xyz-123** (tu código único)
3. Recibirás: "You are now connected to the Sandbox!"

---

### **PASO 4: Configurar Webhook**

En la misma página de Twilio (Sandbox settings):

1. Busca la sección **"Sandbox Configuration"**

2. En el campo **"WHEN A MESSAGE COMES IN"**:
   - URL: `https://4b5c19b56869.ngrok-free.app/api/cabanas/whatsapp/webhook/incoming`
   - Método: **POST** (muy importante)

3. Click en **"Save"** (botón rojo)

---

### **PASO 5: Probar el Bot**

Desde tu WhatsApp, envía al número de Twilio (**+1 415 523 8886**):

```
hola
```

**El bot debería responder automáticamente con:**
```
¡Hola! 👋 Bienvenido a *Cabañas Beach*.

¿En qué puedo ayudarte?

1️⃣ Ver disponibilidad de cabañas
2️⃣ Hacer una reserva
3️⃣ Ver datos para transferencia
4️⃣ Hablar con un ejecutivo
```

---

## 🎯 COMANDOS PARA PROBAR

Envía estos mensajes y el bot responderá:

| Mensaje | Respuesta |
|---------|-----------|
| `hola` | Menú principal |
| `disponibilidad` | Lista de 10 cabañas con precios |
| `cabaña 3` | Detalles de cabaña 3 |
| `datos pago` | Datos bancarios |
| `hablar ejecutivo` | Contacto |

---

## 🔍 VER LOGS EN TIEMPO REAL

En tu terminal donde corre el backend (puerto 5000), verás:

```
📱 === MENSAJE WHATSAPP ENTRANTE ===
📞 De: +56942652034
💬 Mensaje: hola
🎯 Intent detectado: saludo
📤 Enviando mensaje a: whatsapp:+56942652034
✅ Mensaje enviado - SID: SM...
✅ Mensaje procesado correctamente
```

---

## ⚠️ SOLUCIÓN DE PROBLEMAS

### Problema: "Cannot GET /api/cabanas/whatsapp/webhook/incoming"

**Esto es NORMAL** ✅

- Cuando accedes desde el navegador, hace una petición **GET**
- El webhook de Twilio necesita **POST**
- Si ves este error, significa que la URL está bien

**Solución:** Ignora este error y configura la URL como **POST** en Twilio.

---

### Problema: El bot no responde

**Checklist:**

1. ☑️ Backend corriendo en puerto 5000
   ```bash
   node server.js
   ```

2. ☑️ ngrok corriendo
   ```bash
   ngrok http 5000
   ```

3. ☑️ Webhook configurado en Twilio como **POST**

4. ☑️ Unido al sandbox (enviaste "join abc-xyz")

5. ☑️ Verificar logs del backend cuando envíes un mensaje

---

### Problema: ngrok cambió la URL

Si detienes ngrok y lo vuelves a iniciar, **la URL cambia**.

**Solución:**
1. Copiar nueva URL de ngrok
2. Actualizar webhook en Twilio Console
3. Volver a guardar

**Tip:** Usa `ngrok http 5000 --domain=tudominio.ngrok-free.app` para mantener la misma URL (requiere cuenta de ngrok).

---

## 📊 VERIFICAR QUE FUNCIONA

### 1. Ver mensajes en base de datos

```sql
SELECT TOP 10
  telefono_cliente,
  direccion,
  mensaje,
  intent,
  fecha_creacion
FROM dbo.mensajes_whatsapp
ORDER BY fecha_creacion DESC;
```

### 2. Ver conversaciones en frontend

1. Ir a: http://localhost:3000/admin/cabanas
2. Tab "WhatsApp"
3. Deberías ver tu conversación

### 3. Ver logs del backend

Terminal donde corre `node server.js` mostrará cada mensaje que llega.

---

## 🎉 LISTO

Una vez configurado:
- ✅ Los clientes escriben al +1 415 523 8886
- ✅ Twilio envía el mensaje a tu servidor
- ✅ Tu bot detecta la intención y responde
- ✅ El cliente recibe respuesta automática
- ✅ Todo se guarda en la base de datos

**El bot trabaja 24/7 automáticamente** 🤖

---

## 🔗 LINKS ÚTILES

- Twilio Console: https://console.twilio.com/
- WhatsApp Sandbox: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
- Tu webhook actual: `https://4b5c19b56869.ngrok-free.app/api/cabanas/whatsapp/webhook/incoming`
- Test endpoint: http://localhost:5000/api/cabanas/whatsapp/test

---

## ❓ SI AÚN NO FUNCIONA

Envíame:
1. Screenshot de la configuración del webhook en Twilio
2. Logs del backend cuando envíes un mensaje
3. El error exacto que aparece
