// backend/controllers/ventasController.js - COMPLETO CON QUERIES CORREGIDAS
const { sql, poolPromise } = require('../config/db');

exports.getVentas = async (req, res) => {
  console.log('\n========================================');
  console.log('INICIO getVentas - Timestamp:', new Date().toISOString());
  console.log('========================================');
  
  try {
    const { sucursal_id, start_date, end_date } = req.body;
    console.log('Parametros:', JSON.stringify(req.body, null, 2));

    if (!sucursal_id || !start_date || !end_date) {
      console.log('ERROR: Parametros faltantes');
      return res.status(400).json({ 
        success: false,
        message: 'Faltan parametros requeridos'
      });
    }

    const pool = await poolPromise;
    const sucursalResult = await pool.request()
      .input('sucursalId', sql.Int, sucursal_id)
      .query('SELECT id, nombre, ip, base_datos, usuario, contrasena, tipo_sucursal, puerto FROM sucursales WHERE id = @sucursalId');

    if (sucursalResult.recordset.length === 0) {
      console.log('ERROR: Sucursal no encontrada');
      return res.status(404).json({ 
        success: false,
        message: 'Sucursal no encontrada'
      });
    }

    const sucursal = sucursalResult.recordset[0];
    console.log('Sucursal:', sucursal.nombre, '-', sucursal.tipo_sucursal);

    if (!sucursal.ip || !sucursal.base_datos || !sucursal.usuario) {
      console.log('ERROR: Datos de conexion incompletos');
      return res.status(400).json({ 
        success: false,
        message: 'Configuracion de conexion incompleta'
      });
    }

    const configSucursal = {
      user: sucursal.usuario,
      password: sucursal.contrasena || '',
      server: sucursal.ip,
      port: sucursal.puerto,
      database: sucursal.base_datos,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        requestTimeout: 30000,
        connectionTimeout: 15000
      },
      pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
    };

    console.log('Conectando a:', configSucursal.server, '/', configSucursal.database);

    let poolSucursal;
    try {
      poolSucursal = await Promise.race([
        new sql.ConnectionPool(configSucursal).connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 10000)
        )
      ]);
      console.log('CONEXION ESTABLECIDA');
    } catch (connectionError) {
      console.log('ERROR Conexion:', connectionError.message);
      return res.status(500).json({ 
        success: false,
        message: 'No se pudo conectar a la sucursal',
        error: connectionError.message
      });
    }

    let ventas = [];
    let resumen = {
      cantidad: 0,
      totalVentas: 0,
      totalCostos: 0,
      totalUtilidad: 0,
      margenPromedio: 0
    };

    try {
      console.log('Tipo de sucursal:', sucursal.tipo_sucursal);

      // SUPERMERCADOS - QUERY CORREGIDA
      if (sucursal.tipo_sucursal === 'SUPERMERCADO') {
        console.log('Ejecutando query SUPERMERCADO (corregida)...');

        const query = `
          SELECT
            tde.dn_numero_documento AS Folio,
            ISNULL(re.dg_razon_social, 'Sin vendedor') AS Vendedor,
            CASE
              WHEN tde.dc_codigo_centralizacion = '1599' THEN 'CLIENTE GENERICO'
              ELSE ISNULL(tde.dg_razon_social, 'Sin cliente')
            END AS Cliente,
            ISNULL(tde.dc_rut_documento, '') AS Rut_Cliente,
            CASE
              WHEN tde.dc_codigo_centralizacion = '1599' THEN ISNULL(tde.dq_bruto, 0)
              ELSE ISNULL(tde.dq_neto, 0)
            END AS Neto,
            CASE
              WHEN tde.dc_codigo_centralizacion = '1599' THEN 0
              ELSE ISNULL(tde.dq_iva, 0)
            END AS Iva,
            ISNULL(tde.dq_bruto, 0) AS Total,
            CASE
              WHEN tde.dc_codigo_centralizacion = '0033' THEN 'Factura'
              WHEN tde.dc_codigo_centralizacion = '0039' THEN 'Boleta'
              WHEN tde.dc_codigo_centralizacion = '1599' THEN 'Venta Cigarros'
              ELSE 'Otro'
            END AS Doc,
            tde.df_fecha_emision AS Fecha
          FROM 
            tb_documentos_encabezado tde
          LEFT JOIN 
            tb_rut_encabezado re ON re.dc_rut = tde.dc_rut_crea_documento
          WHERE 
            CAST(tde.df_fecha_emision AS DATE) BETWEEN @startDate AND @endDate
            AND tde.dc_codigo_centralizacion IN ('0033', '0039', '1599') 
            AND tde.dn_correlativo_caja IS NOT NULL
            AND tde.dc_rut_documento NOT IN ('010.429.345-K', '076.236.893-5', '076.775.326-8', '78.061.914-7')
          ORDER BY tde.df_fecha_emision DESC
        `;

        const result = await poolSucursal.request()
          .input('startDate', sql.Date, new Date(start_date))
          .input('endDate', sql.Date, new Date(end_date))
          .query(query);

        ventas = result.recordset;
        resumen.cantidad = ventas.length;
        resumen.totalVentas = ventas.reduce((sum, v) => sum + (parseFloat(v.Total) || 0), 0);
        
        console.log('RESULTADO:', ventas.length, 'ventas');
      }
      
      // FERRETERÍAS Y MULTITIENDAS - QUERY REAL
      else if (sucursal.tipo_sucursal === 'FERRETERIA' || sucursal.tipo_sucursal === 'MULTITIENDA') {
        console.log('Ejecutando query FERRETERIA/MULTITIENDA (query real)...');

        const query = `
          SELECT Folio, Vendedor, Cliente, Rut_Cliente, Total AS Neto, Total*0.19 AS Iva, Total+(Total*0.19) AS Total, Doc, Fecha
          FROM (
            SELECT 
              RBO.RBO_FECHA_INGRESO AS Fecha, 
              RBO.RBO_NUMERO_BOLETA AS Folio, 
              'Boleta' AS Doc,
              MC.MC_RAZON_SOCIAL AS Cliente,
              CAST(rbo.MC_RUT_CLIENTE AS nvarchar) + '-' + CAST(MC.MC_DIGITO AS NVARCHAR) AS Rut_Cliente, 
              SUM(ISNULL(DBOL_PRECIO_LISTA, 0) * DBOL_CANTIDAD) AS Total, 
              SUM(ISNULL(MP_COSTO_FINAL, 0) * DBOL_CANTIDAD) AS Costo, 
              SUM(ISNULL(DBOL_PRECIO_LISTA, 0) * DBOL_CANTIDAD) - SUM(ISNULL(MP_COSTO_FINAL, 0) * DBOL_CANTIDAD) AS Utilidad,  
              ((SUM(ISNULL(DBOL_PRECIO_LISTA, 0) * DBOL_CANTIDAD) - SUM(ISNULL(MP_COSTO_FINAL, 0) * DBOL_CANTIDAD)) / NULLIF(SUM(ISNULL(DBOL_PRECIO_LISTA, 0) * DBOL_CANTIDAD), 0)) * 100 AS Margen, 
              MPE.MPE_NOMBRE_COMPLETO AS Vendedor
            FROM ERP_FACT_RES_BOLETAS rbo
            JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON RBO.ROC_NUMERO_ORDEN = ROC.ROC_NUMERO_ORDEN
            JOIN ERP_FACT_DET_BOLETAS DBO ON DBO.RBO_NUM_INTERNO_BO = RBO.RBO_NUM_INTERNO_BO
            JOIN ERP_USUARIOS_SISTEMAS US ON ROC.US_ID_USUARIO_SISTEMA = US.US_ID_USUARIO_SISTEMA
            JOIN ERP_MAESTRO_PERSONAS MPE ON MPE.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
            JOIN ERP_MAESTRO_CLIENTES MC ON MC.MC_RUT_CLIENTE = ROC.MC_RUT_CLIENTE
            WHERE MPE.TPERS_ID_TIPO_PERSONA IN ('3', '1') 
              AND MC.MC_RAZON_SOCIAL <> 'CLIENTE FERRETERIA (BOLETAS)' 
              AND rbo.RBO_FECHA_INGRESO BETWEEN @startDate AND @endDate
            GROUP BY 
              RBO.RBO_FECHA_INGRESO, 
              RBO.RBO_NUMERO_BOLETA, 
              rbo.MC_RUT_CLIENTE,
              MPE_NOMBRE_COMPLETO,
              MC.MC_RAZON_SOCIAL,
              MC.MC_DIGITO
              
            UNION ALL
            
            SELECT 
              RBO.RFC_FECHA_INGRESO AS Fecha, 
              RBO.RFC_NUMERO_FACTURA_CLI AS Folio, 
              'Factura' AS Doc,
              MC.MC_RAZON_SOCIAL AS Cliente,
              CAST(rbo.MC_RUT_CLIENTE AS nvarchar) + '-' + CAST(MC.MC_DIGITO AS NVARCHAR) AS Rut_Cliente, 
              SUM(ISNULL(DFC_PRECIO_LISTA, 0) * DFC_CANTIDAD) AS Total, 
              SUM(ISNULL(MP_COSTO_FINAL, 0) * DFC_CANTIDAD) AS Costo, 
              SUM(ISNULL(DFC_PRECIO_LISTA, 0) * DFC_CANTIDAD) - SUM(ISNULL(MP_COSTO_FINAL, 0) * DFC_CANTIDAD) AS Utilidad,  
              ((SUM(ISNULL(DFC_PRECIO_LISTA, 0) * DFC_CANTIDAD) - SUM(ISNULL(MP_COSTO_FINAL, 0) * DFC_CANTIDAD)) / NULLIF(SUM(ISNULL(DFC_PRECIO_LISTA, 0) * DFC_CANTIDAD), 0)) * 100 AS Margen, 
              MPE.MPE_NOMBRE_COMPLETO AS Vendedor
            FROM ERP_FACT_RES_FACTURA_CLIENTES rbo
            JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON RBO.ROC_NUMERO_ORDEN = ROC.ROC_NUMERO_ORDEN
            JOIN ERP_FACT_DET_FACTURA_CLIENTES DBO ON DBO.RFC_NUM_INTERNO_FA_CLI = RBO.RFC_NUM_INTERNO_FA_CLI
            JOIN ERP_USUARIOS_SISTEMAS US ON ROC.US_ID_USUARIO_SISTEMA = US.US_ID_USUARIO_SISTEMA
            JOIN ERP_MAESTRO_PERSONAS MPE ON MPE.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
            JOIN ERP_MAESTRO_CLIENTES MC ON MC.MC_RUT_CLIENTE = ROC.MC_RUT_CLIENTE
            WHERE MPE.TPERS_ID_TIPO_PERSONA IN ('3', '1') 
              AND MC.MC_RAZON_SOCIAL <> 'CLIENTE FERRETERIA (BOLETAS)' 
              AND MC.MC_RUT_CLIENTE NOT IN ('77204945','10429345','76236893','76955204','78061914','76446632','96726970')
              AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%APORTE%'
              AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%PUBLICIDAD%'
              AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%ARRIENDO%'
              AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%EXPO%' 
              AND rbo.RFC_FECHA_INGRESO BETWEEN @startDate AND @endDate
            GROUP BY 
              RBO.RFC_FECHA_INGRESO, 
              RBO.RFC_NUMERO_FACTURA_CLI, 
              rbo.MC_RUT_CLIENTE,
              MPE_NOMBRE_COMPLETO,
              MC.MC_RAZON_SOCIAL,
              MC.MC_DIGITO
          ) t
          ORDER BY t.Fecha DESC
        `;

        const result = await poolSucursal.request()
          .input('startDate', sql.Date, new Date(start_date))
          .input('endDate', sql.Date, new Date(end_date))
          .query(query);

        ventas = result.recordset;
        resumen.cantidad = ventas.length;
        resumen.totalVentas = ventas.reduce((sum, v) => sum + (parseFloat(v.Total) || 0), 0);
        
        console.log('RESULTADO:', ventas.length, 'ventas - Total: $', resumen.totalVentas.toLocaleString());
      }
      
      else {
        console.log('Tipo no soportado:', sucursal.tipo_sucursal);
        await poolSucursal.close();
        return res.json({ 
          success: false,
          message: `Tipo '${sucursal.tipo_sucursal}' no soportado`,
          ventas: []
        });
      }

    } catch (queryError) {
      console.log('ERROR Query:', queryError.message);
      console.log('Error Number:', queryError.number);
      await poolSucursal.close();
      return res.status(500).json({ 
        success: false,
        message: 'Error al ejecutar consulta',
        error: queryError.message
      });
    }

    await poolSucursal.close();
    console.log('========================================\n');
    
    return res.json({ 
      success: true,
      ventas: ventas,
      sucursal: {
        id: sucursal.id,
        nombre: sucursal.nombre,
        tipo: sucursal.tipo_sucursal
      },
      periodo: {
        inicio: start_date,
        fin: end_date
      },
      resumen: resumen
    });

  } catch (error) {
    console.log('ERROR GENERAL:', error.message);
    return res.status(500).json({ 
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

exports.getProductosByFolio = async (req, res) => {
  console.log('\n=== getProductosByFolio ===');
  
  try {
    const { folio, sucursal_id } = req.query;

    if (!folio || !sucursal_id) {
      return res.status(400).json({ 
        success: false,
        message: 'Folio y sucursal_id requeridos' 
      });
    }

    const pool = await poolPromise;
    const sucursalResult = await pool.request()
      .input('sucursalId', sql.Int, sucursal_id)
      .query('SELECT * FROM sucursales WHERE id = @sucursalId');

    if (sucursalResult.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Sucursal no encontrada' 
      });
    }

    const sucursal = sucursalResult.recordset[0];
    console.log('Sucursal:', sucursal.nombre, 'Tipo:', sucursal.tipo_sucursal);

    const configSucursal = {
      user: sucursal.usuario,
      password: sucursal.contrasena || '',
      server: sucursal.ip,
      database: sucursal.base_datos,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
      }
    };

    const poolSucursal = await new sql.ConnectionPool(configSucursal).connect();
    let productos = [];

    // SUPERMERCADOS - QUERY CORREGIDA
    if (sucursal.tipo_sucursal === 'SUPERMERCADO') {
      console.log('Query productos SUPERMERCADO (corregida)...');
      
      const query = `
        SELECT 
          tde.dn_numero_documento AS Folio,
          tdd.dc_codigo_barra AS Codigo,
          tdd.dg_glosa_producto AS Descripcion,
          tdd.dn_cantidad AS Cantidad,
          ISNULL(tdd.dq_unitario, 0)/1.19 AS Precio_Unitario,
          ((ISNULL(tdd.dq_bruto, 0) / 1.19) - ISNULL(tdd.dq_ganancia, 0)) AS Costo,
          ISNULL(tdd.dq_bruto, 0)/1.19 AS Total,
          ISNULL(tdd.dq_ganancia, 0) AS Utilidad,
          CASE 
            WHEN tdd.dq_unitario > 0 THEN 
              ((ISNULL(tdd.dq_ganancia, 0))/(ISNULL(tdd.dq_bruto, 0)/1.19))*100
            ELSE 0
          END AS Margen
        FROM 
          tb_documentos_detalle tdd
        JOIN 
          tb_documentos_encabezado tde ON tdd.dn_correlativo_documento = tde.dn_correlativo
        WHERE 
          tde.dn_numero_documento = @folio
          AND tdd.dc_codigo_barra <> '0'
      `;

      const result = await poolSucursal.request()
        .input('folio', sql.BigInt, folio)
        .query(query);

      productos = result.recordset;
      console.log('Productos encontrados:', productos.length);
    } 
    
    // FERRETERÍAS Y MULTITIENDAS
    else if (sucursal.tipo_sucursal === 'FERRETERIA' || sucursal.tipo_sucursal === 'MULTITIENDA') {
      console.log('Query productos FERRETERIA/MULTITIENDA...');
      
      const query = `
        SELECT Folio, Codigo, Descripcion, Cantidad, Precio_Unitario, Costo, Total, Utilidad, Margen 
        FROM (
          SELECT 
            RBO.RBO_NUMERO_BOLETA AS Folio, 
            MP_CODIGO_PRODUCTO AS Codigo,
            DBOL_DESCRIPCION_PRODUCTO AS Descripcion,
            DBOL_CANTIDAD AS Cantidad,
            DBOL_PRECIO_LISTA AS Precio_Unitario,
            (MP_COSTO_FINAL * DBOL_CANTIDAD) AS Costo,
            (DBOL_PRECIO_LISTA * DBOL_CANTIDAD) AS Total,
            ((DBOL_PRECIO_LISTA * DBOL_CANTIDAD) - (MP_COSTO_FINAL * DBOL_CANTIDAD)) AS Utilidad,
            (((DBOL_PRECIO_LISTA * DBOL_CANTIDAD) - (MP_COSTO_FINAL * DBOL_CANTIDAD))/NULLIF((DBOL_PRECIO_LISTA * DBOL_CANTIDAD), 0))*100 AS Margen
          FROM ERP_FACT_RES_BOLETAS rbo
          JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON RBO.ROC_NUMERO_ORDEN = ROC.ROC_NUMERO_ORDEN
          JOIN ERP_FACT_DET_BOLETAS DBO ON DBO.RBO_NUM_INTERNO_BO = RBO.RBO_NUM_INTERNO_BO
          JOIN ERP_USUARIOS_SISTEMAS US ON ROC.US_ID_USUARIO_SISTEMA = US.US_ID_USUARIO_SISTEMA
          JOIN ERP_MAESTRO_PERSONAS MPE ON MPE.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
          JOIN ERP_MAESTRO_CLIENTES MC ON MC.MC_RUT_CLIENTE = ROC.MC_RUT_CLIENTE
          WHERE MPE.TPERS_ID_TIPO_PERSONA IN ('3', '1') 
            AND MC.MC_RAZON_SOCIAL <> 'CLIENTE FERRETERIA (BOLETAS)'
          GROUP BY 
            RBO.RBO_NUMERO_BOLETA, 
            MP_CODIGO_PRODUCTO,
            DBOL_DESCRIPCION_PRODUCTO,
            DBOL_CANTIDAD,
            DBOL_PRECIO_LISTA,
            MP_COSTO_FINAL
            
          UNION ALL
          
          SELECT 
            RBO.RFC_NUMERO_FACTURA_CLI AS Folio, 
            MP_CODIGO_PRODUCTO AS Codigo,
            DFC_DESCRIPCION_PRODUCTO AS Descripcion,
            DFC_CANTIDAD AS Cantidad,
            DFC_PRECIO_LISTA AS Precio_Unitario,
            (MP_COSTO_FINAL * DFC_CANTIDAD) AS Costo,
            (DFC_PRECIO_LISTA * DFC_CANTIDAD) AS Total,
            ((DFC_PRECIO_LISTA * DFC_CANTIDAD) - (MP_COSTO_FINAL * DFC_CANTIDAD)) AS Utilidad,
            (((DFC_PRECIO_LISTA * DFC_CANTIDAD) - (MP_COSTO_FINAL * DFC_CANTIDAD))/NULLIF((DFC_PRECIO_LISTA * DFC_CANTIDAD), 0))*100 AS Margen
          FROM ERP_FACT_RES_FACTURA_CLIENTES rbo
          JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON RBO.ROC_NUMERO_ORDEN = ROC.ROC_NUMERO_ORDEN
          JOIN ERP_FACT_DET_FACTURA_CLIENTES DBO ON DBO.RFC_NUM_INTERNO_FA_CLI = RBO.RFC_NUM_INTERNO_FA_CLI
          JOIN ERP_USUARIOS_SISTEMAS US ON ROC.US_ID_USUARIO_SISTEMA = US.US_ID_USUARIO_SISTEMA
          JOIN ERP_MAESTRO_PERSONAS MPE ON MPE.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
          JOIN ERP_MAESTRO_CLIENTES MC ON MC.MC_RUT_CLIENTE = ROC.MC_RUT_CLIENTE
          WHERE MPE.TPERS_ID_TIPO_PERSONA IN ('3', '1') 
            AND MC.MC_RAZON_SOCIAL <> 'CLIENTE FERRETERIA (BOLETAS)' 
            AND MC.MC_RUT_CLIENTE NOT IN ('77204945','10429345','76236893','76955204','78061914','76446632','96726970')
            AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%APORTE%'
            AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%PUBLICIDAD%'
            AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%ARRIENDO%'
            AND DBO.DFC_DESCRIPCION_PRODUCTO NOT LIKE '%EXPO%'
          GROUP BY 
            RBO.RFC_NUMERO_FACTURA_CLI, 
            MP_CODIGO_PRODUCTO,
            DFC_DESCRIPCION_PRODUCTO,
            DFC_CANTIDAD,
            DFC_PRECIO_LISTA,
            MP_COSTO_FINAL
        ) t
        WHERE t.Folio = @folio
      `;

      try {
        const result = await poolSucursal.request()
          .input('folio', sql.VarChar, folio)
          .query(query);
        productos = result.recordset;
        console.log('Productos encontrados:', productos.length);
      } catch (detailError) {
        console.log('Error query productos:', detailError.message);
        productos = [];
      }
    }

    await poolSucursal.close();
    console.log('=== FIN getProductosByFolio ===\n');
    
    return res.json({ 
      success: true, 
      productos: productos,
      folio: folio,
      sucursal: {
        id: sucursal.id,
        nombre: sucursal.nombre,
        tipo: sucursal.tipo_sucursal
      },
      total: productos.length
    });

  } catch (error) {
    console.log('ERROR en getProductosByFolio:', error.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor',
      error: error.message
    });
  }
};