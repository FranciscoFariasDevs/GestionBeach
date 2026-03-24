const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../config/db');
const GroupChat = require('../models/GroupChat');
const ChatMessage = require('../models/ChatMessage');
const authMiddleware = require('../middleware/authMiddleware');

// Solo super admins pueden crear/editar/eliminar grupos
const soloSuperAdmin = (req, res, next) => {
  if (!req.user?.superadmin) {
    return res.status(403).json({ success: false, message: 'Solo super admins pueden realizar esta acción' });
  }
  next();
};

// GET /api/grupos-chat/usuarios - Obtener todos los usuarios del sistema para seleccionar miembros
router.get('/usuarios', authMiddleware, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT u.id, u.username, u.nombre_completo, u.perfil_id, p.nombre as perfil_nombre
      FROM usuarios u
      LEFT JOIN perfiles p ON u.perfil_id = p.id
      ORDER BY u.nombre_completo
    `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/grupos-chat - Listar todos los grupos (admin) o mis grupos
router.get('/', authMiddleware, async (req, res) => {
  try {
    const grupos = await GroupChat.find({ activo: true })
      .sort({ ultima_actividad: -1 })
      .lean();

    res.json({ success: true, data: grupos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/grupos-chat - Crear grupo (solo super admin)
router.post('/', authMiddleware, soloSuperAdmin, async (req, res) => {
  try {
    const { nombre, descripcion, miembros } = req.body;
    const userId = req.user?.id;
    const userName = 'Soporte';

    if (!nombre || !miembros || !Array.isArray(miembros)) {
      return res.status(400).json({ success: false, message: 'nombre y miembros son requeridos' });
    }

    // Asegurar que el creador esté en miembros
    const miembrosFinales = [...miembros];
    if (!miembrosFinales.find(m => m.id === userId)) {
      miembrosFinales.unshift({ id: userId, nombre: userName, sucursal: '' });
    }

    const grupo = new GroupChat({
      nombre,
      descripcion: descripcion || '',
      miembros: miembrosFinales,
      creado_por: { id: userId, nombre: userName }
    });
    await grupo.save();

    // Mensaje de sistema
    const msg = new ChatMessage({
      de: { id: 0, nombre: 'Sistema' },
      para: { id: null, nombre: null },
      sala: `grupo_${grupo._id}`,
      mensaje: `${userName} creó el grupo "${nombre}"`,
      tipo: 'sistema'
    });
    await msg.save();

    // Notificar via socket si está disponible
    const io = req.app.get('io');
    if (io) {
      const grupoData = grupo.toObject();
      for (const m of miembrosFinales) {
        io.to(`user_${m.id}`).emit('grupo_creado', grupoData);
      }
    }

    console.log(`👥 Grupo creado via API: "${nombre}" con ${miembrosFinales.length} miembros`);

    res.json({ success: true, data: grupo });
  } catch (error) {
    console.error('Error creando grupo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/grupos-chat/:id - Actualizar grupo (solo super admin)
router.put('/:id', authMiddleware, soloSuperAdmin, async (req, res) => {
  try {
    const { nombre, descripcion, miembros } = req.body;
    const update = {};
    if (nombre) update.nombre = nombre;
    if (descripcion !== undefined) update.descripcion = descripcion;
    if (miembros) update.miembros = miembros;

    const grupo = await GroupChat.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!grupo) {
      return res.status(404).json({ success: false, message: 'Grupo no encontrado' });
    }

    res.json({ success: true, data: grupo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/grupos-chat/:id - Desactivar grupo (solo super admin)
router.delete('/:id', authMiddleware, soloSuperAdmin, async (req, res) => {
  try {
    const grupo = await GroupChat.findByIdAndUpdate(req.params.id, { activo: false }, { new: true });
    if (!grupo) {
      return res.status(404).json({ success: false, message: 'Grupo no encontrado' });
    }

    res.json({ success: true, message: 'Grupo eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
