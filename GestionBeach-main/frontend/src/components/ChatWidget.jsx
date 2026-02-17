import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Badge, Fab, Paper, Typography, TextField, IconButton, Avatar,
  List, ListItem, ListItemAvatar, ListItemText, Divider, Chip, Tooltip,
  Slide, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Checkbox, FormControlLabel
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
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

const getSocketURL = () => {
  const hostname = window.location.hostname;
  switch (hostname) {
    case 'localhost':
    case '127.0.0.1':
      return 'http://localhost:5000';
    case '192.168.100.150':
      return 'http://192.168.100.150:5000';
    case 'intranet.beach.cl':
    case 'concurso.beach.cl':
    case 'reservas.beach.cl':
      return 'https://api.beach.cl';
    default:
      return 'http://192.168.100.150:5000';
  }
};

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || getSocketURL();

const formatHora = (fecha) => {
  const d = new Date(fecha);
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
};

const formatFechaGrupo = (fecha) => {
  const d = new Date(fecha);
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);
  if (d.toDateString() === hoy.toDateString()) return 'Hoy';
  if (d.toDateString() === ayer.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
};

const getInitials = (nombre) => {
  if (!nombre) return '?';
  return nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const colorFromId = (id) => {
  const colores = ['#1565c0', '#2e7d32', '#c62828', '#6a1b9a', '#ef6c00', '#00838f', '#4527a0', '#d84315'];
  return colores[(id || 0) % colores.length];
};

const colorGrupo = (nombre) => {
  let hash = 0;
  for (let i = 0; i < (nombre || '').length; i++) hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  const colores = ['#1565c0', '#2e7d32', '#c62828', '#6a1b9a', '#ef6c00', '#00838f', '#4527a0', '#d84315'];
  return colores[Math.abs(hash) % colores.length];
};

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [tab, setTab] = useState(0); // 0=general, 1=usuarios, 2=grupos
  const [mensajes, setMensajes] = useState([]);
  const [mensajesPrivados, setMensajesPrivados] = useState({});
  const [mensajesGrupo, setMensajesGrupo] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [chatPrivadoCon, setChatPrivadoCon] = useState(null);
  const [grupoActual, setGrupoActual] = useState(null);
  const [grupos, setGrupos] = useState([]);
  const [escribiendo, setEscribiendo] = useState(null);
  const [escribiendoGrupo, setEscribiendoGrupo] = useState(null);
  const [noLeidos, setNoLeidos] = useState(0);
  const [noLeidosPrivados, setNoLeidosPrivados] = useState({});
  const [noLeidosGrupos, setNoLeidosGrupos] = useState({});
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Modal crear grupo
  const [modalGrupo, setModalGrupo] = useState(false);
  const [nuevoGrupoNombre, setNuevoGrupoNombre] = useState('');
  const [miembrosSeleccionados, setMiembrosSeleccionados] = useState([]);

  // Modal agregar miembro
  const [modalAgregar, setModalAgregar] = useState(false);

  // Conectar socket
  useEffect(() => {
    if (!user?.id) return;

    const s = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    s.on('connect', () => {
      setConnected(true);
      s.emit('registrar_usuario', {
        id: user.id,
        nombre: user.nombre || user.username || 'Usuario',
        sucursal: user.sucursal || ''
      });
      s.emit('cargar_historial', { sala: 'general', limite: 50 });
      s.emit('obtener_grupos');
    });

    s.on('disconnect', () => setConnected(false));

    s.on('usuarios_actualizados', (lista) => {
      setUsuarios(lista.filter(u => u.id !== user.id));
    });

    s.on('historial_cargado', (data) => {
      if (data.sala === 'general') {
        setMensajes(data.mensajes);
      } else {
        setMensajesPrivados(prev => ({ ...prev, [data.sala]: data.mensajes }));
      }
    });

    s.on('nuevo_mensaje', (msg) => {
      setMensajes(prev => [...prev, msg]);
      if (!open && msg.de.id !== user.id) {
        setNoLeidos(prev => prev + 1);
      }
    });

    s.on('nuevo_mensaje_privado', (msg) => {
      const sala = msg.sala;
      setMensajesPrivados(prev => ({
        ...prev,
        [sala]: [...(prev[sala] || []), msg]
      }));
      if (msg.de.id !== user.id) {
        const otroId = msg.de.id;
        if (!open || !chatPrivadoCon || chatPrivadoCon.id !== otroId) {
          setNoLeidosPrivados(prev => ({ ...prev, [otroId]: (prev[otroId] || 0) + 1 }));
        }
      }
    });

    // === EVENTOS DE GRUPO ===
    s.on('mis_grupos', (data) => {
      setGrupos(data);
    });

    s.on('grupo_creado', (grupo) => {
      setGrupos(prev => {
        if (prev.find(g => g._id === grupo._id)) return prev;
        return [grupo, ...prev];
      });
    });

    s.on('grupo_actualizado', (grupo) => {
      setGrupos(prev => prev.map(g => g._id === grupo._id ? grupo : g));
    });

    s.on('agregado_a_grupo', () => {
      s.emit('obtener_grupos');
    });

    s.on('salio_de_grupo', ({ grupoId }) => {
      setGrupos(prev => prev.filter(g => g._id !== grupoId));
      setGrupoActual(prev => prev?._id === grupoId ? null : prev);
    });

    s.on('historial_grupo_cargado', (data) => {
      setMensajesGrupo(prev => ({ ...prev, [data.grupoId]: data.mensajes }));
    });

    s.on('nuevo_mensaje_grupo', (msg) => {
      const gId = msg.grupoId;
      setMensajesGrupo(prev => ({
        ...prev,
        [gId]: [...(prev[gId] || []), msg]
      }));
      if (msg.de.id !== user.id) {
        if (!open || !grupoActual || grupoActual._id !== gId) {
          setNoLeidosGrupos(prev => ({ ...prev, [gId]: (prev[gId] || 0) + 1 }));
        }
      }
    });

    s.on('usuario_escribiendo_grupo', (data) => {
      setEscribiendoGrupo(data);
      setTimeout(() => setEscribiendoGrupo(null), 3000);
    });

    s.on('usuario_dejo_escribir_grupo', () => {
      setEscribiendoGrupo(null);
    });

    s.on('sistema_mensaje', (msg) => {
      setMensajes(prev => [...prev, { ...msg, _id: `sys_${Date.now()}`, de: { id: 0, nombre: 'Sistema' }, sala: 'general' }]);
    });

    s.on('usuario_escribiendo', (data) => setEscribiendo(data));
    s.on('usuario_dejo_escribir', () => setEscribiendo(null));

    setSocket(s);

    return () => { s.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Auto-scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensajes, mensajesPrivados, mensajesGrupo, chatPrivadoCon, grupoActual]);

  // Limpiar no leidos al abrir
  useEffect(() => {
    if (open && !chatPrivadoCon && !grupoActual) setNoLeidos(0);
    if (open && chatPrivadoCon) setNoLeidosPrivados(prev => ({ ...prev, [chatPrivadoCon.id]: 0 }));
    if (open && grupoActual) setNoLeidosGrupos(prev => ({ ...prev, [grupoActual._id]: 0 }));
  }, [open, chatPrivadoCon, grupoActual]);

  const enviarMensaje = useCallback(() => {
    if (!mensaje.trim() || !socket) return;

    if (grupoActual) {
      socket.emit('mensaje_grupo', {
        grupoId: grupoActual._id,
        mensaje: mensaje.trim()
      });
      socket.emit('dejo_escribir_grupo', { grupoId: grupoActual._id });
    } else if (chatPrivadoCon) {
      socket.emit('mensaje_privado', {
        deId: user.id,
        deNombre: user.nombre || user.username,
        paraId: chatPrivadoCon.id,
        paraNombre: chatPrivadoCon.nombre,
        mensaje: mensaje.trim()
      });
      socket.emit('dejo_escribir', { paraId: chatPrivadoCon.id });
    } else {
      socket.emit('mensaje_general', {
        deId: user.id,
        deNombre: user.nombre || user.username,
        mensaje: mensaje.trim()
      });
      socket.emit('dejo_escribir', { paraId: null });
    }

    setMensaje('');
  }, [mensaje, socket, chatPrivadoCon, grupoActual, user]);

  const handleTyping = useCallback(() => {
    if (!socket) return;
    if (grupoActual) {
      socket.emit('escribiendo_grupo', { grupoId: grupoActual._id });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('dejo_escribir_grupo', { grupoId: grupoActual._id });
      }, 2000);
    } else {
      socket.emit('escribiendo', { paraId: chatPrivadoCon?.id || null });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('dejo_escribir', { paraId: chatPrivadoCon?.id || null });
      }, 2000);
    }
  }, [socket, chatPrivadoCon, grupoActual]);

  const abrirChatPrivado = (usuario) => {
    setChatPrivadoCon(usuario);
    setGrupoActual(null);
    setNoLeidosPrivados(prev => ({ ...prev, [usuario.id]: 0 }));
    const salaPrivada = `privado_${[user.id, usuario.id].sort().join('_')}`;
    if (!mensajesPrivados[salaPrivada]) {
      socket.emit('cargar_historial', { sala: salaPrivada, limite: 50 });
    }
  };

  const abrirGrupo = (grupo) => {
    setGrupoActual(grupo);
    setChatPrivadoCon(null);
    setNoLeidosGrupos(prev => ({ ...prev, [grupo._id]: 0 }));
    if (!mensajesGrupo[grupo._id]) {
      socket.emit('cargar_historial_grupo', { grupoId: grupo._id, limite: 50 });
    }
  };

  const volverAtras = () => {
    setChatPrivadoCon(null);
    setGrupoActual(null);
  };

  const getMensajesActuales = () => {
    if (grupoActual) return mensajesGrupo[grupoActual._id] || [];
    if (chatPrivadoCon) {
      const salaPrivada = `privado_${[user.id, chatPrivadoCon.id].sort().join('_')}`;
      return mensajesPrivados[salaPrivada] || [];
    }
    return mensajes;
  };

  const crearGrupo = () => {
    if (!nuevoGrupoNombre.trim() || miembrosSeleccionados.length === 0) return;
    socket.emit('crear_grupo', {
      nombre: nuevoGrupoNombre.trim(),
      descripcion: '',
      miembros: miembrosSeleccionados.map(u => ({ id: u.id, nombre: u.nombre, sucursal: u.sucursal || '' }))
    });
    setModalGrupo(false);
    setNuevoGrupoNombre('');
    setMiembrosSeleccionados([]);
  };

  const salirDeGrupo = (grupoId) => {
    socket.emit('salir_grupo', { grupoId });
  };

  const agregarMiembroAGrupo = (usuario) => {
    if (!grupoActual) return;
    socket.emit('agregar_miembro_grupo', {
      grupoId: grupoActual._id,
      miembro: { id: usuario.id, nombre: usuario.nombre, sucursal: usuario.sucursal || '' }
    });
    setModalAgregar(false);
  };

  const totalNoLeidos = noLeidos
    + Object.values(noLeidosPrivados).reduce((a, b) => a + b, 0)
    + Object.values(noLeidosGrupos).reduce((a, b) => a + b, 0);

  const totalNoLeidosGrupos = Object.values(noLeidosGrupos).reduce((a, b) => a + b, 0);

  const getEscribiendoTexto = () => {
    if (grupoActual && escribiendoGrupo && escribiendoGrupo.grupoId === grupoActual._id) {
      return `${escribiendoGrupo.nombre} está escribiendo...`;
    }
    if (!grupoActual && escribiendo) {
      return `${escribiendo.nombre} está escribiendo...`;
    }
    return null;
  };

  const enChat = chatPrivadoCon || grupoActual;

  const renderMensaje = (msg, idx, lista) => {
    const esMio = msg.de.id === user.id;
    const esSistema = msg.tipo === 'sistema';
    const mostrarFecha = idx === 0 || formatFechaGrupo(msg.fecha) !== formatFechaGrupo(lista[idx - 1]?.fecha);

    return (
      <React.Fragment key={msg._id || idx}>
        {mostrarFecha && (
          <Box sx={{ textAlign: 'center', my: 1.5 }}>
            <Chip label={formatFechaGrupo(msg.fecha)} size="small"
              sx={{ bgcolor: '#e8eaf6', fontSize: '0.68rem', height: 22, fontWeight: 600 }} />
          </Box>
        )}
        {esSistema ? (
          <Box sx={{ textAlign: 'center', my: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#9e9e9e', fontStyle: 'italic', fontSize: '0.7rem' }}>
              {msg.mensaje}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: esMio ? 'flex-end' : 'flex-start', mb: 0.8, px: 1 }}>
            {!esMio && (
              <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem', bgcolor: colorFromId(msg.de.id), mr: 0.8, mt: 0.5 }}>
                {getInitials(msg.de.nombre)}
              </Avatar>
            )}
            <Box sx={{ maxWidth: '75%' }}>
              {!esMio && (
                <Typography variant="caption" sx={{ fontWeight: 600, color: colorFromId(msg.de.id), fontSize: '0.68rem', ml: 0.5 }}>
                  {msg.de.nombre}
                </Typography>
              )}
              <Box sx={{
                bgcolor: esMio ? '#1a237e' : '#f5f5f5',
                color: esMio ? '#fff' : '#212121',
                borderRadius: esMio ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                px: 1.8, py: 0.8,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
              }}>
                <Typography variant="body2" sx={{ fontSize: '0.82rem', lineHeight: 1.4, wordBreak: 'break-word' }}>
                  {msg.mensaje}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{
                color: '#9e9e9e', fontSize: '0.62rem', display: 'block',
                textAlign: esMio ? 'right' : 'left', mt: 0.2, mx: 0.5
              }}>
                {formatHora(msg.fecha)}
              </Typography>
            </Box>
          </Box>
        )}
      </React.Fragment>
    );
  };

  if (!user?.id) return null;

  return (
    <>
      {/* FAB del chat */}
      <Tooltip title={open ? '' : 'Chat interno'} placement="left">
        <Fab
          onClick={() => setOpen(!open)}
          sx={{
            position: 'fixed', bottom: 90, right: 24, zIndex: 1300,
            bgcolor: open ? '#424242' : '#1a237e', color: '#fff',
            width: 52, height: 52,
            '&:hover': { bgcolor: open ? '#616161' : '#283593', transform: 'scale(1.05)' },
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 16px rgba(26,35,126,0.35)'
          }}
        >
          <Badge badgeContent={totalNoLeidos} color="error" max={99}
            sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', minWidth: 18, height: 18 } }}>
            {open ? <CloseIcon /> : <ChatIcon />}
          </Badge>
        </Fab>
      </Tooltip>

      {/* Ventana de chat */}
      <Slide direction="up" in={open} mountOnEnter unmountOnExit>
        <Paper sx={{
          position: 'fixed', bottom: 155, right: 24, width: 380, height: 520, zIndex: 1300,
          borderRadius: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)'
        }}>

          {/* Header */}
          <Box sx={{
            background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
            p: 1.5, px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 56
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {enChat ? (
                <>
                  <IconButton size="small" onClick={volverAtras} sx={{ color: '#fff', p: 0.3 }}>
                    <ArrowBackIcon fontSize="small" />
                  </IconButton>
                  <Avatar sx={{
                    width: 32, height: 32, fontSize: '0.75rem',
                    bgcolor: grupoActual ? colorGrupo(grupoActual.nombre) : colorFromId(chatPrivadoCon?.id)
                  }}>
                    {grupoActual ? <GroupsIcon sx={{ fontSize: 18 }} /> : getInitials(chatPrivadoCon?.nombre)}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" color="#fff" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                      {grupoActual ? grupoActual.nombre : chatPrivadoCon?.nombre}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem' }}>
                      {grupoActual ? `${grupoActual.miembros?.length || 0} miembros` : 'En linea'}
                    </Typography>
                  </Box>
                  {grupoActual && (
                    <Tooltip title="Agregar miembro">
                      <IconButton size="small" onClick={() => setModalAgregar(true)} sx={{ color: 'rgba(255,255,255,0.7)', ml: 'auto' }}>
                        <PersonAddIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </>
              ) : (
                <>
                  <ChatIcon sx={{ color: '#fff', fontSize: 22 }} />
                  <Box>
                    <Typography variant="subtitle2" color="#fff" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                      Chat Interno
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CircleIcon sx={{ fontSize: 7, color: connected ? '#69f0ae' : '#ff5252' }} />
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.62rem' }}>
                        {connected ? `${usuarios.length + 1} en linea` : 'Reconectando...'}
                      </Typography>
                    </Box>
                  </Box>
                </>
              )}
            </Box>
            <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'rgba(255,255,255,0.7)' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Tabs (solo cuando NO hay chat activo) */}
          {!enChat && (
            <Tabs value={tab} onChange={(_, v) => setTab(v)}
              variant="fullWidth"
              sx={{
                minHeight: 38, bgcolor: '#f5f5f5',
                '& .MuiTab-root': { minHeight: 38, textTransform: 'none', fontSize: '0.72rem', fontWeight: 600, minWidth: 0, px: 1 },
                '& .Mui-selected': { color: '#1a237e' },
                '& .MuiTabs-indicator': { bgcolor: '#1a237e' }
              }}
            >
              <Tab icon={<ForumIcon sx={{ fontSize: 15 }} />} iconPosition="start" label="General" />
              <Tab
                icon={<Badge badgeContent={Object.values(noLeidosPrivados).reduce((a, b) => a + b, 0)} color="error" max={9}>
                  <PeopleIcon sx={{ fontSize: 15 }} />
                </Badge>}
                iconPosition="start"
                label={`Online (${usuarios.length})`}
              />
              <Tab
                icon={<Badge badgeContent={totalNoLeidosGrupos} color="error" max={9}>
                  <GroupsIcon sx={{ fontSize: 15 }} />
                </Badge>}
                iconPosition="start"
                label={`Grupos`}
              />
            </Tabs>
          )}

          {/* Contenido */}
          <Box sx={{ flex: 1, overflow: 'auto', bgcolor: '#fff' }}>

            {/* TAB GENERAL o CHAT PRIVADO o CHAT GRUPO */}
            {(tab === 0 || enChat) && (
              <Box sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                {getMensajesActuales().length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
                    <ChatIcon sx={{ fontSize: 48, color: '#e0e0e0', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      {grupoActual
                        ? `Inicia la conversacion en ${grupoActual.nombre}`
                        : chatPrivadoCon
                          ? `Inicia una conversacion con ${chatPrivadoCon.nombre}`
                          : 'No hay mensajes aun. Se el primero en escribir.'}
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ py: 1 }}>
                    {getMensajesActuales().map((msg, idx, arr) => renderMensaje(msg, idx, arr))}
                  </Box>
                )}
                {getEscribiendoTexto() && (
                  <Box sx={{ px: 2, pb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#9e9e9e', fontStyle: 'italic', fontSize: '0.68rem' }}>
                      {getEscribiendoTexto()}
                    </Typography>
                  </Box>
                )}
                <div ref={messagesEndRef} />
              </Box>
            )}

            {/* TAB USUARIOS */}
            {tab === 1 && !enChat && (
              <List dense sx={{ py: 0 }}>
                {usuarios.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <PeopleIcon sx={{ fontSize: 48, color: '#e0e0e0', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      No hay otros usuarios conectados
                    </Typography>
                  </Box>
                ) : (
                  usuarios.map((u) => (
                    <React.Fragment key={u.id}>
                      <ListItem
                        button
                        onClick={() => { abrirChatPrivado(u); setTab(0); }}
                        sx={{ py: 1.2, px: 2, '&:hover': { bgcolor: 'rgba(26,35,126,0.04)' }, cursor: 'pointer' }}
                      >
                        <ListItemAvatar sx={{ minWidth: 44 }}>
                          <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            badgeContent={<CircleIcon sx={{ fontSize: 10, color: '#4caf50' }} />}>
                            <Avatar sx={{ width: 34, height: 34, fontSize: '0.75rem', bgcolor: colorFromId(u.id) }}>
                              {getInitials(u.nombre)}
                            </Avatar>
                          </Badge>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.82rem' }}>
                                {u.nombre}
                              </Typography>
                              {noLeidosPrivados[u.id] > 0 && (
                                <Chip label={noLeidosPrivados[u.id]} size="small" color="error"
                                  sx={{ height: 18, fontSize: '0.65rem', minWidth: 18 }} />
                              )}
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              {u.sucursal || 'Sin sucursal'}
                            </Typography>
                          }
                        />
                      </ListItem>
                      <Divider variant="inset" component="li" />
                    </React.Fragment>
                  ))
                )}
              </List>
            )}

            {/* TAB GRUPOS */}
            {tab === 2 && !enChat && (
              <Box>
                {/* Boton crear grupo */}
                <Box sx={{ p: 1.5, pb: 0 }}>
                  <Button
                    fullWidth variant="outlined" startIcon={<GroupAddIcon />}
                    onClick={() => setModalGrupo(true)}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, borderColor: '#1a237e', color: '#1a237e' }}
                  >
                    Crear Grupo
                  </Button>
                </Box>

                <List dense sx={{ py: 1 }}>
                  {grupos.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 5 }}>
                      <GroupsIcon sx={{ fontSize: 48, color: '#e0e0e0', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        No perteneces a ningun grupo
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Crea uno para empezar a chatear
                      </Typography>
                    </Box>
                  ) : (
                    grupos.map((g) => (
                      <React.Fragment key={g._id}>
                        <ListItem
                          button
                          onClick={() => abrirGrupo(g)}
                          sx={{ py: 1.2, px: 2, '&:hover': { bgcolor: 'rgba(26,35,126,0.04)' }, cursor: 'pointer' }}
                          secondaryAction={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {noLeidosGrupos[g._id] > 0 && (
                                <Chip label={noLeidosGrupos[g._id]} size="small" color="error"
                                  sx={{ height: 18, fontSize: '0.65rem', minWidth: 18 }} />
                              )}
                              <Tooltip title="Salir del grupo">
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); salirDeGrupo(g._id); }}
                                  sx={{ color: '#bdbdbd', '&:hover': { color: '#f44336' } }}>
                                  <ExitIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          }
                        >
                          <ListItemAvatar sx={{ minWidth: 44 }}>
                            <Avatar sx={{ width: 34, height: 34, fontSize: '0.7rem', bgcolor: colorGrupo(g.nombre) }}>
                              <GroupsIcon sx={{ fontSize: 18 }} />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.82rem' }}>
                                {g.nombre}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                {g.miembros?.length || 0} miembros
                              </Typography>
                            }
                          />
                        </ListItem>
                        <Divider variant="inset" component="li" />
                      </React.Fragment>
                    ))
                  )}
                </List>
              </Box>
            )}
          </Box>

          {/* Input de mensaje */}
          {(tab === 0 || enChat) && (
            <Box sx={{
              p: 1, px: 1.5, borderTop: '1px solid #e0e0e0', bgcolor: '#fafafa',
              display: 'flex', alignItems: 'center', gap: 0.5
            }}>
              <TextField
                fullWidth size="small"
                placeholder={
                  grupoActual ? `Mensaje en ${grupoActual.nombre}...`
                    : chatPrivadoCon ? `Mensaje a ${chatPrivadoCon.nombre}...`
                      : 'Escribe un mensaje...'
                }
                value={mensaje}
                onChange={(e) => { setMensaje(e.target.value); handleTyping(); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensaje(); } }}
                disabled={!connected}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 6, bgcolor: '#fff', fontSize: '0.85rem',
                    '& fieldset': { borderColor: '#e0e0e0' },
                    '&:hover fieldset': { borderColor: '#1a237e' }
                  }
                }}
                autoComplete="off"
              />
              <IconButton
                onClick={enviarMensaje}
                disabled={!mensaje.trim() || !connected}
                sx={{
                  bgcolor: mensaje.trim() ? '#1a237e' : 'transparent',
                  color: mensaje.trim() ? '#fff' : '#bdbdbd',
                  width: 38, height: 38,
                  '&:hover': { bgcolor: '#283593', color: '#fff' },
                  transition: 'all 0.2s'
                }}
              >
                <SendIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          )}
        </Paper>
      </Slide>

      {/* ========== MODAL CREAR GRUPO ========== */}
      <Dialog open={modalGrupo} onClose={() => setModalGrupo(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <GroupAddIcon color="primary" /> Crear Grupo
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth label="Nombre del grupo" variant="outlined" size="small"
            value={nuevoGrupoNombre} onChange={(e) => setNuevoGrupoNombre(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
            placeholder="Ej: Jefes de Local"
          />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Seleccionar miembros ({usuarios.length} en linea):</Typography>
          <Box sx={{ maxHeight: 250, overflow: 'auto' }}>
            {usuarios.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No hay usuarios conectados
              </Typography>
            ) : (
              usuarios.map((u) => (
                <FormControlLabel
                  key={u.id}
                  control={
                    <Checkbox
                      checked={miembrosSeleccionados.some(m => m.id === u.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setMiembrosSeleccionados(prev => [...prev, u]);
                        } else {
                          setMiembrosSeleccionados(prev => prev.filter(m => m.id !== u.id));
                        }
                      }}
                      size="small"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: '0.6rem', bgcolor: colorFromId(u.id) }}>
                        {getInitials(u.nombre)}
                      </Avatar>
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
          <Button
            variant="contained" onClick={crearGrupo}
            disabled={!nuevoGrupoNombre.trim() || miembrosSeleccionados.length === 0}
            sx={{ bgcolor: '#1a237e', '&:hover': { bgcolor: '#283593' } }}
          >
            Crear ({miembrosSeleccionados.length + 1} miembros)
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========== MODAL AGREGAR MIEMBRO ========== */}
      <Dialog open={modalAgregar} onClose={() => setModalAgregar(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAddIcon color="primary" /> Agregar al grupo
        </DialogTitle>
        <DialogContent>
          <List dense>
            {usuarios
              .filter(u => !grupoActual?.miembros?.some(m => m.id === u.id))
              .map((u) => (
                <ListItem key={u.id} button onClick={() => agregarMiembroAGrupo(u)}
                  sx={{ borderRadius: 1, mb: 0.5, '&:hover': { bgcolor: 'rgba(26,35,126,0.04)' }, cursor: 'pointer' }}>
                  <ListItemAvatar sx={{ minWidth: 40 }}>
                    <Avatar sx={{ width: 30, height: 30, fontSize: '0.65rem', bgcolor: colorFromId(u.id) }}>
                      {getInitials(u.nombre)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={u.nombre} secondary={u.sucursal || ''} />
                </ListItem>
              ))
            }
            {usuarios.filter(u => !grupoActual?.miembros?.some(m => m.id === u.id)).length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                Todos los usuarios en linea ya son miembros
              </Typography>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalAgregar(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
