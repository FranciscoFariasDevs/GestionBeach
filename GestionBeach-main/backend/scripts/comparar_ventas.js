// Script para comparar ventas Dashboard vs Ventas Page
const sql = require('mssql');

const configCentral = {
  user: 'sa',
  password: '*1beachmarket',
  server: '192.168.100.200',
  database: 'GestionBeach',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    requestTimeout: 30000
  }
};

async function ejecutar() {
  let poolCentral;

  try {
    console.log('='.repeat(60));
    console.log('COMPARACIÓN VENTAS: DASHBOARD vs MÓDULO VENTAS');
    console.log('='.repeat(60));

    // Conectar a BD central
    console.log('\n1. Conectando a BD central...');
    poolCentral = await new sql.ConnectionPool(configCentral).connect();
    console.log('   ✓ Conectado a GestionBeach');

    // Obtener una sucursal de supermercado
    console.log('\n2. Buscando sucursal de supermercado...');
    const sucursalesResult = await poolCentral.request().query(`
      SELECT TOP 1 id, nombre, ip, base_datos, usuario, contrasena, puerto, tipo_sucursal
      FROM sucursales
      WHERE tipo_sucursal = 'SUPERMERCADO'
        AND ip IS NOT NULL
        AND base_datos IS NOT NULL
      ORDER BY id
    `);

    if (sucursalesResult.recordset.length === 0) {
      console.log('   ✗ No se encontró ninguna sucursal de supermercado');
      return;
    }

    const sucursal = sucursalesResult.recordset[0];
    console.log(`   ✓ Sucursal: ${sucursal.nombre}`);
    console.log(`   ✓ IP: ${sucursal.ip}`);
    console.log(`   ✓ BD: ${sucursal.base_datos}`);

    // Conectar a la sucursal
    console.log('\n3. Conectando a la sucursal...');
    const configSucursal = {
      user: sucursal.usuario,
      password: sucursal.contrasena || '',
      server: sucursal.ip,
      port: sucursal.puerto || 1433,
      database: sucursal.base_datos,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        requestTimeout: 60000,
        connectionTimeout: 15000
      }
    };

    let poolSucursal;
    try {
      poolSucursal = await Promise.race([
        new sql.ConnectionPool(configSucursal).connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de conexión')), 10000))
      ]);
      console.log('   ✓ Conectado a', sucursal.base_datos);
    } catch (connErr) {
      console.log('   ✗ Error conectando:', connErr.message);
      return;
    }

    // Fechas del último mes completo (diciembre 2024)
    const startDate = '2024-12-01';
    const endDate = '2024-12-31';

    console.log(`\n4. Período de consulta: ${startDate} a ${endDate}`);

    // Query DASHBOARD (desde detalle, NETO sin IVA)
    console.log('\n5. Ejecutando query DASHBOARD...');
    const queryDashboard = `
      SELECT
        SUM(CASE
          WHEN tde.dc_codigo_centralizacion IN ('0039','0033') THEN (tdd.dq_bruto / 1.19)
          WHEN tde.dc_codigo_centralizacion = '1599' THEN tdd.dq_bruto
        END) AS VENTA_NETA,
        COUNT(DISTINCT tde.dn_correlativo) AS NUM_DOCUMENTOS
      FROM tb_documentos_detalle tdd
      JOIN tb_documentos_encabezado tde ON tdd.dn_correlativo_documento = tde.dn_correlativo
      WHERE CAST(df_fecha_emision AS DATE) BETWEEN @startDate AND @endDate
        AND dc_codigo_centralizacion IN ('0033','0039','1599')
        AND tde.dc_rut_documento NOT IN('010.429.345-K', '076.236.893-5', '076.775.326-8', '078.061.914-7')
        AND dn_correlativo_caja IS NOT NULL
    `;

    const resultDashboard = await poolSucursal.request()
      .input('startDate', sql.Date, new Date(startDate))
      .input('endDate', sql.Date, new Date(endDate))
      .query(queryDashboard);

    const ventaDashboard = resultDashboard.recordset[0]?.VENTA_NETA || 0;
    const docsDashboard = resultDashboard.recordset[0]?.NUM_DOCUMENTOS || 0;

    console.log(`   ✓ Venta Dashboard (NETO): $${Math.round(ventaDashboard).toLocaleString('es-CL')}`);
    console.log(`   ✓ Documentos: ${docsDashboard}`);

    // Query Notas de Crédito
    console.log('\n6. Ejecutando query NOTAS DE CRÉDITO...');
    const queryNC = `
      SELECT SUM(CASE WHEN tde.dc_codigo_centralizacion = '0061' THEN (tdd.dq_bruto / 1.19) END) AS NC
      FROM tb_documentos_detalle tdd
      JOIN tb_documentos_encabezado tde ON tdd.dn_correlativo_documento = tde.dn_correlativo
      WHERE CAST(df_fecha_emision AS DATE) BETWEEN @startDate AND @endDate
        AND dc_codigo_centralizacion IN ('0061')
        AND tde.dc_rut_documento NOT IN('010.429.345-K', '076.236.893-5', '076.775.326-8', '078.061.914-7')
        AND dn_correlativo_caja IS NOT NULL
    `;

    const resultNC = await poolSucursal.request()
      .input('startDate', sql.Date, new Date(startDate))
      .input('endDate', sql.Date, new Date(endDate))
      .query(queryNC);

    const notasCredito = resultNC.recordset[0]?.NC || 0;
    console.log(`   ✓ Notas de Crédito: $${Math.round(notasCredito).toLocaleString('es-CL')}`);

    // Query VENTAS PAGE (desde encabezado, BRUTO con IVA)
    console.log('\n7. Ejecutando query MÓDULO VENTAS...');
    const queryVentas = `
      SELECT
        SUM(ISNULL(tde.dq_bruto, 0)) AS VENTA_BRUTA,
        COUNT(*) AS NUM_DOCUMENTOS
      FROM tb_documentos_encabezado tde
      WHERE CAST(tde.df_fecha_emision AS DATE) BETWEEN @startDate AND @endDate
        AND tde.dc_codigo_centralizacion IN ('0033', '0039', '1599')
        AND tde.dn_correlativo_caja IS NOT NULL
        AND tde.dc_rut_documento NOT IN ('010.429.345-K', '076.236.893-5', '076.775.326-8', '78.061.914-7')
    `;

    const resultVentas = await poolSucursal.request()
      .input('startDate', sql.Date, new Date(startDate))
      .input('endDate', sql.Date, new Date(endDate))
      .query(queryVentas);

    const ventaModulo = resultVentas.recordset[0]?.VENTA_BRUTA || 0;
    const docsVentas = resultVentas.recordset[0]?.NUM_DOCUMENTOS || 0;

    console.log(`   ✓ Venta Módulo (BRUTO): $${Math.round(ventaModulo).toLocaleString('es-CL')}`);
    console.log(`   ✓ Documentos: ${docsVentas}`);

    // Query adicional - verificar RUT con/sin cero
    console.log('\n8. Verificando diferencia por RUT...');
    const queryRut = `
      SELECT
        SUM(CASE WHEN tde.dc_rut_documento = '078.061.914-7' THEN tde.dq_bruto ELSE 0 END) AS CON_CERO,
        SUM(CASE WHEN tde.dc_rut_documento = '78.061.914-7' THEN tde.dq_bruto ELSE 0 END) AS SIN_CERO
      FROM tb_documentos_encabezado tde
      WHERE CAST(tde.df_fecha_emision AS DATE) BETWEEN @startDate AND @endDate
        AND tde.dc_codigo_centralizacion IN ('0033', '0039', '1599')
    `;

    const resultRut = await poolSucursal.request()
      .input('startDate', sql.Date, new Date(startDate))
      .input('endDate', sql.Date, new Date(endDate))
      .query(queryRut);

    const conCero = resultRut.recordset[0]?.CON_CERO || 0;
    const sinCero = resultRut.recordset[0]?.SIN_CERO || 0;
    console.log(`   ✓ Ventas RUT '078.061.914-7': $${Math.round(conCero).toLocaleString('es-CL')}`);
    console.log(`   ✓ Ventas RUT '78.061.914-7': $${Math.round(sinCero).toLocaleString('es-CL')}`);

    // Calcular comparación
    console.log('\n' + '='.repeat(60));
    console.log('RESUMEN COMPARATIVO');
    console.log('='.repeat(60));

    const ventaDashboardFinal = ventaDashboard - notasCredito;
    const ventaModuloNeto = ventaModulo / 1.19; // Convertir a neto para comparar

    console.log(`\nSucursal: ${sucursal.nombre}`);
    console.log(`Período: ${startDate} a ${endDate}`);
    console.log('');
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│ DASHBOARD                                               │');
    console.log(`│   Venta Neta (sin IVA):    $${Math.round(ventaDashboard).toLocaleString('es-CL').padStart(15)}        │`);
    console.log(`│   Notas de Crédito:       -$${Math.round(notasCredito).toLocaleString('es-CL').padStart(15)}        │`);
    console.log(`│   TOTAL DASHBOARD:         $${Math.round(ventaDashboardFinal).toLocaleString('es-CL').padStart(15)}        │`);
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log('│ MÓDULO VENTAS                                           │');
    console.log(`│   Venta Bruta (con IVA):   $${Math.round(ventaModulo).toLocaleString('es-CL').padStart(15)}        │`);
    console.log(`│   Venta Neta (sin IVA):    $${Math.round(ventaModuloNeto).toLocaleString('es-CL').padStart(15)}        │`);
    console.log(`│   (No resta NC)                                         │`);
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log('│ DIFERENCIAS                                             │');

    const diffBruto = ventaModulo - (ventaDashboard * 1.19);
    const diffNeto = ventaModuloNeto - ventaDashboardFinal;

    console.log(`│   Módulo vs Dashboard:     $${Math.round(diffNeto).toLocaleString('es-CL').padStart(15)}        │`);
    console.log(`│   Por Notas de Crédito:    $${Math.round(notasCredito).toLocaleString('es-CL').padStart(15)}        │`);
    console.log(`│   Por RUT diferente:       $${Math.round(conCero + sinCero).toLocaleString('es-CL').padStart(15)}        │`);
    console.log('└─────────────────────────────────────────────────────────┘');

    await poolSucursal.close();
    await poolCentral.close();

    console.log('\n✓ Conexiones cerradas');

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    if (poolCentral) await poolCentral.close();
  }
}

ejecutar();
