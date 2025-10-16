# 🔧 SOLUCIÓN DE PROBLEMAS - WhatsApp con Twilio

## ❌ PROBLEMA: Los mensajes automáticos no funcionan

### 📋 CHECKLIST DE VERIFICACIÓN

Sigue estos pasos **en orden** para diagnosticar el problema:

---

## ✅ PASO 1: Verificar Backend está corriendo

```bash
# En la carpeta backend
cd backend
npm start
```

**Deberías ver:**
```
✅ Conectado a SQL Server
🏡 Test Sistema Cabañas: http://190.102.248.163:5000/api/test-cabanas
📱 WhatsApp Test: http://190.102.248.163:5000/api/cabanas/whatsapp/test
```

**Si NO ves esto:**
- El backend no está corriendo correctamente
- Revisa errores en la consola

---

## ✅ PASO 2: Verificar archivo .env con Auth Token

**Ubicación:** `backend/.env`

**Debe contener:**
```env
TWILIO_ACCOUNT_SID=ACd8e5a39aea566708a6f5eb37a4f27352
TWILIO_AUTH_TOKEN=TU_AUTH_TOKEN_REAL_AQUI
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

**⚠️ IMPORTANTE:**
- Reemplaza `TU_AUTH_TOKEN_REAL_AQUI` con tu Auth Token real de Twilio
- **NO uses** `TU_AUTH_TOKEN_AQUI` (es un placeholder)

**Obtener Auth Token:**
1. Ve a: https://console.twilio.com/
2. Copia el "Auth Token" de tu dashboard

**Después de editar .env:**
```bash
# Reiniciar el backend
Ctrl + C  # Detener el backend actual
npm start # Iniciar nuevamente
```

---

## ✅ PASO 3: Verificar puerto 5000 abierto en Firewall

### Windows:

1. Presiona `Win + R`
2. Escribe: `wf.msc` y Enter
3. Click en **"Reglas de entrada"** (lado izquierdo)
4. Busca una regla llamada: **"Node Backend - Puerto 5000"**

**Si NO existe:**

1. Click en **"Nueva regla..."** (lado derecho)
2. Tipo: **Puerto** → Siguiente
3. Puerto específico local: **5000** → Siguiente
4. Acción: **Permitir la conexión** → Siguiente
5. Perfil: **Marcar todos** (Dominio, Privado, Público) → Siguiente
6. Nombre: **Node Backend - Puerto 5000** → Finalizar

---

## ✅ PASO 4: Verificar IP pública es accesible

**Probar desde tu navegador:**
```
http://190.102.248.163:5000/api/ping
```

**Deberías ver:**
```json
{
  "success": true,
  "message": "Backend funcionando correctamente",
  "timestamp": "2025-10-11T..."
}
```

**Si NO funciona:**
- Tu router no está reenviando el puerto 5000
- Tu IP pública cambió
- Tu ISP bloquea el puerto 5000

### Verificar IP pública actual:
```
https://www.cual-es-mi-ip.net/
```

Si tu IP cambió, debes actualizar:
1. La URL del webhook en Twilio
2. Los CORS en `server.js` si es necesario

---

## ✅ PASO 5: Verificar Webhook configurado en Twilio

### Configuración correcta:

1. Ve a: https://console.twilio.com/
2. **Messaging** → **Try it out** → **Send a WhatsApp message**
3. Click en **Sandbox settings**
4. **When a message comes in:**
   ```
   http://190.102.248.163:5000/api/cabanas/whatsapp/webhook/incoming
   ```
5. Método: **POST**
6. Click **Save**

**⚠️ COMÚN ERROR:**
- Usar `https://` en lugar de `http://`
- Olvidar el puerto `:5000`
- Ruta incorrecta (debe ser `/api/cabanas/whatsapp/webhook/incoming`)

---

## ✅ PASO 6: Unirse al Sandbox de WhatsApp

### Primera vez:

1. En Twilio Sandbox, verás un código como: `join ABC-DEF`
2. Desde tu WhatsApp personal, envía ese código al número: `+1 415 523 8886`
3. Deberías recibir: **"Joined sandbox successfully!"**

**Si ya te uniste antes:**
- Envía: `join ABC-DEF` nuevamente (el código puede cambiar)
- O envía: `hola` para probar si ya estás unido

---

## ✅ PASO 7: Probar envío manual desde backend

```bash
# En tu navegador o Postman
GET http://localhost:5000/api/cabanas/whatsapp/test
```

**Deberías recibir un WhatsApp con:**
```
🧪 Test de WhatsApp
Este es un mensaje de prueba...
```

**Si NO recibes el mensaje:**
- El Auth Token está mal
- No estás unido al sandbox
- El número de WhatsApp en .env está mal

---

## ✅ PASO 8: Revisar logs del backend

Cuando envíes un mensaje por WhatsApp, el backend debería mostrar:

```
📱 === MENSAJE WHATSAPP ENTRANTE ===
📞 De: +56942652034
💬 Mensaje: hola
🎯 Intent detectado: saludo
✅ Mensaje procesado correctamente
```

**Si NO ves nada:**
- El webhook NO está llegando al backend
- Revisa Paso 4 y 5

**Si ves errores:**
- Revisa el mensaje de error específico
- Puede ser problema de base de datos
- Puede ser problema de Twilio Auth Token

---

## ✅ PASO 9: Verificar tablas de base de datos existen

```sql
-- Ejecutar en SQL Server Management Studio
USE Beachsql;

SELECT name
FROM sys.tables
WHERE name IN ('cabanas', 'mensajes_whatsapp', 'plantillas_respuestas', 'reservas_cabanas');
```

**Deberías ver las 4 tablas.**

**Si NO existen:**
```bash
# Ejecutar el script SQL
backend/database/cabanas_sistema_completo.sql
```

---

## ✅ PASO 10: Test completo paso a paso

### 1. Backend corriendo ✅
```bash
cd backend
npm start
```

### 2. Enviar mensaje de prueba ✅
```
Desde tu WhatsApp → +1 415 523 8886
Mensaje: "hola"
```

### 3. Ver respuesta automática ✅
```
Deberías recibir:
¡Hola! 👋 Bienvenido a *Cabañas Beach*.

¿En qué puedo ayudarte?

1️⃣ Ver disponibilidad de cabañas
2️⃣ Hacer una reserva
3️⃣ Ver datos para transferencia
4️⃣ Hablar con un ejecutivo
```

### 4. Probar disponibilidad ✅
```
Envía: "1"
```

Deberías recibir la lista de 10 cabañas con precios.

---

## 🐛 ERRORES COMUNES Y SOLUCIONES

### Error: "Authentication Error" de Twilio

**Causa:** Auth Token incorrecto en `.env`

**Solución:**
1. Ve a https://console.twilio.com/
2. Copia el Auth Token correcto
3. Pégalo en `backend/.env`
4. Reinicia el backend (`Ctrl+C` y `npm start`)

---

### Error: "Invalid phone number"

**Causa:** Formato de número incorrecto

**Solución:**
- Debe ser formato: `whatsapp:+14155238886`
- Incluir `whatsapp:` al inicio
- Incluir `+` antes del código de país

---

### Error: Webhook no recibe mensajes

**Causa:** Firewall bloqueando, IP incorrecta, o webhook mal configurado

**Solución:**
1. Verifica puerto 5000 abierto (Paso 3)
2. Verifica IP pública actual (Paso 4)
3. Verifica webhook en Twilio (Paso 5)
4. Reinicia el backend

---

### Error: Backend recibe webhook pero no responde

**Causa:** Error en el código del controlador o base de datos

**Solución:**
1. Revisa logs del backend (consola)
2. Verifica tablas existen (Paso 9)
3. Revisa errores específicos en consola

---

### Error: "Cannot find module 'twilio'"

**Causa:** Twilio no está instalado

**Solución:**
```bash
cd backend
npm install twilio
```

---

## 📊 DIAGNÓSTICO RÁPIDO

| Síntoma | Causa probable | Solución |
|---------|---------------|----------|
| Backend no inicia | Error en código o dependencias | Revisar consola, instalar dependencias |
| "Authentication Error" | Auth Token incorrecto | Actualizar .env con token correcto |
| No recibo mensajes de prueba | No estás en sandbox | Enviar `join ABC-DEF` al WhatsApp |
| Webhook no llega | Puerto bloqueado o IP incorrecta | Abrir puerto 5000, verificar IP |
| Backend recibe pero no responde | Error en BD o código | Revisar logs, verificar tablas |
| "Invalid phone number" | Formato incorrecto | Usar formato `whatsapp:+...` |

---

## 🔍 COMANDOS DE DIAGNÓSTICO

### Verificar backend funcionando:
```bash
curl http://localhost:5000/api/ping
```

### Verificar test de cabañas:
```bash
curl http://localhost:5000/api/test-cabanas
```

### Verificar test de WhatsApp:
```bash
curl http://localhost:5000/api/cabanas/whatsapp/test
```

### Ver logs en tiempo real:
```bash
cd backend
npm start
# Dejar corriendo y enviar mensajes por WhatsApp
# Los logs aparecerán en esta consola
```

---

## 📞 CONTACTO DE SOPORTE

Si después de seguir todos estos pasos aún no funciona:

1. Revisa los logs del backend (consola donde corre `npm start`)
2. Copia el mensaje de error específico
3. Verifica que todas las tablas de base de datos existen
4. Asegúrate de que el Auth Token es el correcto

---

## ✅ RESUMEN RÁPIDO

```bash
# 1. Backend corriendo
cd backend
npm start

# 2. .env configurado con Auth Token real

# 3. Puerto 5000 abierto en firewall

# 4. IP pública accesible (http://190.102.248.163:5000/api/ping)

# 5. Webhook configurado en Twilio:
#    http://190.102.248.163:5000/api/cabanas/whatsapp/webhook/incoming

# 6. Unido al sandbox (enviar "join ABC-DEF")

# 7. Probar enviando "hola" por WhatsApp al +1 415 523 8886

# 8. Deberías recibir respuesta automática
```

---

**¡Buena suerte! 🚀**
