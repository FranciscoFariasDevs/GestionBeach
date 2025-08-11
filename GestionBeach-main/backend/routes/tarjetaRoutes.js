// backend/routes/tarjetaRoutes.js
const express = require('express');
const router = express.Router();
const tarjetaController = require('../controllers/tarjetaController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');

// Configuración de multer para subir archivos
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'backend/assets/uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Proteger todas las rutas con autenticación
router.use(authMiddleware);

// Rutas para tarjetas
router.get('/barcode', tarjetaController.getBarcode);
router.post('/generar', upload.single('foto'), tarjetaController.generarTarjeta);

module.exports = router;