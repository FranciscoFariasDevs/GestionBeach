import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Box, Typography, Button, Card, CardContent, CardActions,
  Grid, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Avatar, Chip, IconButton, Tooltip, Alert, CircularProgress,
  List, ListItem, ListItemAvatar, ListItemText, Checkbox, Divider,
  InputAdornment, Paper, AvatarGroup
} from '@mui/material';
import {
  Groups as GroupsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  PersonAdd as PersonAddIcon,
  Person as PersonIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../api/api';

const colorFromId = (id) => {
  const colores = ['#1565c0', '#2e7d32', '#c62828', '#6a1b9a', '#ef6c00', '#00838f', '#4527a0', '#d84315'];
  return colores[(id || 0) % colores.length];
};

const getInitials = (nombre) => {
  if (!nombre) return '?';
  return nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export default function GruposChatPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [grupos, setGrupos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal crear/editar
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null); // null = crear, objeto = editar
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [miembrosSeleccionados, setMiembrosSeleccionados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Modal confirmar eliminar
  const [eliminarId, setEliminarId] = useState(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [gruposRes, usuariosRes] = await Promise.all([
        api.get('/grupos-chat'),
        api.get('/grupos-chat/usuarios')
      ]);
      setGrupos(gruposRes.data.data || []);
      setUsuarios(usuariosRes.data.data || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
      enqueueSnackbar('Error cargando datos', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const abrirCrear = () => {
    setEditando(null);
    setNombre('');
    setDescripcion('');
    setMiembrosSeleccionados([]);
    setBusqueda('');
    setModalOpen(true);
  };

  const abrirEditar = (grupo) => {
    setEditando(grupo);
    setNombre(grupo.nombre);
    setDescripcion(grupo.descripcion || '');
    setMiembrosSeleccionados(
      grupo.miembros.map(m => ({
        id: m.id,
        nombre_completo: m.nombre,
        nombre: m.nombre,
        sucursal: m.sucursal || ''
      }))
    );
    setBusqueda('');
    setModalOpen(true);
  };

  const toggleMiembro = (usuario) => {
    setMiembrosSeleccionados(prev => {
      const existe = prev.find(m => m.id === usuario.id);
      if (existe) return prev.filter(m => m.id !== usuario.id);
      return [...prev, usuario];
    });
  };

  const guardar = async () => {
    if (!nombre.trim()) {
      enqueueSnackbar('El nombre del grupo es requerido', { variant: 'warning' });
      return;
    }
    if (miembrosSeleccionados.length < 2) {
      enqueueSnackbar('Se necesitan al menos 2 miembros', { variant: 'warning' });
      return;
    }

    setGuardando(true);
    try {
      const miembrosData = miembrosSeleccionados.map(u => ({
        id: u.id,
        nombre: u.nombre_completo || u.nombre,
        sucursal: u.sucursal || ''
      }));

      if (editando) {
        await api.put(`/grupos-chat/${editando._id}`, {
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          miembros: miembrosData
        });
        enqueueSnackbar('Grupo actualizado', { variant: 'success' });
      } else {
        await api.post('/grupos-chat', {
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          miembros: miembrosData
        });
        enqueueSnackbar('Grupo creado exitosamente', { variant: 'success' });
      }

      setModalOpen(false);
      cargarDatos();
    } catch (error) {
      console.error('Error guardando grupo:', error);
      enqueueSnackbar('Error guardando grupo', { variant: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  const eliminarGrupo = async () => {
    if (!eliminarId) return;
    try {
      await api.delete(`/grupos-chat/${eliminarId}`);
      enqueueSnackbar('Grupo eliminado', { variant: 'success' });
      setEliminarId(null);
      cargarDatos();
    } catch (error) {
      enqueueSnackbar('Error eliminando grupo', { variant: 'error' });
    }
  };

  const usuariosFiltrados = usuarios.filter(u => {
    const texto = busqueda.toLowerCase();
    return (u.nombre_completo || '').toLowerCase().includes(texto)
      || (u.perfil_nombre || '').toLowerCase().includes(texto)
      || (u.username || '').toLowerCase().includes(texto);
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <GroupsIcon sx={{ fontSize: 36, color: '#1a237e' }} />
          <Box>
            <Typography variant="h5" fontWeight={700} color="#1a237e">
              Grupos de Chat
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Crea y administra grupos cerrados de conversacion
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained" startIcon={<AddIcon />} onClick={abrirCrear}
          sx={{ bgcolor: '#1a237e', '&:hover': { bgcolor: '#283593' }, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
        >
          Crear Grupo
        </Button>
      </Box>

      {grupos.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }} elevation={2}>
          <GroupsIcon sx={{ fontSize: 64, color: '#e0e0e0', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No hay grupos creados
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Crea tu primer grupo para que los usuarios puedan comunicarse
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={abrirCrear}
            sx={{ bgcolor: '#1a237e', '&:hover': { bgcolor: '#283593' } }}>
            Crear Primer Grupo
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {grupos.map((grupo) => (
            <Grid item xs={12} sm={6} md={4} key={grupo._id}>
              <Card elevation={3} sx={{ borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                    <Avatar sx={{ bgcolor: colorFromId(grupo.nombre?.length || 0), width: 44, height: 44 }}>
                      <GroupsIcon />
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                        {grupo.nombre}
                      </Typography>
                      {grupo.descripcion && (
                        <Typography variant="caption" color="text.secondary">
                          {grupo.descripcion}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Divider sx={{ mb: 1.5 }} />

                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
                    {grupo.miembros?.length || 0} MIEMBROS
                  </Typography>

                  <Box display="flex" flexWrap="wrap" gap={0.5} mb={1}>
                    {grupo.miembros?.slice(0, 6).map((m) => (
                      <Chip
                        key={m.id}
                        avatar={<Avatar sx={{ bgcolor: colorFromId(m.id), width: 22, height: 22, fontSize: '0.6rem' }}>{getInitials(m.nombre)}</Avatar>}
                        label={m.nombre?.split(' ')[0]}
                        size="small"
                        sx={{ fontSize: '0.72rem', height: 26 }}
                      />
                    ))}
                    {(grupo.miembros?.length || 0) > 6 && (
                      <Chip label={`+${grupo.miembros.length - 6}`} size="small" sx={{ fontSize: '0.72rem', height: 26, bgcolor: '#e8eaf6' }} />
                    )}
                  </Box>

                  <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                    Creado por: {grupo.creado_por?.nombre || 'Sistema'}
                  </Typography>
                </CardContent>

                <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                  <Button size="small" startIcon={<EditIcon />} onClick={() => abrirEditar(grupo)}
                    sx={{ textTransform: 'none', fontWeight: 600 }}>
                    Editar
                  </Button>
                  <Button size="small" startIcon={<DeleteIcon />} color="error"
                    onClick={() => setEliminarId(grupo._id)}
                    sx={{ textTransform: 'none', fontWeight: 600, ml: 'auto' }}>
                    Eliminar
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ============ MODAL CREAR/EDITAR GRUPO ============ */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <GroupsIcon color="primary" />
          {editando ? 'Editar Grupo' : 'Crear Nuevo Grupo'}
          <IconButton onClick={() => setModalOpen(false)} sx={{ ml: 'auto' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth label="Nombre del grupo" variant="outlined" size="small"
            value={nombre} onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Jefes de Local"
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth label="Descripcion (opcional)" variant="outlined" size="small"
            value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: Grupo para coordinar jefes"
            sx={{ mb: 2 }}
          />

          {/* Miembros seleccionados */}
          {miembrosSeleccionados.length > 0 && (
            <Box mb={2}>
              <Typography variant="caption" fontWeight={600} color="primary" sx={{ mb: 0.5, display: 'block' }}>
                SELECCIONADOS ({miembrosSeleccionados.length})
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={0.5}>
                {miembrosSeleccionados.map((m) => (
                  <Chip
                    key={m.id}
                    label={m.nombre_completo || m.nombre}
                    size="small"
                    onDelete={() => toggleMiembro(m)}
                    avatar={<Avatar sx={{ bgcolor: colorFromId(m.id), width: 20, height: 20, fontSize: '0.55rem' }}>{getInitials(m.nombre_completo || m.nombre)}</Avatar>}
                    sx={{ fontSize: '0.75rem' }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Buscador */}
          <TextField
            fullWidth size="small" placeholder="Buscar usuario por nombre, perfil..."
            value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#9e9e9e' }} /></InputAdornment>
            }}
            sx={{ mb: 1 }}
          />

          {/* Lista de usuarios */}
          <Paper variant="outlined" sx={{ maxHeight: 350, overflow: 'auto' }}>
            <List dense disablePadding>
              {usuariosFiltrados.map((u) => {
                const seleccionado = miembrosSeleccionados.some(m => m.id === u.id);
                return (
                  <React.Fragment key={u.id}>
                    <ListItem
                      button
                      onClick={() => toggleMiembro(u)}
                      sx={{
                        py: 1, px: 2,
                        bgcolor: seleccionado ? 'rgba(26,35,126,0.06)' : 'transparent',
                        '&:hover': { bgcolor: seleccionado ? 'rgba(26,35,126,0.1)' : 'rgba(0,0,0,0.02)' },
                        cursor: 'pointer'
                      }}
                    >
                      <Checkbox
                        checked={seleccionado}
                        size="small"
                        sx={{ mr: 1, p: 0, color: '#1a237e', '&.Mui-checked': { color: '#1a237e' } }}
                      />
                      <ListItemAvatar sx={{ minWidth: 40 }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.7rem', bgcolor: colorFromId(u.id) }}>
                          {getInitials(u.nombre_completo)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight={seleccionado ? 700 : 400} sx={{ fontSize: '0.85rem' }}>
                            {u.nombre_completo}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {u.perfil_nombre || 'Sin perfil'} &middot; {u.username}
                          </Typography>
                        }
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                );
              })}
              {usuariosFiltrados.length === 0 && (
                <Box py={3} textAlign="center">
                  <Typography variant="body2" color="text.secondary">No se encontraron usuarios</Typography>
                </Box>
              )}
            </List>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setModalOpen(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button
            variant="contained" onClick={guardar} disabled={guardando || !nombre.trim() || miembrosSeleccionados.length < 2}
            sx={{ bgcolor: '#1a237e', '&:hover': { bgcolor: '#283593' }, textTransform: 'none', fontWeight: 600 }}
          >
            {guardando ? <CircularProgress size={20} color="inherit" /> : editando ? 'Guardar Cambios' : `Crear Grupo (${miembrosSeleccionados.length} miembros)`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ============ DIALOG CONFIRMAR ELIMINAR ============ */}
      <Dialog open={!!eliminarId} onClose={() => setEliminarId(null)} maxWidth="xs">
        <DialogTitle>Eliminar Grupo</DialogTitle>
        <DialogContent>
          <Typography>Estas seguro de que quieres eliminar este grupo? Los mensajes se mantendran pero nadie podra escribir mas.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEliminarId(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={eliminarGrupo}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
