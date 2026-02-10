// Comparar Dashboard vs VentasController (usado por Estado de Resultados)
const sql = require('mssql');

const configCentral = {
  user: 'sa',
  password: '*1beachmarket',
  server: '192.168.100.200',
  database: 'GestionBeach',
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true, requestTimeout: 60000 }
};

async function ejecutar() {
  let poolCentral, poolSucursal;

  try {
    console.log('='.repeat(70));
    console.log('COMPARACIÓN: DASHBOARD vs VENTAS CONTROLLER');
    console.log('(Estado de Resultados usa VentasController)');
    console.log('='.repeat(70));

    poolCentral = await new sql.ConnectionPool(configCentral).connect();

    const sucursalesResult = await poolCentral.request().query(`
      SELECT TOP 1 id, nombre, ip, base_datos, usuario, contrasena, puerto
      FROM sucursales WHERE tipo_sucursal = 'SUPERMERCADO' AND ip IS NOT NULL ORDER BY id
    `);

    const sucursal = sucursalesResult.recordset[0];
    console.log(`\n✓ Sucursal: ${sucursal.nombre}`);

    poolSucursal = await new sql.ConnectionPool({
      user: sucursal.usuario,
      password: sucursal.contrasena || '',
      server: sucursal.ip,
      port: sucursal.puerto || 1433,
      database: sucursal.base_datos,
      options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true, requestTimeout: 60000 }
    }).connect();

    const startDate = '2024-12-01';
    const endDate = '2024-12-31';
    console.log(`✓ Período: ${startDate} a ${endDate}\n`);

    // =====================================================
    // 1. QUERY DASHBOARD (desde tb_documentos_detalle)
    // =====================================================
    console.log('1. DASHBOARD (dashboardController.js)');
    console.log('   Tabla: tb_documentos_detalle + tb_documentos_encabezado');

    const queryDashboard = `
      SELECT
        SUM(CASE
          WHEN tde.dc_codigo_centralizacion IN ('0039','0033') THEN (tdd.dq_bruto / 1.19)
          WHEN tde.dc_codigo_centralizacion = '1599' THEN tdd.dq_bruto
        END) AS VENTA_NETO,
        COUNT(DISTINCT tde.dn_correlativo) AS DOCS
      FROM tb_documentos_detalle tdd
      JOIN tb_documentos_encabezado tde ON tdd.dn_correlativo_documento = tde.dn_correlativo
      WHERE CAST(df_fecha_emision AS DATE) BETWEEN @startDate AND @endDate
        AND dc_codigo_centralizacion IN ('0033','0039','1599')
        AND tde.dc_rut_documento NOT IN('010.429.345-K', '076.236.893-5', '076.775.326-8', '078.061.914-7')
        AND dn_correlativo_caja IS NOT NULL
    `;

    const resDashboard = await poolSucursal.request()
      .input('startDate', sql.Date, new Date(startDate))
      .input('endDate', sql.Date, new Date(endDate))
      .query(queryDashboard);

    const dashboardNeto = resDashboard.recordset[0]?.VENTA_NETO || 0;
    const dashboardDocs = resDashboard.recordset[0]?.DOCS || 0;

    console.log(`   ✓ Total Neto: $${Math.round(dashboardNeto).toLocaleString('es-CL')}`);
    console.log(`   ✓ Documentos: ${dashboardDocs.toLocaleString('es-CL')}`);

    // =====================================================
    // 2. QUERY VENTAS CONTROLLER (desde tb_documentos_encabezado)
    // =====================================================
    console.log('\n2. VENTAS CONTROLLER / ESTADO RESULTADOS (ventasController.js)');
    console.log('   Tabla: tb_documentos_encabezado (solo)');

    const queryVentas = `
      SELECT
        SUM(ISNULL(tde.dq_bruto, 0)) AS TOTAL_BRUTO,
        SUM(CASE
          WHEN tde.dc_codigo_centralizacion = '1599' THEN ISNULL(tde.dq_bruto, 0)
          ELSE ISNULL(tde.dq_neto, 0)
        END) AS TOTAL_NETO,
        COUNT(*) AS DOCS
      FROM tb_documentos_encabezado tde
      WHERE CAST(tde.df_fecha_emision AS DATE) BETWEEN @startDate AND @endDate
        AND tde.dc_codigo_centralizacion IN ('0033', '0039', '1599')
        AND tde.dn_correlativo_caja IS NOT NULL
        AND tde.dc_rut_documento NOT IN ('010.429.345-K', '076.236.893-5', '076.775.326-8', '78.061.914-7')
    `;

    const resVentas = await poolSucursal.request()
      .input('startDate', sql.Date, new Date(startDate))
      .input('endDate', sql.Date, new Date(endDate))
      .query(queryVentas);

    const ventasBruto = resVentas.recordset[0]?.TOTAL_BRUTO || 0;
    const ventasNeto = resVentas.recordset[0]?.TOTAL_NETO || 0;
    const ventasDocs = resVentas.recordset[0]?.DOCS || 0;

    console.log(`   ✓ Total Bruto: $${Math.round(ventasBruto).toLocaleString('es-CL')}`);
    console.log(`   ✓ Total Neto: $${Math.round(ventasNeto).toLocaleString('es-CL')}`);
    console.log(`   ✓ Documentos: ${ventasDocs.toLocaleString('es-CL')}`);

    // =====================================================
    // 3. RESUMEN
    // =====================================================
    console.log('\n' + '='.repeat(70));
    console.log('DIFERENCIAS ENCONTRADAS');
    console.log('='.repeat(70));

    console.log('\n┌─────────────────────────────────────────────────────────────────┐');
    console.log('│                              │ DASHBOARD      │ VENTAS CTRL    │');
    console.log('├─────────────────────────────────────────────────────────────────┤');
    console.log(`│ Tabla                        │ detalle+encab  │ solo encabez   │`);
    console.log(`│ Total Neto                   │ $${Math.round(dashboardNeto).toLocaleString('es-CL').padStart(12)} │ $${Math.round(ventasNeto).toLocaleString('es-CL').padStart(12)} │`);
    console.log(`│ Documentos                   │ ${dashboardDocs.toString().padStart(14)} │ ${ventasDocs.toString().padStart(14)} │`);
    console.log('├─────────────────────────────────────────────────────────────────┤');

    const diffNeto = ventasNeto - dashboardNeto;
    console.log(`│ DIFERENCIA (Ventas - Dash)   │              $${Math.round(diffNeto).toLocaleString('es-CL').padStart(13)} │`);
    console.log('└─────────────────────────────────────────────────────────────────┘');

    console.log('\n📋 CAUSAS DE LA DIFERENCIA:');
    console.log('   1. Dashboard suma desde DETALLE (más preciso)');
    console.log('   2. VentasController suma desde ENCABEZADO');
    console.log('   3. RUT filtrado diferente: "078..." vs "78..."');
    console.log('   4. Dashboard usa dq_bruto/1.19, Ventas usa dq_neto del encabezado');

    await poolSucursal.close();
    await poolCentral.close();

  } catch (error) {
    console.error('\n✗ Error:', error.message);
  }
}

ejecutar();
