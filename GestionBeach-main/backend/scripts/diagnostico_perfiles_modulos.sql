-- Script de Diagnóstico para Perfiles y Módulos
-- Ejecuta este script para verificar el estado de tu sistema de permisos

USE GestionBeach;
GO

PRINT '===================================================';
PRINT 'DIAGNÓSTICO DE PERFILES Y MÓDULOS';
PRINT '===================================================';
PRINT '';

-- 1. Verificar existencia de tablas
PRINT '1. VERIFICANDO TABLAS...';
PRINT '';

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'perfiles')
    PRINT '✅ Tabla perfiles existe'
ELSE
    PRINT '❌ Tabla perfiles NO existe';

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'modulos')
    PRINT '✅ Tabla modulos existe'
ELSE
    PRINT '❌ Tabla modulos NO existe';

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'perfil_modulo')
    PRINT '✅ Tabla perfil_modulo existe'
ELSE
    PRINT '❌ Tabla perfil_modulo NO existe';

PRINT '';
PRINT '---------------------------------------------------';
PRINT '';

-- 2. Listar todos los módulos disponibles
PRINT '2. MÓDULOS DISPONIBLES EN LA BASE DE DATOS:';
PRINT '';

SELECT
    id,
    nombre,
    descripcion
FROM modulos
ORDER BY id;

DECLARE @totalModulos INT;
SELECT @totalModulos = COUNT(*) FROM modulos;
PRINT '';
PRINT 'Total de módulos: ' + CAST(@totalModulos AS VARCHAR);
PRINT '';
PRINT '---------------------------------------------------';
PRINT '';

-- 3. Listar todos los perfiles
PRINT '3. PERFILES CONFIGURADOS:';
PRINT '';

SELECT
    id,
    nombre,
    descripcion,
    activo
FROM perfiles
ORDER BY id;

DECLARE @totalPerfiles INT;
SELECT @totalPerfiles = COUNT(*) FROM perfiles;
PRINT '';
PRINT 'Total de perfiles: ' + CAST(@totalPerfiles AS VARCHAR);
PRINT '';
PRINT '---------------------------------------------------';
PRINT '';

-- 4. Mostrar relación perfil-módulo
PRINT '4. RELACIONES PERFIL-MÓDULO:';
PRINT '';

SELECT
    p.id AS perfil_id,
    p.nombre AS perfil_nombre,
    m.id AS modulo_id,
    m.nombre AS modulo_nombre
FROM perfil_modulo pm
INNER JOIN perfiles p ON pm.perfil_id = p.id
INNER JOIN modulos m ON pm.modulo_id = m.id
ORDER BY p.id, m.nombre;

DECLARE @totalRelaciones INT;
SELECT @totalRelaciones = COUNT(*) FROM perfil_modulo;
PRINT '';
PRINT 'Total de relaciones: ' + CAST(@totalRelaciones AS VARCHAR);
PRINT '';
PRINT '---------------------------------------------------';
PRINT '';

-- 5. Contar módulos por perfil
PRINT '5. RESUMEN: MÓDULOS POR PERFIL:';
PRINT '';

SELECT
    p.id AS perfil_id,
    p.nombre AS perfil_nombre,
    COUNT(pm.modulo_id) AS total_modulos,
    STRING_AGG(m.nombre, ', ') AS modulos_asignados
FROM perfiles p
LEFT JOIN perfil_modulo pm ON p.id = pm.perfil_id
LEFT JOIN modulos m ON pm.modulo_id = m.id
GROUP BY p.id, p.nombre
ORDER BY p.id;

PRINT '';
PRINT '---------------------------------------------------';
PRINT '';

-- 6. Detectar módulos huérfanos (no asignados a ningún perfil)
PRINT '6. MÓDULOS SIN ASIGNAR (HUÉRFANOS):';
PRINT '';

SELECT
    m.id,
    m.nombre,
    m.descripcion
FROM modulos m
LEFT JOIN perfil_modulo pm ON m.id = pm.modulo_id
WHERE pm.modulo_id IS NULL
ORDER BY m.nombre;

DECLARE @modulosHuerfanos INT;
SELECT @modulosHuerfanos = COUNT(*)
FROM modulos m
LEFT JOIN perfil_modulo pm ON m.id = pm.modulo_id
WHERE pm.modulo_id IS NULL;

PRINT '';
PRINT 'Total de módulos huérfanos: ' + CAST(@modulosHuerfanos AS VARCHAR);
PRINT '';
PRINT '---------------------------------------------------';
PRINT '';

-- 7. Detectar perfiles sin módulos
PRINT '7. PERFILES SIN MÓDULOS:';
PRINT '';

SELECT
    p.id,
    p.nombre,
    p.descripcion
FROM perfiles p
LEFT JOIN perfil_modulo pm ON p.id = pm.perfil_id
WHERE pm.perfil_id IS NULL
ORDER BY p.nombre;

DECLARE @perfilesSinModulos INT;
SELECT @perfilesSinModulos = COUNT(*)
FROM perfiles p
LEFT JOIN perfil_modulo pm ON p.id = pm.perfil_id
WHERE pm.perfil_id IS NULL;

PRINT '';
PRINT 'Total de perfiles sin módulos: ' + CAST(@perfilesSinModulos AS VARCHAR);
PRINT '';
PRINT '---------------------------------------------------';
PRINT '';

-- 8. Verificar si hay módulos duplicados
PRINT '8. VERIFICANDO MÓDULOS DUPLICADOS:';
PRINT '';

SELECT
    nombre,
    COUNT(*) as cantidad
FROM modulos
GROUP BY nombre
HAVING COUNT(*) > 1;

DECLARE @modulosDuplicados INT;
SELECT @modulosDuplicados = COUNT(*)
FROM (
    SELECT nombre
    FROM modulos
    GROUP BY nombre
    HAVING COUNT(*) > 1
) AS duplicados;

IF @modulosDuplicados > 0
    PRINT '⚠️ Se encontraron ' + CAST(@modulosDuplicados AS VARCHAR) + ' módulos duplicados'
ELSE
    PRINT '✅ No hay módulos duplicados';

PRINT '';
PRINT '---------------------------------------------------';
PRINT '';

-- 9. Verificar estructura de tabla modulos
PRINT '9. ESTRUCTURA DE TABLA MODULOS:';
PRINT '';

SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'modulos'
ORDER BY ORDINAL_POSITION;

PRINT '';
PRINT '---------------------------------------------------';
PRINT '';

-- 10. Verificar IDENTITY en modulos
PRINT '10. VERIFICANDO IDENTITY EN MODULOS:';
PRINT '';

IF COLUMNPROPERTY(OBJECT_ID('modulos'), 'id', 'IsIdentity') = 1
    PRINT '✅ La tabla modulos TIENE IDENTITY configurado'
ELSE
    PRINT '❌ La tabla modulos NO TIENE IDENTITY configurado (Ejecuta setup_modulos_identity.sql)';

PRINT '';
PRINT '===================================================';
PRINT 'DIAGNÓSTICO COMPLETADO';
PRINT '===================================================';
PRINT '';

-- Resumen final
PRINT 'RESUMEN:';
PRINT '- Módulos totales: ' + CAST(@totalModulos AS VARCHAR);
PRINT '- Perfiles totales: ' + CAST(@totalPerfiles AS VARCHAR);
PRINT '- Relaciones perfil-módulo: ' + CAST(@totalRelaciones AS VARCHAR);
PRINT '- Módulos huérfanos: ' + CAST(@modulosHuerfanos AS VARCHAR);
PRINT '- Perfiles sin módulos: ' + CAST(@perfilesSinModulos AS VARCHAR);
PRINT '';
PRINT '===================================================';

GO
