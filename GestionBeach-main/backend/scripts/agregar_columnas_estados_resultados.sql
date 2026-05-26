-- Migración: agregar columnas faltantes a estados_resultados
-- Ejecutar una sola vez. Cada ALTER es idempotente gracias al IF NOT EXISTS.

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'otros_ingresos_fletes')
    ALTER TABLE estados_resultados ADD otros_ingresos_fletes DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'otros_ingresos_total')
    ALTER TABLE estados_resultados ADD otros_ingresos_total DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'costo_ventas')
    ALTER TABLE estados_resultados ADD costo_ventas DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'compras_totales')
    ALTER TABLE estados_resultados ADD compras_totales DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'merma_venta')
    ALTER TABLE estados_resultados ADD merma_venta DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'utilidad_antes_impuestos')
    ALTER TABLE estados_resultados ADD utilidad_antes_impuestos DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'impuestos')
    ALTER TABLE estados_resultados ADD impuestos DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'gastos_admin_sueldos')
    ALTER TABLE estados_resultados ADD gastos_admin_sueldos DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'gastos_admin_seguros')
    ALTER TABLE estados_resultados ADD gastos_admin_seguros DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'gastos_admin_gastos_comunes')
    ALTER TABLE estados_resultados ADD gastos_admin_gastos_comunes DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'gastos_admin_electricidad')
    ALTER TABLE estados_resultados ADD gastos_admin_electricidad DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'gastos_admin_agua')
    ALTER TABLE estados_resultados ADD gastos_admin_agua DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'gastos_admin_telefonia')
    ALTER TABLE estados_resultados ADD gastos_admin_telefonia DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'gastos_admin_alarma')
    ALTER TABLE estados_resultados ADD gastos_admin_alarma DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'gastos_admin_internet')
    ALTER TABLE estados_resultados ADD gastos_admin_internet DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'gastos_admin_facturas_net')
    ALTER TABLE estados_resultados ADD gastos_admin_facturas_net DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'gastos_admin_transbank')
    ALTER TABLE estados_resultados ADD gastos_admin_transbank DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'gastos_admin_patente_municipal')
    ALTER TABLE estados_resultados ADD gastos_admin_patente_municipal DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'gastos_admin_contribuciones')
    ALTER TABLE estados_resultados ADD gastos_admin_contribuciones DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'gastos_admin_petroleo')
    ALTER TABLE estados_resultados ADD gastos_admin_petroleo DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'gastos_admin_otros')
    ALTER TABLE estados_resultados ADD gastos_admin_otros DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'gastos_admin_total')
    ALTER TABLE estados_resultados ADD gastos_admin_total DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'gastos_venta_sueldos')
    ALTER TABLE estados_resultados ADD gastos_venta_sueldos DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'gastos_venta_fletes')
    ALTER TABLE estados_resultados ADD gastos_venta_fletes DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'gastos_venta_finiquitos')
    ALTER TABLE estados_resultados ADD gastos_venta_finiquitos DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'gastos_venta_mantenciones')
    ALTER TABLE estados_resultados ADD gastos_venta_mantenciones DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'gastos_venta_publicidad')
    ALTER TABLE estados_resultados ADD gastos_venta_publicidad DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'gastos_venta_total')
    ALTER TABLE estados_resultados ADD gastos_venta_total DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'costo_arriendo')
    ALTER TABLE estados_resultados ADD costo_arriendo DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'otros_ingresos_financieros')
    ALTER TABLE estados_resultados ADD otros_ingresos_financieros DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'total_compras_valor')
    ALTER TABLE estados_resultados ADD total_compras_valor DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'total_remuneraciones_valor')
    ALTER TABLE estados_resultados ADD total_remuneraciones_valor DECIMAL(18,2) DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'detalle_remuneraciones_json')
    ALTER TABLE estados_resultados ADD detalle_remuneraciones_json NVARCHAR(MAX);

-- Índice compuesto para búsquedas frecuentes por sucursal + período
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('estados_resultados') AND name = 'idx_sucursal_periodo')
    CREATE INDEX idx_sucursal_periodo ON estados_resultados(sucursal_id, anio, mes);

PRINT 'Migración completada: columnas y índice agregados a estados_resultados';
