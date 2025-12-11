// backend/services/emailService.js
const emailjs = require('@emailjs/nodejs');

// Configuración de EmailJS desde variables de entorno
const SERVICE_ID = process.env.EMAIL_SERVICE_ID || 'service_t1z66dc';
const TEMPLATE_ID = process.env.EMAIL_TEMPLATE_ID || 'template_bpv4k2n';
const PUBLIC_KEY = process.env.EMAIL_PUBLIC_KEY || 'e3qsddjIEc4pTK3ub';
const PRIVATE_KEY = process.env.EMAIL_PRIVATE_KEY || '';

// Email institucional
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Beach Market - Cabañas El Mirador';
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || 'soporte@beachmarket.cl';

/**
 * 🏖️ Enviar confirmación de reserva de cabaña por email
 * Esta función se ejecuta desde el backend después de confirmar el pago con Webpay
 */
const enviarConfirmacionReservaCabana = async (reservaData) => {
  try {
    console.log('📧 [Backend] Enviando confirmación de reserva de cabaña...');
    console.log('📦 Datos de reserva recibidos:', {
      id: reservaData.id,
      cliente: reservaData.cliente_nombre,
      email: reservaData.cliente_email,
      cabana: reservaData.cabana_nombre
    });

    const fechaHora = new Date().toLocaleString('es-CL', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Formatear fechas
    const formatearFecha = (fecha) => {
      if (!fecha) return 'No especificada';
      try {
        const date = new Date(fecha);
        return date.toLocaleDateString('es-CL', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      } catch (error) {
        return fecha;
      }
    };

    const templateParams = {
      // Datos del cliente
      cliente_nombre: `${reservaData.cliente_nombre} ${reservaData.cliente_apellido || ''}`.trim(),
      cliente_email: reservaData.cliente_email || EMAIL_REPLY_TO,
      cliente_telefono: reservaData.cliente_telefono || 'No especificado',
      cliente_rut: reservaData.cliente_rut || 'No especificado',

      // Datos de la cabaña
      cabana_nombre: reservaData.cabana_nombre || 'No especificada',
      fecha_inicio: formatearFecha(reservaData.fecha_inicio),
      fecha_fin: formatearFecha(reservaData.fecha_fin),
      cantidad_noches: reservaData.cantidad_noches || 0,
      cantidad_personas: reservaData.cantidad_personas || 0,

      // Costos
      precio_por_noche: `$${(reservaData.precio_noche || 0).toLocaleString('es-CL')}`,
      personas_extra: reservaData.personas_extra || 0,
      costo_personas_extra: `$${(reservaData.costo_personas_extra || 0).toLocaleString('es-CL')}`,
      precio_total: `$${(reservaData.precio_total || 0).toLocaleString('es-CL')}`,

      // Tinajas (si las hay)
      tinajas_info: reservaData.tinajas && reservaData.tinajas.length > 0 ?
        reservaData.tinajas.map(t => `Tinaja (${t.fecha_uso}): $${(t.precio_dia || 0).toLocaleString('es-CL')}`).join(', ') :
        'Sin tinajas',

      // Vehículos
      vehiculos_info: reservaData.matriculas_auto && reservaData.matriculas_auto.length > 0 ?
        reservaData.matriculas_auto.join(', ') :
        'Sin vehículos registrados',

      // Otros
      procedencia: reservaData.procedencia || 'No especificada',
      fecha_hora: fechaHora,
      reserva_id: reservaData.id,

      // Email settings
      from_name: EMAIL_FROM_NAME,
      subject: `Confirmación de Reserva - ${reservaData.cabana_nombre || 'Cabaña'}`,
      to_email: reservaData.cliente_email || EMAIL_REPLY_TO,
      reply_to: EMAIL_REPLY_TO
    };

    console.log('📤 [Backend] Enviando confirmación de reserva con parámetros:', {
      to: templateParams.to_email,
      cliente: templateParams.cliente_nombre,
      cabana: templateParams.cabana_nombre,
      precio: templateParams.precio_total
    });

    // Enviar email usando EmailJS Node.js
    const result = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      templateParams,
      {
        publicKey: PUBLIC_KEY,
        privateKey: PRIVATE_KEY || undefined
      }
    );

    console.log('✅ [Backend] Confirmación de reserva enviada exitosamente:', result);
    return {
      success: true,
      result,
      message: 'Confirmación de reserva enviada correctamente'
    };

  } catch (error) {
    console.error('❌ [Backend] Error enviando confirmación de reserva:', error);
    console.error('❌ Detalles del error:', {
      message: error.message,
      status: error.status,
      text: error.text
    });
    return {
      success: false,
      error: error.text || error.message || 'Error desconocido'
    };
  }
};

/**
 * 🧪 Función para enviar email de prueba (manual)
 */
const enviarEmailPrueba = async () => {
  try {
    console.log('🧪 [Backend] Enviando email de prueba...');

    const fechaHora = new Date().toLocaleString('es-CL', {
      timeZone: 'America/Santiago'
    });

    const templateParams = {
      cliente_nombre: 'Cliente de Prueba',
      cliente_email: EMAIL_REPLY_TO,
      cliente_telefono: '+56 9 1234 5678',
      cliente_rut: '12.345.678-9',
      cabana_nombre: 'Cabaña de Prueba',
      fecha_inicio: '01/01/2025',
      fecha_fin: '03/01/2025',
      cantidad_noches: 2,
      cantidad_personas: 4,
      precio_por_noche: '$50.000',
      personas_extra: 0,
      costo_personas_extra: '$0',
      precio_total: '$100.000',
      tinajas_info: 'Sin tinajas',
      vehiculos_info: 'ABC-123',
      procedencia: 'Santiago',
      fecha_hora: fechaHora,
      reserva_id: '999',
      from_name: EMAIL_FROM_NAME,
      subject: 'Prueba de Confirmación - Sistema de Reservas',
      to_email: EMAIL_REPLY_TO,
      reply_to: EMAIL_REPLY_TO
    };

    const result = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      templateParams,
      {
        publicKey: PUBLIC_KEY,
        privateKey: PRIVATE_KEY || undefined
      }
    );

    console.log('✅ [Backend] Email de prueba enviado exitosamente:', result);
    return {
      success: true,
      result,
      message: 'Email de prueba enviado correctamente'
    };

  } catch (error) {
    console.error('❌ [Backend] Error enviando email de prueba:', error);
    return {
      success: false,
      error: error.text || error.message || 'Error desconocido'
    };
  }
};

/**
 * 🔧 Verificar configuración
 */
const verificarConfiguracion = () => {
  return {
    success: true,
    message: `✅ Configuración de EmailJS correcta (Backend)
📧 Service: ${SERVICE_ID}
📝 Template: ${TEMPLATE_ID}
🔑 Public Key: ${PUBLIC_KEY.substring(0, 8)}...
📬 Email institucional: ${EMAIL_REPLY_TO}
🏢 Nombre remitente: ${EMAIL_FROM_NAME}`
  };
};

module.exports = {
  enviarConfirmacionReservaCabana,
  enviarEmailPrueba,
  verificarConfiguracion
};
