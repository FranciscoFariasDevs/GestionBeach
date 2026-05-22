-- ================================================
-- FIX: Permisos módulo Mantenciones
-- ================================================
-- El módulo Mantenciones fue asignado a todos los perfiles
-- sin control. Este script lo elimina de los perfiles que
-- NO deben tener acceso.
--
-- Perfiles que SÍ conservan acceso:
--   10 - Super Admin  (tiene bypass automático en el código)
--   11 - Gerencia
--   14 - Jefe de Local
--
-- Perfiles que pierden acceso (no corresponde):
--   12 - Finanzas
--   13 - Recursos Humanos
--   15 - Solo Lectura
--   16 - Administrador
-- ================================================

USE GestionBeach;
GO

DECLARE @moduloId INT;
SELECT @moduloId = id FROM modulos WHERE nombre = 'Mantenciones';

IF @moduloId IS NULL
BEGIN
    PRINT '❌ ERROR: No se encontró el módulo "Mantenciones" en la tabla modulos.';
    PRINT '   Verifica que el nombre sea exactamente "Mantenciones".';
    RETURN;
END

PRINT '✅ Módulo Mantenciones encontrado con ID: ' + CAST(@moduloId AS VARCHAR);

-- Mostrar situación actual antes del cambio
PRINT '';
PRINT '📊 Perfiles que actualmente tienen Mantenciones:';
SELECT p.id, p.nombre, COUNT(pms.id) as total_sucursales
FROM perfiles p
INNER JOIN perfil_modulo_sucursal pms ON pms.perfil_id = p.id
WHERE pms.modulo_id = @moduloId
GROUP BY p.id, p.nombre
ORDER BY p.id;

-- Eliminar Mantenciones de perfiles NO autorizados
DELETE FROM perfil_modulo_sucursal
WHERE modulo_id = @moduloId
AND perfil_id NOT IN (10, 11, 14);

PRINT '';
PRINT '✅ Permisos corregidos: Mantenciones eliminado de perfiles 12, 13, 15 y 16.';
PRINT '   Conservado en: Super Admin (10), Gerencia (11), Jefe de Local (14).';

-- Mostrar situación final
PRINT '';
PRINT '📊 Perfiles con acceso a Mantenciones después del fix:';
SELECT p.id, p.nombre, COUNT(pms.id) as total_sucursales
FROM perfiles p
INNER JOIN perfil_modulo_sucursal pms ON pms.perfil_id = p.id
WHERE pms.modulo_id = @moduloId
GROUP BY p.id, p.nombre
ORDER BY p.id;

PRINT '';
PRINT '🔔 NOTA: Si Gerencia (11) o Jefe de Local (14) no tienen';
PRINT '   sucursales asignadas al módulo Mantenciones, deben';
PRINT '   configurarse desde Admin → Perfiles → Gestión de Permisos.';
GO
