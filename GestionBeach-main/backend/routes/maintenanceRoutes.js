// backend/routes/maintenanceRoutes.js
const express = require('express');
const router = express.Router();

// POST /api/maintenance/ring - Recibe notificación cuando alguien toca el timbre
router.post('/ring', (req, res) => {
  const { timestamp, message } = req.body;

  // 🔔 AQUÍ SE REGISTRA EL TIMBRAZO
  console.log('\n');
  console.log('╔════════════════════════════════════════╗');
  console.log('║     🔔 ¡ALGUIEN TOCÓ EL TIMBRE! 🔔    ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('⏰ Fecha/Hora:', timestamp);
  console.log('📝 Mensaje:', message);
  console.log('🌐 IP Cliente:', req.ip);
  console.log('🖥️  User-Agent:', req.headers['user-agent']);
  console.log('\n💡 Para desactivar mantenimiento:');
  console.log('   1. Abre: frontend/src/config/maintenanceConfig.js');
  console.log('   2. Cambia: isMaintenanceMode: false');
  console.log('   3. Guarda el archivo');
  console.log('   4. Recarga la página en el navegador');
  console.log('════════════════════════════════════════\n');

  // Responder al cliente
  res.json({
    success: true,
    message: 'Timbre recibido. El administrador ha sido notificado.',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
