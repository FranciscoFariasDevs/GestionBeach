const ping = require('ping');
const sql = require('mssql');

const sucursales = [
  { id: 4, nombre: 'TOME - Lord Cochrane', direccion: 'LORD COCHRANE 1127, TOME', ip: '192.168.100.200', puerto: 1433, host: '192.168.100.200', database: 'ERIZ', user: 'sa', password: '*1beachmarket', tipo: 'SUPERMERCADO' },
  { id: 5, nombre: 'TOME - Enrique Molina', direccion: 'ENRIQUE MOLINA 596, TOME', ip: '192.168.1.150', puerto: 1433, host: '192.168.1.150', database: 'ERIZ_2', user: 'sa', password: '*1beachmarket', tipo: 'SUPERMERCADO' },
  { id: 6, nombre: 'DICHATO - Beach Market', direccion: 'DANIEL VERA 890, DICHATO', ip: '192.168.0.200', puerto: 1433, host: '192.168.0.200', database: 'BEACHMARKET', user: 'sa', password: '*1beachmarket', tipo: 'SUPERMERCADO' },
  { id: 7, nombre: 'DICHATO - Beach Market 2', direccion: 'DANIEL VERA 891, DICHATO', ip: '192.168.3.200', puerto: 1433, host: '192.168.3.200', database: 'BEACHMARKET2', user: 'sa', password: '*1beachmarket', tipo: 'SUPERMERCADO' },
  { id: 8, nombre: 'RANGUELMO - Los Cipreses', direccion: 'LOS CIPRESES 77, RANGUELMO', ip: '192.168.5.100', puerto: 1433, host: '192.168.5.100', database: 'ERIZ', user: 'sa', password: '*1beachmarket', tipo: 'SUPERMERCADO' },
  { id: 18, nombre: 'TOME - Vicente Palacios FE', direccion: 'VICENTE PALACIOS 2908, TOME', ip: '192.168.4.4', puerto: 1433, host: '192.168.4.4', database: 'SAF20_Produccion', user: 'sa', password: '*1chilemat', tipo: 'FERRETERIA' },
  { id: 19, nombre: 'TOME - Vicente Palacios MU', direccion: 'VICENTE PALACIOS 3088, TOME', ip: '192.168.4.8', puerto: 1433, host: '192.168.4.8', database: 'SAF20_Produccion', user: 'sa', password: '*1chilemat', tipo: 'MULTITIENDA' },
  { id: 20, nombre: 'CHILLAN - Rio Viejo', direccion: 'RIO VIEJO 999, CHILLAN', ip: '192.168.4.1', puerto: 1433, host: '192.168.4.1', database: 'SAF20_Produccion', user: 'sa', password: '*1chilemat', tipo: 'FERRETERIA' },
  { id: 21, nombre: 'QUIRIHUE - El Conquistador', direccion: 'RUTA EL CONQUISTADOR 1002, QUIRIHUE', ip: '192.168.4.6', puerto: 1433, host: '192.168.4.6', database: 'SAF20_Produccion', user: 'sa', password: '*1chilemat', tipo: 'FERRETERIA' },
  { id: 22, nombre: 'COELEMU - Tres Esquinas FE', direccion: 'TRES ESQUINAS S/N, COELEMU FE', ip: '192.168.4.7', puerto: 1433, host: '192.168.4.7', database: 'SAF20_Produccion', user: 'sa', password: '*1chilemat', tipo: 'FERRETERIA' },
  { id: 23, nombre: 'COELEMU - Tres Esquinas MU', direccion: 'TRES ESQUINAS S/N, COELEMU MU', ip: '192.168.4.9', puerto: 1433, host: '192.168.4.9', database: 'SAF20_Produccion', user: 'sa', password: '*1chilemat', tipo: 'MULTITIENDA' },
  { id: 24, nombre: 'TOME - Las Camelias', direccion: 'LAS CAMELIAS 39, TOME', ip: '192.168.4.5', puerto: 1433, host: '192.168.4.5', database: 'SAF20_Produccion', user: 'sa', password: '*1chilemat', tipo: 'FERRETERIA' },
  { id: 25, nombre: 'DICHATO - Ferretería Beach', direccion: 'DANIEL VERA 876, DICHATO', ip: '192.168.0.150', puerto: 1433, host: '192.168.0.150', database: 'FERRETERIA_BEACH', user: 'sa', password: '*1beachmarket', tipo: 'FERRETERIA2' },
  { id: 26, nombre: 'TRES ESQUINAS S/N, COELEMU SU', direccion: 'TRES ESQUINAS S/N, COELEMU SU', ip: '190.102.245.210', puerto: 2686, host: '190.102.245.210', database: 'ERIZ', user: 'sa', password: '*1beachmarket', tipo: 'SUPERMERCADO' }
];

async function verificarSucursal(suc) {
  try {
    // Verificar ping
    const pingRes = await ping.promise.probe(suc.host, { 
      timeout: 5,
      min_reply: 1
    });

    const pingInfo = {
      activo: pingRes.alive,
      tiempo: pingRes.alive ? Math.round(pingRes.time) : null,
      error: pingRes.alive ? null : 'Host no responde'
    };

    // Verificar base de datos solo si ping es exitoso
   let dbInfo = {
  conectado: false,
  error: null
};

try {
  const config = {
    user: suc.user,
    password: suc.password,
    server: suc.host,
    port: suc.puerto,
    database: suc.database,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    connectionTimeout: 5000,
    requestTimeout: 5000
  };

  const pool = new sql.ConnectionPool(config);
  await pool.connect();

  const result = await pool.request().query('SELECT 1 as test');

  dbInfo = {
    conectado: true,
    error: null
  };

  await pool.close();
} catch (dbErr) {
  dbInfo = {
    conectado: false,
    error:
      dbErr.message.length > 100
        ? dbErr.message.substring(0, 100) + '...'
        : dbErr.message
  };
}

    return {
      ping: pingInfo,
      baseDatos: dbInfo
    };

  } catch (error) {
    console.error(`Error verificando sucursal ${suc.id}:`, error);
    return {
      ping: {
        activo: false,
        tiempo: null,
        error: 'Error al verificar ping'
      },
      baseDatos: {
        conectado: false,
        error: 'Error al verificar base de datos'
      }
    };
  }
}

const obtenerTodas = async (req, res) => {
  try {
    console.log('Iniciando verificación de todas las sucursales...');
    
    const promises = sucursales.map(async (suc) => {
      const estado = await verificarSucursal(suc);
      return {
        id: suc.id,
        nombre: suc.nombre,
        direccion: suc.direccion,
        ip: suc.ip,
        puerto: suc.puerto,
        database: suc.database,
        tipo: suc.tipo,
        ping: estado.ping,
        baseDatos: estado.baseDatos
      };
    });

    const resultadosArray = await Promise.all(promises);
    
    console.log(`Verificación completada para ${resultadosArray.length} sucursales`);

    res.json({
      success: true,
      message: 'Estado obtenido correctamente',
      sucursales: resultadosArray,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en obtenerTodas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estado de sucursales',
      error: error.message
    });
  }
};

const obtenerPorId = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const suc = sucursales.find(s => s.id === id);

    if (!suc) {
      return res.status(404).json({
        success: false,
        message: 'Sucursal no encontrada'
      });
    }

    console.log(`Verificando sucursal ${id}...`);
    const estado = await verificarSucursal(suc);

    res.json({
      success: true,
      sucursal: {
        id: suc.id,
        nombre: suc.nombre,
        direccion: suc.direccion,
        ip: suc.ip,
        puerto: suc.puerto,
        database: suc.database,
        tipo: suc.tipo,
        ping: estado.ping,
        baseDatos: estado.baseDatos
      }
    });

  } catch (error) {
    console.error(`Error en obtenerPorId:`, error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estado de la sucursal',
      error: error.message
    });
  }
};

const obtenerEstadisticas = async (req, res) => {
  try {
    console.log('Calculando estadísticas...');
    
    let activas = 0;
    let conectadasBD = 0;
    let operativas = 0;

    const promises = sucursales.map(suc => verificarSucursal(suc));
    const estados = await Promise.all(promises);

    estados.forEach(estado => {
      if (estado.ping.activo) activas++;
      if (estado.baseDatos.conectado) conectadasBD++;
      if (estado.ping.activo && estado.baseDatos.conectado) operativas++;
    });

    res.json({
      success: true,
      estadisticas: {
        total: sucursales.length,
        activas,
        conectadasBD,
        operativas,
        inactivas: sucursales.length - activas,
        porcentajeOperativas: Math.round((operativas / sucursales.length) * 100)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en obtenerEstadisticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al calcular estadísticas',
      error: error.message
    });
  }
};

module.exports = {
  obtenerTodas,
  obtenerPorId,
  obtenerEstadisticas
};