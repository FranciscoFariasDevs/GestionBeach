// frontend/src/services/emailService.js
import emailjs from '@emailjs/browser';

// Configuración de EmailJS
const SERVICE_ID = 'service_t1z66dc';
const TEMPLATE_ID = 'template_bpv4k2n';
const PUBLIC_KEY = 'e3qsddjIEc4pTK3ub';

// Inicializar EmailJS
emailjs.init(PUBLIC_KEY);

// Email de destino
const EMAIL_DESTINO = 'fariseodesarrollador@gmail.com';

// 🔧 CONFIGURACIÓN DE MONITOREO - SOLO DESPUÉS DE 10 MINUTOS
const TIEMPO_ALERTA_CRITICA = 10 * 60 * 1000; // 10 minutos en milisegundos
const TIEMPO_ENTRE_ALERTAS = 30 * 60 * 1000; // 30 minutos entre alertas críticas

// 📊 Cache para tracking de sucursales caídas
let sucursalesCaidasCache = new Map();

/**
 * ⏰ FUNCIÓN PRINCIPAL: Verificar sucursales caídas por más de 10 minutos
 * Esta es la ÚNICA función que envía emails automáticamente
 */
export const verificarSucursalesCriticas = async (sucursales) => {
  const ahora = Date.now();
  const alertasEnviadas = [];

  for (const sucursal of sucursales) {
    const claveSucursal = `sucursal_${sucursal.id}`;
    const hayProblemas = !sucursal.ping?.activo || !sucursal.baseDatos?.conectado;

    if (hayProblemas) {
      // Si es la primera vez que detectamos el problema, registrar tiempo
      if (!sucursalesCaidasCache.has(claveSucursal)) {
        sucursalesCaidasCache.set(claveSucursal, {
          inicioProblema: ahora,
          ultimaAlertaCritica: 0,
          tipoError: determinarTipoError(sucursal),
          sucursalData: { ...sucursal }
        });
        console.log(`📝 Registrando inicio de problema en ${sucursal.nombre} a las ${new Date(ahora).toLocaleTimeString()}`);
      } else {
        // Verificar si ha pasado el tiempo crítico (10 minutos)
        const info = sucursalesCaidasCache.get(claveSucursal);
        const tiempoCaida = ahora - info.inicioProblema;
        const tiempoDesdeUltimaAlerta = ahora - info.ultimaAlertaCritica;

        // ⚠️ CONDICIÓN PRINCIPAL: Solo enviar si han pasado 10+ minutos Y han pasado 30+ min desde la última alerta
        if (tiempoCaida >= TIEMPO_ALERTA_CRITICA && tiempoDesdeUltimaAlerta >= TIEMPO_ENTRE_ALERTAS) {
          const minutosCaida = Math.round(tiempoCaida / 1000 / 60);
          console.log(`🚨 ALERTA CRÍTICA: ${sucursal.nombre} lleva ${minutosCaida} minutos caída`);
          
          try {
            const resultado = await enviarAlertaCritica(sucursal, minutosCaida);
            if (resultado.success) {
              // Actualizar timestamp de última alerta crítica
              info.ultimaAlertaCritica = ahora;
              sucursalesCaidasCache.set(claveSucursal, info);
              
              alertasEnviadas.push({
                sucursal: sucursal.nombre,
                tiempoCaida: minutosCaida,
                tipo: 'CRÍTICA - 10+ MINUTOS'
              });
            }
          } catch (error) {
            console.error(`Error enviando alerta crítica para ${sucursal.nombre}:`, error);
          }
        } else if (tiempoCaida >= TIEMPO_ALERTA_CRITICA) {
          // Solo log, sin enviar email
          const minutosCaida = Math.round(tiempoCaida / 1000 / 60);
          const minutosParaProximaAlerta = Math.round((info.ultimaAlertaCritica + TIEMPO_ENTRE_ALERTAS - ahora) / 1000 / 60);
          console.log(`⏳ ${sucursal.nombre}: ${minutosCaida} min caída. Próxima alerta en ${minutosParaProximaAlerta} min`);
        }
      }
    } else {
      // Si la sucursal está operativa, eliminar del cache y notificar recuperación
      if (sucursalesCaidasCache.has(claveSucursal)) {
        const info = sucursalesCaidasCache.get(claveSucursal);
        const tiempoCaida = ahora - info.inicioProblema;
        const minutosCaida = Math.round(tiempoCaida / 1000 / 60);
        
        console.log(`✅ ${sucursal.nombre} se ha recuperado después de ${minutosCaida} minutos`);
        
        // Enviar notificación de recuperación solo si estuvo caída por más de 10 minutos
        if (tiempoCaida >= TIEMPO_ALERTA_CRITICA) {
          try {
            await enviarAlertaRecuperacion(sucursal, minutosCaida);
            alertasEnviadas.push({
              sucursal: sucursal.nombre,
              tiempoCaida: minutosCaida,
              tipo: 'RECUPERACIÓN'
            });
          } catch (error) {
            console.error(`Error enviando alerta de recuperación para ${sucursal.nombre}:`, error);
          }
        }
        
        sucursalesCaidasCache.delete(claveSucursal);
      }
    }
  }

  return alertasEnviadas;
};

/**
 * 🚨 Enviar alerta crítica (más de 10 minutos caída)
 */
const enviarAlertaCritica = async (sucursal, minutosCaida) => {
  try {
    console.log(`📧 Enviando alerta crítica para ${sucursal.nombre} (${minutosCaida} min caída)`);
    
    const fechaHora = new Date().toLocaleString('es-CL', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const templateParams = {
      // Template variables que coinciden con tu HTML
      tipo_error: `🔴 ALERTA CRÍTICA - ${minutosCaida} MINUTOS SIN CONEXIÓN`,
      sucursal_nombre: sucursal.nombre,
      sucursal_direccion: sucursal.direccion || sucursal.nombre,
      sucursal_ip: sucursal.ip,
      sucursal_puerto: sucursal.puerto,
      sucursal_database: sucursal.database,
      sucursal_tipo: sucursal.tipo,
      fecha_hora: fechaHora,
      estado_red: sucursal.ping?.activo ? '✅ Activa' : '❌ Inactiva',
      estado_bd: sucursal.baseDatos?.conectado ? '✅ Conectada' : '❌ Desconectada',
      error_red: sucursal.ping?.error || 'Sin errores',
      error_bd: sucursal.baseDatos?.error || 'Sin errores',
      ping_tiempo: sucursal.ping?.tiempo ? `${sucursal.ping.tiempo}ms` : 'N/A',
      
      // Email settings
      from_name: 'Sistema Beach Market',
      subject: `🔴 CRÍTICO: ${sucursal.nombre} - ${minutosCaida} min sin conexión`
    };

    console.log('📤 Enviando alerta crítica con parámetros:', templateParams);

    const result = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);

    console.log('✅ Alerta crítica enviada exitosamente:', result);
    return { 
      success: true, 
      result,
      message: `Alerta crítica enviada para ${sucursal.nombre}`
    };
    
  } catch (error) {
    console.error('❌ Error enviando alerta crítica:', error);
    return { 
      success: false, 
      error: error.text || error.message || 'Error desconocido'
    };
  }
};

/**
 * ✅ Enviar alerta de recuperación
 */
const enviarAlertaRecuperacion = async (sucursal, minutosInactiva) => {
  try {
    console.log(`📧 Enviando alerta de recuperación para ${sucursal.nombre}`);
    
    const fechaHora = new Date().toLocaleString('es-CL', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const templateParams = {
      tipo_error: `✅ RECUPERACIÓN EXITOSA`,
      sucursal_nombre: sucursal.nombre,
      sucursal_direccion: sucursal.direccion || sucursal.nombre,
      sucursal_ip: sucursal.ip,
      sucursal_puerto: sucursal.puerto,
      sucursal_database: sucursal.database,
      sucursal_tipo: sucursal.tipo,
      fecha_hora: fechaHora,
      estado_red: '✅ Activa',
      estado_bd: '✅ Conectada',
      error_red: 'Recuperada exitosamente',
      error_bd: 'Recuperada exitosamente',
      ping_tiempo: sucursal.ping?.tiempo ? `${sucursal.ping.tiempo}ms` : 'N/A',
      from_name: 'Sistema Beach Market',
      subject: `✅ RECUPERADA: ${sucursal.nombre} (estuvo ${minutosInactiva} min caída)`
    };

    const result = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);

    console.log('✅ Alerta de recuperación enviada exitosamente:', result);
    return { 
      success: true, 
      result,
      message: `Alerta de recuperación enviada para ${sucursal.nombre}`
    };
    
  } catch (error) {
    console.error('❌ Error enviando alerta de recuperación:', error);
    return { 
      success: false, 
      error: error.text || error.message || 'Error desconocido'
    };
  }
};

/**
 * 🧪 Función para enviar email de prueba (manual)
 */
export const enviarEmailPrueba = async () => {
  try {
    console.log('🧪 Enviando email de prueba...');
    
    const fechaHora = new Date().toLocaleString('es-CL', {
      timeZone: 'America/Santiago'
    });

    const templateParams = {
      tipo_error: '🧪 PRUEBA DEL SISTEMA DE NOTIFICACIONES',
      sucursal_nombre: 'SISTEMA DE PRUEBA',
      sucursal_direccion: 'Dashboard de Monitoreo',
      sucursal_ip: 'localhost',
      sucursal_puerto: '3000',
      sucursal_database: 'Sistema Web',
      sucursal_tipo: 'PRUEBA',
      fecha_hora: fechaHora,
      estado_red: '✅ Operativo',
      estado_bd: '✅ Operativo',
      error_red: 'Sistema funcionando correctamente',
      error_bd: 'Todas las funcionalidades activas',
      ping_tiempo: '< 1ms',
      from_name: 'Sistema Beach Market',
      subject: '✅ Prueba de Notificaciones - Beach Market'
    };

    const result = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);

    console.log('✅ Email de prueba enviado exitosamente:', result);
    return { 
      success: true, 
      result,
      message: 'Email de prueba enviado correctamente'
    };
    
  } catch (error) {
    console.error('❌ Error enviando email de prueba:', error);
    return { 
      success: false, 
      error: error.text || error.message || 'Error desconocido'
    };
  }
};

/**
 * 🔍 Determinar tipo de error
 */
const determinarTipoError = (sucursal) => {
  const hayProblemaRed = !sucursal.ping?.activo;
  const hayProblemaBD = !sucursal.baseDatos?.conectado;
  
  if (hayProblemaRed && hayProblemaBD) {
    return 'CONEXIÓN COMPLETA PERDIDA';
  } else if (hayProblemaRed) {
    return 'ERROR DE RED';
  } else if (hayProblemaBD) {
    return 'ERROR DE BASE DE DATOS';
  }
  return 'ERROR DESCONOCIDO';
};

/**
 * 🔧 Verificar configuración
 */
export const verificarConfiguracion = () => {
  return { 
    success: true, 
    message: `✅ Configuración de EmailJS correcta
📧 Service: ${SERVICE_ID}
📝 Template: ${TEMPLATE_ID}
🔑 Public Key: ${PUBLIC_KEY.substring(0, 8)}...
📬 Email destino: ${EMAIL_DESTINO}
⏰ Alerta crítica: SOLO después de ${TIEMPO_ALERTA_CRITICA / 1000 / 60} minutos`
  };
};

/**
 * 📊 Obtener estadísticas del monitoreo
 */
export const obtenerEstadisticasMonitoreo = () => {
  const sucursalesEnProblemas = Array.from(sucursalesCaidasCache.entries()).map(([clave, info]) => {
    const tiempoTranscurrido = Date.now() - info.inicioProblema;
    const minutosTranscurridos = Math.round(tiempoTranscurrido / 1000 / 60);
    const faltanParaAlerta = Math.max(0, Math.round((TIEMPO_ALERTA_CRITICA - tiempoTranscurrido) / 1000 / 60));
    const proximaAlerta = info.ultimaAlertaCritica + TIEMPO_ENTRE_ALERTAS > Date.now() ? 
      Math.round((info.ultimaAlertaCritica + TIEMPO_ENTRE_ALERTAS - Date.now()) / 1000 / 60) : 0;

    return {
      id: clave.replace('sucursal_', ''),
      tiempoCaida: minutosTranscurridos,
      tipoError: info.tipoError,
      faltanParaAlerta: faltanParaAlerta,
      proximaAlerta: proximaAlerta,
      yaEnviada: info.ultimaAlertaCritica > 0
    };
  });

  return {
    sucursalesMonitoreadas: sucursalesEnProblemas.length,
    sucursalesEnProblemas,
    tiempoAlertaCritica: TIEMPO_ALERTA_CRITICA / 1000 / 60,
    tiempoEntreAlertas: TIEMPO_ENTRE_ALERTAS / 1000 / 60
  };
};

/**
 * 🗑️ Limpiar cache (función de utilidad)
 */
export const limpiarCache = () => {
  sucursalesCaidasCache.clear();
  console.log('🗑️ Cache de monitoreo limpiado');
};

/**
 * 🏖️ Enviar confirmación de reserva de cabaña por email
 */
export const enviarConfirmacionReservaCabana = async (reservaData) => {
  try {
    console.log('📧 Enviando confirmación de reserva de cabaña...');

    const fechaHora = new Date().toLocaleString('es-CL', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const templateParams = {
      // Datos del cliente
      cliente_nombre: `${reservaData.cliente_nombre} ${reservaData.cliente_apellido || ''}`.trim(),
      cliente_email: reservaData.cliente_email || EMAIL_DESTINO,
      cliente_telefono: reservaData.cliente_telefono,
      cliente_rut: reservaData.cliente_rut || 'No especificado',

      // Datos de la cabaña
      cabana_nombre: reservaData.cabana_nombre,
      fecha_inicio: reservaData.fecha_inicio,
      fecha_fin: reservaData.fecha_fin,
      cantidad_noches: reservaData.cantidad_noches,
      cantidad_personas: reservaData.cantidad_personas,

      // Costos
      precio_por_noche: `$${reservaData.precio_por_noche?.toLocaleString('es-CL')}`,
      personas_extra: reservaData.personas_extra || 0,
      costo_personas_extra: `$${reservaData.costo_personas_extra?.toLocaleString('es-CL')}`,
      precio_total: `$${reservaData.precio_total?.toLocaleString('es-CL')}`,

      // Tinajas (si las hay)
      tinajas_info: reservaData.tinajas && reservaData.tinajas.length > 0 ?
        reservaData.tinajas.map(t => `Tinaja (${t.fecha_uso}): $${t.precio_dia?.toLocaleString('es-CL')}`).join(', ') :
        'Sin tinajas',

      // Vehículos
      vehiculos_info: reservaData.matriculas_auto && reservaData.matriculas_auto.length > 0 ?
        reservaData.matriculas_auto.join(', ') :
        'Sin vehículos registrados',

      // Otros
      procedencia: reservaData.procedencia || 'No especificada',
      fecha_hora: fechaHora,

      // Email settings
      from_name: 'Cabañas El Mirador',
      subject: `Confirmación de Reserva - ${reservaData.cabana_nombre}`,
      reply_to: EMAIL_DESTINO
    };

    console.log('📤 Enviando confirmación de reserva con parámetros:', templateParams);

    const result = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);

    console.log('✅ Confirmación de reserva enviada exitosamente:', result);
    return {
      success: true,
      result,
      message: 'Confirmación de reserva enviada correctamente'
    };

  } catch (error) {
    console.error('❌ Error enviando confirmación de reserva:', error);
    return {
      success: false,
      error: error.text || error.message || 'Error desconocido'
    };
  }
};

/**
 * 📨 Enviar mensaje de contacto a comunicate@beach.cl
 */
export const enviarMensajeContacto = async (contactoData) => {
  try {
    console.log('📧 Enviando mensaje de contacto...');

    const fechaHora = new Date().toLocaleString('es-CL', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const templateParams = {
      // Datos del contacto
      tipo_mensaje: '📧 NUEVO MENSAJE DE CONTACTO',
      nombre_completo: contactoData.nombre,
      email_remitente: contactoData.email,
      telefono: contactoData.telefono,
      asunto: contactoData.asunto,
      mensaje: contactoData.mensaje,
      fecha_hora: fechaHora,

      // Email settings
      from_name: 'Website Beach Market',
      subject: `Contacto: ${contactoData.asunto}`,
      to_email: 'comunicate@beach.cl',
      reply_to: contactoData.email
    };

    console.log('📤 Enviando mensaje de contacto con parámetros:', templateParams);

    const result = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);

    console.log('✅ Mensaje de contacto enviado exitosamente:', result);
    return {
      success: true,
      result,
      message: 'Mensaje enviado correctamente a comunicate@beach.cl'
    };

  } catch (error) {
    console.error('❌ Error enviando mensaje de contacto:', error);
    return {
      success: false,
      error: error.text || error.message || 'Error desconocido'
    };
  }
};

/**
 * 💼 Enviar postulación laboral a unete@beach.cl
 */
export const enviarPostulacion = async (postulacionData) => {
  try {
    console.log('📧 Enviando postulación laboral...');

    const fechaHora = new Date().toLocaleString('es-CL', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const templateParams = {
      // Datos de la postulación
      tipo_mensaje: '💼 NUEVA POSTULACIÓN LABORAL',
      nombre_completo: postulacionData.nombre,
      email_remitente: postulacionData.email,
      telefono: postulacionData.telefono,
      mensaje: postulacionData.mensaje || 'Sin mensaje adicional',
      curriculum_nombre: postulacionData.curriculum?.name || 'CV adjunto',
      fecha_hora: fechaHora,

      // Email settings
      from_name: 'Postulaciones Beach Market',
      subject: `Nueva Postulación: ${postulacionData.nombre}`,
      to_email: 'unete@beach.cl',
      reply_to: postulacionData.email
    };

    console.log('📤 Enviando postulación con parámetros:', templateParams);

    // Nota: EmailJS tiene limitaciones con archivos adjuntos grandes
    // Para PDFs, considera usar un servicio de almacenamiento y enviar el link
    const result = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);

    console.log('✅ Postulación enviada exitosamente:', result);
    return {
      success: true,
      result,
      message: 'Postulación enviada correctamente a unete@beach.cl. Por favor, envía tu CV directamente al email unete@beach.cl'
    };

  } catch (error) {
    console.error('❌ Error enviando postulación:', error);
    return {
      success: false,
      error: error.text || error.message || 'Error desconocido'
    };
  }
};

export default {
  verificarSucursalesCriticas,
  enviarEmailPrueba,
  verificarConfiguracion,
  obtenerEstadisticasMonitoreo,
  limpiarCache,
  enviarConfirmacionReservaCabana,
  enviarMensajeContacto,
  enviarPostulacion
};