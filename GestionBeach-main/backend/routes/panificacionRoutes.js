// backend/routes/panificacionRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');
const ctrl = require('../controllers/panificacionController');

// Configuración de multer para Excel
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/panificacion'));
  },
  filename: (req, file, cb) => {
    cb(null, `panificacion_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls'].includes(ext)) cb(null, true);
    else cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'));
  }
});

// Crear directorio de uploads si no existe
const fs = require('fs');
const uploadDir = path.join(__dirname, '../uploads/panificacion');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Rutas
router.get('/control-semanal',    authMiddleware, ctrl.getControlSemanal);
router.get('/compras',            authMiddleware, ctrl.getCompras);
router.get('/por-sucursal',       authMiddleware, ctrl.getComprasPorSucursal);
router.get('/proyeccion',         authMiddleware, ctrl.getProyeccion);
router.get('/proveedores',        authMiddleware, ctrl.getProveedores);
router.get('/sucursales',         authMiddleware, ctrl.getSucursalesPanificacion);
router.get('/resumen-anual',      authMiddleware, ctrl.getResumenAnual);
router.get('/desglose-sucursal',  authMiddleware, ctrl.getDesglosesSucursalSemana);

router.post('/compras', authMiddleware, ctrl.crearCompra);
router.post('/upload-excel', authMiddleware, upload.single('excel'), ctrl.uploadExcelEncadenados);
router.put('/limite', authMiddleware, ctrl.actualizarLimite);
router.delete('/compras/:id', authMiddleware, ctrl.eliminarCompra);

module.exports = router;
