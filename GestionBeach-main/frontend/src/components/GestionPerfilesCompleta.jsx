// frontend/src/components/GestionPerfilesCompleta.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Button,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Badge
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import PeopleIcon from '@mui/icons-material/People';
import ExtensionIcon from '@mui/icons-material/Extension';
import StoreIcon from '@mui/icons-material/Store';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CreateIcon from '@mui/icons-material/Create';
import GetAppIcon from '@mui/icons-material/GetApp';
import api from '../api/api';
import { useSnackbar } from 'notistack';

const GestionPerfilesCompleta = () => {
  const { enqueueSnackbar } = useSnackbar();

  // Estados principales
  const [perfiles, setPerfiles] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados de diálogo
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editandoPerfil, setEditandoPerfil] = useState(null);
  const [nombrePerfil, setNombrePerfil] = useState('');
  const [descripcionPerfil, setDescripcionPerfil] = useState('');

  // Estados de configuración de módulos
  const [modulosAsignados, setModulosAsignados] = useState([]); // Array de { modulo_id, sucursales: [...] }
  const [moduloExpandido, setModuloExpandido] = useState(null);

  // Estado para ver detalle de perfil
  const [perfilSeleccionado, setPerfilSeleccionado] = useState(null);
  const [detallePerfilOpen, setDetallePerfilOpen] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    setLoading(true);
    try {
      const [perfilesRes, modulosRes, sucursalesRes] = await Promise.all([
        api.get('/perfiles'),
        api.get('/modulos/disponibles'),
        api.get('/sucursales')
      ]);

      setPerfiles(perfilesRes.data);
      setModulos(modulosRes.data);
      setSucursales(sucursalesRes.data);

      enqueueSnackbar('Datos cargados correctamente', { variant: 'success' });
    } catch (error) {
      console.error('Error cargando datos:', error);
      enqueueSnackbar('Error cargando datos', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Abrir diálogo para crear nuevo perfil
  const handleNuevoPerfil = () => {
    setEditandoPerfil(null);
    setNombrePerfil('');
    setDescripcionPerfil('');
    setModulosAsignados([]);
    setDialogOpen(true);
  };

  // Abrir diálogo para editar perfil
  const handleEditarPerfil = async (perfil) => {
    setEditandoPerfil(perfil);
    setNombrePerfil(perfil.nombre);
    setDescripcionPerfil(perfil.descripcion || '');

    // Cargar configuración actual del perfil
    try {
      const response = await api.get(`/permisos-modulares/resumen/${perfil.id}`);

      if (response.data.modulos && response.data.modulos.length > 0) {
        const modulosConfig = response.data.modulos.map(mod => ({
          modulo_id: mod.modulo_id,
          modulo_nombre: mod.modulo_nombre,
          sucursales: mod.sucursales || []
        }));
        setModulosAsignados(modulosConfig);
      } else {
        setModulosAsignados([]);
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
      setModulosAsignados([]);
    }

    setDialogOpen(true);
  };

  // Guardar perfil (crear o actualizar)
  const handleGuardarPerfil = async () => {
    if (!nombrePerfil.trim()) {
      enqueueSnackbar('El nombre del perfil es requerido', { variant: 'warning' });
      return;
    }

    try {
      let perfilId;

      if (editandoPerfil) {
        // Actualizar perfil existente
        await api.put(`/perfiles/${editandoPerfil.id}`, {
          nombre: nombrePerfil,
          descripcion: descripcionPerfil
        });
        perfilId = editandoPerfil.id;
        enqueueSnackbar('Perfil actualizado correctamente', { variant: 'success' });
      } else {
        // Crear nuevo perfil
        const response = await api.post('/perfiles', {
          nombre: nombrePerfil,
          descripcion: descripcionPerfil,
          modulos: [], // Se configurarán después
          sucursales: []
        });
        perfilId = response.data.id;
        enqueueSnackbar('Perfil creado correctamente', { variant: 'success' });
      }

      // Guardar configuración de módulos y sucursales
      for (const moduloConfig of modulosAsignados) {
        if (moduloConfig.sucursales.length > 0) {
          await api.post('/permisos-modulares/sucursales', {
            perfil_id: perfilId,
            modulo_id: moduloConfig.modulo_id,
            sucursales: moduloConfig.sucursales.map(s => ({
              id: s.id,
              puede_leer: s.puede_leer !== false,
              puede_escribir: s.puede_escribir === true,
              puede_exportar: s.puede_exportar === true
            }))
          });
        }
      }

      // También guardar en perfil_modulo para acceso general
      const modulosIds = modulosAsignados.map(m => m.modulo_id);
      if (modulosIds.length > 0) {
        await api.put(`/perfiles/${perfilId}`, {
          nombre: nombrePerfil,
          descripcion: descripcionPerfil,
          modulos: modulosIds
        });
      }

      setDialogOpen(false);
      cargarDatosIniciales();
    } catch (error) {
      console.error('Error guardando perfil:', error);
      enqueueSnackbar('Error guardando perfil', { variant: 'error' });
    }
  };

  // Alternar módulo asignado
  const toggleModulo = (modulo) => {
    const existe = modulosAsignados.find(m => m.modulo_id === modulo.id);

    if (existe) {
      // Remover módulo
      setModulosAsignados(prev => prev.filter(m => m.modulo_id !== modulo.id));
    } else {
      // Agregar módulo vacío
      setModulosAsignados(prev => [...prev, {
        modulo_id: modulo.id,
        modulo_nombre: modulo.nombre,
        sucursales: []
      }]);
    }
  };

  // Alternar sucursal en un módulo
  const toggleSucursalEnModulo = (moduloId, sucursal) => {
    setModulosAsignados(prev => prev.map(mod => {
      if (mod.modulo_id === moduloId) {
        const sucursalExiste = mod.sucursales.find(s => s.id === sucursal.id);

        if (sucursalExiste) {
          // Remover sucursal
          return {
            ...mod,
            sucursales: mod.sucursales.filter(s => s.id !== sucursal.id)
          };
        } else {
          // Agregar sucursal con permisos por defecto
          return {
            ...mod,
            sucursales: [...mod.sucursales, {
              ...sucursal,
              puede_leer: true,
              puede_escribir: false,
              puede_exportar: false
            }]
          };
        }
      }
      return mod;
    }));
  };

  // Actualizar permiso de sucursal en módulo
  const actualizarPermisoSucursal = (moduloId, sucursalId, campo, valor) => {
    setModulosAsignados(prev => prev.map(mod => {
      if (mod.modulo_id === moduloId) {
        return {
          ...mod,
          sucursales: mod.sucursales.map(s =>
            s.id === sucursalId ? { ...s, [campo]: valor } : s
          )
        };
      }
      return mod;
    }));
  };

  // Ver detalle completo de un perfil
  const handleVerDetalle = async (perfil) => {
    try {
      const response = await api.get(`/permisos-modulares/resumen/${perfil.id}`);
      setPerfilSeleccionado(response.data);
      setDetallePerfilOpen(true);
    } catch (error) {
      console.error('Error cargando detalle:', error);
      enqueueSnackbar('Error cargando detalle del perfil', { variant: 'error' });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Encabezado */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <PeopleIcon color="primary" fontSize="large" />
              Gestión Completa de Perfiles
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Crea perfiles, asigna módulos y configura qué sucursales puede acceder cada perfil por módulo
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<AddIcon />}
            onClick={handleNuevoPerfil}
          >
            Nuevo Perfil
          </Button>
        </Box>
      </Box>

      {/* Lista de Perfiles */}
      <Grid container spacing={2}>
        {perfiles.map(perfil => (
          <Grid item xs={12} sm={6} md={4} key={perfil.id}>
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardHeader
                title={perfil.nombre}
                subheader={perfil.descripcion || 'Sin descripción'}
                avatar={
                  <PeopleIcon color="primary" />
                }
                action={
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Ver detalle">
                      <IconButton size="small" onClick={() => handleVerDetalle(perfil)}>
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton size="small" color="primary" onClick={() => handleEditarPerfil(perfil)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                }
              />
              <CardContent>
                <Stack spacing={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <ExtensionIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      ID: {perfil.id}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Diálogo de Crear/Editar Perfil */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: '80vh' }
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5">
              {editandoPerfil ? 'Editar Perfil' : 'Nuevo Perfil'}
            </Typography>
            <IconButton onClick={() => setDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Información básica del perfil */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }} variant="outlined">
                <Typography variant="h6" gutterBottom>
                  Información del Perfil
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Nombre del Perfil"
                      fullWidth
                      value={nombrePerfil}
                      onChange={(e) => setNombrePerfil(e.target.value)}
                      required
                      placeholder="Ej: Jefe de Local Quirihue"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Descripción"
                      fullWidth
                      value={descripcionPerfil}
                      onChange={(e) => setDescripcionPerfil(e.target.value)}
                      placeholder="Descripción opcional"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Selección de módulos */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }} variant="outlined">
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ExtensionIcon />
                  Módulos y Sucursales
                  <Chip
                    label={`${modulosAsignados.length} módulos`}
                    size="small"
                    color="primary"
                  />
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Selecciona los módulos y configura las sucursales permitidas para cada uno
                </Typography>

                <Box sx={{ mt: 2 }}>
                  {modulos.map(modulo => {
                    const moduloAsignado = modulosAsignados.find(m => m.modulo_id === modulo.id);
                    const estaAsignado = !!moduloAsignado;

                    return (
                      <Accordion
                        key={modulo.id}
                        expanded={moduloExpandido === modulo.id}
                        onChange={() => setModuloExpandido(moduloExpandido === modulo.id ? null : modulo.id)}
                        sx={{
                          mb: 1,
                          '&:before': { display: 'none' },
                          border: estaAsignado ? 2 : 1,
                          borderColor: estaAsignado ? 'primary.main' : 'divider'
                        }}
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box display="flex" alignItems="center" gap={2} width="100%">
                            <Checkbox
                              checked={estaAsignado}
                              onChange={() => toggleModulo(modulo)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <ExtensionIcon color={estaAsignado ? 'primary' : 'action'} />
                            <Typography sx={{ flexGrow: 1 }}>
                              {modulo.nombre}
                            </Typography>
                            {estaAsignado && (
                              <Chip
                                label={`${moduloAsignado.sucursales.length} sucursales`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </AccordionSummary>

                        {estaAsignado && (
                          <AccordionDetails>
                            <Box sx={{ pl: 6 }}>
                              <Typography variant="subtitle2" gutterBottom color="primary">
                                Sucursales Permitidas:
                              </Typography>

                              {sucursales.length === 0 ? (
                                <Alert severity="info">No hay sucursales disponibles</Alert>
                              ) : (
                                <Grid container spacing={1}>
                                  {sucursales.map(sucursal => {
                                    const sucursalAsignada = moduloAsignado.sucursales.find(s => s.id === sucursal.id);
                                    const estaAsignadaSucursal = !!sucursalAsignada;

                                    return (
                                      <Grid item xs={12} key={sucursal.id}>
                                        <Paper
                                          variant="outlined"
                                          sx={{
                                            p: 1.5,
                                            bgcolor: estaAsignadaSucursal ? 'primary.50' : 'background.paper',
                                            border: estaAsignadaSucursal ? 2 : 1,
                                            borderColor: estaAsignadaSucursal ? 'primary.main' : 'divider'
                                          }}
                                        >
                                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                                            <Checkbox
                                              checked={estaAsignadaSucursal}
                                              onChange={() => toggleSucursalEnModulo(modulo.id, sucursal)}
                                            />
                                            <StoreIcon fontSize="small" color={estaAsignadaSucursal ? 'primary' : 'action'} />
                                            <Typography variant="body2" sx={{ flexGrow: 1 }}>
                                              <strong>{sucursal.nombre}</strong>
                                            </Typography>
                                            <Chip label={sucursal.tipo_sucursal} size="small" variant="outlined" />
                                          </Box>

                                          {estaAsignadaSucursal && (
                                            <Box sx={{ pl: 5 }}>
                                              <FormGroup row>
                                                <FormControlLabel
                                                  control={
                                                    <Checkbox
                                                      checked={sucursalAsignada.puede_leer !== false}
                                                      onChange={(e) =>
                                                        actualizarPermisoSucursal(modulo.id, sucursal.id, 'puede_leer', e.target.checked)
                                                      }
                                                      icon={<VisibilityIcon fontSize="small" />}
                                                      checkedIcon={<VisibilityIcon fontSize="small" color="primary" />}
                                                      size="small"
                                                    />
                                                  }
                                                  label={<Typography variant="caption">Leer</Typography>}
                                                />

                                                <FormControlLabel
                                                  control={
                                                    <Checkbox
                                                      checked={sucursalAsignada.puede_escribir === true}
                                                      onChange={(e) =>
                                                        actualizarPermisoSucursal(modulo.id, sucursal.id, 'puede_escribir', e.target.checked)
                                                      }
                                                      icon={<CreateIcon fontSize="small" />}
                                                      checkedIcon={<CreateIcon fontSize="small" color="warning" />}
                                                      size="small"
                                                    />
                                                  }
                                                  label={<Typography variant="caption">Escribir</Typography>}
                                                />

                                                <FormControlLabel
                                                  control={
                                                    <Checkbox
                                                      checked={sucursalAsignada.puede_exportar === true}
                                                      onChange={(e) =>
                                                        actualizarPermisoSucursal(modulo.id, sucursal.id, 'puede_exportar', e.target.checked)
                                                      }
                                                      icon={<GetAppIcon fontSize="small" />}
                                                      checkedIcon={<GetAppIcon fontSize="small" color="success" />}
                                                      size="small"
                                                    />
                                                  }
                                                  label={<Typography variant="caption">Exportar</Typography>}
                                                />
                                              </FormGroup>
                                            </Box>
                                          )}
                                        </Paper>
                                      </Grid>
                                    );
                                  })}
                                </Grid>
                              )}
                            </Box>
                          </AccordionDetails>
                        )}
                      </Accordion>
                    );
                  })}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)} startIcon={<CloseIcon />}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleGuardarPerfil}
            startIcon={<SaveIcon />}
            disabled={!nombrePerfil.trim()}
          >
            Guardar Perfil
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Ver Detalle */}
      <Dialog
        open={detallePerfilOpen}
        onClose={() => setDetallePerfilOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5">
              Detalle: {perfilSeleccionado?.perfil?.nombre}
            </Typography>
            <IconButton onClick={() => setDetallePerfilOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {perfilSeleccionado && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {perfilSeleccionado.perfil?.descripcion || 'Sin descripción'}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>
                <strong>Módulos con permisos: {perfilSeleccionado.total_modulos || 0}</strong>
              </Typography>

              {perfilSeleccionado.modulos?.map(modulo => (
                <Accordion key={modulo.modulo_id} sx={{ mt: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={2} width="100%">
                      <ExtensionIcon color="primary" />
                      <Typography sx={{ flexGrow: 1 }}>
                        {modulo.modulo_nombre}
                      </Typography>
                      <Chip
                        label={`${modulo.total_sucursales} sucursales`}
                        size="small"
                        color="primary"
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={1}>
                      {modulo.sucursales?.map(sucursal => (
                        <Grid item xs={12} sm={6} key={sucursal.id}>
                          <Paper variant="outlined" sx={{ p: 1.5 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              {sucursal.nombre}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                              {sucursal.tipo_sucursal}
                            </Typography>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                              {sucursal.puede_leer && (
                                <Chip label="Leer" size="small" color="primary" variant="outlined" />
                              )}
                              {sucursal.puede_escribir && (
                                <Chip label="Escribir" size="small" color="warning" variant="outlined" />
                              )}
                              {sucursal.puede_exportar && (
                                <Chip label="Exportar" size="small" color="success" variant="outlined" />
                              )}
                            </Stack>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDetallePerfilOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GestionPerfilesCompleta;
