# 🎯 INSTRUCCIONES FINALES - Sistema de Cabañas Actualizado

## ✅ CAMBIOS REALIZADOS

### 1. **Precios actualizados con temporadas**

Se actualizaron todos los precios según las temporadas:

**📅 TEMPORADA BAJA** (1 marzo - 30 noviembre):
- Departamentos A y B: $59.000
- Cabaña 1: $180.000
- Cabañas 2, 3, 4: $79.000
- Cabaña 5: $105.000
- Cabaña 6: $120.000
- Cabañas 7 y 8: $140.000

**🔥 TEMPORADA ALTA** (1 diciembre - 28 febrero):
- Departamentos A y B: $65.000
- Cabaña 1: $190.000
- Cabañas 2, 3, 4: $100.000
- Cabaña 5: $110.000
- Cabaña 6: $130.000
- Cabañas 7 y 8: $160.000

**🤖 Detección automática:**
- El sistema detecta automáticamente la temporada según la fecha actual
- Los mensajes de WhatsApp muestran el precio correcto según la temporada

---

### 2. **Menú de navegación actualizado**

Se agregó el item "Cabañas" al menú lateral del dashboard:
- ✅ Icono de cabaña (cottage)
- ✅ Ruta: `/admin/cabanas`
- ✅ Título: "Gestión de Cabañas y Reservas"

---

### 3. **Sistema de permisos creado**

Se creó el script SQL para agregar permisos:
- **Archivo:** `backend/database/agregar_permisos_cabanas.sql`
- Crea el módulo de Cabañas en la base de datos
- Asigna permisos completos a Super Admin y Admin

---

### 4. **Mensajería WhatsApp con precios por temporada**

El bot de WhatsApp ahora:
- ✅ Detecta automáticamente la temporada
- ✅ Muestra el precio correcto según temporada
- ✅ Indica si es TEMPORADA ALTA o TEMPORADA BAJA
- ✅ Soporta las 10 cabañas (1-8 + Departamentos A y B)

---

## 🚀 PASOS QUE DEBES SEGUIR AHORA

### **PASO 1: Ejecutar script de base de datos principal**

```sql
-- Ejecutar en SQL Server Management Studio
-- Archivo: backend/database/cabanas_sistema_completo.sql
```

**Esto creará:**
- 10 cabañas con precios actualizados
- Tablas de reservas, mensajes, etc.
- Datos de transferencia

---

### **PASO 2: Ejecutar script de permisos**

```sql
-- Ejecutar en SQL Server Management Studio
-- Archivo: backend/database/agregar_permisos_cabanas.sql
```

**Esto creará:**
- Módulo "Cabañas" en la base de datos
- Permisos para Super Admin (perfil_id = 1)
- Permisos para Admin (perfil_id = 2) si existe

**⚠️ MUY IMPORTANTE:** Este script resuelve el problema de "Acceso Restringido" cuando entras como Super Admin.

---

### **PASO 3: Verificar archivo .env**

**Ubicación:** `backend/.env`

**Debe contener:**
```env
TWILIO_ACCOUNT_SID=ACd8e5a39aea566708a6f5eb37a4f27352
TWILIO_AUTH_TOKEN=tu_auth_token_real_aqui
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

**Obtener Auth Token:**
1. Ve a: https://console.twilio.com/
2. En el dashboard principal, busca "Auth Token"
3. Click en "Show" para ver el token
4. Cópialo y pégalo en el archivo `.env`

**⚠️ NO uses:** `TU_AUTH_TOKEN_AQUI` (es un placeholder)

---

### **PASO 4: Reiniciar backend**

```bash
# Detener el backend si está corriendo (Ctrl + C)

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

---

### **PASO 5: Reiniciar frontend**

```bash
# Detener el frontend si está corriendo (Ctrl + C)

# En la carpeta frontend
cd frontend
npm start
```

---

### **PASO 6: Verificar acceso al módulo de Cabañas**

1. Abre el navegador: `http://localhost:3000`
2. Inicia sesión como **Super Admin**
3. En el menú lateral, deberías ver: **"Cabañas"** con ícono de cabaña
4. Click en "Cabañas"
5. Deberías ver la página con 3 tabs:
   - Tab Cabañas: Lista de 10 cabañas
   - Tab Reservas
   - Tab WhatsApp

**Si aún dice "Acceso Restringido":**
- Verifica que ejecutaste el script `agregar_permisos_cabanas.sql`
- Cierra sesión y vuelve a iniciar sesión
- Verifica en la base de datos que existe el permiso:

```sql
SELECT p.nombre, m.nombre, pu.*
FROM permisos_usuario pu
JOIN perfiles p ON pu.perfil_id = p.id
JOIN modulos m ON pu.modulo_id = m.id
WHERE m.ruta = '/admin/cabanas' AND p.id = 1;
```

---

### **PASO 7: Configurar WhatsApp (si aún no funciona)**

**Sigue la guía completa en:**
```
SOLUCION_PROBLEMAS_WHATSAPP.md
```

**Pasos básicos:**

1. **Abrir puerto 5000 en Firewall** (Windows):
   - `Win + R` → `wf.msc`
   - Crear regla de entrada para puerto 5000

2. **Configurar webhook en Twilio:**
   - URL: `http://190.102.248.163:5000/api/cabanas/whatsapp/webhook/incoming`
   - Método: POST

3. **Unirse al Sandbox:**
   - Enviar `join ABC-DEF` al +1 415 523 8886

4. **Probar:**
   - Enviar "hola" por WhatsApp
   - Deberías recibir el menú automático

---

## 📊 VERIFICACIÓN COMPLETA

### ✅ Checklist de verificación:

- [ ] Script `cabanas_sistema_completo.sql` ejecutado
- [ ] Script `agregar_permisos_cabanas.sql` ejecutado
- [ ] Archivo `.env` con Auth Token correcto
- [ ] Backend reiniciado sin errores
- [ ] Frontend reiniciado sin errores
- [ ] Menú "Cabañas" visible en dashboard
- [ ] Acceso a `/admin/cabanas` funcionando (sin "Acceso Restringido")
- [ ] 10 cabañas visibles en el sistema
- [ ] Puerto 5000 abierto en firewall
- [ ] Webhook configurado en Twilio
- [ ] Unido al Sandbox de WhatsApp
- [ ] Mensajes automáticos funcionando

---

## 🐛 SI ALGO NO FUNCIONA

### Problema 1: "Acceso Restringido" en `/admin/cabanas`

**Solución:**
1. Ejecuta `backend/database/agregar_permisos_cabanas.sql`
2. Cierra sesión en el frontend
3. Inicia sesión nuevamente como Super Admin

---

### Problema 2: WhatsApp no responde

**Solución:**
1. Lee `SOLUCION_PROBLEMAS_WHATSAPP.md` completo
2. Verifica que el Auth Token en `.env` es correcto
3. Verifica que el backend está corriendo
4. Verifica logs del backend al enviar mensaje

---

### Problema 3: No aparece "Cabañas" en el menú

**Solución:**
1. Verifica que ejecutaste `agregar_permisos_cabanas.sql`
2. Reinicia el frontend (`Ctrl+C` y `npm start`)
3. Borra la caché del navegador (Ctrl+Shift+R)
4. Cierra sesión e inicia sesión nuevamente

---

### Problema 4: Backend no inicia

**Solución:**
```bash
cd backend
npm install
npm start
```

Si hay errores:
- Revisa el mensaje de error en consola
- Puede ser problema de base de datos
- Puede ser problema de dependencias

---

## 📁 ARCHIVOS IMPORTANTES

### Scripts SQL:
- `backend/database/cabanas_sistema_completo.sql` - Crear tablas y datos
- `backend/database/agregar_permisos_cabanas.sql` - Crear permisos

### Documentación:
- `INSTRUCCIONES_FINALES.md` - Este archivo (instrucciones paso a paso)
- `SOLUCION_PROBLEMAS_WHATSAPP.md` - Guía completa de troubleshooting WhatsApp
- `CAMBIOS_REALIZADOS.md` - Lista de todos los cambios del sistema

### Código:
- `backend/controllers/twilioWhatsAppControllerV2.js` - Lógica de mensajería
- `frontend/src/layouts/DashboardLayout.jsx` - Menú actualizado
- `frontend/src/pages/AdminCabanasPage.jsx` - Página de administración
- `backend/.env` - Configuración de Twilio

---

## 🎯 RESULTADO FINAL

Después de seguir todos los pasos, deberías tener:

✅ **Sistema completo de 10 cabañas:**
- 8 cabañas normales (numeradas 1-8)
- 2 departamentos (9 = Departamento A, 10 = Departamento B)

✅ **Precios por temporada:**
- Temporada BAJA (marzo-noviembre)
- Temporada ALTA (diciembre-febrero)
- Detección automática en WhatsApp

✅ **Acceso desde el dashboard:**
- Menú "Cabañas" visible
- Sin restricciones para Super Admin
- Panel con 3 tabs funcionales

✅ **WhatsApp funcionando:**
- Mensajes automáticos
- Mostrar disponibilidad de 10 cabañas
- Precios según temporada
- Selección de cabaña por número (1-10)
- Envío de datos de transferencia

---

## 📞 CONTACTO

Si tienes dudas después de seguir todos los pasos:

1. Revisa primero `SOLUCION_PROBLEMAS_WHATSAPP.md`
2. Verifica que ejecutaste ambos scripts SQL
3. Verifica logs del backend (consola donde corre `npm start`)
4. Asegúrate de tener el Auth Token correcto en `.env`

---

**¡Éxito con tu sistema de Cabañas! 🏡🚀**
