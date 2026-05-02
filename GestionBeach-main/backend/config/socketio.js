const { Server } = require('socket.io');
const ChatMessage = require('../models/ChatMessage');
const GroupChat = require('../models/GroupChat');

// Mapa de usuarios conectados: { usuarioId: { socketId, nombre, sucursal, conectadoDesde } }
const usuariosConectados = new Map();

const setupSocketIO = (server) => {
  const io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://192.168.100.150:3000',
        'https://intranet.beach.cl',
        'https://reservas.beach.cl',
        'https://concurso.beach.cl',
        'https://api.beach.cl'
      ],
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket conectado: ${socket.id}`);

    // Helper: notificar un evento en una sala (privado, grupo o general)
    const notificarEnSala = (sala, evento, datos) => {
      if (sala === 'general') {
        io.to('general').emit(evento, datos);
      } else if (sala.startsWith('grupo_')) {
        io.to(sala).emit(evento, datos);
      } else if (sala.startsWith('privado_')) {
        // Extraer IDs numéricos del nombre de sala: privado_X_Y
        const ids = sala.replace('privado_', '').split('_').map(Number).filter(n => !isNaN(n));
        const notificados = new Set();
        for (const id of ids) {
          const u = usuariosConectados.get(id);
          if (u && !notificados.has(u.socketId)) {
            io.to(u.socketId).emit(evento, datos);
            notificados.add(u.socketId);
          }
        }
        // Asegurar que el emisor lo reciba aunque no esté en la lista
        if (!notificados.has(socket.id)) socket.emit(evento, datos);
      }
    };

    // === USUARIO SE REGISTRA ===
    socket.on('registrar_usuario', async (userData) => {
      const { id, nombre, sucursal } = userData;

      usuariosConectados.set(id, {
        socketId: socket.id,
        nombre,
        sucursal: sucursal || 'Sin asignar',
        conectadoDesde: new Date()
      });

      socket.userId = id;
      socket.userName = nombre;

      // Unir a sala general y sala personal de notificaciones
      socket.join('general');
      socket.join(`user_${id}`);

      // Unir automáticamente a sus grupos
      try {
        const grupos = await GroupChat.find({ 'miembros.id': id, activo: true }).lean();
        for (const grupo of grupos) {
          socket.join(`grupo_${grupo._id}`);
        }
        console.log(`✅ Usuario registrado: ${nombre} (ID: ${id}) - ${grupos.length} grupos`);
      } catch (err) {
        console.error(`⚠️ Usuario registrado: ${nombre} (ID: ${id}) — error al unir a grupos:`, err.message);
        socket.emit('error_grupos', { mensaje: 'No se pudieron cargar tus grupos. Recarga la página.' });
      }

      // Notificar a todos los usuarios conectados
      io.emit('usuarios_actualizados', getUsuariosActivos());
      io.emit('sistema_mensaje', {
        tipo: 'sistema',
        mensaje: `${nombre} se ha conectado`,
        fecha: new Date()
      });
    });

    // === ENVIAR MENSAJE A SALA GENERAL ===
    socket.on('mensaje_general', async (data) => {
      try {
        const tieneArchivo = !!data.archivo?.url;
        const msg = new ChatMessage({
          de: { id: data.deId, nombre: data.deNombre },
          para: { id: null, nombre: null },
          sala: 'general',
          mensaje: data.mensaje || '',
          tipo: tieneArchivo ? 'archivo' : (data.tipo === 'reunion' ? 'reunion' : 'texto'),
          ...(tieneArchivo && { archivo: data.archivo }),
          ...(data.replyTo && { replyTo: data.replyTo }),
        });
        await msg.save();

        io.to('general').emit('nuevo_mensaje', {
          _id: msg._id, de: msg.de, para: msg.para,
          sala: 'general', mensaje: msg.mensaje,
          tipo: msg.tipo, archivo: msg.archivo, fecha: msg.fecha,
          leidoPor: [], replyTo: msg.replyTo || null,
        });
      } catch (err) {
        console.error('Error guardando mensaje:', err);
        socket.emit('error_chat', { mensaje: 'Error al enviar mensaje' });
      }
    });

    // === MENSAJE PRIVADO ===
    socket.on('mensaje_privado', async (data) => {
      try {
        const salaPrivada = [data.deId, data.paraId].sort().join('_');
        const tieneArchivo = !!data.archivo?.url;

        const msg = new ChatMessage({
          de: { id: data.deId, nombre: data.deNombre },
          para: { id: data.paraId, nombre: data.paraNombre },
          sala: `privado_${salaPrivada}`,
          mensaje: data.mensaje || '',
          tipo: tieneArchivo ? 'archivo' : (data.tipo === 'reunion' ? 'reunion' : 'texto'),
          ...(tieneArchivo && { archivo: data.archivo }),
          ...(data.replyTo && { replyTo: data.replyTo }),
        });
        await msg.save();

        const mensajeCompleto = {
          _id: msg._id,
          de: msg.de,
          para: msg.para,
          sala: msg.sala,
          mensaje: msg.mensaje,
          tipo: msg.tipo,
          archivo: msg.archivo,
          fecha: msg.fecha,
          leidoPor: [],
          replyTo: msg.replyTo || null,
        };

        // Enviar al remitente
        socket.emit('nuevo_mensaje_privado', mensajeCompleto);

        // Enviar al destinatario si está conectado
        const destinatario = usuariosConectados.get(data.paraId);
        if (destinatario) {
          io.to(destinatario.socketId).emit('nuevo_mensaje_privado', mensajeCompleto);
        }
      } catch (err) {
        console.error('Error guardando mensaje privado:', err);
        socket.emit('error_chat', { mensaje: 'Error al enviar mensaje privado' });
      }
    });

    // ==============================
    // === GRUPOS - CRUD ===
    // ==============================

    // === CREAR GRUPO ===
    socket.on('crear_grupo', async (data) => {
      try {
        const { nombre, descripcion, miembros } = data;
        // miembros = [{ id, nombre, sucursal }, ...]

        // Asegurar que el creador esté en miembros
        const creador = { id: socket.userId, nombre: socket.userName, sucursal: '' };
        const miembrosFinales = [creador];
        for (const m of miembros) {
          if (m.id !== socket.userId) {
            miembrosFinales.push(m);
          }
        }

        const grupo = new GroupChat({
          nombre,
          descripcion: descripcion || '',
          miembros: miembrosFinales,
          creado_por: { id: socket.userId, nombre: socket.userName }
        });
        await grupo.save();

        const sala = `grupo_${grupo._id}`;

        // Unir al creador a la sala
        socket.join(sala);

        // Unir a los miembros que estén conectados
        for (const m of miembrosFinales) {
          const conectado = usuariosConectados.get(m.id);
          if (conectado) {
            const memberSocket = io.sockets.sockets.get(conectado.socketId);
            if (memberSocket) {
              memberSocket.join(sala);
            }
          }
        }

        const grupoData = {
          _id: grupo._id,
          nombre: grupo.nombre,
          descripcion: grupo.descripcion,
          miembros: grupo.miembros,
          creado_por: grupo.creado_por,
          fecha_creacion: grupo.fecha_creacion,
          ultima_actividad: grupo.ultima_actividad
        };

        // Notificar a los miembros conectados que no están aún en la sala
        // (el creador y quien ya se unió vía socket.join ya la recibirán desde io.to(sala))
        io.to(sala).emit('grupo_creado', grupoData);

        // Mensaje de sistema en el grupo
        const msgSistema = new ChatMessage({
          de: { id: 0, nombre: 'Sistema' },
          para: { id: null, nombre: null },
          sala,
          mensaje: `${socket.userName} creó el grupo "${nombre}"`,
          tipo: 'sistema'
        });
        await msgSistema.save();

        console.log(`👥 Grupo creado: "${nombre}" con ${miembrosFinales.length} miembros`);
      } catch (err) {
        console.error('Error creando grupo:', err);
        socket.emit('error_chat', { mensaje: 'Error al crear grupo' });
      }
    });

    // === OBTENER MIS GRUPOS ===
    socket.on('obtener_grupos', async () => {
      try {
        const grupos = await GroupChat.find({
          'miembros.id': socket.userId,
          activo: true
        }).sort({ ultima_actividad: -1 }).lean();

        socket.emit('mis_grupos', grupos);
      } catch (err) {
        console.error('Error obteniendo grupos:', err);
        socket.emit('mis_grupos', []);
      }
    });

    // === MENSAJE EN GRUPO ===
    socket.on('mensaje_grupo', async (data) => {
      try {
        const { grupoId, mensaje } = data;
        const sala = `grupo_${grupoId}`;
        const tieneArchivo = !!data.archivo?.url;

        const msg = new ChatMessage({
          de: { id: socket.userId, nombre: socket.userName },
          para: { id: null, nombre: null },
          sala,
          mensaje: mensaje || '',
          tipo: tieneArchivo ? 'archivo' : (data.tipo === 'reunion' ? 'reunion' : 'texto'),
          ...(tieneArchivo && { archivo: data.archivo }),
          ...(data.replyTo && { replyTo: data.replyTo }),
        });
        await msg.save();

        // Actualizar ultima_actividad del grupo
        await GroupChat.findByIdAndUpdate(grupoId, { ultima_actividad: new Date() });

        io.to(sala).emit('nuevo_mensaje_grupo', {
          _id: msg._id,
          de: msg.de,
          sala,
          grupoId,
          mensaje: msg.mensaje,
          tipo: msg.tipo,
          archivo: msg.archivo,
          fecha: msg.fecha,
          leidoPor: [],
          replyTo: msg.replyTo || null,
        });
      } catch (err) {
        console.error('Error guardando mensaje de grupo:', err);
        socket.emit('error_chat', { mensaje: 'Error al enviar mensaje al grupo' });
      }
    });

    // === CARGAR HISTORIAL DE GRUPO ===
    socket.on('cargar_historial_grupo', async (data) => {
      try {
        const { grupoId, limite = 50 } = data;
        const sala = `grupo_${grupoId}`;

        const mensajes = await ChatMessage.find({ sala })
          .sort({ fecha: -1 })
          .limit(limite)
          .lean();

        socket.emit('historial_grupo_cargado', {
          grupoId,
          mensajes: mensajes.reverse()
        });
      } catch (err) {
        console.error('Error cargando historial grupo:', err);
      }
    });

    // === ESCRIBIENDO EN GRUPO ===
    socket.on('escribiendo_grupo', (data) => {
      const sala = `grupo_${data.grupoId}`;
      socket.to(sala).emit('usuario_escribiendo_grupo', {
        grupoId: data.grupoId,
        id: socket.userId,
        nombre: socket.userName
      });
    });

    socket.on('dejo_escribir_grupo', (data) => {
      const sala = `grupo_${data.grupoId}`;
      socket.to(sala).emit('usuario_dejo_escribir_grupo', {
        grupoId: data.grupoId,
        id: socket.userId
      });
    });

    // === AGREGAR MIEMBRO A GRUPO ===
    socket.on('agregar_miembro_grupo', async (data) => {
      try {
        const { grupoId, miembro } = data;
        const sala = `grupo_${grupoId}`;

        await GroupChat.findByIdAndUpdate(grupoId, {
          $addToSet: { miembros: miembro }
        });

        // Unir al nuevo miembro si está conectado
        const conectado = usuariosConectados.get(miembro.id);
        if (conectado) {
          const memberSocket = io.sockets.sockets.get(conectado.socketId);
          if (memberSocket) memberSocket.join(sala);
          io.to(conectado.socketId).emit('agregado_a_grupo', { grupoId });
        }

        // Mensaje de sistema
        const msgSistema = new ChatMessage({
          de: { id: 0, nombre: 'Sistema' },
          para: { id: null, nombre: null },
          sala,
          mensaje: `${socket.userName} agregó a ${miembro.nombre} al grupo`,
          tipo: 'sistema'
        });
        await msgSistema.save();
        io.to(sala).emit('nuevo_mensaje_grupo', {
          _id: msgSistema._id, de: msgSistema.de, sala, grupoId,
          mensaje: msgSistema.mensaje, tipo: 'sistema', fecha: msgSistema.fecha
        });

        // Actualizar miembros
        const grupo = await GroupChat.findById(grupoId).lean();
        io.to(sala).emit('grupo_actualizado', grupo);
      } catch (err) {
        console.error('Error agregando miembro:', err);
      }
    });

    // === SALIR DE GRUPO ===
    socket.on('salir_grupo', async (data) => {
      try {
        const { grupoId } = data;
        const sala = `grupo_${grupoId}`;

        await GroupChat.findByIdAndUpdate(grupoId, {
          $pull: { miembros: { id: socket.userId } }
        });

        const msgSistema = new ChatMessage({
          de: { id: 0, nombre: 'Sistema' },
          para: { id: null, nombre: null },
          sala,
          mensaje: `${socket.userName} salió del grupo`,
          tipo: 'sistema'
        });
        await msgSistema.save();
        io.to(sala).emit('nuevo_mensaje_grupo', {
          _id: msgSistema._id, de: msgSistema.de, sala, grupoId,
          mensaje: msgSistema.mensaje, tipo: 'sistema', fecha: msgSistema.fecha
        });

        socket.leave(sala);

        const grupo = await GroupChat.findById(grupoId).lean();
        io.to(sala).emit('grupo_actualizado', grupo);
        socket.emit('salio_de_grupo', { grupoId });
      } catch (err) {
        console.error('Error saliendo del grupo:', err);
      }
    });

    // === USUARIO ESTÁ ESCRIBIENDO (privado/general) ===
    socket.on('escribiendo', (data) => {
      if (data.paraId) {
        const destinatario = usuariosConectados.get(data.paraId);
        if (destinatario) {
          io.to(destinatario.socketId).emit('usuario_escribiendo', {
            id: socket.userId,
            nombre: socket.userName
          });
        }
      } else {
        socket.to('general').emit('usuario_escribiendo', {
          id: socket.userId,
          nombre: socket.userName
        });
      }
    });

    socket.on('dejo_escribir', (data) => {
      if (data.paraId) {
        const destinatario = usuariosConectados.get(data.paraId);
        if (destinatario) {
          io.to(destinatario.socketId).emit('usuario_dejo_escribir', { id: socket.userId });
        }
      } else {
        socket.to('general').emit('usuario_dejo_escribir', { id: socket.userId });
      }
    });

    // === CARGAR HISTORIAL ===
    socket.on('cargar_historial', async (data) => {
      try {
        const { sala, limite = 50, antes } = data;
        const query = { sala };
        if (antes) query.fecha = { $lt: new Date(antes) };

        const mensajes = await ChatMessage.find(query)
          .sort({ fecha: -1 })
          .limit(limite)
          .lean();

        socket.emit('historial_cargado', {
          sala,
          mensajes: mensajes.reverse()
        });
      } catch (err) {
        console.error('Error cargando historial:', err);
      }
    });

    // === MARCAR COMO LEÍDO ===
    socket.on('marcar_leido', async (data) => {
      try {
        const { sala, usuarioId } = data;
        const result = await ChatMessage.updateMany(
          { sala, 'de.id': { $ne: usuarioId }, leidoPor: { $ne: usuarioId } },
          { $addToSet: { leidoPor: usuarioId } }
        );
        // Notificar a los demás en la sala que se leyeron los mensajes
        if (result.modifiedCount > 0) {
          const payload = { sala, lectorId: usuarioId, lectorNombre: socket.userName };
          if (sala.startsWith('privado_')) {
            // Los chats privados no usan Socket.IO rooms → enviar directamente
            const ids = sala.replace('privado_', '').split('_').map(Number).filter(n => !isNaN(n));
            const notificados = new Set();
            for (const id of ids) {
              if (id === usuarioId) continue; // no notificar al propio lector
              const u = usuariosConectados.get(id);
              if (u && !notificados.has(u.socketId)) {
                io.to(u.socketId).emit('mensajes_leidos', payload);
                notificados.add(u.socketId);
              }
            }
          } else {
            socket.to(sala).emit('mensajes_leidos', payload);
          }
        }
      } catch (err) {
        console.error('Error marcando leído:', err);
      }
    });

    // === OBTENER USUARIOS ACTIVOS ===
    socket.on('obtener_usuarios', () => {
      socket.emit('usuarios_actualizados', getUsuariosActivos());
    });

    // === EDITAR MENSAJE ===
    socket.on('editar_mensaje', async ({ mensajeId, nuevoTexto, sala }) => {
      try {
        const msg = await ChatMessage.findById(mensajeId);
        if (!msg || msg.de.id !== socket.userId) return;
        msg.mensaje   = nuevoTexto;
        msg.editado   = true;
        msg.editadoEn = new Date();
        await msg.save();
        notificarEnSala(sala, 'mensaje_editado', { mensajeId, nuevoTexto, sala });
      } catch (err) { console.error('Error editando mensaje:', err); }
    });

    // === ELIMINAR MENSAJE ===
    socket.on('eliminar_mensaje', async ({ mensajeId, sala }) => {
      try {
        const msg = await ChatMessage.findById(mensajeId);
        if (!msg || msg.de.id !== socket.userId) return;
        msg.eliminado = true;
        await msg.save();
        notificarEnSala(sala, 'mensaje_eliminado', { mensajeId, sala });
      } catch (err) { console.error('Error eliminando mensaje:', err); }
    });

    // === REACCIONAR A MENSAJE ===
    socket.on('reaccionar_mensaje', async ({ mensajeId, emoji, sala }) => {
      try {
        const msg = await ChatMessage.findById(mensajeId);
        if (!msg) return;
        if (!msg.reacciones) msg.reacciones = [];

        const existente = msg.reacciones.find(r => r.emoji === emoji);
        if (existente) {
          const idx = existente.usuarios.indexOf(socket.userId);
          if (idx >= 0) {
            existente.usuarios.splice(idx, 1);
            if (existente.usuarios.length === 0)
              msg.reacciones = msg.reacciones.filter(r => r.emoji !== emoji);
          } else {
            existente.usuarios.push(socket.userId);
          }
        } else {
          msg.reacciones.push({ emoji, usuarios: [socket.userId] });
        }

        msg.markModified('reacciones');
        await msg.save();
        const reacciones = msg.toObject().reacciones || [];
        notificarEnSala(sala, 'reaccion_actualizada', { mensajeId, reacciones, sala });
      } catch (err) { console.error('Error reaccionando:', err); }
    });

    // === DESCONEXIÓN ===
    socket.on('disconnect', () => {
      const userId = socket.userId;
      const userName = socket.userName;

      if (userId) {
        usuariosConectados.delete(userId);
        console.log(`❌ Usuario desconectado: ${userName} (ID: ${userId})`);

        io.emit('usuarios_actualizados', getUsuariosActivos());
        io.emit('sistema_mensaje', {
          tipo: 'sistema',
          mensaje: `${userName} se ha desconectado`,
          fecha: new Date()
        });
      }
    });
  });

  // Helper para obtener lista de usuarios activos
  const getUsuariosActivos = () => {
    const lista = [];
    usuariosConectados.forEach((data, id) => {
      lista.push({
        id,
        nombre: data.nombre,
        sucursal: data.sucursal,
        conectadoDesde: data.conectadoDesde
      });
    });
    return lista;
  };

  return io;
};

module.exports = { setupSocketIO };
