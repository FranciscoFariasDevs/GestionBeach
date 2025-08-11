// backend/services/whatsappService.js - Configurado para Twilio
const twilio = require('twilio');

class WhatsAppService {
  constructor() {
    // Configuración de Twilio desde variables de entorno (usando tus nombres exactos)
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Tu variable
    this.toWhatsApp = process.env.TWILIO_WHATSAPP_TO || 'whatsapp:+56995367372'; // Tu número
    
    // Inicializar cliente Twilio
    this.client = null;
    this.mode = 'twilio'; // 'twilio', 'web', 'demo'
    
    this.initializeTwilio();
  }

  // Inicializar cliente de Twilio
  initializeTwilio() {
    try {
      if (this.accountSid && this.authToken) {
        this.client = twilio(this.accountSid, this.authToken);
        this.mode = 'twilio';
        console.log('✅ Cliente Twilio inicializado correctamente');
        console.log(`📱 Desde: ${this.fromWhatsApp}`);
        console.log(`📱 Hacia: ${this.toWhatsApp}`);
      } else {
        console.warn('⚠️ Credenciales de Twilio no configuradas, usando modo web/demo');
        this.mode = 'web';
      }
    } catch (error) {
      console.error('❌ Error al inicializar Twilio:', error.message);
      this.mode = 'demo';
    }
  }

  // Formatear mensaje de alerta profesional para WhatsApp
  formatAlertMessage(productos, diasAlerta) {
    const fecha = new Date().toLocaleDateString('es-CL');
    const hora = new Date().toLocaleTimeString('es-CL', { hour12: false });
    
    let mensaje = `🚨 *ALERTA DE INVENTARIO* 🚨\n\n`;
    mensaje += `📅 *Fecha:* ${fecha} - ${hora}\n`;
    mensaje += `⏰ *Criterio:* Productos que vencen en ${diasAlerta} días o menos\n\n`;
    
    if (productos.length === 0) {
      mensaje += `✅ *¡EXCELENTE NOTICIA!*\n\n`;
      mensaje += `No hay productos próximos a vencer en los próximos ${diasAlerta} días.\n\n`;
      mensaje += `El inventario está bajo control. 👍\n\n`;
    } else {
      mensaje += `⚠️ *${productos.length} PRODUCTOS REQUIEREN ATENCIÓN:*\n\n`;
      
      // Agrupar por criticidad
      const criticos = productos.filter(p => p.diasVencimiento <= 3);
      const warnings = productos.filter(p => p.diasVencimiento > 3 && p.diasVencimiento <= 7);
      const otros = productos.filter(p => p.diasVencimiento > 7);
      
      // Productos críticos (≤3 días)
      if (criticos.length > 0) {
        mensaje += `🔴 *CRÍTICOS - ACCIÓN INMEDIATA (${criticos.length})*\n`;
        mensaje += `_Vencen en 3 días o menos:_\n\n`;
        
        criticos.slice(0, 8).forEach((p, i) => {
          mensaje += `${i + 1}. *${p.nombre}*\n`;
          mensaje += `   📋 Código: \`${p.codigo}\`\n`;
          mensaje += `   ⏳ Vence en: *${p.diasVencimiento} día${p.diasVencimiento !== 1 ? 's' : ''}*\n`;
          mensaje += `   📅 Fecha: ${p.fechaVencimiento}\n`;
          if (p.temperatura) {
            mensaje += `   🌡️ Temp: ${p.temperatura}\n`;
          }
          if (p.promocion) {
            mensaje += `   🏷️ *YA EN PROMOCIÓN*\n`;
          }
          mensaje += `\n`;
        });
        
        if (criticos.length > 8) {
          mensaje += `   ... y *${criticos.length - 8} productos críticos más*\n\n`;
        }
      }
      
      // Productos advertencia (4-7 días)
      if (warnings.length > 0) {
        mensaje += `🟡 *ADVERTENCIA - PLANIFICAR ACCIÓN (${warnings.length})*\n`;
        mensaje += `_Vencen entre 4-7 días:_\n\n`;
        
        warnings.slice(0, 5).forEach((p, i) => {
          mensaje += `${i + 1}. *${p.nombre}* - ${p.diasVencimiento} días\n`;
          mensaje += `   📋 \`${p.codigo}\` | 📅 ${p.fechaVencimiento}\n`;
          if (p.promocion) {
            mensaje += `   🏷️ En promoción\n`;
          }
          mensaje += `\n`;
        });
        
        if (warnings.length > 5) {
          mensaje += `   ... y *${warnings.length - 5} productos más*\n\n`;
        }
      }
      
      // Otros productos
      if (otros.length > 0) {
        mensaje += `🟢 *OTROS PRODUCTOS (${otros.length})*\n`;
        mensaje += `_Vencen en ${diasAlerta} días_\n\n`;
      }
    }
    
    // Resumen estadístico
    mensaje += `📊 *RESUMEN EJECUTIVO:*\n`;
    mensaje += `• *Total productos:* ${productos.length}\n`;
    mensaje += `• *Críticos (≤3 días):* ${productos.filter(p => p.diasVencimiento <= 3).length}\n`;
    mensaje += `• *Advertencia (4-7 días):* ${productos.filter(p => p.diasVencimiento > 3 && p.diasVencimiento <= 7).length}\n`;
    mensaje += `• *Ya en promoción:* ${productos.filter(p => p.promocion).length}\n`;
    mensaje += `• *Requieren frío:* ${productos.filter(p => p.temperatura).length}\n\n`;
    
    // Recomendaciones
    const criticosCount = productos.filter(p => p.diasVencimiento <= 3).length;
    const warningsCount = productos.filter(p => p.diasVencimiento > 3 && p.diasVencimiento <= 7).length;
    
    if (criticosCount > 0 || warningsCount > 0) {
      mensaje += `💡 *RECOMENDACIONES:*\n`;
      
      if (criticosCount > 0) {
        mensaje += `• Promocionar inmediatamente los ${criticosCount} productos críticos\n`;
        mensaje += `• Verificar condiciones de almacenamiento\n`;
      }
      
      if (warningsCount > 0) {
        mensaje += `• Planificar promociones para los ${warningsCount} productos en advertencia\n`;
      }
      
      mensaje += `• Revisar rotación de inventario\n`;
      mensaje += `• Contactar proveedores si es necesario\n\n`;
    }
    
    // Pie del mensaje
    mensaje += `🏢 *Sistema de Gestión de Inventario*\n`;
    mensaje += `🤖 Alerta automática - Beach Store\n`;
    mensaje += `📧 Para más detalles, revisar el sistema web`;
    
    return mensaje;
  }

  // Enviar mensaje por Twilio WhatsApp API
  async sendViaTwilio(message) {
    try {
      if (!this.client) {
        throw new Error('Cliente Twilio no inicializado');
      }
      
      console.log(`📱 Enviando mensaje vía Twilio WhatsApp...`);
      console.log(`📤 Desde: ${this.fromWhatsApp} → Hacia: ${this.toWhatsApp}`);
      
      const messageResult = await this.client.messages.create({
        body: message,
        from: this.fromWhatsApp,
        to: this.toWhatsApp
      });
      
      console.log('✅ Mensaje enviado exitosamente por Twilio');
      console.log(`📧 SID: ${messageResult.sid}`);
      console.log(`📊 Estado: ${messageResult.status}`);
      
      return {
        success: true,
        mode: 'twilio',
        method: 'Twilio WhatsApp API',
        messageId: messageResult.sid,
        status: messageResult.status,
        dateCreated: messageResult.dateCreated,
        from: this.fromWhatsApp,
        to: this.toWhatsApp,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Error en Twilio WhatsApp:', error);
      
      // Información detallada del error
      if (error.code) {
        console.error(`🚨 Código de error Twilio: ${error.code}`);
        console.error(`📝 Mensaje: ${error.message}`);
        console.error(`📋 Detalles: ${error.moreInfo || 'N/A'}`);
      }
      
      throw error;
    }
  }

  // Enviar por WhatsApp Web (fallback)
  async sendViaWeb(message) {
    try {
      const encodedMessage = encodeURIComponent(message);
      const phoneNumber = this.toWhatsApp.replace('whatsapp:', '').replace('+', '');
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
      
      console.log('📱 Generando enlace de WhatsApp Web...');
      
      return {
        success: true,
        mode: 'web',
        method: 'WhatsApp Web',
        whatsappUrl: whatsappUrl,
        phoneNumber: this.toWhatsApp,
        message: 'URL de WhatsApp generada. Se abrirá en nueva ventana.',
        instructions: 'El enlace se abrirá automáticamente. Envía el mensaje manualmente.',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error en WhatsApp Web:', error);
      throw error;
    }
  }

  // Método principal para enviar alertas (SOLO AUTOMÁTICO)
  async sendWhatsAppAlert(productos, diasAlerta = 7) {
    try {
      console.log(`📱 Preparando alerta WhatsApp AUTOMÁTICA para ${productos.length} productos...`);
      
      const message = this.formatAlertMessage(productos, diasAlerta);
      
      // Log del mensaje para debugging (solo primeras líneas)
      const previewMessage = message.split('\n').slice(0, 5).join('\n') + '...';
      console.log('📄 Preview del mensaje:', previewMessage);
      
      // SOLO intentar envío automático por Twilio
      if (this.mode === 'twilio' && this.client) {
        console.log('🚀 Enviando automáticamente vía Twilio...');
        return await this.sendViaTwilio(message);
      } else {
        // Si Twilio no está configurado, fallar inmediatamente
        throw new Error('Twilio no está configurado. No se puede enviar automáticamente.');
      }
      
    } catch (error) {
      console.error('❌ Error al enviar WhatsApp automáticamente:', error);
      
      // Devolver error detallado para que el frontend sepa qué pasó
      return {
        success: false,
        mode: 'error',
        method: 'Twilio WhatsApp API',
        error: error.message,
        errorCode: error.code || 'UNKNOWN',
        errorInfo: error.moreInfo || 'Sin información adicional',
        message: 'Error en envío automático. Revisar configuración de Twilio.',
        messagePreview: this.formatAlertMessage(productos, diasAlerta).substring(0, 200) + '...',
        timestamp: new Date().toISOString(),
        troubleshooting: {
          checkCredentials: !this.accountSid || !this.authToken,
          checkClient: !this.client,
          checkMode: this.mode !== 'twilio'
        }
      };
    }
  }

  // Método separado para fallback manual (si es necesario)
  async sendWhatsAppAlertWithFallback(productos, diasAlerta = 7) {
    try {
      // Intentar automático primero
      const automaticResult = await this.sendWhatsAppAlert(productos, diasAlerta);
      
      if (automaticResult.success) {
        return automaticResult;
      }
      
      // Si falló, ofrecer fallback manual
      console.warn('⚠️ Envío automático falló, generando fallback manual...');
      const message = this.formatAlertMessage(productos, diasAlerta);
      const webResult = await this.sendViaWeb(message);
      
      return {
        ...webResult,
        automaticFailed: true,
        automaticError: automaticResult.error,
        fallbackUsed: true
      };
      
    } catch (error) {
      console.error('❌ Error en ambos métodos:', error);
      throw error;
    }
  }

  // Test de WhatsApp (también solo automático)
  async sendTestMessage() {
    try {
      const testMessage = `🧪 *MENSAJE DE PRUEBA*\n\n` +
        `📅 *Fecha:* ${new Date().toLocaleDateString('es-CL')}\n` +
        `⏰ *Hora:* ${new Date().toLocaleTimeString('es-CL', { hour12: false })}\n\n` +
        `✅ El sistema de alertas WhatsApp está funcionando correctamente.\n\n` +
        `🔧 *Configuración:*\n` +
        `• Método: ${this.mode}\n` +
        `• Desde: ${this.fromWhatsApp}\n` +
        `• Hacia: ${this.toWhatsApp}\n\n` +
        `🏢 *Sistema de Gestión de Inventario*\n` +
        `🤖 Mensaje de prueba automático - Beach Store`;

      // SOLO intentar Twilio automático
      if (this.mode === 'twilio' && this.client) {
        console.log('🧪 Enviando test automático vía Twilio...');
        return await this.sendViaTwilio(testMessage);
      } else {
        throw new Error('Twilio no está configurado para test automático');
      }
    } catch (error) {
      console.error('❌ Error en test de WhatsApp:', error);
      
      // Retornar error detallado
      return {
        success: false,
        mode: 'error',
        method: 'Twilio Test',
        error: error.message,
        troubleshooting: {
          checkCredentials: !this.accountSid || !this.authToken,
          checkClient: !this.client,
          checkMode: this.mode !== 'twilio'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

      // Verificar estado de conexión y configuración
  async testConnection() {
    try {
      const status = {
        service: 'WhatsApp via Twilio (Automático)',
        mode: this.mode,
        configured: false,
        available: false,
        from: this.fromWhatsApp,
        to: this.toWhatsApp,
        timestamp: new Date().toISOString()
      };

      // Verificar configuración básica
      if (this.accountSid && this.authToken) {
        status.configured = true;
        status.accountSid = this.accountSid.substring(0, 8) + '...'; // Mostrar solo parte del SID
      } else {
        status.configError = 'Credenciales de Twilio no configuradas en .env';
        status.requiredVars = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_NUMBER', 'TWILIO_WHATSAPP_TO'];
      }

      // Test de conexión con Twilio
      if (this.mode === 'twilio' && this.client) {
        try {
          // Verificar cuenta de Twilio
          const account = await this.client.api.accounts(this.accountSid).fetch();
          status.available = true;
          status.accountStatus = account.status;
          status.accountName = account.friendlyName;
          status.sendingMode = 'automatic';
          
          // Verificar configuración de sandbox
          if (this.fromWhatsApp.includes('+14155238886')) {
            status.sandbox = true;
            status.sandboxNote = 'Usando Twilio Sandbox. Verificar que el número destino esté autorizado.';
          }
          
        } catch (twilioError) {
          status.available = false;
          status.twilioError = twilioError.message;
          status.sendingMode = 'failed';
          
          if (twilioError.code) {
            status.errorCode = twilioError.code;
            status.errorInfo = twilioError.moreInfo;
            
            // Mensajes específicos para errores comunes
            switch (twilioError.code) {
              case 20003:
                status.friendlyError = 'Credenciales de Twilio inválidas';
                break;
              case 21211:
                status.friendlyError = 'Número de WhatsApp no válido';
                break;
              case 21612:
                status.friendlyError = 'Número no autorizado en Sandbox';
                break;
              default:
                status.friendlyError = `Error de Twilio: ${twilioError.message}`;
            }
          }
        }
      } else {
        status.available = false;
        status.sendingMode = 'not_configured';
        status.note = 'Twilio no inicializado - revisar configuración';
      }

      return status;
    } catch (error) {
      console.error('❌ Error en test de conexión WhatsApp:', error);
      return {
        service: 'WhatsApp via Twilio',
        available: false,
        sendingMode: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Obtener información de configuración para debugging
  getConfigInfo() {
    return {
      mode: this.mode,
      hasAccountSid: !!this.accountSid,
      hasAuthToken: !!this.authToken,
      from: this.fromWhatsApp,
      to: this.toWhatsApp,
      clientInitialized: !!this.client
    };
  }

  // Validar número de WhatsApp
  validateWhatsAppNumber(number) {
    const whatsappRegex = /^whatsapp:\+[1-9]\d{1,14}$/;
    return whatsappRegex.test(number);
  }

  // Formatear número a formato Twilio
  formatToTwilioWhatsApp(phoneNumber) {
    // Remover espacios, guiones y caracteres especiales
    let cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Agregar + si no lo tiene
    if (!cleanNumber.startsWith('+')) {
      cleanNumber = '+' + cleanNumber;
    }
    
    // Agregar prefijo whatsapp:
    if (!cleanNumber.startsWith('whatsapp:')) {
      cleanNumber = 'whatsapp:' + cleanNumber;
    }
    
    return cleanNumber;
  }
}

module.exports = new WhatsAppService();