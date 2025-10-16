-- Script de creación de tablas para Sistema de Cabañas y Reservas con WhatsApp
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
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT NULL,
        capacidad_personas INT NOT NULL DEFAULT 2,
        numero_habitaciones INT NULL,
        numero_banos INT NULL,
        precio_noche DECIMAL(18,2) NOT NULL,
        precio_fin_semana DECIMAL(18,2) NULL,
        imagenes TEXT NULL, -- JSON array de URLs de imágenes
        amenidades TEXT NULL, -- JSON array de amenidades (wifi, tv, cocina, etc)
        estado VARCHAR(20) NOT NULL DEFAULT 'disponible', -- disponible, mantenimiento, inactivo
        ubicacion VARCHAR(255) NULL,
        notas_internas TEXT NULL,
        fecha_creacion DATETIME NOT NULL DEFAULT GETDATE(),
        fecha_modificacion DATETIME NULL
    );
    PRINT '✅ Tabla cabanas creada';
END
ELSE
    PRINT '⚠️ Tabla cabanas ya existe';
GO

-- ============================================
-- 2. TABLA DE RESERVAS
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
        cantidad_noches AS DATEDIFF(day, fecha_inicio, fecha_fin), -- Columna calculada

        -- Precios
        precio_por_noche DECIMAL(18,2) NOT NULL,
        precio_total DECIMAL(18,2) NOT NULL,
        descuento DECIMAL(18,2) NULL DEFAULT 0,
        precio_final AS (precio_total - ISNULL(descuento, 0)), -- Columna calculada

        -- Estado y pagos
        estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- pendiente, confirmada, en_curso, completada, cancelada
        metodo_pago VARCHAR(50) NULL, -- efectivo, transferencia, tarjeta, whatsapp
        estado_pago VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- pendiente, parcial, pagado, reembolsado
        monto_pagado DECIMAL(18,2) NULL DEFAULT 0,

        -- Origen de la reserva
        origen VARCHAR(50) NOT NULL DEFAULT 'manual', -- manual, whatsapp, web, telefono
        numero_whatsapp VARCHAR(50) NULL, -- Si vino por WhatsApp

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

        -- Foreign Key
        CONSTRAINT FK_reservas_cabanas FOREIGN KEY (cabana_id) REFERENCES dbo.cabanas(id)
    );
    PRINT '✅ Tabla reservas_cabanas creada';
END
ELSE
    PRINT '⚠️ Tabla reservas_cabanas ya existe';
GO

-- ============================================
-- 3. TABLA DE MENSAJES WHATSAPP (TWILIO)
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[mensajes_whatsapp]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.mensajes_whatsapp (
        id INT IDENTITY(1,1) PRIMARY KEY,

        -- Identificación del mensaje
        sid_twilio VARCHAR(100) NULL, -- MessageSid de Twilio
        telefono_cliente VARCHAR(20) NOT NULL, -- Número del cliente (formato: +56912345678)
        telefono_negocio VARCHAR(20) NOT NULL, -- Nuestro número de WhatsApp Business

        -- Contenido del mensaje
        direccion VARCHAR(10) NOT NULL, -- 'entrante' o 'saliente'
        mensaje TEXT NOT NULL,
        tipo_mensaje VARCHAR(50) NULL, -- texto, imagen, documento, ubicacion
        media_url TEXT NULL, -- URL de archivos multimedia

        -- Estado del mensaje
        estado VARCHAR(20) NOT NULL DEFAULT 'recibido', -- recibido, procesado, respondido, error
        estado_twilio VARCHAR(20) NULL, -- queued, sending, sent, delivered, read, failed

        -- Contexto de conversación
        intent VARCHAR(100) NULL, -- reservar, consultar_disponibilidad, cancelar, informacion, otro
        reserva_id INT NULL, -- Si está relacionado a una reserva
        requiere_respuesta_humana BIT NOT NULL DEFAULT 0,
        respondido_automaticamente BIT NOT NULL DEFAULT 1,

        -- Metadatos
        datos_extra TEXT NULL, -- JSON con info adicional
        error_message TEXT NULL,

        -- Auditoría
        fecha_creacion DATETIME NOT NULL DEFAULT GETDATE(),
        fecha_procesamiento DATETIME NULL,

        -- Foreign Key (opcional)
        CONSTRAINT FK_mensajes_reserva FOREIGN KEY (reserva_id) REFERENCES dbo.reservas_cabanas(id)
    );
    PRINT '✅ Tabla mensajes_whatsapp creada';
END
ELSE
    PRINT '⚠️ Tabla mensajes_whatsapp ya existe';
GO

-- ============================================
-- 4. TABLA DE PLANTILLAS DE RESPUESTAS AUTOMÁTICAS
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[plantillas_respuestas]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.plantillas_respuestas (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        intent VARCHAR(100) NOT NULL, -- saludo, consulta_disponibilidad, consulta_precio, reserva, despedida
        palabras_clave TEXT NULL, -- JSON array de palabras que activan esta plantilla
        mensaje_respuesta TEXT NOT NULL,
        requiere_datos BIT NOT NULL DEFAULT 0, -- Si requiere capturar datos adicionales
        datos_requeridos TEXT NULL, -- JSON array de datos a capturar
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
-- 5. TABLA DE DISPONIBILIDAD (BLOQUEOS)
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[bloqueos_cabanas]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.bloqueos_cabanas (
        id INT IDENTITY(1,1) PRIMARY KEY,
        cabana_id INT NOT NULL,
        fecha_inicio DATE NOT NULL,
        fecha_fin DATE NOT NULL,
        motivo VARCHAR(50) NOT NULL, -- reserva, mantenimiento, bloqueo_manual
        reserva_id INT NULL, -- Si el bloqueo es por una reserva
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
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- ============================================

-- Índices para reservas_cabanas
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_reservas_cabana_id')
    CREATE INDEX IX_reservas_cabana_id ON reservas_cabanas(cabana_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_reservas_fechas')
    CREATE INDEX IX_reservas_fechas ON reservas_cabanas(fecha_inicio, fecha_fin);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_reservas_estado')
    CREATE INDEX IX_reservas_estado ON reservas_cabanas(estado);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_reservas_telefono')
    CREATE INDEX IX_reservas_telefono ON reservas_cabanas(cliente_telefono);

-- Índices para mensajes_whatsapp
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_mensajes_telefono')
    CREATE INDEX IX_mensajes_telefono ON mensajes_whatsapp(telefono_cliente);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_mensajes_fecha')
    CREATE INDEX IX_mensajes_fecha ON mensajes_whatsapp(fecha_creacion);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_mensajes_intent')
    CREATE INDEX IX_mensajes_intent ON mensajes_whatsapp(intent);

-- Índices para bloqueos_cabanas
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_bloqueos_cabana_fechas')
    CREATE INDEX IX_bloqueos_cabana_fechas ON bloqueos_cabanas(cabana_id, fecha_inicio, fecha_fin);

PRINT '✅ Índices creados correctamente';
GO

-- ============================================
-- INSERTAR DATOS DE PRUEBA
-- ============================================

-- Cabañas de ejemplo
IF NOT EXISTS (SELECT * FROM dbo.cabanas)
BEGIN
    INSERT INTO dbo.cabanas (nombre, descripcion, capacidad_personas, numero_habitaciones, numero_banos, precio_noche, precio_fin_semana, estado)
    VALUES
        ('Cabaña del Mar', 'Hermosa cabaña con vista al mar, ideal para familias', 6, 3, 2, 50000, 65000, 'disponible'),
        ('Cabaña del Bosque', 'Acogedora cabaña rodeada de naturaleza', 4, 2, 1, 35000, 45000, 'disponible'),
        ('Cabaña VIP', 'Cabaña de lujo con jacuzzi y todas las comodidades', 8, 4, 3, 80000, 100000, 'disponible');

    PRINT '✅ Datos de prueba insertados en cabanas';
END
GO

-- Plantillas de respuestas automáticas
IF NOT EXISTS (SELECT * FROM dbo.plantillas_respuestas)
BEGIN
    INSERT INTO dbo.plantillas_respuestas (nombre, intent, palabras_clave, mensaje_respuesta, orden)
    VALUES
        ('Saludo', 'saludo', '["hola", "buenos dias", "buenas tardes", "buenas noches", "hey"]',
         '¡Hola! 👋 Bienvenido a Cabañas Beach. ¿En qué puedo ayudarte?\n\n1️⃣ Consultar disponibilidad\n2️⃣ Ver cabañas y precios\n3️⃣ Hacer una reserva\n4️⃣ Hablar con un agente', 1),

        ('Consulta Disponibilidad', 'consulta_disponibilidad', '["disponibilidad", "disponible", "fechas", "libre"]',
         'Con gusto te ayudo a verificar disponibilidad. 📅\n\n¿Para qué fechas necesitas? Por favor indica:\n- Fecha de entrada (DD/MM/YYYY)\n- Fecha de salida (DD/MM/YYYY)\n- Cantidad de personas', 2),

        ('Info Cabañas', 'info_cabanas', '["cabañas", "precios", "cuanto", "cuesta", "informacion"]',
         '🏡 Nuestras Cabañas:\n\n1️⃣ *Cabaña del Mar* (6 personas)\n   💰 $50.000/noche (Lun-Jue)\n   💰 $65.000/noche (Vie-Dom)\n\n2️⃣ *Cabaña del Bosque* (4 personas)\n   💰 $35.000/noche (Lun-Jue)\n   💰 $45.000/noche (Vie-Dom)\n\n3️⃣ *Cabaña VIP* (8 personas)\n   💰 $80.000/noche (Lun-Jue)\n   💰 $100.000/noche (Vie-Dom)\n\n¿Te gustaría hacer una reserva?', 3),

        ('Hacer Reserva', 'reserva', '["reservar", "reserva", "quiero reservar", "agendar"]',
         '¡Perfecto! 🎉 Para crear tu reserva necesito los siguientes datos:\n\n📋 *Datos requeridos:*\n1. Tu nombre completo\n2. Teléfono de contacto\n3. RUT (opcional)\n4. Cabaña deseada\n5. Fecha de entrada (DD/MM/YYYY)\n6. Fecha de salida (DD/MM/YYYY)\n7. Cantidad de personas\n\nPor favor envíame toda esta información.', 4),

        ('Despedida', 'despedida', '["gracias", "chao", "adios", "hasta luego"]',
         '¡Gracias por contactarnos! 😊 Que tengas un excelente día. Si necesitas algo más, no dudes en escribirnos. 🌊🏡', 5);

    PRINT '✅ Plantillas de respuestas automáticas insertadas';
END
GO

-- ============================================
-- VERIFICAR CREACIÓN
-- ============================================
SELECT 'Tablas creadas correctamente' AS Status;
SELECT name AS Tabla, create_date AS FechaCreacion
FROM sys.tables
WHERE name IN ('cabanas', 'reservas_cabanas', 'mensajes_whatsapp', 'plantillas_respuestas', 'bloqueos_cabanas')
ORDER BY name;
GO

PRINT '🎉 Base de datos para Sistema de Cabañas con WhatsApp lista!';
GO
