-- ============================================
-- SCRIPT: Actualizar tabla reservas_cabanas para Webpay
-- Descripción: Agrega campos para fecha_limite_pago y codigo_descuento
-- ============================================

USE [tu_base_de_datos];
GO

PRINT '============================================';
PRINT 'Actualizando tabla reservas_cabanas';
PRINT '============================================';
PRINT '';

-- ============================================
-- AGREGAR CAMPO fecha_limite_pago
-- ============================================

IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'reservas_cabanas'
    AND COLUMN_NAME = 'fecha_limite_pago'
)
BEGIN
    ALTER TABLE reservas_cabanas
    ADD fecha_limite_pago DATETIME NULL;

    PRINT '✅ Campo fecha_limite_pago agregado';
END
ELSE
BEGIN
    PRINT '⚠️ El campo fecha_limite_pago ya existe';
END
GO

-- ============================================
-- AGREGAR CAMPO codigo_descuento
-- ============================================

IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'reservas_cabanas'
    AND COLUMN_NAME = 'codigo_descuento'
)
BEGIN
    ALTER TABLE reservas_cabanas
    ADD codigo_descuento NVARCHAR(50) NULL;

    PRINT '✅ Campo codigo_descuento agregado';
END
ELSE
BEGIN
    PRINT '⚠️ El campo codigo_descuento ya existe';
END
GO

-- ============================================
-- VERIFICAR QUE EXISTA CAMPO tipo_pago
-- ============================================

IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'reservas_cabanas'
    AND COLUMN_NAME = 'tipo_pago'
)
BEGIN
    ALTER TABLE reservas_cabanas
    ADD tipo_pago VARCHAR(20) DEFAULT 'completo';

    PRINT '✅ Campo tipo_pago agregado';
END
ELSE
BEGIN
    PRINT '⚠️ El campo tipo_pago ya existe';
END
GO

-- ============================================
-- CREAR ÍNDICE EN fecha_limite_pago
-- ============================================

IF NOT EXISTS (
    SELECT * FROM sys.indexes
    WHERE name = 'IX_reservas_cabanas_fecha_limite_pago'
    AND object_id = OBJECT_ID('reservas_cabanas')
)
BEGIN
    CREATE INDEX IX_reservas_cabanas_fecha_limite_pago
    ON reservas_cabanas(fecha_limite_pago)
    WHERE fecha_limite_pago IS NOT NULL;

    PRINT '✅ Índice en fecha_limite_pago creado';
END
ELSE
BEGIN
    PRINT '⚠️ El índice en fecha_limite_pago ya existe';
END
GO

PRINT '';
PRINT '============================================';
PRINT '✅ Actualización completada';
PRINT '============================================';
PRINT '';

-- ============================================
-- VERIFICAR LA ESTRUCTURA
-- ============================================

PRINT 'Campos agregados/verificados:';
PRINT '';

SELECT
    COLUMN_NAME as Columna,
    DATA_TYPE as Tipo,
    CHARACTER_MAXIMUM_LENGTH as Longitud,
    IS_NULLABLE as Nulable
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'reservas_cabanas'
AND COLUMN_NAME IN ('fecha_limite_pago', 'codigo_descuento', 'tipo_pago')
ORDER BY COLUMN_NAME;

PRINT '';
PRINT '============================================';
PRINT 'Script ejecutado exitosamente';
PRINT '============================================';
