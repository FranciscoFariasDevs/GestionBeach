-- =============================================================
-- MIGRACIÓN: Histórico de asignaciones de sucursal por empleado
-- Ejecutar UNA SOLA VEZ en la base de datos de producción
-- =============================================================

-- 1. Agregar columna fecha_inicio (cuándo empieza a valer esta asignación)
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'empleados_sucursales' AND COLUMN_NAME = 'fecha_inicio'
)
BEGIN
  ALTER TABLE empleados_sucursales ADD fecha_inicio DATE NULL;
  PRINT 'Columna fecha_inicio agregada';
END
ELSE
  PRINT 'Columna fecha_inicio ya existía, se omite';

-- 2. Agregar columna fecha_fin (cuándo termina; NULL = vigente)
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'empleados_sucursales' AND COLUMN_NAME = 'fecha_fin'
)
BEGIN
  ALTER TABLE empleados_sucursales ADD fecha_fin DATE NULL;
  PRINT 'Columna fecha_fin agregada';
END
ELSE
  PRINT 'Columna fecha_fin ya existía, se omite';

-- 3. Poblar fecha_inicio con la fecha de creación de cada registro
UPDATE empleados_sucursales
SET fecha_inicio = CAST(created_at AS DATE)
WHERE fecha_inicio IS NULL;
PRINT 'fecha_inicio poblada en ' + CAST(@@ROWCOUNT AS VARCHAR) + ' registros';

-- 4. Eliminar la constraint UNIQUE (id_empleado, id_sucursal) que impide
--    tener múltiples períodos para el mismo par empleado-sucursal
IF EXISTS (
  SELECT 1 FROM sys.key_constraints
  WHERE name = 'UC_empleado_sucursal' AND type = 'UQ'
)
BEGIN
  ALTER TABLE empleados_sucursales DROP CONSTRAINT UC_empleado_sucursal;
  PRINT 'Constraint UC_empleado_sucursal eliminada';
END
ELSE
  PRINT 'Constraint UC_empleado_sucursal no existía, se omite';

-- 5. Verificación: mostrar estado final
SELECT
  COUNT(*)             AS total_registros,
  SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) AS activos,
  SUM(CASE WHEN fecha_inicio IS NULL THEN 1 ELSE 0 END) AS sin_fecha_inicio
FROM empleados_sucursales;

PRINT '✅ Migración completada. Verificar que sin_fecha_inicio = 0';
