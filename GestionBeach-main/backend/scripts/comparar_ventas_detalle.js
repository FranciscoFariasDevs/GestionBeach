// Script para investigar la diferencia entre detalle y encabezado
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
    console.log('Conectando...');
    poolCentral = await new sql.ConnectionPool(configCentral).connect();

    const sucursalesResult = await poolCentral.request().query(`
      SELECT TOP 1 id, nombre, ip, base_datos, usuario, contrasena, puerto
      FROM sucursales WHERE tipo_sucursal = 'SUPERMERCADO' AND ip IS NOT NULL ORDER BY id
    `);

    const sucursal = sucursalesResult.recordset[0];
    console.log(`Sucursal: ${sucursal.nombre}\n`);

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

    // Comparar EXACTAMENTE la misma lógica
    console.log('='.repeat(70));
    console.log('COMPARACIÓN DETALLADA: DETALLE vs ENCABEZADO');
    console.log('='.repeat(70));

    // 1. Suma desde DETALLE (como Dashboard)
    const queryDetalle = `
      SELECT
        SUM(tdd.dq_bruto) AS BRUTO_DETALLE,
        SUM(tdd.dq_bruto / 1.19) AS NETO_DETALLE,
        COUNT(*) AS LINEAS_DETALLE
      FROM tb_documentos_detalle tdd
      JOIN tb_documentos_encabezado tde ON tdd.dn_correlativo_documento = tde.dn_correlativo
      WHERE CAST(df_fecha_emision AS DATE) BETWEEN @startDate AND @endDate
        AND dc_codigo_centralizacion IN ('0033','0039','1599')
        AND tde.dc_rut_documento NOT IN('010.429.345-K', '076.236.893-5', '076.775.326-8', '078.061.914-7')
        AND dn_correlativo_caja IS NOT NULL
    `;

    const resDetalle = await poolSucursal.request()
      .input('startDate', sql.Date, new Date(startDate))
      .input('endDate', sql.Date, new Date(endDate))
      .query(queryDetalle);

    // 2. Suma desde ENCABEZADO (como Módulo Ventas)
    const queryEncabezado = `
      SELECT
        SUM(tde.dq_bruto) AS BRUTO_ENCABEZADO,
        SUM(tde.dq_bruto / 1.19) AS NETO_ENCABEZADO,
        COUNT(*) AS DOCS_ENCABEZADO
      FROM tb_documentos_encabezado tde
      WHERE CAST(tde.df_fecha_emision AS DATE) BETWEEN @startDate AND @endDate
        AND tde.dc_codigo_centralizacion IN ('0033', '0039', '1599')
        AND tde.dn_correlativo_caja IS NOT NULL
        AND tde.dc_rut_documento NOT IN ('010.429.345-K', '076.236.893-5', '076.775.326-8', '078.061.914-7')
    `;

    const resEncabezado = await poolSucursal.request()
      .input('startDate', sql.Date, new Date(startDate))
      .input('endDate', sql.Date, new Date(endDate))
      .query(queryEncabezado);

    // 3. Ahora con el mismo filtro de RUT (sin cero)
    const queryEncabezadoSinCero = `
      SELECT
        SUM(tde.dq_bruto) AS BRUTO_ENCABEZADO,
        SUM(tde.dq_bruto / 1.19) AS NETO_ENCABEZADO,
        COUNT(*) AS DOCS_ENCABEZADO
      FROM tb_documentos_encabezado tde
      WHERE CAST(tde.df_fecha_emision AS DATE) BETWEEN @startDate AND @endDate
        AND tde.dc_codigo_centralizacion IN ('0033', '0039', '1599')
        AND tde.dn_correlativo_caja IS NOT NULL
        AND tde.dc_rut_documento NOT IN ('010.429.345-K', '076.236.893-5', '076.775.326-8', '78.061.914-7')
    `;

    const resEncabezadoSinCero = await poolSucursal.request()
      .input('startDate', sql.Date, new Date(startDate))
      .input('endDate', sql.Date, new Date(endDate))
      .query(queryEncabezadoSinCero);

    const d = resDetalle.recordset[0];
    const e = resEncabezado.recordset[0];
    const e2 = resEncabezadoSinCero.recordset[0];

    console.log('\n1. DESDE DETALLE (tb_documentos_detalle):');
    console.log(`   Bruto: $${Math.round(d.BRUTO_DETALLE).toLocaleString('es-CL')}`);
    console.log(`   Neto:  $${Math.round(d.NETO_DETALLE).toLocaleString('es-CL')}`);
    console.log(`   Líneas: ${d.LINEAS_DETALLE.toLocaleString('es-CL')}`);

    console.log('\n2. DESDE ENCABEZADO (con RUT 078...):');
    console.log(`   Bruto: $${Math.round(e.BRUTO_ENCABEZADO).toLocaleString('es-CL')}`);
    console.log(`   Neto:  $${Math.round(e.NETO_ENCABEZADO).toLocaleString('es-CL')}`);
    console.log(`   Docs:  ${e.DOCS_ENCABEZADO.toLocaleString('es-CL')}`);

    console.log('\n3. DESDE ENCABEZADO (con RUT 78... sin cero):');
    console.log(`   Bruto: $${Math.round(e2.BRUTO_ENCABEZADO).toLocaleString('es-CL')}`);
    console.log(`   Neto:  $${Math.round(e2.NETO_ENCABEZADO).toLocaleString('es-CL')}`);
    console.log(`   Docs:  ${e2.DOCS_ENCABEZADO.toLocaleString('es-CL')}`);

    console.log('\n' + '='.repeat(70));
    console.log('DIFERENCIAS:');
    console.log('='.repeat(70));

    const diffBruto = d.BRUTO_DETALLE - e.BRUTO_ENCABEZADO;
    const diffNeto = d.NETO_DETALLE - e.NETO_ENCABEZADO;

    console.log(`\n   Diferencia Bruto (Detalle - Encabezado): $${Math.round(diffBruto).toLocaleString('es-CL')}`);
    console.log(`   Diferencia Neto (Detalle - Encabezado):  $${Math.round(diffNeto).toLocaleString('es-CL')}`);

    // Verificar si la diferencia viene del código 1599 (cigarros)
    console.log('\n' + '='.repeat(70));
    console.log('DESGLOSE POR CÓDIGO DE CENTRALIZACIÓN:');
    console.log('='.repeat(70));

    const queryCodigos = `
      SELECT
        tde.dc_codigo_centralizacion AS CODIGO,
        SUM(tdd.dq_bruto) AS BRUTO_DETALLE,
        COUNT(DISTINCT tde.dn_correlativo) AS DOCS
      FROM tb_documentos_detalle tdd
      JOIN tb_documentos_encabezado tde ON tdd.dn_correlativo_documento = tde.dn_correlativo
      WHERE CAST(df_fecha_emision AS DATE) BETWEEN @startDate AND @endDate
        AND dc_codigo_centralizacion IN ('0033','0039','1599')
        AND tde.dc_rut_documento NOT IN('010.429.345-K', '076.236.893-5', '076.775.326-8', '078.061.914-7')
        AND dn_correlativo_caja IS NOT NULL
      GROUP BY tde.dc_codigo_centralizacion
    `;

    const resCodigos = await poolSucursal.request()
      .input('startDate', sql.Date, new Date(startDate))
      .input('endDate', sql.Date, new Date(endDate))
      .query(queryCodigos);

    const queryCodigosEnc = `
      SELECT
        tde.dc_codigo_centralizacion AS CODIGO,
        SUM(tde.dq_bruto) AS BRUTO_ENCABEZADO,
        COUNT(*) AS DOCS
      FROM tb_documentos_encabezado tde
      WHERE CAST(tde.df_fecha_emision AS DATE) BETWEEN @startDate AND @endDate
        AND tde.dc_codigo_centralizacion IN ('0033', '0039', '1599')
        AND tde.dn_correlativo_caja IS NOT NULL
        AND tde.dc_rut_documento NOT IN ('010.429.345-K', '076.236.893-5', '076.775.326-8', '078.061.914-7')
      GROUP BY tde.dc_codigo_centralizacion
    `;

    const resCodigosEnc = await poolSucursal.request()
      .input('startDate', sql.Date, new Date(startDate))
      .input('endDate', sql.Date, new Date(endDate))
      .query(queryCodigosEnc);

    console.log('\nDesde DETALLE:');
    resCodigos.recordset.forEach(r => {
      const tipo = r.CODIGO === '0033' ? 'Factura' : r.CODIGO === '0039' ? 'Boleta' : 'Cigarros';
      console.log(`   ${r.CODIGO} (${tipo}): $${Math.round(r.BRUTO_DETALLE).toLocaleString('es-CL')} - ${r.DOCS} docs`);
    });

    console.log('\nDesde ENCABEZADO:');
    resCodigosEnc.recordset.forEach(r => {
      const tipo = r.CODIGO === '0033' ? 'Factura' : r.CODIGO === '0039' ? 'Boleta' : 'Cigarros';
      console.log(`   ${r.CODIGO} (${tipo}): $${Math.round(r.BRUTO_ENCABEZADO).toLocaleString('es-CL')} - ${r.DOCS} docs`);
    });

    await poolSucursal.close();
    await poolCentral.close();

  } catch (error) {
    console.error('Error:', error.message);
  }
}

ejecutar();
