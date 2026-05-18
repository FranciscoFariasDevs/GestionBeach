/**
 * Módulo de Megafonía IP — Socket.io namespace /megafonia
 *
 * Flujo por sesión PTT:
 *   1. Emisor  → start-transmission  { sucursalId }
 *   2. Emisor  → audio-init          <Buffer>  (EBML header del MediaRecorder)
 *   3. Emisor  → audio-chunk         <Buffer>  (fragmentos WebM/Opus cada ~200ms)
 *   4. Emisor  → stop-transmission   { sucursalId }
 *
 * El servidor almacena el último init-segment por sala para
 * receptores que se unan mientras la transmisión está activa.
 */

const setupMegafoniaSocket = (io) => {
  const ns = io.of('/megafonia');

  // sucursalId → Buffer (último init segment WebM/Opus recibido)
  const initSegments = new Map();

  // sucursalId → socket.id del emisor activo
  const activeEmitters = new Map();

  ns.on('connection', (socket) => {
    console.log(`📢 [Megafonía] Conexión: ${socket.id}`);

    // ─── RECEPTOR: unirse a la sala de una sucursal ───────────────────────
    socket.on('join-sucursal', ({ sucursalId }) => {
      if (!sucursalId) return;
      const room = `sucursal-${sucursalId}`;
      socket.join(room);
      socket.data.joinedRoom = room;
      console.log(`📢 [Megafonía] ${socket.id} → join ${room}`);

      // Si hay transmisión activa, enviar el init-segment para que el receptor
      // pueda inicializar su SourceBuffer inmediatamente
      if (activeEmitters.has(sucursalId) && initSegments.has(sucursalId)) {
        socket.emit('transmission-start', { sucursalId });
        socket.emit('audio-init', initSegments.get(sucursalId));
      }
    });

    // ─── EMISOR: iniciar transmisión ──────────────────────────────────────
    // sucursalId puede ser un ID numérico (sala específica) o 'todos' (broadcast)
    socket.on('start-transmission', ({ sucursalId }) => {
      if (!sucursalId) return;
      socket.data.emitting    = sucursalId;
      socket.data.emittingAll = sucursalId === 'todos';

      if (sucursalId === 'todos') {
        console.log(`📢 [Megafonía] start-transmission → TODAS LAS SUCURSALES`);
        // Emitir a todos los clientes conectados al namespace (broadcast global)
        socket.broadcast.emit('transmission-start', { sucursalId: 'todos' });
      } else {
        const room = `sucursal-${sucursalId}`;
        activeEmitters.set(sucursalId, socket.id);
        initSegments.delete(sucursalId);
        console.log(`📢 [Megafonía] start-transmission → ${room}`);
        ns.to(room).emit('transmission-start', { sucursalId });
      }
    });

    // ─── EMISOR: segmento de inicialización (EBML header del MediaRecorder) ──
    socket.on('audio-init', (data) => {
      const sucursalId = socket.data.emitting;
      if (!sucursalId) return;

      if (socket.data.emittingAll) {
        socket.broadcast.emit('audio-init', data);
      } else {
        initSegments.set(sucursalId, data);
        ns.to(`sucursal-${sucursalId}`).emit('audio-init', data);
      }
    });

    // ─── EMISOR: fragmento de audio normal ───────────────────────────────
    socket.on('audio-chunk', (data) => {
      const sucursalId = socket.data.emitting;
      if (!sucursalId) return;

      if (socket.data.emittingAll) {
        socket.broadcast.emit('audio-chunk', data);
      } else {
        ns.to(`sucursal-${sucursalId}`).emit('audio-chunk', data);
      }
    });

    // ─── EMISOR: fin de transmisión ───────────────────────────────────────
    socket.on('stop-transmission', ({ sucursalId }) => {
      if (!sucursalId) return;
      _finalizarTransmision(socket, sucursalId);
    });

    // ─── ALARMA: inicio (el receptor reproduce alarma.mp3 en loop) ───────────
    socket.on('alarm-start', ({ sucursalId }) => {
      if (!sucursalId) return;
      if (sucursalId === 'todos') {
        console.log(`🔔 [Megafonía] alarm-start → TODAS`);
        socket.broadcast.emit('alarm-start', { sucursalId: 'todos' });
      } else {
        console.log(`🔔 [Megafonía] alarm-start → sucursal-${sucursalId}`);
        ns.to(`sucursal-${sucursalId}`).emit('alarm-start', { sucursalId });
      }
    });

    // ─── ALARMA: parar ────────────────────────────────────────────────────────
    socket.on('alarm-stop', ({ sucursalId }) => {
      if (!sucursalId) return;
      if (sucursalId === 'todos') {
        console.log(`🔔 [Megafonía] alarm-stop → TODAS`);
        socket.broadcast.emit('alarm-stop', { sucursalId: 'todos' });
      } else {
        console.log(`🔔 [Megafonía] alarm-stop → sucursal-${sucursalId}`);
        ns.to(`sucursal-${sucursalId}`).emit('alarm-stop', { sucursalId });
      }
    });

    // ─── DESCONEXIÓN: limpiar si era un emisor activo ─────────────────────
    socket.on('disconnect', () => {
      const sucursalId = socket.data.emitting;
      if (sucursalId) _finalizarTransmision(socket, sucursalId);
      console.log(`📢 [Megafonía] Desconexión: ${socket.id}`);
    });
  });

  function _finalizarTransmision(socket, sucursalId) {
    socket.data.emitting    = null;
    socket.data.emittingAll = false;

    if (sucursalId === 'todos') {
      console.log(`📢 [Megafonía] stop-transmission → TODAS`);
      socket.broadcast.emit('transmission-end', { sucursalId: 'todos' });
      return;
    }

    if (activeEmitters.get(sucursalId) !== socket.id) return;
    activeEmitters.delete(sucursalId);
    console.log(`📢 [Megafonía] stop-transmission → sucursal-${sucursalId}`);
    ns.to(`sucursal-${sucursalId}`).emit('transmission-end', { sucursalId });
  }
};

module.exports = setupMegafoniaSocket;
