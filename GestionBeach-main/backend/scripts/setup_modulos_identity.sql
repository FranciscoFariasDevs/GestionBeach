-- Script SIMPLIFICADO para configurar IDENTITY en la tabla modulos
-- SQL Server 2012 compatible
-- Solo usa columnas que seguro existen: id, nombre, descripcion

USE GestionBeach;
GO

PRINT '===================================================';
PRINT 'SCRIPT DE CONFIGURACIÓN DE IDENTITY PARA MODULOS';
PRINT '===================================================';
PRINT '';

-- PASO 1: Verificar estructura actual
PRINT 'PASO 1: Verificando estructura de tabla modulos...';
PRINT '';

-- Ver columnas existentes
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'modulos'
ORDER BY ORDINAL_POSITION;

PRINT '';
PRINT '---------------------------------------------------';
PRINT '';

-- PASO 2: Verificar IDENTITY
IF COLUMNPROPERTY(OBJECT_ID('modulos'), 'id', 'IsIdentity') = 1
BEGIN
    PRINT '✅ La tabla modulos YA tiene IDENTITY configurado';
    PRINT '✅ NO necesitas ejecutar el resto del script';
    PRINT '';
END
ELSE
BEGIN
    PRINT '⚠️ La tabla modulos NO tiene IDENTITY configurado';
    PRINT '🔄 Procediendo a reconfigurar...';
    PRINT '';

    -- PASO 3: Guardar relaciones perfil_modulo
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'perfil_modulo')
    BEGIN
        SELECT perfil_id, modulo_id
        INTO #temp_perfil_modulo
        FROM perfil_modulo;

        DELETE FROM perfil_modulo;
        PRINT '✅ Relaciones perfil_modulo guardadas';
    END

    -- PASO 4: Crear tabla temporal SOLO con columnas básicas
    CREATE TABLE modulos_temp (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        descripcion VARCHAR(500) NULL,
        ruta VARCHAR(200) NULL,
        icono VARCHAR(50) NULL
    );
    PRINT '✅ Tabla temporal creada';

    -- PASO 5: Copiar datos (adaptable a columnas existentes)
    IF EXISTS (SELECT 1 FROM modulos)
    BEGIN
        SET IDENTITY_INSERT modulos_temp ON;

        -- Insertar solo las columnas que existen en ambas tablas
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'modulos' AND COLUMN_NAME = 'ruta')
            AND EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'modulos' AND COLUMN_NAME = 'icono')
        BEGIN
            -- Tiene todas las columnas
            INSERT INTO modulos_temp (id, nombre, descripcion, ruta, icono)
            SELECT id,
                   nombre,
                   ISNULL(descripcion, 'Módulo: ' + nombre),
                   ISNULL(ruta, '/' + LOWER(REPLACE(nombre, ' ', '-'))),
                   ISNULL(icono, 'extension')
            FROM modulos;
        END
        ELSE IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'modulos' AND COLUMN_NAME = 'ruta')
        BEGIN
            -- Solo tiene id, nombre, descripcion, ruta
            INSERT INTO modulos_temp (id, nombre, descripcion, ruta, icono)
            SELECT id,
                   nombre,
                   ISNULL(descripcion, 'Módulo: ' + nombre),
                   ISNULL(ruta, '/' + LOWER(REPLACE(nombre, ' ', '-'))),
                   'extension'
            FROM modulos;
        END
        ELSE
        BEGIN
            -- Solo tiene id, nombre, descripcion
            INSERT INTO modulos_temp (id, nombre, descripcion, ruta, icono)
            SELECT id,
                   nombre,
                   ISNULL(descripcion, 'Módulo: ' + nombre),
                   '/' + LOWER(REPLACE(nombre, ' ', '-')),
                   'extension'
            FROM modulos;
        END

        SET IDENTITY_INSERT modulos_temp OFF;
        PRINT '✅ Datos copiados a tabla temporal';
    END

    -- PASO 6: Eliminar tabla original
    DROP TABLE modulos;
    PRINT '✅ Tabla modulos original eliminada';

    -- PASO 7: Renombrar tabla temporal
    EXEC sp_rename 'modulos_temp', 'modulos';
    PRINT '✅ Tabla modulos recreada con IDENTITY';

    -- PASO 8: Restaurar relaciones
    IF EXISTS (SELECT * FROM tempdb.sys.objects WHERE name like '#temp_perfil_modulo%')
    BEGIN
        INSERT INTO perfil_modulo (perfil_id, modulo_id)
        SELECT perfil_id, modulo_id
        FROM #temp_perfil_modulo;

        DROP TABLE #temp_perfil_modulo;
        PRINT '✅ Relaciones perfil_modulo restauradas';
    END

    PRINT '';
    PRINT '===================================================';
    PRINT '✅ CONFIGURACIÓN COMPLETADA EXITOSAMENTE';
    PRINT '===================================================';
END

-- PASO 9: Verificación final
PRINT '';
PRINT 'VERIFICACIÓN FINAL:';
IF COLUMNPROPERTY(OBJECT_ID('modulos'), 'id', 'IsIdentity') = 1
    PRINT '✅ IDENTITY configurado correctamente'
ELSE
    PRINT '❌ Error al configurar IDENTITY'

PRINT '';
PRINT '===================================================';
GO
