const sql = require('mssql');
require('dotenv').config();

// Configuración para la conexión a SQL Server
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    requestTimeout: 300000,   // 5 min por query — necesario para uploads de facturas/Excel
    connectionTimeout: 15000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Función para establecer conexión a la base de datos
const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    // Si la conexión es exitosa
    console.log('Conexión a SQL Server exitosa');
    console.log(`Conectado a la base de datos: ${config.database} en el puerto 1433`);
    return pool;
  })
  .catch(err => {
    // Si ocurre un error al conectar
    console.error('Error al conectar a SQL Server:', err);
    throw err;
  });

// Exportar la conexión para su uso en otros archivos
module.exports = {
  sql,
  poolPromise
};
 