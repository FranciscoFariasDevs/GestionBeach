// backend/jobs/limpiarNotificacionesJob.js
// Cron diario — borra notificaciones con más de 5 días de antigüedad
const cron       = require('node-cron');
const { poolPromise } = require('../config/db');

async function limpiarNotificaciones() {
  const pool = await poolPromise;
  const ahora = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
  console.log(`[LimpiarNotif] Iniciando limpieza — ${ahora}`);

  const r = await pool.request().query(`
    DELETE FROM notificaciones
    WHERE fecha_creacion < DATEADD(DAY, -5, GETDATE())
  `);

  console.log(`[LimpiarNotif] Eliminadas ${r.rowsAffected[0]} notificaciones antiguas`);
}

const iniciarJob = () => {
  // Ejecutar al arrancar (con 1 min de gracia)
  setTimeout(() => limpiarNotificaciones().catch(e => console.error('[LimpiarNotif]', e.message)), 60_000);

  // Luego cada día a las 03:00
  cron.schedule('0 3 * * *', () => limpiarNotificaciones().catch(e => console.error('[LimpiarNotif]', e.message)), {
    timezone: 'America/Santiago',
  });

  console.log('[LimpiarNotif] Job activo (diario a las 03:00 + al inicio)');
};

module.exports = { iniciarJob, limpiarNotificaciones };
