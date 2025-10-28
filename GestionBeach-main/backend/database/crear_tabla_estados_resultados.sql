-- =============================================
-- CREAR TABLA ESTADOS_RESULTADOS
-- Basado en la estructura del frontend (EstadoResultados/index.jsx)
-- =============================================

USE GestionBeach;
GO

-- Eliminar tabla si existe (solo para desarrollo)
-- DROP TABLE IF EXISTS estados_resultados;
-- GO

-- Crear tabla estados_resultados
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'estados_resultados')
BEGIN
    CREATE TABLE estados_resultados (
        -- ===== IDENTIFICADORES =====
        id INT IDENTITY(1,1) PRIMARY KEY,

        -- ===== INFORMACIÓN DE PERÍODO Y UBICACIÓN =====
        sucursal_id INT NOT NULL,
        sucursal_nombre NVARCHAR(200),
        razon_social_id INT,
        razon_social_nombre NVARCHAR(300),
        periodo NVARCHAR(100) NOT NULL, -- Ej: "enero 2024"
        mes INT NOT NULL, -- 1-12
        anio INT NOT NULL, -- Ej: 2024

        -- ===== INGRESOS =====
        ventas DECIMAL(18, 2) DEFAULT 0,
        otros_ingresos_fletes DECIMAL(18, 2) DEFAULT 0,
        otros_ingresos_total DECIMAL(18, 2) DEFAULT 0,
        total_ingresos DECIMAL(18, 2) DEFAULT 0,

        -- ===== COSTOS =====
        costo_ventas DECIMAL(18, 2) DEFAULT 0,
        compras_totales DECIMAL(18, 2) DEFAULT 0, -- Valor original antes del 81%
        merma_venta DECIMAL(18, 2) DEFAULT 0,
        total_costos DECIMAL(18, 2) DEFAULT 0,

        -- ===== UTILIDADES =====
        utilidad_bruta DECIMAL(18, 2) DEFAULT 0,
        utilidad_operativa DECIMAL(18, 2) DEFAULT 0,
        utilidad_antes_impuestos DECIMAL(18, 2) DEFAULT 0,
        utilidad_neta DECIMAL(18, 2) DEFAULT 0,

        -- ===== GASTOS ADMINISTRATIVOS =====
        gastos_admin_sueldos DECIMAL(18, 2) DEFAULT 0,
        gastos_admin_seguros DECIMAL(18, 2) DEFAULT 0,
        gastos_admin_gastos_comunes DECIMAL(18, 2) DEFAULT 0,
        gastos_admin_electricidad DECIMAL(18, 2) DEFAULT 0,
        gastos_admin_agua DECIMAL(18, 2) DEFAULT 0,
        gastos_admin_telefonia DECIMAL(18, 2) DEFAULT 0,
        gastos_admin_alarma DECIMAL(18, 2) DEFAULT 0,
        gastos_admin_internet DECIMAL(18, 2) DEFAULT 0,
        gastos_admin_facturas_net DECIMAL(18, 2) DEFAULT 0,
        gastos_admin_transbank DECIMAL(18, 2) DEFAULT 0,
        gastos_admin_patente_municipal DECIMAL(18, 2) DEFAULT 0,
        gastos_admin_contribuciones DECIMAL(18, 2) DEFAULT 0,
        gastos_admin_petroleo DECIMAL(18, 2) DEFAULT 0,
        gastos_admin_otros DECIMAL(18, 2) DEFAULT 0,
        gastos_admin_total DECIMAL(18, 2) DEFAULT 0,

        -- ===== GASTOS DE VENTA =====
        gastos_venta_sueldos DECIMAL(18, 2) DEFAULT 0,
        gastos_venta_fletes DECIMAL(18, 2) DEFAULT 0,
        gastos_venta_finiquitos DECIMAL(18, 2) DEFAULT 0,
        gastos_venta_mantenciones DECIMAL(18, 2) DEFAULT 0,
        gastos_venta_publicidad DECIMAL(18, 2) DEFAULT 0,
        gastos_venta_total DECIMAL(18, 2) DEFAULT 0,

        -- ===== TOTALES DE GASTOS OPERATIVOS =====
        total_gastos_operativos DECIMAL(18, 2) DEFAULT 0,

        -- ===== OTROS GASTOS E INGRESOS =====
        costo_arriendo DECIMAL(18, 2) DEFAULT 0,
        otros_ingresos_financieros DECIMAL(18, 2) DEFAULT 0,
        impuestos DECIMAL(18, 2) DEFAULT 0,

        -- ===== METADATA DE DATOS ORIGINALES =====
        numero_facturas INT DEFAULT 0,
        numero_ventas INT DEFAULT 0,
        numero_empleados INT DEFAULT 0,
        empleados_admin INT DEFAULT 0,
        empleados_ventas INT DEFAULT 0,
        total_compras_valor DECIMAL(18, 2) DEFAULT 0,
        total_remuneraciones_valor DECIMAL(18, 2) DEFAULT 0,

        -- ===== DATOS DETALLADOS (JSON) =====
        datos_originales_json NVARCHAR(MAX), -- JSON completo con toda la info
        gastos_variables_json NVARCHAR(MAX), -- JSON con gastos agregados dinámicamente
        detalle_remuneraciones_json NVARCHAR(MAX), -- JSON con detalle de clasificación admin/ventas

        -- ===== CONTROL Y AUDITORÍA =====
        estado NVARCHAR(20) DEFAULT 'borrador', -- borrador, guardado, enviado
        creado_por NVARCHAR(100),
        fecha_creacion DATETIME DEFAULT GETDATE(),
        modificado_por NVARCHAR(100),
        fecha_modificacion DATETIME,
        enviado_por NVARCHAR(100),
        fecha_envio DATETIME,

        -- ===== OBSERVACIONES =====
        observaciones NVARCHAR(MAX),
        notas NVARCHAR(MAX)
    );

    PRINT '✅ Tabla estados_resultados creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️ La tabla estados_resultados ya existe';
END
GO

-- ===== CREAR ÍNDICES PARA MEJORAR RENDIMIENTO =====

-- Índice por sucursal y período (búsquedas más comunes)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_estados_resultados_sucursal_periodo' AND object_id = OBJECT_ID('estados_resultados'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_estados_resultados_sucursal_periodo
    ON estados_resultados(sucursal_id, anio DESC, mes DESC);
    PRINT '✅ Índice IX_estados_resultados_sucursal_periodo creado';
END
GO

-- Índice por estado (filtrar borradores, guardados, enviados)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_estados_resultados_estado' AND object_id = OBJECT_ID('estados_resultados'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_estados_resultados_estado
    ON estados_resultados(estado);
    PRINT '✅ Índice IX_estados_resultados_estado creado';
END
GO

-- Índice por fecha de creación (reportes históricos)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_estados_resultados_fecha_creacion' AND object_id = OBJECT_ID('estados_resultados'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_estados_resultados_fecha_creacion
    ON estados_resultados(fecha_creacion DESC);
    PRINT '✅ Índice IX_estados_resultados_fecha_creacion creado';
END
GO

-- Índice por razón social y período
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_estados_resultados_razon_periodo' AND object_id = OBJECT_ID('estados_resultados'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_estados_resultados_razon_periodo
    ON estados_resultados(razon_social_id, anio DESC, mes DESC)
    WHERE razon_social_id IS NOT NULL;
    PRINT '✅ Índice IX_estados_resultados_razon_periodo creado';
END
GO

-- ===== CONSTRAINT UNIQUE: Un estado por sucursal/mes/año/razón social =====
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_estados_resultados_periodo_unico' AND object_id = OBJECT_ID('estados_resultados'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UQ_estados_resultados_periodo_unico
    ON estados_resultados(sucursal_id, mes, anio, razon_social_id, estado)
    WHERE estado = 'enviado'; -- Solo los enviados deben ser únicos
    PRINT '✅ Constraint UQ_estados_resultados_periodo_unico creado';
END
GO

-- ===== VERIFICAR ESTRUCTURA =====
SELECT
    COLUMN_NAME as 'Columna',
    DATA_TYPE as 'Tipo',
    CHARACTER_MAXIMUM_LENGTH as 'Longitud',
    IS_NULLABLE as 'Nullable'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'estados_resultados'
ORDER BY ORDINAL_POSITION;

SELECT
    name as 'Índice',
    type_desc as 'Tipo'
FROM sys.indexes
WHERE object_id = OBJECT_ID('estados_resultados');

PRINT '';
PRINT '========================================';
PRINT '✅ SCRIPT COMPLETADO EXITOSAMENTE';
PRINT '========================================';
PRINT 'Tabla: estados_resultados';
PRINT 'Columnas: ~60 campos';
PRINT 'Índices: 5 índices creados';
PRINT 'Estado: Lista para usar';
PRINT '========================================';
GO
