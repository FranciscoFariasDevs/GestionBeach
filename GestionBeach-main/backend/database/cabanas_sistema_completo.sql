-- ============================================
-- SISTEMA DE CABAÑAS - BASE DE DATOS COMPLETA
-- ============================================
-- Base de datos: Beachsql
-- Compatible con SQL Server 2012+

USE Beachsql;
GO

-- ============================================
-- 1. TABLA DE CABAÑAS
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[cabanas]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.cabanas (
        id INT IDENTITY(1,1) PRIMARY KEY,
        numero INT NOT NULL UNIQUE, -- Número de la cabaña (1-10)
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT NULL,
        capacidad_personas INT NOT NULL DEFAULT 2,
        numero_habitaciones INT NULL,
        numero_banos INT NULL,
        precio_noche DECIMAL(18,2) NOT NULL,
        precio_fin_semana DECIMAL(18,2) NULL,
        imagenes TEXT NULL, -- JSON array de URLs
        amenidades TEXT NULL, -- JSON array
        estado VARCHAR(20) NOT NULL DEFAULT 'disponible', -- disponible, mantenimiento, ocupada, inactiva
        ubicacion VARCHAR(255) NULL,
        notas_internas TEXT NULL,
        fecha_creacion DATETIME NOT NULL DEFAULT GETDATE(),
        fecha_modificacion DATETIME NULL
    );
    PRINT '✅ Tabla cabanas creada';
END
ELSE
BEGIN
    PRINT '⚠️ Tabla cabanas ya existe';

    -- Agregar columna numero si no existe
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[cabanas]') AND name = 'numero')
    BEGIN
        ALTER TABLE dbo.cabanas ADD numero INT NULL;
        PRINT '✅ Columna numero agregada';
    END
END
GO

-- ============================================
-- 3. TABLA DE RESERVAS
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[reservas_cabanas]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.reservas_cabanas (
        id INT IDENTITY(1,1) PRIMARY KEY,
        cabana_id INT NOT NULL,

        -- Datos del cliente
        cliente_nombre VARCHAR(200) NOT NULL,
        cliente_apellido VARCHAR(200) NULL,
        cliente_telefono VARCHAR(20) NOT NULL,
        cliente_email VARCHAR(100) NULL,
        cliente_rut VARCHAR(20) NULL,

        -- Datos de la reserva
        fecha_inicio DATE NOT NULL,
        fecha_fin DATE NOT NULL,
        cantidad_personas INT NOT NULL,
        cantidad_noches AS DATEDIFF(day, fecha_inicio, fecha_fin),

        -- Precios
        precio_por_noche DECIMAL(18,2) NOT NULL,
        precio_total DECIMAL(18,2) NOT NULL,
        descuento DECIMAL(18,2) NULL DEFAULT 0,
        precio_final AS (precio_total - ISNULL(descuento, 0)),

        -- Estado y pagos
        estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- pendiente, confirmada, en_curso, completada, cancelada
        metodo_pago VARCHAR(50) NULL, -- efectivo, transferencia, tarjeta, whatsapp
        estado_pago VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- pendiente, parcial, pagado, reembolsado
        monto_pagado DECIMAL(18,2) NULL DEFAULT 0,

        -- Origen de la reserva
        origen VARCHAR(50) NOT NULL DEFAULT 'manual', -- manual, whatsapp, web, telefono
        numero_whatsapp VARCHAR(50) NULL,

        -- Comprobante de pago
        comprobante_pago VARCHAR(500) NULL, -- Ruta del archivo o URL
        fecha_comprobante DATETIME NULL,
        comprobante_validado BIT NOT NULL DEFAULT 0,

        -- Notas y detalles
        notas TEXT NULL,
        check_in_realizado BIT NOT NULL DEFAULT 0,
        check_out_realizado BIT NOT NULL DEFAULT 0,
        fecha_check_in DATETIME NULL,
        fecha_check_out DATETIME NULL,

        -- Auditoría
        usuario_creacion VARCHAR(100) NULL,
        fecha_creacion DATETIME NOT NULL DEFAULT GETDATE(),
        fecha_modificacion DATETIME NULL,
        usuario_modificacion VARCHAR(100) NULL,
        fecha_cancelacion DATETIME NULL,
        motivo_cancelacion TEXT NULL,

        CONSTRAINT FK_reservas_cabanas FOREIGN KEY (cabana_id) REFERENCES dbo.cabanas(id)
    );
    PRINT '✅ Tabla reservas_cabanas creada';
END
ELSE
    PRINT '⚠️ Tabla reservas_cabanas ya existe';
GO

-- ============================================
-- 4. TABLA DE MENSAJES WHATSAPP
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[mensajes_whatsapp]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.mensajes_whatsapp (
        id INT IDENTITY(1,1) PRIMARY KEY,
        sid_twilio VARCHAR(100) NULL,
        telefono_cliente VARCHAR(20) NOT NULL,
        telefono_negocio VARCHAR(20) NOT NULL,
        direccion VARCHAR(10) NOT NULL, -- 'entrante' o 'saliente'
        mensaje TEXT NOT NULL,
        tipo_mensaje VARCHAR(50) NULL,
        media_url TEXT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'recibido',
        estado_twilio VARCHAR(20) NULL,
        intent VARCHAR(100) NULL, -- reservar, consultar_disponibilidad, ver_datos_pago, hablar_ejecutivo, otro
        reserva_id INT NULL,
        requiere_respuesta_humana BIT NOT NULL DEFAULT 0,
        respondido_automaticamente BIT NOT NULL DEFAULT 1,
        datos_extra TEXT NULL, -- JSON
        error_message TEXT NULL,
        fecha_creacion DATETIME NOT NULL DEFAULT GETDATE(),
        fecha_procesamiento DATETIME NULL,

        CONSTRAINT FK_mensajes_reserva FOREIGN KEY (reserva_id) REFERENCES dbo.reservas_cabanas(id)
    );
    PRINT '✅ Tabla mensajes_whatsapp creada';
END
ELSE
    PRINT '⚠️ Tabla mensajes_whatsapp ya existe';
GO

-- ============================================
-- 5. TABLA DE PLANTILLAS DE RESPUESTAS
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[plantillas_respuestas]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.plantillas_respuestas (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        intent VARCHAR(100) NOT NULL,
        palabras_clave TEXT NULL, -- JSON array
        mensaje_respuesta TEXT NOT NULL,
        requiere_datos BIT NOT NULL DEFAULT 0,
        datos_requeridos TEXT NULL, -- JSON array
        activo BIT NOT NULL DEFAULT 1,
        orden INT NOT NULL DEFAULT 0,
        fecha_creacion DATETIME NOT NULL DEFAULT GETDATE(),
        fecha_modificacion DATETIME NULL
    );
    PRINT '✅ Tabla plantillas_respuestas creada';
END
ELSE
    PRINT '⚠️ Tabla plantillas_respuestas ya existe';
GO

-- ============================================
-- 6. TABLA DE BLOQUEOS/DISPONIBILIDAD
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[bloqueos_cabanas]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.bloqueos_cabanas (
        id INT IDENTITY(1,1) PRIMARY KEY,
        cabana_id INT NOT NULL,
        fecha_inicio DATE NOT NULL,
        fecha_fin DATE NOT NULL,
        motivo VARCHAR(50) NOT NULL, -- reserva, mantenimiento, bloqueo_manual
        reserva_id INT NULL,
        notas TEXT NULL,
        fecha_creacion DATETIME NOT NULL DEFAULT GETDATE(),

        CONSTRAINT FK_bloqueos_cabana FOREIGN KEY (cabana_id) REFERENCES dbo.cabanas(id),
        CONSTRAINT FK_bloqueos_reserva FOREIGN KEY (reserva_id) REFERENCES dbo.reservas_cabanas(id)
    );
    PRINT '✅ Tabla bloqueos_cabanas creada';
END
ELSE
    PRINT '⚠️ Tabla bloqueos_cabanas ya existe';
GO

-- ============================================
-- 7. TABLA DE DATOS DE TRANSFERENCIA
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[datos_transferencia]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.datos_transferencia (
        id INT IDENTITY(1,1) PRIMARY KEY,
        banco VARCHAR(100) NOT NULL,
        tipo_cuenta VARCHAR(50) NOT NULL, -- Cuenta Corriente, Cuenta Vista, Cuenta RUT
        numero_cuenta VARCHAR(50) NOT NULL,
        titular VARCHAR(200) NOT NULL,
        rut_titular VARCHAR(20) NOT NULL,
        email_contacto VARCHAR(100) NULL,
        activo BIT NOT NULL DEFAULT 1,
        es_principal BIT NOT NULL DEFAULT 0,
        notas TEXT NULL,
        fecha_creacion DATETIME NOT NULL DEFAULT GETDATE()
    );
    PRINT '✅ Tabla datos_transferencia creada';
END
ELSE
    PRINT '⚠️ Tabla datos_transferencia ya existe';
GO

-- ============================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- ============================================

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_cabanas_numero')
    CREATE INDEX IX_cabanas_numero ON cabanas(numero);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_reservas_cabana_id')
    CREATE INDEX IX_reservas_cabana_id ON reservas_cabanas(cabana_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_reservas_fechas')
    CREATE INDEX IX_reservas_fechas ON reservas_cabanas(fecha_inicio, fecha_fin);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_mensajes_telefono')
    CREATE INDEX IX_mensajes_telefono ON mensajes_whatsapp(telefono_cliente);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_bloqueos_cabana_fechas')
    CREATE INDEX IX_bloqueos_cabana_fechas ON bloqueos_cabanas(cabana_id, fecha_inicio, fecha_fin);

PRINT '✅ Índices creados correctamente';
GO

-- ============================================
-- INSERTAR DATOS INICIALES
-- ============================================

-- 10 Cabañas totales (1-8 normales + 9 y 10 que son los departamentos)
-- PRECIOS: precio_noche = TEMPORADA BAJA (marzo-noviembre)
--          precio_fin_semana = TEMPORADA ALTA (diciembre-febrero)
IF NOT EXISTS (SELECT * FROM dbo.cabanas)
BEGIN
    INSERT INTO dbo.cabanas (numero, nombre, descripcion, capacidad_personas, numero_habitaciones, numero_banos, precio_noche, precio_fin_semana, estado)
    VALUES
        -- CABAÑAS 1-8
        (1, 'Cabaña 1', 'Cabaña familiar con vista al mar', 6, 3, 2, 180000, 190000, 'disponible'),
        (2, 'Cabaña 2', 'Cabaña acogedora', 4, 2, 1, 79000, 100000, 'disponible'),
        (3, 'Cabaña 3', 'Cabaña mediana con terraza', 4, 2, 1, 79000, 100000, 'disponible'),
        (4, 'Cabaña 4', 'Cabaña confortable', 4, 2, 1, 79000, 100000, 'disponible'),
        (5, 'Cabaña 5', 'Cabaña familiar con jardín', 6, 3, 2, 105000, 110000, 'disponible'),
        (6, 'Cabaña 6', 'Cabaña espaciosa', 6, 3, 2, 120000, 130000, 'disponible'),
        (7, 'Cabaña 7', 'Cabaña con quincho y parrilla', 8, 4, 3, 140000, 160000, 'disponible'),
        (8, 'Cabaña 8', 'Cabaña VIP con todas las comodidades', 8, 4, 3, 140000, 160000, 'disponible'),

        -- DEPARTAMENTOS (CABAÑAS 9 Y 10)
        (9, 'Departamento A', 'Departamento completo con todas las comodidades', 8, 4, 3, 59000, 65000, 'disponible'),
        (10, 'Departamento B', 'Departamento amplio ideal para grupos grandes', 8, 4, 3, 59000, 65000, 'disponible');

    PRINT '✅ 10 Cabañas creadas (1-8 normales + 9 y 10 Departamentos A y B)';
    PRINT '📅 Precios: precio_noche = TEMPORADA BAJA (marzo-nov), precio_fin_semana = TEMPORADA ALTA (dic-feb)';
END
GO

-- Datos de transferencia
IF NOT EXISTS (SELECT * FROM dbo.datos_transferencia)
BEGIN
    INSERT INTO dbo.datos_transferencia (banco, tipo_cuenta, numero_cuenta, titular, rut_titular, email_contacto, activo, es_principal)
    VALUES
        ('Banco Estado', 'Cuenta Vista', '12345678901', 'CABAÑAS BEACH SPA', '12.345.678-9', 'pagos@cabanasbeach.cl', 1, 1);
    PRINT '✅ Datos de transferencia creados';
END
GO

-- Plantillas de respuestas automáticas actualizadas
IF NOT EXISTS (SELECT * FROM dbo.plantillas_respuestas)
BEGIN
    INSERT INTO dbo.plantillas_respuestas (nombre, intent, palabras_clave, mensaje_respuesta, orden)
    VALUES
        ('Saludo', 'saludo', '["hola", "buenos dias", "buenas tardes", "buenas noches", "hey", "alo"]',
         '¡Hola! 👋 Bienvenido a *Cabañas Beach*.\n\n¿En qué puedo ayudarte?\n\n1️⃣ Ver disponibilidad de cabañas\n2️⃣ Hacer una reserva\n3️⃣ Ver datos para transferencia\n4️⃣ Hablar con un ejecutivo\n\nEscribe el número de la opción o describe lo que necesitas.', 1),

        ('Consulta Disponibilidad', 'consulta_disponibilidad', '["disponibilidad", "disponible", "fechas", "libre", "ver cabañas", "opciones", "1"]',
         '📅 *Disponibilidad de Cabañas*\n\nEn breve te mostraré las cabañas disponibles. Un momento por favor...', 2),

        ('Hacer Reserva', 'reserva', '["reservar", "reserva", "quiero reservar", "agendar", "2"]',
         '🎉 *¡Perfecto!*\n\nPrimero déjame mostrarte las cabañas disponibles para que elijas la que más te guste.\n\nUn momento...', 3),

        ('Datos Transferencia', 'datos_pago', '["transferencia", "datos", "pago", "cuenta", "deposito", "3"]',
         '💳 *Datos para Transferencia*', 4),

        ('Hablar Ejecutivo', 'hablar_ejecutivo', '["ejecutivo", "hablar", "persona", "ayuda", "asesor", "4"]',
         '👤 *Contacto con Ejecutivo*\n\nPerfecto, un ejecutivo te contactará pronto.\n\nMientras tanto, puedes llamarnos directamente al:\n📞 *+56 9 4265 2034*\n\nHorario de atención:\n🕐 Lunes a Domingo: 9:00 - 21:00 hrs', 5),

        ('Despedida', 'despedida', '["gracias", "chao", "adios", "hasta luego", "bye"]',
         '¡Gracias por contactarnos! 😊\n\nQue tengas un excelente día.\n\n🏡 *Cabañas Beach*\nSiempre a tu servicio 🌊', 6),

        ('Confirmacion Reserva', 'confirmacion_reserva', '["confirmar", "si", "ok", "dale", "acepto"]',
         '✅ *¡Reserva Confirmada!*\n\nTe enviaré los datos para que realices la transferencia.\n\nUna vez realizada, envíame el comprobante y quedará todo listo.\n\n¡Gracias por elegirnos! 🏖️', 7);

    PRINT '✅ Plantillas de respuestas creadas';
END
GO

-- ============================================
-- VERIFICACIÓN
-- ============================================
PRINT '';
PRINT '🎉 ========================================';
PRINT '   INSTALACIÓN COMPLETADA EXITOSAMENTE';
PRINT '========================================';
PRINT '';
PRINT 'Tablas creadas:';

SELECT name AS Tabla, create_date AS FechaCreacion
FROM sys.tables
WHERE name IN ('cabanas', 'reservas_cabanas', 'mensajes_whatsapp', 'plantillas_respuestas', 'bloqueos_cabanas', 'datos_transferencia')
ORDER BY name;

PRINT '';
PRINT 'Resumen de datos:';

SELECT 'Cabañas' AS Tabla, COUNT(*) AS Total FROM dbo.cabanas
UNION ALL
SELECT 'Datos de Transferencia', COUNT(*) FROM dbo.datos_transferencia
UNION ALL
SELECT 'Plantillas de Respuestas', COUNT(*) FROM dbo.plantillas_respuestas;

PRINT '';
PRINT 'Cabañas registradas:';

SELECT
    numero AS Numero,
    nombre AS Nombre,
    capacidad_personas AS Capacidad,
    precio_noche AS PrecioNoche
FROM dbo.cabanas
ORDER BY numero;

PRINT '';
PRINT '✅ Sistema listo para usar!';
GO
