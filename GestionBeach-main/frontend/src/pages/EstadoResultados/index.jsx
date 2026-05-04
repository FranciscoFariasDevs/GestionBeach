// src/pages/EstadoResultados/index.jsx - Visualización de Estado de Resultados (solo lectura)
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  useTheme,
  Fade,
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
import AnalyticsIcon from '@mui/icons-material/Analytics';
import GetAppIcon from '@mui/icons-material/GetApp';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import EditIcon from '@mui/icons-material/Edit';
import PercentIcon from '@mui/icons-material/Percent';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
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
import { formatCurrency } from './utils';

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

// Componente principal: Visualización de Estado de Resultados (solo lectura)
const EstadoResultadosPage = () => {
  const [sucursalesDisponibles, setSucursalesDisponibles] = useState([]);
  const theme = useTheme();

  useEffect(() => {
    const cargarSucursales = async () => {
      try {
        const res = await api.get('/facturas-xml/lista/sucursales');
        if (res.data.success && Array.isArray(res.data.data)) {
          setSucursalesDisponibles(res.data.data);
          return;
        }
      } catch {}
      try {
        const res = await api.get('/sucursales');
        if (Array.isArray(res.data)) setSucursalesDisponibles(res.data);
      } catch {}
    };
    cargarSucursales();
  }, []);

  return (
    <Box sx={{ position: 'relative', minHeight: '100vh' }}>
      <WeatherBar />
      <Box sx={{ py: 4, mt: 4 }}>
        <Fade in>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AnalyticsIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
              <Box>
                <Typography variant="h4" component="h1" fontWeight="bold">
                  Estado de Resultados
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Visualización y análisis de estados de resultados del sistema
                </Typography>
              </Box>
            </Box>
          </Box>
        </Fade>

        <HistoricosTab sucursalesDisponibles={sucursalesDisponibles} />
      </Box>
    </Box>
  );
};

export default EstadoResultadosPage;
