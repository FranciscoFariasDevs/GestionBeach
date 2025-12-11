// Script para crear tabla de configuración de temporada
const { sql, poolPromise } = require('../config/db');

async function crearConfiguracionTemporada() {
  try {
    const pool = await poolPromise;

    console.log('📦 Creando tabla de configuración de temporada...');

    // Verificar si la tabla ya existe
    const checkTable = await pool.request().query(`
      SELECT * FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'configuracion_sistema'
    `);

    if (checkTable.recordset.length === 0) {
      // Crear tabla de configuración
      await pool.request().query(`
        CREATE TABLE configuracion_sistema (
          id INT IDENTITY(1,1) PRIMARY KEY,
          clave NVARCHAR(100) NOT NULL UNIQUE,
          valor NVARCHAR(500),
          descripcion NVARCHAR(500),
          fecha_actualizacion DATETIME DEFAULT GETDATE()
        );
      `);
      console.log('✅ Tabla configuracion_sistema creada');
    } else {
      console.log('✅ Tabla configuracion_sistema ya existe');
    }

    // Verificar si existe la configuración de temporada
    const checkTemporada = await pool.request().query(`
      SELECT * FROM configuracion_sistema WHERE clave = 'temporada_actual'
    `);

    if (checkTemporada.recordset.length === 0) {
      // Insertar configuración inicial (temporada baja por defecto)
      await pool.request().query(`
        INSERT INTO configuracion_sistema (clave, valor, descripcion)
        VALUES ('temporada_actual', 'baja', 'Temporada actual del sistema: baja o alta')
      `);
      console.log('✅ Configuración de temporada insertada (por defecto: baja)');
    } else {
      console.log(`✅ Configuración de temporada ya existe: ${checkTemporada.recordset[0].valor}`);
    }

    console.log('🎉 Script completado exitosamente');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

crearConfiguracionTemporada();
