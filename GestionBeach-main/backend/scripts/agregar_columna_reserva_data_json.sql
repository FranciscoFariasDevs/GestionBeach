-- ============================================
-- AGREGAR COLUMNA reserva_data_json A transacciones_webpay
-- ============================================

USE gestionbeach;
GO

-- Verificar si la columna ya existe
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID('transacciones_webpay')
    AND name = 'reserva_data_json'
)
BEGIN
    PRINT 'Agregando columna reserva_data_json...';

    ALTER TABLE transacciones_webpay
    ADD reserva_data_json NVARCHAR(MAX) NULL;

    PRINT '✅ Columna reserva_data_json agregada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️ La columna reserva_data_json ya existe';
END
GO

-- Verificar que la columna se haya agregado
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'transacciones_webpay'
AND COLUMN_NAME = 'reserva_data_json';
GO

PRINT '';
PRINT '========================================';
PRINT '✅ SCRIPT COMPLETADO';
PRINT '========================================';
GO
