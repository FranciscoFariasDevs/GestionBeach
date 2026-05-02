-- Tabla para tokens de Expo Push Notifications (app móvil)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='expo_push_tokens' AND xtype='U')
BEGIN
  CREATE TABLE expo_push_tokens (
    id                  INT IDENTITY(1,1) PRIMARY KEY,
    usuario_id          INT NOT NULL,
    token               VARCHAR(300) NOT NULL,
    activo              BIT NOT NULL DEFAULT 1,
    fecha_creacion      DATETIME DEFAULT GETDATE(),
    fecha_actualizacion DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_expo_push_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
  );
  CREATE INDEX IX_expo_push_tokens_usuario ON expo_push_tokens(usuario_id);
  PRINT 'Tabla expo_push_tokens creada';
END
ELSE
  PRINT 'Tabla expo_push_tokens ya existe';
