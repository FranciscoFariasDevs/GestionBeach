-- =============================================
-- Script: Tabla de Estados de Resultados
-- Descripción: Guarda los estados de resultados generados
-- =============================================

USE GestionBeach;
GO

-- Crear tabla si no existe
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'estados_resultados')
BEGIN
    CREATE TABLE estados_resultados (
        id INT IDENTITY(1,1) PRIMARY KEY,

        -- Información básica
        sucursal_id INT NOT NULL,
        sucursal_nombre NVARCHAR(200),
        razon_social_id INT,
        razon_social_nombre NVARCHAR(300),
        periodo NVARCHAR(50) NOT NULL, -- Ej: "enero 2024"
        mes INT NOT NULL,
        anio INT NOT NULL,

        -- Ingresos
        ventas DECIMAL(18, 2) DEFAULT 0,
        otros_ingresos DECIMAL(18, 2) DEFAULT 0,
        total_ingresos DECIMAL(18, 2) DEFAULT 0,

        -- Costos
        costo_ventas DECIMAL(18, 2) DEFAULT 0,
        merma_venta DECIMAL(18, 2) DEFAULT 0,
        total_costos DECIMAL(18, 2) DEFAULT 0,

        -- Utilidades
        utilidad_bruta DECIMAL(18, 2) DEFAULT 0,
        utilidad_operativa DECIMAL(18, 2) DEFAULT 0,
        utilidad_antes_impuestos DECIMAL(18, 2) DEFAULT 0,
        utilidad_neta DECIMAL(18, 2) DEFAULT 0,

        -- Gastos Operativos
        sueldos_administrativos DECIMAL(18, 2) DEFAULT 0,
        sueldos_ventas DECIMAL(18, 2) DEFAULT 0,
        total_gastos_administrativos DECIMAL(18, 2) DEFAULT 0,
        total_gastos_ventas DECIMAL(18, 2) DEFAULT 0,
        total_gastos_operativos DECIMAL(18, 2) DEFAULT 0,

        -- Otros gastos
        costo_arriendo DECIMAL(18, 2) DEFAULT 0,
        otros_ingresos_financieros DECIMAL(18, 2) DEFAULT 0,
        impuestos DECIMAL(18, 2) DEFAULT 0,

        -- Datos originales (JSON)
        datos_originales NVARCHAR(MAX), -- JSON con información detallada
        gastos_detalle NVARCHAR(MAX), -- JSON con gastos variables

        -- Control
        estado NVARCHAR(20) DEFAULT 'borrador', -- borrador, guardado, enviado
        creado_por NVARCHAR(100),
        fecha_creacion DATETIME DEFAULT GETDATE(),
        modificado_por NVARCHAR(100),
        fecha_modificacion DATETIME,
        enviado_por NVARCHAR(100),
        fecha_envio DATETIME,

        -- Metadata
        numero_facturas INT DEFAULT 0,
        numero_ventas INT DEFAULT 0,
        numero_empleados INT DEFAULT 0,
        empleados_admin INT DEFAULT 0,
        empleados_ventas INT DEFAULT 0
    );

    PRINT 'Tabla estados_resultados creada exitosamente';
END
ELSE
BEGIN
    PRINT 'La tabla estados_resultados ya existe';
END
GO

-- Crear índices para mejorar el rendimiento
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_estados_resultados_sucursal_periodo')
BEGIN
    CREATE INDEX IX_estados_resultados_sucursal_periodo
    ON estados_resultados(sucursal_id, anio, mes);
    PRINT 'Índice IX_estados_resultados_sucursal_periodo creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_estados_resultados_estado')
BEGIN
    CREATE INDEX IX_estados_resultados_estado
    ON estados_resultados(estado);
    PRINT 'Índice IX_estados_resultados_estado creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_estados_resultados_fecha_creacion')
BEGIN
    CREATE INDEX IX_estados_resultados_fecha_creacion
    ON estados_resultados(fecha_creacion DESC);
    PRINT 'Índice IX_estados_resultados_fecha_creacion creado';
END
GO

PRINT '✅ Script de estados_resultados completado exitosamente';
GO
