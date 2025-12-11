// Script para crear la tabla reservas_pendientes
const { sql, poolPromise } = require('../config/db');

async function crearTablaPendientes() {
  try {
    const pool = await poolPromise;

    console.log('📦 Creando tabla reservas_pendientes...');

    // Verificar si la tabla ya existe
    const checkTable = await pool.request().query(`
      SELECT * FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'reservas_pendientes'
    `);

    if (checkTable.recordset.length > 0) {
      console.log('✅ La tabla reservas_pendientes ya existe');
      process.exit(0);
    }

    // Crear tabla
    await pool.request().query(`
      CREATE TABLE reservas_pendientes (
        id INT IDENTITY(1,1) PRIMARY KEY,
        -- Datos de la reserva
        cabana_id INT NOT NULL,
        fecha_inicio DATE NOT NULL,
        fecha_fin DATE NOT NULL,
        cantidad_noches INT NOT NULL,
        cantidad_personas INT NOT NULL,
        personas_extra INT DEFAULT 0,
        precio_noche DECIMAL(10,2) NOT NULL,
        precio_total DECIMAL(10,2) NOT NULL,
        costo_personas_extra DECIMAL(10,2) DEFAULT 0,

        -- Datos del cliente
        cliente_nombre NVARCHAR(100) NOT NULL,
        cliente_apellido NVARCHAR(100) NOT NULL,
        cliente_telefono NVARCHAR(20) NOT NULL,
        cliente_email NVARCHAR(100) NOT NULL,
        cliente_rut NVARCHAR(20),
        procedencia NVARCHAR(100),

        -- Datos del vehículo
        tiene_auto BIT DEFAULT 0,
        matriculas_auto NVARCHAR(MAX),

        -- Datos de pago
        metodo_pago VARCHAR(20) DEFAULT 'webpay',
        tipo_pago VARCHAR(20) DEFAULT 'completo',
        monto_a_pagar DECIMAL(10,2) NOT NULL,

        -- Código de descuento
        codigo_descuento NVARCHAR(50),
        descuento_aplicado DECIMAL(10,2) DEFAULT 0,

        -- Tinajas (JSON)
        tinajas NVARCHAR(MAX),

        -- Notas
        notas NVARCHAR(MAX),

        -- Token de Webpay (para vincular)
        webpay_token NVARCHAR(200),

        -- Control de tiempo
        fecha_creacion DATETIME DEFAULT GETDATE(),
        fecha_expiracion DATETIME NOT NULL,

        -- Estado
        estado VARCHAR(20) DEFAULT 'pendiente'
      );
    `);

    console.log('✅ Tabla reservas_pendientes creada exitosamente');

    // Crear índices
    await pool.request().query(`
      CREATE INDEX IX_reservas_pendientes_token ON reservas_pendientes(webpay_token);
    `);
    console.log('✅ Índice IX_reservas_pendientes_token creado');

    await pool.request().query(`
      CREATE INDEX IX_reservas_pendientes_expiracion ON reservas_pendientes(fecha_expiracion, estado);
    `);
    console.log('✅ Índice IX_reservas_pendientes_expiracion creado');

    console.log('🎉 Script completado exitosamente');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error al crear tabla:', error);
    process.exit(1);
  }
}

crearTablaPendientes();
