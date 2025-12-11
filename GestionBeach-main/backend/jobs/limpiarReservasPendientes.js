// Job para eliminar reservas pendientes expiradas (transferencias no pagadas)
const cron = require('node-cron');
const { sql, poolPromise } = require('../config/db');

// Función para eliminar reservas pendientes expiradas
async function limpiarReservasPendientes() {
  try {
    const pool = await poolPromise;
    const ahora = new Date();

    console.log(`🧹 [${ahora.toLocaleString('es-CL')}] Limpiando reservas pendientes expiradas...`);

    // Eliminar reservas de TRANSFERENCIA pendientes que excedieron el límite de 30 minutos
    const result = await pool.request().query(`
      DELETE FROM reservas_cabanas
      WHERE metodo_pago = 'transferencia'
        AND estado_pago = 'pendiente'
        AND fecha_limite_pago < GETDATE()
        AND (estado = 'pendiente' OR estado = 'temporal')
    `);

    if (result.rowsAffected[0] > 0) {
      console.log(`✅ Se eliminaron ${result.rowsAffected[0]} reservas pendientes expiradas`);
    } else {
      console.log(`✓ No hay reservas pendientes expiradas para eliminar`);
    }

    // También limpiar reservas_pendientes de Webpay expiradas (más de 30 minutos)
    const webpayResult = await pool.request().query(`
      UPDATE reservas_pendientes
      SET estado = 'expirada'
      WHERE estado = 'pendiente'
        AND fecha_expiracion < GETDATE()
    `);

    if (webpayResult.rowsAffected[0] > 0) {
      console.log(`✅ Se marcaron ${webpayResult.rowsAffected[0]} reservas pendientes de Webpay como expiradas`);
    }

  } catch (error) {
    console.error('❌ Error al limpiar reservas pendientes:', error);
  }
}

// Ejecutar cada 5 minutos
function iniciarJobLimpieza() {
  console.log('🚀 Job de limpieza de reservas pendientes iniciado');
  console.log('📅 Se ejecutará cada 5 minutos');

  // Ejecutar inmediatamente al inicio
  limpiarReservasPendientes();

  // Programar ejecución cada 5 minutos: */5 * * * *
  cron.schedule('*/5 * * * *', () => {
    limpiarReservasPendientes();
  });
}

module.exports = {
  iniciarJobLimpieza,
  limpiarReservasPendientes
};
