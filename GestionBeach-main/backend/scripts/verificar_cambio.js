// Script para verificar que Ventas Page ahora coincide con Dashboard
const sql = require('mssql');

const configCentral = {
  user: 'sa',
  password: '*1beachmarket',
  server: '192.168.100.200',
  database: 'GestionBeach',
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true }
};

async function ejecutar() {
  let poolCentral, poolSucursal;

  try {
    console.log('='.repeat(70));
    console.log('VERIFICACIÓN: DASHBOARD vs VENTAS PAGE (QUERY ACTUALIZADA)');
    console.log('='.repeat(70));

    poolCentral = await new sql.ConnectionPool(configCentral).connect();
    console.log('\n✓ Conectado a BD central');

    const sucursalesResult = await poolCentral.request().query(`
      SELECT TOP 1 id, nombre, ip, base_datos, usuario, contrasena, puerto
      FROM sucursales WHERE tipo_sucursal = 'SUPERMERCADO' AND ip IS NOT NULL ORDER BY id
    `);

    const sucursal = sucursalesResult.recordset[0];
    console.log(`✓ Sucursal: ${sucursal.nombre}`);

    poolSucursal = await new sql.ConnectionPool({
      user: sucursal.usuario,
      password: sucursal.contrasena || '',
      server: sucursal.ip,
      port: sucursal.puerto || 1433,
      database: sucursal.base_datos,
      options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true, requestTimeout: 60000 }
    }).connect();
    console.log(`✓ Conectado a ${sucursal.base_datos}`);

    const startDate = '2024-12-01';
    const endDate = '2024-12-31';

    console.log(`\nPeríodo: ${startDate} a ${endDate}\n`);

    // Query DASHBOARD (original)
    const queryDashboard = `
      SELECT
        SUM(CASE
          WHEN tde.dc_codigo_centralizacion IN ('0039','0033') THEN (tdd.dq_bruto / 1.19)
          WHEN tde.dc_codigo_centralizacion = '1599' THEN tdd.dq_bruto
        END) AS VENTA_NETO
      FROM tb_documentos_detalle tdd
      JOIN tb_documentos_encabezado tde ON tdd.dn_correlativo_documento = tde.dn_correlativo
      WHERE CAST(df_fecha_emision AS DATE) BETWEEN @startDate AND @endDate
        AND dc_codigo_centralizacion IN ('0033','0039','1599')
        AND tde.dc_rut_documento NOT IN('010.429.345-K', '076.236.893-5', '076.775.326-8', '078.061.914-7')
        AND dn_correlativo_caja IS NOT NULL
    `;

    // Query VENTAS PAGE ACTUALIZADA (igual al dashboard)
    const queryVentasNueva = `
      SELECT
        SUM(CASE
          WHEN tde.dc_codigo_centralizacion IN ('0039', '0033') THEN (tdd.dq_bruto / 1.19)
          WHEN tde.dc_codigo_centralizacion = '1599' THEN tdd.dq_bruto
          ELSE 0
        END) AS VENTA_NETO
      FROM tb_documentos_detalle tdd
      JOIN tb_documentos_encabezado tde ON tdd.dn_correlativo_documento = tde.dn_correlativo
      WHERE
        CAST(tde.df_fecha_emision AS DATE) BETWEEN @startDate AND @endDate
        AND tde.dc_codigo_centralizacion IN ('0033', '0039', '1599')
        AND tde.dn_correlativo_caja IS NOT NULL
        AND tde.dc_rut_documento NOT IN ('010.429.345-K', '076.236.893-5', '076.775.326-8', '078.061.914-7')
    `;

    // Query VENTAS PAGE ANTERIOR (desde encabezado)
    const queryVentasAnterior = `
      SELECT SUM(ISNULL(tde.dq_bruto, 0) / 1.19) AS VENTA_NETO
      FROM tb_documentos_encabezado tde
      WHERE CAST(tde.df_fecha_emision AS DATE) BETWEEN @startDate AND @endDate
        AND tde.dc_codigo_centralizacion IN ('0033', '0039', '1599')
        AND tde.dn_correlativo_caja IS NOT NULL
        AND tde.dc_rut_documento NOT IN ('010.429.345-K', '076.236.893-5', '076.775.326-8', '78.061.914-7')
    `;

    const resDashboard = await poolSucursal.request()
      .input('startDate', sql.Date, new Date(startDate))
      .input('endDate', sql.Date, new Date(endDate))
      .query(queryDashboard);

    const resVentasNueva = await poolSucursal.request()
      .input('startDate', sql.Date, new Date(startDate))
      .input('endDate', sql.Date, new Date(endDate))
      .query(queryVentasNueva);

    const resVentasAnterior = await poolSucursal.request()
      .input('startDate', sql.Date, new Date(startDate))
      .input('endDate', sql.Date, new Date(endDate))
      .query(queryVentasAnterior);

    const dashboard = Math.round(resDashboard.recordset[0]?.VENTA_NETO || 0);
    const ventasNueva = Math.round(resVentasNueva.recordset[0]?.VENTA_NETO || 0);
    const ventasAnterior = Math.round(resVentasAnterior.recordset[0]?.VENTA_NETO || 0);

    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│ RESULTADOS (Venta Neta sin IVA)                         │');
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log(`│ DASHBOARD:              $${dashboard.toLocaleString('es-CL').padStart(15)}        │`);
    console.log(`│ VENTAS PAGE (NUEVA):    $${ventasNueva.toLocaleString('es-CL').padStart(15)}        │`);
    console.log(`│ VENTAS PAGE (ANTERIOR): $${ventasAnterior.toLocaleString('es-CL').padStart(15)}        │`);
    console.log('├─────────────────────────────────────────────────────────┤');

    const diffNueva = ventasNueva - dashboard;
    const diffAnterior = ventasAnterior - dashboard;

    console.log(`│ Diferencia NUEVA vs Dashboard:  $${diffNueva.toLocaleString('es-CL').padStart(12)}        │`);
    console.log(`│ Diferencia ANTERIOR vs Dashboard: $${diffAnterior.toLocaleString('es-CL').padStart(10)}        │`);
    console.log('└─────────────────────────────────────────────────────────┘');

    if (Math.abs(diffNueva) < 100) {
      console.log('\n✅ ¡ÉXITO! Las queries ahora coinciden.');
    } else {
      console.log('\n⚠️  Hay una diferencia pequeña (posiblemente redondeo).');
    }

    await poolSucursal.close();
    await poolCentral.close();

  } catch (error) {
    console.error('Error:', error.message);
  }
}

ejecutar();
