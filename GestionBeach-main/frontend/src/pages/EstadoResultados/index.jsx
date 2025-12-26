// src/pages/EstadoResultados/index.jsx - COMPLETO CON TODAS LAS FUNCIONES
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
  DialogContentText,
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
  Container,
  alpha,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import RefreshIcon from '@mui/icons-material/Refresh';
import GetAppIcon from '@mui/icons-material/GetApp';
import PrintIcon from '@mui/icons-material/Print';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EditIcon from '@mui/icons-material/Edit';
import BugReportIcon from '@mui/icons-material/BugReport';
import PercentIcon from '@mui/icons-material/Percent';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ReceiptIcon from '@mui/icons-material/Receipt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CalendarIcon from '@mui/icons-material/CalendarMonth';
import StoreIcon from '@mui/icons-material/Store';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HistoryIcon from '@mui/icons-material/History';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CloseIcon from '@mui/icons-material/Close';
import BusinessIcon from '@mui/icons-material/Business';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { useSnackbar } from 'notistack';
import api from '../../api/api';
import WeatherBar from '../../components/WeatherBar';
import {
  ResultadoLineItem,
  ResultadoSection,
  AnalisisFinanciero,
  EstadoResultadosDetallado,
  KPICard,
  ExecutiveHeader,
  IndicatorProgress
} from './ResultadosComponents';
import DynamicExpenseSection from '../../components/DynamicExpenseSection.jsx';

import {
  formatCurrency,
  calcularPorcentaje,
  obtenerRangoDeFechas
} from './utils';

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

        {/* 🔥 NUEVO: Mostrar desglose Admin/Ventas */}
        {resumen.administrativos && resumen.ventas && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Distribución por Tipo de Empleado:
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: theme.palette.primary.main + '08' }}>
                  <Typography variant="caption" color="textSecondary">
                    💼 ADMINISTRATIVOS ({resumen.administrativos.cantidad_empleados_unicos} empleados)
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="primary">
                    {formatCurrency(resumen.administrativos.total_cargo)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    (Empleados con múltiples sucursales - sueldo dividido proporcionalmente)
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: theme.palette.success.main + '08' }}>
                  <Typography variant="caption" color="textSecondary">
                    🛒 VENTAS ({resumen.ventas.cantidad_empleados_unicos} empleados)
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="success.main">
                    {formatCurrency(resumen.ventas.total_cargo)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    (Empleados con una sola sucursal - sueldo 100% asignado)
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

  // Filtros
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [anioFiltro, setAnioFiltro] = useState(currentYear);
  const [mesFiltro, setMesFiltro] = useState(currentMonth);
  const [sucursalFiltro, setSucursalFiltro] = useState('');
  const [razonSocialFiltro, setRazonSocialFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');

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
        enqueueSnackbar('Error al cargar históricos', { variant: 'error' });
      }
    } catch (error) {
      console.error('Error al cargar históricos:', error);
      enqueueSnackbar('Error al cargar históricos', { variant: 'error' });
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
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Período</strong></TableCell>
                    <TableCell><strong>Sucursal</strong></TableCell>
                    <TableCell><strong>Razón Social</strong></TableCell>
                    <TableCell align="right"><strong>Ventas</strong></TableCell>
                    <TableCell align="right"><strong>Costos</strong></TableCell>
                    <TableCell align="right"><strong>Utilidad Neta</strong></TableCell>
                    <TableCell align="center"><strong>Estado</strong></TableCell>
                    <TableCell><strong>Creado Por</strong></TableCell>
                    <TableCell><strong>Fecha Creación</strong></TableCell>
                    <TableCell align="center"><strong>Acciones</strong></TableCell>
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
            borderRadius: 3,
            background: 'linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%)',
          }
        }}
      >
        <DialogTitle sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          pb: 3
        }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={2}>
              <BusinessIcon sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>
                  Estado de Resultados
                </Typography>
                {selectedHistorico && (
                  <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                    {selectedHistorico.sucursal_nombre} - {getNombreMes(selectedHistorico.mes)} {selectedHistorico.anio}
                  </Typography>
                )}
              </Box>
            </Box>
            <Box display="flex" gap={1} alignItems="center">
              {selectedHistorico && (
                <Chip
                  label={selectedHistorico.estado === 'enviado' ? 'Enviado' : 'Borrador'}
                  color={selectedHistorico.estado === 'enviado' ? 'success' : 'warning'}
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    px: 1
                  }}
                  icon={selectedHistorico.estado === 'enviado' ? <CheckCircleIcon /> : <EditIcon />}
                />
              )}
              <IconButton
                onClick={handleCloseDialog}
                sx={{
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers id="estado-resultados-print">
          {selectedHistorico && (
            <Box>
              {/* Resumen Ejecutivo */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{
                    p: 2,
                    background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
                    color: 'white',
                    borderRadius: 2,
                    boxShadow: 3
                  }}>
                    <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600 }}>
                      💰 Total Ingresos
                    </Typography>
                    <Typography variant="h5" fontWeight={900}>
                      {formatCurrency(selectedHistorico.total_ingresos)}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{
                    p: 2,
                    background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                    color: 'white',
                    borderRadius: 2,
                    boxShadow: 3
                  }}>
                    <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600 }}>
                      📦 Total Costos
                    </Typography>
                    <Typography variant="h5" fontWeight={900}>
                      {formatCurrency(selectedHistorico.total_costos)}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{
                    p: 2,
                    background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                    color: 'white',
                    borderRadius: 2,
                    boxShadow: 3
                  }}>
                    <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600 }}>
                      💼 Gastos Operativos
                    </Typography>
                    <Typography variant="h5" fontWeight={900}>
                      {formatCurrency(selectedHistorico.total_gastos_operativos)}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{
                    p: 2,
                    background: selectedHistorico.utilidad_neta >= 0
                      ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
                      : 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
                    color: 'white',
                    borderRadius: 2,
                    boxShadow: 4,
                    border: '2px solid',
                    borderColor: selectedHistorico.utilidad_neta >= 0 ? '#38ef7d' : '#f45c43'
                  }}>
                    <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 700 }}>
                      {selectedHistorico.utilidad_neta >= 0 ? '✅' : '❌'} UTILIDAD NETA
                    </Typography>
                    <Typography variant="h4" fontWeight={900}>
                      {formatCurrency(selectedHistorico.utilidad_neta)}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Información General en tabla */}
              <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell colSpan={4}>
                        <Typography variant="subtitle1" fontWeight={700}>
                          Información General
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, width: '25%' }}>Período</TableCell>
                      <TableCell>{getNombreMes(selectedHistorico.mes)} {selectedHistorico.anio}</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: '25%' }}>Estado</TableCell>
                      <TableCell>{selectedHistorico.estado === 'enviado' ? 'Enviado' : 'Borrador'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Sucursal</TableCell>
                      <TableCell>{selectedHistorico.sucursal_nombre || '-'}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Razón Social</TableCell>
                      <TableCell>{selectedHistorico.razon_social_nombre || 'Sin especificar'}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* INGRESOS */}
              <TableContainer component={Paper} sx={{ mb: 3, border: '2px solid', borderColor: 'success.main' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'success.main' }}>
                      <TableCell colSpan={2}>
                        <Typography variant="subtitle1" fontWeight={800} color="white">
                          💰 INGRESOS
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Ventas</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'success.dark', fontSize: '1.1rem' }}>
                        {formatCurrency(selectedHistorico.ventas)}
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Otros Ingresos (Fletes)</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main' }}>
                        {formatCurrency(selectedHistorico.otros_ingresos_fletes || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Otros Ingresos Financieros</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main' }}>
                        {formatCurrency(selectedHistorico.otros_ingresos_financieros || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'success.dark' }}>
                      <TableCell sx={{ fontWeight: 900, color: 'white' }}>TOTAL INGRESOS</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900, color: 'white', fontSize: '1.2rem' }}>
                        {formatCurrency(selectedHistorico.total_ingresos)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* COSTOS */}
              <TableContainer component={Paper} sx={{ mb: 3, border: '2px solid', borderColor: 'error.main' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'error.main' }}>
                      <TableCell colSpan={2}>
                        <Typography variant="subtitle1" fontWeight={800} color="white">
                          📦 COSTOS
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Costo de Ventas</TableCell>
                      <TableCell align="right" sx={{ color: 'error.dark', fontWeight: 700 }}>
                        {formatCurrency(selectedHistorico.costo_ventas || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Compras Totales</TableCell>
                      <TableCell align="right" sx={{ color: 'error.main' }}>
                        {formatCurrency(selectedHistorico.compras_totales || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Merma de Venta</TableCell>
                      <TableCell align="right" sx={{ color: 'error.main' }}>
                        {formatCurrency(selectedHistorico.merma_venta || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'error.dark' }}>
                      <TableCell sx={{ fontWeight: 900, color: 'white' }}>TOTAL COSTOS</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900, color: 'white', fontSize: '1.2rem' }}>
                        {formatCurrency(selectedHistorico.total_costos)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* GASTOS ADMINISTRATIVOS */}
              <TableContainer component={Paper} sx={{ mb: 3, border: '2px solid', borderColor: 'warning.main' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'warning.main' }}>
                      <TableCell colSpan={2}>
                        <Typography variant="subtitle1" fontWeight={800} color="white">
                          🏢 GASTOS ADMINISTRATIVOS
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Sueldos Admin.</TableCell>
                      <TableCell align="right" sx={{ color: 'warning.dark', fontWeight: 700 }}>
                        {formatCurrency(selectedHistorico.gastos_admin_sueldos || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Seguros</TableCell>
                      <TableCell align="right" sx={{ color: 'warning.main' }}>
                        {formatCurrency(selectedHistorico.gastos_admin_seguros || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Gastos Comunes</TableCell>
                      <TableCell align="right" sx={{ color: 'warning.main' }}>
                        {formatCurrency(selectedHistorico.gastos_admin_gastos_comunes || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Electricidad</TableCell>
                      <TableCell align="right" sx={{ color: 'warning.main' }}>
                        {formatCurrency(selectedHistorico.gastos_admin_electricidad || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Agua</TableCell>
                      <TableCell align="right" sx={{ color: 'warning.main' }}>
                        {formatCurrency(selectedHistorico.gastos_admin_agua || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Telefonía</TableCell>
                      <TableCell align="right" sx={{ color: 'warning.main' }}>
                        {formatCurrency(selectedHistorico.gastos_admin_telefonia || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Otros Admin.</TableCell>
                      <TableCell align="right" sx={{ color: 'warning.main' }}>
                        {formatCurrency(selectedHistorico.gastos_admin_otros || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'warning.dark' }}>
                      <TableCell sx={{ fontWeight: 900, color: 'white' }}>TOTAL GASTOS ADMINISTRATIVOS</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900, color: 'white', fontSize: '1.2rem' }}>
                        {formatCurrency(selectedHistorico.gastos_admin_total || 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* GASTOS DE VENTA */}
              <TableContainer component={Paper} sx={{ mb: 3, border: '2px solid', borderColor: 'info.main' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'info.main' }}>
                      <TableCell colSpan={2}>
                        <Typography variant="subtitle1" fontWeight={800} color="white">
                          🛒 GASTOS DE VENTA
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Sueldos Ventas</TableCell>
                      <TableCell align="right" sx={{ color: 'info.dark', fontWeight: 700 }}>
                        {formatCurrency(selectedHistorico.gastos_venta_sueldos || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Fletes</TableCell>
                      <TableCell align="right" sx={{ color: 'info.main' }}>
                        {formatCurrency(selectedHistorico.gastos_venta_fletes || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Publicidad</TableCell>
                      <TableCell align="right" sx={{ color: 'info.main' }}>
                        {formatCurrency(selectedHistorico.gastos_venta_publicidad || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'info.dark' }}>
                      <TableCell sx={{ fontWeight: 900, color: 'white' }}>TOTAL GASTOS DE VENTA</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900, color: 'white', fontSize: '1.1rem' }}>
                        {formatCurrency(selectedHistorico.gastos_venta_total || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'secondary.dark' }}>
                      <TableCell sx={{ fontWeight: 900, color: 'white' }}>TOTAL GASTOS OPERATIVOS</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900, color: 'white', fontSize: '1.2rem' }}>
                        {formatCurrency(selectedHistorico.total_gastos_operativos)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* UTILIDADES */}
              <TableContainer component={Paper} sx={{
                mb: 3,
                border: '3px solid',
                borderColor: selectedHistorico.utilidad_neta >= 0 ? 'success.main' : 'error.main',
                boxShadow: 4
              }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: selectedHistorico.utilidad_neta >= 0 ? 'success.main' : 'error.main' }}>
                      <TableCell colSpan={2}>
                        <Typography variant="h6" fontWeight={900} color="white">
                          📊 UTILIDADES
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Utilidad Bruta</TableCell>
                      <TableCell align="right" sx={{
                        color: selectedHistorico.utilidad_bruta >= 0 ? 'success.dark' : 'error.dark',
                        fontWeight: 800,
                        fontSize: '1.1rem'
                      }}>
                        {selectedHistorico.utilidad_bruta >= 0 ? '📈 ' : '📉 '}
                        {formatCurrency(selectedHistorico.utilidad_bruta)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Utilidad Operativa</TableCell>
                      <TableCell align="right" sx={{
                        color: selectedHistorico.utilidad_operativa >= 0 ? 'success.dark' : 'error.dark',
                        fontWeight: 800,
                        fontSize: '1.1rem'
                      }}>
                        {selectedHistorico.utilidad_operativa >= 0 ? '📈 ' : '📉 '}
                        {formatCurrency(selectedHistorico.utilidad_operativa)}
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Utilidad Antes Impuestos</TableCell>
                      <TableCell align="right" sx={{
                        color: (selectedHistorico.utilidad_antes_impuestos || 0) >= 0 ? 'success.dark' : 'error.dark',
                        fontWeight: 800,
                        fontSize: '1.1rem'
                      }}>
                        {(selectedHistorico.utilidad_antes_impuestos || 0) >= 0 ? '📈 ' : '📉 '}
                        {formatCurrency(selectedHistorico.utilidad_antes_impuestos || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{
                      bgcolor: selectedHistorico.utilidad_neta >= 0 ? 'success.dark' : 'error.dark',
                      '& td': { borderBottom: 'none' }
                    }}>
                      <TableCell sx={{ fontWeight: 900, fontSize: '1.3rem', color: 'white', py: 2 }}>
                        💰 UTILIDAD NETA
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900, fontSize: '1.5rem', color: 'white', py: 2 }}>
                        {selectedHistorico.utilidad_neta >= 0 ? '✅ ' : '❌ '}
                        {formatCurrency(selectedHistorico.utilidad_neta)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Información Adicional */}
              <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell colSpan={4}>
                        <Typography variant="subtitle1" fontWeight={700}>
                          INFORMACIÓN ADICIONAL
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Número de Facturas</TableCell>
                      <TableCell>{selectedHistorico.numero_facturas || 0}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Número de Ventas</TableCell>
                      <TableCell>{selectedHistorico.numero_ventas || 0}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Empleados Admin.</TableCell>
                      <TableCell>{selectedHistorico.empleados_admin || 0}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Empleados Ventas</TableCell>
                      <TableCell>{selectedHistorico.empleados_ventas || 0}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Total Compras (Valor)</TableCell>
                      <TableCell>{formatCurrency(selectedHistorico.total_compras_valor || 0)}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Total Remuneraciones (Valor)</TableCell>
                      <TableCell>{formatCurrency(selectedHistorico.total_remuneraciones_valor || 0)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {selectedHistorico.observaciones && (
                <TableContainer component={Paper} sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'warning.50' }}>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight={700} color="warning.dark">
                            Observaciones
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>{selectedHistorico.observaciones}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {selectedHistorico.notas && (
                <TableContainer component={Paper} sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'info.50' }}>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight={700} color="info.dark">
                            Notas
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>{selectedHistorico.notas}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, bgcolor: 'grey.50', gap: 1 }}>
          <Button
            onClick={handleExportarPDF}
            variant="contained"
            startIcon={<PictureAsPdfIcon />}
            sx={{
              background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
              color: 'white',
              fontWeight: 700,
              '&:hover': {
                background: 'linear-gradient(135deg, #c62828 0%, #b71c1c 100%)',
                transform: 'translateY(-2px)',
                boxShadow: 4,
              },
              transition: 'all 0.3s ease',
            }}
          >
            Exportar a PDF
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            onClick={handleCloseDialog}
            variant="outlined"
            startIcon={<CloseIcon />}
            sx={{
              fontWeight: 600,
              borderWidth: 2,
              '&:hover': {
                borderWidth: 2,
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Componente principal para el Estado de Resultados
const EstadoResultadosPage = () => {
  // Estado para las pestañas principales
  const [mainTab, setMainTab] = useState(0); // 0: Procesado en Vivo, 1: Históricos

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedSucursal, setSelectedSucursal] = useState('');
  const [selectedRazonSocial, setSelectedRazonSocial] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [sucursalesDisponibles, setSucursalesDisponibles] = useState([]);
  const [razonesSocialesDisponibles, setRazonesSocialesDisponibles] = useState([]);
  const [centrosCostos, setCentrosCostos] = useState([]);
  const [datosReales, setDatosReales] = useState({
    compras: null,
    remuneraciones: null,
    ventas: null
  });
  const [datosRemuneraciones, setDatosRemuneraciones] = useState(null);
  
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [gastosAdministrativos, setGastosAdministrativos] = useState([]);
  const [gastosVenta, setGastosVenta] = useState([]);
  const [otrosGastos, setOtrosGastos] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  // Función para debugging de APIs
  const debugAPI = async () => {
    console.group('🔧 Debug de APIs');
    
    try {
      const healthCheck = await api.get('/');
      console.log('✅ API conectada:', healthCheck.status);
      
      const endpoints = [
        '/facturas-xml',
        '/remuneraciones', 
        '/ventas',
        '/sucursales'
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await api.get(endpoint, { params: { limit: 1 } });
          console.log(`✅ ${endpoint}:`, response.status, typeof response.data);
        } catch (error) {
          console.error(`❌ ${endpoint}:`, error.message);
        }
      }
      
    } catch (error) {
      console.error('❌ Error de conectividad:', error.message);
    }
    
    console.groupEnd();
  };

  // Función para cargar compras
  const loadComprasData = async () => {
    try {
      const { fechaDesde, fechaHasta } = obtenerRangoDeFechas(selectedMonth);
      console.log('📦 Cargando compras para:', {
        sucursal: selectedSucursal,
        razonSocial: selectedRazonSocial,
        periodo: `${fechaDesde} - ${fechaHasta}`
      });

      const comprasResponse = await api.get('/estado-resultados/compras', {
        params: {
          fecha_desde: fechaDesde,
          fecha_hasta: fechaHasta,
          sucursal_id: selectedSucursal,
          razon_social_id: selectedRazonSocial === 'todos' ? 'todos' : selectedRazonSocial
        }
      });
      
      console.log('🔥 Respuesta compras (centralizada):', comprasResponse.data);
      
      if (comprasResponse.data.success) {
        const { resumen } = comprasResponse.data.data;
        
        console.log(`✅ Compras cargadas: ${resumen.cantidad_facturas} facturas, total: $${resumen.total_compras.toLocaleString()}`);
        
        return { 
          data: comprasResponse.data.data.compras, 
          total: resumen.total_compras,
          cantidad: resumen.cantidad_facturas
        };
      }
      
      return { data: [], total: 0, cantidad: 0 };
      
    } catch (error) {
      console.error('❌ Error cargando compras desde controlador:', error);
      
      try {
        const { fechaDesde, fechaHasta } = obtenerRangoDeFechas(selectedMonth);
        console.log('🔄 Intentando método fallback para compras...');
        
        const comprasResponse = await api.get('/facturas-xml', {
          params: {
            fecha_desde: fechaDesde,
            fecha_hasta: fechaHasta,
            estado: 'PROCESADA',
            page: 1,
            limit: 1000
          }
        });
        
        let comprasData = [];
        if (comprasResponse?.data?.success && Array.isArray(comprasResponse.data.data)) {
          comprasData = comprasResponse.data.data.filter(factura => {
            const sucursalFactura = factura.id_sucursal || factura.sucursal_id;
            return sucursalFactura && sucursalFactura.toString() === selectedSucursal.toString();
          });
        }
        
        const total = comprasData.reduce((sum, factura) => sum + (Number(factura.monto_total || 0)), 0);
        console.log('✅ Compras cargadas (fallback):', comprasData.length, 'facturas');
        
        return { data: comprasData, total, cantidad: comprasData.length };
        
      } catch (fallbackError) {
        console.error('❌ Error en fallback de compras:', fallbackError);
        return { data: [], total: 0, cantidad: 0 };
      }
    }
  };

  // 🔥 FUNCIÓN CRÍTICA: Cargar remuneraciones CON CLASIFICACIÓN AUTOMÁTICA
  const loadRemuneracionesData = async () => {
    try {
      const mesSeleccionado = selectedMonth.getMonth() + 1;
      const anioSeleccionado = selectedMonth.getFullYear();

      console.log('👥 Cargando remuneraciones para:', {
        mes: mesSeleccionado,
        anio: anioSeleccionado,
        sucursal: selectedSucursal,
        razonSocial: selectedRazonSocial
      });

      const remuneracionesResponse = await api.get('/estado-resultados/remuneraciones', {
        params: {
          anio: anioSeleccionado,
          mes: mesSeleccionado,
          sucursal_id: selectedSucursal,
          razon_social_id: selectedRazonSocial === 'todos' ? 'todos' : selectedRazonSocial
        }
      });
      
      console.log('🔥 Respuesta remuneraciones (con clasificación automática):', remuneracionesResponse.data);
      
      if (remuneracionesResponse.data.success) {
        const { resumen, porcentajes_aplicados } = remuneracionesResponse.data.data;
        
        // 🔥 USAR DATOS YA CLASIFICADOS DEL BACKEND
        const totalCargoAdmin = resumen.administrativos?.total_cargo || 0;
        const totalCargoVentas = resumen.ventas?.total_cargo || 0;
        const totalCargo = resumen.total_cargo || (totalCargoAdmin + totalCargoVentas);
        
        console.log('✅ Remuneraciones clasificadas automáticamente por el backend:');
        console.log(`   💼 ADMINISTRATIVOS: ${resumen.administrativos?.cantidad_empleados_unicos || 0} empleados - Cargo: $${totalCargoAdmin.toLocaleString()}`);
        console.log(`   🛒 VENTAS: ${resumen.ventas?.cantidad_empleados_unicos || 0} empleados - Cargo: $${totalCargoVentas.toLocaleString()}`);
        console.log(`   💼 TOTAL CARGO: $${totalCargo.toLocaleString()}`);
        console.log(`   📊 Porcentajes aplicados:`, porcentajes_aplicados);
        
        // 🔥 FIX: Guardar correctamente en el estado
        setDatosRemuneraciones({
          resumen: resumen,
          porcentajes_aplicados: porcentajes_aplicados
        });
        
        return { 
          data: remuneracionesResponse.data.data.remuneraciones, 
          total: totalCargo,
          total_cargo: totalCargo,
          seguros_cesantia: 0,
          cantidad: resumen.cantidad_empleados || 0,
          resumen: resumen,
          porcentajes_aplicados: porcentajes_aplicados
        };
      }
      
      return { 
        data: [], 
        total: 0, 
        total_cargo: 0, 
        seguros_cesantia: 0, 
        cantidad: 0, 
        resumen: null,
        porcentajes_aplicados: null
      };
      
    } catch (error) {
      console.error('❌ Error cargando remuneraciones desde controlador:', error);
      return { 
        data: [], 
        total: 0, 
        total_cargo: 0, 
        seguros_cesantia: 0, 
        cantidad: 0, 
        resumen: null,
        porcentajes_aplicados: null
      };
    }
  };

  // Función para cargar ventas
  const loadVentasData = async () => {
    try {
      const { fechaDesde, fechaHasta } = obtenerRangoDeFechas(selectedMonth);
      console.log('🛒 Cargando ventas para:', {
        sucursal: selectedSucursal,
        razonSocial: selectedRazonSocial,
        periodo: `${fechaDesde} - ${fechaHasta}`
      });

      const ventasBody = {
        sucursal_id: parseInt(selectedSucursal),
        razon_social_id: selectedRazonSocial && selectedRazonSocial !== 'todos' ? parseInt(selectedRazonSocial) : null,
        start_date: fechaDesde,
        end_date: fechaHasta
      };

      console.log('📤 Enviando datos a /ventas:', ventasBody);

      const ventasResponse = await api.post('/ventas', ventasBody);
      
      console.log('🔥 Respuesta ventas (POST):', ventasResponse.data);
      
      let ventasData = [];
      let totalVentas = 0;

      if (ventasResponse?.data?.success && Array.isArray(ventasResponse.data.ventas)) {
        ventasData = ventasResponse.data.ventas;
        
        totalVentas = ventasData.reduce((sum, venta) => {
          const monto = Number(venta.Total || venta.total || venta.monto_total || venta.valor_total || 0);
          return sum + monto;
        }, 0);
        
        console.log(`✅ Ventas cargadas: ${ventasData.length} registros, total: ${totalVentas}`);
        
      } else if (Array.isArray(ventasResponse?.data?.ventas)) {
        ventasData = ventasResponse.data.ventas;
        
        totalVentas = ventasData.reduce((sum, venta) => {
          const monto = Number(venta.Total || venta.total || venta.monto_total || venta.valor_total || 0);
          return sum + monto;
        }, 0);
        
      } else {
        console.warn('⚠️ Formato de respuesta de ventas inesperado:', ventasResponse.data);
      }

      console.log(`✅ Ventas procesadas: ${ventasData.length} registros, total: ${totalVentas}`);
      return { data: ventasData, total: totalVentas };
      
    } catch (error) {
      console.error('❌ Error crítico en ventas:', error);
      
      if (error.response?.status === 404) {
        console.error('❌ Endpoint /ventas no encontrado');
      } else if (error.response?.status === 400) {
        console.error('❌ Parámetros incorrectos enviados al endpoint /ventas');
      }
      
      return { data: [], total: 0, source: 'error', error: error.message };
    }
  };
  
  // Cargar sucursales y razones sociales disponibles
  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);
      
      let sucursalesCargadas = false;
      
      try {
        const sucursalesRes = await api.get('/facturas-xml/lista/sucursales');
        if (sucursalesRes.data.success && Array.isArray(sucursalesRes.data.data)) {
          setSucursalesDisponibles(sucursalesRes.data.data);
          if (sucursalesRes.data.data.length > 0) {
            setSelectedSucursal(sucursalesRes.data.data[0].id.toString());
          }
          sucursalesCargadas = true;
          console.log('✅ Sucursales cargadas desde facturas-xml');
        }
      } catch (error) {
        console.log('⚠️ Facturas-xml/sucursales no disponible:', error.message);
      }
      
      if (!sucursalesCargadas) {
        try {
          const sucursalesRes = await api.get('/sucursales');
          if (Array.isArray(sucursalesRes.data)) {
            setSucursalesDisponibles(sucursalesRes.data);
            if (sucursalesRes.data.length > 0) {
              setSelectedSucursal(sucursalesRes.data[0].id.toString());
            }
            sucursalesCargadas = true;
            console.log('✅ Sucursales cargadas desde /sucursales');
          }
        } catch (error) {
          console.log('⚠️ /sucursales no disponible:', error.message);
        }
      }
      
      if (!sucursalesCargadas) {
        const sucursalesDefault = [
          { id: 1, nombre: 'Sucursal Principal', tipo_sucursal: 'PRINCIPAL' },
          { id: 2, nombre: 'Sucursal Secundaria', tipo_sucursal: 'SECUNDARIA' }
        ];
        setSucursalesDisponibles(sucursalesDefault);
        setSelectedSucursal('1');
        console.log('⚠️ Usando sucursales por defecto');
      }

      try {
        const razonesRes = await api.get('/razonessociales');
        if (Array.isArray(razonesRes.data)) {
          setRazonesSocialesDisponibles([
            { id: 'todos', nombre_razon: 'Todas las Razones Sociales' },
            ...razonesRes.data
          ]);
          setSelectedRazonSocial('todos');
          console.log('✅ Razones sociales cargadas');
        } else if (razonesRes.data.success && Array.isArray(razonesRes.data.data)) {
          setRazonesSocialesDisponibles([
            { id: 'todos', nombre_razon: 'Todas las Razones Sociales' },
            ...razonesRes.data.data
          ]);
          setSelectedRazonSocial('todos');
          console.log('✅ Razones sociales cargadas (formato success)');
        }
      } catch (error) {
        console.warn('⚠️ Error cargando razones sociales:', error.message);
        const razonesDefault = [
          { id: 'todos', nombre_razon: 'Todas las Razones Sociales' },
          { id: 1, nombre_razon: 'Razón Social Principal' }
        ];
        setRazonesSocialesDisponibles(razonesDefault);
        setSelectedRazonSocial('todos');
      }

      try {
        const centrosRes = await api.get('/centros-costos');
        if (centrosRes.data.success && Array.isArray(centrosRes.data.data)) {
          setCentrosCostos(centrosRes.data.data);
          console.log('✅ Centros de costos cargados');
        } else if (Array.isArray(centrosRes.data)) {
          setCentrosCostos(centrosRes.data);
          console.log('✅ Centros de costos cargados (formato directo)');
        }
      } catch (error) {
        console.warn('⚠️ Error cargando centros de costos:', error.message);
        const centrosDefault = [
          { id: 'ADM', nombre: 'Administración' },
          { id: 'VEN', nombre: 'Ventas' },
          { id: 'PRO', nombre: 'Producción' }
        ];
        setCentrosCostos(centrosDefault);
      }
      
    } catch (error) {
      console.error('❌ Error cargando datos iniciales:', error);
      enqueueSnackbar('Error al cargar configuración inicial', { variant: 'warning' });
      
      const sucursalesDefault = [{ id: 1, nombre: 'Sucursal Principal' }];
      setSucursalesDisponibles(sucursalesDefault);
      setSelectedSucursal('1');
      
    } finally {
      setLoading(false);
    }
  };

  // Función principal para cargar datos del estado de resultados
  const loadResultadosData = async () => {
    if (!selectedSucursal) {
      console.warn('⚠️ No hay sucursal seleccionada');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { fechaDesde, fechaHasta } = obtenerRangoDeFechas(selectedMonth);
      
      console.log('📊 Cargando datos para:', {
        sucursal: selectedSucursal,
        fechaDesde,
        fechaHasta,
        mes: selectedMonth.getMonth() + 1,
        año: selectedMonth.getFullYear()
      });

      const comprasResult = await loadComprasData();
      const remuneracionesResult = await loadRemuneracionesData();
      const ventasResult = await loadVentasData();

      console.log('📊 Resumen de datos cargados:', {
        compras: { cantidad: comprasResult.data.length, total: comprasResult.total },
        remuneraciones: { 
          cantidad: remuneracionesResult.data.length, 
          total_cargo: remuneracionesResult.total_cargo || 0,
          admin: remuneracionesResult.resumen?.administrativos?.total_cargo || 0,
          ventas: remuneracionesResult.resumen?.ventas?.total_cargo || 0
        },
        ventas: { cantidad: ventasResult.data.length, total: ventasResult.total }
      });

      const estadoResultados = construirEstadoResultados({
        compras: comprasResult,
        remuneraciones: remuneracionesResult,
        ventas: ventasResult
      });

      setDatosReales({
        compras: comprasResult.data,
        remuneraciones: remuneracionesResult.data,
        ventas: ventasResult.data
      });

      setData(estadoResultados);
      initializeExpensesFromData(estadoResultados);
      setHasChanges(false);
      
      const sucursalNombre = sucursalesDisponibles.find(s => s.id.toString() === selectedSucursal)?.nombre || selectedSucursal;
      
      if (ventasResult.total === 0 && comprasResult.total === 0 && remuneracionesResult.total === 0) {
        enqueueSnackbar(`Sin datos para ${sucursalNombre} en el período seleccionado`, { 
          variant: 'info',
          autoHideDuration: 4000 
        });
      } else {
        const mensaje = `${sucursalNombre}: ${ventasResult.total > 0 ? 'Ventas ✓' : 'Sin ventas'} | ${comprasResult.total > 0 ? 'Compras ✓' : 'Sin compras'} | ${remuneracionesResult.total > 0 ? 'Remuneraciones ✓' : 'Sin remuneraciones'}`;
        enqueueSnackbar(mensaje, { variant: 'success' });
      }
      
    } catch (err) {
      console.error('❌ Error crítico al cargar datos:', err);
      setError(`Error al cargar los datos: ${err.message}`);
      enqueueSnackbar(`Error al conectar con el servidor: ${err.message}`, { 
        variant: 'error',
        autoHideDuration: 5000 
      });
      
      const estadoVacio = construirEstadoResultados({
        compras: { data: [], total: 0 },
        remuneraciones: { data: [], total: 0, total_cargo: 0, resumen: null },
        ventas: { data: [], total: 0 }
      });
      
      setData(estadoVacio);
      initializeExpensesFromData(estadoVacio);
      
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FUNCIÓN CRÍTICA: Construir estado de resultados usando clasificación REAL del backend
  const construirEstadoResultados = ({ compras, remuneraciones, ventas }) => {
    const sucursalSeleccionada = sucursalesDisponibles.find(s => s.id.toString() === selectedSucursal);
    
    // 🔥 USAR LOS DATOS YA CLASIFICADOS DEL BACKEND - NO más división 50/50
    const sueldosAdministrativos = remuneraciones.resumen?.administrativos?.total_cargo || 0;
    const sueldosVentas = remuneraciones.resumen?.ventas?.total_cargo || 0;
    const totalCargo = sueldosAdministrativos + sueldosVentas;
    
    console.log('🏗️ Construyendo estado de resultados con clasificación REAL del backend:', {
      sueldosAdministrativos: sueldosAdministrativos,
      sueldosVentas: sueldosVentas,
      totalCargo: totalCargo,
      empleadosAdmin: remuneraciones.resumen?.administrativos?.cantidad_empleados_unicos || 0,
      empleadosVentas: remuneraciones.resumen?.ventas?.cantidad_empleados_unicos || 0,
      fuente: '✅ BACKEND - Clasificación automática por número de sucursales',
      metodo: 'CTE SQL con COUNT de empleados_sucursales'
    });
    
    const estadoResultados = {
      sucursal: sucursalSeleccionada?.nombre || 'Sucursal Desconocida',
      periodo: selectedMonth.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }),
      
      ingresos: {
        ventas: ventas.total || 0,
        otrosIngresos: {
          fletes: 0,
          total: 0
        },
        totalIngresos: ventas.total || 0
      },
      
      costos: {
        costoVentas: (compras.total || 0) * 0.81,
        compras: compras.total || 0,
        mermaVenta: 0,
        totalCostos: (compras.total || 0) * 0.81
      },
      
      utilidadBruta: (ventas.total || 0) - ((compras.total || 0) * 0.81),
      
      gastosOperativos: {
        gastosVenta: {
          sueldos: sueldosVentas, // 🔥 Ya viene clasificado del backend
          fletes: 0,
          finiquitos: 0,
          mantenciones: 0,
          publicidad: 0,
          total: sueldosVentas
        },
        gastosAdministrativos: {
          sueldos: sueldosAdministrativos, // 🔥 Ya viene clasificado del backend
          seguros: 0,
          gastosComunes: 0,
          electricidad: 0,
          agua: 0,
          telefonia: 0,
          alarma: 0,
          internet: 0,
          facturasNet: 0,
          transbank: 0,
          patenteMunicipal: 0,
          contribuciones: 0,
          petroleo: 0,
          otros: 0,
          total: sueldosAdministrativos
        },
        totalGastosOperativos: sueldosVentas + sueldosAdministrativos
      },
      
      utilidadOperativa: 0,
      costoArriendo: 0,
      otrosIngresosFinancieros: 0,
      utilidadAntesImpuestos: 0,
      impuestos: 0,
      utilidadNeta: 0,
      
      estado: "borrador",
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: new Date().toISOString(),
      
      datosOriginales: {
        totalCompras: compras.total || 0,
        totalRemuneraciones: totalCargo,
        totalVentas: ventas.total || 0,
        numeroFacturas: compras.cantidad || 0,
        numeroVentas: ventas.data?.length || 0,
        numeroEmpleados: remuneraciones.cantidad || 0,
        fechaConsulta: new Date().toISOString(),
        sucursal: selectedSucursal,
        periodo: {
          mes: selectedMonth.getMonth() + 1,
          año: selectedMonth.getFullYear()
        },
        detalleRemuneraciones: remuneraciones.resumen || null,
        // 🔥 NUEVO: Información de clasificación
        clasificacion: {
          empleados_admin: remuneraciones.resumen?.administrativos?.cantidad_empleados_unicos || 0,
          empleados_ventas: remuneraciones.resumen?.ventas?.cantidad_empleados_unicos || 0,
          cargo_admin: sueldosAdministrativos,
          cargo_ventas: sueldosVentas,
          metodo: 'Clasificación automática por número de sucursales del empleado'
        }
      }
    };
    
    estadoResultados.utilidadOperativa = estadoResultados.utilidadBruta - estadoResultados.gastosOperativos.totalGastosOperativos;
    estadoResultados.utilidadAntesImpuestos = estadoResultados.utilidadOperativa - estadoResultados.costoArriendo + estadoResultados.otrosIngresosFinancieros;
    estadoResultados.impuestos = Math.max(0, Math.round(estadoResultados.utilidadAntesImpuestos * 0.19));
    estadoResultados.utilidadNeta = estadoResultados.utilidadAntesImpuestos - estadoResultados.impuestos;
    
    console.log('✅ Estado de resultados construido con clasificación real:', {
      utilidadBruta: estadoResultados.utilidadBruta,
      gastosOperativos: estadoResultados.gastosOperativos.totalGastosOperativos,
      gastosAdmin: sueldosAdministrativos,
      gastosVentas: sueldosVentas,
      utilidadOperativa: estadoResultados.utilidadOperativa,
      utilidadNeta: estadoResultados.utilidadNeta
    });
    
    return estadoResultados;
  };
  
  const initializeExpensesFromData = (data) => {
    const adminExpenses = [];
    const adminKeys = [
      'gastosComunes', 'electricidad', 'agua', 'telefonia', 'alarma', 
      'internet', 'facturasNet', 'transbank', 'patenteMunicipal',
      'contribuciones', 'petroleo', 'otros'
    ];
    
    adminKeys.forEach(key => {
      const value = data.gastosOperativos.gastosAdministrativos[key];
      if (value > 0) {
        adminExpenses.push({
          id: key,
          label: getExpenseLabel('administrativos', key),
          amount: value
        });
      }
    });
    
    const ventaExpenses = [];
    const ventaKeys = ['fletes', 'finiquitos', 'mantenciones', 'publicidad'];
    
    ventaKeys.forEach(key => {
      const value = data.gastosOperativos.gastosVenta[key];
      if (value > 0) {
        ventaExpenses.push({
          id: key,
          label: getExpenseLabel('venta', key),
          amount: value
        });
      }
    });
    
    const otrosExpensesList = [];
    
    if (data.costos.mermaVenta > 0) {
      otrosExpensesList.push({
        id: 'mermaVenta',
        label: 'Merma Venta',
        amount: data.costos.mermaVenta
      });
    }
    
    if (data.costoArriendo > 0) {
      otrosExpensesList.push({
        id: 'costoArriendo',
        label: 'Costo de Arriendo',
        amount: data.costoArriendo
      });
    }
    
    if (data.ingresos.otrosIngresos.fletes > 0) {
      otrosExpensesList.push({
        id: 'ingresoFletes',
        label: 'Ingresos por Fletes',
        amount: data.ingresos.otrosIngresos.fletes
      });
    }
    
    if (data.otrosIngresosFinancieros > 0) {
      otrosExpensesList.push({
        id: 'otrosIngresos',
        label: 'Otros Ingresos Financieros',
        amount: data.otrosIngresosFinancieros
      });
    }
    
    setGastosAdministrativos(adminExpenses);
    setGastosVenta(ventaExpenses);
    setOtrosGastos(otrosExpensesList);
  };
  
  const getExpenseLabel = (category, id) => {
    const expenseCatalog = {
      administrativos: [
        { id: 'gastosComunes', label: 'Gastos Comunes' },
        { id: 'electricidad', label: 'Electricidad' },
        { id: 'agua', label: 'Agua' },
        { id: 'telefonia', label: 'Telefonía Celular' },
        { id: 'alarma', label: 'Alarma' },
        { id: 'internet', label: 'Internet' },
        { id: 'facturasNet', label: 'Facturas Net' },
        { id: 'transbank', label: 'Transbank' },
        { id: 'patenteMunicipal', label: 'Patente Municipal' },
        { id: 'contribuciones', label: 'Contribuciones' },
        { id: 'petroleo', label: 'Petróleo' },
        { id: 'otros', label: 'Otros Gastos' },
      ],
      venta: [
        { id: 'fletes', label: 'Costo por Fletes' },
        { id: 'finiquitos', label: 'Finiquitos' },
        { id: 'mantenciones', label: 'Mantenciones' },
        { id: 'publicidad', label: 'Publicidad' },
      ],
      otros: [
        { id: 'mermaVenta', label: 'Merma Venta' },
        { id: 'costoArriendo', label: 'Costo de Arriendo' },
        { id: 'ingresoFletes', label: 'Ingresos por Fletes' },
        { id: 'otrosIngresos', label: 'Otros Ingresos Financieros' },
      ]
    };
    
    const found = expenseCatalog[category].find(item => item.id === id);
    return found ? found.label : id;
  };
  
  const updateDataFromExpenses = () => {
    if (!data) return null;
    
    const newData = { ...data };
    
    newData.fechaModificacion = new Date().toISOString();
    newData.usuarioModificacion = "usuario_actual";
    
    const adminFields = [
      'gastosComunes', 'electricidad', 'agua', 'telefonia', 'alarma', 
      'internet', 'facturasNet', 'transbank', 'patenteMunicipal',
      'contribuciones', 'petroleo', 'otros'
    ];
    adminFields.forEach(field => {
      newData.gastosOperativos.gastosAdministrativos[field] = 0;
    });
    
    const ventaFields = ['fletes', 'finiquitos', 'mantenciones', 'publicidad'];
    ventaFields.forEach(field => {
      newData.gastosOperativos.gastosVenta[field] = 0;
    });
    
    newData.costos.mermaVenta = 0;
    newData.costoArriendo = 0;
    newData.ingresos.otrosIngresos.fletes = 0;
    newData.otrosIngresosFinancieros = 0;
    
    gastosAdministrativos.forEach(expense => {
      if (adminFields.includes(expense.id)) {
        newData.gastosOperativos.gastosAdministrativos[expense.id] = expense.amount;
      }
    });
    
    gastosVenta.forEach(expense => {
      if (ventaFields.includes(expense.id)) {
        newData.gastosOperativos.gastosVenta[expense.id] = expense.amount;
      }
    });
    
    otrosGastos.forEach(expense => {
      switch(expense.id) {
        case 'mermaVenta':
          newData.costos.mermaVenta = expense.amount;
          break;
        case 'costoArriendo':
          newData.costoArriendo = expense.amount;
          break;
        case 'ingresoFletes':
          newData.ingresos.otrosIngresos.fletes = expense.amount;
          break;
        case 'otrosIngresos':
          newData.otrosIngresosFinancieros = expense.amount;
          break;
        default:
          break;
      }
    });
    
    // Recalcular totales
    newData.gastosOperativos.gastosAdministrativos.total = 
      Object.keys(newData.gastosOperativos.gastosAdministrativos)
        .filter(key => key !== 'total' && key !== 'sueldos')
        .reduce((sum, key) => sum + (newData.gastosOperativos.gastosAdministrativos[key] || 0), 0) + 
      newData.gastosOperativos.gastosAdministrativos.sueldos;
    
    newData.gastosOperativos.gastosVenta.total = 
      Object.keys(newData.gastosOperativos.gastosVenta)
        .filter(key => key !== 'total' && key !== 'sueldos')
        .reduce((sum, key) => sum + (newData.gastosOperativos.gastosVenta[key] || 0), 0) + 
      newData.gastosOperativos.gastosVenta.sueldos;
    
    newData.gastosOperativos.totalGastosOperativos = 
      newData.gastosOperativos.gastosAdministrativos.total + 
      newData.gastosOperativos.gastosVenta.total;
    
    newData.costos.totalCostos = newData.costos.costoVentas + newData.costos.mermaVenta;
    newData.ingresos.otrosIngresos.total = newData.ingresos.otrosIngresos.fletes;
    newData.ingresos.totalIngresos = newData.ingresos.ventas + newData.ingresos.otrosIngresos.total;
    
    newData.utilidadBruta = newData.ingresos.totalIngresos - newData.costos.totalCostos;
    newData.utilidadOperativa = newData.utilidadBruta - newData.gastosOperativos.totalGastosOperativos;
    newData.utilidadAntesImpuestos = newData.utilidadOperativa - newData.costoArriendo + newData.otrosIngresosFinancieros;
    newData.impuestos = Math.max(0, Math.round(newData.utilidadAntesImpuestos * 0.19));
    newData.utilidadNeta = newData.utilidadAntesImpuestos - newData.impuestos;
    
    return newData;
  };
  
  const handleAddGastoAdministrativo = (expense) => {
    setGastosAdministrativos([...gastosAdministrativos, expense]);
    setHasChanges(true);
  };
  
  const handleUpdateGastoAdministrativo = (expense) => {
    setGastosAdministrativos(
      gastosAdministrativos.map(e => e.id === expense.id ? expense : e)
    );
    setHasChanges(true);
  };
  
  const handleRemoveGastoAdministrativo = (expense) => {
    setGastosAdministrativos(gastosAdministrativos.filter(e => e.id !== expense.id));
    setHasChanges(true);
  };
  
  const handleAddGastoVenta = (expense) => {
    setGastosVenta([...gastosVenta, expense]);
    setHasChanges(true);
  };
  
  const handleUpdateGastoVenta = (expense) => {
    setGastosVenta(gastosVenta.map(e => e.id === expense.id ? expense : e));
    setHasChanges(true);
  };
  
  const handleRemoveGastoVenta = (expense) => {
    setGastosVenta(gastosVenta.filter(e => e.id !== expense.id));
    setHasChanges(true);
  };
  
  const handleAddOtroGasto = (expense) => {
    setOtrosGastos([...otrosGastos, expense]);
    setHasChanges(true);
  };
  
  const handleUpdateOtroGasto = (expense) => {
    setOtrosGastos(otrosGastos.map(e => e.id === expense.id ? expense : e));
    setHasChanges(true);
  };
  
  const handleRemoveOtroGasto = (expense) => {
    setOtrosGastos(otrosGastos.filter(e => e.id !== expense.id));
    setHasChanges(true);
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  useEffect(() => {
    if (data && hasChanges) {
      const updatedData = updateDataFromExpenses();
      if (updatedData) {
        setData(updatedData);
      }
    }
  }, [gastosAdministrativos, gastosVenta, otrosGastos, hasChanges]);
  
  const handleExportExcel = () => {
    if (!data) {
      enqueueSnackbar('No hay datos para exportar', { variant: 'warning' });
      return;
    }

    try {
      // Importar XLSX dinámicamente si no está disponible
      import('xlsx').then((XLSX) => {
        // Preparar datos para el estado de resultados
        const estadoResultadosData = [
          ['ESTADO DE RESULTADOS'],
          [''],
          ['Empresa:', data.sucursal],
          ['Período:', data.periodo],
          ['Fecha:', new Date().toLocaleDateString('es-CL')],
          [''],
          ['INGRESOS'],
          ['Ventas', formatCurrency(data.ingresos.ventas)],
          ['Otros Ingresos', formatCurrency(data.ingresos.otrosIngresos.total)],
          ['Total Ingresos', formatCurrency(data.ingresos.totalIngresos)],
          [''],
          ['COSTOS'],
          ['Costo de Ventas', formatCurrency(data.costos.costoVentas)],
          ['Merma Venta', formatCurrency(data.costos.mermaVenta)],
          ['Total Costos', formatCurrency(data.costos.totalCostos)],
          [''],
          ['UTILIDAD BRUTA', formatCurrency(data.utilidadBruta)],
          [''],
          ['GASTOS OPERATIVOS'],
          [''],
          ['Gastos de Ventas:'],
          ['  Sueldos', formatCurrency(data.gastosOperativos.gastosVenta.sueldos)],
          ['  Fletes', formatCurrency(data.gastosOperativos.gastosVenta.fletes)],
          ['  Finiquitos', formatCurrency(data.gastosOperativos.gastosVenta.finiquitos)],
          ['  Mantenciones', formatCurrency(data.gastosOperativos.gastosVenta.mantenciones)],
          ['  Publicidad', formatCurrency(data.gastosOperativos.gastosVenta.publicidad)],
          ['Total Gastos Venta', formatCurrency(data.gastosOperativos.gastosVenta.total)],
          [''],
          ['Gastos Administrativos:'],
          ['  Sueldos', formatCurrency(data.gastosOperativos.gastosAdministrativos.sueldos)],
          ['  Seguros', formatCurrency(data.gastosOperativos.gastosAdministrativos.seguros)],
          ['  Gastos Comunes', formatCurrency(data.gastosOperativos.gastosAdministrativos.gastosComunes)],
          ['  Electricidad', formatCurrency(data.gastosOperativos.gastosAdministrativos.electricidad)],
          ['  Agua', formatCurrency(data.gastosOperativos.gastosAdministrativos.agua)],
          ['  Telefonía', formatCurrency(data.gastosOperativos.gastosAdministrativos.telefonia)],
          ['  Otros', formatCurrency(data.gastosOperativos.gastosAdministrativos.otros)],
          ['Total Gastos Admin.', formatCurrency(data.gastosOperativos.gastosAdministrativos.total)],
          [''],
          ['TOTAL GASTOS OPERATIVOS', formatCurrency(data.gastosOperativos.totalGastosOperativos)],
          [''],
          ['UTILIDAD OPERATIVA', formatCurrency(data.utilidadOperativa)],
          ['Costo Arriendo', formatCurrency(data.costoArriendo)],
          ['Otros Ingresos Financieros', formatCurrency(data.otrosIngresosFinancieros)],
          [''],
          ['UTILIDAD ANTES DE IMPUESTOS', formatCurrency(data.utilidadAntesImpuestos)],
          ['Impuestos (19%)', formatCurrency(data.impuestos)],
          [''],
          ['UTILIDAD NETA', formatCurrency(data.utilidadNeta)]
        ];

        // Crear hoja de cálculo
        const ws = XLSX.utils.aoa_to_sheet(estadoResultadosData);

        // Configurar anchos de columnas
        ws['!cols'] = [
          { wch: 35 }, // Columna A (Conceptos)
          { wch: 20 }  // Columna B (Valores)
        ];

        // Aplicar estilos básicos (negrita para títulos)
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = { c: C, r: R };
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            if (!ws[cell_ref]) continue;

            // Aplicar negrita a títulos principales
            if (ws[cell_ref].v && typeof ws[cell_ref].v === 'string') {
              if (ws[cell_ref].v.includes('ESTADO DE RESULTADOS') ||
                  ws[cell_ref].v.includes('INGRESOS') ||
                  ws[cell_ref].v.includes('COSTOS') ||
                  ws[cell_ref].v.includes('UTILIDAD') ||
                  ws[cell_ref].v.includes('GASTOS OPERATIVOS') ||
                  ws[cell_ref].v.includes('TOTAL')) {
                ws[cell_ref].s = { font: { bold: true } };
              }
            }
          }
        }

        // Agregar hoja de resumen de remuneraciones si existe
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Estado de Resultados');

        // Si hay datos de remuneraciones, agregar hoja adicional
        if (datosRemuneraciones && datosRemuneraciones.resumen) {
          const remData = [
            ['RESUMEN DE REMUNERACIONES'],
            [''],
            ['Período:', data.periodo],
            [''],
            ['TOTALES'],
            ['Total Empleados', datosRemuneraciones.resumen.cantidad_empleados || 0],
            ['Total Pago', formatCurrency(datosRemuneraciones.resumen.total_pago || 0)],
            ['Total Cargo', formatCurrency(datosRemuneraciones.resumen.total_cargo || 0)],
            [''],
            ['COSTOS PATRONALES'],
            ['Caja Compensación', formatCurrency(datosRemuneraciones.resumen.total_caja_compensacion || 0)],
            ['AFC', formatCurrency(datosRemuneraciones.resumen.total_afc || 0)],
            ['SIS', formatCurrency(datosRemuneraciones.resumen.total_sis || 0)],
            ['ACH', formatCurrency(datosRemuneraciones.resumen.total_ach || 0)],
            ['Imposiciones', formatCurrency(datosRemuneraciones.resumen.total_imposiciones_patronales || 0)]
          ];

          if (datosRemuneraciones.resumen.administrativos && datosRemuneraciones.resumen.ventas) {
            remData.push(
              [''],
              ['CLASIFICACIÓN'],
              ['Administrativos:', formatCurrency(datosRemuneraciones.resumen.administrativos.total_cargo || 0)],
              ['  Empleados', datosRemuneraciones.resumen.administrativos.cantidad_empleados_unicos || 0],
              ['Ventas:', formatCurrency(datosRemuneraciones.resumen.ventas.total_cargo || 0)],
              ['  Empleados', datosRemuneraciones.resumen.ventas.cantidad_empleados_unicos || 0]
            );
          }

          const wsRem = XLSX.utils.aoa_to_sheet(remData);
          wsRem['!cols'] = [{ wch: 30 }, { wch: 20 }];
          XLSX.utils.book_append_sheet(wb, wsRem, 'Remuneraciones');
        }

        // Generar y descargar archivo
        const fileName = `Estado_Resultados_${data.sucursal}_${data.periodo.replace(/ /g, '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);

        enqueueSnackbar('Excel exportado correctamente', { variant: 'success' });
      }).catch(error => {
        console.error('Error al cargar XLSX:', error);
        enqueueSnackbar('Error al exportar Excel', { variant: 'error' });
      });
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      enqueueSnackbar('Error al exportar Excel', { variant: 'error' });
    }
  };

  const handlePrint = () => {
    if (!data) {
      enqueueSnackbar('No hay datos para imprimir', { variant: 'warning' });
      return;
    }

    // Crear estilos para impresión
    const printStyles = `
      @media print {
        @page {
          size: letter;
          margin: 1.5cm;
        }

        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* Ocultar elementos no necesarios */
        header, nav, .MuiAppBar-root, button, .no-print {
          display: none !important;
        }

        /* Ajustar contenedor principal */
        .print-container {
          page-break-inside: avoid;
        }

        /* Evitar saltos de página en secciones importantes */
        .print-section {
          page-break-inside: avoid;
          margin-bottom: 1rem;
        }

        /* Títulos */
        h1, h2, h3, h4, h5, h6 {
          page-break-after: avoid;
          color: #000 !important;
        }

        /* Tablas */
        table {
          page-break-inside: avoid;
          width: 100%;
          border-collapse: collapse;
        }

        table td, table th {
          padding: 8px;
          border: 1px solid #ddd;
        }

        /* Cards y contenedores */
        .MuiCard-root, .MuiPaper-root {
          box-shadow: none !important;
          border: 1px solid #ddd !important;
          page-break-inside: avoid;
          margin-bottom: 1rem;
        }

        /* Fondos */
        .MuiCardHeader-root {
          background-color: #f5f5f5 !important;
          border-bottom: 2px solid #333 !important;
        }

        /* Tipografía */
        * {
          font-size: 11pt !important;
          line-height: 1.4 !important;
        }

        h1 { font-size: 18pt !important; }
        h2 { font-size: 16pt !important; }
        h3 { font-size: 14pt !important; }
        h4 { font-size: 12pt !important; }

        /* Saltos de página estratégicos */
        .page-break-before {
          page-break-before: always;
        }

        .page-break-after {
          page-break-after: always;
        }

        /* Evitar que imágenes/gráficos se corten */
        img, svg {
          page-break-inside: avoid;
          max-width: 100%;
        }

        /* Grid responsive para impresión */
        .MuiGrid-container {
          display: block !important;
        }

        .MuiGrid-item {
          width: 100% !important;
          max-width: 100% !important;
        }
      }
    `;

    // Inyectar estilos de impresión
    const styleElement = document.createElement('style');
    styleElement.innerHTML = printStyles;
    document.head.appendChild(styleElement);

    // Agregar clases para impresión
    const mainContent = document.querySelector('main') || document.body;
    mainContent.classList.add('print-container');

    // Marcar secciones importantes
    const sections = document.querySelectorAll('.MuiCard-root, .MuiPaper-root');
    sections.forEach(section => {
      section.classList.add('print-section');
    });

    // Imprimir
    window.print();

    // Limpiar después de imprimir
    setTimeout(() => {
      document.head.removeChild(styleElement);
      mainContent.classList.remove('print-container');
      sections.forEach(section => {
        section.classList.remove('print-section');
      });
    }, 1000);
  };
  
  const handleSaveResultados = async () => {
    setLoading(true);
    const updatedData = updateDataFromExpenses();

    if (!updatedData) {
      setLoading(false);
      return;
    }

    try {
      // Si ya tiene ID, actualizar; si no, crear nuevo
      const payload = {
        data: updatedData,
        usuario: 'Usuario' // TODO: obtener del contexto de autenticación
      };

      let response;
      if (updatedData.id) {
        // Actualizar existente
        response = await api.put(`/estado-resultados/${updatedData.id}`, payload);
      } else {
        // Crear nuevo
        response = await api.post('/estado-resultados', payload);
      }

      if (response.data.success) {
        const newData = { ...updatedData };
        newData.estado = "guardado";
        newData.id = response.data.data?.id || updatedData.id;
        setData(newData);
        setHasChanges(false);
        enqueueSnackbar('Estado de resultados guardado correctamente', { variant: 'success' });
      } else {
        throw new Error(response.data.message || 'Error al guardar');
      }
    } catch (error) {
      console.error('❌ Error guardando estado de resultados:', error);
      enqueueSnackbar(
        `Error al guardar: ${error.response?.data?.message || error.message}`,
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
    }
  };
  
  const handleSendResultados = () => {
    setConfirmDialog({
      open: true,
      title: "Confirmar Envío",
      message: "Una vez enviado, no podrá modificar los datos. ¿Está seguro de que desea enviar el estado de resultados al sistema?",
      onConfirm: async () => {
        setLoading(true);
        const updatedData = updateDataFromExpenses();

        if (!updatedData) {
          setLoading(false);
          return;
        }

        try {
          // Primero guardar si hay cambios
          if (hasChanges || !updatedData.id) {
            const payload = {
              data: updatedData,
              usuario: 'Usuario' // TODO: obtener del contexto de autenticación
            };

            let saveResponse;
            if (updatedData.id) {
              saveResponse = await api.put(`/estado-resultados/${updatedData.id}`, payload);
            } else {
              saveResponse = await api.post('/estado-resultados', payload);
            }

            if (!saveResponse.data.success) {
              throw new Error('Error al guardar antes de enviar');
            }

            updatedData.id = saveResponse.data.data?.id || updatedData.id;
          }

          // Ahora enviar
          if (!updatedData.id) {
            throw new Error('No se pudo obtener el ID del estado de resultados');
          }

          const enviarResponse = await api.post(`/estado-resultados/${updatedData.id}/enviar`, {
            usuario: 'Usuario' // TODO: obtener del contexto de autenticación
          });

          if (enviarResponse.data.success) {
            const newData = { ...updatedData };
            newData.estado = "enviado";
            newData.fechaEnvio = new Date().toISOString();
            newData.usuarioEnvio = "Usuario";
            setData(newData);
            setHasChanges(false);
            enqueueSnackbar('Estado de resultados enviado correctamente', { variant: 'success' });
          } else {
            throw new Error(enviarResponse.data.message || 'Error al enviar');
          }
        } catch (error) {
          console.error('❌ Error enviando estado de resultados:', error);
          enqueueSnackbar(
            `Error al enviar: ${error.response?.data?.message || error.message}`,
            { variant: 'error' }
          );
        } finally {
          setLoading(false);
        }
      }
    });
  };
  
  const handleConfirmNewQuery = () => {
    if (hasChanges) {
      setConfirmDialog({
        open: true,
        title: "Cambios Pendientes",
        message: "Tiene cambios sin guardar. Si continúa, perderá estos cambios. ¿Desea continuar?",
        onConfirm: loadResultadosData
      });
    } else {
      loadResultadosData();
    }
  };
  
  const ReportHeader = () => {
    if (!data) {
      return (
        <Fade in={true}>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AccountBalanceIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h4" component="h1" fontWeight="bold">
                    Estado de Resultados
                  </Typography>
                  <Typography variant="subtitle1" color="textSecondary">
                    Sistema Integrado con Clasificación Automática Admin/Ventas
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Fade>
      );
    }

    const razonSocialSeleccionada = razonesSocialesDisponibles.find(
      r => r.id.toString() === selectedRazonSocial
    );

    return (
      <Fade in={true}>
        <Box sx={{ mb: 4 }}>
          <ExecutiveHeader
            sucursal={data.sucursal}
            periodo={data.periodo}
            razonSocial={razonSocialSeleccionada?.nombre_razon || 'N/A'}
            fechaCreacion={new Date().toLocaleDateString('es-CL', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
            estado={data.estado}
            onDebugAPI={debugAPI}
            onExportExcel={handleExportExcel}
            onPrint={handlePrint}
            clasificacion={data.datosOriginales?.clasificacion}
            numeroFacturas={data.datosOriginales?.numeroFacturas || 0}
            numeroVentas={data.datosOriginales?.numeroVentas || 0}
            numeroEmpleados={data.datosOriginales?.numeroEmpleados || 0}
          />
        </Box>
      </Fade>
    );
  };
  
  const ReportFilter = () => (
    <Fade in={true}>
      <Paper
        elevation={2}
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: 3,
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[50]} 100%)`,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Filtros de Consulta
        </Typography>
        
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
              <DatePicker
                label="Período de Análisis"
                views={['year', 'month']}
                value={selectedMonth}
                onChange={(newValue) => setSelectedMonth(newValue)}
                disabled={loading}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: "small",
                    variant: "outlined",
                    InputProps: {
                      sx: { borderRadius: 2 }
                    }
                  }
                }}
              />
            </LocalizationProvider>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Sucursal</InputLabel>
              <Select
                value={selectedSucursal}
                label="Sucursal"
                onChange={(e) => setSelectedSucursal(e.target.value)}
                disabled={loading}
                sx={{ borderRadius: 2 }}
              >
                {sucursalesDisponibles.map((sucursal) => (
                  <MenuItem key={sucursal.id} value={sucursal.id.toString()}>
                    {sucursal.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Razón Social</InputLabel>
              <Select
                value={selectedRazonSocial}
                label="Razón Social"
                onChange={(e) => setSelectedRazonSocial(e.target.value)}
                disabled={loading}
                sx={{ borderRadius: 2 }}
              >
                {razonesSocialesDisponibles.map((razon) => (
                  <MenuItem key={razon.id} value={razon.id.toString()}>
                    {razon.nombre_razon}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleConfirmNewQuery}
              disabled={loading || !selectedSucursal}
              startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
              sx={{ 
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 'bold',
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: `0 4px 20px ${theme.palette.primary.main}25`
              }}
            >
              {loading ? 'Cargando...' : 'Consultar Datos'}
            </Button>
          </Grid>
        </Grid>
        
        {loading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress 
              sx={{ 
                borderRadius: 1,
                height: 6,
                backgroundColor: theme.palette.grey[200],
                '& .MuiLinearProgress-bar': {
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
                }
              }} 
            />
          </Box>
        )}
      </Paper>
    </Fade>
  );
  
  const KeyResultsCard = ({ data }) => {
    const margenBruto = calcularPorcentaje(data.utilidadBruta, data.ingresos.ventas);
    const margenOperativo = calcularPorcentaje(data.utilidadOperativa, data.ingresos.ventas);
    const margenNeto = calcularPorcentaje(data.utilidadNeta, data.ingresos.ventas);

    return (
      <Zoom in={true} style={{ transitionDelay: '150ms' }}>
        <Box>
          <Typography variant="h5" fontWeight="700" sx={{ mb: 3, mt: 4 }}>
            Indicadores Clave de Rendimiento
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Ventas Totales"
                value={data.ingresos.ventas}
                subtitle="Ingresos del período"
                icon={<AttachMoneyIcon sx={{ fontSize: 28 }} />}
                color="primary"
                trend="up"
                trendValue="+100%"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Utilidad Bruta"
                value={data.utilidadBruta}
                subtitle={`Margen: ${margenBruto}%`}
                icon={<TrendingUpIcon sx={{ fontSize: 28 }} />}
                color="success"
                trend={data.utilidadBruta > 0 ? 'up' : 'down'}
                trendValue={`${margenBruto}%`}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Gastos Operativos"
                value={data.gastosOperativos.totalGastosOperativos}
                subtitle={`${calcularPorcentaje(data.gastosOperativos.totalGastosOperativos, data.ingresos.ventas)}% de ventas`}
                icon={<ReceiptIcon sx={{ fontSize: 28 }} />}
                color="warning"
                trend="neutral"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Utilidad Neta"
                value={data.utilidadNeta}
                subtitle={`Margen: ${margenNeto}%`}
                icon={<AccountBalanceIcon sx={{ fontSize: 28 }} />}
                color="secondary"
                trend={data.utilidadNeta > 0 ? 'up' : 'down'}
                trendValue={`${margenNeto}%`}
              />
            </Grid>
          </Grid>

          <Card sx={{ mt: 3, borderRadius: 3, boxShadow: `0 4px 20px ${theme.palette.grey[500]}10` }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="700" gutterBottom>
                Análisis de Márgenes
              </Typography>

              <Box sx={{ mt: 3 }}>
                <IndicatorProgress
                  label="Margen Bruto"
                  value={data.utilidadBruta}
                  total={data.ingresos.ventas}
                  color="success"
                />
                <IndicatorProgress
                  label="Margen Operativo"
                  value={data.utilidadOperativa}
                  total={data.ingresos.ventas}
                  color="info"
                />
                <IndicatorProgress
                  label="Margen Neto"
                  value={data.utilidadNeta}
                  total={data.ingresos.ventas}
                  color="secondary"
                />
              </Box>
            </CardContent>

            <Divider />

            <CardActions sx={{ justifyContent: 'flex-end', p: 3 }}>
              <Button
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={handleSaveResultados}
                disabled={loading || data.estado === "enviado" || !hasChanges}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 'medium'
                }}
              >
                Guardar Cambios
              </Button>
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={handleSendResultados}
                disabled={loading || data.estado === "enviado"}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 'medium',
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  boxShadow: `0 4px 20px ${theme.palette.primary.main}25`
                }}
              >
                Enviar al Sistema
              </Button>
            </CardActions>
          </Card>
        </Box>
      </Zoom>
    );
  };

  const ConfirmDialog = () => (
    <Dialog
      open={confirmDialog.open}
      onClose={() => setConfirmDialog({...confirmDialog, open: false})}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight="bold">
          {confirmDialog.title}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: 'text.primary' }}>
          {confirmDialog.message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button 
          onClick={() => setConfirmDialog({...confirmDialog, open: false})}
          sx={{ textTransform: 'none' }}
        >
          Cancelar
        </Button>
        <Button 
          onClick={() => {
            confirmDialog.onConfirm();
            setConfirmDialog({...confirmDialog, open: false});
          }}
          variant="contained"
          sx={{ 
            textTransform: 'none',
            borderRadius: 2
          }}
          autoFocus
        >
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
  );
  
  return (
    <Box sx={{ position: 'relative', minHeight: '100vh' }}>
      <WeatherBar />

      <Box sx={{ py: 4, mt: 4 }}>
        <ReportHeader />

        {/* Pestañas principales */}
        <Paper elevation={2} sx={{ mb: 3 }}>
          <Tabs
            value={mainTab}
            onChange={(e, newValue) => setMainTab(newValue)}
            variant="fullWidth"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                minHeight: 64,
              },
            }}
          >
            <Tab
              icon={<AnalyticsIcon />}
              iconPosition="start"
              label="Procesado en Vivo"
            />
            <Tab
              icon={<HistoryIcon />}
              iconPosition="start"
              label="Históricos"
            />
          </Tabs>
        </Paper>

        {/* Tab Panel: Procesado en Vivo */}
        <TabPanel value={mainTab} index={0}>
          <ReportFilter />
        
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 4,
              borderRadius: 2,
              boxShadow: `0 4px 12px ${theme.palette.error.main}15`
            }}
          >
            {error}
          </Alert>
        )}
        
        {loading && !data && (
          <Box display="flex" justifyContent="center" alignItems="center" py={8}>
            <CircularProgress size={48} />
          </Box>
        )}
        
        {data && (
          <>
            <KeyResultsCard data={data} />
            
            {datosRemuneraciones && datosRemuneraciones.porcentajes_aplicados && (
              <CostosPatronalesCard data={datosRemuneraciones} />
            )}
            
            <Grid container spacing={4}>
              <Grid item xs={12} lg={6}>
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: `0 8px 32px ${theme.palette.grey[500]}15`,
                    overflow: 'visible',
                    height: '100%',
                    background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[50]} 100%)`,
                  }}
                >
                  <CardHeader
                    title={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EditIcon sx={{ color: 'primary.main' }} />
                        <Typography variant="h6" fontWeight="bold">
                          Gestión de Gastos e Ingresos
                        </Typography>
                      </Box>
                    }
                    subheader="Administre los gastos variables y otros ingresos del período"
                    sx={{
                      backgroundColor: 'transparent',
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      pb: 2,
                    }}
                  />
                  
                  <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs
                      value={tabValue}
                      onChange={handleTabChange}
                      variant="fullWidth"
                      sx={{
                        '& .MuiTab-root': {
                          textTransform: 'none',
                          fontWeight: 'medium',
                          minHeight: 60
                        }
                      }}
                    >
                      <Tab label="Gastos Admin." />
                      <Tab label="Gastos Venta" />
                      <Tab label="Otros" />
                    </Tabs>
                  </Box>
                  
                  <TabPanel value={tabValue} index={0}>
                    <Box sx={{ p: 3 }}>
                      <DynamicExpenseSection
                        category="administrativos"
                        title="Gastos Administrativos"
                        description="Agregue y gestione los gastos administrativos variables."
                        existingExpenses={gastosAdministrativos}
                        onAddExpense={handleAddGastoAdministrativo}
                        onUpdateExpense={handleUpdateGastoAdministrativo}
                        onRemoveExpense={handleRemoveGastoAdministrativo}
                        disabled={data.estado === "enviado"}
                      />
                    </Box>
                  </TabPanel>
                  
                  <TabPanel value={tabValue} index={1}>
                    <Box sx={{ p: 3 }}>
                      <DynamicExpenseSection
                        category="venta"
                        title="Gastos de Venta"
                        description="Gestione los gastos relacionados con las ventas."
                        existingExpenses={gastosVenta}
                        onAddExpense={handleAddGastoVenta}
                        onUpdateExpense={handleUpdateGastoVenta}
                        onRemoveExpense={handleRemoveGastoVenta}
                        disabled={data.estado === "enviado"}
                      />
                    </Box>
                  </TabPanel>
                  
                  <TabPanel value={tabValue} index={2}>
                    <Box sx={{ p: 3 }}>
                      <DynamicExpenseSection
                        category="otros"
                        title="Otros Gastos e Ingresos"
                        description="Administre otros conceptos como mermas, arriendos e ingresos financieros."
                        existingExpenses={otrosGastos}
                        onAddExpense={handleAddOtroGasto}
                        onUpdateExpense={handleUpdateOtroGasto}
                        onRemoveExpense={handleRemoveOtroGasto}
                        disabled={data.estado === "enviado"}
                      />
                    </Box>
                  </TabPanel>
                </Card>
              </Grid>
              
              <Grid item xs={12} lg={6}>
                <EstadoResultadosDetallado 
                  data={data} 
                  datosRemuneraciones={datosRemuneraciones}
                />
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 4 }}>
              <AnalisisFinanciero data={data} />
            </Box>
          </>
        )}
        </TabPanel>

        {/* Tab Panel: Históricos */}
        <TabPanel value={mainTab} index={1}>
          <HistoricosTab sucursalesDisponibles={sucursalesDisponibles} />
        </TabPanel>

        <ConfirmDialog />
      </Box>
    </Box>
  );
};

export default EstadoResultadosPage;