-- Script RÁPIDO para arreglar y completar módulos
USE GestionBeach;
GO

PRINT '🔧 ARREGLANDO TABLA MODULOS...';
PRINT '';

-- 1. ELIMINAR FILAS CORRUPTAS
DELETE FROM modulos WHERE nombre IS NULL;
DELETE FROM modulos WHERE nombre = 'ucursales';
DELETE FROM modulos WHERE nombre = 'dashboard_gerencial';
PRINT '✅ Filas corruptas eliminadas';

-- 2. ACTUALIZAR NULL EN MÓDULOS EXISTENTES
UPDATE modulos SET ruta = '/dashboard', icono = 'dashboard' WHERE nombre = 'Dashboard';
UPDATE modulos SET ruta = '/ventas', icono = 'shopping_cart', descripcion = 'Gestión de ventas' WHERE nombre = 'Ventas';
UPDATE modulos SET ruta = '/productos', icono = 'trending_up' WHERE nombre = 'Productos';
UPDATE modulos SET ruta = '/compras', icono = 'shopping_bag' WHERE nombre = 'Compras';
UPDATE modulos SET ruta = '/tarjeta-empleado', icono = 'badge' WHERE nombre = 'Tarjeta Empleado';
UPDATE modulos SET ruta = '/empleados', icono = 'people' WHERE nombre = 'Empleados';
UPDATE modulos SET ruta = '/usuarios', icono = 'person' WHERE nombre = 'Usuarios';
UPDATE modulos SET ruta = '/perfiles', icono = 'security' WHERE nombre = 'Perfiles';
UPDATE modulos SET ruta = '/modulos', icono = 'view_module' WHERE nombre = 'Módulos';
UPDATE modulos SET ruta = '/configuracion', icono = 'settings' WHERE nombre = 'Configuración';
UPDATE modulos SET ruta = '/admin/cabanas', icono = 'cottage', descripcion = 'Gestión de Cabañas y Reservas' WHERE nombre = 'Cabañas';
UPDATE modulos SET ruta = '/remuneraciones', icono = 'attach_money' WHERE nombre = 'Remuneraciones';
PRINT '✅ NULL actualizados';

-- 3. INSERTAR MÓDULOS FALTANTES
IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Estado Resultado')
    INSERT INTO modulos (nombre, descripcion, ruta, icono) VALUES ('Estado Resultado', 'Estados financieros del holding', '/estado-resultado', 'assessment');

IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Monitoreo')
    INSERT INTO modulos (nombre, descripcion, ruta, icono) VALUES ('Monitoreo', 'Monitoreo de sucursales', '/monitoreo', 'monitor_heart');

IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Inventario')
    INSERT INTO modulos (nombre, descripcion, ruta, icono) VALUES ('Inventario', 'Sistema de inventarios', '/inventario', 'inventory_2');

IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Supermercados')
    INSERT INTO modulos (nombre, descripcion, ruta, icono) VALUES ('Supermercados', 'Productos - Supermercados', '/productos/supermercados', 'store');

IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Ferreterías')
    INSERT INTO modulos (nombre, descripcion, ruta, icono) VALUES ('Ferreterías', 'Productos - Ferreterías', '/productos/ferreterias', 'store');

IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Multitiendas')
    INSERT INTO modulos (nombre, descripcion, ruta, icono) VALUES ('Multitiendas', 'Productos - Multitiendas', '/productos/multitiendas', 'store');

IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Centros de Costos')
    INSERT INTO modulos (nombre, descripcion, ruta, icono) VALUES ('Centros de Costos', 'Gestión de Centros de Costos', '/compras/centros-costos', 'business_center');

IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Facturas XML')
    INSERT INTO modulos (nombre, descripcion, ruta, icono) VALUES ('Facturas XML', 'Gestión de Facturas XML', '/compras/facturas-xml', 'receipt');

IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Correo Electrónico')
    INSERT INTO modulos (nombre, descripcion, ruta, icono) VALUES ('Correo Electrónico', 'Sistema de correo electrónico', '/correo', 'email');

PRINT '✅ Módulos faltantes insertados';
PRINT '';

-- 4. MOSTRAR RESULTADO
PRINT '📊 MÓDULOS FINALES:';
SELECT id, nombre, ruta, icono FROM modulos ORDER BY id;

DECLARE @total INT = (SELECT COUNT(*) FROM modulos);
PRINT '';
PRINT '✅ COMPLETADO - Total de módulos: ' + CAST(@total AS VARCHAR);

GO
