// backend/routes/organigramaRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/authMiddleware');
const ctrl = require('../controllers/organigramaController');

// Asegurar carpeta de uploads
const uploadDir = path.join(__dirname, '../uploads/organigrama');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `foto_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Solo se permiten imágenes (jpg, png, gif, webp)'));
  },
});

// Boards (antes de /:id para que no haya conflicto de rutas)
router.get('/boards',                  authMiddleware, ctrl.getBoards);
router.post('/boards',                 authMiddleware, ctrl.crearBoard);
router.post('/boards/:id/duplicar',    authMiddleware, ctrl.duplicarBoard);
router.put('/boards/:id',              authMiddleware, ctrl.actualizarBoard);
router.delete('/boards/:id',           authMiddleware, ctrl.eliminarBoard);

// Nodos
router.get('/todos-trabajadores',      authMiddleware, ctrl.getTodosLosTrabajadores);
router.get('/',                        authMiddleware, ctrl.getNodos);
router.post('/guardar',                authMiddleware, ctrl.guardarNodos);
router.delete('/:id',                  authMiddleware, ctrl.eliminarNodo);
router.post('/foto',                   authMiddleware, upload.single('foto'), ctrl.subirFoto);

// Relaciones
router.get('/relaciones',              authMiddleware, ctrl.getRelaciones);
router.post('/relaciones',             authMiddleware, ctrl.crearRelacion);
router.put('/relaciones/:id',          authMiddleware, ctrl.actualizarRelacion);
router.delete('/relaciones/:id',       authMiddleware, ctrl.eliminarRelacion);

module.exports = router;
