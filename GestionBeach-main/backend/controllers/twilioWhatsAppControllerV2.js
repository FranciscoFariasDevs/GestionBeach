// backend/controllers/twilioWhatsAppControllerV2.js
// VERSION MEJORADA CON FLUJO COMPLETO DE RESERVAS

const { sql, poolPromise } = require('../config/db');

// Configuración de Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;

const twilio = require('twilio');
const client = twilio(accountSid, authToken);

// ============================================
// FUNCIÓN: Determinar temporada (alta/baja)
// ============================================
// Temporada ALTA: 1 diciembre - 28 febrero
// Temporada BAJA: 1 marzo - 30 noviembre
const esTemporadaAlta = (fecha = new Date()) => {
  const mes = fecha.getMonth() + 1; // Enero = 1, Diciembre = 12
  // Temporada alta: diciembre (12), enero (1), febrero (2)
  return mes === 12 || mes === 1 || mes === 2;
};

const obtenerPrecioPorTemporada = (cabana) => {
  const temporadaAlta = esTemporadaAlta();
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
      Body,
      NumMedia,
      MediaUrl0,
      MediaContentType0
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
      .input('tipo_mensaje', sql.VarChar, NumMedia > 0 ? 'multimedia' : 'texto')
      .input('media_url', sql.Text, NumMedia > 0 ? MediaUrl0 : null)
      .input('estado', sql.VarChar, 'recibido')
      .query(`
        INSERT INTO dbo.mensajes_whatsapp (
          sid_twilio, telefono_cliente, telefono_negocio, direccion,
          mensaje, tipo_mensaje, media_url, estado, fecha_creacion
        )
        VALUES (
          @sid_twilio, @telefono_cliente, @telefono_negocio, @direccion,
          @mensaje, @tipo_mensaje, @media_url, @estado, GETDATE()
        )
      `);

    // Procesar mensaje y generar respuesta
    const respuesta = await procesarMensajeInteligente(mensaje, telefonoCliente);

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
// PROCESAMIENTO INTELIGENTE DE MENSAJES
// ============================================
const procesarMensajeInteligente = async (mensajeCliente, telefono) => {
  try {
    const mensajeLower = mensajeCliente.toLowerCase();
    const pool = await poolPromise;

    // 1. DETECTAR INTENT
    let intent = detectarIntent(mensajeLower);

    console.log(`🎯 Intent detectado: ${intent}`);

    // 2. PROCESAR SEGÚN INTENT
    switch (intent) {
      case 'consulta_disponibilidad':
      case 'reserva':
        return await generarMensajeDisponibilidad();

      case 'datos_pago':
        return await generarMensajeDatosPago();

      case 'hablar_ejecutivo':
        return await generarMensajeEjecutivo();

      case 'saludo':
        return await generarMensajeSaludo();

      case 'despedida':
        return await generarMensajeDespedida();

      // Detectar si el usuario está eligiendo una cabaña (número 1-10)
      case 'seleccion_cabana':
        const numeroCabana = extraerNumeroCabana(mensajeCliente);
        if (numeroCabana) {
          return await generarMensajeSeleccionCabana(numeroCabana);
        }
        break;

      default:
        return await generarMensajeDefault();
    }

  } catch (error) {
    console.error('❌ Error al procesar mensaje:', error);
    return {
      texto: 'Disculpa, hubo un error. Por favor intenta nuevamente o contacta a un ejecutivo.',
      intent: 'error'
    };
  }
};

// ============================================
// DETECTAR INTENT DEL MENSAJE
// ============================================
const detectarIntent = (mensajeLower) => {
  // Saludo
  if (/\b(hola|buenos dias|buenas tardes|buenas noches|hey|alo|buenas)\b/i.test(mensajeLower)) {
    return 'saludo';
  }

  // Disponibilidad o Reserva
  if (/\b(disponibilidad|disponible|fechas|libre|ver cabañas|opciones|reservar|reserva|quiero reservar|agendar)\b/i.test(mensajeLower)) {
    return 'consulta_disponibilidad';
  }

  // Datos de pago
  if (/\b(transferencia|datos|pago|cuenta|deposito|bancarios)\b/i.test(mensajeLower)) {
    return 'datos_pago';
  }

  // Hablar con ejecutivo
  if (/\b(ejecutivo|hablar|persona|ayuda|asesor|humano)\b/i.test(mensajeLower)) {
    return 'hablar_ejecutivo';
  }

  // Despedida
  if (/\b(gracias|chao|adios|hasta luego|bye)\b/i.test(mensajeLower)) {
    return 'despedida';
  }

  // Selección de cabaña (número del 1 al 10)
  if (/\b(cabaña|cabana|departamento)\s*([1-9]|10)\b/i.test(mensajeLower) || /^([1-9]|10)$/.test(mensajeLower.trim())) {
    return 'seleccion_cabana';
  }

  return 'desconocido';
};

// ============================================
// GENERAR MENSAJE DE DISPONIBILIDAD
// ============================================
const generarMensajeDisponibilidad = async () => {
  try {
    const pool = await poolPromise;

    // Obtener todas las 10 cabañas con su estado
    const cabanas = await pool.request()
      .query(`
        SELECT
          c.numero,
          c.nombre,
          c.capacidad_personas,
          c.precio_noche,
          c.precio_fin_semana,
          c.estado,
          CASE
            WHEN EXISTS (
              SELECT 1 FROM dbo.bloqueos_cabanas b
              WHERE b.cabana_id = c.id
                AND b.fecha_inicio <= CAST(GETDATE() AS DATE)
                AND b.fecha_fin >= CAST(GETDATE() AS DATE)
            ) THEN 'ocupada'
            ELSE c.estado
          END as estado_actual
        FROM dbo.cabanas c
        ORDER BY c.numero ASC
      `);

    // Determinar temporada actual
    const temporadaAlta = esTemporadaAlta();
    const nombreTemporada = temporadaAlta ? '🔥 TEMPORADA ALTA' : '🌿 TEMPORADA BAJA';

    let mensaje = '🏡 *CABAÑAS DISPONIBLES*\n\n';
    mensaje += `📅 ${nombreTemporada}\n`;
    mensaje += `${temporadaAlta ? '(Diciembre - Febrero)' : '(Marzo - Noviembre)'}\n\n`;

    // Mostrar Cabañas 1-8
    mensaje += '🏠 *CABAÑAS (1-8):*\n';
    const cabanas1a8 = cabanas.recordset.filter(c => c.numero >= 1 && c.numero <= 8);
    cabanas1a8.forEach(c => {
      const disponible = c.estado_actual === 'disponible';
      const icono = disponible ? '✅' : '❌';
      const { precio } = obtenerPrecioPorTemporada(c);
      mensaje += `${icono} *${c.nombre}*\n`;
      mensaje += `   👥 Capacidad: ${c.capacidad_personas} personas\n`;
      mensaje += `   💰 Precio: $${precio.toLocaleString('es-CL')}/noche\n`;
      mensaje += `   ${disponible ? '🟢 DISPONIBLE' : '🔴 OCUPADA'}\n\n`;
    });

    // Mostrar Departamentos (Cabañas 9 y 10)
    mensaje += '🏢 *DEPARTAMENTOS (9-10):*\n';
    const departamentos = cabanas.recordset.filter(c => c.numero === 9 || c.numero === 10);
    departamentos.forEach(c => {
      const disponible = c.estado_actual === 'disponible';
      const icono = disponible ? '✅' : '❌';
      const { precio } = obtenerPrecioPorTemporada(c);
      mensaje += `${icono} *${c.nombre}*\n`;
      mensaje += `   👥 Capacidad: ${c.capacidad_personas} personas\n`;
      mensaje += `   💰 Precio: $${precio.toLocaleString('es-CL')}/noche\n`;
      mensaje += `   ${disponible ? '🟢 DISPONIBLE' : '🔴 OCUPADA'}\n\n`;
    });

    mensaje += '━━━━━━━━━━━━━━━━━━━━\n';
    mensaje += '📝 *¿Qué deseas hacer?*\n\n';
    mensaje += '1️⃣ Escribe el número que te interesa (Ej: "3" o "9" para Depto A)\n';
    mensaje += '2️⃣ Escribe "datos" para ver información de transferencia\n';
    mensaje += '3️⃣ Escribe "ejecutivo" para hablar con una persona\n';

    return {
      texto: mensaje,
      intent: 'consulta_disponibilidad'
    };

  } catch (error) {
    console.error('❌ Error al generar disponibilidad:', error);
    return {
      texto: 'Disculpa, no pude obtener la disponibilidad. Por favor intenta nuevamente.',
      intent: 'error'
    };
  }
};

// ============================================
// GENERAR MENSAJE DE SELECCIÓN DE CABAÑA
// ============================================
const generarMensajeSeleccionCabana = async (numeroCabana) => {
  try {
    const pool = await poolPromise;

    const cabana = await pool.request()
      .input('numero', sql.Int, numeroCabana)
      .query(`
        SELECT c.*
        FROM dbo.cabanas c
        WHERE c.numero = @numero
      `);

    if (cabana.recordset.length === 0) {
      return {
        texto: `No encontré la cabaña número ${numeroCabana}. Por favor verifica el número e intenta nuevamente.`,
        intent: 'error'
      };
    }

    const c = cabana.recordset[0];

    // Obtener precio según temporada
    const { precio, nombreTemporada } = obtenerPrecioPorTemporada(c);

    let mensaje = `🏡 *${c.nombre.toUpperCase()}*\n\n`;
    mensaje += `📝 ${c.descripcion || c.nombre}\n\n`;
    mensaje += `👥 Capacidad: ${c.capacidad_personas} personas\n`;
    mensaje += `🛏️ Habitaciones: ${c.numero_habitaciones || 'N/A'}\n`;
    mensaje += `🚿 Baños: ${c.numero_banos || 'N/A'}\n\n`;
    mensaje += `💰 *Precio ${nombreTemporada}:*\n`;
    mensaje += `   $${precio.toLocaleString('es-CL')}/noche\n\n`;
    mensaje += `━━━━━━━━━━━━━━━━━━━━\n`;
    mensaje += `✅ *¡Excelente elección!*\n\n`;
    mensaje += `Para confirmar tu reserva, por favor envíame:\n\n`;
    mensaje += `📋 *Datos necesarios:*\n`;
    mensaje += `1️⃣ Tu nombre completo\n`;
    mensaje += `2️⃣ Fecha de entrada (DD/MM/YYYY)\n`;
    mensaje += `3️⃣ Fecha de salida (DD/MM/YYYY)\n`;
    mensaje += `4️⃣ Cantidad de personas\n\n`;
    mensaje += `Ejemplo:\n`;
    mensaje += `_Juan Pérez, 15/11/2025, 17/11/2025, 4 personas_\n\n`;
    mensaje += `O escribe *"ejecutivo"* si prefieres que te llamemos. 📞`;

    return {
      texto: mensaje,
      intent: 'seleccion_cabana'
    };

  } catch (error) {
    console.error('❌ Error al seleccionar cabaña:', error);
    return {
      texto: 'Disculpa, hubo un error. Por favor intenta nuevamente.',
      intent: 'error'
    };
  }
};

// ============================================
// GENERAR MENSAJE DE DATOS DE PAGO
// ============================================
const generarMensajeDatosPago = async () => {
  try {
    const pool = await poolPromise;

    const datos = await pool.request()
      .query(`
        SELECT TOP 1 *
        FROM dbo.datos_transferencia
        WHERE activo = 1 AND es_principal = 1
      `);

    if (datos.recordset.length === 0) {
      return {
        texto: 'No se encontraron datos de transferencia. Por favor contacta a un ejecutivo.',
        intent: 'error'
      };
    }

    const d = datos.recordset[0];

    let mensaje = `💳 *DATOS PARA TRANSFERENCIA*\n\n`;
    mensaje += `🏦 Banco: *${d.banco}*\n`;
    mensaje += `📋 Tipo de Cuenta: *${d.tipo_cuenta}*\n`;
    mensaje += `🔢 Número de Cuenta: *${d.numero_cuenta}*\n`;
    mensaje += `👤 Titular: *${d.titular}*\n`;
    mensaje += `🆔 RUT: *${d.rut_titular}*\n`;
    if (d.email_contacto) {
      mensaje += `📧 Email: ${d.email_contacto}\n`;
    }
    mensaje += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    mensaje += `\n📸 *IMPORTANTE:*\n`;
    mensaje += `Una vez realizada la transferencia, por favor envíame el comprobante de pago para confirmar tu reserva.\n\n`;
    mensaje += `✅ Aceptamos:\n`;
    mensaje += `• Transferencia bancaria\n`;
    mensaje += `• Depósito\n`;
    mensaje += `• Efectivo (en el lugar)\n\n`;
    mensaje += `¿Necesitas ayuda? Escribe *"ejecutivo"* 📞`;

    return {
      texto: mensaje,
      intent: 'datos_pago'
    };

  } catch (error) {
    console.error('❌ Error al obtener datos de pago:', error);
    return {
      texto: 'Disculpa, no pude obtener los datos de pago. Por favor contacta a un ejecutivo.',
      intent: 'error'
    };
  }
};

// ============================================
// OTROS MENSAJES
// ============================================

const generarMensajeSaludo = async () => {
  return {
    texto: `¡Hola! 👋 Bienvenido a *Cabañas Beach*.\n\n¿En qué puedo ayudarte?\n\n1️⃣ Ver disponibilidad de cabañas\n2️⃣ Hacer una reserva\n3️⃣ Ver datos para transferencia\n4️⃣ Hablar con un ejecutivo\n\nEscribe el número de la opción o describe lo que necesitas.`,
    intent: 'saludo'
  };
};

const generarMensajeEjecutivo = async () => {
  return {
    texto: `👤 *Contacto con Ejecutivo*\n\nPerfecto, un ejecutivo te contactará pronto.\n\nMientras tanto, puedes llamarnos directamente al:\n📞 *+56 9 4265 2034*\n\nHorario de atención:\n🕐 Lunes a Domingo: 9:00 - 21:00 hrs\n\n¡Estaremos encantados de atenderte! 😊`,
    intent: 'hablar_ejecutivo'
  };
};

const generarMensajeDespedida = async () => {
  return {
    texto: `¡Gracias por contactarnos! 😊\n\nQue tengas un excelente día.\n\n🏡 *Cabañas Beach*\nSiempre a tu servicio 🌊`,
    intent: 'despedida'
  };
};

const generarMensajeDefault = async () => {
  return {
    texto: `No estoy seguro de lo que necesitas. 🤔\n\nPuedo ayudarte con:\n\n✅ Ver disponibilidad de cabañas\n✅ Hacer una reserva\n✅ Enviarte datos para transferencia\n✅ Contactarte con un ejecutivo\n\nPor favor escribe lo que necesitas o escribe "hola" para ver el menú principal.`,
    intent: 'desconocido'
  };
};

// ============================================
// UTILIDADES
// ============================================

const extraerNumeroCabana = (mensaje) => {
  // Buscar "cabaña 3", "cabana 3", "departamento 9", o solo "3", "10"
  const match = mensaje.match(/(?:cabaña|cabana|departamento|depto)\s*([1-9]|10)|^([1-9]|10)$/i);
  if (match) {
    return parseInt(match[1] || match[2]);
  }
  return null;
};

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
// EXPORTAR LAS OTRAS FUNCIONES (de la versión anterior)
// ============================================

exports.webhookStatus = async (req, res) => {
  try {
    const { MessageSid, MessageStatus } = req.body;
    console.log(`📊 Estado de mensaje ${MessageSid}: ${MessageStatus}`);

    const pool = await poolPromise;
    await pool.request()
      .input('sid_twilio', sql.VarChar, MessageSid)
      .input('estado_twilio', sql.VarChar, MessageStatus)
      .query(`
        UPDATE dbo.mensajes_whatsapp
        SET estado_twilio = @estado_twilio, fecha_procesamiento = GETDATE()
        WHERE sid_twilio = @sid_twilio
      `);

    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Error al actualizar estado:', error);
    res.sendStatus(200);
  }
};

exports.enviarMensajeManual = async (req, res) => {
  try {
    const { telefono, mensaje } = req.body;

    if (!telefono || !mensaje) {
      return res.status(400).json({
        success: false,
        message: 'Teléfono y mensaje son requeridos'
      });
    }

    const twilioResponse = await enviarMensajeWhatsApp(telefono, mensaje);

    const pool = await poolPromise;
    await pool.request()
      .input('sid_twilio', sql.VarChar, twilioResponse.sid)
      .input('telefono_cliente', sql.VarChar, telefono.replace('whatsapp:', '').replace('+', ''))
      .input('telefono_negocio', sql.VarChar, twilioWhatsAppNumber.replace('whatsapp:', ''))
      .input('direccion', sql.VarChar, 'saliente')
      .input('mensaje', sql.Text, mensaje)
      .input('tipo_mensaje', sql.VarChar, 'texto')
      .input('estado', sql.VarChar, 'enviado')
      .input('intent', sql.VarChar, 'manual')
      .input('respondido_automaticamente', sql.Bit, 0)
      .query(`
        INSERT INTO dbo.mensajes_whatsapp (
          sid_twilio, telefono_cliente, telefono_negocio, direccion, mensaje,
          tipo_mensaje, estado, intent, respondido_automaticamente, fecha_creacion
        )
        VALUES (
          @sid_twilio, @telefono_cliente, @telefono_negocio, @direccion, @mensaje,
          @tipo_mensaje, @estado, @intent, @respondido_automaticamente, GETDATE()
        )
      `);

    return res.json({
      success: true,
      message: 'Mensaje enviado correctamente',
      sid: twilioResponse.sid
    });

  } catch (error) {
    console.error('❌ Error al enviar mensaje manual:', error);
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
    const mensaje = await client.messages.create({
      from: twilioWhatsAppNumber,
      to: 'whatsapp:+56942652034',
      body: '🎉 ¡Mensaje de prueba! El sistema de Cabañas Beach está funcionando correctamente.'
    });

    return res.json({
      success: true,
      message: 'Mensaje de prueba enviado',
      sid: mensaje.sid,
      status: mensaje.status
    });

  } catch (error) {
    console.error('❌ Error en test de envío:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al enviar mensaje de prueba',
      error: error.message
    });
  }
};

module.exports = exports;
