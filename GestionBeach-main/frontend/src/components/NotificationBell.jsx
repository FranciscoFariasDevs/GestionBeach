// frontend/src/components/NotificationBell.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import {
  IconButton, Badge, Popover, Box, Typography, List, ListItem,
  ListItemText, ListItemIcon, Divider, Button, Chip, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  Notifications as BellIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as OkIcon,
  Info as InfoIcon,
  Schedule as ScheduleIcon,
  Upload as UploadIcon,
  RequestQuote as QuoteIcon,
  ViewKanban as KanbanIcon,
  DoneAll as DoneAllIcon,
  Delete as DeleteIcon,
  OpenInFull as ExpandIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { io as socketIO } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

const ICON_MAP = {
  warning:       <WarningIcon sx={{ color: '#ed6c02' }}/>,
  error:         <ErrorIcon   sx={{ color: '#d32f2f' }}/>,
  ok:            <OkIcon      sx={{ color: '#2e7d32' }}/>,
  schedule:      <ScheduleIcon sx={{ color: '#1565c0' }}/>,
  upload_file:   <UploadIcon  sx={{ color: '#6a1b9a' }}/>,
  request_quote: <QuoteIcon   sx={{ color: '#00838f' }}/>,
  kanban:        <KanbanIcon  sx={{ color: '#00838f' }}/>,
  notifications: <InfoIcon    sx={{ color: '#1565c0' }}/>,
};

const getIcon = (icono) => ICON_MAP[icono] || ICON_MAP.notifications;

const TIPO_COLOR = {
  planificacion_excedido: '#ffebee',
  planificacion_alerta:   '#fff3e0',
  planificacion_sin_oc:   '#f3e5f5',
  planificacion_sin_pbi:  '#f3e5f5',
  planificacion_sin_datos:'#fff3e0',
  cotizacion_nueva:       '#e0f7fa',
  kanban_vencimiento:     '#fce4ec',
  folio_critico:          '#ffebee',
  folio_alerta:           '#fff8e1',
};

const TIPO_ACCENT = {
  planificacion_excedido: '#c62828',
  planificacion_alerta:   '#e65100',
  planificacion_sin_oc:   '#6a1b9a',
  planificacion_sin_pbi:  '#6a1b9a',
  planificacion_sin_datos:'#e65100',
  cotizacion_nueva:       '#00838f',
  kanban_vencimiento:     '#ad1457',
  folio_critico:          '#c62828',
  folio_alerta:           '#e65100',
};

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl]     = useState(null);
  const [notifs, setNotifs]         = useState([]);
  const [noLeidas, setNoLeidas]     = useState(0);
  const [modalNotif, setModalNotif] = useState(null);
  const socketRef = useRef(null);

  const cargar = useCallback(async () => {
    try {
      const r = await api.get('/notificaciones');
      setNotifs(r.data.notificaciones || []);
      setNoLeidas(r.data.no_leidas || 0);
    } catch {}
  }, []);

  // Socket.IO — escuchar nueva_notificacion
  useEffect(() => {
    if (!user) return;
    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://192.168.100.150:5000';
    const socket = socketIO(SOCKET_URL, { transports: ['websocket'], autoConnect: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('registrar_usuario', { usuario_id: user.id, nombre: user.nombre });
    });

    socket.on('nueva_notificacion', (notif) => {
      setNotifs(prev => [notif, ...prev].slice(0, 50));
      setNoLeidas(n => n + 1);
    });

    return () => socket.disconnect();
  }, [user]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrir  = (e) => { setAnchorEl(e.currentTarget); cargar(); };
  const cerrar = () => setAnchorEl(null);

  const marcarLeida = async (id) => {
    try { await api.put(`/notificaciones/${id}/leer`); } catch {}
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: 1 } : n));
    setNoLeidas(n => Math.max(0, n - 1));
  };

  const abrirDetalle = (e, notif) => {
    e.stopPropagation();
    api.put(`/notificaciones/${notif.id}/leer`).catch(() => {});
    flushSync(() => {
      setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, leida: 1 } : n));
      setNoLeidas(n => Math.max(0, n - 1));
      cerrar();
    });
    setModalNotif(notif);
  };

  const marcarTodas = async () => {
    try { await api.put('/notificaciones/leer-todas'); } catch {}
    setNotifs(prev => prev.map(n => ({ ...n, leida: 1 })));
    setNoLeidas(0);
  };

  const eliminar = async (e, id) => {
    e.stopPropagation();
    try { await api.delete(`/notificaciones/${id}`); } catch {}
    setNotifs(prev => prev.filter(n => n.id !== id));
    setNoLeidas(n => Math.max(0, n - 1));
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Notificaciones">
        <IconButton onClick={abrir} sx={{ color: 'inherit' }}>
          <Badge badgeContent={noLeidas} color="error" max={99}>
            <BellIcon/>
          </Badge>
        </IconButton>
      </Tooltip>

      {/* Modal detalle notificación — genérico para todos los tipos */}
      <Dialog
        open={Boolean(modalNotif)}
        onClose={() => setModalNotif(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden', minHeight: 280 } }}
      >
        {modalNotif && (() => {
          const bgColor = TIPO_COLOR[modalNotif.tipo] || '#f5f5f5';
          const color   = TIPO_ACCENT[modalNotif.tipo] || '#1565c0';
          return (
            <>
              <DialogTitle sx={{ bgcolor: bgColor, pb: 2, pt: 3, px: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ fontSize: 44, display: 'flex', alignItems: 'center' }}>
                    {getIcon(modalNotif.icono)}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight={700} color={color} lineHeight={1.3}>
                      {modalNotif.titulo}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                      {new Date(modalNotif.fecha_creacion).toLocaleString('es-CL', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </Typography>
                  </Box>
                </Box>
              </DialogTitle>

              <DialogContent sx={{ px: 4, pt: 3, pb: 1 }}>
                {modalNotif.mensaje && (
                  <Box sx={{ bgcolor: bgColor, borderRadius: 2, p: 3, border: `1px solid ${color}30`, mb: 2 }}>
                    <Typography variant="body1" sx={{ fontSize: '1.05rem', whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                      {modalNotif.mensaje}
                    </Typography>
                  </Box>
                )}
                <Typography variant="caption" color="text.disabled">
                  Tipo: {modalNotif.tipo?.replace(/_/g, ' ')}
                </Typography>
              </DialogContent>

              <DialogActions sx={{ px: 4, pb: 3, pt: 1.5, gap: 1.5 }}>
                {modalNotif.ruta && (
                  <Button
                    onClick={() => { setModalNotif(null); navigate(modalNotif.ruta); }}
                    variant="outlined"
                    size="large"
                    disableElevation
                    sx={{ borderRadius: 2, textTransform: 'none', borderColor: color, color, px: 3 }}
                  >
                    Ir a la página
                  </Button>
                )}
                <Button
                  onClick={() => setModalNotif(null)}
                  variant="contained"
                  size="large"
                  disableElevation
                  sx={{ borderRadius: 2, textTransform: 'none', bgcolor: color, px: 3, '&:hover': { bgcolor: color, filter: 'brightness(0.9)' } }}
                >
                  Entendido
                </Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={cerrar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 500, maxHeight: 680, display: 'flex', flexDirection: 'column' } }}
      >
        {/* Header */}
        <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight={700}>
            Notificaciones {noLeidas > 0 && <Chip label={noLeidas} size="small" color="error" sx={{ ml: 1, height: 22, fontSize: '0.72rem' }}/>}
          </Typography>
          {noLeidas > 0 && (
            <Button size="small" startIcon={<DoneAllIcon/>} onClick={marcarTodas} sx={{ textTransform: 'none', fontSize: '0.8rem' }}>
              Marcar todas
            </Button>
          )}
        </Box>

        {/* Lista */}
        <Box sx={{ overflowY: 'auto', flex: 1 }}>
          {notifs.length === 0 ? (
            <Box sx={{ py: 5, textAlign: 'center' }}>
              <BellIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }}/>
              <Typography variant="body2" color="text.disabled">Sin notificaciones</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {notifs.map((n, i) => (
                <React.Fragment key={n.id}>
                  <ListItem
                    alignItems="flex-start"
                    onClick={(e) => abrirDetalle(e, n)}
                    secondaryAction={
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, pt: 0.5 }}>
                        <Tooltip title="Ver detalle">
                          <IconButton size="small" onClick={(e) => abrirDetalle(e, n)}>
                            <ExpandIcon sx={{ fontSize: 17, color: TIPO_ACCENT[n.tipo] || 'text.secondary' }}/>
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton size="small" onClick={(e) => eliminar(e, n.id)}>
                            <DeleteIcon sx={{ fontSize: 17, color: 'text.disabled' }}/>
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                    sx={{
                      cursor: 'pointer',
                      bgcolor: n.leida ? 'transparent' : (TIPO_COLOR[n.tipo] || '#f5f5f5'),
                      '&:hover': { bgcolor: 'action.hover' },
                      pr: 8,
                      py: 1.5,
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 42, mt: 0.5 }}>
                      <Box sx={{ fontSize: 26, display: 'flex' }}>{getIcon(n.icono)}</Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body1" fontWeight={n.leida ? 500 : 700} sx={{ lineHeight: 1.4, fontSize: '0.95rem' }}>
                          {n.titulo}
                        </Typography>
                      }
                      secondary={
                        <>
                          {n.mensaje && (
                            <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.5, fontSize: '0.83rem' }}>
                              {n.mensaje.length > 120 ? n.mensaje.slice(0, 120) + '…' : n.mensaje}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                            {new Date(n.fecha_creacion).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                  {i < notifs.length - 1 && <Divider component="li"/>}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
}
