-- =======================================================
-- MÓDULO DE COTIZACIONES - GestionBeach
-- Ejecutar este script en la BD GestionBeach antes de
-- activar el módulo en el sistema.
-- =======================================================

-- Tabla principal de cotizaciones
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='cotizaciones' AND xtype='U')
BEGIN
  CREATE TABLE cotizaciones (
    id                  INT           PRIMARY KEY IDENTITY(1,1),
    asunto              NVARCHAR(200) NOT NULL,
    descripcion         NVARCHAR(MAX),
    estado              NVARCHAR(20)  NOT NULL DEFAULT 'pendiente', -- pendiente | aprobada | rechazada
    motivo_rechazo      NVARCHAR(MAX),
    creado_por          INT           NOT NULL,
    creado_por_nombre   NVARCHAR(100),
    sucursal_nombre     NVARCHAR(100),
    aprobado_por        INT,
    aprobado_por_nombre NVARCHAR(100),
    fecha_creacion      DATETIME      NOT NULL DEFAULT GETDATE(),
    fecha_respuesta     DATETIME,
    total               DECIMAL(18,2) NOT NULL DEFAULT 0
  );
  PRINT 'Tabla cotizaciones creada';
END
ELSE
  PRINT 'Tabla cotizaciones ya existe';

-- Tabla de ítems de cada cotización
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='cotizacion_items' AND xtype='U')
BEGIN
  CREATE TABLE cotizacion_items (
    id              INT           PRIMARY KEY IDENTITY(1,1),
    cotizacion_id   INT           NOT NULL,
    producto        NVARCHAR(200) NOT NULL,
    foto_url        NVARCHAR(500),
    link            NVARCHAR(500),
    cantidad        INT           NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(18,2) NOT NULL DEFAULT 0,
    subtotal        DECIMAL(18,2) NOT NULL DEFAULT 0,
    CONSTRAINT FK_cotizacion_items_cotizaciones
      FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id)
  );
  PRINT 'Tabla cotizacion_items creada';
END
ELSE
  PRINT 'Tabla cotizacion_items ya existe';

-- Registrar el módulo en la tabla de módulos del sistema
IF NOT EXISTS (SELECT * FROM modulos WHERE nombre = 'Cotizaciones')
BEGIN
  INSERT INTO modulos (nombre, descripcion, ruta, icono)
  VALUES ('Cotizaciones', 'Gestión de cotizaciones y aprobaciones', '/cotizaciones', 'receipt_long');
  PRINT 'Módulo Cotizaciones registrado';
END
ELSE
  PRINT 'Módulo Cotizaciones ya registrado';

PRINT '=== Script completado ===';
