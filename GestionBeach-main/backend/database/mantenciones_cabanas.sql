-- ============================================
-- TABLA: mantenciones_cabanas
-- Descripción: Registra períodos de mantención preventiva de cabañas
-- ============================================

USE Beachsql;
GO

-- Crear tabla si no existe
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'mantenciones_cabanas')
BEGIN
    CREATE TABLE mantenciones_cabanas (
        id INT PRIMARY KEY IDENTITY(1,1),
        cabana_id INT NOT NULL,
        fecha_inicio DATE NOT NULL,
        fecha_fin DATE NOT NULL,
        motivo VARCHAR(255),
        notas TEXT,
        creado_por VARCHAR(100),
        fecha_creacion DATETIME DEFAULT GETDATE(),
        estado VARCHAR(20) DEFAULT 'activa',

        -- Relación con tabla cabanas
        FOREIGN KEY (cabana_id) REFERENCES cabanas(id) ON DELETE CASCADE,

        -- Validación: fecha_fin debe ser mayor o igual a fecha_inicio
        CONSTRAINT CHK_Fechas_Mantencion CHECK (fecha_fin >= fecha_inicio)
    );

    PRINT '✅ Tabla mantenciones_cabanas creada exitosamente';
END
ELSE
BEGIN
    PRINT 'ℹ️  Tabla mantenciones_cabanas ya existe';
END
GO

-- Crear índices para mejorar rendimiento
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_Mantenciones_Cabana_Fecha' AND object_id = OBJECT_ID('mantenciones_cabanas'))
BEGIN
    CREATE INDEX IDX_Mantenciones_Cabana_Fecha
    ON mantenciones_cabanas(cabana_id, fecha_inicio, fecha_fin);
    PRINT '✅ Índice IDX_Mantenciones_Cabana_Fecha creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_Mantenciones_Estado' AND object_id = OBJECT_ID('mantenciones_cabanas'))
BEGIN
    CREATE INDEX IDX_Mantenciones_Estado
    ON mantenciones_cabanas(estado);
    PRINT '✅ Índice IDX_Mantenciones_Estado creado';
END
GO

-- Verificar estructura
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'mantenciones_cabanas'
ORDER BY ORDINAL_POSITION;

PRINT '';
PRINT '========================================';
PRINT '✅ TABLA mantenciones_cabanas lista';
PRINT '========================================';
PRINT '';
PRINT 'Campos:';
PRINT '  - id: Identificador único (auto-incremental)';
PRINT '  - cabana_id: Referencia a tabla cabanas';
PRINT '  - fecha_inicio: Fecha inicio de mantención';
PRINT '  - fecha_fin: Fecha fin de mantención';
PRINT '  - motivo: Razón de la mantención';
PRINT '  - notas: Información adicional';
PRINT '  - creado_por: Usuario que registró';
PRINT '  - fecha_creacion: Timestamp de creación';
PRINT '  - estado: activa / cancelada';
PRINT '';
