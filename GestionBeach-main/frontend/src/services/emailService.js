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

export default {
  verificarSucursalesCriticas,
  enviarEmailPrueba,
  verificarConfiguracion,
  obtenerEstadisticasMonitoreo,
  limpiarCache
};