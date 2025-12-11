-- Script para crear tabla de reservas pendientes (antes de confirmar Webpay)
-- Esta tabla almacena temporalmente los datos de reserva hasta que se confirme el pago

USE GestionBeach;
GO

-- Crear tabla si no existe
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='reservas_pendientes' AND xtype='U')
BEGIN
    CREATE TABLE reservas_pendientes (
        id INT IDENTITY(1,1) PRIMARY KEY,
        -- Datos de la reserva
        cabana_id INT NOT NULL,
        fecha_inicio DATE NOT NULL,
        fecha_fin DATE NOT NULL,
        cantidad_noches INT NOT NULL,
        cantidad_personas INT NOT NULL,
        personas_extra INT DEFAULT 0,
        precio_noche DECIMAL(10,2) NOT NULL,
        precio_total DECIMAL(10,2) NOT NULL,
        costo_personas_extra DECIMAL(10,2) DEFAULT 0,

        -- Datos del cliente
        cliente_nombre NVARCHAR(100) NOT NULL,
        cliente_apellido NVARCHAR(100) NOT NULL,
        cliente_telefono NVARCHAR(20) NOT NULL,
        cliente_email NVARCHAR(100) NOT NULL,
        cliente_rut NVARCHAR(20),
        procedencia NVARCHAR(100),

        -- Datos del vehículo
        tiene_auto BIT DEFAULT 0,
        matriculas_auto NVARCHAR(MAX), -- JSON array

        -- Datos de pago
        metodo_pago VARCHAR(20) DEFAULT 'webpay', -- 'webpay', 'transferencia'
        tipo_pago VARCHAR(20) DEFAULT 'completo', -- 'completo', 'mitad'
        monto_a_pagar DECIMAL(10,2) NOT NULL,

        -- Código de descuento
        codigo_descuento NVARCHAR(50),
        descuento_aplicado DECIMAL(10,2) DEFAULT 0,

        -- Tinajas (JSON)
        tinajas NVARCHAR(MAX), -- JSON array

        -- Notas
        notas NVARCHAR(MAX),

        -- Token de Webpay (para vincular)
        webpay_token NVARCHAR(200),

        -- Control de tiempo
        fecha_creacion DATETIME DEFAULT GETDATE(),
        fecha_expiracion DATETIME NOT NULL, -- 30 minutos después de crear

        -- Estado
        estado VARCHAR(20) DEFAULT 'pendiente'

        -- No agregamos FOREIGN KEY porque la tabla cabanas puede no tener la estructura esperada
    );

    PRINT 'Tabla reservas_pendientes creada exitosamente';
END
ELSE
BEGIN
    PRINT 'La tabla reservas_pendientes ya existe';
END
GO

-- Crear índice para búsqueda rápida por token
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_reservas_pendientes_token' AND object_id = OBJECT_ID('reservas_pendientes'))
BEGIN
    CREATE INDEX IX_reservas_pendientes_token ON reservas_pendientes(webpay_token);
    PRINT 'Indice IX_reservas_pendientes_token creado';
END
GO

-- Crear índice para limpieza de expiradas
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_reservas_pendientes_expiracion' AND object_id = OBJECT_ID('reservas_pendientes'))
BEGIN
    CREATE INDEX IX_reservas_pendientes_expiracion ON reservas_pendientes(fecha_expiracion, estado);
    PRINT 'Indice IX_reservas_pendientes_expiracion creado';
END
GO

PRINT 'Script completado exitosamente';
