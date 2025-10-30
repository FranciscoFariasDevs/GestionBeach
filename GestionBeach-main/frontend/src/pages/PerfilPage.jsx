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
  IconButton,
  Stack,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Chip,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../api/api';

export default function PerfilPage() {
  const [perfiles, setPerfiles] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [currentPerfil, setCurrentPerfil] = useState({
    id: null,
    nombre: '',
    modulos: [],
    sucursales: []
  });
  const [loading, setLoading] = useState(false);
  const [fetchingPerfil, setFetchingPerfil] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchPerfiles();
    fetchModulos();
    fetchSucursales();
  }, []);

  // Obtener todos los perfiles con manejo de errores mejorado
  const fetchPerfiles = async () => {
    try {
      setLoading(true);
      setBackendError(null);
      
      const response = await api.get('/perfiles');
      console.log('✅ Perfiles cargados:', response.data);
      
      const perfilesData = response.data || [];
      
      // Para cada perfil, obtener sus módulos detallados
      const perfilesConModulos = await Promise.all(perfilesData.map(async (perfil) => {
        try {
          const detalleResponse = await api.get(`/perfiles/${perfil.id}`);
          return {
            ...perfil,
            modulos: detalleResponse.data.modulos || []
          };
        } catch (error) {
          console.warn(`Error al obtener módulos del perfil ${perfil.id}:`, error);
          return {
            ...perfil,
            modulos: []
          };
        }
      }));
      
      setPerfiles(perfilesConModulos);
      
    } catch (error) {
      console.error('❌ Error al cargar perfiles:', error);
      
      if (error.response?.status === 404) {
        setBackendError('La API de perfiles no está disponible (404). Verifica que el backend esté configurado correctamente.');
      } else {
        setBackendError(`Error del servidor: ${error.response?.data?.message || error.message}`);
      }
      
      if (error.response?.status !== 404) {
        enqueueSnackbar('Error al cargar perfiles', { variant: 'error' });
      }
      
      setPerfiles([]);
    } finally {
      setLoading(false);
    }
  };

  // Obtener todos los módulos con manejo de errores mejorado
  const fetchModulos = async () => {
    try {
      const response = await api.get('/modulos');
      console.log('✅ Módulos cargados:', response.data);
      setModulos(response.data || []);
    } catch (error) {
      console.error('❌ Error al cargar módulos:', error);

      // Fallback: usar lista predefinida si falla el backend
      const modulosFallback = [
        { id: 1, nombre: 'Dashboard', descripcion: 'Panel principal del sistema' },
        { id: 2, nombre: 'Estado Resultado', descripcion: 'Estados financieros del holding' },
        { id: 3, nombre: 'Monitoreo', descripcion: 'Monitoreo de sucursales' },
        { id: 4, nombre: 'Remuneraciones', descripcion: 'Gestión de nóminas y pagos' },
        { id: 5, nombre: 'Inventario', descripcion: 'Sistema de inventarios' },
        { id: 6, nombre: 'Ventas', descripcion: 'Gestión de ventas' },
        { id: 7, nombre: 'Productos', descripcion: 'Catálogo de productos' },
        { id: 8, nombre: 'Compras', descripcion: 'Gestión de compras' },
        { id: 9, nombre: 'Tarjeta Empleado', descripción: 'Gestión de empleados' },
        { id: 10, nombre: 'Empleados', descripcion: 'Recursos humanos' },
        { id: 11, nombre: 'Usuarios', descripcion: 'Gestión de usuarios' },
        { id: 12, nombre: 'Perfiles', descripcion: 'Gestión de perfiles' },
        { id: 13, nombre: 'Módulos', descripcion: 'Gestión de módulos' },
        { id: 14, nombre: 'Configuración', descripcion: 'Configuración del sistema' },
        { id: 15, nombre: 'Correo Electrónico', descripcion: 'Sistema de correo electrónico' }
      ];

      console.log('📋 Usando módulos predefinidos como fallback');
      setModulos(modulosFallback);

      if (error.response?.status !== 404) {
        enqueueSnackbar('Error al cargar módulos, usando lista predefinida', { variant: 'warning' });
      }
    }
  };

  // Obtener todas las sucursales disponibles
  const fetchSucursales = async () => {
    try {
      const response = await api.get('/sucursales/all');
      console.log('✅ Sucursales cargadas:', response.data);
      setSucursales(response.data || []);
    } catch (error) {
      console.error('❌ Error al cargar sucursales:', error);
      setSucursales([]);

      if (error.response?.status !== 404) {
        enqueueSnackbar('Error al cargar sucursales', { variant: 'warning' });
      }
    }
  };

  // Obtener detalles de un perfil específico
  const fetchPerfilDetalle = async (perfilId) => {
    try {
      setFetchingPerfil(true);
      const response = await api.get(`/perfiles/${perfilId}`);
      return response.data;
    } catch (error) {
      console.error('Error al cargar detalle del perfil:', error);
      enqueueSnackbar('Error al cargar detalle del perfil', { variant: 'error' });
      return null;
    } finally {
      setFetchingPerfil(false);
    }
  };

  const handleOpenDialog = async (perfil = null) => {
    if (perfil) {
      // Si estamos editando, cargar el detalle completo del perfil
      const perfilDetalle = await fetchPerfilDetalle(perfil.id);
      if (perfilDetalle) {
        setCurrentPerfil({
          id: perfilDetalle.id,
          nombre: perfilDetalle.nombre,
          modulos: perfilDetalle.modulos || [],
          sucursales: perfilDetalle.sucursales || []
        });
      } else {
        // Si falla, usar los datos básicos
        setCurrentPerfil({
          id: perfil.id,
          nombre: perfil.nombre,
          modulos: perfil.modulos || [],
          sucursales: perfil.sucursales || []
        });
      }
    } else {
      // Nuevo perfil
      setCurrentPerfil({
        id: null,
        nombre: '',
        modulos: [],
        sucursales: []
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentPerfil({
      id: null,
      nombre: '',
      modulos: [],
      sucursales: []
    });
  };

  const handleOpenDeleteDialog = (perfil) => {
    setCurrentPerfil(perfil);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentPerfil({ ...currentPerfil, [name]: value });
  };

  // CORREGIDO: Mejor manejo de selección de módulos
  const handleModuloChange = (event) => {
    const { value } = event.target;
    console.log('Módulos seleccionados:', value);

    setCurrentPerfil((prev) => ({
      ...prev,
      modulos: typeof value === 'string' ? value.split(',') : value
    }));
  };

  // Manejo de selección de sucursales
  const handleSucursalChange = (event) => {
    const { value } = event.target;
    console.log('Sucursales seleccionadas:', value);

    setCurrentPerfil((prev) => ({
      ...prev,
      sucursales: typeof value === 'string' ? value.split(',').map(Number) : value
    }));
  };

  const handleSavePerfil = async () => {
    if (!currentPerfil.nombre.trim()) {
      enqueueSnackbar('Ingrese un nombre para el perfil', { variant: 'error' });
      return;
    }

    try {
      setLoading(true);

      const perfilData = {
        nombre: currentPerfil.nombre.trim(),
        modulos: currentPerfil.modulos || [],
        sucursales: currentPerfil.sucursales || []
      };

      console.log('🔄 Guardando perfil:', perfilData);

      let response;
      if (currentPerfil.id) {
        response = await api.put(`/perfiles/${currentPerfil.id}`, perfilData);
        console.log('✅ Perfil actualizado:', response.data);
        enqueueSnackbar('Perfil actualizado correctamente', { variant: 'success' });
      } else {
        response = await api.post('/perfiles', perfilData);
        console.log('✅ Perfil creado:', response.data);
        enqueueSnackbar('Perfil creado correctamente', { variant: 'success' });
      }

      // Recargar perfiles
      await fetchPerfiles();
      handleCloseDialog();
      
    } catch (error) {
      console.error('❌ Error al guardar perfil:', error);
      const message = error.response?.data?.message || 'Error al guardar perfil';
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePerfil = async () => {
    try {
      setLoading(true);
      await api.delete(`/perfiles/${currentPerfil.id}`);
      
      // Actualizar lista localmente
      setPerfiles(prev => prev.filter(p => p.id !== currentPerfil.id));
      
      handleCloseDeleteDialog();
      enqueueSnackbar('Perfil eliminado correctamente', { variant: 'success' });
    } catch (error) {
      console.error('Error al eliminar perfil:', error);
      const message = error.response?.data?.message || 'Error al eliminar perfil';
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRetryConnection = () => {
    setBackendError(null);
    fetchPerfiles();
    fetchModulos();
  };

  // Mostrar loading inicial
  if (loading && perfiles.length === 0 && !backendError) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando perfiles...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Gestión de Perfiles</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          disabled={!!backendError}
        >
          Nuevo Perfil
        </Button>
      </Stack>

      {/* Mostrar error del backend si existe */}
      {backendError && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={handleRetryConnection}>
              Reintentar
            </Button>
          }
        >
          <strong>Error de conexión:</strong> {backendError}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Módulos Asignados</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {perfiles.map((perfil) => (
              <TableRow key={perfil.id}>
                <TableCell>{perfil.id}</TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {perfil.nombre}
                  </Typography>
                </TableCell>
                <TableCell>
                  {Array.isArray(perfil.modulos) && perfil.modulos.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 400 }}>
                      {perfil.modulos.map((modulo, index) => (
                        <Chip 
                          key={index} 
                          label={modulo} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                          sx={{ margin: '2px', fontSize: '0.75rem' }}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" fontStyle="italic">
                      Sin módulos asignados
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="center">
                  <IconButton 
                    color="primary" 
                    onClick={() => handleOpenDialog(perfil)}
                    size="small"
                    disabled={!!backendError}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    color="error" 
                    onClick={() => handleOpenDeleteDialog(perfil)}
                    size="small"
                    disabled={!!backendError}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {perfiles.length === 0 && !backendError && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No hay perfiles disponibles
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {perfiles.length === 0 && backendError && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No se pueden cargar los perfiles debido al error de conexión
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog para crear/editar perfiles - CORREGIDO */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
        disableEscapeKeyDown={fetchingPerfil || loading}
      >
        <DialogTitle>
          {currentPerfil.id ? 'Editar Perfil' : 'Nuevo Perfil'}
        </DialogTitle>
        <DialogContent>
          {fetchingPerfil ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Cargando información del perfil...</Typography>
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Nombre del Perfil"
                name="nombre"
                value={currentPerfil.nombre}
                onChange={handleInputChange}
                required
                sx={{ mb: 3 }}
                placeholder="Ej: Gerencia, Finanzas, Jefe de Local"
              />

              <FormControl fullWidth>
                <InputLabel>Módulos del Sistema</InputLabel>
                <Select
                  multiple
                  value={currentPerfil.modulos || []}
                  onChange={handleModuloChange}
                  input={<OutlinedInput label="Módulos del Sistema" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                        width: 250,
                      },
                    },
                  }}
                >
                  {modulos.map((modulo) => (
                    <MenuItem key={modulo.id} value={modulo.nombre}>
                      <Checkbox 
                        checked={(currentPerfil.modulos || []).indexOf(modulo.nombre) > -1} 
                        size="small"
                      />
                      <ListItemText 
                        primary={modulo.nombre}
                        secondary={modulo.descripcion}
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mt: 3 }}>
                <InputLabel>Sucursales Permitidas</InputLabel>
                <Select
                  multiple
                  value={currentPerfil.sucursales || []}
                  onChange={handleSucursalChange}
                  input={<OutlinedInput label="Sucursales Permitidas" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const sucursal = sucursales.find(s => s.id === value);
                        return (
                          <Chip
                            key={value}
                            label={sucursal ? sucursal.nombre : `ID: ${value}`}
                            size="small"
                          />
                        );
                      })}
                    </Box>
                  )}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                        width: 300,
                      },
                    },
                  }}
                >
                  {sucursales.map((sucursal) => (
                    <MenuItem key={sucursal.id} value={sucursal.id}>
                      <Checkbox
                        checked={(currentPerfil.sucursales || []).indexOf(sucursal.id) > -1}
                        size="small"
                      />
                      <ListItemText
                        primary={sucursal.nombre}
                        secondary={sucursal.tipo_sucursal}
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* DEBUG: Mostrar módulos y sucursales seleccionados */}
              {process.env.NODE_ENV === 'development' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <strong>Debug:</strong> Módulos: {JSON.stringify(currentPerfil.modulos)}<br />
                  <strong>Sucursales:</strong> {JSON.stringify(currentPerfil.sucursales)}
                </Alert>
              )}

              {(!currentPerfil.modulos || currentPerfil.modulos.length === 0) && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <strong>Advertencia:</strong> Este perfil no tiene módulos asignados. 
                  Los usuarios con este perfil no podrán acceder a ninguna funcionalidad.
                </Alert>
              )}

              {modulos.length === 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <strong>Información:</strong> No hay módulos disponibles. 
                  Verifica que el backend esté funcionando correctamente.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog} disabled={loading || fetchingPerfil}>
            Cancelar
          </Button>
          <Button
            onClick={handleSavePerfil}
            variant="contained"
            color="primary"
            disabled={loading || fetchingPerfil || !currentPerfil.nombre.trim()}
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para eliminar */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <DeleteIcon color="error" sx={{ mr: 1 }} />
          Confirmar Eliminación
        </DialogTitle>
        <DialogContent>
          <Typography>
            ¿Está seguro que desea eliminar el perfil <strong>"{currentPerfil.nombre}"</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Esta acción no se puede deshacer. Los usuarios con este perfil perderán sus permisos.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
          <Button 
            onClick={handleDeletePerfil} 
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