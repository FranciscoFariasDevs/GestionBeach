// backend/controllers/dashboardController.js - PARALELO con Promise.allSettled
const { sql, poolPromise } = require('../config/db');

exports.getDashboardData = async (req, res) => {
  try {
    const start_date = req.body.start_date || req.query.startDate || req.query.start_date;
    const end_date   = req.body.end_date   || req.query.endDate   || req.query.end_date;

    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'Las fechas son requeridas' });
    }

    const pool = await poolPromise;

    const sucursalesResult = await pool.request().query(`
      SELECT id, nombre, ip, base_datos, usuario, contrasena, tipo_sucursal, puerto
      FROM sucursales
      WHERE tipo_sucursal IN ('SUPERMERCADO', 'FERRETERIA', 'MULTITIENDA')
      ORDER BY id
    `);

    const sucursales = sucursalesResult.recordset;
    console.log(`Dashboard: procesando ${sucursales.length} sucursales en paralelo`);

    // ── Procesar TODAS las sucursales en paralelo ─────────────────────────────
    const promesas = sucursales.map(sucursal => procesarSucursal(sucursal, start_date, end_date));
    const resultados = await Promise.allSettled(promesas);

    // ── Agregar resultados ────────────────────────────────────────────────────
    const acumulado = {
      supermercados: { ventas: 0, costos: 0, utilidad: 0, margen: 0, notasCredito: 0, ventasNetas: 0, sucursales: [], _count: 0 },
      ferreterias:   { ventas: 0, costos: 0, utilidad: 0, margen: 0, notasCredito: 0, ventasNetas: 0, sucursales: [], _count: 0 },
      multitiendas:  { ventas: 0, costos: 0, utilidad: 0, margen: 0, notasCredito: 0, ventasNetas: 0, sucursales: [], _count: 0 },
    };

    for (const r of resultados) {
      if (r.status !== 'fulfilled' || !r.value) continue;
      const { tipo, nombre, ventas, costos, utilidad, margen, notasCredito, ventasNetas } = r.value;
      const grupo = acumulado[tipo];
      if (!grupo) continue;
      grupo.ventas       += ventas;
      grupo.costos       += costos;
      grupo.utilidad     += utilidad;
      grupo.margen       += margen;
      grupo.notasCredito += notasCredito;
      grupo.ventasNetas  += ventasNetas;
      grupo._count++;
      grupo.sucursales.push({ nombre, ventas, costos, utilidad, margen, notasCredito, ventasNetas });
    }

    // Promediar márgenes
    for (const grupo of Object.values(acumulado)) {
      if (grupo._count > 0) grupo.margen /= grupo._count;
      delete grupo._count;
    }

    const total = {
      ventas:       acumulado.supermercados.ventas + acumulado.ferreterias.ventas + acumulado.multitiendas.ventas,
      costos:       acumulado.supermercados.costos + acumulado.ferreterias.costos + acumulado.multitiendas.costos,
      utilidad:     acumulado.supermercados.utilidad + acumulado.ferreterias.utilidad + acumulado.multitiendas.utilidad,
      notasCredito: acumulado.supermercados.notasCredito + acumulado.ferreterias.notasCredito + acumulado.multitiendas.notasCredito,
      ventasNetas:  0,
      margen:       0,
    };
    total.ventasNetas = total.ventas - total.notasCredito;

    const exitosos = resultados.filter(r => r.status === 'fulfilled' && r.value).length;
    if (exitosos > 0) {
      const supers = acumulado.supermercados.sucursales.length;
      const ferret = acumulado.ferreterias.sucursales.length;
      const multi  = acumulado.multitiendas.sucursales.length;
      const totalN = supers + ferret + multi;
      if (totalN > 0) {
        total.margen = (
          (acumulado.supermercados.margen * supers) +
          (acumulado.ferreterias.margen   * ferret) +
          (acumulado.multitiendas.margen  * multi)
        ) / totalN;
      }
    }

    console.log(`Dashboard completado: ${exitosos}/${sucursales.length} sucursales OK`);
    return res.status(200).json({ ...acumulado, total });

  } catch (error) {
    console.error('Error dashboard:', error);
    const vacio = { ventas: 0, costos: 0, utilidad: 0, margen: 0, notasCredito: 0, ventasNetas: 0, sucursales: [] };
    return res.status(200).json({
      supermercados: vacio, ferreterias: vacio, multitiendas: vacio,
      total: { ...vacio, sucursales: undefined },
      message: 'Datos parciales por problemas de conexión',
    });
  }
};

// ── Conectar + procesar una sucursal (devuelve datos o null) ──────────────────
async function procesarSucursal(sucursal, start_date, end_date) {
  if (!sucursal.ip || !sucursal.base_datos || !sucursal.usuario) return null;

  const config = {
    user: sucursal.usuario,
    password: sucursal.contrasena || '',
    server: sucursal.ip,
    port: sucursal.puerto,
    database: sucursal.base_datos,
    options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true, requestTimeout: 3000, connectionTimeout: 2000 },
    pool: { max: 1, min: 0, idleTimeoutMillis: 5000 },
  };

  let poolSucursal;
  try {
    poolSucursal = await Promise.race([
      new sql.ConnectionPool(config).connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout conexión')), 1500)),
    ]);
  } catch {
    console.warn(`${sucursal.nombre}: sin conexión`);
    return null;
  }

  try {
    let datos = null;
    const tipo = sucursal.tipo_sucursal.toLowerCase() + 's'; // SUPERMERCADO→supermercados
    const tipoKey = sucursal.tipo_sucursal;

    const queryPromise = tipoKey === 'SUPERMERCADO'
      ? querySupermercado(poolSucursal, sucursal, start_date, end_date)
      : queryFerreteria(poolSucursal, sucursal, start_date, end_date);   // mismo para FERRETERIA y MULTITIENDA

    datos = await Promise.race([
      queryPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 3000)),
    ]);

    return datos ? { tipo, ...datos } : null;
  } catch (err) {
    console.warn(`${sucursal.nombre}: ${err.message}`);
    return null;
  } finally {
    try { await poolSucursal.close(); } catch {}
  }
}

// ── Query Supermercado ────────────────────────────────────────────────────────
async function querySupermercado(pool, sucursal, startDate, endDate) {
  const queryVentas = `
    SELECT
      SUM(CASE
        WHEN tde.dc_codigo_centralizacion IN ('0039','0033') THEN (tdd.dq_bruto / 1.19)
        WHEN tde.dc_codigo_centralizacion = '1599' THEN tdd.dq_bruto
      END) AS VENTA,
      SUM(CASE
        WHEN tde.dc_codigo_centralizacion IN ('0039','0033') THEN (tdd.dq_bruto / 1.19) - dq_ganancia
        WHEN tde.dc_codigo_centralizacion = '1599' THEN tdd.dq_bruto - dq_ganancia
      END) AS COSTO,
      SUM(dq_ganancia) AS UTILIDAD,
      AVG(CASE
        WHEN tde.dc_codigo_centralizacion IN ('0039','0033') THEN (dq_ganancia / (tdd.dq_bruto / 1.19)) * 100
        WHEN tde.dc_codigo_centralizacion = '1599' THEN (dq_ganancia / tdd.dq_bruto) * 100
      END) AS MARGEN
    FROM tb_documentos_detalle tdd
    JOIN tb_documentos_encabezado tde ON tdd.dn_correlativo_documento = tde.dn_correlativo
    WHERE CAST(df_fecha_emision AS DATE) BETWEEN @startDate AND @endDate
      AND dc_codigo_centralizacion IN ('0033','0039','1599')
      AND tde.dc_rut_documento NOT IN('010.429.345-K','076.236.893-5','076.775.326-8','078.061.914-7')
      AND dn_correlativo_caja IS NOT NULL
  `;
  const queryNC = `
    SELECT SUM(CASE WHEN tde.dc_codigo_centralizacion = '0061' THEN (tdd.dq_bruto / 1.19) END) AS NotasCredito
    FROM tb_documentos_detalle tdd
    JOIN tb_documentos_encabezado tde ON tdd.dn_correlativo_documento = tde.dn_correlativo
    WHERE CAST(df_fecha_emision AS DATE) BETWEEN @startDate AND @endDate
      AND dc_codigo_centralizacion IN ('0061')
      AND tde.dc_rut_documento NOT IN('010.429.345-K','076.236.893-5','076.775.326-8','078.061.914-7')
      AND dn_correlativo_caja IS NOT NULL
  `;

  const [rVentas, rNC] = await Promise.all([
    pool.request().input('startDate', sql.Date, new Date(startDate)).input('endDate', sql.Date, new Date(endDate)).query(queryVentas),
    pool.request().input('startDate', sql.Date, new Date(startDate)).input('endDate', sql.Date, new Date(endDate)).query(queryNC),
  ]);

  if (!rVentas.recordset.length) return null;
  const d   = rVentas.recordset[0];
  const dNC = rNC.recordset[0] || {};

  const ventasBrutas = parseFloat(d.VENTA) || 0;
  const costosBrutos = parseFloat(d.COSTO) || 0;
  const utilidadBruta= parseFloat(d.UTILIDAD) || 0;
  const margen       = parseFloat(d.MARGEN) || 0;
  const notasCredito = parseFloat(dNC.NotasCredito) || 0;
  const propNC = ventasBrutas > 0 ? notasCredito / ventasBrutas : 0;

  return {
    nombre:       sucursal.nombre,
    ventas:       ventasBrutas - notasCredito,
    costos:       costosBrutos - costosBrutos * propNC,
    utilidad:     utilidadBruta - utilidadBruta * propNC,
    margen,
    notasCredito,
    ventasNetas:  ventasBrutas - notasCredito,
  };
}

// ── Query Ferretería / Multitienda (misma estructura ERP) ─────────────────────
async function queryFerreteria(pool, sucursal, startDate, endDate) {
  const queryVentas = `
    SELECT sum(Total) Venta, sum(Costo) COSTO, sum(Utilidad) Utilidad, (sum(Utilidad)/sum(Total))*100 Margen
    FROM (
      select RBO.RBO_FECHA_INGRESO Fecha, RBO.RBO_NUMERO_BOLETA Folio, 'Boleta' as Doc,
        MC.MC_RAZON_SOCIAL as Cliente, CAST(rbo.MC_RUT_CLIENTE AS nvarchar)+'-'+CAST(MC.MC_DIGITO AS NVARCHAR) as Rut_Cliente,
        sum(ISNULL(DBOL_PRECIO_LISTA,0)*DBOL_CANTIDAD) as Total,
        sum(ISNULL(MP_COSTO_FINAL,0)*DBOL_CANTIDAD) as Costo,
        sum(ISNULL(DBOL_PRECIO_LISTA,0)*DBOL_CANTIDAD)-sum(ISNULL(MP_COSTO_FINAL,0)*DBOL_CANTIDAD) as Utilidad,
        ((sum(ISNULL(DBOL_PRECIO_LISTA,0)*DBOL_CANTIDAD)-sum(ISNULL(MP_COSTO_FINAL,0)*DBOL_CANTIDAD))/sum(ISNULL(DBOL_PRECIO_LISTA,0)*DBOL_CANTIDAD))*100 as Margen,
        MPE.MPE_NOMBRE_COMPLETO as Vendedor
      from ERP_FACT_RES_BOLETAS rbo
      JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON RBO.ROC_NUMERO_ORDEN=ROC.ROC_NUMERO_ORDEN
      JOIN ERP_FACT_DET_BOLETAS DBO ON DBO.RBO_NUM_INTERNO_BO=RBO.RBO_NUM_INTERNO_BO
      JOIN ERP_USUARIOS_SISTEMAS US ON ROC.US_ID_USUARIO_SISTEMA=US.US_ID_USUARIO_SISTEMA
      JOIN ERP_MAESTRO_PERSONAS MPE ON MPE.MPE_RUT_PERSONA=US.MPE_RUT_PERSONA
      JOIN ERP_MAESTRO_CLIENTES MC ON MC.MC_RUT_CLIENTE=ROC.MC_RUT_CLIENTE
      where MPE.TPERS_ID_TIPO_PERSONA IN ('3','1')
        AND MC.MC_RAZON_SOCIAL <> 'CLIENTE FERRETERIA (BOLETAS)'
        AND rbo.RBO_FECHA_INGRESO BETWEEN @startDate AND @endDate
      group by RBO.RBO_FECHA_INGRESO,RBO.RBO_NUMERO_BOLETA,rbo.MC_RUT_CLIENTE,MPE_NOMBRE_COMPLETO,MC.MC_RAZON_SOCIAL,MC.MC_DIGITO
      UNION ALL
      select RBO.RFC_FECHA_INGRESO,RBO.RFC_NUMERO_FACTURA_CLI,'Factura',MC.MC_RAZON_SOCIAL,
        CAST(rbo.MC_RUT_CLIENTE AS nvarchar)+'-'+CAST(MC.MC_DIGITO AS NVARCHAR),
        sum(ISNULL(DFC_PRECIO_LISTA,0)*DFC_CANTIDAD),
        sum(ISNULL(MP_COSTO_FINAL,0)*DFC_CANTIDAD),
        sum(ISNULL(DFC_PRECIO_LISTA,0)*DFC_CANTIDAD)-sum(ISNULL(MP_COSTO_FINAL,0)*DFC_CANTIDAD),
        ((sum(ISNULL(DFC_PRECIO_LISTA,0)*DFC_CANTIDAD)-sum(ISNULL(MP_COSTO_FINAL,0)*DFC_CANTIDAD))/sum(ISNULL(DFC_PRECIO_LISTA,0)*DFC_CANTIDAD))*100,
        MPE.MPE_NOMBRE_COMPLETO
      from ERP_FACT_RES_FACTURA_CLIENTES rbo
      JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON RBO.ROC_NUMERO_ORDEN=ROC.ROC_NUMERO_ORDEN
      JOIN ERP_FACT_DET_FACTURA_CLIENTES DBO ON DBO.RFC_NUM_INTERNO_FA_CLI=RBO.RFC_NUM_INTERNO_FA_CLI
      JOIN ERP_USUARIOS_SISTEMAS US ON ROC.US_ID_USUARIO_SISTEMA=US.US_ID_USUARIO_SISTEMA
      JOIN ERP_MAESTRO_PERSONAS MPE ON MPE.MPE_RUT_PERSONA=US.MPE_RUT_PERSONA
      JOIN ERP_MAESTRO_CLIENTES MC ON MC.MC_RUT_CLIENTE=ROC.MC_RUT_CLIENTE
      where MPE.TPERS_ID_TIPO_PERSONA IN ('3','1')
        AND MC.MC_RAZON_SOCIAL <> 'CLIENTE FERRETERIA (BOLETAS)'
        AND MC.MC_RUT_CLIENTE NOT IN ('77204945','10429345','76236893','76955204','78061914','76446632','96726970')
        AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%APORTE%'
        AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%PUBLICIDAD%'
        AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%ARRIENDO%'
        AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%EXPO%'
        AND rbo.RFC_FECHA_INGRESO BETWEEN @startDate AND @endDate
      group by RBO.RFC_FECHA_INGRESO,RBO.RFC_NUMERO_FACTURA_CLI,rbo.MC_RUT_CLIENTE,MPE_NOMBRE_COMPLETO,MC.MC_RAZON_SOCIAL,MC.MC_DIGITO
    )t
  `;

  const queryNC = `
    SELECT SUM([Costo NC]) AS [Costo NC], SUM([NC Aplicada]) AS [NC], SUM([NC Aplicada])-SUM([Costo NC]) AS [Utilidad NC]
    FROM (
      SELECT ROUND(ISNULL(DOC.MP_COSTO_FINAL*DNC.DNC_CANTIDAD,0),0) AS [Costo NC],
             ROUND(ISNULL((DNC.DNC_PRECIO_LISTA*DNC.DNC_CANTIDAD),0),0) AS [NC Aplicada]
      FROM ERP_OP_DET_ORDEN_COMPRA DOC
      FULL JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON ROC.ROC_NUMERO_ORDEN=DOC.ROC_NUMERO_ORDEN
      FULL JOIN ERP_MAESTRO_PRODUCTOS MP ON MP.MP_CODIGO_PRODUCTO=DOC.MP_CODIGO_PRODUCTO
      JOIN ERP_FACT_RES_BOLETAS RBO ON RBO.ROC_NUMERO_ORDEN=ROC.ROC_NUMERO_ORDEN
      FULL JOIN ERP_FACT_RES_NC_CLIENTE RNC ON RNC.ROC_NUMERO_ORDEN=RBO.ROC_NUMERO_ORDEN
      FULL JOIN ERP_FACT_DET_NC_CLIENTE DNC ON DNC.RNC_NUM_INTERNO_NC_CLI=RNC.RNC_NUM_INTERNO_NC_CLI AND DNC.MP_CODIGO_PRODUCTO=DOC.MP_CODIGO_PRODUCTO
      FULL JOIN ERP_USUARIOS_SISTEMAS US ON US.US_ID_USUARIO_SISTEMA=ROC.US_ID_USUARIO_SISTEMA
      FULL JOIN ERP_MAESTRO_PERSONAS MPA ON MPA.MPE_RUT_PERSONA=US.MPE_RUT_PERSONA
      FULL JOIN ERP_MAESTRO_CLIENTES MC ON MC.MC_RUT_CLIENTE=ROC.MC_RUT_CLIENTE
      WHERE MPA.TPERS_ID_TIPO_PERSONA IN ('3','1')
        AND RNC.RNC_FECHA_INGRESO BETWEEN @startDate AND @endDate
        AND DOC.MP_MARGEN_COMERCIALIZACION <> 0
        AND MP.TPROV_ID_TIPO_PROVEEDOR=3
        AND MC.MC_RAZON_SOCIAL <> 'CLIENTE FERRETERIA (BOLETAS)'
      UNION ALL
      SELECT ROUND(ISNULL(DOC.MP_COSTO_FINAL*DNC.DNC_CANTIDAD,0),0),
             ROUND(ISNULL((DNC.DNC_PRECIO_LISTA*DNC.DNC_CANTIDAD),0),0)
      FROM ERP_OP_DET_ORDEN_COMPRA DOC
      FULL JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON ROC.ROC_NUMERO_ORDEN=DOC.ROC_NUMERO_ORDEN
      FULL JOIN ERP_MAESTRO_PRODUCTOS MP ON MP.MP_CODIGO_PRODUCTO=DOC.MP_CODIGO_PRODUCTO
      JOIN ERP_FACT_RES_FACTURA_CLIENTES RBO ON RBO.ROC_NUMERO_ORDEN=ROC.ROC_NUMERO_ORDEN
      FULL JOIN ERP_FACT_RES_NC_CLIENTE RNC ON RNC.ROC_NUMERO_ORDEN=RBO.ROC_NUMERO_ORDEN
      FULL JOIN ERP_FACT_DET_NC_CLIENTE DNC ON DNC.RNC_NUM_INTERNO_NC_CLI=RNC.RNC_NUM_INTERNO_NC_CLI AND DNC.MP_CODIGO_PRODUCTO=DOC.MP_CODIGO_PRODUCTO
      FULL JOIN ERP_USUARIOS_SISTEMAS US ON US.US_ID_USUARIO_SISTEMA=ROC.US_ID_USUARIO_SISTEMA
      FULL JOIN ERP_MAESTRO_PERSONAS MPA ON MPA.MPE_RUT_PERSONA=US.MPE_RUT_PERSONA
      FULL JOIN ERP_MAESTRO_CLIENTES MC ON MC.MC_RUT_CLIENTE=ROC.MC_RUT_CLIENTE
      WHERE MPA.TPERS_ID_TIPO_PERSONA IN ('3','1')
        AND RNC.RNC_FECHA_INGRESO BETWEEN @startDate AND @endDate
        AND DOC.MP_MARGEN_COMERCIALIZACION <> 0
        AND MP.TPROV_ID_TIPO_PROVEEDOR=3
        AND MC.MC_RAZON_SOCIAL <> 'CLIENTE FERRETERIA (BOLETAS)'
        AND MC.MC_RUT_CLIENTE NOT IN ('77204945','10429345','76236893','76955204','78061914','76446632','96726970')
        AND DOC.DOC_DESCRIPCION_PRODUCTO NOT LIKE '%APORTE%'
        AND DOC.DOC_DESCRIPCION_PRODUCTO NOT LIKE '%PUBLICIDAD%'
        AND DOC.DOC_DESCRIPCION_PRODUCTO NOT LIKE '%ARRIENDO%'
        AND DOC.DOC_DESCRIPCION_PRODUCTO NOT LIKE '%EXPO%'
    )T
  `;

  const [rVentas, rNC] = await Promise.all([
    pool.request().input('startDate', sql.DateTime, new Date(startDate + ' 00:00:00')).input('endDate', sql.DateTime, new Date(endDate + ' 23:59:59')).query(queryVentas),
    pool.request().input('startDate', sql.DateTime, new Date(startDate + ' 00:00:00')).input('endDate', sql.DateTime, new Date(endDate + ' 23:59:59')).query(queryNC),
  ]);

  if (!rVentas.recordset.length) return null;
  const d   = rVentas.recordset[0];
  const dNC = rNC.recordset[0] || {};

  const ventasBrutas  = parseFloat(d.Venta) || 0;
  const costosBrutos  = parseFloat(d.COSTO) || 0;
  const utilidadBruta = parseFloat(d.Utilidad) || 0;
  const margen        = parseFloat(d.Margen) || 0;
  const notasCredito  = parseFloat(dNC.NC) || 0;
  const costoNC       = parseFloat(dNC['Costo NC']) || 0;
  const utilidadNC    = parseFloat(dNC['Utilidad NC']) || 0;

  return {
    nombre:       sucursal.nombre,
    ventas:       ventasBrutas - notasCredito,
    costos:       costosBrutos - costoNC,
    utilidad:     utilidadBruta - utilidadNC,
    margen,
    notasCredito,
    ventasNetas:  ventasBrutas - notasCredito,
  };
}
