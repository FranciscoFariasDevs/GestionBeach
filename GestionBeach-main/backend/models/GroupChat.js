const { mongoose } = require('../config/mongodb');

const groupChatSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: { type: String, default: '' },
  miembros: [{
    id: { type: Number, required: true },
    nombre: { type: String, required: true },
    sucursal: { type: String, default: '' }
  }],
  creado_por: {
    id: { type: Number, required: true },
    nombre: { type: String, required: true }
  },
  activo: { type: Boolean, default: true },
  fecha_creacion: { type: Date, default: Date.now },
  ultima_actividad: { type: Date, default: Date.now }
});

groupChatSchema.index({ 'miembros.id': 1 });
groupChatSchema.index({ activo: 1, ultima_actividad: -1 });

module.exports = mongoose.model('GroupChat', groupChatSchema);
