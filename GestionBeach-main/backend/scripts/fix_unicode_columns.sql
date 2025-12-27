-- Script para convertir columnas VARCHAR a NVARCHAR para soportar Unicode
-- Esto solucionará el problema de caracteres especiales como "Líquido"

-- IMPORTANTE: Ejecutar este script en la base de datos GestionBeach

USE GestionBeach;
GO

PRINT 'Iniciando conversión de columnas a NVARCHAR para soporte Unicode...';
PRINT '';

-- Verificar qué columnas de descripcion son VARCHAR
SELECT
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    COLLATION_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE DATA_TYPE IN ('varchar', 'char', 'text')
  AND (COLUMN_NAME LIKE '%descripcion%'
       OR COLUMN_NAME LIKE '%nombre%'
       OR COLUMN_NAME LIKE '%concepto%'
       OR COLUMN_NAME LIKE '%observacion%'
       OR COLUMN_NAME LIKE '%detalle%')
ORDER BY TABLE_NAME, COLUMN_NAME;

PRINT '';
PRINT 'Columnas que necesitan conversión mostradas arriba.';
PRINT '';

-- Ejemplo de conversión (ajusta según tus tablas específicas):

-- Si tienes una tabla de conceptos o items de remuneraciones:
-- ALTER TABLE tu_tabla_remuneraciones ALTER COLUMN descripcion NVARCHAR(255);
-- ALTER TABLE tu_tabla_remuneraciones ALTER COLUMN concepto NVARCHAR(255);

-- Nota: Reemplaza 'tu_tabla_remuneraciones' con el nombre real de tu tabla
