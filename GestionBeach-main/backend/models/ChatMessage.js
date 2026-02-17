const { mongoose } = require('../config/mongodb');

const chatMessageSchema = new mongoose.Schema({
  de: {
    id: { type: Number, required: true },
    nombre: { type: String, required: true }
  },
  para: {
    id: { type: Number, default: null },
    nombre: { type: String, default: null }
  },
  sala: { type: String, default: 'general' },
  mensaje: { type: String, required: true },
  tipo: { type: String, enum: ['texto', 'sistema', 'archivo'], default: 'texto' },
  leido: { type: Boolean, default: false },
  leidoPor: [{ type: Number }],
  fecha: { type: Date, default: Date.now }
});

chatMessageSchema.index({ sala: 1, fecha: -1 });
chatMessageSchema.index({ 'de.id': 1, 'para.id': 1, fecha: -1 });
chatMessageSchema.index({ fecha: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
