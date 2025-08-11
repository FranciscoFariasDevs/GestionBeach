// ModulosPage.jsx
import pantallasDisponibles from '../constants/pantallasDisponibles';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
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
  Snackbar,
  Alert,
  Chip
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import api from '../api/api';

const ModulosPage = () => {
  const [modulos, setModulos] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [currentModulo, setCurrentModulo] = useState({ 
    id: null, 
    nombre: '', 
    descripcion: '', 
    ruta: '', 
    icono: '',
    tipo: 'menu'
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchModulos();
  }, []);

  const fetchModulos = async () => {
    try {
      const response = await api.get('/modulos');
      setModulos(response.data);
    } catch (error) {
      console.error('Error al cargar módulos:', error);
      showSnackbar('Error al cargar módulos', 'error');
    }
  };

  const handleOpenDialog = (modulo = { id: null, nombre: '', descripcion: '', ruta: '', icono: '', tipo: 'menu' }) => {
    setCurrentModulo(modulo);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentModulo({ id: null, nombre: '', descripcion: '', ruta: '', icono: '', tipo: 'menu' });
  };

  const handleOpenDeleteDialog = (modulo) => {
    setCurrentModulo(modulo);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentModulo({ ...currentModulo, [name]: value });
  };

  const iconosDisponibles = [
    { nombre: 'Dashboard', valor: 'dashboard' },
    { nombre: 'Ventas', valor: 'shopping_cart' },
    { nombre: 'Compras', valor: 'store' },
    { nombre: 'Reportes', valor: 'assessment' },
    { nombre: 'Dashboard Gerencial', valor: 'pie_chart' },
    { nombre: 'Usuarios', valor: 'people' },
    { nombre: 'Tarjeta Empleado', valor: 'badge' },
    { nombre: 'Configuración', valor: 'settings' },
    { nombre: 'Perfiles', valor: 'security' },
    { nombre: 'Módulos', valor: 'view_module' },
  ];

  const handleSubmit = async () => {
    try {
      if (currentModulo.id) {
        await api.put(`/modulos/${currentModulo.id}`, currentModulo);
        showSnackbar('Módulo actualizado correctamente', 'success');
      } else {
        await api.post('/modulos', currentModulo);
        showSnackbar('Módulo creado correctamente', 'success');
      }
      handleCloseDialog();
      fetchModulos();
    } catch (error) {
      console.error('Error al guardar módulo:', error);
      showSnackbar('Error al guardar módulo', 'error');
    }
  };

  const handleDeleteModulo = async () => {
    try {
      await api.delete(`/modulos/${currentModulo.id}`);
      showSnackbar('Módulo eliminado correctamente', 'success');
      handleCloseDeleteDialog();
      fetchModulos();
    } catch (error) {
      console.error('Error al eliminar módulo:', error);
      const msg = error.response?.data?.error || 'Error al eliminar módulo';
      showSnackbar(msg, 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const tiposModulo = [
    { label: 'Menú principal', value: 'menu' },
    { label: 'Submenú', value: 'submenu' },
    { label: 'Funcionalidad', value: 'funcionalidad' }
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Gestión de Módulos
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nuevo Módulo
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Ruta</TableCell>
              <TableCell>Icono</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {modulos.map((modulo) => (
              <TableRow key={modulo.id}>
                <TableCell>{modulo.id}</TableCell>
                <TableCell>{modulo.nombre}</TableCell>
                <TableCell>{modulo.descripcion || '-'}</TableCell>
                <TableCell>{modulo.ruta || '-'}</TableCell>
                <TableCell>
                  {modulo.icono ? (
                    <Chip 
                      icon={<VisibilityIcon />} 
                      label={modulo.icono} 
                      size="small" 
                      variant="outlined" 
                    />
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {modulo.tipo === 'menu' && 'Menú principal'}
                  {modulo.tipo === 'submenu' && 'Submenú'}
                  {modulo.tipo === 'funcionalidad' && 'Funcionalidad'}
                  {!modulo.tipo && 'Menú principal'}
                </TableCell>
                <TableCell align="center">
                  <IconButton 
                    color="primary" 
                    onClick={() => handleOpenDialog(modulo)}
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    color="error" 
                    onClick={() => handleOpenDeleteDialog(modulo)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog Crear/Editar */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{currentModulo.id ? 'Editar Módulo' : 'Nuevo Módulo'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              fullWidth
              label="Nombre"
              name="nombre"
              value={currentModulo.nombre}
              onChange={handleInputChange}
              required
            />
            <TextField
              fullWidth
              label="Descripción"
              name="descripcion"
              value={currentModulo.descripcion || ''}
              onChange={handleInputChange}
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label="Ruta"
              name="ruta"
              value={currentModulo.ruta || ''}
              onChange={handleInputChange}
              placeholder="/dashboard, /ventas, etc."
            />
            <FormControl fullWidth>
              <InputLabel>Icono</InputLabel>
              <Select
                name="icono"
                value={currentModulo.icono || ''}
                onChange={handleInputChange}
                label="Icono"
              >
                <MenuItem value="">Ninguno</MenuItem>
                {iconosDisponibles.map((icono) => (
                  <MenuItem key={icono.valor} value={icono.valor}>
                    {icono.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Tipo de Módulo</InputLabel>
              <Select
                name="tipo"
                value={currentModulo.tipo || 'menu'}
                onChange={handleInputChange}
                label="Tipo de Módulo"
              >
                {tiposModulo.map((tipo) => (
                  <MenuItem key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={!currentModulo.nombre}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmación de eliminación */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Está seguro que desea eliminar el módulo "{currentModulo.nombre}"? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
          <Button onClick={handleDeleteModulo} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar de notificación */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={5000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ModulosPage;
