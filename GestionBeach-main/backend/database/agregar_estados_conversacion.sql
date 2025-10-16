-- backend/database/agregar_estados_conversacion.sql
-- Tabla para guardar el estado de cada conversación

USE GestionBeach;
GO

-- Crear tabla de estados de conversación
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'estados_conversacion_whatsapp')
BEGIN
  CREATE TABLE dbo.estados_conversacion_whatsapp (
    id INT IDENTITY(1,1) PRIMARY KEY,
    telefono_cliente VARCHAR(20) NOT NULL,
    estado_actual VARCHAR(50) NOT NULL, -- 'inicial', 'eligiendo_cabana', 'ingresando_fecha_inicio', etc.
    datos_temporales TEXT, -- JSON con datos recopilados
    ultima_actualizacion DATETIME DEFAULT GETDATE(),
    fecha_creacion DATETIME DEFAULT GETDATE(),
    CONSTRAINT UQ_telefono_cliente UNIQUE (telefono_cliente)
  );

  PRINT '✅ Tabla estados_conversacion_whatsapp creada';
END
ELSE
BEGIN
  PRINT '⚠️ Tabla estados_conversacion_whatsapp ya existe';
END
GO

-- Índice para búsquedas rápidas
CREATE INDEX IX_telefono_cliente ON dbo.estados_conversacion_whatsapp(telefono_cliente);
GO

PRINT '✅ Estados de conversación configurados correctamente';
GO
