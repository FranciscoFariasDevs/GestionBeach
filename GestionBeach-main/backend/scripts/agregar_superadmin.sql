-- ============================================================
-- Agregar campo superadmin a la tabla usuarios
-- Ejecutar en SQL Server Management Studio
-- ============================================================

-- 1. Agregar columna superadmin (si no existe)
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'superadmin'
)
BEGIN
  ALTER TABLE usuarios ADD superadmin BIT NOT NULL DEFAULT 0;
  PRINT '✅ Columna superadmin agregada';
END
ELSE
BEGIN
  PRINT '⚠️  Columna superadmin ya existe';
END

-- 2. Marcar a pancho (y cualquier otro superadmin) como superadmin = 1
UPDATE usuarios SET superadmin = 1 WHERE LOWER(username) = 'pancho';

-- Verificar resultado
SELECT id, username, nombre_completo, perfil_id, superadmin
FROM usuarios
WHERE superadmin = 1;
