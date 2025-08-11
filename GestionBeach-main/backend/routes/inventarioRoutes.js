// backend/routes/inventarioRoutes.js
const express = require('express');
const router = express.Router();
const InventarioController = require('../controllers/inventarioController');

// Middleware de logging para debug
router.use((req, res, next) => {
  console.log(`📦 [INVENTARIO] ${req.method} ${req.path}`, req.query, req.body);
  next();
});

// Rutas de test y diagnóstico
router.get('/test', InventarioController.testConexion);

// Rutas principales del inventario
router.get('/productos-recientes', InventarioController.obtenerProductosRecientes);
router.get('/productos-extendidos', InventarioController.obtenerProductosExtendidos);
router.get('/estadisticas', InventarioController.obtenerEstadisticas);
router.get('/producto/:id', InventarioController.obtenerProductoPorId);

// Rutas para modificar datos
router.post('/agregar-datos', InventarioController.agregarDatosAdicionales);
router.put('/producto/:id/promocion', InventarioController.cambiarPromocion);
// Agregar esta ruta
router.delete('/producto/:id', InventarioController.eliminarProducto);
// RUTAS DE WHATSAPP
router.post('/enviar-alerta-whatsapp', InventarioController.enviarAlertaWhatsApp);
router.get('/whatsapp/test', InventarioController.testWhatsApp);
router.get('/whatsapp/estado', InventarioController.estadoWhatsApp);

// RUTAS DE REPORTES PDF
router.get('/reporte/vencimientos', InventarioController.generarReporteVencimientos);
router.get('/reporte/inventario', InventarioController.generarReporteInventario);
router.get('/reporte/promociones', InventarioController.generarReportePromociones);

// RUTA PARA DATOS DE IMPRESIÓN
router.get('/impresion', InventarioController.generarDatosImpresion);

// RUTA PARA DESCARGAR PDFs
router.get('/download/:filename', InventarioController.descargarPDF);

// RUTA PARA SERVIR ARCHIVOS HTML (para vista previa)
router.get('/preview/:filename', (req, res) => {
  const { filename } = req.params;
  const htmlFilename = filename.replace('.pdf', '.html');
  const filePath = require('path').join(__dirname, '../public/reports', htmlFilename);
  
  if (require('fs').existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({
      success: false,
      message: 'Archivo de vista previa no encontrado'
    });
  }
});

// Ruta para crear tabla si no existe
router.post('/crear-tabla', InventarioController.crearTablaInventario);

// Middleware de manejo de errores específico para inventario
router.use((error, req, res, next) => {
  console.error('❌ [INVENTARIO] Error en ruta:', error);
  
  if (error.name === 'ConnectionError') {
    return res.status(503).json({
      success: false,
      message: 'Error de conexión a la base de datos',
      error: 'Database connection failed'
    });
  }
  
  if (error.name === 'RequestError') {
    return res.status(400).json({
      success: false,
      message: 'Error en la solicitud SQL',
      error: error.message
    });
  }
  
  // Error genérico
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor de inventario',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
});

module.exports = router;