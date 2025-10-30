USE GestionBeach;
GO

PRINT '=== ESTADO ACTUAL DEL SISTEMA ===';
PRINT '';

-- 1. Ver todos los módulos
PRINT '1. MÓDULOS EN LA BASE DE DATOS:';
SELECT id, nombre FROM modulos ORDER BY id;
PRINT '';

-- 2. Ver todos los perfiles
PRINT '2. PERFILES:';
SELECT id, nombre FROM perfiles ORDER BY id;
PRINT '';

-- 3. Ver relaciones perfil_modulo
PRINT '3. RELACIONES PERFIL-MODULO:';
SELECT
    pm.perfil_id,
    p.nombre AS perfil_nombre,
    pm.modulo_id,
    m.nombre AS modulo_nombre
FROM perfil_modulo pm
LEFT JOIN perfiles p ON pm.perfil_id = p.id
LEFT JOIN modulos m ON pm.modulo_id = m.id
ORDER BY pm.perfil_id, pm.modulo_id;
PRINT '';

-- 4. Contar módulos por perfil
PRINT '4. TOTAL DE MÓDULOS POR PERFIL:';
SELECT
    p.id,
    p.nombre,
    COUNT(pm.modulo_id) AS total_modulos
FROM perfiles p
LEFT JOIN perfil_modulo pm ON p.id = pm.perfil_id
GROUP BY p.id, p.nombre
ORDER BY p.id;

GO
