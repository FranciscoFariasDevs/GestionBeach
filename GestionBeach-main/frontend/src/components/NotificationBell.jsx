// frontend/src/components/NotificationBell.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  IconButton, Badge, Popover, Box, Typography, List, ListItem,
  ListItemText, ListItemIcon, Divider, Button, Chip, Tooltip,
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
};

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl]       = useState(null);
  const [notifs, setNotifs]           = useState([]);
  const [noLeidas, setNoLeidas]       = useState(0);
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

  const marcarLeida = async (id, ruta) => {
    try { await api.put(`/notificaciones/${id}/leer`); } catch {}
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: 1 } : n));
    setNoLeidas(n => Math.max(0, n - 1));
    if (ruta) { cerrar(); navigate(ruta); }
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

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={cerrar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 380, maxHeight: 520, display: 'flex', flexDirection: 'column' } }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Notificaciones {noLeidas > 0 && <Chip label={noLeidas} size="small" color="error" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }}/>}
          </Typography>
          {noLeidas > 0 && (
            <Button size="small" startIcon={<DoneAllIcon/>} onClick={marcarTodas} sx={{ textTransform: 'none', fontSize: '0.72rem' }}>
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
                    onClick={() => marcarLeida(n.id, n.ruta)}
                    secondaryAction={
                      <IconButton size="small" onClick={(e) => eliminar(e, n.id)}>
                        <DeleteIcon sx={{ fontSize: 14, color: 'text.disabled' }}/>
                      </IconButton>
                    }
                    sx={{
                      cursor: 'pointer',
                      bgcolor: n.leida ? 'transparent' : (TIPO_COLOR[n.tipo] || '#f5f5f5'),
                      '&:hover': { bgcolor: 'action.hover' },
                      pr: 5,
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                      {getIcon(n.icono)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={n.leida ? 400 : 700} sx={{ lineHeight: 1.3 }}>
                          {n.titulo}
                        </Typography>
                      }
                      secondary={
                        <>
                          {n.mensaje && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
                              {n.mensaje}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.3 }}>
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
