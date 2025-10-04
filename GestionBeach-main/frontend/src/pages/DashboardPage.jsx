import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Grid,
  Card,
  CardHeader,
  CardContent,
  TextField,
  Button,
  Typography,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  useTheme,
  Fade,
  Zoom,
  Avatar,
  IconButton,
  Tooltip as MuiTooltip,
  Chip,
  Modal,
  Dialog,
  DialogContent,
  DialogTitle,
  Menu,
  MenuItem,
  ButtonGroup,
  useMediaQuery,
  Tabs,
  Tab,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  LabelList,
  AreaChart,
  Area,
  Brush,
} from 'recharts';
// Importamos iconos (disponibles gratuitamente en MUI)
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import StorefrontIcon from '@mui/icons-material/Storefront';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import RefreshIcon from '@mui/icons-material/Refresh';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import ShareIcon from '@mui/icons-material/Share';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FilterListIcon from '@mui/icons-material/FilterList';
import ScheduleIcon from '@mui/icons-material/Schedule';
import BarChartIcon from '@mui/icons-material/BarChart';
import { SummarizeOutlined } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../api/api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import AutoReport from '../components/AutoReport';

// Componente para mostrar el KPI mejorado con animación
const KpiCard = ({ title, value, color, secondaryValue, secondaryLabel }) => {
  const theme = useTheme();
  
  // Seleccionar ícono según título
  let IconComponent;
  switch (title) {
    case 'Supermercados':
      IconComponent = ShoppingCartIcon;
      break;
    case 'Ferreterías':
      IconComponent = HomeWorkIcon;
      break;
    case 'Multitiendas':
      IconComponent = StorefrontIcon;
      break;
    case 'Total':
      IconComponent = AccountBalanceIcon;
      break;
    default:
      IconComponent = TrendingUpIcon;
  }

  return (
    <Zoom in={true} style={{ transitionDelay: '100ms' }}>
      <Card 
        sx={{ 
          height: '100%', 
          position: 'relative', 
          overflow: 'hidden',
          transition: 'all 0.3s ease-in-out',
          borderRadius: 2,
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 12px 24px rgba(0, 0, 0, 0.12)',
          }
        }}
      >
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            p: 2.5,
            height: '100%',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Avatar
              sx={{
                bgcolor: `${color}.main`,
                width: 48,
                height: 48,
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
              }}
            >
              <IconComponent />
            </Avatar>
          </Box>
          
          <Box sx={{ mt: 'auto' }}>
            <Typography color="textSecondary" variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
              {value}
            </Typography>
            {secondaryValue && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {secondaryLabel}: <span style={{ fontWeight: 'bold' }}>{secondaryValue}</span>
              </Typography>
            )}
          </Box>
        </Box>
      </Card>
    </Zoom>
  );
};

// Componente Modal para mostrar gráficos en pantalla completa
const FullscreenChartModal = ({ open, handleClose, title, children }) => {
  const theme = useTheme();
  
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          height: '80vh',
          maxHeight: '80vh',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
        py: 2
      }}>
        <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <IconButton onClick={handleClose} size="small" sx={{ 
          bgcolor: theme.palette.grey[100],
          '&:hover': { bgcolor: theme.palette.grey[200] },
        }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 3, height: 'calc(100% - 64px)' }}>
        <Box sx={{ height: '100%', width: '100%' }}>
          {children}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

// Componente gráfico con animación y botón de ampliación
const AnimatedChartCard = ({ title, height = 300, children, exportData }) => {
  const theme = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);
  const chartRef = useRef(null);
  
  const handleOpenModal = () => {
    setModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Exportar a PDF
  const handleExportPDF = () => {
    if (chartRef.current) {
      html2canvas(chartRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        // Añadir título
        pdf.setFontSize(18);
        pdf.text(title, 10, 15);
        pdf.setLineWidth(0.5);
        pdf.line(10, 20, pdfWidth - 10, 20);
        
        // Añadir la imagen
        pdf.addImage(imgData, 'PNG', 10, 25, pdfWidth - 20, pdfHeight - 10);
        
        // Añadir fecha de generación
        pdf.setFontSize(10);
        pdf.text(`Generado el: ${new Date().toLocaleString()}`, 10, pdfHeight + 20);
        
        pdf.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      });
      handleMenuClose();
    }
  };
  
  return (
    <>
      <Fade in={true} style={{ transitionDelay: '150ms' }}>
        <Card 
          sx={{ 
            height: '100%',
            transition: 'all 0.3s ease-in-out',
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            overflow: 'visible',
            '&:hover': {
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08)',
            }
          }}
        >
          <CardHeader 
            title={
              <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
                {title}
              </Typography>
            }
            action={
              <Box sx={{ display: 'flex' }}>
                {exportData && (
                  <MuiTooltip title="Exportar">
                    <IconButton
                      aria-label="opciones"
                      onClick={handleMenuClick}
                      sx={{ 
                        mr: 1,
                        bgcolor: theme.palette.grey[100],
                        '&:hover': { 
                          bgcolor: theme.palette.info.light,
                          color: theme.palette.info.contrastText
                        },
                      }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </MuiTooltip>
                )}
                <MuiTooltip title="Ver en pantalla completa">
                  <IconButton 
                    aria-label="ampliar gráfico" 
                    onClick={handleOpenModal}
                    sx={{ 
                      bgcolor: theme.palette.grey[100],
                      '&:hover': { 
                        bgcolor: theme.palette.primary.light,
                        color: theme.palette.primary.contrastText
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <FullscreenIcon />
                  </IconButton>
                </MuiTooltip>
              </Box>
            }
            sx={{ 
              backgroundColor: theme.palette.background.paper,
              borderBottom: `1px solid ${theme.palette.divider}`,
              padding: '16px 24px',
            }}
          />
          <CardContent sx={{ pt: 3, px: 3, pb: 3 }}>
            <Box ref={chartRef} sx={{ height: height, width: '100%' }}>
              {children}
            </Box>
          </CardContent>
        </Card>
      </Fade>
      
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 3,
          sx: { 
            mt: 1, 
            minWidth: 180,
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }
        }}
      >
        <MenuItem onClick={handleExportPDF}>
          <DownloadIcon fontSize="small" sx={{ mr: 1.5 }} />
          Exportar a PDF
        </MenuItem>
      </Menu>
      
      <FullscreenChartModal 
        open={modalOpen}
        handleClose={handleCloseModal}
        title={title}
      >
        {children}
      </FullscreenChartModal>
    </>
  );
};

// Componente para compartir dashboard
const ShareDashboardModal = ({ open, handleClose }) => {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  
  const handleShare = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      enqueueSnackbar('Dashboard compartido exitosamente', { variant: 'success' });
      handleClose();
      setEmail('');
    }, 1500);
  };
  
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: `1px solid ${theme.palette.divider}`,
        py: 2
      }}>
        <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
          Compartir Dashboard
        </Typography>
        <IconButton onClick={handleClose} size="small" sx={{ 
          bgcolor: theme.palette.grey[100],
          '&:hover': { bgcolor: theme.palette.grey[200] },
        }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 3, mt: 2 }}>
        <TextField
          label="Correo Electrónico"
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ mb: 3 }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            onClick={handleClose}
            sx={{ borderRadius: 1.5, textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleShare}
            disabled={!email || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <ShareIcon />}
            sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 'bold', color: 'white' }}
          >
            {loading ? 'Enviando...' : 'Compartir'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

// Componente principal del Dashboard
const DashboardPage = () => {
  // Referencias y hooks
  const dashboardRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { enqueueSnackbar } = useSnackbar();
  
  // Estados
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 7))
  );
  const [endDate, setEndDate] = useState(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0 = Gráficos, 1 = Reporte
  
  // Colores mejorados con tonos más profesionales
  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.info.main,
    theme.palette.warning.main,
    '#8884d8', // Púrpura
    '#82ca9d', // Verde claro
    '#ffc658', // Amarillo
    '#ff8042', // Naranja
    '#0088FE', // Azul
  ];
  
  // Formatear número como moneda chilena
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  // Cargar datos del dashboard
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Llamada a la API
      const response = await api.post('/dashboard', {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });
      
      setData(response.data);
      enqueueSnackbar('Datos cargados correctamente', { variant: 'success' });
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setError('Error al cargar los datos. Por favor, intente nuevamente.');
      enqueueSnackbar('Error al cargar datos', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  // Cargar datos iniciales
  useEffect(() => {
    loadDashboardData();
  }, []);
  
  // Manejar cambio de fechas
  const handleDateChange = () => {
    loadDashboardData();
  };
  
  // Manejar cambio de tab
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Manejar la generación del reporte - Cambia a la pestaña de reportes
  const handleGenerateReport = () => {
    setActiveTab(1); // Cambiar a la pestaña de reportes
  };
  
  // Establecer período predefinido
  const handlePeriodChange = (period) => {
    const now = new Date();
    let newStartDate;
    
    switch (period) {
      case 'week':
        newStartDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        newStartDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'quarter':
        newStartDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case 'year':
        newStartDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        newStartDate = new Date(now.setDate(now.getDate() - 7));
    }
    
    setStartDate(newStartDate);
    setEndDate(new Date());
    setSelectedPeriod(period);
    
    // Trigger para cargar datos automáticamente
    setTimeout(() => {
      loadDashboardData();
    }, 100);
  };

  // Preparar datos para el gráfico comparativo
  const prepareComparativeData = () => {
    if (!data) return [];
    
    return [
      {
        categoria: 'Supermercados',
        ventas: data.supermercados.ventas,
        costos: data.supermercados.costos,
        utilidad: data.supermercados.utilidad,
        margen: data.supermercados.margen
      },
      {
        categoria: 'Ferreterías',
        ventas: data.ferreterias.ventas,
        costos: data.ferreterias.costos,
        utilidad: data.ferreterias.utilidad,
        margen: data.ferreterias.margen
      },
      {
        categoria: 'Multitiendas',
        ventas: data.multitiendas.ventas,
        costos: data.multitiendas.costos,
        utilidad: data.multitiendas.utilidad,
        margen: data.multitiendas.margen
      },
      {
        categoria: 'Total',
        ventas: data.total.ventas,
        costos: data.total.costos,
        utilidad: data.total.utilidad,
        margen: data.total.margen
      }
    ];
  };
  
  // Esta función fue eliminada porque se quitó la funcionalidad de tendencias

  // Tooltip personalizado con estilo mejorado
  const CustomTooltip = ({ active, payload, label, formatter }) => {
    if (active && payload && payload.length) {
      return (
        <Paper
          elevation={3}
          sx={{
            p: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            border: `1px solid ${theme.palette.grey[300]}`,
            borderRadius: 1.5,
            minWidth: 160,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            {label}
          </Typography>
          {payload.map((entry, index) => (
            <Box key={`item-${index}`} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Box
                component="span"
                sx={{
                  width: 12,
                  height: 12,
                  backgroundColor: entry.color,
                  mr: 1,
                  display: 'inline-block',
                  borderRadius: '50%',
                }}
              />
              <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 500 }}>
                {entry.name}: <strong>{formatter ? formatter(entry.value) : entry.value}</strong>
              </Typography>
            </Box>
          ))}
        </Paper>
      );
    }
    return null;
  };

  // Función para exportar a PDF completo
  const handleExportToPDF = () => {
    if (!dashboardRef.current) return;
    
    enqueueSnackbar('Preparando PDF, por favor espere...', { variant: 'info' });
    
    html2canvas(dashboardRef.current, {
      scale: 1,
      useCORS: true,
      allowTaint: true,
    }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = canvas.height * imgWidth / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`Dashboard_Gerencial_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
      enqueueSnackbar('Dashboard exportado a PDF correctamente', { variant: 'success' });
    });
  };
  
  // Función simplificada para la impresión (sin react-to-print)
  const handlePrint = () => {
    window.print();
    enqueueSnackbar('Enviado a impresión', { variant: 'success' });
  };
  
  // Componente para el encabezado del Dashboard
  const DashboardHeader = () => {
    return (
      <Fade in={true}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mr: 2 }}>
                Dashboard Gerencial
              </Typography>
              <Chip 
                label="TIEMPO REAL" 
                size="small"
                color="primary"
                sx={{ 
                  fontWeight: 'bold',
                  height: 24,
                  fontSize: '0.7rem',
                }}
              />
            </Box>
            
            {/* Botones de acciones */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                color="primary"
                startIcon={<DownloadIcon />}
                onClick={handleExportToPDF}
                sx={{ 
                  borderRadius: 1.5,
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                PDF
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="primary"
                startIcon={<PrintIcon />}
                onClick={handlePrint}
                sx={{ 
                  borderRadius: 1.5,
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                Imprimir
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="primary"
                startIcon={<ShareIcon />}
                onClick={() => setShareModalOpen(true)}
                sx={{ 
                  borderRadius: 1.5,
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                Compartir
              </Button>
            </Box>
          </Box>
          <Typography variant="body1" color="textSecondary">
            Visualización de ventas, costos y márgenes por tipo de sucursal
          </Typography>
          
          {/* Indicador de fecha de actualización */}
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mt: 2,
              p: 1,
              borderRadius: 2,
              bgcolor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              width: 'fit-content'
            }}
          >
            <ScheduleIcon fontSize="small" sx={{ color: theme.palette.text.secondary, mr: 1 }} />
            <Typography variant="caption" color="textSecondary">
              Última actualización: {new Date().toLocaleString()}
            </Typography>
          </Box>
        </Box>
      </Fade>
    );
  };
  
  // Filtro de fecha compacto, todo en una línea
  const DateFilter = () => {
    return (
      <Fade in={true}>
        <Paper
          elevation={0}
          sx={{ 
            p: 2, 
            mb: 4, 
            border: '1px solid', 
            borderColor: 'divider',
            borderRadius: 2,
            background: theme.palette.background.paper,
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <ButtonGroup
                variant="outlined"
                aria-label="selección de período"
                size="small"
                fullWidth
              >
                <Button 
                  onClick={() => handlePeriodChange('week')}
                  variant={selectedPeriod === 'week' ? 'contained' : 'outlined'}
                  sx={{ 
                    textTransform: 'none',
                    fontWeight: selectedPeriod === 'week' ? 'bold' : 'normal',
                  }}
                >
                  7d
                </Button>
                <Button 
                  onClick={() => handlePeriodChange('month')}
                  variant={selectedPeriod === 'month' ? 'contained' : 'outlined'}
                  sx={{ 
                    textTransform: 'none',
                    fontWeight: selectedPeriod === 'month' ? 'bold' : 'normal',
                  }}
                >
                  30d
                </Button>
                <Button 
                  onClick={() => handlePeriodChange('quarter')}
                  variant={selectedPeriod === 'quarter' ? 'contained' : 'outlined'}
                  sx={{ 
                    textTransform: 'none',
                    fontWeight: selectedPeriod === 'quarter' ? 'bold' : 'normal',
                  }}
                >
                  90d
                </Button>
                <Button 
                  onClick={() => handlePeriodChange('year')}
                  variant={selectedPeriod === 'year' ? 'contained' : 'outlined'}
                  sx={{ 
                    textTransform: 'none',
                    fontWeight: selectedPeriod === 'year' ? 'bold' : 'normal',
                  }}
                >
                  1a
                </Button>
              </ButtonGroup>
            </Grid>
            
            <Grid item xs={12} md={7}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={5}>
                    <DatePicker
                      label="Fecha Inicio"
                      value={startDate}
                      onChange={(newValue) => setStartDate(newValue)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: "small",
                          variant: "outlined",
                          InputProps: {
                            sx: { borderRadius: 1.5 }
                          }
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={6} md={5}>
                    <DatePicker
                      label="Fecha Fin"
                      value={endDate}
                      onChange={(newValue) => setEndDate(newValue)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: "small",
                          variant: "outlined",
                          InputProps: {
                            sx: { borderRadius: 1.5 }
                          }
                        }
                      }}
                    />
                  </Grid>
                </Grid>
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={handleDateChange}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                  sx={{ 
                    py: 1,
                    borderRadius: 1.5,
                    textTransform: 'none',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    flex: 1
                  }}
                >
                  Consultar
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleGenerateReport}
                  disabled={!data || loading}
                  startIcon={<SummarizeOutlined />}
                  sx={{ 
                    py: 1,
                    borderRadius: 1.5,
                    textTransform: 'none',
                    fontWeight: 'bold',
                  }}
                >
                  Reporte
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Fade>
    );
  };
  
  return (
    <Box sx={{ pb: 8 }} ref={dashboardRef}>
      <DashboardHeader />
      
      <DateFilter />
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 4,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
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
          {/* Pestañas para separar gráficos y reportes */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none', 
                  fontWeight: 600,
                  fontSize: '1rem',
                  minHeight: '48px',
                  paddingLeft: theme.spacing(2),
                  paddingRight: theme.spacing(2),
                },
                '& .Mui-selected': {
                  color: theme.palette.primary.main,
                },
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                },
              }}
            >
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <BarChartIcon sx={{ mr: 1 }} fontSize="small" />
                    Gráficos y Análisis
                  </Box>
                } 
              />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <SummarizeOutlined sx={{ mr: 1 }} fontSize="small" />
                    Reporte Gerencial
                  </Box>
                } 
                disabled={!data || loading}
              />
            </Tabs>
          </Box>
          
          {/* Panel de gráficos */}
          {activeTab === 0 && (
            <>
              {/* KPIs principales */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <KpiCard
                    title="Supermercados"
                    value={formatCurrency(data.supermercados.ventas)}
                    color="primary"
                    secondaryValue={`${data.supermercados.margen.toFixed(2)}%`}
                    secondaryLabel="Margen"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <KpiCard
                    title="Ferreterías"
                    value={formatCurrency(data.ferreterias.ventas)}
                    color="info"
                    secondaryValue={`${data.ferreterias.margen.toFixed(2)}%`}
                    secondaryLabel="Margen"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <KpiCard
                    title="Multitiendas"
                    value={formatCurrency(data.multitiendas.ventas)}
                    color="success"
                    secondaryValue={`${data.multitiendas.margen.toFixed(2)}%`}
                    secondaryLabel="Margen"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <KpiCard
                    title="Total"
                    value={formatCurrency(data.total.ventas)}
                    color="secondary"
                    secondaryValue={`${data.total.margen.toFixed(2)}%`}
                    secondaryLabel="Margen"
                  />
                </Grid>
              </Grid>
              
              {/* Reorganización de gráficos por solicitud */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* 1. Gráfico de barras para supermercados - Mejorado visualmente */}
                <Grid item xs={12} md={6}>
                  <AnimatedChartCard 
                    title="Ventas por Supermercado"
                    exportData={data.supermercados.sucursales}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.supermercados.sucursales}
                        layout="vertical"
                        margin={{ top: 15, right: 45, left: 20, bottom: 5 }}
                        barSize={20}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                        <XAxis 
                          type="number" 
                          tickFormatter={(value) => formatCurrency(value)} 
                          axisLine={{ stroke: theme.palette.divider, strokeWidth: 1.5 }}
                          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                          domain={[0, 'dataMax + 5000000']}
                        />
                        <YAxis 
                          dataKey="nombre" 
                          type="category" 
                          width={120} 
                          axisLine={{ stroke: theme.palette.divider, strokeWidth: 1.5 }}
                          tick={{ fill: theme.palette.text.primary, fontSize: 12, fontWeight: 500 }}
                        />
                        <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                        <Legend wrapperStyle={{ paddingTop: 8 }} />
                        <Bar 
                          dataKey="ventas" 
                          fill={theme.palette.primary.main} 
                          name="Ventas"
                          radius={[0, 6, 6, 0]}
                          background={{ fill: theme.palette.grey[100], radius: [0, 6, 6, 0] }}
                        >
                          <LabelList 
                            dataKey="ventas" 
                            position="right" 
                            formatter={(value) => formatCurrency(value)}
                            style={{ fontWeight: 'bold', fontSize: 11, fill: theme.palette.text.primary }}
                            offset={10}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </AnimatedChartCard>
                </Grid>
                
                {/* 2. Gráfico de barras para ferreterías y multitiendas - Mejorado visualmente */}
                <Grid item xs={12} md={6}>
                  <AnimatedChartCard 
                    title="Ventas por Ferretería y Multitienda" 
                    exportData={[
                      ...data.ferreterias.sucursales,
                      ...data.multitiendas.sucursales
                    ]}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          ...data.ferreterias.sucursales,
                          ...data.multitiendas.sucursales
                        ]}
                        layout="vertical"
                        margin={{ top: 15, right: 45, left: 20, bottom: 5 }}
                        barSize={20}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                        <XAxis 
                          type="number" 
                          tickFormatter={(value) => formatCurrency(value)} 
                          axisLine={{ stroke: theme.palette.divider, strokeWidth: 1.5 }}
                          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                          domain={[0, 'dataMax + 5000000']}
                        />
                        <YAxis 
                          dataKey="nombre" 
                          type="category" 
                          width={120} 
                          axisLine={{ stroke: theme.palette.divider, strokeWidth: 1.5 }}
                          tick={{ fill: theme.palette.text.primary, fontSize: 12, fontWeight: 500 }}
                        />
                        <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                        <Legend 
                          wrapperStyle={{ paddingTop: 8 }}
                          formatter={(value, entry) => {
                            const tipo = entry.dataKey === 'ventas' ? 'Ventas' : entry.dataKey;
                            return tipo;
                          }}
                        />
                        <Bar 
                          dataKey="ventas" 
                          fill={theme.palette.secondary.main} 
                          name="Ventas"
                          radius={[0, 6, 6, 0]}
                          background={{ fill: theme.palette.grey[100], radius: [0, 6, 6, 0] }}
                        >
                          <LabelList 
                            dataKey="ventas" 
                            position="right" 
                            formatter={(value) => formatCurrency(value)}
                            style={{ fontWeight: 'bold', fontSize: 11, fill: theme.palette.text.primary }}
                            offset={10}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </AnimatedChartCard>
                </Grid>
                
                {/* 3. Desglose de Utilidad y Costos por Supermercado */}
                <Grid item xs={12} md={6}>
                  <AnimatedChartCard 
                    title="Desglose de Utilidad y Costos por Supermercado" 
                    height={400}
                    exportData={data.supermercados.sucursales}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.supermercados.sucursales}
                        margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                        layout="vertical"
                        barSize={20}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                        <XAxis 
                          type="number" 
                          tickFormatter={(value) => formatCurrency(value)} 
                          axisLine={{ stroke: theme.palette.divider, strokeWidth: 1.5 }}
                          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                        />
                        <YAxis 
                          dataKey="nombre" 
                          type="category" 
                          width={120} 
                          axisLine={{ stroke: theme.palette.divider, strokeWidth: 1.5 }}
                          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                        />
                        <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                        <Legend 
                          wrapperStyle={{ paddingTop: 20 }}
                          iconType="circle"
                        />
                        <Bar 
                          dataKey="costos" 
                          name="Costos" 
                          fill={theme.palette.error.light}
                          stackId="a"
                          radius={[0, 0, 0, 0]}
                        />
                        <Bar 
                          dataKey="utilidad" 
                          name="Utilidad" 
                          fill={theme.palette.success.light}
                          stackId="a"
                          radius={[0, 4, 4, 0]}
                        >
                          <LabelList 
                            dataKey="ventas" 
                            position="right" 
                            formatter={(value) => `Total: ${formatCurrency(value)}`}
                            style={{ fontWeight: 'bold', fontSize: 11 }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </AnimatedChartCard>
                </Grid>
                
                {/* 4. Desglose de Utilidad y Costos por Ferretería y Multitienda */}
                <Grid item xs={12} md={6}>
                  <AnimatedChartCard 
                    title="Desglose de Utilidad y Costos por Ferretería y Multitienda" 
                    height={400}
                    exportData={[...data.ferreterias.sucursales, ...data.multitiendas.sucursales]}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[...data.ferreterias.sucursales, ...data.multitiendas.sucursales]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                        layout="vertical"
                        barSize={20}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                        <XAxis 
                          type="number" 
                          tickFormatter={(value) => formatCurrency(value)} 
                          axisLine={{ stroke: theme.palette.divider, strokeWidth: 1.5 }}
                          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                        />
                        <YAxis 
                          dataKey="nombre" 
                          type="category" 
                          width={120} 
                          axisLine={{ stroke: theme.palette.divider, strokeWidth: 1.5 }}
                          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                        />
                        <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                        <Legend 
                          wrapperStyle={{ paddingTop: 20 }}
                          iconType="circle"
                        />
                        <Bar 
                          dataKey="costos" 
                          name="Costos" 
                          fill={theme.palette.error.light}
                          stackId="a"
                          radius={[0, 0, 0, 0]}
                        />
                        <Bar 
                          dataKey="utilidad" 
                          name="Utilidad" 
                          fill={theme.palette.success.light}
                          stackId="a"
                          radius={[0, 4, 4, 0]}
                        >
                          <LabelList 
                            dataKey="ventas" 
                            position="right" 
                            formatter={(value) => `Total: ${formatCurrency(value)}`}
                            style={{ fontWeight: 'bold', fontSize: 11 }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </AnimatedChartCard>
                </Grid>
                
                {/* 5. Comparativa de Ventas, Costos y Utilidad - Mejorado visualmente */}
                <Grid item xs={12}>
                  <AnimatedChartCard 
                    title="Comparativa de Ventas, Costos y Utilidad por Tipo de Sucursal" 
                    height={450}
                    exportData={prepareComparativeData()}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={prepareComparativeData()}
                        margin={{ top: 30, right: 30, left: 20, bottom: 30 }}
                        barGap={12}
                        barSize={28}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.4} vertical={false} />
                        <XAxis 
                          dataKey="categoria" 
                          axisLine={{ stroke: theme.palette.divider, strokeWidth: 1.5 }}
                          tick={{ fill: theme.palette.text.primary, fontSize: 13, fontWeight: 500 }}
                          tickLine={false}
                          padding={{ left: 10, right: 10 }}
                        />
                        <YAxis 
                          tickFormatter={(value) => formatCurrency(value)} 
                          axisLine={{ stroke: theme.palette.divider, strokeWidth: 1.5 }}
                          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                          tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                        <Legend 
                          wrapperStyle={{ paddingTop: 25 }}
                          iconType="circle"
                          iconSize={10}
                        />
                        <Bar 
                          dataKey="ventas" 
                          name="Ventas" 
                          fill={theme.palette.primary.main}
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar 
                          dataKey="costos" 
                          name="Costos" 
                          fill={theme.palette.error.main}
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar 
                          dataKey="utilidad" 
                          name="Utilidad" 
                          fill={theme.palette.success.main}
                          radius={[6, 6, 0, 0]}
                        >
                          <LabelList 
                            dataKey="utilidad" 
                            position="top" 
                            formatter={(value) => formatCurrency(value)}
                            style={{ fontWeight: 'bold', fontSize: 12, fill: theme.palette.text.primary }}
                            offset={10}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </AnimatedChartCard>
                </Grid>
                
                {/* 6. Gráfico de líneas para Margen - Mejorado visualmente */}
                <Grid item xs={12}>
                  <AnimatedChartCard 
                    title="Margen por Tipo de Sucursal (%)" 
                    height={450}
                    exportData={prepareComparativeData()}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={prepareComparativeData()}
                        margin={{ top: 30, right: 30, left: 20, bottom: 30 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.4} vertical={false} />
                        <XAxis 
                          dataKey="categoria" 
                          axisLine={{ stroke: theme.palette.divider, strokeWidth: 1.5 }}
                          tick={{ fill: theme.palette.text.primary, fontSize: 13, fontWeight: 500 }}
                          tickLine={false}
                          padding={{ left: 20, right: 20 }}
                        />
                        <YAxis 
                          tickFormatter={(value) => `${value}%`} 
                          domain={[0, 'dataMax + 10']} 
                          axisLine={{ stroke: theme.palette.divider, strokeWidth: 1.5 }}
                          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(value) => [`${value.toFixed(2)}%`, 'Margen']}
                          content={<CustomTooltip />}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: 25 }}
                          iconType="circle" 
                          iconSize={10}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="margen" 
                          name="Margen (%)" 
                          stroke={theme.palette.warning.main} 
                          strokeWidth={4}
                          dot={{ r: 8, fill: theme.palette.warning.main, strokeWidth: 2 }}
                          activeDot={{ r: 10, fill: theme.palette.warning.light }}
                        >
                          <LabelList 
                            dataKey="margen" 
                            position="top" 
                            formatter={(value) => `${value.toFixed(2)}%`}
                            fill={theme.palette.text.primary}
                            fontWeight="bold"
                            fontSize={12}
                            offset={10}
                          />
                        </Line>
                      </LineChart>
                    </ResponsiveContainer>
                  </AnimatedChartCard>
                </Grid>
              </Grid>
            </>
          )}
          
          {/* Panel de Reporte */}
          {activeTab === 1 && (
            <Paper
              elevation={0}
              sx={{ 
                p: 3, 
                mb: 4, 
                border: '1px solid', 
                borderColor: 'divider',
                borderRadius: 2,
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
              }}
            >
              <AutoReport 
                data={data} 
                startDate={startDate} 
                endDate={endDate} 
                loading={loading} 
                formatCurrency={formatCurrency} 
              />
            </Paper>
          )}
        </>
      )}
      
      <ShareDashboardModal 
        open={shareModalOpen}
        handleClose={() => setShareModalOpen(false)}
      />
    </Box>
  );
};

export default DashboardPage;