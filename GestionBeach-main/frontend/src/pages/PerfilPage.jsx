// frontend/src/pages/PerfilPage.jsx - VERSIÓN SIMPLIFICADA SIN PERMISOS GRANULARES
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
  DialogTitle,
  TextField,
  IconButton,
  Stack,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
  Chip,
  Alert,
  Grid,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Store as StoreIcon,
  Extension as ExtensionIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../api/api';

export default function PerfilPage() {
  const emptyPerfil = { id: null, nombre: '', descripcion: '' };
  const [perfiles, setPerfiles] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const formDialog   = useDialog({ data: emptyPerfil }); // diálogo crear/editar (loading = fetchingPerfil)
  const deleteDialog = useDialog();                       // diálogo confirmar eliminar

  // Estado para módulos con sus sucursales
  const [modulosAsignados, setModulosAsignados] = useState([]);
  const [moduloExpandido, setModuloExpandido] = useState(null);

  const [loading, setLoading] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);
      setBackendError(null);

      const [perfilesRes, modulosRes, sucursalesRes] = await Promise.all([
        api.get('/perfiles'),
        api.get('/perfiles/modulos-disponibles'),
        api.get('/sucursales')
      ]);

      setPerfiles(perfilesRes.data || []);
      setModulos(modulosRes.data || []);
      setSucursales(sucursalesRes.data || []);

      enqueueSnackbar('Datos cargados correctamente', { variant: 'success' });
    } catch (error) {
      console.error('Error cargando datos:', error);
      setBackendError(error.message);
      enqueueSnackbar('Error cargando datos', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatosIniciales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenDialog = async (perfil = null) => {
    if (perfil) {
      formDialog.openDialog({ id: perfil.id, nombre: perfil.nombre, descripcion: perfil.descripcion || '' });
      formDialog.setLoading(true);
      setModulosAsignados([]);
      try {
        const response = await api.get(`/perfiles-resumen/${perfil.id}`);
        if (response.data.modulos && response.data.modulos.length > 0) {
          setModulosAsignados(response.data.modulos.map(mod => ({
            modulo_id: mod.modulo_id,
            modulo_nombre: mod.modulo_nombre,
            sucursales: mod.sucursales || []
          })));
        }
      } catch (error) {
        console.error('Error cargando configuración:', error);
      } finally {
        formDialog.setLoading(false);
      }
    } else {
      formDialog.openDialog(emptyPerfil);
      setModulosAsignados([]);
    }
  };

  const handleCloseDialog = () => {
    formDialog.closeDialog();
    setModulosAsignados([]);
  };

  const handleOpenDeleteDialog = (perfil) => {
    deleteDialog.openDialog(perfil);
  };

  const handleCloseDeleteDialog = () => {
    deleteDialog.closeDialog();
  };

  // Toggle módulo
  const toggleModulo = (modulo) => {
    const existe = modulosAsignados.find(m => m.modulo_id === modulo.id);

    if (existe) {
      setModulosAsignados(prev => prev.filter(m => m.modulo_id !== modulo.id));
    } else {
      setModulosAsignados(prev => [...prev, {
        modulo_id: modulo.id,
        modulo_nombre: modulo.nombre,
        sucursales: []
      }]);
    }
  };

  // Toggle sucursal en módulo
  const toggleSucursalEnModulo = (moduloId, sucursal) => {
    setModulosAsignados(prev => prev.map(mod => {
      if (mod.modulo_id === moduloId) {
        const sucursalExiste = mod.sucursales.find(s => s.id === sucursal.id);

        if (sucursalExiste) {
          return {
            ...mod,
            sucursales: mod.sucursales.filter(s => s.id !== sucursal.id)
          };
        } else {
          return {
            ...mod,
            sucursales: [...mod.sucursales, { id: sucursal.id, nombre: sucursal.nombre }]
          };
        }
      }
      return mod;
    }));
  };

  // Toggle TODAS las sucursales en un módulo
  const toggleTodasSucursales = (moduloId) => {
    setModulosAsignados(prev => prev.map(mod => {
      if (mod.modulo_id === moduloId) {
        const todasAsignadas = mod.sucursales.length === sucursales.length;
        return {
          ...mod,
          sucursales: todasAsignadas ? [] : sucursales.map(s => ({ id: s.id, nombre: s.nombre }))
        };
      }
      return mod;
    }));
  };

  const handleSavePerfil = async () => {
    const perfil = formDialog.data;
    if (!perfil.nombre.trim()) {
      enqueueSnackbar('El nombre del perfil es requerido', { variant: 'warning' });
      return;
    }

    try {
      setLoading(true);
      let perfilId;

      if (perfil.id) {
        await api.put(`/perfiles/${perfil.id}`, { nombre: perfil.nombre, descripcion: perfil.descripcion });
        perfilId = perfil.id;
        enqueueSnackbar('Perfil actualizado', { variant: 'success' });
      } else {
        const response = await api.post('/perfiles', { nombre: perfil.nombre, descripcion: perfil.descripcion, modulos: [], sucursales: [] });
        perfilId = response.data.id;
        enqueueSnackbar('Perfil creado', { variant: 'success' });
      }

      for (const moduloConfig of modulosAsignados) {
        await api.post('/permisos-modulares/sucursales', {
          perfil_id: perfilId,
          modulo_id: moduloConfig.modulo_id,
          sucursales: moduloConfig.sucursales.map(s => ({ id: s.id }))
        });
      }

      handleCloseDialog();
      cargarDatosIniciales();
    } catch (error) {
      console.error('Error guardando perfil:', error);
      enqueueSnackbar(`Error guardando perfil: ${error.response?.data?.message || error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePerfil = async () => {
    const perfil = deleteDialog.data;
    try {
      setLoading(true);
      await api.delete(`/perfiles/${perfil.id}`);
      setPerfiles(prev => prev.filter(p => p.id !== perfil.id));
      handleCloseDeleteDialog();
      enqueueSnackbar('Perfil eliminado', { variant: 'success' });
    } catch (error) {
      console.error('Error eliminando perfil:', error);
      enqueueSnackbar('Error eliminando perfil', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && perfiles.length === 0 && !backendError) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando perfiles...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Gestión de Perfiles con Permisos Modulares</Typography>
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

      {backendError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error: {backendError}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ID</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Nombre</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Descripción</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {perfiles.map((perfil) => (
              <TableRow key={perfil.id} hover>
                <TableCell>{perfil.id}</TableCell>
                <TableCell>
                  <Typography variant="body1" fontWeight="medium">
                    {perfil.nombre}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {perfil.descripcion || 'Sin descripción'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    color="primary"
                    onClick={() => handleOpenDialog(perfil)}
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => handleOpenDeleteDialog(perfil)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {perfiles.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No hay perfiles disponibles
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog para crear/editar con permisos modulares */}
      <Dialog
        open={formDialog.open}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { minHeight: '80vh' } }}
      >
        <DialogTitle>
          {formDialog.data?.id ? 'Editar Perfil' : 'Nuevo Perfil'}
        </DialogTitle>
        <DialogContent dividers>
          {formDialog.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Cargando configuración...</Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {/* Información básica */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }} variant="outlined">
                  <Typography variant="h6" gutterBottom>Información del Perfil</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Nombre del Perfil"
                        value={formDialog.data?.nombre || ''}
                        onChange={(e) => formDialog.setData(prev => ({ ...prev, nombre: e.target.value }))}
                        required
                        placeholder="Ej: Jefe de Local Quirihue"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Descripción"
                        value={formDialog.data?.descripcion || ''}
                        onChange={(e) => formDialog.setData(prev => ({ ...prev, descripcion: e.target.value }))}
                        placeholder="Descripción opcional"
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Módulos y Sucursales */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }} variant="outlined">
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ExtensionIcon />
                    Módulos y Sucursales por Módulo
                    <Chip label={`${modulosAsignados.length} módulos`} size="small" color="primary" />
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <strong>¿Cómo funciona?</strong>
                    <br/>1. Selecciona un módulo (checkbox)
                    <br/>2. Dentro del módulo, elige las sucursales permitidas (o marca "TODAS")
                  </Alert>

                  <Box>
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
                              <Typography sx={{ flexGrow: 1 }}>{modulo.nombre}</Typography>
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
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                  <Typography variant="subtitle2" color="primary">
                                    Sucursales Permitidas:
                                  </Typography>
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        checked={moduloAsignado.sucursales.length === sucursales.length}
                                        indeterminate={moduloAsignado.sucursales.length > 0 && moduloAsignado.sucursales.length < sucursales.length}
                                        onChange={() => toggleTodasSucursales(modulo.id)}
                                        color="success"
                                      />
                                    }
                                    label={<Typography variant="button" color="success.main">TODAS</Typography>}
                                  />
                                </Stack>

                                <Divider sx={{ mb: 2 }} />

                                <Grid container spacing={1}>
                                  {sucursales.map(sucursal => {
                                    const sucursalAsignada = moduloAsignado.sucursales.find(s => s.id === sucursal.id);
                                    const estaAsignadaSucursal = !!sucursalAsignada;

                                    return (
                                      <Grid item xs={12} sm={6} md={4} key={sucursal.id}>
                                        <Paper
                                          variant="outlined"
                                          sx={{
                                            p: 1,
                                            bgcolor: estaAsignadaSucursal ? 'success.50' : 'background.paper',
                                            border: estaAsignadaSucursal ? 2 : 1,
                                            borderColor: estaAsignadaSucursal ? 'success.main' : 'divider',
                                            cursor: 'pointer',
                                            '&:hover': { borderColor: 'primary.main' }
                                          }}
                                          onClick={() => toggleSucursalEnModulo(modulo.id, sucursal)}
                                        >
                                          <Box display="flex" alignItems="center" gap={1}>
                                            <Checkbox
                                              checked={estaAsignadaSucursal}
                                              onChange={() => toggleSucursalEnModulo(modulo.id, sucursal)}
                                              onClick={(e) => e.stopPropagation()}
                                            />
                                            <StoreIcon fontSize="small" color={estaAsignadaSucursal ? 'success' : 'action'} />
                                            <Box flexGrow={1}>
                                              <Typography variant="body2">
                                                <strong>{sucursal.nombre}</strong>
                                              </Typography>
                                              <Typography variant="caption" color="text.secondary">
                                                {sucursal.tipo_sucursal}
                                              </Typography>
                                            </Box>
                                          </Box>
                                        </Paper>
                                      </Grid>
                                    );
                                  })}
                                </Grid>
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
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog} disabled={loading || formDialog.loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSavePerfil}
            variant="contained"
            color="primary"
            disabled={loading || formDialog.loading || !formDialog.data?.nombre?.trim()}
          >
            {loading ? 'Guardando...' : 'Guardar Perfil'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de eliminar */}
      <Dialog open={deleteDialog.open} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Está seguro que desea eliminar el perfil <strong>{deleteDialog.data?.nombre}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
          <Button onClick={handleDeletePerfil} color="error" variant="contained" disabled={loading}>
            {loading ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
