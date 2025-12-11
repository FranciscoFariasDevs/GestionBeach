// Script para crear tabla de relación entre códigos de descuento y cabañas
const { sql, poolPromise } = require('../config/db');

async function crearRelacionCodigosCabanas() {
  try {
    const pool = await poolPromise;

    console.log('📦 Creando tabla de relación codigos_descuento_cabanas...');

    // Verificar si la tabla ya existe
    const checkTable = await pool.request().query(`
      SELECT * FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'codigos_descuento_cabanas'
    `);

    if (checkTable.recordset.length > 0) {
      console.log('✅ La tabla codigos_descuento_cabanas ya existe');
      process.exit(0);
    }

    // Crear tabla de relación
    await pool.request().query(`
      CREATE TABLE codigos_descuento_cabanas (
        id INT IDENTITY(1,1) PRIMARY KEY,
        codigo_descuento_id INT NOT NULL,
        cabana_id INT NOT NULL,
        fecha_creacion DATETIME DEFAULT GETDATE(),

        -- Foreign keys
        CONSTRAINT FK_codigo_descuento FOREIGN KEY (codigo_descuento_id)
          REFERENCES codigos_descuento(id) ON DELETE CASCADE,
        CONSTRAINT FK_cabana FOREIGN KEY (cabana_id)
          REFERENCES cabanas(id) ON DELETE CASCADE,

        -- Prevenir duplicados
        CONSTRAINT UQ_codigo_cabana UNIQUE(codigo_descuento_id, cabana_id)
      );
    `);

    console.log('✅ Tabla codigos_descuento_cabanas creada exitosamente');

    // Crear índices para búsquedas rápidas
    await pool.request().query(`
      CREATE INDEX IX_codigo_descuento ON codigos_descuento_cabanas(codigo_descuento_id);
    `);
    console.log('✅ Índice IX_codigo_descuento creado');

    await pool.request().query(`
      CREATE INDEX IX_cabana ON codigos_descuento_cabanas(cabana_id);
    `);
    console.log('✅ Índice IX_cabana creado');

    // Agregar columna 'aplica_todas_cabanas' a la tabla codigos_descuento
    const checkColumn = await pool.request().query(`
      SELECT * FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'codigos_descuento' AND COLUMN_NAME = 'aplica_todas_cabanas'
    `);

    if (checkColumn.recordset.length === 0) {
      await pool.request().query(`
        ALTER TABLE codigos_descuento
        ADD aplica_todas_cabanas BIT DEFAULT 1;
      `);
      console.log('✅ Columna aplica_todas_cabanas agregada a codigos_descuento');

      // Por defecto, todos los códigos existentes aplican a todas las cabañas
      await pool.request().query(`
        UPDATE codigos_descuento
        SET aplica_todas_cabanas = 1
        WHERE aplica_todas_cabanas IS NULL;
      `);
      console.log('✅ Códigos existentes configurados para aplicar a todas las cabañas');
    }

    console.log('🎉 Script completado exitosamente');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

crearRelacionCodigosCabanas();
