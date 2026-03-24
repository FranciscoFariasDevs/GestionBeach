// backend/routes/planificacionRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');
const ctrl = require('../controllers/planificacionController');

// Configuración de multer para Excel
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/planificacion'));
  },
  filename: (req, file, cb) => {
    cb(null, `planificacion_${Date.now()}${path.extname(file.originalname)}`);
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
const uploadDir = path.join(__dirname, '../uploads/planificacion');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
try { fs.chmodSync(uploadDir, 0o777); } catch {}

// Rutas
router.get('/control-semanal',    authMiddleware, ctrl.getControlSemanal);
router.get('/compras',            authMiddleware, ctrl.getCompras);
router.get('/por-sucursal',       authMiddleware, ctrl.getComprasPorSucursal);
router.get('/proyeccion',         authMiddleware, ctrl.getProyeccion);
router.get('/proveedores',        authMiddleware, ctrl.getProveedores);
router.get('/sucursales',         authMiddleware, ctrl.getSucursalesPanificacion);
router.get('/resumen-anual',      authMiddleware, ctrl.getResumenAnual);
router.get('/compras-por-emision', authMiddleware, ctrl.getComprasPorEmision);
router.get('/detalle-emision',     authMiddleware, ctrl.getDetalleComprasPorEmision);
router.get('/desglose-sucursal',  authMiddleware, ctrl.getDesglosesSucursalSemana);

router.post('/compras', authMiddleware, ctrl.crearCompra);
router.post('/upload-excel',          authMiddleware, upload.single('excel'),    ctrl.uploadExcelEncadenados);
router.post('/upload-excel-sucursal', authMiddleware, upload.single('excel'),    ctrl.uploadExcelSucursal);
router.post('/upload-facturas',       authMiddleware, upload.single('facturas'),  ctrl.uploadFacturasPBI);
router.put('/limite',                authMiddleware, ctrl.actualizarLimite);
router.put('/nota',                  authMiddleware, ctrl.actualizarNota);
router.put('/ordenes/:orden/estado', authMiddleware, ctrl.actualizarEstadoOrden);
router.post('/deduplicar',           authMiddleware, ctrl.deduplicarCompras);
router.post('/descargar-pbi-auto',   authMiddleware, ctrl.descargarFacturasPBIAuto);
router.delete('/compras/:id', authMiddleware, ctrl.eliminarCompra);
router.put('/compras/:id/madre', authMiddleware, ctrl.marcarCompraMadre);

router.get('/alertas',         authMiddleware, ctrl.getAlertasSemanas);
router.get('/estado-sync-pbi', authMiddleware, ctrl.getEstadoSyncPBI);

// ─── No Encadenados desde ERP ──────────────────────────────────────────────────
router.get('/preview-no-encadenados-erp',  authMiddleware, ctrl.getNoEncadenadosERP);
router.post('/cargar-no-encadenados-erp',  authMiddleware, ctrl.cargarNoEncadenadosERP);
router.post('/recargar-sucursal-erp',      authMiddleware, ctrl.recargarSucursalERP);

// ─── Productos de una Orden de Compra (ERP) ────────────────────────────────────
router.get('/productos-oc', authMiddleware, ctrl.getProductosOC);

module.exports = router;
