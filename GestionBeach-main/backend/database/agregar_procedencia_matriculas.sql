-- ============================================
-- Script de Migración: Agregar campos Procedencia y Matrículas
-- Fecha: 2025
-- Descripción: Agrega las columnas 'procedencia' y 'matriculas_auto' a la tabla reservas_cabanas
-- ============================================

USE [tu_base_de_datos]; -- Reemplazar con el nombre real de tu base de datos
GO

-- Verificar si existe la tabla reservas_cabanas
IF OBJECT_ID('dbo.reservas_cabanas', 'U') IS NOT NULL
BEGIN
    PRINT '✅ Tabla reservas_cabanas encontrada';

    -- Agregar columna 'procedencia' si no existe
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.reservas_cabanas') AND name = 'procedencia')
    BEGIN
        ALTER TABLE dbo.reservas_cabanas
        ADD procedencia VARCHAR(255) NULL;

        PRINT '✅ Columna "procedencia" agregada exitosamente';
    END
    ELSE
    BEGIN
        PRINT '⚠️ La columna "procedencia" ya existe';
    END

    -- Agregar columna 'matriculas_auto' si no existe
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.reservas_cabanas') AND name = 'matriculas_auto')
    BEGIN
        ALTER TABLE dbo.reservas_cabanas
        ADD matriculas_auto VARCHAR(500) NULL;

        PRINT '✅ Columna "matriculas_auto" agregada exitosamente';
    END
    ELSE
    BEGIN
        PRINT '⚠️ La columna "matriculas_auto" ya existe';
    END

    PRINT '========================================';
    PRINT 'Migración completada exitosamente';
    PRINT '========================================';
END
ELSE
BEGIN
    PRINT '❌ ERROR: La tabla reservas_cabanas no existe';
END
GO

-- Verificar la estructura final de la tabla
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'reservas_cabanas'
    AND COLUMN_NAME IN ('procedencia', 'matriculas_auto')
ORDER BY ORDINAL_POSITION;
GO
