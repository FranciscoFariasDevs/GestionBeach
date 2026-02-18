// backend/controllers/panificacionController.js
const { sql, poolPromise } = require('../config/db');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getWeekNumber = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const getWeekStart = (week, year) => {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const weekStart = new Date(simple);
  if (dow <= 4) weekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else weekStart.setDate(simple.getDate() + 8 - simple.getDay());
  return weekStart;
};

const excelSerialToDate = (serial) => {
  if (!serial || isNaN(serial)) return null;
  const utcDays = Math.floor(serial - 25569);
  return new Date(utcDays * 86400 * 1000);
};

const parseFecha = (val) => {
  if (!val) return null;
  if (typeof val === 'number') return excelSerialToDate(val);
  const d = new Date(val);
  return isNaN(d) ? null : d;
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
  return meses[new Date(date).getMonth()];
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
        lote_carga NVARCHAR(50) NULL
      )
    END
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
      .query('SELECT numero_semana, limite_semanal, fecha_inicio FROM panificacion_config_semanal WHERE año = @año');

    const configMap = {};
    configResult.recordset.forEach(r => { configMap[r.numero_semana] = r; });

    // Pagos comprometidos por semana de vencimiento
    const pagosResult = await pool.request()
      .input('año', sql.Int, año)
      .query(`
        SELECT semana_vencimiento,
               SUM(monto_con_iva) as pagos_comprometidos,
               SUM(CASE WHEN tipo_proveedor = 'Encadenado' THEN monto_con_iva ELSE 0 END) as encadenados,
               SUM(CASE WHEN tipo_proveedor = 'No Encadenado' THEN monto_con_iva ELSE 0 END) as no_encadenados
        FROM panificacion_compras
        WHERE año = @año
        GROUP BY semana_vencimiento
      `);

    const pagosMap = {};
    pagosResult.recordset.forEach(r => { pagosMap[r.semana_vencimiento] = r; });

    // Construir las 52 semanas
    const semanas = [];
    for (let s = 1; s <= 52; s++) {
      const config = configMap[s];
      const limite = config ? parseFloat(config.limite_semanal) : (s <= 18 ? 120000000 : 100000000);
      const pagos = pagosMap[s] || { pagos_comprometidos: 0, encadenados: 0, no_encadenados: 0 };
      const comprometidos = parseFloat(pagos.pagos_comprometidos) || 0;
      const capacidad = limite - comprometidos;

      let estado = 'OK';
      if (comprometidos > limite) estado = 'EXCEDIDO';
      else if (comprometidos >= limite * 0.8) estado = 'ALERTA';

      const fechaInicio = config?.fecha_inicio || getWeekStart(s, año);

      semanas.push({
        semana: `S${s}`,
        numero_semana: s,
        fecha_inicio: formatDate(fechaInicio),
        limite_semanal: limite,
        pagos_comprometidos: comprometidos,
        encadenados: parseFloat(pagos.encadenados) || 0,
        no_encadenados: parseFloat(pagos.no_encadenados) || 0,
        capacidad_disponible: capacidad,
        estado,
        porcentaje_uso: limite > 0 ? Math.round((comprometidos / limite) * 100) : 0
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
    const { año, semana, tipo, proveedor, sucursal, mes } = req.query;
    const pool = await poolPromise;
    await asegurarTablas(pool);

    let query = `
      SELECT id, proveedor, fecha_compra, semana_compra, año, mes, numero_orden,
             monto_neto, monto_con_iva, plazo_dias, fecha_vencimiento,
             semana_vencimiento, tipo_proveedor, sucursal, fuente, fecha_carga
      FROM panificacion_compras
      WHERE 1=1
    `;
    const request = pool.request();

    if (año) { query += ' AND año = @año'; request.input('año', sql.Int, parseInt(año)); }
    if (semana) { query += ' AND semana_compra = @semana'; request.input('semana', sql.Int, parseInt(semana)); }
    if (tipo) { query += ' AND tipo_proveedor = @tipo'; request.input('tipo', sql.NVarChar, tipo); }
    if (proveedor) { query += ' AND proveedor LIKE @proveedor'; request.input('proveedor', sql.NVarChar, `%${proveedor}%`); }
    if (sucursal) { query += ' AND sucursal = @sucursal'; request.input('sucursal', sql.NVarChar, sucursal); }
    if (mes) { query += ' AND mes = @mes'; request.input('mes', sql.NVarChar, mes); }

    query += ' ORDER BY fecha_compra DESC, id DESC';

    const result = await request.query(query);
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
      SELECT
        proveedor,
        fecha_compra,
        semana_compra,
        numero_orden,
        monto_neto,
        monto_con_iva,
        plazo_dias,
        fecha_vencimiento,
        semana_vencimiento,
        sucursal,
        mes,
        año
      FROM panificacion_compras
      WHERE tipo_proveedor = 'Encadenado'
        ${año ? 'AND año = @año' : ''}
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

// ─── Helper: insertar una compra ──────────────────────────────────────────────
const insertarCompra = async (pool, data, lote) => {
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
    .input('fuente',            sql.NVarChar,    'EXCEL')
    .input('lote_carga',        sql.NVarChar,    lote)
    .query(`
      INSERT INTO panificacion_compras
        (proveedor, fecha_compra, semana_compra, año, mes, numero_orden,
         monto_neto, monto_con_iva, plazo_dias, fecha_vencimiento,
         semana_vencimiento, tipo_proveedor, sucursal, fuente, lote_carga)
      VALUES
        (@proveedor, @fecha_compra, @semana_compra, @año, @mes, @numero_orden,
         @monto_neto, @monto_con_iva, @plazo_dias, @fecha_vencimiento,
         @semana_vencimiento, @tipo_proveedor, @sucursal, @fuente, @lote_carga)
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

    if (req.body.reemplazar === 'true') {
      await pool.request().query(`DELETE FROM panificacion_compras WHERE fuente = 'EXCEL'`);
    }

    let insertados = 0;
    let errores = 0;
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

        for (const row of rows) {
          try {
            const proveedor = String(row[iProveedor] || '').trim();
            if (!proveedor || proveedor.toLowerCase() === 'proveedor') continue;

            const fechaCompra = parseFecha(row[iFecha]);
            if (!fechaCompra) continue;

            const montoNeto = parseFloat(row[iNeto]) || 0;
            const montoIva  = parseFloat(row[iIva])  || montoNeto * 1.19;
            const plazo     = parseInt(row[iPlazo])   || 30;

            let fechaVenc = parseFecha(row[iFechaVenc]);
            if (!fechaVenc) { fechaVenc = new Date(fechaCompra); fechaVenc.setDate(fechaVenc.getDate() + plazo); }

            const semanaCompra = parseInt(row[iSemana])     || getWeekNumber(fechaCompra);
            const semanaVenc   = parseInt(row[iSemanaVenc]) || getWeekNumber(fechaVenc);
            const año          = fechaCompra.getFullYear();

            await insertarCompra(pool, {
              proveedor, fecha_compra: formatDate(fechaCompra),
              semana_compra: semanaCompra, año, mes: getMesNombre(fechaCompra),
              numero_orden: '', monto_neto: montoNeto, monto_con_iva: montoIva,
              plazo_dias: plazo, fecha_vencimiento: formatDate(fechaVenc),
              semana_vencimiento: semanaVenc, tipo_proveedor: 'Encadenado', sucursal: '',
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

    res.json({
      success: true,
      message: `Excel cargado: ${insertados} registros de ${hojasUsadas.length} hoja(s)`,
      insertados, errores, lote, hojas: hojasUsadas
    });
  } catch (error) {
    console.error('Error uploadExcelEncadenados:', error);
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
        WHERE año = @año
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

// ─── GET: Desglose por sucursal de una semana ─────────────────────────────────
exports.getDesglosesSucursalSemana = async (req, res) => {
  try {
    const { semana, año } = req.query;
    const pool = await poolPromise;
    await asegurarTablas(pool);

    const req2 = pool.request();
    if (semana) req2.input('semana', sql.Int, parseInt(semana));
    if (año)    req2.input('año',    sql.Int, parseInt(año));

    const result = await req2.query(`
      SELECT
        ISNULL(sucursal, 'Sin sucursal')                                      AS sucursal,
        tipo_proveedor,
        COUNT(*)                                                                AS num_ordenes,
        SUM(monto_neto)                                                         AS total_neto,
        SUM(monto_con_iva)                                                      AS total_iva
      FROM panificacion_compras
      WHERE 1=1
        ${semana ? 'AND semana_compra = @semana' : ''}
        ${año    ? 'AND año = @año'              : ''}
      GROUP BY sucursal, tipo_proveedor
      ORDER BY sucursal, tipo_proveedor
    `);

    // Agrupar por sucursal
    const map = {};
    result.recordset.forEach(r => {
      if (!map[r.sucursal]) map[r.sucursal] = { sucursal: r.sucursal, encadenado: 0, no_encadenado: 0, total: 0, ordenes: 0 };
      const v = map[r.sucursal];
      const iva = parseFloat(r.total_iva) || 0;
      const isEnc = (r.tipo_proveedor || '').toLowerCase().includes('encadenado') && !(r.tipo_proveedor || '').toLowerCase().includes('no');
      if (isEnc) v.encadenado += iva; else v.no_encadenado += iva;
      v.total  += iva;
      v.ordenes += parseInt(r.num_ordenes) || 0;
    });

    res.json({ success: true, sucursales: Object.values(map).sort((a,b) => b.total - a.total) });
  } catch (error) {
    console.error('Error getDesglosesSucursalSemana:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
