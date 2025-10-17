// backend/controllers/twilioWhatsAppControllerV3.js
// VERSION MEJORADA CON FLUJO CONVERSACIONAL Y BOTONES INTERACTIVOS

const { sql, poolPromise } = require('../config/db');

// Configuración de Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;

const twilio = require('twilio');
const client = twilio(accountSid, authToken);

// ============================================
// ESTADOS DE CONVERSACIÓN
// ============================================
const ESTADOS = {
  INICIAL: 'inicial',
  VIENDO_CATALOGO: 'viendo_catalogo',
  INGRESANDO_FECHA_INICIO: 'ingresando_fecha_inicio',
  INGRESANDO_FECHA_FIN: 'ingresando_fecha_fin',
  VIENDO_DISPONIBILIDAD: 'viendo_disponibilidad',
  ELIGIENDO_CABANA: 'eligiendo_cabana',
  INGRESANDO_PERSONAS: 'ingresando_personas',
  INGRESANDO_NOMBRE: 'ingresando_nombre',
  INGRESANDO_TELEFONO: 'ingresando_telefono',
  INGRESANDO_EMAIL: 'ingresando_email',
  CONFIRMANDO: 'confirmando',
};

// ============================================
// FUNCIONES DE TEMPORADA
// ============================================
const esTemporadaAlta = (fecha = new Date()) => {
  const mes = fecha.getMonth() + 1;
  return mes === 12 || mes === 1 || mes === 2;
};

const obtenerPrecioPorTemporada = (cabana, fechaInicio) => {
  const fecha = fechaInicio ? new Date(fechaInicio) : new Date();
  const temporadaAlta = esTemporadaAlta(fecha);
  const precio = temporadaAlta ? cabana.precio_fin_semana : cabana.precio_noche;
  const nombreTemporada = temporadaAlta ? 'TEMPORADA ALTA' : 'TEMPORADA BAJA';
  return { precio, nombreTemporada, esTemporadaAlta: temporadaAlta };
};

// ============================================
// WEBHOOK: Recibir mensajes entrantes
// ============================================
exports.webhookIncoming = async (req, res) => {
  try {
    console.log('\n📱 === MENSAJE WHATSAPP ENTRANTE ===');

    const {
      MessageSid,
      From,
      To,
      Body
    } = req.body;

    const telefonoCliente = From.replace('whatsapp:', '');
    const mensaje = (Body || '').trim();

    console.log(`📞 De: ${telefonoCliente}`);
    console.log(`💬 Mensaje: ${mensaje}`);

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

    // Procesar mensaje con flujo conversacional
    const respuesta = await procesarMensajeConversacional(mensaje, telefonoCliente);

    // Enviar respuesta
    if (respuesta) {
      await enviarMensajeWhatsApp(telefonoCliente, respuesta.texto);

      // Guardar mensaje saliente
      await pool.request()
        .input('telefono_cliente', sql.VarChar, telefonoCliente)
        .input('telefono_negocio', sql.VarChar, To.replace('whatsapp:', ''))
        .input('direccion', sql.VarChar, 'saliente')
        .input('mensaje', sql.Text, respuesta.texto)
        .input('tipo_mensaje', sql.VarChar, 'texto')
        .input('estado', sql.VarChar, 'enviado')
        .input('intent', sql.VarChar, respuesta.intent)
        .input('respondido_automaticamente', sql.Bit, 1)
        .query(`
          INSERT INTO dbo.mensajes_whatsapp (
            telefono_cliente, telefono_negocio, direccion, mensaje,
            tipo_mensaje, estado, intent, respondido_automaticamente, fecha_creacion
          )
          VALUES (
            @telefono_cliente, @telefono_negocio, @direccion, @mensaje,
            @tipo_mensaje, @estado, @intent, @respondido_automaticamente, GETDATE()
          )
        `);
    }

    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);

    console.log('✅ Mensaje procesado correctamente');

  } catch (error) {
    console.error('❌ Error al procesar mensaje WhatsApp:', error);
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
  }
};

// ============================================
// PROCESAMIENTO CONVERSACIONAL
// ============================================
const procesarMensajeConversacional = async (mensaje, telefono) => {
  try {
    const pool = await poolPromise;
    const mensajeLower = mensaje.toLowerCase().trim();

    // Obtener estado actual de la conversación
    const estadoResult = await pool.request()
      .input('telefono', sql.VarChar, telefono)
      .query(`
        SELECT estado_actual, datos_temporales
        FROM dbo.estados_conversacion_whatsapp
        WHERE telefono_cliente = @telefono
      `);

    let estadoActual = ESTADOS.INICIAL;
    let datosTemp = {};

    if (estadoResult.recordset.length > 0) {
      estadoActual = estadoResult.recordset[0].estado_actual;
      try {
        datosTemp = JSON.parse(estadoResult.recordset[0].datos_temporales || '{}');
      } catch (e) {
        datosTemp = {};
      }
    }

    console.log(`🎯 Estado actual: ${estadoActual}`);

    // Detectar comandos especiales
    if (mensajeLower === 'cancelar' || mensajeLower === 'reiniciar') {
      await resetearEstado(telefono);
      return generarMensajeBienvenida();
    }

    if (mensajeLower === 'menu' || mensajeLower === 'menú' || mensajeLower === 'hola') {
      await resetearEstado(telefono);
      return generarMensajeBienvenida();
    }

    // Procesar según estado actual
    switch (estadoActual) {
      case ESTADOS.INICIAL:
        return await procesarEstadoInicial(mensajeLower, telefono);

      case ESTADOS.ELIGIENDO_CABANA:
        return await procesarSeleccionCabana(mensaje, telefono, datosTemp);

      case ESTADOS.INGRESANDO_FECHA_INICIO:
        return await procesarFechaInicio(mensaje, telefono, datosTemp);

      case ESTADOS.INGRESANDO_FECHA_FIN:
        return await procesarFechaFin(mensaje, telefono, datosTemp);

      case ESTADOS.INGRESANDO_PERSONAS:
        return await procesarPersonas(mensaje, telefono, datosTemp);

      case ESTADOS.INGRESANDO_NOMBRE:
        return await procesarNombre(mensaje, telefono, datosTemp);

      case ESTADOS.INGRESANDO_TELEFONO:
        return await procesarTelefono(mensaje, telefono, datosTemp);

      case ESTADOS.INGRESANDO_EMAIL:
        return await procesarEmail(mensaje, telefono, datosTemp);

      case ESTADOS.CONFIRMANDO:
        return await procesarConfirmacion(mensajeLower, telefono, datosTemp);

      default:
        return generarMensajeBienvenida();
    }

  } catch (error) {
    console.error('❌ Error al procesar mensaje conversacional:', error);
    return {
      texto: '❌ Disculpa, ocurrió un error. Por favor escribe "menu" para volver al inicio.',
      intent: 'error'
    };
  }
};

// ============================================
// PROCESADORES POR ESTADO
// ============================================

// Estado inicial - Menú principal
const procesarEstadoInicial = async (mensajeLower, telefono) => {
  if (mensajeLower.includes('disponibilidad') || mensajeLower.includes('ver cabañas') || mensajeLower === '1') {
    return await mostrarCabanasDisponibles(telefono);
  }

  if (mensajeLower.includes('reservar') || mensajeLower.includes('reserva') || mensajeLower === '2') {
    return await iniciarProcesoReserva(telefono);
  }

  if (mensajeLower.includes('pago') || mensajeLower.includes('transferencia') || mensajeLower === '3') {
    return generarMensajeDatosPago();
  }

  if (mensajeLower.includes('ejecutivo') || mensajeLower.includes('ayuda') || mensajeLower === '4') {
    return generarMensajeEjecutivo();
  }

  return generarMensajeBienvenida();
};

// Mostrar cabañas disponibles
const mostrarCabanasDisponibles = async (telefono) => {
  const pool = await poolPromise;

  const cabanas = await pool.request().query(`
    SELECT
      c.id, c.numero, c.nombre, c.capacidad_personas,
      c.precio_noche, c.precio_fin_semana, c.estado
    FROM dbo.cabanas c
    ORDER BY c.numero ASC
  `);

  const temporadaAlta = esTemporadaAlta();
  const nombreTemporada = temporadaAlta ? '🔥 TEMPORADA ALTA' : '🌿 TEMPORADA BAJA';

  let mensaje = `🏡 *CABAÑAS DISPONIBLES*\n\n📅 ${nombreTemporada}\n\n`;

  cabanas.recordset.forEach(c => {
    const { precio } = obtenerPrecioPorTemporada(c);
    const disponible = c.estado === 'disponible';
    const icono = disponible ? '✅' : '❌';

    mensaje += `${icono} *${c.nombre}*\n`;
    mensaje += `   👥 ${c.capacidad_personas} personas\n`;
    mensaje += `   💰 $${precio.toLocaleString('es-CL')}/noche\n\n`;
  });

  mensaje += `\n📝 *¿Quieres hacer una reserva?*\n\n`;
  mensaje += `Escribe *RESERVAR* o el número *2*`;

  await actualizarEstado(telefono, ESTADOS.INICIAL, {});

  return {
    texto: mensaje,
    intent: 'consulta_disponibilidad'
  };
};

// Iniciar proceso de reserva
const iniciarProcesoReserva = async (telefono) => {
  const pool = await poolPromise;

  const cabanas = await pool.request().query(`
    SELECT id, numero, nombre, capacidad_personas, precio_noche, precio_fin_semana
    FROM dbo.cabanas
    WHERE estado = 'disponible'
    ORDER BY numero ASC
  `);

  if (cabanas.recordset.length === 0) {
    return {
      texto: '❌ Lo sentimos, no hay cabañas disponibles en este momento.\n\nEscribe "menu" para volver al inicio.',
      intent: 'no_disponibilidad'
    };
  }

  let mensaje = `📝 *NUEVA RESERVA*\n\n`;
  mensaje += `*Paso 1 de 7: Elige una cabaña*\n\n`;

  cabanas.recordset.forEach(c => {
    const { precio } = obtenerPrecioPorTemporada(c);
    mensaje += `*${c.numero}*. ${c.nombre}\n`;
    mensaje += `   👥 ${c.capacidad_personas} personas\n`;
    mensaje += `   💰 $${precio.toLocaleString('es-CL')}/noche\n\n`;
  });

  mensaje += `\n✏️ *Escribe el número de la cabaña que deseas reservar*\n`;
  mensaje += `(Ej: 1, 2, 3, etc.)`;

  await actualizarEstado(telefono, ESTADOS.ELIGIENDO_CABANA, {});

  return {
    texto: mensaje,
    intent: 'iniciar_reserva'
  };
};

// Procesar selección de cabaña
const procesarSeleccionCabana = async (mensaje, telefono, datosTemp) => {
  const numero = parseInt(mensaje);

  if (isNaN(numero) || numero < 1 || numero > 10) {
    return {
      texto: '❌ Por favor escribe un número válido entre 1 y 10.\n\nEj: 3',
      intent: 'error_validacion'
    };
  }

  const pool = await poolPromise;

  const cabanaResult = await pool.request()
    .input('numero', sql.Int, numero)
    .query(`
      SELECT id, numero, nombre, capacidad_personas, precio_noche, precio_fin_semana
      FROM dbo.cabanas
      WHERE numero = @numero AND estado = 'disponible'
    `);

  if (cabanaResult.recordset.length === 0) {
    return {
      texto: `❌ La cabaña ${numero} no está disponible.\n\nPor favor elige otra cabaña o escribe "menu" para volver al inicio.`,
      intent: 'cabana_no_disponible'
    };
  }

  const cabana = cabanaResult.recordset[0];
  datosTemp.cabana_id = cabana.id;
  datosTemp.cabana_numero = cabana.numero;
  datosTemp.cabana_nombre = cabana.nombre;
  datosTemp.capacidad = cabana.capacidad_personas;

  await actualizarEstado(telefono, ESTADOS.INGRESANDO_FECHA_INICIO, datosTemp);

  return {
    texto: `✅ *${cabana.nombre}* seleccionada\n\n📅 *Paso 2 de 7: Fecha de inicio*\n\n¿Cuándo quieres hacer check-in?\n\nEscribe la fecha en formato: DD/MM/AAAA\nEj: 25/12/2024`,
    intent: 'cabana_seleccionada'
  };
};

// Procesar fecha de inicio
const procesarFechaInicio = async (mensaje, telefono, datosTemp) => {
  const fecha = parsearFecha(mensaje);

  if (!fecha) {
    return {
      texto: '❌ Fecha inválida. Por favor usa el formato DD/MM/AAAA\n\nEj: 25/12/2024',
      intent: 'error_fecha'
    };
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (fecha < hoy) {
    return {
      texto: '❌ La fecha de inicio no puede ser en el pasado.\n\nPor favor ingresa una fecha futura.',
      intent: 'error_fecha_pasada'
    };
  }

  datosTemp.fecha_inicio = fecha.toISOString().split('T')[0];

  await actualizarEstado(telefono, ESTADOS.INGRESANDO_FECHA_FIN, datosTemp);

  return {
    texto: `✅ Check-in: ${formatearFecha(fecha)}\n\n📅 *Paso 3 de 7: Fecha de fin*\n\n¿Cuándo quieres hacer check-out?\n\nEscribe la fecha en formato: DD/MM/AAAA\nEj: 28/12/2024`,
    intent: 'fecha_inicio_guardada'
  };
};

// Procesar fecha de fin
const procesarFechaFin = async (mensaje, telefono, datosTemp) => {
  const fecha = parsearFecha(mensaje);

  if (!fecha) {
    return {
      texto: '❌ Fecha inválida. Por favor usa el formato DD/MM/AAAA\n\nEj: 28/12/2024',
      intent: 'error_fecha'
    };
  }

  const fechaInicio = new Date(datosTemp.fecha_inicio);
  fechaInicio.setHours(0, 0, 0, 0);
  fecha.setHours(0, 0, 0, 0);

  if (fecha <= fechaInicio) {
    return {
      texto: '❌ La fecha de check-out debe ser posterior a la de check-in.\n\nPor favor ingresa una fecha válida.',
      intent: 'error_fecha_fin'
    };
  }

  datosTemp.fecha_fin = fecha.toISOString().split('T')[0];

  // Calcular noches y precio
  const noches = Math.ceil((fecha - fechaInicio) / (1000 * 60 * 60 * 24));
  datosTemp.cantidad_noches = noches;

  await actualizarEstado(telefono, ESTADOS.INGRESANDO_PERSONAS, datosTemp);

  return {
    texto: `✅ Check-out: ${formatearFecha(fecha)}\n📊 Total: ${noches} noche(s)\n\n👥 *Paso 4 de 7: Número de personas*\n\n¿Cuántas personas van a hospedarse?\n\nCapacidad máxima: ${datosTemp.capacidad} personas\n\nEscribe el número (Ej: 4)`,
    intent: 'fecha_fin_guardada'
  };
};

// Procesar número de personas
const procesarPersonas = async (mensaje, telefono, datosTemp) => {
  const personas = parseInt(mensaje);

  if (isNaN(personas) || personas < 1) {
    return {
      texto: '❌ Por favor escribe un número válido de personas.\n\nEj: 4',
      intent: 'error_personas'
    };
  }

  if (personas > datosTemp.capacidad) {
    return {
      texto: `❌ La cabaña ${datosTemp.cabana_nombre} tiene capacidad máxima para ${datosTemp.capacidad} personas.\n\nPor favor ingresa un número menor o igual a ${datosTemp.capacidad}.`,
      intent: 'exceso_capacidad'
    };
  }

  datosTemp.cantidad_personas = personas;

  await actualizarEstado(telefono, ESTADOS.INGRESANDO_NOMBRE, datosTemp);

  return {
    texto: `✅ ${personas} persona(s)\n\n👤 *Paso 5 de 7: Nombre completo*\n\n¿Cuál es tu nombre completo?\n\nEj: Juan Pérez`,
    intent: 'personas_guardadas'
  };
};

// Procesar nombre
const procesarNombre = async (mensaje, telefono, datosTemp) => {
  if (mensaje.length < 3) {
    return {
      texto: '❌ Por favor ingresa tu nombre completo.\n\nEj: Juan Pérez',
      intent: 'error_nombre'
    };
  }

  // Separar nombre y apellido
  const partes = mensaje.trim().split(' ');
  datosTemp.cliente_nombre = partes[0];
  datosTemp.cliente_apellido = partes.slice(1).join(' ') || partes[0];

  await actualizarEstado(telefono, ESTADOS.INGRESANDO_TELEFONO, datosTemp);

  return {
    texto: `✅ Nombre: ${mensaje}\n\n📱 *Paso 6 de 7: Teléfono de contacto*\n\n¿Cuál es tu número de teléfono?\n\nEj: +56912345678 o 912345678`,
    intent: 'nombre_guardado'
  };
};

// Procesar teléfono
const procesarTelefono = async (mensaje, telefono, datosTemp) => {
  let telefonoLimpio = mensaje.replace(/[^0-9+]/g, '');

  if (telefonoLimpio.length < 8) {
    return {
      texto: '❌ Número de teléfono inválido.\n\nPor favor ingresa un número válido.\nEj: +56912345678',
      intent: 'error_telefono'
    };
  }

  // Agregar +56 si no tiene código de país
  if (!telefonoLimpio.startsWith('+')) {
    if (telefonoLimpio.startsWith('56')) {
      telefonoLimpio = '+' + telefonoLimpio;
    } else if (telefonoLimpio.startsWith('9')) {
      telefonoLimpio = '+56' + telefonoLimpio;
    }
  }

  datosTemp.cliente_telefono = telefonoLimpio;

  await actualizarEstado(telefono, ESTADOS.INGRESANDO_EMAIL, datosTemp);

  return {
    texto: `✅ Teléfono: ${telefonoLimpio}\n\n📧 *Paso 7 de 7: Email*\n\n¿Cuál es tu correo electrónico?\n\nEj: juan@ejemplo.com\n\n_(O escribe "omitir" si no tienes)_`,
    intent: 'telefono_guardado'
  };
};

// Procesar email
const procesarEmail = async (mensaje, telefono, datosTemp) => {
  if (mensaje.toLowerCase() === 'omitir' || mensaje.toLowerCase() === 'no tengo') {
    datosTemp.cliente_email = null;
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mensaje)) {
      return {
        texto: '❌ Email inválido.\n\nPor favor ingresa un email válido.\nEj: juan@ejemplo.com\n\nO escribe "omitir"',
        intent: 'error_email'
      };
    }
    datosTemp.cliente_email = mensaje;
  }

  await actualizarEstado(telefono, ESTADOS.CONFIRMANDO, datosTemp);

  return await generarMensajeConfirmacion(datosTemp);
};

// Generar mensaje de confirmación
const generarMensajeConfirmacion = async (datosTemp) => {
  const pool = await poolPromise;

  // Obtener precio de la cabaña
  const cabanaResult = await pool.request()
    .input('id', sql.Int, datosTemp.cabana_id)
    .query('SELECT precio_noche, precio_fin_semana FROM dbo.cabanas WHERE id = @id');

  const cabana = cabanaResult.recordset[0];
  const { precio, nombreTemporada } = obtenerPrecioPorTemporada(cabana, datosTemp.fecha_inicio);

  const precioTotal = precio * datosTemp.cantidad_noches;

  let mensaje = `📋 *RESUMEN DE TU RESERVA*\n\n`;
  mensaje += `🏡 Cabaña: *${datosTemp.cabana_nombre}*\n`;
  mensaje += `📅 Check-in: ${formatearFecha(new Date(datosTemp.fecha_inicio))}\n`;
  mensaje += `📅 Check-out: ${formatearFecha(new Date(datosTemp.fecha_fin))}\n`;
  mensaje += `🌙 Noches: ${datosTemp.cantidad_noches}\n`;
  mensaje += `👥 Personas: ${datosTemp.cantidad_personas}\n`;
  mensaje += `👤 Nombre: ${datosTemp.cliente_nombre} ${datosTemp.cliente_apellido}\n`;
  mensaje += `📱 Teléfono: ${datosTemp.cliente_telefono}\n`;
  if (datosTemp.cliente_email) {
    mensaje += `📧 Email: ${datosTemp.cliente_email}\n`;
  }
  mensaje += `\n💰 *PRECIO*\n`;
  mensaje += `📊 ${nombreTemporada}\n`;
  mensaje += `💵 $${precio.toLocaleString('es-CL')} x ${datosTemp.cantidad_noches} noche(s)\n`;
  mensaje += `🎯 *TOTAL: $${precioTotal.toLocaleString('es-CL')}*\n\n`;
  mensaje += `✅ *¿Confirmas la reserva?*\n\n`;
  mensaje += `Escribe *SI* para confirmar\n`;
  mensaje += `Escribe *NO* para cancelar`;

  return {
    texto: mensaje,
    intent: 'confirmacion_pendiente'
  };
};

// Procesar confirmación
const procesarConfirmacion = async (mensajeLower, telefono, datosTemp) => {
  if (mensajeLower === 'si' || mensajeLower === 'sí' || mensajeLower === 'confirmar') {
    return await crearReserva(telefono, datosTemp);
  }

  if (mensajeLower === 'no' || mensajeLower === 'cancelar') {
    await resetearEstado(telefono);
    return {
      texto: '❌ Reserva cancelada.\n\nEscribe "menu" si quieres volver a intentarlo.',
      intent: 'reserva_cancelada'
    };
  }

  return {
    texto: '❓ Por favor responde *SI* para confirmar o *NO* para cancelar.',
    intent: 'confirmacion_invalida'
  };
};

// Crear reserva en la base de datos
const crearReserva = async (telefono, datosTemp) => {
  try {
    const pool = await poolPromise;

    // Obtener precio
    const cabanaResult = await pool.request()
      .input('id', sql.Int, datosTemp.cabana_id)
      .query('SELECT precio_noche, precio_fin_semana FROM dbo.cabanas WHERE id = @id');

    const cabana = cabanaResult.recordset[0];
    const { precio } = obtenerPrecioPorTemporada(cabana, datosTemp.fecha_inicio);
    const precioTotal = precio * datosTemp.cantidad_noches;

    // Crear reserva (sin cantidad_noches ni precio_final - son columnas calculadas)
    const resultado = await pool.request()
      .input('cabana_id', sql.Int, datosTemp.cabana_id)
      .input('cliente_nombre', sql.VarChar, datosTemp.cliente_nombre)
      .input('cliente_apellido', sql.VarChar, datosTemp.cliente_apellido)
      .input('cliente_telefono', sql.VarChar, datosTemp.cliente_telefono)
      .input('cliente_email', sql.VarChar, datosTemp.cliente_email)
      .input('fecha_inicio', sql.Date, datosTemp.fecha_inicio)
      .input('fecha_fin', sql.Date, datosTemp.fecha_fin)
      .input('cantidad_personas', sql.Int, datosTemp.cantidad_personas)
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

    // Crear bloqueo en calendario
    await pool.request()
      .input('cabana_id', sql.Int, datosTemp.cabana_id)
      .input('reserva_id', sql.Int, reservaId)
      .input('fecha_inicio', sql.Date, datosTemp.fecha_inicio)
      .input('fecha_fin', sql.Date, datosTemp.fecha_fin)
      .input('motivo', sql.VarChar, `Reserva #${reservaId} - ${datosTemp.cliente_nombre}`)
      .query(`
        INSERT INTO dbo.bloqueos_cabanas (
          cabana_id, reserva_id, fecha_inicio, fecha_fin, motivo, fecha_creacion
        )
        VALUES (
          @cabana_id, @reserva_id, @fecha_inicio, @fecha_fin, @motivo, GETDATE()
        )
      `);

    await resetearEstado(telefono);

    let mensaje = `✅ *¡RESERVA CONFIRMADA!*\n\n`;
    mensaje += `🎫 Número de reserva: #${reservaId}\n\n`;
    mensaje += `📋 *DETALLES:*\n`;
    mensaje += `🏡 ${datosTemp.cabana_nombre}\n`;
    mensaje += `📅 ${formatearFecha(new Date(datosTemp.fecha_inicio))} al ${formatearFecha(new Date(datosTemp.fecha_fin))}\n`;
    mensaje += `👥 ${datosTemp.cantidad_personas} persona(s)\n`;
    mensaje += `💰 Total: $${precioTotal.toLocaleString('es-CL')}\n\n`;
    mensaje += `💳 *DATOS PARA PAGO:*\n`;
    mensaje += `Banco: Banco de Chile\n`;
    mensaje += `Cuenta Corriente: 123456789\n`;
    mensaje += `RUT: 12.345.678-9\n`;
    mensaje += `Nombre: Cabañas Beach\n`;
    mensaje += `Email: pagos@cabanasbeach.cl\n\n`;
    mensaje += `📸 *Envía tu comprobante de pago a este número*\n\n`;
    mensaje += `📞 Cualquier duda: +56 9 4265 2034\n\n`;
    mensaje += `¡Gracias por tu reserva! 🏖️`;

    return {
      texto: mensaje,
      intent: 'reserva_creada'
    };

  } catch (error) {
    console.error('❌ Error al crear reserva:', error);
    await resetearEstado(telefono);

    return {
      texto: '❌ Ocurrió un error al crear tu reserva.\n\nPor favor contacta directamente al +56 9 4265 2034\n\nDisculpa las molestias.',
      intent: 'error_crear_reserva'
    };
  }
};

// ============================================
// MENSAJES PREDEFINIDOS
// ============================================

const generarMensajeBienvenida = () => {
  return {
    texto: `¡Hola! 👋 Bienvenido a *Cabañas Beach* 🏖️\n\n¿En qué puedo ayudarte?\n\n*1️⃣ Ver disponibilidad de cabañas*\n*2️⃣ Hacer una reserva*\n*3️⃣ Ver datos para pago*\n*4️⃣ Hablar con un ejecutivo*\n\nEscribe el número de la opción que deseas.`,
    intent: 'bienvenida'
  };
};

const generarMensajeDatosPago = () => {
  return {
    texto: `💳 *DATOS PARA TRANSFERENCIA*\n\n🏦 Banco: Banco de Chile\n💼 Tipo: Cuenta Corriente\n🔢 Número: 123456789\n👤 RUT: 12.345.678-9\n📝 Nombre: Cabañas Beach\n📧 Email: pagos@cabanasbeach.cl\n\n📸 Una vez realizada la transferencia, envía tu comprobante a este número.\n\n¡Gracias! 🙏`,
    intent: 'datos_pago'
  };
};

const generarMensajeEjecutivo = () => {
  return {
    texto: `👤 *CONTACTO CON EJECUTIVO*\n\nPuedes llamarnos directamente al:\n📞 *+56 9 4265 2034*\n\n🕐 Horario de atención:\nLunes a Domingo: 9:00 - 21:00 hrs\n\n¡Estaremos encantados de atenderte! 😊`,
    intent: 'ejecutivo'
  };
};

// ============================================
// FUNCIONES DE ESTADO
// ============================================

const actualizarEstado = async (telefono, nuevoEstado, datosTemp) => {
  try {
    const pool = await poolPromise;
    const datosJson = JSON.stringify(datosTemp);

    // Intentar actualizar primero
    const updateResult = await pool.request()
      .input('telefono', sql.VarChar, telefono)
      .input('estado', sql.VarChar, nuevoEstado)
      .input('datos', sql.VarChar, datosJson)
      .query(`
        UPDATE dbo.estados_conversacion_whatsapp
        SET estado_actual = @estado,
            datos_temporales = @datos,
            ultima_actualizacion = GETDATE()
        WHERE telefono_cliente = @telefono
      `);

    // Si no actualizó nada, insertar nuevo registro
    if (updateResult.rowsAffected[0] === 0) {
      await pool.request()
        .input('telefono', sql.VarChar, telefono)
        .input('estado', sql.VarChar, nuevoEstado)
        .input('datos', sql.VarChar, datosJson)
        .query(`
          INSERT INTO dbo.estados_conversacion_whatsapp
          (telefono_cliente, estado_actual, datos_temporales, fecha_creacion)
          VALUES (@telefono, @estado, @datos, GETDATE())
        `);
    }

    console.log(`📝 Estado actualizado: ${nuevoEstado}`);
  } catch (error) {
    console.error('❌ Error al actualizar estado:', error);
  }
};

const resetearEstado = async (telefono) => {
  try {
    const pool = await poolPromise;

    await pool.request()
      .input('telefono', sql.VarChar, telefono)
      .query(`
        DELETE FROM dbo.estados_conversacion_whatsapp
        WHERE telefono_cliente = @telefono
      `);

    console.log(`🔄 Estado reseteado para ${telefono}`);
  } catch (error) {
    console.error('❌ Error al resetear estado:', error);
  }
};

// ============================================
// FUNCIONES AUXILIARES
// ============================================

const parsearFecha = (texto) => {
  // Formato DD/MM/AAAA
  const match = texto.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;

  const dia = parseInt(match[1]);
  const mes = parseInt(match[2]) - 1; // Los meses en JS son 0-11
  const anio = parseInt(match[3]);

  const fecha = new Date(anio, mes, dia);

  // Validar que la fecha sea válida
  if (fecha.getDate() !== dia || fecha.getMonth() !== mes || fecha.getFullYear() !== anio) {
    return null;
  }

  return fecha;
};

const formatearFecha = (fecha) => {
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const diaSemana = dias[fecha.getDay()];
  const dia = fecha.getDate();
  const mes = meses[fecha.getMonth()];
  const anio = fecha.getFullYear();

  return `${diaSemana} ${dia} ${mes} ${anio}`;
};

// ============================================
// ENVÍO DE MENSAJES
// ============================================

const enviarMensajeWhatsApp = async (telefonoDestino, mensaje) => {
  try {
    let numeroFormateado = telefonoDestino;
    if (!numeroFormateado.startsWith('+')) {
      numeroFormateado = '+' + numeroFormateado;
    }
    if (!numeroFormateado.startsWith('whatsapp:')) {
      numeroFormateado = 'whatsapp:' + numeroFormateado;
    }

    console.log(`📤 Enviando mensaje a: ${numeroFormateado}`);

    const message = await client.messages.create({
      from: twilioWhatsAppNumber,
      to: numeroFormateado,
      body: mensaje
    });

    console.log(`✅ Mensaje enviado - SID: ${message.sid}`);
    return message;

  } catch (error) {
    console.error('❌ Error al enviar mensaje WhatsApp:', error);
    throw error;
  }
};

// ============================================
// WEBHOOK STATUS
// ============================================
exports.webhookStatus = async (req, res) => {
  console.log('📊 Status Update:', req.body);
  res.type('text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
};

// ============================================
// ENDPOINTS DE API
// ============================================

exports.enviarMensajeManual = async (req, res) => {
  try {
    const { telefono, mensaje } = req.body;

    if (!telefono || !mensaje) {
      return res.status(400).json({
        success: false,
        message: 'Teléfono y mensaje son requeridos'
      });
    }

    await enviarMensajeWhatsApp(telefono, mensaje);

    return res.json({
      success: true,
      message: 'Mensaje enviado correctamente'
    });

  } catch (error) {
    console.error('❌ Error al enviar mensaje:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al enviar mensaje',
      error: error.message
    });
  }
};

exports.obtenerConversaciones = async (req, res) => {
  try {
    const pool = await poolPromise;

    const conversaciones = await pool.request()
      .query(`
        SELECT
          telefono_cliente,
          MAX(fecha_creacion) as ultima_interaccion,
          COUNT(*) as total_mensajes,
          SUM(CASE WHEN direccion = 'entrante' THEN 1 ELSE 0 END) as mensajes_recibidos,
          SUM(CASE WHEN direccion = 'saliente' THEN 1 ELSE 0 END) as mensajes_enviados,
          MAX(CASE WHEN direccion = 'entrante' THEN mensaje ELSE NULL END) as ultimo_mensaje
        FROM dbo.mensajes_whatsapp
        GROUP BY telefono_cliente
        ORDER BY MAX(fecha_creacion) DESC
      `);

    return res.json({
      success: true,
      conversaciones: conversaciones.recordset
    });

  } catch (error) {
    console.error('❌ Error al obtener conversaciones:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener conversaciones',
      error: error.message
    });
  }
};

exports.obtenerMensajesConversacion = async (req, res) => {
  try {
    const { telefono } = req.params;

    const pool = await poolPromise;
    const mensajes = await pool.request()
      .input('telefono', sql.VarChar, telefono)
      .query(`
        SELECT
          id, sid_twilio, telefono_cliente, direccion, mensaje,
          tipo_mensaje, estado, intent, fecha_creacion,
          respondido_automaticamente, requiere_respuesta_humana
        FROM dbo.mensajes_whatsapp
        WHERE telefono_cliente = @telefono
        ORDER BY fecha_creacion ASC
      `);

    return res.json({
      success: true,
      mensajes: mensajes.recordset
    });

  } catch (error) {
    console.error('❌ Error al obtener mensajes:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener mensajes',
      error: error.message
    });
  }
};

exports.testEnvio = async (req, res) => {
  try {
    const mensaje = await enviarMensajeWhatsApp(
      '+56942652034',
      '🧪 Test de WhatsApp Bot V3 - Flujo conversacional activo!'
    );

    return res.json({
      success: true,
      message: 'Mensaje de prueba enviado',
      sid: mensaje.sid
    });

  } catch (error) {
    console.error('❌ Error en test:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en test',
      error: error.message
    });
  }
};

module.exports = exports;
