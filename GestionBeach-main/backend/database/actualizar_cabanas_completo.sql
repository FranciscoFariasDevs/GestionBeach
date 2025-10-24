-- ============================================
-- SCRIPT COMPLETO: ACTUALIZAR INFORMACIÓN DE CABAÑAS
-- Incluye creación de columna y actualización de datos
-- ============================================

USE Beachsql;
GO

-- ============================================
-- PASO 1: AGREGAR COLUMNA AMENIDADES SI NO EXISTE
-- ============================================
IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE Name = 'amenidades'
    AND Object_ID = Object_ID('dbo.cabanas')
)
BEGIN
    ALTER TABLE dbo.cabanas
    ADD amenidades NVARCHAR(MAX) NULL;
    PRINT '✅ Columna amenidades agregada correctamente';
END
ELSE
BEGIN
    PRINT 'ℹ️  Columna amenidades ya existe';
END
GO

-- ============================================
-- PASO 2: ACTUALIZAR INFORMACIÓN DE CADA CABAÑA
-- ============================================

-- ============================================
-- CABAÑA 1 - Familiar Grande con Terraza
-- ============================================
UPDATE dbo.cabanas
SET
    descripcion = 'Cabaña familiar grande con terraza propia. Capacidad: 10 personas. Dormitorios: 4 (2 Camas de Dos Plazas y 6 Camas de Plaza y Media). Baños: 2. Incluye: Terraza Propia.',
    capacidad_personas = 10,
    numero_habitaciones = 4,
    numero_banos = 2,
    amenidades = '["Terraza Propia", "2 Camas de Dos Plazas", "6 Camas de Plaza y Media", "Total 8 camas"]',
    ubicacion = 'Con terraza propia'
WHERE numero = 1;
PRINT '✅ Cabaña 1 actualizada';

-- ============================================
-- CABAÑA 2 - Acogedora con Quincho
-- ============================================
UPDATE dbo.cabanas
SET
    descripcion = 'Cabaña acogedora con quincho. Capacidad: 4 personas. Dormitorios: 3 (1 Matrimonial y 2 de Plaza y Media). Baños: 2. Incluye: Quincho.',
    capacidad_personas = 4,
    numero_habitaciones = 3,
    numero_banos = 2,
    amenidades = '["Quincho", "1 Cama Matrimonial", "2 Camas de Plaza y Media"]',
    ubicacion = 'Con quincho'
WHERE numero = 2;
PRINT '✅ Cabaña 2 actualizada';

-- ============================================
-- CABAÑA 3 - Quincho Frente a Terraza Grande
-- ============================================
UPDATE dbo.cabanas
SET
    descripcion = 'Cabaña con quincho frente a terraza grande. Capacidad: 4 personas. Dormitorios: 3 (1 Matrimonial y 2 de Plaza y Media). Baños: 2. Incluye: Quincho. Ubicación especial: Frente a terraza grande.',
    capacidad_personas = 4,
    numero_habitaciones = 3,
    numero_banos = 2,
    amenidades = '["Quincho", "1 Cama Matrimonial", "2 Camas de Plaza y Media", "Vista a Terraza Grande"]',
    ubicacion = 'Frente a la terraza grande, con quincho'
WHERE numero = 3;
PRINT '✅ Cabaña 3 actualizada';

-- ============================================
-- CABAÑA 4 - Confortable con Quincho
-- ============================================
UPDATE dbo.cabanas
SET
    descripcion = 'Cabaña confortable con quincho. Capacidad: 4 personas. Dormitorios: 3 (1 Matrimonial y 2 de Plaza y Media). Baños: 2. Incluye: Quincho.',
    capacidad_personas = 4,
    numero_habitaciones = 3,
    numero_banos = 2,
    amenidades = '["Quincho", "1 Cama Matrimonial", "2 Camas de Plaza y Media"]',
    ubicacion = 'Con quincho'
WHERE numero = 4;
PRINT '✅ Cabaña 4 actualizada';

-- ============================================
-- CABAÑA 5 - Particular con Literas
-- ============================================
UPDATE dbo.cabanas
SET
    descripcion = 'Cabaña particular con literas y quincho. Capacidad: 6 personas. Dormitorios: 2 (1 Matrimonial y 4 de Plaza y Media, incluye literas). Baños: 1. Incluye: Quincho.',
    capacidad_personas = 6,
    numero_habitaciones = 2,
    numero_banos = 1,
    amenidades = '["Quincho", "1 Cama Matrimonial", "4 Camas de Plaza y Media (incluye literas)", "Cabaña Particular"]',
    ubicacion = 'Cabaña particular con literas'
WHERE numero = 5;
PRINT '✅ Cabaña 5 actualizada';

-- ============================================
-- CABAÑA 6 - Tipo Rústica con Estacionamiento
-- ============================================
UPDATE dbo.cabanas
SET
    descripcion = 'Cabaña rústica con estacionamiento propio y quincho. Capacidad: 7 personas. Dormitorios: 2 (2 Matrimoniales y 3 de Plaza y Media). Baños: 1. Incluye: Estacionamiento Propio, Quincho.',
    capacidad_personas = 7,
    numero_habitaciones = 2,
    numero_banos = 1,
    amenidades = '["Tipo Rústica", "Estacionamiento Propio", "Quincho", "2 Camas Matrimoniales", "3 Camas de Plaza y Media"]',
    ubicacion = 'Tipo Rústica con estacionamiento'
WHERE numero = 6;
PRINT '✅ Cabaña 6 actualizada';

-- ============================================
-- CABAÑA 7 - Ubicada en Altura
-- ============================================
UPDATE dbo.cabanas
SET
    descripcion = 'Cabaña ubicada en altura con quincho. Capacidad: 7 personas. Dormitorios: 3 (2 Matrimoniales y 3 de Plaza y Media). Baños: 2. Incluye: Quincho, Ubicada en Altura.',
    capacidad_personas = 7,
    numero_habitaciones = 3,
    numero_banos = 2,
    amenidades = '["Ubicada en Altura", "Quincho", "2 Camas Matrimoniales", "3 Camas de Plaza y Media"]',
    ubicacion = 'Ubicada en altura con quincho'
WHERE numero = 7;
PRINT '✅ Cabaña 7 actualizada';

-- ============================================
-- CABAÑA 8 - Ubicada en Altura
-- ============================================
UPDATE dbo.cabanas
SET
    descripcion = 'Cabaña ubicada en altura con quincho. Capacidad: 7 personas. Dormitorios: 3 (2 Matrimoniales y 3 de Plaza y Media). Baños: 2. Incluye: Quincho, Ubicada en Altura.',
    capacidad_personas = 7,
    numero_habitaciones = 3,
    numero_banos = 2,
    amenidades = '["Ubicada en Altura", "Quincho", "2 Camas Matrimoniales", "3 Camas de Plaza y Media"]',
    ubicacion = 'Ubicada en altura con quincho'
WHERE numero = 8;
PRINT '✅ Cabaña 8 actualizada';

-- ============================================
-- DEPARTAMENTO A (CABAÑA 9) - Romántico Premium
-- ============================================
UPDATE dbo.cabanas
SET
    nombre = 'Departamento A',
    descripcion = 'Departamento romántico exclusivo para parejas con comodidades premium. Capacidad: Solo Pareja (2 personas). Dormitorios: 1 (1 Cama Matrimonial). Comodidades: Jacuzzi (incluye espuma), Calefactores, Calienta cama, Estufa eléctrica.',
    capacidad_personas = 2,
    numero_habitaciones = 1,
    numero_banos = 1,
    amenidades = '["Solo para Pareja", "Jacuzzi (incluye espuma)", "Calefactores", "Calienta cama", "Estufa eléctrica", "1 Cama Matrimonial"]',
    ubicacion = 'Departamento romántico premium'
WHERE numero = 9;
PRINT '✅ Departamento A (Cabaña 9) actualizado';

-- ============================================
-- DEPARTAMENTO B (CABAÑA 10) - Romántico Premium
-- ============================================
UPDATE dbo.cabanas
SET
    nombre = 'Departamento B',
    descripcion = 'Departamento romántico exclusivo para parejas con comodidades premium. Capacidad: Solo Pareja (2 personas). Dormitorios: 1 (1 Cama Matrimonial). Comodidades: Jacuzzi (incluye espuma), Calefactores, Calienta cama, Estufa eléctrica.',
    capacidad_personas = 2,
    numero_habitaciones = 1,
    numero_banos = 1,
    amenidades = '["Solo para Pareja", "Jacuzzi (incluye espuma)", "Calefactores", "Calienta cama", "Estufa eléctrica", "1 Cama Matrimonial"]',
    ubicacion = 'Departamento romántico premium'
WHERE numero = 10;
PRINT '✅ Departamento B (Cabaña 10) actualizado';

GO

-- ============================================
-- PASO 3: VERIFICAR LAS ACTUALIZACIONES
-- ============================================
PRINT '';
PRINT '========================================';
PRINT '📋 VERIFICACIÓN DE ACTUALIZACIONES';
PRINT '========================================';
PRINT '';

SELECT
    numero AS 'N°',
    nombre AS 'Nombre',
    capacidad_personas AS 'Capacidad',
    numero_habitaciones AS 'Habitaciones',
    numero_banos AS 'Baños',
    precio_noche AS 'Precio/Noche',
    precio_fin_semana AS 'Precio/Fin Semana',
    ubicacion AS 'Ubicación',
    amenidades AS 'Amenidades (JSON)',
    descripcion AS 'Descripción'
FROM dbo.cabanas
ORDER BY numero;

GO

-- ============================================
-- RESUMEN DE ACTUALIZACIONES
-- ============================================
PRINT '';
PRINT '========================================';
PRINT '✅ ACTUALIZACIÓN COMPLETADA';
PRINT '========================================';
PRINT '';
PRINT '📋 Resumen de Cabañas:';
PRINT '  • Cabaña 1: 10 personas, 4 dormitorios, 2 baños, Terraza Propia';
PRINT '  • Cabaña 2: 4 personas, 3 dormitorios, 2 baños, Quincho';
PRINT '  • Cabaña 3: 4 personas, 3 dormitorios, 2 baños, Quincho (frente a terraza grande)';
PRINT '  • Cabaña 4: 4 personas, 3 dormitorios, 2 baños, Quincho';
PRINT '  • Cabaña 5: 6 personas, 2 dormitorios, 1 baño, Literas + Quincho';
PRINT '  • Cabaña 6: 7 personas, 2 dormitorios, 1 baño, Rústica + Estacionamiento';
PRINT '  • Cabaña 7: 7 personas, 3 dormitorios, 2 baños, En Altura + Quincho';
PRINT '  • Cabaña 8: 7 personas, 3 dormitorios, 2 baños, En Altura + Quincho';
PRINT '  • Departamento A: 2 personas (solo pareja), Jacuzzi Premium';
PRINT '  • Departamento B: 2 personas (solo pareja), Jacuzzi Premium';
PRINT '';
PRINT '✨ Todas las cabañas ahora tienen amenidades en formato JSON';
PRINT '';
