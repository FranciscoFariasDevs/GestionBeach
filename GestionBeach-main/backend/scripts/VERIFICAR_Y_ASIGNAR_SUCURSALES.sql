USE GestionBeach;
GO

PRINT '=== DIAGNOSTICO DE SUCURSALES PARA ENCARGADA TURNO LORD ===';
PRINT '';

-- 1. Ver el perfil
PRINT '1. PERFIL:';
SELECT id, nombre, descripcion
FROM perfiles
WHERE id = 17 OR nombre LIKE '%encargada%turno%';
PRINT '';

-- 2. Ver sucursales asignadas al perfil
PRINT '2. SUCURSALES YA ASIGNADAS AL PERFIL:';
SELECT
    p.id AS perfil_id,
    p.nombre AS perfil_nombre,
    s.id AS sucursal_id,
    s.nombre AS sucursal_nombre,
    s.tipo_sucursal
FROM perfiles p
LEFT JOIN perfil_sucursal ps ON p.id = ps.perfil_id
LEFT JOIN sucursales s ON ps.sucursal_id = s.id
WHERE p.id = 17;
PRINT '';

-- 3. Ver todas las sucursales disponibles
PRINT '3. TODAS LAS SUCURSALES DISPONIBLES:';
SELECT id, nombre, tipo_sucursal, ip
FROM sucursales
ORDER BY nombre;
PRINT '';

-- 4. ASIGNAR TODAS LAS SUCURSALES AL PERFIL (si no tiene ninguna)
PRINT '4. ASIGNANDO TODAS LAS SUCURSALES AL PERFIL...';

-- Primero eliminar asignaciones previas
DELETE FROM perfil_sucursal WHERE perfil_id = 17;
PRINT 'Asignaciones previas eliminadas';

-- Asignar todas las sucursales
INSERT INTO perfil_sucursal (perfil_id, sucursal_id)
SELECT 17, id
FROM sucursales;

PRINT 'Sucursales asignadas exitosamente';
PRINT '';

-- 5. Verificar asignación
PRINT '5. VERIFICACION FINAL - SUCURSALES DEL PERFIL:';
SELECT
    p.id AS perfil_id,
    p.nombre AS perfil_nombre,
    s.id AS sucursal_id,
    s.nombre AS sucursal_nombre,
    s.tipo_sucursal
FROM perfiles p
INNER JOIN perfil_sucursal ps ON p.id = ps.perfil_id
INNER JOIN sucursales s ON ps.sucursal_id = s.id
WHERE p.id = 17
ORDER BY s.nombre;

PRINT '';
PRINT '✅ PROCESO COMPLETADO';

GO
