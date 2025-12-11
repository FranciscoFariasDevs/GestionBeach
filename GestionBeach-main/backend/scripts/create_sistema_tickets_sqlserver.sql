-- ============================================
-- SISTEMA DE TICKETS - SQL SERVER
-- ============================================

-- Tabla principal de tickets
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='tickets' AND xtype='U')
BEGIN
    CREATE TABLE tickets (
        id INT IDENTITY(1,1) PRIMARY KEY,

        -- Información del ticket
        numero_ticket VARCHAR(20) NOT NULL UNIQUE,
        asunto VARCHAR(255) NOT NULL,
        mensaje NVARCHAR(MAX) NOT NULL,

        -- Información del usuario reportante
        usuario_id INT NULL,
        nombre_reportante VARCHAR(100) NOT NULL,
        email_reportante VARCHAR(100) NOT NULL,
        telefono_reportante VARCHAR(20) NULL,
        sucursal_id INT NULL,
        departamento VARCHAR(100) NULL,

        -- Estado y prioridad
        estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'en_proceso', 'resuelto', 'cancelado', 'vencido')),
        prioridad VARCHAR(20) DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')),

        -- Asignación
        asignado_a INT NULL,
        categoria VARCHAR(50) NULL,

        -- Fechas y tiempos
        fecha_creacion DATETIME DEFAULT GETDATE(),
        fecha_actualizacion DATETIME DEFAULT GETDATE(),
        fecha_vencimiento DATETIME NULL,
        fecha_resolucion DATETIME NULL,
        tiempo_respuesta_minutos INT NULL,
        tiempo_resolucion_minutos INT NULL,

        -- Metadata
        ip_origen VARCHAR(45) NULL,
        user_agent NVARCHAR(MAX) NULL,
        archivos_adjuntos NVARCHAR(MAX) NULL,

        -- Relaciones (sin ON DELETE CASCADE para evitar ciclos)
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
        FOREIGN KEY (asignado_a) REFERENCES usuarios(id),
        FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
    );

    -- Índices
    CREATE INDEX idx_tickets_estado ON tickets(estado);
    CREATE INDEX idx_tickets_usuario ON tickets(usuario_id);
    CREATE INDEX idx_tickets_asignado ON tickets(asignado_a);
    CREATE INDEX idx_tickets_fecha_creacion ON tickets(fecha_creacion);
    CREATE INDEX idx_tickets_numero_ticket ON tickets(numero_ticket);
    CREATE INDEX idx_tickets_prioridad ON tickets(prioridad);
    CREATE INDEX idx_tickets_sucursal ON tickets(sucursal_id);

    PRINT 'Tabla tickets creada exitosamente';
END
GO

-- Tabla de respuestas/comentarios de tickets
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ticket_respuestas' AND xtype='U')
BEGIN
    CREATE TABLE ticket_respuestas (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ticket_id INT NOT NULL,
        usuario_id INT NULL,
        nombre_usuario VARCHAR(100) NOT NULL,
        mensaje NVARCHAR(MAX) NOT NULL,
        es_interno BIT DEFAULT 0,
        archivos_adjuntos NVARCHAR(MAX) NULL,
        fecha_creacion DATETIME DEFAULT GETDATE(),

        FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE INDEX idx_ticket_respuestas_ticket ON ticket_respuestas(ticket_id);
    CREATE INDEX idx_ticket_respuestas_usuario ON ticket_respuestas(usuario_id);
    CREATE INDEX idx_ticket_respuestas_fecha ON ticket_respuestas(fecha_creacion);

    PRINT 'Tabla ticket_respuestas creada exitosamente';
END
GO

-- Tabla de historial de cambios de tickets
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ticket_historial' AND xtype='U')
BEGIN
    CREATE TABLE ticket_historial (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ticket_id INT NOT NULL,
        usuario_id INT NULL,
        accion VARCHAR(50) NOT NULL,
        valor_anterior VARCHAR(255) NULL,
        valor_nuevo VARCHAR(255) NULL,
        descripcion NVARCHAR(MAX) NULL,
        fecha_cambio DATETIME DEFAULT GETDATE(),

        FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE INDEX idx_ticket_historial_ticket ON ticket_historial(ticket_id);
    CREATE INDEX idx_ticket_historial_fecha ON ticket_historial(fecha_cambio);

    PRINT 'Tabla ticket_historial creada exitosamente';
END
GO

-- Tabla de categorías de tickets
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ticket_categorias' AND xtype='U')
BEGIN
    CREATE TABLE ticket_categorias (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        descripcion NVARCHAR(MAX) NULL,
        color VARCHAR(7) DEFAULT '#666666',
        icono VARCHAR(50) NULL,
        sla_horas INT DEFAULT 24,
        activo BIT DEFAULT 1,
        orden INT DEFAULT 0,
        fecha_creacion DATETIME DEFAULT GETDATE()
    );

    PRINT 'Tabla ticket_categorias creada exitosamente';
END
GO

-- Insertar categorías predeterminadas
IF NOT EXISTS (SELECT * FROM ticket_categorias)
BEGIN
    INSERT INTO ticket_categorias (nombre, descripcion, color, icono, sla_horas, orden) VALUES
    ('Técnico', 'Problemas técnicos del sistema', '#2196F3', 'BugReport', 4, 1),
    ('Permisos', 'Solicitudes de acceso o permisos', '#9C27B0', 'Lock', 2, 2),
    ('Bug', 'Errores o fallos en el sistema', '#F44336', 'Error', 1, 3),
    ('Consulta', 'Consultas generales', '#4CAF50', 'Help', 24, 4),
    ('Mejora', 'Sugerencias de mejora', '#FF9800', 'TrendingUp', 72, 5),
    ('Urgente', 'Problemas críticos urgentes', '#D32F2F', 'Warning', 1, 6);

    PRINT 'Categorías predeterminadas insertadas';
END
GO

-- Tabla de notificaciones de tickets
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ticket_notificaciones' AND xtype='U')
BEGIN
    CREATE TABLE ticket_notificaciones (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ticket_id INT NOT NULL,
        usuario_id INT NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        mensaje NVARCHAR(MAX) NOT NULL,
        leida BIT DEFAULT 0,
        fecha_creacion DATETIME DEFAULT GETDATE(),
        fecha_lectura DATETIME NULL,

        FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE INDEX idx_ticket_notif_usuario_leida ON ticket_notificaciones(usuario_id, leida);
    CREATE INDEX idx_ticket_notif_ticket ON ticket_notificaciones(ticket_id);
    CREATE INDEX idx_ticket_notif_fecha ON ticket_notificaciones(fecha_creacion);

    PRINT 'Tabla ticket_notificaciones creada exitosamente';
END
GO

-- Tabla de plantillas de respuestas rápidas
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ticket_plantillas_respuesta' AND xtype='U')
BEGIN
    CREATE TABLE ticket_plantillas_respuesta (
        id INT IDENTITY(1,1) PRIMARY KEY,
        titulo VARCHAR(255) NOT NULL,
        contenido NVARCHAR(MAX) NOT NULL,
        categoria VARCHAR(50) NULL,
        uso_count INT DEFAULT 0,
        activo BIT DEFAULT 1,
        creado_por INT NULL,
        fecha_creacion DATETIME DEFAULT GETDATE(),

        FOREIGN KEY (creado_por) REFERENCES usuarios(id)
    );

    CREATE INDEX idx_plantillas_categoria ON ticket_plantillas_respuesta(categoria);

    PRINT 'Tabla ticket_plantillas_respuesta creada exitosamente';
END
GO

-- Insertar plantillas de respuesta predeterminadas
IF NOT EXISTS (SELECT * FROM ticket_plantillas_respuesta)
BEGIN
    INSERT INTO ticket_plantillas_respuesta (titulo, contenido, categoria) VALUES
    ('Ticket recibido', 'Hemos recibido tu ticket y será atendido a la brevedad. Un miembro del equipo de soporte se pondrá en contacto contigo pronto.', 'general'),
    ('Solución encontrada', 'El problema ha sido resuelto. Por favor, verifica que todo funcione correctamente y confirma la resolución.', 'general'),
    ('Información adicional requerida', 'Para poder ayudarte mejor, necesitamos información adicional. Por favor, proporciona más detalles sobre el problema.', 'general'),
    ('Ticket cerrado', 'Este ticket ha sido marcado como resuelto. Si el problema persiste, no dudes en reabrir el ticket o crear uno nuevo.', 'general');

    PRINT 'Plantillas de respuesta predeterminadas insertadas';
END
GO

-- Vista para estadísticas de tickets
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vista_estadisticas_tickets')
    DROP VIEW vista_estadisticas_tickets;
GO

CREATE VIEW vista_estadisticas_tickets AS
SELECT
    COUNT(*) as total_tickets,
    SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as activos,
    SUM(CASE WHEN estado = 'en_proceso' THEN 1 ELSE 0 END) as en_proceso,
    SUM(CASE WHEN estado = 'resuelto' THEN 1 ELSE 0 END) as resueltos,
    SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) as cancelados,
    SUM(CASE WHEN estado = 'vencido' THEN 1 ELSE 0 END) as vencidos,
    SUM(CASE WHEN prioridad = 'critica' THEN 1 ELSE 0 END) as criticos,
    SUM(CASE WHEN prioridad = 'alta' THEN 1 ELSE 0 END) as alta_prioridad,
    AVG(CAST(tiempo_resolucion_minutos AS FLOAT)) as tiempo_promedio_resolucion,
    AVG(CAST(tiempo_respuesta_minutos AS FLOAT)) as tiempo_promedio_respuesta
FROM tickets
WHERE fecha_creacion >= DATEADD(DAY, -30, GETDATE());
GO

PRINT 'Vista vista_estadisticas_tickets creada';
GO

-- Vista para tickets por usuario
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vista_tickets_por_usuario')
    DROP VIEW vista_tickets_por_usuario;
GO

CREATE VIEW vista_tickets_por_usuario AS
SELECT
    u.id as usuario_id,
    u.nombre as usuario_nombre,
    u.email as usuario_email,
    COUNT(t.id) as total_tickets,
    SUM(CASE WHEN t.estado = 'activo' THEN 1 ELSE 0 END) as tickets_activos,
    SUM(CASE WHEN t.estado = 'resuelto' THEN 1 ELSE 0 END) as tickets_resueltos,
    AVG(CAST(t.tiempo_resolucion_minutos AS FLOAT)) as tiempo_promedio_resolucion
FROM usuarios u
LEFT JOIN tickets t ON u.id = t.usuario_id
GROUP BY u.id, u.nombre, u.email;
GO

PRINT 'Vista vista_tickets_por_usuario creada';
GO

-- Procedimiento almacenado para generar número de ticket
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'generar_numero_ticket')
    DROP PROCEDURE generar_numero_ticket;
GO

CREATE PROCEDURE generar_numero_ticket
    @nuevo_numero VARCHAR(20) OUTPUT
AS
BEGIN
    DECLARE @ultimo_numero INT;
    DECLARE @anio_actual CHAR(4);

    SET @anio_actual = CAST(YEAR(GETDATE()) AS CHAR(4));

    SELECT @ultimo_numero = ISNULL(MAX(CAST(RIGHT(numero_ticket, 5) AS INT)), 0)
    FROM tickets
    WHERE numero_ticket LIKE 'TKT-' + @anio_actual + '-%';

    SET @ultimo_numero = @ultimo_numero + 1;
    SET @nuevo_numero = 'TKT-' + @anio_actual + '-' + RIGHT('00000' + CAST(@ultimo_numero AS VARCHAR(5)), 5);
END
GO

PRINT 'Procedimiento generar_numero_ticket creado';
GO

-- Procedimiento para marcar tickets vencidos
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'marcar_tickets_vencidos')
    DROP PROCEDURE marcar_tickets_vencidos;
GO

CREATE PROCEDURE marcar_tickets_vencidos
AS
BEGIN
    UPDATE tickets
    SET estado = 'vencido'
    WHERE estado IN ('activo', 'en_proceso')
      AND fecha_vencimiento IS NOT NULL
      AND fecha_vencimiento < GETDATE();

    PRINT 'Tickets vencidos actualizados';
END
GO

PRINT 'Procedimiento marcar_tickets_vencidos creado';
GO

-- Trigger para actualizar fecha_actualizacion
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_tickets_update')
    DROP TRIGGER trg_tickets_update;
GO

CREATE TRIGGER trg_tickets_update
ON tickets
AFTER UPDATE
AS
BEGIN
    UPDATE tickets
    SET fecha_actualizacion = GETDATE()
    FROM tickets t
    INNER JOIN inserted i ON t.id = i.id;
END
GO

PRINT 'Trigger trg_tickets_update creado';
GO

-- ============================================
PRINT '✅ Sistema de tickets creado exitosamente en SQL Server';
PRINT '📊 Tablas: tickets, ticket_respuestas, ticket_historial, ticket_categorias, ticket_notificaciones, ticket_plantillas_respuesta';
PRINT '👁️ Vistas: vista_estadisticas_tickets, vista_tickets_por_usuario';
PRINT '⚙️ Procedimientos: generar_numero_ticket, marcar_tickets_vencidos';
