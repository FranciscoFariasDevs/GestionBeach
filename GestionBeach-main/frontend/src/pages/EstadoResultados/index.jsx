// src/pages/EstadoResultados/index.jsx - Visualización de Estado de Resultados
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  useTheme,
  Fade,
  Zoom,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tabs,
  Tab,
  Chip,
  LinearProgress,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  alpha,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import HistoryIcon from '@mui/icons-material/History';
import RefreshIcon from '@mui/icons-material/Refresh';
import GetAppIcon from '@mui/icons-material/GetApp';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import EditIcon from '@mui/icons-material/Edit';
import PercentIcon from '@mui/icons-material/Percent';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CalendarIcon from '@mui/icons-material/CalendarMonth';
import StoreIcon from '@mui/icons-material/Store';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CloseIcon from '@mui/icons-material/Close';
import BusinessIcon from '@mui/icons-material/Business';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { useSnackbar } from 'notistack';
import api from '../../api/api';
import WeatherBar from '../../components/WeatherBar';
import {
  AnalisisFinanciero,
  EstadoResultadosDetallado,
  KPICard,
  IndicatorProgress
} from './ResultadosComponents';
import { formatCurrency, calcularPorcentaje, obtenerRangoDeFechas } from './utils';

// Componente TabPanel para las pestañas
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 0 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Funciones auxiliares para Históricos
const getNombreMes = (mes) => {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return meses[mes - 1] || '';
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Componente para mostrar costos patronales
const CostosPatronalesCard = ({ data }) => {
  const theme = useTheme();
  
  if (!data?.porcentajes_aplicados) return null;
  
  const { porcentajes_aplicados, resumen } = data;
  
  return (
    <Card sx={{ 
      mb: 3,
      borderRadius: 2,
      border: `2px solid ${theme.palette.info.main}`,
      background: `linear-gradient(135deg, ${theme.palette.info.main}08 0%, ${theme.palette.info.main}15 100%)`
    }}>
      <CardHeader
        avatar={<PercentIcon sx={{ color: 'info.main', fontSize: 32 }} />}
        title={
          <Typography variant="h6" fontWeight="bold">
            Costos Patronales Aplicados
          </Typography>
        }
        subheader="Cálculos basados en porcentajes configurados por período"
        sx={{ pb: 1 }}
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Porcentajes y Montos:
            </Typography>
          </Grid>
          
          <Grid item xs={6} md={2.4}>
            <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.default' }}>
              <Typography variant="caption" color="textSecondary">
                Caja Compensación
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="primary">
                {porcentajes_aplicados.caja_compen}%
              </Typography>
              <Typography variant="body2" color="success.main" fontWeight="medium">
                {formatCurrency(resumen.total_caja_compensacion)}
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={6} md={2.4}>
            <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.default' }}>
              <Typography variant="caption" color="textSecondary">
                AFC
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="primary">
                {porcentajes_aplicados.afc}%
              </Typography>
              <Typography variant="body2" color="success.main" fontWeight="medium">
                {formatCurrency(resumen.total_afc)}
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={6} md={2.4}>
            <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.default' }}>
              <Typography variant="caption" color="textSecondary">
                SIS
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="primary">
                {porcentajes_aplicados.sis}%
              </Typography>
              <Typography variant="body2" color="success.main" fontWeight="medium">
                {formatCurrency(resumen.total_sis)}
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={6} md={2.4}>
            <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.default' }}>
              <Typography variant="caption" color="textSecondary">
                ACH
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="primary">
                {porcentajes_aplicados.ach}%
              </Typography>
              <Typography variant="body2" color="success.main" fontWeight="medium">
                {formatCurrency(resumen.total_ach)}
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={6} md={2.4}>
            <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.default' }}>
              <Typography variant="caption" color="textSecondary">
                Imposiciones
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="primary">
                {porcentajes_aplicados.imposiciones}%
              </Typography>
              <Typography variant="body2" color="success.main" fontWeight="medium">
                {formatCurrency(resumen.total_imposiciones_patronales)}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="textSecondary">
                Total Pago (Líquido + Desc.):
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {formatCurrency(resumen.total_pago)}
              </Typography>
            </Stack>
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="textSecondary">
                Total Costos Patronales:
              </Typography>
              <Typography variant="body2" fontWeight="bold" color="warning.main">
                {formatCurrency(
                  resumen.total_caja_compensacion + 
                  resumen.total_afc + 
                  resumen.total_sis + 
                  resumen.total_ach + 
                  resumen.total_imposiciones_patronales
                )}
              </Typography>
            </Stack>
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="textSecondary" fontWeight="bold">
                TOTAL CARGO (a Sueldos):
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="success.main">
                {formatCurrency(resumen.total_cargo)}
              </Typography>
            </Stack>
          </Grid>
        </Grid>

        {resumen.administrativos && resumen.ventas && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Distribución por Tipo de Empleado:
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: theme.palette.primary.main + '08', borderLeft: `3px solid ${theme.palette.primary.main}` }}>
                  <Typography variant="caption" color="textSecondary">
                    ADMINISTRATIVOS — {resumen.administrativos.cantidad_empleados_unicos} empleados
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="primary">
                    {formatCurrency(resumen.administrativos.total_cargo)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Empleados con múltiples sucursales — sueldo dividido proporcionalmente
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: theme.palette.success.main + '08', borderLeft: `3px solid ${theme.palette.success.main}` }}>
                  <Typography variant="caption" color="textSecondary">
                    VENTAS — {resumen.ventas.cantidad_empleados_unicos} empleados
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="success.main">
                    {formatCurrency(resumen.ventas.total_cargo)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Empleados con una sola sucursal — sueldo 100% asignado
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </>
        )}

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="caption">
            <strong>TOTAL CARGO</strong> es la suma del Total Pago más todos los costos patronales. 
            Se clasifica automáticamente: empleados con múltiples sucursales = ADMINISTRATIVO (dividido entre sucursales), 
            empleados con una sucursal = VENTAS (100% asignado).
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
};

// Componente de Históricos
const HistoricosTab = ({ sucursalesDisponibles }) => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  // Estados
  const [loading, setLoading] = useState(false);
  const [historicos, setHistoricos] = useState([]);
  const [selectedHistorico, setSelectedHistorico] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [razonesSocialesDisponibles, setRazonesSocialesDisponibles] = useState([]);

  // Filtros — persisten en sessionStorage para sobrevivir navegación
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const FILTER_KEY = 'er_historicos_filtros';
  const savedFilters = (() => {
    try { return JSON.parse(sessionStorage.getItem(FILTER_KEY)) || {}; } catch { return {}; }
  })();

  const [anioFiltro, setAnioFiltro] = useState(savedFilters.anio ?? currentYear);
  const [mesFiltro, setMesFiltro] = useState(savedFilters.mes ?? currentMonth);
  const [sucursalFiltro, setSucursalFiltro] = useState(savedFilters.sucursal ?? '');
  const [razonSocialFiltro, setRazonSocialFiltro] = useState(savedFilters.razonSocial ?? '');
  const [estadoFiltro, setEstadoFiltro] = useState(savedFilters.estado ?? '');

  useEffect(() => {
    try {
      sessionStorage.setItem(FILTER_KEY, JSON.stringify({
        anio: anioFiltro, mes: mesFiltro,
        sucursal: sucursalFiltro, razonSocial: razonSocialFiltro, estado: estadoFiltro,
      }));
    } catch {}
  }, [anioFiltro, mesFiltro, sucursalFiltro, razonSocialFiltro, estadoFiltro]);

  // Generar lista de años (últimos 5 años)
  const anios = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Cargar razones sociales
  useEffect(() => {
    const cargarRazonesSociales = async () => {
      try {
        const response = await api.get('/estado-resultados/razones-sociales');
        if (response.data && response.data.success) {
          setRazonesSocialesDisponibles(response.data.data || []);
        }
      } catch (error) {
        console.error('Error al cargar razones sociales:', error);
      }
    };
    cargarRazonesSociales();
  }, []);

  const cargarHistoricos = async () => {
    try {
      setLoading(true);
      const params = {
        anio: anioFiltro,
        mes: mesFiltro,
      };

      if (sucursalFiltro) {
        params.sucursal_id = sucursalFiltro;
      }

      if (razonSocialFiltro) {
        params.razon_social_id = razonSocialFiltro;
      }

      if (estadoFiltro) {
        params.estado = estadoFiltro;
      }

      const response = await api.get('/estado-resultados', { params });

      if (response.data.success) {
        setHistoricos(response.data.data || []);
      } else {
        const sucNombre = sucursalFiltro
          ? sucursalesDisponibles.find(s => s.id?.toString() === sucursalFiltro)?.nombre || `sucursal #${sucursalFiltro}`
          : 'todas las sucursales';
        enqueueSnackbar(`No se pudieron cargar los históricos de ${sucNombre}. Intente nuevamente.`, { variant: 'error' });
      }
    } catch (error) {
      console.error('Error al cargar históricos:', error);
      const sucNombre = sucursalFiltro
        ? sucursalesDisponibles.find(s => s.id?.toString() === sucursalFiltro)?.nombre || `sucursal #${sucursalFiltro}`
        : 'todas las sucursales';
      enqueueSnackbar(`Error de conexión al consultar ${sucNombre} — ${error.message || 'verifique la red'}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalle = (historico) => {
    setSelectedHistorico(historico);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedHistorico(null);
  };

  const handleExportarPDF = async () => {
    try {
      // Importar jsPDF y html2canvas dinámicamente
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;

      // Obtener el elemento a exportar
      const elemento = document.getElementById('estado-resultados-print');
      if (!elemento) {
        enqueueSnackbar('Error al obtener el contenido para exportar', { variant: 'error' });
        return;
      }

      // Mostrar loading
      enqueueSnackbar('Generando PDF...', { variant: 'info' });

      // Convertir el elemento a canvas con mejor calidad
      const canvas = await html2canvas(elemento, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: elemento.scrollWidth,
        windowHeight: elemento.scrollHeight
      });

      // Crear PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Calcular dimensiones manteniendo aspecto
      const ratio = pdfWidth / imgWidth;
      const scaledHeight = imgHeight * ratio;

      // Agregar imagen en múltiples páginas si es necesario
      let heightLeft = scaledHeight;
      let position = 0;

      // Primera página
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight);
      heightLeft -= pdfHeight;

      // Páginas adicionales
      while (heightLeft > 0) {
        position = -(scaledHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight);
        heightLeft -= pdfHeight;
      }

      // Generar nombre de archivo
      const nombreArchivo = `Estado_Resultados_${selectedHistorico.sucursal_nombre}_${getNombreMes(selectedHistorico.mes)}_${selectedHistorico.anio}.pdf`;

      // Guardar PDF
      pdf.save(nombreArchivo);
      enqueueSnackbar('PDF exportado exitosamente', { variant: 'success' });
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      enqueueSnackbar('Error al exportar a PDF', { variant: 'error' });
    }
  };

  const limpiarFiltros = () => {
    setAnioFiltro(currentYear);
    setMesFiltro(currentMonth);
    setSucursalFiltro('');
    setRazonSocialFiltro('');
    setEstadoFiltro('');
  };

  return (
    <Box>
      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mb: 2 }}>
            Filtros
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Año</InputLabel>
                <Select
                  value={anioFiltro}
                  onChange={(e) => setAnioFiltro(e.target.value)}
                  label="Año"
                >
                  {anios.map((anio) => (
                    <MenuItem key={anio} value={anio}>
                      {anio}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Mes</InputLabel>
                <Select
                  value={mesFiltro}
                  onChange={(e) => setMesFiltro(e.target.value)}
                  label="Mes"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                    <MenuItem key={mes} value={mes}>
                      {getNombreMes(mes)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Sucursal (Opcional)</InputLabel>
                <Select
                  value={sucursalFiltro}
                  onChange={(e) => setSucursalFiltro(e.target.value)}
                  label="Sucursal (Opcional)"
                >
                  <MenuItem value="">Todas</MenuItem>
                  {sucursalesDisponibles.map((sucursal) => (
                    <MenuItem key={sucursal.id} value={sucursal.id.toString()}>
                      {sucursal.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Razón Social (Opcional)</InputLabel>
                <Select
                  value={razonSocialFiltro}
                  onChange={(e) => setRazonSocialFiltro(e.target.value)}
                  label="Razón Social (Opcional)"
                >
                  <MenuItem value="">Todas</MenuItem>
                  {razonesSocialesDisponibles.map((razon) => (
                    <MenuItem key={razon.id} value={razon.id.toString()}>
                      {razon.nombre_razon}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={1.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Estado</InputLabel>
                <Select
                  value={estadoFiltro}
                  onChange={(e) => setEstadoFiltro(e.target.value)}
                  label="Estado"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="borrador">Borrador</MenuItem>
                  <MenuItem value="enviado">Enviado</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={1.5}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<RefreshIcon />}
                onClick={limpiarFiltros}
                size="small"
              >
                Limpiar
              </Button>
            </Grid>

            <Grid item xs={12} sm={6} md={1}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<RefreshIcon />}
                onClick={cargarHistoricos}
                size="small"
              >
                Buscar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Resumen */}
      {!loading && historicos.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <StoreIcon color="primary" />
                  <Box>
                    <Typography variant="h4" fontWeight={700}>
                      {historicos.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Estados de Resultados
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CheckCircleIcon color="success" />
                  <Box>
                    <Typography variant="h4" fontWeight={700}>
                      {historicos.filter(h => h.estado === 'enviado').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Enviados
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <EditIcon color="warning" />
                  <Box>
                    <Typography variant="h4" fontWeight={700}>
                      {historicos.filter(h => h.estado === 'borrador').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Borradores
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <AttachMoneyIcon color="success" />
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      {formatCurrency(historicos.reduce((sum, h) => sum + (h.ventas || 0), 0))}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Ventas
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabla de históricos */}
      <Card>
        <CardContent>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
              <CircularProgress />
            </Box>
          ) : historicos.length === 0 ? (
            <Alert severity="info">
              No se encontraron estados de resultados guardados para los filtros seleccionados.
            </Alert>
          ) : (
            <TableContainer
              component={Paper}
              sx={{
                maxHeight: 520,
                overflowY: 'auto',
                overflowX: 'auto',
                borderRadius: 2,
                boxShadow: 'none',
                border: `1px solid ${theme.palette.divider}`,
                /* scroll visible en tablets/mobile */
                '&::-webkit-scrollbar': { height: 6, width: 6 },
                '&::-webkit-scrollbar-track': { bgcolor: 'grey.100' },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.400', borderRadius: 3 },
              }}
            >
              <Table stickyHeader size="small" sx={{ minWidth: 900 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Período</TableCell>
                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Sucursal</TableCell>
                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Razón Social</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Ventas</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Costos</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Utilidad Neta</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Estado</TableCell>
                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Creado Por</TableCell>
                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Fecha Creación</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historicos.map((historico) => (
                    <TableRow
                      key={historico.id}
                      hover
                      sx={{
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        },
                      }}
                    >
                      <TableCell>
                        <Chip
                          icon={<CalendarIcon />}
                          label={`${getNombreMes(historico.mes)} ${historico.anio}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{historico.sucursal_nombre || '-'}</TableCell>
                      <TableCell>{historico.razon_social_nombre || '-'}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={600} color="success.main">
                          {formatCurrency(historico.ventas)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={600} color="error.main">
                          {formatCurrency(historico.total_costos)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          fontWeight={700}
                          color={historico.utilidad_neta >= 0 ? 'success.main' : 'error.main'}
                        >
                          {formatCurrency(historico.utilidad_neta)}
                          {historico.utilidad_neta >= 0 ? (
                            <TrendingUpIcon fontSize="small" sx={{ ml: 0.5, verticalAlign: 'middle' }} />
                          ) : (
                            <TrendingDownIcon fontSize="small" sx={{ ml: 0.5, verticalAlign: 'middle' }} />
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={historico.estado === 'enviado' ? 'Enviado' : 'Borrador'}
                          color={historico.estado === 'enviado' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{historico.creado_por || '-'}</TableCell>
                      <TableCell>{formatDate(historico.fecha_creacion)}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="Ver Detalle">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleVerDetalle(historico)}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Dialog de detalle */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            bgcolor: 'background.paper',
          }
        }}
      >
        <DialogTitle sx={{
          bgcolor: theme.palette.primary.dark,
          color: 'white',
          py: 2.5,
          px: 3,
        }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={2}>
              <BusinessIcon sx={{ fontSize: 32, opacity: 0.85 }} />
              <Box>
                <Typography variant="overline" sx={{ opacity: 0.75, letterSpacing: 2, fontSize: '0.7rem' }}>
                  Informe Financiero
                </Typography>
                <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                  Estado de Resultados
                </Typography>
                {selectedHistorico && (
                  <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.25 }}>
                    {selectedHistorico.sucursal_nombre} &mdash; {getNombreMes(selectedHistorico.mes)} {selectedHistorico.anio}
                  </Typography>
                )}
              </Box>
            </Box>
            <Box display="flex" gap={1} alignItems="center">
              {selectedHistorico && (
                <Chip
                  label={selectedHistorico.estado === 'enviado' ? 'Enviado' : 'Borrador'}
                  color={selectedHistorico.estado === 'enviado' ? 'success' : 'warning'}
                  size="small"
                  sx={{ fontWeight: 700, fontSize: '0.8rem' }}
                  icon={selectedHistorico.estado === 'enviado' ? <CheckCircleIcon /> : <EditIcon />}
                />
              )}
              <IconButton
                onClick={handleCloseDialog}
                size="small"
                sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: '#f5f6f8' }} id="estado-resultados-print">
          {selectedHistorico && (
            <Box sx={{ p: 3 }}>

              {/* Encabezado del informe (visible en PDF) */}
              <Box sx={{
                mb: 3,
                pb: 2.5,
                borderBottom: '2px solid',
                borderColor: 'grey.300',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
              }}>
                <Box>
                  <Typography variant="overline" sx={{ color: 'text.disabled', letterSpacing: 2, fontSize: '0.65rem' }}>
                    Informe Financiero
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.2, mt: 0.25 }}>
                    Estado de Resultados
                  </Typography>
                  <Typography variant="body1" fontWeight={600} color="text.secondary" sx={{ mt: 0.5 }}>
                    {selectedHistorico.sucursal_nombre}
                    {selectedHistorico.razon_social_nombre && ` — ${selectedHistorico.razon_social_nombre}`}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    {getNombreMes(selectedHistorico.mes)} {selectedHistorico.anio}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    Generado: {formatDate(new Date().toISOString())}
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={selectedHistorico.estado === 'enviado' ? 'Enviado' : 'Borrador'}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        borderColor: selectedHistorico.estado === 'enviado' ? 'success.main' : 'warning.main',
                        color: selectedHistorico.estado === 'enviado' ? 'success.dark' : 'warning.dark',
                      }}
                    />
                  </Box>
                </Box>
              </Box>

              {/* Resumen ejecutivo — 4 cifras clave */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                  { label: 'Total Ingresos', value: selectedHistorico.total_ingresos },
                  { label: 'Total Costos', value: selectedHistorico.total_costos },
                  { label: 'Gastos Operativos', value: selectedHistorico.total_gastos_operativos },
                  { label: 'Utilidad Neta', value: selectedHistorico.utilidad_neta, highlight: true },
                ].map((item) => (
                  <Grid item xs={12} sm={6} md={3} key={item.label}>
                    <Paper elevation={0} sx={{
                      p: 2,
                      border: '1px solid',
                      borderColor: item.highlight
                        ? (item.value >= 0 ? 'success.main' : 'error.main')
                        : 'grey.300',
                      borderRadius: 1.5,
                      bgcolor: item.highlight
                        ? (item.value >= 0 ? alpha('#2e7d32', 0.05) : alpha('#c62828', 0.05))
                        : '#fff',
                    }}>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600, display: 'block', mb: 0.5 }}>
                        {item.label}
                      </Typography>
                      <Typography variant="h6" fontWeight={700} sx={{
                        color: item.highlight
                          ? (item.value >= 0 ? 'success.dark' : 'error.dark')
                          : 'text.primary',
                      }}>
                        {formatCurrency(item.value)}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              {/* Tabla única de Estado de Resultados */}
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'grey.300', borderRadius: 1.5, overflow: 'hidden' }}>
                <Table size="small">

                  {/* INGRESOS */}
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#263238' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 700, fontSize: '0.75rem', letterSpacing: 1, textTransform: 'uppercase', py: 1.25 }}>
                        Ingresos
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'white', fontWeight: 700, width: 180 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Ventas</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(selectedHistorico.ventas)}</TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ pl: 3 }}>Otros Ingresos (Fletes)</TableCell>
                      <TableCell align="right">{formatCurrency(selectedHistorico.otros_ingresos_fletes || 0)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Otros Ingresos Financieros</TableCell>
                      <TableCell align="right">{formatCurrency(selectedHistorico.otros_ingresos_financieros || 0)}</TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: '#eceff1' }}>
                      <TableCell sx={{ fontWeight: 700, pl: 3 }}>Total Ingresos</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(selectedHistorico.total_ingresos)}</TableCell>
                    </TableRow>

                    {/* COSTOS */}
                    <TableRow sx={{ bgcolor: '#263238' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 700, fontSize: '0.75rem', letterSpacing: 1, textTransform: 'uppercase', py: 1.25 }}>
                        Costos
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'white' }} />
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Costo de Ventas</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(selectedHistorico.costo_ventas || 0)}</TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ pl: 3 }}>Compras Totales</TableCell>
                      <TableCell align="right">{formatCurrency(selectedHistorico.compras_totales || 0)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Merma de Venta</TableCell>
                      <TableCell align="right">{formatCurrency(selectedHistorico.merma_venta || 0)}</TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: '#eceff1' }}>
                      <TableCell sx={{ fontWeight: 700, pl: 3 }}>Total Costos</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(selectedHistorico.total_costos)}</TableCell>
                    </TableRow>

                    {/* GASTOS ADMINISTRATIVOS */}
                    <TableRow sx={{ bgcolor: '#263238' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 700, fontSize: '0.75rem', letterSpacing: 1, textTransform: 'uppercase', py: 1.25 }}>
                        Gastos Administrativos
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'white' }} />
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Sueldos Administrativos</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(selectedHistorico.gastos_admin_sueldos || 0)}</TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ pl: 3 }}>Seguros</TableCell>
                      <TableCell align="right">{formatCurrency(selectedHistorico.gastos_admin_seguros || 0)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Gastos Comunes</TableCell>
                      <TableCell align="right">{formatCurrency(selectedHistorico.gastos_admin_gastos_comunes || 0)}</TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ pl: 3 }}>Electricidad</TableCell>
                      <TableCell align="right">{formatCurrency(selectedHistorico.gastos_admin_electricidad || 0)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Agua</TableCell>
                      <TableCell align="right">{formatCurrency(selectedHistorico.gastos_admin_agua || 0)}</TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ pl: 3 }}>Telefonía</TableCell>
                      <TableCell align="right">{formatCurrency(selectedHistorico.gastos_admin_telefonia || 0)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Otros Administrativos</TableCell>
                      <TableCell align="right">{formatCurrency(selectedHistorico.gastos_admin_otros || 0)}</TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: '#eceff1' }}>
                      <TableCell sx={{ fontWeight: 700, pl: 3 }}>Total Gastos Administrativos</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(selectedHistorico.gastos_admin_total || 0)}</TableCell>
                    </TableRow>

                    {/* GASTOS DE VENTA */}
                    <TableRow sx={{ bgcolor: '#263238' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 700, fontSize: '0.75rem', letterSpacing: 1, textTransform: 'uppercase', py: 1.25 }}>
                        Gastos de Venta
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'white' }} />
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Sueldos de Venta</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(selectedHistorico.gastos_venta_sueldos || 0)}</TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ pl: 3 }}>Fletes</TableCell>
                      <TableCell align="right">{formatCurrency(selectedHistorico.gastos_venta_fletes || 0)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Publicidad</TableCell>
                      <TableCell align="right">{formatCurrency(selectedHistorico.gastos_venta_publicidad || 0)}</TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: '#eceff1' }}>
                      <TableCell sx={{ fontWeight: 700, pl: 3 }}>Total Gastos de Venta</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(selectedHistorico.gastos_venta_total || 0)}</TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: '#455a64' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 700, pl: 3 }}>Total Gastos Operativos</TableCell>
                      <TableCell align="right" sx={{ color: 'white', fontWeight: 700 }}>{formatCurrency(selectedHistorico.total_gastos_operativos)}</TableCell>
                    </TableRow>

                    {/* UTILIDADES */}
                    <TableRow sx={{ bgcolor: '#263238' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 700, fontSize: '0.75rem', letterSpacing: 1, textTransform: 'uppercase', py: 1.25 }}>
                        Utilidades
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'white' }} />
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Utilidad Bruta</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: selectedHistorico.utilidad_bruta >= 0 ? 'success.dark' : 'error.dark' }}>
                        {formatCurrency(selectedHistorico.utilidad_bruta)}
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ pl: 3 }}>Utilidad Operativa</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: selectedHistorico.utilidad_operativa >= 0 ? 'success.dark' : 'error.dark' }}>
                        {formatCurrency(selectedHistorico.utilidad_operativa)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ pl: 3 }}>Utilidad Antes de Impuestos</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: (selectedHistorico.utilidad_antes_impuestos || 0) >= 0 ? 'success.dark' : 'error.dark' }}>
                        {formatCurrency(selectedHistorico.utilidad_antes_impuestos || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{
                      bgcolor: selectedHistorico.utilidad_neta >= 0 ? '#1b5e20' : '#b71c1c',
                      '& td': { borderBottom: 'none' }
                    }}>
                      <TableCell sx={{ color: 'white', fontWeight: 700, fontSize: '0.95rem', pl: 3, py: 1.75 }}>
                        Utilidad Neta
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'white', fontWeight: 800, fontSize: '1.1rem', py: 1.75 }}>
                        {formatCurrency(selectedHistorico.utilidad_neta)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Información Adicional */}
              <TableContainer component={Paper} elevation={0} sx={{ mt: 3, border: '1px solid', borderColor: 'grey.300', borderRadius: 1.5, overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#455a64' }}>
                      <TableCell colSpan={4} sx={{ color: 'white', fontWeight: 700, fontSize: '0.75rem', letterSpacing: 1, textTransform: 'uppercase', py: 1.25 }}>
                        Información Adicional
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary', width: '25%', fontSize: '0.8rem' }}>Número de Facturas</TableCell>
                      <TableCell>{selectedHistorico.numero_facturas || 0}</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary', width: '25%', fontSize: '0.8rem' }}>Número de Ventas</TableCell>
                      <TableCell>{selectedHistorico.numero_ventas || 0}</TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.8rem' }}>Empleados Administrativos</TableCell>
                      <TableCell>{selectedHistorico.empleados_admin || 0}</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.8rem' }}>Empleados de Venta</TableCell>
                      <TableCell>{selectedHistorico.empleados_ventas || 0}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.8rem' }}>Total Compras</TableCell>
                      <TableCell>{formatCurrency(selectedHistorico.total_compras_valor || 0)}</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.8rem' }}>Total Remuneraciones</TableCell>
                      <TableCell>{formatCurrency(selectedHistorico.total_remuneraciones_valor || 0)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {(selectedHistorico.observaciones || selectedHistorico.notas) && (
                <Box sx={{ mt: 3, p: 2.5, border: '1px solid', borderColor: 'grey.300', borderRadius: 1.5, bgcolor: '#fff' }}>
                  {selectedHistorico.observaciones && (
                    <Box sx={{ mb: selectedHistorico.notas ? 2 : 0 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', mb: 0.5 }}>
                        Observaciones
                      </Typography>
                      <Typography variant="body2" color="text.primary">{selectedHistorico.observaciones}</Typography>
                    </Box>
                  )}
                  {selectedHistorico.notas && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', mb: 0.5 }}>
                        Notas
                      </Typography>
                      <Typography variant="body2" color="text.primary">{selectedHistorico.notas}</Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: '#fff', gap: 1 }}>
          <Button
            onClick={handleExportarPDF}
            variant="contained"
            startIcon={<PictureAsPdfIcon />}
            color="error"
            sx={{ fontWeight: 600 }}
          >
            Exportar PDF
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            onClick={handleCloseDialog}
            variant="outlined"
            startIcon={<CloseIcon />}
            color="inherit"
            sx={{ fontWeight: 600 }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Componente principal: Visualización completa — sistema + gastos manuales
const EstadoResultadosPage = () => {
  const [viewTab, setViewTab] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedSucursal, setSelectedSucursal] = useState('');
  const [selectedRazonSocial, setSelectedRazonSocial] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [sucursalesDisponibles, setSucursalesDisponibles] = useState([]);
  const [razonesSocialesDisponibles, setRazonesSocialesDisponibles] = useState([]);
  const [datosRemuneraciones, setDatosRemuneraciones] = useState(null);
  const [savedRecord, setSavedRecord] = useState(null);

  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => { cargarDatosIniciales(); }, []);

  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);
      let ok = false;
      try {
        const res = await api.get('/facturas-xml/lista/sucursales');
        if (res.data.success && Array.isArray(res.data.data)) {
          setSucursalesDisponibles(res.data.data);
          if (res.data.data.length > 0) setSelectedSucursal(res.data.data[0].id.toString());
          ok = true;
        }
      } catch {}
      if (!ok) {
        try {
          const res = await api.get('/sucursales');
          if (Array.isArray(res.data)) {
            setSucursalesDisponibles(res.data);
            if (res.data.length > 0) setSelectedSucursal(res.data[0].id.toString());
          }
        } catch {}
      }
      try {
        const res = await api.get('/razonessociales');
        const list = Array.isArray(res.data) ? res.data : (res.data.success ? res.data.data : []);
        setRazonesSocialesDisponibles([{ id: 'todos', nombre_razon: 'Todas las Razones Sociales' }, ...list]);
        setSelectedRazonSocial('todos');
      } catch {
        setRazonesSocialesDisponibles([{ id: 'todos', nombre_razon: 'Todas las Razones Sociales' }]);
        setSelectedRazonSocial('todos');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadComprasData = async () => {
    try {
      const { fechaDesde, fechaHasta } = obtenerRangoDeFechas(selectedMonth);
      const res = await api.get('/estado-resultados/compras', {
        params: { fecha_desde: fechaDesde, fecha_hasta: fechaHasta, sucursal_id: selectedSucursal, razon_social_id: selectedRazonSocial === 'todos' ? 'todos' : selectedRazonSocial }
      });
      if (res.data.success) {
        const { resumen } = res.data.data;
        return { data: res.data.data.compras, total: resumen.total_compras, cantidad: resumen.cantidad_facturas };
      }
      return { data: [], total: 0, cantidad: 0 };
    } catch {
      return { data: [], total: 0, cantidad: 0 };
    }
  };

  const loadRemuneracionesData = async () => {
    try {
      const mes = selectedMonth.getMonth() + 1;
      const anio = selectedMonth.getFullYear();
      const res = await api.get('/estado-resultados/remuneraciones', {
        params: { anio, mes, sucursal_id: selectedSucursal, razon_social_id: selectedRazonSocial === 'todos' ? 'todos' : selectedRazonSocial }
      });
      if (res.data.success) {
        const { resumen, porcentajes_aplicados } = res.data.data;
        const totalCargoAdmin = resumen.administrativos?.total_cargo || 0;
        const totalCargoVentas = resumen.ventas?.total_cargo || 0;
        const totalCargo = resumen.total_cargo || (totalCargoAdmin + totalCargoVentas);
        setDatosRemuneraciones({ resumen, porcentajes_aplicados });
        return { data: res.data.data.remuneraciones, total: totalCargo, total_cargo: totalCargo, cantidad: resumen.cantidad_empleados || 0, resumen, porcentajes_aplicados };
      }
      return { data: [], total: 0, total_cargo: 0, cantidad: 0, resumen: null, porcentajes_aplicados: null };
    } catch {
      return { data: [], total: 0, total_cargo: 0, cantidad: 0, resumen: null, porcentajes_aplicados: null };
    }
  };

  const loadVentasData = async () => {
    try {
      const { fechaDesde, fechaHasta } = obtenerRangoDeFechas(selectedMonth);
      const res = await api.post('/ventas', {
        sucursal_id: parseInt(selectedSucursal),
        razon_social_id: selectedRazonSocial && selectedRazonSocial !== 'todos' ? parseInt(selectedRazonSocial) : null,
        start_date: fechaDesde, end_date: fechaHasta
      });
      const ventas = res?.data?.ventas || [];
      const total = ventas.reduce((sum, v) => sum + Number(v.Total || v.total || v.monto_total || 0), 0);
      return { data: ventas, total };
    } catch {
      return { data: [], total: 0 };
    }
  };

  const loadCostosVenta = async () => {
    try {
      const { fechaDesde, fechaHasta } = obtenerRangoDeFechas(selectedMonth);
      const res = await api.get(`/dashboard?startDate=${fechaDesde}&endDate=${fechaHasta}`);
      if (res?.data) {
        const sucursalNombre = sucursalesDisponibles.find(s => s.id.toString() === selectedSucursal)?.nombre || '';
        let costos = 0;
        ['supermercados', 'ferreterias', 'multitiendas'].forEach(cat => {
          const suc = res.data[cat]?.sucursales?.find(s =>
            s.nombre?.toLowerCase().includes(sucursalNombre.toLowerCase()) ||
            sucursalNombre.toLowerCase().includes(s.nombre?.toLowerCase())
          );
          if (suc) costos = suc.costos || 0;
        });
        return { costos };
      }
      return { costos: 0 };
    } catch {
      return { costos: 0 };
    }
  };

  const construirEstadoResultados = ({ compras, remuneraciones, ventas, costos }) => {
    const sucursalSel = sucursalesDisponibles.find(s => s.id.toString() === selectedSucursal);
    const sueldosAdmin = remuneraciones.resumen?.administrativos?.total_cargo || 0;
    const sueldosVentas = remuneraciones.resumen?.ventas?.total_cargo || 0;
    const estado = {
      sucursal: sucursalSel?.nombre || 'Desconocida',
      periodo: selectedMonth.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }),
      ingresos: { ventas: ventas.total || 0, otrosIngresos: { fletes: 0, total: 0 }, totalIngresos: ventas.total || 0 },
      costos: { costoVentas: costos?.costos || 0, compras: compras.total || 0, mermaVenta: 0, totalCostos: costos?.costos || 0 },
      utilidadBruta: (ventas.total || 0) - (costos?.costos || 0),
      gastosOperativos: {
        gastosVenta: { sueldos: sueldosVentas, fletes: 0, finiquitos: 0, mantenciones: 0, publicidad: 0, total: sueldosVentas },
        gastosAdministrativos: {
          sueldos: sueldosAdmin, seguros: 0, gastosComunes: 0, electricidad: 0, agua: 0,
          telefonia: 0, alarma: 0, internet: 0, facturasNet: 0, transbank: 0,
          patenteMunicipal: 0, contribuciones: 0, petroleo: 0, otros: 0, total: sueldosAdmin
        },
        totalGastosOperativos: sueldosVentas + sueldosAdmin
      },
      utilidadOperativa: 0, costoArriendo: 0, otrosIngresosFinancieros: 0,
      utilidadAntesImpuestos: 0, impuestos: 0, utilidadNeta: 0,
      estado: 'sistema',
      datosOriginales: {
        totalCompras: compras.total || 0, totalRemuneraciones: sueldosAdmin + sueldosVentas,
        totalVentas: ventas.total || 0, numeroFacturas: compras.cantidad || 0,
        numeroVentas: ventas.data?.length || 0, numeroEmpleados: remuneraciones.cantidad || 0,
        clasificacion: {
          empleados_admin: remuneraciones.resumen?.administrativos?.cantidad_empleados_unicos || 0,
          empleados_ventas: remuneraciones.resumen?.ventas?.cantidad_empleados_unicos || 0,
          cargo_admin: sueldosAdmin, cargo_ventas: sueldosVentas
        }
      }
    };
    estado.utilidadOperativa = estado.utilidadBruta - estado.gastosOperativos.totalGastosOperativos;
    estado.utilidadAntesImpuestos = estado.utilidadOperativa;
    estado.impuestos = Math.max(0, Math.round(estado.utilidadAntesImpuestos * 0.19));
    estado.utilidadNeta = estado.utilidadAntesImpuestos - estado.impuestos;
    return estado;
  };

  const mergeManualGastos = (estadoBase, rec) => {
    const m = JSON.parse(JSON.stringify(estadoBase));
    const ga = m.gastosOperativos.gastosAdministrativos;
    const gv = m.gastosOperativos.gastosVenta;
    ga.seguros       = Number(rec.gastos_admin_seguros) || 0;
    ga.gastosComunes = Number(rec.gastos_admin_gastos_comunes) || 0;
    ga.electricidad  = Number(rec.gastos_admin_electricidad) || 0;
    ga.agua          = Number(rec.gastos_admin_agua) || 0;
    ga.telefonia     = Number(rec.gastos_admin_telefonia) || 0;
    ga.alarma        = Number(rec.gastos_admin_alarma) || 0;
    ga.internet      = Number(rec.gastos_admin_internet) || 0;
    ga.facturasNet   = Number(rec.gastos_admin_facturas_net) || 0;
    ga.transbank     = Number(rec.gastos_admin_transbank) || 0;
    ga.patenteMunicipal  = Number(rec.gastos_admin_patente_municipal) || 0;
    ga.contribuciones    = Number(rec.gastos_admin_contribuciones) || 0;
    ga.petroleo      = Number(rec.gastos_admin_petroleo) || 0;
    ga.otros         = Number(rec.gastos_admin_otros) || 0;
    gv.fletes        = Number(rec.gastos_venta_fletes) || 0;
    gv.finiquitos    = Number(rec.gastos_venta_finiquitos) || 0;
    gv.mantenciones  = Number(rec.gastos_venta_mantenciones) || 0;
    gv.publicidad    = Number(rec.gastos_venta_publicidad) || 0;
    m.costos.mermaVenta         = Number(rec.merma_venta) || 0;
    m.costoArriendo             = Number(rec.costo_arriendo) || 0;
    m.ingresos.otrosIngresos.fletes = Number(rec.otros_ingresos_fletes) || 0;
    m.otrosIngresosFinancieros  = Number(rec.otros_ingresos_financieros) || 0;
    // Recalculate totals
    const adminFields = ['seguros','gastosComunes','electricidad','agua','telefonia','alarma','internet','facturasNet','transbank','patenteMunicipal','contribuciones','petroleo','otros'];
    ga.total = adminFields.reduce((s, k) => s + (ga[k] || 0), 0) + ga.sueldos;
    const ventaFields = ['fletes','finiquitos','mantenciones','publicidad'];
    gv.total = ventaFields.reduce((s, k) => s + (gv[k] || 0), 0) + gv.sueldos;
    m.gastosOperativos.totalGastosOperativos = ga.total + gv.total;
    m.costos.totalCostos = m.costos.costoVentas + m.costos.mermaVenta;
    m.ingresos.otrosIngresos.total = m.ingresos.otrosIngresos.fletes;
    m.ingresos.totalIngresos = m.ingresos.ventas + m.ingresos.otrosIngresos.total;
    m.utilidadBruta = m.ingresos.totalIngresos - m.costos.totalCostos;
    m.utilidadOperativa = m.utilidadBruta - m.gastosOperativos.totalGastosOperativos;
    m.utilidadAntesImpuestos = m.utilidadOperativa - m.costoArriendo + m.otrosIngresosFinancieros;
    m.impuestos = Math.max(0, Math.round(m.utilidadAntesImpuestos * 0.19));
    m.utilidadNeta = m.utilidadAntesImpuestos - m.impuestos;
    m.estado = rec.estado;
    m.id = rec.id;
    return m;
  };

  const cargarVistaCompleta = async () => {
    if (!selectedSucursal) return;
    setLoading(true);
    setError(null);
    setData(null);
    setSavedRecord(null);
    try {
      const [comprasRes, remuneracionesRes, ventasRes, costosRes] = await Promise.allSettled([
        loadComprasData(), loadRemuneracionesData(), loadVentasData(), loadCostosVenta()
      ]);
      const comprasResult      = comprasRes.status      === 'fulfilled' ? comprasRes.value      : { data: [], total: 0, cantidad: 0 };
      const remuneracionesResult = remuneracionesRes.status === 'fulfilled' ? remuneracionesRes.value : { data: [], total: 0, total_cargo: 0, cantidad: 0, resumen: null, porcentajes_aplicados: null };
      const ventasResult       = ventasRes.status       === 'fulfilled' ? ventasRes.value       : { data: [], total: 0 };
      const costosResult       = costosRes.status       === 'fulfilled' ? costosRes.value       : { costos: 0 };
      let estado = construirEstadoResultados({ compras: comprasResult, remuneraciones: remuneracionesResult, ventas: ventasResult, costos: costosResult });
      // Look for saved manual gastos for this period
      try {
        const mes = selectedMonth.getMonth() + 1;
        const anio = selectedMonth.getFullYear();
        const savedRes = await api.get('/estado-resultados', { params: { anio, mes, sucursal_id: selectedSucursal } });
        if (savedRes.data.success && savedRes.data.data.length > 0) {
          const rec = savedRes.data.data[0];
          setSavedRecord(rec);
          estado = mergeManualGastos(estado, rec);
        }
      } catch {}
      setData(estado);
      const nombre = sucursalesDisponibles.find(s => s.id.toString() === selectedSucursal)?.nombre || '';
      enqueueSnackbar(`${nombre}: datos cargados`, { variant: 'success' });
    } catch (err) {
      setError(`Error al cargar datos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // KPIs display (read-only)
  const KPIsDisplay = ({ data }) => {
    const margenBruto = calcularPorcentaje(data.utilidadBruta, data.ingresos.ventas);
    const margenNeto  = calcularPorcentaje(data.utilidadNeta, data.ingresos.ventas);
    return (
      <Zoom in style={{ transitionDelay: '100ms' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, mt: 4 }}>
            <Typography variant="h5" fontWeight="700">Indicadores Clave del Período</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {savedRecord && (
                <Chip
                  icon={<CheckCircleIcon />}
                  label={`Gastos manuales incluidos — ${savedRecord.estado}`}
                  color={savedRecord.estado === 'enviado' ? 'success' : 'info'}
                  size="small"
                />
              )}
              {!savedRecord && (
                <Chip label="Solo datos del sistema" color="default" size="small" variant="outlined" />
              )}
            </Box>
          </Box>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard title="Ventas Totales" value={data.ingresos.ventas} subtitle="Ingresos del período" icon={<AttachMoneyIcon sx={{ fontSize: 28 }} />} color="primary" trend="up" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard title="Utilidad Bruta" value={data.utilidadBruta} subtitle={`Margen: ${margenBruto}%`} icon={<TrendingUpIcon sx={{ fontSize: 28 }} />} color="success" trend={data.utilidadBruta > 0 ? 'up' : 'down'} trendValue={`${margenBruto}%`} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard title="Gastos Operativos" value={data.gastosOperativos.totalGastosOperativos} subtitle={`${calcularPorcentaje(data.gastosOperativos.totalGastosOperativos, data.ingresos.ventas)}% de ventas`} icon={<ReceiptIcon sx={{ fontSize: 28 }} />} color="warning" trend="neutral" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard title="Utilidad Neta" value={data.utilidadNeta} subtitle={`Margen: ${margenNeto}%`} icon={<AccountBalanceIcon sx={{ fontSize: 28 }} />} color="secondary" trend={data.utilidadNeta > 0 ? 'up' : 'down'} trendValue={`${margenNeto}%`} />
            </Grid>
          </Grid>
          <Card sx={{ mt: 3, borderRadius: 3, boxShadow: `0 4px 20px ${theme.palette.grey[500]}10` }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="700" gutterBottom>Análisis de Márgenes</Typography>
              <Box sx={{ mt: 3 }}>
                <IndicatorProgress label="Margen Bruto" value={data.utilidadBruta} total={data.ingresos.ventas} color="success" />
                <IndicatorProgress label="Margen Operativo" value={data.utilidadOperativa} total={data.ingresos.ventas} color="info" />
                <IndicatorProgress label="Margen Neto" value={data.utilidadNeta} total={data.ingresos.ventas} color="secondary" />
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Zoom>
    );
  };

  return (
    <Box sx={{ position: 'relative', minHeight: '100vh' }}>
      <WeatherBar />
      <Box sx={{ py: 4, mt: 4 }}>

        {/* Header */}
        <Fade in>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AnalyticsIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
              <Box>
                <Typography variant="h4" component="h1" fontWeight="bold">Estado de Resultados</Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Datos del sistema + gastos manuales ingresados por el equipo
                </Typography>
              </Box>
            </Box>
          </Box>
        </Fade>

        {/* Tabs principales */}
        <Paper elevation={2} sx={{ mb: 3 }}>
          <Tabs
            value={viewTab}
            onChange={(e, v) => setViewTab(v)}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '1rem', minHeight: 64 } }}
          >
            <Tab icon={<AnalyticsIcon />} iconPosition="start" label="Vista del Período" />
            <Tab icon={<HistoryIcon />} iconPosition="start" label="Históricos" />
          </Tabs>
        </Paper>

        {/* Tab 0: Vista del período */}
        <TabPanel value={viewTab} index={0}>
          {/* Filtros */}
          <Fade in>
            <Paper elevation={2} sx={{
              p: 3, mb: 4, borderRadius: 3,
              background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[50]} 100%)`,
              border: `1px solid ${theme.palette.divider}`,
            }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Filtros de Consulta</Typography>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} sm={3}>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                    <DatePicker
                      label="Período"
                      views={['year', 'month']}
                      value={selectedMonth}
                      onChange={(v) => setSelectedMonth(v)}
                      disabled={loading}
                      slotProps={{ textField: { fullWidth: true, size: 'small', variant: 'outlined', InputProps: { sx: { borderRadius: 2 } } } }}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Sucursal</InputLabel>
                    <Select value={selectedSucursal} label="Sucursal" onChange={(e) => setSelectedSucursal(e.target.value)} disabled={loading} sx={{ borderRadius: 2 }}>
                      {sucursalesDisponibles.map(s => <MenuItem key={s.id} value={s.id.toString()}>{s.nombre}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Razón Social</InputLabel>
                    <Select value={selectedRazonSocial} label="Razón Social" onChange={(e) => setSelectedRazonSocial(e.target.value)} disabled={loading} sx={{ borderRadius: 2 }}>
                      {razonesSocialesDisponibles.map(r => <MenuItem key={r.id} value={r.id.toString()}>{r.nombre_razon}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Button
                    variant="contained" fullWidth onClick={cargarVistaCompleta}
                    disabled={loading || !selectedSucursal}
                    startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                    sx={{
                      py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 'bold',
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    }}
                  >
                    {loading ? 'Cargando...' : 'Consultar'}
                  </Button>
                </Grid>
              </Grid>
              {loading && <Box sx={{ mt: 2 }}><LinearProgress sx={{ borderRadius: 1, height: 6 }} /></Box>}
            </Paper>
          </Fade>

          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

          {loading && !data && (
            <Box display="flex" justifyContent="center" py={8}><CircularProgress size={48} /></Box>
          )}

          {!data && !loading && (
            <Fade in>
              <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: `2px dashed ${theme.palette.divider}`, background: alpha(theme.palette.primary.main, 0.02) }}>
                <AnalyticsIcon sx={{ fontSize: 64, color: theme.palette.text.disabled, mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Seleccione un período y sucursal para ver el estado de resultados
                </Typography>
                <Typography variant="body2" color="text.disabled">
                  Se cargarán datos del sistema y, si existen, gastos manuales ingresados para ese período
                </Typography>
              </Paper>
            </Fade>
          )}

          {data && (
            <>
              <KPIsDisplay data={data} />
              <Box sx={{ mt: 4 }}>
                <EstadoResultadosDetallado data={data} datosRemuneraciones={datosRemuneraciones} />
              </Box>
              <Box sx={{ mt: 4 }}>
                <AnalisisFinanciero data={data} />
              </Box>
            </>
          )}
        </TabPanel>

        {/* Tab 1: Históricos */}
        <TabPanel value={viewTab} index={1}>
          <HistoricosTab sucursalesDisponibles={sucursalesDisponibles} />
        </TabPanel>
      </Box>
    </Box>
  );
};

export default EstadoResultadosPage;
