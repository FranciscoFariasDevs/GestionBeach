// backend/controllers/twilioWhatsAppControllerV4_SIMPLE.js
// FLUJO MEJORADO: Catálogo → Fechas → Disponibilidad → Reserva

const { sql, poolPromise } = require('../config/db');

// Configuración
const accountSid = process.env.TWILIO_ACCOUNT_SID || 'ACd8e5a39aea566708a6f5eb37a4f27352';
const authToken = process.env.TWILIO_AUTH_TOKEN || '9d41d638403d9299559459f9b3f61f3a';
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
const publicURL = process.env.PUBLIC_URL || 'http://localhost:5000';

const twilio = require('twilio');
const client = twilio(accountSid, authToken);
const fs = require('fs');
const path = require('path');

// Estados
const ESTADOS = {
  INICIAL: 'inicial',
  PIDIENDO_FECHAS: 'pidiendo_fechas',
  FECHA_INICIO_INGRESADA: 'fecha_inicio_ingresada',
  ELIGIENDO_CABANA: 'eligiendo_cabana',
  PIDIENDO_DATOS: 'pidiendo_datos',
  DATOS_NOMBRE: 'datos_nombre',
  DATOS_TELEFONO: 'datos_telefono',
  DATOS_EMAIL: 'datos_email',
  CONFIRMANDO: 'confirmando',
};

// ============================================
// WEBHOOK
// ============================================
exports.webhookIncoming = async (req, res) => {
  try {
    const { MessageSid, From, To, Body } = req.body;
    const telefonoCliente = From.replace('whatsapp:', '');
    const mensaje = (Body || '').trim();

    console.log(`\n📱 Mensaje de ${telefonoCliente}: ${mensaje}`);

    const pool = await poolPromise;

    // Guardar mensaje entrante
    await pool.request()
      .input('sid_twilio', sql.VarChar, MessageSid)
      .input('telefono_cliente', sql.VarChar, telefonoCliente)
      .input('telefono_negocio', sql.VarChar, To.replace('whatsapp:', ''))
      .input('direccion', sql.VarChar, 'entrante')
      .input('mensaje', sql.Text, mensaje)
      .input('tipo_mensaje', sql.VarChar, 'texto')
      .input('estado', sql.VarChar, 'recibido')
      .query(`
        INSERT INTO dbo.mensajes_whatsapp (
          sid_twilio, telefono_cliente, telefono_negocio, direccion,
          mensaje, tipo_mensaje, estado, fecha_creacion
        )
        VALUES (
          @sid_twilio, @telefono_cliente, @telefono_negocio, @direccion,
          @mensaje, @tipo_mensaje, @estado, GETDATE()
        )
      `);

    // Procesar mensaje
    await procesarMensaje(mensaje, telefonoCliente, To);

    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);

  } catch (error) {
    console.error('❌ Error:', error);
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
  }
};

// ============================================
// PROCESADOR PRINCIPAL
// ============================================
const procesarMensaje = async (mensaje, telefono, telefonoNegocio) => {
  const mensajeLower = mensaje.toLowerCase().trim();
  const pool = await poolPromise;

  // Obtener estado
  const estadoResult = await pool.request()
    .input('telefono', sql.VarChar, telefono)
    .query('SELECT estado_actual, datos_temporales FROM dbo.estados_conversacion_whatsapp WHERE telefono_cliente = @telefono');

  let estado = ESTADOS.INICIAL;
  let datos = {};

  if (estadoResult.recordset.length > 0) {
    estado = estadoResult.recordset[0].estado_actual;
    try {
      datos = JSON.parse(estadoResult.recordset[0].datos_temporales || '{}');
    } catch (e) {
      datos = {};
    }
  }

  // Comandos especiales
  if (mensajeLower === 'menu' || mensajeLower === 'cancelar' || mensajeLower === 'reiniciar') {
    await resetearEstado(telefono);
    await enviarMensajeTexto(telefono, telefonoNegocio, mensajeBienvenida());
    return;
  }

  // Procesar según estado
  switch (estado) {
    case ESTADOS.INICIAL:
      await manejarInicial(mensajeLower, telefono, telefonoNegocio);
      break;

    case ESTADOS.PIDIENDO_FECHAS:
      await manejarFechaInicio(mensaje, telefono, telefonoNegocio, datos);
      break;

    case ESTADOS.FECHA_INICIO_INGRESADA:
      await manejarFechaFin(mensaje, telefono, telefonoNegocio, datos);
      break;

    case ESTADOS.ELIGIENDO_CABANA:
      await manejarEleccionCabana(mensaje, telefono, telefonoNegocio, datos);
      break;

    case ESTADOS.DATOS_NOMBRE:
      await manejarNombre(mensaje, telefono, telefonoNegocio, datos);
      break;

    case ESTADOS.DATOS_TELEFONO:
      await manejarTelefono(mensaje, telefono, telefonoNegocio, datos);
      break;

    case ESTADOS.DATOS_EMAIL:
      await manejarEmail(mensaje, telefono, telefonoNegocio, datos);
      break;

    case ESTADOS.CONFIRMANDO:
      await manejarConfirmacion(mensajeLower, telefono, telefonoNegocio, datos);
      break;

    default:
      await enviarMensajeTexto(telefono, telefonoNegocio, mensajeBienvenida());
  }
};

// ============================================
// MANEJADORES
// ============================================

const manejarInicial = async (mensajeLower, telefono, telefonoNegocio) => {
  if (mensajeLower.includes('catalogo') || mensajeLower.includes('catálogo') || mensajeLower.includes('ver cabañas') || mensajeLower === '1' || mensajeLower === 'hola') {
    await mostrarCatalogo(telefono, telefonoNegocio);
  } else if (mensajeLower.includes('reservar') || mensajeLower === '2') {
    await iniciarReserva(telefono, telefonoNegocio);
  } else if (mensajeLower.includes('pago') || mensajeLower === '3') {
    await enviarMensajeTexto(telefono, telefonoNegocio, mensajeDatosPago());
  } else {
    await enviarMensajeTexto(telefono, telefonoNegocio, mensajeBienvenida());
  }
};

const mostrarCatalogo = async (telefono, telefonoNegocio) => {
  const pool = await poolPromise;

  // Obtener cabañas
  const cabanas = await pool.request().query(`
    SELECT id, numero, nombre, capacidad_personas, numero_habitaciones, numero_banos,
           precio_noche, precio_fin_semana, descripcion
    FROM dbo.cabanas
    ORDER BY numero ASC
  `);

  await enviarMensajeTexto(telefono, telefonoNegocio, '🏖️ *CATÁLOGO DE CABAÑAS*\n\nTe enviaré las fotos de cada cabaña...');

  // Enviar foto de cada cabaña (una por una)
  for (const cabana of cabanas.recordset) {
    const imagenUrl = obtenerImagenCabana(cabana.numero, cabana.nombre);

    const temporadaAlta = esTemporadaAlta();
    const precio = temporadaAlta ? cabana.precio_fin_semana : cabana.precio_noche;

    let texto = `🏡 *${cabana.nombre}*\n\n`;
    texto += `${cabana.descripcion || 'Hermosa cabaña con todas las comodidades'}\n\n`;
    texto += `👥 Capacidad: ${cabana.capacidad_personas} personas\n`;
    texto += `🛏️ Habitaciones: ${cabana.numero_habitaciones || 'N/A'}\n`;
    texto += `🚿 Baños: ${cabana.numero_banos || 'N/A'}\n`;
    texto += `💰 Precio: $${precio.toLocaleString('es-CL')}/noche\n`;
    texto += `📅 ${temporadaAlta ? 'TEMPORADA ALTA' : 'TEMPORADA BAJA'}`;

    if (imagenUrl) {
      await enviarMensajeConImagen(telefono, telefonoNegocio, texto, imagenUrl);
    } else {
      await enviarMensajeTexto(telefono, telefonoNegocio, texto);
    }

    // Esperar un poco entre mensajes
    await sleep(1000);
  }

  await enviarMensajeTexto(telefono, telefonoNegocio, '✨ *¿Quieres hacer una reserva?*\n\nEscribe *RESERVAR* o el número *2*');
  await actualizarEstado(telefono, ESTADOS.INICIAL, {});
};

const iniciarReserva = async (telefono, telefonoNegocio) => {
  const texto = `📝 *NUEVA RESERVA*\n\n*Paso 1 de 5: Fechas*\n\n¿Cuándo quieres hospedarte?\n\nPor favor ingresa la *fecha de CHECK-IN*\n\nFormato: DD/MM/AAAA\nEjemplo: 25/12/2024`;

  await enviarMensajeTexto(telefono, telefonoNegocio, texto);
  await actualizarEstado(telefono, ESTADOS.PIDIENDO_FECHAS, {});
};

const manejarFechaInicio = async (mensaje, telefono, telefonoNegocio, datos) => {
  const fecha = parsearFecha(mensaje);

  if (!fecha) {
    await enviarMensajeTexto(telefono, telefonoNegocio, '❌ Fecha inválida.\n\nPor favor usa el formato: DD/MM/AAAA\nEjemplo: 25/12/2024');
    return;
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (fecha < hoy) {
    await enviarMensajeTexto(telefono, telefonoNegocio, '❌ La fecha no puede ser en el pasado.\n\nPor favor ingresa una fecha futura.');
    return;
  }

  datos.fecha_inicio = fecha.toISOString().split('T')[0];

  await enviarMensajeTexto(telefono, telefonoNegocio, `✅ Check-in: ${formatearFecha(fecha)}\n\n*Paso 2 de 5: Fecha de salida*\n\n¿Cuándo quieres hacer CHECK-OUT?\n\nFormato: DD/MM/AAAA\nEjemplo: 28/12/2024`);
  await actualizarEstado(telefono, ESTADOS.FECHA_INICIO_INGRESADA, datos);
};

const manejarFechaFin = async (mensaje, telefono, telefonoNegocio, datos) => {
  const fecha = parsearFecha(mensaje);

  if (!fecha) {
    await enviarMensajeTexto(telefono, telefonoNegocio, '❌ Fecha inválida.\n\nPor favor usa el formato: DD/MM/AAAA\nEjemplo: 28/12/2024');
    return;
  }

  const fechaInicio = new Date(datos.fecha_inicio);
  fechaInicio.setHours(0, 0, 0, 0);
  fecha.setHours(0, 0, 0, 0);

  if (fecha <= fechaInicio) {
    await enviarMensajeTexto(telefono, telefonoNegocio, '❌ La fecha de salida debe ser posterior a la de entrada.\n\nPor favor ingresa una fecha válida.');
    return;
  }

  datos.fecha_fin = fecha.toISOString().split('T')[0];
  const noches = Math.ceil((fecha - fechaInicio) / (1000 * 60 * 60 * 24));
  datos.cantidad_noches = noches;

  // Mostrar disponibilidad
  await mostrarDisponibilidad(telefono, telefonoNegocio, datos);
};

const mostrarDisponibilidad = async (telefono, telefonoNegocio, datos) => {
  const pool = await poolPromise;

  // Obtener cabañas disponibles
  const cabanas = await pool.request()
    .input('fecha_inicio', sql.Date, datos.fecha_inicio)
    .input('fecha_fin', sql.Date, datos.fecha_fin)
    .query(`
      SELECT c.id, c.numero, c.nombre, c.capacidad_personas,
             c.precio_noche, c.precio_fin_semana
      FROM dbo.cabanas c
      WHERE c.estado = 'disponible'
        AND NOT EXISTS (
          SELECT 1 FROM dbo.bloqueos_cabanas b
          WHERE b.cabana_id = c.id
            AND (
              (b.fecha_inicio <= @fecha_fin AND b.fecha_fin >= @fecha_inicio)
            )
        )
      ORDER BY c.numero ASC
    `);

  if (cabanas.recordset.length === 0) {
    await enviarMensajeTexto(telefono, telefonoNegocio, '❌ Lo sentimos, no hay cabañas disponibles para esas fechas.\n\nEscribe "menu" para volver al inicio.');
    await resetearEstado(telefono);
    return;
  }

  const temporadaAlta = esTemporadaAlta(new Date(datos.fecha_inicio));
  const nombreTemporada = temporadaAlta ? '🔥 TEMPORADA ALTA' : '🌿 TEMPORADA BAJA';

  let texto = `✅ *CABAÑAS DISPONIBLES*\n\n`;
  texto += `📅 ${formatearFecha(new Date(datos.fecha_inicio))} al ${formatearFecha(new Date(datos.fecha_fin))}\n`;
  texto += `🌙 ${datos.cantidad_noches} noche(s)\n`;
  texto += `${nombreTemporada}\n\n`;

  cabanas.recordset.forEach(c => {
    const precio = temporadaAlta ? c.precio_fin_semana : c.precio_noche;
    const precioTotal = precio * datos.cantidad_noches;

    texto += `*${c.numero}*. ${c.nombre}\n`;
    texto += `   👥 ${c.capacidad_personas} personas\n`;
    texto += `   💵 $${precio.toLocaleString('es-CL')}/noche\n`;
    texto += `   🎯 Total: $${precioTotal.toLocaleString('es-CL')}\n\n`;
  });

  texto += `✏️ *Paso 3 de 5: Elige tu cabaña*\n\n`;
  texto += `Escribe el *número* de la cabaña que deseas\n`;
  texto += `Ejemplo: 3`;

  await enviarMensajeTexto(telefono, telefonoNegocio, texto);
  await actualizarEstado(telefono, ESTADOS.ELIGIENDO_CABANA, datos);
};

const manejarEleccionCabana = async (mensaje, telefono, telefonoNegocio, datos) => {
  const numero = parseInt(mensaje);

  if (isNaN(numero) || numero < 1 || numero > 10) {
    await enviarMensajeTexto(telefono, telefonoNegocio, '❌ Por favor escribe un número válido entre 1 y 10.');
    return;
  }

  const pool = await poolPromise;

  // Verificar disponibilidad
  const cabanaResult = await pool.request()
    .input('numero', sql.Int, numero)
    .input('fecha_inicio', sql.Date, datos.fecha_inicio)
    .input('fecha_fin', sql.Date, datos.fecha_fin)
    .query(`
      SELECT c.id, c.numero, c.nombre, c.capacidad_personas, c.precio_noche, c.precio_fin_semana
      FROM dbo.cabanas c
      WHERE c.numero = @numero
        AND c.estado = 'disponible'
        AND NOT EXISTS (
          SELECT 1 FROM dbo.bloqueos_cabanas b
          WHERE b.cabana_id = c.id
            AND (b.fecha_inicio <= @fecha_fin AND b.fecha_fin >= @fecha_inicio)
        )
    `);

  if (cabanaResult.recordset.length === 0) {
    await enviarMensajeTexto(telefono, telefonoNegocio, `❌ La cabaña ${numero} no está disponible para esas fechas.\n\nPor favor elige otra cabaña.`);
    return;
  }

  const cabana = cabanaResult.recordset[0];
  datos.cabana_id = cabana.id;
  datos.cabana_numero = cabana.numero;
  datos.cabana_nombre = cabana.nombre;
  datos.capacidad = cabana.capacidad_personas;

  // Obtener imagen y enviarla
  const imagenUrl = obtenerImagenCabana(cabana.numero, cabana.nombre);
  const temporadaAlta = esTemporadaAlta(new Date(datos.fecha_inicio));
  const precio = temporadaAlta ? cabana.precio_fin_semana : cabana.precio_noche;
  const precioTotal = precio * datos.cantidad_noches;

  let texto = `✅ *${cabana.nombre} seleccionada*\n\n`;
  texto += `📅 ${formatearFecha(new Date(datos.fecha_inicio))} al ${formatearFecha(new Date(datos.fecha_fin))}\n`;
  texto += `🌙 ${datos.cantidad_noches} noche(s)\n`;
  texto += `👥 Capacidad: ${cabana.capacidad_personas} personas\n`;
  texto += `💰 Total: $${precioTotal.toLocaleString('es-CL')}\n\n`;
  texto += `*Paso 4 de 5: Tus datos*\n\n`;
  texto += `Por favor ingresa tu *nombre completo*\n`;
  texto += `Ejemplo: Juan Pérez`;

  if (imagenUrl) {
    await enviarMensajeConImagen(telefono, telefonoNegocio, texto, imagenUrl);
  } else {
    await enviarMensajeTexto(telefono, telefonoNegocio, texto);
  }

  await actualizarEstado(telefono, ESTADOS.DATOS_NOMBRE, datos);
};

const manejarNombre = async (mensaje, telefono, telefonoNegocio, datos) => {
  if (mensaje.length < 3) {
    await enviarMensajeTexto(telefono, telefonoNegocio, '❌ Por favor ingresa tu nombre completo.\n\nEjemplo: Juan Pérez');
    return;
  }

  const partes = mensaje.trim().split(' ');
  datos.cliente_nombre = partes[0];
  datos.cliente_apellido = partes.slice(1).join(' ') || partes[0];

  await enviarMensajeTexto(telefono, telefonoNegocio, `✅ Nombre: ${mensaje}\n\nAhora ingresa tu *número de teléfono*\n\nEjemplo: +56912345678\no simplemente: 912345678`);
  await actualizarEstado(telefono, ESTADOS.DATOS_TELEFONO, datos);
};

const manejarTelefono = async (mensaje, telefono, telefonoNegocio, datos) => {
  let telefonoLimpio = mensaje.replace(/[^0-9+]/g, '');

  if (telefonoLimpio.length < 8) {
    await enviarMensajeTexto(telefono, telefonoNegocio, '❌ Teléfono inválido.\n\nPor favor ingresa un número válido.\nEjemplo: +56912345678');
    return;
  }

  if (!telefonoLimpio.startsWith('+')) {
    if (telefonoLimpio.startsWith('56')) {
      telefonoLimpio = '+' + telefonoLimpio;
    } else if (telefonoLimpio.startsWith('9')) {
      telefonoLimpio = '+56' + telefonoLimpio;
    }
  }

  datos.cliente_telefono = telefonoLimpio;

  await enviarMensajeTexto(telefono, telefonoNegocio, `✅ Teléfono: ${telefonoLimpio}\n\n*Paso 5 de 5: Email (opcional)*\n\nIngresa tu correo electrónico\n\nEjemplo: juan@ejemplo.com\n\nO escribe *"omitir"* si no tienes`);
  await actualizarEstado(telefono, ESTADOS.DATOS_EMAIL, datos);
};

const manejarEmail = async (mensaje, telefono, telefonoNegocio, datos) => {
  if (mensaje.toLowerCase() === 'omitir' || mensaje.toLowerCase() === 'no tengo') {
    datos.cliente_email = null;
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mensaje)) {
      await enviarMensajeTexto(telefono, telefonoNegocio, '❌ Email inválido.\n\nIngresa un email válido o escribe "omitir"');
      return;
    }
    datos.cliente_email = mensaje;
  }

  await mostrarResumen(telefono, telefonoNegocio, datos);
};

const mostrarResumen = async (telefono, telefonoNegocio, datos) => {
  const pool = await poolPromise;

  const cabanaResult = await pool.request()
    .input('id', sql.Int, datos.cabana_id)
    .query('SELECT precio_noche, precio_fin_semana FROM dbo.cabanas WHERE id = @id');

  const cabana = cabanaResult.recordset[0];
  const temporadaAlta = esTemporadaAlta(new Date(datos.fecha_inicio));
  const precio = temporadaAlta ? cabana.precio_fin_semana : cabana.precio_noche;
  const precioTotal = precio * datos.cantidad_noches;

  let texto = `📋 *RESUMEN DE TU RESERVA*\n\n`;
  texto += `🏡 Cabaña: *${datos.cabana_nombre}*\n`;
  texto += `📅 Check-in: ${formatearFecha(new Date(datos.fecha_inicio))}\n`;
  texto += `📅 Check-out: ${formatearFecha(new Date(datos.fecha_fin))}\n`;
  texto += `🌙 Noches: ${datos.cantidad_noches}\n`;
  texto += `👤 Nombre: ${datos.cliente_nombre} ${datos.cliente_apellido}\n`;
  texto += `📱 Teléfono: ${datos.cliente_telefono}\n`;
  if (datos.cliente_email) {
    texto += `📧 Email: ${datos.cliente_email}\n`;
  }
  texto += `\n💰 *PRECIO*\n`;
  texto += `📊 ${temporadaAlta ? 'TEMPORADA ALTA' : 'TEMPORADA BAJA'}\n`;
  texto += `💵 $${precio.toLocaleString('es-CL')} x ${datos.cantidad_noches} noche(s)\n`;
  texto += `🎯 *TOTAL: $${precioTotal.toLocaleString('es-CL')}*\n\n`;
  texto += `✅ *¿Confirmas la reserva?*\n\n`;
  texto += `Escribe *SI* para confirmar\n`;
  texto += `Escribe *NO* para cancelar`;

  await enviarMensajeTexto(telefono, telefonoNegocio, texto);
  await actualizarEstado(telefono, ESTADOS.CONFIRMANDO, datos);
};

const manejarConfirmacion = async (mensajeLower, telefono, telefonoNegocio, datos) => {
  if (mensajeLower === 'si' || mensajeLower === 'sí' || mensajeLower === 'confirmar') {
    await crearReserva(telefono, telefonoNegocio, datos);
  } else if (mensajeLower === 'no' || mensajeLower === 'cancelar') {
    await enviarMensajeTexto(telefono, telefonoNegocio, '❌ Reserva cancelada.\n\nEscribe "menu" si quieres volver a intentarlo.');
    await resetearEstado(telefono);
  } else {
    await enviarMensajeTexto(telefono, telefonoNegocio, '❓ Por favor responde *SI* para confirmar o *NO* para cancelar.');
  }
};

const crearReserva = async (telefono, telefonoNegocio, datos) => {
  try {
    const pool = await poolPromise;

    const cabanaResult = await pool.request()
      .input('id', sql.Int, datos.cabana_id)
      .query('SELECT precio_noche, precio_fin_semana FROM dbo.cabanas WHERE id = @id');

    const cabana = cabanaResult.recordset[0];
    const temporadaAlta = esTemporadaAlta(new Date(datos.fecha_inicio));
    const precio = temporadaAlta ? cabana.precio_fin_semana : cabana.precio_noche;
    const precioTotal = precio * datos.cantidad_noches;

    // Crear reserva
    const resultado = await pool.request()
      .input('cabana_id', sql.Int, datos.cabana_id)
      .input('cliente_nombre', sql.VarChar, datos.cliente_nombre)
      .input('cliente_apellido', sql.VarChar, datos.cliente_apellido)
      .input('cliente_telefono', sql.VarChar, datos.cliente_telefono)
      .input('cliente_email', sql.VarChar, datos.cliente_email)
      .input('fecha_inicio', sql.Date, datos.fecha_inicio)
      .input('fecha_fin', sql.Date, datos.fecha_fin)
      .input('cantidad_personas', sql.Int, datos.capacidad)
      .input('precio_por_noche', sql.Decimal(10, 2), precio)
      .input('precio_total', sql.Decimal(10, 2), precioTotal)
      .input('origen', sql.VarChar, 'whatsapp')
      .input('numero_whatsapp', sql.VarChar, telefono)
      .query(`
        INSERT INTO dbo.reservas_cabanas (
          cabana_id, cliente_nombre, cliente_apellido, cliente_telefono, cliente_email,
          fecha_inicio, fecha_fin, cantidad_personas,
          precio_por_noche, precio_total,
          estado, metodo_pago, estado_pago, origen, numero_whatsapp, fecha_creacion
        )
        OUTPUT INSERTED.id
        VALUES (
          @cabana_id, @cliente_nombre, @cliente_apellido, @cliente_telefono, @cliente_email,
          @fecha_inicio, @fecha_fin, @cantidad_personas,
          @precio_por_noche, @precio_total,
          'pendiente', 'transferencia', 'pendiente', @origen, @numero_whatsapp, GETDATE()
        )
      `);

    const reservaId = resultado.recordset[0].id;

    // Crear bloqueo
    await pool.request()
      .input('cabana_id', sql.Int, datos.cabana_id)
      .input('reserva_id', sql.Int, reservaId)
      .input('fecha_inicio', sql.Date, datos.fecha_inicio)
      .input('fecha_fin', sql.Date, datos.fecha_fin)
      .input('motivo', sql.VarChar, `Reserva #${reservaId} - ${datos.cliente_nombre}`)
      .query(`
        INSERT INTO dbo.bloqueos_cabanas (
          cabana_id, reserva_id, fecha_inicio, fecha_fin, motivo, fecha_creacion
        )
        VALUES (
          @cabana_id, @reserva_id, @fecha_inicio, @fecha_fin, @motivo, GETDATE()
        )
      `);

    await resetearEstado(telefono);

    let texto = `✅ *¡RESERVA CONFIRMADA!*\n\n`;
    texto += `🎫 Número de reserva: *#${reservaId}*\n\n`;
    texto += `📋 *DETALLES:*\n`;
    texto += `🏡 ${datos.cabana_nombre}\n`;
    texto += `📅 ${formatearFecha(new Date(datos.fecha_inicio))} al ${formatearFecha(new Date(datos.fecha_fin))}\n`;
    texto += `💰 Total: $${precioTotal.toLocaleString('es-CL')}\n\n`;
    texto += `💳 *DATOS PARA PAGO:*\n`;
    texto += `🏦 Banco: Banco de Chile\n`;
    texto += `💼 Cuenta Corriente: 123456789\n`;
    texto += `🆔 RUT: 12.345.678-9\n`;
    texto += `📝 Nombre: Cabañas Beach\n`;
    texto += `📧 Email: pagos@cabanasbeach.cl\n\n`;
    texto += `📸 *Envía tu comprobante de pago a este número*\n\n`;
    texto += `📞 Cualquier duda: +56 9 4265 2034\n\n`;
    texto += `¡Gracias por tu reserva! 🏖️`;

    await enviarMensajeTexto(telefono, telefonoNegocio, texto);

  } catch (error) {
    console.error('❌ Error al crear reserva:', error);
    await enviarMensajeTexto(telefono, telefonoNegocio, '❌ Ocurrió un error al crear tu reserva.\n\nPor favor contacta al +56 9 4265 2034');
    await resetearEstado(telefono);
  }
};

// ============================================
// MENSAJES
// ============================================

const mensajeBienvenida = () => {
  return `¡Hola! 👋 Bienvenido a *Cabañas Beach* 🏖️\n\n¿En qué puedo ayudarte?\n\n*1️⃣ Ver catálogo de cabañas* 📸\n*2️⃣ Hacer una reserva* 📝\n*3️⃣ Ver datos para pago* 💳\n\nEscribe el número de la opción que deseas.`;
};

const mensajeDatosPago = () => {
  return `💳 *DATOS PARA TRANSFERENCIA*\n\n🏦 Banco: Banco de Chile\n💼 Tipo: Cuenta Corriente\n🔢 Número: 123456789\n👤 RUT: 12.345.678-9\n📝 Nombre: Cabañas Beach\n📧 Email: pagos@cabanasbeach.cl\n\n📸 Envía tu comprobante a este número.\n\n¡Gracias! 🙏`;
};

// ============================================
// FUNCIONES AUXILIARES
// ============================================

const esTemporadaAlta = (fecha = new Date()) => {
  const mes = fecha.getMonth() + 1;
  return mes === 12 || mes === 1 || mes === 2;
};

const parsearFecha = (texto) => {
  const match = texto.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;

  const dia = parseInt(match[1]);
  const mes = parseInt(match[2]) - 1;
  const anio = parseInt(match[3]);

  const fecha = new Date(anio, mes, dia);
  if (fecha.getDate() !== dia || fecha.getMonth() !== mes || fecha.getFullYear() !== anio) {
    return null;
  }

  return fecha;
};

const formatearFecha = (fecha) => {
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${dias[fecha.getDay()]} ${fecha.getDate()} ${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
};

const obtenerImagenCabana = (numeroCabana, nombreCabana) => {
  try {
    let carpeta = nombreCabana;
    if (numeroCabana === 9) carpeta = 'Departamento A';
    if (numeroCabana === 10) carpeta = 'Departamento B';

    const rutaImagenes = path.join(__dirname, '../../frontend/src/images', carpeta);

    if (!fs.existsSync(rutaImagenes)) {
      console.log(`⚠️ No existe: ${rutaImagenes}`);
      return null;
    }

    const archivos = fs.readdirSync(rutaImagenes);
    const imagenes = archivos.filter(file => /\.(jpg|jpeg|png)$/i.test(file));

    if (imagenes.length === 0) return null;

    const urlImagen = `${publicURL}/imagenes-cabanas/${encodeURIComponent(carpeta)}/${encodeURIComponent(imagenes[0])}`;
    console.log(`📸 URL: ${urlImagen}`);
    return urlImagen;

  } catch (error) {
    console.error('❌ Error imagen:', error);
    return null;
  }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================
// ENVÍO DE MENSAJES
// ============================================

const enviarMensajeTexto = async (telefono, telefonoNegocio, texto) => {
  try {
    let numeroFormateado = telefono;
    if (!numeroFormateado.startsWith('+')) numeroFormateado = '+' + numeroFormateado;
    if (!numeroFormateado.startsWith('whatsapp:')) numeroFormateado = 'whatsapp:' + numeroFormateado;

    const message = await client.messages.create({
      from: twilioWhatsAppNumber,
      to: numeroFormateado,
      body: texto
    });

    // Guardar en BD
    const pool = await poolPromise;
    await pool.request()
      .input('telefono_cliente', sql.VarChar, telefono)
      .input('telefono_negocio', sql.VarChar, telefonoNegocio.replace('whatsapp:', ''))
      .input('direccion', sql.VarChar, 'saliente')
      .input('mensaje', sql.Text, texto)
      .input('tipo_mensaje', sql.VarChar, 'texto')
      .input('estado', sql.VarChar, 'enviado')
      .input('respondido_automaticamente', sql.Bit, 1)
      .query(`
        INSERT INTO dbo.mensajes_whatsapp (
          telefono_cliente, telefono_negocio, direccion, mensaje,
          tipo_mensaje, estado, respondido_automaticamente, fecha_creacion
        )
        VALUES (
          @telefono_cliente, @telefono_negocio, @direccion, @mensaje,
          @tipo_mensaje, @estado, @respondido_automaticamente, GETDATE()
        )
      `);

    console.log(`✅ Enviado a ${telefono}`);
    return message;

  } catch (error) {
    console.error('❌ Error envío:', error);
  }
};

const enviarMensajeConImagen = async (telefono, telefonoNegocio, texto, imagenUrl) => {
  try {
    let numeroFormateado = telefono;
    if (!numeroFormateado.startsWith('+')) numeroFormateado = '+' + numeroFormateado;
    if (!numeroFormateado.startsWith('whatsapp:')) numeroFormateado = 'whatsapp:' + numeroFormateado;

    const message = await client.messages.create({
      from: twilioWhatsAppNumber,
      to: numeroFormateado,
      body: texto,
      mediaUrl: [imagenUrl]
    });

    // Guardar en BD
    const pool = await poolPromise;
    await pool.request()
      .input('telefono_cliente', sql.VarChar, telefono)
      .input('telefono_negocio', sql.VarChar, telefonoNegocio.replace('whatsapp:', ''))
      .input('direccion', sql.VarChar, 'saliente')
      .input('mensaje', sql.Text, texto)
      .input('tipo_mensaje', sql.VarChar, 'multimedia')
      .input('estado', sql.VarChar, 'enviado')
      .input('respondido_automaticamente', sql.Bit, 1)
      .query(`
        INSERT INTO dbo.mensajes_whatsapp (
          telefono_cliente, telefono_negocio, direccion, mensaje,
          tipo_mensaje, estado, respondido_automaticamente, fecha_creacion
        )
        VALUES (
          @telefono_cliente, @telefono_negocio, @direccion, @mensaje,
          @tipo_mensaje, @estado, @respondido_automaticamente, GETDATE()
        )
      `);

    console.log(`✅ Enviado con imagen a ${telefono}`);
    return message;

  } catch (error) {
    console.error('❌ Error envío con imagen:', error);
  }
};

// ============================================
// GESTIÓN DE ESTADOS
// ============================================

const actualizarEstado = async (telefono, estado, datos) => {
  try {
    const pool = await poolPromise;
    const datosJson = JSON.stringify(datos);

    const updateResult = await pool.request()
      .input('telefono', sql.VarChar, telefono)
      .input('estado', sql.VarChar, estado)
      .input('datos', sql.VarChar, datosJson)
      .query(`
        UPDATE dbo.estados_conversacion_whatsapp
        SET estado_actual = @estado, datos_temporales = @datos, ultima_actualizacion = GETDATE()
        WHERE telefono_cliente = @telefono
      `);

    if (updateResult.rowsAffected[0] === 0) {
      await pool.request()
        .input('telefono', sql.VarChar, telefono)
        .input('estado', sql.VarChar, estado)
        .input('datos', sql.VarChar, datosJson)
        .query(`
          INSERT INTO dbo.estados_conversacion_whatsapp (telefono_cliente, estado_actual, datos_temporales, fecha_creacion)
          VALUES (@telefono, @estado, @datos, GETDATE())
        `);
    }

    console.log(`📝 Estado: ${estado}`);
  } catch (error) {
    console.error('❌ Error estado:', error);
  }
};

const resetearEstado = async (telefono) => {
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('telefono', sql.VarChar, telefono)
      .query('DELETE FROM dbo.estados_conversacion_whatsapp WHERE telefono_cliente = @telefono');
    console.log(`🔄 Estado reseteado`);
  } catch (error) {
    console.error('❌ Error reseteo:', error);
  }
};

// ============================================
// OTROS ENDPOINTS
// ============================================

exports.webhookStatus = async (req, res) => {
  res.type('text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
};

exports.enviarMensajeManual = async (req, res) => {
  try {
    const { telefono, mensaje } = req.body;
    await enviarMensajeTexto(telefono, twilioWhatsAppNumber, mensaje);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.obtenerConversaciones = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT telefono_cliente, MAX(fecha_creacion) as ultima_interaccion,
             COUNT(*) as total_mensajes
      FROM dbo.mensajes_whatsapp
      GROUP BY telefono_cliente
      ORDER BY MAX(fecha_creacion) DESC
    `);
    res.json({ success: true, conversaciones: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.obtenerMensajesConversacion = async (req, res) => {
  try {
    const { telefono } = req.params;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('telefono', sql.VarChar, telefono)
      .query(`
        SELECT * FROM dbo.mensajes_whatsapp
        WHERE telefono_cliente = @telefono
        ORDER BY fecha_creacion ASC
      `);
    res.json({ success: true, mensajes: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.testEnvio = async (req, res) => {
  try {
    await enviarMensajeTexto('+56942652034', twilioWhatsAppNumber, '🧪 Test Bot V4 - Flujo mejorado activo!');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = exports;
