// Comparar Dashboard vs Estado de Resultados
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
    console.log('COMPARACIÓN: DASHBOARD vs ESTADO DE RESULTADOS');
    console.log('='.repeat(70));

    poolCentral = await new sql.ConnectionPool(configCentral).connect();
    console.log('\n✓ Conectado a BD central (GestionBeach)');

    // Obtener una sucursal de supermercado
    const sucursalesResult = await poolCentral.request().query(`
      SELECT TOP 1 id, nombre, ip, base_datos, usuario, contrasena, puerto, tipo_sucursal
      FROM sucursales
      WHERE tipo_sucursal = 'SUPERMERCADO' AND ip IS NOT NULL
      ORDER BY id
    `);

    const sucursal = sucursalesResult.recordset[0];
    console.log(`✓ Sucursal: ${sucursal.nombre} (ID: ${sucursal.id})`);

    const startDate = '2024-12-01';
    const endDate = '2024-12-31';
    console.log(`\nPeríodo: ${startDate} a ${endDate}\n`);

    // =====================================================
    // 1. QUERY ESTADO DE RESULTADOS (tabla 'ventas' en BD central)
    // =====================================================
    console.log('1. Consultando ESTADO DE RESULTADOS (tabla ventas en GestionBeach)...');

    const queryEstadoResultados = `
      SELECT
        SUM(v.total) AS TOTAL_VENTAS,
        COUNT(*) AS CANTIDAD
      FROM ventas v
      WHERE v.fecha BETWEEN @fecha_desde AND @fecha_hasta
        AND v.sucursal_id = @sucursal_id
        AND v.total > 0
    `;

    const resEstado = await poolCentral.request()
      .input('fecha_desde', sql.Date, new Date(startDate))
      .input('fecha_hasta', sql.Date, new Date(endDate))
      .input('sucursal_id', sql.Int, sucursal.id)
      .query(queryEstadoResultados);

    const ventasEstado = resEstado.recordset[0]?.TOTAL_VENTAS || 0;
    const cantidadEstado = resEstado.recordset[0]?.CANTIDAD || 0;

    console.log(`   ✓ Total: $${Math.round(ventasEstado).toLocaleString('es-CL')}`);
    console.log(`   ✓ Cantidad: ${cantidadEstado.toLocaleString('es-CL')} registros`);

    // =====================================================
    // 2. QUERY DASHBOARD (tablas en sucursal remota)
    // =====================================================
    console.log('\n2. Consultando DASHBOARD (sucursal remota)...');

    poolSucursal = await new sql.ConnectionPool({
      user: sucursal.usuario,
      password: sucursal.contrasena || '',
      server: sucursal.ip,
      port: sucursal.puerto || 1433,
      database: sucursal.base_datos,
      options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true, requestTimeout: 60000 }
    }).connect();

    console.log(`   ✓ Conectado a ${sucursal.base_datos}`);

    const queryDashboard = `
      SELECT
        SUM(CASE
          WHEN tde.dc_codigo_centralizacion IN ('0039','0033') THEN (tdd.dq_bruto / 1.19)
          WHEN tde.dc_codigo_centralizacion = '1599' THEN tdd.dq_bruto
        END) AS VENTA_NETO,
        SUM(tdd.dq_bruto) AS VENTA_BRUTO,
        COUNT(DISTINCT tde.dn_correlativo) AS CANTIDAD
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

    const ventasDashboardNeto = resDashboard.recordset[0]?.VENTA_NETO || 0;
    const ventasDashboardBruto = resDashboard.recordset[0]?.VENTA_BRUTO || 0;
    const cantidadDashboard = resDashboard.recordset[0]?.CANTIDAD || 0;

    console.log(`   ✓ Total Neto (sin IVA): $${Math.round(ventasDashboardNeto).toLocaleString('es-CL')}`);
    console.log(`   ✓ Total Bruto (con IVA): $${Math.round(ventasDashboardBruto).toLocaleString('es-CL')}`);
    console.log(`   ✓ Cantidad: ${cantidadDashboard.toLocaleString('es-CL')} documentos`);

    // =====================================================
    // 3. RESUMEN COMPARATIVO
    // =====================================================
    console.log('\n' + '='.repeat(70));
    console.log('RESUMEN COMPARATIVO');
    console.log('='.repeat(70));

    console.log(`\nSucursal: ${sucursal.nombre} (ID: ${sucursal.id})`);
    console.log(`Período: ${startDate} a ${endDate}\n`);

    console.log('┌────────────────────────────────────────────────────────────────┐');
    console.log('│ FUENTE                      │ TABLA              │ TOTAL       │');
    console.log('├────────────────────────────────────────────────────────────────┤');
    console.log(`│ ESTADO RESULTADOS           │ ventas (central)   │ $${Math.round(ventasEstado).toLocaleString('es-CL').padStart(11)} │`);
    console.log(`│ DASHBOARD (Neto sin IVA)    │ tb_doc_detalle     │ $${Math.round(ventasDashboardNeto).toLocaleString('es-CL').padStart(11)} │`);
    console.log(`│ DASHBOARD (Bruto con IVA)   │ tb_doc_detalle     │ $${Math.round(ventasDashboardBruto).toLocaleString('es-CL').padStart(11)} │`);
    console.log('├────────────────────────────────────────────────────────────────┤');

    const diffVsNeto = ventasEstado - ventasDashboardNeto;
    const diffVsBruto = ventasEstado - ventasDashboardBruto;

    console.log(`│ Diferencia (Estado vs Neto)                    │ $${Math.round(diffVsNeto).toLocaleString('es-CL').padStart(11)} │`);
    console.log(`│ Diferencia (Estado vs Bruto)                   │ $${Math.round(diffVsBruto).toLocaleString('es-CL').padStart(11)} │`);
    console.log('└────────────────────────────────────────────────────────────────┘');

    // Verificar si Estado Resultados usa Neto o Bruto
    const porcentajeDiffNeto = ventasDashboardNeto > 0 ? ((ventasEstado - ventasDashboardNeto) / ventasDashboardNeto * 100) : 0;
    const porcentajeDiffBruto = ventasDashboardBruto > 0 ? ((ventasEstado - ventasDashboardBruto) / ventasDashboardBruto * 100) : 0;

    console.log(`\n📊 ANÁLISIS:`);
    console.log(`   - Diferencia vs Dashboard Neto: ${porcentajeDiffNeto.toFixed(2)}%`);
    console.log(`   - Diferencia vs Dashboard Bruto: ${porcentajeDiffBruto.toFixed(2)}%`);

    if (Math.abs(porcentajeDiffNeto) < 1) {
      console.log('\n   ➜ Estado Resultados parece usar valores NETO (sin IVA)');
    } else if (Math.abs(porcentajeDiffBruto) < 1) {
      console.log('\n   ➜ Estado Resultados parece usar valores BRUTO (con IVA)');
    } else {
      console.log('\n   ⚠️  La tabla "ventas" tiene datos diferentes a las sucursales');
      console.log('   ➜ Posiblemente los datos no están sincronizados o vienen de otra fuente');
    }

    await poolSucursal.close();
    await poolCentral.close();

  } catch (error) {
    console.error('\n✗ Error:', error.message);
  }
}

ejecutar();
