const sql = require('mssql');
require('dotenv').config();

// Configuración para la conexión a SQL Server
const config = {
  user: 'sa',
  password: '*1beachmarket',
  server: '192.168.100.200',
  database: 'GestionBeach',
  options: {
    encrypt: false, // Desactiva la encriptación SSL
    trustServerCertificate: true, // No valida el certificado del servidor
    enableArithAbort: true
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
 