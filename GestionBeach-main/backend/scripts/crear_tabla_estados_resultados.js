const { poolPromise, sql } = require('../config/db');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    console.log('='.repeat(80));
    console.log('CREANDO TABLA estados_resultados');
    console.log('='.repeat(80));

    const pool = await poolPromise;

    // Leer el script SQL
    const sqlScript = fs.readFileSync(
      path.join(__dirname, 'crear_tabla_estados_resultados.sql'),
      'utf8'
    );

    // Ejecutar el script SQL
    await pool.request().query(sqlScript);

    console.log('\n✅ Script ejecutado exitosamente');
    console.log('\n📋 Verificando tabla...');

    // Verificar que la tabla existe
    const checkTable = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'estados_resultados'
    `);

    if (checkTable.recordset.length > 0) {
      console.log('✅ Tabla estados_resultados existe');

      // Mostrar columnas
      const columns = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'estados_resultados'
        ORDER BY ORDINAL_POSITION
      `);

      console.log('\n📊 Columnas de la tabla:');
      console.log('='.repeat(80));
      columns.recordset.forEach(col => {
        const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
        const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
        console.log(`  ${col.COLUMN_NAME.padEnd(30)} ${col.DATA_TYPE}${length.padEnd(10)} ${nullable}`);
      });
    } else {
      console.log('❌ Error: La tabla no se creó correctamente');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ PROCESO COMPLETADO');
    console.log('='.repeat(80));

    await pool.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
