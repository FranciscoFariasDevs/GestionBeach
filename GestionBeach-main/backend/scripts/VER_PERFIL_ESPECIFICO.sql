USE GestionBeach;
GO

-- Cambia el ID según el perfil que quieras ver
DECLARE @PerfilID INT = 12; -- ID del perfil Finanzas

PRINT '=== INFORMACIÓN DEL PERFIL ===';
PRINT '';

-- 1. Datos del perfil
SELECT id, nombre, descripcion
FROM perfiles
WHERE id = @PerfilID;

PRINT '';
PRINT '=== MÓDULOS ASIGNADOS ===';
PRINT '';

-- 2. Módulos asignados (con IDs)
SELECT
    pm.perfil_id,
    pm.modulo_id,
    m.nombre AS modulo_nombre
FROM perfil_modulo pm
INNER JOIN modulos m ON pm.modulo_id = m.id
WHERE pm.perfil_id = @PerfilID
ORDER BY m.nombre;

PRINT '';
PRINT '=== CONTEO ===';

-- 3. Contar total
SELECT COUNT(*) AS total_modulos
FROM perfil_modulo
WHERE perfil_id = @PerfilID;

GO
