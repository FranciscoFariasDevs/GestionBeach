// backend/jobs/foliosAlertaJob.js
// Cron cada 2 horas — verifica folios SII disponibles en todas las sucursales
// y notifica a los admins cuando un CAF está por agotarse o vencido.
const cron = require('node-cron');
const sql  = require('mssql');
const { poolPromise } = require('../config/db');
const { crearNotificacion } = require('../services/notificacionesService');

const CONN_OPTS = {
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true, requestTimeout: 12000, connectionTimeout: 6000 },
  pool:    { max: 1, min: 0, idleTimeoutMillis: 5000 },
};

// Umbral de folios por tipo de documento (notifica cuando queden MENOS de este valor)
const UMBRAL_POR_TIPO = {
  '39': 1000,  // Boleta Electrónica
  '33': 40,    // Factura Electrónica
  '52': 20,    // Guía de Despacho
  '61': 20,    // Nota de Crédito
  '56': 20,    // Nota de Débito
  '34': 20,    // Factura No Afecta
  '41': 20,    // Boleta No Afecta
};

const UMBRAL_CRITICO_DIAS = 7;
const UMBRAL_ALERTA_DIAS  = 30;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function conectar(suc) {
  return new sql.ConnectionPool({
    user:     suc.usuario,
    password: suc.contrasena || '',
    server:   suc.ip,
    port:     suc.puerto || 1433,
    database: suc.base_datos,
    ...CONN_OPTS,
  }).connect();
}

// Devuelve array con los folios de cada tipo en esa sucursal.
// Funciona en SUPERMERCADO y en cualquier BD que tenga tb_sii_folios_disponibles.
// Si la tabla no existe devuelve [].
async function consultarFolios(pool) {
  // ¿Existe la tabla en esta BD?
  const check = await pool.request().query(`
    SELECT COUNT(*) AS existe FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_NAME = 'tb_sii_folios_disponibles'
  `);
  if (!check.recordset[0].existe) return [];

  // ¿Qué tablas de uso existen?
  const tablasCandidatas = [
    'tb_sii_folios33','tb_sii_folios34','tb_sii_folios39',
    'tb_sii_folios41','tb_sii_folios52','tb_sii_folios56','tb_sii_folios61',
  ];
  const existenRes = await pool.request().query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_NAME IN (${tablasCandidatas.map(t => `'${t}'`).join(',')})
  `);
  const existentes = existenRes.recordset.map(r => r.TABLE_NAME);

  const mapaTablas = {
    'tb_sii_folios33':'33','tb_sii_folios34':'34','tb_sii_folios39':'39',
    'tb_sii_folios41':'41','tb_sii_folios52':'52','tb_sii_folios56':'56','tb_sii_folios61':'61',
  };
  const unionParts = Object.entries(mapaTablas)
    .filter(([tabla]) => existentes.includes(tabla))
    .map(([tabla, tipo]) => `SELECT '${tipo}' AS tipo, MAX(dn_folio) AS ultimo_folio FROM ${tabla}`);

  const unionSQL = unionParts.length > 0
    ? `(${unionParts.join(' UNION ALL ')}) u`
    : `(SELECT NULL AS tipo, NULL AS ultimo_folio WHERE 1=0) u`;

  const r = await pool.request().query(`
    WITH UltimoCAF AS (
      SELECT dc_tipo, MAX(dn_caf_hasta) AS max_hasta
      FROM tb_sii_folios_disponibles
      WHERE dn_caf_hasta > dn_caf_desde
      GROUP BY dc_tipo
    )
    SELECT
      fd.dc_tipo AS tipo,
      CASE fd.dc_tipo
        WHEN '33' THEN 'Factura Electrónica'
        WHEN '34' THEN 'Factura No Afecta'
        WHEN '39' THEN 'Boleta Electrónica'
        WHEN '41' THEN 'Boleta No Afecta'
        WHEN '52' THEN 'Guía de Despacho'
        WHEN '56' THEN 'Nota de Débito'
        WHEN '61' THEN 'Nota de Crédito'
        ELSE 'Tipo ' + fd.dc_tipo
      END AS nombre_tipo,
      fd.dn_caf_hasta - ISNULL(u.ultimo_folio, fd.dn_caf_desde - 1) AS folios_restantes,
      DATEDIFF(DAY, GETDATE(), fd.df_caducidad_caf)                   AS dias_vencimiento,
      CASE WHEN fd.df_caducidad_caf < GETDATE() THEN 1 ELSE 0 END     AS vencido
    FROM tb_sii_folios_disponibles fd
    JOIN UltimoCAF uc ON uc.dc_tipo = fd.dc_tipo AND uc.max_hasta = fd.dn_caf_hasta
    LEFT JOIN ${unionSQL} ON u.tipo = fd.dc_tipo
  `);
  return r.recordset;
}

// Evitar spam: no notificar si ya se envió el mismo alerta en las últimas 4 horas.
async function notificacionReciente(pool, usuarioId, tipo, tituloParcial) {
  const r = await pool.request()
    .input('uid',    sql.Int,     usuarioId)
    .input('tipo',   sql.VarChar, tipo)
    .input('titulo', sql.VarChar, `%${tituloParcial}%`)
    .query(`
      SELECT COUNT(*) AS cnt FROM notificaciones
      WHERE usuario_id = @uid
        AND tipo       = @tipo
        AND titulo     LIKE @titulo
        AND fecha_creacion >= DATEADD(HOUR, -4, GETDATE())
    `);
  return r.recordset[0].cnt > 0;
}

// ── Job principal ─────────────────────────────────────────────────────────────

async function verificarFolios() {
  const mainPool = await poolPromise;
  const ahora = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
  console.log(`[FoliosAlerta] Iniciando verificación — ${ahora}`);

  // Obtener sucursales con BD conectables (supermercados y ferreterías)
  const sucRes = await mainPool.request().query(`
    SELECT id, nombre, tipo_sucursal, ip, puerto, base_datos, usuario, contrasena
    FROM sucursales
    WHERE tipo_sucursal IN ('SUPERMERCADO','FERRETERIA','MULTITIENDA')
      AND ip IS NOT NULL AND base_datos IS NOT NULL AND usuario IS NOT NULL
    ORDER BY nombre
  `);
  const sucursales = sucRes.recordset;

  // Obtener admins (perfil_id = 1)
  const adminsRes = await mainPool.request().query(
    `SELECT id FROM usuarios WHERE superadmin = 1`
  );
  const adminIds = adminsRes.recordset.map(r => r.id);
  if (!adminIds.length) {
    console.log('[FoliosAlerta] No hay admins activos — se omite notificación');
    return;
  }

  for (const suc of sucursales) {
    let pool = null;
    try {
      pool = await Promise.race([
        conectar(suc),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 7000)),
      ]);

      const folios = await consultarFolios(pool);
      if (!folios.length) {
        console.log(`[FoliosAlerta] ${suc.nombre}: sin tabla de folios SII — omitido`);
        continue;
      }

      for (const f of folios) {
        const umbral = UMBRAL_POR_TIPO[f.tipo];
        if (!umbral) continue; // tipo sin umbral configurado → ignorar

        let nivelAlerta = null; // 'critico' | 'alerta' | null

        if (f.vencido) {
          nivelAlerta = 'critico';
        } else if (f.folios_restantes < umbral || f.dias_vencimiento <= UMBRAL_CRITICO_DIAS) {
          nivelAlerta = 'critico';
        } else if (f.dias_vencimiento <= UMBRAL_ALERTA_DIAS) {
          nivelAlerta = 'alerta';
        }

        if (!nivelAlerta) continue;

        const esCritico = nivelAlerta === 'critico';
        const tipo      = esCritico ? 'folio_critico' : 'folio_alerta';
        const icono     = esCritico ? 'error'          : 'warning';

        // Título corto para la lista de notificaciones
        const titulo = `${esCritico ? '🚨' : '⚠️'} ${f.nombre_tipo} · ${suc.nombre}`;

        // Mensaje conciso — 1 línea con los datos clave
        let mensaje = '';
        if (f.vencido) {
          mensaje = `CAF vencido hace ${Math.abs(f.dias_vencimiento)} días · ${f.folios_restantes.toLocaleString('es-CL')} folios sin usar`;
        } else if (f.folios_restantes < umbral) {
          const vence = f.dias_vencimiento > 0 ? `· Vence en ${f.dias_vencimiento} días` : '';
          mensaje = `${f.folios_restantes.toLocaleString('es-CL')} folios restantes ${vence}`.trim();
        } else {
          mensaje = `CAF vence en ${f.dias_vencimiento} días · ${f.folios_restantes.toLocaleString('es-CL')} folios disponibles`;
        }

        for (const adminId of adminIds) {
          const yaNotificado = await notificacionReciente(mainPool, adminId, tipo, `${suc.nombre} — ${f.nombre_tipo}`);
          if (yaNotificado) continue;

          await crearNotificacion({
            usuarioId: adminId,
            tipo,
            titulo,
            mensaje,
            ruta:  null,
            icono,
          });
        }

        console.log(`[FoliosAlerta] ${nivelAlerta.toUpperCase()} — ${suc.nombre} / ${f.nombre_tipo}: ${f.folios_restantes} folios, ${f.dias_vencimiento}d`);
      }
    } catch (err) {
      console.log(`[FoliosAlerta] ${suc.nombre}: no se pudo conectar — ${err.message}`);
    } finally {
      if (pool) try { pool.close(); } catch (_) {}
    }
  }

  console.log(`[FoliosAlerta] Verificación completada`);
}

// ── Arranque ──────────────────────────────────────────────────────────────────

const iniciarJob = () => {
  // Ejecutar al arrancar (con 30s de gracia para que la BD principal levante)
  setTimeout(() => verificarFolios().catch(e => console.error('[FoliosAlerta]', e.message)), 30_000);

  // Luego cada 2 horas
  cron.schedule('0 */2 * * *', () => verificarFolios().catch(e => console.error('[FoliosAlerta]', e.message)), {
    timezone: 'America/Santiago',
  });

  console.log('📋 Job Folios Alerta: activo (cada 2 horas + al inicio)');
};

module.exports = { iniciarJob, verificarFolios };
