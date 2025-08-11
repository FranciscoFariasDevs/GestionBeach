// frontend/src/pages/UsuarioPage.jsx
import React, { useState, useEffect } from 'react';
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
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../api/api';

export default function UsuarioPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [perfiles, setPerfiles] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [currentUsuario, setCurrentUsuario] = useState({ 
    id: null, 
    username: '', 
    nombre_completo: '', 
    password: '',
    perfil_id: ''
  });
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

  const handleOpenDialog = (usuario = null) => {
    if (usuario) {
      setCurrentUsuario({
        ...usuario,
        password: '' // No mostramos la contraseña actual por seguridad
      });
    } else {
      setCurrentUsuario({ 
        id: null, 
        username: '', 
        nombre_completo: '', 
        password: '',
        perfil_id: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleOpenDeleteDialog = (usuario) => {
    setCurrentUsuario(usuario);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentUsuario({ ...currentUsuario, [name]: value });
  };

  const handleSaveUsuario = async () => {
    // Validación básica
    if (!currentUsuario.username || !currentUsuario.nombre_completo || !currentUsuario.perfil_id) {
      enqueueSnackbar('Por favor complete todos los campos requeridos', { variant: 'error' });
      return;
    }

    // Validar contraseña para nuevos usuarios
    if (!currentUsuario.id && !currentUsuario.password) {
      enqueueSnackbar('La contraseña es requerida para nuevos usuarios', { variant: 'error' });
      return;
    }

    try {
      setLoading(true);
      
      if (currentUsuario.id) {
        // Preparar los datos para actualizar (quitar la contraseña si está vacía)
        const datosActualizados = { ...currentUsuario };
        if (!datosActualizados.password) {
          delete datosActualizados.password;
        }
        
        // Actualizar usuario existente
        await api.put(`/usuarios/${currentUsuario.id}`, datosActualizados);
        enqueueSnackbar('Usuario actualizado correctamente', { variant: 'success' });
      } else {
        // Crear nuevo usuario
        await api.post('/usuarios', currentUsuario);
        enqueueSnackbar('Usuario creado correctamente', { variant: 'success' });
      }
      
      // Recargar la lista de usuarios
      fetchUsuarios();
      handleCloseDialog();
    } catch (error) {
      enqueueSnackbar('Error al guardar usuario: ' + (error.response?.data?.message || 'Error del servidor'), { 
        variant: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUsuario = async () => {
    try {
      setLoading(true);
      await api.delete(`/usuarios/${currentUsuario.id}`);
      
      // Actualizar la lista de usuarios
      setUsuarios(usuarios.filter(u => u.id !== currentUsuario.id));
      
      handleCloseDeleteDialog();
      enqueueSnackbar('Usuario eliminado correctamente', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Error al eliminar usuario: ' + (error.response?.data?.message || 'Error del servidor'), { 
        variant: 'error' 
      });
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
                <TableCell colSpan={5} align="center">No hay usuarios disponibles</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog para crear/editar usuarios */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentUsuario.id ? 'Editar Usuario' : 'Nuevo Usuario'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              margin="dense"
              name="username"
              label="Username"
              fullWidth
              value={currentUsuario.username}
              onChange={handleInputChange}
              required
            />
            <TextField
              margin="dense"
              name="nombre_completo"
              label="Nombre Completo"
              fullWidth
              value={currentUsuario.nombre_completo}
              onChange={handleInputChange}
              required
            />
            <TextField
              margin="dense"
              name="password"
              label={currentUsuario.id ? "Nueva Contraseña (dejar en blanco para no cambiar)" : "Contraseña"}
              type="password"
              fullWidth
              value={currentUsuario.password}
              onChange={handleInputChange}
              required={!currentUsuario.id}
            />
            <FormControl fullWidth margin="dense" required>
              <InputLabel id="perfil-label">Perfil</InputLabel>
              <Select
                labelId="perfil-label"
                name="perfil_id"
                value={currentUsuario.perfil_id}
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
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Eliminar Usuario</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Está seguro que desea eliminar al usuario "{currentUsuario.nombre_completo}"? Esta acción no se puede deshacer.
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