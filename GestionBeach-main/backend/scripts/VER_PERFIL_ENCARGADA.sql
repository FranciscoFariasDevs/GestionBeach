USE GestionBeach;
GO

PRINT '=== VERIFICAR PERFIL ENCARGADA DE TURNO LORD ===';
PRINT '';

-- 1. Buscar el perfil
PRINT '1. PERFIL:';
SELECT id, nombre, descripcion
FROM perfiles
WHERE nombre LIKE '%encargada%' OR nombre LIKE '%lord%';
PRINT '';

-- 2. Ver módulos asignados (cambiar el ID según el resultado anterior)
PRINT '2. MÓDULOS ASIGNADOS AL PERFIL:';
SELECT
    p.id AS perfil_id,
    p.nombre AS perfil_nombre,
    m.id AS modulo_id,
    m.nombre AS modulo_nombre
FROM perfiles p
LEFT JOIN perfil_modulo pm ON p.id = pm.perfil_id
LEFT JOIN modulos m ON pm.modulo_id = m.id
WHERE p.nombre LIKE '%encargada%' OR p.nombre LIKE '%lord%'
ORDER BY m.nombre;
PRINT '';

-- 3. Ver usuario con ese perfil
PRINT '3. USUARIOS CON ESE PERFIL:';
SELECT
    u.id AS usuario_id,
    u.nombre AS username,
    u.perfil_id,
    p.nombre AS perfil_nombre
FROM usuarios u
INNER JOIN perfiles p ON u.perfil_id = p.id
WHERE p.nombre LIKE '%encargada%' OR p.nombre LIKE '%lord%';

GO
