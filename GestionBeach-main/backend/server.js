const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');

// Cargar variables de entorno
dotenv.config();

// Crear aplicación Express
const app = express();

// CORS DINÁMICO CORREGIDO: permitir todos los orígenes necesarios
/*const allowedOrigins = [
  'http://localhost:3000',           // Desarrollo local
  'http://192.168.100.150:3000',     // Frontend en red local
  'http://190.102.248.163:80',       // Frontend público puerto 80
  'http://190.102.248.163',           // Frontend público (puerto 80 implícito)
  'http://intranet.beach.cl:80',     // Frontend intranet puerto 80
  'http://intranet.beach.cl'          // Frontend intranet (puerto 80 implícito)
];*/

const allowedOrigins = [
  'http://localhost:3000',           
  'http://192.168.100.150:3000',    
  'http://190.102.248.163',
  'https://intranet.beach.cl',
  'https://reservas.beach.cl', 
  'https://concurso.beach.cl',       
  'https://api.beach.cl'              // ⬅️ importante: tu nuevo subdominio backend
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

// 🆕 SERVIR ARCHIVOS ESTÁTICOS PARA UPLOADS (IMPORTANTE PARA EL CONCURSO)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
console.log('📁 Carpeta uploads habilitada para servir archivos estáticos');

// 🏡 SERVIR IMÁGENES DE CABAÑAS (PARA WHATSAPP)
app.use('/imagenes-cabanas', express.static(path.join(__dirname, '../frontend/src/images')));
console.log('🖼️ Carpeta de imágenes de cabañas habilitada');

// FUNCIÓN PARA VERIFICAR RUTAS MEJORADA
const loadRoute = (path, routePath) => {
  try {
    const route = require(path);
    const routeType = typeof route;
    
    console.log(`📄 Cargando ${routePath}: tipo = ${routeType}`);
    
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
  { path: './routes/estadoResultadosRoutes', route: '/api/estado-resultados' },
  // 🆕 NUEVA RUTA PARA CONCURSO DE PISCINAS
  { path: './routes/concursoPiscinasRoutes', route: '/api/concurso-piscinas' },
  // 🏡 NUEVA RUTA PARA SISTEMA DE CABAÑAS CON WHATSAPP
  { path: './routes/cabanasRoutes', route: '/api/cabanas' },
  // 🔧 NUEVA RUTA PARA MANTENIMIENTO
  { path: './routes/maintenanceRoutes', route: '/api/maintenance' },
  // 🎟️ NUEVA RUTA PARA CÓDIGOS DE DESCUENTO
  { path: './routes/codigosDescuentoRoutes', route: '/api/codigos-descuento' },
  // 💳 NUEVA RUTA PARA WEBPAY (PAGO ONLINE)
  { path: './routes/webpayRoutes', route: '/api/webpay' },
  // 🎫 NUEVA RUTA PARA SISTEMA DE TICKETS
  { path: './routes/tickets', route: '/api/tickets' },
  // ⚙️ RUTA PARA CONFIGURACIÓN DEL SISTEMA (TEMPORADA, ETC)
  { path: './routes/configuracionRoutes', route: '/api/configuracion' },
  // 📄 RUTA PARA BOLETAS Y FOLIOS (RECURSOS HUMANOS)
  { path: './routes/boletasFoliosRoutes', route: '/api/boletas-folios' },
  // 🔍 RUTA PARA CONSULTAR PRODUCTO (MIGRADO DE SISTEMA VIEJO)
  { path: './routes/consultarProductoRoutes', route: '/api/consultar-producto' },
  // 🔄 RUTA PARA ROTACIÓN FERRETERÍAS (MIGRADO DE SISTEMA VIEJO)
  { path: './routes/rotacionFerreteriasRoutes', route: '/api/rotacion-ferreterias' },
  // 💰 RUTA PARA RENTABILIDAD FERRETERÍAS (MIGRADO DE SISTEMA VIEJO)
  { path: './routes/rentabilidadRoutes', route: '/api/rentabilidad' },
  // 📊 RUTA PARA MÁRGENES POR VENDEDOR (MIGRADO DE SISTEMA VIEJO)
  { path: './routes/margenesRoutes', route: '/api/margenes' },
  // 📦 RUTA PARA GUÍAS (MIGRADO DE SISTEMA VIEJO)
  { path: './routes/guiasRoutes', route: '/api/guias' },
  // 📊 RUTA PARA RESUMEN VALORIZADO (MIGRADO DE SISTEMA VIEJO)
  { path: './routes/resumenValorizadoRoutes', route: '/api/resumen-valorizado' },
  // 📦 RUTA PARA STOCKS (MIGRADO DE SISTEMA VIEJO)
  { path: './routes/stocksRoutes', route: '/api/stocks' },
  { path: './routes/anulacionesRoutes', route: '/api/anulaciones' },
  { path: './routes/cargarInventarioRoutes', route: '/api/cargar-inventario' },
  // 🔐 NUEVA RUTA PARA PERMISOS MODULARES (SISTEMA GRANULAR)
  { path: './routes/permisosModularesRoutes', route: '/api/permisos-modulares' },
  // 📋 RUTA PARA RESUMEN DE PERFILES (SIN AUTH)
  { path: './routes/perfilesResumenRoutes', route: '/api/perfiles-resumen' },
  // 💬 CHAT EN TIEMPO REAL
  { path: './routes/chatRoutes', route: '/api/chat' },
  // 👥 GRUPOS DE CHAT (CRUD desde módulo admin)
  { path: './routes/gruposChatRoutes', route: '/api/grupos-chat' },
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
    const criticalTables = ['sucursales', 'empleados', 'permisos_usuario', 'participaciones_concurso'];
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

// 🆕 NUEVA RUTA DE TEST PARA CONCURSO DE PISCINAS
app.get('/api/test-concurso-piscinas', (req, res) => {
  console.log('🧪 Test de concurso de piscinas solicitado');

  res.json({
    success: true,
    message: 'Ruta de test de concurso de piscinas funcionando',
    timestamp: new Date().toISOString(),
    rutas_concurso: [
      '/api/concurso-piscinas/test',
      '/api/concurso-piscinas/participar',
      '/api/concurso-piscinas/participaciones',
      '/api/concurso-piscinas/estadisticas',
      '/api/concurso-piscinas/verificar/:numero_boleta'
    ]
  });
});

// 🏡 NUEVA RUTA DE TEST PARA SISTEMA DE CABAÑAS
app.get('/api/test-cabanas', (req, res) => {
  console.log('🧪 Test de sistema de cabañas solicitado');

  res.json({
    success: true,
    message: 'Ruta de test de sistema de cabañas funcionando',
    timestamp: new Date().toISOString(),
    rutas_cabanas: [
      '/api/cabanas/cabanas',
      '/api/cabanas/reservas',
      '/api/cabanas/disponibilidad/verificar',
      '/api/cabanas/whatsapp/webhook/incoming',
      '/api/cabanas/whatsapp/conversaciones',
      '/api/cabanas/whatsapp/test'
    ]
  });
});

// 📨 Ruta para recibir logs del cliente (frontend) y mostrarlos en la terminal del backend
app.post('/client-logs', (req, res) => {
  try {
    const { level = 'info', message = '', meta = {} } = req.body || {};
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || null;
    const timestamp = new Date().toISOString();

    // Formatear salida clara en consola
    console.log(`\n📣 CLIENT LOG - ${level.toUpperCase()} - ${timestamp}`);
    console.log(`🔹 Message: ${message}`);
    console.log('🔹 Meta:', JSON.stringify(meta, null, 2));
    console.log(`🔹 From IP: ${clientIP}\n`);

    // Retornar success para que el frontend no falle
    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Error procesando client log:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 🔍 RUTA DE DIAGNÓSTICO - Ver todas las rutas registradas
app.get('/api/routes', (req, res) => {
  const routes = [];

  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      // Ruta directa
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods).join(', ').toUpperCase()
      });
    } else if (middleware.name === 'router') {
      // Router montado
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          const path = middleware.regexp.source
            .replace('\\/?', '')
            .replace('(?=\\/|$)', '')
            .replace(/\\\//g, '/')
            .replace(/\^/g, '')
            .replace(/\$/g, '');

          routes.push({
            path: path + handler.route.path,
            methods: Object.keys(handler.route.methods).join(', ').toUpperCase()
          });
        }
      });
    }
  });

  res.json({
    success: true,
    total_routes: routes.length,
    routes: routes.sort((a, b) => a.path.localeCompare(b.path))
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

      // 🔄 SINCRONIZAR MÓDULOS AUTOMÁTICAMENTE AL INICIO
      console.log('\n🔄 === SINCRONIZANDO MÓDULOS DEL SISTEMA ===');
      try {
        const perfilesController = require('./controllers/perfilesController');

        // Importar la función de sincronización directamente
        const { sql } = require('./config/db');

        // Lista de módulos del sistema
        const modulosDelSistema = [
          'Dashboard', 'Estado Resultado', 'Monitoreo', 'Remuneraciones',
          'Inventario', 'Ventas', 'Productos', 'Supermercados', 'Ferreterías',
          'Multitiendas', 'Compras', 'Centros de Costos', 'Facturas XML',
          'Tarjeta Empleado', 'Empleados', 'Cabañas', 'Usuarios', 'Perfiles',
          'Módulos', 'Configuración', 'Correo Electrónico'
        ];

        // Verificar si modulos tiene IDENTITY
        const identityResult = await pool.request()
          .query(`SELECT COLUMNPROPERTY(OBJECT_ID('modulos'), 'id', 'IsIdentity') as IsIdentity`);

        const tieneIdentity = identityResult.recordset[0]?.IsIdentity === 1;

        if (!tieneIdentity) {
          console.warn('⚠️ La tabla modulos NO tiene IDENTITY.');
          console.warn('⚠️ Intentando insertar módulos SIN IDENTITY...');
          console.warn('⚠️ RECOMENDACIÓN: Ejecuta setup_modulos_identity.sql después');
        }

        // Intentar sincronizar aunque no tenga IDENTITY
        {
          // Sincronizar cada módulo
          let modulosCreados = 0;
          for (const nombreModulo of modulosDelSistema) {
            try {
              const existeResult = await pool.request()
                .input('nombre', sql.VarChar, nombreModulo)
                .query('SELECT id FROM modulos WHERE nombre = @nombre');

              if (existeResult.recordset.length === 0) {
                // Verificar qué columnas existen en la tabla
                const columnsResult = await pool.request()
                  .query(`
                    SELECT COLUMN_NAME
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME = 'modulos'
                  `);

                const columnas = columnsResult.recordset.map(r => r.COLUMN_NAME.toLowerCase());
                const tieneRuta = columnas.includes('ruta');
                const tieneIcono = columnas.includes('icono');

                // Insertar solo con las columnas que existen
                if (tieneRuta && tieneIcono) {
                  await pool.request()
                    .input('nombre', sql.VarChar, nombreModulo)
                    .input('descripcion', sql.VarChar, `Módulo: ${nombreModulo}`)
                    .input('ruta', sql.VarChar, `/${nombreModulo.toLowerCase().replace(/\s+/g, '-')}`)
                    .input('icono', sql.VarChar, 'extension')
                    .query(`
                      INSERT INTO modulos (nombre, descripcion, ruta, icono)
                      VALUES (@nombre, @descripcion, @ruta, @icono)
                    `);
                } else {
                  // Solo insertar nombre y descripcion
                  await pool.request()
                    .input('nombre', sql.VarChar, nombreModulo)
                    .input('descripcion', sql.VarChar, `Módulo: ${nombreModulo}`)
                    .query(`
                      INSERT INTO modulos (nombre, descripcion)
                      VALUES (@nombre, @descripcion)
                    `);
                }
                modulosCreados++;
                console.log(`  ✅ Módulo "${nombreModulo}" sincronizado`);
              }
            } catch (error) {
              console.warn(`  ⚠️ Error con módulo "${nombreModulo}":`, error.message);
            }
          }

          // Mostrar resumen
          const totalModulos = await pool.request()
            .query('SELECT COUNT(*) as total FROM modulos');
          console.log(`✅ Sincronización completada: ${modulosCreados} módulos nuevos, ${totalModulos.recordset[0].total} módulos totales`);
        }
      } catch (syncError) {
        console.warn('⚠️ Error en sincronización automática de módulos:', syncError.message);
        console.log('⚠️ Los módulos se sincronizarán en el primer uso');
      }
      console.log('===========================================\n');

    } catch (dbError) {
      console.error('❌ Error de conexión a BD:', dbError.message);
      console.log('⚠️ El servidor continuará pero algunas funciones pueden fallar');
    }

    // ============================================
    // INICIAR JOB DE LIMPIEZA DE RESERVAS PENDIENTES
    // ============================================
    try {
      const { iniciarJobLimpieza } = require('./jobs/limpiarReservasPendientes');
      iniciarJobLimpieza();
      console.log('✅ Job de limpieza de reservas pendientes iniciado');
    } catch (jobError) {
      console.error('⚠️ Error al iniciar job de limpieza:', jobError.message);
    }

    // Crear servidor HTTP para Socket.IO
    const server = http.createServer(app);

    // Conectar MongoDB y arrancar Socket.IO
    const { connectMongo } = require('./config/mongodb');
    const { setupSocketIO } = require('./config/socketio');

    connectMongo().then(() => {
      const io = setupSocketIO(server);
      app.set('io', io); // Disponible en rutas si se necesita

      // Iniciar servidor - IMPORTANTE: escuchar en 0.0.0.0 para acceso público
      server.listen(PORT, '0.0.0.0', () => {
        console.log('\n🚀 ===== SERVIDOR INICIADO =====');
        console.log(`🌐 Servidor corriendo en http://0.0.0.0:${PORT}`);
        console.log(`🏠 Red local: http://192.168.100.150:${PORT}`);
        console.log(`🌐 IP pública: http://190.102.248.163:${PORT}`);
        console.log(`🖥️ Frontend local: http://192.168.100.150:3000`);
        console.log(`🖥️ Frontend público: http://190.102.248.163`);
        console.log(`💬 Socket.IO Chat: activo en puerto ${PORT}`);
        console.log('\n📊 === RUTAS DE DIAGNÓSTICO ===');
        console.log(`🔍 Ping: http://190.102.248.163:${PORT}/api/ping`);
        console.log(`🔧 Diagnóstico BD: http://190.102.248.163:${PORT}/api/check-db`);
        console.log(`🏢 Test Sucursales: http://190.102.248.163:${PORT}/api/sucursales-quick-test`);
        console.log(`📦 Test Inventario: http://190.102.248.163:${PORT}/api/test-inventario`);
        console.log(`📈 Test Estado Resultados: http://190.102.248.163:${PORT}/api/test-estado-resultados`);
        console.log(`🏊 Test Concurso Piscinas: http://190.102.248.163:${PORT}/api/test-concurso-piscinas`);
        console.log(`🏡 Test Sistema Cabañas: http://190.102.248.163:${PORT}/api/test-cabanas`);
        console.log(`📱 WhatsApp Test: http://190.102.248.163:${PORT}/api/cabanas/whatsapp/test`);
        console.log('\n✅ === SERVIDOR LISTO ===\n');

        // CORS permitidos para referencia
        console.log('🔐 CORS Origins permitidos:');
        allowedOrigins.forEach(origin => console.log(`   - ${origin}`));
        console.log(`   - Y cualquier origin en modo development\n`);
      });
    }).catch(err => {
      console.error('⚠️ MongoDB no disponible, iniciando sin chat:', err.message);
      // Iniciar sin Socket.IO si MongoDB falla
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Servidor corriendo en puerto ${PORT} (sin chat)`);
      });
    });
    
  } catch (error) {
    console.error('💥 Error crítico al iniciar servidor:', error);
    process.exit(1);
  }
}; 

// Iniciar servidor
startServer();