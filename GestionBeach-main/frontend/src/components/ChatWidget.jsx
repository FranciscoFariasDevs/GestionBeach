import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Badge, Fab, Paper, Typography, TextField, IconButton, Avatar,
  List, ListItem, ListItemAvatar, ListItemText, Divider, Chip, Tooltip,
  Slide, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Checkbox, FormControlLabel, CircularProgress, Collapse, Popover,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Close as CloseIcon,
  Send as SendIcon,
  Circle as CircleIcon,
  People as PeopleIcon,
  Forum as ForumIcon,
  ArrowBack as ArrowBackIcon,
  GroupAdd as GroupAddIcon,
  Groups as GroupsIcon,
  ExitToApp as ExitIcon,
  PersonAdd as PersonAddIcon,
  AttachFile as AttachFileIcon,
  InsertDriveFile as FileIcon,
  PictureAsPdf as PdfIcon,
  Download as DownloadIcon,
  Reply as ReplyIcon,
  DoneAll as DoneAllIcon,
  Done as DoneIcon,
  EmojiEmotions as EmojiIcon,
  ErrorOutline as ErrorIcon,
  Mic as MicIcon,
  Stop as StopRecIcon,
  Headphones as AudioIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  SearchOff as SearchOffIcon,
  ZoomIn as ZoomInIcon,
  Block as BlockIcon,
  Gif as GifIcon,
  History as HistoryIcon,
  VideoCall as VideoCallIcon,
} from '@mui/icons-material';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import api, { getStaticFileURL } from '../api/api';

// ─── Compresor de imágenes (Canvas) ──────────────────────────────────────────
// Reduce la imagen a máx. 1280px en su lado más largo y la convierte a JPEG 0.82.
// Si el archivo ya es pequeño (< 300 KB) o no es imagen, lo devuelve sin cambios.
const comprimirImagen = (file) => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/') || file.size < 300 * 1024) {
      return resolve(file); // No comprimir imágenes ya livianas o no-imagen
    }
    const MAX_DIM = 1280;
    const QUALITY = 0.82;
    const reader  = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width >= height) { height = Math.round((height * MAX_DIM) / width); width = MAX_DIM; }
          else                 { width  = Math.round((width  * MAX_DIM) / height); height = MAX_DIM; }
        }
        const canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const nombre = file.name.replace(/\.[^.]+$/, '') + '.jpg';
            resolve(new File([blob], nombre, { type: 'image/jpeg', lastModified: Date.now() }));
          },
          'image/jpeg',
          QUALITY
        );
      };
      img.onerror = () => resolve(file);
      img.src = ev.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

// ─── Config ───────────────────────────────────────────────────────────────────
const getSocketURL = () => {
  const hostname = window.location.hostname;
  switch (hostname) {
    case 'localhost': case '127.0.0.1': return 'http://localhost:5000';
    case '192.168.100.150': return 'http://192.168.100.150:5000';
    case 'intranet.beach.cl': case 'concurso.beach.cl': case 'reservas.beach.cl': return 'https://api.beach.cl';
    default: return 'http://192.168.100.150:5000';
  }
};
const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || getSocketURL();

// ─── Emojis frecuentes ────────────────────────────────────────────────────────
const EMOJIS = [
  '😀','😂','😍','🥰','😎','🤔','😅','🙌','👏','❤️',
  '🔥','✅','🎉','💪','👍','🫡','🙏','😢','😡','🤣',
  '⭐','✨','💡','📌','🚀','🏖️','😮','🤦','👌','💯',
  '😴','🫶','🥳','😬','🤩','😊','🫠','💀','👀','🎯',
];

// Reacciones rápidas (8 emojis más usados)
const REACCIONES_RAPIDAS = ['👍','❤️','😂','😮','😢','🔥','👏','✅'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatHora = (fecha) =>
  new Date(fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

const formatFechaGrupo = (fecha) => {
  const d = new Date(fecha);
  const hoy = new Date();
  const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
  if (d.toDateString() === hoy.toDateString()) return 'Hoy';
  if (d.toDateString() === ayer.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
};

const getInitials = (n) => (!n ? '?' : n.split(' ').map(x => x[0]).join('').substring(0, 2).toUpperCase());
const colorFromId = (id) => ['#1565c0','#2e7d32','#c62828','#6a1b9a','#ef6c00','#00838f','#4527a0','#d84315'][(id||0)%8];
const colorGrupo = (nombre) => {
  let h = 0;
  for (let i = 0; i < (nombre||'').length; i++) h = nombre.charCodeAt(i) + ((h<<5)-h);
  return ['#1565c0','#2e7d32','#c62828','#6a1b9a','#ef6c00','#00838f','#4527a0','#d84315'][Math.abs(h)%8];
};

// ─── Helper: sala única para Jitsi Meet ──────────────────────────────────────
const generarSalaReunion = () => {
  const rand = () => Math.random().toString(36).slice(2, 6);
  return `beach-${rand()}-${rand()}-${rand()}`;
};

// ─── Helper: resaltar coincidencias de búsqueda ───────────────────────────────
const resaltarTexto = (texto, termino) => {
  if (!termino || !texto) return texto;
  const idx = texto.toLowerCase().indexOf(termino.toLowerCase());
  if (idx === -1) return texto;
  return (
    <>
      {texto.slice(0, idx)}
      <mark style={{ background: '#fff176', color: '#000', borderRadius: 2, padding: '0 1px' }}>
        {texto.slice(idx, idx + termino.length)}
      </mark>
      {texto.slice(idx + termino.length)}
    </>
  );
};

// ─── LocalStorage cache ───────────────────────────────────────────────────────
const CACHE_PREFIX = 'chatcache_';
const cacheGuardar = (sala, msgs) => {
  try { localStorage.setItem(CACHE_PREFIX + sala, JSON.stringify(msgs.slice(-80))); } catch {}
};
const cacheLeer = (sala) => {
  try { const d = localStorage.getItem(CACHE_PREFIX + sala); return d ? JSON.parse(d) : null; } catch { return null; }
};

// ─── Sonido de notificación ───────────────────────────────────────────────────
const playNotifSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(); osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => ctx.close();
  } catch {}
};

// ─── Panel de Emojis ──────────────────────────────────────────────────────────
function EmojiPanel({ onSelect, onClose }) {
  return (
    <Paper elevation={4} sx={{
      position: 'absolute', bottom: '100%', left: 0, mb: 0.5, zIndex: 10,
      p: 1, borderRadius: 2, width: 260,
      display: 'flex', flexWrap: 'wrap', gap: 0.2,
      boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
    }}>
      {EMOJIS.map(e => (
        <Box key={e} onClick={() => { onSelect(e); onClose(); }}
          sx={{ fontSize: '1.25rem', cursor: 'pointer', p: 0.4, borderRadius: 1,
            '&:hover': { bgcolor: 'action.hover', transform: 'scale(1.2)' }, transition: 'transform .1s' }}>
          {e}
        </Box>
      ))}
    </Paper>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ChatWidget() {
  const { user } = useAuth();

  // UI
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0); // 0=general, 1=contactos, 2=grupos
  const [showEmojis, setShowEmojis] = useState(false);

  // Socket
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  // Mensajes
  const [mensajes, setMensajes] = useState(() => cacheLeer('general') || []);
  const [mensajesPrivados, setMensajesPrivados] = useState({});
  const [mensajesGrupo, setMensajesGrupo] = useState({});
  const [mensaje, setMensaje] = useState('');

  // Usuarios y grupos
  const [usuarios, setUsuarios] = useState([]);
  const [contactosPrevios, setContactosPrevios] = useState([]);
  const [grupos, setGrupos] = useState([]);

  // Chat activo
  const [chatPrivadoCon, setChatPrivadoCon] = useState(null);
  const [grupoActual, setGrupoActual] = useState(null);

  // Typing
  const [escribiendo, setEscribiendo] = useState(null);
  const [escribiendoGrupo, setEscribiendoGrupo] = useState(null);
  const typingTimeoutRef = useRef(null);

  // No leídos
  const [noLeidos, setNoLeidos] = useState(0);
  const [noLeidosPrivados, setNoLeidosPrivados] = useState({});
  const [noLeidosGrupos, setNoLeidosGrupos] = useState({});

  // Modales
  const [modalGrupo, setModalGrupo] = useState(false);
  const [nuevoGrupoNombre, setNuevoGrupoNombre] = useState('');
  const [miembrosSeleccionados, setMiembrosSeleccionados] = useState([]);
  const [modalAgregar, setModalAgregar] = useState(false);

  // Visores
  const [verImagen, setVerImagen] = useState(null);
  const [verPDF, setVerPDF] = useState(null); // { url, nombre }

  // Reply + archivo
  const [replyTo, setReplyTo] = useState(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  // Edición de mensajes
  const [editando, setEditando] = useState(null); // { id, textoOriginal, sala }

  // Reacciones popover
  const [reaccionAnchor, setReaccionAnchor] = useState(null);
  const [reaccionMsg, setReaccionMsg] = useState(null);

  // Búsqueda
  const [busqueda, setBusqueda] = useState('');
  const [mostrarBusqueda, setMostrarBusqueda] = useState(false);
  const [busquedaServidor, setBusquedaServidor] = useState([]);
  const [buscandoServidor, setBuscandoServidor] = useState(false);

  // Crear grupo
  const [creandoGrupo, setCreandoGrupo] = useState(false);

  // Grabación de audio
  const [audioRecording, setAudioRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);

  // GIF picker
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifBusqueda, setGifBusqueda] = useState('');
  const [gifs, setGifs] = useState([]);
  const [gifCargando, setGifCargando] = useState(false);
  const gifInputRef = useRef(null);

  // Confirmación eliminar mensaje
  const [mensajeAEliminar, setMensajeAEliminar] = useState(null);

  // Reuniones
  const [enlaceReunion, setEnlaceReunion] = useState('');

  // Separador de mensajes no leídos
  const [dividerMsgId, setDividerMsgId] = useState(null);

  // Scroll infinito
  const [hayMasMensajes, setHayMasMensajes] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const prevScrollHeightRef = useRef(0);
  const isLoadingMoreRef = useRef(false);

  // Scroll
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Refs para handlers de socket
  const openRef = useRef(false);
  const chatPrivadoConRef = useRef(null);
  const grupoActualRef = useRef(null);
  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { chatPrivadoConRef.current = chatPrivadoCon; }, [chatPrivadoCon]);
  useEffect(() => { grupoActualRef.current = grupoActual; }, [grupoActual]);

  // ─── Búsqueda en servidor (debounced) ───────────────────────────────────
  useEffect(() => {
    setBusquedaServidor([]);
    if (!busqueda.trim() || busqueda.trim().length < 2) return;
    const sala = getSalaActual ? getSalaActual() : 'general';
    const timer = setTimeout(async () => {
      setBuscandoServidor(true);
      try {
        const res = await api.get(`/chat/historial/${encodeURIComponent(sala)}?limite=100&buscar=${encodeURIComponent(busqueda.trim())}`);
        setBusquedaServidor(res.data?.data || []);
      } catch { /* ignorar */ }
      finally { setBuscandoServidor(false); }
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, grupoActual, chatPrivadoCon]);

  // ─── Resetear búsqueda y GIF picker al cambiar de chat ──────────────────
  useEffect(() => {
    setBusqueda('');
    setBusquedaServidor([]);
    setMostrarBusqueda(false);
    setEditando(null);
    setMensaje('');
    setShowGifPicker(false);
    setGifBusqueda('');
    setGifs([]);
    setHayMasMensajes(false);
    setDividerMsgId(null);
  }, [tab, chatPrivadoCon, grupoActual]);

  // ─── Cargar conversaciones previas (offline) ────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    api.get(`/chat/conversaciones/${user.id}`)
      .then(r => setContactosPrevios(r.data?.conversaciones || []))
      .catch(() => {});
  }, [user?.id]);

  // ─── Conectar socket ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const s = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    s.on('connect', () => {
      setConnected(true);
      s.emit('registrar_usuario', {
        id: user.id,
        nombre: user.nombre || user.username || 'Usuario',
        sucursal: user.sucursal || '',
      });
      s.emit('cargar_historial', { sala: 'general', limite: 60 });
      s.emit('obtener_grupos');
    });

    s.on('disconnect', () => setConnected(false));

    s.on('usuarios_actualizados', (lista) => {
      setUsuarios(lista.filter(u => u.id !== user.id));
    });

    s.on('historial_cargado', (data) => {
      setHayMasMensajes(data.mensajes.length >= 60);
      if (data.sala === 'general') {
        setMensajes(data.mensajes);
        cacheGuardar('general', data.mensajes);
      } else {
        setMensajesPrivados(prev => {
          const updated = { ...prev, [data.sala]: data.mensajes };
          cacheGuardar(data.sala, data.mensajes);
          return updated;
        });
      }
    });

    s.on('nuevo_mensaje', (msg) => {
      setMensajes(prev => {
        const updated = [...prev, msg];
        cacheGuardar('general', updated);
        return updated;
      });
      if (msg.de.id !== user.id) {
        const viendoGeneral = openRef.current && !chatPrivadoConRef.current && !grupoActualRef.current;
        if (viendoGeneral) {
          s.emit('marcar_leido', { sala: 'general', usuarioId: user.id });
        } else {
          setNoLeidos(prev => prev + 1);
          playNotifSound();
        }
      }
    });

    s.on('nuevo_mensaje_privado', (msg) => {
      const sala = msg.sala;
      setMensajesPrivados(prev => {
        const updated = { ...prev, [sala]: [...(prev[sala] || []), msg] };
        cacheGuardar(sala, updated[sala]);
        return updated;
      });
      if (msg.de.id !== user.id) {
        const otroId = msg.de.id;
        const viendoEsaConv = openRef.current && chatPrivadoConRef.current?.id === otroId;
        if (viendoEsaConv) {
          s.emit('marcar_leido', { sala, usuarioId: user.id });
        } else {
          setNoLeidosPrivados(prev => ({ ...prev, [otroId]: (prev[otroId] || 0) + 1 }));
          playNotifSound();
        }
        setContactosPrevios(prev => {
          const existe = prev.find(c => c.otroId === otroId);
          const previewMsg = msg.tipo === 'archivo'
            ? (msg.archivo?.tipo === 'imagen' ? '📷 Foto' : msg.archivo?.tipo === 'audio' ? '🎤 Audio' : `📎 ${msg.archivo?.nombre || 'Archivo'}`)
            : msg.tipo === 'reunion' ? '📹 Reunión'
            : (msg.mensaje || '');
          if (existe) return prev.map(c => c.otroId === otroId ? { ...c, ultimoMensaje: previewMsg, fecha: msg.fecha } : c);
          return [{ otroId, otroNombre: msg.de.nombre, ultimoMensaje: previewMsg, fecha: msg.fecha, sala }, ...prev];
        });
      }
    });

    // Grupos
    s.on('mis_grupos', (data) => setGrupos(data));
    s.on('grupo_creado', (grupo) => {
      setGrupos(prev => prev.find(g => g._id === grupo._id) ? prev : [grupo, ...prev]);
      setCreandoGrupo(false);
      setModalGrupo(false);
      setNuevoGrupoNombre('');
      setMiembrosSeleccionados([]);
    });
    s.on('error_grupos', ({ mensaje }) => {
      console.warn('Chat grupos error:', mensaje);
    });
    s.on('grupo_actualizado', (grupo) => setGrupos(prev => prev.map(g => g._id === grupo._id ? grupo : g)));
    s.on('agregado_a_grupo', () => s.emit('obtener_grupos'));
    s.on('salio_de_grupo', ({ grupoId }) => {
      setGrupos(prev => prev.filter(g => g._id !== grupoId));
      setGrupoActual(prev => prev?._id === grupoId ? null : prev);
    });

    s.on('historial_grupo_cargado', (data) => {
      setHayMasMensajes(data.mensajes.length >= 60);
      setMensajesGrupo(prev => {
        const updated = { ...prev, [data.grupoId]: data.mensajes };
        cacheGuardar(`grupo_${data.grupoId}`, data.mensajes);
        return updated;
      });
    });

    s.on('nuevo_mensaje_grupo', (msg) => {
      const gId = msg.grupoId;
      setMensajesGrupo(prev => {
        const updated = { ...prev, [gId]: [...(prev[gId] || []), msg] };
        cacheGuardar(`grupo_${gId}`, updated[gId]);
        return updated;
      });
      if (msg.de.id !== user.id) {
        const viendoEseGrupo = openRef.current && grupoActualRef.current?._id === gId;
        if (viendoEseGrupo) {
          s.emit('marcar_leido', { sala: `grupo_${gId}`, usuarioId: user.id });
        } else {
          setNoLeidosGrupos(prev => ({ ...prev, [gId]: (prev[gId] || 0) + 1 }));
          playNotifSound();
        }
      }
    });

    // Typing
    s.on('usuario_escribiendo', (data) => {
      setEscribiendo({ ...data, ts: Date.now() });
      clearTimeout(s._typClear);
      s._typClear = setTimeout(() => setEscribiendo(null), 3500);
    });
    s.on('usuario_dejo_escribir', () => setEscribiendo(null));

    s.on('usuario_escribiendo_grupo', (data) => {
      setEscribiendoGrupo(data);
      clearTimeout(s._typGrpClear);
      s._typGrpClear = setTimeout(() => setEscribiendoGrupo(null), 3500);
    });
    s.on('usuario_dejo_escribir_grupo', () => setEscribiendoGrupo(null));

    s.on('sistema_mensaje', (msg) => {
      setMensajes(prev => [...prev, { ...msg, _id: `sys_${Date.now()}`, de: { id: 0, nombre: 'Sistema' }, sala: 'general' }]);
    });

    s.on('mensajes_leidos', ({ sala, lectorId }) => {
      const update = (msgs) => msgs.map(m =>
        !m.leidoPor?.includes(lectorId) ? { ...m, leidoPor: [...(m.leidoPor || []), lectorId] } : m
      );
      if (sala === 'general') setMensajes(prev => update(prev));
      else if (sala.startsWith('privado_')) setMensajesPrivados(prev => ({ ...prev, [sala]: update(prev[sala] || []) }));
      else if (sala.startsWith('grupo_')) {
        const gId = sala.replace('grupo_', '');
        setMensajesGrupo(prev => ({ ...prev, [gId]: update(prev[gId] || []) }));
      }
    });

    // ── Edición / Eliminación / Reacciones ───────────────────────────────────
    s.on('mensaje_editado', ({ mensajeId, nuevoTexto, sala }) => {
      const upd = m => String(m._id) === mensajeId ? { ...m, mensaje: nuevoTexto, editado: true } : m;
      if (sala === 'general') setMensajes(prev => prev.map(upd));
      else if (sala.startsWith('privado_')) setMensajesPrivados(prev => ({ ...prev, [sala]: (prev[sala]||[]).map(upd) }));
      else if (sala.startsWith('grupo_')) { const gId = sala.replace('grupo_',''); setMensajesGrupo(prev => ({ ...prev, [gId]: (prev[gId]||[]).map(upd) })); }
    });

    s.on('mensaje_eliminado', ({ mensajeId, sala }) => {
      const upd = m => String(m._id) === mensajeId ? { ...m, eliminado: true, mensaje: '', archivo: undefined } : m;
      if (sala === 'general') {
        setMensajes(prev => { const u = prev.map(upd); cacheGuardar('general', u); return u; });
      } else if (sala.startsWith('privado_')) {
        setMensajesPrivados(prev => {
          const u = { ...prev, [sala]: (prev[sala]||[]).map(upd) };
          cacheGuardar(sala, u[sala]);
          return u;
        });
        // Refrescar preview del último mensaje en "Recientes" para evitar que muestre el nombre del archivo
        api.get(`/chat/conversaciones/${user.id}`)
          .then(r => setContactosPrevios(r.data?.conversaciones || []))
          .catch(() => {});
      } else if (sala.startsWith('grupo_')) {
        const gId = sala.replace('grupo_','');
        setMensajesGrupo(prev => {
          const u = { ...prev, [gId]: (prev[gId]||[]).map(upd) };
          cacheGuardar(`grupo_${gId}`, u[gId]);
          return u;
        });
      }
    });

    s.on('reaccion_actualizada', ({ mensajeId, reacciones, sala }) => {
      const upd = m => String(m._id) === mensajeId ? { ...m, reacciones } : m;
      if (sala === 'general') setMensajes(prev => prev.map(upd));
      else if (sala.startsWith('privado_')) setMensajesPrivados(prev => ({ ...prev, [sala]: (prev[sala]||[]).map(upd) }));
      else if (sala.startsWith('grupo_')) { const gId = sala.replace('grupo_',''); setMensajesGrupo(prev => ({ ...prev, [gId]: (prev[gId]||[]).map(upd) })); }
    });

    s.on('error_chat', (err) => console.error('Error socket chat:', err));

    socketRef.current = s;
    setSocket(s);
    return () => { s.disconnect(); };
    // eslint-disable-next-line
  }, [user?.id]);

  // Auto-scroll (no hacer scroll cuando se está cargando historial antiguo)
  useEffect(() => {
    if (isLoadingMoreRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, mensajesPrivados, mensajesGrupo, chatPrivadoCon, grupoActual]);

  // Marcar leído al abrir
  useEffect(() => {
    if (open && !chatPrivadoCon && !grupoActual) {
      setNoLeidos(0);
      socketRef.current?.emit('marcar_leido', { sala: 'general', usuarioId: user?.id });
    }
    if (open && chatPrivadoCon) setNoLeidosPrivados(prev => ({ ...prev, [chatPrivadoCon.id]: 0 }));
    if (open && grupoActual) setNoLeidosGrupos(prev => ({ ...prev, [grupoActual._id]: 0 }));
  }, [open, chatPrivadoCon, grupoActual, user?.id]);

  // ─── Sala actual ─────────────────────────────────────────────────────────
  const getSalaActual = () => {
    if (grupoActual) return `grupo_${grupoActual._id}`;
    if (chatPrivadoCon) return `privado_${[user.id, chatPrivadoCon.id].sort().join('_')}`;
    return 'general';
  };

  // ─── Enviar / editar mensaje ─────────────────────────────────────────────
  const enviarMensaje = useCallback(() => {
    // Modo edición
    if (editando) {
      if (!mensaje.trim()) { setEditando(null); setMensaje(''); return; }
      socketRef.current?.emit('editar_mensaje', {
        mensajeId: editando.id, nuevoTexto: mensaje.trim(), sala: editando.sala,
      });
      setEditando(null);
      setMensaje('');
      return;
    }

    if (!mensaje.trim() || !socket) return;
    const replyData = replyTo
      ? { id: String(replyTo._id || ''), texto: replyTo.mensaje?.substring(0, 100) || '', de: replyTo.de?.nombre || '' }
      : null;

    if (grupoActual) {
      socket.emit('mensaje_grupo', { grupoId: grupoActual._id, mensaje: mensaje.trim(), replyTo: replyData });
      socket.emit('dejo_escribir_grupo', { grupoId: grupoActual._id });
    } else if (chatPrivadoCon) {
      socket.emit('mensaje_privado', {
        deId: user.id, deNombre: user.nombre || user.username,
        paraId: chatPrivadoCon.id, paraNombre: chatPrivadoCon.nombre,
        mensaje: mensaje.trim(), replyTo: replyData,
      });
      socket.emit('dejo_escribir', { paraId: chatPrivadoCon.id });
    } else {
      socket.emit('mensaje_general', {
        deId: user.id, deNombre: user.nombre || user.username,
        mensaje: mensaje.trim(), replyTo: replyData,
      });
      socket.emit('dejo_escribir', { paraId: null });
    }
    setMensaje('');
    setReplyTo(null);
    setShowEmojis(false);
  }, [mensaje, socket, chatPrivadoCon, grupoActual, user, replyTo, editando]);

  // ─── Acciones sobre mensajes ─────────────────────────────────────────────
  const iniciarEdicion = (msg) => {
    setEditando({ id: String(msg._id), textoOriginal: msg.mensaje, sala: getSalaActual() });
    setMensaje(msg.mensaje);
    setReplyTo(null);
  };

  const eliminarMensaje = (msg) => {
    setMensajeAEliminar(msg);
  };

  const confirmarEliminar = () => {
    if (!socket || !mensajeAEliminar) return;
    socket.emit('eliminar_mensaje', { mensajeId: String(mensajeAEliminar._id), sala: getSalaActual() });
    setMensajeAEliminar(null);
  };

  const reaccionar = (emoji) => {
    if (!socket || !reaccionMsg) return;
    socket.emit('reaccionar_mensaje', {
      mensajeId: String(reaccionMsg._id), emoji, sala: getSalaActual(),
    });
    setReaccionAnchor(null);
    setReaccionMsg(null);
  };

  // ─── Typing ─────────────────────────────────────────────────────────────────
  const handleTyping = useCallback(() => {
    if (!socket) return;
    if (grupoActual) {
      socket.emit('escribiendo_grupo', { grupoId: grupoActual._id });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => socket.emit('dejo_escribir_grupo', { grupoId: grupoActual._id }), 2000);
    } else {
      socket.emit('escribiendo', { paraId: chatPrivadoCon?.id || null });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => socket.emit('dejo_escribir', { paraId: chatPrivadoCon?.id || null }), 2000);
    }
  }, [socket, chatPrivadoCon, grupoActual]);

  // ─── Texto de "está escribiendo" ────────────────────────────────────────────
  const getEscribiendoTexto = () => {
    if (grupoActual && escribiendoGrupo?.grupoId === grupoActual._id) {
      return `${escribiendoGrupo.nombre} está escribiendo...`;
    }
    if (!grupoActual && escribiendo) {
      if (chatPrivadoCon) {
        return escribiendo.id === chatPrivadoCon.id ? `${escribiendo.nombre} está escribiendo...` : null;
      }
      return `${escribiendo.nombre} está escribiendo...`;
    }
    return null;
  };

  // ─── Abrir chats ────────────────────────────────────────────────────────────
  const abrirChatPrivado = useCallback((usuario) => {
    setChatPrivadoCon(usuario);
    setGrupoActual(null);

    // Capturar divider de mensajes no leídos ANTES de limpiar el contador
    const sala = `privado_${[user.id, usuario.id].sort().join('_')}`;
    const unreadCount = noLeidosPrivados[usuario.id] || 0;
    if (unreadCount > 0) {
      const cachedMsgs = cacheLeer(sala) || [];
      const firstUnread = cachedMsgs[cachedMsgs.length - unreadCount];
      setDividerMsgId(firstUnread?._id ? String(firstUnread._id) : null);
    } else {
      setDividerMsgId(null);
    }

    setNoLeidosPrivados(prev => ({ ...prev, [usuario.id]: 0 }));

    const cached = cacheLeer(sala);
    if (cached) setMensajesPrivados(prev => ({ ...prev, [sala]: cached }));

    if (socketRef.current?.connected) {
      socketRef.current.emit('cargar_historial', { sala, limite: 60 });
    } else {
      api.get(`/chat/historial/${encodeURIComponent(sala)}?limite=60`)
        .then(r => {
          const msgs = r.data?.data || [];
          setMensajesPrivados(prev => ({ ...prev, [sala]: msgs }));
          cacheGuardar(sala, msgs);
        }).catch(() => {});
    }
    socketRef.current?.emit('marcar_leido', { sala, usuarioId: user.id });
  }, [user?.id, noLeidosPrivados]);

  const abrirGrupo = useCallback((grupo) => {
    setGrupoActual(grupo);
    setChatPrivadoCon(null);

    // Capturar divider ANTES de limpiar contador
    const unreadCount = noLeidosGrupos[grupo._id] || 0;
    if (unreadCount > 0) {
      const cachedMsgs = cacheLeer(`grupo_${grupo._id}`) || [];
      const firstUnread = cachedMsgs[cachedMsgs.length - unreadCount];
      setDividerMsgId(firstUnread?._id ? String(firstUnread._id) : null);
    } else {
      setDividerMsgId(null);
    }

    setNoLeidosGrupos(prev => ({ ...prev, [grupo._id]: 0 }));

    const cached = cacheLeer(`grupo_${grupo._id}`);
    if (cached) setMensajesGrupo(prev => ({ ...prev, [grupo._id]: cached }));

    if (socketRef.current?.connected) {
      socketRef.current.emit('cargar_historial_grupo', { grupoId: grupo._id, limite: 60 });
    }
    socketRef.current?.emit('marcar_leido', { sala: `grupo_${grupo._id}`, usuarioId: user.id });
  }, [user?.id, noLeidosGrupos]);

  const volverAtras = () => { setChatPrivadoCon(null); setGrupoActual(null); setDividerMsgId(null); };

  const getMensajesActuales = () => {
    if (grupoActual) return mensajesGrupo[grupoActual._id] || [];
    if (chatPrivadoCon) {
      const sala = `privado_${[user.id, chatPrivadoCon.id].sort().join('_')}`;
      return mensajesPrivados[sala] || [];
    }
    return mensajes;
  };

  // Mensajes filtrados por búsqueda (local primero, luego server)
  const getMensajesFiltrados = () => {
    const todos = getMensajesActuales();
    if (!busqueda.trim()) return todos;
    // Resultados del servidor (historial completo)
    if (busquedaServidor.length > 0) {
      // Combinar server results con los cargados localmente, sin duplicados
      const localIds = new Set(todos.map(m => String(m._id)));
      const extras = busquedaServidor.filter(m => !localIds.has(String(m._id)));
      const combinados = [...extras, ...todos];
      const term = busqueda.toLowerCase();
      return combinados
        .filter(m =>
          m.mensaje?.toLowerCase().includes(term) ||
          m.de?.nombre?.toLowerCase().includes(term) ||
          m.archivo?.nombre?.toLowerCase().includes(term)
        )
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    }
    const term = busqueda.toLowerCase();
    return todos.filter(m =>
      m.mensaje?.toLowerCase().includes(term) ||
      m.de?.nombre?.toLowerCase().includes(term) ||
      m.archivo?.nombre?.toLowerCase().includes(term)
    );
  };

  // ─── Scroll infinito: cargar mensajes más antiguos ───────────────────────────
  const cargarMasMensajes = useCallback(async () => {
    if (cargandoMas || !hayMasMensajes) return;
    const msgs = grupoActual
      ? (mensajesGrupo[grupoActual._id] || [])
      : chatPrivadoCon
        ? (mensajesPrivados[`privado_${[user?.id, chatPrivadoCon.id].sort().join('_')}`] || [])
        : mensajes;
    if (msgs.length === 0) return;

    const salaActual = grupoActual
      ? `grupo_${grupoActual._id}`
      : chatPrivadoCon
        ? `privado_${[user?.id, chatPrivadoCon.id].sort().join('_')}`
        : 'general';

    const oldestFecha = msgs[0]?.fecha;
    if (!oldestFecha) return;

    isLoadingMoreRef.current = true;
    prevScrollHeightRef.current = messagesContainerRef.current?.scrollHeight || 0;
    setCargandoMas(true);

    try {
      const res = await api.get(`/chat/historial/${encodeURIComponent(salaActual)}?limite=40&antes=${oldestFecha}`);
      const older = res.data?.data || [];
      setHayMasMensajes(older.length >= 40);

      if (older.length > 0) {
        if (salaActual === 'general') {
          setMensajes(prev => [...older, ...prev]);
        } else if (salaActual.startsWith('privado_')) {
          setMensajesPrivados(prev => ({ ...prev, [salaActual]: [...older, ...(prev[salaActual] || [])] }));
        } else if (salaActual.startsWith('grupo_')) {
          const gId = salaActual.replace('grupo_', '');
          setMensajesGrupo(prev => ({ ...prev, [gId]: [...older, ...(prev[gId] || [])] }));
        }
        // Restaurar posición de scroll para no saltar al top
        requestAnimationFrame(() => {
          const container = messagesContainerRef.current;
          if (container && prevScrollHeightRef.current) {
            container.scrollTop = container.scrollHeight - prevScrollHeightRef.current;
          }
          isLoadingMoreRef.current = false;
        });
      } else {
        isLoadingMoreRef.current = false;
      }
    } catch {
      isLoadingMoreRef.current = false;
    } finally {
      setCargandoMas(false);
    }
  }, [cargandoMas, hayMasMensajes, grupoActual, chatPrivadoCon, mensajesGrupo, mensajesPrivados, mensajes, user?.id]);

  // Detectar scroll al tope para cargar más
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      if (container.scrollTop < 60 && hayMasMensajes && !cargandoMas) {
        cargarMasMensajes();
      }
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [hayMasMensajes, cargandoMas, cargarMasMensajes]);

  // ─── Grupos ──────────────────────────────────────────────────────────────────
  const crearGrupo = () => {
    if (!nuevoGrupoNombre.trim() || miembrosSeleccionados.length === 0 || creandoGrupo) return;
    setCreandoGrupo(true);
    socket.emit('crear_grupo', {
      nombre: nuevoGrupoNombre.trim(), descripcion: '',
      miembros: miembrosSeleccionados.map(u => ({ id: u.id, nombre: u.nombre, sucursal: u.sucursal || '' })),
    });
    // El modal se cierra al recibir 'grupo_creado' — fallback de 5s por si falla
    setTimeout(() => {
      setCreandoGrupo(false);
      setModalGrupo(false);
      setNuevoGrupoNombre('');
      setMiembrosSeleccionados([]);
    }, 5000);
  };

  const agregarMiembroAGrupo = (u) => {
    if (!grupoActual) return;
    socket.emit('agregar_miembro_grupo', {
      grupoId: grupoActual._id,
      miembro: { id: u.id, nombre: u.nombre, sucursal: u.sucursal || '' },
    });
    setModalAgregar(false);
  };

  const salirDeGrupo = (grupoId) => socket.emit('salir_grupo', { grupoId });

  // ─── Upload archivo ────────────────────────────────────────────────────────
  const uploadAndSend = useCallback(async (file) => {
    if (!file || !socket) return;
    setUploadError(null);
    setSubiendoArchivo(true);
    try {
      const formData = new FormData();
      formData.append('archivo', file);
      const serverBase = (api.defaults.baseURL || 'http://localhost:5000/api').replace(/\/api$/, '');
      const token = localStorage.getItem('token');
      const res = await fetch(`${serverBase}/api/chat/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || `Error ${res.status}`);
      }
      const archivoData = await res.json();

      if (grupoActual) {
        socket.emit('mensaje_grupo', { grupoId: grupoActual._id, mensaje: '', archivo: archivoData });
      } else if (chatPrivadoCon) {
        socket.emit('mensaje_privado', { deId: user.id, deNombre: user.nombre || user.username, paraId: chatPrivadoCon.id, paraNombre: chatPrivadoCon.nombre, mensaje: '', archivo: archivoData });
      } else {
        socket.emit('mensaje_general', { deId: user.id, deNombre: user.nombre || user.username, mensaje: '', archivo: archivoData });
      }
    } catch (err) {
      const msg = err.message || 'Error al subir archivo';
      setUploadError(msg);
      setTimeout(() => setUploadError(null), 5000);
    } finally {
      setSubiendoArchivo(false);
    }
  }, [socket, grupoActual, chatPrivadoCon, user]);

  const handleArchivoSeleccionado = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    const fileToSend = await comprimirImagen(file);
    await uploadAndSend(fileToSend);
  }, [uploadAndSend]);

  // ─── Grabación de audio ──────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/ogg';
      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 16000 });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        audioStreamRef.current?.getTracks().forEach(t => t.stop());
        audioStreamRef.current = null;
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const ext = mimeType.includes('webm') ? 'webm' : 'ogg';
        const file = new File([blob], `audio_${Date.now()}.${ext}`, { type: mimeType });
        await uploadAndSend(file);
        setAudioRecording(false);
        setRecordingSeconds(0);
        clearInterval(recordTimerRef.current);
      };

      recorder.start(250);
      setAudioRecording(true);
      setRecordingSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch (err) {
      let msg = 'No se pudo acceder al micrófono';
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        msg = '🎤 Permiso denegado. Haz clic en el candado 🔒 de la barra de direcciones → Micrófono → Permitir, luego recarga la página.';
      } else if (err?.name === 'NotFoundError') {
        msg = '🎤 No se encontró micrófono. Conecta uno e intenta de nuevo.';
      } else if (err?.name === 'NotReadableError') {
        msg = '🎤 El micrófono está siendo usado por otra aplicación.';
      }
      setUploadError(msg);
      setTimeout(() => setUploadError(null), 9000);
    }
  }, [uploadAndSend]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(recordTimerRef.current);
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    audioStreamRef.current?.getTracks().forEach(t => t.stop());
    audioStreamRef.current = null;
    clearInterval(recordTimerRef.current);
    setAudioRecording(false);
    setRecordingSeconds(0);
  }, []);

  // ─── GIF picker ──────────────────────────────────────────────────────────────
  const buscarGifs = useCallback(async (query) => {
    const q = encodeURIComponent(query.trim() || 'funny');
    setGifCargando(true);
    try {
      // Tenor API v1 con clave pública de demo (LIVDSRZULELA)
      const endpoint = query.trim()
        ? `https://api.tenor.com/v1/search?key=LIVDSRZULELA&q=${q}&limit=24&contentfilter=medium&media_filter=minimal&locale=es`
        : `https://api.tenor.com/v1/trending?key=LIVDSRZULELA&limit=24&contentfilter=medium&media_filter=minimal&locale=es`;
      const r = await fetch(endpoint);
      if (!r.ok) throw new Error(`Tenor ${r.status}`);
      const data = await r.json();
      const results = (data.results || []).map(item => ({
        id: item.id,
        url: item.media?.[0]?.gif?.url || item.media?.[0]?.mediumgif?.url || '',
        preview: item.media?.[0]?.tinygif?.url || item.media?.[0]?.gif?.url || '',
        title: item.title || '',
      })).filter(g => g.url);
      setGifs(results.length > 0 ? results : []);
    } catch {
      setGifs([]);
    } finally { setGifCargando(false); }
  }, []);

  // Cargar trending al abrir el panel
  useEffect(() => {
    if (showGifPicker && gifs.length === 0) buscarGifs('');
  }, [showGifPicker]); // eslint-disable-line

  const enviarGif = useCallback((gif) => {
    if (!socket) return;
    const archivoData = { url: gif.url, nombre: gif.title || 'GIF', tipo: 'imagen', tamaño: 0 };
    if (grupoActual) {
      socket.emit('mensaje_grupo', { grupoId: grupoActual._id, mensaje: '', archivo: archivoData });
    } else if (chatPrivadoCon) {
      socket.emit('mensaje_privado', { deId: user.id, deNombre: user.nombre || user.username, paraId: chatPrivadoCon.id, paraNombre: chatPrivadoCon.nombre, mensaje: '', archivo: archivoData });
    } else {
      socket.emit('mensaje_general', { deId: user.id, deNombre: user.nombre || user.username, mensaje: '', archivo: archivoData });
    }
    setShowGifPicker(false);
    setGifBusqueda('');
    setGifs([]);
  }, [socket, grupoActual, chatPrivadoCon, user]);

  // ─── Iniciar reunión Jitsi ───────────────────────────────────────────────────
  const iniciarReunion = useCallback(() => {
    if (!socket) return;
    const sala = generarSalaReunion();
    const url  = `https://meet.jit.si/${sala}`;
    const payload = { tipo: 'reunion', mensaje: url };
    if (grupoActual) {
      socket.emit('mensaje_grupo', { grupoId: grupoActual._id, ...payload });
    } else if (chatPrivadoCon) {
      socket.emit('mensaje_privado', {
        deId: user.id, deNombre: user.nombre || user.username,
        paraId: chatPrivadoCon.id, paraNombre: chatPrivadoCon.nombre,
        ...payload,
      });
    } else {
      socket.emit('mensaje_general', {
        deId: user.id, deNombre: user.nombre || user.username,
        ...payload,
      });
    }
    window.open(url, '_blank', 'noopener');
    setTab(0);
  }, [socket, grupoActual, chatPrivadoCon, user]);

  // ─── Compartir enlace de Google Meet en el chat activo ───────────────────────
  const compartirEnlaceReunion = useCallback((url) => {
    if (!socket || !url.trim()) return;
    const payload = { tipo: 'reunion', mensaje: url.trim() };
    if (grupoActual) {
      socket.emit('mensaje_grupo', { grupoId: grupoActual._id, ...payload });
    } else if (chatPrivadoCon) {
      socket.emit('mensaje_privado', {
        deId: user.id, deNombre: user.nombre || user.username,
        paraId: chatPrivadoCon.id, paraNombre: chatPrivadoCon.nombre,
        ...payload,
      });
    } else {
      socket.emit('mensaje_general', {
        deId: user.id, deNombre: user.nombre || user.username,
        ...payload,
      });
    }
    setEnlaceReunion('');
    setTab(0);
  }, [socket, grupoActual, chatPrivadoCon, user]);

  // ─── Contadores ──────────────────────────────────────────────────────────────
  const totalNoLeidos = noLeidos + Object.values(noLeidosPrivados).reduce((a,b)=>a+b,0) + Object.values(noLeidosGrupos).reduce((a,b)=>a+b,0);
  const totalNoLeidosPrivados = Object.values(noLeidosPrivados).reduce((a,b)=>a+b,0);
  const totalNoLeidosGrupos = Object.values(noLeidosGrupos).reduce((a,b)=>a+b,0);
  const enChat = chatPrivadoCon || grupoActual;

  // ─── Lista combinada de contactos ────────────────────────────────────────────
  const contactosCombinados = (() => {
    const onlineIds = new Set(usuarios.map(u => u.id));
    const previosFiltrados = contactosPrevios.filter(c => !onlineIds.has(c.otroId));
    return [
      ...usuarios.map(u => ({ ...u, online: true })),
      ...previosFiltrados.map(c => ({ id: c.otroId, nombre: c.otroNombre, online: false, ultimoMensaje: c.ultimoMensaje, sucursal: c.sucursal || '' })),
    ];
  })();

  // ─── Render mensaje ──────────────────────────────────────────────────────────
  const renderMensaje = (msg, idx, lista) => {
    const esMio = msg.de.id === user.id;
    const esSistema = msg.tipo === 'sistema';
    const mostrarFecha = idx === 0 || formatFechaGrupo(msg.fecha) !== formatFechaGrupo(lista[idx-1]?.fecha);
    const fueLeido = esMio && (msg.leidoPor||[]).some(id => id !== user.id);
    const esTextoEditable = msg.tipo === 'texto' && !msg.eliminado;
    const esPrimerNoLeido = dividerMsgId && String(msg._id) === dividerMsgId;

    return (
      <React.Fragment key={msg._id || idx}>
        {/* Separador de mensajes no leídos */}
        {esPrimerNoLeido && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mx: 1.5, my: 1.5 }}>
            <Box sx={{ flex: 1, height: '1px', bgcolor: '#1a237e', opacity: 0.25 }}/>
            <Chip
              label="Mensajes nuevos"
              size="small"
              sx={{
                bgcolor: '#e8eaf6', color: '#1a237e', fontWeight: 700,
                fontSize: '0.62rem', height: 20, letterSpacing: 0.3,
                border: '1px solid rgba(26,35,126,0.2)',
              }}
            />
            <Box sx={{ flex: 1, height: '1px', bgcolor: '#1a237e', opacity: 0.25 }}/>
          </Box>
        )}
        {mostrarFecha && (
          <Box sx={{ textAlign: 'center', my: 1.5 }}>
            <Chip label={formatFechaGrupo(msg.fecha)} size="small"
              sx={{ bgcolor: '#e8eaf6', fontSize: '0.68rem', height: 22, fontWeight: 600 }}/>
          </Box>
        )}
        {esSistema ? (
          <Box sx={{ textAlign: 'center', my: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#9e9e9e', fontStyle: 'italic', fontSize: '0.7rem' }}>
              {msg.mensaje}
            </Typography>
          </Box>
        ) : (
          <Box sx={{
            display: 'flex', justifyContent: esMio ? 'flex-end' : 'flex-start', mb: 0.8, px: 1,
            '&:hover .msg-actions': { opacity: 1 },
          }}>
            {!esMio && (
              <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem', bgcolor: colorFromId(msg.de.id), mr: 0.8, mt: 0.5, flexShrink: 0 }}>
                {getInitials(msg.de.nombre)}
              </Avatar>
            )}
            <Box sx={{ maxWidth: '78%' }}>
              {!esMio && (
                <Typography variant="caption" sx={{ fontWeight: 700, color: colorFromId(msg.de.id), fontSize: '0.68rem', ml: 0.5 }}>
                  {msg.de.nombre}
                </Typography>
              )}
              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, flexDirection: esMio ? 'row-reverse' : 'row' }}>

                {/* Botones de acción (visibles en hover) */}
                {!msg.eliminado && (
                  <Box className="msg-actions" sx={{
                    opacity: 0, transition: 'opacity .15s',
                    display: 'flex', flexDirection: 'column', gap: 0.2, alignItems: 'center',
                  }}>
                    <Tooltip title="Responder">
                      <IconButton size="small" onClick={() => setReplyTo(msg)}
                        sx={{ p: 0.3, color: 'text.disabled', '&:hover': { color: '#1a237e' } }}>
                        <ReplyIcon sx={{ fontSize: 13 }}/>
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Reaccionar">
                      <IconButton size="small" onClick={(e) => { setReaccionAnchor(e.currentTarget); setReaccionMsg(msg); }}
                        sx={{ p: 0.3, color: 'text.disabled', '&:hover': { color: '#e65100' } }}>
                        <EmojiIcon sx={{ fontSize: 13 }}/>
                      </IconButton>
                    </Tooltip>
                    {esMio && esTextoEditable && (
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => iniciarEdicion(msg)}
                          sx={{ p: 0.3, color: 'text.disabled', '&:hover': { color: '#2e7d32' } }}>
                          <EditIcon sx={{ fontSize: 13 }}/>
                        </IconButton>
                      </Tooltip>
                    )}
                    {esMio && (
                      <Tooltip title="Eliminar">
                        <IconButton size="small" onClick={() => eliminarMensaje(msg)}
                          sx={{ p: 0.3, color: 'text.disabled', '&:hover': { color: '#c62828' } }}>
                          <DeleteIcon sx={{ fontSize: 13 }}/>
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                )}

                <Box>
                  {/* Cita (reply) */}
                  {msg.replyTo?.id && (
                    <Box sx={{
                      bgcolor: esMio ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)',
                      borderLeft: `3px solid ${esMio ? 'rgba(255,255,255,0.5)' : '#1a237e'}`,
                      borderRadius: '4px 8px 8px 4px', px: 1, py: 0.4, mb: 0.5,
                    }}>
                      <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 700, color: esMio ? 'rgba(255,255,255,0.8)' : '#1a237e', display: 'block' }}>
                        {msg.replyTo.de}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.7rem', color: esMio ? 'rgba(255,255,255,0.65)' : 'text.secondary', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                        {msg.replyTo.texto}
                      </Typography>
                    </Box>
                  )}

                  {/* Burbuja */}
                  <Box sx={{
                    bgcolor: msg.eliminado ? (esMio ? 'rgba(26,35,126,0.2)' : '#eeeeee') : (esMio ? '#1a237e' : '#f5f5f5'),
                    color: msg.eliminado ? '#9e9e9e' : (esMio ? '#fff' : '#212121'),
                    borderRadius: esMio ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    px: 1.8, py: 0.8,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  }}>
                    {msg.eliminado ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                        <BlockIcon sx={{ fontSize: 14, opacity: 0.6 }}/>
                        <Typography variant="body2" sx={{ fontSize: '0.78rem', fontStyle: 'italic', opacity: 0.7 }}>
                          Mensaje eliminado
                        </Typography>
                      </Box>
                    ) : msg.tipo === 'reunion' ? (
                      <Box sx={{ minWidth: 200 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1 }}>
                          <VideoCallIcon sx={{ fontSize: 20, color: esMio ? '#69f0ae' : '#2e7d32' }}/>
                          <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 700 }}>
                            Reunión iniciada
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="contained"
                          href={msg.mensaje}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            bgcolor: esMio ? 'rgba(255,255,255,0.15)' : '#2e7d32',
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            borderRadius: 2,
                            textTransform: 'none',
                            '&:hover': { bgcolor: esMio ? 'rgba(255,255,255,0.25)' : '#1b5e20' },
                          }}
                        >
                          Unirse a la reunión →
                        </Button>
                      </Box>
                    ) : msg.tipo === 'archivo' && msg.archivo ? (
                      <>
                        {msg.archivo.tipo === 'imagen' ? (
                          <Box data-img-container="1" sx={{ cursor: 'pointer' }} onClick={() => setVerImagen(getStaticFileURL(msg.archivo.url))}>
                            <Box component="img" src={getStaticFileURL(msg.archivo.url)} alt={msg.archivo.nombre}
                              sx={{ maxWidth: 200, maxHeight: 160, borderRadius: 1.5, display: 'block', objectFit: 'cover' }}
                              onError={(e) => {
                                // Mostrar placeholder en vez de ocultar el mensaje
                                e.target.style.display = 'none';
                                const container = e.target.closest('[data-img-container]');
                                if (container && !container.querySelector('[data-broken]')) {
                                  const ph = document.createElement('div');
                                  ph.setAttribute('data-broken', '1');
                                  ph.style.cssText = 'display:flex;align-items:center;gap:6px;padding:8px 10px;background:rgba(0,0,0,0.06);border-radius:8px;min-width:120px';
                                  ph.innerHTML = '<span style="font-size:20px">🖼️</span><span style="font-size:0.72rem;opacity:0.7">Imagen no disponible</span>';
                                  container.insertBefore(ph, container.firstChild);
                                }
                              }}
                            />
                            <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.7, mt: 0.3, display: 'block' }}>
                              {msg.archivo.nombre}
                            </Typography>
                          </Box>
                        ) : msg.archivo.tipo === 'audio' ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 200 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.3 }}>
                              <AudioIcon sx={{ fontSize: 16, opacity: 0.7, color: esMio ? '#90caf9' : '#1565c0' }}/>
                              <Typography variant="caption" sx={{ fontSize: '0.7rem', opacity: 0.8 }}>Nota de voz</Typography>
                            </Box>
                            <audio controls src={getStaticFileURL(msg.archivo.url)} style={{ width: '100%', height: 32, outline: 'none' }}/>
                          </Box>
                        ) : msg.archivo.tipo === 'pdf' ? (
                          // PDF → visor inline
                          <Box onClick={() => setVerPDF({ url: getStaticFileURL(msg.archivo.url), nombre: msg.archivo.nombre })}
                            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer',
                              color: esMio ? '#90caf9' : '#1565c0', '&:hover': { opacity: 0.8 } }}>
                            <PdfIcon sx={{ fontSize: 22, flexShrink: 0 }}/>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="caption" sx={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', wordBreak: 'break-all' }}>
                                {msg.archivo.nombre}
                              </Typography>
                              <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.7 }}>
                                {msg.archivo.tamaño ? `${(msg.archivo.tamaño/1024).toFixed(0)} KB` : ''} · Toca para ver
                              </Typography>
                            </Box>
                            <ZoomInIcon sx={{ fontSize: 16, ml: 'auto', flexShrink: 0 }}/>
                          </Box>
                        ) : (
                          // Documento descargable
                          <Box component="a" href={getStaticFileURL(msg.archivo.url)} download={msg.archivo.nombre}
                            sx={{ display: 'flex', alignItems: 'center', gap: 1, color: esMio ? '#90caf9' : '#1565c0', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                            <FileIcon sx={{ fontSize: 22, flexShrink: 0 }}/>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="caption" sx={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', wordBreak: 'break-all' }}>
                                {msg.archivo.nombre}
                              </Typography>
                              <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.7 }}>
                                {msg.archivo.tamaño ? `${(msg.archivo.tamaño/1024).toFixed(0)} KB` : ''}
                              </Typography>
                            </Box>
                            <DownloadIcon sx={{ fontSize: 16, ml: 'auto', flexShrink: 0 }}/>
                          </Box>
                        )}
                        {msg.mensaje && (
                          <Typography variant="body2" sx={{ fontSize: '0.82rem', lineHeight: 1.4, wordBreak: 'break-word', mt: 0.5 }}>
                            {busqueda.trim() ? resaltarTexto(msg.mensaje, busqueda.trim()) : msg.mensaje}
                          </Typography>
                        )}
                      </>
                    ) : (
                      <Typography variant="body2" sx={{ fontSize: '0.82rem', lineHeight: 1.4, wordBreak: 'break-word' }}>
                        {busqueda.trim() ? resaltarTexto(msg.mensaje, busqueda.trim()) : msg.mensaje}
                      </Typography>
                    )}
                  </Box>

                  {/* Reacciones */}
                  {msg.reacciones?.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3, mt: 0.3, justifyContent: esMio ? 'flex-end' : 'flex-start' }}>
                      {msg.reacciones.map(r => (
                        <Chip
                          key={r.emoji}
                          label={`${r.emoji} ${r.usuarios.length}`}
                          size="small"
                          onClick={() => {
                            if (!socket) return;
                            socket.emit('reaccionar_mensaje', {
                              mensajeId: String(msg._id), emoji: r.emoji, sala: getSalaActual(),
                            });
                          }}
                          sx={{
                            height: 20, fontSize: '0.72rem', cursor: 'pointer',
                            bgcolor: r.usuarios.includes(user.id) ? '#e3f2fd' : '#f5f5f5',
                            border: r.usuarios.includes(user.id) ? '1px solid #90caf9' : '1px solid #e0e0e0',
                            '&:hover': { bgcolor: '#e3f2fd' },
                          }}
                        />
                      ))}
                    </Box>
                  )}

                  {/* Hora + check + editado */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, mt: 0.2, mx: 0.5, justifyContent: esMio ? 'flex-end' : 'flex-start' }}>
                    {msg.editado && (
                      <Typography variant="caption" sx={{ color: '#9e9e9e', fontSize: '0.58rem', fontStyle: 'italic' }}>
                        editado ·
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{ color: '#9e9e9e', fontSize: '0.6rem' }}>
                      {formatHora(msg.fecha)}
                    </Typography>
                    {esMio && !msg.eliminado && (
                      fueLeido
                        ? <DoneAllIcon sx={{ fontSize: 12, color: '#42a5f5' }}/>
                        : <DoneIcon sx={{ fontSize: 12, color: '#bdbdbd' }}/>
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </React.Fragment>
    );
  };

  if (!user?.id) return null;

  const mensajesFiltrados = getMensajesFiltrados();

  // ─── Render principal ─────────────────────────────────────────────────────────
  return (
    <>
      {/* FAB */}
      <Tooltip title={open ? '' : 'Chat interno'} placement="left">
        <Fab onClick={() => setOpen(!open)} sx={{
          position: 'fixed', bottom: 90, right: 24, zIndex: 1300,
          bgcolor: open ? '#424242' : '#1a237e', color: '#fff', width: 52, height: 52,
          '&:hover': { bgcolor: open ? '#616161' : '#283593', transform: 'scale(1.05)' },
          transition: 'all 0.3s ease', boxShadow: '0 4px 16px rgba(26,35,126,0.35)',
        }}>
          <Badge badgeContent={totalNoLeidos} color="error" max={99}
            sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', minWidth: 18, height: 18 } }}>
            {open ? <CloseIcon/> : <ChatIcon/>}
          </Badge>
        </Fab>
      </Tooltip>

      {/* Ventana */}
      <Slide direction="up" in={open} mountOnEnter unmountOnExit>
        <Paper sx={{
          position: 'fixed', bottom: 155, right: 24, width: 390, height: 540, zIndex: 1300,
          borderRadius: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 40px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)',
        }}>

          {/* Header */}
          <Box sx={{
            background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
            p: 1.5, px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 56,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
              {enChat ? (
                <>
                  <IconButton size="small" onClick={volverAtras} sx={{ color: '#fff', p: 0.3 }}>
                    <ArrowBackIcon fontSize="small"/>
                  </IconButton>
                  <Avatar sx={{ width: 32, height: 32, fontSize: '0.75rem', bgcolor: grupoActual ? colorGrupo(grupoActual.nombre) : colorFromId(chatPrivadoCon?.id) }}>
                    {grupoActual ? <GroupsIcon sx={{ fontSize: 18 }}/> : getInitials(chatPrivadoCon?.nombre)}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" color="#fff" fontWeight={700} sx={{ lineHeight: 1.2 }} noWrap>
                      {grupoActual ? grupoActual.nombre : chatPrivadoCon?.nombre}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem' }}>
                      {grupoActual
                        ? `${grupoActual.miembros?.length || 0} miembros`
                        : usuarios.find(u => u.id === chatPrivadoCon?.id) ? '● En línea' : 'Fuera de línea'}
                    </Typography>
                  </Box>
                  {grupoActual && (
                    <Tooltip title="Agregar miembro">
                      <IconButton size="small" onClick={() => setModalAgregar(true)} sx={{ color: 'rgba(255,255,255,0.7)', ml: 'auto' }}>
                        <PersonAddIcon fontSize="small"/>
                      </IconButton>
                    </Tooltip>
                  )}
                </>
              ) : (
                <>
                  <ChatIcon sx={{ color: '#fff', fontSize: 22 }}/>
                  <Box>
                    <Typography variant="subtitle2" color="#fff" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                      Chat Interno
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CircleIcon sx={{ fontSize: 7, color: connected ? '#69f0ae' : '#ff5252' }}/>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.62rem' }}>
                        {connected ? `${usuarios.length + 1} en línea` : 'Reconectando...'}
                      </Typography>
                    </Box>
                  </Box>
                </>
              )}
            </Box>
            {/* Botón reunión (solo en chats activos) */}
            {enChat && (
              <Tooltip title="Iniciar videollamada (Jitsi)">
                <IconButton size="small" onClick={iniciarReunion}
                  sx={{ color: 'rgba(255,255,255,0.65)', mr: 0.3, '&:hover': { color: '#69f0ae' } }}>
                  <VideoCallIcon fontSize="small"/>
                </IconButton>
              </Tooltip>
            )}
            {/* Búsqueda (solo en chats) */}
            {(tab === 0 || enChat) && (
              <Tooltip title={mostrarBusqueda ? 'Cerrar búsqueda' : 'Buscar mensajes'}>
                <IconButton size="small"
                  onClick={() => { setMostrarBusqueda(v => !v); setBusqueda(''); }}
                  sx={{ color: mostrarBusqueda ? '#fff' : 'rgba(255,255,255,0.65)', mr: 0.3 }}>
                  {mostrarBusqueda ? <SearchOffIcon fontSize="small"/> : <SearchIcon fontSize="small"/>}
                </IconButton>
              </Tooltip>
            )}
            <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'rgba(255,255,255,0.7)' }}>
              <CloseIcon fontSize="small"/>
            </IconButton>
          </Box>

          {/* Barra de búsqueda */}
          {mostrarBusqueda && (tab === 0 || enChat) && (
            <Box sx={{ px: 1.5, py: 0.8, bgcolor: '#fafafa', borderBottom: '1px solid #e0e0e0' }}>
              <TextField
                fullWidth autoFocus size="small"
                placeholder="Buscar en mensajes..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ fontSize: 16, color: 'text.disabled', mr: 0.5 }}/>,
                  endAdornment: busqueda ? (
                    <IconButton size="small" onClick={() => setBusqueda('')} sx={{ p: 0 }}>
                      <CloseIcon sx={{ fontSize: 15 }}/>
                    </IconButton>
                  ) : null,
                  sx: { borderRadius: 3, fontSize: '0.82rem' },
                }}
              />
              {busqueda && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', mt: 0.3, display: 'block' }}>
                  {buscandoServidor
                    ? '🔍 Buscando en historial...'
                    : `${mensajesFiltrados.length} resultado${mensajesFiltrados.length !== 1 ? 's' : ''}${busquedaServidor.length > 0 ? ' (historial completo)' : ''}`
                  }
                </Typography>
              )}
            </Box>
          )}

          {/* Tabs */}
          {!enChat && (
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
              sx={{
                minHeight: 38, bgcolor: '#f5f5f5',
                '& .MuiTab-root': { minHeight: 38, textTransform: 'none', fontSize: '0.65rem', fontWeight: 600, minWidth: 0, px: 0.6 },
                '& .Mui-selected': { color: '#1a237e' },
                '& .MuiTabs-indicator': { bgcolor: '#1a237e' },
              }}>
              <Tab icon={<ForumIcon sx={{ fontSize: 13 }}/>} iconPosition="start" label="General"/>
              <Tab
                icon={<Badge badgeContent={usuarios.length} color="success" max={9}
                  sx={{ '& .MuiBadge-badge': { fontSize: '0.55rem', minWidth: 14, height: 14 } }}>
                  <PeopleIcon sx={{ fontSize: 13 }}/>
                </Badge>}
                iconPosition="start"
                label="En línea"
              />
              <Tab
                icon={<Badge badgeContent={totalNoLeidosPrivados} color="error" max={9}><HistoryIcon sx={{ fontSize: 13 }}/></Badge>}
                iconPosition="start"
                label="Recientes"
              />
              <Tab
                icon={<Badge badgeContent={totalNoLeidosGrupos} color="error" max={9}><GroupsIcon sx={{ fontSize: 13 }}/></Badge>}
                iconPosition="start"
                label="Grupos"
              />
              <Tab
                icon={<VideoCallIcon sx={{ fontSize: 14 }}/>}
                iconPosition="start"
                label="Reunirse"
                sx={{ color: '#2e7d32', '&.Mui-selected': { color: '#2e7d32' } }}
              />
            </Tabs>
          )}

          {/* Contenido */}
          <Box ref={messagesContainerRef} sx={{ flex: 1, overflow: 'auto', bgcolor: '#fff', position: 'relative' }}>

            {/* TAB GENERAL / CHAT ACTIVO */}
            {(tab === 0 || enChat) && (
              <Box sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>

                {/* Indicador de cargando más mensajes (scroll infinito) */}
                {cargandoMas && (
                  <Box sx={{ textAlign: 'center', py: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <CircularProgress size={14} sx={{ color: '#1a237e', opacity: 0.6 }}/>
                    <Typography variant="caption" sx={{ color: '#9e9e9e', fontSize: '0.68rem' }}>
                      Cargando mensajes anteriores...
                    </Typography>
                  </Box>
                )}

                {/* Botón manual si hay más mensajes y no está buscando */}
                {hayMasMensajes && !cargandoMas && !busqueda && mensajesFiltrados.length > 0 && (
                  <Box sx={{ textAlign: 'center', pb: 0.5 }}>
                    <Chip
                      icon={<HistoryIcon sx={{ fontSize: 13 }}/>}
                      label="Ver mensajes anteriores"
                      size="small"
                      onClick={cargarMasMensajes}
                      sx={{
                        cursor: 'pointer', bgcolor: '#f5f5f5', fontSize: '0.65rem',
                        '&:hover': { bgcolor: '#e8eaf6', color: '#1a237e' }, transition: 'all .2s',
                      }}
                    />
                  </Box>
                )}

                {mensajesFiltrados.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
                    {busqueda ? (
                      <>
                        <SearchIcon sx={{ fontSize: 40, color: '#e0e0e0', mb: 1 }}/>
                        <Typography variant="body2" color="text.secondary">
                          Sin resultados para "{busqueda}"
                        </Typography>
                      </>
                    ) : (
                      <>
                        <ChatIcon sx={{ fontSize: 48, color: '#e0e0e0', mb: 1 }}/>
                        <Typography variant="body2" color="text.secondary">
                          {grupoActual
                            ? `Inicia la conversación en ${grupoActual.nombre}`
                            : chatPrivadoCon
                              ? `Inicia una conversación con ${chatPrivadoCon.nombre}`
                              : 'Sin mensajes aún. ¡Sé el primero!'}
                        </Typography>
                      </>
                    )}
                  </Box>
                ) : (
                  <Box sx={{ py: 1 }}>
                    {mensajesFiltrados.map((msg, idx, arr) => renderMensaje(msg, idx, arr))}
                  </Box>
                )}
                {getEscribiendoTexto() && (
                  <Box sx={{ px: 2, pb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#9e9e9e', fontStyle: 'italic', fontSize: '0.68rem' }}>
                      ✍️ {getEscribiendoTexto()}
                    </Typography>
                  </Box>
                )}
                <div ref={messagesEndRef}/>
              </Box>
            )}

            {/* TAB EN LÍNEA */}
            {tab === 1 && !enChat && (
              <Box sx={{ py: 0 }}>
                {usuarios.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
                    <PeopleIcon sx={{ fontSize: 48, color: '#e0e0e0', mb: 1 }}/>
                    <Typography variant="body2" color="text.secondary">Nadie conectado ahora</Typography>
                    <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5 }}>
                      Los usuarios en línea aparecerán aquí
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <Box sx={{ px: 2, pt: 1.2, pb: 0.4, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <CircleIcon sx={{ fontSize: 8, color: '#4caf50' }}/>
                      <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={0.8} fontSize="0.65rem">
                        EN LÍNEA — {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                    <List dense sx={{ py: 0 }}>
                      {usuarios.map((u) => (
                        <React.Fragment key={u.id}>
                          <ListItem button onClick={() => { abrirChatPrivado(u); setTab(0); }}
                            sx={{ py: 0.8, px: 2, '&:hover': { bgcolor: 'rgba(26,35,126,0.04)' }, cursor: 'pointer' }}>
                            <ListItemAvatar sx={{ minWidth: 42 }}>
                              <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                badgeContent={<CircleIcon sx={{ fontSize: 9, color: '#4caf50' }}/>}>
                                <Avatar sx={{ width: 32, height: 32, fontSize: '0.72rem', bgcolor: colorFromId(u.id) }}>
                                  {getInitials(u.nombre)}
                                </Avatar>
                              </Badge>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.81rem' }}>{u.nombre}</Typography>
                                  {noLeidosPrivados[u.id] > 0 && (
                                    <Chip label={noLeidosPrivados[u.id]} size="small" color="error" sx={{ height: 15, fontSize: '0.58rem' }}/>
                                  )}
                                </Box>
                              }
                              secondary={
                                <Typography variant="caption" sx={{ fontSize: '0.66rem', color: '#4caf50', fontWeight: 600 }} noWrap>
                                  ● {u.sucursal || 'En línea'}
                                </Typography>
                              }
                            />
                          </ListItem>
                          <Divider variant="inset" component="li"/>
                        </React.Fragment>
                      ))}
                    </List>
                  </>
                )}
              </Box>
            )}

            {/* TAB RECIENTES */}
            {tab === 2 && !enChat && (
              <Box sx={{ py: 0 }}>
                {contactosPrevios.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
                    <HistoryIcon sx={{ fontSize: 48, color: '#e0e0e0', mb: 1 }}/>
                    <Typography variant="body2" color="text.secondary">Sin conversaciones aún</Typography>
                    <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5 }}>
                      Aquí aparecerán tus chats privados recientes
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <Box sx={{ px: 2, pt: 1.2, pb: 0.4, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <HistoryIcon sx={{ fontSize: 11, color: 'text.disabled' }}/>
                      <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={0.8} fontSize="0.65rem">
                        CONVERSACIONES RECIENTES — {contactosPrevios.length}
                      </Typography>
                    </Box>
                    <List dense sx={{ py: 0 }}>
                      {contactosPrevios.map((c) => {
                        const estaOnline = usuarios.some(u => u.id === c.otroId);
                        return (
                          <React.Fragment key={c.otroId}>
                            <ListItem button onClick={() => { abrirChatPrivado({ id: c.otroId, nombre: c.otroNombre }); setTab(0); }}
                              sx={{ py: 0.8, px: 2, '&:hover': { bgcolor: 'rgba(26,35,126,0.04)' }, cursor: 'pointer' }}>
                              <ListItemAvatar sx={{ minWidth: 42 }}>
                                <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                  badgeContent={<CircleIcon sx={{ fontSize: 9, color: estaOnline ? '#4caf50' : '#bdbdbd' }}/>}>
                                  <Avatar sx={{ width: 32, height: 32, fontSize: '0.72rem', bgcolor: colorFromId(c.otroId) }}>
                                    {getInitials(c.otroNombre)}
                                  </Avatar>
                                </Badge>
                              </ListItemAvatar>
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.81rem' }}>{c.otroNombre}</Typography>
                                      {noLeidosPrivados[c.otroId] > 0 && (
                                        <Chip label={noLeidosPrivados[c.otroId]} size="small" color="error" sx={{ height: 15, fontSize: '0.58rem' }}/>
                                      )}
                                    </Box>
                                    {c.fecha && (
                                      <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.disabled', flexShrink: 0, ml: 0.5 }}>
                                        {formatFechaGrupo(c.fecha)}
                                      </Typography>
                                    )}
                                  </Box>
                                }
                                secondary={
                                  <Typography variant="caption" sx={{ fontSize: '0.66rem', color: estaOnline ? '#4caf50' : 'text.secondary', fontWeight: estaOnline ? 600 : 400 }} noWrap>
                                    {estaOnline ? '● En línea' : c.ultimoMensaje || 'Sin mensajes recientes'}
                                  </Typography>
                                }
                              />
                            </ListItem>
                            <Divider variant="inset" component="li"/>
                          </React.Fragment>
                        );
                      })}
                    </List>
                  </>
                )}
              </Box>
            )}

            {/* TAB REUNIRSE */}
            {tab === 4 && !enChat && (
              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>

                {/* Header */}
                <Box sx={{ textAlign: 'center', py: 1 }}>
                  <VideoCallIcon sx={{ fontSize: 44, color: '#2e7d32', mb: 0.5 }}/>
                  <Typography variant="body1" fontWeight={700} color="#1a237e">Reuniones en línea</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Inicia una videollamada y comparte el enlace con tu equipo
                  </Typography>
                </Box>

                {/* ── Google Meet ── */}
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: '#34a853' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1.5 }}>
                    <Box sx={{
                      width: 36, height: 36, borderRadius: '50%', bgcolor: '#34a853',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <VideoCallIcon sx={{ fontSize: 20, color: '#fff' }}/>
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.2 }}>Google Meet</Typography>
                      <Typography variant="caption" color="text.secondary">Requiere cuenta Google</Typography>
                    </Box>
                  </Box>

                  {/* Paso 1: Abrir */}
                  <Button
                    fullWidth variant="contained"
                    onClick={() => window.open('https://meet.google.com/new', '_blank', 'noopener')}
                    sx={{
                      bgcolor: '#34a853', '&:hover': { bgcolor: '#2e7d32' },
                      textTransform: 'none', fontWeight: 600, borderRadius: 2, mb: 1.5,
                    }}
                  >
                    Abrir Google Meet →
                  </Button>

                  {/* Paso 2: Compartir enlace */}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.8, fontWeight: 600 }}>
                    📋 Pega el enlace de tu reunión para compartirlo en el chat:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <TextField
                      size="small" fullWidth
                      placeholder="https://meet.google.com/xxx-yyyy-zzz"
                      value={enlaceReunion}
                      onChange={(e) => setEnlaceReunion(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && enlaceReunion.trim()) compartirEnlaceReunion(enlaceReunion); }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.78rem' } }}
                    />
                    <Button
                      variant="contained" size="small"
                      disabled={!enlaceReunion.trim() || !connected}
                      onClick={() => compartirEnlaceReunion(enlaceReunion)}
                      sx={{
                        bgcolor: '#1a237e', '&:hover': { bgcolor: '#283593' },
                        textTransform: 'none', fontWeight: 600, borderRadius: 2,
                        whiteSpace: 'nowrap', flexShrink: 0, px: 1.5,
                      }}
                    >
                      Enviar
                    </Button>
                  </Box>
                </Paper>

                {/* ── Jitsi Meet ── */}
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: '#1565c0' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1.5 }}>
                    <Box sx={{
                      width: 36, height: 36, borderRadius: '50%', bgcolor: '#1565c0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <VideoCallIcon sx={{ fontSize: 20, color: '#fff' }}/>
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.2 }}>Jitsi Meet</Typography>
                      <Typography variant="caption" color="text.secondary">Sin cuenta requerida · Instantáneo</Typography>
                    </Box>
                  </Box>
                  <Button
                    fullWidth variant="contained"
                    disabled={!connected}
                    onClick={iniciarReunion}
                    sx={{
                      bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' },
                      textTransform: 'none', fontWeight: 600, borderRadius: 2,
                    }}
                  >
                    Crear sala Jitsi y compartir
                  </Button>
                </Paper>

                <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', fontSize: '0.61rem' }}>
                  El enlace se compartirá en el chat General o en el chat activo
                </Typography>
              </Box>
            )}

            {/* TAB GRUPOS */}
            {tab === 3 && !enChat && (
              <Box>
                <Box sx={{ p: 1.5, pb: 0 }}>
                  <Button fullWidth variant="outlined" startIcon={<GroupAddIcon/>}
                    onClick={() => setModalGrupo(true)}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, borderColor: '#1a237e', color: '#1a237e' }}>
                    Crear Grupo
                  </Button>
                </Box>
                <List dense sx={{ py: 1 }}>
                  {grupos.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 5 }}>
                      <GroupsIcon sx={{ fontSize: 48, color: '#e0e0e0', mb: 1 }}/>
                      <Typography variant="body2" color="text.secondary">No perteneces a ningún grupo</Typography>
                    </Box>
                  ) : (
                    grupos.map((g) => (
                      <React.Fragment key={g._id}>
                        <ListItem button onClick={() => abrirGrupo(g)}
                          sx={{ py: 1, px: 2, '&:hover': { bgcolor: 'rgba(26,35,126,0.04)' }, cursor: 'pointer' }}
                          secondaryAction={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {noLeidosGrupos[g._id] > 0 && (
                                <Chip label={noLeidosGrupos[g._id]} size="small" color="error" sx={{ height: 16, fontSize: '0.6rem' }}/>
                              )}
                              <Tooltip title="Salir del grupo">
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); salirDeGrupo(g._id); }}
                                  sx={{ color: '#bdbdbd', '&:hover': { color: '#f44336' } }}>
                                  <ExitIcon sx={{ fontSize: 16 }}/>
                                </IconButton>
                              </Tooltip>
                            </Box>
                          }>
                          <ListItemAvatar sx={{ minWidth: 44 }}>
                            <Avatar sx={{ width: 34, height: 34, bgcolor: colorGrupo(g.nombre) }}>
                              <GroupsIcon sx={{ fontSize: 18 }}/>
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={<Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.82rem' }}>{g.nombre}</Typography>}
                            secondary={<Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>{g.miembros?.length || 0} miembros</Typography>}
                          />
                        </ListItem>
                        <Divider variant="inset" component="li"/>
                      </React.Fragment>
                    ))
                  )}
                </List>
              </Box>
            )}
          </Box>

          {/* Error upload */}
          {uploadError && (
            <Box sx={{ px: 2, py: 0.6, bgcolor: '#ffebee', display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <ErrorIcon sx={{ fontSize: 16, color: '#c62828' }}/>
              <Typography variant="caption" color="error" fontSize="0.72rem">{uploadError}</Typography>
            </Box>
          )}

          {/* Barra de edición activa */}
          {(tab === 0 || enChat) && editando && (
            <Box sx={{ px: 1.5, pt: 0.8, pb: 0, bgcolor: '#fff8e1', borderTop: '1px solid #ffe082' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#fff3e0', borderRadius: 2, px: 1.2, py: 0.6, borderLeft: '3px solid #f57c00' }}>
                <EditIcon sx={{ fontSize: 14, color: '#f57c00' }}/>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#f57c00', fontSize: '0.65rem', display: 'block' }}>
                    Editando mensaje
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: 280 }}>
                    {editando.textoOriginal}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => { setEditando(null); setMensaje(''); }} sx={{ p: 0.2 }}>
                  <CloseIcon sx={{ fontSize: 13 }}/>
                </IconButton>
              </Box>
            </Box>
          )}

          {/* Barra de respuesta */}
          {(tab === 0 || enChat) && replyTo && !editando && (
            <Box sx={{ px: 1.5, pt: 0.8, pb: 0, bgcolor: '#fafafa', borderTop: '1px solid #e0e0e0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#e8eaf6', borderRadius: 2, px: 1.2, py: 0.6, borderLeft: '3px solid #1a237e' }}>
                <ReplyIcon sx={{ fontSize: 14, color: '#1a237e' }}/>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#1a237e', fontSize: '0.65rem', display: 'block' }}>
                    {replyTo.de?.nombre}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: 270 }}>
                    {replyTo.mensaje?.substring(0, 80)}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => setReplyTo(null)} sx={{ p: 0.2 }}>
                  <CloseIcon sx={{ fontSize: 13 }}/>
                </IconButton>
              </Box>
            </Box>
          )}

          {/* Input */}
          {(tab === 0 || enChat) && (
            <Box sx={{ p: 1, px: 1.2, borderTop: (replyTo || editando) ? '0' : '1px solid #e0e0e0', bgcolor: '#fafafa',
              display: 'flex', alignItems: 'center', gap: 0.5, position: 'relative' }}>

              {/* Emoji panel */}
              {showEmojis && (
                <EmojiPanel
                  onSelect={(e) => setMensaje(prev => prev + e)}
                  onClose={() => setShowEmojis(false)}
                />
              )}

              {/* GIF panel */}
              {showGifPicker && (
                <Paper elevation={6} sx={{
                  position: 'absolute', bottom: '100%', left: 0, right: 0, mb: 0.5, zIndex: 20,
                  borderRadius: 2, overflow: 'hidden',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
                  maxHeight: 300, display: 'flex', flexDirection: 'column',
                }}>
                  <Box sx={{ p: 0.8, borderBottom: '1px solid #e0e0e0', bgcolor: '#fafafa', display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    <GifIcon sx={{ fontSize: 18, color: '#9e9e9e' }}/>
                    <TextField
                      ref={gifInputRef}
                      size="small" fullWidth autoFocus
                      placeholder="Buscar GIFs…"
                      value={gifBusqueda}
                      onChange={e => setGifBusqueda(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') buscarGifs(gifBusqueda); }}
                      InputProps={{ sx: { borderRadius: 2, fontSize: '0.8rem', py: 0 }, endAdornment: gifCargando ? <CircularProgress size={14}/> : (
                        <IconButton size="small" sx={{ p: 0.2 }} onClick={() => buscarGifs(gifBusqueda)}>
                          <SearchIcon sx={{ fontSize: 15 }}/>
                        </IconButton>
                      ) }}
                    />
                    <IconButton size="small" onClick={() => { setShowGifPicker(false); setGifBusqueda(''); }} sx={{ p: 0.3 }}>
                      <CloseIcon sx={{ fontSize: 15 }}/>
                    </IconButton>
                  </Box>
                  <Box sx={{ overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.4, p: 0.5 }}>
                    {gifs.length === 0 && !gifCargando && (
                      <Box sx={{ gridColumn: '1/-1', textAlign: 'center', py: 3 }}>
                        <GifIcon sx={{ fontSize: 36, color: '#e0e0e0', mb: 0.5 }}/>
                        <Typography variant="caption" color="text.disabled" display="block">Busca un GIF…</Typography>
                      </Box>
                    )}
                    {gifs.map(gif => (
                      <Box key={gif.id} onClick={() => enviarGif(gif)}
                        sx={{ cursor: 'pointer', borderRadius: 1, overflow: 'hidden', aspectRatio: '4/3', bgcolor: '#f5f5f5',
                          '&:hover': { opacity: 0.85, transform: 'scale(1.03)' }, transition: 'all .15s' }}>
                        <Box component="img" src={gif.preview || gif.url} alt={gif.title}
                          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          loading="lazy"/>
                      </Box>
                    ))}
                  </Box>
                  <Typography variant="caption" sx={{ textAlign: 'center', color: '#bdbdbd', fontSize: '0.55rem', py: 0.3 }}>
                    Powered by Tenor
                  </Typography>
                </Paper>
              )}

              <input ref={fileInputRef} type="file" accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx" style={{ display: 'none' }} onChange={handleArchivoSeleccionado}/>

              {/* Modo grabación */}
              {audioRecording ? (
                <>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1,
                    bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 6, px: 1.5, py: 0.6 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f44336',
                      animation: 'pulse 1s infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } } }}/>
                    <Typography variant="caption" sx={{ color: '#f44336', fontWeight: 700, fontSize: '0.78rem' }}>
                      Grabando... {Math.floor(recordingSeconds/60).toString().padStart(2,'0')}:{(recordingSeconds%60).toString().padStart(2,'0')}
                    </Typography>
                  </Box>
                  <Tooltip title="Cancelar">
                    <IconButton onClick={cancelRecording} size="small" sx={{ color: '#9e9e9e', p: 0.5 }}>
                      <DeleteIcon sx={{ fontSize: 20 }}/>
                    </IconButton>
                  </Tooltip>
                  <IconButton onClick={stopRecording}
                    sx={{ bgcolor: '#f44336', color: '#fff', width: 36, height: 36, '&:hover': { bgcolor: '#c62828' } }}>
                    {subiendoArchivo ? <CircularProgress size={16} sx={{ color: '#fff' }}/> : <StopRecIcon sx={{ fontSize: 18 }}/>}
                  </IconButton>
                </>
              ) : (
                <>
                  {/* Adjuntar */}
                  {!editando && (
                    <Tooltip title="Adjuntar imagen/archivo (máx. 10 MB)">
                      <span>
                        <IconButton onClick={() => fileInputRef.current?.click()} disabled={!connected || subiendoArchivo} size="small"
                          sx={{ color: '#9e9e9e', '&:hover': { color: '#1a237e' }, p: 0.5 }}>
                          {subiendoArchivo ? <CircularProgress size={18} sx={{ color: '#1a237e' }}/> : <AttachFileIcon sx={{ fontSize: 20 }}/>}
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}

                  {/* Emojis */}
                  <Tooltip title="Emojis">
                    <IconButton onClick={() => { setShowEmojis(!showEmojis); setShowGifPicker(false); }} size="small"
                      sx={{ color: showEmojis ? '#e65100' : '#9e9e9e', '&:hover': { color: '#e65100' }, p: 0.5 }}>
                      <EmojiIcon sx={{ fontSize: 20 }}/>
                    </IconButton>
                  </Tooltip>

                  {/* GIFs */}
                  {!editando && (
                    <Tooltip title="Enviar GIF">
                      <IconButton onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojis(false); }}
                        disabled={!connected} size="small"
                        sx={{ color: showGifPicker ? '#9c27b0' : '#9e9e9e', '&:hover': { color: '#9c27b0' }, p: 0.5 }}>
                        <GifIcon sx={{ fontSize: 22 }}/>
                      </IconButton>
                    </Tooltip>
                  )}

                  <TextField fullWidth size="small"
                    placeholder={
                      editando ? 'Edita tu mensaje...'
                        : grupoActual ? `Mensaje en ${grupoActual.nombre}...`
                          : chatPrivadoCon ? `Mensaje a ${chatPrivadoCon.nombre}...`
                            : 'Escribe un mensaje...'
                    }
                    value={mensaje}
                    onChange={(e) => { setMensaje(e.target.value); if (!editando) handleTyping(); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensaje(); } if (e.key === 'Escape' && editando) { setEditando(null); setMensaje(''); } }}
                    disabled={!connected || subiendoArchivo}
                    autoComplete="off"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 6, bgcolor: editando ? '#fff8e1' : '#fff', fontSize: '0.85rem',
                        '& fieldset': { borderColor: editando ? '#f57c00' : '#e0e0e0' },
                        '&:hover fieldset': { borderColor: editando ? '#ef6c00' : '#1a237e' },
                      },
                    }}
                  />

                  {/* Enviar / grabar */}
                  {mensaje.trim() ? (
                    <IconButton onClick={enviarMensaje} disabled={!connected}
                      sx={{ bgcolor: editando ? '#f57c00' : '#1a237e', color: '#fff', width: 36, height: 36,
                        '&:hover': { bgcolor: editando ? '#ef6c00' : '#283593' }, transition: 'all 0.2s' }}>
                      <SendIcon sx={{ fontSize: 18 }}/>
                    </IconButton>
                  ) : !editando ? (
                    <Tooltip title="Grabar nota de voz">
                      <span>
                        <IconButton onClick={startRecording} disabled={!connected || subiendoArchivo} size="small"
                          sx={{ bgcolor: 'transparent', color: '#9e9e9e', width: 36, height: 36,
                            '&:hover': { bgcolor: 'rgba(244,67,54,0.08)', color: '#f44336' }, transition: 'all 0.2s' }}>
                          <MicIcon sx={{ fontSize: 20 }}/>
                        </IconButton>
                      </span>
                    </Tooltip>
                  ) : (
                    // Cancelar edición si campo está vacío
                    <IconButton onClick={() => { setEditando(null); setMensaje(''); }} size="small"
                      sx={{ color: '#9e9e9e', width: 36, height: 36, '&:hover': { color: '#c62828' } }}>
                      <CloseIcon sx={{ fontSize: 18 }}/>
                    </IconButton>
                  )}
                </>
              )}
            </Box>
          )}
        </Paper>
      </Slide>

      {/* Popover de reacciones rápidas */}
      <Popover
        open={!!reaccionAnchor}
        anchorEl={reaccionAnchor}
        onClose={() => { setReaccionAnchor(null); setReaccionMsg(null); }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        PaperProps={{ sx: { borderRadius: 3, p: 0.8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' } }}
      >
        <Box sx={{ display: 'flex', gap: 0.3 }}>
          {REACCIONES_RAPIDAS.map(e => (
            <Box key={e} onClick={() => reaccionar(e)}
              sx={{ fontSize: '1.4rem', cursor: 'pointer', p: 0.5, borderRadius: 1,
                '&:hover': { bgcolor: 'action.hover', transform: 'scale(1.25)' }, transition: 'transform .1s' }}>
              {e}
            </Box>
          ))}
        </Box>
      </Popover>

      {/* Modal crear grupo */}
      <Dialog open={modalGrupo} onClose={() => setModalGrupo(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <GroupAddIcon color="primary"/> Crear Grupo
        </DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Nombre del grupo" size="small" value={nuevoGrupoNombre}
            onChange={(e) => setNuevoGrupoNombre(e.target.value)} sx={{ mt: 1, mb: 2 }} placeholder="Ej: Jefes de Local"/>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Agregar miembros ({contactosCombinados.length} disponibles):
          </Typography>
          <Box sx={{ maxHeight: 240, overflow: 'auto' }}>
            {contactosCombinados.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No hay usuarios disponibles
              </Typography>
            ) : (
              contactosCombinados.map((u) => (
                <FormControlLabel key={u.id}
                  control={
                    <Checkbox size="small"
                      checked={miembrosSeleccionados.some(m => m.id === u.id)}
                      onChange={(e) => {
                        if (e.target.checked) setMiembrosSeleccionados(prev => [...prev, u]);
                        else setMiembrosSeleccionados(prev => prev.filter(m => m.id !== u.id));
                      }}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={<CircleIcon sx={{ fontSize: 8, color: u.online ? '#4caf50' : '#bdbdbd' }}/>}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.6rem', bgcolor: colorFromId(u.id) }}>
                          {getInitials(u.nombre)}
                        </Avatar>
                      </Badge>
                      <Box>
                        <Typography variant="body2" sx={{ fontSize: '0.82rem', lineHeight: 1.2 }}>{u.nombre}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{u.sucursal || ''}</Typography>
                      </Box>
                    </Box>
                  }
                  sx={{ display: 'flex', mb: 0.5, ml: 0 }}
                />
              ))
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalGrupo(false)}>Cancelar</Button>
          <Button variant="contained" onClick={crearGrupo}
            disabled={!nuevoGrupoNombre.trim() || miembrosSeleccionados.length === 0 || creandoGrupo}
            startIcon={creandoGrupo ? <CircularProgress size={14} sx={{ color: 'inherit' }}/> : null}
            sx={{ bgcolor: '#1a237e', '&:hover': { bgcolor: '#283593' } }}>
            {creandoGrupo ? 'Creando...' : `Crear (${miembrosSeleccionados.length + 1} miembros)`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Visor imagen */}
      <Dialog open={!!verImagen} onClose={() => setVerImagen(null)} maxWidth="md"
        PaperProps={{ sx: { bgcolor: 'transparent', boxShadow: 'none', m: 1 } }}>
        <DialogContent sx={{ p: 0, lineHeight: 0, position: 'relative' }}>
          <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5, zIndex: 1 }}>
            <Tooltip title="Descargar">
              <IconButton component="a" href={verImagen} download size="small"
                sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' } }}>
                <DownloadIcon fontSize="small"/>
              </IconButton>
            </Tooltip>
            <IconButton onClick={() => setVerImagen(null)} size="small"
              sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' } }}>
              <CloseIcon fontSize="small"/>
            </IconButton>
          </Box>
          {verImagen && (
            <Box component="img" src={verImagen} alt="Vista previa"
              sx={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 2, display: 'block' }}/>
          )}
        </DialogContent>
      </Dialog>

      {/* Visor PDF */}
      <Dialog open={!!verPDF} onClose={() => setVerPDF(null)} maxWidth="lg" fullWidth
        PaperProps={{ sx: { height: '90vh', borderRadius: 2, m: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, px: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <PdfIcon sx={{ color: '#c62828', flexShrink: 0 }}/>
            <Typography variant="subtitle1" fontWeight={600} noWrap sx={{ maxWidth: 480 }}>
              {verPDF?.nombre}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
            <Tooltip title="Descargar">
              <IconButton component="a" href={verPDF?.url} download={verPDF?.nombre} size="small">
                <DownloadIcon/>
              </IconButton>
            </Tooltip>
            <IconButton onClick={() => setVerPDF(null)} size="small">
              <CloseIcon/>
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, flex: 1, overflow: 'hidden' }}>
          {verPDF && (
            <iframe
              src={verPDF.url}
              title={verPDF.nombre}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal agregar miembro */}
      <Dialog open={modalAgregar} onClose={() => setModalAgregar(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAddIcon color="primary"/> Agregar al grupo
        </DialogTitle>
        <DialogContent>
          <List dense>
            {contactosCombinados
              .filter(u => !grupoActual?.miembros?.some(m => m.id === u.id))
              .map((u) => (
                <ListItem key={u.id} button onClick={() => agregarMiembroAGrupo(u)}
                  sx={{ borderRadius: 1, mb: 0.5, '&:hover': { bgcolor: 'rgba(26,35,126,0.04)' }, cursor: 'pointer' }}>
                  <ListItemAvatar sx={{ minWidth: 40 }}>
                    <Avatar sx={{ width: 30, height: 30, fontSize: '0.65rem', bgcolor: colorFromId(u.id) }}>
                      {getInitials(u.nombre)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={u.nombre} secondary={u.online ? '● En línea' : u.sucursal || ''}/>
                </ListItem>
              ))
            }
            {contactosCombinados.filter(u => !grupoActual?.miembros?.some(m => m.id === u.id)).length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No hay más usuarios disponibles
              </Typography>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalAgregar(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog confirmación eliminar mensaje */}
      <Dialog
        open={!!mensajeAEliminar}
        onClose={() => setMensajeAEliminar(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, mx: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <DeleteIcon sx={{ color: '#c62828' }}/> Eliminar mensaje
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            ¿Estás seguro de que quieres eliminar este mensaje? Esta acción no se puede deshacer.
          </Typography>
          {mensajeAEliminar && !mensajeAEliminar.eliminado && (
            <Box sx={{
              bgcolor: '#f5f5f5', borderRadius: 1.5, px: 1.5, py: 1,
              borderLeft: '3px solid #bdbdbd', maxHeight: 60, overflow: 'hidden',
            }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {mensajeAEliminar.tipo === 'archivo'
                  ? `[${mensajeAEliminar.archivo?.nombre || 'Archivo'}]`
                  : mensajeAEliminar.mensaje?.substring(0, 120)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2 }}>
          <Button onClick={() => setMensajeAEliminar(null)} sx={{ textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={confirmarEliminar}
            sx={{ bgcolor: '#c62828', '&:hover': { bgcolor: '#b71c1c' }, textTransform: 'none', fontWeight: 700 }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
