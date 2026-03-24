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
  mensaje: { type: String, default: '' },
  tipo: { type: String, enum: ['texto', 'sistema', 'archivo', 'reunion'], default: 'texto' },
  archivo: {
    url:    { type: String },
    nombre: { type: String },
    tipo:   { type: String, enum: ['imagen', 'pdf', 'audio', 'documento'] },
    tamaño: { type: Number }
  },
  leido: { type: Boolean, default: false },
  leidoPor: [{ type: Number }],
  replyTo: {
    id:    { type: String, default: null },
    texto: { type: String, default: null },
    de:    { type: String, default: null },
  },
  // Edición
  editado:    { type: Boolean, default: false },
  eliminado:  { type: Boolean, default: false },
  editadoEn:  { type: Date },
  // Reacciones
  reacciones: [{
    emoji:    { type: String },
    usuarios: [{ type: Number }],
  }],
  fecha: { type: Date, default: Date.now }
});

chatMessageSchema.index({ sala: 1, fecha: -1 });
chatMessageSchema.index({ 'de.id': 1, 'para.id': 1, fecha: -1 });
chatMessageSchema.index({ fecha: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
