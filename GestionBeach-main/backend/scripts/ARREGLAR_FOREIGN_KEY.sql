USE GestionBeach;
GO

PRINT '🔧 ARREGLANDO FOREIGN KEYS...';
PRINT '';

-- 1. Ver foreign keys actuales en perfil_modulo
PRINT '1. FOREIGN KEYS ACTUALES:';
SELECT
    fk.name AS FK_Name,
    OBJECT_NAME(fk.parent_object_id) AS Table_Name,
    COL_NAME(fc.parent_object_id, fc.parent_column_id) AS Column_Name,
    OBJECT_NAME (fk.referenced_object_id) AS Referenced_Table,
    COL_NAME(fc.referenced_object_id, fc.referenced_column_id) AS Referenced_Column
FROM sys.foreign_keys AS fk
INNER JOIN sys.foreign_key_columns AS fc ON fk.object_id = fc.constraint_object_id
WHERE OBJECT_NAME(fk.parent_object_id) = 'perfil_modulo';
PRINT '';

-- 2. Eliminar foreign keys viejas que apuntan a modulos_OLD
DECLARE @sql NVARCHAR(MAX);
DECLARE @fkName NVARCHAR(255);

DECLARE fk_cursor CURSOR FOR
SELECT fk.name
FROM sys.foreign_keys AS fk
WHERE OBJECT_NAME(fk.parent_object_id) = 'perfil_modulo'
  AND OBJECT_NAME(fk.referenced_object_id) = 'modulos_OLD';

OPEN fk_cursor;
FETCH NEXT FROM fk_cursor INTO @fkName;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @sql = 'ALTER TABLE perfil_modulo DROP CONSTRAINT ' + @fkName;
    PRINT '🗑️ Eliminando FK vieja: ' + @fkName;
    EXEC sp_executesql @sql;
    FETCH NEXT FROM fk_cursor INTO @fkName;
END

CLOSE fk_cursor;
DEALLOCATE fk_cursor;

PRINT '';

-- 3. Verificar si existe tabla modulos_OLD y eliminarla
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'modulos_OLD')
BEGIN
    DROP TABLE modulos_OLD;
    PRINT '✅ Tabla modulos_OLD eliminada';
END
ELSE
BEGIN
    PRINT '⏭️ Tabla modulos_OLD no existe';
END

PRINT '';

-- 4. Crear foreign key correcta si no existe
IF NOT EXISTS (
    SELECT * FROM sys.foreign_keys
    WHERE name = 'FK_perfil_modulo_modulo'
    AND parent_object_id = OBJECT_ID('perfil_modulo')
    AND referenced_object_id = OBJECT_ID('modulos')
)
BEGIN
    ALTER TABLE perfil_modulo
    ADD CONSTRAINT FK_perfil_modulo_modulo
    FOREIGN KEY (modulo_id) REFERENCES modulos(id);
    PRINT '✅ Foreign key FK_perfil_modulo_modulo creada';
END
ELSE
BEGIN
    PRINT '⏭️ Foreign key FK_perfil_modulo_modulo ya existe';
END

PRINT '';

-- 5. Crear foreign key para perfil_id si no existe
IF NOT EXISTS (
    SELECT * FROM sys.foreign_keys
    WHERE name = 'FK_perfil_modulo_perfil'
    AND parent_object_id = OBJECT_ID('perfil_modulo')
)
BEGIN
    ALTER TABLE perfil_modulo
    ADD CONSTRAINT FK_perfil_modulo_perfil
    FOREIGN KEY (perfil_id) REFERENCES perfiles(id);
    PRINT '✅ Foreign key FK_perfil_modulo_perfil creada';
END
ELSE
BEGIN
    PRINT '⏭️ Foreign key FK_perfil_modulo_perfil ya existe';
END

PRINT '';
PRINT '=================================================';
PRINT '✅ FOREIGN KEYS ARREGLADAS';
PRINT '=================================================';
PRINT '';

-- 6. Ver foreign keys finales
PRINT 'FOREIGN KEYS FINALES:';
SELECT
    fk.name AS FK_Name,
    OBJECT_NAME(fk.parent_object_id) AS Table_Name,
    COL_NAME(fc.parent_object_id, fc.parent_column_id) AS Column_Name,
    OBJECT_NAME (fk.referenced_object_id) AS Referenced_Table,
    COL_NAME(fc.referenced_object_id, fc.referenced_column_id) AS Referenced_Column
FROM sys.foreign_keys AS fk
INNER JOIN sys.foreign_key_columns AS fc ON fk.object_id = fc.constraint_object_id
WHERE OBJECT_NAME(fk.parent_object_id) = 'perfil_modulo';

GO
