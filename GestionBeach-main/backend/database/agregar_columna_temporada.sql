-- ============================================
-- Script de Migración: Agregar columna temporada (OPCIONAL)
-- Fecha: 2025
-- Descripción: Agrega la columna 'temporada' a las reservas para registro histórico
-- NOTA: Este script es OPCIONAL. El sistema funciona sin esta columna.
--       Solo es útil si quieres guardar con qué temporada se hizo cada reserva.
-- ============================================

USE [tu_base_de_datos]; -- Reemplazar con el nombre real de tu base de datos
GO

-- Verificar si existe la tabla reservas_cabanas
IF OBJECT_ID('dbo.reservas_cabanas', 'U') IS NOT NULL
BEGIN
    PRINT '✅ Tabla reservas_cabanas encontrada';

    -- Agregar columna 'temporada_reserva' si no existe (OPCIONAL)
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.reservas_cabanas') AND name = 'temporada_reserva')
    BEGIN
        ALTER TABLE dbo.reservas_cabanas
        ADD temporada_reserva VARCHAR(20) NULL CHECK (temporada_reserva IN ('baja', 'alta'));

        PRINT '✅ Columna "temporada_reserva" agregada exitosamente';
        PRINT '   - Valores permitidos: baja, alta, NULL';
        PRINT '   - Esta columna es OPCIONAL y solo sirve para registro histórico';
        PRINT '   - El precio ya guardado en "precio_total" es el que cuenta';
    END
    ELSE
    BEGIN
        PRINT '⚠️ La columna "temporada_reserva" ya existe';
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
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'reservas_cabanas'
    AND COLUMN_NAME = 'temporada_reserva';
GO

-- Consulta de ejemplo para ver los datos
SELECT TOP 10
    id,
    cabana_id,
    fecha_inicio,
    fecha_fin,
    precio_total,
    temporada_reserva
FROM reservas_cabanas
ORDER BY id DESC;
GO
