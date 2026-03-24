// backend/controllers/monitorOrdenesController.js - Monitor Órdenes de Compra (migrado de VB.NET)
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

const obtenerTodasSucursales = async () => {
  const pool = await poolPromise;
  const result = await pool.request()
    .query(`
      SELECT id, nombre, ip, base_datos, usuario, contrasena, tipo_sucursal, puerto
      FROM sucursales
      WHERE tipo_sucursal IN ('FERRETERIA', 'MULTITIENDA')
        AND ip IS NOT NULL AND ip <> ''
      ORDER BY nombre
    `);
  return result.recordset;
};

// ============ ENDPOINTS ============

// GET /api/monitor-ordenes/sucursales
exports.getSucursales = async (req, res) => {
  try {
    const pool = await poolPromise;
    const perfilId = req.user?.perfilId;

    console.log('[MonitorOrdenes] getSucursales - usuario:', req.user);

    if (!perfilId) {
      console.log('[MonitorOrdenes] Token sin perfilId - requiere re-login');
      return res.status(401).json({
        message: 'Sesion expirada - por favor inicie sesion nuevamente',
        requiresRelogin: true
      });
    }

    // Obtener ID del modulo "MonitorOrdenes"
    const moduloResult = await pool.request()
      .input('nombre', sql.VarChar, 'MonitorOrdenes')
      .query('SELECT id FROM modulos WHERE nombre = @nombre');

    if (moduloResult.recordset.length === 0) {
      // Si no existe el modulo, devolver todas las sucursales del tipo correcto
      console.log('[MonitorOrdenes] Modulo MonitorOrdenes no encontrado, devolviendo todas las sucursales');
      const result = await pool.request()
        .query(`
          SELECT DISTINCT s.id, s.nombre, s.tipo_sucursal
          FROM sucursales s
          WHERE s.tipo_sucursal IN ('FERRETERIA', 'MULTITIENDA')
            AND s.ip IS NOT NULL AND s.ip <> ''
          ORDER BY s.nombre
        `);
      return res.json(result.recordset);
    }

    const moduloId = moduloResult.recordset[0].id;

    // Obtener sucursales permitidas para este perfil y modulo
    const result = await pool.request()
      .input('perfilId', sql.Int, perfilId)
      .input('moduloId', sql.Int, moduloId)
      .query(`
        SELECT DISTINCT s.id, s.nombre, s.tipo_sucursal
        FROM sucursales s
        INNER JOIN perfil_modulo_sucursal pms ON pms.sucursal_id = s.id
        WHERE pms.perfil_id = @perfilId
          AND pms.modulo_id = @moduloId
          AND s.tipo_sucursal IN ('FERRETERIA', 'MULTITIENDA')
          AND s.ip IS NOT NULL AND s.ip <> ''
        ORDER BY s.nombre
      `);

    console.log(`[MonitorOrdenes] Usuario con perfil ${perfilId} tiene acceso a ${result.recordset.length} sucursales`);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error en getSucursales (MonitorOrdenes):', error);
    res.status(500).json({ message: 'Error al obtener sucursales', error: error.message });
  }
};

// GET /api/monitor-ordenes/ordenes?sucursalId=&fechaDesde=&fechaHasta=
exports.getOrdenes = async (req, res) => {
  try {
    const sucursalId = parseInt(req.query.sucursalId);
    const fechaDesde = req.query.fechaDesde;
    const fechaHasta = req.query.fechaHasta;

    if (!sucursalId || !fechaDesde || !fechaHasta) {
      return res.status(400).json({ message: 'Se requiere sucursalId, fechaDesde y fechaHasta' });
    }

    const sucursal = await obtenerSucursal(sucursalId);
    if (!sucursal) return res.status(404).json({ message: 'Sucursal no encontrada' });

    let poolSucursal;
    try { poolSucursal = await getPoolSucursal(sucursal); }
    catch (err) { return res.status(503).json({ message: `No se pudo conectar a ${sucursal.nombre}`, error: err.message }); }

    const t0 = Date.now();

    const queryOrdenes = `
      SELECT
          rig.BIGP_FOLIO_INGRESO_PROVEEDOR AS folio_ingreso,
          roc.ROC_NUMERO_ORDEN AS nro_oc,
          rig.BIGP_NUMERO_GUIA_PROVEEDOR AS nro_guia,
          TPR.TPROV_DESCRIPCION_TIPO_PROV AS tipo_proveedor,
          rig.BIGP_AFECTO AS afecto,
          rig.BIGP_IVA AS iva,
          rig.BIGP_TOTAL AS total,
          roc.ROC_FECHA_INGRESO AS fecha_creacion,
          rig.BIGP_FECHA_HORA_RECEPCION_BODEGA AS fecha_recepcion,
          (SELECT TOP 1 MP.MPR_RAZON_SOCIAL FROM ERP_MAESTRO_PROVEEDORES MP WHERE MP.MPR_RUT_PROVEEDOR = rig.MPR_RUT_PROVEEDOR) AS proveedor,
          STUFF((SELECT ', ' + CAST(pcod.PCOD_PLAZO AS VARCHAR) FROM ERP_PLAZOS_CONDICIONES pcod WHERE pcod.CP_ID_CONDICION_PAGO = CON.CP_ID_CONDICION_PAGO FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS plazos_dias,
          STUFF((SELECT ' / ' + CONVERT(VARCHAR(10), DATEADD(DAY, pcod.PCOD_PLAZO, rig.BIGP_FECHA_HORA_RECEPCION_BODEGA), 120) FROM ERP_PLAZOS_CONDICIONES pcod WHERE pcod.CP_ID_CONDICION_PAGO = CON.CP_ID_CONDICION_PAGO FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 3, '') AS fechas_vencimiento,
          (SELECT TOP 1 MP.MPE_NOMBRE_COMPLETO + ' ' + MP.MPE_APELLIDO_PATERNO + ' ' + MP.MPE_APELLIDO_MATERNO FROM ERP_MAESTRO_PERSONAS MP WHERE MP.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA) AS usuario,
          eie.BEINGE_DESCRIPCION_ESTADO AS estado
      FROM ERP_BOD_RES_INGRESO_GUIAS rig
      JOIN ERP_OP_RES_ORDEN_COMPRA roc ON rig.ROC_NUMERO_ORDEN = roc.ROC_NUMERO_ORDEN
      JOIN ERP_BOD_ESTADO_INGRESO_EGRESO eie ON eie.BEINGE_ID_ESTADO_INGRESO_EGRESO = rig.BEINGE_ID_ESTADO_INGRESO_EGRESO
      JOIN ERP_USUARIOS_SISTEMAS us ON us.US_ID_USUARIO_SISTEMA = rig.US_ID_USUARIO_SISTEMA
      JOIN ERP_TIPO_PROVEEDOR TPR ON TPR.TPROV_ID_TIPO_PROVEEDOR = rig.TPROV_ID_TIPO_PROVEEDOR
      JOIN ERP_CONDICIONES_PAGO CON ON CON.CP_ID_CONDICION_PAGO = ROC.CP_ID_CONDICION_PAGO
      JOIN ERP_OP_PROCEDENCIA_ORDEN PRO ON PRO.OPOR_ID_PROCEDENCIA_ORDEN = ROC.OPOR_ID_PROCEDENCIA_ORDEN
      WHERE rig.BIGP_FECHA_HORA_RECEPCION_BODEGA BETWEEN @fechaDesde AND @fechaHasta
      ORDER BY rig.BIGP_FECHA_HORA_RECEPCION_BODEGA DESC
    `;

    const queryProductos = `
      SELECT
          MP_CODIGO_PRODUCTO AS codigo,
          BDIGP_DESCRIPCION_PRODUCTO AS descripcion,
          BDIGP_UNIDAD AS unidad,
          BDIGP_CANTIDAD AS cantidad,
          BDIGP_PRECIO_FINAL AS valor_unitario,
          BDIGP_TOTAL AS total,
          BIGP_FOLIO_INGRESO_PROVEEDOR AS folio_ingreso
      FROM ERP_BOD_DET_INGRESO_GUIAS
      WHERE BIGP_FOLIO_INGRESO_PROVEEDOR IN (
          SELECT rig.BIGP_FOLIO_INGRESO_PROVEEDOR
          FROM ERP_BOD_RES_INGRESO_GUIAS rig
          WHERE rig.BIGP_FECHA_HORA_RECEPCION_BODEGA BETWEEN @fechaDesde AND @fechaHasta
      )
    `;

    const [resOrdenes, resProductos] = await Promise.all([
      poolSucursal.request()
        .input('fechaDesde', sql.VarChar, fechaDesde + ' 00:00:00')
        .input('fechaHasta', sql.VarChar, fechaHasta + ' 23:59:59')
        .query(queryOrdenes),
      poolSucursal.request()
        .input('fechaDesde', sql.VarChar, fechaDesde + ' 00:00:00')
        .input('fechaHasta', sql.VarChar, fechaHasta + ' 23:59:59')
        .query(queryProductos)
    ]);

    const ms = Date.now() - t0;
    console.log(`[MonitorOrdenes] ${sucursal.nombre}: ${resOrdenes.recordset.length} ordenes, ${resProductos.recordset.length} productos en ${ms}ms`);

    res.json({
      ordenes: resOrdenes.recordset,
      productos: resProductos.recordset,
      tiempo_ms: ms
    });
  } catch (error) {
    console.error('Error en getOrdenes:', error);
    res.status(500).json({ message: 'Error al consultar ordenes', error: error.message });
  }
};

// GET /api/monitor-ordenes/consolidado?sucursalId=&fechaDesde=&fechaHasta=
exports.getConsolidado = async (req, res) => {
  try {
    const sucursalId = parseInt(req.query.sucursalId);
    const fechaDesde = req.query.fechaDesde;
    const fechaHasta = req.query.fechaHasta;

    if (!sucursalId || !fechaDesde || !fechaHasta) {
      return res.status(400).json({ message: 'Se requiere sucursalId, fechaDesde y fechaHasta' });
    }

    const sucursal = await obtenerSucursal(sucursalId);
    if (!sucursal) return res.status(404).json({ message: 'Sucursal no encontrada' });

    let poolSucursal;
    try { poolSucursal = await getPoolSucursal(sucursal); }
    catch (err) { return res.status(503).json({ message: `No se pudo conectar a ${sucursal.nombre}`, error: err.message }); }

    const t0 = Date.now();

    const queryConsolidado = `
      WITH PlazosPorCondicion AS (
          SELECT CP_ID_CONDICION_PAGO, COUNT(*) AS CantidadPlazos
          FROM ERP_PLAZOS_CONDICIONES
          GROUP BY CP_ID_CONDICION_PAGO
      )
      SELECT
          rig.BIGP_FOLIO_INGRESO_PROVEEDOR AS folio_ingreso,
          roc.ROC_NUMERO_ORDEN AS nro_oc,
          rig.BIGP_NUMERO_GUIA_PROVEEDOR AS nro_guia,
          TPR.TPROV_DESCRIPCION_TIPO_PROV AS tipo_proveedor,
          ROUND(rig.BIGP_AFECTO / CAST(ppc.CantidadPlazos AS FLOAT), 0) AS afecto,
          ROUND(rig.BIGP_IVA / CAST(ppc.CantidadPlazos AS FLOAT), 0) AS iva,
          ROUND(rig.BIGP_TOTAL / CAST(ppc.CantidadPlazos AS FLOAT), 0) AS total,
          roc.ROC_FECHA_INGRESO AS fecha_creacion,
          rig.BIGP_FECHA_HORA_RECEPCION_BODEGA AS fecha_recepcion,
          (SELECT TOP 1 MP.MPR_RAZON_SOCIAL FROM ERP_MAESTRO_PROVEEDORES MP WHERE MP.MPR_RUT_PROVEEDOR = rig.MPR_RUT_PROVEEDOR) AS proveedor,
          co.PCOD_PLAZO AS plazo_dias,
          DATEADD(DAY, co.PCOD_PLAZO, rig.BIGP_FECHA_HORA_RECEPCION_BODEGA) AS fecha_vencimiento,
          (SELECT TOP 1 MP.MPE_NOMBRE_COMPLETO + ' ' + MP.MPE_APELLIDO_PATERNO + ' ' + MP.MPE_APELLIDO_MATERNO FROM ERP_MAESTRO_PERSONAS MP WHERE MP.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA) AS usuario,
          eie.BEINGE_DESCRIPCION_ESTADO AS estado,
          DATEPART(YEAR, DATEADD(DAY, co.PCOD_PLAZO, rig.BIGP_FECHA_HORA_RECEPCION_BODEGA)) AS anio,
          DATEPART(ISO_WEEK, DATEADD(DAY, co.PCOD_PLAZO, rig.BIGP_FECHA_HORA_RECEPCION_BODEGA)) AS semana
      FROM ERP_BOD_RES_INGRESO_GUIAS rig
      JOIN ERP_OP_RES_ORDEN_COMPRA roc ON rig.ROC_NUMERO_ORDEN = roc.ROC_NUMERO_ORDEN
      JOIN ERP_BOD_ESTADO_INGRESO_EGRESO eie ON eie.BEINGE_ID_ESTADO_INGRESO_EGRESO = rig.BEINGE_ID_ESTADO_INGRESO_EGRESO
      JOIN ERP_USUARIOS_SISTEMAS us ON us.US_ID_USUARIO_SISTEMA = rig.US_ID_USUARIO_SISTEMA
      JOIN ERP_TIPO_PROVEEDOR TPR ON TPR.TPROV_ID_TIPO_PROVEEDOR = rig.TPROV_ID_TIPO_PROVEEDOR
      JOIN ERP_CONDICIONES_PAGO CON ON CON.CP_ID_CONDICION_PAGO = ROC.CP_ID_CONDICION_PAGO
      JOIN ERP_OP_PROCEDENCIA_ORDEN PRO ON PRO.OPOR_ID_PROCEDENCIA_ORDEN = ROC.OPOR_ID_PROCEDENCIA_ORDEN
      JOIN ERP_PLAZOS_CONDICIONES CO ON CO.CP_ID_CONDICION_PAGO = CON.CP_ID_CONDICION_PAGO
      JOIN PlazosPorCondicion ppc ON ppc.CP_ID_CONDICION_PAGO = CON.CP_ID_CONDICION_PAGO
      WHERE DATEADD(DAY, co.PCOD_PLAZO, rig.BIGP_FECHA_HORA_RECEPCION_BODEGA) BETWEEN @fechaDesde AND @fechaHasta
          AND eie.BEINGE_DESCRIPCION_ESTADO = 'VIGENTE'
      ORDER BY anio, semana, rig.BIGP_FOLIO_INGRESO_PROVEEDOR
    `;

    const resConsolidado = await poolSucursal.request()
      .input('fechaDesde', sql.VarChar, fechaDesde + ' 00:00:00')
      .input('fechaHasta', sql.VarChar, fechaHasta + ' 23:59:59')
      .query(queryConsolidado);

    const ms = Date.now() - t0;
    console.log(`[MonitorOrdenes] Consolidado ${sucursal.nombre}: ${resConsolidado.recordset.length} filas en ${ms}ms`);

    res.json({
      filas: resConsolidado.recordset,
      tiempo_ms: ms
    });
  } catch (error) {
    console.error('Error en getConsolidado:', error);
    res.status(500).json({ message: 'Error al consultar consolidado', error: error.message });
  }
};

// GET /api/monitor-ordenes/monitor-central?fechaDesde=&fechaHasta=
exports.getMonitorCentral = async (req, res) => {
  // Timeout extendido para este endpoint
  req.setTimeout && req.setTimeout(180000);
  res.setTimeout && res.setTimeout(180000);

  try {
    const fechaDesde = req.query.fechaDesde;
    const fechaHasta = req.query.fechaHasta;

    if (!fechaDesde || !fechaHasta) {
      return res.status(400).json({ message: 'Se requiere fechaDesde y fechaHasta' });
    }

    const t0 = Date.now();

    // Obtener todas las sucursales
    const todasSucursales = await obtenerTodasSucursales();
    console.log(`[MonitorCentral] Consultando ${todasSucursales.length} sucursales en paralelo...`);

    const queryOC = `
      SELECT DISTINCT
          CAST(roc.ROC_NUMERO_ORDEN AS NVARCHAR(50)) AS nro_oc,
          roc.MPR_RUT_PROVEEDOR AS rut_proveedor,
          roc.ROC_NETO AS neto,
          roc.ROC_IVA AS iva,
          roc.ROC_TOTAL AS total,
          roc.ROC_FECHA_INGRESO AS fecha
      FROM ERP_OP_RES_ORDEN_COMPRA roc
      WHERE roc.MC_RUT_CLIENTE = '76236893'
          AND roc.MPR_RUT_PROVEEDOR <> '76236893'
          AND roc.ROC_FECHA_INGRESO BETWEEN @desde AND @hasta
    `;

    const queryVerificarIngreso = `
      SELECT TOP 1 BIGP_FOLIO_INGRESO_PROVEEDOR FROM ERP_BOD_RES_INGRESO_GUIAS WHERE ROC_NUMERO_ORDEN = @nroOC
    `;

    // Consultar OC en todas las sucursales en paralelo
    const resultadosPorSucursal = await Promise.allSettled(
      todasSucursales.map(async (sucursal) => {
        try {
          const pool = await Promise.race([
            getPoolSucursal(sucursal),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout conexion')), 12000))
          ]);

          const resOC = await pool.request()
            .input('desde', sql.VarChar, fechaDesde + ' 00:00:00')
            .input('hasta', sql.VarChar, fechaHasta + ' 23:59:59')
            .query(queryOC);

          return {
            sucursal: sucursal.nombre,
            sucursalId: sucursal.id,
            ocs: resOC.recordset
          };
        } catch (err) {
          console.warn(`[MonitorCentral] Error en sucursal ${sucursal.nombre}: ${err.message}`);
          return { sucursal: sucursal.nombre, sucursalId: sucursal.id, ocs: [], error: err.message };
        }
      })
    );

    // Recopilar todas las OC encontradas
    const ocsPorNumero = new Map();

    for (const resultado of resultadosPorSucursal) {
      if (resultado.status === 'fulfilled' && resultado.value.ocs.length > 0) {
        const { sucursal, ocs } = resultado.value;
        for (const oc of ocs) {
          if (!ocsPorNumero.has(oc.nro_oc)) {
            ocsPorNumero.set(oc.nro_oc, { ...oc, sucursal_origen: sucursal });
          }
        }
      }
    }

    const todasOCs = Array.from(ocsPorNumero.values());
    console.log(`[MonitorCentral] Total OC inter-sucursales encontradas: ${todasOCs.length}`);

    // Para cada OC, verificar en todas las sucursales si fue ingresada
    const ocsConEstado = await Promise.all(
      todasOCs.map(async (oc) => {
        let ingresadaEn = 0;

        const verificaciones = await Promise.allSettled(
          todasSucursales.map(async (sucursal) => {
            try {
              const pool = await getPoolSucursal(sucursal);
              const res = await pool.request()
                .input('nroOC', sql.NVarChar, oc.nro_oc)
                .query(queryVerificarIngreso);
              return res.recordset.length > 0;
            } catch {
              return false;
            }
          })
        );

        for (const v of verificaciones) {
          if (v.status === 'fulfilled' && v.value === true) {
            ingresadaEn++;
          }
        }

        let estado_ingreso;
        if (ingresadaEn === 0) {
          estado_ingreso = 'PENDIENTE';
        } else if (ingresadaEn >= todasSucursales.length) {
          estado_ingreso = 'INGRESADA';
        } else {
          estado_ingreso = 'PARCIAL';
        }

        return { ...oc, estado_ingreso, ingresada_en: ingresadaEn };
      })
    );

    const ms = Date.now() - t0;
    console.log(`[MonitorCentral] Completado: ${ocsConEstado.length} OC procesadas en ${ms}ms`);

    res.json({
      ocs: ocsConEstado,
      tiempo_ms: ms,
      sucursales_consultadas: todasSucursales.length
    });
  } catch (error) {
    console.error('Error en getMonitorCentral:', error);
    res.status(500).json({ message: 'Error al consultar monitor central', error: error.message });
  }
};
