const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/chat/historial/:sala - Obtener historial de una sala
router.get('/historial/:sala', authMiddleware, async (req, res) => {
  try {
    const { sala } = req.params;
    const { limite = 50, antes } = req.query;

    const query = { sala };
    if (antes) query.fecha = { $lt: new Date(antes) };

    const mensajes = await ChatMessage.find(query)
      .sort({ fecha: -1 })
      .limit(parseInt(limite))
      .lean();

    res.json({ success: true, data: mensajes.reverse() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/chat/no-leidos/:usuarioId - Contar mensajes no leídos
router.get('/no-leidos/:usuarioId', authMiddleware, async (req, res) => {
  try {
    const usuarioId = parseInt(req.params.usuarioId);

    const noLeidos = await ChatMessage.countDocuments({
      'de.id': { $ne: usuarioId },
      leidoPor: { $ne: usuarioId },
      $or: [
        { sala: 'general' },
        { 'para.id': usuarioId }
      ]
    });

    res.json({ success: true, noLeidos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/chat/conversaciones/:usuarioId - Listar conversaciones privadas
router.get('/conversaciones/:usuarioId', authMiddleware, async (req, res) => {
  try {
    const usuarioId = parseInt(req.params.usuarioId);

    const conversaciones = await ChatMessage.aggregate([
      {
        $match: {
          $or: [
            { 'de.id': usuarioId, 'para.id': { $ne: null } },
            { 'para.id': usuarioId }
          ]
        }
      },
      { $sort: { fecha: -1 } },
      {
        $group: {
          _id: '$sala',
          ultimoMensaje: { $first: '$$ROOT' },
          total: { $sum: 1 }
        }
      },
      { $sort: { 'ultimoMensaje.fecha': -1 } }
    ]);

    res.json({ success: true, data: conversaciones });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
