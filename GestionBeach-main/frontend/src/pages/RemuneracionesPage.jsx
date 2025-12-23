// RemuneracionesPage.jsx - VERSIÓN COMPLETA SIN ASIGNACIÓN DE SUCURSALES
// Las sucursales se asignan en el Módulo de Empleados
import React, { useState, useEffect, useCallback } from 'react';
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
  TextField,
  Snackbar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Switch,
  FormControlLabel,
  Badge,
  CardHeader,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  Autocomplete,
  Checkbox,
  FormGroup,
  TablePagination,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  People as PeopleIcon,
  AttachMoney as AttachMoneyIcon,
  CalendarToday as CalendarTodayIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Download as DownloadIcon,
  Business as BusinessIcon,
  Analytics as AnalyticsIcon,
  Timeline as TimelineIcon,
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  VerifiedUser as VerifiedUserIcon,
  BugReport as BugReportIcon,
  DataUsage as DataUsageIcon,
  PieChart as PieChartIcon,
  Info as InfoIcon,
  FilterList as FilterListIcon,
  ClearAll as ClearAllIcon,
  Assignment as AssignmentIcon,
  PersonAdd as PersonAddIcon,
  Store as StoreIcon,
  AccountTree as AccountTreeIcon,
  Apartment as ApartmentIcon,
  Percent as PercentIcon,
  Upload as UploadIcon,
  AutoFixHigh as AutoFixHighIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import api from '../api/api';

// CONFIGURACIÓN COMPLETA - API centralizada con endpoints para porcentajes
const remuneracionesAPI = {
  test: () => api.get('/remuneraciones/test'),
  obtenerPeriodos: (filtros = {}) => api.get('/remuneraciones', { params: filtros }),
  obtenerPeriodoPorId: (id) => api.get(`/remuneraciones/${id}`),
  obtenerOpcionesFiltros: () => api.get('/remuneraciones/opciones-filtros'),
  crearPeriodo: (datos) => api.post('/remuneraciones/periodo', datos),
  actualizarPeriodo: (id, datos) => api.put(`/remuneraciones/${id}`, datos),
  eliminarPeriodo: (id) => api.delete(`/remuneraciones/${id}`),
  obtenerDatosPeriodo: (id) => api.get(`/remuneraciones/${id}/datos`),
  obtenerAnalisisPeriodo: (id) => api.get(`/remuneraciones/${id}/analisis`),
  obtenerEstadisticas: () => api.get('/remuneraciones/estadisticas'),
  validarExcel: (datos) => api.post('/remuneraciones/validar-excel', datos),
  procesarExcel: (datos) => api.post('/remuneraciones/procesar-excel', datos),
  // NUEVOS ENDPOINTS PARA PORCENTAJES
  obtenerPorcentajesPorPeriodo: (id_periodo, id_razon_social) => api.get(`/remuneraciones/porcentajes/${id_periodo}/${id_razon_social}`),
  guardarPorcentajesPorPeriodo: (datos) => api.post('/remuneraciones/porcentajes', datos)
};

// API para razones sociales y sucursales
const catalogosAPI = {
  getRazonesSociales: () => api.get('/razonessociales'),
  getSucursales: () => api.get('/sucursales')
};

// 🔥 CAMBIO: Pasos sin asignación de empleados
const pasosCarga = [
  'Seleccionar Período',
  'Cargar Archivo',
  'Análisis Automático',
  'Configurar Mapeo',
  'Configurar Porcentajes OBLIGATORIO',
  'Procesar Nómina'
];

const RemuneracionesPage = () => {
  // ESTADOS PRINCIPALES
  const [periodos, setPeriodos] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // ESTADOS PARA FILTROS
  const [filtros, setFiltros] = useState({
    razon_social_id: 'todos',
    sucursal_id: 'todos', 
    anio: 'todos',
    estado: 'todos'
  });
  const [opcionesFiltros, setOpcionesFiltros] = useState({
    anios: [],
    razones_sociales: [],
    sucursales: []
  });
  
  // Estados para Excel con mejor gestión
  const [openExcelDialog, setOpenExcelDialog] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [excelData, setExcelData] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  
  // Estados para análisis profesional mejorados
  const [activeStep, setActiveStep] = useState(0);
  const [viewMode, setViewMode] = useState('grouped');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [analisisExcel, setAnalisisExcel] = useState(null);
  const [mapeoColumnas, setMapeoColumnas] = useState({});
  const [columnasDetectadas, setColumnasDetectadas] = useState([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('');
  
  // NUEVOS ESTADOS PARA PORCENTAJES OBLIGATORIOS
  const [razonSocialSeleccionada, setRazonSocialSeleccionada] = useState('');
  const [porcentajes, setPorcentajes] = useState({
    caja_compen: '',
    afc: '',
    sis: '',
    ach: '',
    imposiciones: ''
  });
  const [porcentajesValidos, setPorcentajesValidos] = useState(false);
  const [porcentajesExistentes, setPorcentajesExistentes] = useState(null);
  
  // 🔥 REMOVIDO: Estados para modal de asignación
  const [razonesSociales, setRazonesSociales] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [resultadoProcesamiento, setResultadoProcesamiento] = useState(null);
  
  // Estados para dialogs profesionales
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openAnalysisDialog, setOpenAnalysisDialog] = useState(false);
  const [openCreatePeriodoDialog, setOpenCreatePeriodoDialog] = useState(false);
  const [selectedPeriodo, setSelectedPeriodo] = useState(null);
  const [reporteAnalisis, setReporteAnalisis] = useState(null);
  
  // Estados para crear período
  const [nuevoPeriodo, setNuevoPeriodo] = useState({
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
    descripcion: ''
  });
  
  // Estados para tabs y configuración avanzada
  const [tabValue, setTabValue] = useState(0);
  const [validarDuplicados, setValidarDuplicados] = useState(true);
  
  // Estados para paginación de empleados optimizados
  const [filtroEmpleados, setFiltroEmpleados] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [empleadosPorPagina, setEmpleadosPorPagina] = useState(50);
  
  // NUEVOS ESTADOS PARA FILTRADO ESPECÍFICO
  const [filtroRazonSocialDetalle, setFiltroRazonSocialDetalle] = useState('todos');
  const [filtroSucursalDetalle, setFiltroSucursalDetalle] = useState('todos');

  // 🔥 NUEVO: Filtro de período
  const [filtroPeriodo, setFiltroPeriodo] = useState(null);
  
  // Estados para Snackbar mejorado
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // 🔥 MODAL UNIFICADO: Para empleados sin sucursal Y empleados que no existen
  const [openValidacionUnificadaDialog, setOpenValidacionUnificadaDialog] = useState(false);
  const [empleadosSinSucursal, setEmpleadosSinSucursal] = useState([]);
  const [empleadosNoEncontrados, setEmpleadosNoEncontrados] = useState([]);
  const [datosEmpleados, setDatosEmpleados] = useState({}); // Para ambos casos

  // 🔥 NUEVO: Detalles de empleado individual
  const [openDetalleEmpleadoDialog, setOpenDetalleEmpleadoDialog] = useState(false);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);

  // FUNCIÓN SHOWSNACKBAR
  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: false, message: '', severity: 'success' });
    
    setTimeout(() => {
      setSnackbar({ 
        open: true, 
        message: message.length > 300 ? message.substring(0, 300) + '...' : message, 
        severity 
      });
    }, 100);
  }, []);

  // FUNCIÓN CRÍTICA: LIMPIAR UNICODE EN FRONTEND
  const limpiarUnicode = (texto) => {
    if (!texto) return '';
    
    return String(texto)
      .normalize('NFD')
      .replace(/ÃƒÂ±/g, 'ñ')
      .replace(/ÃƒÂ¡/g, 'á')
      .replace(/ÃƒÂ©/g, 'é')
      .replace(/ÃƒÂ­/g, 'í')
      .replace(/ÃƒÂ³/g, 'ó')
      .replace(/ÃƒÂº/g, 'ú')
      .replace(/Ãƒ/g, 'Ñ')
      .replace(/Ãƒ/g, 'Á')
      .replace(/Ãƒâ€°/g, 'É')
      .replace(/Ãƒ/g, 'Í')
      .replace(/Ãƒ"/g, 'Ó')
      .replace(/ÃƒÅ¡/g, 'Ú')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // FUNCIÓN CRÍTICA: PROCESAR VALORES MONETARIOS CHILENOS SIN TRUNCAR
  const procesarValorMonetarioChileno = (valor) => {
    if (!valor || valor === '' || valor === null || valor === undefined) return '0';
    
    let valorString = String(valor).trim();
    valorString = limpiarUnicode(valorString);
    valorString = valorString.replace(/[^\d.,-]/g, '');
    
    if (!valorString) return '0';
    
    if (valorString.includes(',') && valorString.includes('.')) {
      const ultimaComa = valorString.lastIndexOf(',');
      const ultimoPunto = valorString.lastIndexOf('.');
      
      if (ultimoPunto > ultimaComa) {
        valorString = valorString.replace(/,/g, '');
      } else {
        valorString = valorString.replace(/\./g, '').replace(',', '.');
      }
    } else if (valorString.includes(',')) {
      const partes = valorString.split(',');
      if (partes.length === 2 && partes[1].length <= 2) {
        valorString = valorString.replace(',', '.');
      } else {
        valorString = valorString.replace(/,/g, '');
      }
    } else if (valorString.includes('.')) {
      const partes = valorString.split('.');
      if (partes.length === 2 && partes[1].length <= 2 && partes[0].length <= 6) {
        // Mantener como está
      } else {
        valorString = valorString.replace(/\./g, '');
      }
    }
    
    const numero = parseFloat(valorString);
    
    if (isNaN(numero) || !isFinite(numero)) {
      console.warn(`Valor no convertible: "${valor}" -> "0"`);
      return '0';
    }
    
    return numero.toString();
  };

  // FUNCIONES DE CARGA MEJORADAS CON MANEJO DE ERRORES
  const testConexion = useCallback(async () => {
    try {
      console.log('Iniciando test de conexión...');
      const response = await remuneracionesAPI.test();
      console.log('Test de conexión exitoso:', response.data);
      
      if (!response.data.success) {
        setError('Error en la conexión a la base de datos');
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error en test de conexión:', err);
      const errorMsg = err.response?.data?.message || 'No se puede conectar con el servidor de remuneraciones';
      setError(errorMsg);
      showSnackbar(errorMsg, 'error');
      return false;
    }
  }, [showSnackbar]);

  // CARGAR OPCIONES PARA FILTROS
  const cargarOpcionesFiltros = useCallback(async () => {
    try {
      console.log('Cargando opciones para filtros...');
      const response = await remuneracionesAPI.obtenerOpcionesFiltros();
      
      if (response.data.success) {
        setOpcionesFiltros(response.data.data);
        console.log('Opciones de filtros cargadas:', response.data.data);
      }
    } catch (err) {
      console.error('Error al cargar opciones de filtros:', err);
    }
  }, []);

  // CARGAR CATÁLOGOS
  const cargarCatalogos = useCallback(async () => {
    try {
      console.log('Cargando catálogos...');
      const [razonesResponse, sucursalesResponse] = await Promise.all([
        catalogosAPI.getRazonesSociales(),
        catalogosAPI.getSucursales()
      ]);
      
      setRazonesSociales(razonesResponse.data || []);
      setSucursales(sucursalesResponse.data || []);
      console.log('Catálogos cargados');
    } catch (err) {
      console.error('Error al cargar catálogos:', err);
    }
  }, []);

  const cargarPeriodos = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Cargando períodos con filtros:', filtros);
      
      const response = await remuneracionesAPI.obtenerPeriodos(filtros);
      
      if (response.data.success) {
        setPeriodos(response.data.data || []);
        console.log(`${response.data.data?.length || 0} períodos cargados`);
      } else {
        throw new Error(response.data.message || 'Error al cargar períodos');
      }
    } catch (err) {
      console.error('Error al cargar períodos:', err);
      const errorMsg = err.response?.data?.message || 'Error al cargar períodos de remuneraciones';
      setError(errorMsg);
      showSnackbar(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  }, [filtros, showSnackbar]);

  const cargarEstadisticas = useCallback(async () => {
    try {
      console.log('Cargando estadísticas...');
      const response = await remuneracionesAPI.obtenerEstadisticas();
      
      if (response.data.success) {
        setEstadisticas(response.data.data);
        console.log('Estadísticas cargadas:', response.data.data);
      } else {
        console.warn('Error en estadísticas:', response.data.message);
      }
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
    }
  }, []);

  // EFFECT MEJORADO
  useEffect(() => {
    const inicializar = async () => {
      console.log('Inicializando RemuneracionesPage...');
      
      const conexionOk = await testConexion();
      if (conexionOk) {
        await Promise.all([
          cargarOpcionesFiltros(),
          cargarCatalogos(),
          cargarEstadisticas()
        ]);
      }
    };

    inicializar();
  }, [testConexion, cargarOpcionesFiltros, cargarCatalogos, cargarEstadisticas]);

  // EFFECT PARA RECARGAR PERÍODOS
  useEffect(() => {
    cargarPeriodos();
  }, [cargarPeriodos]);

  // 🔥 FUNCIÓN UNIFICADA: Verificar empleados sin sucursal al cargar
  const verificarEmpleadosSinSucursal = useCallback(async () => {
    try {
      console.log('🔍 Verificando empleados sin sucursal...');
      // NOTA: Endpoint deshabilitado temporalmente - verificación ocurre durante el procesamiento
      // const response = await api.get('/empleados/sin-sucursal');
      // if (response.data.success && response.data.data && response.data.data.length > 0) {
      //   console.log(`⚠️ Se encontraron ${response.data.data.length} empleados sin sucursal`);
      //   setEmpleadosSinSucursal(response.data.data);
      //   setEmpleadosNoEncontrados([]);
      //   setOpenValidacionUnificadaDialog(true);
      //   showSnackbar(`Atención: ${response.data.data.length} empleado(s) sin sucursal asignada.`, 'warning');
      // } else {
      //   console.log('✅ Todos los empleados tienen sucursal asignada');
      // }
    } catch (err) {
      console.error('Error al verificar empleados sin sucursal:', err);
      // No mostrar error al usuario si falla esta verificación
    }
  }, [showSnackbar]);

  // EFFECT PARA VERIFICAR EMPLEADOS SIN SUCURSAL AL CARGAR
  useEffect(() => {
    if (periodos.length > 0) {
      verificarEmpleadosSinSucursal();
    }
  }, [periodos, verificarEmpleadosSinSucursal]);

  // 🔥 FUNCIÓN UNIFICADA: Manejar cambios en datos de empleados
  const handleDatosEmpleadoChange = (identificador, campo, valor) => {
    setDatosEmpleados(prev => ({
      ...prev,
      [identificador]: {
        ...prev[identificador],
        [campo]: valor
      }
    }));
  };

  // 🔥 FUNCIÓN UNIFICADA: Guardar empleados (crear Y asignar sucursales)
  const guardarEmpleadosUnificado = async () => {
    try {
      setLoading(true);

      let mensajesExito = [];

      // 1. CREAR empleados que no existen
      if (empleadosNoEncontrados.length > 0) {
        // Validar que todos tengan razón social y sucursales
        const faltanDatos = empleadosNoEncontrados.filter(emp => {
          const datos = datosEmpleados[emp.rut];
          return !datos || !datos.id_razon_social || !datos.sucursales || datos.sucursales.length === 0;
        });

        if (faltanDatos.length > 0) {
          showSnackbar('Todos los empleados nuevos deben tener razón social y al menos una sucursal', 'warning');
          return;
        }

        // Crear empleados
        const empleadosACrear = empleadosNoEncontrados.map(emp => ({
          rut: emp.rut,
          nombre_completo: emp.nombre_completo,
          ...datosEmpleados[emp.rut]
        }));

        console.log('Creando empleados:', empleadosACrear);
        const responseCrear = await api.post('/empleados/crear-multiple', { empleados: empleadosACrear });

        if (responseCrear.data.success) {
          mensajesExito.push(`${empleadosACrear.length} empleado(s) creado(s)`);
        } else {
          throw new Error(responseCrear.data.message || 'Error al crear empleados');
        }
      }

      // 2. ASIGNAR sucursales a empleados existentes sin sucursal
      if (empleadosSinSucursal.length > 0) {
        // Validar que todos tengan al menos una sucursal
        const faltanSucursales = empleadosSinSucursal.filter(emp => {
          const datos = datosEmpleados[emp.id_empleado];
          return !datos || !datos.sucursales || datos.sucursales.length === 0;
        });

        if (faltanSucursales.length > 0) {
          showSnackbar('Todos los empleados deben tener al menos una sucursal asignada', 'warning');
          return;
        }

        // Asignar sucursales
        const asignaciones = empleadosSinSucursal.map(emp => ({
          id_empleado: emp.id_empleado,
          sucursales: datosEmpleados[emp.id_empleado].sucursales
        }));

        console.log('Asignando sucursales:', asignaciones);
        const responseAsignar = await api.post('/empleados/asignar-sucursales', { asignaciones });

        if (responseAsignar.data.success) {
          mensajesExito.push(`Sucursales asignadas a ${asignaciones.length} empleado(s)`);
        } else {
          throw new Error(responseAsignar.data.message || 'Error al asignar sucursales');
        }
      }

      // Mostrar mensaje de éxito y cerrar modal
      showSnackbar(mensajesExito.join(' y '), 'success');
      setOpenValidacionUnificadaDialog(false);
      setEmpleadosSinSucursal([]);
      setEmpleadosNoEncontrados([]);
      setDatosEmpleados({});

      // Recargar períodos
      await cargarPeriodos();

      // Si venimos de procesar nómina, continuar
      if (empleadosNoEncontrados.length > 0) {
        procesarExcel();
      }
    } catch (err) {
      console.error('Error al guardar empleados:', err);
      showSnackbar(err.response?.data?.message || 'Error al guardar empleados', 'error');
    } finally {
      setLoading(false);
    }
  };

  // FUNCIONES PARA MANEJO DE FILTROS
  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const limpiarFiltros = () => {
    setFiltros({
      razon_social_id: 'todos',
      sucursal_id: 'todos',
      anio: 'todos', 
      estado: 'todos'
    });
  };

  // NUEVAS FUNCIONES PARA GESTIÓN DE PORCENTAJES
  const cargarPorcentajesExistentes = async (id_periodo, id_razon_social) => {
    if (!id_periodo || !id_razon_social) return;
    
    try {
      console.log(`Cargando porcentajes existentes para período ${id_periodo} y razón social ${id_razon_social}`);
      
      const response = await remuneracionesAPI.obtenerPorcentajesPorPeriodo(id_periodo, id_razon_social);
      
      if (response.data.success && response.data.data) {
        const porcentajesDB = response.data.data;
        setPorcentajesExistentes(porcentajesDB);
        setPorcentajes({
          caja_compen: porcentajesDB.caja_compen || '',
          afc: porcentajesDB.afc || '',
          sis: porcentajesDB.sis || '',
          ach: porcentajesDB.ach || '',
          imposiciones: porcentajesDB.imposiciones || ''
        });
        console.log('Porcentajes existentes cargados:', porcentajesDB);
        showSnackbar('Porcentajes existentes cargados desde la base de datos', 'info');
      } else {
        setPorcentajesExistentes(null);
        setPorcentajes({
          caja_compen: '',
          afc: '',
          sis: '',
          ach: '',
          imposiciones: ''
        });
        console.log('No hay porcentajes existentes, se debe configurar');
      }
    } catch (error) {
      console.error('Error cargando porcentajes existentes:', error);
      setPorcentajesExistentes(null);
    }
  };

  const validarPorcentajes = () => {
    const { caja_compen, afc, sis, ach, imposiciones } = porcentajes;
    
    const porcentajesValores = [caja_compen, afc, sis, ach, imposiciones];
    const algunoValido = porcentajesValores.some(p => {
      const numero = parseFloat(p);
      return !isNaN(numero) && numero >= 0 && numero <= 100;
    });
    
    setPorcentajesValidos(algunoValido);
    return algunoValido;
  };

  const handlePorcentajeChange = (campo, valor) => {
    if (valor === '' || (!isNaN(parseFloat(valor)) && parseFloat(valor) >= 0 && parseFloat(valor) <= 100)) {
      setPorcentajes(prev => ({
        ...prev,
        [campo]: valor
      }));
    }
  };

  useEffect(() => {
    validarPorcentajes();
  }, [porcentajes]);

  // CREAR NUEVO PERÍODO MEJORADO
  const crearPeriodo = async () => {
    if (!nuevoPeriodo.mes || !nuevoPeriodo.anio) {
      showSnackbar('Mes y año son obligatorios', 'error');
      return;
    }

    if (nuevoPeriodo.mes < 1 || nuevoPeriodo.mes > 12) {
      showSnackbar('El mes debe estar entre 1 y 12', 'error');
      return;
    }

    if (nuevoPeriodo.anio < 2020 || nuevoPeriodo.anio > 2030) {
      showSnackbar('El año debe estar entre 2020 y 2030', 'error');
      return;
    }

    try {
      setLoading(true);
      console.log('Creando período:', nuevoPeriodo);
      
      const response = await remuneracionesAPI.crearPeriodo(nuevoPeriodo);
      
      if (response.data.success) {
        const mensaje = response.data.data.existe ? 
          'Período ya existe - se seleccionó el existente' : 
          'Período creado exitosamente';
        
        showSnackbar(mensaje, 'success');
        
        if (response.data.data.id_periodo) {
          setPeriodoSeleccionado(response.data.data.id_periodo);
        }
        
        await Promise.all([
          cargarPeriodos(),
          cargarOpcionesFiltros()
        ]);
        setOpenCreatePeriodoDialog(false);
        resetNuevoPeriodo();
      } else {
        throw new Error(response.data.message || 'Error al crear período');
      }
    } catch (err) {
      console.error('Error creando período:', err);
      const errorMsg = err.response?.data?.message || 'Error al crear período';
      showSnackbar(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetNuevoPeriodo = () => {
    setNuevoPeriodo({
      mes: new Date().getMonth() + 1,
      anio: new Date().getFullYear(),
      descripcion: ''
    });
  };

  // FUNCIONES PARA ACCIONES DE PERÍODOS
  const handleVerPeriodo = async (periodo) => {
    try {
      setLoading(true);
      setSelectedPeriodo(periodo);

      // Resetear búsqueda de texto pero mantener filtros de razón social y sucursal
      setFiltroEmpleados('');
      setPaginaActual(1);
      setEmpleadosPorPagina(50);

      console.log(`Cargando detalles del período ${periodo.id_periodo}...`);
      console.log('Razón social del período:', periodo.nombre_razon);
      console.log('Sucursal del período:', periodo.sucursal_nombre);

      const response = await remuneracionesAPI.obtenerDatosPeriodo(periodo.id_periodo);

      if (response.data.success) {
        // Establecer filtros automáticamente basándose en el período seleccionado
        const razonSocial = periodo.nombre_razon || 'todos';
        const sucursal = periodo.sucursal_nombre || 'todos';

        // Solo establecer filtros si el período tiene razón social o sucursal específica
        if (razonSocial !== 'Sin Razón Social') {
          setFiltroRazonSocialDetalle(razonSocial);
        } else {
          setFiltroRazonSocialDetalle('todos');
        }

        if (sucursal !== 'Sin Sucursal') {
          setFiltroSucursalDetalle(sucursal);
        } else {
          setFiltroSucursalDetalle('todos');
        }

        // Filtrar datos según la razón social y sucursal del período
        const datosFiltrados = response.data.data.filter(emp => {
          const coincideRazon = razonSocial === 'todos' || razonSocial === 'Sin Razón Social' || emp.nombre_razon === razonSocial;
          const coincideSucursal = sucursal === 'todos' || sucursal === 'Sin Sucursal' || emp.sucursal_nombre === sucursal;
          return coincideRazon && coincideSucursal;
        });

        // Actualizar el período con contadores reales
        const empleadosUnicos = new Set(datosFiltrados.map(emp => emp.rut_empleado)).size;

        const periodoActualizado = {
          ...periodo,
          datos: response.data.data,
          total_registros: datosFiltrados.length,
          empleados_unicos: empleadosUnicos,
          suma_liquidos: datosFiltrados.reduce((sum, emp) => sum + (parseFloat(emp.liquido_pagar) || 0), 0),
          suma_total_haberes: datosFiltrados.reduce((sum, emp) => sum + (parseFloat(emp.total_haberes) || 0), 0),
          suma_total_descuentos: datosFiltrados.reduce((sum, emp) => sum + (parseFloat(emp.total_descuentos) || 0), 0)
        };

        setSelectedPeriodo(periodoActualizado);
        setOpenViewDialog(true);

        showSnackbar(
          `Período cargado: ${datosFiltrados.length} registros de ${razonSocial}${sucursal !== 'Sin Sucursal' && sucursal !== 'todos' ? ` - ${sucursal}` : ''}`,
          'success'
        );
      } else {
        throw new Error(response.data.message || 'Error al cargar datos del período');
      }
    } catch (err) {
      console.error('Error cargando datos del período:', err);
      const errorMsg = err.response?.data?.message || 'Error al cargar datos del período';
      showSnackbar(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
    setSelectedPeriodo(null);
    setFiltroEmpleados('');
    setFiltroRazonSocialDetalle('todos');
    setFiltroSucursalDetalle('todos');
    setPaginaActual(1);
    setEmpleadosPorPagina(50);
  };

  // 🔥 NUEVO: Función para ver detalles de un empleado
  const handleVerDetalleEmpleado = (empleado) => {
    setEmpleadoSeleccionado(empleado);
    setOpenDetalleEmpleadoDialog(true);
  };

  const handleCloseDetalleEmpleado = () => {
    setOpenDetalleEmpleadoDialog(false);
    setEmpleadoSeleccionado(null);
  };

  const handleAnalisisPeriodo = async (periodo) => {
    try {
      setLoading(true);
      setSelectedPeriodo(periodo);
      
      console.log(`Generando análisis del período ${periodo.id_periodo}...`);
      
      const response = await remuneracionesAPI.obtenerAnalisisPeriodo(periodo.id_periodo);
      
      if (response.data.success) {
        setReporteAnalisis(response.data.data);
        setOpenAnalysisDialog(true);
        showSnackbar('Análisis generado exitosamente', 'success');
      } else {
        throw new Error(response.data.message || 'Error al generar análisis del período');
      }
    } catch (err) {
      console.error('Error generando análisis:', err);
      const errorMsg = err.response?.data?.message || 'Error al generar análisis del período';
      showSnackbar(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditarPeriodo = (periodo) => {
    setSelectedPeriodo(periodo);
    setOpenEditDialog(true);
  };

  const handleEliminarPeriodo = (periodo) => {
    setSelectedPeriodo(periodo);
    setOpenDeleteDialog(true);
  };

  const confirmarEliminacion = async () => {
    if (!selectedPeriodo) return;
    
    try {
      setLoading(true);
      console.log(`Eliminando período ${selectedPeriodo.id_periodo}...`);
      
      const response = await remuneracionesAPI.eliminarPeriodo(selectedPeriodo.id_periodo);
      
      if (response.data.success) {
        showSnackbar('Período eliminado exitosamente', 'success');
        await Promise.all([
          cargarPeriodos(),
          cargarEstadisticas()
        ]);
      } else {
        throw new Error(response.data.message || 'Error al eliminar período');
      }
    } catch (err) {
      console.error('Error eliminando período:', err);
      const errorMsg = err.response?.data?.message || 'Error al eliminar período';
      showSnackbar(errorMsg, 'error');
    } finally {
      setLoading(false);
      setOpenDeleteDialog(false);
      setSelectedPeriodo(null);
    }
  };

  const guardarEdicion = async (datosEditados) => {
    if (!selectedPeriodo) return;
    
    try {
      setLoading(true);
      console.log(`Actualizando período ${selectedPeriodo.id_periodo}:`, datosEditados);
      
      const response = await remuneracionesAPI.actualizarPeriodo(
        selectedPeriodo.id_periodo, 
        datosEditados
      );
      
      if (response.data.success) {
        showSnackbar('Período actualizado exitosamente', 'success');
        await cargarPeriodos();
      } else {
        throw new Error(response.data.message || 'Error al actualizar período');
      }
    } catch (err) {
      console.error('Error actualizando período:', err);
      const errorMsg = err.response?.data?.message || 'Error al actualizar período';
      showSnackbar(errorMsg, 'error');
    } finally {
      setLoading(false);
      setOpenEditDialog(false);
      setSelectedPeriodo(null);
    }
  };

  const descargarDatos = async (periodo) => {
    try {
      console.log(`Descargando datos del período ${periodo.id_periodo}...`);
      
      const response = await remuneracionesAPI.obtenerDatosPeriodo(periodo.id_periodo);
      
      if (response.data.success && response.data.data.length > 0) {
        const ws = XLSX.utils.json_to_sheet(response.data.data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `${periodo.descripcion}`);
        
        XLSX.writeFile(wb, `Remuneraciones_${periodo.descripcion}.xlsx`);
        showSnackbar('Datos descargados exitosamente', 'success');
      } else {
        showSnackbar('No hay datos para descargar', 'warning');
      }
    } catch (err) {
      console.error('Error descargando datos:', err);
      const errorMsg = err.response?.data?.message || 'Error al descargar datos';
      showSnackbar(errorMsg, 'error');
    }
  };

  // PROCESAMIENTO DE EXCEL
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!periodoSeleccionado) {
      showSnackbar('Debe seleccionar un período antes de cargar el archivo', 'error');
      return;
    }

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      showSnackbar('Solo se permiten archivos Excel (.xlsx, .xls)', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showSnackbar('El archivo es demasiado grande (máximo 10MB)', 'error');
      return;
    }

    setExcelFile(file);
    setActiveStep(2);
    setProcessingStatus('Leyendo archivo...');
    
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        setProcessingStatus('Procesando datos con soporte Unicode...');
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, 
          defval: '', 
          blankrows: false,
          raw: false
        });
        
        console.log('Datos raw del Excel (primeras 10 filas):', jsonData.slice(0, 10));
        
        if (jsonData.length < 2) {
          throw new Error('El archivo debe tener al menos 2 filas (encabezados + datos)');
        }

        let headerRowIndex = buscarFilaHeadersConUnicode(jsonData);

        if (headerRowIndex === -1) {
          throw new Error('No se encontraron encabezados válidos');
        }

        const headers = jsonData[headerRowIndex]
          .map(h => h ? limpiarUnicode(String(h).trim()) : '')
          .filter(h => h && h !== '');
        
        const rows = procesarFilasDatosConUnicode(jsonData, headerRowIndex);
        
        console.log(`Headers detectados con Unicode (${headers.length}):`, headers.slice(0, 10));
        console.log(`Filas de datos válidas: ${rows.length}`);
        
        if (headers.length < 3) {
          throw new Error('No se detectaron suficientes columnas válidas en los encabezados');
        }

        const formattedData = convertirDatosAObjetosConUnicode(rows, headers);

        console.log('Datos formateados con Unicode (primeros 3):', formattedData.slice(0, 3));

        if (formattedData.length === 0) {
          throw new Error('No se encontraron filas de datos válidas después del procesamiento');
        }

        setExcelData(formattedData);
        setPreviewData(formattedData.slice(0, 20));
        setColumnasDetectadas(headers);
        
        setProcessingStatus('Realizando análisis automático con Unicode...');
        await realizarAnalisisAutomaticoConUnicode(headers, formattedData.slice(0, 5));
        
        setActiveStep(3);
        
        showSnackbar(`Excel cargado exitosamente con soporte Unicode: ${formattedData.length} registros encontrados`, 'success');
      } catch (error) {
        console.error('Error al leer Excel:', error);
        showSnackbar('Error al procesar el archivo Excel: ' + error.message, 'error');
        resetExcelState();
      } finally {
        setProcessingStatus('');
      }
    };

    reader.onerror = () => {
      showSnackbar('Error al leer el archivo', 'error');
      resetExcelState();
    };

    reader.readAsArrayBuffer(file);
  };

  // FUNCIÓN AUXILIAR: Buscar fila de headers con Unicode
  const buscarFilaHeadersConUnicode = (jsonData) => {
    for (let i = 0; i < Math.min(15, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && Array.isArray(row) && row.length > 5) {
        const rowStr = row.map(cell => limpiarUnicode(String(cell || ''))).join(' ').toUpperCase();
        
        if ((rowStr.includes('RUT') || rowStr.includes('R.U.T')) && 
            rowStr.includes('NOMBRE') && 
            (rowStr.includes('BASE') || rowStr.includes('LIQUIDO') || 
             rowStr.includes('HABERES') || rowStr.includes('PAGAR'))) {
          console.log(`Headers encontrados con Unicode en fila ${i + 1}: ${row.slice(0, 8).join(', ')}...`);
          return i;
        }
      }
    }
    return -1;
  };

  // FUNCIÓN AUXILIAR: Procesar filas de datos con Unicode
  const procesarFilasDatosConUnicode = (jsonData, headerRowIndex) => {
    return jsonData.slice(headerRowIndex + 1)
      .filter(row => {
        if (!row || !Array.isArray(row) || row.length < 3) return false;
        
        const cellsWithData = row.filter(cell => {
          if (cell === null || cell === undefined) return false;
          const cellStr = limpiarUnicode(String(cell).trim());
          return cellStr !== '' && cellStr !== '0';
        });
        
        return cellsWithData.length >= 3;
      });
  };

  // FUNCIÓN AUXILIAR: Convertir datos a objetos con Unicode
  const convertirDatosAObjetosConUnicode = (rows, headers) => {
    return rows
      .map((row, index) => {
        const obj = {};
        headers.forEach((header, colIndex) => {
          const value = row[colIndex];
          obj[header] = (value !== null && value !== undefined) ? 
            limpiarUnicode(String(value).trim()) : '';
        });
        return obj;
      })
      .filter(obj => {
        const rutValue = Object.values(obj).find(val => 
          val && String(val).match(/\d{7,8}[-]?[0-9kK]/i)
        );
        const nombreValue = Object.values(obj).find(val => 
          val && String(val).length > 5 && /[a-zA-ZñÑáéíóúÁÉÍÓÚ]/.test(val)
        );
        
        return rutValue || nombreValue;
      });
  };

  // FUNCIÓN CRÍTICA: Crear mapeo mejorado con Unicode
  const crearMapeoMejoradoConUnicode = (headers, mapeoBackend) => {
    const mapeoMejorado = { ...mapeoBackend };
    
    headers.forEach(header => {
      const headerLimpio = limpiarUnicode(header);
      const headerUpper = headerLimpio.toUpperCase().trim();
      
      if (headerUpper.includes('LIQUIDO') || headerUpper === 'LIQUIDO' || 
          headerUpper.includes('LIQUIDO A PAGAR') || 
          headerUpper.includes('LIQUIDO PAGAR') || 
          headerUpper.includes('LIQ.') || headerUpper === 'LIQ.' ||
          headerUpper.includes('NETO') || headerUpper.includes('NET') ||
          (headerUpper.includes('PAGAR') && headerUpper.includes('LIQ'))) {
        
        mapeoMejorado.liquido_pagar = header;
        console.log(`FRONTEND: Líquido detectado con Unicode: "${header}" (limpio: "${headerLimpio}")`);
      }
    });
    
    return mapeoMejorado;
  };

  // ANÁLISIS AUTOMÁTICO CON UNICODE
  const realizarAnalisisAutomaticoConUnicode = async (headers, sampleData) => {
    try {
      console.log('Realizando análisis automático con Unicode...');
      
      const response = await remuneracionesAPI.validarExcel({
        headers,
        sampleData
      });

      if (response.data.success) {
        const analisis = response.data.data;
        setAnalisisExcel(analisis);
        
        const mapeoMejorado = crearMapeoMejoradoConUnicode(headers, analisis.mapeo_sugerido || {});
        setMapeoColumnas(mapeoMejorado);
        
        if (analisis.errores && analisis.errores.length > 0) {
          showSnackbar(`Análisis completado con ${analisis.errores.length} errores críticos`, 'error');
        } else if (analisis.advertencias && analisis.advertencias.length > 0) {
          showSnackbar(`Análisis completado con ${analisis.advertencias.length} advertencias`, 'warning');
        } else {
          showSnackbar('Análisis completado - Excel válido para procesar con soporte Unicode', 'success');
        }

        if (mapeoMejorado.liquido_pagar) {
          showSnackbar(`Líquido detectado con Unicode: "${mapeoMejorado.liquido_pagar}"`, 'info');
        }

        console.log('Análisis automático con Unicode completado:', analisis);
        console.log('Mapeo mejorado con Unicode:', mapeoMejorado);
      } else {
        throw new Error(response.data.message || 'Error en el análisis automático');
      }
    } catch (err) {
      console.error('Error en análisis automático:', err);
      const errorMsg = err.response?.data?.message || 'Error al analizar el archivo';
      showSnackbar(errorMsg, 'error');
    }
  };

  // 🔥 CAMBIO: PROCESAMIENTO SIN VALIDACIÓN DE EMPLEADOS SIN ASIGNACIÓN
  const procesarExcel = async () => {
    if (!excelData.length) {
      showSnackbar('No hay datos para procesar', 'error');
      return;
    }

    if (!periodoSeleccionado) {
      showSnackbar('Debe seleccionar un período', 'error');
      return;
    }

    if (!razonSocialSeleccionada) {
      showSnackbar('Debe seleccionar una razón social', 'error');
      return;
    }

    // Validar que los IDs sean números válidos
    const periodoId = parseInt(periodoSeleccionado, 10);
    const razonSocialId = parseInt(razonSocialSeleccionada, 10);

    if (isNaN(periodoId) || periodoId <= 0) {
      showSnackbar('ID de período inválido', 'error');
      console.error('Período seleccionado inválido:', periodoSeleccionado);
      return;
    }

    if (isNaN(razonSocialId) || razonSocialId <= 0) {
      showSnackbar('ID de razón social inválido', 'error');
      console.error('Razón social seleccionada inválida:', razonSocialSeleccionada);
      return;
    }

    console.log('✅ Validación de IDs exitosa:', { periodoId, razonSocialId });

    if (!porcentajesValidos) {
      showSnackbar('Debe configurar al menos un porcentaje válido', 'error');
      return;
    }

    if (!mapeoColumnas.rut_empleado || !mapeoColumnas.nombre_empleado) {
      showSnackbar('RUT y Nombre son campos obligatorios para el procesamiento', 'error');
      return;
    }

    // 🔥 VALIDACIÓN UNIFICADA: Verificar empleados que no existen
    try {
      let problemasEncontrados = false;
      let sinSucursal = [];
      let noExisten = [];

      // 1. Verificar empleados sin sucursal (DESHABILITADO - endpoint no existe)
      // const responseSinSucursal = await api.get('/empleados/sin-sucursal');
      // if (responseSinSucursal.data.success && responseSinSucursal.data.data && responseSinSucursal.data.data.length > 0) {
      //   sinSucursal = responseSinSucursal.data.data;
      //   problemasEncontrados = true;
      // }

      // 2. Verificar empleados que no existen
      const rutsExcel = excelData
        .map(fila => fila[mapeoColumnas.rut_empleado])
        .filter(rut => rut && String(rut).trim().length >= 8);

      const responseValidacion = await api.post('/empleados/validar-ruts', { ruts: rutsExcel });

      if (responseValidacion.data.success && responseValidacion.data.data.empleados_no_encontrados.length > 0) {
        const noEncontradosRuts = responseValidacion.data.data.empleados_no_encontrados;

        // Extraer datos del Excel
        noExisten = noEncontradosRuts.map(rutNoEncontrado => {
          const filaExcel = excelData.find(fila => {
            const rutFila = String(fila[mapeoColumnas.rut_empleado] || '').replace(/[.\-\s]/g, '').toUpperCase();
            const rutBuscado = String(rutNoEncontrado).replace(/[.\-\s]/g, '').toUpperCase();
            return rutFila === rutBuscado;
          });

          return {
            rut: rutNoEncontrado,
            nombre_completo: filaExcel ? filaExcel[mapeoColumnas.nombre_empleado] : 'Sin nombre'
          };
        });

        problemasEncontrados = true;
      }

      // Si hay problemas, mostrar modal unificado
      if (problemasEncontrados) {
        setEmpleadosSinSucursal(sinSucursal);
        setEmpleadosNoEncontrados(noExisten);
        setOpenValidacionUnificadaDialog(true);

        let mensaje = 'No se puede procesar la nómina: ';
        const problemas = [];
        if (noExisten.length > 0) problemas.push(`${noExisten.length} empleado(s) no existe(n)`);
        if (sinSucursal.length > 0) problemas.push(`${sinSucursal.length} sin sucursal`);
        mensaje += problemas.join(', ');

        showSnackbar(mensaje, 'error');
        return;
      }
    } catch (err) {
      console.error('Error al validar empleados:', err);
      showSnackbar('Error al validar empleados. Intente nuevamente.', 'error');
      return;
    }

    setLoading(true);
    setActiveStep(5);
    setUploadProgress(0);

    try {
      const etapas = [
        { progreso: 15, mensaje: 'Validando datos y porcentajes...', delay: 200 },
        { progreso: 30, mensaje: 'Verificando período y razón social...', delay: 300 },
        { progreso: 50, mensaje: 'Procesando empleados con Unicode...', delay: 500 },
        { progreso: 70, mensaje: 'Guardando remuneraciones y porcentajes...', delay: 800 },
        { progreso: 85, mensaje: 'Calculando costos totales...', delay: 400 },
        { progreso: 100, mensaje: 'Completado', delay: 200 }
      ];

      for (const etapa of etapas) {
        setUploadProgress(etapa.progreso);
        setProcessingStatus(etapa.mensaje);
        await new Promise(resolve => setTimeout(resolve, etapa.delay));
      }

      const datosConvertidos = excelData.map(fila => {
        const filaProcesada = { ...fila };
        
        Object.keys(fila).forEach(columna => {
          const valor = fila[columna];
          const columnaLimpia = limpiarUnicode(columna).toUpperCase();
          
          if (columnaLimpia.includes('BASE') || columnaLimpia.includes('HABERES') || 
              columnaLimpia.includes('DESCUENTO') || columnaLimpia.includes('LIQUIDO') ||
              columnaLimpia.includes('TOTAL') || columnaLimpia.includes('PAGAR') ||
              columnaLimpia.includes('IMPOSICION') || columnaLimpia.includes('AFC') ||
              columnaLimpia.includes('PREVISION') || columnaLimpia.includes('SALUD')) {
            
            filaProcesada[columna] = procesarValorMonetarioChileno(valor);
            
            if (columnaLimpia.includes('LIQUIDO') || columnaLimpia.includes('BASE')) {
              console.log(`Procesando ${columna}: "${valor}" -> "${filaProcesada[columna]}"`);
            }
          }
        });
        
        return filaProcesada;
      });

      console.log('Enviando datos al servidor con porcentajes:', {
        totalFilas: datosConvertidos.length,
        periodo: periodoSeleccionado,
        razonSocial: razonSocialSeleccionada,
        archivo: excelFile.name,
        mapeoColumnas: mapeoColumnas,
        porcentajes: porcentajes,
        primeraFila: datosConvertidos[0]
      });

      const response = await remuneracionesAPI.procesarExcel({
        datosExcel: datosConvertidos,
        archivoNombre: excelFile.name,
        validarDuplicados,
        id_periodo: periodoId,
        id_razon_social: razonSocialId,
        mapeoColumnas: mapeoColumnas,
        porcentajes: porcentajes
      });

      if (response.data.success) {
        const resultado = response.data.data;
        setResultadoProcesamiento(resultado);
        
        // 🔥 CAMBIO: NO VALIDAR EMPLEADOS SIN ASIGNACIÓN
        let mensaje = `Procesado correctamente: ${resultado.procesados}/${resultado.total_filas} registros`;

        if (resultado.empleados_creados > 0) {
          mensaje += `\n${resultado.empleados_creados} empleados nuevos creados`;
        }

        if (resultado.errores > 0) {
          mensaje += `\n${resultado.errores} registros con errores`;
        }
        
        if (resultado.porcentajes_guardados) {
          mensaje += `\nPorcentajes guardados para la razón social`;
        }
        
        const severity = resultado.errores > resultado.procesados * 0.1 ? 'warning' : 'success';
        showSnackbar(mensaje, severity);
        
        await Promise.all([
          cargarPeriodos(),
          cargarEstadisticas()
        ]);
        
        handleCloseExcelDialog();
      } else {
        throw new Error(response.data.message || 'Error al procesar Excel');
      }
    } catch (err) {
      console.error('Error al procesar Excel:', err);
      
      let errorMessage = 'Error al procesar el archivo Excel';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.status === 413) {
        errorMessage = 'El archivo es demasiado grande';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Error en el servidor. Inténtalo nuevamente.';
      }
      
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
      setUploadProgress(0);
      setProcessingStatus('');
    }
  };

  // FUNCIONES AUXILIARES
  const resetExcelState = () => {
    setActiveStep(0);
    setExcelFile(null);
    setExcelData([]);
    setPreviewData([]);
    setColumnasDetectadas([]);
    setMapeoColumnas({});
    setAnalisisExcel(null);
    setUploadProgress(0);
    setProcessingStatus('');
    setResultadoProcesamiento(null);
    setRazonSocialSeleccionada('');
    setPorcentajes({
      caja_compen: '',
      afc: '',
      sis: '',
      ach: '',
      imposiciones: ''
    });
    setPorcentajesValidos(false);
    setPorcentajesExistentes(null);
  };

  const handleCloseExcelDialog = () => {
    setOpenExcelDialog(false);
    setPeriodoSeleccionado('');
    resetExcelState();
  };

  // FUNCIONES DE UTILIDAD
  const formatMoney = useCallback((amount) => {
    if (!amount || isNaN(amount)) return '$0';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  }, []);

  const obtenerInicialMes = useCallback((numeroMes) => {
    const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
                   'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    return meses[numeroMes - 1] || 'N/A';
  }, []);

  const obtenerNombreMesCompleto = useCallback((numeroMes) => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[numeroMes - 1] || 'N/A';
  }, []);

  // CÁLCULOS MEJORADOS
  const periodosFiltrados = React.useMemo(() => {
    return periodos.filter(periodo => {
      // Filtro por estado
      if (filtroEstado !== 'todos' && periodo.estado !== filtroEstado) {
        return false;
      }

      // 🔥 Filtro por período específico (mes/año)
      if (filtroPeriodo) {
        if (periodo.mes !== filtroPeriodo.mes || periodo.anio !== filtroPeriodo.anio) {
          return false;
        }
      }

      return true;
    });
  }, [periodos, filtroEstado, filtroPeriodo]);

  // Función para agrupar períodos por razón social y sucursal
  const periodosAgrupados = React.useMemo(() => {
    const grupos = {};

    periodosFiltrados.forEach(periodo => {
      const razonKey = periodo.nombre_razon || 'Sin Razón Social';
      const sucursalKey = periodo.sucursal_nombre || 'Sin Sucursal';

      if (!grupos[razonKey]) {
        grupos[razonKey] = {};
      }

      if (!grupos[razonKey][sucursalKey]) {
        grupos[razonKey][sucursalKey] = [];
      }

      grupos[razonKey][sucursalKey].push(periodo);
    });

    return grupos;
  }, [periodosFiltrados]);

  // Función para obtener períodos únicos por mes/año (sin duplicados)
  const periodosUnicos = React.useMemo(() => {
    const unicos = new Map();

    periodos.forEach(periodo => {
      const key = `${periodo.mes}-${periodo.anio}`;

      if (!unicos.has(key)) {
        // Crear un período consolidado con descripción en formato "Mes Año"
        const periodoConsolidado = {
          ...periodo,
          descripcion: `${obtenerNombreMesCompleto(periodo.mes)} ${periodo.anio}`,
          // Mantener el primer id_periodo encontrado para este mes/año
          id_periodo: periodo.id_periodo,
          // Agregar flag para indicar que es consolidado
          esConsolidado: true,
          // Contar total de registros de todos los períodos de este mes/año
          total_registros: periodo.total_registros || 0
        };
        unicos.set(key, periodoConsolidado);
      } else {
        // Si ya existe, sumar los registros
        const existente = unicos.get(key);
        existente.total_registros = (existente.total_registros || 0) + (periodo.total_registros || 0);
      }
    });

    return Array.from(unicos.values()).sort((a, b) => {
      if (a.anio !== b.anio) return b.anio - a.anio;
      return b.mes - a.mes;
    });
  }, [periodos, obtenerNombreMesCompleto]);

  // Opciones para filtros en el modal de detalles
  const opcionesFiltroDetalle = React.useMemo(() => {
    if (!selectedPeriodo?.datos) return { razonesSociales: [], sucursales: [] };
    
    const razones = [...new Set(selectedPeriodo.datos.map(emp => emp.nombre_razon).filter(Boolean))];
    const sucursales = [...new Set(selectedPeriodo.datos.map(emp => emp.sucursal_nombre).filter(Boolean))];
    
    return {
      razonesSociales: razones,
      sucursales: sucursales
    };
  }, [selectedPeriodo?.datos]);

  // Cálculos para paginación de empleados
  const empleadosFiltrados = React.useMemo(() => {
    if (!selectedPeriodo?.datos) return [];
    
    return selectedPeriodo.datos.filter(empleado => {
      if (filtroEmpleados) {
        const filtro = filtroEmpleados.toLowerCase();
        const nombre = (empleado.nombre_empleado || empleado.nombre_completo || '').toLowerCase();
        const rut = (empleado.rut_empleado || '').toLowerCase();
        if (!nombre.includes(filtro) && !rut.includes(filtro)) {
          return false;
        }
      }
      
      if (filtroRazonSocialDetalle !== 'todos') {
        if (empleado.nombre_razon !== filtroRazonSocialDetalle) {
          return false;
        }
      }
      
      if (filtroSucursalDetalle !== 'todos') {
        if (empleado.sucursal_nombre !== filtroSucursalDetalle) {
          return false;
        }
      }
      
      return true;
    });
  }, [selectedPeriodo?.datos, filtroEmpleados, filtroRazonSocialDetalle, filtroSucursalDetalle]);

  const totalPaginas = React.useMemo(() => {
    return empleadosPorPagina === -1 ? 1 : Math.ceil(empleadosFiltrados.length / empleadosPorPagina);
  }, [empleadosFiltrados.length, empleadosPorPagina]);

  const empleadosPaginados = React.useMemo(() => {
    if (empleadosPorPagina === -1) return empleadosFiltrados;
    
    const inicio = (paginaActual - 1) * empleadosPorPagina;
    const fin = inicio + empleadosPorPagina;
    return empleadosFiltrados.slice(inicio, fin);
  }, [empleadosFiltrados, paginaActual, empleadosPorPagina]);

  // Filtrar columnas para vista previa (sin sueldo base)
  const obtenerColumnasParaVistaPrevia = useCallback(() => {
    if (!previewData || previewData.length === 0) return [];
    
    const todasLasColumnas = Object.keys(previewData[0] || {});
    
    const columnasOcultas = todasLasColumnas.filter(columna => {
      const colUpper = limpiarUnicode(columna).toUpperCase().trim();
      return (
        colUpper.includes('S. BASE') || 
        colUpper === 'S. BASE' ||
        colUpper.includes('SUELDO BASE') ||
        colUpper.includes('SUELDO_BASE') ||
        colUpper === 'SUELDO BASE' ||
        mapeoColumnas.sueldo_base === columna
      );
    });
    
    const columnasVisible = todasLasColumnas.filter(col => !columnasOcultas.includes(col));
    
    console.log('Columnas de sueldo base ocultas:', columnasOcultas);
    console.log('Columnas visibles en vista previa:', columnasVisible.length);
    
    return columnasVisible;
  }, [previewData, mapeoColumnas]);

  const obtenerDatosVistaPrevia = useCallback(() => {
    if (!previewData || previewData.length === 0) return [];
    
    const columnasVisible = obtenerColumnasParaVistaPrevia();
    
    return previewData.map(row => {
      const newRow = {};
      columnasVisible.forEach(col => {
        newRow[col] = row[col];
      });
      return newRow;
    });
  }, [previewData, obtenerColumnasParaVistaPrevia]);

  // COMPONENTE: Configurar porcentajes
  const renderConfiguracionPorcentajes = () => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <PercentIcon sx={{ mr: 1, color: '#f37d16' }} />
        Configuración de Porcentajes Obligatoria
      </Typography>
      
      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="h6">¡Configuración Obligatoria!</Typography>
        <Typography>
          Debe seleccionar la razón social y configurar los porcentajes antes de procesar la nómina.
          Estos porcentajes se usarán para calcular los costos totales.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControl fullWidth required>
            <InputLabel>Razón Social *</InputLabel>
            <Select
              value={razonSocialSeleccionada}
              onChange={(e) => {
                setRazonSocialSeleccionada(e.target.value);
                if (e.target.value && periodoSeleccionado) {
                  cargarPorcentajesExistentes(periodoSeleccionado, e.target.value);
                }
              }}
              label="Razón Social *"
              required
            >
              {razonesSociales.map(razon => (
                <MenuItem key={razon.id} value={razon.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <BusinessIcon sx={{ mr: 1, fontSize: 16 }} />
                    {razon.nombre_razon}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {razonSocialSeleccionada && (
          <>
            {porcentajesExistentes && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="h6">Porcentajes Existentes Encontrados</Typography>
                  <Typography>
                    Se encontraron porcentajes previamente configurados para esta razón social y período.
                    Puede modificarlos si es necesario.
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Última actualización:</strong> {new Date(porcentajesExistentes.updated_at || porcentajesExistentes.created_at).toLocaleString()}
                  </Typography>
                </Alert>
              </Grid>
            )}

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Porcentajes del Empleador (%)
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                fullWidth
                label="Caja Compensación (%)"
                type="number"
                value={porcentajes.caja_compen}
                onChange={(e) => handlePorcentajeChange('caja_compen', e.target.value)}
                inputProps={{ min: 0, max: 100, step: 0.01 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                helperText="Típico: 4.0%"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                fullWidth
                label="AFC (%)"
                type="number"
                value={porcentajes.afc}
                onChange={(e) => handlePorcentajeChange('afc', e.target.value)}
                inputProps={{ min: 0, max: 100, step: 0.01 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                helperText="Típico: 0.6%"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                fullWidth
                label="SIS (%)"
                type="number"
                value={porcentajes.sis}
                onChange={(e) => handlePorcentajeChange('sis', e.target.value)}
                inputProps={{ min: 0, max: 100, step: 0.01 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                helperText="Típico: 0.95%"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                fullWidth
                label="ACH (%)"
                type="number"
                value={porcentajes.ach}
                onChange={(e) => handlePorcentajeChange('ach', e.target.value)}
                inputProps={{ min: 0, max: 100, step: 0.01 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                helperText="Típico: 0.0%"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                fullWidth
                label="Imposiciones (%)"
                type="number"
                value={porcentajes.imposiciones}
                onChange={(e) => handlePorcentajeChange('imposiciones', e.target.value)}
                inputProps={{ min: 0, max: 100, step: 0.01 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                helperText="Típico: 10.0%"
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: porcentajesValidos ? '#e8f5e8' : '#ffebee', borderRadius: 2 }}>
                <Typography variant="body1" color={porcentajesValidos ? 'success.main' : 'error.main'}>
                  <strong>Estado:</strong> {porcentajesValidos ? 
                    '✅ Porcentajes configurados correctamente' : 
                    '❌ Debe configurar al menos un porcentaje válido (0-100%)'}
                </Typography>
                
                {porcentajesValidos && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Vista previa del cálculo:</strong> Para un sueldo base de $500,000
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {porcentajes.caja_compen && (
                        <li>Caja Compensación: ${(500000 * parseFloat(porcentajes.caja_compen) / 100).toLocaleString()}</li>
                      )}
                      {porcentajes.afc && (
                        <li>AFC: ${(500000 * parseFloat(porcentajes.afc) / 100).toLocaleString()}</li>
                      )}
                      {porcentajes.sis && (
                        <li>SIS: ${(500000 * parseFloat(porcentajes.sis) / 100).toLocaleString()}</li>
                      )}
                      {porcentajes.ach && (
                        <li>ACH: ${(500000 * parseFloat(porcentajes.ach) / 100).toLocaleString()}</li>
                      )}
                      {porcentajes.imposiciones && (
                        <li>Imposiciones: ${(500000 * parseFloat(porcentajes.imposiciones) / 100).toLocaleString()}</li>
                      )}
                    </ul>
                  </Box>
                )}
              </Box>
            </Grid>
          </>
        )}
      </Grid>
    </Box>
  );

  // COMPONENTE: Renderizar un período individual (card)
  const renderPeriodoCard = (periodo, index) => (
    <Grid item xs={12} sm={6} md={4} key={`periodo-${periodo.id_periodo}-${periodo.mes}-${periodo.anio}-${index}`}>
      <Card sx={{
        height: '100%',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 35px rgba(0,0,0,0.15)'
        },
        border: '1px solid rgba(0,0,0,0.05)'
      }}>
        <CardHeader
          avatar={
            <Avatar sx={{
              bgcolor: '#f37d16',
              width: 56,
              height: 56,
              fontSize: '1rem',
              fontWeight: 'bold',
              color: 'white'
            }}>
              {obtenerInicialMes(periodo.mes)}
            </Avatar>
          }
          title={
            <Typography variant="h6" component="div">
              {periodo.descripcion}
            </Typography>
          }
          subheader={
            <Box>
              <Typography variant="body2" color="text.secondary">
                {periodo.mes}/{periodo.anio}
              </Typography>
              {periodo.sucursal_nombre && periodo.sucursal_nombre !== 'Sin Sucursal' && (
                <Chip
                  label={periodo.sucursal_nombre}
                  size="small"
                  color="secondary"
                  sx={{ mt: 0.5 }}
                />
              )}
            </Box>
          }
          action={
            <Chip
              label={periodo.estado}
              color={periodo.estado === 'ACTIVO' ? 'success' : 'default'}
              size="small"
            />
          }
        />
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {periodo.total_registros || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Registros
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {periodo.empleados_unicos || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Empleados Únicos
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Total Nómina:</strong> {formatMoney(periodo.suma_liquidos)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Total Haberes:</strong> {formatMoney(periodo.suma_total_haberes)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Total Descuentos:</strong> {formatMoney(periodo.suma_total_descuentos)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Cargado:</strong> {periodo.fecha_carga ?
                new Date(periodo.fecha_carga).toLocaleDateString('es-CL') :
                'N/A'
              }
            </Typography>
          </Box>

          <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2, py: 0.5 }}>
            <Typography variant="caption">
              Haz clic en "Ver detalles" para ver contadores actualizados
            </Typography>
          </Alert>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 0.5 }}>
            <Tooltip title="Ver detalles">
              <IconButton size="small" color="primary" onClick={() => handleVerPeriodo(periodo)}>
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Análisis estadístico">
              <IconButton size="small" color="info" onClick={() => handleAnalisisPeriodo(periodo)}>
                <PieChartIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Editar período">
              <IconButton size="small" color="primary" onClick={() => handleEditarPeriodo(periodo)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Descargar datos">
              <IconButton size="small" color="success" onClick={() => descargarDatos(periodo)}>
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Eliminar período">
              <IconButton size="small" color="error" onClick={() => handleEliminarPeriodo(periodo)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );

  // COMPONENTE: Renderizar períodos agrupados por razón social
  const renderPeriodosAgrupadosPorRazonSocial = () => {
    if (periodosFiltrados.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <InfoIcon sx={{ fontSize: 80, color: '#ccc', mb: 2 }} />
          <Typography variant="h5" color="text.secondary">
            No hay períodos para mostrar
          </Typography>
        </Box>
      );
    }

    return (
      <Box>
        {Object.entries(periodosAgrupados).map(([razonSocial, sucursales], razonIndex) => {
          // Calcular totales consolidados para toda la razón social
          let totalEmpleados = 0;
          let totalRegistros = 0;
          let totalLiquidos = 0;
          let totalHaberes = 0;
          let totalDescuentos = 0;
          let totalPeriodosRazon = 0;

          Object.values(sucursales).forEach(periodos => {
            periodos.forEach(periodo => {
              totalRegistros += periodo.total_registros || 0;
              totalEmpleados += periodo.empleados_unicos || 0;
              totalLiquidos += parseFloat(periodo.suma_liquidos) || 0;
              totalHaberes += parseFloat(periodo.suma_total_haberes) || 0;
              totalDescuentos += parseFloat(periodo.suma_total_descuentos) || 0;
              totalPeriodosRazon++;
            });
          });

          return (
            <Accordion
              key={`razon-${razonSocial}-${razonIndex}`}
              defaultExpanded={false}
              sx={{
                mb: 3,
                border: '1px solid rgba(0,0,0,0.1)',
                '&:before': { display: 'none' },
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  bgcolor: '#f5f5f5',
                  borderBottom: '2px solid #f37d16',
                  '&:hover': { bgcolor: '#eeeeee' }
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                    <BusinessIcon sx={{ fontSize: 32, color: '#f37d16' }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h5" fontWeight="bold" color="primary">
                        {razonSocial}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {totalPeriodosRazon} {totalPeriodosRazon === 1 ? 'período' : 'períodos'} • {Object.keys(sucursales).length} {Object.keys(sucursales).length === 1 ? 'sucursal' : 'sucursales'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Totales consolidados */}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                    <Chip
                      icon={<PeopleIcon />}
                      label={`${totalEmpleados} empleados`}
                      color="primary"
                      size="small"
                      sx={{ fontWeight: 'bold' }}
                    />
                    <Chip
                      icon={<AssignmentIcon />}
                      label={`${totalRegistros} registros`}
                      color="info"
                      size="small"
                    />
                    <Chip
                      icon={<AttachMoneyIcon />}
                      label={`Total: ${formatMoney(totalLiquidos)}`}
                      color="success"
                      size="small"
                      sx={{ fontWeight: 'bold' }}
                    />
                    <Chip
                      label={`Haberes: ${formatMoney(totalHaberes)}`}
                      color="default"
                      size="small"
                    />
                    <Chip
                      label={`Descuentos: ${formatMoney(totalDescuentos)}`}
                      color="warning"
                      size="small"
                    />
                  </Box>
                </Box>
              </AccordionSummary>

              <AccordionDetails sx={{ p: 3, bgcolor: '#fafafa' }}>
                {Object.entries(sucursales).map(([sucursal, periodos], sucursalIndex) => (
                  <Box key={`sucursal-${razonSocial}-${sucursal}-${sucursalIndex}`} sx={{ mb: 3 }}>
                    {/* Advertencia para empleados sin sucursal */}
                    {sucursal === 'Sin Sucursal' && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight="bold">
                          Empleados sin sucursal detectados
                        </Typography>
                        <Typography variant="body2">
                          Estos registros contienen empleados sin sucursal asignada. Los totales pueden no reflejar correctamente la distribución por sucursal. Por favor, asigne sucursales a estos empleados.
                        </Typography>
                      </Alert>
                    )}
                    {/* Header de sucursal si hay sucursales específicas */}
                    {sucursal !== 'Sin Sucursal' && (
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        mb: 2,
                        pb: 1,
                        borderBottom: '1px solid #ddd'
                      }}>
                        <StoreIcon sx={{ mr: 1, color: '#666' }} />
                        <Typography variant="h6" color="text.primary">
                          {sucursal}
                        </Typography>
                        <Chip
                          label={`${periodos.length} ${periodos.length === 1 ? 'período' : 'períodos'}`}
                          size="small"
                          sx={{ ml: 2 }}
                        />
                      </Box>
                    )}

                    {/* Grid de períodos */}
                    <Grid container spacing={3}>
                      {periodos.map((periodo, periodoIndex) => renderPeriodoCard(periodo, periodoIndex))}
                    </Grid>
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
    );
  };

  // NOTA: Debido a límites de espacio, las funciones renderFiltros, renderEstadisticas, renderPeriodosAgrupados
  // y todos los dialogs (ver período, análisis, editar, eliminar, crear período) se mantienen igual que en el archivo original.
  // Solo se ha removido el renderModalAsignacion y su lógica asociada.

  return (
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: '#f8f9fa' }}>
      {/* Header simplificado */}
      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
          Sistema Profesional de Remuneraciones
        </Typography>
        <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
          Gestión integral de nóminas (las sucursales se asignan en Módulo Empleados)
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
          <Chip 
            icon={<SecurityIcon />} 
            label="Seguro" 
            size="small" 
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} 
          />
          <Chip 
            icon={<SpeedIcon />} 
            label="Rápido" 
            size="small" 
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} 
          />
          <Chip 
            icon={<VerifiedUserIcon />} 
            label="Confiable" 
            size="small" 
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} 
          />
        </Box>
      </Paper>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }} 
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Botones principales */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setOpenCreatePeriodoDialog(true)}
        >
          Crear Período
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            cargarPeriodos();
            cargarEstadisticas();
          }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : 'Actualizar'}
        </Button>
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={() => setOpenExcelDialog(true)}
          sx={{ 
            bgcolor: '#f37d16', 
            '&:hover': { bgcolor: '#e06c00' }
          }}
        >
          Procesar Nómina
        </Button>
      </Box>

      {/* 🔥 Filtro de período */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Autocomplete
              options={periodosUnicos}
              getOptionLabel={(option) => option.descripcion || `${obtenerNombreMesCompleto(option.mes)} ${option.anio}`}
              isOptionEqualToValue={(option, value) => option.id_periodo === value.id_periodo}
              value={filtroPeriodo}
              onChange={(event, newValue) => setFiltroPeriodo(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Filtrar por período"
                  placeholder="Selecciona un período..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          <CalendarTodayIcon />
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Button
              startIcon={<ClearAllIcon />}
              onClick={() => setFiltroPeriodo(null)}
              disabled={!filtroPeriodo}
              variant="outlined"
            >
              Limpiar filtro
            </Button>
            {filtroPeriodo && (
              <Chip
                label={`Mostrando: ${filtroPeriodo.mes}/${filtroPeriodo.anio}`}
                color="primary"
                sx={{ ml: 2 }}
                onDelete={() => setFiltroPeriodo(null)}
              />
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Vista de períodos agrupados por razón social */}
      <Paper>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <CircularProgress size={60} />
          </Box>
        ) : (
          <Box sx={{ p: 3 }}>
            {renderPeriodosAgrupadosPorRazonSocial()}
          </Box>
        )}
      </Paper>

      {/* Dialog Excel SIMPLIFICADO (sin paso de asignación) */}
      <Dialog 
        open={openExcelDialog} 
        onClose={handleCloseExcelDialog} 
        maxWidth="xl" 
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" fontWeight="bold">
            Procesador Automático de Nóminas
          </Typography>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }} alternativeLabel>
            {pasosCarga.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Paso 0: Seleccionar período */}
          {activeStep === 0 && (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Selecciona el mes/año del período. La razón social se especificará en el paso de configuración de porcentajes.
                </Typography>
              </Alert>
              <FormControl fullWidth>
                <InputLabel>Período</InputLabel>
                <Select
                  value={periodoSeleccionado}
                  onChange={(e) => setPeriodoSeleccionado(e.target.value)}
                  label="Período"
                >
                  {periodosUnicos.map((periodo, index) => (
                    <MenuItem
                      key={`select-periodo-unico-${periodo.id_periodo}-${index}`}
                      value={periodo.id_periodo}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarTodayIcon sx={{ fontSize: 20, color: '#f37d16' }} />
                        <Typography variant="body1" fontWeight="bold">
                          {periodo.descripcion}
                        </Typography>
                        {periodo.total_registros > 0 && (
                          <Chip
                            label={`${periodo.total_registros} registros`}
                            size="small"
                            color="primary"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {periodoSeleccionado && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Período seleccionado:</strong> {periodosUnicos.find(p => p.id_periodo === periodoSeleccionado)?.descripcion}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Continúa al siguiente paso para cargar el archivo Excel
                  </Typography>
                </Alert>
              )}
            </Box>
          )}

          {/* Paso 1: Cargar archivo */}
          {activeStep === 1 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="excel-file-input"
              />
              <label htmlFor="excel-file-input">
                <Card sx={{ p: 4, cursor: 'pointer', border: '3px dashed #f37d16' }}>
                  <CloudUploadIcon sx={{ fontSize: 100, color: '#f37d16', mb: 2 }} />
                  <Typography variant="h5">
                    {excelFile ? excelFile.name : 'Seleccionar Archivo'}
                  </Typography>
                </Card>
              </label>
            </Box>
          )}

          {/* Paso 2: Analizando */}
          {activeStep === 2 && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <CircularProgress size={80} sx={{ mb: 3 }} />
              <Typography variant="h5">Analizando Archivo</Typography>
              <LinearProgress sx={{ maxWidth: 400, mx: 'auto', mt: 3 }} />
            </Box>
          )}

          {/* Paso 3: Configurar mapeo */}
          {activeStep === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>Configurar Mapeo</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>RUT *</InputLabel>
                    <Select
                      value={mapeoColumnas.rut_empleado || ''}
                      onChange={(e) => setMapeoColumnas({...mapeoColumnas, rut_empleado: e.target.value})}
                    >
                      {columnasDetectadas.map(col => (
                        <MenuItem key={col} value={col}>{col}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Nombre *</InputLabel>
                    <Select
                      value={mapeoColumnas.nombre_empleado || ''}
                      onChange={(e) => setMapeoColumnas({...mapeoColumnas, nombre_empleado: e.target.value})}
                    >
                      {columnasDetectadas.map(col => (
                        <MenuItem key={col} value={col}>{col}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Líquido *</InputLabel>
                    <Select
                      value={mapeoColumnas.liquido_pagar || ''}
                      onChange={(e) => setMapeoColumnas({...mapeoColumnas, liquido_pagar: e.target.value})}
                    >
                      {columnasDetectadas.map(col => (
                        <MenuItem key={col} value={col}>{col}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Paso 4: Configurar porcentajes */}
          {activeStep === 4 && renderConfiguracionPorcentajes()}

          {/* Paso 5: Procesando */}
          {activeStep === 5 && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <CircularProgress size={80} sx={{ mb: 3 }} />
              <Typography variant="h5">Procesando Nómina</Typography>
              <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 3, height: 12 }} />
              <Typography variant="h6" sx={{ mt: 2 }}>{uploadProgress}%</Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseExcelDialog}>Cancelar</Button>
          
          {activeStep === 0 && (
            <Button
              onClick={() => setActiveStep(1)}
              variant="contained"
              disabled={!periodoSeleccionado}
            >
              Continuar
            </Button>
          )}

          {activeStep === 3 && (
            <Button
              onClick={() => setActiveStep(4)}
              variant="contained"
              disabled={!mapeoColumnas.liquido_pagar}
            >
              Configurar Porcentajes
            </Button>
          )}

          {activeStep === 4 && (
            <Button
              onClick={procesarExcel}
              variant="contained"
              disabled={loading || !razonSocialSeleccionada || !porcentajesValidos}
              startIcon={loading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
              sx={{ bgcolor: '#f37d16', '&:hover': { bgcolor: '#e06c00' } }}
            >
              {loading ? 'Procesando...' : 'Procesar Nómina'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Dialog Ver Detalles */}
      <Dialog
        open={openViewDialog}
        onClose={handleCloseViewDialog}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                Detalles del Período: {selectedPeriodo?.descripcion}
              </Typography>
              {selectedPeriodo && (
                <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                  <Chip
                    icon={<PeopleIcon />}
                    label={`${selectedPeriodo.total_registros || 0} registros`}
                    color="primary"
                    size="small"
                  />
                  <Chip
                    icon={<AttachMoneyIcon />}
                    label={`Total: ${formatMoney(selectedPeriodo.suma_liquidos || 0)}`}
                    color="success"
                    size="small"
                  />
                </Box>
              )}
            </Box>
            <IconButton onClick={handleCloseViewDialog}>
              <DeleteIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedPeriodo?.datos && (
            <Box>
              {/* Filtros */}
              <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  placeholder="Buscar por nombre o RUT..."
                  value={filtroEmpleados}
                  onChange={(e) => setFiltroEmpleados(e.target.value)}
                  size="small"
                  sx={{ flexGrow: 1, minWidth: 250 }}
                />
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Razón Social</InputLabel>
                  <Select
                    value={filtroRazonSocialDetalle}
                    onChange={(e) => setFiltroRazonSocialDetalle(e.target.value)}
                    label="Razón Social"
                  >
                    <MenuItem value="todos">Todas</MenuItem>
                    {opcionesFiltroDetalle.razonesSociales.map(razon => (
                      <MenuItem key={razon} value={razon}>{razon}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Sucursal</InputLabel>
                  <Select
                    value={filtroSucursalDetalle}
                    onChange={(e) => setFiltroSucursalDetalle(e.target.value)}
                    label="Sucursal"
                  >
                    <MenuItem value="todos">Todas</MenuItem>
                    {opcionesFiltroDetalle.sucursales.map(sucursal => (
                      <MenuItem key={sucursal} value={sucursal}>{sucursal}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Tabla */}
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>RUT</strong></TableCell>
                      <TableCell><strong>Nombre</strong></TableCell>
                      <TableCell><strong>Razón Social</strong></TableCell>
                      <TableCell><strong>Sucursal</strong></TableCell>
                      <TableCell align="right"><strong>Líquido a Pagar</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {empleadosPaginados.map((emp, index) => (
                      <TableRow
                        key={`emp-${emp.rut_empleado}-${index}`}
                        hover
                        onClick={() => handleVerDetalleEmpleado(emp)}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'action.hover'
                          }
                        }}
                      >
                        <TableCell>{emp.rut_empleado}</TableCell>
                        <TableCell>{emp.nombre_empleado || emp.nombre_completo}</TableCell>
                        <TableCell>{emp.nombre_razon}</TableCell>
                        <TableCell>{emp.sucursal_nombre}</TableCell>
                        <TableCell align="right">{formatMoney(emp.liquido_pagar)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Paginación */}
              <TablePagination
                component="div"
                count={empleadosFiltrados.length}
                page={paginaActual - 1}
                onPageChange={(e, newPage) => setPaginaActual(newPage + 1)}
                rowsPerPage={empleadosPorPagina}
                onRowsPerPageChange={(e) => {
                  setEmpleadosPorPagina(parseInt(e.target.value, 10));
                  setPaginaActual(1);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
                labelRowsPerPage="Filas por página:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Análisis */}
      <Dialog
        open={openAnalysisDialog}
        onClose={() => setOpenAnalysisDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" fontWeight="bold">
            Análisis Estadístico
          </Typography>
        </DialogTitle>
        <DialogContent>
          {reporteAnalisis && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="primary">Total Registros</Typography>
                      <Typography variant="h3">{reporteAnalisis.total_registros || 0}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="success.main">Total Nómina</Typography>
                      <Typography variant="h3">{formatMoney(reporteAnalisis.total_nomina)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography>
                      Promedio por empleado: {formatMoney(reporteAnalisis.promedio_empleado)}
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAnalysisDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Editar */}
      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" fontWeight="bold">
            Editar Período
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedPeriodo && (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Descripción"
                value={selectedPeriodo.descripcion || ''}
                onChange={(e) => setSelectedPeriodo({...selectedPeriodo, descripcion: e.target.value})}
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={selectedPeriodo.estado || 'ACTIVO'}
                  onChange={(e) => setSelectedPeriodo({...selectedPeriodo, estado: e.target.value})}
                  label="Estado"
                >
                  <MenuItem value="ACTIVO">Activo</MenuItem>
                  <MenuItem value="CERRADO">Cerrado</MenuItem>
                  <MenuItem value="PROCESADO">Procesado</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancelar</Button>
          <Button
            onClick={() => guardarEdicion(selectedPeriodo)}
            variant="contained"
            disabled={loading}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Eliminar */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        maxWidth="sm"
      >
        <DialogTitle>
          <Typography variant="h5" fontWeight="bold" color="error">
            Confirmar Eliminación
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Esta acción no se puede deshacer
          </Alert>
          <Typography>
            ¿Está seguro que desea eliminar el período <strong>{selectedPeriodo?.descripcion}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Se eliminarán {selectedPeriodo?.total_registros || 0} registros asociados.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancelar</Button>
          <Button
            onClick={confirmarEliminacion}
            variant="contained"
            color="error"
            disabled={loading}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Crear Período */}
      <Dialog
        open={openCreatePeriodoDialog}
        onClose={() => setOpenCreatePeriodoDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" fontWeight="bold">
            Crear Nuevo Período
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mt: 2, mb: 3 }}>
            <Typography variant="body2">
              <strong>Importante:</strong> El período se creará para todas las sucursales.
              Cuando subas la nómina, especificarás la razón social correspondiente.
            </Typography>
          </Alert>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Mes *</InputLabel>
                  <Select
                    value={nuevoPeriodo.mes}
                    onChange={(e) => setNuevoPeriodo({...nuevoPeriodo, mes: e.target.value})}
                    label="Mes *"
                  >
                    <MenuItem value={1}>Enero</MenuItem>
                    <MenuItem value={2}>Febrero</MenuItem>
                    <MenuItem value={3}>Marzo</MenuItem>
                    <MenuItem value={4}>Abril</MenuItem>
                    <MenuItem value={5}>Mayo</MenuItem>
                    <MenuItem value={6}>Junio</MenuItem>
                    <MenuItem value={7}>Julio</MenuItem>
                    <MenuItem value={8}>Agosto</MenuItem>
                    <MenuItem value={9}>Septiembre</MenuItem>
                    <MenuItem value={10}>Octubre</MenuItem>
                    <MenuItem value={11}>Noviembre</MenuItem>
                    <MenuItem value={12}>Diciembre</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Año *"
                  type="number"
                  value={nuevoPeriodo.anio}
                  onChange={(e) => setNuevoPeriodo({...nuevoPeriodo, anio: parseInt(e.target.value)})}
                  inputProps={{ min: 2020, max: 2030 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descripción (opcional)"
                  value={nuevoPeriodo.descripcion}
                  onChange={(e) => setNuevoPeriodo({...nuevoPeriodo, descripcion: e.target.value})}
                  placeholder="Ej: Nómina Agosto 2024"
                  helperText="Si no especificas, se generará automáticamente"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreatePeriodoDialog(false)}>Cancelar</Button>
          <Button
            onClick={crearPeriodo}
            variant="contained"
            disabled={loading || !nuevoPeriodo.mes || !nuevoPeriodo.anio}
          >
            Crear Período
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Unificado de Validación de Empleados */}
      <Dialog
        open={openValidacionUnificadaDialog}
        onClose={() => {}}
        maxWidth="lg"
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle>
          <Typography variant="h5" fontWeight="bold">
            {empleadosNoEncontrados.length + empleadosSinSucursal.length} problema(s) detectado(s)
          </Typography>
        </DialogTitle>
        <DialogContent>
          {/* SECCIÓN 1: Empleados que NO EXISTEN */}
          {empleadosNoEncontrados.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonAddIcon color="error" />
                Empleados que no existen ({empleadosNoEncontrados.length})
              </Typography>
              <Alert severity="error" sx={{ mb: 2 }}>
                Los siguientes empleados no están registrados. Debe asignarles razón social y sucursales.
              </Alert>

              {empleadosNoEncontrados.map((empleado) => (
                <Card key={empleado.rut} sx={{ mb: 2 }}>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <Typography variant="subtitle2" color="text.secondary">Empleado</Typography>
                        <Typography variant="body1" fontWeight="bold">{empleado.nombre_completo}</Typography>
                        <Typography variant="body2" color="text.secondary">RUT: {empleado.rut}</Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth required size="small">
                          <InputLabel>Razón Social *</InputLabel>
                          <Select
                            value={datosEmpleados[empleado.rut]?.id_razon_social || ''}
                            onChange={(e) => handleDatosEmpleadoChange(empleado.rut, 'id_razon_social', e.target.value)}
                            label="Razón Social *"
                          >
                            {razonesSociales.map(rs => (
                              <MenuItem key={rs.id} value={rs.id}>{rs.nombre_razon}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Autocomplete
                          multiple
                          size="small"
                          options={sucursales}
                          getOptionLabel={(option) => option.nombre}
                          value={sucursales.filter(s => (datosEmpleados[empleado.rut]?.sucursales || []).includes(s.id))}
                          onChange={(event, newValue) => handleDatosEmpleadoChange(empleado.rut, 'sucursales', newValue.map(v => v.id))}
                          renderInput={(params) => <TextField {...params} label="Sucursales *" required />}
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => <Chip label={option.nombre} {...getTagProps({ index })} size="small" />)
                          }
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {/* SECCIÓN 2: Empleados SIN SUCURSAL */}
          {empleadosSinSucursal.length > 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon color="warning" />
                Empleados sin sucursal ({empleadosSinSucursal.length})
              </Typography>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Estos empleados existen pero no tienen sucursal asignada. Debe asignarles al menos una.
              </Alert>

              {empleadosSinSucursal.map((empleado) => (
                <Card key={empleado.id_empleado} sx={{ mb: 2 }}>
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="text.secondary">Empleado</Typography>
                        <Typography variant="body1" fontWeight="bold">{empleado.nombre_completo || `${empleado.nombre} ${empleado.apellido}`}</Typography>
                        <Typography variant="body2" color="text.secondary">RUT: {empleado.rut}</Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Autocomplete
                          multiple
                          size="small"
                          options={sucursales}
                          getOptionLabel={(option) => option.nombre}
                          value={sucursales.filter(s => (datosEmpleados[empleado.id_empleado]?.sucursales || []).includes(s.id))}
                          onChange={(event, newValue) => handleDatosEmpleadoChange(empleado.id_empleado, 'sucursales', newValue.map(v => v.id))}
                          renderInput={(params) => <TextField {...params} label="Sucursales *" required />}
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => <Chip label={option.nombre} {...getTagProps({ index })} size="small" />)
                          }
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenValidacionUnificadaDialog(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={guardarEmpleadosUnificado}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          >
            {loading ? 'Guardando...' : 'Guardar y Continuar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🔥 NUEVO: Dialog Detalles Completos del Empleado */}
      <Dialog
        open={openDetalleEmpleadoDialog}
        onClose={handleCloseDetalleEmpleado}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="bold">
              Detalles de Remuneración
            </Typography>
            <IconButton onClick={handleCloseDetalleEmpleado} size="small">
              <DeleteIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {empleadoSeleccionado && (
            <Box sx={{ mt: 2 }}>
              {/* Información del Empleado */}
              <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.main', color: 'white' }}>
                <Typography variant="h6" gutterBottom>
                  {empleadoSeleccionado.nombre_empleado || empleadoSeleccionado.nombre_completo}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2">RUT: {empleadoSeleccionado.rut_empleado}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">Razón Social: {empleadoSeleccionado.nombre_razon}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2">Sucursal: {empleadoSeleccionado.sucursal_nombre}</Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Haberes */}
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="success.main">
                  💵 Haberes
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Sueldo Base:</Typography>
                    <Typography variant="body1" fontWeight="medium">{formatMoney(empleadoSeleccionado.sueldo_base || 0)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Horas Extras:</Typography>
                    <Typography variant="body1" fontWeight="medium">{formatMoney(empleadoSeleccionado.horas_extras || 0)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Gratificación Legal:</Typography>
                    <Typography variant="body1" fontWeight="medium">{formatMoney(empleadoSeleccionado.gratificacion_legal || 0)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Otros Imponibles:</Typography>
                    <Typography variant="body1" fontWeight="medium">{formatMoney(empleadoSeleccionado.otros_imponibles || 0)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Asignación Familiar:</Typography>
                    <Typography variant="body1" fontWeight="medium">{formatMoney(empleadoSeleccionado.asignacion_familiar || 0)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Otros No Imponibles:</Typography>
                    <Typography variant="body1" fontWeight="medium">{formatMoney(empleadoSeleccionado.otros_no_imponibles || 0)}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2" color="text.secondary">Total Haberes:</Typography>
                    <Typography variant="h6" fontWeight="bold" color="success.main">{formatMoney(empleadoSeleccionado.total_haberes || 0)}</Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Descuentos */}
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="error.main">
                  💸 Descuentos
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Previsión (AFP):</Typography>
                    <Typography variant="body1" fontWeight="medium">{formatMoney(empleadoSeleccionado.descuento_prevision || 0)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Salud:</Typography>
                    <Typography variant="body1" fontWeight="medium">{formatMoney(empleadoSeleccionado.descuento_salud || 0)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Impuesto Único:</Typography>
                    <Typography variant="body1" fontWeight="medium">{formatMoney(empleadoSeleccionado.impuesto_unico || 0)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Seguro Cesantía:</Typography>
                    <Typography variant="body1" fontWeight="medium">{formatMoney(empleadoSeleccionado.seguro_cesantia || 0)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Otros Descuentos Legales:</Typography>
                    <Typography variant="body1" fontWeight="medium">{formatMoney(empleadoSeleccionado.otros_descuentos_legales || 0)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Descuentos Varios:</Typography>
                    <Typography variant="body1" fontWeight="medium">{formatMoney(empleadoSeleccionado.descuentos_varios || 0)}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2" color="text.secondary">Total Descuentos:</Typography>
                    <Typography variant="h6" fontWeight="bold" color="error.main">{formatMoney(empleadoSeleccionado.total_descuentos || 0)}</Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Costos Patronales */}
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="warning.main">
                  💼 Costos Patronales
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Caja Compensación:</Typography>
                    <Typography variant="body1" fontWeight="medium">{formatMoney(empleadoSeleccionado.caja_compensacion || 0)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">AFC:</Typography>
                    <Typography variant="body1" fontWeight="medium">{formatMoney(empleadoSeleccionado.afc || 0)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">SIS:</Typography>
                    <Typography variant="body1" fontWeight="medium">{formatMoney(empleadoSeleccionado.sis || 0)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">ACH:</Typography>
                    <Typography variant="body1" fontWeight="medium">{formatMoney(empleadoSeleccionado.ach || 0)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Imposiciones Patronales:</Typography>
                    <Typography variant="body1" fontWeight="medium">{formatMoney(empleadoSeleccionado.imposiciones || 0)}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2" color="text.secondary">Total Costos Patronales:</Typography>
                    <Typography variant="h6" fontWeight="bold" color="warning.main">
                      {formatMoney(
                        (empleadoSeleccionado.caja_compensacion || 0) +
                        (empleadoSeleccionado.afc || 0) +
                        (empleadoSeleccionado.sis || 0) +
                        (empleadoSeleccionado.ach || 0) +
                        (empleadoSeleccionado.imposiciones || 0)
                      )}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Resultado Final */}
              <Paper sx={{ p: 2, bgcolor: 'info.main', color: 'white' }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2">Líquido a Pagar:</Typography>
                    <Typography variant="h5" fontWeight="bold">{formatMoney(empleadoSeleccionado.liquido_pagar || 0)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">Total Costo Empresa:</Typography>
                    <Typography variant="h5" fontWeight="bold">{formatMoney(empleadoSeleccionado.total_costo || 0)}</Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetalleEmpleado}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RemuneracionesPage;