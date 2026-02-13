-- Script para agregar soporte de imágenes a tickets
-- Ejecutar en SQL Server Management Studio

-- Agregar campo imagen_url a la tabla tickets
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tickets') AND name = 'imagen_url')
BEGIN
    ALTER TABLE tickets ADD imagen_url VARCHAR(500) NULL;
    PRINT 'Campo imagen_url agregado a tickets';
END
ELSE
BEGIN
    PRINT 'Campo imagen_url ya existe en tickets';
END
GO

-- Crear tabla para múltiples adjuntos (opcional, para futuro)
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

    PRINT 'Tabla ticket_adjuntos creada exitosamente';
END
ELSE
BEGIN
    PRINT 'Tabla ticket_adjuntos ya existe';
END
GO
