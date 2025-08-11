const express = require('express');
const router = express.Router();

const { 
  obtenerTodas, 
  obtenerPorId, 
  obtenerEstadisticas
} = require('../controllers/monitoreoController');

// Rutas básicas de monitoreo
router.get('/estado/todas', obtenerTodas);
router.get('/estado/sucursal/:id', obtenerPorId);
router.get('/estadisticas', obtenerEstadisticas);

// Ruta de prueba
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Rutas de monitoreo funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;