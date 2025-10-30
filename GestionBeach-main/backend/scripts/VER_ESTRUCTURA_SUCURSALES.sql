USE GestionBeach;
GO

PRINT '=== ESTRUCTURA DE SUCURSALES ===';
PRINT '';

-- 1. Ver si existe tabla sucursales
PRINT '1. TABLAS DE SUCURSALES:';
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE '%sucursal%'
ORDER BY TABLE_NAME;
PRINT '';

-- 2. Ver estructura de tabla perfil_sucursal
PRINT '2. ESTRUCTURA DE perfil_sucursal:';
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'perfil_sucursal')
BEGIN
    SELECT
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'perfil_sucursal'
    ORDER BY ORDINAL_POSITION;
END
ELSE
BEGIN
    PRINT '❌ Tabla perfil_sucursal NO EXISTE';
END
PRINT '';

-- 3. Ver estructura de tabla sucursales (si existe)
PRINT '3. ESTRUCTURA DE sucursales:';
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'sucursales')
BEGIN
    SELECT
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'sucursales'
    ORDER BY ORDINAL_POSITION;

    PRINT '';
    PRINT '4. SUCURSALES DISPONIBLES:';
    SELECT * FROM sucursales ORDER BY id;
END
ELSE
BEGIN
    PRINT '❌ Tabla sucursales NO EXISTE';
END
PRINT '';

-- 5. Ver datos en perfil_sucursal (si existe)
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'perfil_sucursal')
BEGIN
    PRINT '5. DATOS ACTUALES EN perfil_sucursal:';
    SELECT * FROM perfil_sucursal;

    PRINT '';
    PRINT '6. RESUMEN: SUCURSALES POR PERFIL:';
    SELECT
        p.id AS perfil_id,
        p.nombre AS perfil_nombre,
        COUNT(ps.sucursal_id) AS total_sucursales
    FROM perfiles p
    LEFT JOIN perfil_sucursal ps ON p.id = ps.perfil_id
    GROUP BY p.id, p.nombre
    ORDER BY p.id;
END

GO
