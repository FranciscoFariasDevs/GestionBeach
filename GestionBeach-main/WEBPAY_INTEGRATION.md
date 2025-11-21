# 💳 Integración de Webpay Plus - Transbank

## 📋 Resumen

Se ha implementado la integración completa de **Webpay Plus** de Transbank para procesar pagos online en las reservas de cabañas.

## ✅ Lo que se ha implementado

### Backend
- ✅ SDK oficial de Transbank instalado (`transbank-sdk`)
- ✅ Configuración automática para desarrollo/producción
- ✅ Controller completo con endpoints:
  - `POST /api/webpay/crear` - Crear transacción
  - `POST/GET /api/webpay/confirmar` - Callback de confirmación
  - `GET /api/webpay/transaccion/:token` - Consultar estado
  - `GET /api/webpay/reserva/:reserva_id/transacciones` - Historial
- ✅ Tabla `transacciones_webpay` en BD
- ✅ Rutas registradas en `server.js`

### Frontend
- ✅ Página de pago exitoso (`/pago-exitoso`)
- ✅ Página de error en pago (`/pago-error`)
- ✅ Rutas públicas configuradas en `App.js`
- ✅ Componente de integración en `ReservaCabanasPage` (pendiente botón)

## 🔧 Configuración Inicial

### 1. Ejecutar script SQL

Ejecuta el script en tu base de datos:

```bash
backend/scripts/create_transacciones_webpay.sql
```

Este script crea:
- Tabla `transacciones_webpay`
- Índices optimizados
- Foreign keys

### 2. Modo Desarrollo (Ambiente de Integración)

Por defecto, el sistema usa las credenciales de integración de Transbank.

**No requiere configuración adicional para testing.**

### 3. Modo Producción (Cuando recibas las credenciales)

Crea o actualiza el archivo `.env` en `backend/`:

```env
NODE_ENV=production

# Credenciales de Webpay (PRODUCCIÓN)
WEBPAY_COMMERCE_CODE=tu_codigo_comercio_real
WEBPAY_API_KEY=tu_api_key_real

# URLs de tu aplicación
WEBPAY_BASE_URL=https://api.beach.cl
FRONTEND_URL=https://reservas.beach.cl
```

## 🚀 Cómo Funciona

### Flujo Completo del Pago

```
1. Usuario completa reserva → Click en "Pagar con Webpay"
                               ↓
2. Frontend llama → POST /api/webpay/crear
                    Body: { reserva_id, monto, descripcion }
                               ↓
3. Backend crea transacción → Guarda en BD
                               ↓
4. Backend retorna → { token, url }
                               ↓
5. Frontend redirige → usuario a Webpay (url + token)
                               ↓
6. Usuario paga en Webpay
                               ↓
7. Webpay redirige → POST /api/webpay/confirmar?token_ws=XXX
                               ↓
8. Backend confirma transacción con Transbank
                               ↓
9. Backend actualiza → reserva como PAGADA en BD
                               ↓
10. Backend redirige → /pago-exitoso (éxito) o /pago-error (fallo)
```

### Estructura de la Transacción

```sql
transacciones_webpay:
- id (PK)
- reserva_id (FK → reservas_cabanas)
- buy_order (único, formato: RESERVA-{id}-{timestamp})
- session_id (identificador de sesión)
- token (token único de Webpay)
- monto (decimal)
- estado (INICIADO | APROBADO | RECHAZADO)
- authorization_code (código de autorización del banco)
- payment_type_code (tipo de pago: VD, VN, etc)
- response_code (código de respuesta)
- fecha_creacion
- fecha_confirmacion
```

## 📝 Próximos Pasos (Para Completar)

### 1. Modificar el botón "Confirmar Reserva"

En `ReservaCabanasPage.jsx`, reemplazar el botón actual con:

```javascript
const handlePagarConWebpay = async () => {
  try {
    setLoading(true);

    // Crear la reserva primero
    const reservaResponse = await api.post('/cabanas/reservas', formData);
    const reservaId = reservaResponse.data.data.id;

    // Crear transacción de pago
    const pagoResponse = await api.post('/webpay/crear', {
      reserva_id: reservaId,
      monto: total, // El total calculado (con descuento si aplica)
      descripcion: `Reserva Cabaña ${selectedCabana.nombre}`
    });

    // Redirigir a Webpay
    const { token, url } = pagoResponse.data.data;

    // Crear formulario para redirección (método POST)
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = url;

    const tokenInput = document.createElement('input');
    tokenInput.type = 'hidden';
    tokenInput.name = 'token_ws';
    tokenInput.value = token;

    form.appendChild(tokenInput);
    document.body.appendChild(form);
    form.submit();

  } catch (error) {
    console.error('Error al iniciar pago:', error);
    enqueueSnackbar('Error al procesar el pago', { variant: 'error' });
  } finally {
    setLoading(false);
  }
};
```

### 2. Agregar botón en el Stepper (Paso 3 - Resumen y Pago)

Reemplazar el botón "Confirmar Reserva" por un botón de Webpay con el logo:

```jsx
<Button
  variant="contained"
  size="large"
  fullWidth
  onClick={handlePagarConWebpay}
  disabled={loading || !validarFormulario()}
  sx={{
    py: 2,
    background: 'linear-gradient(135deg, #FF6B00 0%, #FF9900 100%)',
    color: 'white',
    fontWeight: 900,
    fontSize: '1.1rem',
    borderRadius: 2,
    boxShadow: '0 8px 24px rgba(255, 107, 0, 0.4)',
    '&:hover': {
      background: 'linear-gradient(135deg, #FF5500 0%, #FF8800 100%)',
      boxShadow: '0 12px 32px rgba(255, 107, 0, 0.6)',
    }
  }}
>
  {loading ? (
    <CircularProgress size={24} color="inherit" />
  ) : (
    <>
      💳 Pagar con Webpay
    </>
  )}
</Button>
```

## 🧪 Testing en Desarrollo

### Tarjetas de Prueba Transbank

**Tarjeta Redcompra (Débito):**
- RUT: `11.111.111-1`
- Tarjeta: `4051885600446623`
- CVV: `123`
- Clave: `123` (cualquier combinación de 4 dígitos)

**Tarjeta de Crédito Visa:**
- Número: `4051885600446623`
- CVV: `123`
- Fecha: Cualquier fecha futura

**Resultado:** Todas las transacciones en modo integración se aprueban automáticamente.

### URLs de Testing

- **Backend (desarrollo)**: `http://localhost:5000`
- **Frontend (desarrollo)**: `http://localhost:3000`
- **Callback URL**: `http://localhost:5000/api/webpay/confirmar`

## 📚 Documentación Transbank

- **Portal Desarrolladores**: https://www.transbankdevelopers.cl/
- **API Reference**: https://www.transbankdevelopers.cl/documentacion/webpay-plus
- **SDK Node.js**: https://github.com/TransbankDevelopers/transbank-sdk-nodejs

## ⚠️ Consideraciones Importantes

1. **Montos**: Webpay requiere montos enteros (sin decimales), se redondea automáticamente
2. **Buy Order**: Debe ser único por transacción
3. **URLs de retorno**: Deben ser accesibles públicamente en producción
4. **Timeout**: Las transacciones expiran después de 10 minutos
5. **Certificados SSL**: Obligatorios en producción
6. **IP Whitelist**: Transbank puede requerir whitelist de IPs en producción

## 🔐 Seguridad

- ✅ Tokens únicos por transacción
- ✅ Validación de monto en backend
- ✅ Confirmación con Transbank antes de aprobar
- ✅ Estados de transacción en BD
- ✅ Logs de todas las operaciones
- ✅ Manejo de errores robusto

## 🐛 Troubleshooting

### Error: "No se pudo crear transacción"
- Verificar que el servicio de Transbank esté disponible
- Revisar logs del backend
- Verificar que la reserva existe

### Error: "Token no encontrado"
- La transacción puede haber expirado (10 min)
- Verificar que el token se guardó en BD

### Pago rechazado en producción
- Verificar saldo en la tarjeta
- Confirmar que las credenciales de producción son correctas
- Revisar logs de Transbank

## 📞 Soporte

Para problemas con credenciales o configuración de producción:
- **Email**: soporte@transbank.cl
- **Teléfono**: 600 638 6380
- **Portal**: https://publico.transbank.cl/

## ✅ Checklist de Implementación

- [x] SDK instalado
- [x] Configuración creada
- [x] Endpoints implementados
- [x] Tabla en BD creada
- [x] Páginas de retorno creadas
- [ ] **Botón de pago integrado en frontend**
- [ ] **Testing con tarjetas de prueba**
- [ ] Credenciales de producción configuradas
- [ ] SSL configurado en producción
- [ ] URLs públicas configuradas
- [ ] Testing en producción

---

💡 **Nota**: El sistema está listo para usar en modo desarrollo. Para producción, solo necesitas las credenciales reales y configurar las URLs públicas.
