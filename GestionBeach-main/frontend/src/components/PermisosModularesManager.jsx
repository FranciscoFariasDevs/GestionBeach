// frontend/src/components/PermisosModularesManager.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Button,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
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
  Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import StoreIcon from '@mui/icons-material/Store';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import GetAppIcon from '@mui/icons-material/GetApp';
import InfoIcon from '@mui/icons-material/Info';
import AssessmentIcon from '@mui/icons-material/Assessment';
import api from '../api/api';
import { useSnackbar } from 'notistack';

const PermisosModularesManager = () => {
  const { enqueueSnackbar } = useSnackbar();

  const [perfiles, setPerfiles] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [sucursales, setSucursales] = useState([]);

  const [perfilSeleccionado, setPerfilSeleccionado] = useState('');
  const [moduloSeleccionado, setModuloSeleccionado] = useState('');

  const [sucursalesAsignadas, setSucursalesAsignadas] = useState([]);
  const [sucursalesDisponibles, setSucursalesDisponibles] = useState([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [resumenPermisos, setResumenPermisos] = useState(null);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  // Cargar sucursales asignadas cuando cambia perfil o módulo
  useEffect(() => {
    if (perfilSeleccionado && moduloSeleccionado) {
      cargarSucursalesAsignadas();
    }
  }, [perfilSeleccionado, moduloSeleccionado]);

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
      enqueueSnackbar('Error cargando datos iniciales', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const cargarSucursalesAsignadas = async () => {
    try {
      const response = await api.get('/permisos-modulares/sucursales', {
        params: {
          perfil_id: perfilSeleccionado,
          modulo_id: moduloSeleccionado
        }
      });

      const asignadas = response.data.sucursales || [];
      setSucursalesAsignadas(asignadas);

      // Filtrar sucursales disponibles (las que NO están asignadas)
      const idsAsignadas = asignadas.map(s => s.id);
      const disponibles = sucursales.filter(s => !idsAsignadas.includes(s.id));
      setSucursalesDisponibles(disponibles);

    } catch (error) {
      console.error('Error cargando sucursales asignadas:', error);
      setSucursalesAsignadas([]);
      setSucursalesDisponibles(sucursales);
    }
  };

  const toggleSucursal = (sucursal) => {
    const estaAsignada = sucursalesAsignadas.some(s => s.id === sucursal.id);

    if (estaAsignada) {
      // Remover de asignadas
      setSucursalesAsignadas(prev => prev.filter(s => s.id !== sucursal.id));
      setSucursalesDisponibles(prev => [...prev, sucursal]);
    } else {
      // Agregar a asignadas (por defecto con lectura)
      setSucursalesAsignadas(prev => [...prev, {
        ...sucursal,
        puede_leer: true,
        puede_escribir: false,
        puede_exportar: false
      }]);
      setSucursalesDisponibles(prev => prev.filter(s => s.id !== sucursal.id));
    }
  };

  const actualizarPermisoSucursal = (sucursalId, campo, valor) => {
    setSucursalesAsignadas(prev =>
      prev.map(s =>
        s.id === sucursalId ? { ...s, [campo]: valor } : s
      )
    );
  };

  const guardarPermisos = async () => {
    if (!perfilSeleccionado || !moduloSeleccionado) {
      enqueueSnackbar('Seleccione un perfil y un módulo', { variant: 'warning' });
      return;
    }

    setGuardando(true);
    try {
      await api.post('/permisos-modulares/sucursales', {
        perfil_id: perfilSeleccionado,
        modulo_id: moduloSeleccionado,
        sucursales: sucursalesAsignadas.map(s => ({
          id: s.id,
          puede_leer: s.puede_leer,
          puede_escribir: s.puede_escribir,
          puede_exportar: s.puede_exportar
        }))
      });

      enqueueSnackbar('Permisos guardados exitosamente', { variant: 'success' });

      // Recargar resumen si hay un perfil seleccionado
      if (perfilSeleccionado) {
        cargarResumenPermisos();
      }
    } catch (error) {
      console.error('Error guardando permisos:', error);
      enqueueSnackbar('Error guardando permisos', { variant: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  const cargarResumenPermisos = async () => {
    if (!perfilSeleccionado) return;

    try {
      const response = await api.get(`/permisos-modulares/resumen/${perfilSeleccionado}`);
      setResumenPermisos(response.data);
    } catch (error) {
      console.error('Error cargando resumen:', error);
    }
  };

  useEffect(() => {
    if (perfilSeleccionado) {
      cargarResumenPermisos();
    }
  }, [perfilSeleccionado]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LockIcon color="primary" fontSize="large" />
        Gestión de Permisos Modulares
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Asigne sucursales específicas por módulo a cada perfil. Los permisos son granulares:
        cada perfil puede tener diferentes sucursales dependiendo del módulo.
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Sección de selección */}
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardHeader
                title="Seleccionar Perfil y Módulo"
                avatar={<InfoIcon color="primary" />}
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Perfil</InputLabel>
                      <Select
                        value={perfilSeleccionado}
                        onChange={(e) => setPerfilSeleccionado(e.target.value)}
                        label="Perfil"
                      >
                        <MenuItem value="">
                          <em>Seleccione un perfil</em>
                        </MenuItem>
                        {perfiles.map(perfil => (
                          <MenuItem key={perfil.id} value={perfil.id}>
                            {perfil.nombre}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Módulo</InputLabel>
                      <Select
                        value={moduloSeleccionado}
                        onChange={(e) => setModuloSeleccionado(e.target.value)}
                        label="Módulo"
                        disabled={!perfilSeleccionado}
                      >
                        <MenuItem value="">
                          <em>Seleccione un módulo</em>
                        </MenuItem>
                        {modulos.map(modulo => (
                          <MenuItem key={modulo.id} value={modulo.id}>
                            {modulo.nombre}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Sección de asignación de sucursales */}
          {perfilSeleccionado && moduloSeleccionado && (
            <>
              <Grid item xs={12} md={6}>
                <Card elevation={3}>
                  <CardHeader
                    title={`Sucursales Disponibles (${sucursalesDisponibles.length})`}
                    avatar={<StoreIcon />}
                  />
                  <CardContent sx={{ maxHeight: 500, overflow: 'auto' }}>
                    {sucursalesDisponibles.length === 0 ? (
                      <Alert severity="info">
                        Todas las sucursales ya están asignadas a este módulo
                      </Alert>
                    ) : (
                      <List>
                        {sucursalesDisponibles.map(sucursal => (
                          <ListItem
                            key={sucursal.id}
                            button
                            onClick={() => toggleSucursal(sucursal)}
                            sx={{
                              borderRadius: 1,
                              mb: 1,
                              '&:hover': {
                                bgcolor: 'action.hover'
                              }
                            }}
                          >
                            <ListItemIcon>
                              <StoreIcon color="action" />
                            </ListItemIcon>
                            <ListItemText
                              primary={sucursal.nombre}
                              secondary={sucursal.tipo_sucursal}
                            />
                            <Chip
                              label="Agregar"
                              size="small"
                              color="success"
                              variant="outlined"
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card elevation={3}>
                  <CardHeader
                    title={`Sucursales Asignadas (${sucursalesAsignadas.length})`}
                    avatar={<CheckCircleIcon color="success" />}
                    action={
                      <Tooltip title="Guardar cambios">
                        <IconButton
                          color="primary"
                          onClick={guardarPermisos}
                          disabled={guardando}
                        >
                          {guardando ? <CircularProgress size={24} /> : <SaveIcon />}
                        </IconButton>
                      </Tooltip>
                    }
                  />
                  <CardContent sx={{ maxHeight: 500, overflow: 'auto' }}>
                    {sucursalesAsignadas.length === 0 ? (
                      <Alert severity="warning">
                        No hay sucursales asignadas. Seleccione sucursales de la lista izquierda.
                      </Alert>
                    ) : (
                      <List>
                        {sucursalesAsignadas.map(sucursal => (
                          <Paper key={sucursal.id} sx={{ p: 2, mb: 2 }} elevation={1}>
                            <Stack spacing={1}>
                              <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="subtitle1" fontWeight="bold">
                                  {sucursal.nombre}
                                </Typography>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => toggleSucursal(sucursal)}
                                >
                                  <CancelIcon />
                                </IconButton>
                              </Box>

                              <Typography variant="caption" color="text.secondary">
                                {sucursal.tipo_sucursal}
                              </Typography>

                              <Divider />

                              <Stack direction="row" spacing={1} flexWrap="wrap">
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={sucursal.puede_leer || false}
                                      onChange={(e) =>
                                        actualizarPermisoSucursal(sucursal.id, 'puede_leer', e.target.checked)
                                      }
                                      icon={<VisibilityIcon />}
                                      checkedIcon={<VisibilityIcon color="primary" />}
                                    />
                                  }
                                  label="Leer"
                                />

                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={sucursal.puede_escribir || false}
                                      onChange={(e) =>
                                        actualizarPermisoSucursal(sucursal.id, 'puede_escribir', e.target.checked)
                                      }
                                      icon={<EditIcon />}
                                      checkedIcon={<EditIcon color="warning" />}
                                    />
                                  }
                                  label="Escribir"
                                />

                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={sucursal.puede_exportar || false}
                                      onChange={(e) =>
                                        actualizarPermisoSucursal(sucursal.id, 'puede_exportar', e.target.checked)
                                      }
                                      icon={<GetAppIcon />}
                                      checkedIcon={<GetAppIcon color="success" />}
                                    />
                                  }
                                  label="Exportar"
                                />
                              </Stack>
                            </Stack>
                          </Paper>
                        ))}
                      </List>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Box display="flex" justifyContent="center" gap={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={guardando ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    onClick={guardarPermisos}
                    disabled={guardando || sucursalesAsignadas.length === 0}
                  >
                    Guardar Permisos
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={cargarSucursalesAsignadas}
                  >
                    Recargar
                  </Button>
                </Box>
              </Grid>
            </>
          )}

          {/* Resumen de permisos del perfil */}
          {resumenPermisos && (
            <Grid item xs={12}>
              <Card elevation={3}>
                <CardHeader
                  title={`Resumen de Permisos: ${resumenPermisos.perfil?.nombre || ''}`}
                  avatar={<AssessmentIcon color="primary" />}
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total de módulos con permisos: {resumenPermisos.modulos?.length || 0}
                  </Typography>

                  {resumenPermisos.modulos?.map(modulo => (
                    <Accordion key={modulo.modulo_id}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box display="flex" alignItems="center" gap={2} width="100%">
                          <Typography sx={{ flexGrow: 1 }}>
                            {modulo.modulo_nombre}
                          </Typography>
                          <Chip
                            label={`${modulo.sucursales?.length || 0} sucursales`}
                            size="small"
                            color="primary"
                          />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          {modulo.sucursales?.map(sucursal => (
                            <Grid item xs={12} sm={6} md={4} key={sucursal.id}>
                              <Paper sx={{ p: 2 }} variant="outlined">
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
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
};

export default PermisosModularesManager;
