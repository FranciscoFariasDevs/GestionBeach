// backend/routes/dashboardRoutes.js - SIN AUTENTICACIÓN
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// ✅ RUTA PÚBLICA SIN MIDDLEWARE DE AUTENTICACIÓN
router.post('/', dashboardController.getDashboardData);

// Ruta de prueba también pública
router.get('/test', (req, res) => {
  res.json({
    message: 'Dashboard route working - PUBLIC ACCESS',
    timestamp: new Date().toISOString(),
    status: 'OK'
  });
});

module.exports = router;