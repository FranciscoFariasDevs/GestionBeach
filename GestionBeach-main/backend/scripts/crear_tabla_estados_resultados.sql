-- Script para crear la tabla estados_resultados
-- Esta tabla almacena los estados de resultados guardados

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'estados_resultados')
BEGIN
    CREATE TABLE estados_resultados (
        id INT IDENTITY(1,1) PRIMARY KEY,

        -- Identificación
        sucursal_id INT,
        sucursal_nombre NVARCHAR(255),
        razon_social_id INT,
        razon_social_nombre NVARCHAR(255),

        -- Período
        periodo NVARCHAR(50),
        mes INT NOT NULL,
        anio INT NOT NULL,

        -- Datos financieros principales
        ventas DECIMAL(18, 2) DEFAULT 0,
        total_ingresos DECIMAL(18, 2) DEFAULT 0,
        total_costos DECIMAL(18, 2) DEFAULT 0,
        total_gastos_operativos DECIMAL(18, 2) DEFAULT 0,

        -- Utilidades
        utilidad_bruta DECIMAL(18, 2) DEFAULT 0,
        utilidad_operativa DECIMAL(18, 2) DEFAULT 0,
        utilidad_neta DECIMAL(18, 2) DEFAULT 0,

        -- Información adicional
        numero_facturas INT DEFAULT 0,
        numero_ventas INT DEFAULT 0,
        numero_empleados INT DEFAULT 0,
        empleados_admin INT DEFAULT 0,
        empleados_ventas INT DEFAULT 0,

        -- Datos originales completos (JSON)
        datos_originales_json NVARCHAR(MAX),

        -- Estado
        estado NVARCHAR(50) DEFAULT 'borrador',

        -- Auditoría
        creado_por NVARCHAR(255),
        fecha_creacion DATETIME DEFAULT GETDATE(),
        modificado_por NVARCHAR(255),
        fecha_modificacion DATETIME,
        enviado_por NVARCHAR(255),
        fecha_envio DATETIME
    );

    -- Crear índices después de la tabla
    CREATE INDEX idx_periodo ON estados_resultados(anio, mes);
    CREATE INDEX idx_sucursal ON estados_resultados(sucursal_id);
    CREATE INDEX idx_estado ON estados_resultados(estado);
    CREATE INDEX idx_fecha_creacion ON estados_resultados(fecha_creacion);
END
