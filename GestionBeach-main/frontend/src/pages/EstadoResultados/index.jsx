// src/pages/EstadoResultados/index.jsx - Versión Mejorada con Integración Real
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [sucursalesDisponibles, setSucursalesDisponibles] = useState([]);
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
  }, [selectedMonth, selectedSucursal]);
  
  // Cargar sucursales y centros de costos disponibles
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

      // 2. CENTROS DE COSTOS
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
  
  // Cargar datos del estado de resultados
  const loadResultadosData = async () => {
    if (!selectedSucursal) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { fechaDesde, fechaHasta } = obtenerRangoDeFechas(selectedMonth);
      
      console.log('🔍 Cargando datos para:', {
        sucursal: selectedSucursal,
        fechaDesde,
        fechaHasta
      });

      // 1. COMPRAS: Facturas XML procesadas CON FILTRO DE SUCURSAL
      const comprasPromise = api.get('/facturas-xml', {
        params: {
          fecha_desde: fechaDesde,
          fecha_hasta: fechaHasta,
          id_sucursal: selectedSucursal, // CORRECCIÓN: Usar id_sucursal en lugar de sucursal
          estado: 'PROCESADA',
          page: 1,
          limit: 1000
        }
      }).then(response => {
        // VALIDACIÓN ADICIONAL: Filtrar en frontend por si el backend no filtra correctamente
        if (response.data.success && Array.isArray(response.data.data)) {
          const facturasFiltradas = response.data.data.filter(factura => 
            factura.id_sucursal && factura.id_sucursal.toString() === selectedSucursal
          );
          
          console.log(`🏢 Facturas filtradas por sucursal ${selectedSucursal}:`, facturasFiltradas.length);
          
          return {
            data: {
              success: true,
              data: facturasFiltradas,
              pagination: { totalRecords: facturasFiltradas.length }
            }
          };
        }
        return response;
      }).catch(error => {
        console.warn('⚠️ Error en compras:', error.message);
        return { data: { success: true, data: [], pagination: { totalRecords: 0 } } };
      });

      // 2. REMUNERACIONES: Solo del período específico (sin filtro de sucursal por ahora)
      const mesSeleccionado = selectedMonth.getMonth() + 1;
      const anioSeleccionado = selectedMonth.getFullYear();
      
      const remuneracionesPromise = api.get('/remuneraciones').then(async (periodosRes) => {
        if (!periodosRes.data.success) return { data: { success: true, data: [] } };
        
        // Buscar período que coincida con mes/año seleccionado
        const periodoCoincidente = periodosRes.data.data.find(periodo => 
          periodo.mes === mesSeleccionado && periodo.anio === anioSeleccionado
        );
        
        if (!periodoCoincidente) {
          console.log('📅 No hay período de remuneraciones para:', mesSeleccionado, anioSeleccionado);
          return { data: { success: true, data: [], total_periodo: 0 } };
        }
        
        // Obtener datos detallados del período
        try {
          const datosRes = await api.get(`/remuneraciones/${periodoCoincidente.id_periodo}/datos`);
          
          // TODO: Si tienes campo sucursal en remuneraciones, filtrar aquí también
          // const empleadosFiltrados = datosRes.data.data.filter(empleado => 
          //   empleado.id_sucursal && empleado.id_sucursal.toString() === selectedSucursal
          // );
          
          return { 
            data: { 
              success: true, 
              data: datosRes.data.data, // Por ahora sin filtro de sucursal
              total_periodo: periodoCoincidente.suma_liquidos || 0
            } 
          };
        } catch (detailError) {
          console.warn('⚠️ Error obteniendo detalles de remuneraciones:', detailError.message);
          return { 
            data: { 
              success: true, 
              data: [], 
              total_periodo: periodoCoincidente.suma_liquidos || 0 
            } 
          };
        }
      }).catch(error => {
        console.warn('⚠️ Error en remuneraciones:', error.message);
        return { data: { success: true, data: [], total_periodo: 0 } };
      });

      // 3. VENTAS: CON FILTRO DE SUCURSAL EXPLÍCITO
      const ventasPromise = api.post('/ventas', {
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        sucursal: parseInt(selectedSucursal), // Asegurar que sea número
        id_sucursal: parseInt(selectedSucursal) // Por si usa este campo
      }).then(response => {
        if (response.data.success && Array.isArray(response.data.data)) {
          // VALIDACIÓN ADICIONAL: Filtrar en frontend por si el backend no filtra
          const ventasFiltradas = response.data.data.filter(venta => {
            // Verificar diferentes posibles campos de sucursal
            const sucursalVenta = venta.id_sucursal || venta.sucursal || venta.sucursal_id;
            return sucursalVenta && sucursalVenta.toString() === selectedSucursal;
          });
          
          console.log(`🏢 Ventas filtradas por sucursal ${selectedSucursal}:`, ventasFiltradas.length);
          
          return {
            data: {
              success: true,
              data: ventasFiltradas
            }
          };
        }
        return response;
      }).catch(error => {
        console.warn('⚠️ Error en ventas:', error.message);
        return { data: { success: true, data: [] } };
      });

      // Ejecutar todas las consultas en paralelo
      const [comprasRes, remuneracionesRes, ventasRes] = await Promise.allSettled([
        comprasPromise,
        remuneracionesPromise,
        ventasPromise
      ]);

      // Procesar resultados de forma segura
      let comprasData = [];
      let totalCompras = 0;
      if (comprasRes.status === 'fulfilled' && comprasRes.value?.data?.success) {
        comprasData = comprasRes.value.data.data || [];
        totalCompras = comprasData.reduce((sum, factura) => sum + (Number(factura.monto_total) || 0), 0);
        
        // LOG DE VALIDACIÓN: Verificar que todas las facturas son de la sucursal correcta
        const facturasIncorrectas = comprasData.filter(f => f.id_sucursal && f.id_sucursal.toString() !== selectedSucursal);
        if (facturasIncorrectas.length > 0) {
          console.warn(`⚠️ ${facturasIncorrectas.length} facturas no corresponden a la sucursal ${selectedSucursal}`);
        }
      }
      
      let remuneracionesData = [];
      let totalRemuneraciones = 0;
      if (remuneracionesRes.status === 'fulfilled' && remuneracionesRes.value?.data?.success) {
        remuneracionesData = remuneracionesRes.value.data.data || [];
        totalRemuneraciones = remuneracionesRes.value.data.total_periodo || 
                             remuneracionesData.reduce((sum, empleado) => sum + (Number(empleado.liquido_pagar) || 0), 0);
      }
      
      let ventasData = [];
      let totalVentas = 0;
      if (ventasRes.status === 'fulfilled' && ventasRes.value?.data?.success) {
        ventasData = ventasRes.value.data.data || [];
        totalVentas = ventasData.reduce((sum, venta) => {
          return sum + (Number(venta.total) || Number(venta.monto_total) || Number(venta.valor_total) || 0);
        }, 0);
        
        // LOG DE VALIDACIÓN: Verificar que todas las ventas son de la sucursal correcta
        const ventasIncorrectas = ventasData.filter(v => {
          const sucursalVenta = v.id_sucursal || v.sucursal || v.sucursal_id;
          return sucursalVenta && sucursalVenta.toString() !== selectedSucursal;
        });
        if (ventasIncorrectas.length > 0) {
          console.warn(`⚠️ ${ventasIncorrectas.length} ventas no corresponden a la sucursal ${selectedSucursal}`);
        }
      }

      console.log('📊 Datos procesados por sucursal:', {
        sucursal: selectedSucursal,
        compras: { total: totalCompras, cantidad: comprasData.length },
        remuneraciones: { total: totalRemuneraciones, cantidad: remuneracionesData.length },
        ventas: { total: totalVentas, cantidad: ventasData.length }
      });

      // Construir el estado de resultados con datos reales
      const estadoResultados = construirEstadoResultados({
        compras: { data: comprasData, total: totalCompras },
        remuneraciones: { data: remuneracionesData, total: totalRemuneraciones },
        ventas: { data: ventasData, total: totalVentas }
      });

      setDatosReales({
        compras: comprasData,
        remuneraciones: remuneracionesData,
        ventas: ventasData
      });

      setData(estadoResultados);
      initializeExpensesFromData(estadoResultados);
      setHasChanges(false);
      
      // Mostrar mensaje específico por sucursal
      const sucursalNombre = sucursalesDisponibles.find(s => s.id.toString() === selectedSucursal)?.nombre || selectedSucursal;
      
      if (totalVentas === 0 && totalCompras === 0 && totalRemuneraciones === 0) {
        enqueueSnackbar(`Sin datos para ${sucursalNombre} en el período seleccionado`, { 
          variant: 'info',
          autoHideDuration: 4000 
        });
      } else {
        const mensaje = `${sucursalNombre}: ${totalVentas > 0 ? 'Ventas ✓' : 'Sin ventas'} | ${totalCompras > 0 ? 'Compras ✓' : 'Sin compras'} | ${totalRemuneraciones > 0 ? 'Remuneraciones ✓' : 'Sin remuneraciones'}`;
        enqueueSnackbar(mensaje, { variant: 'success' });
      }
      
    } catch (err) {
      console.error('❌ Error crítico al cargar datos:', err);
      setError('Error al cargar los datos del sistema. Verifique la conexión.');
      enqueueSnackbar('Error al conectar con el servidor', { 
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

  // Construir estado de resultados con datos reales
  const construirEstadoResultados = ({ compras, remuneraciones, ventas }) => {
    const sucursalSeleccionada = sucursalesDisponibles.find(s => s.id.toString() === selectedSucursal);
    
    // Usar la nueva función que solo maneja datos reales
    const datosReales = {
      ventas: {
        total: ventas.total || 0,
        cantidad: ventas.data?.length || 0
      },
      compras: {
        total: compras.total || 0,
        cantidad: compras.data?.length || 0
      },
      remuneraciones: {
        total: remuneraciones.total || 0,
        cantidad: remuneraciones.data?.length || 0
      }
    };
    
    console.log('🏗️ Construyendo estado de resultados con:', datosReales);
    
    const estadoResultados = crearEstadoResultadosConDatosReales(datosReales);
    
    // Completar información del período
    estadoResultados.sucursal = sucursalSeleccionada?.nombre || 'Sucursal Desconocida';
    estadoResultados.periodo = selectedMonth.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
    
    // Agregar información adicional de origen
    estadoResultados.datosOriginales = {
      totalCompras: compras.total || 0,
      totalRemuneraciones: remuneraciones.total || 0,
      totalVentas: ventas.total || 0,
      numeroFacturas: compras.data?.length || 0,
      numeroVentas: ventas.data?.length || 0,
      numeroEmpleados: remuneraciones.data?.length || 0,
      fechaConsulta: new Date().toISOString(),
      sucursal: selectedSucursal,
      periodo: {
        mes: selectedMonth.getMonth() + 1,
        año: selectedMonth.getFullYear()
      }
    };
    
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
          <Grid item xs={12} sm={4}>
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
          
          <Grid item xs={12} sm={4}>
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
          
          <Grid item xs={12} sm={4}>
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