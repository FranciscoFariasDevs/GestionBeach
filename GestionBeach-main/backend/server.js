const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
dotenv.config();

// Crear aplicación Express
const app = express();

  // CORS DINÁMICO CORREGIDO: permitir todos los orígenes necesarios
  const allowedOrigins = [
    'http://localhost:3000',           // Desarrollo local
    'http://192.168.100.150:3000',     // Frontend en red local
    'http://190.102.248.163:80',       // Frontend público puerto 80
    'http://190.102.248.163',          // Frontend público (puerto 80 implícito)
  ];

const corsOptions = {
  origin: (origin, callback) => {
    console.log(`🔍 CORS Request from origin: ${origin}`);
       
    // Si no hay origin (Postman, apps móviles, etc.), permitir
    if (!origin) {
      console.log('✅ CORS: No origin, allowing request');
      return callback(null, true);
    }
    
    // Si está en la lista de orígenes permitidos
    if (allowedOrigins.includes(origin)) {
      console.log(`✅ CORS: Origin ${origin} is allowed`);
      callback(null, true);
    } else {
      // En desarrollo, loguear pero NO bloquear orígenes desconocidos
      console.log(`⚠️ CORS: Origin ${origin} not in whitelist, but allowing in development`);
      if (process.env.NODE_ENV === 'development') {
        callback(null, true); // ✅ Permitir en desarrollo
      } else {
        console.error(`❌ CORS: Blocking ${origin} in production`);
        callback(new Error(`Not allowed by CORS for origin: ${origin}`));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// FUNCIÓN PARA VERIFICAR RUTAS MEJORADA
const loadRoute = (path, routePath) => {
  try {
    const route = require(path);
    const routeType = typeof route;
    
    console.log(`🔄 Cargando ${routePath}: tipo = ${routeType}`);
    
    if (routeType !== 'function') {
      console.error(`❌ ERROR: ${routePath} exporta ${routeType}, debe ser function (Router)`);
      console.error(`❌ Contenido:`, route);
      throw new Error(`${routePath} debe exportar un Router de Express`);
    }
    
    app.use(routePath, route);
    console.log(`✅ ${routePath} cargado exitosamente`);
    return true;
    
  } catch (error) {
    console.error(`💥 ERROR CARGANDO ${routePath}:`, error.message);
    return false;
  }
};

// RUTAS ESENCIALES CON MANEJO DE ERRORES
console.log('🚀 === CARGANDO RUTAS ESENCIALES ===');

// Cargar rutas críticas primero
const criticalRoutes = [
  { path: './routes/authRoutes', route: '/api/auth' },
  { path: './routes/sucursalesRoutes', route: '/api/sucursales' },
  { path: './routes/empleadosRoutes', route: '/api/empleados' }
];

criticalRoutes.forEach(({ path, route }) => {
  const loaded = loadRoute(path, route);
  if (!loaded) {
    console.error(`💥 CRÍTICO: No se pudo cargar ${route}`);
  }
});

// Cargar rutas opcionales
const optionalRoutes = [
  { path: './routes/dashboardRoutes', route: '/api/dashboard' },
  { path: './routes/ventasRoutes', route: '/api/ventas' },
  { path: './routes/tarjetaRoutes', route: '/api/tarjeta' },
  { path: './routes/productoRoutes', route: '/api/productos' },
  { path: './routes/usuariosRoutes', route: '/api/usuarios' },
  { path: './routes/perfilesRoutes', route: '/api/perfiles' },
  { path: './routes/remuneracionesRoutes', route: '/api/remuneraciones' },
  { path: './routes/modulosRoutes', route: '/api/modulos' },
  { path: './routes/inventarioRoutes', route: '/api/inventario' },
  { path: './routes/losMasVendidosRoutes', route: '/api/losmasvendidos' },
  { path: './routes/razonesSocialesRoutes', route: '/api/razonessociales' },
  { path: './routes/facturaXMLRoutes', route: '/api/facturas-xml' },
  { path: './routes/centrosCostosRoutes', route: '/api/centros-costos' },
  { path: './routes/monitoreoRoutes', route: '/api/monitoreo' },
  // 🆕 NUEVA RUTA PARA ESTADO DE RESULTADOS
  { path: './routes/estadoResultadosRoutes', route: '/api/estado-resultados' },
];

optionalRoutes.forEach(({ path, route }) => {
  const loaded = loadRoute(path, route);
  if (!loaded) {
    console.log(`⚠️ ${route} no disponible, continuando...`);
  }
});

console.log('✅ === RUTAS CARGADAS ===');

// RUTA DE DIAGNÓSTICO MEJORADA
app.get('/api/check-db', async (req, res) => {
  try {
    const { sql, poolPromise } = require('./config/db');
    const pool = await poolPromise;
    
    console.log('🔍 Verificando conexión a base de datos...');
    
    // Test de conexión básico
    const testResult = await pool.request()
      .query('SELECT GETDATE() as current_time, @@VERSION as version');
    
    // Obtener todas las tablas
    const tablesResult = await pool.request()
      .query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `);
    
    const tables = tablesResult.recordset.map(row => row.TABLE_NAME);
    
    // Verificar tablas críticas
    const criticalTables = ['sucursales', 'empleados', 'permisos_usuario'];
    const missingTables = criticalTables.filter(table => 
      !tables.some(t => t.toLowerCase() === table.toLowerCase())
    );
    
    // Test específico de sucursales
    let sucursalesTest = null;
    try {
      const sucResult = await pool.request()
        .query('SELECT COUNT(*) as total FROM sucursales');
      sucursalesTest = {
        success: true,
        count: sucResult.recordset[0].total
      };
    } catch (error) {
      sucursalesTest = {
        success: false,
        error: error.message
      };
    }
    
    return res.json({
      success: true,
      connection: {
        status: 'connected',
        timestamp: testResult.recordset[0].current_time,
        version: testResult.recordset[0].version
      },
      tables: {
        total: tables.length,
        list: tables.slice(0, 10), // Solo primeras 10
        missing: missingTables
      },
      sucursales: sucursalesTest,
      database: 'GestionBeach'
    });
    
  } catch (error) {
    console.error('❌ Error al verificar la base de datos:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al verificar la base de datos',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// NUEVA RUTA DE TEST RÁPIDO PARA SUCURSALES
app.get('/api/sucursales-quick-test', async (req, res) => {
  try {
    const { sql, poolPromise } = require('./config/db');
    const pool = await poolPromise;
    
    const result = await pool.request()
      .query(`
        SELECT TOP 5 id, nombre, tipo_sucursal
        FROM sucursales
        ORDER BY nombre
      `);
    
    return res.json({
      success: true,
      message: 'Test rápido de sucursales exitoso',
      count: result.recordset.length,
      samples: result.recordset
    });
    
  } catch (error) {
    console.error('❌ Error en test rápido:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// NUEVA RUTA PARA TEST DE CONECTIVIDAD PÚBLICA
app.get('/api/ping', (req, res) => {
  const clientIP = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   (req.connection.socket ? req.connection.socket.remoteAddress : null);
  
  console.log(`🔍 Ping recibido desde: ${clientIP}`);
  
  res.json({
    success: true,
    message: 'Backend funcionando correctamente',
    timestamp: new Date().toISOString(),
    client_ip: clientIP,
    server_info: {
      node_env: process.env.NODE_ENV,
      port: process.env.PORT || 5000
    }
  });
});

// 🆕 NUEVA RUTA DE TEST PARA ESTADO DE RESULTADOS
app.get('/api/test-estado-resultados', (req, res) => {
  console.log('🧪 Test de estado de resultados solicitado');
  
  res.json({
    success: true,
    message: 'Ruta de test de estado de resultados funcionando',
    timestamp: new Date().toISOString(),
    rutas_estado_resultados: [
      '/api/estado-resultados/test',
      '/api/estado-resultados/sucursales',
      '/api/estado-resultados/razones-sociales',
      '/api/estado-resultados/ventas',
      '/api/estado-resultados/compras',
      '/api/estado-resultados/remuneraciones',
      '/api/estado-resultados/generar'
    ]
  });
});

// NUEVA RUTA DE TEST PARA INVENTARIO
app.get('/api/test-inventario', (req, res) => {
  console.log('🧪 Test de inventario solicitado');
  
  res.json({
    success: true,
    message: 'Ruta de test de inventario funcionando',
    timestamp: new Date().toISOString(),
    rutas_inventario: [
      '/api/inventario/test',
      '/api/inventario/productos-recientes',
      '/api/inventario/productos-extendidos',
      '/api/inventario/estadisticas'
    ]
  });
});

// Servir el frontend en producción
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

// Puerto
const PORT = process.env.PORT || 5000;

// INICIAR SERVIDOR CON VERIFICACIÓN
const startServer = async () => {
  try {
    // Verificar conexión DB al inicio
    console.log('🔍 Verificando conexión a base de datos...');
    
    try {
      const { poolPromise } = require('./config/db');
      const pool = await poolPromise;
      await pool.request().query('SELECT 1 as test');
      console.log('✅ Conexión a base de datos exitosa');
    } catch (dbError) {
      console.error('❌ Error de conexión a BD:', dbError.message);
      console.log('⚠️ El servidor continuará pero algunas funciones pueden fallar');
    }
    
    // Iniciar servidor - IMPORTANTE: escuchar en 0.0.0.0 para acceso público
    app.listen(PORT, '0.0.0.0', () => {
      console.log('\n🚀 ===== SERVIDOR INICIADO =====');
      console.log(`🌐 Servidor corriendo en http://0.0.0.0:${PORT}`);
      console.log(`🏠 Red local: http://192.168.100.150:${PORT}`);
      console.log(`🌐 IP pública: http://190.102.248.163:${PORT}`);
      console.log(`🖥️ Frontend local: http://192.168.100.150:3000`);
      console.log(`🖥️ Frontend público: http://190.102.248.163`);
      console.log('\n📊 === RUTAS DE DIAGNÓSTICO ===');
      console.log(`🔍 Ping: http://190.102.248.163:${PORT}/api/ping`);
      console.log(`🔧 Diagnóstico BD: http://190.102.248.163:${PORT}/api/check-db`);
      console.log(`🏢 Test Sucursales: http://190.102.248.163:${PORT}/api/sucursales-quick-test`);
      console.log(`📦 Test Inventario: http://190.102.248.163:${PORT}/api/test-inventario`);
      console.log(`📈 Test Estado Resultados: http://190.102.248.163:${PORT}/api/test-estado-resultados`);
      console.log('\n✅ === SERVIDOR LISTO ===\n');
      
      // CORS permitidos para referencia
      console.log('🔒 CORS Origins permitidos:');
      allowedOrigins.forEach(origin => console.log(`   - ${origin}`));
      console.log(`   - Y cualquier origin en modo development\n`);
    });
    
  } catch (error) {
    console.error('💥 Error crítico al iniciar servidor:', error);
    process.exit(1);
  }
}; 

// Iniciar servidor
startServer();