// frontend/src/pages/UsuarioPage.jsx
import React, { useState, useEffect } from 'react';
import { useDialog } from '../hooks/useDialog';
import {
  Box,
  Button,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Stack,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ElectricBolt as ElectricIcon,
  Computer as ComputerIcon,
  Build as BuildIcon,
  People as PeopleIcon,
  AccountBalance as FinanzasIcon,
} from '@mui/icons-material';
import Chip from '@mui/material/Chip';
import { useSnackbar } from 'notistack';
import api from '../api/api';

const DEPARTAMENTOS = [
  { id: 1, nombre: 'Electricidad',       color: '#FF9800', icon: <ElectricIcon sx={{ fontSize: 14 }} /> },
  { id: 2, nombre: 'Informática',        color: '#2196F3', icon: <ComputerIcon sx={{ fontSize: 14 }} /> },
  { id: 3, nombre: 'Mantenciones',       color: '#4CAF50', icon: <BuildIcon    sx={{ fontSize: 14 }} /> },
  { id: 4, nombre: 'Recursos Humanos',   color: '#9C27B0', icon: <PeopleIcon   sx={{ fontSize: 14 }} /> },
  { id: 5, nombre: 'Finanzas',           color: '#F44336', icon: <FinanzasIcon sx={{ fontSize: 14 }} /> },
];

export default function UsuarioPage() {
  const emptyUsuario = { id: null, username: '', nombre_completo: '', password: '', perfil_id: '' };
  const [usuarios, setUsuarios] = useState([]);
  const [perfiles, setPerfiles] = useState([]);
  const [deptSeleccionados, setDeptSeleccionados] = useState([]);
  const formDialog   = useDialog({ data: emptyUsuario });  // diálogo crear/editar
  const deleteDialog = useDialog();                         // diálogo confirmar eliminar
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchUsuarios();
    fetchPerfiles();
  }, []);

  // Obtener usuarios del servidor
  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const response = await api.get('/usuarios');
      setUsuarios(response.data || []);
    } catch (error) {
      enqueueSnackbar('Error al cargar usuarios: ' + (error.response?.data?.message || 'Error del servidor'), { 
        variant: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Obtener perfiles del servidor
// En UsuarioPage.jsx, línea 73-80 aproximadamente
const fetchPerfiles = async () => {
  try {
    const response = await api.get('/perfiles');
    setPerfiles(response.data || []);
  } catch (error) {
    console.warn('⚠️ Error al cargar perfiles (puede ser normal si el backend no está listo):', error);
    // Establecer array vacío en lugar de mostrar error
    setPerfiles([]);
    
    // Solo mostrar snackbar si no es error 404
    if (error.response?.status !== 404) {
      enqueueSnackbar('Error al cargar perfiles', { variant: 'error' });
    }
  }
};

  const handleOpenDialog = async (usuario = null) => {
    formDialog.openDialog(usuario ? { ...usuario, password: '' } : emptyUsuario);
    // Cargar departamentos actuales del usuario si existe
    if (usuario?.id) {
      try {
        const r = await api.get(`/tickets/dept/${usuario.id}/check`).catch(() => null);
        // Obtenemos sus departamentos actuales
        const r2 = await api.get('/tickets/mis-departamentos', {
          headers: { 'x-usuario-override': usuario.id }
        }).catch(() => null);
        // Fallback: cargar via endpoint de usuarios del dept
        const deptsActuales = [];
        for (const d of DEPARTAMENTOS) {
          const res = await api.get(`/tickets/dept/${d.id}/usuarios`).catch(() => null);
          if (res?.data?.usuarios?.some(u => u.id === usuario.id)) {
            deptsActuales.push(d.id);
          }
        }
        setDeptSeleccionados(deptsActuales);
      } catch { setDeptSeleccionados([]); }
    } else {
      setDeptSeleccionados([]);
    }
  };

  const toggleDept = (id) => {
    setDeptSeleccionados(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const handleCloseDialog = () => {
    formDialog.closeDialog();
  };

  const handleOpenDeleteDialog = (usuario) => {
    deleteDialog.openDialog(usuario);
  };

  const handleCloseDeleteDialog = () => {
    deleteDialog.closeDialog();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    formDialog.setData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveUsuario = async () => {
    const usuario = formDialog.data;
    if (!usuario.username || !usuario.nombre_completo || !usuario.perfil_id) {
      enqueueSnackbar('Por favor complete todos los campos requeridos', { variant: 'error' });
      return;
    }
    if (!usuario.id && !usuario.password) {
      enqueueSnackbar('La contraseña es requerida para nuevos usuarios', { variant: 'error' });
      return;
    }

    try {
      setLoading(true);
      let targetId = usuario.id || null;

      if (usuario.id) {
        const datosActualizados = { ...usuario };
        if (!datosActualizados.password) delete datosActualizados.password;
        await api.put(`/usuarios/${usuario.id}`, datosActualizados);
        enqueueSnackbar('Usuario actualizado correctamente', { variant: 'success' });
      } else {
        const resp = await api.post('/usuarios', usuario);
        targetId = resp.data?.id || null;
        enqueueSnackbar('Usuario creado correctamente', { variant: 'success' });
      }
      fetchUsuarios();

      // Guardar departamentos del usuario
      if (targetId) {
        for (const d of DEPARTAMENTOS) {
          await api.post('/tickets/dept/asignar-usuario', {
            usuario_id: targetId, departamento_id: d.id, accion: 'quitar'
          }).catch(() => {});
        }
        for (const dId of deptSeleccionados) {
          await api.post('/tickets/dept/asignar-usuario', {
            usuario_id: targetId, departamento_id: dId, accion: 'agregar'
          }).catch(() => {});
        }
      }

      handleCloseDialog();
    } catch (error) {
      enqueueSnackbar('Error al guardar usuario: ' + (error.response?.data?.message || 'Error del servidor'), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUsuario = async () => {
    const usuario = deleteDialog.data;
    try {
      setLoading(true);
      await api.delete(`/usuarios/${usuario.id}`);
      setUsuarios(usuarios.filter(u => u.id !== usuario.id));
      handleCloseDeleteDialog();
      enqueueSnackbar('Usuario eliminado correctamente', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Error al eliminar usuario: ' + (error.response?.data?.message || 'Error del servidor'), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && usuarios.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Gestión de Usuarios</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nuevo Usuario
        </Button>
      </Stack>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Perfil</TableCell>
              <TableCell>Departamentos</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.isArray(usuarios) && usuarios.map((usuario) => (
              <TableRow key={usuario.id}>
                <TableCell>{usuario.id}</TableCell>
                <TableCell>{usuario.username}</TableCell>
                <TableCell>{usuario.nombre_completo}</TableCell>
                <TableCell>
                  {Array.isArray(perfiles) ? 
                    perfiles.find(p => p.id === usuario.perfil_id)?.nombre || 'Sin perfil' :
                    'Sin perfil'
                  }
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {(usuario.departamentos || []).map(d => {
                      const dept = DEPARTAMENTOS.find(dep => dep.id === d.id || dep.nombre === d.nombre);
                      return (
                        <Chip key={d.id || d.nombre} label={d.nombre || dept?.nombre} size="small"
                          sx={{ bgcolor: dept?.color || '#666', color: 'white', fontSize: '0.65rem' }} />
                      );
                    })}
                  </Stack>
                </TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => handleOpenDialog(usuario)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleOpenDeleteDialog(usuario)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {(!Array.isArray(usuarios) || usuarios.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} align="center">No hay usuarios disponibles</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog para crear/editar usuarios */}
      <Dialog open={formDialog.open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {formDialog.data?.id ? 'Editar Usuario' : 'Nuevo Usuario'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              margin="dense"
              name="username"
              label="Username"
              fullWidth
              value={formDialog.data?.username || ''}
              onChange={handleInputChange}
              required
            />
            <TextField
              margin="dense"
              name="nombre_completo"
              label="Nombre Completo"
              fullWidth
              value={formDialog.data?.nombre_completo || ''}
              onChange={handleInputChange}
              required
            />
            <TextField
              margin="dense"
              name="password"
              label={formDialog.data?.id ? "Nueva Contraseña (dejar en blanco para no cambiar)" : "Contraseña"}
              type="password"
              fullWidth
              value={formDialog.data?.password || ''}
              onChange={handleInputChange}
              required={!formDialog.data?.id}
            />
            <FormControl fullWidth margin="dense" required>
              <InputLabel id="perfil-label">Perfil</InputLabel>
              <Select
                labelId="perfil-label"
                name="perfil_id"
                value={formDialog.data?.perfil_id || ''}
                onChange={handleInputChange}
                label="Perfil"
              >
                {Array.isArray(perfiles) && perfiles.map((perfil) => (
                  <MenuItem key={perfil.id} value={perfil.id}>
                    {perfil.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Selector de departamentos */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Departamentos asignados <em>(opcional — solo para técnicos)</em>
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                {DEPARTAMENTOS.map(d => {
                  const sel = deptSeleccionados.includes(d.id);
                  return (
                    <Chip
                      key={d.id}
                      icon={d.icon}
                      label={d.nombre}
                      onClick={() => toggleDept(d.id)}
                      variant={sel ? 'filled' : 'outlined'}
                      sx={{
                        bgcolor: sel ? d.color : 'transparent',
                        color: sel ? 'white' : d.color,
                        borderColor: d.color,
                        fontWeight: sel ? 700 : 400,
                        cursor: 'pointer',
                        '& .MuiChip-icon': { color: sel ? 'white' : d.color },
                      }}
                    />
                  );
                })}
              </Stack>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSaveUsuario}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para confirmar eliminación */}
      <Dialog open={deleteDialog.open} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Eliminar Usuario</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Está seguro que desea eliminar al usuario "{deleteDialog.data?.nombre_completo}"? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
          <Button
            onClick={handleDeleteUsuario}
            color="error"
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}