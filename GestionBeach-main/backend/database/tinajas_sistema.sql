-- ============================================
-- SISTEMA DE TINAJAS - BASE DE DATOS
-- ============================================
-- Base de datos: Beachsql
-- Compatible con SQL Server 2012+

USE Beachsql;
GO

-- ============================================
-- 1. TABLA DE TINAJAS
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tinajas]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.tinajas (
        id INT IDENTITY(1,1) PRIMARY KEY,
        numero INT NOT NULL UNIQUE, -- Número de tinaja (1-4)
        nombre VARCHAR(100) NOT NULL, -- Tinaja 1, Tinaja 2, etc.
        descripcion TEXT NULL,
        precio_temporada_alta DECIMAL(18,2) NOT NULL DEFAULT 40000, -- Precio temporada alta (dic-feb)
        precio_temporada_baja DECIMAL(18,2) NOT NULL DEFAULT 35000, -- Precio temporada baja (mar-nov)
        estado VARCHAR(20) NOT NULL DEFAULT 'disponible', -- disponible, mantenimiento, inactiva
        ubicacion VARCHAR(255) NULL,
        notas_internas TEXT NULL,
        fecha_creacion DATETIME NOT NULL DEFAULT GETDATE(),
        fecha_modificacion DATETIME NULL
    );
    PRINT '✅ Tabla tinajas creada';
END
ELSE
    PRINT '⚠️ Tabla tinajas ya existe';
GO

-- ============================================
-- 2. TABLA DE RESERVAS DE TINAJAS
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[reservas_tinajas]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.reservas_tinajas (
        id INT IDENTITY(1,1) PRIMARY KEY,
        reserva_cabana_id INT NOT NULL, -- Relacionado a la reserva de cabaña
        tinaja_id INT NOT NULL,

        -- Fechas específicas de uso de la tinaja
        fecha_uso DATE NOT NULL, -- Una fecha específica de uso

        -- Precio
        precio_dia DECIMAL(18,2) NOT NULL,

        -- Estado
        estado VARCHAR(20) NOT NULL DEFAULT 'confirmada', -- confirmada, cancelada

        -- Auditoría
        fecha_creacion DATETIME NOT NULL DEFAULT GETDATE(),
        fecha_modificacion DATETIME NULL,

        -- Foreign Keys
        CONSTRAINT FK_reservas_tinajas_reserva FOREIGN KEY (reserva_cabana_id) REFERENCES dbo.reservas_cabanas(id),
        CONSTRAINT FK_reservas_tinajas_tinaja FOREIGN KEY (tinaja_id) REFERENCES dbo.tinajas(id)
    );
    PRINT '✅ Tabla reservas_tinajas creada';
END
ELSE
    PRINT '⚠️ Tabla reservas_tinajas ya existe';
GO

-- ============================================
-- 3. TABLA DE PERSONAS EXTRA EN RESERVAS
-- ============================================
-- Agregar columna a reservas_cabanas si no existe
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[reservas_cabanas]') AND name = 'personas_extra')
BEGIN
    ALTER TABLE dbo.reservas_cabanas
    ADD personas_extra INT NULL DEFAULT 0,
        costo_personas_extra DECIMAL(18,2) NULL DEFAULT 0;
    PRINT '✅ Columnas personas_extra y costo_personas_extra agregadas a reservas_cabanas';
END
ELSE
    PRINT '⚠️ Columnas de personas extra ya existen';
GO

-- ============================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- ============================================

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tinajas_numero')
    CREATE INDEX IX_tinajas_numero ON tinajas(numero);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_reservas_tinajas_fecha')
    CREATE INDEX IX_reservas_tinajas_fecha ON reservas_tinajas(fecha_uso);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_reservas_tinajas_tinaja_fecha')
    CREATE INDEX IX_reservas_tinajas_tinaja_fecha ON reservas_tinajas(tinaja_id, fecha_uso);

PRINT '✅ Índices de tinajas creados correctamente';
GO

-- ============================================
-- INSERTAR DATOS INICIALES - 4 TINAJAS
-- ============================================

IF NOT EXISTS (SELECT * FROM dbo.tinajas)
BEGIN
    INSERT INTO dbo.tinajas (numero, nombre, descripcion, precio_temporada_alta, precio_temporada_baja, estado)
    VALUES
        (1, 'Tinaja 1', 'Tinaja de hidromasaje con agua caliente', 40000, 35000, 'disponible'),
        (2, 'Tinaja 2', 'Tinaja de hidromasaje con agua caliente', 40000, 35000, 'disponible'),
        (3, 'Tinaja 3', 'Tinaja de hidromasaje con agua caliente', 40000, 35000, 'disponible'),
        (4, 'Tinaja 4', 'Tinaja de hidromasaje con agua caliente', 40000, 35000, 'disponible');

    PRINT '✅ 4 Tinajas creadas';
END
ELSE
    PRINT '⚠️ Las tinajas ya existen';
GO

-- ============================================
-- VISTA PARA CONSULTAR DISPONIBILIDAD DE TINAJAS
-- ============================================
IF OBJECT_ID('dbo.v_disponibilidad_tinajas', 'V') IS NOT NULL
    DROP VIEW dbo.v_disponibilidad_tinajas;
GO

CREATE VIEW dbo.v_disponibilidad_tinajas AS
SELECT
    t.id as tinaja_id,
    t.numero,
    t.nombre,
    rt.fecha_uso,
    rt.reserva_cabana_id,
    rc.cliente_nombre,
    CASE
        WHEN rt.id IS NOT NULL THEN 'reservada'
        ELSE 'disponible'
    END as estado_dia
FROM dbo.tinajas t
CROSS JOIN (
    -- Generar fechas para los próximos 90 días
    SELECT DATEADD(day, number, CAST(GETDATE() AS DATE)) as fecha
    FROM master..spt_values
    WHERE type = 'P' AND number BETWEEN 0 AND 90
) fechas
LEFT JOIN dbo.reservas_tinajas rt ON t.id = rt.tinaja_id AND fechas.fecha = rt.fecha_uso AND rt.estado = 'confirmada'
LEFT JOIN dbo.reservas_cabanas rc ON rt.reserva_cabana_id = rc.id
WHERE t.estado = 'disponible';
GO

PRINT '✅ Vista v_disponibilidad_tinajas creada';
GO

-- ============================================
-- STORED PROCEDURE: Verificar disponibilidad de tinaja en fecha
-- ============================================
IF OBJECT_ID('dbo.sp_verificar_disponibilidad_tinaja', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_verificar_disponibilidad_tinaja;
GO

CREATE PROCEDURE dbo.sp_verificar_disponibilidad_tinaja
    @tinaja_id INT,
    @fecha DATE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @reservada BIT = 0;

    IF EXISTS (
        SELECT 1
        FROM dbo.reservas_tinajas
        WHERE tinaja_id = @tinaja_id
          AND fecha_uso = @fecha
          AND estado = 'confirmada'
    )
    BEGIN
        SET @reservada = 1;
    END

    SELECT
        @tinaja_id as tinaja_id,
        @fecha as fecha,
        CASE WHEN @reservada = 1 THEN 'reservada' ELSE 'disponible' END as estado;
END
GO

PRINT '✅ Stored procedure sp_verificar_disponibilidad_tinaja creado';
GO

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
PRINT '';
PRINT '🎉 ========================================';
PRINT '   SISTEMA DE TINAJAS INSTALADO';
PRINT '========================================';
PRINT '';

SELECT 'Tinajas registradas:' as Resumen;
SELECT
    numero AS Numero,
    nombre AS Nombre,
    precio_temporada_alta AS PrecioAlta,
    precio_temporada_baja AS PrecioBaja,
    estado AS Estado
FROM dbo.tinajas
ORDER BY numero;

PRINT '';
PRINT '✅ Sistema de tinajas listo para usar!';
PRINT '💰 Precio Temporada Alta (Dic-Feb): $40.000';
PRINT '💰 Precio Temporada Baja (Mar-Nov): $35.000';
PRINT '📝 Personas Extra: $20.000 adicional por persona sobre capacidad';
GO
