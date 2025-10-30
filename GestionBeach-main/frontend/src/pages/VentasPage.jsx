// VentasPage.jsx - Con cálculos en NETO (sin IVA)

import React, { useState, useEffect } from 'react';
import {
  Box, Container, Grid, Card, CardContent, CardHeader, TextField,
  Button, Typography, CircularProgress, MenuItem, InputAdornment, Dialog,
  DialogTitle, DialogContent, DialogActions, Table, TableHead, TableRow,
  TableCell, TableBody, Alert, Paper, Divider, Chip, TableContainer,
  IconButton, Tooltip, useTheme, Fade, Zoom, Avatar, LinearProgress,
  Stack, ButtonGroup, TablePagination
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ReceiptIcon from '@mui/icons-material/Receipt';
import SummarizeIcon from '@mui/icons-material/Summarize';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BusinessIcon from '@mui/icons-material/Business';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ClearIcon from '@mui/icons-material/Clear';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import api, { authUtils } from '../api/api';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import SucursalSelect from '../components/SucursalSelect';

const VentasPage = () => {
  const theme = useTheme();
  const [selectedSucursal, setSelectedSucursal] = useState('');
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [endDate, setEndDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [ventas, setVentas] = useState([]);
  const [ventasOriginales, setVentasOriginales] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [docFilter, setDocFilter] = useState('');

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedFolio, setSelectedFolio] = useState(null);
  const [productos, setProductos] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState({
    totalVentas: 0,
    totalMonto: 0,
    promedioVenta: 0,
    ventasPorTipo: {},
    topVendedores: []
  });

  const { enqueueSnackbar } = useSnackbar();

  const formatCurrency = (value) => new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0
  }).format(value || 0);

  const formatDate = (date) => format(date, 'yyyy-MM-dd');

  // FUNCIÓN CORREGIDA: Calcula totales usando NETO (sin IVA)
  const calcularEstadisticas = (data) => {
    const totalVentas = data.length;
    
    // Sumar el campo Neto en lugar de Total
    const totalMonto = data.reduce((sum, venta) => sum + parseFloat(venta.Neto || 0), 0);
    const promedioVenta = totalVentas > 0 ? totalMonto / totalVentas : 0;
    
    const ventasPorTipo = data.reduce((acc, venta) => {
      const doc = venta.Doc || 'Sin especificar';
      if (!acc[doc]) {
        acc[doc] = { tipo: doc, cantidad: 0, monto: 0 };
      }
      acc[doc].cantidad += 1;
      acc[doc].monto += parseFloat(venta.Neto || 0); // Usar Neto
      return acc;
    }, {});
    
    const vendedores = data.reduce((acc, venta) => {
      const vendedor = venta.Vendedor || 'Sin asignar';
      if (!acc[vendedor]) {
        acc[vendedor] = { nombre: vendedor, ventas: 0, monto: 0 };
      }
      acc[vendedor].ventas += 1;
      acc[vendedor].monto += parseFloat(venta.Neto || 0); // Usar Neto
      return acc;
    }, {});

    const topVendedores = Object.values(vendedores)
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 5);
    
    setStats({
      totalVentas,
      totalMonto,
      promedioVenta,
      ventasPorTipo,
      topVendedores
    });
  };

  const handleSearch = async () => {
    if (!selectedSucursal) {
      enqueueSnackbar('Seleccione una sucursal', { variant: 'warning' });
      return;
    }
    
    if (!authUtils.isAuthenticated()) {
      setError('Debe iniciar sesión para consultar ventas');
      enqueueSnackbar('Sesión requerida', { variant: 'error' });
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setPage(0);
      
      const response = await api.post('/ventas', {
        sucursal_id: selectedSucursal,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate)
      });
      
      let ventasData = [];
      if (response.data?.ventas && Array.isArray(response.data.ventas)) {
        ventasData = response.data.ventas;
      } else if (Array.isArray(response.data)) {
        ventasData = response.data;
      }
      
      setVentas(ventasData);
      setVentasOriginales(ventasData);
      calcularEstadisticas(ventasData);
      
      const cantidad = ventasData.length;
      enqueueSnackbar(`Se encontraron ${cantidad} registros`, { 
        variant: cantidad > 0 ? 'success' : 'info' 
      });
      
      setShowStats(cantidad > 0);
      
    } catch (error) {
      console.error('Error al buscar ventas:', error);
      
      if (error.response?.status === 401) {
        setError('Sesión expirada');
        enqueueSnackbar('Sesión expirada', { variant: 'error' });
        authUtils.logout();
      } else if (error.response?.status === 403) {
        setError('Sin permisos para esta sucursal');
        enqueueSnackbar('Sin permisos', { variant: 'error' });
      } else {
        setError('Error al buscar ventas');
        enqueueSnackbar('Error al buscar ventas', { variant: 'error' });
      }
      
      setVentas([]);
      setVentasOriginales([]);
      setShowStats(false);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    let filtered = [...ventasOriginales];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(venta => 
        venta.Folio?.toString().includes(term) ||
        venta.Vendedor?.toLowerCase().includes(term) ||
        venta.Cliente?.toLowerCase().includes(term) ||
        venta.Rut_Cliente?.toLowerCase().includes(term) ||
        venta.Doc?.toLowerCase().includes(term)
      );
    }
    
    if (docFilter) {
      filtered = filtered.filter(venta => venta.Doc === docFilter);
    }
    
    setVentas(filtered);
    setPage(0);
  };

  useEffect(() => {
    if (ventasOriginales.length > 0) {
      handleFilter();
    }
  }, [searchTerm, docFilter, ventasOriginales]);

  const handleViewProductos = async (folio) => {
    setSelectedFolio(folio);
    setOpenDialog(true);
    setLoadingProductos(true);
    
    try {
      const response = await api.get(`/ventas/productos?folio=${folio}&sucursal_id=${selectedSucursal}`);
      
      if (response.data?.success && Array.isArray(response.data.productos)) {
        setProductos(response.data.productos);
      } else {
        setProductos([]);
        enqueueSnackbar('No se encontraron productos', { variant: 'warning' });
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
      setProductos([]);
      if (error.response?.status === 401) {
        enqueueSnackbar('Sesión expirada', { variant: 'error' });
      } else {
        enqueueSnackbar('Error al cargar productos', { variant: 'error' });
      }
    } finally {
      setLoadingProductos(false);
    }
  };

  const getDocumentColor = (docType) => {
    switch (docType) {
      case 'Factura': return 'primary';
      case 'Boleta': return 'success';
      case 'Venta Cigarros': return 'warning';
      case 'Nota de Crédito': return 'error';
      default: return 'default';
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDocFilter('');
    setPage(0);
  };

  const ventasPaginadas = ventas.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        
        <Fade in timeout={800}>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 48, height: 48 }}>
                  <AssessmentIcon fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    Gestión de Ventas
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary">
                    Análisis detallado de ventas por sucursal y período
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  icon={authUtils.isAuthenticated() ? <CheckCircleIcon /> : <ErrorIcon />}
                  label={authUtils.isAuthenticated() ? 'Autenticado' : 'Requiere Login'}
                  color={authUtils.isAuthenticated() ? 'success' : 'error'}
                  variant="outlined"
                  sx={{ fontWeight: 'medium' }}
                />
              </Box>
            </Box>
          </Box>
        </Fade>

        <Zoom in timeout={600}>
          <Card sx={{ 
            mb: 3, 
            borderRadius: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
          }} elevation={0}>
            <CardHeader 
              title={
                <Box display="flex" alignItems="center">
                  <FilterListIcon sx={{ mr: 1 }} />
                  <Typography variant="h6" component="span" sx={{ fontWeight: 'medium' }}>
                    Filtros de Búsqueda
                  </Typography>
                </Box>
              }
              sx={{ pb: 1 }}
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <SucursalSelect
                    value={selectedSucursal}
                    onChange={(e) => setSelectedSucursal(e.target.value)}
                    label="Sucursal"
                    fullWidth
                    required
                    sx={{
                      '& .MuiInputBase-root': {
                        bgcolor: 'rgba(255,255,255,0.1)',
                        color: 'white',
                        height: '56px'
                      },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.8)' },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                      '& .MuiSelect-icon': { color: 'white' }
                    }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Grid container spacing={2} alignItems="end">
                    <Grid item xs={12} sm={4}>
                      <DatePicker
                        label="Fecha Inicio"
                        value={startDate}
                        onChange={(newValue) => setStartDate(newValue)}
                        format="dd-MM-yyyy"
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            InputProps: {
                              startAdornment: (
                                <InputAdornment position="start">
                                  <CalendarTodayIcon sx={{ color: 'white' }} />
                                </InputAdornment>
                              ),
                            },
                            sx: {
                              '& .MuiInputBase-root': { 
                                bgcolor: 'rgba(255,255,255,0.1)',
                                color: 'white'
                              },
                              '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.8)' },
                              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' }
                            }
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <DatePicker
                        label="Fecha Fin"
                        value={endDate}
                        onChange={(newValue) => setEndDate(newValue)}
                        format="dd-MM-yyyy"
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            InputProps: {
                              startAdornment: (
                                <InputAdornment position="start">
                                  <CalendarTodayIcon sx={{ color: 'white' }} />
                                </InputAdornment>
                              ),
                            },
                            sx: {
                              '& .MuiInputBase-root': { 
                                bgcolor: 'rgba(255,255,255,0.1)',
                                color: 'white'
                              },
                              '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.8)' },
                              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' }
                            }
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={handleSearch}
                        fullWidth
                        disabled={loading || !authUtils.isAuthenticated()}
                        size="large"
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                        sx={{ 
                          height: '56px',
                          bgcolor: authUtils.isAuthenticated() ? 'white' : 'grey.400',
                          color: authUtils.isAuthenticated() ? 'primary.main' : 'text.disabled',
                          '&:hover': { 
                            bgcolor: authUtils.isAuthenticated() ? 'rgba(255,255,255,0.9)' : 'grey.400'
                          },
                          fontWeight: 'bold',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }}
                      >
                        {loading ? 'Buscando...' : 
                         !authUtils.isAuthenticated() ? 'Requiere Autenticación' : 
                         'Buscar Ventas'}
                      </Button>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Zoom>

        {loading && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress />
          </Box>
        )}

        {error && (
          <Fade in>
            <Alert 
              severity="error" 
              sx={{ mb: 3, borderRadius: 2 }}
              action={
                <IconButton color="inherit" size="small" onClick={() => setError(null)}>
                  <ClearIcon />
                </IconButton>
              }
            >
              {error}
            </Alert>
          </Fade>
        )}

        {showStats && (
          <Fade in timeout={1000}>
            <Card sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }} elevation={4}>
              <CardHeader 
                title={
                  <Box display="flex" alignItems="center">
                    <TrendingUpIcon sx={{ mr: 1 }} color="primary" />
                    <Typography variant="h6" component="span" sx={{ fontWeight: 'bold' }}>
                      Dashboard de Resultados (Montos sin IVA)
                    </Typography>
                  </Box>
                }
                sx={{ bgcolor: 'primary.main', color: 'white' }}
              />
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card variant="outlined" sx={{ height: '100%', borderRadius: 2, bgcolor: 'primary.50' }}>
                      <CardContent sx={{ textAlign: 'center', p: 3 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 2, width: 56, height: 56 }}>
                          <ReceiptIcon fontSize="large" />
                        </Avatar>
                        <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                          {stats.totalVentas.toLocaleString()}
                        </Typography>
                        <Typography variant="subtitle2" color="text.secondary">
                          Total de Ventas
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Card variant="outlined" sx={{ height: '100%', borderRadius: 2, bgcolor: 'success.50' }}>
                      <CardContent sx={{ textAlign: 'center', p: 3 }}>
                        <Avatar sx={{ bgcolor: 'success.main', mx: 'auto', mb: 2, width: 56, height: 56 }}>
                          <AccountBalanceWalletIcon fontSize="large" />
                        </Avatar>
                        <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold', mb: 1 }}>
                          {formatCurrency(stats.totalMonto)}
                        </Typography>
                        <Typography variant="subtitle2" color="text.secondary">
                          Monto Total (Sin IVA)
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Card variant="outlined" sx={{ height: '100%', borderRadius: 2, bgcolor: 'warning.50' }}>
                      <CardContent sx={{ textAlign: 'center', p: 3 }}>
                        <Avatar sx={{ bgcolor: 'warning.main', mx: 'auto', mb: 2, width: 56, height: 56 }}>
                          <TrendingUpIcon fontSize="large" />
                        </Avatar>
                        <Typography variant="h4" color="warning.main" sx={{ fontWeight: 'bold', mb: 1 }}>
                          {formatCurrency(stats.promedioVenta)}
                        </Typography>
                        <Typography variant="subtitle2" color="text.secondary">
                          Promedio por Venta
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Card variant="outlined" sx={{ height: '100%', borderRadius: 2, bgcolor: 'info.50' }}>
                      <CardContent sx={{ textAlign: 'center', p: 3 }}>
                        <Avatar sx={{ bgcolor: 'info.main', mx: 'auto', mb: 2, width: 56, height: 56 }}>
                          <SummarizeIcon fontSize="large" />
                        </Avatar>
                        <Typography variant="h4" color="info.main" sx={{ fontWeight: 'bold', mb: 1 }}>
                          {Object.keys(stats.ventasPorTipo).length}
                        </Typography>
                        <Typography variant="subtitle2" color="text.secondary">
                          Tipos de Documento
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                      Distribución por Tipo de Documento (Montos sin IVA)
                    </Typography>
                    <Grid container spacing={2}>
                      {Object.values(stats.ventasPorTipo).map((item) => (
                        <Grid item xs={6} sm={4} md={3} key={item.tipo}>
                          <Card variant="outlined" sx={{ borderRadius: 2 }}>
                            <CardContent>
                              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>
                                  {item.tipo}
                                </Typography>
                                <Chip 
                                  label={item.cantidad}
                                  size="small"
                                  color={getDocumentColor(item.tipo)}
                                />
                              </Box>
                              <Typography variant="h6" color="primary.main" sx={{ fontWeight: 'bold' }}>
                                {formatCurrency(item.monto)}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Fade>
        )}

        <Card sx={{ borderRadius: 3, overflow: 'hidden' }} elevation={4}>
          <CardHeader
            title={
              <Box display="flex" alignItems="center">
                <ReceiptIcon sx={{ mr: 1 }} color="primary" />
                <Typography variant="h6" component="span" sx={{ fontWeight: 'bold' }}>
                  Registros de Ventas
                </Typography>
                <Chip 
                  label={`${ventas.length} registros`} 
                  color="primary" 
                  size="small"
                  sx={{ ml: 2 }}
                />
              </Box>
            }
            action={
              <Stack direction="row" spacing={1}>
                <Tooltip title="Exportar datos">
                  <IconButton color="primary">
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Refrescar">
                  <IconButton onClick={handleSearch} disabled={loading} color="primary">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            }
            sx={{ bgcolor: 'primary.main', color: 'white' }}
          />
          
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <TextField
                size="small"
                placeholder="Buscar por folio, cliente, vendedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ flexGrow: 1, maxWidth: { xs: '100%', sm: '300px' } }}
              />
              
              <TextField
                select
                size="small"
                label="Tipo de Documento"
                value={docFilter}
                onChange={(e) => setDocFilter(e.target.value)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="Factura">Factura</MenuItem>
                <MenuItem value="Boleta">Boleta</MenuItem>
                <MenuItem value="Venta Cigarros">Venta Cigarros</MenuItem>
              </TextField>

              <ButtonGroup variant="outlined" size="small">
                <Button onClick={clearFilters} startIcon={<ClearIcon />}>
                  Limpiar
                </Button>
              </ButtonGroup>
            </Stack>
          </Box>
          
          <CardContent sx={{ p: 0 }}>
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {['Folio', 'Vendedor', 'Cliente', 'RUT', 'Neto', 'IVA', 'Total', 'Documento', 'Fecha'].map((header) => (
                      <TableCell 
                        key={header}
                        sx={{ 
                          fontWeight: 'bold', 
                          bgcolor: 'grey.100',
                          borderBottom: 2,
                          borderColor: 'primary.main'
                        }}
                      >
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ventasPaginadas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                        <Typography variant="h6" color="text.secondary">
                          {loading ? 'Cargando ventas...' : 
                           !authUtils.isAuthenticated() ? 'Debe iniciar sesión para consultar ventas' :
                           'No hay ventas que mostrar'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    ventasPaginadas.map((venta, idx) => (
                      <TableRow 
                        key={`${venta.Folio}-${idx}`}
                        hover
                        sx={{ 
                          '&:nth-of-type(odd)': { bgcolor: 'grey.50' },
                          '&:hover': { bgcolor: 'primary.50' }
                        }}
                      >
                        <TableCell>
                          <Button 
                            variant="text" 
                            color="primary"
                            startIcon={<VisibilityIcon fontSize="small" />}
                            onClick={() => handleViewProductos(venta.Folio)}
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                          >
                            {venta.Folio}
                          </Button>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'medium' }}>{venta.Vendedor}</TableCell>
                        <TableCell>{venta.Cliente}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{venta.Rut_Cliente}</TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>{formatCurrency(venta.Neto)}</TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>{formatCurrency(venta.Iva)}</TableCell>
                        <TableCell>
                          <Typography fontWeight="bold" color="primary.main">
                            {formatCurrency(venta.Total)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={venta.Doc}
                            size="small"
                            color={getDocumentColor(venta.Doc)}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {venta.Fecha ? format(new Date(venta.Fecha), 'dd/MM/yyyy HH:mm') : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            {ventas.length > 0 && (
              <TablePagination
                component="div"
                count={ventas.length}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
                labelRowsPerPage="Filas por página:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                sx={{ borderTop: 1, borderColor: 'divider' }}
              />
            )}
          </CardContent>
        </Card>

        <Dialog 
          open={openDialog} 
          onClose={() => setOpenDialog(false)} 
          maxWidth="lg" 
          fullWidth
          PaperProps={{
            elevation: 24,
            sx: { borderRadius: 3 }
          }}
        >
          <DialogTitle sx={{ 
            bgcolor: 'primary.main', 
            color: 'white', 
            display: 'flex', 
            alignItems: 'center',
            borderBottom: 1,
            borderColor: 'divider'
          }}>
            <ReceiptIcon sx={{ mr: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Productos del Folio {selectedFolio}
            </Typography>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 0 }}>
            {loadingProductos ? (
              <Box textAlign="center" py={4}>
                <CircularProgress size={40} />
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Cargando productos...
                </Typography>
              </Box>
            ) : (
              <TableContainer sx={{ maxHeight: 500 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      {['Código', 'Descripción', 'Cantidad', 'Precio Unit.', 'Costo', 'Total', 'Utilidad', 'Margen'].map((header) => (
                        <TableCell key={header} sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
                          {header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {productos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            No hay productos que mostrar
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      productos.map((prod, idx) => (
                        <TableRow 
                          key={`${prod.Codigo}-${idx}`}
                          hover
                          sx={{ '&:nth-of-type(odd)': { bgcolor: 'grey.50' } }}
                        >
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                            {prod.Codigo}
                          </TableCell>
                          <TableCell sx={{ maxWidth: 200 }}>{prod.Descripcion}</TableCell>
                          <TableCell>{prod.Cantidad}</TableCell>
                          <TableCell>{formatCurrency(prod.Precio_Unitario)}</TableCell>
                          <TableCell>{formatCurrency(prod.Costo)}</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>{formatCurrency(prod.Total)}</TableCell>
                          <TableCell sx={{ color: 'success.main', fontWeight: 'bold' }}>
                            {formatCurrency(prod.Utilidad)}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={`${parseFloat(prod.Margen || 0).toFixed(1)}%`}
                              size="small"
                              color={
                                parseFloat(prod.Margen) > 30 ? 'success' : 
                                parseFloat(prod.Margen) > 15 ? 'info' : 
                                parseFloat(prod.Margen) > 0 ? 'warning' : 
                                'error'
                              }
                              sx={{ minWidth: 60, fontWeight: 'bold' }}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button 
              variant="outlined"
              onClick={() => setOpenDialog(false)}
              startIcon={<ClearIcon />}
            >
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
};

export default VentasPage;