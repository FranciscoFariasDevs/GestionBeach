// backend/controllers/guiasController.js - Módulo Guías (migrado de Envio_Guias.vb, verGuias.vb, GuiasEmitidas.vb, DetalleGuias.vb)
const { sql, poolPromise } = require('../config/db');

// ============ CACHE DE CONEXIONES ============
const poolCache = new Map();

const getPoolSucursal = async (sucursal) => {
  const cached = poolCache.get(sucursal.id);
  if (cached && cached.pool && cached.pool.connected) {
    cached.lastUsed = Date.now();
    return cached.pool;
  }
  if (cached) {
    try { await cached.pool.close(); } catch {}
    poolCache.delete(sucursal.id);
  }
  const config = {
    user: sucursal.usuario, password: sucursal.contrasena || '',
    server: sucursal.ip, port: sucursal.puerto || 1433, database: sucursal.base_datos,
    options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true, requestTimeout: 120000, connectionTimeout: 10000 },
    pool: { max: 5, min: 0, idleTimeoutMillis: 60000 }
  };
  const pool = await Promise.race([
    new sql.ConnectionPool(config).connect(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de conexion')), 10000))
  ]);
  poolCache.set(sucursal.id, { pool, lastUsed: Date.now() });
  return pool;
};

setInterval(() => {
  const ahora = Date.now();
  for (const [id, entry] of poolCache) {
    if (ahora - entry.lastUsed > 5 * 60 * 1000) {
      try { entry.pool.close(); } catch {}
      poolCache.delete(id);
    }
  }
}, 5 * 60 * 1000);

const obtenerSucursal = async (sucursalId) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('sucursal_id', sql.Int, sucursalId)
    .query('SELECT id, nombre, ip, base_datos, usuario, contrasena, tipo_sucursal, puerto FROM sucursales WHERE id = @sucursal_id');
  return result.recordset[0] || null;
};

// Mapeo sucursal nombre -> keyword para filtrar direccion destino (igual que en Envio_Guias.vb)
const SUCURSAL_KEYWORDS = {
  'VICENTE PALACIOS 2908, TOME': 'PALACIOS',
  'LAS CAMELIAS 39, TOME': 'CAMELIAS',
  'TRES ESQUINAS S/N, COELEMU': 'TRES',
  'RUTA EL CONQUISTADOR 1002, QUIRIHUE': 'CONQUISTADOR',
  'RIO VIEJO 999, CHILLAN': 'VIEJO',
  'VICENTE PALACIOS 3088, TOME': '3088',
  'TRES ESQUINAS S/N MULTITIENDA, COELEMU': 'MULTITIENDA_COE'
};

// ============ ENDPOINTS ============

// GET /api/guias/sucursales
exports.getSucursales = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`SELECT id, nombre, tipo_sucursal FROM sucursales
              WHERE tipo_sucursal IN ('FERRETERIA', 'MULTITIENDA') AND ip IS NOT NULL AND ip <> '' ORDER BY nombre`);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener sucursales', error: error.message });
  }
};

// GET /api/guias/sucursales-destino?sucursalId=1
// Devuelve la lista de sucursales destino para filtrar guias de envio
exports.getSucursalesDestino = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`SELECT id, nombre FROM sucursales
              WHERE tipo_sucursal IN ('FERRETERIA', 'MULTITIENDA') AND ip IS NOT NULL AND ip <> '' ORDER BY nombre`);
    // Mapear a keyword para buscar en BEGC_DIRECCION_DESTINO
    const destinos = result.recordset.map(s => {
      const keyword = SUCURSAL_KEYWORDS[s.nombre] || s.nombre.split(',')[0].trim().split(' ').pop();
      return { id: s.id, nombre: s.nombre, keyword };
    });
    res.json(destinos);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener sucursales destino', error: error.message });
  }
};

// GET /api/guias/envio?sucursalId=1&destinoKeyword=PALACIOS&destinoId=2&fechaDesde=2025-01-01&fechaHasta=2025-01-31
// Guias enviadas desde sucursalId hacia destino, verificando si fueron ingresadas (ajustes)
exports.getGuiasEnvio = async (req, res) => {
  try {
    const { sucursalId, destinoKeyword, destinoId, fechaDesde, fechaHasta } = req.query;
    if (!sucursalId || !destinoKeyword || !fechaDesde || !fechaHasta) {
      return res.status(400).json({ message: 'Se requiere sucursalId, destinoKeyword, fechaDesde y fechaHasta' });
    }

    const sucursal = await obtenerSucursal(parseInt(sucursalId));
    if (!sucursal) return res.status(404).json({ message: 'Sucursal origen no encontrada' });

    let poolOrigen;
    try { poolOrigen = await getPoolSucursal(sucursal); }
    catch (err) { return res.status(503).json({ message: `No se pudo conectar a ${sucursal.nombre}`, error: err.message }); }

    const t0 = Date.now();

    // Query principal: guias emitidas hacia el destino (RUT 76236893 = empresa propia)
    const queryGuias = `
      SELECT BEGC_NUMERO_GUIA_CLI AS folio,
             com.CO_DESCRIPCION AS comuna,
             BEGC_DIRECCION_DESTINO AS direccion,
             CONVERT(NUMERIC, BEGC_AFECTO) AS neto,
             CONVERT(NUMERIC, BEGC_IVA) AS iva,
             CONVERT(NUMERIC, BEGC_TOTAL) AS total,
             COUNT(deg.MP_CODIGO_PRODUCTO) AS cant_productos,
             BEGC_OBSERVACION_SALIDA_DOC AS observacion,
             reg.BEGC_FECHA_HORA_EMISION AS fecha_emision,
             CASE WHEN reg.BEGC_MUEVE_INVENTARIO = 1 THEN 'Si' ELSE 'No' END AS mueve_inventario,
             ie.BEINGE_DESCRIPCION_ESTADO AS estado
      FROM ERP_BOD_RES_EMISION_GUIAS reg
      JOIN ERP_COMUNAS com ON com.CO_ID_COMUNA = reg.CO_ID_COMUNA
      JOIN ERP_BOD_DET_EMISION_GUIAS deg ON deg.BEGC_FOLIO_EGRESO_CLI = reg.BEGC_FOLIO_EGRESO_CLI
      JOIN ERP_BOD_ESTADO_INGRESO_EGRESO ie ON ie.BEINGE_ID_ESTADO_INGRESO_EGRESO = reg.BEINGE_ID_ESTADO_INGRESO_EGRESO
      WHERE reg.MC_RUT_CLIENTE = '76236893'
        AND reg.BEGC_FECHA_HORA_EMISION BETWEEN @fechaDesde AND @fechaHasta
        AND BEGC_DIRECCION_DESTINO LIKE '%' + @keyword + '%'
      GROUP BY BEGC_NUMERO_GUIA_CLI, com.CO_DESCRIPCION, BEGC_DIRECCION_DESTINO,
               BEGC_AFECTO, BEGC_IVA, BEGC_TOTAL, reg.BEGC_FECHA_HORA_EMISION,
               BEGC_OBSERVACION_SALIDA_DOC, ie.BEINGE_DESCRIPCION_ESTADO, reg.BEGC_MUEVE_INVENTARIO
      ORDER BY reg.BEGC_FECHA_HORA_EMISION DESC
    `;

    const resGuias = await poolOrigen.request()
      .input('fechaDesde', sql.VarChar, fechaDesde + ' 00:00:01')
      .input('fechaHasta', sql.VarChar, fechaHasta + ' 23:59:00')
      .input('keyword', sql.VarChar, destinoKeyword)
      .query(queryGuias);

    const guias = resGuias.recordset;

    // Verificar estado de ingreso en la sucursal destino
    if (destinoId && guias.length > 0) {
      try {
        const sucursalDestino = await obtenerSucursal(parseInt(destinoId));
        if (sucursalDestino) {
          const poolDestino = await getPoolSucursal(sucursalDestino);
          // Verificar cada folio si tiene ajuste en destino
          for (const guia of guias) {
            const resAjuste = await poolDestino.request()
              .input('folio', sql.VarChar, '%' + guia.folio + '%')
              .query('SELECT TOP 1 1 AS existe FROM ERP_BOD_RES_AJUSTES WHERE AJU_OBSERVACION LIKE @folio');
            guia.ingreso = resAjuste.recordset.length > 0 ? 'Ingresada' : 'Pendiente';
          }
        }
      } catch (err) {
        // Si no se puede conectar al destino, marcar todas como desconocido
        guias.forEach(g => g.ingreso = 'Sin verificar');
      }
    } else {
      guias.forEach(g => g.ingreso = 'Sin verificar');
    }

    const ms = Date.now() - t0;
    console.log(`[Guias Envio] ${sucursal.nombre} -> ${destinoKeyword}: ${guias.length} guias en ${ms}ms`);

    res.json({
      guias,
      totales: {
        cantidad: guias.length,
        total: guias.reduce((s, g) => s + (g.total || 0), 0)
      },
      tiempo_ms: ms
    });
  } catch (error) {
    console.error('Error en getGuiasEnvio:', error);
    res.status(500).json({ message: 'Error al consultar guias de envio', error: error.message });
  }
};

// GET /api/guias/detalle?sucursalOrigenId=1&sucursalDestinoId=2&folio=12345
// Detalle de una guia: productos de la guia + productos del ajuste (si fue ingresada)
exports.getDetalleGuia = async (req, res) => {
  try {
    const { sucursalOrigenId, sucursalDestinoId, folio } = req.query;
    if (!sucursalOrigenId || !folio) {
      return res.status(400).json({ message: 'Se requiere sucursalOrigenId y folio' });
    }

    const sucursalOrigen = await obtenerSucursal(parseInt(sucursalOrigenId));
    if (!sucursalOrigen) return res.status(404).json({ message: 'Sucursal origen no encontrada' });

    let poolOrigen;
    try { poolOrigen = await getPoolSucursal(sucursalOrigen); }
    catch (err) { return res.status(503).json({ message: `No se pudo conectar a ${sucursalOrigen.nombre}`, error: err.message }); }

    // Productos de la guia (origen)
    const queryProductos = `
      SELECT MP_CODIGO_PRODUCTO AS codigo,
             BDEGC_DESCRIPCION_PRODUCTO AS producto,
             BDEGC_CANTIDAD AS cantidad,
             CONVERT(NUMERIC, BDEGC_PRECIO_FINAL) AS precio_unitario,
             CONVERT(NUMERIC, BDEGC_PRECIO_FINAL) * BDEGC_CANTIDAD AS total
      FROM ERP_BOD_DET_EMISION_GUIAS bdt
      JOIN ERP_BOD_RES_EMISION_GUIAS reg ON reg.BEGC_FOLIO_EGRESO_CLI = bdt.BEGC_FOLIO_EGRESO_CLI
      WHERE reg.BEGC_NUMERO_GUIA_CLI = @folio
    `;

    const resProductos = await poolOrigen.request()
      .input('folio', sql.VarChar, folio)
      .query(queryProductos);

    let ajuste = { fecha: null, observacion: null, cant_productos: 0, estado: 'No ingresada', productos: [] };

    // Verificar ajuste en destino
    if (sucursalDestinoId) {
      try {
        const sucursalDestino = await obtenerSucursal(parseInt(sucursalDestinoId));
        if (sucursalDestino) {
          const poolDestino = await getPoolSucursal(sucursalDestino);

          // Resumen del ajuste
          const queryAjusteResumen = `
            SELECT MAX(AJU_FECHA_INGRESO) AS fecha_ingreso,
                   AJU_OBSERVACION AS observacion,
                   SUM(sub.cant) AS cant_productos,
                   'Ingresado' AS estado
            FROM (
              SELECT AJU_FECHA_INGRESO, AJU_OBSERVACION,
                     COUNT(bda.MP_CODIGO_PRODUCTO) AS cant
              FROM ERP_BOD_RES_AJUSTES bra
              INNER JOIN ERP_BOD_DET_AJUSTES bda ON bda.AJU_ID_AJUSTE = bra.AJU_ID_AJUSTE
              WHERE AJU_OBSERVACION LIKE @folio AND DAJU_CANTIDAD <> 0
              GROUP BY AJU_FECHA_INGRESO, AJU_OBSERVACION
            ) sub
            GROUP BY AJU_OBSERVACION
          `;
          const resAjusteResumen = await poolDestino.request()
            .input('folio', sql.VarChar, '%' + folio + '%')
            .query(queryAjusteResumen);

          if (resAjusteResumen.recordset.length > 0) {
            const aj = resAjusteResumen.recordset[0];
            ajuste.fecha = aj.fecha_ingreso;
            ajuste.observacion = aj.observacion;
            ajuste.cant_productos = aj.cant_productos;
            ajuste.estado = 'Ingresada';

            // Detalle de productos del ajuste
            const queryAjusteDetalle = `
              SELECT bda.MP_CODIGO_PRODUCTO AS codigo,
                     bda.DAJU_DESCRIPCION_PRODUCTO AS producto,
                     bda.DAJU_CANTIDAD AS cantidad,
                     bda.DAJU_PRECIO AS precio
              FROM ERP_BOD_DET_AJUSTES bda
              JOIN ERP_BOD_RES_AJUSTES bra ON bra.AJU_ID_AJUSTE = bda.AJU_ID_AJUSTE
              WHERE bra.AJU_OBSERVACION LIKE @folio AND DAJU_CANTIDAD <> 0
            `;
            const resAjusteDetalle = await poolDestino.request()
              .input('folio', sql.VarChar, '%' + folio + '%')
              .query(queryAjusteDetalle);
            ajuste.productos = resAjusteDetalle.recordset;
          }
        }
      } catch (err) {
        ajuste.estado = 'Error verificando';
      }
    }

    res.json({
      folio,
      productos_guia: resProductos.recordset,
      ajuste
    });
  } catch (error) {
    console.error('Error en getDetalleGuia:', error);
    res.status(500).json({ message: 'Error al consultar detalle de guia', error: error.message });
  }
};

// GET /api/guias/emitidas?sucursalId=1&fechaDesde=2025-01-01&fechaHasta=2025-01-31
// Todas las guias emitidas desde la sucursal (excepto boletas)
exports.getGuiasEmitidas = async (req, res) => {
  try {
    const { sucursalId, fechaDesde, fechaHasta } = req.query;
    if (!sucursalId || !fechaDesde || !fechaHasta) {
      return res.status(400).json({ message: 'Se requiere sucursalId, fechaDesde y fechaHasta' });
    }

    const sucursal = await obtenerSucursal(parseInt(sucursalId));
    if (!sucursal) return res.status(404).json({ message: 'Sucursal no encontrada' });

    let poolSuc;
    try { poolSuc = await getPoolSucursal(sucursal); }
    catch (err) { return res.status(503).json({ message: `No se pudo conectar a ${sucursal.nombre}`, error: err.message }); }

    const t0 = Date.now();

    const query = `
      SELECT BEGC_NUMERO_GUIA_CLI AS folio,
             CAST(BREG.MC_RUT_CLIENTE AS NVARCHAR) + '-' + CAST(MPC.MC_DIGITO AS NVARCHAR) AS rut,
             MC_RAZON_SOCIAL AS cliente,
             BEGC_DIRECCION_DESTINO AS direccion,
             CONVERT(NUMERIC, BEGC_AFECTO) AS neto,
             CONVERT(NUMERIC, BEGC_IVA) AS iva,
             CONVERT(NUMERIC, BEGC_TOTAL) AS total,
             BEGC_OBSERVACION_SALIDA_DOC AS observacion,
             BEGC_FECHA_HORA_EMISION AS fecha
      FROM ERP_BOD_RES_EMISION_GUIAS BREG
      JOIN ERP_MAESTRO_CLIENTES MPC ON MPC.MC_RUT_CLIENTE = BREG.MC_RUT_CLIENTE
      WHERE MC_RAZON_SOCIAL <> 'CLIENTE FERRETERIA (BOLETAS)'
        AND BEGC_FECHA_HORA_EMISION BETWEEN @fechaDesde AND @fechaHasta
      ORDER BY BEGC_FECHA_HORA_EMISION DESC
    `;

    const result = await poolSuc.request()
      .input('fechaDesde', sql.VarChar, fechaDesde + ' 00:00:01')
      .input('fechaHasta', sql.VarChar, fechaHasta + ' 23:59:00')
      .query(query);

    const ms = Date.now() - t0;
    console.log(`[Guias Emitidas] ${sucursal.nombre}: ${result.recordset.length} guias en ${ms}ms`);

    res.json({
      guias: result.recordset,
      totales: {
        cantidad: result.recordset.length,
        total: result.recordset.reduce((s, g) => s + (g.total || 0), 0)
      },
      tiempo_ms: ms
    });
  } catch (error) {
    console.error('Error en getGuiasEmitidas:', error);
    res.status(500).json({ message: 'Error al consultar guias emitidas', error: error.message });
  }
};

// GET /api/guias/detalle-emitida?sucursalId=1&folio=12345
// Detalle de productos de una guia emitida
exports.getDetalleGuiaEmitida = async (req, res) => {
  try {
    const { sucursalId, folio } = req.query;
    if (!sucursalId || !folio) {
      return res.status(400).json({ message: 'Se requiere sucursalId y folio' });
    }

    const sucursal = await obtenerSucursal(parseInt(sucursalId));
    if (!sucursal) return res.status(404).json({ message: 'Sucursal no encontrada' });

    let poolSuc;
    try { poolSuc = await getPoolSucursal(sucursal); }
    catch (err) { return res.status(503).json({ message: `No se pudo conectar a ${sucursal.nombre}`, error: err.message }); }

    const query = `
      SELECT MP_CODIGO_PRODUCTO AS codigo,
             BDEGC_DESCRIPCION_PRODUCTO AS descripcion,
             BDEGC_CANTIDAD AS cantidad,
             CONVERT(NUMERIC, BDEGC_PRECIO_FINAL) AS precio_final,
             CONVERT(NUMERIC, BDEGC_TOTAL) AS total
      FROM ERP_BOD_DET_EMISION_GUIAS
      WHERE BEGC_FOLIO_EGRESO_CLI = @folio
    `;

    const result = await poolSuc.request()
      .input('folio', sql.VarChar, folio)
      .query(query);

    res.json({ productos: result.recordset });
  } catch (error) {
    console.error('Error en getDetalleGuiaEmitida:', error);
    res.status(500).json({ message: 'Error al consultar detalle', error: error.message });
  }
};

// GET /api/guias/centro-costos?sucursalId=1&fechaDesde=2025-01-01&fechaHasta=2025-01-31
// Lista de clientes/direcciones con guías emitidas (Producto Direccion.vb → mostrar_dtg_empresa)
exports.getCentroCostos = async (req, res) => {
  try {
    const { sucursalId, fechaDesde, fechaHasta } = req.query;
    if (!sucursalId || !fechaDesde || !fechaHasta) {
      return res.status(400).json({ message: 'Se requiere sucursalId, fechaDesde y fechaHasta' });
    }

    const sucursal = await obtenerSucursal(parseInt(sucursalId));
    if (!sucursal) return res.status(404).json({ message: 'Sucursal no encontrada' });

    let poolSuc;
    try { poolSuc = await getPoolSucursal(sucursal); }
    catch (err) { return res.status(503).json({ message: `No se pudo conectar a ${sucursal.nombre}`, error: err.message }); }

    const t0 = Date.now();

    const result = await poolSuc.request()
      .input('fechaDesde', sql.VarChar, fechaDesde + ' 00:00:01')
      .input('fechaHasta', sql.VarChar, fechaHasta + ' 23:59:00')
      .query(`
        SELECT DISTINCT
          CAST(MC.MC_RUT_CLIENTE AS NVARCHAR) + '-' + CAST(MC.MC_DIGITO AS NVARCHAR) AS rut,
          MC.MC_RAZON_SOCIAL AS razon_social,
          BREG.BEGC_DIRECCION_DESTINO AS direccion
        FROM ERP_BOD_RES_EMISION_GUIAS BREG
        FULL JOIN ERP_MAESTRO_CLIENTES MC ON MC.MC_RUT_CLIENTE = BREG.MC_RUT_CLIENTE
        WHERE MC.MC_RUT_CLIENTE <> '1'
          AND MC.MC_RUT_CLIENTE IS NOT NULL
          AND BREG.BEGC_DIRECCION_DESTINO IS NOT NULL
          AND BREG.BEGC_FECHA_HORA_EMISION BETWEEN @fechaDesde AND @fechaHasta
        ORDER BY MC.MC_RAZON_SOCIAL
      `);

    const ms = Date.now() - t0;
    console.log(`[Centro Costos] ${sucursal.nombre}: ${result.recordset.length} clientes en ${ms}ms`);
    res.json({ clientes: result.recordset, tiempo_ms: ms });
  } catch (error) {
    console.error('Error en getCentroCostos:', error);
    res.status(500).json({ message: 'Error al consultar centro de costos', error: error.message });
  }
};

// GET /api/guias/centro-costos-detalle?sucursalId=1&direccion=...&fechaDesde=...&fechaHasta=...
// Productos por dirección/centro de costos (Producto Direccion.vb → gridView1_DoubleClick)
exports.getCentroCostosDetalle = async (req, res) => {
  try {
    const { sucursalId, direccion, fechaDesde, fechaHasta } = req.query;
    if (!sucursalId || !direccion || !fechaDesde || !fechaHasta) {
      return res.status(400).json({ message: 'Se requiere sucursalId, direccion, fechaDesde y fechaHasta' });
    }

    const sucursal = await obtenerSucursal(parseInt(sucursalId));
    if (!sucursal) return res.status(404).json({ message: 'Sucursal no encontrada' });

    let poolSuc;
    try { poolSuc = await getPoolSucursal(sucursal); }
    catch (err) { return res.status(503).json({ message: `No se pudo conectar a ${sucursal.nombre}`, error: err.message }); }

    const t0 = Date.now();

    const result = await poolSuc.request()
      .input('direccion', sql.NVarChar, direccion)
      .input('fechaDesde', sql.VarChar, fechaDesde + ' 00:00:01')
      .input('fechaHasta', sql.VarChar, fechaHasta + ' 23:59:00')
      .query(`
        SELECT
          BREG.BEGC_NUMERO_GUIA_CLI AS folio,
          MP.MP_CODIGO_PRODUCTO      AS codigo,
          MP.MP_DESCRIPCION_PRODUCTO AS descripcion,
          SUM(BDEG.BDEGC_CANTIDAD)   AS cantidad,
          SUM(BDEG.BDEGC_TOTAL)      AS valor,
          BREG.BEGC_DIRECCION_DESTINO AS direccion,
          MP.MP_MEDIDA               AS familia,
          CONVERT(VARCHAR(10), BREG.BEGC_FECHA_HORA_EMISION, 103) AS fecha_emision
        FROM ERP_BOD_DET_EMISION_GUIAS BDEG
        JOIN ERP_BOD_RES_EMISION_GUIAS BREG
          ON BDEG.BEGC_FOLIO_EGRESO_CLI = BREG.BEGC_FOLIO_EGRESO_CLI
        JOIN ERP_MAESTRO_PRODUCTOS MP
          ON MP.MP_CODIGO_PRODUCTO = BDEG.MP_CODIGO_PRODUCTO
        WHERE BREG.BEGC_DIRECCION_DESTINO = @direccion
          AND MP.TPROV_ID_TIPO_PROVEEDOR = 3
          AND EP_ID_ESTADO = 2
          AND BREG.BEGC_FECHA_HORA_EMISION BETWEEN @fechaDesde AND @fechaHasta
        GROUP BY
          MP.MP_CODIGO_PRODUCTO, MP.MP_DESCRIPCION_PRODUCTO,
          BREG.BEGC_DIRECCION_DESTINO,
          CONVERT(VARCHAR(10), BREG.BEGC_FECHA_HORA_EMISION, 103),
          MP.MP_MEDIDA, BREG.BEGC_NUMERO_GUIA_CLI
        ORDER BY MP.MP_DESCRIPCION_PRODUCTO ASC
      `);

    const ms = Date.now() - t0;
    console.log(`[Centro Costos Detalle] ${sucursal.nombre} / ${direccion}: ${result.recordset.length} productos en ${ms}ms`);
    res.json({ productos: result.recordset, tiempo_ms: ms });
  } catch (error) {
    console.error('Error en getCentroCostosDetalle:', error);
    res.status(500).json({ message: 'Error al consultar detalle centro costos', error: error.message });
  }
};
