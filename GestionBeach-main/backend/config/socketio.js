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

      // Unir a sala general
      socket.join('general');

      // Unir automáticamente a sus grupos
      try {
        const grupos = await GroupChat.find({ 'miembros.id': id, activo: true }).lean();
        for (const grupo of grupos) {
          socket.join(`grupo_${grupo._id}`);
        }
        console.log(`✅ Usuario registrado: ${nombre} (ID: ${id}) - ${grupos.length} grupos`);
      } catch (err) {
        console.log(`✅ Usuario registrado: ${nombre} (ID: ${id})`);
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
        const msg = new ChatMessage({
          de: { id: data.deId, nombre: data.deNombre },
          para: { id: null, nombre: null },
          sala: 'general',
          mensaje: data.mensaje,
          tipo: 'texto'
        });
        await msg.save();

        io.to('general').emit('nuevo_mensaje', {
          _id: msg._id,
          de: msg.de,
          para: msg.para,
          sala: 'general',
          mensaje: msg.mensaje,
          tipo: msg.tipo,
          fecha: msg.fecha
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

        const msg = new ChatMessage({
          de: { id: data.deId, nombre: data.deNombre },
          para: { id: data.paraId, nombre: data.paraNombre },
          sala: `privado_${salaPrivada}`,
          mensaje: data.mensaje,
          tipo: 'texto'
        });
        await msg.save();

        const mensajeCompleto = {
          _id: msg._id,
          de: msg.de,
          para: msg.para,
          sala: msg.sala,
          mensaje: msg.mensaje,
          tipo: msg.tipo,
          fecha: msg.fecha
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

        // Notificar a todos los miembros del grupo
        io.to(sala).emit('grupo_creado', grupoData);

        // También notificar individualmente a miembros que quizá no estén en la sala aún
        for (const m of miembrosFinales) {
          const conectado = usuariosConectados.get(m.id);
          if (conectado) {
            io.to(conectado.socketId).emit('grupo_creado', grupoData);
          }
        }

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

        const msg = new ChatMessage({
          de: { id: socket.userId, nombre: socket.userName },
          para: { id: null, nombre: null },
          sala,
          mensaje,
          tipo: 'texto'
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
          fecha: msg.fecha
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
        await ChatMessage.updateMany(
          { sala, 'de.id': { $ne: usuarioId }, leidoPor: { $ne: usuarioId } },
          { $addToSet: { leidoPor: usuarioId } }
        );
      } catch (err) {
        console.error('Error marcando leído:', err);
      }
    });

    // === OBTENER USUARIOS ACTIVOS ===
    socket.on('obtener_usuarios', () => {
      socket.emit('usuarios_actualizados', getUsuariosActivos());
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
