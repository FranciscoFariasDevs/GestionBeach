// pages/CentrosCostosPage.jsx - Sistema de Gestión de Centros de Costos - REFACTORIZADO
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  TextField,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  InputAdornment,
  Divider,
  Avatar,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  AccountBalance as AccountBalanceIcon,
  Business as BusinessIcon,
  AttachMoney as AttachMoneyIcon,
  Assignment as AssignmentIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Analytics as AnalyticsIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import api from '../api/api'; // ✅ USANDO API.JS COMPARTIDO

const CentrosCostosPage = () => {
  // Estados principales
  const [centrosCostos, setCentrosCostos] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados para tabla
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  
  // Estados para dialogs
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedCentro, setSelectedCentro] = useState(null);
  const [dialogMode, setDialogMode] = useState('create'); // 'create', 'edit', 'view'
  
  // Estados para formulario
  const [formData, setFormData] = useState({
    id: '',
    nombre: '',
    descripcion: '',
    activo: true
  });
  const [formErrors, setFormErrors] = useState({});
  
  // Estados para Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Cargar datos al iniciar
  useEffect(() => {
    cargarCentrosCostos();
    cargarEstadisticas();
  }, [showInactive]);

  // Filtrar datos cuando cambia el término de búsqueda
  const centrosFiltrados = centrosCostos.filter(centro =>
    centro.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    centro.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (centro.descripcion && centro.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const cargarCentrosCostos = async () => {
    setLoading(true);
    try {
      console.log('🔄 Cargando centros de costos...');
      const response = await api.get(`/centros-costos?incluir_inactivos=${showInactive}`);
      
      console.log('📦 Respuesta recibida:', response.data);
      
      if (response.data.success) {
        setCentrosCostos(response.data.data);
        console.log(`✅ ${response.data.data.length} centros de costos cargados`);
      } else {
        console.error('❌ Error en respuesta:', response.data.message);
        setError('Error al cargar centros de costos: ' + response.data.message);
      }
    } catch (err) {
      console.error('❌ Error completo al cargar centros de costos:', err);
      
      // Mejorar el manejo de errores
      let errorMessage = 'Error al cargar centros de costos';
      
      if (err.response) {
        errorMessage = err.response.data?.message || `Error ${err.response.status}`;
      } else if (err.request) {
        errorMessage = 'No se puede conectar al servidor. Verifica que esté corriendo.';
      } else {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const response = await api.get('/centros-costos/estadisticas');
      if (response.data.success) {
        setEstadisticas(response.data.data);
      }
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
    }
  };

  const handleOpenDialog = (mode, centro = null) => {
    setDialogMode(mode);
    setSelectedCentro(centro);
    
    if (mode === 'create') {
      setFormData({
        id: '',
        nombre: '',
        descripcion: '',
        activo: true
      });
    } else if (mode === 'edit' && centro) {
      setFormData({
        id: centro.id,
        nombre: centro.nombre,
        descripcion: centro.descripcion || '',
        activo: centro.activo
      });
    } else if (mode === 'view' && centro) {
      setFormData(centro);
    }
    
    setFormErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCentro(null);
    setFormData({
      id: '',
      nombre: '',
      descripcion: '',
      activo: true
    });
    setFormErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Limpiar error del campo modificado
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.id.trim()) {
      errors.id = 'ID es requerido';
    } else if (!/^[A-Z0-9]{1,10}$/.test(formData.id)) {
      errors.id = 'ID debe contener solo letras mayúsculas y números (máx. 10 caracteres)';
    }
    
    if (!formData.nombre.trim()) {
      errors.nombre = 'Nombre es requerido';
    } else if (formData.nombre.length > 100) {
      errors.nombre = 'Nombre debe tener máximo 100 caracteres';
    }
    
    if (formData.descripcion && formData.descripcion.length > 500) {
      errors.descripcion = 'Descripción debe tener máximo 500 caracteres';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      let response;
      
      if (dialogMode === 'create') {
        response = await api.post('/centros-costos', formData);
      } else if (dialogMode === 'edit') {
        response = await api.put(`/centros-costos/${formData.id}`, {
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          activo: formData.activo
        });
      }
      
      if (response.data.success) {
        showSnackbar(
          dialogMode === 'create' 
            ? 'Centro de costos creado exitosamente' 
            : 'Centro de costos actualizado exitosamente',
          'success'
        );
        handleCloseDialog();
        cargarCentrosCostos();
        cargarEstadisticas();
      } else {
        showSnackbar(response.data.message || 'Error al guardar', 'error');
      }
    } catch (err) {
      console.error('Error al guardar:', err);
      showSnackbar(
        err.response?.data?.message || 'Error al guardar centro de costos',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCentro) return;
    
    setLoading(true);
    try {
      const response = await api.delete(`/centros-costos/${selectedCentro.id}`);
      
      if (response.data.success) {
        showSnackbar('Centro de costos eliminado exitosamente', 'success');
        setOpenDeleteDialog(false);
        setSelectedCentro(null);
        cargarCentrosCostos();
        cargarEstadisticas();
      } else {
        showSnackbar(response.data.message || 'Error al eliminar', 'error');
      }
    } catch (err) {
      console.error('Error al eliminar:', err);
      showSnackbar(
        err.response?.data?.message || 'Error al eliminar centro de costos',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (centro) => {
    setLoading(true);
    try {
      const response = await api.put(`/centros-costos/${centro.id}/toggle-status`, {
        activo: !centro.activo
      });
      
      if (response.data.success) {
        showSnackbar(
          `Centro de costos ${!centro.activo ? 'activado' : 'desactivado'} exitosamente`,
          'success'
        );
        cargarCentrosCostos();
        cargarEstadisticas();
      } else {
        showSnackbar(response.data.message || 'Error al cambiar estado', 'error');
      }
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      showSnackbar('Error al cambiar estado', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ 
      open: true, 
      message: message, 
      severity 
    });
  };

  const formatMoney = (amount) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  };

  return (
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: '#f8f9fa' }}>
      {/* Header */}
      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        color: 'white'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
              Centros de Costos
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              Gestión de centros de costos para clasificación contable
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => {
                cargarCentrosCostos();
                cargarEstadisticas();
              }}
              disabled={loading}
              sx={{ 
                borderColor: 'white', 
                color: 'white',
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
              }}
            >
              Actualizar
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog('create')}
              sx={{ 
                bgcolor: '#f37d16', 
                '&:hover': { bgcolor: '#e06c00' }
              }}
            >
              Nuevo Centro de Costos
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }} 
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Estadísticas */}
      {estadisticas && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <AnalyticsIcon sx={{ mr: 1, color: '#f37d16' }} />
            Estadísticas de Centros de Costos
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h4" component="div">
                        {estadisticas?.general?.total_centros || 0}
                      </Typography>
                      <Typography variant="body2">
                        Total Centros
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                      <AccountBalanceIcon />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white'
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h4" component="div">
                        {estadisticas?.general?.centros_activos || 0}
                      </Typography>
                      <Typography variant="body2">
                        Centros Activos
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                      <CheckCircleIcon />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white'
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h4" component="div">
                        {estadisticas?.general?.total_facturas || 0}
                      </Typography>
                      <Typography variant="body2">
                        Facturas Asociadas
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                      <AssignmentIcon />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                color: 'white'
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h5" component="div">
                        {formatMoney(estadisticas?.general?.monto_total_facturas)}
                      </Typography>
                      <Typography variant="body2">
                        Monto Total
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                      <AttachMoneyIcon />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Controles de filtros */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Buscar por ID, nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                    color="primary"
                  />
                }
                label="Mostrar inactivos"
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabla de centros de costos */}
      <Paper sx={{ mb: 3 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        )}
        
        {!loading && (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Nombre</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Descripción</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Facturas</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Monto Total</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {centrosFiltrados
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((centro) => (
                    <TableRow key={centro.id} hover>
                      <TableCell>
                        <Chip 
                          label={centro.id} 
                          size="small" 
                          color="primary"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {centro.nombre}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ 
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {centro.descripcion || 'Sin descripción'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={centro.activo ? 'Activo' : 'Inactivo'}
                          color={centro.activo ? 'success' : 'default'}
                          size="small"
                          icon={centro.activo ? <CheckCircleIcon /> : <CancelIcon />}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {centro.total_facturas || 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="primary">
                          {formatMoney(centro.monto_total)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Ver detalles">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog('view', centro)}
                              color="info"
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Editar">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog('edit', centro)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title={centro.activo ? 'Desactivar' : 'Activar'}>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleStatus(centro)}
                              color={centro.activo ? 'warning' : 'success'}
                            >
                              {centro.activo ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Eliminar">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedCentro(centro);
                                setOpenDeleteDialog(true);
                              }}
                              color="error"
                              disabled={centro.total_facturas > 0}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {centrosFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <Typography variant="h6" color="text.secondary">
                          No se encontraron centros de costos
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Crea el primer centro de costos'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            <TablePagination
              component="div"
              count={centrosFiltrados.length}
              page={page}
              onPageChange={(event, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              labelRowsPerPage="Filas por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
          </>
        )}
      </Paper>

      {/* Dialog para crear/editar/ver centro de costos */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            {dialogMode === 'create' && 'Nuevo Centro de Costos'}
            {dialogMode === 'edit' && 'Editar Centro de Costos'}
            {dialogMode === 'view' && 'Detalles del Centro de Costos'}
          </Typography>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="ID"
                  name="id"
                  value={formData.id}
                  onChange={handleInputChange}
                  error={!!formErrors.id}
                  helperText={formErrors.id || 'Ej: ADM, VEN, PRO (máx. 10 caracteres)'}
                  disabled={dialogMode === 'edit' || dialogMode === 'view'}
                  inputProps={{ style: { textTransform: 'uppercase' } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.activo}
                      onChange={handleInputChange}
                      name="activo"
                      disabled={dialogMode === 'view'}
                    />
                  }
                  label="Activo"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  error={!!formErrors.nombre}
                  helperText={formErrors.nombre || 'Nombre descriptivo del centro de costos'}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descripción"
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  error={!!formErrors.descripcion}
                  helperText={formErrors.descripcion || 'Descripción detallada (opcional)'}
                  multiline
                  rows={3}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              
              {dialogMode === 'view' && selectedCentro && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Información Adicional
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Total de Facturas
                      </Typography>
                      <Typography variant="h6">
                        {selectedCentro.total_facturas || 0}
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Monto Total
                      </Typography>
                      <Typography variant="h6" color="primary">
                        {formatMoney(selectedCentro.monto_total)}
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Fecha de Creación
                      </Typography>
                      <Typography variant="body1">
                        {new Date(selectedCentro.created_at).toLocaleDateString('es-CL')}
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Última Actualización
                      </Typography>
                      <Typography variant="body1">
                        {new Date(selectedCentro.updated_at).toLocaleDateString('es-CL')}
                      </Typography>
                    </Box>
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseDialog} color="inherit">
            {dialogMode === 'view' ? 'Cerrar' : 'Cancelar'}
          </Button>
          
          {dialogMode !== 'view' && (
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading}
              sx={{ 
                bgcolor: '#f37d16', 
                '&:hover': { bgcolor: '#e06c00' }
              }}
            >
              {loading ? 'Guardando...' : (dialogMode === 'create' ? 'Crear' : 'Actualizar')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmación para eliminar */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: '#d32f2f' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <WarningIcon sx={{ mr: 1 }} />
            Confirmar eliminación
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body1">
            ¿Estás seguro de que deseas eliminar el centro de costos{' '}
            <strong>{selectedCentro?.nombre}</strong> ({selectedCentro?.id})?
          </Typography>
          
          {selectedCentro?.total_facturas > 0 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Este centro de costos tiene {selectedCentro.total_facturas} facturas asociadas.
              No se puede eliminar.
            </Alert>
          )}
          
          {(!selectedCentro?.total_facturas || selectedCentro?.total_facturas === 0) && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Esta acción no se puede deshacer.
            </Alert>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setOpenDeleteDialog(false)} 
            color="inherit"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={loading || (selectedCentro?.total_facturas > 0)}
            startIcon={loading ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {loading ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CentrosCostosPage;