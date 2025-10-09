-- Script de creación de tablas para Concurso de Piscinas
-- Base de datos: Beachsql
-- Compatible con SQL Server 2012

USE Beachsql;
GO

-- Tabla principal de participaciones
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[participaciones_concurso]') AND type in (N'U'))
BEGIN
    CREATE TABLE participaciones_concurso (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nombres VARCHAR(100) NOT NULL,
        apellidos VARCHAR(100) NOT NULL,
        rut VARCHAR(20) NOT NULL,
        email VARCHAR(100) NOT NULL,
        telefono VARCHAR(20) NOT NULL,
        direccion VARCHAR(255) NOT NULL,

        numero_boleta VARCHAR(50) NOT NULL,
        monto_boleta DECIMAL(18,2) NULL,
        fecha_boleta DATETIME NULL,
        tipo_documento VARCHAR(50) NULL,
        tipo_sucursal VARCHAR(50) NOT NULL DEFAULT 'Supermercado',
        sucursal VARCHAR(100) NULL,

        ruta_imagen VARCHAR(500) NOT NULL,
        nombre_archivo VARCHAR(255) NOT NULL,

        texto_extraido TEXT NULL,
        confianza_ocr DECIMAL(5,2) NULL,

        boleta_valida BIT NOT NULL DEFAULT 1,
        estado VARCHAR(20) NOT NULL DEFAULT 'activo',
        ganador BIT NOT NULL DEFAULT 0,
        premio VARCHAR(100) NULL,

        fecha_participacion DATETIME NOT NULL DEFAULT GETDATE(),
        fecha_modificacion DATETIME NULL
    );

    PRINT '✅ Tabla participaciones_concurso creada';
END
ELSE
BEGIN
    PRINT '⚠️ Tabla participaciones_concurso ya existe';

    -- Agregar columna sucursal si no existe
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[participaciones_concurso]') AND name = 'sucursal')
    BEGIN
        ALTER TABLE dbo.participaciones_concurso ADD sucursal VARCHAR(100) NULL;
        PRINT '✅ Columna sucursal agregada a participaciones_concurso';
    END
    ELSE
    BEGIN
        PRINT '⚠️ Columna sucursal ya existe en participaciones_concurso';
    END
END
GO

-- Crear índices para participaciones_concurso (compatible con SQL Server 2012)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_numero_boleta' AND object_id = OBJECT_ID('participaciones_concurso'))
BEGIN
    CREATE INDEX IX_numero_boleta ON participaciones_concurso(numero_boleta);
    PRINT '✅ Índice IX_numero_boleta creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_rut' AND object_id = OBJECT_ID('participaciones_concurso'))
BEGIN
    CREATE INDEX IX_rut ON participaciones_concurso(rut);
    PRINT '✅ Índice IX_rut creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_email' AND object_id = OBJECT_ID('participaciones_concurso'))
BEGIN
    CREATE INDEX IX_email ON participaciones_concurso(email);
    PRINT '✅ Índice IX_email creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_fecha_participacion' AND object_id = OBJECT_ID('participaciones_concurso'))
BEGIN
    CREATE INDEX IX_fecha_participacion ON participaciones_concurso(fecha_participacion);
    PRINT '✅ Índice IX_fecha_participacion creado';
END
GO

-- Tabla de log de intentos fallidos/rechazados
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[concurso_log_intentos]') AND type in (N'U'))
BEGIN
    CREATE TABLE concurso_log_intentos (
        id INT IDENTITY(1,1) PRIMARY KEY,
        numero_boleta VARCHAR(50) NOT NULL,
        email VARCHAR(100) NULL,
        motivo_rechazo VARCHAR(255) NOT NULL,
        fecha_intento DATETIME NOT NULL DEFAULT GETDATE()
    );

    PRINT '✅ Tabla concurso_log_intentos creada';
END
ELSE
BEGIN
    PRINT '⚠️ Tabla concurso_log_intentos ya existe';
END
GO

-- Crear índices para concurso_log_intentos (compatible con SQL Server 2012)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_log_numero_boleta' AND object_id = OBJECT_ID('concurso_log_intentos'))
BEGIN
    CREATE INDEX IX_log_numero_boleta ON concurso_log_intentos(numero_boleta);
    PRINT '✅ Índice IX_log_numero_boleta creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_log_fecha_intento' AND object_id = OBJECT_ID('concurso_log_intentos'))
BEGIN
    CREATE INDEX IX_log_fecha_intento ON concurso_log_intentos(fecha_intento);
    PRINT '✅ Índice IX_log_fecha_intento creado';
END
GO

-- Procedimiento almacenado para validar boleta (OPCIONAL - no se usa actualmente)
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_ValidarBoletaConcurso]') AND type in (N'P', N'PC'))
BEGIN
    DROP PROCEDURE sp_ValidarBoletaConcurso;
    PRINT '🗑️ Procedimiento sp_ValidarBoletaConcurso eliminado (para recrear)';
END
GO

CREATE PROCEDURE sp_ValidarBoletaConcurso
    @numero_boleta VARCHAR(50),
    @tipo_sucursal VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @existe BIT = 0;
    DECLARE @folio VARCHAR(50) = NULL;
    DECLARE @total DECIMAL(18,2) = 0;
    DECLARE @fecha DATETIME = NULL;
    DECLARE @tipo_documento VARCHAR(50) = NULL;
    DECLARE @cumple_monto_minimo BIT = 0;
    DECLARE @cumple_fecha_minima BIT = 0;

    -- Fecha mínima del concurso: 08-10-2025
    DECLARE @fecha_minima DATETIME = '2025-10-08';
    DECLARE @monto_minimo DECIMAL(18,2) = 5000;

    -- Para testing, aceptar cualquier boleta
    SET @existe = 1;
    SET @folio = @numero_boleta;
    SET @total = 10000; -- Monto de prueba
    SET @fecha = GETDATE();
    SET @tipo_documento = 'Boleta';

    -- Validar monto mínimo
    IF @total >= @monto_minimo
        SET @cumple_monto_minimo = 1;

    -- Validar fecha mínima
    IF @fecha >= @fecha_minima
        SET @cumple_fecha_minima = 1;

    -- Retornar resultado
    SELECT
        @existe AS existe,
        @folio AS folio,
        @total AS total,
        @fecha AS fecha,
        @tipo_documento AS tipo_documento,
        @cumple_monto_minimo AS cumple_monto_minimo,
        @cumple_fecha_minima AS cumple_fecha_minima;
END
GO

PRINT '✅ Procedimiento sp_ValidarBoletaConcurso creado';
GO

-- Verificar creación
SELECT 'Tablas creadas' AS Status;
SELECT name AS Tabla
FROM sys.tables
WHERE name IN ('participaciones_concurso', 'concurso_log_intentos');

SELECT name AS Procedimiento
FROM sys.procedures
WHERE name = 'sp_ValidarBoletaConcurso';
GO
