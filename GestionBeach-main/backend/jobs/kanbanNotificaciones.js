// backend/jobs/kanbanNotificaciones.js
// Cron diario 08:05 — avisa tareas Kanban vencidas o por vencer en 2 días
const cron = require('node-cron');
const { sql, poolPromise } = require('../config/db');
const { crearNotificacion } = require('../services/notificacionesService');

const verificarTareas = async () => {
  try {
    const pool = await poolPromise;

    // Tareas activas con asignado_a y fecha_vencimiento en los próximos 2 días o ya vencidas
    const r = await pool.request().query(`
      SELECT t.id, t.titulo, t.fecha_vencimiento, t.asignado_a,
             b.nombre AS board,
             DATEDIFF(day, GETDATE(), t.fecha_vencimiento) AS dias_restantes
      FROM kanban_tareas t
      JOIN kanban_boards b ON b.id = t.board_id
      WHERE t.activo = 1
        AND t.asignado_a IS NOT NULL
        AND t.fecha_vencimiento IS NOT NULL
        AND DATEDIFF(day, GETDATE(), t.fecha_vencimiento) <= 2
    `);

    for (const tarea of r.recordset) {
      const dias = tarea.dias_restantes;
      let titulo, mensaje, icono;

      if (dias < 0) {
        titulo  = `🔴 Tarea vencida: ${tarea.titulo}`;
        mensaje = `La tarea "${tarea.titulo}" del tablero "${tarea.board}" venció hace ${Math.abs(dias)} día(s).`;
        icono   = 'error';
      } else if (dias === 0) {
        titulo  = `🟡 Tarea vence hoy: ${tarea.titulo}`;
        mensaje = `La tarea "${tarea.titulo}" del tablero "${tarea.board}" vence hoy.`;
        icono   = 'warning';
      } else {
        titulo  = `🟠 Tarea vence en ${dias} día(s): ${tarea.titulo}`;
        mensaje = `La tarea "${tarea.titulo}" del tablero "${tarea.board}" vence en ${dias} día(s).`;
        icono   = 'schedule';
      }

      await crearNotificacion({
        usuarioId: tarea.asignado_a,
        tipo:      'kanban_vencimiento',
        titulo,
        mensaje,
        ruta:  '/kanban',
        icono,
      });
    }

    if (r.recordset.length > 0)
      console.log(`[KanbanJob] ${r.recordset.length} notificaciones de tareas enviadas`);
  } catch (err) {
    console.error('[KanbanJob] Error:', err.message);
  }
};

const iniciarJob = () => {
  cron.schedule('5 8 * * *', verificarTareas, { timezone: 'America/Santiago' });
  console.log('📅 Job Kanban Notificaciones: activo (diario 08:05)');
};

module.exports = { iniciarJob };
