// backend/controllers/planificacionController.js
const { sql, poolPromise } = require('../config/db');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// ─── Pool cache para conexiones ERP por sucursal ──────────────────────────────
const erpPoolCache = new Map();

const getPoolSucursal = async (sucursal) => {
  const cached = erpPoolCache.get(sucursal.id);
  if (cached && cached.pool && cached.pool.connected) {
    cached.lastUsed = Date.now();
    return cached.pool;
  }
  if (cached) {
    try { await cached.pool.close(); } catch {}
    erpPoolCache.delete(sucursal.id);
  }
  const config = {
    user: sucursal.usuario,
    password: sucursal.contrasena || '',
    server: sucursal.ip,
    port: sucursal.puerto || 1433,
    database: sucursal.base_datos,
    options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true, requestTimeout: 120000, connectionTimeout: 8000 },
    pool: { max: 3, min: 0, idleTimeoutMillis: 60000 }
  };
  const pool = await Promise.race([
    new sql.ConnectionPool(config).connect(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
  ]);
  erpPoolCache.set(sucursal.id, { pool, lastUsed: Date.now() });
  console.log(`[Planificacion] Pool ERP para ${sucursal.nombre}`);
  return pool;
};

setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of erpPoolCache) {
    if (now - entry.lastUsed > 5 * 60 * 1000) {
      try { entry.pool.close(); } catch {}
      erpPoolCache.delete(id);
    }
  }
}, 5 * 60 * 1000);

const obtenerSucursalesERP = async () => {
  const pool = await poolPromise;
  const r = await pool.request().query(
    `SELECT id, nombre, ip, base_datos, usuario, contrasena, puerto
     FROM sucursales
     WHERE ip IS NOT NULL AND ip <> ''
       AND base_datos IS NOT NULL AND base_datos <> ''
       AND usuario IS NOT NULL AND usuario <> ''
       AND ISNULL(tipo_sucursal,'') <> 'SUPERMERCADO'
       AND nombre NOT LIKE '%1440%'
     ORDER BY id`
  );
  return r.recordset;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Normaliza cualquier valor fecha a un Date local a medianoche, evitando desfase de timezone.
// SQL Server devuelve DATE como UTC midnight; YYYY-MM-DD con new Date() también es UTC → se pierde 1 día en Chile (UTC-4).
const _toLocalMidnight = (date) => {
  if (date instanceof Date) {
    // Si ya es Date, usar sus componentes UTC para reconstruir fecha local
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }
  const str = String(date).trim();
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]));
  return new Date(str); // fallback (puede tener timezone implícita)
};

const getWeekNumber = (date) => {
  const d = _toLocalMidnight(date);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

// Devuelve el año ISO de la semana (puede diferir del año calendario para fechas de fines de diciembre)
// Ej: 2025-12-31 → 2026 (semana 1 de 2026)
const getISOWeekYear = (date) => {
  const d = _toLocalMidnight(date);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  return d.getFullYear();
};

const getWeekStart = (week, year) => {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const weekStart = new Date(simple);
  if (dow <= 4) weekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else weekStart.setDate(simple.getDate() + 8 - simple.getDay());
  return weekStart;
};

const getWeekDateRange = (week, year) => {
  const mon = getWeekStart(week, year);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = d => d.toISOString().split('T')[0];
  return { fechaInicio: fmt(mon), fechaFin: fmt(sun) };
};

const excelSerialToDate = (serial) => {
  if (!serial || isNaN(serial)) return null;
  const utcDays = Math.floor(serial - 25569);
  const utcDate = new Date(utcDays * 86400 * 1000);
  // Usar componentes UTC para construir fecha local y evitar desfase de timezone (Chile UTC-4)
  return new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate());
};

const parseFecha = (val) => {
  if (!val) return null;
  if (typeof val === 'number') return excelSerialToDate(val);
  const str = String(val).trim();
  // Formato DD/MM/YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    return new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
  }
  // Formato DD.MM.YYYY (usado en exportes PBI y formatos europeos)
  const ddmmyyyyDot = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (ddmmyyyyDot) {
    return new Date(parseInt(ddmmyyyyDot[3]), parseInt(ddmmyyyyDot[2]) - 1, parseInt(ddmmyyyyDot[1]));
  }
  // Formato DD-MM-YYYY
  const ddmmyyyyDash = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyyyyDash) {
    return new Date(parseInt(ddmmyyyyDash[3]), parseInt(ddmmyyyyDash[2]) - 1, parseInt(ddmmyyyyDash[1]));
  }
  // Formato YYYY-MM-DD (ISO sin hora — new Date('YYYY-MM-DD') usa UTC, lo que desplaza 1 día en Chile)
  const yyyymmdd = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyymmdd) {
    return new Date(parseInt(yyyymmdd[1]), parseInt(yyyymmdd[2]) - 1, parseInt(yyyymmdd[3]));
  }
  const d = new Date(str);
  return isNaN(d) ? null : d;
};

// Parsea un campo de plazo que puede contener múltiples valores en una sola celda.
// Ejemplos: "60-90", "60/90", "60,90", "60 90", 60, "60"
// Devuelve un array de enteros: [60, 90]. Si no hay valores válidos devuelve [30].
const parsePlazos = (val) => {
  if (val === null || val === undefined || val === '') return [30];
  if (typeof val === 'number') return isNaN(val) ? [30] : [Math.round(val)];
  const partes = String(val).split(/[-\/,;\s]+/).map(p => parseInt(p)).filter(n => !isNaN(n) && n >= 0);
  return partes.length > 0 ? partes : [30];
};

const formatDate = (d) => {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date)) return null;
  return date.toISOString().split('T')[0];
};

const getMesNombre = (date) => {
  const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
                  'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  return meses[_toLocalMidnight(date).getMonth()];
};

// Asegurar que las tablas existen
const asegurarTablas = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='panificacion_config_semanal' AND xtype='U')
    CREATE TABLE panificacion_config_semanal (
      id INT IDENTITY(1,1) PRIMARY KEY,
      numero_semana INT NOT NULL,
      año INT NOT NULL,
      limite_semanal DECIMAL(18,2) NOT NULL DEFAULT 100000000,
      fecha_inicio DATE NULL,
      CONSTRAINT UQ_panif_semana_año UNIQUE (numero_semana, año)
    )
  `);
  // Migration: agregar columna nota si no existe
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT * FROM sys.columns
      WHERE Name = 'nota' AND Object_ID = Object_ID('panificacion_config_semanal')
    )
    ALTER TABLE panificacion_config_semanal ADD nota NVARCHAR(500) NULL
  `);
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='panificacion_compras' AND xtype='U')
    BEGIN
      CREATE TABLE panificacion_compras (
        id INT IDENTITY(1,1) PRIMARY KEY,
        proveedor NVARCHAR(200) NOT NULL,
        fecha_compra DATE NOT NULL,
        semana_compra INT NOT NULL,
        año INT NOT NULL,
        mes NVARCHAR(20) NULL,
        numero_orden NVARCHAR(100) NULL,
        monto_neto DECIMAL(18,2) NOT NULL DEFAULT 0,
        monto_con_iva DECIMAL(18,2) NOT NULL DEFAULT 0,
        plazo_dias INT NOT NULL DEFAULT 30,
        fecha_vencimiento DATE NOT NULL,
        semana_vencimiento INT NOT NULL,
        tipo_proveedor NVARCHAR(50) NOT NULL DEFAULT 'No Encadenado',
        sucursal NVARCHAR(200) NULL,
        fuente NVARCHAR(20) NOT NULL DEFAULT 'MANUAL',
        fecha_carga DATETIME DEFAULT GETDATE(),
        lote_carga NVARCHAR(50) NULL,
        estado_pago NVARCHAR(20) NOT NULL DEFAULT 'Pendiente',
        vigente BIT NOT NULL DEFAULT 1
      )
    END
  `);
  // Migraciones para tablas existentes
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name='estado_pago' AND Object_ID=Object_ID('panificacion_compras'))
      ALTER TABLE panificacion_compras ADD estado_pago NVARCHAR(20) NOT NULL DEFAULT 'Pendiente'
  `);
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name='vigente' AND Object_ID=Object_ID('panificacion_compras'))
      ALTER TABLE panificacion_compras ADD vigente BIT NOT NULL DEFAULT 1
  `);
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name='es_madre' AND Object_ID=Object_ID('panificacion_compras'))
      ALTER TABLE panificacion_compras ADD es_madre BIT NOT NULL DEFAULT 0
  `);
  // FK directa FACTURA/REMANENTE → fila EXCEL original (evita mezcla por numero_orden cross-año)
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name='id_oc_ref' AND Object_ID=Object_ID('panificacion_compras'))
      ALTER TABLE panificacion_compras ADD id_oc_ref INT NULL
  `);
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name='numero_factura' AND Object_ID=Object_ID('panificacion_compras'))
      ALTER TABLE panificacion_compras ADD numero_factura NVARCHAR(50) NULL
  `);
  // Índices de rendimiento (se crean solo si no existen)
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_planif_año_semana' AND object_id=OBJECT_ID('panificacion_compras'))
      CREATE INDEX idx_planif_año_semana ON panificacion_compras(año, semana_vencimiento)
  `);
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_planif_numero_orden' AND object_id=OBJECT_ID('panificacion_compras'))
      CREATE INDEX idx_planif_numero_orden ON panificacion_compras(numero_orden) WHERE numero_orden IS NOT NULL
  `);
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_planif_fuente_tipo' AND object_id=OBJECT_ID('panificacion_compras'))
      CREATE INDEX idx_planif_fuente_tipo ON panificacion_compras(fuente, tipo_proveedor, año)
  `);
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_planif_proveedor' AND object_id=OBJECT_ID('panificacion_compras'))
      CREATE INDEX idx_planif_proveedor ON panificacion_compras(proveedor)
  `);
};

// ─── GET: Control Semanal ─────────────────────────────────────────────────────
exports.getControlSemanal = async (req, res) => {
  try {
    const año = parseInt(req.query.año) || new Date().getFullYear();
    const pool = await poolPromise;
    await asegurarTablas(pool);

    // Obtener configuraciones personalizadas de límite
    const configResult = await pool.request()
      .input('año', sql.Int, año)
      .query('SELECT numero_semana, limite_semanal, fecha_inicio, nota FROM panificacion_config_semanal WHERE año = @año');

    const configMap = {};
    configResult.recordset.forEach(r => { configMap[r.numero_semana] = r; });

    // Pagos por semana de vencimiento, desglosados por fuente — con dedup
    const pagosResult = await pool.request()
      .input('año', sql.Int, año)
      .query(`
        WITH tiene_facturas AS (
          -- IDs de filas EXCEL que ya tienen al menos una FACTURA.
          -- Prefiere id_oc_ref (FK directa) para evitar mezcla cross-año.
          SELECT DISTINCT
            ISNULL(id_oc_ref, 0) AS oc_id,
            numero_orden
          FROM panificacion_compras
          WHERE tipo_proveedor = 'Encadenado'
            AND fuente = 'FACTURA'
            AND ISNULL(es_madre, 0) = 0
        ),
        dedup AS (
          SELECT *,
            ROW_NUMBER() OVER (
              PARTITION BY
                CASE
                  -- FACTURA/REMANENTE: cada fila ocupa su propio slot (no deduplicar)
                  WHEN tipo_proveedor = 'Encadenado' AND fuente IN ('FACTURA','REMANENTE')
                    THEN CAST(id AS NVARCHAR(20))
                  -- EXCEL encadenado con OC: dedup por numero_orden + plazo (colapsar recargas)
                  WHEN tipo_proveedor = 'Encadenado' AND LEN(ISNULL(numero_orden,'')) > 0
                    THEN 'ENC_' + numero_orden + '_PL' + ISNULL(CAST(plazo_dias AS NVARCHAR(10)),'X')
                  -- No Encadenado con número de orden
                  WHEN tipo_proveedor = 'No Encadenado' AND LEN(ISNULL(numero_orden,'')) > 0
                    THEN CAST(año AS NVARCHAR(10)) + '_NENC_' + numero_orden
                         + '_PL' + ISNULL(CAST(plazo_dias AS NVARCHAR(10)),'X')
                         + '_' + ISNULL(sucursal,'')
                         + '_' + CAST(ROUND(ISNULL(monto_con_iva,0),0) AS NVARCHAR(20))
                  ELSE CAST(id AS NVARCHAR(20))
                END
              ORDER BY id ASC
            ) AS _rn
          FROM panificacion_compras
          WHERE (
            (tipo_proveedor = 'Encadenado'    AND CASE WHEN MONTH(fecha_vencimiento) = 12 AND DATEPART(ISO_WEEK, fecha_vencimiento) = 1 THEN YEAR(fecha_vencimiento) + 1 ELSE YEAR(fecha_vencimiento) END = @año)
            OR
            (tipo_proveedor = 'No Encadenado' AND año = @año)
          ) AND ISNULL(es_madre, 0) = 0
        )
        SELECT d.semana_vencimiento,
               -- Proyección: EXCEL sin facturas aún + REMANENTE (balance pendiente de OC)
               -- Excluye OCs ya canceladas o facturadas para no inflar la proyección
               SUM(CASE
                 WHEN d.tipo_proveedor = 'Encadenado' AND d.fuente NOT IN ('FACTURA','REMANENTE')
                      AND tf.oc_id IS NULL
                      AND ISNULL(d.estado_pago,'Pendiente') NOT IN ('Cancelado','Facturado')
                   THEN d.monto_con_iva
                 WHEN d.tipo_proveedor = 'Encadenado' AND d.fuente = 'REMANENTE'
                   THEN d.monto_con_iva
                 ELSE 0
               END) AS pagos_comprometidos_enc,
               -- Facturas reales PBI confirmadas
               SUM(CASE WHEN d.tipo_proveedor = 'Encadenado' AND d.fuente = 'FACTURA'
                        THEN d.monto_con_iva ELSE 0 END) AS deuda_facturada_enc,
               -- Compras No Encadenados ERP
               SUM(CASE WHEN d.tipo_proveedor = 'No Encadenado' THEN d.monto_con_iva ELSE 0 END) AS deuda_facturada_nenc
        FROM dedup d
        LEFT JOIN tiene_facturas tf ON (
          (tf.oc_id > 0 AND tf.oc_id = d.id)
          OR (tf.oc_id = 0 AND tf.numero_orden = d.numero_orden)
        )
        WHERE d._rn = 1
        GROUP BY d.semana_vencimiento
      `);

    const pagosMap = {};
    pagosResult.recordset.forEach(r => { pagosMap[r.semana_vencimiento] = r; });

    // Construir las 52 semanas
    const semanas = [];
    for (let s = 1; s <= 52; s++) {
      const config = configMap[s];
      const limite = config ? parseFloat(config.limite_semanal) : (s <= 18 ? 120000000 : 100000000);
      const pagos = pagosMap[s] || {};
      const encComp      = parseFloat(pagos.pagos_comprometidos_enc)  || 0; // OC proyectado (EXCEL)
      const deudaFactEnc = parseFloat(pagos.deuda_facturada_enc)      || 0; // Facturas PBI
      const deudaFactNenc= parseFloat(pagos.deuda_facturada_nenc)     || 0; // No Encadenados ERP
      const totalFacturado = deudaFactEnc + deudaFactNenc;
      const totalGeneral   = encComp + totalFacturado;
      const capacidad = limite - encComp;

      // ── Lógica de estado basada en análisis de datos ──────────────────────────
      const hoy = new Date();
      const semanaActualAno = año === hoy.getFullYear() ? getWeekNumber(hoy) : (año < hoy.getFullYear() ? 53 : 0);
      const esPasada = s < semanaActualAno;

      let estado = 'OK';

      // 1. Semana ya transcurrida sin ningún registro → probablemente sin carga
      if (totalGeneral === 0 && esPasada) {
        estado = 'SIN_DATOS';
      }
      // 2. Total real (enc + no enc + facturas) supera el límite
      else if (totalGeneral > limite || encComp > limite) {
        estado = 'EXCEDIDO';
      }
      // 3. Total real en zona de riesgo (≥ 80%) aunque encadenados solos no lo superaran
      else if (totalGeneral >= limite * 0.8 || encComp >= limite * 0.8) {
        estado = 'ALERTA';
      }
      // 4. Hay facturas reales (PBI) pero sin OC registrada → datos inconsistentes
      else if (deudaFactEnc > 0 && encComp === 0 && deudaFactEnc > 2_000_000) {
        estado = 'REVISAR';
      }

      const fechaInicio = config?.fecha_inicio || getWeekStart(s, año);
      const { fechaFin } = getWeekDateRange(s, año);

      semanas.push({
        semana: `S${s}`,
        numero_semana: s,
        fecha_inicio: formatDate(fechaInicio),
        fecha_fin: fechaFin,
        limite_semanal: limite,
        encadenados:          encComp,
        deuda_facturada_enc:  deudaFactEnc,
        deuda_facturada_nenc: deudaFactNenc,
        total_facturado:      totalFacturado,
        total_general:        totalGeneral,
        capacidad_disponible: capacidad,
        estado,
        porcentaje_uso: limite > 0 ? Math.round((encComp / limite) * 100) : 0,
        nota: config?.nota || null,
      });
    }

    res.json({ success: true, año, semanas });
  } catch (error) {
    console.error('Error getControlSemanal:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET: Compras (con filtros) ────────────────────────────────────────────────
exports.getCompras = async (req, res) => {
  try {
    const { año, semana, tipo, proveedor, sucursal, mes, campo } = req.query;
    // campo='compra' → filtra por semana_compra (OC generadas esa semana)
    // campo='vencimiento' (default) → filtra por semana_vencimiento (cuándo pagar)
    const campoBD = campo === 'compra' ? 'semana_compra' : 'semana_vencimiento';
    const pool = await poolPromise;
    await asegurarTablas(pool);

    // Encadenados: se muestran las filas FACTURA individualmente (pagos reales confirmados),
    //   las filas REMANENTE (balance pendiente), y las EXCEL solo si aún no tienen facturas (proyección).
    // No Encadenados: dedup por numero_orden+plazo+sucursal+monto para evitar duplicados por recarga.
    // id_oc_ref: FK directa FACTURA/REMANENTE→EXCEL. Se prefiere sobre numero_orden para evitar mezcla cross-año.
    let query = `
      WITH tiene_facturas AS (
        -- IDs de filas EXCEL que ya tienen al menos una FACTURA asociada.
        -- Usa id_oc_ref cuando está disponible (FK directa); fallback a numero_orden.
        SELECT DISTINCT
          ISNULL(id_oc_ref, 0) AS oc_id,
          numero_orden
        FROM panificacion_compras
        WHERE tipo_proveedor = 'Encadenado'
          AND fuente = 'FACTURA'
          AND ISNULL(es_madre, 0) = 0
      ),
      enc_excel_dedup AS (
        -- EXCEL/MANUAL encadenados: dedup por numero_orden+plazo para colapsar recargas
        SELECT *,
          ROW_NUMBER() OVER (
            PARTITION BY
              CASE
                WHEN LEN(ISNULL(numero_orden,'')) > 0
                  THEN 'ENC_' + ISNULL(CAST(numero_orden AS NVARCHAR(50)),'')
                       + '_PL' + ISNULL(CAST(plazo_dias AS NVARCHAR(10)),'X')
                ELSE CAST(id AS NVARCHAR(20))
              END
            ORDER BY id ASC
          ) AS _rn
        FROM panificacion_compras
        WHERE tipo_proveedor = 'Encadenado'
          AND fuente NOT IN ('FACTURA','REMANENTE')
          AND ISNULL(es_madre, 0) = 0
      ),
      dedup_nenc AS (
        -- No Encadenados: dedup por numero_orden+plazo+sucursal+monto
        SELECT *,
          ROW_NUMBER() OVER (
            PARTITION BY
              CASE
                WHEN LEN(ISNULL(numero_orden,'')) > 0
                  THEN CAST(año AS NVARCHAR(10)) + '_NENC_'
                       + ISNULL(CAST(numero_orden AS NVARCHAR(50)),'')
                       + '_PL' + ISNULL(CAST(plazo_dias AS NVARCHAR(10)),'X')
                       + '_' + ISNULL(sucursal,'')
                       + '_' + CAST(ROUND(ISNULL(monto_con_iva, 0), 0) AS NVARCHAR(20))
                ELSE CAST(id AS NVARCHAR(20))
              END
            ORDER BY id ASC
          ) AS _rn
        FROM panificacion_compras
        WHERE tipo_proveedor = 'No Encadenado'
          AND ISNULL(es_madre, 0) = 0
      ),
      base AS (
        -- 1. Facturas PBI individuales (pagos reales confirmados)
        SELECT id, proveedor, fecha_compra, semana_compra, año, mes, numero_orden,
               monto_neto, monto_con_iva, monto_con_iva AS monto_total_iva,
               plazo_dias, fecha_vencimiento, semana_vencimiento, tipo_proveedor, sucursal,
               fuente, fecha_carga, ISNULL(estado_pago, 'Facturado') AS estado_pago, vigente
        FROM panificacion_compras
        WHERE tipo_proveedor = 'Encadenado'
          AND fuente = 'FACTURA'
          AND ISNULL(es_madre, 0) = 0

        UNION ALL

        -- 2. Remanentes (balance pendiente de OC parcialmente facturada)
        SELECT id, proveedor, fecha_compra, semana_compra, año, mes, numero_orden,
               monto_neto, monto_con_iva, monto_con_iva AS monto_total_iva,
               plazo_dias, fecha_vencimiento, semana_vencimiento, tipo_proveedor, sucursal,
               fuente, fecha_carga, ISNULL(estado_pago, 'Pendiente') AS estado_pago, vigente
        FROM panificacion_compras
        WHERE tipo_proveedor = 'Encadenado'
          AND fuente = 'REMANENTE'
          AND ISNULL(es_madre, 0) = 0

        UNION ALL

        -- 3. EXCEL/MANUAL encadenados sin facturas aún (proyección ERP)
        --    Se usa tiene_facturas con id_oc_ref cuando está disponible
        SELECT e.id, e.proveedor, e.fecha_compra, e.semana_compra, e.año, e.mes, e.numero_orden,
               e.monto_neto, e.monto_con_iva, e.monto_con_iva AS monto_total_iva,
               e.plazo_dias, e.fecha_vencimiento, e.semana_vencimiento, e.tipo_proveedor, e.sucursal,
               e.fuente, e.fecha_carga, ISNULL(e.estado_pago, 'Pendiente') AS estado_pago, e.vigente
        FROM enc_excel_dedup e
        WHERE e._rn = 1
          AND e.estado_pago NOT IN ('Cancelado', 'Facturado')
          AND NOT EXISTS (
            SELECT 1 FROM tiene_facturas tf
            WHERE (tf.oc_id > 0 AND tf.oc_id = e.id)
               OR (tf.oc_id = 0 AND tf.numero_orden = e.numero_orden)
          )

        UNION ALL

        -- 4. No Encadenados deduplicados
        SELECT id, proveedor, fecha_compra, semana_compra, año, mes, numero_orden,
               monto_neto, monto_con_iva, monto_con_iva AS monto_total_iva,
               plazo_dias, fecha_vencimiento, semana_vencimiento, tipo_proveedor, sucursal,
               fuente, fecha_carga, ISNULL(estado_pago, 'Pendiente') AS estado_pago, vigente
        FROM dedup_nenc
        WHERE _rn = 1
      )
      SELECT * FROM base
      WHERE 1=1
    `;
    const request = pool.request();

    if (año) {
      if (campoBD === 'semana_compra') {
        query += ` AND año = @año`;
      } else {
        query += ` AND (
          (tipo_proveedor = 'Encadenado'    AND CASE WHEN MONTH(fecha_vencimiento) = 12 AND DATEPART(ISO_WEEK, fecha_vencimiento) = 1 THEN YEAR(fecha_vencimiento) + 1 ELSE YEAR(fecha_vencimiento) END = @año)
          OR
          (tipo_proveedor = 'No Encadenado' AND año = @año)
        )`;
      }
      request.input('año', sql.Int, parseInt(año));
    }
    if (semana) { query += ` AND ${campoBD} = @semana`; request.input('semana', sql.Int, parseInt(semana)); }
    if (tipo) { query += ' AND tipo_proveedor = @tipo'; request.input('tipo', sql.NVarChar, tipo); }
    if (proveedor) { query += ' AND proveedor LIKE @proveedor'; request.input('proveedor', sql.NVarChar, `%${proveedor}%`); }
    if (sucursal) { query += ' AND sucursal = @sucursal'; request.input('sucursal', sql.NVarChar, sucursal); }
    if (mes) { query += ' AND mes = @mes'; request.input('mes', sql.NVarChar, mes); }

    query += ' ORDER BY fecha_compra DESC, numero_orden ASC, id DESC';

    if (tipo === 'No Encadenado') {
      console.log('\n📋 [No Encadenados] QUERY SQL:');
      console.log('─'.repeat(70));
      console.log(query);
      console.log('📌 Parámetros:', { año, semana, tipo, proveedor, sucursal, mes, campo });
      console.log('─'.repeat(70));
    }

    const result = await request.query(query);

    if (tipo === 'No Encadenado') {
      console.log(`✅ [No Encadenados] Resultados: ${result.recordset.length} registros`);
      if (result.recordset.length > 0) {
        console.log('   Muestra (primeros 3):');
        result.recordset.slice(0, 3).forEach((r, i) => {
          console.log(`   [${i+1}] proveedor="${r.proveedor}" orden="${r.numero_orden}" monto_con_iva=${r.monto_con_iva} semana_venc=${r.semana_vencimiento} fuente="${r.fuente}"`);
        });
      }
      console.log('');
    }

    res.json({ success: true, total: result.recordset.length, compras: result.recordset });
  } catch (error) {
    console.error('Error getCompras:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET: Compras por Sucursal ────────────────────────────────────────────────
exports.getComprasPorSucursal = async (req, res) => {
  try {
    const { año, mes } = req.query;
    const pool = await poolPromise;
    await asegurarTablas(pool);

    const request = pool.request();
    let whereClause = 'WHERE sucursal IS NOT NULL';
    if (año) { whereClause += ' AND año = @año'; request.input('año', sql.Int, parseInt(año)); }
    if (mes) { whereClause += ' AND mes = @mes'; request.input('mes', sql.NVarChar, mes); }

    const result = await request.query(`
      SELECT
        sucursal,
        tipo_proveedor,
        mes,
        COUNT(*) as total_ordenes,
        SUM(monto_neto) as total_neto,
        SUM(monto_con_iva) as total_con_iva
      FROM panificacion_compras
      ${whereClause}
      GROUP BY sucursal, tipo_proveedor, mes
      ORDER BY sucursal, tipo_proveedor, mes
    `);

    // Agrupar por sucursal
    const sucursalesMap = {};
    result.recordset.forEach(row => {
      if (!sucursalesMap[row.sucursal]) {
        sucursalesMap[row.sucursal] = { sucursal: row.sucursal, encadenado: 0, no_encadenado: 0, total: 0, detalle: [] };
      }
      const s = sucursalesMap[row.sucursal];
      const monto = parseFloat(row.total_con_iva) || 0;
      if (row.tipo_proveedor === 'Encadenado') s.encadenado += monto;
      else s.no_encadenado += monto;
      s.total += monto;
      s.detalle.push(row);
    });

    res.json({ success: true, sucursales: Object.values(sucursalesMap) });
  } catch (error) {
    console.error('Error getComprasPorSucursal:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET: Proyección Encadenados ──────────────────────────────────────────────
exports.getProyeccion = async (req, res) => {
  try {
    const { año } = req.query;
    const pool = await poolPromise;
    await asegurarTablas(pool);

    const request = pool.request();
    if (año) request.input('año', sql.Int, parseInt(año));

    const result = await request.query(`
      WITH dedup AS (
        SELECT *,
          ROW_NUMBER() OVER (
            PARTITION BY
              CASE
                -- Incluir año + plazo_dias: preserva cuotas distintas de la misma OC
                -- y evita que OCs con mismo número en años diferentes se colapsen
                WHEN LEN(ISNULL(numero_orden,'')) > 0
                THEN CAST(año AS NVARCHAR(10))
                     + '_' + numero_orden
                     + '_PL' + ISNULL(CAST(plazo_dias AS NVARCHAR(10)),'X')
                ELSE CAST(id AS NVARCHAR(20))
              END
            ORDER BY CASE WHEN fuente = 'FACTURA' THEN 0 ELSE 1 END, id DESC
          ) AS _rn
        FROM panificacion_compras
        WHERE tipo_proveedor = 'Encadenado'
          ${año ? 'AND CASE WHEN MONTH(fecha_vencimiento) = 12 AND DATEPART(ISO_WEEK, fecha_vencimiento) = 1 THEN YEAR(fecha_vencimiento) + 1 ELSE YEAR(fecha_vencimiento) END = @año' : ''}
      )
      SELECT
        proveedor, fecha_compra, semana_compra, numero_orden,
        monto_neto, monto_con_iva, plazo_dias, fecha_vencimiento,
        semana_vencimiento, sucursal, mes, año
      FROM dedup
      WHERE _rn = 1
      ORDER BY fecha_vencimiento ASC, proveedor ASC
    `);

    // Agrupar por semana de vencimiento para proyección
    const proyeccionMap = {};
    result.recordset.forEach(row => {
      const key = `S${row.semana_vencimiento}-${row.año}`;
      if (!proyeccionMap[key]) {
        proyeccionMap[key] = {
          semana: `S${row.semana_vencimiento}`,
          numero_semana: row.semana_vencimiento,
          año: row.año,
          fecha_vencimiento_aprox: row.fecha_vencimiento,
          total_comprometido: 0,
          ordenes: []
        };
      }
      proyeccionMap[key].total_comprometido += parseFloat(row.monto_con_iva) || 0;
      proyeccionMap[key].ordenes.push(row);
    });

    // Enriquecer con estado de capacidad (vs límite semanal)
    const configResult = await pool.request()
      .query(`SELECT numero_semana, año, limite_semanal FROM panificacion_config_semanal ${año ? `WHERE año = ${parseInt(año)}` : ''}`);
    const configMap = {};
    configResult.recordset.forEach(r => { configMap[`${r.numero_semana}-${r.año}`] = r.limite_semanal; });

    const proyeccion = Object.values(proyeccionMap).map(p => {
      const limite = configMap[`${p.numero_semana}-${p.año}`] || (p.numero_semana <= 18 ? 120000000 : 100000000);
      const porcentaje = limite > 0 ? Math.round((p.total_comprometido / limite) * 100) : 0;
      return {
        ...p,
        limite_semanal: limite,
        porcentaje_uso: porcentaje,
        alerta: porcentaje >= 80
      };
    });

    res.json({ success: true, proyeccion });
  } catch (error) {
    console.error('Error getProyeccion:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Helper: redondear días al plazo contractual estándar más cercano ─────────
const redondearPlazo = (dias) => {
  const estandares = [30, 60, 90, 120];
  if (!dias || dias <= 0) return 30;
  return estandares.reduce((prev, curr) =>
    Math.abs(curr - dias) < Math.abs(prev - dias) ? curr : prev
  );
};

// ─── Helper: insertar una compra ──────────────────────────────────────────────
// fuente: 'EXCEL' (por defecto) | 'FACTURA' | 'MANUAL'
const insertarCompra = async (pool, data, lote, fuente = 'EXCEL') => {
  await pool.request()
    .input('proveedor',         sql.NVarChar,    data.proveedor)
    .input('fecha_compra',      sql.Date,        data.fecha_compra)
    .input('semana_compra',     sql.Int,         data.semana_compra)
    .input('año',               sql.Int,         data.año)
    .input('mes',               sql.NVarChar,    data.mes)
    .input('numero_orden',      sql.NVarChar,    data.numero_orden || '')
    .input('monto_neto',        sql.Decimal(18,2), data.monto_neto)
    .input('monto_con_iva',     sql.Decimal(18,2), data.monto_con_iva)
    .input('plazo_dias',        sql.Int,         data.plazo_dias)
    .input('fecha_vencimiento', sql.Date,        data.fecha_vencimiento)
    .input('semana_vencimiento',sql.Int,         data.semana_vencimiento)
    .input('tipo_proveedor',    sql.NVarChar,    data.tipo_proveedor)
    .input('sucursal',          sql.NVarChar,    data.sucursal || '')
    .input('fuente',            sql.NVarChar,    fuente)
    .input('lote_carga',        sql.NVarChar,    lote)
    .input('fecha_carga',       sql.DateTime,    data.fecha_carga || new Date())
    .input('id_oc_ref',         sql.Int,         data.id_oc_ref || null)
    .input('numero_factura',    sql.NVarChar,    data.numero_factura || null)
    .query(`
      INSERT INTO panificacion_compras
        (proveedor, fecha_compra, semana_compra, año, mes, numero_orden,
         monto_neto, monto_con_iva, plazo_dias, fecha_vencimiento,
         semana_vencimiento, tipo_proveedor, sucursal, fuente, lote_carga, fecha_carga, id_oc_ref, numero_factura)
      VALUES
        (@proveedor, @fecha_compra, @semana_compra, @año, @mes, @numero_orden,
         @monto_neto, @monto_con_iva, @plazo_dias, @fecha_vencimiento,
         @semana_vencimiento, @tipo_proveedor, @sucursal, @fuente, @lote_carga, @fecha_carga, @id_oc_ref, @numero_factura)
    `);
};

// ─── POST: Upload Excel (todas las hojas) ──────────────────────────────────────
exports.uploadExcelEncadenados = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No se recibió archivo Excel' });

    const lote = `EXCEL_${Date.now()}`;
    const wb = XLSX.readFile(req.file.path);
    const pool = await poolPromise;
    await asegurarTablas(pool);

    if (req.body.reemplazar === 'true' || req.body.reemplazar === true) {
      await pool.request().query(`DELETE FROM panificacion_compras WHERE fuente = 'EXCEL'`);
    }

    let insertados   = 0;
    let actualizados = 0;
    let ignorados    = 0;
    let errores      = 0;
    const hojasUsadas = [];

    // ── Procesar cada hoja del Excel ─────────────────────────────────────────
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (raw.length < 2) continue;

      const headers = raw[0].map(h => String(h).trim().toLowerCase());
      const rows    = raw.slice(1).filter(r => r.some(c => c !== ''));
      const col = (terms) => headers.findIndex(h => terms.some(t => h.includes(t)));

      // ══ HOJA 1: "Control Pagos Semanales" — Importar límites semanales ════════
      // Detectar por columna "límite semanal" o "semana" sin proveedor/sucursal
      if ((col(['límite', 'limite']) !== -1 || col(['pagos comprometidos']) !== -1) && col(['proveedor']) === -1) {
        hojasUsadas.push(`${sheetName} (límites)`);
        const iSemana = col(['semana']);
        const iLimite = col(['límite', 'limite semanal', 'limite']);
        if (iSemana !== -1 && iLimite !== -1) {
          for (const row of rows) {
            try {
              const semRaw  = String(row[iSemana] || '').replace(/[^0-9]/g, '');
              const semana  = parseInt(semRaw);
              const limite  = parseFloat(row[iLimite]);
              if (!semana || isNaN(limite) || limite <= 0) continue;
              await pool.request()
                .input('semana', sql.Int, semana)
                .input('año',    sql.Int, new Date().getFullYear())
                .input('limite', sql.Decimal(18,2), limite)
                .query(`
                  MERGE panificacion_config_semanal AS t
                  USING (SELECT @semana AS numero_semana, @año AS año) AS s
                    ON t.numero_semana = s.numero_semana AND t.año = s.año
                  WHEN MATCHED THEN UPDATE SET limite_semanal = @limite
                  WHEN NOT MATCHED THEN INSERT (numero_semana, año, limite_semanal) VALUES (@semana, @año, @limite);
                `);
            } catch (e) { errores++; }
          }
        }
        continue;
      }

      // ══ HOJA 2: "Compras" — Encadenados con plazo/vencimiento ══════════════
      // Detectar por columna "plazo" + "semana vencimiento"
      if (col(['plazo']) !== -1 && col(['vencimiento']) !== -1 && col(['sucursal']) === -1) {
        hojasUsadas.push(sheetName);
        const iProveedor  = col(['proveedor']);
        const iFecha      = col(['fecha compra','fecha']);
        const iSemana     = col(['semana']);
        const iNeto       = col(['neto', 'compra (neto)']);
        const iIva        = col(['monto compra', 'con iva', 'c/iva']);
        const iPlazo      = col(['plazo']);
        const iFechaVenc  = col(['fecha vencimiento','vencimiento']);
        const iSemanaVenc = col(['semana vencimiento']);
        // Leer N° de OC si la hoja lo trae (columna opcional)
        const iOrden = col(['n° orden','nro orden','numero orden','n_orden','orden','oc','n_oc']);

        // ── PASO 1: recolectar filas válidas y contar plazos por (proveedor+fecha+monto) ──
        // Si el mismo proveedor+fecha+monto aparece N veces con distintos plazos → N cuotas
        const comprasFilasValidas = [];
        const comprasGrupoCount = {}; // "prov|fecha|monto" → cantidad de filas

        for (const row of rows) {
          const proveedor = String(row[iProveedor] || '').trim();
          if (!proveedor || proveedor.toLowerCase() === 'proveedor') continue;
          const fechaCompra = parseFecha(row[iFecha]);
          if (!fechaCompra) continue;
          const montoNeto = parseFloat(row[iNeto]) || 0;
          const montoIva  = parseFloat(row[iIva])  || montoNeto * 1.19;
          const semanaCompra = parseInt(row[iSemana]) || getWeekNumber(fechaCompra);
          const año          = fechaCompra.getFullYear();
          const orden        = iOrden !== -1 ? String(row[iOrden] || '').trim() : '';
          const grupoKey     = `${proveedor}|${formatDate(fechaCompra)}|${montoIva}`;

          // Soporta celdas con múltiples plazos: "60-90", "60/90", etc.
          const plazos = parsePlazos(row[iPlazo]);
          for (const plazo of plazos) {
            // Siempre calcular fechaVenc desde fechaCompra + plazo (no confiar en celda Excel)
            const fechaVenc = new Date(fechaCompra);
            fechaVenc.setDate(fechaVenc.getDate() + (plazo || 30));
            const semanaVenc = getWeekNumber(fechaVenc);
            comprasGrupoCount[grupoKey] = (comprasGrupoCount[grupoKey] || 0) + 1;
            comprasFilasValidas.push({ proveedor, fechaCompra, montoNeto, montoIva, plazo, fechaVenc, semanaCompra, semanaVenc, año, grupoKey, orden });
          }
        }

        // ── PASO 2: insertar dividiendo monto por cantidad de plazos del grupo ──
        for (const r of comprasFilasValidas) {
          try {
            const { proveedor, fechaCompra, montoIva, plazo, fechaVenc, semanaCompra, semanaVenc, año, grupoKey, orden } = r;
            const cantidadCuotas = comprasGrupoCount[grupoKey] || 1;
            const montoCuota = Math.round(montoIva / cantidadCuotas);
            const montoNetoCuota = Math.round(montoCuota / 1.19);

            // Si la fila trae N° de OC, hacer UPSERT igual que InformeOrdenesCompra
            if (orden) {
              const existente = await pool.request()
                .input('orden', sql.NVarChar, orden)
                .input('plazo', sql.Int,      plazo)
                .query(`SELECT TOP 1 id, fuente FROM panificacion_compras
                        WHERE numero_orden = @orden AND ISNULL(plazo_dias,-1) = @plazo
                          AND tipo_proveedor = 'Encadenado' ORDER BY id DESC`);
              if (existente.recordset.length > 0) {
                if ((existente.recordset[0].fuente || '').toUpperCase() !== 'FACTURA') {
                  console.log(`[HOJA2 UPDATE] id=${existente.recordset[0].id} plazo=${plazo} fecha_vencimiento=${formatDate(fechaVenc)}`);
                  await pool.request()
                    .input('id',                sql.Int,           existente.recordset[0].id)
                    .input('monto_neto',        sql.Decimal(18,2), montoNetoCuota)
                    .input('monto_con_iva',     sql.Decimal(18,2), montoCuota)
                    .input('plazo_dias',        sql.Int,           plazo)
                    .input('fecha_vencimiento', sql.Date,          formatDate(fechaVenc))
                    .input('semana_vencimiento',sql.Int,           semanaVenc)
                    .input('lote',              sql.NVarChar,      lote)
                    .query(`UPDATE panificacion_compras SET
                              monto_neto=@monto_neto, monto_con_iva=@monto_con_iva,
                              plazo_dias=@plazo_dias, fecha_vencimiento=@fecha_vencimiento,
                              semana_vencimiento=@semana_vencimiento, lote_carga=@lote,
                              fecha_carga=GETDATE()
                            WHERE id=@id`);
                  actualizados++;
                } else { ignorados++; }
                continue;
              }
            } else {
              // Sin OC: verificar si ya existe un encadenado con OC# del mismo proveedor+semana+plazo
              // para evitar duplicar lo que ya viene de InformeOrdenesCompra
              const existeConOC = await pool.request()
                .input('prov',  sql.NVarChar, proveedor)
                .input('sem',   sql.Int,      semanaCompra)
                .input('plazo', sql.Int,      plazo)
                .input('año',   sql.Int,      año)
                .query(`SELECT id FROM panificacion_compras
                        WHERE tipo_proveedor='Encadenado' AND proveedor=@prov
                          AND semana_compra=@sem AND plazo_dias=@plazo AND año=@año
                          AND LEN(ISNULL(numero_orden,'')) > 0`);
              if (existeConOC.recordset.length > 0) { ignorados++; continue; }

              // Deduplicar por (proveedor + semana + monto + plazo) entre registros sin OC
              const dup = await pool.request()
                .input('prov',  sql.NVarChar,     proveedor)
                .input('sem',   sql.Int,           semanaCompra)
                .input('monto', sql.Decimal(18,2), montoCuota)
                .input('plazo', sql.Int,           plazo)
                .query(`SELECT id FROM panificacion_compras
                        WHERE tipo_proveedor='Encadenado' AND proveedor=@prov
                          AND semana_compra=@sem AND monto_con_iva=@monto AND plazo_dias=@plazo
                          AND (numero_orden IS NULL OR numero_orden='')`);
              if (dup.recordset.length > 0) { ignorados++; continue; }
            }

            console.log(`[HOJA2 INSERT] proveedor=${proveedor} plazo=${plazo} fecha_compra=${formatDate(fechaCompra)} fecha_vencimiento=${formatDate(fechaVenc)}`);
            await insertarCompra(pool, {
              proveedor, fecha_compra: formatDate(fechaCompra),
              semana_compra: semanaCompra, año, mes: getMesNombre(fechaCompra),
              numero_orden: orden, monto_neto: montoNetoCuota, monto_con_iva: montoCuota,
              plazo_dias: plazo, fecha_vencimiento: formatDate(fechaVenc),
              semana_vencimiento: semanaVenc, tipo_proveedor: 'Encadenado', sucursal: '',
            }, lote);
            insertados++;
          } catch (e) { errores++; }
        }
        continue;
      }

      // ══ HOJA InformeOrdenesCompra: N° Orden + Proveedor + Total + Fecha + Plazo ══
      // Detectar por presencia de "estado" + "generado" sin columna sucursal ni vencimiento
      if (
        col(['° orden', 'nro orden', 'numero orden']) !== -1 &&
        col(['estado']) !== -1 &&
        col(['generado']) !== -1 &&
        col(['sucursal']) === -1 &&
        col(['vencimiento']) === -1
      ) {
        hojasUsadas.push(`${sheetName} (InformeOC)`);

        // Mapeo de columnas
        const iOrden     = headers.findIndex(h => h.includes('° orden') && !h.includes('pedido'));
        const iFecha     = col(['fecha']);
        const iProveedor = col(['proveedor']);
        const iTotal     = col(['total']);
        const iPlazo     = col(['plazo']);

        // ── PASO 1: recolectar filas válidas y contar plazos por OC ──────────
        // Si una OC aparece N veces con distintos plazos, el monto se divide en N cuotas iguales.
        // Problema frecuente: Excel deja proveedor/fecha/monto vacíos en filas de continuación
        // (misma OC, distinto plazo). Se hereda el contexto de la primera fila de esa OC.
        const ocFilasValidas = [];
        const ocCantidadPlazos = {}; // numero_orden → cantidad de filas (= cuotas)
        const ultimoContextoOC = {}; // numero_orden → { proveedor, fechaCompra, monto }

        for (const row of rows) {
          const ordenRaw    = String(row[iOrden] ?? '').trim();
          let proveedor     = String(row[iProveedor] ?? '').trim();
          let fechaCompra   = parseFecha(row[iFecha]);
          // La columna "total" del InformeOC contiene montos NETOS (sin IVA)
          let montoNetoTotal = parseFloat(String(row[iTotal] ?? '').replace(/[^0-9.-]/g, '')) || 0;

          // Fila de continuación: misma OC, distinto plazo, celdas vacías → heredar contexto
          if (ordenRaw && ultimoContextoOC[ordenRaw]) {
            if (!proveedor)       proveedor       = ultimoContextoOC[ordenRaw].proveedor;
            if (!fechaCompra)     fechaCompra     = ultimoContextoOC[ordenRaw].fechaCompra;
            if (!montoNetoTotal)  montoNetoTotal  = ultimoContextoOC[ordenRaw].monto;
          }

          if (!proveedor || proveedor.toLowerCase() === 'proveedor') continue;
          if (!fechaCompra) continue;

          // Guardar contexto para posibles filas de continuación de esta OC
          if (ordenRaw) ultimoContextoOC[ordenRaw] = { proveedor, fechaCompra, monto: montoNetoTotal };

          // Soporta celdas con múltiples plazos: "60-90", "60/90", "60,90", etc.
          const plazos = parsePlazos(row[iPlazo]);
          for (const plazo of plazos) {
            ocFilasValidas.push({ proveedor, fechaCompra, montoNetoTotal, plazo, orden: ordenRaw });
            if (ordenRaw) ocCantidadPlazos[ordenRaw] = (ocCantidadPlazos[ordenRaw] || 0) + 1;
          }
        }

        // ── PASO 2: procesar cada fila con el monto dividido por cuotas ──────
        for (const r of ocFilasValidas) {
          try {
            const { proveedor, fechaCompra, montoNetoTotal, plazo, orden } = r;

            // Dividir monto neto por cantidad de cuotas y calcular con IVA
            const cantidadCuotas = (orden && ocCantidadPlazos[orden]) ? ocCantidadPlazos[orden] : 1;
            const montoNeto  = Math.round(montoNetoTotal / cantidadCuotas);
            const montoCuota = Math.round(montoNeto * 1.19);

            // Fecha de vencimiento = fecha compra + plazo días
            const fechaVenc = new Date(fechaCompra);
            fechaVenc.setDate(fechaVenc.getDate() + (plazo || 30));
            console.log(`[PLAZO DEBUG] orden=${orden} plazo=${plazo} fechaCompra=${formatDate(fechaCompra)} fechaVenc=${formatDate(fechaVenc)}`);

            const semanaCompra = getWeekNumber(fechaCompra);
            const semanaVenc   = getWeekNumber(fechaVenc);
            const año          = fechaCompra.getFullYear();

            // ── UPSERT por (N° Orden + plazo_dias): una fila por cuota ───────
            if (orden) {
              const existente = await pool.request()
                .input('orden', sql.NVarChar, orden)
                .input('plazo', sql.Int,      plazo)
                .query(`
                  SELECT TOP 1 id, fuente FROM panificacion_compras
                  WHERE numero_orden = @orden
                    AND ISNULL(plazo_dias, -1) = @plazo
                    AND tipo_proveedor = 'Encadenado'
                  ORDER BY id DESC
                `);

              if (existente.recordset.length > 0) {
                const fuenteExistente = (existente.recordset[0].fuente || '').toUpperCase();
                if (fuenteExistente === 'FACTURA') {
                  ignorados++;
                } else {
                  await pool.request()
                    .input('id',                sql.Int,           existente.recordset[0].id)
                    .input('proveedor',         sql.NVarChar,      proveedor)
                    .input('monto_neto',        sql.Decimal(18,2), montoNeto)
                    .input('monto_con_iva',     sql.Decimal(18,2), montoCuota)
                    .input('plazo_dias',        sql.Int,           plazo)
                    .input('fecha_vencimiento', sql.Date,          formatDate(fechaVenc))
                    .input('semana_vencimiento',sql.Int,           semanaVenc)
                    .input('lote',              sql.NVarChar,      lote)
                    .query(`
                      UPDATE panificacion_compras SET
                        proveedor          = @proveedor,
                        monto_neto         = @monto_neto,
                        monto_con_iva      = @monto_con_iva,
                        plazo_dias         = @plazo_dias,
                        fecha_vencimiento  = @fecha_vencimiento,
                        semana_vencimiento = @semana_vencimiento,
                        lote_carga         = @lote,
                        fecha_carga        = GETDATE()
                      WHERE id = @id
                    `);
                  actualizados++;
                }
                continue;
              }
            }

            await insertarCompra(pool, {
              proveedor,
              fecha_compra:       formatDate(fechaCompra),
              semana_compra:      semanaCompra,
              año,
              mes:                getMesNombre(fechaCompra),
              numero_orden:       orden,
              monto_neto:         montoNeto,
              monto_con_iva:      montoCuota,
              plazo_dias:         plazo,
              fecha_vencimiento:  formatDate(fechaVenc),
              semana_vencimiento: semanaVenc,
              tipo_proveedor:     'Encadenado',
              sucursal:           '',
            }, lote);
            insertados++;
          } catch (e) { errores++; }
        }

        continue;
      }

      // ══ HOJA 3: "Compras por Sucursales" — Enc + No Enc con Orden/Sucursal ══
      // Detectar por columna "sucursal" + "orden" + "tipo"
      if (col(['sucursal']) !== -1 && col(['orden']) !== -1) {
        hojasUsadas.push(sheetName);
        const iSucursal  = col(['sucursal']);
        const iMes       = col(['mes']);
        const iOrden     = col(['orden']);
        const iFecha     = col(['fecha']);
        const iProveedor = col(['proveedor']);
        const iNeto      = col(['neto', 'total neto']);
        const iIva       = col(['c/iva', 'con iva', 'total c']);
        const iTipo      = col(['tipo']);
        const iSemana    = col(['semana']);

        for (const row of rows) {
          try {
            const proveedor = String(row[iProveedor] || '').trim();
            if (!proveedor || proveedor.toLowerCase() === 'proveedor') continue;

            const fechaCompra = parseFecha(row[iFecha]);
            if (!fechaCompra) continue;

            const montoNeto = parseFloat(row[iNeto]) || 0;
            const montoIva  = parseFloat(row[iIva])  || montoNeto * 1.19;
            const tipo      = String(row[iTipo] || 'Encadenado').trim();
            // No Encadenados se pagan el mismo día → vencimiento = fecha compra
            const plazo     = tipo.toLowerCase().includes('no') ? 0 : 30;
            const fechaVenc = new Date(fechaCompra);
            if (plazo > 0) fechaVenc.setDate(fechaVenc.getDate() + plazo);

            const semanaCompra = parseInt(row[iSemana]) || getWeekNumber(fechaCompra);
            const semanaVenc   = tipo.toLowerCase().includes('no') ? semanaCompra : getWeekNumber(fechaVenc);
            const año          = fechaCompra.getFullYear();
            const mes          = iMes !== -1 ? String(row[iMes] || getMesNombre(fechaCompra)) : getMesNombre(fechaCompra);
            const orden        = iOrden !== -1 ? String(row[iOrden] || '') : '';
            const sucursal     = iSucursal !== -1 ? String(row[iSucursal] || '') : '';

            await insertarCompra(pool, {
              proveedor, fecha_compra: formatDate(fechaCompra),
              semana_compra: semanaCompra, año, mes, numero_orden: orden,
              monto_neto: montoNeto, monto_con_iva: montoIva,
              plazo_dias: plazo, fecha_vencimiento: formatDate(fechaVenc),
              semana_vencimiento: semanaVenc, tipo_proveedor: tipo, sucursal,
            }, lote);
            insertados++;
          } catch (e) { errores++; }
        }
        continue;
      }
    }

    try { fs.unlinkSync(req.file.path); } catch (e) {}

    // Auto-limpiar duplicados generados por esta carga
    try { await _deduplicar(pool); } catch (e) { console.warn('deduplicar post-excel:', e.message); }

    const partes = [`${insertados} nuevos`];
    if (actualizados > 0) partes.push(`${actualizados} actualizados`);
    if (ignorados    > 0) partes.push(`${ignorados} ignorados`);
    if (errores      > 0) partes.push(`${errores} errores`);

    res.json({
      success: true,
      message: `Excel cargado: ${partes.join(', ')} — ${hojasUsadas.length} hoja(s)`,
      insertados, actualizados, ignorados, errores, lote, hojas: hojasUsadas
    });
  } catch (error) {
    console.error('Error uploadExcelEncadenados:', error);
    if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch (e) {}
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST: Upload Excel OC por Sucursal ───────────────────────────────────────
exports.uploadExcelSucursal = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No se recibió archivo Excel' });

    const sucursal = (req.body.sucursal || '').trim();
    if (!sucursal) return res.status(400).json({ success: false, message: 'Debe especificar la sucursal' });

    const lote = `EXCEL_SUC_${Date.now()}`;
    const wb = XLSX.readFile(req.file.path);
    const pool = await poolPromise;
    await asegurarTablas(pool);

    let insertados   = 0;
    let actualizados = 0;
    let ignorados    = 0;
    let errores      = 0;
    const hojasUsadas = [];

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (raw.length < 2) continue;

      const headers = raw[0].map(h => String(h).trim().toLowerCase());
      const rows    = raw.slice(1).filter(r => r.some(c => c !== ''));
      const col = (terms) => headers.findIndex(h => terms.some(t => h.includes(t)));

      // Detectar hoja tipo InformeOrdenesCompra: N° Orden + Estado + Generado
      if (
        col(['° orden', 'nro orden', 'numero orden']) !== -1 &&
        col(['estado']) !== -1 &&
        col(['generado']) !== -1
      ) {
        hojasUsadas.push(`${sheetName} (OC)`);

        const iOrden     = headers.findIndex(h => h.includes('° orden') && !h.includes('pedido'));
        const iFecha     = col(['fecha']);
        const iProveedor = col(['proveedor']);
        const iTotal     = col(['total']);
        const iPlazo     = col(['plazo']);

        // ── PASO 1: recolectar filas válidas y contar plazos por OC ──────────
        // Hereda proveedor/fecha/monto de filas anteriores del mismo N° OC
        // (Excel puede dejar esas celdas vacías en filas de continuación)
        const ocFilasValidas   = [];
        const ocCantidadPlazos = {}; // numero_orden → cantidad de filas (= cuotas)
        const ultimoContextoOC = {}; // numero_orden → { proveedor, fechaCompra, monto }

        for (const row of rows) {
          const ordenRaw       = String(row[iOrden] ?? '').trim();
          let proveedor        = String(row[iProveedor] ?? '').trim();
          let fechaCompra      = parseFecha(row[iFecha]);
          let montoConIvaTotal = parseFloat(String(row[iTotal] ?? '').replace(/[^0-9.-]/g, '')) || 0;

          if (ordenRaw && ultimoContextoOC[ordenRaw]) {
            if (!proveedor)        proveedor        = ultimoContextoOC[ordenRaw].proveedor;
            if (!fechaCompra)      fechaCompra      = ultimoContextoOC[ordenRaw].fechaCompra;
            if (!montoConIvaTotal) montoConIvaTotal = ultimoContextoOC[ordenRaw].monto;
          }

          if (!proveedor || proveedor.toLowerCase() === 'proveedor') continue;
          if (!fechaCompra) continue;

          if (ordenRaw) ultimoContextoOC[ordenRaw] = { proveedor, fechaCompra, monto: montoConIvaTotal };

          // Soporta celdas con múltiples plazos: "60-90", "60/90", "60,90", etc.
          const plazos = parsePlazos(row[iPlazo]);
          for (const plazo of plazos) {
            ocFilasValidas.push({ proveedor, fechaCompra, montoConIvaTotal, plazo, orden: ordenRaw });
            if (ordenRaw) ocCantidadPlazos[ordenRaw] = (ocCantidadPlazos[ordenRaw] || 0) + 1;
          }
        }

        // ── PASO 2: insertar/actualizar dividiendo monto por cantidad de cuotas ──
        for (const r of ocFilasValidas) {
          try {
            const { proveedor, fechaCompra, montoConIvaTotal, plazo, orden } = r;
            const cantidadCuotas = (orden && ocCantidadPlazos[orden]) ? ocCantidadPlazos[orden] : 1;
            const montoCuota = Math.round(montoConIvaTotal / cantidadCuotas);
            const montoNeto  = Math.round(montoCuota / 1.19);

            // Fecha de vencimiento = fecha compra + plazo días
            const fechaVenc = new Date(fechaCompra);
            fechaVenc.setDate(fechaVenc.getDate() + (plazo || 30));
            console.log(`[PLAZO DEBUG SUC] orden=${orden} plazo=${plazo} fechaCompra=${formatDate(fechaCompra)} fechaVenc=${formatDate(fechaVenc)}`);

            const semanaCompra = getWeekNumber(fechaCompra);
            const semanaVenc   = getWeekNumber(fechaVenc);
            const año          = fechaCompra.getFullYear();

            if (orden) {
              // Buscar por (numero_orden + plazo_dias + sucursal) para preservar
              // distintos plazos o sucursales de la misma OC
              const existente = await pool.request()
                .input('orden',    sql.NVarChar, orden)
                .input('sucursal', sql.NVarChar, sucursal)
                .input('plazo',    sql.Int,      plazo)
                .query(`
                  SELECT id, fuente FROM panificacion_compras
                  WHERE numero_orden = @orden AND tipo_proveedor = 'Encadenado'
                    AND ISNULL(plazo_dias, -1) = @plazo
                    AND (sucursal = @sucursal OR sucursal IS NULL OR sucursal = '')
                `);

              if (existente.recordset.length > 0) {
                const fuenteExistente = (existente.recordset[0].fuente || '').toUpperCase();
                if (fuenteExistente === 'FACTURA') {
                  ignorados++;
                } else {
                  await pool.request()
                    .input('id',                sql.Int,           existente.recordset[0].id)
                    .input('proveedor',         sql.NVarChar,      proveedor)
                    .input('monto_neto',        sql.Decimal(18,2), montoNeto)
                    .input('monto_con_iva',     sql.Decimal(18,2), montoCuota)
                    .input('plazo_dias',        sql.Int,           plazo)
                    .input('fecha_vencimiento', sql.Date,          formatDate(fechaVenc))
                    .input('semana_vencimiento',sql.Int,           semanaVenc)
                    .input('sucursal',          sql.NVarChar,      sucursal)
                    .input('lote',              sql.NVarChar,      lote)
                    .query(`
                      UPDATE panificacion_compras SET
                        proveedor          = @proveedor,
                        monto_neto         = @monto_neto,
                        monto_con_iva      = @monto_con_iva,
                        plazo_dias         = @plazo_dias,
                        fecha_vencimiento  = @fecha_vencimiento,
                        semana_vencimiento = @semana_vencimiento,
                        sucursal           = @sucursal,
                        lote_carga         = @lote,
                        fecha_carga        = GETDATE()
                      WHERE id = @id
                    `);
                  actualizados++;
                }
                continue;
              }
            }

            await insertarCompra(pool, {
              proveedor,
              fecha_compra:       formatDate(fechaCompra),
              semana_compra:      semanaCompra,
              año,
              mes:                getMesNombre(fechaCompra),
              numero_orden:       orden,
              monto_neto:         montoNeto,
              monto_con_iva:      montoCuota,
              plazo_dias:         plazo,
              fecha_vencimiento:  formatDate(fechaVenc),
              semana_vencimiento: semanaVenc,
              tipo_proveedor:     'Encadenado',
              sucursal,
            }, lote);
            insertados++;
          } catch (e) { errores++; }
        }
        continue;
      }
    }

    try { fs.unlinkSync(req.file.path); } catch (e) {}
    try { await _deduplicar(pool); } catch (e) { console.warn('deduplicar post-excel-sucursal:', e.message); }

    const partes = [`${insertados} nuevos`];
    if (actualizados > 0) partes.push(`${actualizados} actualizados`);
    if (ignorados    > 0) partes.push(`${ignorados} ignorados`);
    if (errores      > 0) partes.push(`${errores} errores`);

    res.json({
      success: true,
      message: `OC ${sucursal}: ${partes.join(', ')}`,
      insertados, actualizados, ignorados, errores, lote, sucursal, hojas: hojasUsadas,
    });
  } catch (error) {
    console.error('Error uploadExcelSucursal:', error);
    if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch (e) {}
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST: Crear compra manual ────────────────────────────────────────────────
exports.crearCompra = async (req, res) => {
  try {
    const { proveedor, fecha_compra, monto_neto, plazo_dias, tipo_proveedor, sucursal, numero_orden } = req.body;

    if (!proveedor || !fecha_compra || !monto_neto) {
      return res.status(400).json({ success: false, message: 'Proveedor, fecha y monto son requeridos' });
    }

    const fechaCompra = new Date(fecha_compra);
    const plazo = parseInt(plazo_dias) || 30;
    const fechaVenc = new Date(fechaCompra);
    fechaVenc.setDate(fechaVenc.getDate() + plazo);
    const neto = parseFloat(monto_neto);
    const iva = neto * 1.19;
    const semanaCompra = getWeekNumber(fechaCompra);
    const semanaVenc = getWeekNumber(fechaVenc);
    const año = fechaCompra.getFullYear();

    const pool = await poolPromise;
    await asegurarTablas(pool);

    const result = await pool.request()
      .input('proveedor', sql.NVarChar, proveedor.trim())
      .input('fecha_compra', sql.Date, formatDate(fechaCompra))
      .input('semana_compra', sql.Int, semanaCompra)
      .input('año', sql.Int, año)
      .input('mes', sql.NVarChar, getMesNombre(fechaCompra))
      .input('numero_orden', sql.NVarChar, numero_orden || '')
      .input('monto_neto', sql.Decimal(18,2), neto)
      .input('monto_con_iva', sql.Decimal(18,2), iva)
      .input('plazo_dias', sql.Int, plazo)
      .input('fecha_vencimiento', sql.Date, formatDate(fechaVenc))
      .input('semana_vencimiento', sql.Int, semanaVenc)
      .input('tipo_proveedor', sql.NVarChar, tipo_proveedor || 'No Encadenado')
      .input('sucursal', sql.NVarChar, sucursal || '')
      .input('fuente', sql.NVarChar, 'MANUAL')
      .query(`
        INSERT INTO panificacion_compras
          (proveedor, fecha_compra, semana_compra, año, mes, numero_orden,
           monto_neto, monto_con_iva, plazo_dias, fecha_vencimiento,
           semana_vencimiento, tipo_proveedor, sucursal, fuente)
        VALUES
          (@proveedor, @fecha_compra, @semana_compra, @año, @mes, @numero_orden,
           @monto_neto, @monto_con_iva, @plazo_dias, @fecha_vencimiento,
           @semana_vencimiento, @tipo_proveedor, @sucursal, @fuente);
        SELECT SCOPE_IDENTITY() AS id;
      `);

    res.status(201).json({ success: true, id: result.recordset[0].id, message: 'Compra registrada correctamente' });
  } catch (error) {
    console.error('Error crearCompra:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE: Eliminar compra ──────────────────────────────────────────────────
exports.eliminarCompra = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('DELETE FROM panificacion_compras WHERE id = @id');
    res.json({ success: true, message: 'Compra eliminada' });
  } catch (error) {
    console.error('Error eliminarCompra:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUT: Actualizar límite semanal ───────────────────────────────────────────
exports.actualizarLimite = async (req, res) => {
  try {
    const { semana, numero_semana, año, limite, limite_semanal } = req.body;
    const pool = await poolPromise;
    await asegurarTablas(pool);

    await pool.request()
      .input('semana', sql.Int, parseInt(semana || numero_semana))
      .input('año', sql.Int, parseInt(año))
      .input('limite', sql.Decimal(18,2), parseFloat(limite || limite_semanal))
      .query(`
        MERGE panificacion_config_semanal AS target
        USING (SELECT @semana AS numero_semana, @año AS año) AS source
          ON target.numero_semana = source.numero_semana AND target.año = source.año
        WHEN MATCHED THEN UPDATE SET limite_semanal = @limite
        WHEN NOT MATCHED THEN INSERT (numero_semana, año, limite_semanal) VALUES (@semana, @año, @limite);
      `);

    res.json({ success: true, message: 'Límite actualizado' });
  } catch (error) {
    console.error('Error actualizarLimite:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET: Proveedores únicos (para filtros) ───────────────────────────────────
exports.getProveedores = async (req, res) => {
  try {
    const pool = await poolPromise;
    await asegurarTablas(pool);
    const result = await pool.request().query(
      'SELECT DISTINCT proveedor FROM panificacion_compras ORDER BY proveedor'
    );
    res.json({ success: true, proveedores: result.recordset.map(r => r.proveedor) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET: Sucursales únicas (para filtros) ────────────────────────────────────
exports.getSucursalesPanificacion = async (req, res) => {
  try {
    const pool = await poolPromise;
    await asegurarTablas(pool);
    const result = await pool.request().query(
      "SELECT DISTINCT sucursal FROM panificacion_compras WHERE sucursal IS NOT NULL AND sucursal <> '' ORDER BY sucursal"
    );
    res.json({ success: true, sucursales: result.recordset.map(r => r.sucursal) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET: Resumen anual ────────────────────────────────────────────────────────
exports.getResumenAnual = async (req, res) => {
  try {
    const año = parseInt(req.query.año) || new Date().getFullYear();
    const pool = await poolPromise;
    await asegurarTablas(pool);

    // Total comprometido por semana
    const r = await pool.request()
      .input('año', sql.Int, año)
      .query(`
        SELECT
          semana_vencimiento                                             AS semana,
          SUM(monto_con_iva)                                             AS total,
          SUM(CASE WHEN tipo_proveedor='Encadenado'    THEN monto_con_iva ELSE 0 END) AS encadenados,
          SUM(CASE WHEN tipo_proveedor='No Encadenado' THEN monto_con_iva ELSE 0 END) AS no_encadenados,
          COUNT(*)                                                       AS num_registros
        FROM panificacion_compras
        WHERE (
          (tipo_proveedor = 'Encadenado'    AND CASE WHEN MONTH(fecha_vencimiento) = 12 AND DATEPART(ISO_WEEK, fecha_vencimiento) = 1 THEN YEAR(fecha_vencimiento) + 1 ELSE YEAR(fecha_vencimiento) END = @año)
          OR
          (tipo_proveedor = 'No Encadenado' AND año = @año)
        )
        GROUP BY semana_vencimiento
      `);

    const totales = r.recordset;
    const totalAnual   = totales.reduce((s, x) => s + (parseFloat(x.total) || 0), 0);
    const totalEnc     = totales.reduce((s, x) => s + (parseFloat(x.encadenados) || 0), 0);
    const totalNenc    = totales.reduce((s, x) => s + (parseFloat(x.no_encadenados) || 0), 0);
    const semanasConDatos = totales.length;

    // Contar semanas con alerta/excedido usando límites
    const cfg = await pool.request()
      .input('año', sql.Int, año)
      .query('SELECT numero_semana, limite_semanal FROM panificacion_config_semanal WHERE año = @año');
    const limMap = {};
    cfg.recordset.forEach(c => { limMap[c.numero_semana] = parseFloat(c.limite_semanal); });

    let semanasOk = 0, semanasAlerta = 0, semanasExcedido = 0;
    totales.forEach(t => {
      const lim = limMap[t.semana] || (t.semana <= 18 ? 120000000 : 100000000);
      const pct = parseFloat(t.total) / lim;
      if      (pct > 1)    semanasExcedido++;
      else if (pct >= 0.8) semanasAlerta++;
      else                 semanasOk++;
    });

    res.json({
      success: true, año,
      totalAnual, totalEnc, totalNenc,
      semanasConDatos, semanasOk, semanasAlerta, semanasExcedido,
      porSemana: totales,
    });
  } catch (error) {
    console.error('Error getResumenAnual:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET: Compras generadas por semana de EMISIÓN ─────────────────────────────
exports.getComprasPorEmision = async (req, res) => {
  try {
    const año = parseInt(req.query.año) || new Date().getFullYear();
    const pool = await poolPromise;
    await asegurarTablas(pool);

    const pagosResult = await pool.request()
      .input('año', sql.Int, año)
      .query(`
        WITH dedup AS (
          SELECT *,
            ROW_NUMBER() OVER (
              PARTITION BY
                CASE
                  WHEN tipo_proveedor = 'Encadenado' AND LEN(ISNULL(numero_orden,'')) > 0
                    THEN CAST(año AS NVARCHAR(10)) + '_ENC_'
                         + ISNULL(CAST(numero_orden AS NVARCHAR(50)),'')
                         + '_PL' + ISNULL(CAST(plazo_dias AS NVARCHAR(10)),'X')
                  WHEN tipo_proveedor = 'Encadenado'
                    THEN CAST(id AS NVARCHAR(20))
                  WHEN tipo_proveedor = 'No Encadenado' AND LEN(ISNULL(numero_orden,'')) > 0
                    THEN CAST(año AS NVARCHAR(10)) + '_NENC_' + ISNULL(CAST(numero_orden AS NVARCHAR(50)),'') + '_' + ISNULL(sucursal,'')
                  ELSE
                    CAST(id AS NVARCHAR(20))
                END
              ORDER BY CASE WHEN fuente = 'FACTURA' THEN 0 ELSE 1 END, id DESC
            ) AS _rn
          FROM panificacion_compras
          WHERE año = @año AND ISNULL(es_madre, 0) = 0
        )
        SELECT semana_compra,
               SUM(CASE WHEN tipo_proveedor='Encadenado'    AND fuente='EXCEL'
                             AND ISNULL(estado_pago,'Pendiente') NOT IN ('Cancelado','Facturado')
                        THEN monto_con_iva ELSE 0 END) AS enc_oc,
               SUM(CASE WHEN tipo_proveedor='Encadenado'    AND fuente='FACTURA' THEN monto_con_iva ELSE 0 END) AS enc_fact,
               SUM(CASE WHEN tipo_proveedor='No Encadenado'                      THEN monto_con_iva ELSE 0 END) AS no_enc,
               SUM(CASE WHEN ISNULL(estado_pago,'Pendiente') NOT IN ('Cancelado','Facturado')
                             OR fuente IN ('FACTURA','REMANENTE')
                        THEN monto_con_iva ELSE 0 END) AS total,
               COUNT(DISTINCT CASE WHEN tipo_proveedor='Encadenado'
                                        AND ISNULL(estado_pago,'Pendiente') NOT IN ('Cancelado','Facturado')
                                   THEN ISNULL(numero_orden, CAST(id AS NVARCHAR)) END) AS num_ordenes
        FROM dedup
        WHERE _rn = 1 AND semana_compra IS NOT NULL AND semana_compra > 0
        GROUP BY semana_compra
        ORDER BY semana_compra
      `);

    const pagosMap = {};
    pagosResult.recordset.forEach(r => { pagosMap[r.semana_compra] = r; });

    const semanas = [];
    for (let s = 1; s <= 52; s++) {
      const p = pagosMap[s] || {};
      const encOC    = parseFloat(p.enc_oc)   || 0;
      const encFact  = parseFloat(p.enc_fact)  || 0;
      const noEnc    = parseFloat(p.no_enc)    || 0;
      const totalEnc = encOC + encFact;
      const total    = totalEnc + noEnc;
      const { fechaInicio, fechaFin } = getWeekDateRange(s, año);
      semanas.push({
        numero_semana: s,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        enc_oc: encOC,
        enc_fact: encFact,
        total_enc: totalEnc,
        no_enc: noEnc,
        total,
        num_ordenes: parseInt(p.num_ordenes) || 0,
      });
    }

    // Fechas de última carga para mostrar en UI
    const ultimasCargasRes = await pool.request().query(`
      SELECT fuente, MAX(fecha_carga) AS ultima
      FROM panificacion_compras
      WHERE fuente IN ('EXCEL','ERP','FACTURA','REMANENTE')
      GROUP BY fuente
    `);
    const ultimasCargas = {};
    ultimasCargasRes.recordset.forEach(r => { ultimasCargas[r.fuente] = r.ultima; });

    res.json({ success: true, año, semanas, ultimasCargas });
  } catch (error) {
    console.error('Error getComprasPorEmision:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUT: Marcar/desmarcar compra como "compra madre" ─────────────────────────
exports.marcarCompraMadre = async (req, res) => {
  try {
    const { id } = req.params;
    const { es_madre } = req.body;
    const pool = await poolPromise;

    if (es_madre) {
      // Obtener la fila clickeada para ver si tiene numero_orden
      const rowQ = await pool.request()
        .input('id', sql.Int, parseInt(id))
        .query('SELECT numero_orden, tipo_proveedor FROM panificacion_compras WHERE id = @id');
      const row = rowQ.recordset[0];
      const numeroOrden = row?.numero_orden;

      if (numeroOrden) {
        // Marcar solo OC original + REMANENTE (no las FACTURA individuales)
        await pool.request()
          .input('oc', sql.NVarChar, String(numeroOrden))
          .query(`UPDATE panificacion_compras SET es_madre = 1 WHERE numero_orden = @oc AND fuente NOT IN ('FACTURA')`);

        return res.json({ success: true, id_original: parseInt(id) });
      }
    } else {
      // Desmarcar: obtener numero_orden y desmarcar todo el grupo
      const rowQ = await pool.request()
        .input('id', sql.Int, parseInt(id))
        .query('SELECT numero_orden FROM panificacion_compras WHERE id = @id');
      const numeroOrden = rowQ.recordset[0]?.numero_orden;

      if (numeroOrden) {
        await pool.request()
          .input('oc', sql.NVarChar, String(numeroOrden))
          .query(`UPDATE panificacion_compras SET es_madre = 0 WHERE numero_orden = @oc`);
        return res.json({ success: true });
      }
    }

    // Sin numero_orden: operar sobre el id exacto
    await pool.request()
      .input('id',       sql.Int, parseInt(id))
      .input('es_madre', sql.Bit, es_madre ? 1 : 0)
      .query('UPDATE panificacion_compras SET es_madre = @es_madre WHERE id = @id');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/// ─── GET: Relación Orden→Factura→Remanente por año ────────────────────────────
exports.getOrdenFactura = async (req, res) => {
  try {
    const año = parseInt(req.query.año) || new Date().getFullYear();
    const pool = await poolPromise;
    await asegurarTablas(pool);
    const result = await pool.request()
      .input('año', sql.Int, año)
      .query(`
        SELECT
          id, proveedor, numero_orden,
          CONVERT(VARCHAR(10), fecha_compra,      120) AS fecha_compra,
          CONVERT(VARCHAR(10), fecha_vencimiento, 120) AS fecha_vencimiento,
          semana_compra, semana_vencimiento, año,
          monto_neto, monto_con_iva, plazo_dias,
          tipo_proveedor, sucursal, fuente,
          ISNULL(estado_pago, 'Pendiente') AS estado_pago,
          ISNULL(es_madre, 0)              AS es_madre,
          lote_carga, numero_factura
        FROM panificacion_compras
        WHERE año = @año
          AND tipo_proveedor = 'Encadenado'
          AND LEN(ISNULL(numero_orden, '')) > 0
        ORDER BY numero_orden ASC,
          CASE fuente
            WHEN 'EXCEL'    THEN 0
            WHEN 'MANUAL'   THEN 0
            WHEN 'ERP'      THEN 0
            WHEN 'FACTURA'  THEN 1
            WHEN 'REMANENTE' THEN 2
            ELSE 3
          END,
          id ASC
      `);
    res.json({ success: true, año, registros: result.recordset });
  } catch (error) {
    console.error('Error getOrdenFactura:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET: Órdenes marcadas como "madre" (excluidas del resumen) ───────────────
exports.getOrdenesMadre = async (req, res) => {
  try {
    const pool = await poolPromise;
    await asegurarTablas(pool);
    const result = await pool.request().query(`
      WITH ranked AS (
        SELECT *,
          ROW_NUMBER() OVER (
            PARTITION BY ISNULL(numero_orden, CAST(id AS NVARCHAR(20)))
            ORDER BY monto_con_iva DESC, id ASC
          ) AS _rn
        FROM panificacion_compras
        WHERE ISNULL(es_madre, 0) = 1
          AND fuente NOT IN ('REMANENTE', 'FACTURA')
      )
      SELECT id, proveedor,
             CONVERT(VARCHAR(10), fecha_compra,      120) AS fecha_compra,
             CONVERT(VARCHAR(10), fecha_vencimiento, 120) AS fecha_vencimiento,
             semana_compra, semana_vencimiento, año, mes,
             numero_orden, monto_neto, monto_con_iva,
             plazo_dias, tipo_proveedor, sucursal, fuente,
             ISNULL(estado_pago, 'Pendiente') AS estado_pago,
             lote_carga, fecha_carga
      FROM ranked
      WHERE _rn = 1
      ORDER BY fecha_compra DESC, id DESC
    `);
    res.json({ success: true, total: result.recordset.length, registros: result.recordset });
  } catch (error) {
    console.error('Error getOrdenesMadre:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET: Detalle individual por fecha de emisión (para árbol Año→Semana→Día) ─
exports.getDetalleComprasPorEmision = async (req, res) => {
  try {
    const año = parseInt(req.query.año) || new Date().getFullYear();
    console.log(`[Planificacion] getDetalleComprasPorEmision año=${año}`);
    const pool = await poolPromise;
    await asegurarTablas(pool);

    const result = await pool.request()
      .input('año', sql.Int, año)
      .query(`
        WITH dedup AS (
          SELECT *,
            ROW_NUMBER() OVER (
              PARTITION BY
                CASE
                  WHEN tipo_proveedor = 'Encadenado' AND LEN(ISNULL(numero_orden,'')) > 0
                    THEN CAST(año AS NVARCHAR(10)) + '_ENC_'
                         + ISNULL(CAST(numero_orden AS NVARCHAR(50)),'')
                         + '_PL' + ISNULL(CAST(plazo_dias AS NVARCHAR(10)),'X')
                  WHEN tipo_proveedor = 'Encadenado'
                    THEN CAST(id AS NVARCHAR(20))
                  WHEN tipo_proveedor = 'No Encadenado' AND LEN(ISNULL(numero_orden,'')) > 0
                    THEN CAST(año AS NVARCHAR(10)) + '_NENC_' + ISNULL(CAST(numero_orden AS NVARCHAR(50)),'') + '_' + ISNULL(sucursal,'')
                  ELSE
                    CAST(id AS NVARCHAR(20))
                END
              ORDER BY CASE fuente
                WHEN 'EXCEL'     THEN 0
                WHEN 'ERP'       THEN 1
                WHEN 'MANUAL'    THEN 2
                WHEN 'FACTURA'   THEN 3
                WHEN 'REMANENTE' THEN 4
                ELSE 5
              END, id ASC
            ) AS _rn
          FROM panificacion_compras
          WHERE año = @año
        )
        SELECT id, proveedor,
               CONVERT(VARCHAR(10), fecha_compra, 120) AS fecha_compra,
               semana_compra, numero_orden,
               monto_neto, monto_con_iva, tipo_proveedor,
               sucursal, fuente, estado_pago,
               ISNULL(es_madre, 0) AS es_madre
        FROM dedup
        WHERE _rn = 1 AND semana_compra IS NOT NULL AND semana_compra > 0
        ORDER BY fecha_compra ASC, id ASC
      `);

    console.log(`[Planificacion] getDetalleComprasPorEmision → ${result.recordset.length} registros`);
    res.json({ success: true, año, registros: result.recordset });
  } catch (error) {
    console.error('Error getDetalleComprasPorEmision:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Query ERP No Encadenados (reutilizable) ─────────────────────────────────
const queryNoEncadenadosERP = async (pool, fechaInicio, fechaFin) => {
  const result = await pool.request()
    .input('fechaInicio', sql.DateTime, new Date(fechaInicio + 'T00:00:00'))
    .input('fechaFin',    sql.DateTime, new Date(fechaFin    + 'T23:59:00'))
    .query(`
      WITH PlazosPorCondicion AS (
        SELECT
          CP_ID_CONDICION_PAGO,
          COUNT(*) AS CantidadPlazos
        FROM ERP_PLAZOS_CONDICIONES
        GROUP BY CP_ID_CONDICION_PAGO
      )
      SELECT OC, Proveedor, Neto, Iva, Total, FechaCreacion, FechaRecepcion, Plazo, FechaPago
      FROM (
        SELECT
          roc.ROC_NUMERO_ORDEN AS OC,
          (SELECT TOP 1 MP.MPR_RAZON_SOCIAL
           FROM ERP_MAESTRO_PROVEEDORES MP
           WHERE MP.MPR_RUT_PROVEEDOR = rig.MPR_RUT_PROVEEDOR) AS Proveedor,
          ROUND(rig.BIGP_AFECTO / CAST(ppc.CantidadPlazos AS FLOAT), 0) AS Neto,
          ROUND(rig.BIGP_IVA   / CAST(ppc.CantidadPlazos AS FLOAT), 0) AS Iva,
          ROUND(rig.BIGP_TOTAL / CAST(ppc.CantidadPlazos AS FLOAT), 0) AS Total,
          roc.ROC_FECHA_INGRESO                                          AS FechaCreacion,
          rig.BIGP_FECHA_HORA_RECEPCION_BODEGA                          AS FechaRecepcion,
          co.PCOD_PLAZO                                                  AS Plazo,
          DATEADD(DAY, co.PCOD_PLAZO, roc.ROC_FECHA_INGRESO) AS FechaPago
        FROM ERP_BOD_RES_INGRESO_GUIAS rig
        JOIN ERP_OP_RES_ORDEN_COMPRA roc         ON rig.ROC_NUMERO_ORDEN = roc.ROC_NUMERO_ORDEN
        JOIN ERP_BOD_ESTADO_INGRESO_EGRESO eie   ON eie.BEINGE_ID_ESTADO_INGRESO_EGRESO = rig.BEINGE_ID_ESTADO_INGRESO_EGRESO
        JOIN ERP_USUARIOS_SISTEMAS us            ON us.US_ID_USUARIO_SISTEMA = rig.US_ID_USUARIO_SISTEMA
        JOIN ERP_TIPO_PROVEEDOR TPR               ON TPR.TPROV_ID_TIPO_PROVEEDOR = rig.TPROV_ID_TIPO_PROVEEDOR
        JOIN ERP_CONDICIONES_PAGO CON             ON CON.CP_ID_CONDICION_PAGO = ROC.CP_ID_CONDICION_PAGO
        JOIN ERP_OP_PROCEDENCIA_ORDEN PRO         ON PRO.OPOR_ID_PROCEDENCIA_ORDEN = ROC.OPOR_ID_PROCEDENCIA_ORDEN
        JOIN ERP_PLAZOS_CONDICIONES co            ON co.CP_ID_CONDICION_PAGO = CON.CP_ID_CONDICION_PAGO
        JOIN PlazosPorCondicion ppc               ON ppc.CP_ID_CONDICION_PAGO = CON.CP_ID_CONDICION_PAGO
        WHERE
          eie.BEINGE_DESCRIPCION_ESTADO = 'VIGENTE'
          AND TPR.TPROV_DESCRIPCION_TIPO_PROV LIKE '%NO%'
      ) t
      WHERE FechaPago BETWEEN @fechaInicio AND @fechaFin
    `);
  return result.recordset;
};

// ─── GET: Preview No Encadenados desde ERP (sin guardar) ──────────────────────
exports.getNoEncadenadosERP = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    if (!fechaInicio || !fechaFin)
      return res.status(400).json({ success: false, message: 'Se requiere fechaInicio y fechaFin (YYYY-MM-DD)' });

    const sucursales = await obtenerSucursalesERP();
    const todas = [];
    for (const suc of sucursales) {
      try {
        const sucPool = await getPoolSucursal(suc);
        const filas = await queryNoEncadenadosERP(sucPool, fechaInicio, fechaFin);
        filas.forEach(f => todas.push({ ...f, Sucursal: suc.nombre }));
      } catch {}
    }
    res.json({ success: true, total: todas.length, datos: todas });
  } catch (error) {
    console.error('Error getNoEncadenadosERP:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Lógica central de carga ERP (reutilizable por cargar y recargar) ─────────
const _cargarSucursalesERP = async ({ sucursalesACargar, fechaInicio, fechaFin, semana, lote, pool }) => {
  let insertados = 0, errores = 0, totalErp = 0;
  const cargadas = [];
  const fallidas = [];

  for (const suc of sucursalesACargar) {
    try {
      const sucPool = await getPoolSucursal(suc);
      const filas = await queryNoEncadenadosERP(sucPool, fechaInicio, fechaFin);
      totalErp += filas.length;
      let ins = 0, err = 0;

      // Cada fila es un plazo distinto (monto ya dividido en SQL) → insertar directamente sin agrupar
      console.log(`   [cargarNEnc] ${suc.nombre}: ${filas.length} filas ERP (cuotas)`);

      for (const fila of filas) {
        try {
          const fechaCompra = fila.FechaCreacion ? new Date(fila.FechaCreacion) : null;
          const plazo       = parseInt(fila.Plazo) || 0;
          if (!fechaCompra) continue;
          const fechaPago   = new Date(fechaCompra);
          fechaPago.setDate(fechaPago.getDate() + plazo);

          const semanaCompra = getWeekNumber(fechaCompra);
          const semanaVenc   = getWeekNumber(fechaPago);
          const añoCompra    = fechaPago.getFullYear();

          // UPSERT: actualiza si ya existe la misma OC+sucursal+plazo, inserta si no
          await pool.request()
            .input('proveedor',          sql.NVarChar,      String(fila.Proveedor || '').trim())
            .input('fecha_compra',       sql.Date,          formatDate(fechaCompra))
            .input('semana_compra',      sql.Int,           semanaCompra)
            .input('año',                sql.Int,           añoCompra)
            .input('mes',                sql.NVarChar,      getMesNombre(fechaCompra))
            .input('numero_orden',       sql.NVarChar,      String(fila.OC || ''))
            .input('monto_neto',         sql.Decimal(18,2), parseFloat(fila.Neto)  || 0)
            .input('monto_con_iva',      sql.Decimal(18,2), parseFloat(fila.Total) || 0)
            .input('plazo_dias',         sql.Int,           plazo)
            .input('fecha_vencimiento',  sql.Date,          formatDate(fechaPago))
            .input('semana_vencimiento', sql.Int,           semanaVenc)
            .input('sucursal',           sql.NVarChar,      suc.nombre || '')
            .input('lote',               sql.NVarChar,      lote)
            .query(`
              MERGE panificacion_compras AS t
              USING (SELECT
                @numero_orden      AS numero_orden,
                @sucursal          AS sucursal,
                @plazo_dias        AS plazo_dias,
                @fecha_vencimiento AS fecha_vencimiento,
                @monto_con_iva     AS monto_con_iva
              ) AS s
              ON  t.tipo_proveedor    = 'No Encadenado'
              AND t.fuente            = 'ERP'
              AND t.sucursal          = s.sucursal
              AND t.fecha_vencimiento = s.fecha_vencimiento
              AND t.monto_con_iva     = s.monto_con_iva
              AND (
                (LEN(s.numero_orden) > 0 AND t.numero_orden = s.numero_orden)
                OR
                (LEN(s.numero_orden) = 0 AND t.proveedor = @proveedor AND t.plazo_dias = s.plazo_dias)
              )
              WHEN MATCHED AND ISNULL(t.es_madre, 0) = 0 THEN UPDATE SET
                proveedor          = @proveedor,
                fecha_compra       = @fecha_compra,
                semana_compra      = @semana_compra,
                año                = @año,
                mes                = @mes,
                monto_neto         = @monto_neto,
                monto_con_iva      = @monto_con_iva,
                fecha_vencimiento  = @fecha_vencimiento,
                semana_vencimiento = @semana_vencimiento,
                lote_carga         = @lote,
                fecha_carga        = GETDATE()
              WHEN NOT MATCHED THEN INSERT
                (proveedor, fecha_compra, semana_compra, año, mes, numero_orden,
                 monto_neto, monto_con_iva, plazo_dias, fecha_vencimiento,
                 semana_vencimiento, tipo_proveedor, sucursal, fuente, lote_carga)
              VALUES
                (@proveedor, @fecha_compra, @semana_compra, @año, @mes, @numero_orden,
                 @monto_neto, @monto_con_iva, @plazo_dias, @fecha_vencimiento,
                 @semana_vencimiento, 'No Encadenado', @sucursal, 'ERP', @lote);
            `);
          ins++; insertados++;
        } catch (e) { err++; errores++; }
      }
      cargadas.push({ id: suc.id, sucursal: suc.nombre, total: filas.length, insertados: ins, errores: err });
    } catch (sucError) {
      console.log(`[Planificacion] ${suc.nombre} sin ERP: ${sucError.message}`);
      fallidas.push({ id: suc.id, sucursal: suc.nombre, error: sucError.message });
    }
  }

  return { insertados, errores, totalErp, cargadas, fallidas };
};

// ─── POST: Cargar No Encadenados desde ERP (SSE — progreso en tiempo real) ────
exports.cargarNoEncadenadosERP = async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const emit = (tipo, data) => res.write(`data: ${JSON.stringify({ tipo, ...data })}\n\n`);

  try {
    let { fechaInicio, fechaFin, semana, año } = req.body;

    if (semana && año) {
      const payRange    = getWeekDateRange(parseInt(semana), parseInt(año));
      const inicio      = new Date(payRange.fechaInicio);
      inicio.setDate(inicio.getDate() - 150);
      fechaInicio = inicio.toISOString().split('T')[0];
      // Extender hasta fin de año para capturar OCs con plazos largos que vencen en semanas futuras
      fechaFin    = getWeekDateRange(52, parseInt(año)).fechaFin;
    }

    if (!fechaInicio || !fechaFin) {
      emit('error', { msg: 'Se requiere semana/año o fechaInicio y fechaFin' });
      return res.end();
    }

    const pool = await poolPromise;
    await asegurarTablas(pool);

    const todasSucursales = await obtenerSucursalesERP();
    const lote = `ERP_${Date.now()}`;
    emit('log', { msg: `Iniciando sincronización ERP — ${todasSucursales.length} sucursales` });

    let totalInsertados = 0, totalErrores = 0;
    const cargadas = [], fallidas = [];

    for (const suc of todasSucursales) {
      emit('sucursal_inicio', { sucursal: suc.nombre });
      try {
        const sucPool = await getPoolSucursal(suc);
        const filas   = await queryNoEncadenadosERP(sucPool, fechaInicio, fechaFin);
        emit('log', { msg: `${suc.nombre}: ${filas.length} registros encontrados en ERP` });

        let ins = 0, err = 0;
        for (const fila of filas) {
          try {
            const fechaCompra = fila.FechaCreacion ? new Date(fila.FechaCreacion) : null;
            const plazo       = parseInt(fila.Plazo) || 0;
            if (!fechaCompra) continue;
            const fechaPago   = new Date(fechaCompra);
            fechaPago.setDate(fechaPago.getDate() + plazo);

            const semanaCompra = getWeekNumber(fechaCompra);
            const semanaVenc   = getWeekNumber(fechaPago);
            const añoCompra    = fechaPago.getFullYear();

            await pool.request()
              .input('proveedor',          sql.NVarChar,      String(fila.Proveedor || '').trim())
              .input('fecha_compra',       sql.Date,          formatDate(fechaCompra))
              .input('semana_compra',      sql.Int,           semanaCompra)
              .input('año',                sql.Int,           añoCompra)
              .input('mes',                sql.NVarChar,      getMesNombre(fechaCompra))
              .input('numero_orden',       sql.NVarChar,      String(fila.OC || ''))
              .input('monto_neto',         sql.Decimal(18,2), parseFloat(fila.Neto)  || 0)
              .input('monto_con_iva',      sql.Decimal(18,2), parseFloat(fila.Total) || 0)
              .input('plazo_dias',         sql.Int,           plazo)
              .input('fecha_vencimiento',  sql.Date,          formatDate(fechaPago))
              .input('semana_vencimiento', sql.Int,           semanaVenc)
              .input('sucursal',           sql.NVarChar,      suc.nombre || '')
              .input('lote',               sql.NVarChar,      lote)
              .query(`
                MERGE panificacion_compras AS t
                USING (SELECT @numero_orden AS numero_orden, @sucursal AS sucursal, @plazo_dias AS plazo_dias, @fecha_vencimiento AS fecha_vencimiento, @monto_con_iva AS monto_con_iva) AS s
                ON  t.tipo_proveedor    = 'No Encadenado'
                AND t.fuente            = 'ERP'
                AND t.sucursal          = s.sucursal
                AND t.fecha_vencimiento = s.fecha_vencimiento
                AND t.monto_con_iva     = s.monto_con_iva
                AND (
                  (LEN(s.numero_orden) > 0 AND t.numero_orden = s.numero_orden)
                  OR
                  (LEN(s.numero_orden) = 0 AND t.proveedor = @proveedor AND t.plazo_dias = s.plazo_dias)
                )
                WHEN MATCHED AND ISNULL(t.es_madre, 0) = 0 THEN UPDATE SET
                  proveedor=@proveedor, fecha_compra=@fecha_compra, semana_compra=@semana_compra,
                  año=@año, mes=@mes, monto_neto=@monto_neto, monto_con_iva=@monto_con_iva,
                  fecha_vencimiento=@fecha_vencimiento, semana_vencimiento=@semana_vencimiento,
                  lote_carga=@lote, fecha_carga=GETDATE()
                WHEN NOT MATCHED THEN INSERT
                  (proveedor,fecha_compra,semana_compra,año,mes,numero_orden,monto_neto,monto_con_iva,
                   plazo_dias,fecha_vencimiento,semana_vencimiento,tipo_proveedor,sucursal,fuente,lote_carga)
                VALUES
                  (@proveedor,@fecha_compra,@semana_compra,@año,@mes,@numero_orden,@monto_neto,@monto_con_iva,
                   @plazo_dias,@fecha_vencimiento,@semana_vencimiento,'No Encadenado',@sucursal,'ERP',@lote);
              `);
            ins++;
          } catch { err++; }
        }

        totalInsertados += ins; totalErrores += err;
        cargadas.push({ id: suc.id, sucursal: suc.nombre, total: filas.length, insertados: ins, errores: err });
        emit('sucursal_ok', { sucursal: suc.nombre, total: filas.length, insertados: ins, errores: err });
      } catch (sucError) {
        fallidas.push({ id: suc.id, sucursal: suc.nombre, error: sucError.message });
        emit('sucursal_error', { sucursal: suc.nombre, error: sucError.message });
      }
    }

    const todoOk = fallidas.length === 0;
    emit('fin', {
      success: true, completo: todoOk,
      insertados: totalInsertados, errores: totalErrores,
      sucursales_cargadas: cargadas, sucursales_fallidas: fallidas,
      message: todoOk
        ? `Semana ${semana || '?'}: ${totalInsertados} registros sincronizados en ${cargadas.length} sucursal(es)`
        : `${cargadas.length}/${todasSucursales.length} sucursales OK — fallaron: ${fallidas.map(f=>f.sucursal).join(', ')}`,
    });
  } catch (error) {
    console.error('Error cargarNoEncadenadosERP:', error);
    emit('error', { msg: error.message });
  } finally {
    res.end();
  }
};

// ─── POST: Recargar una sucursal específica ────────────────────────────────────
exports.recargarSucursalERP = async (req, res) => {
  try {
    let { sucursalId, semana, año } = req.body;
    if (!sucursalId || !semana || !año)
      return res.status(400).json({ success: false, message: 'Se requiere sucursalId, semana y año' });

    const payRange  = getWeekDateRange(parseInt(semana), parseInt(año));
    const inicio    = new Date(payRange.fechaInicio);
    inicio.setDate(inicio.getDate() - 150);
    const fechaInicio = inicio.toISOString().split('T')[0];
    // Extender hasta fin de año para capturar OCs con plazos largos que vencen en semanas futuras
    const fechaFin    = getWeekDateRange(52, parseInt(año)).fechaFin;

    const pool = await poolPromise;
    await asegurarTablas(pool);

    const todasSucursales = await obtenerSucursalesERP();
    const suc = todasSucursales.find(s => s.id == sucursalId);
    if (!suc)
      return res.status(404).json({ success: false, message: 'Sucursal no encontrada' });

    const lote = `ERP_${Date.now()}`;
    const { insertados, errores, cargadas, fallidas } =
      await _cargarSucursalesERP({ sucursalesACargar: [suc], fechaInicio, fechaFin, semana, lote, pool });

    res.json({
      success: fallidas.length === 0,
      sucursal: suc.nombre,
      insertados,
      errores,
      cargadas,
      fallidas,
      message: fallidas.length === 0
        ? `Sucursal ${suc.nombre} recargada: ${insertados} registros`
        : `Error al recargar ${suc.nombre}: ${fallidas[0]?.error}`,
    });
  } catch (error) {
    console.error('Error recargarSucursalERP:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUT: Guardar nota de semana ──────────────────────────────────────────────
exports.actualizarNota = async (req, res) => {
  try {
    const { semana, año, nota } = req.body;
    const pool = await poolPromise;
    await asegurarTablas(pool);
    await pool.request()
      .input('semana', sql.Int, parseInt(semana))
      .input('año',    sql.Int, parseInt(año))
      .input('nota',   sql.NVarChar, nota || '')
      .query(`
        MERGE panificacion_config_semanal AS target
        USING (SELECT @semana AS numero_semana, @año AS año) AS source
          ON target.numero_semana = source.numero_semana AND target.año = source.año
        WHEN MATCHED THEN UPDATE SET nota = @nota
        WHEN NOT MATCHED THEN INSERT (numero_semana, año, nota) VALUES (@semana, @año, @nota);
      `);
    res.json({ success: true, message: 'Nota guardada' });
  } catch (error) {
    console.error('Error actualizarNota:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET: Alertas de semanas próximas (para badge del menú) ───────────────────
exports.getAlertasSemanas = async (req, res) => {
  try {
    const año = new Date().getFullYear();
    const semanaActual = getWeekNumber(new Date());
    const pool = await poolPromise;
    await asegurarTablas(pool);

    const pagosResult = await pool.request()
      .input('año', sql.Int, año)
      .query(`
        SELECT semana_vencimiento,
               SUM(CASE WHEN tipo_proveedor = 'Encadenado' THEN monto_con_iva ELSE 0 END) AS encadenados
        FROM panificacion_compras
        WHERE (
          (tipo_proveedor = 'Encadenado'    AND CASE WHEN MONTH(fecha_vencimiento) = 12 AND DATEPART(ISO_WEEK, fecha_vencimiento) = 1 THEN YEAR(fecha_vencimiento) + 1 ELSE YEAR(fecha_vencimiento) END = @año)
          OR
          (tipo_proveedor = 'No Encadenado' AND año = @año)
        )
        GROUP BY semana_vencimiento
      `);

    const configResult = await pool.request()
      .input('año', sql.Int, año)
      .query('SELECT numero_semana, limite_semanal FROM panificacion_config_semanal WHERE año = @año');

    const configMap = {};
    configResult.recordset.forEach(r => { configMap[r.numero_semana] = parseFloat(r.limite_semanal); });

    let alertas = 0;
    pagosResult.recordset.forEach(r => {
      const s = r.semana_vencimiento;
      if (s < semanaActual || s > semanaActual + 8) return;
      const enc = parseFloat(r.encadenados) || 0;
      const limite = configMap[s] || (s <= 18 ? 120000000 : 100000000);
      if (enc / limite >= 0.8) alertas++;
    });

    res.json({ success: true, alertas });
  } catch (error) {
    console.error('Error getAlertasSemanas:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Helper: si la suma de todas las facturas de un numero_orden cubre la suma
//     de TODAS las cuotas EXCEL → marcar todas como Cancelado.
//     Si no alcanza, no toca nada (cada fila ya tiene su estado individual).
const _cascadaEstadoOC = async (pool, oc) => {
  if (!oc) return;
  const r = await pool.request()
    .input('oc', sql.NVarChar, oc)
    .query(`
      SELECT
        (SELECT ISNULL(SUM(monto_con_iva),0) FROM panificacion_compras
         WHERE numero_orden=@oc AND tipo_proveedor='Encadenado'
           AND fuente NOT IN ('FACTURA','REMANENTE') AND ISNULL(es_madre,0)=0) AS total_oc,
        (SELECT ISNULL(SUM(monto_con_iva),0) FROM panificacion_compras
         WHERE numero_orden=@oc AND tipo_proveedor='Encadenado'
           AND fuente='FACTURA') AS total_fact
    `);
  const totalOC   = parseFloat(r.recordset[0].total_oc)   || 0;
  const totalFact = parseFloat(r.recordset[0].total_fact) || 0;
  if (totalOC > 0 && totalFact >= totalOC) {
    // Cubierta completamente → todas las cuotas pasan a Cancelado
    await pool.request()
      .input('oc', sql.NVarChar, oc)
      .query(`
        UPDATE panificacion_compras SET estado_pago = 'Cancelado'
        WHERE numero_orden = @oc AND tipo_proveedor = 'Encadenado'
          AND fuente NOT IN ('FACTURA','REMANENTE')
          AND ISNULL(es_madre,0) = 0
          AND estado_pago != 'Cancelado'
      `);
  }
};

// ─── POST: Upload Facturas PBI (data PBI) ─────────────────────────────────────
exports.uploadFacturasPBI = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No se recibió archivo Excel' });

    const wb = XLSX.readFile(req.file.path);
    const pool = await poolPromise;
    await asegurarTablas(pool);

    // Buscar hoja "Export" o la primera disponible
    const sheetName = wb.SheetNames.includes('Export') ? 'Export' : wb.SheetNames[0];
    if (!sheetName) return res.status(400).json({ success: false, message: 'Excel sin hojas válidas' });

    const ws  = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (raw.length < 2) return res.status(400).json({ success: false, message: 'Excel sin datos' });

    const headers = raw[0].map(h => String(h).trim().toLowerCase().replace(/[°º\s]/g, '_').replace(/_+/g, '_'));
    const rows    = raw.slice(1).filter(r => r.some(c => c !== ''));

    // Mapeo de columnas del formato PBI (con variantes)
    const col = (terms) => headers.findIndex(h => terms.some(t => h.includes(t)));
    const iProveedor  = col(['mpr_razon', 'razon_social', 'proveedor', 'nombre_proveedor']);
    const iDocumento  = col(['documento', 'n_documento', 'factura', 'n_doc', 'ndoc']);
    const iFechaVenc  = col(['fecha_venc', 'fecha_v', 'vencimiento', 'vcto', 'fec_venc', 'f_venc']);
    const iOC         = col(['_oc', 'nro_oc', 'num_oc', 'n_oc', 'orden_compra', 'n_orden']);
    const iMonto      = col(['a_pagar', 'pagar', 'monto', 'total', 'importe', 'valor']);
    const iEstado     = col(['estado']);

    if (iProveedor === -1 || iFechaVenc === -1 || iMonto === -1) {
      try { fs.unlinkSync(req.file.path); } catch {}
      const encFaltantes = [
        iProveedor === -1 ? 'Proveedor (MPR_RAZON_SOCIAL)' : null,
        iFechaVenc === -1 ? 'Fecha Vencimiento (FECHA_VENC/VCTO)' : null,
        iMonto     === -1 ? 'Monto (A_PAGAR/TOTAL/MONTO)' : null,
      ].filter(Boolean);
      const headersMostrados = headers.slice(0, 20).join(', ');
      console.log('[PBI] Columnas detectadas:', headers);
      return res.status(400).json({
        success: false,
        message: `Formato no reconocido. Faltan columnas: ${encFaltantes.join('; ')}. Columnas encontradas: ${headersMostrados}`
      });
    }

    const lote = `FACTURA_${Date.now()}`;
    let actualizados = 0, insertados = 0, ignorados = 0, errores = 0;
    const hoy = formatDate(new Date());

    // Eliminar TODAS las cargas PBI anteriores antes de insertar la nueva.
    // Cada carga PBI es una foto completa del estado actual — no se acumulan.
    await pool.request().query(`
      DELETE FROM panificacion_compras
      WHERE fuente = 'FACTURA'
        AND ISNULL(es_madre, 0) = 0
        AND (lote_carga LIKE 'FACTURA_%' OR lote_carga IS NOT NULL)
    `);
    // Limpiar también REMANENTE generados por el sistema en cargas anteriores
    // (los que tienen id_oc_ref apuntando a una fila EXCEL — se recalculan en esta carga).
    await pool.request().query(`
      DELETE FROM panificacion_compras
      WHERE fuente = 'REMANENTE'
        AND ISNULL(es_madre, 0) = 0
        AND id_oc_ref IS NOT NULL
        AND (lote_carga LIKE 'FACTURA_%' OR lote_carga IS NOT NULL)
    `);
    console.log('[PBI] Cargas anteriores eliminadas — reemplazando con datos frescos');

    for (const row of rows) {
      try {
        const proveedor   = String(row[iProveedor] || '').trim();
        if (!proveedor || proveedor.toLowerCase() === 'proveedor') continue;

        // Procesar todos los estados de factura PBI (ignorar solo subtotales y filas vacías)
        // Estados válidos: "A Pagar", "Aprox Pago Siguiente", "Aprox Pago Sub-Siguiente", "Pagos Futuros", "Modificado"
        const estadoFila = String(row[iEstado] || '').trim().toLowerCase();
        const ESTADOS_VALIDOS = new Set(['a pagar', 'modificado', 'pagos futuros', 'aprox pago siguiente', 'aprox pago sub-siguiente']);
        if (estadoFila && !ESTADOS_VALIDOS.has(estadoFila)) {
          ignorados++;
          continue;
        }

        // Fecha vencimiento real (serial Excel o string)
        const fechaVencRaw = row[iFechaVenc];
        const fechaVenc    = parseFecha(fechaVencRaw);
        if (!fechaVenc) { ignorados++; continue; }

        // A PAGAR del PBI ya incluye IVA; el neto se obtiene dividiendo por 1.19
        const montoConIva  = parseFloat(row[iMonto]) || 0;
        if (montoConIva <= 0) { ignorados++; continue; }
        const montoNeto    = Math.round(montoConIva / 1.19);

        const oc           = iOC !== -1 ? String(row[iOC] || '').trim() : '';
        const numDoc       = iDocumento !== -1 ? String(row[iDocumento] || '').trim() : '';
        const estado       = iEstado !== -1 ? String(row[iEstado] || '').trim() : '';

        const semanaVenc   = getWeekNumber(fechaVenc);
        const año          = fechaVenc.getFullYear();

        const hoyDate  = new Date();

        // Si estado es "Modificado": borrar toda la OC y reinsertar desde cero
        if (estado && estado.toLowerCase() === 'modificado' && oc) {
          // Rescatar plazo original antes de borrar (viene de la OC, ej. 30/60/90/120d)
          const existingMod = await pool.request()
            .input('oc', sql.NVarChar, oc)
            .query(`SELECT TOP 1 plazo_dias, fecha_compra FROM panificacion_compras WHERE numero_orden = @oc ORDER BY id`);
          const plazoOriginal   = existingMod.recordset.length > 0 ? existingMod.recordset[0].plazo_dias : null;
          const fechaCompraOrig = existingMod.recordset.length > 0 ? existingMod.recordset[0].fecha_compra : null;
          await pool.request()
            .input('oc', sql.NVarChar, oc)
            .query(`DELETE FROM panificacion_compras WHERE numero_orden = @oc AND fuente != 'REMANENTE'`);
          // Usar plazo original de la OC; si no existía, calcular desde fecha_compra original o desde hoy
          const plazoMod = plazoOriginal
            ? plazoOriginal
            : redondearPlazo(fechaCompraOrig
                ? Math.round((fechaVenc - new Date(fechaCompraOrig)) / 86400000)
                : Math.round((fechaVenc - new Date()) / 86400000));
          const fechaCompraEstMod = new Date(fechaVenc.getTime() - plazoMod * 86400000);
          const semanaCompra  = getWeekNumber(fechaCompraEstMod);
          await insertarCompra(pool, {
            proveedor,
            fecha_compra:       formatDate(fechaCompraEstMod),
            semana_compra:      semanaCompra,
            año,
            mes:                getMesNombre(fechaVenc),
            numero_orden:       oc,
            monto_neto:         montoNeto,
            monto_con_iva:      montoConIva,
            plazo_dias:         plazoMod,
            fecha_vencimiento:  formatDate(fechaVenc),
            semana_vencimiento: semanaVenc,
            tipo_proveedor:     'Encadenado',
            sucursal:           '',
            numero_factura:     numDoc || null,
          }, lote, 'FACTURA'); // Estado Modificado → fuente=FACTURA
          insertados++;
          continue;
        }

        // Intentar actualizar registro existente por N° OC (si existe)
        let actualizado = false;
        if (oc) {
          // Prioridad 1: buscar fila REMANENTE (saldo pendiente de facturación parcial previa)
          const remanQ = await pool.request()
            .input('oc', sql.NVarChar, oc)
            .query(`
              SELECT TOP 1 id, monto_con_iva, fecha_vencimiento, plazo_dias,
                     fecha_compra, semana_compra, año, mes, proveedor, sucursal, fecha_carga,
                     id_oc_ref
              FROM panificacion_compras
              WHERE numero_orden = @oc AND tipo_proveedor = 'Encadenado'
                AND ISNULL(es_madre, 0) = 0
                AND fuente = 'REMANENTE'
              ORDER BY id ASC
            `);

          if (remanQ.recordset.length > 0) {
            // ── Hay REMANENTE: consumirlo con esta factura ──────────────────────
            const row0           = remanQ.recordset[0];
            const montoExistente = parseFloat(row0.monto_con_iva) || 0;
            const remanenteConIva = Math.round(montoExistente - montoConIva);
            console.log(`[PBI P1] OC="${oc}" → REMANENTE existente id=${row0.id} monto=${montoExistente} | factura=${montoConIva} | diff=${remanenteConIva}`);

            if (remanenteConIva < 0) {
              // Factura cubre (o supera) el REMANENTE → convertir a FACTURA
              await pool.request()
                .input('id',                 sql.Int,           row0.id)
                .input('monto_con_iva',      sql.Decimal(18,2), montoConIva)
                .input('monto_neto',         sql.Decimal(18,2), montoNeto)
                .input('lote',               sql.NVarChar,      lote)
                .input('fecha_vencimiento',  sql.Date,          formatDate(fechaVenc))
                .input('semana_vencimiento', sql.Int,           semanaVenc)
                .input('año',                sql.Int,           año)
                .input('mes',                sql.NVarChar,      getMesNombre(fechaVenc))
                .input('fuente',             sql.NVarChar,      'FACTURA')
                .input('numero_factura',     sql.NVarChar,      numDoc || null)
                .query(`
                  UPDATE panificacion_compras SET
                    estado_pago = 'Facturado',
                    fuente      = @fuente,
                    lote_carga  = @lote,
                    monto_con_iva = @monto_con_iva,
                    monto_neto = @monto_neto,
                    fecha_vencimiento = @fecha_vencimiento,
                    semana_vencimiento = @semana_vencimiento,
                    año = @año,
                    mes = @mes,
                    numero_factura = @numero_factura
                  WHERE id = @id
                `);
            } else {
              // Factura cubre parcialmente → REMANENTE → FACTURA + nuevo REMANENTE por diferencia
              await pool.request()
                .input('id',                 sql.Int,           row0.id)
                .input('monto_con_iva',      sql.Decimal(18,2), montoConIva)
                .input('monto_neto',         sql.Decimal(18,2), montoNeto)
                .input('fuente',             sql.NVarChar,      'FACTURA')
                .input('lote',               sql.NVarChar,      lote)
                .input('fecha_vencimiento',  sql.Date,          formatDate(fechaVenc))
                .input('semana_vencimiento', sql.Int,           semanaVenc)
                .input('año',                sql.Int,           año)
                .input('mes',                sql.NVarChar,      getMesNombre(fechaVenc))
                .input('numero_factura',     sql.NVarChar,      numDoc || null)
                .query(`
                  UPDATE panificacion_compras SET
                    monto_con_iva = @monto_con_iva,
                    monto_neto    = @monto_neto,
                    fuente        = @fuente,
                    lote_carga    = @lote,
                    fecha_vencimiento = @fecha_vencimiento,
                    semana_vencimiento = @semana_vencimiento,
                    año = @año,
                    mes = @mes,
                    numero_factura = @numero_factura
                  WHERE id = @id
                `);

              if (remanenteConIva > 0) {
                const remNeto        = Math.round(remanenteConIva / 1.19);
                const fechaVencOrig  = new Date(row0.fecha_vencimiento);
                const semanaVencOrig = getWeekNumber(fechaVencOrig);
                await insertarCompra(pool, {
                  proveedor:          row0.proveedor || proveedor,
                  fecha_compra:       row0.fecha_compra ? formatDate(new Date(row0.fecha_compra)) : hoy,
                  semana_compra:      row0.semana_compra,
                  año:                row0.año,
                  mes:                row0.mes,
                  numero_orden:       oc,
                  monto_neto:         remNeto,
                  monto_con_iva:      remanenteConIva,
                  plazo_dias:         row0.plazo_dias,
                  fecha_vencimiento:  formatDate(fechaVencOrig),
                  semana_vencimiento: semanaVencOrig,
                  tipo_proveedor:     'Encadenado',
                  sucursal:           row0.sucursal || '',
                  fecha_carga:        row0.fecha_carga,
                  id_oc_ref:          row0.id_oc_ref || null, // propagar FK al EXCEL original
                }, lote, 'REMANENTE');
              }
            }

            actualizados++;
            actualizado = true;

            // Verificar si el numero_orden completo quedó cubierto → marcar todas las cuotas
            await _cascadaEstadoOC(pool, oc);

          } else {
            // Prioridad 2: buscar OC original (EXCEL/MANUAL) — NO sobreescribirla,
            // insertar FACTURA nueva y actualizar su estado_pago.
            // IMPORTANTE: saltar filas ya Canceladas para que cada factura encuentre
            // su propia cuota/fila y no se acumulen todas en la primera.
            const ocOrigQ = await pool.request()
              .input('oc', sql.NVarChar, oc)
              .query(`
                SELECT TOP 1 id, monto_con_iva, fecha_vencimiento, plazo_dias,
                       fecha_compra, semana_compra, año, mes, proveedor, sucursal, fecha_carga
                FROM panificacion_compras
                WHERE numero_orden = @oc AND tipo_proveedor = 'Encadenado'
                  AND ISNULL(es_madre, 0) = 0
                  AND fuente NOT IN ('FACTURA', 'REMANENTE')
                  AND estado_pago NOT IN ('Cancelado', 'Facturado')
                ORDER BY id ASC
              `);

            if (ocOrigQ.recordset.length > 0) {
              const refRow = ocOrigQ.recordset[0];
              console.log(`[PBI P2] OC="${oc}" → EXCEL id=${refRow.id} monto_oc=${refRow.monto_con_iva} | factura_monto=${montoConIva}`);

              // Insertar nueva fila FACTURA (la OC original permanece intacta)
              await insertarCompra(pool, {
                proveedor:          refRow.proveedor || proveedor,
                fecha_compra:       hoy,
                semana_compra:      getWeekNumber(hoyDate),
                año,
                mes:                getMesNombre(fechaVenc),
                numero_orden:       oc,
                monto_neto:         montoNeto,
                monto_con_iva:      montoConIva,
                plazo_dias:         refRow.plazo_dias,
                fecha_vencimiento:  formatDate(fechaVenc),
                semana_vencimiento: semanaVenc,
                tipo_proveedor:     'Encadenado',
                sucursal:           refRow.sucursal || '',
                fecha_carga:        refRow.fecha_carga,
                id_oc_ref:          refRow.id,
                numero_factura:     numDoc || null,
              }, lote, 'FACTURA');

              // Actualizar estado de esta cuota individual primero
              const totalIndivQ = await pool.request()
                .input('refId', sql.Int, refRow.id)
                .query(`
                  SELECT ISNULL(SUM(monto_con_iva),0) AS total
                  FROM panificacion_compras
                  WHERE id_oc_ref = @refId AND fuente = 'FACTURA'
                `);
              const totalIndiv = parseFloat(totalIndivQ.recordset[0].total) || 0;
              const ocMonto    = parseFloat(refRow.monto_con_iva) || 0;
              const estadoIndiv = totalIndiv >= ocMonto ? 'Cancelado' : 'Parcial';
              await pool.request()
                .input('id',     sql.Int,      refRow.id)
                .input('estado', sql.NVarChar, estadoIndiv)
                .query(`UPDATE panificacion_compras SET estado_pago = @estado WHERE id = @id`);

              console.log(`[PBI P2] OC="${oc}" → totalFacturado=${totalIndiv} ocMonto=${ocMonto} estado=${estadoIndiv}`);
              // Si la facturación es parcial → crear REMANENTE con el saldo pendiente.
              // Sin este paso, la fila EXCEL queda excluida por `tiene_facturas` y el
              // saldo restante desaparece de la vista aunque la OC no esté cancelada.
              if (estadoIndiv === 'Parcial') {
                const diffConIva = Math.round(ocMonto - totalIndiv);
                if (diffConIva > 0) {
                  // Eliminar REMANENTE previo para esta cuota si existiera (evita duplicados)
                  await pool.request()
                    .input('refId', sql.Int, refRow.id)
                    .query(`DELETE FROM panificacion_compras WHERE id_oc_ref = @refId AND fuente = 'REMANENTE'`);
                  const diffNeto       = Math.round(diffConIva / 1.19);
                  const fechaVencRef   = new Date(refRow.fecha_vencimiento);
                  const semanaVencRef  = getWeekNumber(fechaVencRef);
                  console.log(`[PBI P2] OC="${oc}" → CREANDO REMANENTE diffConIva=${diffConIva} semVenc=${semanaVencRef}`);
                  await insertarCompra(pool, {
                    proveedor:          refRow.proveedor || proveedor,
                    fecha_compra:       refRow.fecha_compra ? formatDate(new Date(refRow.fecha_compra)) : hoy,
                    semana_compra:      refRow.semana_compra,
                    año:                refRow.año || año,
                    mes:                refRow.mes || getMesNombre(fechaVencRef),
                    numero_orden:       oc,
                    monto_neto:         diffNeto,
                    monto_con_iva:      diffConIva,
                    plazo_dias:         refRow.plazo_dias,
                    fecha_vencimiento:  formatDate(fechaVencRef),
                    semana_vencimiento: semanaVencRef,
                    tipo_proveedor:     'Encadenado',
                    sucursal:           refRow.sucursal || '',
                    fecha_carga:        refRow.fecha_carga,
                    id_oc_ref:          refRow.id,
                  }, lote, 'REMANENTE');
                }
              }

              // Luego verificar si el numero_orden completo quedó cubierto → marcar todas las cuotas
              await _cascadaEstadoOC(pool, oc);

              insertados++;
              actualizado = true;
            }
          }
        }

        // Si no había OC coincidente, insertar como nuevo con plazo por defecto 30 días
        if (!actualizado) {
          const plazoNuevo = redondearPlazo(Math.round((fechaVenc - hoyDate) / 86400000));
          // Retroceder desde la fecha de vencimiento para estimar la fecha de emisión real
          const fechaCompraEst = new Date(fechaVenc.getTime() - plazoNuevo * 86400000);
          const semanaCompra = getWeekNumber(fechaCompraEst);
          await insertarCompra(pool, {
            proveedor,
            fecha_compra:       formatDate(fechaCompraEst),
            semana_compra:      semanaCompra,
            año,
            mes:                getMesNombre(fechaVenc),
            numero_orden:       oc || numDoc,
            monto_neto:         montoNeto,
            monto_con_iva:      montoConIva,
            plazo_dias:         plazoNuevo,
            fecha_vencimiento:  formatDate(fechaVenc),
            semana_vencimiento: semanaVenc,
            tipo_proveedor:     'Encadenado',
            sucursal:           '',
            numero_factura:     numDoc || null,
          }, lote, 'FACTURA'); // fuente=FACTURA: no vino del Excel OC
          insertados++;
        }
      } catch (e) { console.error('Error fila factura:', e.message); errores++; }
    }

    try { fs.unlinkSync(req.file.path); } catch {}

    // Auto-limpiar duplicados generados por esta carga
    try { await _deduplicar(pool); } catch (e) { console.warn('deduplicar post-pbi:', e.message); }

    const partes = [];
    if (actualizados > 0) partes.push(`${actualizados} encadenados actualizados con fecha real`);
    if (insertados   > 0) partes.push(`${insertados} nuevas facturas insertadas`);
    if (ignorados    > 0) partes.push(`${ignorados} filas ignoradas (sin fecha/monto)`);
    if (errores      > 0) partes.push(`${errores} errores`);

    res.json({
      success: true,
      message: partes.length ? partes.join(', ') : 'Sin datos válidos en el archivo',
      actualizados, insertados, ignorados, errores, lote
    });
  } catch (error) {
    console.error('Error uploadFacturasPBI:', error);
    if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch {}
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET: Estado de la última sincronización PBI ─────────────────────────────
exports.getEstadoSyncPBI = async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = await pool.request().query(`
      SELECT TOP 1 fecha_carga, lote_carga
      FROM panificacion_compras
      WHERE fuente = 'FACTURA' OR lote_carga LIKE 'FACTURA_%'
      ORDER BY fecha_carga DESC
    `);
    const ultimaSync = r.recordset[0]?.fecha_carga || null;
    const semanaActual = getWeekNumber(new Date());
    const añoActual = new Date().getFullYear();

    let estado = 'nunca';
    if (ultimaSync) {
      const d = new Date(ultimaSync);
      const semanaSync = getWeekNumber(d);
      const añoSync = d.getFullYear();
      estado = (semanaSync === semanaActual && añoSync === añoActual) ? 'ok' : 'pendiente';
    }
    res.json({ success: true, ultimaSync, estado, semanaActual, año: añoActual });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET: Desglose por sucursal de una semana ─────────────────────────────────
exports.getDesglosesSucursalSemana = async (req, res) => {
  try {
    const { semana, año, semana_desde, semana_hasta, fecha_desde, fecha_hasta } = req.query;
    const pool = await poolPromise;
    await asegurarTablas(pool);

    const req2 = pool.request();
    if (año) req2.input('año', sql.Int, parseInt(año));

    // Modo fecha real (tiene prioridad sobre semanas)
    const usaFechas = !!(fecha_desde || fecha_hasta);
    const sDesde = !usaFechas ? (semana_desde ? parseInt(semana_desde) : (semana ? parseInt(semana) : null)) : null;
    const sHasta = !usaFechas ? (semana_hasta ? parseInt(semana_hasta) : (semana ? parseInt(semana) : null)) : null;

    if (usaFechas) {
      if (fecha_desde) req2.input('f_desde', sql.Date, fecha_desde);
      if (fecha_hasta) req2.input('f_hasta', sql.Date, fecha_hasta);
    } else {
      if (sDesde) req2.input('s_desde', sql.Int, sDesde);
      if (sHasta) req2.input('s_hasta', sql.Int, sHasta);
    }

    // Sucursales de supermercado excluidas de planificación
    const IDS_EXCLUIDOS = [4, 5, 6, 7, 8, 73, 75]; // Lord Cochrane, Enrique Molina, D.Vera 890/891/1440, Los Cipreses, Coelemu SU
    const sucRegistradas = await pool.request().query(
      `SELECT id, nombre FROM sucursales
       WHERE nombre IS NOT NULL AND nombre <> ''
         AND id NOT IN (${IDS_EXCLUIDOS.join(',')})
       ORDER BY nombre`
    );

    const result = await req2.query(`
      WITH dedup AS (
        SELECT *,
          ROW_NUMBER() OVER (
            PARTITION BY
              CASE
                WHEN LEN(ISNULL(numero_orden,'')) > 0 AND tipo_proveedor = 'Encadenado'
                THEN CAST(año AS NVARCHAR(10)) + '_ENC_'
                     + ISNULL(CAST(numero_orden AS NVARCHAR(50)),'')
                     + '_PL' + ISNULL(CAST(plazo_dias AS NVARCHAR(10)),'X')
                ELSE CAST(id AS NVARCHAR(20))
              END
            ORDER BY CASE WHEN fuente = 'FACTURA' THEN 0 ELSE 1 END, id DESC
          ) AS _rn
        FROM panificacion_compras
        WHERE 1=1
          ${año         ? 'AND año = @año'                                  : ''}
          ${usaFechas && fecha_desde ? 'AND fecha_vencimiento >= @f_desde'  : ''}
          ${usaFechas && fecha_hasta ? 'AND fecha_vencimiento <= @f_hasta'  : ''}
          ${!usaFechas && sDesde    ? 'AND semana_vencimiento >= @s_desde'  : ''}
          ${!usaFechas && sHasta    ? 'AND semana_vencimiento <= @s_hasta'  : ''}
      )
      SELECT
        ISNULL(NULLIF(LTRIM(RTRIM(sucursal)),''), 'Sin sucursal') AS sucursal,
        tipo_proveedor,
        COUNT(*)           AS num_ordenes,
        SUM(monto_neto)    AS total_neto,
        SUM(monto_con_iva) AS total_iva
      FROM dedup
      WHERE _rn = 1
        AND LTRIM(RTRIM(ISNULL(sucursal,''))) NOT IN (
          SELECT nombre FROM sucursales WHERE id IN (4,5,6,7,8,73,75)
        )
      GROUP BY LTRIM(RTRIM(sucursal)), tipo_proveedor
      ORDER BY sucursal, tipo_proveedor
    `);

    // Inicializar mapa con TODAS las sucursales registradas (con $0)
    const map = {};
    sucRegistradas.recordset.forEach(s => {
      map[s.nombre] = { sucursal: s.nombre, encadenado: 0, no_encadenado: 0, total: 0, ordenes: 0, sinDatos: true };
    });

    // Rellenar con datos reales
    result.recordset.forEach(r => {
      const key = r.sucursal;
      if (!map[key]) map[key] = { sucursal: key, encadenado: 0, no_encadenado: 0, total: 0, ordenes: 0, sinDatos: false };
      const v = map[key];
      v.sinDatos = false;
      const iva = parseFloat(r.total_iva) || 0;
      const isEnc = (r.tipo_proveedor || '').toLowerCase().includes('encadenado') && !(r.tipo_proveedor || '').toLowerCase().includes('no');
      if (isEnc) v.encadenado += iva; else v.no_encadenado += iva;
      v.total   += iva;
      v.ordenes += parseInt(r.num_ordenes) || 0;
    });

    // Ordenar: primero con datos (desc por total), luego sin datos alfabético
    const lista = Object.values(map).sort((a, b) => {
      if (a.sinDatos !== b.sinDatos) return a.sinDatos ? 1 : -1;
      return b.total - a.total;
    });

    res.json({ success: true, sucursales: lista });
  } catch (error) {
    console.error('Error getDesglosesSucursalSemana:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUT: Actualizar estado de una Orden de Compra ───────────────────────────
// Body: { estado_pago, vigente }   (estado_pago: Pendiente|Completo|Parcial|Modificado)
exports.actualizarEstadoOrden = async (req, res) => {
  try {
    const { orden } = req.params;
    const { estado_pago, vigente } = req.body;
    if (!orden) return res.status(400).json({ success: false, message: 'Falta numero_orden' });

    const pool = await poolPromise;
    await asegurarTablas(pool);

    const sets = [];
    const request = pool.request().input('orden', sql.NVarChar, orden);

    if (estado_pago !== undefined) {
      sets.push('estado_pago = @estado_pago');
      request.input('estado_pago', sql.NVarChar, estado_pago);
    }
    if (vigente !== undefined) {
      sets.push('vigente = @vigente');
      request.input('vigente', sql.Bit, vigente ? 1 : 0);
    }
    if (sets.length === 0) return res.status(400).json({ success: false, message: 'Nada que actualizar' });

    // Solo actualizar la fila EXCEL/MANUAL original, nunca las FACTURA ni REMANENTE
    await request.query(`
      UPDATE panificacion_compras
      SET ${sets.join(', ')}
      WHERE numero_orden = @orden
        AND fuente NOT IN ('FACTURA', 'REMANENTE')
    `);

    res.json({ success: true, message: `Orden ${orden} actualizada` });
  } catch (error) {
    console.error('Error actualizarEstadoOrden:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Helper privado: eliminar duplicados automáticamente ─────────────────────
// Se llama al final de cada upload para mantener la BD limpia.
// Conserva el registro más reciente (MAX id) por grupo:
//   · Encadenados con numero_orden → 1 fila por (año + numero_orden + plazo_dias)
//   · Encadenados sin numero_orden → 1 fila por (proveedor + semana_compra + monto_con_iva)
//   · No Encadenados con OC        → 1 fila por (numero_orden + plazo_dias + sucursal)
//   · No Encadenados sin OC        → 1 fila por (proveedor + sucursal + fecha_compra + monto_con_iva)
// Usa CTE con ROW_NUMBER (evita NOT IN sobre tabla completa → mucho más eficiente)
const _deduplicar = async (pool) => {
  // 1) Encadenados con numero_orden
  //    Particionamos por (año + numero_orden + plazo_dias) sin importar sucursal.
  //    Incluir año permite que el mismo N° de OC se reutilice en ejercicios distintos
  //    sin que una anualidad borre a la otra.
  //    Si hay dos filas con la misma OC en el mismo año, conservamos la más reciente,
  //    priorizando fuente='FACTURA' sobre 'EXCEL'.
  await pool.request().query(`
    WITH cte AS (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY año,
                            numero_orden,
                            ISNULL(CAST(plazo_dias AS NVARCHAR(10)), 'X')
               ORDER BY CASE WHEN fuente = 'FACTURA' THEN 0 ELSE 1 END, id DESC
             ) AS rn
      FROM panificacion_compras
      WHERE numero_orden <> '' AND numero_orden IS NOT NULL
        AND tipo_proveedor = 'Encadenado'
        AND fuente != 'REMANENTE'
        AND fuente != 'FACTURA'
    )
    DELETE FROM cte WHERE rn > 1
  `);
  // 2a) Encadenados sin numero_orden que ya tienen equivalente CON numero_orden
  //     (mismo proveedor + año + semana_compra + plazo_dias → el sin OC es redundante)
  await pool.request().query(`
    DELETE c1 FROM panificacion_compras c1
    WHERE c1.tipo_proveedor = 'Encadenado'
      AND (c1.numero_orden IS NULL OR c1.numero_orden = '')
      AND EXISTS (
        SELECT 1 FROM panificacion_compras c2
        WHERE c2.tipo_proveedor = 'Encadenado'
          AND LEN(ISNULL(c2.numero_orden,'')) > 0
          AND c2.proveedor     = c1.proveedor
          AND c2.semana_compra = c1.semana_compra
          AND c2.plazo_dias    = c1.plazo_dias
          AND c2.año           = c1.año
      )
  `);
  // 2b) Encadenados sin numero_orden — dedup por (proveedor + semana_compra + monto_con_iva + plazo_dias)
  await pool.request().query(`
    WITH cte AS (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY proveedor, semana_compra, monto_con_iva, ISNULL(plazo_dias,0) ORDER BY id DESC) AS rn
      FROM panificacion_compras
      WHERE (numero_orden = '' OR numero_orden IS NULL)
        AND tipo_proveedor = 'Encadenado'
    )
    DELETE FROM cte WHERE rn > 1
  `);
  // 3a) No Encadenados con numero_orden — dedup por (numero_orden + plazo_dias + sucursal)
  //     plazo_dias en la clave para preservar cada cuota de la misma OC como registro independiente
  await pool.request().query(`
    WITH cte AS (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY numero_orden, plazo_dias, ISNULL(sucursal,'') ORDER BY id DESC) AS rn
      FROM panificacion_compras
      WHERE tipo_proveedor = 'No Encadenado'
        AND numero_orden IS NOT NULL AND numero_orden <> ''
    )
    DELETE FROM cte WHERE rn > 1
  `);
  // 3b) No Encadenados sin numero_orden — dedup por (proveedor + sucursal + fecha_compra + monto_con_iva)
  //     Incluir monto_con_iva permite que dos pagos al mismo proveedor en el mismo día
  //     pero por montos distintos (ej: dos facturas distintas) convivan sin borrarse.
  await pool.request().query(`
    WITH cte AS (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY proveedor, ISNULL(sucursal,''), fecha_compra, ISNULL(monto_con_iva, 0) ORDER BY id DESC) AS rn
      FROM panificacion_compras
      WHERE tipo_proveedor = 'No Encadenado'
        AND (numero_orden IS NULL OR numero_orden = '')
    )
    DELETE FROM cte WHERE rn > 1
  `);
};

// ─── POST: Deduplicar (endpoint de admin — invocado también internamente) ─────
exports.deduplicarCompras = async (req, res) => {
  try {
    const pool = await poolPromise;
    await asegurarTablas(pool);
    await _deduplicar(pool);
    res.json({ success: true, message: 'Deduplicación completada' });
  } catch (error) {
    console.error('Error deduplicarCompras:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST: Descarga automática de facturas PBI (Playwright) ───────────────────
exports.descargarFacturasPBIAuto = async (req, res) => {
  // SSE para transmitir logs en tiempo real al frontend
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const enviar = (tipo, data) => {
    res.write(`data: ${JSON.stringify({ tipo, ...data })}\n\n`);
  };

  try {
    const { descargarFacturasPBI } = require('../services/pbiService');
    const path = require('path');
    const fs   = require('fs');

    enviar('log', { msg: 'Iniciando descarga desde Power BI...' });

    const resultado = await descargarFacturasPBI((msg) => {
      enviar('log', { msg });
    });

    if (!resultado.success) {
      enviar('error', { msg: resultado.mensaje });
      res.write('data: {"tipo":"fin","success":false}\n\n');
      return res.end();
    }

    enviar('log', { msg: 'Procesando archivo descargado...' });

    // Procesar el archivo igual que upload manual
    const fakeReq = {
      file: { path: resultado.filePath, originalname: path.basename(resultado.filePath) },
      user: req.user,
    };
    let procResult;
    await new Promise((resolve) => {
      const fakeRes = {
        status: (code) => ({ json: (d) => { procResult = { code, ...d }; resolve(); } }),
        json:   (d)    => { procResult = { code: 200, ...d }; resolve(); },
      };
      exports.uploadFacturasPBI(fakeReq, fakeRes);
    });

    // Limpiar archivo temporal
    try { fs.unlinkSync(resultado.filePath); } catch {}

    if (procResult?.success) {
      enviar('log', { msg: `✓ ${procResult.message}` });
      res.write(`data: ${JSON.stringify({ tipo: 'fin', success: true, message: procResult.message })}\n\n`);
    } else {
      enviar('error', { msg: procResult?.message || 'Error al procesar el archivo' });
      res.write('data: {"tipo":"fin","success":false}\n\n');
    }
  } catch (error) {
    console.error('Error descargarFacturasPBIAuto:', error);
    enviar('error', { msg: error.message });
    res.write('data: {"tipo":"fin","success":false}\n\n');
  } finally {
    res.end();
  }
};

// ─── GET: Productos de una Orden de Compra (desde ERP) ──────────────────────────
exports.getProductosOC = async (req, res) => {
  const { numero_orden, sucursal } = req.query;
  const oc = (numero_orden || '').toString().trim();
  if (!oc) return res.status(400).json({ success: false, message: 'numero_orden requerido' });

  const QUERY = `
    SELECT
      MP_CODIGO_PRODUCTO       AS codigo_producto,
      DOC_DESCRIPCION_PRODUCTO AS descripcion,
      DOC_CANTIDAD             AS cantidad,
      DOC_PRECIO_FINAL         AS precio_unitario,
      DOC_TOTAL                AS total
    FROM ERP_OP_DET_ORDEN_COMPRA
    WHERE LTRIM(RTRIM(ROC_NUMERO_ORDEN)) = LTRIM(RTRIM(@numero_orden))
    ORDER BY MP_CODIGO_PRODUCTO
  `;

  console.log(`\n🔍 [ProductosOC] Orden: "${oc}" | Sucursal hint: "${sucursal || 'todas'}"`);

  try {
    const todasSucursales = await obtenerSucursalesERP();
    console.log(`[ProductosOC] Sucursales ERP disponibles: ${todasSucursales.map(s=>s.nombre).join(', ')}`);

    // Intentar primero la sucursal indicada; si no coincide ninguna → probar todas
    let candidatas = sucursal
      ? todasSucursales.filter(s => s.nombre.toLowerCase().includes(sucursal.toLowerCase()))
      : todasSucursales;

    if (!candidatas.length) {
      console.warn(`[ProductosOC] Sucursal "${sucursal}" no coincide con ninguna ERP → intentando todas`);
      candidatas = todasSucursales;
    }

    if (!candidatas.length) {
      return res.json({ success: true, productos: [], mensaje: 'Sin conexiones ERP disponibles' });
    }

    const errores = [];

    // Intentar cada candidata hasta encontrar resultados
    for (const suc of candidatas) {
      try {
        const pool = await getPoolSucursal(suc);
        const result = await pool.request()
          .input('numero_orden', sql.NVarChar(50), oc)
          .query(QUERY);

        console.log(`   → ${suc.nombre}: ${result.recordset.length} productos`);

        if (result.recordset.length > 0) {
          return res.json({
            success: true,
            productos: result.recordset,
            sucursal: suc.nombre,
            total: result.recordset.length,
          });
        }

        // Buscar con el número sin espacios extra por si acaso
        const QUERY_LIKE = `
          SELECT
            MP_CODIGO_PRODUCTO       AS codigo_producto,
            DOC_DESCRIPCION_PRODUCTO AS descripcion,
            DOC_CANTIDAD             AS cantidad,
            DOC_PRECIO_FINAL         AS precio_unitario,
            DOC_TOTAL                AS total
          FROM ERP_OP_DET_ORDEN_COMPRA
          WHERE ROC_NUMERO_ORDEN LIKE @numero_orden
          ORDER BY MP_CODIGO_PRODUCTO
        `;
        const r2 = await pool.request()
          .input('numero_orden', sql.NVarChar(50), `%${oc}%`)
          .query(QUERY_LIKE);
        if (r2.recordset.length > 0) {
          console.log(`   → ${suc.nombre}: ${r2.recordset.length} productos (LIKE match)`);
          return res.json({ success: true, productos: r2.recordset, sucursal: suc.nombre, total: r2.recordset.length });
        }

        // Diagnóstico: listar tablas del ERP que coincidan con "DET" u "ORDEN"
        const tablasDiag = await pool.request().query(`
          SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
          WHERE TABLE_NAME LIKE '%DET%ORDEN%' OR TABLE_NAME LIKE '%ORDEN%DET%'
          OR TABLE_NAME LIKE '%LINEA%ORDEN%' OR TABLE_NAME LIKE '%ITEM%ORDEN%'
          ORDER BY TABLE_NAME
        `);
        const tablas = tablasDiag.recordset.map(t => t.TABLE_NAME);
        console.log(`   → ${suc.nombre}: 0 productos. Tablas candidatas: [${tablas.join(', ')}]`);
        errores.push({ sucursal: suc.nombre, tablasCandidatas: tablas, mensaje: '0 productos con exact match y LIKE' });

      } catch (erpErr) {
        console.error(`   ⚠️ ${suc.nombre}: ${erpErr.message}`);
        errores.push({ sucursal: suc.nombre, error: erpErr.message });
      }
    }

    // Ninguna sucursal retornó resultados
    console.warn(`[ProductosOC] OC "${oc}" no encontrada. Diagnóstico:`, JSON.stringify(errores, null, 2));
    res.json({ success: true, productos: [], mensaje: `OC ${oc} sin detalle`, diagnostico: errores });

  } catch (error) {
    console.error('[ProductosOC] Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
