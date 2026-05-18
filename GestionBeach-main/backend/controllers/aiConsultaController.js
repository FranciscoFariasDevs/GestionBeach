const Groq = require('groq-sdk');
const sql = require('mssql');
const { poolPromise } = require('../config/db');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL_ROUTER   = 'llama-3.3-70b-versatile';   // selección de herramienta (70b necesario para tool calling exacto)
const MODEL_NARRATOR = 'llama-3.3-70b-versatile';   // narración de resultados

const CONN_OPTS = {
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true, requestTimeout: 12000, connectionTimeout: 5000 },
  pool: { max: 1, min: 0, idleTimeoutMillis: 5000 },
};

const PERSONALIDAD = `BeachBot 🤖, asistente ERP chileno. Español, números con puntos de miles. Máx 3 oraciones. Sin mencionar SQL ni BD. Creador: Francisco Farías. Regla: Narra SOLO los datos recibidos, sin sugerencias ni mencionar otras capacidades.`;

// ── Herramientas disponibles para el LLM ─────────────────────────────────────
const TOOLS_GROQ = [
  {
    type: 'function',
    function: {
      name: 'get_ventas_resumen',
      description: 'Ventas totales por día y tipo de documento (boletas, facturas) en un período.',
      parameters: {
        type: 'object',
        properties: {
          fecha_desde: { type: 'string', description: 'Fecha inicio YYYY-MM-DD' },
          fecha_hasta: { type: 'string', description: 'Fecha fin YYYY-MM-DD' },
        },
        required: ['fecha_desde', 'fecha_hasta'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_productos_mas_vendidos',
      description: 'Top productos más vendidos por cantidad en un período.',
      parameters: {
        type: 'object',
        properties: {
          fecha_desde: { type: 'string', description: 'Fecha inicio YYYY-MM-DD' },
          fecha_hasta: { type: 'string', description: 'Fecha fin YYYY-MM-DD' },
        },
        required: ['fecha_desde', 'fecha_hasta'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_anulaciones',
      description: 'Órdenes anuladas en un período (solo ferreterías).',
      parameters: {
        type: 'object',
        properties: {
          fecha_desde: { type: 'string', description: 'Fecha inicio YYYY-MM-DD' },
          fecha_hasta: { type: 'string', description: 'Fecha fin YYYY-MM-DD' },
        },
        required: ['fecha_desde', 'fecha_hasta'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_ajustes_bodega',
      description: 'Ajustes de inventario/bodega en un período (solo ferreterías).',
      parameters: {
        type: 'object',
        properties: {
          fecha_desde: { type: 'string', description: 'Fecha inicio YYYY-MM-DD' },
          fecha_hasta: { type: 'string', description: 'Fecha fin YYYY-MM-DD' },
        },
        required: ['fecha_desde', 'fecha_hasta'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_ventas_por_vendedor',
      description: 'Ranking de vendedores/cajeros por total vendido en un período.',
      parameters: {
        type: 'object',
        properties: {
          fecha_desde: { type: 'string', description: 'Fecha inicio YYYY-MM-DD' },
          fecha_hasta: { type: 'string', description: 'Fecha fin YYYY-MM-DD' },
        },
        required: ['fecha_desde', 'fecha_hasta'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_guias_emitidas',
      description: 'Guías de despacho emitidas en un período (solo ferreterías).',
      parameters: {
        type: 'object',
        properties: {
          fecha_desde: { type: 'string', description: 'Fecha inicio YYYY-MM-DD' },
          fecha_hasta: { type: 'string', description: 'Fecha fin YYYY-MM-DD' },
        },
        required: ['fecha_desde', 'fecha_hasta'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_hora_pick',
      description: 'Hora pico de ventas: distribución de transacciones y montos por hora del día.',
      parameters: {
        type: 'object',
        properties: {
          fecha_desde: { type: 'string', description: 'Fecha inicio YYYY-MM-DD' },
          fecha_hasta: { type: 'string', description: 'Fecha fin YYYY-MM-DD' },
        },
        required: ['fecha_desde', 'fecha_hasta'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_folios_disponibles',
      description: 'Folios SII por tipo (boleta, factura, guía de despacho, NC, ND): cuántos quedan, estado del CAF, si está vencido. Solo supermercados.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_notas_credito',
      description: 'Notas de crédito/devoluciones emitidas en un período.',
      parameters: {
        type: 'object',
        properties: {
          fecha_desde: { type: 'string', description: 'Fecha inicio YYYY-MM-DD' },
          fecha_hasta:  { type: 'string', description: 'Fecha fin YYYY-MM-DD' },
        },
        required: ['fecha_desde', 'fecha_hasta'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_stock_valorizado',
      description: 'Valor del inventario en bodega por familia de productos (solo ferreterías).',
      parameters: {
        type: 'object',
        properties: {
          familia: { type: 'string', description: 'Filtrar por familia (vacío = todos)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_ordenes_pendientes',
      description: 'Órdenes de compra pendientes de recibir en un período (solo ferreterías).',
      parameters: {
        type: 'object',
        properties: {
          fecha_desde: { type: 'string', description: 'Fecha inicio YYYY-MM-DD' },
          fecha_hasta:  { type: 'string', description: 'Fecha fin YYYY-MM-DD' },
        },
        required: ['fecha_desde', 'fecha_hasta'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_clientes_top',
      description: 'Top clientes por monto comprado en un período (solo ferreterías).',
      parameters: {
        type: 'object',
        properties: {
          fecha_desde: { type: 'string', description: 'Fecha inicio YYYY-MM-DD' },
          fecha_hasta:  { type: 'string', description: 'Fecha fin YYYY-MM-DD' },
        },
        required: ['fecha_desde', 'fecha_hasta'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_proveedores_top',
      description: 'Top proveedores por monto de compras en un período (solo ferreterías).',
      parameters: {
        type: 'object',
        properties: {
          fecha_desde: { type: 'string', description: 'Fecha inicio YYYY-MM-DD' },
          fecha_hasta:  { type: 'string', description: 'Fecha fin YYYY-MM-DD' },
        },
        required: ['fecha_desde', 'fecha_hasta'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sin_herramienta',
      description: 'La pregunta no corresponde a ninguna herramienta disponible.',
      parameters: {
        type: 'object',
        properties: {
          motivo: { type: 'string' },
        },
      },
    },
  },
];

// ── Ejecutar herramienta con SQL probado ────────────────────────────────────
async function ejecutarHerramienta(nombre, params, pool, tipoSistema) {
  const fechaDesde = params.fecha_desde || new Date().toISOString().split('T')[0];
  const fechaHasta = params.fecha_hasta || new Date().toISOString().split('T')[0];
  const limite = 20;

  switch (nombre) {
    case 'get_ventas_resumen': {
      if (tipoSistema === 'SUPERMERCADO') {
        const r = await pool.request()
          .input('f1', sql.Date, new Date(fechaDesde))
          .input('f2', sql.Date, new Date(fechaHasta))
          .query(`
            SELECT
              CAST(tde.df_fecha_emision AS DATE) AS Fecha,
              CASE tde.dc_codigo_centralizacion
                WHEN '0033' THEN 'Factura'
                WHEN '0039' THEN 'Boleta'
                WHEN '1599' THEN 'Venta Cigarros'
                ELSE 'Otro'
              END AS TipoDoc,
              COUNT(*) AS CantDocumentos,
              SUM(ISNULL(tde.dq_bruto, 0)) AS TotalBruto
            FROM tb_documentos_encabezado tde
            WHERE CAST(tde.df_fecha_emision AS DATE) BETWEEN @f1 AND @f2
              AND tde.dc_codigo_centralizacion IN ('0033', '0039', '1599')
              AND tde.dn_correlativo_caja IS NOT NULL
              AND tde.dc_rut_documento NOT IN ('010.429.345-K', '076.236.893-5', '076.775.326-8', '78.061.914-7')
            GROUP BY CAST(tde.df_fecha_emision AS DATE), tde.dc_codigo_centralizacion
            ORDER BY Fecha DESC
          `);
        return r.recordset;
      }
      if (tipoSistema === 'FERRETERIA' || tipoSistema === 'MULTITIENDA') {
        const r = await pool.request()
          .input('f1', sql.Date, new Date(fechaDesde))
          .input('f2', sql.Date, new Date(fechaHasta))
          .query(`
            SELECT Fecha, TipoDoc, COUNT(*) AS CantDocumentos, SUM(Total) AS TotalBruto
            FROM (
              SELECT CAST(RBO.RBO_FECHA_INGRESO AS DATE) AS Fecha, 'Boleta' AS TipoDoc,
                SUM(ISNULL(DBOL.DBOL_PRECIO_LISTA, 0) * DBOL.DBOL_CANTIDAD) AS Total
              FROM ERP_FACT_RES_BOLETAS RBO
              JOIN ERP_FACT_DET_BOLETAS DBOL ON DBOL.RBO_NUM_INTERNO_BO = RBO.RBO_NUM_INTERNO_BO
              WHERE CAST(RBO.RBO_FECHA_INGRESO AS DATE) BETWEEN @f1 AND @f2
              GROUP BY CAST(RBO.RBO_FECHA_INGRESO AS DATE), RBO.RBO_NUMERO_BOLETA

              UNION ALL

              SELECT CAST(RBO.RFC_FECHA_INGRESO AS DATE) AS Fecha, 'Factura' AS TipoDoc,
                SUM(ISNULL(DBO.DFC_PRECIO_LISTA, 0) * DBO.DFC_CANTIDAD) AS Total
              FROM ERP_FACT_RES_FACTURA_CLIENTES RBO
              JOIN ERP_FACT_DET_FACTURA_CLIENTES DBO ON DBO.RFC_NUM_INTERNO_FA_CLI = RBO.RFC_NUM_INTERNO_FA_CLI
              WHERE CAST(RBO.RFC_FECHA_INGRESO AS DATE) BETWEEN @f1 AND @f2
              GROUP BY CAST(RBO.RFC_FECHA_INGRESO AS DATE), RBO.RFC_NUMERO_FACTURA_CLI
            ) t
            GROUP BY Fecha, TipoDoc
            ORDER BY Fecha DESC
          `);
        return r.recordset;
      }
      return [];
    }

    case 'get_productos_mas_vendidos': {
      if (tipoSistema === 'SUPERMERCADO') {
        const r = await pool.request()
          .input('f1', sql.DateTime, new Date(fechaDesde + 'T00:00:00'))
          .input('f2', sql.DateTime, new Date(fechaHasta + 'T23:59:59'))
          .query(`
            SELECT TOP ${limite}
              ISNULL(tdd.dg_glosa_producto, 'Sin Descripción') AS Descripcion,
              tdd.dc_codigo_barra AS CodigoBarra,
              SUM(CAST(ISNULL(tdd.dn_cantidad, 0) AS INT)) AS Cantidad,
              SUM(CAST(ISNULL(tdd.dq_bruto, 0) AS FLOAT)) AS TotalVenta
            FROM tb_documentos_encabezado tde
              INNER JOIN tb_documentos_detalle tdd ON tdd.dn_correlativo_documento = tde.dn_correlativo
            WHERE LTRIM(RTRIM(ISNULL(tde.dc_codigo_centralizacion, ''))) IN ('0039', '1599')
              AND tde.df_fecha_emision >= @f1
              AND tde.df_fecha_emision <= @f2
              AND ISNULL(tdd.dn_cantidad, 0) > 0
              AND tdd.dc_codigo_barra IS NOT NULL AND tdd.dc_codigo_barra != ''
            GROUP BY tdd.dg_glosa_producto, tdd.dc_codigo_barra
            HAVING SUM(CAST(ISNULL(tdd.dn_cantidad, 0) AS INT)) > 0
            ORDER BY Cantidad DESC
          `);
        return r.recordset;
      }
      if (tipoSistema === 'FERRETERIA' || tipoSistema === 'MULTITIENDA') {
        // Intentar ERP_STD primero, luego ERP_ALT
        try {
          const r = await pool.request()
            .input('f1', sql.DateTime, new Date(fechaDesde + 'T00:00:00'))
            .input('f2', sql.DateTime, new Date(fechaHasta + 'T23:59:59'))
            .query(`
              SELECT TOP ${limite}
                MP.MP_NOMBRE_PRODUCTO AS Descripcion,
                MP.MP_CODIGO_PRODUCTO AS CodigoBarra,
                SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS INT)) AS Cantidad,
                SUM(CAST(ISNULL(DBOL.DBOL_PRECIO_LISTA * DBOL.DBOL_CANTIDAD, 0) AS FLOAT)) AS TotalVenta
              FROM ERP_FACT_RES_BOLETAS RBO
                JOIN ERP_FACT_DET_BOLETAS DBOL ON DBOL.RBO_NUM_INTERNO_BO = RBO.RBO_NUM_INTERNO_BO
                JOIN ERP_MAESTRO_PRODUCTOS MP ON MP.MP_CODIGO_PRODUCTO = DBOL.MP_CODIGO_PRODUCTO
              WHERE RBO.RBO_FECHA_INGRESO BETWEEN @f1 AND @f2
                AND DBOL.DBOL_CANTIDAD > 0
              GROUP BY MP.MP_NOMBRE_PRODUCTO, MP.MP_CODIGO_PRODUCTO
              HAVING SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS INT)) > 0
              ORDER BY Cantidad DESC
            `);
          return r.recordset;
        } catch {
          const r = await pool.request()
            .input('f1', sql.DateTime, new Date(fechaDesde + 'T00:00:00'))
            .input('f2', sql.DateTime, new Date(fechaHasta + 'T23:59:59'))
            .query(`
              SELECT TOP ${limite}
                MP.MP_DESCRIPCION_PRODUCTO AS Descripcion,
                MP.MP_CODIGO_PRODUCTO AS CodigoBarra,
                SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS INT)) AS Cantidad,
                SUM(CAST(ISNULL(DBOL.DBOL_PRECIO_LISTA * DBOL.DBOL_CANTIDAD, 0) AS FLOAT)) AS TotalVenta
              FROM ERP_FACT_RES_BOLETAS RBO
                JOIN ERP_FACT_DET_BOLETAS DBOL ON DBOL.RBO_NUM_INTERNO_BO = RBO.RBO_NUM_INTERNO_BO
                JOIN ERP_MAESTRO_PRODUCTOS MP ON MP.MP_CODIGO_PRODUCTO = DBOL.MP_CODIGO_PRODUCTO
              WHERE RBO.RBO_FECHA_INGRESO BETWEEN @f1 AND @f2
                AND DBOL.DBOL_CANTIDAD > 0
              GROUP BY MP.MP_DESCRIPCION_PRODUCTO, MP.MP_CODIGO_PRODUCTO
              HAVING SUM(CAST(ISNULL(DBOL.DBOL_CANTIDAD, 0) AS INT)) > 0
              ORDER BY Cantidad DESC
            `);
          return r.recordset;
        }
      }
      return [];
    }

    case 'get_anulaciones': {
      if (tipoSistema !== 'FERRETERIA' && tipoSistema !== 'MULTITIENDA') {
        return [{ mensaje: 'Anulaciones disponibles solo para ferreterías.' }];
      }
      const r = await pool.request()
        .input('f1', sql.DateTime, new Date(fechaDesde + 'T00:00:00'))
        .input('f2', sql.DateTime, new Date(fechaHasta + 'T23:59:59'))
        .query(`
          SELECT DISTINCT TOP 100
            RES.ROC_NUMERO_ORDEN AS NumVenta,
            MPE.MPE_NOMBRE_COMPLETO + ' ' + MPE.MPE_APELLIDO_PATERNO AS Responsable,
            RES.ROC_NETO AS Neto,
            RES.ROC_TOTAL AS Total,
            CAST(RES.ROC_FECHA_INGRESO AS DATE) AS Fecha
          FROM ERP_OP_RES_ORDEN_COMPRA RES
          JOIN ERP_USUARIOS_SISTEMAS US ON US.US_ID_USUARIO_SISTEMA = RES.US_ID_USUARIO_SISTEMA
          JOIN ERP_MAESTRO_PERSONAS MPE ON MPE.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
          WHERE RES.EO_ID_ESTADO_ORDEN = '1'
            AND MPE.MPR_RUT_PROVEEDOR IS NOT NULL
            AND RES.ROC_FECHA_INGRESO BETWEEN @f1 AND @f2
          ORDER BY RES.ROC_FECHA_INGRESO DESC
        `);
      return r.recordset;
    }

    case 'get_ajustes_bodega': {
      if (tipoSistema !== 'FERRETERIA' && tipoSistema !== 'MULTITIENDA') {
        return [{ mensaje: 'Ajustes de bodega disponibles solo para ferreterías.' }];
      }
      const r = await pool.request()
        .input('f1', sql.VarChar, fechaDesde + ' 00:00:00')
        .input('f2', sql.VarChar, fechaHasta + ' 23:59:59')
        .query(`
          SELECT TOP 100
            CAST(bra.AJU_FECHA_INGRESO AS DATE) AS Fecha,
            bta.TAJU_DESCRIPCION_TIPO_AJUSTE AS TipoAjuste,
            bra.AJU_OBSERVACION AS Observacion,
            COUNT(bdet.MP_CODIGO_PRODUCTO) AS CantProductos,
            SUM(ABS(bdet.DAJU_PRECIO * bdet.DAJU_CANTIDAD)) AS TotalValorizado
          FROM ERP_BOD_RES_AJUSTES bra
          JOIN ERP_BOD_TIPO_AJUSTE bta ON bta.TAJU_ID_TIPO_AJUSTE = bra.TAJU_ID_TIPO_AJUSTE
          JOIN ERP_BOD_DET_AJUSTES bdet ON bdet.AJU_ID_AJUSTE = bra.AJU_ID_AJUSTE
          WHERE bra.AJU_FECHA_INGRESO BETWEEN @f1 AND @f2
            AND bdet.DAJU_CANTIDAD <> 0
          GROUP BY bra.AJU_ID_AJUSTE, CAST(bra.AJU_FECHA_INGRESO AS DATE),
                   bta.TAJU_DESCRIPCION_TIPO_AJUSTE, bra.AJU_OBSERVACION
          ORDER BY Fecha DESC
        `);
      return r.recordset;
    }

    case 'get_folios_disponibles': {
      if (tipoSistema !== 'SUPERMERCADO') {
        return [{ mensaje: 'Consulta de folios SII disponible solo para supermercados.' }];
      }

      // Verificar qué tablas de folios existen en esta BD (puede variar por sucursal)
      const tablasFolioRes = await pool.request().query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME IN ('tb_sii_folios33','tb_sii_folios34','tb_sii_folios39',
                              'tb_sii_folios41','tb_sii_folios52','tb_sii_folios56','tb_sii_folios61')
      `);
      const tablasExistentes = tablasFolioRes.recordset.map(r => r.TABLE_NAME);

      const mapaTablas = {
        'tb_sii_folios33': '33', 'tb_sii_folios34': '34',
        'tb_sii_folios39': '39', 'tb_sii_folios41': '41',
        'tb_sii_folios52': '52', 'tb_sii_folios56': '56',
        'tb_sii_folios61': '61',
      };

      const unionParts = Object.entries(mapaTablas)
        .filter(([tabla]) => tablasExistentes.includes(tabla))
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
          fd.dc_tipo AS Tipo,
          CASE fd.dc_tipo
            WHEN '33' THEN 'Factura Electrónica'
            WHEN '34' THEN 'Factura No Afecta'
            WHEN '39' THEN 'Boleta Electrónica'
            WHEN '41' THEN 'Boleta No Afecta'
            WHEN '52' THEN 'Guía de Despacho'
            WHEN '56' THEN 'Nota de Débito'
            WHEN '61' THEN 'Nota de Crédito'
            ELSE 'Tipo ' + fd.dc_tipo
          END AS TipoDocumento,
          fd.dn_caf_desde AS FolioDesde,
          fd.dn_caf_hasta AS FolioHasta,
          fd.dn_caf_hasta - fd.dn_caf_desde + 1 AS TotalCAF,
          ISNULL(u.ultimo_folio, fd.dn_caf_desde - 1) AS UltimoFolioUsado,
          fd.dn_caf_hasta - ISNULL(u.ultimo_folio, fd.dn_caf_desde - 1) AS FoliosRestantes,
          CONVERT(VARCHAR, fd.df_caducidad_caf, 23) AS VenceCAF,
          DATEDIFF(DAY, GETDATE(), fd.df_caducidad_caf) AS DiasHastaVencimiento,
          CASE WHEN fd.df_caducidad_caf < GETDATE() THEN 'VENCIDO' ELSE 'VIGENTE' END AS EstadoCAF
        FROM tb_sii_folios_disponibles fd
        JOIN UltimoCAF uc ON uc.dc_tipo = fd.dc_tipo AND uc.max_hasta = fd.dn_caf_hasta
        LEFT JOIN ${unionSQL} ON u.tipo = fd.dc_tipo
        ORDER BY fd.dc_tipo
      `);
      return r.recordset;
    }

    case 'get_hora_pick': {
      if (tipoSistema === 'SUPERMERCADO') {
        const r = await pool.request()
          .input('f1', sql.Date, new Date(fechaDesde))
          .input('f2', sql.Date, new Date(fechaHasta))
          .query(`
            SELECT
              DATEPART(HOUR, tde.df_fecha_emision) AS Hora,
              CAST(DATEPART(HOUR, tde.df_fecha_emision) AS VARCHAR) + ':00' AS HoraFormato,
              COUNT(*) AS CantDocumentos,
              SUM(ISNULL(tde.dq_bruto, 0)) AS TotalVentas
            FROM tb_documentos_encabezado tde
            WHERE CAST(tde.df_fecha_emision AS DATE) BETWEEN @f1 AND @f2
              AND tde.dc_codigo_centralizacion IN ('0033', '0039', '1599')
              AND tde.dn_correlativo_caja IS NOT NULL
              AND tde.dc_rut_documento NOT IN ('010.429.345-K','076.236.893-5','076.775.326-8','78.061.914-7')
            GROUP BY DATEPART(HOUR, tde.df_fecha_emision)
            ORDER BY CantDocumentos DESC
          `);
        return r.recordset;
      }
      if (tipoSistema === 'FERRETERIA' || tipoSistema === 'MULTITIENDA') {
        const r = await pool.request()
          .input('f1', sql.Date, new Date(fechaDesde))
          .input('f2', sql.Date, new Date(fechaHasta))
          .query(`
            SELECT
              DATEPART(HOUR, RBO.RBO_FECHA_INGRESO) AS Hora,
              CAST(DATEPART(HOUR, RBO.RBO_FECHA_INGRESO) AS VARCHAR) + ':00' AS HoraFormato,
              COUNT(DISTINCT RBO.RBO_NUMERO_BOLETA) AS CantDocumentos,
              SUM(ISNULL(DBOL.DBOL_PRECIO_LISTA, 0) * DBOL.DBOL_CANTIDAD) AS TotalVentas
            FROM ERP_FACT_RES_BOLETAS RBO
            JOIN ERP_FACT_DET_BOLETAS DBOL ON DBOL.RBO_NUM_INTERNO_BO = RBO.RBO_NUM_INTERNO_BO
            WHERE CAST(RBO.RBO_FECHA_INGRESO AS DATE) BETWEEN @f1 AND @f2
            GROUP BY DATEPART(HOUR, RBO.RBO_FECHA_INGRESO)
            ORDER BY CantDocumentos DESC
          `);
        return r.recordset;
      }
      return [];
    }

    case 'get_ventas_por_vendedor': {
      if (tipoSistema === 'SUPERMERCADO') {
        const r = await pool.request()
          .input('f1', sql.Date, new Date(fechaDesde))
          .input('f2', sql.Date, new Date(fechaHasta))
          .query(`
            SELECT TOP 20
              ISNULL(re.dg_razon_social, 'Sin vendedor') AS Vendedor,
              COUNT(*) AS CantDocumentos,
              SUM(ISNULL(tde.dq_bruto, 0)) AS TotalVentas
            FROM tb_documentos_encabezado tde
            LEFT JOIN tb_rut_encabezado re ON re.dc_rut = tde.dc_rut_crea_documento
            WHERE CAST(tde.df_fecha_emision AS DATE) BETWEEN @f1 AND @f2
              AND tde.dc_codigo_centralizacion IN ('0033', '0039', '1599')
              AND tde.dn_correlativo_caja IS NOT NULL
              AND tde.dc_rut_documento NOT IN ('010.429.345-K', '076.236.893-5', '076.775.326-8', '78.061.914-7')
            GROUP BY re.dg_razon_social
            ORDER BY TotalVentas DESC
          `);
        return r.recordset;
      }
      if (tipoSistema === 'FERRETERIA' || tipoSistema === 'MULTITIENDA') {
        const r = await pool.request()
          .input('f1', sql.Date, new Date(fechaDesde))
          .input('f2', sql.Date, new Date(fechaHasta))
          .query(`
            SELECT TOP 20
              MPE.MPE_NOMBRE_COMPLETO + ' ' + MPE.MPE_APELLIDO_PATERNO AS Vendedor,
              COUNT(DISTINCT RBO.RBO_NUMERO_BOLETA) AS CantBoletas,
              SUM(ISNULL(DBOL.DBOL_PRECIO_LISTA, 0) * DBOL.DBOL_CANTIDAD) AS TotalVentas
            FROM ERP_FACT_RES_BOLETAS RBO
            JOIN ERP_FACT_DET_BOLETAS DBOL ON DBOL.RBO_NUM_INTERNO_BO = RBO.RBO_NUM_INTERNO_BO
            JOIN ERP_OP_RES_ORDEN_COMPRA ROC ON RBO.ROC_NUMERO_ORDEN = ROC.ROC_NUMERO_ORDEN
            JOIN ERP_USUARIOS_SISTEMAS US ON ROC.US_ID_USUARIO_SISTEMA = US.US_ID_USUARIO_SISTEMA
            JOIN ERP_MAESTRO_PERSONAS MPE ON MPE.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
            WHERE CAST(RBO.RBO_FECHA_INGRESO AS DATE) BETWEEN @f1 AND @f2
              AND MPE.TPERS_ID_TIPO_PERSONA IN ('3', '1')
            GROUP BY MPE.MPE_NOMBRE_COMPLETO, MPE.MPE_APELLIDO_PATERNO
            ORDER BY TotalVentas DESC
          `);
        return r.recordset;
      }
      return [];
    }

    case 'get_guias_emitidas': {
      if (tipoSistema !== 'FERRETERIA' && tipoSistema !== 'MULTITIENDA') {
        return [{ mensaje: 'Guías de despacho disponibles solo para ferreterías.' }];
      }
      const r = await pool.request()
        .input('f1', sql.VarChar, fechaDesde + ' 00:00:01')
        .input('f2', sql.VarChar, fechaHasta + ' 23:59:00')
        .query(`
          SELECT TOP 100
            reg.BEGC_NUMERO_GUIA_CLI AS Folio,
            reg.BEGC_DIRECCION_DESTINO AS Destino,
            CONVERT(NUMERIC, reg.BEGC_TOTAL) AS Total,
            CAST(reg.BEGC_FECHA_HORA_EMISION AS DATE) AS Fecha,
            ie.BEINGE_DESCRIPCION_ESTADO AS Estado,
            COUNT(deg.MP_CODIGO_PRODUCTO) AS CantProductos
          FROM ERP_BOD_RES_EMISION_GUIAS reg
          JOIN ERP_BOD_ESTADO_INGRESO_EGRESO ie ON ie.BEINGE_ID_ESTADO_INGRESO_EGRESO = reg.BEINGE_ID_ESTADO_INGRESO_EGRESO
          JOIN ERP_BOD_DET_EMISION_GUIAS deg ON deg.BEGC_FOLIO_EGRESO_CLI = reg.BEGC_FOLIO_EGRESO_CLI
          WHERE reg.BEGC_FECHA_HORA_EMISION BETWEEN @f1 AND @f2
          GROUP BY reg.BEGC_NUMERO_GUIA_CLI, reg.BEGC_DIRECCION_DESTINO,
                   reg.BEGC_TOTAL, CAST(reg.BEGC_FECHA_HORA_EMISION AS DATE), ie.BEINGE_DESCRIPCION_ESTADO
          ORDER BY Fecha DESC
        `);
      return r.recordset;
    }

    case 'get_notas_credito': {
      if (tipoSistema === 'SUPERMERCADO') {
        const r = await pool.request()
          .input('f1', sql.Date, new Date(fechaDesde))
          .input('f2', sql.Date, new Date(fechaHasta))
          .query(`
            SELECT
              CAST(tde.df_fecha_emision AS DATE) AS Fecha,
              COUNT(*) AS CantNC,
              SUM(ISNULL(tde.dq_bruto, 0)) AS TotalNC
            FROM tb_documentos_encabezado tde
            WHERE CAST(tde.df_fecha_emision AS DATE) BETWEEN @f1 AND @f2
              AND tde.dc_codigo_centralizacion IN ('0061','0056')
              AND tde.dn_correlativo_caja IS NOT NULL
            GROUP BY CAST(tde.df_fecha_emision AS DATE)
            ORDER BY Fecha DESC
          `);
        return r.recordset;
      }
      if (tipoSistema === 'FERRETERIA' || tipoSistema === 'MULTITIENDA') {
        const r = await pool.request()
          .input('f1', sql.DateTime, new Date(fechaDesde + 'T00:00:00'))
          .input('f2', sql.DateTime, new Date(fechaHasta + 'T23:59:59'))
          .query(`
            SELECT TOP 50
              CAST(nc.RNC_FECHA_INGRESO AS DATE) AS Fecha,
              nc.RNC_NUMERO_NC AS NumeroNC,
              CLI.MC_NOMBRE_CLIENTE AS Cliente,
              SUM(ISNULL(det.DNC_PRECIO_LISTA, 0) * det.DNC_CANTIDAD) AS TotalNC,
              COUNT(det.MP_CODIGO_PRODUCTO) AS CantProductos
            FROM ERP_FACT_RES_NC_CLIENTE nc
            JOIN ERP_FACT_DET_NC_CLIENTE det ON det.RNC_NUM_INTERNO_NC = nc.RNC_NUM_INTERNO_NC
            LEFT JOIN ERP_MAESTRO_CLIENTES CLI ON CLI.MC_RUT_CLIENTE = nc.MC_RUT_CLIENTE
            WHERE nc.RNC_FECHA_INGRESO BETWEEN @f1 AND @f2
            GROUP BY CAST(nc.RNC_FECHA_INGRESO AS DATE), nc.RNC_NUMERO_NC, CLI.MC_NOMBRE_CLIENTE
            ORDER BY Fecha DESC
          `);
        return r.recordset;
      }
      return [];
    }

    case 'get_stock_valorizado': {
      if (tipoSistema !== 'FERRETERIA' && tipoSistema !== 'MULTITIENDA') {
        return [{ mensaje: 'Consulta de stock disponible solo para ferreterías.' }];
      }
      const familiaFiltro = params.familia || '';
      const r = await pool.request()
        .input('familia', sql.VarChar, familiaFiltro ? `%${familiaFiltro}%` : '%')
        .query(`
          SELECT TOP 30
            MF.MF_NOMBRE_FAMILIA AS Familia,
            COUNT(MP.MP_CODIGO_PRODUCTO) AS CantProductos,
            SUM(ISNULL(stock.BMS_CANTIDAD_STOCK, 0)) AS StockTotal,
            SUM(ISNULL(stock.BMS_CANTIDAD_STOCK, 0) * ISNULL(MP.MP_PRECIO_COSTO_FINAL_SAF, 0)) AS ValorCosto,
            SUM(ISNULL(stock.BMS_CANTIDAD_STOCK, 0) * ISNULL(MP.MP_PRECIO_LISTA_1, 0)) AS ValorPrecioLista
          FROM ERP_MAESTRO_PRODUCTOS MP
          JOIN ERP_BOD_MERCADERIA_STOCK stock ON stock.MP_CODIGO_PRODUCTO = MP.MP_CODIGO_PRODUCTO
          LEFT JOIN ERP_MAESTRO_FAMILIAS MF ON MF.MF_CODIGO_FAMILIA = MP.MF_CODIGO_FAMILIA
          WHERE ISNULL(stock.BMS_CANTIDAD_STOCK, 0) > 0
            AND MF.MF_NOMBRE_FAMILIA LIKE @familia
          GROUP BY MF.MF_NOMBRE_FAMILIA
          ORDER BY ValorCosto DESC
        `);
      return r.recordset;
    }

    case 'get_ordenes_pendientes': {
      if (tipoSistema !== 'FERRETERIA' && tipoSistema !== 'MULTITIENDA') {
        return [{ mensaje: 'Órdenes de compra disponibles solo para ferreterías.' }];
      }
      const r = await pool.request()
        .input('f1', sql.DateTime, new Date(fechaDesde + 'T00:00:00'))
        .input('f2', sql.DateTime, new Date(fechaHasta + 'T23:59:59'))
        .query(`
          SELECT TOP 50
            oc.ROC_NUMERO_ORDEN AS NumOrden,
            MPE.MPE_NOMBRE_COMPLETO + ' ' + ISNULL(MPE.MPE_APELLIDO_PATERNO,'') AS Proveedor,
            oc.ROC_TOTAL AS Total,
            CAST(oc.ROC_FECHA_INGRESO AS DATE) AS FechaOC,
            oc.EO_ID_ESTADO_ORDEN AS Estado
          FROM ERP_OP_RES_ORDEN_COMPRA oc
          JOIN ERP_USUARIOS_SISTEMAS US ON US.US_ID_USUARIO_SISTEMA = oc.US_ID_USUARIO_SISTEMA
          JOIN ERP_MAESTRO_PERSONAS MPE ON MPE.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
          WHERE oc.ROC_FECHA_INGRESO BETWEEN @f1 AND @f2
            AND oc.EO_ID_ESTADO_ORDEN NOT IN ('1','3')
          ORDER BY oc.ROC_FECHA_INGRESO DESC
        `);
      return r.recordset;
    }

    case 'get_clientes_top': {
      if (tipoSistema !== 'FERRETERIA' && tipoSistema !== 'MULTITIENDA') {
        return [{ mensaje: 'Ranking de clientes disponible solo para ferreterías.' }];
      }
      const r = await pool.request()
        .input('f1', sql.Date, new Date(fechaDesde))
        .input('f2', sql.Date, new Date(fechaHasta))
        .query(`
          SELECT TOP 20
            CLI.MC_NOMBRE_CLIENTE AS Cliente,
            CLI.MC_RUT_CLIENTE AS Rut,
            COUNT(DISTINCT fc.RFC_NUMERO_FACTURA_CLI) AS CantFacturas,
            SUM(ISNULL(det.DFC_PRECIO_LISTA, 0) * det.DFC_CANTIDAD) AS TotalComprado
          FROM ERP_FACT_RES_FACTURA_CLIENTES fc
          JOIN ERP_FACT_DET_FACTURA_CLIENTES det ON det.RFC_NUM_INTERNO_FA_CLI = fc.RFC_NUM_INTERNO_FA_CLI
          JOIN ERP_MAESTRO_CLIENTES CLI ON CLI.MC_RUT_CLIENTE = fc.MC_RUT_CLIENTE
          WHERE CAST(fc.RFC_FECHA_INGRESO AS DATE) BETWEEN @f1 AND @f2
          GROUP BY CLI.MC_NOMBRE_CLIENTE, CLI.MC_RUT_CLIENTE
          ORDER BY TotalComprado DESC
        `);
      return r.recordset;
    }

    case 'get_proveedores_top': {
      if (tipoSistema !== 'FERRETERIA' && tipoSistema !== 'MULTITIENDA') {
        return [{ mensaje: 'Ranking de proveedores disponible solo para ferreterías.' }];
      }
      const r = await pool.request()
        .input('f1', sql.DateTime, new Date(fechaDesde + 'T00:00:00'))
        .input('f2', sql.DateTime, new Date(fechaHasta + 'T23:59:59'))
        .query(`
          SELECT TOP 20
            MPE.MPE_NOMBRE_COMPLETO + ' ' + ISNULL(MPE.MPE_APELLIDO_PATERNO,'') AS Proveedor,
            US.MPE_RUT_PERSONA AS Rut,
            COUNT(DISTINCT oc.ROC_NUMERO_ORDEN) AS CantOrdenes,
            SUM(ISNULL(oc.ROC_TOTAL, 0)) AS TotalComprado
          FROM ERP_OP_RES_ORDEN_COMPRA oc
          JOIN ERP_USUARIOS_SISTEMAS US ON US.US_ID_USUARIO_SISTEMA = oc.US_ID_USUARIO_SISTEMA
          JOIN ERP_MAESTRO_PERSONAS MPE ON MPE.MPE_RUT_PERSONA = US.MPE_RUT_PERSONA
          WHERE oc.ROC_FECHA_INGRESO BETWEEN @f1 AND @f2
            AND oc.EO_ID_ESTADO_ORDEN <> '1'
          GROUP BY MPE.MPE_NOMBRE_COMPLETO, MPE.MPE_APELLIDO_PATERNO, US.MPE_RUT_PERSONA
          ORDER BY TotalComprado DESC
        `);
      return r.recordset;
    }

    default:
      return [];
  }
}

async function conectarSucursal(suc) {
  return new sql.ConnectionPool({
    user: suc.usuario,
    password: suc.contrasena || '',
    server: suc.ip,
    port: suc.puerto,
    database: suc.base_datos,
    ...CONN_OPTS,
  }).connect();
}

const RESPUESTA_FUERA_SUGERENCIAS = 'Lo siento po, me han limitado a responder solo las consultas disponibles en las sugerencias 😅';

// ── Endpoint principal ────────────────────────────────────────────────────────
exports.consultar = async (req, res) => {
  const { pregunta, sucursal_id, historial = [] } = req.body;

  if (!pregunta || !sucursal_id) {
    return res.status(400).json({ error: 'Se requiere pregunta y sucursal_id' });
  }

  // Historial: últimos 6 mensajes (3 intercambios), solo role+content válidos
  const historialCtx = Array.isArray(historial)
    ? historial.slice(-6).filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    : [];

  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.includes('REEMPLAZA')) {
    return res.status(503).json({ error: 'GROQ_API_KEY no configurada. Agrégala en el .env del backend.' });
  }

  const mainPool = await poolPromise;
  let poolSuc = null;

  try {
    // ── Cargar lista de sucursales ─────────────────────────────────────────────
    const todasSucursales = await mainPool.request().query(
      `SELECT id, nombre, tipo_sucursal FROM sucursales WHERE tipo_sucursal IN ('SUPERMERCADO','FERRETERIA','MULTITIENDA') ORDER BY nombre`
    );
    const listaSucursales = todasSucursales.recordset;

    // ── Detección automática de sucursal por nombre en la pregunta ─────────────
    let sucursal_id_efectivo = sucursal_id;
    if (sucursal_id !== 'intranet') {
      const preguntaLower = pregunta.toLowerCase();
      const match = listaSucursales.find(s => preguntaLower.includes(s.nombre.toLowerCase()));
      if (match) sucursal_id_efectivo = String(match.id);
    }

    // ── Sin sucursal seleccionada: pedir selección directamente ───────────────
    if (sucursal_id_efectivo === 'pendiente') {
      return res.json({
        respuesta: '¡Claro po! 🏪 ¿En qué sucursal quieres que lo busque?',
        sql: null,
        datos: [],
        pedir_sucursal: true,
        sucursales_disponibles: listaSucursales,
        pregunta_original: pregunta,
      });
    }

    // ── Intranet no tiene herramientas en sugerencias ─────────────────────────
    if (sucursal_id_efectivo === 'intranet') {
      return res.json({ respuesta: RESPUESTA_FUERA_SUGERENCIAS, sql: null, datos: [], sucursal: 'Intranet GestionBeach' });
    }

    // ── Conectar a sucursal ────────────────────────────────────────────────────
    const sucResult = await mainPool.request()
      .input('id', sql.Int, parseInt(sucursal_id_efectivo))
      .query('SELECT * FROM sucursales WHERE id = @id');

    if (!sucResult.recordset.length) {
      return res.status(404).json({ error: 'Sucursal no encontrada' });
    }

    const suc = sucResult.recordset[0];
    const nombreSucursal = suc.nombre;
    const tipoSistema = suc.tipo_sucursal;

    try {
      poolSuc = await Promise.race([
        conectarSucursal(suc),
        new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout de conexión')), 5000)),
      ]);
    } catch (e) {
      return res.status(503).json({ error: `No se pudo conectar a ${suc.nombre}: ${e.message}` });
    }

    // ── Selección de herramienta (1ª llamada Groq — modelo rápido) ───────────
    const todayStr = new Date().toISOString().split('T')[0];
    const toolResp = await groq.chat.completions.create({
      model: MODEL_ROUTER,
      messages: [
        {
          role: 'system',
          content: `Sucursal: ${nombreSucursal} (${tipoSistema}). Hoy: ${todayStr}. Convierte referencias de tiempo a fechas YYYY-MM-DD.`,
        },
        ...historialCtx,
        { role: 'user', content: pregunta },
      ],
      tools: TOOLS_GROQ,
      tool_choice: 'required',
      temperature: 0,
      max_tokens: 150,
    });
    console.log(`[BeachBot] tool=${toolResp.choices[0].message.tool_calls?.[0]?.function.name} suc=${nombreSucursal} tokens=${toolResp.usage?.total_tokens}`);

    const toolCall = toolResp.choices[0].message.tool_calls?.[0];

    // sin_herramienta → mensaje fijo, sin llamada adicional a Groq
    if (!toolCall || toolCall.function.name === 'sin_herramienta') {
      return res.json({ respuesta: RESPUESTA_FUERA_SUGERENCIAS, sql: null, datos: [], sucursal: nombreSucursal });
    }

    // ── Ejecutar herramienta ───────────────────────────────────────────────────
    const herramientaUsada = toolCall.function.name;
    const params = JSON.parse(toolCall.function.arguments || '{}');
    let datos = [];
    let errorConsulta = null;

    try {
      datos = await ejecutarHerramienta(herramientaUsada, params, poolSuc, tipoSistema);
    } catch (e) {
      errorConsulta = e.message;
    }

    // ── Datos vacíos o error: respuesta fija sin pasar por Groq ──────────────
    if (errorConsulta) {
      return res.json({
        respuesta: `No pude consultar esa información en ${nombreSucursal}. Intenta más tarde. 🔧`,
        sql: `[Herramienta: ${herramientaUsada}]`,
        datos: [],
        sucursal: nombreSucursal,
        sucursal_detectada: sucursal_id_efectivo !== sucursal_id,
        error_sql: errorConsulta,
      });
    }

    if (datos.length === 0) {
      return res.json({
        respuesta: `No encontré registros para ese período en ${nombreSucursal}. 📭`,
        sql: `[Herramienta: ${herramientaUsada}]`,
        datos: [],
        sucursal: nombreSucursal,
        sucursal_detectada: sucursal_id_efectivo !== sucursal_id,
      });
    }

    // ── Narrar resultado (2ª llamada Groq — modelo potente, solo con datos) ──
    const datosStr = JSON.stringify(datos.slice(0, 20), null, 2);

    const narrateResp = await groq.chat.completions.create({
      model: MODEL_NARRATOR,
      messages: [
        { role: 'system', content: PERSONALIDAD },
        {
          role: 'user',
          content: `Pregunta: "${pregunta}"\nDatos:\n${datosStr}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 280,
    });
    console.log(`[BeachBot] narrate tokens=${narrateResp.usage?.total_tokens}`);

    return res.json({
      respuesta: narrateResp.choices[0].message.content.trim(),
      sql: `[Herramienta: ${herramientaUsada}]`,
      datos: datos.slice(0, 100),
      sucursal: nombreSucursal,
      sucursal_detectada: sucursal_id_efectivo !== sucursal_id,
    });

  } catch (e) {
    console.error('aiConsulta error:', e);
    return res.status(500).json({ error: e.message });
  } finally {
    if (poolSuc && poolSuc !== mainPool) {
      try { poolSuc.close(); } catch (_) {}
    }
  }
};

exports.getSucursales = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT id, nombre, tipo_sucursal
      FROM sucursales
      WHERE tipo_sucursal IN ('SUPERMERCADO', 'FERRETERIA', 'MULTITIENDA')
      ORDER BY tipo_sucursal, nombre
    `);
    const lista = [
      { id: 'intranet', nombre: 'Intranet GestionBeach', tipo_sucursal: 'INTRANET' },
      ...result.recordset,
    ];
    res.json(lista);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
