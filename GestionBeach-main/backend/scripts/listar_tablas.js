// Listar tablas en BD central
const sql = require('mssql');

const configCentral = {
  user: 'sa',
  password: '*1beachmarket',
  server: '192.168.100.200',
  database: 'GestionBeach',
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true }
};

async function ejecutar() {
  try {
    const pool = await new sql.ConnectionPool(configCentral).connect();
    console.log('Tablas en GestionBeach:\n');

    const result = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    result.recordset.forEach(r => console.log('  - ' + r.TABLE_NAME));
    console.log(`\nTotal: ${result.recordset.length} tablas`);

    // Buscar tablas relacionadas con ventas
    console.log('\n--- Tablas con "venta" en el nombre: ---');
    const ventasResult = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME LIKE '%venta%'
    `);
    if (ventasResult.recordset.length === 0) {
      console.log('  (ninguna)');
    } else {
      ventasResult.recordset.forEach(r => console.log('  - ' + r.TABLE_NAME));
    }

    await pool.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

ejecutar();
