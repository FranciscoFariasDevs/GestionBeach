// backend/controllers/dashboardController.js - DATOS REALES CON NOTAS DE CRÉDITO
const { sql, poolPromise } = require('../config/db');

exports.getDashboardData = async (req, res) => {
  try {
    const { start_date, end_date } = req.body;
    
    console.log('Dashboard con datos reales:', { start_date, end_date });
    
    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'Las fechas son requeridas' });
    }
    
    const pool = await poolPromise;
    
    console.log('Obteniendo sucursales principales...');
    
    const sucursalesResult = await pool.request()
      .query(`
        SELECT id, nombre, ip, base_datos, usuario, contrasena, tipo_sucursal
        FROM sucursales
        WHERE tipo_sucursal IN ('SUPERMERCADO', 'FERRETERIA', 'MULTITIENDA')
        ORDER BY id
      `);
    
    const sucursales = sucursalesResult.recordset;
    console.log(`Procesando ${sucursales.length} sucursales`);
    
    const resultados = {
      supermercados: { ventas: 0, costos: 0, utilidad: 0, margen: 0, notasCredito: 0, ventasNetas: 0, sucursales: [] },
      ferreterias: { ventas: 0, costos: 0, utilidad: 0, margen: 0, notasCredito: 0, ventasNetas: 0, sucursales: [] },
      multitiendas: { ventas: 0, costos: 0, utilidad: 0, margen: 0, notasCredito: 0, ventasNetas: 0, sucursales: [] }
    };
    
    let contadorSuper = 0, contadorFerreterias = 0, contadorMultitienda = 0;
    
    for (const sucursal of sucursales) {
      try {
        console.log(`Procesando: ${sucursal.nombre}`);
        
        if (!sucursal.ip || !sucursal.base_datos || !sucursal.usuario) {
          console.warn(`${sucursal.nombre} sin datos conexión`);
          continue;
        }
        
        const configSucursal = {
          user: sucursal.usuario,
          password: sucursal.contrasena || '',
          server: sucursal.ip,
          database: sucursal.base_datos,
          options: {
            encrypt: false,
            trustServerCertificate: true,
            enableArithAbort: true,
            requestTimeout: 3000,
            connectionTimeout: 2000
          },
          pool: { max: 1, min: 0, idleTimeoutMillis: 5000 }
        };
        
        let poolSucursal;
        try {
          poolSucursal = await Promise.race([
            new sql.ConnectionPool(configSucursal).connect(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500))
          ]);
        } catch (connectionError) {
          console.warn(`${sucursal.nombre}: ${connectionError.message}`);
          continue;
        }
        
        let procesoExitoso = false;
        
        try {
          if (sucursal.tipo_sucursal === 'SUPERMERCADO') {
            procesoExitoso = await Promise.race([
              procesarDatosSupermercado(poolSucursal, sucursal, start_date, end_date, resultados.supermercados),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 2000))
            ]);
            if (procesoExitoso) contadorSuper++;
          } else if (sucursal.tipo_sucursal === 'FERRETERIA') {
            procesoExitoso = await Promise.race([
              procesarDatosFerreteria(poolSucursal, sucursal, start_date, end_date, resultados.ferreterias),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 2000))
            ]);
            if (procesoExitoso) contadorFerreterias++;
          } else if (sucursal.tipo_sucursal === 'MULTITIENDA') {
            procesoExitoso = await Promise.race([
              procesarDatosMultitienda(poolSucursal, sucursal, start_date, end_date, resultados.multitiendas),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 2000))
            ]);
            if (procesoExitoso) contadorMultitienda++;
          }
        } catch (processError) {
          console.warn(`${sucursal.nombre}: Query timeout`);
        }
        
        try { await poolSucursal.close(); } catch {}
        
        console.log(`${sucursal.nombre}: ${procesoExitoso ? 'OK' : 'SKIP'}`);
        
      } catch (error) {
        console.warn(`${sucursal.nombre}: ${error.message}`);
        continue;
      }
    }
    
    if (contadorSuper > 0) {
      resultados.supermercados.margen /= contadorSuper;
      resultados.supermercados.ventasNetas = resultados.supermercados.ventas - resultados.supermercados.notasCredito;
    }
    if (contadorFerreterias > 0) {
      resultados.ferreterias.margen /= contadorFerreterias;
      resultados.ferreterias.ventasNetas = resultados.ferreterias.ventas - resultados.ferreterias.notasCredito;
    }
    if (contadorMultitienda > 0) {
      resultados.multitiendas.margen /= contadorMultitienda;
      resultados.multitiendas.ventasNetas = resultados.multitiendas.ventas - resultados.multitiendas.notasCredito;
    }
    
    resultados.total = {
      ventas: resultados.supermercados.ventas + resultados.ferreterias.ventas + resultados.multitiendas.ventas,
      costos: resultados.supermercados.costos + resultados.ferreterias.costos + resultados.multitiendas.costos,
      utilidad: resultados.supermercados.utilidad + resultados.ferreterias.utilidad + resultados.multitiendas.utilidad,
      notasCredito: resultados.supermercados.notasCredito + resultados.ferreterias.notasCredito + resultados.multitiendas.notasCredito,
      ventasNetas: 0,
      margen: 0
    };
    
    resultados.total.ventasNetas = resultados.total.ventas - resultados.total.notasCredito;
    
    const totalContador = contadorSuper + contadorFerreterias + contadorMultitienda;
    if (totalContador > 0) {
      resultados.total.margen = (
        (resultados.supermercados.margen * contadorSuper) +
        (resultados.ferreterias.margen * contadorFerreterias) +
        (resultados.multitiendas.margen * contadorMultitienda)
      ) / totalContador;
    }
    
    console.log(`Dashboard completado: ${totalContador} sucursales`);
    console.log('Total ventas:', resultados.total.ventas.toLocaleString());
    console.log('Total NC:', resultados.total.notasCredito.toLocaleString());
    console.log('Total ventas netas:', resultados.total.ventasNetas.toLocaleString());
    
    return res.status(200).json(resultados);
    
  } catch (error) {
    console.error('Error dashboard:', error);
    
    return res.status(200).json({
      supermercados: { ventas: 0, costos: 0, utilidad: 0, margen: 0, notasCredito: 0, ventasNetas: 0, sucursales: [] },
      ferreterias: { ventas: 0, costos: 0, utilidad: 0, margen: 0, notasCredito: 0, ventasNetas: 0, sucursales: [] },
      multitiendas: { ventas: 0, costos: 0, utilidad: 0, margen: 0, notasCredito: 0, ventasNetas: 0, sucursales: [] },
      total: { ventas: 0, costos: 0, utilidad: 0, margen: 0, notasCredito: 0, ventasNetas: 0 },
      message: 'Datos parciales por problemas de conexión'
    });
  }
};

// SUPERMERCADO - Mantiene cálculo proporcional
async function procesarDatosSupermercado(pool, sucursal, startDate, endDate, resultados) {
  try {
    const queryVentas = `
      SELECT 
        SUM(CASE 
          WHEN tde.dc_codigo_centralizacion = '0039' OR tde.dc_codigo_centralizacion = '0033' THEN (tdd.dq_bruto / 1.19)
          WHEN tde.dc_codigo_centralizacion = '1599' THEN tdd.dq_bruto
        END) AS VENTA,
        SUM(CASE 
          WHEN tde.dc_codigo_centralizacion = '0039' OR tde.dc_codigo_centralizacion = '0033' THEN (tdd.dq_bruto / 1.19) - dq_ganancia
          WHEN tde.dc_codigo_centralizacion = '1599' THEN tdd.dq_bruto - dq_ganancia
        END) AS COSTO,
        SUM(dq_ganancia) AS UTILIDAD,
        AVG(CASE 
          WHEN tde.dc_codigo_centralizacion = '0039' OR tde.dc_codigo_centralizacion = '0033' THEN (dq_ganancia / (tdd.dq_bruto / 1.19)) * 100
          WHEN tde.dc_codigo_centralizacion = '1599' THEN (dq_ganancia / tdd.dq_bruto) * 100
        END) AS MARGEN
      FROM tb_documentos_detalle tdd
      JOIN tb_documentos_encabezado tde ON tdd.dn_correlativo_documento = tde.dn_correlativo
      WHERE CAST(df_fecha_emision AS DATE) BETWEEN @startDate AND @endDate
        AND dc_codigo_centralizacion IN ('0033','0039','1599') 
        AND tde.dc_rut_documento NOT IN('010.429.345-K', '076.236.893-5', '076.775.326-8', '078.061.914-7')
        AND dn_correlativo_caja IS NOT NULL
    `;

    const queryNC = `
      SELECT SUM(CASE WHEN tde.dc_codigo_centralizacion = '0061' THEN (tdd.dq_bruto / 1.19) END) AS NotasCredito
      FROM tb_documentos_detalle tdd
      JOIN tb_documentos_encabezado tde ON tdd.dn_correlativo_documento = tde.dn_correlativo
      WHERE CAST(df_fecha_emision AS DATE) BETWEEN @startDate AND @endDate
        AND dc_codigo_centralizacion IN ('0061') 
        AND tde.dc_rut_documento NOT IN('010.429.345-K', '076.236.893-5', '076.775.326-8', '078.061.914-7')
        AND dn_correlativo_caja IS NOT NULL
    `;
    
    const resultVentas = await pool.request()
      .input('startDate', sql.Date, new Date(startDate))
      .input('endDate', sql.Date, new Date(endDate))
      .query(queryVentas);

    const resultNC = await pool.request()
      .input('startDate', sql.Date, new Date(startDate))
      .input('endDate', sql.Date, new Date(endDate))
      .query(queryNC);
    
    if (resultVentas.recordset.length > 0) {
      const data = resultVentas.recordset[0];
      const dataNC = resultNC.recordset.length > 0 ? resultNC.recordset[0] : { NotasCredito: 0 };
      
      const ventasBrutas = parseFloat(data.VENTA) || 0;
      const costosBrutos = parseFloat(data.COSTO) || 0;
      const utilidadBruta = parseFloat(data.UTILIDAD) || 0;
      const margen = parseFloat(data.MARGEN) || 0;
      const notasCredito = parseFloat(dataNC.NotasCredito) || 0;
      
      // Calcular proporción de NC sobre ventas
      const proporcionNC = ventasBrutas > 0 ? (notasCredito / ventasBrutas) : 0;
      
      // Restar NC proporcionalmente de ventas, costos y utilidad
      const ventas = ventasBrutas - notasCredito;
      const costos = costosBrutos - (costosBrutos * proporcionNC);
      const utilidad = utilidadBruta - (utilidadBruta * proporcionNC);
      const ventasNetas = ventas;
      
      resultados.ventas += ventas;
      resultados.costos += costos;
      resultados.utilidad += utilidad;
      resultados.margen += margen;
      resultados.notasCredito += notasCredito;
      resultados.ventasNetas += ventasNetas;
      
      resultados.sucursales.push({
        nombre: sucursal.nombre,
        ventas, costos, utilidad, margen, notasCredito, ventasNetas
      });
      
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error en supermercado ${sucursal.nombre}:`, error.message);
    return false;
  }
}

// FERRETERIA - Nueva lógica con resta directa de NC
async function procesarDatosFerreteria(pool, sucursal, startDate, endDate, resultados) {
  try {
    const queryVentas = `
      SELECT sum(Total) Venta, sum(Costo) COSTO, sum(Utilidad) Utilidad, (sum(Utilidad)/sum(Total))*100 Margen
      FROM (
        select RBO.RBO_FECHA_INGRESO Fecha, RBO.RBO_NUMERO_BOLETA Folio, 'Boleta' as Doc,
          MC.MC_RAZON_SOCIAL as Cliente, CAST(rbo.MC_RUT_CLIENTE AS nvarchar)+ '-' + CAST(MC.MC_DIGITO AS NVARCHAR) as Rut_Cliente, 
          sum(ISNULL(DBOL_PRECIO_LISTA,0) * DBOL_CANTIDAD) as Total, 
          sum(ISNULL(MP_COSTO_FINAL,0) * DBOL_CANTIDAD) as Costo, 
          sum(ISNULL(DBOL_PRECIO_LISTA,0) * DBOL_CANTIDAD) - sum(ISNULL(MP_COSTO_FINAL,0) * DBOL_CANTIDAD) as Utilidad,  
          ((sum(ISNULL(DBOL_PRECIO_LISTA,0) * DBOL_CANTIDAD) - sum(ISNULL(MP_COSTO_FINAL,0) * DBOL_CANTIDAD)) / sum(ISNULL(DBOL_PRECIO_LISTA,0) * DBOL_CANTIDAD)) * 100 as Margen, 
          MPE.MPE_NOMBRE_COMPLETO as Vendedor
        from ERP_FACT_RES_BOLETAS rbo
        JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON RBO.ROC_NUMERO_ORDEN = ROC.ROC_NUMERO_ORDEN
        JOIN ERP_FACT_DET_BOLETAS DBO ON DBO.RBO_NUM_INTERNO_BO = RBO.RBO_NUM_INTERNO_BO
        JOIN ERP_USUARIOS_SISTEMAS US ON ROC.US_ID_USUARIO_SISTEMA = US.US_ID_USUARIO_SISTEMA
        JOIN ERP_MAESTRO_PERSONAS MPE ON MPE.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
        JOIN ERP_MAESTRO_CLIENTES MC ON MC.MC_RUT_CLIENTE = ROC.MC_RUT_CLIENTE
        where MPE.TPERS_ID_TIPO_PERSONA IN ('3', '1') 
          AND MC.MC_RAZON_SOCIAL <> 'CLIENTE FERRETERIA (BOLETAS)' 
          AND rbo.RBO_FECHA_INGRESO BETWEEN @startDate AND @endDate
        group by RBO.RBO_FECHA_INGRESO, RBO.RBO_NUMERO_BOLETA, rbo.MC_RUT_CLIENTE, MPE_NOMBRE_COMPLETO, MC.MC_RAZON_SOCIAL, MC.MC_DIGITO
        UNION ALL
        select RBO.RFC_FECHA_INGRESO Fecha, RBO.RFC_NUMERO_FACTURA_CLI Folio, 'Factura' as Doc,
          MC.MC_RAZON_SOCIAL as Cliente, CAST(rbo.MC_RUT_CLIENTE AS nvarchar)+ '-' + CAST(MC.MC_DIGITO AS NVARCHAR) as Rut_Cliente, 
          sum(ISNULL(DFC_PRECIO_LISTA,0) * DFC_CANTIDAD) as Total, 
          sum(ISNULL(MP_COSTO_FINAL,0) * DFC_CANTIDAD) as Costo, 
          sum(ISNULL(DFC_PRECIO_LISTA,0) * DFC_CANTIDAD) - sum(ISNULL(MP_COSTO_FINAL,0) * DFC_CANTIDAD) as Utilidad,  
          ((sum(ISNULL(DFC_PRECIO_LISTA,0) * DFC_CANTIDAD) - sum(ISNULL(MP_COSTO_FINAL,0) * DFC_CANTIDAD)) / sum(ISNULL(DFC_PRECIO_LISTA,0) * DFC_CANTIDAD)) * 100 as Margen, 
          MPE.MPE_NOMBRE_COMPLETO as Vendedor
        from ERP_FACT_RES_FACTURA_CLIENTES rbo
        JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON RBO.ROC_NUMERO_ORDEN = ROC.ROC_NUMERO_ORDEN
        JOIN ERP_FACT_DET_FACTURA_CLIENTES DBO ON DBO.RFC_NUM_INTERNO_FA_CLI = RBO.RFC_NUM_INTERNO_FA_CLI
        JOIN ERP_USUARIOS_SISTEMAS US ON ROC.US_ID_USUARIO_SISTEMA = US.US_ID_USUARIO_SISTEMA
        JOIN ERP_MAESTRO_PERSONAS MPE ON MPE.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
        JOIN ERP_MAESTRO_CLIENTES MC ON MC.MC_RUT_CLIENTE = ROC.MC_RUT_CLIENTE
        where MPE.TPERS_ID_TIPO_PERSONA IN ('3', '1') 
          AND MC.MC_RAZON_SOCIAL <> 'CLIENTE FERRETERIA (BOLETAS)' 
          AND MC.MC_RUT_CLIENTE NOT IN ('77204945','10429345','76236893','76955204','78061914','76446632','96726970')
          AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%APORTE%'
          AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%PUBLICIDAD%'
          AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%ARRIENDO%'
          AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%EXPO%' 
          AND rbo.RFC_FECHA_INGRESO BETWEEN @startDate AND @endDate
        group by RBO.RFC_FECHA_INGRESO, RBO.RFC_NUMERO_FACTURA_CLI, rbo.MC_RUT_CLIENTE, MPE_NOMBRE_COMPLETO, MC.MC_RAZON_SOCIAL, MC.MC_DIGITO
      )t
    `;

    const queryNC = `
      SELECT  
        SUM([Costo NC]) AS [Costo NC], 
        SUM([NC Aplicada]) AS [NC],
        SUM([NC Aplicada]) - SUM([Costo NC]) AS [Utilidad NC]
      FROM (
        SELECT 
          ROUND(ISNULL(DOC.MP_COSTO_FINAL * DNC.DNC_CANTIDAD, 0), 0) AS [Costo NC],
          ROUND(ISNULL((DNC.DNC_PRECIO_LISTA * DNC.DNC_CANTIDAD), 0), 0) AS [NC Aplicada]
        FROM ERP_OP_DET_ORDEN_COMPRA DOC
        FULL JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON ROC.ROC_NUMERO_ORDEN = DOC.ROC_NUMERO_ORDEN
        FULL JOIN ERP_MAESTRO_PRODUCTOS MP ON MP.MP_CODIGO_PRODUCTO = DOC.MP_CODIGO_PRODUCTO
        JOIN ERP_FACT_RES_BOLETAS RBO ON RBO.ROC_NUMERO_ORDEN = ROC.ROC_NUMERO_ORDEN
        FULL JOIN ERP_FACT_RES_NC_CLIENTE RNC ON RNC.ROC_NUMERO_ORDEN = RBO.ROC_NUMERO_ORDEN
        FULL JOIN ERP_FACT_DET_NC_CLIENTE DNC ON DNC.RNC_NUM_INTERNO_NC_CLI = RNC.RNC_NUM_INTERNO_NC_CLI AND DNC.MP_CODIGO_PRODUCTO = DOC.MP_CODIGO_PRODUCTO
        FULL JOIN ERP_USUARIOS_SISTEMAS US ON US.US_ID_USUARIO_SISTEMA = ROC.US_ID_USUARIO_SISTEMA
        FULL JOIN ERP_MAESTRO_PERSONAS MPA ON MPA.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
        FULL JOIN ERP_MAESTRO_CLIENTES MC ON MC.MC_RUT_CLIENTE = ROC.MC_RUT_CLIENTE
        WHERE 
          MPA.TPERS_ID_TIPO_PERSONA IN ('3', '1') 
          AND RNC.RNC_FECHA_INGRESO BETWEEN @startDate AND @endDate
          AND DOC.MP_MARGEN_COMERCIALIZACION <> 0 
          AND MP.TPROV_ID_TIPO_PROVEEDOR = 3  
          AND MC.MC_RAZON_SOCIAL <> 'CLIENTE FERRETERIA (BOLETAS)'
        UNION ALL
        SELECT
          ROUND(ISNULL(DOC.MP_COSTO_FINAL * DNC.DNC_CANTIDAD, 0), 0) AS [Costo NC],
          ROUND(ISNULL((DNC.DNC_PRECIO_LISTA * DNC.DNC_CANTIDAD), 0), 0) AS [NC Aplicada]
        FROM ERP_OP_DET_ORDEN_COMPRA DOC
        FULL JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON ROC.ROC_NUMERO_ORDEN = DOC.ROC_NUMERO_ORDEN
        FULL JOIN ERP_MAESTRO_PRODUCTOS MP ON MP.MP_CODIGO_PRODUCTO = DOC.MP_CODIGO_PRODUCTO
        JOIN ERP_FACT_RES_FACTURA_CLIENTES RBO ON RBO.ROC_NUMERO_ORDEN = ROC.ROC_NUMERO_ORDEN
        FULL JOIN ERP_FACT_RES_NC_CLIENTE RNC ON RNC.ROC_NUMERO_ORDEN = RBO.ROC_NUMERO_ORDEN
        FULL JOIN ERP_FACT_DET_NC_CLIENTE DNC ON DNC.RNC_NUM_INTERNO_NC_CLI = RNC.RNC_NUM_INTERNO_NC_CLI AND DNC.MP_CODIGO_PRODUCTO = DOC.MP_CODIGO_PRODUCTO
        FULL JOIN ERP_USUARIOS_SISTEMAS US ON US.US_ID_USUARIO_SISTEMA = ROC.US_ID_USUARIO_SISTEMA
        FULL JOIN ERP_MAESTRO_PERSONAS MPA ON MPA.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
        FULL JOIN ERP_MAESTRO_CLIENTES MC ON MC.MC_RUT_CLIENTE = ROC.MC_RUT_CLIENTE
        WHERE 
          MPA.TPERS_ID_TIPO_PERSONA IN ('3', '1') 
          AND RNC.RNC_FECHA_INGRESO BETWEEN @startDate AND @endDate
          AND DOC.MP_MARGEN_COMERCIALIZACION <> 0 
          AND MP.TPROV_ID_TIPO_PROVEEDOR = 3  
          AND MC.MC_RAZON_SOCIAL <> 'CLIENTE FERRETERIA (BOLETAS)'
          AND MC.MC_RUT_CLIENTE NOT IN ('77204945','10429345','76236893','76955204','78061914','76446632','96726970')
          AND DOC.DOC_DESCRIPCION_PRODUCTO NOT LIKE '%APORTE%'
          AND DOC.DOC_DESCRIPCION_PRODUCTO NOT LIKE '%PUBLICIDAD%'
          AND DOC.DOC_DESCRIPCION_PRODUCTO NOT LIKE '%ARRIENDO%'
          AND DOC.DOC_DESCRIPCION_PRODUCTO NOT LIKE '%EXPO%'
      )T
    `;
    
    const resultVentas = await pool.request()
      .input('startDate', sql.DateTime, new Date(startDate + ' 00:00:00'))
      .input('endDate', sql.DateTime, new Date(endDate + ' 23:59:59'))
      .query(queryVentas);

    const resultNC = await pool.request()
      .input('startDate', sql.DateTime, new Date(startDate + ' 00:00:00'))
      .input('endDate', sql.DateTime, new Date(endDate + ' 23:59:59'))
      .query(queryNC);
    
    if (resultVentas.recordset.length > 0) {
      const data = resultVentas.recordset[0];
      const dataNC = resultNC.recordset.length > 0 ? resultNC.recordset[0] : { NC: 0, 'Costo NC': 0, 'Utilidad NC': 0 };
      
      const ventasBrutas = parseFloat(data.Venta) || 0;
      const costosBrutos = parseFloat(data.COSTO) || 0;
      const utilidadBruta = parseFloat(data.Utilidad) || 0;
      const margen = parseFloat(data.Margen) || 0;
      const notasCredito = parseFloat(dataNC.NC) || 0;
      const costoNC = parseFloat(dataNC['Costo NC']) || 0;
      const utilidadNC = parseFloat(dataNC['Utilidad NC']) || 0;
      
      // Resta directa de NC reales (no proporcional)
      const ventas = ventasBrutas - notasCredito;
      const costos = costosBrutos - costoNC;
      const utilidad = utilidadBruta - utilidadNC;
      const ventasNetas = ventas;
      
      resultados.ventas += ventas;
      resultados.costos += costos;
      resultados.utilidad += utilidad;
      resultados.margen += margen;
      resultados.notasCredito += notasCredito;
      resultados.ventasNetas += ventasNetas;
      
      resultados.sucursales.push({
        nombre: sucursal.nombre,
        ventas, costos, utilidad, margen, notasCredito, ventasNetas
      });
      
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error en ferretería ${sucursal.nombre}:`, error.message);
    return false;
  }
}

// MULTITIENDA - Nueva lógica con resta directa de NC
async function procesarDatosMultitienda(pool, sucursal, startDate, endDate, resultados) {
  try {
    const queryVentas = `
      SELECT sum(Total) Venta, sum(Costo) COSTO, sum(Utilidad) Utilidad, (sum(Utilidad)/sum(Total))*100 Margen
      FROM (
        select RBO.RBO_FECHA_INGRESO Fecha, RBO.RBO_NUMERO_BOLETA Folio, 'Boleta' as Doc,
          MC.MC_RAZON_SOCIAL as Cliente, CAST(rbo.MC_RUT_CLIENTE AS nvarchar)+ '-' + CAST(MC.MC_DIGITO AS NVARCHAR) as Rut_Cliente, 
          sum(ISNULL(DBOL_PRECIO_LISTA,0) * DBOL_CANTIDAD) as Total, 
          sum(ISNULL(MP_COSTO_FINAL,0) * DBOL_CANTIDAD) as Costo, 
          sum(ISNULL(DBOL_PRECIO_LISTA,0) * DBOL_CANTIDAD) - sum(ISNULL(MP_COSTO_FINAL,0) * DBOL_CANTIDAD) as Utilidad,  
          ((sum(ISNULL(DBOL_PRECIO_LISTA,0) * DBOL_CANTIDAD) - sum(ISNULL(MP_COSTO_FINAL,0) * DBOL_CANTIDAD)) / sum(ISNULL(DBOL_PRECIO_LISTA,0) * DBOL_CANTIDAD)) * 100 as Margen, 
          MPE.MPE_NOMBRE_COMPLETO as Vendedor
        from ERP_FACT_RES_BOLETAS rbo
        JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON RBO.ROC_NUMERO_ORDEN = ROC.ROC_NUMERO_ORDEN
        JOIN ERP_FACT_DET_BOLETAS DBO ON DBO.RBO_NUM_INTERNO_BO = RBO.RBO_NUM_INTERNO_BO
        JOIN ERP_USUARIOS_SISTEMAS US ON ROC.US_ID_USUARIO_SISTEMA = US.US_ID_USUARIO_SISTEMA
        JOIN ERP_MAESTRO_PERSONAS MPE ON MPE.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
        JOIN ERP_MAESTRO_CLIENTES MC ON MC.MC_RUT_CLIENTE = ROC.MC_RUT_CLIENTE
        where MPE.TPERS_ID_TIPO_PERSONA IN ('3', '1') 
          AND MC.MC_RAZON_SOCIAL <> 'CLIENTE FERRETERIA (BOLETAS)' 
          AND rbo.RBO_FECHA_INGRESO BETWEEN @startDate AND @endDate
        group by RBO.RBO_FECHA_INGRESO, RBO.RBO_NUMERO_BOLETA, rbo.MC_RUT_CLIENTE, MPE_NOMBRE_COMPLETO, MC.MC_RAZON_SOCIAL, MC.MC_DIGITO
        UNION ALL
        select RBO.RFC_FECHA_INGRESO Fecha, RBO.RFC_NUMERO_FACTURA_CLI Folio, 'Factura' as Doc,
          MC.MC_RAZON_SOCIAL as Cliente, CAST(rbo.MC_RUT_CLIENTE AS nvarchar)+ '-' + CAST(MC.MC_DIGITO AS NVARCHAR) as Rut_Cliente, 
          sum(ISNULL(DFC_PRECIO_LISTA,0) * DFC_CANTIDAD) as Total, 
          sum(ISNULL(MP_COSTO_FINAL,0) * DFC_CANTIDAD) as Costo, 
          sum(ISNULL(DFC_PRECIO_LISTA,0) * DFC_CANTIDAD) - sum(ISNULL(MP_COSTO_FINAL,0) * DFC_CANTIDAD) as Utilidad,  
          ((sum(ISNULL(DFC_PRECIO_LISTA,0) * DFC_CANTIDAD) - sum(ISNULL(MP_COSTO_FINAL,0) * DFC_CANTIDAD)) / sum(ISNULL(DFC_PRECIO_LISTA,0) * DFC_CANTIDAD)) * 100 as Margen, 
          MPE.MPE_NOMBRE_COMPLETO as Vendedor
        from ERP_FACT_RES_FACTURA_CLIENTES rbo
        JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON RBO.ROC_NUMERO_ORDEN = ROC.ROC_NUMERO_ORDEN
        JOIN ERP_FACT_DET_FACTURA_CLIENTES DBO ON DBO.RFC_NUM_INTERNO_FA_CLI = RBO.RFC_NUM_INTERNO_FA_CLI
        JOIN ERP_USUARIOS_SISTEMAS US ON ROC.US_ID_USUARIO_SISTEMA = US.US_ID_USUARIO_SISTEMA
        JOIN ERP_MAESTRO_PERSONAS MPE ON MPE.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
        JOIN ERP_MAESTRO_CLIENTES MC ON MC.MC_RUT_CLIENTE = ROC.MC_RUT_CLIENTE
        where MPE.TPERS_ID_TIPO_PERSONA IN ('3', '1') 
          AND MC.MC_RAZON_SOCIAL <> 'CLIENTE FERRETERIA (BOLETAS)' 
          AND MC.MC_RUT_CLIENTE NOT IN ('77204945','10429345','76236893','76955204','78061914','76446632','96726970')
          AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%APORTE%'
          AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%PUBLICIDAD%'
          AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%ARRIENDO%'
          AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%EXPO%' 
          AND rbo.RFC_FECHA_INGRESO BETWEEN @startDate AND @endDate
        group by RBO.RFC_FECHA_INGRESO, RBO.RFC_NUMERO_FACTURA_CLI, rbo.MC_RUT_CLIENTE, MPE_NOMBRE_COMPLETO, MC.MC_RAZON_SOCIAL, MC.MC_DIGITO
      )t
    `;

    const queryNC = `
      SELECT  
        SUM([Costo NC]) AS [Costo NC], 
        SUM([NC Aplicada]) AS [NC],
        SUM([NC Aplicada]) - SUM([Costo NC]) AS [Utilidad NC]
      FROM (
        SELECT 
          ROUND(ISNULL(DOC.MP_COSTO_FINAL * DNC.DNC_CANTIDAD, 0), 0) AS [Costo NC],
          ROUND(ISNULL((DNC.DNC_PRECIO_LISTA * DNC.DNC_CANTIDAD), 0), 0) AS [NC Aplicada]
        FROM ERP_OP_DET_ORDEN_COMPRA DOC
        FULL JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON ROC.ROC_NUMERO_ORDEN = DOC.ROC_NUMERO_ORDEN
        FULL JOIN ERP_MAESTRO_PRODUCTOS MP ON MP.MP_CODIGO_PRODUCTO = DOC.MP_CODIGO_PRODUCTO
        JOIN ERP_FACT_RES_BOLETAS RBO ON RBO.ROC_NUMERO_ORDEN = ROC.ROC_NUMERO_ORDEN
        FULL JOIN ERP_FACT_RES_NC_CLIENTE RNC ON RNC.ROC_NUMERO_ORDEN = RBO.ROC_NUMERO_ORDEN
        FULL JOIN ERP_FACT_DET_NC_CLIENTE DNC ON DNC.RNC_NUM_INTERNO_NC_CLI = RNC.RNC_NUM_INTERNO_NC_CLI AND DNC.MP_CODIGO_PRODUCTO = DOC.MP_CODIGO_PRODUCTO
        FULL JOIN ERP_USUARIOS_SISTEMAS US ON US.US_ID_USUARIO_SISTEMA = ROC.US_ID_USUARIO_SISTEMA
        FULL JOIN ERP_MAESTRO_PERSONAS MPA ON MPA.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
        FULL JOIN ERP_MAESTRO_CLIENTES MC ON MC.MC_RUT_CLIENTE = ROC.MC_RUT_CLIENTE
        WHERE 
          MPA.TPERS_ID_TIPO_PERSONA IN ('3', '1') 
          AND RNC.RNC_FECHA_INGRESO BETWEEN @startDate AND @endDate
          AND DOC.MP_MARGEN_COMERCIALIZACION <> 0 
          AND MP.TPROV_ID_TIPO_PROVEEDOR = 3  
          AND MC.MC_RAZON_SOCIAL <> 'CLIENTE FERRETERIA (BOLETAS)'
        UNION ALL
        SELECT
          ROUND(ISNULL(DOC.MP_COSTO_FINAL * DNC.DNC_CANTIDAD, 0), 0) AS [Costo NC],
          ROUND(ISNULL((DNC.DNC_PRECIO_LISTA * DNC.DNC_CANTIDAD), 0), 0) AS [NC Aplicada]
        FROM ERP_OP_DET_ORDEN_COMPRA DOC
        FULL JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON ROC.ROC_NUMERO_ORDEN = DOC.ROC_NUMERO_ORDEN
        FULL JOIN ERP_MAESTRO_PRODUCTOS MP ON MP.MP_CODIGO_PRODUCTO = DOC.MP_CODIGO_PRODUCTO
        JOIN ERP_FACT_RES_FACTURA_CLIENTES RBO ON RBO.ROC_NUMERO_ORDEN = ROC.ROC_NUMERO_ORDEN
        FULL JOIN ERP_FACT_RES_NC_CLIENTE RNC ON RNC.ROC_NUMERO_ORDEN = RBO.ROC_NUMERO_ORDEN
        FULL JOIN ERP_FACT_DET_NC_CLIENTE DNC ON DNC.RNC_NUM_INTERNO_NC_CLI = RNC.RNC_NUM_INTERNO_NC_CLI AND DNC.MP_CODIGO_PRODUCTO = DOC.MP_CODIGO_PRODUCTO
        FULL JOIN ERP_USUARIOS_SISTEMAS US ON US.US_ID_USUARIO_SISTEMA = ROC.US_ID_USUARIO_SISTEMA
        FULL JOIN ERP_MAESTRO_PERSONAS MPA ON MPA.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
        FULL JOIN ERP_MAESTRO_CLIENTES MC ON MC.MC_RUT_CLIENTE = ROC.MC_RUT_CLIENTE
        WHERE 
          MPA.TPERS_ID_TIPO_PERSONA IN ('3', '1') 
          AND RNC.RNC_FECHA_INGRESO BETWEEN @startDate AND @endDate
          AND DOC.MP_MARGEN_COMERCIALIZACION <> 0 
          AND MP.TPROV_ID_TIPO_PROVEEDOR = 3  
          AND MC.MC_RAZON_SOCIAL <> 'CLIENTE FERRETERIA (BOLETAS)'
          AND MC.MC_RUT_CLIENTE NOT IN ('77204945','10429345','76236893','76955204','78061914','76446632','96726970')
          AND DOC.DOC_DESCRIPCION_PRODUCTO NOT LIKE '%APORTE%'
          AND DOC.DOC_DESCRIPCION_PRODUCTO NOT LIKE '%PUBLICIDAD%'
          AND DOC.DOC_DESCRIPCION_PRODUCTO NOT LIKE '%ARRIENDO%'
          AND DOC.DOC_DESCRIPCION_PRODUCTO NOT LIKE '%EXPO%'
      )T
    `;
    
    const resultVentas = await pool.request()
      .input('startDate', sql.DateTime, new Date(startDate + ' 00:00:00'))
      .input('endDate', sql.DateTime, new Date(endDate + ' 23:59:59'))
      .query(queryVentas);

    const resultNC = await pool.request()
      .input('startDate', sql.DateTime, new Date(startDate + ' 00:00:00'))
      .input('endDate', sql.DateTime, new Date(endDate + ' 23:59:59'))
      .query(queryNC);
    
    if (resultVentas.recordset.length > 0) {
      const data = resultVentas.recordset[0];
      const dataNC = resultNC.recordset.length > 0 ? resultNC.recordset[0] : { NC: 0, 'Costo NC': 0, 'Utilidad NC': 0 };
      
      const ventasBrutas = parseFloat(data.Venta) || 0;
      const costosBrutos = parseFloat(data.COSTO) || 0;
      const utilidadBruta = parseFloat(data.Utilidad) || 0;
      const margen = parseFloat(data.Margen) || 0;
      const notasCredito = parseFloat(dataNC.NC) || 0;
      const costoNC = parseFloat(dataNC['Costo NC']) || 0;
      const utilidadNC = parseFloat(dataNC['Utilidad NC']) || 0;
      
      // Resta directa de NC reales (no proporcional)
      const ventas = ventasBrutas - notasCredito;
      const costos = costosBrutos - costoNC;
      const utilidad = utilidadBruta - utilidadNC;
      const ventasNetas = ventas;
      
      resultados.ventas += ventas;
      resultados.costos += costos;
      resultados.utilidad += utilidad;
      resultados.margen += margen;
      resultados.notasCredito += notasCredito;
      resultados.ventasNetas += ventasNetas;
      
      resultados.sucursales.push({
        nombre: sucursal.nombre,
        ventas, costos, utilidad, margen, notasCredito, ventasNetas
      });
      
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error en multitienda ${sucursal.nombre}:`, error.message);
    return false;
  }
}