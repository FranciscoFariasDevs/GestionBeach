-- ================================================
-- SETUP: MÓDULO PANIFICACIÓN COMPRAS - PAGOS
-- ================================================
USE GestionBeach;
GO

-- Tabla de configuración de límites semanales
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='panificacion_config_semanal' AND xtype='U')
BEGIN
    CREATE TABLE panificacion_config_semanal (
        id INT IDENTITY(1,1) PRIMARY KEY,
        numero_semana INT NOT NULL,
        año INT NOT NULL,
        limite_semanal DECIMAL(18,2) NOT NULL DEFAULT 100000000,
        fecha_inicio DATE NULL,
        CONSTRAINT UQ_panif_semana_año UNIQUE (numero_semana, año)
    );
    PRINT '✅ Tabla panificacion_config_semanal creada';
END
ELSE
    PRINT '⚠️ Tabla panificacion_config_semanal ya existe';
GO

-- Tabla principal de compras (encadenadas y no encadenadas)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='panificacion_compras' AND xtype='U')
BEGIN
    CREATE TABLE panificacion_compras (
        id INT IDENTITY(1,1) PRIMARY KEY,
        proveedor NVARCHAR(200) NOT NULL,
        fecha_compra DATE NOT NULL,
        semana_compra INT NOT NULL,
        año INT NOT NULL,
        mes NVARCHAR(20) NULL,
        numero_orden NVARCHAR(100) NULL,
        monto_neto DECIMAL(18,2) NOT NULL DEFAULT 0,
        monto_con_iva DECIMAL(18,2) NOT NULL DEFAULT 0,
        plazo_dias INT NOT NULL DEFAULT 30,
        fecha_vencimiento DATE NOT NULL,
        semana_vencimiento INT NOT NULL,
        tipo_proveedor NVARCHAR(50) NOT NULL DEFAULT 'No Encadenado',
        sucursal NVARCHAR(200) NULL,
        fuente NVARCHAR(20) NOT NULL DEFAULT 'MANUAL',
        fecha_carga DATETIME DEFAULT GETDATE(),
        lote_carga NVARCHAR(50) NULL
    );
    CREATE INDEX IX_panif_semana_año ON panificacion_compras(semana_compra, año);
    CREATE INDEX IX_panif_vencimiento ON panificacion_compras(semana_vencimiento, año);
    CREATE INDEX IX_panif_tipo ON panificacion_compras(tipo_proveedor);
    PRINT '✅ Tabla panificacion_compras creada';
END
ELSE
    PRINT '⚠️ Tabla panificacion_compras ya existe';
GO

PRINT '✅ Setup panificación completado';
GO
