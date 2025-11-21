-- ============================================
-- SCRIPT: Crear tabla transacciones_webpay
-- Descripción: Tabla para almacenar transacciones de Webpay Plus
-- ============================================

USE [tu_base_de_datos];
GO

PRINT '============================================';
PRINT 'Creando tabla transacciones_webpay';
PRINT '============================================';
PRINT '';

-- ============================================
-- CREAR TABLA transacciones_webpay
-- ============================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'transacciones_webpay')
BEGIN
    CREATE TABLE transacciones_webpay (
        id INT IDENTITY(1,1) PRIMARY KEY,
        reserva_id INT NOT NULL,
        buy_order NVARCHAR(50) NOT NULL UNIQUE,
        session_id NVARCHAR(50) NOT NULL,
        token NVARCHAR(100) NOT NULL UNIQUE,
        monto DECIMAL(10,2) NOT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'INICIADO',
        -- Estados: INICIADO, APROBADO, RECHAZADO
        authorization_code NVARCHAR(20) NULL,
        payment_type_code VARCHAR(10) NULL,
        response_code INT NULL,
        fecha_creacion DATETIME DEFAULT GETDATE(),
        fecha_confirmacion DATETIME NULL,
        CONSTRAINT FK_transacciones_reservas
            FOREIGN KEY (reserva_id) REFERENCES reservas_cabanas(id)
    );

    PRINT '✅ Tabla transacciones_webpay creada exitosamente';
    PRINT '';
END
ELSE
BEGIN
    PRINT '⚠️ La tabla transacciones_webpay ya existe';
    PRINT '';
END
GO

-- ============================================
-- CREAR ÍNDICES
-- ============================================

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_transacciones_webpay_reserva_id' AND object_id = OBJECT_ID('transacciones_webpay'))
BEGIN
    CREATE INDEX IX_transacciones_webpay_reserva_id ON transacciones_webpay(reserva_id);
    PRINT '✅ Índice IX_transacciones_webpay_reserva_id creado';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_transacciones_webpay_token' AND object_id = OBJECT_ID('transacciones_webpay'))
BEGIN
    CREATE INDEX IX_transacciones_webpay_token ON transacciones_webpay(token);
    PRINT '✅ Índice IX_transacciones_webpay_token creado';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_transacciones_webpay_buy_order' AND object_id = OBJECT_ID('transacciones_webpay'))
BEGIN
    CREATE INDEX IX_transacciones_webpay_buy_order ON transacciones_webpay(buy_order);
    PRINT '✅ Índice IX_transacciones_webpay_buy_order creado';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_transacciones_webpay_estado' AND object_id = OBJECT_ID('transacciones_webpay'))
BEGIN
    CREATE INDEX IX_transacciones_webpay_estado ON transacciones_webpay(estado);
    PRINT '✅ Índice IX_transacciones_webpay_estado creado';
END

GO

PRINT '';
PRINT '============================================';
PRINT '✅ Configuración de transacciones_webpay completada';
PRINT '============================================';
PRINT '';

-- ============================================
-- VERIFICAR LA ESTRUCTURA
-- ============================================

PRINT 'Estructura de la tabla transacciones_webpay:';
PRINT '';

SELECT
    COLUMN_NAME as Columna,
    DATA_TYPE as Tipo,
    CHARACTER_MAXIMUM_LENGTH as Longitud,
    IS_NULLABLE as Nulable,
    COLUMN_DEFAULT as Valor_Default
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'transacciones_webpay'
ORDER BY ORDINAL_POSITION;

PRINT '';
PRINT '============================================';
PRINT 'Script ejecutado exitosamente';
PRINT '============================================';
