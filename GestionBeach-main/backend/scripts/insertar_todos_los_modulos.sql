-- Script para insertar TODOS los módulos del sistema
-- Ejecuta este script para agregar todos los módulos que faltan en tu base de datos

USE GestionBeach;
GO

PRINT '===================================================';
PRINT 'INSERTANDO TODOS LOS MÓDULOS DEL SISTEMA';
PRINT '===================================================';
PRINT '';

-- Verificar si la tabla modulos existe
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'modulos')
BEGIN
    PRINT '❌ ERROR: La tabla modulos no existe';
    PRINT '   Debes crearla primero';
    RETURN;
END

PRINT '✅ Tabla modulos encontrada';
PRINT '';

-- Verificar si tiene IDENTITY
IF COLUMNPROPERTY(OBJECT_ID('modulos'), 'id', 'IsIdentity') = 0
BEGIN
    PRINT '⚠️ ADVERTENCIA: La tabla modulos NO tiene IDENTITY configurado';
    PRINT '   Se recomienda ejecutar primero: setup_modulos_identity.sql';
    PRINT '';
END

PRINT '🔄 Insertando módulos...';
PRINT '';

-- Insertar módulos uno por uno (solo si no existen)

-- 1. Dashboard
IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Dashboard')
BEGIN
    INSERT INTO modulos (nombre, descripcion, ruta, icono)
    VALUES ('Dashboard', 'Panel principal del sistema', '/dashboard', 'dashboard');
    PRINT '✅ Dashboard';
END
ELSE
    PRINT '⏭️ Dashboard ya existe';

-- 2. Estado Resultado
IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Estado Resultado')
BEGIN
    INSERT INTO modulos (nombre, descripcion, ruta, icono)
    VALUES ('Estado Resultado', 'Estados financieros del holding', '/estado-resultado', 'assessment');
    PRINT '✅ Estado Resultado';
END
ELSE
    PRINT '⏭️ Estado Resultado ya existe';

-- 3. Monitoreo
IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Monitoreo')
BEGIN
    INSERT INTO modulos (nombre, descripcion, ruta, icono)
    VALUES ('Monitoreo', 'Monitoreo de sucursales', '/monitoreo', 'monitor_heart');
    PRINT '✅ Monitoreo';
END
ELSE
    PRINT '⏭️ Monitoreo ya existe';

-- 4. Remuneraciones
IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Remuneraciones')
BEGIN
    INSERT INTO modulos (nombre, descripcion, ruta, icono)
    VALUES ('Remuneraciones', 'Gestión de nóminas y pagos', '/remuneraciones', 'attach_money');
    PRINT '✅ Remuneraciones';
END
ELSE
    PRINT '⏭️ Remuneraciones ya existe';

-- 5. Inventario
IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Inventario')
BEGIN
    INSERT INTO modulos (nombre, descripcion, ruta, icono)
    VALUES ('Inventario', 'Sistema de inventarios', '/inventario', 'inventory_2');
    PRINT '✅ Inventario';
END
ELSE
    PRINT '⏭️ Inventario ya existe';

-- 6. Ventas
IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Ventas')
BEGIN
    INSERT INTO modulos (nombre, descripcion, ruta, icono)
    VALUES ('Ventas', 'Gestión de ventas', '/ventas', 'shopping_cart');
    PRINT '✅ Ventas';
END
ELSE
    PRINT '⏭️ Ventas ya existe';

-- 7. Productos
IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Productos')
BEGIN
    INSERT INTO modulos (nombre, descripcion, ruta, icono)
    VALUES ('Productos', 'Catálogo de productos', '/productos', 'trending_up');
    PRINT '✅ Productos';
END
ELSE
    PRINT '⏭️ Productos ya existe';

-- 8. Supermercados
IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Supermercados')
BEGIN
    INSERT INTO modulos (nombre, descripcion, ruta, icono)
    VALUES ('Supermercados', 'Productos - Supermercados', '/productos/supermercados', 'store');
    PRINT '✅ Supermercados';
END
ELSE
    PRINT '⏭️ Supermercados ya existe';

-- 9. Ferreterías
IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Ferreterías')
BEGIN
    INSERT INTO modulos (nombre, descripcion, ruta, icono)
    VALUES ('Ferreterías', 'Productos - Ferreterías', '/productos/ferreterias', 'store');
    PRINT '✅ Ferreterías';
END
ELSE
    PRINT '⏭️ Ferreterías ya existe';

-- 10. Multitiendas
IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Multitiendas')
BEGIN
    INSERT INTO modulos (nombre, descripcion, ruta, icono)
    VALUES ('Multitiendas', 'Productos - Multitiendas', '/productos/multitiendas', 'store');
    PRINT '✅ Multitiendas';
END
ELSE
    PRINT '⏭️ Multitiendas ya existe';

-- 11. Compras
IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Compras')
BEGIN
    INSERT INTO modulos (nombre, descripcion, ruta, icono)
    VALUES ('Compras', 'Gestión de compras', '/compras', 'shopping_bag');
    PRINT '✅ Compras';
END
ELSE
    PRINT '⏭️ Compras ya existe';

-- 12. Centros de Costos
IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Centros de Costos')
BEGIN
    INSERT INTO modulos (nombre, descripcion, ruta, icono)
    VALUES ('Centros de Costos', 'Gestión de Centros de Costos', '/compras/centros-costos', 'business_center');
    PRINT '✅ Centros de Costos';
END
ELSE
    PRINT '⏭️ Centros de Costos ya existe';

-- 13. Facturas XML
IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Facturas XML')
BEGIN
    INSERT INTO modulos (nombre, descripcion, ruta, icono)
    VALUES ('Facturas XML', 'Gestión de Facturas XML', '/compras/facturas-xml', 'receipt');
    PRINT '✅ Facturas XML';
END
ELSE
    PRINT '⏭️ Facturas XML ya existe';

-- 14. Tarjeta Empleado
IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Tarjeta Empleado')
BEGIN
    INSERT INTO modulos (nombre, descripcion, ruta, icono)
    VALUES ('Tarjeta Empleado', 'Gestión de tarjetas de empleado', '/tarjeta-empleado', 'badge');
    PRINT '✅ Tarjeta Empleado';
END
ELSE
    PRINT '⏭️ Tarjeta Empleado ya existe';

-- 15. Empleados
IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Empleados')
BEGIN
    INSERT INTO modulos (nombre, descripcion, ruta, icono)
    VALUES ('Empleados', 'Recursos humanos', '/empleados', 'people');
    PRINT '✅ Empleados';
END
ELSE
    PRINT '⏭️ Empleados ya existe';

-- 16. Cabañas
IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Cabañas')
BEGIN
    INSERT INTO modulos (nombre, descripcion, ruta, icono)
    VALUES ('Cabañas', 'Gestión de Cabañas y Reservas', '/admin/cabanas', 'cottage');
    PRINT '✅ Cabañas';
END
ELSE
    PRINT '⏭️ Cabañas ya existe';

-- 17. Usuarios
IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Usuarios')
BEGIN
    INSERT INTO modulos (nombre, descripcion, ruta, icono)
    VALUES ('Usuarios', 'Gestión de usuarios', '/usuarios', 'person');
    PRINT '✅ Usuarios';
END
ELSE
    PRINT '⏭️ Usuarios ya existe';

-- 18. Perfiles
IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Perfiles')
BEGIN
    INSERT INTO modulos (nombre, descripcion, ruta, icono)
    VALUES ('Perfiles', 'Gestión de perfiles', '/perfiles', 'security');
    PRINT '✅ Perfiles';
END
ELSE
    PRINT '⏭️ Perfiles ya existe';

-- 19. Módulos
IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Módulos')
BEGIN
    INSERT INTO modulos (nombre, descripcion, ruta, icono)
    VALUES ('Módulos', 'Gestión de módulos', '/modulos', 'view_module');
    PRINT '✅ Módulos';
END
ELSE
    PRINT '⏭️ Módulos ya existe';

-- 20. Configuración
IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Configuración')
BEGIN
    INSERT INTO modulos (nombre, descripcion, ruta, icono)
    VALUES ('Configuración', 'Configuración del sistema', '/configuracion', 'settings');
    PRINT '✅ Configuración';
END
ELSE
    PRINT '⏭️ Configuración ya existe';

-- 21. Correo Electrónico
IF NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Correo Electrónico')
BEGIN
    INSERT INTO modulos (nombre, descripcion, ruta, icono)
    VALUES ('Correo Electrónico', 'Sistema de correo electrónico', '/correo', 'email');
    PRINT '✅ Correo Electrónico';
END
ELSE
    PRINT '⏭️ Correo Electrónico ya existe';

PRINT '';
PRINT '===================================================';
PRINT '✅ PROCESO COMPLETADO';
PRINT '===================================================';
PRINT '';

-- Mostrar resumen
DECLARE @totalModulos INT;
SELECT @totalModulos = COUNT(*) FROM modulos;

PRINT 'RESUMEN:';
PRINT 'Total de módulos en la base de datos: ' + CAST(@totalModulos AS VARCHAR);
PRINT '';

-- Mostrar todos los módulos
PRINT 'MÓDULOS DISPONIBLES:';
SELECT id, nombre FROM modulos ORDER BY id;

PRINT '';
PRINT '===================================================';
PRINT 'IMPORTANTE:';
PRINT '- Reinicia el backend para que los cambios surtan efecto';
PRINT '- Los nuevos perfiles creados ahora podrán usar estos módulos';
PRINT '===================================================';

GO
