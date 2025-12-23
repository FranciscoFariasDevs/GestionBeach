const { poolPromise } = require('../config/db');

(async () => {
  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .query(`
        SELECT id, nombre, tipo_sucursal, id_razon_social
        FROM sucursales
        WHERE nombre LIKE '%1440%' OR nombre LIKE '%DANIEL%'
        ORDER BY id
      `);

    console.log('Sucursales encontradas con "DANIEL" o "1440":');
    result.recordset.forEach(s => {
      console.log(`  ID: ${s.id} - ${s.nombre} (${s.tipo_sucursal})`);
    });

    await pool.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
