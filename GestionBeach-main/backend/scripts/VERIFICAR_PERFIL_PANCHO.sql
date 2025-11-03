USE GestionBeach;
GO

PRINT '=== VERIFICAR PERFIL DE USUARIO PANCHO ===';
PRINT '';

-- 1. Ver todos los usuarios que coincidan con Pancho
PRINT '1. BUSCAR USUARIO PANCHO:';
SELECT
    id,
    username,
    nombre,
    perfil_id,
    activo,
    fecha_creacion
FROM usuarios
WHERE username LIKE '%Pancho%' OR nombre LIKE '%Pancho%';
PRINT '';

-- 2. Ver el perfil asignado
PRINT '2. PERFIL ASIGNADO:';
SELECT
    u.id AS usuario_id,
    u.username,
    u.nombre,
    u.perfil_id,
    p.nombre AS perfil_nombre,
    p.descripcion AS perfil_descripcion
FROM usuarios u
LEFT JOIN perfiles p ON u.perfil_id = p.id
WHERE u.username LIKE '%Pancho%' OR u.nombre LIKE '%Pancho%';
PRINT '';

-- 3. Ver todos los perfiles disponibles
PRINT '3. TODOS LOS PERFILES:';
SELECT id, nombre, descripcion
FROM perfiles
ORDER BY id;
PRINT '';

-- 4. Si el perfil NO es 10 (Super Admin), actualizarlo
PRINT '4. ACTUALIZAR PERFIL A SUPER ADMIN (10) SI ES NECESARIO:';
UPDATE usuarios
SET perfil_id = 10
WHERE (username LIKE '%Pancho%' OR nombre LIKE '%Pancho%')
AND perfil_id != 10;

PRINT 'Perfil actualizado (si era necesario)';
PRINT '';

-- 5. Verificación final
PRINT '5. VERIFICACION FINAL:';
SELECT
    u.id AS usuario_id,
    u.username,
    u.nombre,
    u.perfil_id,
    p.nombre AS perfil_nombre,
    p.descripcion AS perfil_descripcion
FROM usuarios u
LEFT JOIN perfiles p ON u.perfil_id = p.id
WHERE u.username LIKE '%Pancho%' OR u.nombre LIKE '%Pancho%';

PRINT '';
PRINT '✅ PROCESO COMPLETADO';
PRINT 'Si el usuario Pancho tenía perfil_id diferente de 10, ha sido actualizado.';
PRINT 'Por favor, cierra sesión y vuelve a iniciar sesión para que el cambio tome efecto.';

GO
