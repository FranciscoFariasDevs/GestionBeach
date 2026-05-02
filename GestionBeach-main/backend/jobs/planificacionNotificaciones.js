// backend/jobs/planificacionNotificaciones.js
// Cron diario (08:00) — verifica estado de semanas en Planificación de Compras
const cron = require('node-cron');
const { sql, poolPromise } = require('../config/db');
const { notificarModulo } = require('../services/notificacionesService');

// ISO week number (mismo algoritmo que planificacionController)
const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const verificarPlanificacion = async () => {
  try {
    const pool = await poolPromise;
    const hoy   = new Date();
    const año   = hoy.getFullYear();
    const semanaActual = getWeekNumber(hoy);
    const semanaSig    = semanaActual < 52 ? semanaActual + 1 : semanaActual;

    // ── Obtener configuraciones de límite ─────────────────────────────────────
    const cfgRes = await pool.request()
      .input('año', sql.Int, año)
      .query('SELECT numero_semana, limite_semanal FROM panificacion_config_semanal WHERE año = @año');
    const cfgMap = {};
    cfgRes.recordset.forEach(r => { cfgMap[r.numero_semana] = parseFloat(r.limite_semanal); });

    // ── Obtener totales para semana actual y siguiente ────────────────────────
    const pagosRes = await pool.request()
      .input('año', sql.Int, año)
      .input('s1',  sql.Int, semanaActual)
      .input('s2',  sql.Int, semanaSig)
      .query(`
        WITH dedup AS (
          SELECT *,
            ROW_NUMBER() OVER (
              PARTITION BY
                CASE
                  WHEN tipo_proveedor='Encadenado' AND fuente IN ('FACTURA','REMANENTE') THEN CAST(id AS NVARCHAR(20))
                  WHEN tipo_proveedor='Encadenado' AND LEN(ISNULL(numero_orden,''))>0
                    THEN 'ENC_'+numero_orden+'_PL'+ISNULL(CAST(plazo_dias AS NVARCHAR),'X')
                  WHEN tipo_proveedor='No Encadenado' AND LEN(ISNULL(numero_orden,''))>0
                    THEN CAST(año AS NVARCHAR)+'_NENC_'+numero_orden+'_PL'+ISNULL(CAST(plazo_dias AS NVARCHAR),'X')+'_'+ISNULL(sucursal,'')+'_'+CAST(ROUND(ISNULL(monto_con_iva,0),0) AS NVARCHAR)
                  ELSE CAST(id AS NVARCHAR(20))
                END
              ORDER BY id ASC
            ) AS _rn
          FROM panificacion_compras
          WHERE (
            (tipo_proveedor='Encadenado'    AND CASE WHEN MONTH(fecha_vencimiento)=12 AND DATEPART(ISO_WEEK,fecha_vencimiento)=1 THEN YEAR(fecha_vencimiento)+1 ELSE YEAR(fecha_vencimiento) END = @año)
            OR (tipo_proveedor='No Encadenado' AND año = @año)
          )
          AND semana_vencimiento IN (@s1, @s2)
          AND ISNULL(es_madre,0)=0
        ),
        tiene_facturas AS (
          SELECT DISTINCT ISNULL(id_oc_ref,0) AS oc_id, numero_orden
          FROM panificacion_compras
          WHERE tipo_proveedor='Encadenado' AND fuente='FACTURA' AND ISNULL(es_madre,0)=0
        )
        SELECT d.semana_vencimiento,
          SUM(CASE
            WHEN d.tipo_proveedor='Encadenado' AND d.fuente NOT IN ('FACTURA','REMANENTE')
                 AND tf.oc_id IS NULL
                 AND ISNULL(d.estado_pago,'Pendiente') NOT IN ('Cancelado','Facturado')
              THEN d.monto_con_iva
            WHEN d.tipo_proveedor='Encadenado' AND d.fuente='REMANENTE' THEN d.monto_con_iva
            ELSE 0 END) AS enc_comp,
          SUM(CASE WHEN d.tipo_proveedor='Encadenado' AND d.fuente='FACTURA' THEN d.monto_con_iva ELSE 0 END) AS fact_enc,
          SUM(CASE WHEN d.tipo_proveedor='No Encadenado' THEN d.monto_con_iva ELSE 0 END) AS fact_nenc,
          SUM(CASE WHEN d.tipo_proveedor='Encadenado' AND d.fuente NOT IN ('FACTURA','REMANENTE') AND tf.oc_id IS NULL THEN 1 ELSE 0 END) AS n_oc
        FROM dedup d
        LEFT JOIN tiene_facturas tf ON (tf.oc_id>0 AND tf.oc_id=d.id) OR (tf.oc_id=0 AND tf.numero_orden=d.numero_orden)
        WHERE d._rn=1
        GROUP BY d.semana_vencimiento
      `);

    const pagosMap = {};
    pagosRes.recordset.forEach(r => { pagosMap[r.semana_vencimiento] = r; });

    for (const semana of [semanaActual, semanaSig]) {
      const label = semana === semanaActual ? `semana ${semana} (actual)` : `semana ${semana} (próxima)`;
      const p = pagosMap[semana];
      const limite = cfgMap[semana] || (semana <= 18 ? 120_000_000 : 100_000_000);

      if (!p) {
        // Sin datos para semana actual → OC y PBI no subidos
        if (semana === semanaActual) {
          await notificarModulo(
            'Planificacion Compras',
            'planificacion_sin_datos',
            `⚠️ Planificación S${semana}: sin datos cargados`,
            `No se han subido OC ni facturas PBI para la ${label}. Por favor verifica la carga.`,
            '/compras/planificacion',
            'warning'
          );
        }
        continue;
      }

      const encComp   = parseFloat(p.enc_comp)   || 0;
      const factEnc   = parseFloat(p.fact_enc)    || 0;
      const factNenc  = parseFloat(p.fact_nenc)   || 0;
      const totalGral = encComp + factEnc + factNenc;
      const nOC       = parseInt(p.n_oc)          || 0;

      // OC no subida (encadenados sin OC registrada esta semana)
      if (semana === semanaActual && nOC === 0 && factEnc === 0) {
        await notificarModulo(
          'Planificacion Compras',
          'planificacion_sin_oc',
          `📋 S${semana}: OC y facturas PBI sin cargar`,
          `La ${label} no tiene Órdenes de Compra ni facturas PBI registradas. Recuerda cargarlas.`,
          '/compras/planificacion',
          'upload_file'
        );
      } else if (semana === semanaActual && nOC === 0) {
        // Hay facturas PBI pero no OC
        await notificarModulo(
          'Planificacion Compras',
          'planificacion_sin_oc',
          `📋 S${semana}: faltan Órdenes de Compra`,
          `La ${label} tiene facturas PBI pero no tiene OC registradas. Revisa la planificación.`,
          '/compras/planificacion',
          'upload_file'
        );
      } else if (semana === semanaActual && factEnc === 0 && encComp > 0) {
        // Hay OC pero no se subieron las facturas PBI
        await notificarModulo(
          'Planificacion Compras',
          'planificacion_sin_pbi',
          `📊 S${semana}: facturas Power BI sin cargar`,
          `La ${label} tiene OC registradas pero no se han subido las facturas PBI. Recuerda cargar el archivo.`,
          '/compras/planificacion',
          'upload_file'
        );
      }

      // Excedido
      if (totalGral > limite || encComp > limite) {
        const exceso = Math.round((totalGral - limite) / 1000000 * 10) / 10;
        await notificarModulo(
          'Planificacion Compras',
          'planificacion_excedido',
          `🚨 S${semana} EXCEDIDA — $${exceso}M sobre el límite`,
          `La ${label} supera el límite de $${Math.round(limite/1000000)}M. Total comprometido: $${Math.round(totalGral/1000000)}M.`,
          '/compras/planificacion',
          'error'
        );
      }
      // En zona de alerta (≥ 80%)
      else if (totalGral >= limite * 0.8 || encComp >= limite * 0.8) {
        const pct = Math.round((totalGral / limite) * 100);
        await notificarModulo(
          'Planificacion Compras',
          'planificacion_alerta',
          `⚡ S${semana} en alerta — ${pct}% del límite`,
          `La ${label} ha alcanzado el ${pct}% de su límite ($${Math.round(limite/1000000)}M). Comprometido: $${Math.round(totalGral/1000000)}M.`,
          '/compras/planificacion',
          'warning'
        );
      }
    }

    console.log(`[PlanificacionJob] Verificación completada — S${semanaActual}/${semanaSig} año ${año}`);
  } catch (err) {
    console.error('[PlanificacionJob] Error:', err.message);
  }
};

const iniciarJob = () => {
  // Todos los días a las 08:00 AM hora Santiago
  cron.schedule('0 8 * * *', verificarPlanificacion, {
    timezone: 'America/Santiago'
  });
  console.log('📅 Job Planificación Notificaciones: activo (diario 08:00)');
};

module.exports = { iniciarJob, verificarPlanificacion };
