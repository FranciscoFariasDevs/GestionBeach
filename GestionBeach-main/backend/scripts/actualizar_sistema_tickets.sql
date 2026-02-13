-- ==============================================
-- SCRIPT CONSOLIDADO PARA ACTUALIZAR SISTEMA DE TICKETS
-- Ejecutar en SQL Server Management Studio
-- Fecha: 2026-02-07
-- ==============================================

PRINT '=== INICIANDO ACTUALIZACIÓN DEL SISTEMA DE TICKETS ===';
PRINT '';

-- ==============================================
-- 1. CREAR TABLA DE NOTIFICACIONES
-- ==============================================
PRINT '1. Verificando tabla ticket_notificaciones...';

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ticket_notificaciones' AND xtype='U')
BEGIN
    CREATE TABLE ticket_notificaciones (
        id INT IDENTITY(1,1) PRIMARY KEY,
        usuario_id INT NOT NULL,
        ticket_id INT NOT NULL,
        tipo VARCHAR(50) NOT NULL,  -- 'nuevo_ticket', 'respuesta', 'resuelto', 'asignado', 'estado_cambiado'
        titulo VARCHAR(255) NOT NULL,
        mensaje NVARCHAR(MAX),
        leida BIT DEFAULT 0,
        fecha_creacion DATETIME DEFAULT GETDATE(),
        fecha_lectura DATETIME NULL,

        FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
        FOREIGN KEY (ticket_id) REFERENCES tickets(id)
    );

    CREATE INDEX IX_notificaciones_usuario ON ticket_notificaciones(usuario_id, leida);
    CREATE INDEX IX_notificaciones_fecha ON ticket_notificaciones(fecha_creacion DESC);

    PRINT '   ✓ Tabla ticket_notificaciones CREADA';
END
ELSE
BEGIN
    PRINT '   - Tabla ticket_notificaciones ya existe';
END
GO

-- ==============================================
-- 2. AGREGAR CAMPO IMAGEN_URL A TICKETS
-- ==============================================
PRINT '';
PRINT '2. Verificando campo imagen_url en tickets...';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tickets') AND name = 'imagen_url')
BEGIN
    ALTER TABLE tickets ADD imagen_url VARCHAR(500) NULL;
    PRINT '   ✓ Campo imagen_url AGREGADO a tickets';
END
ELSE
BEGIN
    PRINT '   - Campo imagen_url ya existe';
END
GO

-- ==============================================
-- 3. CREAR TABLA DE ADJUNTOS (OPCIONAL, PARA MÚLTIPLES IMÁGENES)
-- ==============================================
PRINT '';
PRINT '3. Verificando tabla ticket_adjuntos...';

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ticket_adjuntos' AND xtype='U')
BEGIN
    CREATE TABLE ticket_adjuntos (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ticket_id INT NOT NULL,
        nombre_archivo VARCHAR(255) NOT NULL,
        ruta_archivo VARCHAR(500) NOT NULL,
        tipo_archivo VARCHAR(100),
        tamaño_bytes INT,
        subido_por INT,
        fecha_subida DATETIME DEFAULT GETDATE(),

        FOREIGN KEY (ticket_id) REFERENCES tickets(id),
        FOREIGN KEY (subido_por) REFERENCES usuarios(id)
    );

    CREATE INDEX IX_adjuntos_ticket ON ticket_adjuntos(ticket_id);

    PRINT '   ✓ Tabla ticket_adjuntos CREADA';
END
ELSE
BEGIN
    PRINT '   - Tabla ticket_adjuntos ya existe';
END
GO

-- ==============================================
-- 4. AGREGAR IMAGEN_URL A RESPUESTAS
-- ==============================================
PRINT '';
PRINT '4. Verificando campo imagen_url en ticket_respuestas...';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ticket_respuestas') AND name = 'imagen_url')
BEGIN
    ALTER TABLE ticket_respuestas ADD imagen_url VARCHAR(500) NULL;
    PRINT '   ✓ Campo imagen_url AGREGADO a ticket_respuestas';
END
ELSE
BEGIN
    PRINT '   - Campo imagen_url ya existe en ticket_respuestas';
END
GO

-- ==============================================
-- 5. VERIFICAR PERFILES DE SUPERADMINS
-- ==============================================
PRINT '';
PRINT '4. Verificando perfiles SuperAdmin...';

SELECT
    u.id,
    u.username,
    u.perfil_id,
    p.nombre as perfil_nombre
FROM usuarios u
LEFT JOIN perfiles p ON u.perfil_id = p.id
WHERE u.perfil_id = 1 OR p.nombre LIKE '%SuperAdmin%' OR p.nombre LIKE '%Administrador%';

PRINT '';
PRINT '=== ACTUALIZACIÓN COMPLETADA ===';
PRINT '';
PRINT 'IMPORTANTE: Los usuarios deberán cerrar sesión y volver a iniciar';
PRINT 'para que el token JWT incluya el nombre del perfil.';
GO
