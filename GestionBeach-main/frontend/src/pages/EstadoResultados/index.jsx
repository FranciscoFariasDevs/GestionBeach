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
  Stack
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

// Componente principal para el Estado de Resultados
const EstadoResultadosPage = () => {
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
      console.log('📦 Cargando compras desde controlador centralizado...');
      
      const comprasResponse = await api.get('/estado-resultados/compras', {
        params: {
          fecha_desde: fechaDesde,
          fecha_hasta: fechaHasta,
          sucursal_id: selectedSucursal,
          razon_social_id: selectedRazonSocial || 'todos'
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
      
      console.log('👥 Cargando remuneraciones CON CLASIFICACIÓN AUTOMÁTICA ADMIN/VENTAS...');
      
      const remuneracionesResponse = await api.get('/estado-resultados/remuneraciones', {
        params: {
          anio: anioSeleccionado,
          mes: mesSeleccionado,
          sucursal_id: selectedSucursal,
          razon_social_id: selectedRazonSocial || 'todos'
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
      console.log('🛒 Cargando ventas para sucursal:', selectedSucursal);
      
      const ventasBody = {
        sucursal_id: parseInt(selectedSucursal),
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
    enqueueSnackbar('Exportando a Excel...', { variant: 'info' });
  };
  
  const handlePrint = () => {
    window.print();
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
        
        <ConfirmDialog />
      </Box>
    </Box>
  );
};

export default EstadoResultadosPage;