// Job: Resumen Ejecutivo Diario — se envía por WhatsApp cada mañana a las 08:00
const cron        = require('node-cron');
const { sql, poolPromise } = require('../config/db');
const whatsappService = require('../services/whatsappService');

// ── Helpers de formato ────────────────────────────────────────────────────────
const fmt = (n) => '$' + Math.round(n || 0).toLocaleString('es-CL');
const pad = (s, len = 25) => String(s).padEnd(len, ' ');

// ── Consultas ─────────────────────────────────────────────────────────────────
async function obtenerDatos() {
  const pool = await poolPromise;

  // ── Tickets de mantención ──────────────────────────────────────────────────
  const ticketsHoy = await pool.request().query(`
    SELECT
      COUNT(*)                                             AS total,
      SUM(CASE WHEN estado = 'activo'     THEN 1 ELSE 0 END) AS activos,
      SUM(CASE WHEN estado = 'en_proceso' THEN 1 ELSE 0 END) AS en_proceso,
      SUM(CASE WHEN estado = 'resuelto'
               AND CAST(fecha_creacion AS DATE) = CAST(GETDATE()-1 AS DATE)
          THEN 1 ELSE 0 END)                               AS resueltos_ayer,
      SUM(CASE WHEN prioridad = 'critica'
               AND estado NOT IN ('resuelto','cancelado')
          THEN 1 ELSE 0 END)                               AS criticos_abiertos,
      SUM(CASE WHEN CAST(fecha_creacion AS DATE) = CAST(GETDATE() AS DATE)
          THEN 1 ELSE 0 END)                               AS nuevos_hoy
    FROM tickets
  `);

  // ── Tickets críticos sin atender ───────────────────────────────────────────
  const ticketsCriticos = await pool.request().query(`
    SELECT TOP 3 numero_ticket, asunto, sucursal_nombre,
           DATEDIFF(HOUR, fecha_creacion, GETDATE()) AS horas_espera
    FROM tickets
    WHERE prioridad = 'critica'
      AND estado NOT IN ('resuelto','cancelado')
    ORDER BY fecha_creacion ASC
  `);

  // ── Planificación: OC pendientes de pago ──────────────────────────────────
  const ocs = await pool.request().query(`
    SELECT
      COUNT(DISTINCT numero_orden)                          AS total_ocs,
      SUM(CASE WHEN estado_pago IS NULL
               OR estado_pago = 'pendiente'
          THEN monto_total ELSE 0 END)                     AS monto_pendiente,
      COUNT(CASE WHEN estado_pago IS NULL
                 OR estado_pago = 'pendiente'
            THEN 1 END)                                     AS ocs_pendientes
    FROM panificacion_compras
    WHERE vigente = 1
      AND es_madre = 1
      AND fuente   = 'EXCEL'
  `).catch(() => ({ recordset: [{ total_ocs: 0, monto_pendiente: 0, ocs_pendientes: 0 }] }));

  // ── Cotizaciones pendientes de aprobación ─────────────────────────────────
  const cotizaciones = await pool.request().query(`
    SELECT
      COUNT(*)                                              AS total,
      SUM(CASE WHEN estado = 'pendiente'  THEN 1 ELSE 0 END) AS pendientes,
      SUM(CASE WHEN estado = 'aprobada'
               AND CAST(fecha_creacion AS DATE) = CAST(GETDATE()-1 AS DATE)
          THEN 1 ELSE 0 END)                               AS aprobadas_ayer
    FROM cotizaciones
  `).catch(() => ({ recordset: [{ total: 0, pendientes: 0, aprobadas_ayer: 0 }] }));

  // ── Tickets por departamento (top activos) ─────────────────────────────────
  const porDepto = await pool.request().query(`
    SELECT TOP 5
      td.nombre AS departamento,
      COUNT(*)  AS total
    FROM ticket_dept_asignaciones tda
    JOIN ticket_departamentos td ON tda.departamento_id = td.id
    JOIN tickets t ON tda.ticket_id = t.id
    WHERE t.estado NOT IN ('resuelto','cancelado')
    GROUP BY td.nombre
    ORDER BY total DESC
  `).catch(() => ({ recordset: [] }));

  return {
    tickets:  ticketsHoy.recordset[0],
    criticos: ticketsCriticos.recordset,
    ocs:      ocs.recordset[0],
    cotiz:    cotizaciones.recordset[0],
    porDepto: porDepto.recordset,
  };
}

// ── Construir mensaje WhatsApp ────────────────────────────────────────────────
function construirMensaje(d) {
  const ahora    = new Date();
  const fechaStr = ahora.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  const horaStr  = ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  const { tickets, criticos, ocs, cotiz, porDepto } = d;

  let msg = '';
  msg += `📊 *RESUMEN EJECUTIVO — BEACH MARKET*\n`;
  msg += `📅 ${fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1)} · ${horaStr}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // ── Mantención ─────────────────────────────────────────────────────────────
  msg += `🔧 *MANTENCIÓN*\n`;
  msg += `• Activos:        *${tickets.activos}* tickets\n`;
  msg += `• En proceso:     *${tickets.en_proceso}* tickets\n`;
  msg += `• Nuevos hoy:     *${tickets.nuevos_hoy}* tickets\n`;
  msg += `• Resueltos ayer: *${tickets.resueltos_ayer}* tickets\n`;

  if (tickets.criticos_abiertos > 0) {
    msg += `\n⚠️ *${tickets.criticos_abiertos} CRÍTICO(S) SIN RESOLVER*\n`;
    criticos.forEach(t => {
      msg += `  🔴 [${t.numero_ticket}] ${t.asunto}\n`;
      msg += `      📍 ${t.sucursal_nombre || '—'} · ${t.horas_espera}h esperando\n`;
    });
  } else {
    msg += `✅ Sin tickets críticos abiertos\n`;
  }

  // ── Planificación ──────────────────────────────────────────────────────────
  msg += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📦 *PLANIFICACIÓN (OC)*\n`;
  msg += `• OC activas:         *${ocs.total_ocs}*\n`;
  msg += `• OC pendientes pago: *${ocs.ocs_pendientes}*\n`;
  if (ocs.monto_pendiente > 0) {
    msg += `• Monto por pagar:    *${fmt(ocs.monto_pendiente)}*\n`;
  }

  // ── Cotizaciones ───────────────────────────────────────────────────────────
  if (cotiz.total > 0) {
    msg += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📝 *COTIZACIONES*\n`;
    msg += `• Pendientes aprob.: *${cotiz.pendientes}*\n`;
    msg += `• Aprobadas ayer:    *${cotiz.aprobadas_ayer}*\n`;
  }

  // ── Carga por departamento ─────────────────────────────────────────────────
  if (porDepto.length > 0) {
    msg += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📌 *TICKETS ABIERTOS POR DPTO.*\n`;
    porDepto.forEach(d => {
      const barra = '█'.repeat(Math.min(d.total, 10));
      msg += `• ${d.departamento}: *${d.total}* ${barra}\n`;
    });
  }

  msg += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `_Generado automáticamente por el sistema_\n`;
  msg += `_Beach Market · intranet.beach.cl_`;

  return msg;
}

// ── Ejecutar resumen ──────────────────────────────────────────────────────────
async function ejecutarResumen() {
  console.log('📊 [Resumen Ejecutivo] Generando resumen diario...');
  try {
    const datos   = await obtenerDatos();
    const mensaje = construirMensaje(datos);

    // Enviar al número configurado en .env (TWILIO_WHATSAPP_TO)
    await whatsappService.sendMessage(mensaje);

    // Si hay número adicional del gerente configurado, enviar también
    const numGerente = process.env.WHATSAPP_GERENTE;
    if (numGerente && numGerente !== process.env.TWILIO_WHATSAPP_TO) {
      await whatsappService.sendMessageTo(mensaje, `whatsapp:${numGerente}`);
    }

    console.log('✅ [Resumen Ejecutivo] Enviado correctamente');
  } catch (err) {
    console.error('❌ [Resumen Ejecutivo] Error:', err.message);
  }
}

// ── Iniciar job ───────────────────────────────────────────────────────────────
function iniciarJobResumenEjecutivo() {
  // Lunes a viernes a las 08:00 (hora Santiago)
  cron.schedule('0 8 * * 1-5', ejecutarResumen, {
    timezone: 'America/Santiago',
  });

  console.log('📊 Job Resumen Ejecutivo: activo (lun-vie 08:00 Santiago)');
}

module.exports = { iniciarJobResumenEjecutivo, ejecutarResumen };
