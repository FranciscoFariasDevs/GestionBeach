-- ================================================
-- SISTEMA DE PERMISOS GRANULARES POR MÓDULO
-- ================================================
-- Este script crea un sistema de permisos que permite:
-- - Asignar sucursales específicas por módulo a cada perfil
-- - Control granular de acceso a diferentes módulos
-- - Gestión flexible de permisos

USE GestionBeach;
GO

PRINT '🚀 === INICIANDO CONFIGURACIÓN DE PERMISOS MODULARES ===';

-- ================================================
-- 1. CREAR TABLA PERFIL_MODULO_SUCURSAL
-- ================================================
PRINT '📋 Paso 1: Creando tabla perfil_modulo_sucursal...';

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='perfil_modulo_sucursal' AND xtype='U')
BEGIN
    CREATE TABLE perfil_modulo_sucursal (
        id INT IDENTITY(1,1) PRIMARY KEY,
        perfil_id INT NOT NULL,
        modulo_id INT NOT NULL,
        sucursal_id INT NOT NULL,
        puede_leer BIT DEFAULT 1,
        puede_escribir BIT DEFAULT 0,
        puede_exportar BIT DEFAULT 0,
        fecha_creacion DATETIME DEFAULT GETDATE(),
        fecha_modificacion DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_PMS_Perfil FOREIGN KEY (perfil_id) REFERENCES perfiles(id) ON DELETE CASCADE,
        CONSTRAINT FK_PMS_Modulo FOREIGN KEY (modulo_id) REFERENCES modulos(id) ON DELETE CASCADE,
        CONSTRAINT FK_PMS_Sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE CASCADE,
        CONSTRAINT UQ_Perfil_Modulo_Sucursal UNIQUE (perfil_id, modulo_id, sucursal_id)
    );
    PRINT '  ✅ Tabla perfil_modulo_sucursal creada exitosamente';
END
ELSE
BEGIN
    PRINT '  ⚠️ Tabla perfil_modulo_sucursal ya existe, verificando estructura...';

    -- Agregar columnas si no existen
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('perfil_modulo_sucursal') AND name = 'puede_leer')
    BEGIN
        ALTER TABLE perfil_modulo_sucursal ADD puede_leer BIT DEFAULT 1;
        PRINT '  ✅ Columna puede_leer agregada';
    END

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('perfil_modulo_sucursal') AND name = 'puede_escribir')
    BEGIN
        ALTER TABLE perfil_modulo_sucursal ADD puede_escribir BIT DEFAULT 0;
        PRINT '  ✅ Columna puede_escribir agregada';
    END

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('perfil_modulo_sucursal') AND name = 'puede_exportar')
    BEGIN
        ALTER TABLE perfil_modulo_sucursal ADD puede_exportar BIT DEFAULT 0;
        PRINT '  ✅ Columna puede_exportar agregada';
    END
END
GO

-- ================================================
-- 2. CREAR ÍNDICES PARA OPTIMIZAR CONSULTAS
-- ================================================
PRINT '🔍 Paso 2: Creando índices optimizados...';

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PMS_Perfil_Modulo' AND object_id = OBJECT_ID('perfil_modulo_sucursal'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PMS_Perfil_Modulo
    ON perfil_modulo_sucursal (perfil_id, modulo_id);
    PRINT '  ✅ Índice IX_PMS_Perfil_Modulo creado';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PMS_Sucursal' AND object_id = OBJECT_ID('perfil_modulo_sucursal'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PMS_Sucursal
    ON perfil_modulo_sucursal (sucursal_id);
    PRINT '  ✅ Índice IX_PMS_Sucursal creado';
END
GO

-- ================================================
-- 3. CREAR VISTAS ÚTILES
-- ================================================
PRINT '📊 Paso 3: Creando vistas útiles...';

-- Vista: Permisos completos por usuario
IF EXISTS (SELECT * FROM sys.views WHERE name = 'v_permisos_usuario_completos')
    DROP VIEW v_permisos_usuario_completos;
GO

CREATE VIEW v_permisos_usuario_completos AS
SELECT
    u.id as usuario_id,
    u.nombre as usuario_nombre,
    u.email as usuario_email,
    p.id as perfil_id,
    p.nombre as perfil_nombre,
    m.id as modulo_id,
    m.nombre as modulo_nombre,
    s.id as sucursal_id,
    s.nombre as sucursal_nombre,
    s.tipo_sucursal,
    pms.puede_leer,
    pms.puede_escribir,
    pms.puede_exportar
FROM usuarios u
    INNER JOIN perfiles p ON u.perfil_id = p.id
    INNER JOIN perfil_modulo_sucursal pms ON pms.perfil_id = p.id
    INNER JOIN modulos m ON m.id = pms.modulo_id
    INNER JOIN sucursales s ON s.id = pms.sucursal_id;
GO

PRINT '  ✅ Vista v_permisos_usuario_completos creada';

-- Vista: Resumen de permisos por perfil
IF EXISTS (SELECT * FROM sys.views WHERE name = 'v_resumen_permisos_perfil')
    DROP VIEW v_resumen_permisos_perfil;
GO

CREATE VIEW v_resumen_permisos_perfil AS
SELECT
    p.id as perfil_id,
    p.nombre as perfil_nombre,
    m.id as modulo_id,
    m.nombre as modulo_nombre,
    COUNT(pms.sucursal_id) as total_sucursales,
    SUM(CASE WHEN pms.puede_leer = 1 THEN 1 ELSE 0 END) as con_lectura,
    SUM(CASE WHEN pms.puede_escribir = 1 THEN 1 ELSE 0 END) as con_escritura,
    SUM(CASE WHEN pms.puede_exportar = 1 THEN 1 ELSE 0 END) as con_exportacion
FROM perfiles p
    INNER JOIN perfil_modulo_sucursal pms ON pms.perfil_id = p.id
    INNER JOIN modulos m ON m.id = pms.modulo_id
GROUP BY p.id, p.nombre, m.id, m.nombre;
GO

PRINT '  ✅ Vista v_resumen_permisos_perfil creada';

-- ================================================
-- 4. CREAR PROCEDIMIENTOS ALMACENADOS
-- ================================================
PRINT '🔧 Paso 4: Creando procedimientos almacenados...';

-- SP: Verificar si un usuario tiene acceso a una sucursal en un módulo
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_verificar_permiso_usuario')
    DROP PROCEDURE sp_verificar_permiso_usuario;
GO

CREATE PROCEDURE sp_verificar_permiso_usuario
    @usuario_id INT,
    @modulo_nombre VARCHAR(100),
    @sucursal_id INT,
    @tipo_permiso VARCHAR(20) = 'leer' -- 'leer', 'escribir', 'exportar'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @tiene_permiso BIT = 0;

    SELECT @tiene_permiso =
        CASE @tipo_permiso
            WHEN 'leer' THEN pms.puede_leer
            WHEN 'escribir' THEN pms.puede_escribir
            WHEN 'exportar' THEN pms.puede_exportar
            ELSE 0
        END
    FROM usuarios u
        INNER JOIN perfiles p ON u.perfil_id = p.id
        INNER JOIN perfil_modulo_sucursal pms ON pms.perfil_id = p.id
        INNER JOIN modulos m ON m.id = pms.modulo_id
    WHERE u.id = @usuario_id
        AND m.nombre = @modulo_nombre
        AND pms.sucursal_id = @sucursal_id;

    SELECT ISNULL(@tiene_permiso, 0) as tiene_permiso;
END;
GO

PRINT '  ✅ Procedimiento sp_verificar_permiso_usuario creado';

-- SP: Obtener todas las sucursales permitidas para un usuario en un módulo
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_obtener_sucursales_permitidas')
    DROP PROCEDURE sp_obtener_sucursales_permitidas;
GO

CREATE PROCEDURE sp_obtener_sucursales_permitidas
    @usuario_id INT,
    @modulo_nombre VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DISTINCT
        s.id,
        s.nombre,
        s.tipo_sucursal,
        s.direccion,
        pms.puede_leer,
        pms.puede_escribir,
        pms.puede_exportar
    FROM usuarios u
        INNER JOIN perfiles p ON u.perfil_id = p.id
        INNER JOIN perfil_modulo_sucursal pms ON pms.perfil_id = p.id
        INNER JOIN modulos m ON m.id = pms.modulo_id
        INNER JOIN sucursales s ON s.id = pms.sucursal_id
    WHERE u.id = @usuario_id
        AND m.nombre = @modulo_nombre
        AND pms.puede_leer = 1
    ORDER BY s.nombre;
END;
GO

PRINT '  ✅ Procedimiento sp_obtener_sucursales_permitidas creado';

-- SP: Asignar permisos masivos a un perfil para un módulo
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_asignar_permisos_masivos')
    DROP PROCEDURE sp_asignar_permisos_masivos;
GO

CREATE PROCEDURE sp_asignar_permisos_masivos
    @perfil_id INT,
    @modulo_id INT,
    @sucursales_ids VARCHAR(MAX), -- IDs separados por comas: "1,2,3,4"
    @puede_leer BIT = 1,
    @puede_escribir BIT = 0,
    @puede_exportar BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Primero, eliminar permisos existentes para este perfil/módulo
        DELETE FROM perfil_modulo_sucursal
        WHERE perfil_id = @perfil_id AND modulo_id = @modulo_id;

        -- Insertar nuevos permisos
        INSERT INTO perfil_modulo_sucursal (perfil_id, modulo_id, sucursal_id, puede_leer, puede_escribir, puede_exportar)
        SELECT
            @perfil_id,
            @modulo_id,
            value,
            @puede_leer,
            @puede_escribir,
            @puede_exportar
        FROM STRING_SPLIT(@sucursales_ids, ',')
        WHERE value <> '';

        COMMIT TRANSACTION;

        SELECT 1 as success, 'Permisos asignados correctamente' as message;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        SELECT 0 as success, ERROR_MESSAGE() as message;
    END CATCH
END;
GO

PRINT '  ✅ Procedimiento sp_asignar_permisos_masivos creado';

-- ================================================
-- 5. CREAR TRIGGER PARA AUDITORÍA
-- ================================================
PRINT '📝 Paso 5: Creando trigger de auditoría...';

IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_perfil_modulo_sucursal_audit')
    DROP TRIGGER trg_perfil_modulo_sucursal_audit;
GO

CREATE TRIGGER trg_perfil_modulo_sucursal_audit
ON perfil_modulo_sucursal
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE perfil_modulo_sucursal
    SET fecha_modificacion = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
END;
GO

PRINT '  ✅ Trigger de auditoría creado';

-- ================================================
-- 6. DATOS DE EJEMPLO (OPCIONAL)
-- ================================================
PRINT '📦 Paso 6: Verificando datos base...';

-- Verificar que existe el perfil de Administrador
IF NOT EXISTS (SELECT * FROM perfiles WHERE nombre = 'Administrador')
BEGIN
    INSERT INTO perfiles (nombre, descripcion) VALUES ('Administrador', 'Perfil con acceso completo al sistema');
    PRINT '  ✅ Perfil Administrador creado';
END

-- Verificar que existe el perfil de Jefe de Local
IF NOT EXISTS (SELECT * FROM perfiles WHERE nombre = 'Jefe de Local')
BEGIN
    INSERT INTO perfiles (nombre, descripcion) VALUES ('Jefe de Local', 'Perfil para jefes de sucursal con acceso limitado');
    PRINT '  ✅ Perfil Jefe de Local creado';
END

-- ================================================
-- 7. RESUMEN Y VERIFICACIÓN
-- ================================================
PRINT '';
PRINT '✅ === CONFIGURACIÓN COMPLETADA ===';
PRINT '';
PRINT '📊 RESUMEN:';
PRINT '   - Tabla perfil_modulo_sucursal: ✓';
PRINT '   - Índices optimizados: ✓';
PRINT '   - Vistas de consulta: ✓';
PRINT '   - Procedimientos almacenados: ✓';
PRINT '   - Triggers de auditoría: ✓';
PRINT '';

-- Mostrar estadísticas
DECLARE @total_perfiles INT, @total_modulos INT, @total_sucursales INT, @total_permisos INT;

SELECT @total_perfiles = COUNT(*) FROM perfiles;
SELECT @total_modulos = COUNT(*) FROM modulos;
SELECT @total_sucursales = COUNT(*) FROM sucursales;
SELECT @total_permisos = COUNT(*) FROM perfil_modulo_sucursal;

PRINT '📈 ESTADÍSTICAS:';
PRINT '   - Perfiles configurados: ' + CAST(@total_perfiles AS VARCHAR);
PRINT '   - Módulos disponibles: ' + CAST(@total_modulos AS VARCHAR);
PRINT '   - Sucursales totales: ' + CAST(@total_sucursales AS VARCHAR);
PRINT '   - Permisos granulares: ' + CAST(@total_permisos AS VARCHAR);
PRINT '';
PRINT '🎉 Sistema de permisos modulares listo para usar!';
PRINT '';

GO
