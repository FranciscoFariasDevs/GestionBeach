// frontend/src/pages/LosMasVendidosPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  useTheme,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Stack,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Avatar,
  Pagination,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Category,
  Refresh,
  ViewList,
  BarChart as BarChartIcon,
  Speed,
  HourglassEmpty,
  BugReport,
  ExpandMore,
  TableChart,
  ShowChart,
  EmojiEvents,
  Visibility,
  Download
} from '@mui/icons-material';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import api from '../api/api';
import { useSnackbar } from 'notistack';
import SucursalSelect from '../components/SucursalSelect';

// Colores mejorados para gráficos
const CHART_COLORS = {
  primary: '#1976d2',
  secondary: '#dc004e',
  success: '#2e7d32',
  warning: '#ed6c02',
  info: '#0288d1',
  gradient: ['#1976d2', '#42a5f5', '#90caf9', '#bbdefb'],
  pie: ['#1976d2', '#dc004e', '#2e7d32', '#ed6c02', '#0288d1', '#7b1fa2', '#d32f2f', '#f57c00']
};

// Opciones de períodos
const periodOptions = [
  { id: 'day', name: 'Hoy' },
  { id: 'week', name: 'Esta semana' },
  { id: 'month', name: 'Este mes' },
  { id: 'quarter', name: 'Este trimestre' },
  { id: 'year', name: 'Este año' },
];

// Tipos de vista mejorados
const viewTypes = [
  { id: 'cards', name: 'Tarjetas', icon: <ViewList /> },
  { id: 'table', name: 'Tabla Completa', icon: <TableChart /> },
  { id: 'chart', name: 'Gráfico de Barras', icon: <BarChartIcon /> },
  { id: 'area', name: 'Gráfico de Área', icon: <ShowChart /> }
];

// Tipos de métricas mejorados
const metricTypes = [
  { 
    id: 'top', 
    name: 'Más Vendidos', 
    icon: <TrendingUp />, 
    endpoint: 'productos',
    color: '#2e7d32',
    description: 'Productos con mayor volumen de ventas'
  },
  { 
    id: 'bottom', 
    name: 'Menos Vendidos', 
    icon: <TrendingDown />, 
    endpoint: 'menosvendidos',
    color: '#d32f2f',
    description: 'Productos con menor volumen de ventas'
  },
  { 
    id: 'high_rotation', 
    name: 'Mayor Rotación', 
    icon: <Speed />, 
    endpoint: 'masrotacion',
    color: '#1976d2',
    description: 'Productos que se venden más frecuentemente'
  },
  { 
    id: 'low_rotation', 
    name: 'Menor Rotación', 
    icon: <HourglassEmpty />, 
    endpoint: 'menorrotacion',
    color: '#ed6c02',
    description: 'Productos que se venden menos frecuentemente'
  }
];

// Opciones de límite de productos
const limitOptions = [
  { value: 10, label: 'Top 10' },
  { value: 20, label: 'Top 20' },
  { value: 30, label: 'Top 30' },
  { value: 50, label: 'Top 50' },
  { value: 100, label: 'Top 100' }
];

const SupermercadosPage = () => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  
  // Estados principales
  const [selectedSucursal, setSelectedSucursal] = useState('');
  const [familias, setFamilias] = useState([]);
  const [selectedFamilia, setSelectedFamilia] = useState('all');
  const [period, setPeriod] = useState('week');
  const [viewType, setViewType] = useState('cards');
  const [metricType, setMetricType] = useState('top');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  
  // Estados para paginación y filtros
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortBy, setSortBy] = useState('sales');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Estados para datos
  const [productsData, setProductsData] = useState([]);
  const [categoryDistribution, setCategoryDistribution] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [summaryData, setSummaryData] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalProducts: 0,
    avgRotation: 0,
    topProduct: null
  });

  // ✅ FUNCIÓN DE TEST DE CONEXIÓN MEJORADA
  const testConnection = async (sucursal_id) => {
    try {
      console.log('🔍 Probando conexión con sucursal:', sucursal_id);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const response = await api.get('/losmasvendidos/test-connection', {
        params: { sucursal_id }
      });
      
      console.log('✅ Test conexión exitoso:', response.data);
      setConnectionStatus({ success: true, data: response.data });
      return true;
    } catch (error) {
      console.error('❌ Error en test de conexión:', error);
      setConnectionStatus({ 
        success: false, 
        error: error.response?.data?.message || error.message,
        status: error.response?.status
      });
      return false;
    }
  };


  // ✅ FUNCIÓN PARA CARGAR FAMILIAS
  const loadFamilias = useCallback(async () => {
    if (!selectedSucursal) return;
    
    try {
      setIsLoading(true);
      const response = await api.get('/losmasvendidos/familias', { 
        params: { sucursal_id: selectedSucursal } 
      });
      
      setFamilias([
        { id: 'all', nombre: 'Todas las familias' },
        ...response.data
      ]);
      
    } catch (error) {
      console.error('❌ Error al cargar familias:', error);
      enqueueSnackbar('Error al cargar familias', { variant: 'warning' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedSucursal, enqueueSnackbar]);

  // ✅ FUNCIÓN PARA CARGAR PRODUCTOS CON LÍMITE
  const loadProductsData = useCallback(async () => {
    if (!selectedSucursal) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const params = { 
        period,
        sucursal_id: selectedSucursal,
        limit: limit
      };
      
      if (selectedFamilia !== 'all') {
        params.familia = selectedFamilia;
      }
      
      const currentMetric = metricTypes.find(m => m.id === metricType);
      const endpoint = `/losmasvendidos/${currentMetric.endpoint}`;
      
      console.log('🔍 Cargando productos:', { endpoint, params });
      const response = await api.get(endpoint, { params });
      
      const products = response.data.products || [];
      setProductsData(products);
      
      // Calcular resumen mejorado
      if (products.length > 0) {
        const totalSales = products.reduce((sum, p) => sum + (p.sales || 0), 0);
        const totalRevenue = products.reduce((sum, p) => sum + (p.revenue || 0), 0);
        const avgRotation = products.reduce((sum, p) => sum + (p.rotation || 0), 0) / products.length;
        
        setSummaryData({
          totalSales,
          totalRevenue,
          totalProducts: products.length,
          avgRotation: avgRotation || 0,
          topProduct: products[0]
        });
      }
      
    } catch (error) {
      console.error('❌ Error al cargar productos:', error);
      setError(`Error al cargar datos: ${error.message}`);
      enqueueSnackbar('Error al cargar productos', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedSucursal, selectedFamilia, period, metricType, limit, enqueueSnackbar]);

  // ✅ FUNCIÓN PARA CARGAR DATOS ADICIONALES
  const loadAdditionalData = useCallback(async () => {
    if (!selectedSucursal) return;
    
    try {
      const params = { period, sucursal_id: selectedSucursal };
      
      // Cargar distribución
      const catResponse = await api.get('/losmasvendidos/distribucion', { params });
      setCategoryDistribution(catResponse.data || []);
      
      // Cargar tendencia
      const trendParams = { ...params };
      if (selectedFamilia !== 'all') {
        trendParams.familia = selectedFamilia;
      }
      const trendResponse = await api.get('/losmasvendidos/tendencia', { params: trendParams });
      setTrendData(trendResponse.data || []);
      
    } catch (error) {
      console.error('❌ Error al cargar datos adicionales:', error);
    }
  }, [selectedSucursal, selectedFamilia, period]);

  // ✅ EFECTOS

  useEffect(() => {
    if (selectedSucursal) {
      loadFamilias();
      setSelectedFamilia('all');
      testConnection(selectedSucursal);
    }
  }, [selectedSucursal, loadFamilias]);

  useEffect(() => {
    if (selectedSucursal) {
      setCurrentPage(1); // Reset página al cambiar filtros
      loadProductsData();
      loadAdditionalData();
    }
  }, [selectedSucursal, selectedFamilia, period, metricType, limit, loadProductsData, loadAdditionalData]);

  // ✅ FUNCIONES AUXILIARES
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const getCurrentMetric = () => metricTypes.find(m => m.id === metricType);

  const getProductsForCurrentPage = () => {
    const startIndex = (currentPage - 1) * 20;
    const endIndex = startIndex + 20;
    return productsData.slice(startIndex, endIndex);
  };

  const getTotalPages = () => Math.ceil(productsData.length / 20);

  // ✅ COMPONENTE DE TARJETA DE PRODUCTO
  const ProductCard = ({ product, index, rank }) => (
    <Card 
      sx={{ 
        height: '100%', 
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': { 
          transform: 'translateY(-4px)', 
          boxShadow: theme.shadows[8] 
        },
        border: rank <= 3 ? `2px solid ${getCurrentMetric().color}` : 'none'
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          {/* Header con ranking */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Chip 
              label={`#${rank}`}
              color={rank === 1 ? "warning" : rank <= 3 ? "primary" : "default"}
              size="small"
              icon={rank === 1 ? <EmojiEvents /> : undefined}
            />
            <Avatar 
              sx={{ 
                bgcolor: getCurrentMetric().color, 
                width: 32, 
                height: 32 
              }}
            >
              {getCurrentMetric().icon}
            </Avatar>
          </Stack>

          {/* Información del producto */}
          <Box>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 'bold',
                fontSize: rank <= 3 ? '1.1rem' : '1rem',
                lineHeight: 1.3,
                mb: 1
              }}
            >
              {product.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {product.category} • Código: {product.code}
            </Typography>
          </Box>

          {/* Métricas */}
          <Stack spacing={1}>
            {metricType.includes('rotation') ? (
              <Box>
                <Typography variant="h4" color={getCurrentMetric().color} sx={{ fontWeight: 'bold' }}>
                  {product.rotation?.toFixed(2) || '0.00'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  unidades/día
                </Typography>
              </Box>
            ) : (
              <>
                <Box>
                  <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
                    {product.sales?.toLocaleString() || '0'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    unidades vendidas
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h6" color="secondary">
                    {formatCurrency(product.revenue)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ingresos totales
                  </Typography>
                </Box>
              </>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );

  // ✅ COMPONENTE DE TABLA MEJORADA
  const ProductTable = () => (
    <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>Ranking</TableCell>
            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>Producto</TableCell>
            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>Familia</TableCell>
            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>Código</TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>
              {metricType.includes('rotation') ? 'Rotación (uds/día)' : 'Unidades'}
            </TableCell>
            {!metricType.includes('rotation') && (
              <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>
                Ingresos
              </TableCell>
            )}
            <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>
              Status
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {getProductsForCurrentPage().map((product, index) => {
            const globalRank = (currentPage - 1) * 20 + index + 1;
            return (
              <TableRow
                key={product.id || index}
                sx={{ 
                  '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                  '&:hover': { bgcolor: 'primary.light', opacity: 0.1 }
                }}
              >
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Chip 
                      label={`#${globalRank}`}
                      color={globalRank === 1 ? "warning" : globalRank <= 3 ? "primary" : "default"}
                      size="small"
                      icon={globalRank === 1 ? <EmojiEvents /> : undefined}
                    />
                  </Stack>
                </TableCell>
                <TableCell sx={{ maxWidth: 200 }}>
                  <Typography variant="body2" sx={{ fontWeight: globalRank <= 5 ? 'bold' : 'normal' }}>
                    {product.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={product.category} size="small" variant="outlined" />
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{product.code}</TableCell>
                <TableCell align="right">
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 'bold',
                      color: globalRank <= 3 ? getCurrentMetric().color : 'inherit'
                    }}
                  >
                    {metricType.includes('rotation') ? 
                      (product.rotation?.toFixed(2) || '0.00') : 
                      (product.sales?.toLocaleString() || '0')
                    }
                  </Typography>
                </TableCell>
                {!metricType.includes('rotation') && (
                  <TableCell align="right">
                    <Typography variant="body2" color="secondary" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(product.revenue)}
                    </Typography>
                  </TableCell>
                )}
                <TableCell align="center">
                  <Chip 
                    label={globalRank <= 10 ? 'TOP 10' : globalRank <= 25 ? 'TOP 25' : 'OTROS'}
                    color={globalRank <= 10 ? 'success' : globalRank <= 25 ? 'info' : 'default'}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box sx={{ flexGrow: 1, p: 2 }}>
      {isLoading && productsData.length === 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <Stack alignItems="center" spacing={2}>
            <CircularProgress size={60} />
            <Typography variant="h6">Cargando datos...</Typography>
          </Stack>
        </Box>
      )}
      {isLoading && productsData.length > 0 && <LinearProgress sx={{ width: '100%', mb: 2 }} />}
      
      {/* Alert de errores */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => selectedSucursal && testConnection(selectedSucursal)}
              startIcon={<BugReport />}
            >
              Diagnóstico
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Status de conexión */}
      {connectionStatus && (
        <Alert 
          severity={connectionStatus.success ? "success" : "error"} 
          sx={{ mb: 2 }}
          action={
            !connectionStatus.success && (
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => selectedSucursal && testConnection(selectedSucursal)}
              >
                Reintentar
              </Button>
            )
          }
        >
          {connectionStatus.success 
            ? `✅ Conectado a: ${connectionStatus.data?.sucursal?.nombre}` 
            : `❌ Error ${connectionStatus.status || ''}: ${connectionStatus.error}`
          }
        </Alert>
      )}

      {/* Panel de controles principal */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          {/* Fila 1: Filtros básicos */}
          <Grid item xs={12} sm={6} md={3}>
            <SucursalSelect
              value={selectedSucursal}
              onChange={(e) => setSelectedSucursal(e.target.value)}
              label="Sucursal"
              fullWidth
              required
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Familia</InputLabel>
              <Select
                value={selectedFamilia}
                label="Familia"
                onChange={(e) => setSelectedFamilia(e.target.value)}
                disabled={!selectedSucursal}
              >
                {familias.map((familia) => (
                  <MenuItem key={familia.id} value={familia.id}>
                    {familia.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Período</InputLabel>
              <Select
                value={period}
                label="Período"
                onChange={(e) => setPeriod(e.target.value)}
              >
                {periodOptions.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Mostrar</InputLabel>
              <Select
                value={limit}
                label="Mostrar"
                onChange={(e) => setLimit(e.target.value)}
              >
                {limitOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Fila 2: Controles de vista */}
          <Grid item xs={12}>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Typography variant="body2" color="text.secondary">
                Vista:
              </Typography>
              {viewTypes.map((view) => (
                <Tooltip key={view.id} title={view.name}>
                  <IconButton 
                    color={viewType === view.id ? 'primary' : 'default'} 
                    onClick={() => setViewType(view.id)}
                    size="small"
                  >
                    {view.icon}
                  </IconButton>
                </Tooltip>
              ))}
              
              <Tooltip title="Actualizar datos">
                <IconButton 
                  onClick={() => { loadProductsData(); loadAdditionalData(); }} 
                  disabled={isLoading || !selectedSucursal}
                  color="info"
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
              
              {selectedSucursal && (
                <Tooltip title="Probar conexión">
                  <IconButton 
                    onClick={() => testConnection(selectedSucursal)} 
                    color="success"
                    size="small"
                  >
                    <BugReport />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Pestañas de métricas mejoradas */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={metricType}
          onChange={(_, newValue) => setMetricType(newValue)}
          variant="fullWidth"
          textColor="primary"
          indicatorColor="primary"
        >
          {metricTypes.map((metric) => (
            <Tab 
              key={metric.id}
              value={metric.id}
              label={
                <Stack alignItems="center" spacing={0.5}>
                  {metric.icon}
                  <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                    {metric.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    {metric.description}
                  </Typography>
                </Stack>
              }
              sx={{ 
                minHeight: 80,
                '&.Mui-selected': { 
                  bgcolor: `${metric.color}15`,
                  color: metric.color
                }
              }}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Tarjetas de resumen mejoradas */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <ShoppingBag sx={{ fontSize: 32 }} />
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {summaryData.totalProducts}
                  </Typography>
                </Stack>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Productos en ranking
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  {periodOptions.find(p => p.id === period)?.name}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', bgcolor: 'success.main', color: 'white' }}>
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <TrendingUp sx={{ fontSize: 32 }} />
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {summaryData.totalSales.toLocaleString()}
                  </Typography>
                </Stack>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Total unidades
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Ventas acumuladas
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', bgcolor: 'secondary.main', color: 'white' }}>
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <ShoppingBag sx={{ fontSize: 32 }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(summaryData.totalRevenue)}
                  </Typography>
                </Stack>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Ingresos totales
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Período seleccionado
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', bgcolor: getCurrentMetric().color, color: 'white' }}>
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  {getCurrentMetric().icon}
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {metricType.includes('rotation') ? 
                      `${summaryData.avgRotation.toFixed(2)}` : 
                      '#1'
                    }
                  </Typography>
                </Stack>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  {metricType.includes('rotation') ? 'Rotación promedio' : 'Líder del ranking'}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  {metricType.includes('rotation') ? 'uds/día' : summaryData.topProduct?.name?.substring(0, 20) + '...' || 'N/A'}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Contenido principal según vista seleccionada */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={3}>
          {/* Header del contenido */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap">
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
                Top {limit} Productos {getCurrentMetric().name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {getCurrentMetric().description} • {periodOptions.find(p => p.id === period)?.name}
                {selectedFamilia !== 'all' && ` • ${familias.find(f => f.id === selectedFamilia)?.nombre}`}
              </Typography>
            </Box>
            
            <Stack direction="row" spacing={1}>
              <Button
                startIcon={<Download />}
                variant="outlined"
                size="small"
                onClick={() => {
                  // Función para exportar datos (implementar según necesidad)
                  enqueueSnackbar('Función de exportación en desarrollo', { variant: 'info' });
                }}
              >
                Exportar
              </Button>
            </Stack>
          </Stack>

          {/* Contenido según vista */}
          {!selectedSucursal ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h5" color="text.secondary" sx={{ mb: 2 }}>
                Selecciona una sucursal para ver los datos
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Usa el selector de sucursal arriba para comenzar
              </Typography>
            </Box>
          ) : productsData.length > 0 ? (
            <>
              {viewType === 'cards' && (
                <Box>
                  <Grid container spacing={2}>
                    {getProductsForCurrentPage().map((product, index) => {
                      const globalRank = (currentPage - 1) * 20 + index + 1;
                      return (
                        <Grid key={product.id || index} item xs={12} sm={6} md={4} lg={3}>
                          <ProductCard product={product} index={index} rank={globalRank} />
                        </Grid>
                      );
                    })}
                  </Grid>
                  
                  {/* Paginación para vista de tarjetas */}
                  {getTotalPages() > 1 && (
                    <Stack alignItems="center" sx={{ mt: 3 }}>
                      <Pagination 
                        count={getTotalPages()}
                        page={currentPage}
                        onChange={(_, page) => setCurrentPage(page)}
                        color="primary"
                        size="large"
                        showFirstButton
                        showLastButton
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                        Mostrando {((currentPage - 1) * 20) + 1} - {Math.min(currentPage * 20, productsData.length)} de {productsData.length} productos
                      </Typography>
                    </Stack>
                  )}
                </Box>
              )}

              {viewType === 'table' && (
                <Box>
                  <ProductTable />
                  
                  {/* Paginación para tabla */}
                  {getTotalPages() > 1 && (
                    <Stack alignItems="center" sx={{ mt: 2 }}>
                      <Pagination 
                        count={getTotalPages()}
                        page={currentPage}
                        onChange={(_, page) => setCurrentPage(page)}
                        color="primary"
                        showFirstButton
                        showLastButton
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                        Página {currentPage} de {getTotalPages()} • {productsData.length} productos totales
                      </Typography>
                    </Stack>
                  )}
                </Box>
              )}

              {viewType === 'chart' && (
                <Box sx={{ width: '100%', height: 500 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={productsData.slice(0, 20)} // Solo top 20 para gráfico
                      margin={{ top: 20, right: 30, left: 40, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 10 }} 
                        interval={0} 
                        angle={-45} 
                        textAnchor="end" 
                        height={80}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <RechartsTooltip 
                        formatter={(value, name) => {
                          if (name === 'revenue') return [formatCurrency(value), 'Ingresos'];
                          if (name === 'rotation') return [value.toFixed(2), 'Rotación (uds/día)'];
                          return [value?.toLocaleString(), 'Unidades vendidas'];
                        }}
                        labelFormatter={(label) => `Producto: ${label}`}
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #ccc', 
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Legend />
                      <Bar 
                        name={metricType.includes('rotation') ? 'Rotación (uds/día)' : 'Unidades vendidas'} 
                        dataKey={metricType.includes('rotation') ? 'rotation' : 'sales'} 
                        fill={getCurrentMetric().color}
                        radius={[4, 4, 0, 0]}
                      />
                      {!metricType.includes('rotation') && (
                        <Bar 
                          name="Ingresos" 
                          dataKey="revenue" 
                          fill={CHART_COLORS.secondary}
                          radius={[4, 4, 0, 0]}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}

              {viewType === 'area' && (
                <Box sx={{ width: '100%', height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={productsData.slice(0, 30)} // Top 30 para área
                      margin={{ top: 20, right: 30, left: 40, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={getCurrentMetric().color} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={getCurrentMetric().color} stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 10 }}
                        interval={4}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <RechartsTooltip 
                        formatter={(value, name) => {
                          if (name === 'rotation') return [value.toFixed(2), 'Rotación (uds/día)'];
                          return [value?.toLocaleString(), 'Unidades vendidas'];
                        }}
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #ccc', 
                          borderRadius: '8px' 
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey={metricType.includes('rotation') ? 'rotation' : 'sales'} 
                        stroke={getCurrentMetric().color}
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorSales)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </>
          ) : (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                No hay datos disponibles
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                No se encontraron productos para los filtros seleccionados
              </Typography>
              {selectedSucursal && (
                <Stack direction="row" spacing={2} justifyContent="center">
                  <Button 
                    variant="outlined" 
                    onClick={() => testConnection(selectedSucursal)}
                    startIcon={<BugReport />}
                  >
                    Probar Conexión
                  </Button>
                  <Button 
                    variant="contained" 
                    onClick={() => { loadProductsData(); loadAdditionalData(); }}
                    startIcon={<Refresh />}
                  >
                    Recargar Datos
                  </Button>
                </Stack>
              )}
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Panel de análisis adicional */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">Análisis y Tendencias</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            {/* Distribución por familias */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: 350 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <Category sx={{ mr: 1 }} />
                    Distribución por Familias
                  </Typography>
                  {categoryDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={categoryDistribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}%`}
                        >
                          {categoryDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS.pie[index % CHART_COLORS.pie.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value) => [`${value}%`]} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 250 }}>
                      <Typography color="text.secondary">No hay datos de distribución</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Tendencia de ventas */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: 350 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <ShowChart sx={{ mr: 1 }} />
                    Tendencia de Ventas
                  </Typography>
                  {trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <RechartsTooltip formatter={(value) => [formatCurrency(value), 'Ventas']} />
                        <Line 
                          type="monotone" 
                          dataKey="ventas" 
                          stroke={CHART_COLORS.primary} 
                          strokeWidth={3}
                          dot={{ r: 6 }}
                          activeDot={{ r: 8 }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 250 }}>
                      <Typography color="text.secondary">No hay datos de tendencia</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default SupermercadosPage;