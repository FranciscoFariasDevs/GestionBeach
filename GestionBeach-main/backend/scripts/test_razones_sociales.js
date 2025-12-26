const { poolPromise } = require('../config/db');

(async () => {
  try {
    console.log('Probando endpoint de razones sociales...\n');

    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT id, nombre_razon, rut, activo
      FROM razones_sociales
      WHERE activo = 1
      ORDER BY nombre_razon
    `);

    console.log('✅ Razones Sociales encontradas:', result.recordset.length);
    console.log('\nDatos:');
    result.recordset.forEach(r => {
      console.log(`  - ID: ${r.id} | Nombre: ${r.nombre_razon} | RUT: ${r.rut}`);
    });

    console.log('\n📋 Formato de respuesta esperado:');
    const response = {
      success: true,
      data: result.recordset,
      message: `${result.recordset.length} razones sociales encontradas`
    };
    console.log(JSON.stringify(response, null, 2));

    await pool.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
