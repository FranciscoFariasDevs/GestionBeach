// backend/config/webpay.js
const { WebpayPlus, Options, IntegrationApiKeys, Environment, IntegrationCommerceCodes } = require('transbank-sdk');

// Determinar el entorno (desarrollo o producción)
const isDevelopment = process.env.NODE_ENV !== 'production';

// ============================================
// CONFIGURACIÓN DE WEBPAY PLUS
// ============================================

/**
 * IMPORTANTE: Cuando recibas las credenciales de producción, actualiza estas variables:
 *
 * PRODUCCIÓN:
 * - WEBPAY_COMMERCE_CODE: Tu código de comercio real
 * - WEBPAY_API_KEY: Tu API Key real
 * - WEBPAY_ENVIRONMENT: Environment.Production
 *
 * Puedes usar variables de entorno (.env):
 * - process.env.WEBPAY_COMMERCE_CODE
 * - process.env.WEBPAY_API_KEY
 */

let webpayConfig;

if (isDevelopment) {
  // ============================================
  // MODO DESARROLLO (Integración)
  // ============================================
  console.log('🔧 Webpay configurado en modo DESARROLLO (Integración)');

  webpayConfig = {
    commerceCode: IntegrationCommerceCodes.WEBPAY_PLUS,
    apiKey: IntegrationApiKeys.WEBPAY,
    environment: Environment.Integration
  };

} else {
  // ============================================
  // MODO PRODUCCIÓN
  // ============================================
  console.log('🚀 Webpay configurado en modo PRODUCCIÓN');

  // Lee las credenciales desde variables de entorno
  const commerceCode = process.env.WEBPAY_COMMERCE_CODE;
  const apiKey = process.env.WEBPAY_API_KEY;

  if (!commerceCode || !apiKey) {
    console.error('❌ ERROR: Faltan credenciales de Webpay en variables de entorno');
    console.error('   Configura WEBPAY_COMMERCE_CODE y WEBPAY_API_KEY en el archivo .env');
    throw new Error('Credenciales de Webpay no configuradas');
  }

  webpayConfig = {
    commerceCode: commerceCode,
    apiKey: apiKey,
    environment: Environment.Production
  };
}

// ============================================
// CREAR INSTANCIA DE WEBPAY PLUS
// ============================================

const tx = new WebpayPlus.Transaction(
  new Options(
    webpayConfig.commerceCode,
    webpayConfig.apiKey,
    webpayConfig.environment
  )
);

// ============================================
// URLS DE RETORNO
// ============================================

/**
 * URLs a las que Webpay redirigirá después del pago
 * Ajusta estas URLs según tu dominio en producción
 */

const BASE_URL = isDevelopment
  ? 'http://localhost:5000'  // URL del backend en desarrollo
  : process.env.WEBPAY_BASE_URL || 'https://tu-dominio.com';

const RETURN_URL = `${BASE_URL}/api/webpay/confirmar`;

// URL del frontend para redireccionar después de confirmar
const FRONTEND_URL = isDevelopment
  ? 'http://localhost:3000'
  : process.env.FRONTEND_URL || 'https://tu-frontend.com';

// ============================================
// EXPORTAR CONFIGURACIÓN
// ============================================

module.exports = {
  tx,
  webpayConfig,
  RETURN_URL,
  FRONTEND_URL,
  isDevelopment
};
