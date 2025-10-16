-- ============================================
-- VER TODAS LAS COLUMNAS DE PERMISOS_USUARIO
-- ============================================

USE Beachsql;
GO

PRINT '========================================';
PRINT 'TODAS LAS COLUMNAS DE: permisos_usuario';
PRINT '========================================';
PRINT '';

SELECT
    COLUMN_NAME AS 'Columna',
    DATA_TYPE AS 'Tipo',
    CHARACTER_MAXIMUM_LENGTH AS 'Longitud',
    IS_NULLABLE AS 'Nullable',
    COLUMN_DEFAULT AS 'Default'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'permisos_usuario'
ORDER BY ORDINAL_POSITION;

PRINT '';
PRINT '========================================';
PRINT 'DATOS DE EJEMPLO (PRIMEROS 5 REGISTROS):';
PRINT '========================================';

SELECT TOP 5 *
FROM dbo.permisos_usuario;
