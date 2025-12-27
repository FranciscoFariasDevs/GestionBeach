const { poolPromise, sql } = require('../config/db');

(async () => {
  try {
    console.log('Buscando apellidos incompletos (ACUÑ, GUIÑZ)...\n');

    const pool = await poolPromise;

    const query = `
      SELECT id, nombre_empleado
      FROM datos_remuneraciones
      WHERE nombre_empleado LIKE '%ACUÑ %'
         OR nombre_empleado LIKE '%GUIÑZ%'
    `;

    const result = await pool.request().query(query);

    console.log(`Encontrados ${result.recordset.length} registros\n`);

    if (result.recordset.length === 0) {
      console.log('✅ No hay apellidos incompletos para corregir');
      await pool.close();
      process.exit(0);
    }

    result.recordset.forEach(r => {
      console.log(`ID ${r.id}: ${r.nombre_empleado}`);
    });

    console.log('\n🔧 Corrigiendo...\n');

    let corregidos = 0;

    for (const r of result.recordset) {
      let corregido = r.nombre_empleado
        .replace(/ACUÑ\s/g, 'ACUÑA ')
        .replace(/GUIÑZ/g, 'GUIÑEZ');

      if (corregido !== r.nombre_empleado) {
        await pool.request()
          .input('id', sql.Int, r.id)
          .input('nombre', sql.NVarChar, corregido)
          .query('UPDATE datos_remuneraciones SET nombre_empleado = @nombre WHERE id = @id');

        console.log(`✅ ID ${r.id}: "${r.nombre_empleado}" → "${corregido}"`);
        corregidos++;
      }
    }

    console.log(`\n📊 Total corregidos: ${corregidos}`);

    await pool.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
