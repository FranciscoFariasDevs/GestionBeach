// src/pages/EstadoResultados/index.jsx - VERSIÓN ORIGINAL RESTAURADA CON MEJORAS DE CARGA
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
import { useSnackbar } from 'notistack';
import api from '../../api/api';
import WeatherBar from '../../components/WeatherBar';
import {
  ResultadoLineItem,
  ResultadoSection,
  AnalisisFinanciero,
  EstadoResultadosDetallado
} from './ResultadosComponents';
import DynamicExpenseSection from '../../components/DynamicExpenseSection.jsx';

import {
  mockDataForTesting,
  recalculateTotals,
  crearEstadoResultadosConDatosReales,
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
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Estado para los gastos dinámicos
  const [gastosAdministrativos, setGastosAdministrativos] = useState([]);
  const [gastosVenta, setGastosVenta] = useState([]);
  const [otrosGastos, setOtrosGastos] = useState([]);
  
  // Estado para las pestañas
  const [tabValue, setTabValue] = useState(0);
  
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  
  // Cargar datos iniciales del sistema
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  // Cargar datos cuando cambian los filtros
  useEffect(() => {
    if (selectedSucursal) {
      loadResultadosData();
    }
  }, [selectedMonth, selectedSucursal, selectedRazonSocial]);

  // FUNCIONES DE CARGA DE DATOS CORREGIDAS

  // Función para debugging de APIs
  const debugAPI = async () => {
    console.group('🔧 Debug de APIs');
    
    try {
      // Test básico de conectividad
      const healthCheck = await api.get('/');
      console.log('✅ API conectada:', healthCheck.status);
      
      // Test de endpoints individuales
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

  // Función para cargar compras (usando controlador centralizado)
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
      
      console.log('📥 Respuesta compras (centralizada):', comprasResponse.data);
      
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
      
      // Fallback al método original
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

  // Función para cargar remuneraciones (usando controlador centralizado) CORREGIDA
  const loadRemuneracionesData = async () => {
    try {
      const mesSeleccionado = selectedMonth.getMonth() + 1;
      const anioSeleccionado = selectedMonth.getFullYear();
      
      console.log('👥 Cargando remuneraciones desde controlador centralizado...');
      
      const remuneracionesResponse = await api.get('/estado-resultados/remuneraciones', {
        params: {
          anio: anioSeleccionado,
          mes: mesSeleccionado,
          sucursal_id: selectedSucursal,
          razon_social_id: selectedRazonSocial || 'todos'
        }
      });
      
      console.log('📥 Respuesta remuneraciones (centralizada):', remuneracionesResponse.data);
      
      if (remuneracionesResponse.data.success) {
        const { resumen } = remuneracionesResponse.data.data;
        
        console.log(`✅ Remuneraciones cargadas: ${resumen.cantidad_empleados} empleados`);
        console.log(`💰 Total líquidos: ${resumen.total_liquidos.toLocaleString()}`);
        console.log(`🛡️ Total seguros cesantía: ${resumen.total_seguros_cesantia.toLocaleString()}`);
        
        return { 
          data: remuneracionesResponse.data.data.remuneraciones, 
          total: resumen.total_liquidos,
          seguros_cesantia: resumen.total_seguros_cesantia, // ✅ CAPTURAR SEGUROS
          cantidad: resumen.cantidad_empleados
        };
      }
      
      return { data: [], total: 0, seguros_cesantia: 0, cantidad: 0 };
      
    } catch (error) {
      console.error('❌ Error cargando remuneraciones desde controlador:', error);
      
      // Fallback al método original
      try {
        console.log('🔄 Intentando método fallback para remuneraciones...');
        const mesSeleccionado = selectedMonth.getMonth() + 1;
        const anioSeleccionado = selectedMonth.getFullYear();
        
        const periodosResponse = await api.get('/remuneraciones');
        const periodos = periodosResponse.data?.success ? 
          periodosResponse.data.data : 
          Array.isArray(periodosResponse.data) ? periodosResponse.data : [];

        const periodoCoincidente = periodos.find(periodo => {
          const mesCoincide = Number(periodo.mes) === mesSeleccionado;
          const anioCoincide = Number(periodo.anio || periodo.año) === anioSeleccionado;
          return mesCoincide && anioCoincide;
        });

        if (!periodoCoincidente) {
          console.log(`📅 No hay período de remuneraciones para ${mesSeleccionado}/${anioSeleccionado}`);
          return { data: [], total: 0, seguros_cesantia: 0, cantidad: 0 };
        }

        const detalleResponse = await api.get(`/remuneraciones/${periodoCoincidente.id_periodo || periodoCoincidente.id}/datos`);
        
        if (detalleResponse.data?.success && Array.isArray(detalleResponse.data.data)) {
          let remuneracionesData = detalleResponse.data.data;
          
          if (selectedSucursal) {
            remuneracionesData = remuneracionesData.filter(empleado => {
              const sucursalEmpleado = empleado.id_sucursal || empleado.sucursal_id;
              return !sucursalEmpleado || sucursalEmpleado.toString() === selectedSucursal.toString();
            });
          }
          
          const totalRemuneraciones = remuneracionesData.reduce((sum, empleado) => {
            const liquido = Number(empleado.liquido_pagar || empleado.liquido || 0);
            return sum + liquido;
          }, 0);
          
          // ✅ CALCULAR SEGUROS DE CESANTÍA EN FALLBACK
          const totalSegurosCesantia = remuneracionesData.reduce((sum, empleado) => {
            const seguro = Number(empleado.seguro_cesantia || 0);
            return sum + seguro;
          }, 0);
          
          console.log('✅ Remuneraciones cargadas (fallback):', remuneracionesData.length, 'empleados');
          console.log(`🛡️ Seguros cesantía (fallback): ${totalSegurosCesantia.toLocaleString()}`);
          
          return { 
            data: remuneracionesData, 
            total: totalRemuneraciones, 
            seguros_cesantia: totalSegurosCesantia, // ✅ INCLUIR SEGUROS EN FALLBACK
            cantidad: remuneracionesData.length 
          };
        }
        
        return { data: [], total: 0, seguros_cesantia: 0, cantidad: 0 };
        
      } catch (fallbackError) {
        console.error('❌ Error en fallback de remuneraciones:', fallbackError);
        return { data: [], total: 0, seguros_cesantia: 0, cantidad: 0 };
      }
    }
  };

  // 🔧 FUNCIÓN ORIGINAL RESTAURADA PARA CARGAR VENTAS
  const loadVentasData = async () => {
    try {
      const { fechaDesde, fechaHasta } = obtenerRangoDeFechas(selectedMonth);
      console.log('🛒 Cargando ventas para sucursal:', selectedSucursal);
      
      // ✅ USAR LOS PARÁMETROS CORRECTOS QUE ESPERA EL CONTROLLER ORIGINAL
      const ventasBody = {
        sucursal_id: parseInt(selectedSucursal), // ✅ Nombre correcto
        start_date: fechaDesde,                  // ✅ Nombre correcto  
        end_date: fechaHasta                     // ✅ Nombre correcto
      };
      
      console.log('📤 Enviando datos a /ventas:', ventasBody);
      
      // ✅ EL CONTROLLER ESPERA POST, NO GET
      const ventasResponse = await api.post('/ventas', ventasBody);
      
      console.log('📥 Respuesta ventas (POST):', ventasResponse.data);
      
      let ventasData = [];
      let totalVentas = 0;

      // ✅ PROCESAR RESPUESTA SEGÚN EL FORMATO DEL CONTROLLER
      if (ventasResponse?.data?.success && Array.isArray(ventasResponse.data.ventas)) {
        ventasData = ventasResponse.data.ventas;
        
        // Calcular total de las ventas
        totalVentas = ventasData.reduce((sum, venta) => {
          const monto = Number(venta.Total || venta.total || venta.monto_total || venta.valor_total || 0);
          return sum + monto;
        }, 0);
        
        console.log(`✅ Ventas cargadas: ${ventasData.length} registros, total: ${totalVentas}`);
        
      } else if (Array.isArray(ventasResponse?.data?.ventas)) {
        // Formato directo con array de ventas
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
      
      // Información específica del error para debugging
      if (error.response?.status === 404) {
        console.error('❌ Endpoint /ventas no encontrado - Verificar que el controlador esté registrado');
      } else if (error.response?.status === 400) {
        console.error('❌ Parámetros incorrectos enviados al endpoint /ventas');
      }
      
      return { data: [], total: 0, source: 'error', error: error.message };
    }
  };
  
  // Cargar sucursales y razones sociales disponibles (MEJORADO)
  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);
      
      // 1. SUCURSALES: Intentar múltiples rutas hasta encontrar una que funcione
      let sucursalesCargadas = false;
      
      // Opción 1: Desde facturas XML
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
      
      // Opción 2: Desde sucursales directas (con permisos de usuario)
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
      
      // Opción 3: Datos por defecto si no se puede cargar ninguna
      if (!sucursalesCargadas) {
        const sucursalesDefault = [
          { id: 1, nombre: 'Sucursal Principal', tipo_sucursal: 'PRINCIPAL' },
          { id: 2, nombre: 'Sucursal Secundaria', tipo_sucursal: 'SECUNDARIA' }
        ];
        setSucursalesDisponibles(sucursalesDefault);
        setSelectedSucursal('1');
        console.log('⚠️ Usando sucursales por defecto');
      }

      // 2. RAZONES SOCIALES
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
        // Razones por defecto
        const razonesDefault = [
          { id: 'todos', nombre_razon: 'Todas las Razones Sociales' },
          { id: 1, nombre_razon: 'Razón Social Principal' }
        ];
        setRazonesSocialesDisponibles(razonesDefault);
        setSelectedRazonSocial('todos');
      }

      // 3. CENTROS DE COSTOS
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
        // Centros por defecto
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
      
      // Configurar datos mínimos para que funcione
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
      
      console.log('🔍 Cargando datos para:', {
        sucursal: selectedSucursal,
        fechaDesde,
        fechaHasta,
        mes: selectedMonth.getMonth() + 1,
        año: selectedMonth.getFullYear()
      });

      // Cargar datos de forma secuencial para mejor debugging
      const comprasResult = await loadComprasData();
      const remuneracionesResult = await loadRemuneracionesData();
      const ventasResult = await loadVentasData(); // ✅ Función original restaurada

      console.log('📊 Resumen de datos cargados:', {
        compras: { cantidad: comprasResult.data.length, total: comprasResult.total },
        remuneraciones: { 
          cantidad: remuneracionesResult.data.length, 
          total: remuneracionesResult.total,
          seguros_cesantia: remuneracionesResult.seguros_cesantia || 0
        },
        ventas: { cantidad: ventasResult.data.length, total: ventasResult.total }
      });

      // Construir estado de resultados
      const estadoResultados = construirEstadoResultados({
        compras: comprasResult,
        remuneraciones: remuneracionesResult,
        ventas: ventasResult
      });

      // Actualizar estados
      setDatosReales({
        compras: comprasResult.data,
        remuneraciones: remuneracionesResult.data,
        ventas: ventasResult.data
      });

      setData(estadoResultados);
      initializeExpensesFromData(estadoResultados);
      setHasChanges(false);
      
      // Mensaje informativo
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
      
      // Cargar estructura vacía para que el usuario pueda trabajar
      const estadoVacio = construirEstadoResultados({
        compras: { data: [], total: 0 },
        remuneraciones: { data: [], total: 0 },
        ventas: { data: [], total: 0 }
      });
      
      setData(estadoVacio);
      initializeExpensesFromData(estadoVacio);
      
    } finally {
      setLoading(false);
    }
  };

  // Construir estado de resultados con datos reales CORREGIDO
  const construirEstadoResultados = ({ compras, remuneraciones, ventas }) => {
    const sucursalSeleccionada = sucursalesDisponibles.find(s => s.id.toString() === selectedSucursal);
    
    // CONSTRUCCIÓN MANUAL CORREGIDA para incluir sueldos y seguros específicos
    const totalSueldos = remuneraciones.total || 0;
    const totalSegurosCesantia = remuneraciones.seguros_cesantia || 0; // De nuestro controlador
    
    // Distribución de sueldos (50% administrativos, 50% ventas)
    const sueldosAdministrativos = totalSueldos * 0.5;
    const sueldosVentas = totalSueldos * 0.5;
    
    console.log('🗃️ Construyendo estado de resultados con:', {
      ventas: ventas.total,
      compras: compras.total,
      totalSueldos,
      totalSegurosCesantia,
      sueldosAdministrativos,
      sueldosVentas
    });
    
    // Crear estructura completa del estado de resultados
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
        costoVentas: (compras.total || 0) * 0.81, // 80% como costo directo
        compras: compras.total || 0,
        mermaVenta: 0,
        totalCostos: (compras.total || 0) * 0.81
      },
      
      utilidadBruta: (ventas.total || 0) - ((compras.total || 0) * 0.81),
      
      gastosOperativos: {
        gastosVenta: {
          sueldos: sueldosVentas, // ✅ Sueldos de ventas desde remuneraciones
          fletes: 0,
          finiquitos: 0,
          mantenciones: 0,
          publicidad: 0,
          total: sueldosVentas
        },
        gastosAdministrativos: {
          sueldos: sueldosAdministrativos, // ✅ Sueldos administrativos desde remuneraciones
          seguros: totalSegurosCesantia,   // ✅ Seguros cesantía específicos
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
          total: sueldosAdministrativos + totalSegurosCesantia
        },
        totalGastosOperativos: sueldosVentas + sueldosAdministrativos + totalSegurosCesantia
      },
      
      utilidadOperativa: 0, // Se calculará abajo
      costoArriendo: 0,
      otrosIngresosFinancieros: 0,
      utilidadAntesImpuestos: 0,
      impuestos: 0,
      utilidadNeta: 0,
      
      estado: "borrador",
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: new Date().toISOString(),
      
      // Datos originales con información específica
      datosOriginales: {
        totalCompras: compras.total || 0,
        totalRemuneraciones: totalSueldos,
        totalSegurosCesantia: totalSegurosCesantia, // ✅ Información específica
        totalVentas: ventas.total || 0,
        numeroFacturas: compras.cantidad || 0,
        numeroVentas: ventas.data?.length || 0,
        numeroEmpleados: remuneraciones.cantidad || 0,
        fechaConsulta: new Date().toISOString(),
        sucursal: selectedSucursal,
        periodo: {
          mes: selectedMonth.getMonth() + 1,
          año: selectedMonth.getFullYear()
        }
      }
    };
    
    // Calcular utilidades
    estadoResultados.utilidadOperativa = estadoResultados.utilidadBruta - estadoResultados.gastosOperativos.totalGastosOperativos;
    estadoResultados.utilidadAntesImpuestos = estadoResultados.utilidadOperativa - estadoResultados.costoArriendo + estadoResultados.otrosIngresosFinancieros;
    estadoResultados.impuestos = Math.max(0, Math.round(estadoResultados.utilidadAntesImpuestos * 0.19));
    estadoResultados.utilidadNeta = estadoResultados.utilidadAntesImpuestos - estadoResultados.impuestos;
    
    console.log('✅ Estado de resultados construido:', {
      utilidadBruta: estadoResultados.utilidadBruta,
      gastosOperativos: estadoResultados.gastosOperativos.totalGastosOperativos,
      utilidadOperativa: estadoResultados.utilidadOperativa,
      utilidadNeta: estadoResultados.utilidadNeta
    });
    
    return estadoResultados;
  };
  
  // Inicializar los gastos dinámicos a partir de los datos
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
  
  // Obtener la etiqueta para un tipo de gasto
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
  
  // Actualizar los datos a partir de los gastos dinámicos
  const updateDataFromExpenses = () => {
    if (!data) return null;
    
    const newData = { ...data };
    
    newData.fechaModificacion = new Date().toISOString();
    newData.usuarioModificacion = "usuario_actual";
    
    // Reiniciar gastos manuales
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
    
    // Actualizar con valores dinámicos
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
    
    return recalculateTotals(newData);
  };
  
  // Funciones de manejo de gastos
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
  
  // Actualizar datos cuando cambian gastos
  useEffect(() => {
    if (data && hasChanges) {
      const updatedData = updateDataFromExpenses();
      if (updatedData) {
        setData(updatedData);
      }
    }
  }, [gastosAdministrativos, gastosVenta, otrosGastos, hasChanges]);
  
  // Funciones de acción
  const handleExportExcel = () => {
    enqueueSnackbar('Exportando a Excel...', { variant: 'info' });
  };
  
  const handlePrint = () => {
    window.print();
  };
  
  const handleSaveResultados = () => {
    setLoading(true);
    const updatedData = updateDataFromExpenses();
    
    if (updatedData) {
      setTimeout(() => {
        const newData = { ...updatedData };
        newData.estado = "guardado";
        setData(newData);
        setLoading(false);
        setHasChanges(false);
        enqueueSnackbar('Estado de resultados guardado correctamente', { variant: 'success' });
      }, 800);
    }
  };
  
  const handleSendResultados = () => {
    setConfirmDialog({
      open: true,
      title: "Confirmar Envío",
      message: "Una vez enviado, no podrá modificar los datos. ¿Está seguro de que desea enviar el estado de resultados al sistema?",
      onConfirm: () => {
        setLoading(true);
        const updatedData = updateDataFromExpenses();
        
        if (updatedData) {
          setTimeout(() => {
            const newData = { ...updatedData };
            newData.estado = "enviado";
            newData.fechaEnvio = new Date().toISOString();
            newData.usuarioEnvio = "usuario_actual";
            setData(newData);
            setLoading(false);
            setHasChanges(false);
            enqueueSnackbar('Estado de resultados enviado correctamente', { variant: 'success' });
          }, 1200);
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
  
  // Componente de encabezado mejorado
  const ReportHeader = () => (
    <Fade in={true}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AccountBalanceIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" component="h1" fontWeight="bold">
                Estado de Resultados
              </Typography>
              <Typography variant="subtitle1" color="textSecondary">
                Sistema Integrado de Gestión Financiera
              </Typography>
            </Box>
          </Box>
          
          {data && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={data.estado.toUpperCase()}
                color={
                  data.estado === 'borrador' ? 'warning' :
                  data.estado === 'guardado' ? 'info' : 'success'
                }
                variant="outlined"
              />
              <Tooltip title="Debug APIs">
                <IconButton onClick={debugAPI}>
                  <BugReportIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Exportar a Excel">
                <IconButton onClick={handleExportExcel}>
                  <GetAppIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Imprimir">
                <IconButton onClick={handlePrint}>
                  <PrintIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Ver análisis">
                <IconButton>
                  <AnalyticsIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
        
        {data && (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip
              icon={<AssignmentIcon />}
              label={`${data.sucursal} - ${data.periodo}`}
              variant="outlined"
            />
            {data.datosOriginales && (
              <>
                <Chip
                  label={`${data.datosOriginales.numeroFacturas} Facturas`}
                  size="small"
                  color="info"
                />
                <Chip
                  label={`${data.datosOriginales.numeroVentas} Ventas`}
                  size="small"
                  color="success"
                />
              </>
            )}
          </Box>
        )}
      </Box>
    </Fade>
  );
  
  // Componente de filtros mejorado
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
  
  // Tarjeta de resumen mejorada
  const KeyResultsCard = ({ data }) => (
    <Zoom in={true} style={{ transitionDelay: '150ms' }}>
      <Card sx={{ 
        mb: 4, 
        borderRadius: 3, 
        boxShadow: `0 8px 32px ${theme.palette.primary.main}15`,
        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[50]} 100%)`,
        border: `1px solid ${theme.palette.divider}`
      }}>
        <CardHeader 
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUpIcon sx={{ color: 'success.main' }} />
              <Typography variant="h6" fontWeight="bold">
                Resumen Ejecutivo
              </Typography>
            </Box>
          }
          sx={{ 
            backgroundColor: 'transparent',
            borderBottom: `1px solid ${theme.palette.divider}`,
            pb: 2,
          }}
        />
        <CardContent sx={{ pt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={6} lg={3}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2.5, 
                  borderRadius: 2, 
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.primary.main}25 100%)`,
                  border: `1px solid ${theme.palette.primary.main}30`,
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <Box sx={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}>
                  <TrendingUpIcon sx={{ fontSize: 60 }} />
                </Box>
                <Typography variant="body2" color="textSecondary" fontWeight="medium">
                  Ventas Totales
                </Typography>
                <Typography variant="h5" fontWeight="bold" sx={{ mt: 1, mb: 1 }}>
                  {formatCurrency(data.ingresos.ventas)}
                </Typography>
                <Typography variant="caption" color="success.main" fontWeight="medium">
                  Base de ingresos
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={6} lg={3}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2.5, 
                  borderRadius: 2, 
                  background: `linear-gradient(135deg, ${theme.palette.success.main}15 0%, ${theme.palette.success.main}25 100%)`,
                  border: `1px solid ${theme.palette.success.main}30`,
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <Box sx={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}>
                  <TrendingUpIcon sx={{ fontSize: 60 }} />
                </Box>
                <Typography variant="body2" color="textSecondary" fontWeight="medium">
                  Utilidad Bruta
                </Typography>
                <Typography variant="h5" fontWeight="bold" sx={{ mt: 1, mb: 1 }}>
                  {formatCurrency(data.utilidadBruta)}
                </Typography>
                <Typography variant="caption" color="success.main" fontWeight="medium">
                  {calcularPorcentaje(data.utilidadBruta, data.ingresos.ventas)}%
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={6} lg={3}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2.5, 
                  borderRadius: 2, 
                  background: `linear-gradient(135deg, ${theme.palette.warning.main}15 0%, ${theme.palette.warning.main}25 100%)`,
                  border: `1px solid ${theme.palette.warning.main}30`,
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <Box sx={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}>
                  <TrendingDownIcon sx={{ fontSize: 60 }} />
                </Box>
                <Typography variant="body2" color="textSecondary" fontWeight="medium">
                  Gastos Operativos
                </Typography>
                <Typography variant="h5" fontWeight="bold" sx={{ mt: 1, mb: 1 }}>
                  {formatCurrency(data.gastosOperativos.totalGastosOperativos)}
                </Typography>
                <Typography variant="caption" color="warning.main" fontWeight="medium">
                  {calcularPorcentaje(data.gastosOperativos.totalGastosOperativos, data.ingresos.ventas)}%
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={6} lg={3}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2.5, 
                  borderRadius: 2, 
                  background: `linear-gradient(135deg, ${theme.palette.secondary.main}15 0%, ${theme.palette.secondary.main}25 100%)`,
                  border: `1px solid ${theme.palette.secondary.main}30`,
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <Box sx={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}>
                  <AccountBalanceIcon sx={{ fontSize: 60 }} />
                </Box>
                <Typography variant="body2" color="textSecondary" fontWeight="medium">
                  Utilidad Neta
                </Typography>
                <Typography variant="h5" fontWeight="bold" sx={{ mt: 1, mb: 1 }}>
                  {formatCurrency(data.utilidadNeta)}
                </Typography>
                <Typography variant="caption" color="secondary.main" fontWeight="medium">
                  {calcularPorcentaje(data.utilidadNeta, data.ingresos.ventas)}%
                </Typography>
              </Paper>
            </Grid>
          </Grid>
          
          {/* Datos adicionales del período */}
          {data.datosOriginales && (
            <Box sx={{ mt: 3, pt: 3, borderTop: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Información del Período
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color="textSecondary">
                      Compras:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(data.datosOriginales.totalCompras)}
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color="textSecondary">
                      Remuneraciones:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(data.datosOriginales.totalRemuneraciones)}
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color="textSecondary">
                      Nº Facturas:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {data.datosOriginales.numeroFacturas}
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color="textSecondary">
                      Nº Ventas:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {data.datosOriginales.numeroVentas}
                    </Typography>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          )}
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
    </Zoom>
  );

  // Diálogo de confirmación
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
  
  // Renderizado principal
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
                <EstadoResultadosDetallado data={data} />
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
