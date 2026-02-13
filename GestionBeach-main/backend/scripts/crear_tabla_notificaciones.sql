-- Script para crear tabla de notificaciones de tickets
-- Ejecutar en SQL Server Management Studio

-- Crear tabla de notificaciones
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ticket_notificaciones' AND xtype='U')
BEGIN
    CREATE TABLE ticket_notificaciones (
        id INT IDENTITY(1,1) PRIMARY KEY,
        usuario_id INT NOT NULL,                    -- Usuario que recibe la notificación
        ticket_id INT NOT NULL,                     -- Ticket relacionado
        tipo VARCHAR(50) NOT NULL,                  -- 'nuevo_ticket', 'respuesta', 'resuelto', 'asignado'
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

    PRINT 'Tabla ticket_notificaciones creada exitosamente';
END
ELSE
BEGIN
    PRINT 'Tabla ticket_notificaciones ya existe';
END
GO
