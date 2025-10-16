-- ============================================
-- VERIFICAR ESTRUCTURA DE TABLAS
-- ============================================
-- Ejecutar este script para ver los nombres reales de las columnas

USE Beachsql;
GO

PRINT '========================================';
PRINT 'ESTRUCTURA DE TABLA: modulos';
PRINT '========================================';

SELECT
    COLUMN_NAME AS 'Nombre Columna',
    DATA_TYPE AS 'Tipo',
    IS_NULLABLE AS 'Nullable'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'modulos'
ORDER BY ORDINAL_POSITION;

PRINT '';
PRINT '========================================';
PRINT 'ESTRUCTURA DE TABLA: permisos_usuario';
PRINT '========================================';

SELECT
    COLUMN_NAME AS 'Nombre Columna',
    DATA_TYPE AS 'Tipo',
    IS_NULLABLE AS 'Nullable'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'permisos_usuario'
ORDER BY ORDINAL_POSITION;

PRINT '';
PRINT '========================================';
PRINT 'ESTRUCTURA DE TABLA: perfiles';
PRINT '========================================';

SELECT
    COLUMN_NAME AS 'Nombre Columna',
    DATA_TYPE AS 'Tipo',
    IS_NULLABLE AS 'Nullable'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'perfiles'
ORDER BY ORDINAL_POSITION;
