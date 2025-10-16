// backend/test-whatsapp.js
// Script para probar envío de mensajes de WhatsApp con Twilio

require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID || 'ACd8e5a39aea566708a6f5eb37a4f27352';
const authToken = process.env.TWILIO_AUTH_TOKEN || '9d41d638403d9299559459f9b3f61f3a';
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

const twilio = require('twilio');
const client = twilio(accountSid, authToken);

// ============================================
// CONFIGURACIÓN
// ============================================

// ⚠️ IMPORTANTE: Cambia este número por tu número de WhatsApp
const miNumeroWhatsApp = '+56942652034'; // TU NÚMERO AQUÍ

// ============================================
// FUNCIÓN DE PRUEBA
// ============================================

async function enviarMensajePrueba() {
  try {
    console.log('\n🤖 === TEST DE WHATSAPP BOT ===\n');

    console.log('📋 Configuración:');
    console.log(`   Account SID: ${accountSid}`);
    console.log(`   Auth Token: ${authToken.substring(0, 10)}...`);
    console.log(`   Número Twilio: ${twilioWhatsAppNumber}`);
    console.log(`   Número destino: whatsapp:${miNumeroWhatsApp}\n`);

    console.log('📤 Enviando mensaje de prueba...');

    const mensaje = `🏡 *TEST DE CABAÑAS BOT*

¡Hola! Este es un mensaje de prueba desde tu sistema de cabañas.

El bot está funcionando correctamente y puede:

✅ Recibir mensajes de clientes
✅ Detectar intenciones (disponibilidad, reservas, etc.)
✅ Responder automáticamente
✅ Mostrar precios por temporada
✅ Guardar conversaciones en la BD

📅 ${new Date().toLocaleString('es-CL')}

---
*Cabañas Beach - Sistema WhatsApp Bot*`;

    const message = await client.messages.create({
      from: twilioWhatsAppNumber,
      to: `whatsapp:${miNumeroWhatsApp}`,
      body: mensaje
    });

    console.log('\n✅ ¡MENSAJE ENVIADO EXITOSAMENTE!');
    console.log(`📨 SID del mensaje: ${message.sid}`);
    console.log(`📊 Estado: ${message.status}`);
    console.log(`📞 Enviado a: ${message.to}`);
    console.log(`📅 Fecha: ${message.dateCreated}`);

    console.log('\n🎉 ¡El bot de WhatsApp está funcionando!\n');
    console.log('Ahora puedes responder desde tu WhatsApp y el bot contestará automáticamente.');
    console.log('Para eso necesitas configurar el webhook en Twilio (ver CONFIGURACION_WHATSAPP_TWILIO.md)\n');

  } catch (error) {
    console.error('\n❌ ERROR AL ENVIAR MENSAJE:');
    console.error(`   Código: ${error.code}`);
    console.error(`   Mensaje: ${error.message}`);

    if (error.code === 20003) {
      console.error('\n⚠️ SOLUCIÓN: Auth Token incorrecto o expirado.');
      console.error('   1. Ve a https://console.twilio.com/');
      console.error('   2. Copia el Auth Token correcto');
      console.error('   3. Actualízalo en backend/.env');
    }

    if (error.code === 21608) {
      console.error('\n⚠️ SOLUCIÓN: El número no está registrado en el sandbox.');
      console.error('   1. Ve a https://console.twilio.com/');
      console.error('   2. Messaging → Try it out → Send a WhatsApp message');
      console.error('   3. Envía "join abc-xyz" al número de Twilio desde tu WhatsApp');
    }

    if (error.code === 21211) {
      console.error('\n⚠️ SOLUCIÓN: Número de destino inválido.');
      console.error('   1. Verifica que el número esté en formato internacional: +56912345678');
      console.error('   2. Actualiza la variable miNumeroWhatsApp en este archivo');
    }

    console.error('\n');
  }
}

// ============================================
// EJECUTAR TEST
// ============================================

console.log('\n🚀 Iniciando test de WhatsApp...\n');

// Verificar que las credenciales estén configuradas
if (!accountSid || accountSid === 'your_account_sid') {
  console.error('❌ ERROR: TWILIO_ACCOUNT_SID no está configurado en .env');
  process.exit(1);
}

if (!authToken || authToken === 'your_auth_token') {
  console.error('❌ ERROR: TWILIO_AUTH_TOKEN no está configurado en .env');
  process.exit(1);
}

// Ejecutar prueba
enviarMensajePrueba()
  .then(() => {
    console.log('✅ Test completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test fallido:', error);
    process.exit(1);
  });
