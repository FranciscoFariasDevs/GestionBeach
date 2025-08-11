// backend/controllers/ventasController.js - SIN verificación de permisos
const { sql, poolPromise } = require('../config/db');

// Obtener ventas por sucursal y período
exports.getVentas = async (req, res) => {
  try {
    const { sucursal_id, start_date, end_date } = req.body;

    if (!sucursal_id || !start_date || !end_date) {
      return res.status(400).json({ message: 'Datos incompletos' });
    }

    console.log('🔍 Buscando ventas:', { sucursal_id, start_date, end_date });

    const userId = req.user.id;
    const pool = await poolPromise;

    // ✅ ELIMINADA LA VERIFICACIÓN DE PERMISOS - Ahora solo verifica que la sucursal exista
    const sucursalResult = await pool.request()
      .input('sucursalId', sql.Int, sucursal_id)
      .query('SELECT * FROM sucursales WHERE id = @sucursalId');

    if (sucursalResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Sucursal no encontrada' });
    }

    const sucursal = sucursalResult.recordset[0];
    console.log('✅ Sucursal encontrada:', sucursal.nombre);

    const configSucursal = {
      user: sucursal.usuario,
      password: sucursal.contrasena,
      server: sucursal.ip,
      database: sucursal.base_datos,
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    };

    console.log('📡 Conectando a sucursal:', sucursal.ip, sucursal.base_datos);

    const poolSucursal = await new sql.ConnectionPool(configSucursal).connect();
    let ventas = [];

    if (sucursal.tipo_sucursal === 'SUPERMERCADO') {
      const query = `
        SELECT
          tde.dn_numero_documento AS Folio,
          re.dg_razon_social AS Vendedor,
          CASE
            WHEN tde.dc_codigo_centralizacion = '1599' THEN 'CLIENTE GENERICO'
            ELSE tde.dg_razon_social
          END AS Cliente,
          tde.dc_rut_documento AS Rut_Cliente,
          CASE
            WHEN tde.dc_codigo_centralizacion = '1599' THEN 0
            ELSE tde.dq_neto
          END AS Neto,
          CASE
            WHEN tde.dc_codigo_centralizacion = '1599' THEN 0
            ELSE tde.dq_iva
          END AS Iva,
          tde.dq_bruto AS Total,
          CASE
            WHEN tde.dc_codigo_centralizacion = '0033' THEN 'Factura'
            WHEN tde.dc_codigo_centralizacion = '0039' THEN 'Boleta'
            WHEN tde.dc_codigo_centralizacion = '1599' THEN 'Venta Cigarros'
            ELSE 'Otro'
          END AS Doc,
          tde.df_fecha_update AS Fecha
        FROM 
          tb_documentos_encabezado tde
        JOIN 
          tb_rut_encabezado re ON re.dc_rut = tde.dc_rut_crea_documento
        WHERE 
          CAST(tde.df_fecha_emision AS DATE) BETWEEN @startDate AND @endDate
          AND dc_codigo_centralizacion IN ('0033', '0039', '1599') 
          AND dn_correlativo_caja IS NOT NULL
      `;

      console.log('🔍 Ejecutando consulta de ventas...');

      const result = await poolSucursal.request()
        .input('startDate', sql.Date, new Date(start_date))
        .input('endDate', sql.Date, new Date(end_date))
        .query(query);

      ventas = result.recordset;
      console.log(`✅ ${ventas.length} ventas encontradas`);
    } else {
      console.log(`⚠️ Tipo de sucursal '${sucursal.tipo_sucursal}' no soportado para consulta de ventas`);
    }

    await poolSucursal.close();
    
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
      total: ventas.length
    });

  } catch (error) {
    console.error('❌ Error al obtener ventas:', error);
    return res.status(500).json({ 
      message: 'Error en el servidor',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.getProductosByFolio = async (req, res) => {
  try {
    const { folio, sucursal_id } = req.query;

    if (!folio || !sucursal_id) {
      return res.status(400).json({ message: 'Folio y sucursal son requeridos' });
    }

    console.log('🔍 Buscando productos para folio:', folio, 'en sucursal:', sucursal_id);

    const pool = await poolPromise;
    const sucursalResult = await pool.request()
      .input('sucursalId', sql.Int, sucursal_id)
      .query('SELECT * FROM sucursales WHERE id = @sucursalId');

    if (sucursalResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Sucursal no encontrada' });
    }

    const sucursal = sucursalResult.recordset[0];
    console.log('✅ Sucursal encontrada para productos:', sucursal.nombre);

    const configSucursal = {
      user: sucursal.usuario,
      password: sucursal.contrasena,
      server: sucursal.ip,
      database: sucursal.base_datos,
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    };

    const poolSucursal = await new sql.ConnectionPool(configSucursal).connect();

    const query = `
      SELECT 
        tde.dn_numero_documento AS Folio,
        tdd.dc_codigo_barra AS Codigo,
        tdd.dg_glosa_producto AS Descripcion,
        ((tdd.dq_bruto / 1.19) - tdd.dq_ganancia)*1.19 AS Costo,
        ((tdd.dq_ganancia / tdd.dn_cantidad) / ((tdd.dq_unitario / 1.19) - (tdd.dq_ganancia / tdd.dn_cantidad))) * 100 AS Margen,
        tdd.dq_bruto AS Total,
        tdd.dq_ganancia * 1.19 AS Utilidad,
        CASE
          WHEN tde.dc_codigo_centralizacion = '0033' THEN 'Factura'
          WHEN tde.dc_codigo_centralizacion = '0039' THEN 'Boleta'
          WHEN tde.dc_codigo_centralizacion = '1599' THEN 'Venta Cigarros'
          ELSE 'Otro'
        END AS Doc
      FROM 
        tb_documentos_detalle tdd
      JOIN 
        tb_documentos_encabezado tde ON tdd.dn_correlativo_documento = tde.dn_correlativo
      WHERE 
        tde.dn_numero_documento = @folio
        AND tdd.dc_codigo_barra <> '0'
    `;

    console.log('🔍 Ejecutando consulta de productos...');

    const result = await poolSucursal.request()
      .input('folio', sql.BigInt, folio)
      .query(query);

    console.log(`✅ ${result.recordset.length} productos encontrados para folio ${folio}`);

    await poolSucursal.close();
    
    return res.json({ 
      success: true, 
      productos: result.recordset,
      folio: folio,
      total: result.recordset.length
    });

  } catch (error) {
    console.error('❌ Error al obtener productos:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};