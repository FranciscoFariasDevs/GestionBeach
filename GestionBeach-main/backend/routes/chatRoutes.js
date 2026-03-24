const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const ChatMessage  = require('../models/ChatMessage');
const authMiddleware = require('../middleware/authMiddleware');

// ─── Directorio de uploads de chat ───────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '../uploads/chat');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
try { fs.chmodSync(UPLOAD_DIR, 0o777); } catch {}

// ─── Multer: 5 MB, imágenes + PDF + documentos Word/Excel ────────────────────
const TIPOS_PERMITIDOS = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Audio
  'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4',
  'audio/wav', 'audio/x-m4a', 'audio/aac',
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const rand = Math.random().toString(36).slice(2, 9);
    cb(null, `chat_${Date.now()}_${rand}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB (audios pueden pesar más)
  fileFilter: (req, file, cb) => {
    // Normalizar MIME: strip parámetros como "audio/webm;codecs=opus" → "audio/webm"
    const mimeBase = file.mimetype.split(';')[0].trim();
    if (TIPOS_PERMITIDOS.includes(mimeBase)) cb(null, true);
    else cb(new Error('Tipo de archivo no permitido. Se aceptan imágenes, audio, PDF, Word y Excel.'));
  },
});

// ─── Limpieza automática: eliminar archivos de chat > 3 días ─────────────────
function limpiarArchivosChat() {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) return;
    const LIMITE = Date.now() - 3 * 24 * 60 * 60 * 1000; // 3 días en ms
    const archivos = fs.readdirSync(UPLOAD_DIR);
    let eliminados = 0;
    archivos.forEach(nombre => {
      const ruta = path.join(UPLOAD_DIR, nombre);
      try {
        const stat = fs.statSync(ruta);
        if (stat.mtimeMs < LIMITE) {
          fs.unlinkSync(ruta);
          eliminados++;
        }
      } catch { /* ignorar errores individuales */ }
    });
    if (eliminados > 0) console.log(`🗑️  Chat cleanup: ${eliminados} archivo(s) eliminados (>3 días)`);
  } catch (err) {
    console.error('Error en limpieza de archivos chat:', err.message);
  }
}

// Ejecutar al arrancar y cada 24 horas
limpiarArchivosChat();
setInterval(limpiarArchivosChat, 24 * 60 * 60 * 1000);

// ─── GET /api/chat/file/:filename ─────────────────────────────────────────────
// Sin authMiddleware para que <img src="..."> funcione sin header Authorization
router.get('/file/:filename', (req, res) => {
  const filename = path.basename(req.params.filename); // evitar path traversal
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado' });
  res.sendFile(filePath);
});

// ─── POST /api/chat/upload ────────────────────────────────────────────────────
router.post('/upload', authMiddleware, upload.single('archivo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });

  const mime = req.file.mimetype;
  let tipo = 'documento';
  if (mime.startsWith('image/'))           tipo = 'imagen';
  else if (mime === 'application/pdf')     tipo = 'pdf';
  else if (mime.startsWith('audio/'))      tipo = 'audio';

  res.json({
    url:    `/api/chat/file/${req.file.filename}`,
    nombre: req.file.originalname,
    tipo,
    tamaño: req.file.size,
  });
});

// ─── Manejo de error de multer ────────────────────────────────────────────────
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE')
      return res.status(400).json({ error: 'El archivo excede el límite de 10 MB' });
  }
  if (err) return res.status(400).json({ error: err.message });
  next();
});

// ─── GET /api/chat/historial/:sala ────────────────────────────────────────────
router.get('/historial/:sala', authMiddleware, async (req, res) => {
  try {
    const { sala } = req.params;
    const { limite = 50, antes, buscar } = req.query;
    const query = { sala };
    if (antes) query.fecha = { $lt: new Date(antes) };
    if (buscar?.trim()) query.mensaje = { $regex: buscar.trim(), $options: 'i' };
    const mensajes = await ChatMessage.find(query)
      .sort({ fecha: -1 })
      .limit(parseInt(limite))
      .lean();
    res.json({ success: true, data: mensajes.reverse() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/chat/no-leidos/:usuarioId ──────────────────────────────────────
router.get('/no-leidos/:usuarioId', authMiddleware, async (req, res) => {
  try {
    const usuarioId = parseInt(req.params.usuarioId);
    const noLeidos = await ChatMessage.countDocuments({
      'de.id':    { $ne: usuarioId },
      leidoPor:   { $ne: usuarioId },
      $or: [{ sala: 'general' }, { 'para.id': usuarioId }]
    });
    res.json({ success: true, noLeidos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/chat/conversaciones/:usuarioId ─────────────────────────────────
router.get('/conversaciones/:usuarioId', authMiddleware, async (req, res) => {
  try {
    const usuarioId = parseInt(req.params.usuarioId);
    const raw = await ChatMessage.aggregate([
      {
        $match: {
          sala: { $regex: /^privado_/ },
          $or: [
            { 'de.id': usuarioId },
            { 'para.id': usuarioId }
          ]
        }
      },
      { $sort: { fecha: -1 } },
      { $group: { _id: '$sala', ultimoMsg: { $first: '$$ROOT' } } },
      { $sort: { 'ultimoMsg.fecha': -1 } }
    ]);

    const conversaciones = raw
      .map(conv => {
        const msg = conv.ultimoMsg;
        const esEmisor = msg.de.id === usuarioId;
        const otroId   = esEmisor ? msg.para?.id   : msg.de.id;
        const otroNombre = esEmisor ? msg.para?.nombre : msg.de.nombre;
        if (!otroId) return null;
        return {
          otroId,
          otroNombre: otroNombre || 'Usuario',
          sala: conv._id,
          ultimoMensaje: msg.eliminado
            ? 'Mensaje eliminado'
            : msg.tipo === 'archivo'
              ? (msg.archivo?.tipo === 'imagen' ? '📷 Foto' : msg.archivo?.tipo === 'audio' ? '🎤 Audio' : `📎 ${msg.archivo?.nombre || 'Archivo'}`)
              : msg.tipo === 'reunion' ? '📹 Reunión'
              : (msg.mensaje || ''),
          fecha: msg.fecha,
        };
      })
      .filter(Boolean);

    res.json({ success: true, conversaciones });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
