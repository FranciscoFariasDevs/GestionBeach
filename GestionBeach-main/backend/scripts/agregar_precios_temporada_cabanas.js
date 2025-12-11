// Script para agregar columnas de precio por temporada a la tabla cabanas
const { sql, poolPromise } = require('../config/db');

async function agregarPreciosTemporada() {
  try {
    const pool = await poolPromise;

    console.log('📦 Agregando columnas de precio por temporada a cabañas...');

    // Verificar si ya existen las columnas
    const checkColumns = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'cabanas'
        AND COLUMN_NAME IN ('precio_temporada_baja', 'precio_temporada_alta')
    `);

    if (checkColumns.recordset.length > 0) {
      console.log('✅ Las columnas de temporada ya existen');
      process.exit(0);
    }

    // Agregar columnas
    await pool.request().query(`
      ALTER TABLE cabanas
      ADD precio_temporada_baja DECIMAL(10,2) NULL,
          precio_temporada_alta DECIMAL(10,2) NULL
    `);

    console.log('✅ Columnas precio_temporada_baja y precio_temporada_alta agregadas');

    // Migrar datos existentes: usar precio_noche como temporada baja, precio_fin_semana como temporada alta
    await pool.request().query(`
      UPDATE cabanas
      SET precio_temporada_baja = precio_noche,
          precio_temporada_alta = precio_fin_semana
      WHERE precio_temporada_baja IS NULL
    `);

    console.log('✅ Datos migrados: precio_noche → temporada_baja, precio_fin_semana → temporada_alta');
    console.log('🎉 Script completado exitosamente');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

agregarPreciosTemporada();
