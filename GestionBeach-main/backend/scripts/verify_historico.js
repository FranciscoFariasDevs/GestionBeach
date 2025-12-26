const { poolPromise } = require('../config/db');

(async () => {
  try {
    console.log('Verificando registro histórico...\n');

    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        id, sucursal_id, sucursal_nombre,
        razon_social_id, razon_social_nombre,
        mes, anio, periodo,
        ventas, estado
      FROM estados_resultados
      WHERE sucursal_id = 75 AND mes = 11 AND anio = 2025
    `);

    if (result.recordset.length > 0) {
      console.log('✅ Registro encontrado:');
      console.log(JSON.stringify(result.recordset[0], null, 2));
    } else {
      console.log('❌ No se encontró el registro');
    }

    await pool.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
