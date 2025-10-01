// RemuneracionesPage.jsx - VERSIÓN COMPLETA CORREGIDA CON PORCENTAJES OBLIGATORIOS Y UNICODE
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
  validarEmpleadosSinAsignacion: (ruts) => api.post('/remuneraciones/validar-empleados-sin-asignacion', { ruts_empleados: ruts }),
  asignarRazonSocialYSucursal: (asignaciones) => api.post('/remuneraciones/asignar-razon-social-sucursal', { asignaciones }),
  // NUEVOS ENDPOINTS PARA PORCENTAJES
  obtenerPorcentajesPorPeriodo: (id_periodo, id_razon_social) => api.get(`/remuneraciones/porcentajes/${id_periodo}/${id_razon_social}`),
  guardarPorcentajesPorPeriodo: (datos) => api.post('/remuneraciones/porcentajes', datos)
};

// API para razones sociales y sucursales
const catalogosAPI = {
  getRazonesSociales: () => api.get('/razonessociales'),
  getSucursales: () => api.get('/sucursales')
};

// Pasos del proceso de carga profesional CON PORCENTAJES OBLIGATORIOS
const pasosCarga = [
  'Seleccionar Período',
  'Cargar Archivo',
  'Análisis Automático',
  'Configurar Mapeo',
  'Configurar Porcentajes OBLIGATORIO', // NUEVO PASO CRÍTICO
  'Procesar Nómina',
  'Asignar Empleados'
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
  
  // ESTADOS PARA MODAL DE ASIGNACIÓN
  const [openAsignacionDialog, setOpenAsignacionDialog] = useState(false);
  const [empleadosSinAsignacion, setEmpleadosSinAsignacion] = useState([]);
  const [asignacionesTemporales, setAsignacionesTemporales] = useState({});
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
    descripcion: '',
    id_razon_social: '',
    id_sucursal: ''
  });
  
  // Estados para tabs y configuración avanzada
  const [tabValue, setTabValue] = useState(0);
  const [validarDuplicados, setValidarDuplicados] = useState(true);
  
  // Estados para paginación de empleados mejorados
  const [filtroEmpleados, setFiltroEmpleados] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [empleadosPorPagina, setEmpleadosPorPagina] = useState(50);
  
  // NUEVOS ESTADOS PARA FILTRADO ESPECÍFICO
  const [filtroRazonSocialDetalle, setFiltroRazonSocialDetalle] = useState('todos');
  const [filtroSucursalDetalle, setFiltroSucursalDetalle] = useState('todos');
  
  // Estados para Snackbar mejorado
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // FUNCIÓN SHOWSNACKBAR - DEBE ESTAR DEFINIDA ANTES DE SU USO
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
      // Normalizar Unicode a forma canónica
      .normalize('NFD')
      // Reemplazar caracteres problemáticos comunes
      .replace(/Ã±/g, 'ñ')
      .replace(/Ã¡/g, 'á')
      .replace(/Ã©/g, 'é')
      .replace(/Ã­/g, 'í')
      .replace(/Ã³/g, 'ó')
      .replace(/Ãº/g, 'ú')
      .replace(/Ã/g, 'Ñ')
      .replace(/Ã/g, 'Á')
      .replace(/Ã‰/g, 'É')
      .replace(/Ã/g, 'Í')
      .replace(/Ã"/g, 'Ó')
      .replace(/Ãš/g, 'Ú')
      // Limpiar caracteres de control y espacios extra
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // FUNCIÓN CRÍTICA: PROCESAR VALORES MONETARIOS CHILENOS SIN TRUNCAR
  const procesarValorMonetarioChileno = (valor) => {
    if (!valor || valor === '' || valor === null || valor === undefined) return '0';
    
    // MANTENER COMO STRING PARA EVITAR TRUNCAMIENTO
    let valorString = String(valor).trim();
    
    // Limpiar Unicode
    valorString = limpiarUnicode(valorString);
    
    // Remover caracteres no numéricos excepto puntos y comas
    valorString = valorString.replace(/[^\d.,-]/g, '');
    
    if (!valorString) return '0';
    
    // EN CHILE: punto es separador de miles, coma es decimal
    // Pero Excel puede variar, por eso aplicamos lógica inteligente
    
    if (valorString.includes(',') && valorString.includes('.')) {
      const ultimaComa = valorString.lastIndexOf(',');
      const ultimoPunto = valorString.lastIndexOf('.');
      
      if (ultimoPunto > ultimaComa) {
        // Formato americano: 1,234,567.89 -> remover comas
        valorString = valorString.replace(/,/g, '');
      } else {
        // Formato chileno: 1.234.567,89 -> convertir
        valorString = valorString.replace(/\./g, '').replace(',', '.');
      }
    } else if (valorString.includes(',')) {
      const partes = valorString.split(',');
      if (partes.length === 2 && partes[1].length <= 2) {
        // Formato decimal: 123456,89
        valorString = valorString.replace(',', '.');
      } else {
        // Separador de miles: 123,456,789
        valorString = valorString.replace(/,/g, '');
      }
    } else if (valorString.includes('.')) {
      const partes = valorString.split('.');
      if (partes.length === 2 && partes[1].length <= 2 && partes[0].length <= 6) {
        // Podría ser decimal: 123456.89
        // Mantener como está
      } else {
        // Separador de miles: 123.456.789
        valorString = valorString.replace(/\./g, '');
      }
    }
    
    // Convertir a número para validar
    const numero = parseFloat(valorString);
    
    if (isNaN(numero) || !isFinite(numero)) {
      console.warn(`Valor no convertible: "${valor}" -> "0"`);
      return '0';
    }
    
    // RETORNAR COMO STRING PARA EVITAR TRUNCAMIENTO EN EL BACKEND
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

  // CARGAR CATÁLOGOS PARA MODAL DE ASIGNACIÓN
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

  // EFFECT MEJORADO CON MEJOR MANEJO DE ERRORES
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

  // EFFECT PARA RECARGAR PERÍODOS CUANDO CAMBIAN LOS FILTROS
  useEffect(() => {
    cargarPeriodos();
  }, [cargarPeriodos]);

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
    // Validaciones mejoradas
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
        
        // Si se creó o ya existía, seleccionarlo para uso inmediato
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
      descripcion: '',
      id_razon_social: '',
      id_sucursal: ''
    });
  };

  // FUNCIONES PARA ACCIONES DE PERÍODOS MEJORADAS
  const handleVerPeriodo = async (periodo) => {
    try {
      setLoading(true);
      setSelectedPeriodo(periodo);
      
      // Resetear filtros y paginación
      setFiltroEmpleados('');
      setFiltroRazonSocialDetalle('todos');
      setFiltroSucursalDetalle('todos');
      setPaginaActual(1);
      setEmpleadosPorPagina(50);
      
      console.log(`Cargando detalles del período ${periodo.id_periodo}...`);
      
      const response = await remuneracionesAPI.obtenerDatosPeriodo(periodo.id_periodo);
      
      if (response.data.success) {
        setSelectedPeriodo({
          ...periodo,
          datos: response.data.data
        });
        setOpenViewDialog(true);
        
        showSnackbar(
          `Período cargado: ${response.data.data.length} registros encontrados`, 
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

  // PROCESAMIENTO DE EXCEL COMPLETAMENTE MEJORADO Y CORREGIDO CON UNICODE
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validación previa
    if (!periodoSeleccionado) {
      showSnackbar('Debe seleccionar un período antes de cargar el archivo', 'error');
      return;
    }

    // Validar tipo de archivo
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      showSnackbar('Solo se permiten archivos Excel (.xlsx, .xls)', 'error');
      return;
    }

    // Validar tamaño (máximo 10MB)
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
        
        // CRÍTICO: LEER CON MANEJO MEJORADO Y UNICODE - COMO STRING PARA EVITAR TRUNCAMIENTO
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, 
          defval: '', 
          blankrows: false,
          raw: false // Importante: tratamos todo como string inicialmente
        });
        
        console.log('Datos raw del Excel (primeras 10 filas):', jsonData.slice(0, 10));
        
        if (jsonData.length < 2) {
          throw new Error('El archivo debe tener al menos 2 filas (encabezados + datos)');
        }

        // BÚSQUEDA INTELIGENTE DE HEADERS CON UNICODE
        let headerRowIndex = buscarFilaHeadersConUnicode(jsonData);

        if (headerRowIndex === -1) {
          throw new Error('No se encontraron encabezados válidos. El archivo debe contener columnas RUT, NOMBRE y campos monetarios');
        }

        // LIMPIAR HEADERS CON UNICODE
        const headers = jsonData[headerRowIndex]
          .map(h => h ? limpiarUnicode(String(h).trim()) : '')
          .filter(h => h && h !== '');
        
        const rows = procesarFilasDatosConUnicode(jsonData, headerRowIndex);
        
        console.log(`Headers detectados con Unicode (${headers.length}):`, headers.slice(0, 10));
        console.log(`Filas de datos válidas: ${rows.length}`);
        
        if (headers.length < 3) {
          throw new Error('No se detectaron suficientes columnas válidas en los encabezados');
        }

        // CONVERSIÓN MEJORADA A OBJETOS CON UNICODE - MANTENER TODO COMO STRING
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
          // CRÍTICO: MANTENER COMO STRING PARA EVITAR TRUNCAMIENTO DE NÚMEROS GRANDES
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

  // FUNCIÓN CRÍTICA CORREGIDA: Crear mapeo mejorado con Unicode
  const crearMapeoMejoradoConUnicode = (headers, mapeoBackend) => {
    const mapeoMejorado = { ...mapeoBackend };
    
    headers.forEach(header => {
      const headerLimpio = limpiarUnicode(header);
      const headerUpper = headerLimpio.toUpperCase().trim();
      
      // DETECCIÓN CRÍTICA DE LÍQUIDO CON UNICODE
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
        
        // CRÍTICO: Crear mapeo mejorado con Unicode
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

  // PROCESAMIENTO DE EXCEL CON PORCENTAJES OBLIGATORIOS
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

    if (!porcentajesValidos) {
      showSnackbar('Debe configurar al menos un porcentaje válido', 'error');
      return;
    }

    if (!mapeoColumnas.rut_empleado || !mapeoColumnas.nombre_empleado) {
      showSnackbar('RUT y Nombre son campos obligatorios para el procesamiento', 'error');
      return;
    }

    setLoading(true);
    setActiveStep(5); // Paso de procesamiento
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

      // PROCESAR DATOS APLICANDO CONVERSIÓN DE VALORES MONETARIOS
      const datosConVertidos = excelData.map(fila => {
        const filaProcesada = { ...fila };
        
        // Aplicar conversión monetaria a campos específicos
        Object.keys(fila).forEach(columna => {
          const valor = fila[columna];
          const columnaLimpia = limpiarUnicode(columna).toUpperCase();
          
          // Detectar campos monetarios y procesarlos
          if (columnaLimpia.includes('BASE') || columnaLimpia.includes('HABERES') || 
              columnaLimpia.includes('DESCUENTO') || columnaLimpia.includes('LIQUIDO') ||
              columnaLimpia.includes('TOTAL') || columnaLimpia.includes('PAGAR') ||
              columnaLimpia.includes('IMPOSICION') || columnaLimpia.includes('AFC') ||
              columnaLimpia.includes('PREVISION') || columnaLimpia.includes('SALUD')) {
            
            filaProcesada[columna] = procesarValorMonetarioChileno(valor);
            
            // Log para campos críticos
            if (columnaLimpia.includes('LIQUIDO') || columnaLimpia.includes('BASE')) {
              console.log(`Procesando ${columna}: "${valor}" -> "${filaProcesada[columna]}"`);
            }
          }
        });
        
        return filaProcesada;
      });

      console.log('Enviando datos al servidor con porcentajes:', {
        totalFilas: datosConVertidos.length,
        periodo: periodoSeleccionado,
        razonSocial: razonSocialSeleccionada,
        archivo: excelFile.name,
        mapeoColumnas: mapeoColumnas,
        porcentajes: porcentajes,
        primeraFila: datosConVertidos[0]
      });

      // CRÍTICO: Enviar datos completos con porcentajes
      const response = await remuneracionesAPI.procesarExcel({
        datosExcel: datosConVertidos, // USAR DATOS CONVERTIDOS
        archivoNombre: excelFile.name,
        validarDuplicados,
        id_periodo: periodoSeleccionado,
        id_razon_social: razonSocialSeleccionada, // OBLIGATORIO
        mapeoColumnas: mapeoColumnas,
        porcentajes: porcentajes // OBLIGATORIO
      });

      if (response.data.success) {
        const resultado = response.data.data;
        setResultadoProcesamiento(resultado);
        
        // VALIDAR SI HAY EMPLEADOS SIN ASIGNACIÓN
        if (resultado.empleados_para_validar && resultado.empleados_para_validar.length > 0) {
          console.log('Validando empleados sin asignación...');
          
          const validacionResponse = await remuneracionesAPI.validarEmpleadosSinAsignacion(
            resultado.empleados_para_validar
          );
          
          if (validacionResponse.data.success && validacionResponse.data.data.requiere_asignacion) {
            setEmpleadosSinAsignacion(validacionResponse.data.data.empleados_sin_asignacion);
            setActiveStep(6); // Ir al paso de asignación
            return; // No cerrar el dialog aún
          }
        }
        
        // MENSAJE MEJORADO CON PORCENTAJES
        let mensaje = `Procesamiento exitoso con porcentajes: ${resultado.procesados}/${resultado.total_filas} registros`;
        
        if (resultado.empleados_creados > 0) {
          mensaje += `\n${resultado.empleados_creados} empleados nuevos creados`;
        }
        
        if (resultado.empleados_encontrados > 0) {
          mensaje += `\n${resultado.empleados_encontrados} empleados existentes`;
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

  // MANEJAR ASIGNACIÓN DE RAZÓN SOCIAL Y SUCURSAL
  const handleAsignacionChange = (empleadoId, campo, valor) => {
    setAsignacionesTemporales(prev => ({
      ...prev,
      [empleadoId]: {
        ...prev[empleadoId],
        id_empleado: empleadoId,
        [campo]: valor
      }
    }));
  };

  const procesarAsignaciones = async () => {
    try {
      setLoading(true);
      
      const asignaciones = Object.values(asignacionesTemporales).filter(asig => 
        asig.id_razon_social || asig.id_sucursal
      );
      
      if (asignaciones.length === 0) {
        showSnackbar('Debe asignar al menos una razón social o sucursal', 'warning');
        return;
      }
      
      console.log('Procesando asignaciones:', asignaciones);
      
      const response = await remuneracionesAPI.asignarRazonSocialYSucursal(asignaciones);
      
      if (response.data.success) {
        showSnackbar(`${response.data.data.empleados_actualizados} empleados actualizados`, 'success');
        
        // Finalizar proceso
        await Promise.all([
          cargarPeriodos(),
          cargarEstadisticas()
        ]);
        
        handleCloseExcelDialog();
      } else {
        throw new Error(response.data.message || 'Error al asignar razón social y sucursal');
      }
    } catch (err) {
      console.error('Error en asignaciones:', err);
      showSnackbar(err.response?.data?.message || 'Error al procesar asignaciones', 'error');
    } finally {
      setLoading(false);
    }
  };

  // FUNCIONES AUXILIARES MEJORADAS
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
    setEmpleadosSinAsignacion([]);
    setAsignacionesTemporales({});
    setResultadoProcesamiento(null);
    // RESETEAR ESTADOS DE PORCENTAJES
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

  // FUNCIONES DE UTILIDAD MEJORADAS
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

  // CÁLCULOS MEJORADOS
  const periodosFiltrados = React.useMemo(() => {
    return periodos.filter(periodo => {
      if (filtroEstado === 'todos') return true;
      return periodo.estado === filtroEstado;
    });
  }, [periodos, filtroEstado]);

  // FUNCIÓN PARA AGRUPAR PERÍODOS POR RAZÓN SOCIAL Y SUCURSAL
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

  // FUNCIÓN PARA OBTENER OPCIONES ÚNICAS DE FILTRADO EN EL MODAL DE DETALLES
  const opcionesFiltroDetalle = React.useMemo(() => {
    if (!selectedPeriodo?.datos) return { razonesSociales: [], sucursales: [] };
    
    const razones = [...new Set(selectedPeriodo.datos.map(emp => emp.nombre_razon).filter(Boolean))];
    const sucursales = [...new Set(selectedPeriodo.datos.map(emp => emp.sucursal_nombre).filter(Boolean))];
    
    return {
      razonesSociales: razones,
      sucursales: sucursales
    };
  }, [selectedPeriodo?.datos]);

  // Cálculos para paginación de empleados optimizados CON FILTRADO ESPECÍFICO
  const empleadosFiltrados = React.useMemo(() => {
    if (!selectedPeriodo?.datos) return [];
    
    return selectedPeriodo.datos.filter(empleado => {
      // Filtro por nombre o RUT
      if (filtroEmpleados) {
        const filtro = filtroEmpleados.toLowerCase();
        const nombre = (empleado.nombre_empleado || empleado.nombre_completo || '').toLowerCase();
        const rut = (empleado.rut_empleado || '').toLowerCase();
        if (!nombre.includes(filtro) && !rut.includes(filtro)) {
          return false;
        }
      }
      
      // Filtro por razón social específica
      if (filtroRazonSocialDetalle !== 'todos') {
        if (empleado.nombre_razon !== filtroRazonSocialDetalle) {
          return false;
        }
      }
      
      // Filtro por sucursal específica
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

  // FUNCIÓN CRÍTICA CORREGIDA: Filtrar columnas para ocultar sueldo base en vista previa
  const obtenerColumnasParaVistaPrevia = useCallback(() => {
    if (!previewData || previewData.length === 0) return [];
    
    const todasLasColumnas = Object.keys(previewData[0] || {});
    
    // FILTRAR SUELDO BASE - buscamos todas las posibles variaciones
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

  // FUNCIÓN PARA OBTENER DATOS FILTRADOS SIN SUELDO BASE
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

  // COMPONENTE PARA CONFIGURAR PORCENTAJES
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

  // COMPONENTES DE RENDERIZADO MEJORADOS (mantener todos los existentes)
  const renderFiltros = () => (
    <Paper sx={{ 
      p: 3, 
      mb: 3,
      background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
      border: '1px solid rgba(0,0,0,0.05)'
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
          <FilterListIcon sx={{ mr: 1, color: '#f37d16' }} />
          Filtros de Búsqueda
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ClearAllIcon />}
          onClick={limpiarFiltros}
          size="small"
          sx={{ 
            borderColor: '#f37d16', 
            color: '#f37d16',
            '&:hover': { borderColor: '#e06c00', bgcolor: 'rgba(243, 125, 22, 0.1)' }
          }}
        >
          Limpiar Filtros
        </Button>
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Razón Social</InputLabel>
            <Select
              value={filtros.razon_social_id}
              onChange={(e) => handleFiltroChange('razon_social_id', e.target.value)}
              label="Razón Social"
            >
              <MenuItem value="todos">Todas las razones sociales</MenuItem>
              {opcionesFiltros.razones_sociales.map(razon => (
                <MenuItem key={razon.id} value={razon.id}>
                  {razon.nombre_razon}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Sucursal</InputLabel>
            <Select
              value={filtros.sucursal_id}
              onChange={(e) => handleFiltroChange('sucursal_id', e.target.value)}
              label="Sucursal"
            >
              <MenuItem value="todos">Todas las sucursales</MenuItem>
              {opcionesFiltros.sucursales.map(sucursal => (
                <MenuItem key={sucursal.id} value={sucursal.id}>
                  {sucursal.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Año</InputLabel>
            <Select
              value={filtros.anio}
              onChange={(e) => handleFiltroChange('anio', e.target.value)}
              label="Año"
            >
              <MenuItem value="todos">Todos los años</MenuItem>
              {opcionesFiltros.anios.map(anio => (
                <MenuItem key={anio} value={anio}>
                  {anio}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Estado</InputLabel>
            <Select
              value={filtros.estado}
              onChange={(e) => handleFiltroChange('estado', e.target.value)}
              label="Estado"
            >
              <MenuItem value="todos">Todos los estados</MenuItem>
              <MenuItem value="ACTIVO">Activos</MenuItem>
              <MenuItem value="INACTIVO">Inactivos</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <FormControlLabel
            control={
              <Switch
                checked={viewMode === 'cards'}
                onChange={(e) => setViewMode(e.target.checked ? 'cards' : 'table')}
                color="primary"
              />
            }
            label="Vista Cards"
          />
        </Grid>
      </Grid>
      
      {/* Mostrar filtros activos */}
      {Object.values(filtros).some(f => f !== 'todos') && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Filtros activos:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {filtros.razon_social_id !== 'todos' && (
              <Chip 
                label={`Razón Social: ${opcionesFiltros.razones_sociales.find(r => r.id == filtros.razon_social_id)?.nombre_razon || 'N/A'}`}
                size="small"
                color="primary"
                onDelete={() => handleFiltroChange('razon_social_id', 'todos')}
              />
            )}
            {filtros.sucursal_id !== 'todos' && (
              <Chip 
                label={`Sucursal: ${opcionesFiltros.sucursales.find(s => s.id == filtros.sucursal_id)?.nombre || 'N/A'}`}
                size="small"
                color="primary"
                onDelete={() => handleFiltroChange('sucursal_id', 'todos')}
              />
            )}
            {filtros.anio !== 'todos' && (
              <Chip 
                label={`Año: ${filtros.anio}`}
                size="small"
                color="primary"
                onDelete={() => handleFiltroChange('anio', 'todos')}
              />
            )}
            {filtros.estado !== 'todos' && (
              <Chip 
                label={`Estado: ${filtros.estado}`}
                size="small"
                color="primary"
                onDelete={() => handleFiltroChange('estado', 'todos')}
              />
            )}
          </Box>
        </Box>
      )}
    </Paper>
  );

  const renderEstadisticas = () => (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <AnalyticsIcon sx={{ mr: 1, color: '#f37d16' }} />
        Dashboard Ejecutivo de Remuneraciones
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            transition: 'transform 0.3s ease',
            '&:hover': { transform: 'translateY(-4px)' }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="inherit" variant="h4" component="div">
                    {estadisticas?.total_empleados || 0}
                  </Typography>
                  <Typography color="inherit" variant="body2">
                    Empleados Procesados
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                  <PeopleIcon fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            transition: 'transform 0.3s ease',
            '&:hover': { transform: 'translateY(-4px)' }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="inherit" variant="h4" component="div">
                    {estadisticas?.total_periodos || 0}
                  </Typography>
                  <Typography color="inherit" variant="body2">
                    Períodos Procesados
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                  <CalendarTodayIcon fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white',
            transition: 'transform 0.3s ease',
            '&:hover': { transform: 'translateY(-4px)' }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="inherit" variant="h4" component="div">
                    {estadisticas?.total_remuneraciones || 0}
                  </Typography>
                  <Typography color="inherit" variant="body2">
                    Liquidaciones Procesadas
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                  <AssessmentIcon fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            color: 'white',
            transition: 'transform 0.3s ease',
            '&:hover': { transform: 'translateY(-4px)' }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="inherit" variant="h4" component="div" sx={{ fontSize: '1.5rem' }}>
                    {formatMoney(estadisticas?.suma_liquidos)}
                  </Typography>
                  <Typography color="inherit" variant="body2">
                    Total Nómina
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                  <AttachMoneyIcon fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  // NUEVA FUNCIÓN PARA RENDERIZAR PERÍODOS AGRUPADOS VISUALMENTE
  const renderPeriodosAgrupados = () => (
    <Box>
      {Object.keys(periodosAgrupados).length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CalendarTodayIcon sx={{ fontSize: 100, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h5" color="text.secondary" gutterBottom>
            No hay períodos de remuneración
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {Object.values(filtros).some(f => f !== 'todos') ? 
              'No se encontraron períodos con los filtros aplicados. Intente modificar los criterios de búsqueda.' :
              'Comience creando un período y luego cargue los archivos Excel con los datos de nómina'
            }
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenCreatePeriodoDialog(true)}
            sx={{ 
              bgcolor: '#f37d16', 
              '&:hover': { bgcolor: '#e06c00' },
              boxShadow: '0 4px 15px rgba(243, 125, 22, 0.3)',
              mr: 2
            }}
          >
            Crear Período
          </Button>
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={() => setOpenExcelDialog(true)}
            sx={{ 
              borderColor: '#f37d16', 
              color: '#f37d16',
              '&:hover': { borderColor: '#e06c00', bgcolor: 'rgba(243, 125, 22, 0.1)' }
            }}
          >
            Cargar Nómina
          </Button>
        </Box>
      ) : (
        Object.entries(periodosAgrupados).map(([razonSocial, sucursales]) => (
          <Box key={razonSocial} sx={{ mb: 4 }}>
            {/* Header de Razón Social */}
            <Paper sx={{ 
              p: 2, 
              mb: 2, 
              background: 'linear-gradient(135deg, #f37d16 0%, #e06c00 100%)', 
              color: 'white' 
            }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                <BusinessIcon sx={{ mr: 1 }} />
                {razonSocial}
                <Chip 
                  label={`${Object.values(sucursales).reduce((acc, periods) => acc + periods.length, 0)} períodos`}
                  size="small"
                  sx={{ ml: 2, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                />
              </Typography>
            </Paper>

            {/* Sucursales agrupadas */}
            {Object.entries(sucursales).map(([sucursal, periodos]) => (
              <Accordion 
                key={`${razonSocial}-${sucursal}`} 
                defaultExpanded={Object.keys(sucursales).length === 1}
                sx={{ mb: 2 }}
              >
                <AccordionSummary 
                  expandIcon={<ExpandMoreIcon />}
                  sx={{ 
                    bgcolor: '#f8f9fa',
                    '&:hover': { bgcolor: '#e9ecef' }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <ApartmentIcon sx={{ mr: 1, color: '#f37d16' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 'medium', flexGrow: 1 }}>
                      {sucursal}
                    </Typography>
                    <Chip 
                      label={`${periodos.length} períodos`}
                      size="small"
                      color="primary"
                      sx={{ mr: 2 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Total: {formatMoney(periodos.reduce((sum, p) => sum + (p.suma_liquidos || 0), 0))}
                    </Typography>
                  </Box>
                </AccordionSummary>
                
                <AccordionDetails sx={{ p: 0 }}>
                  <Grid container spacing={2} sx={{ p: 2 }}>
                    {periodos.map((periodo) => (
                      <Grid item xs={12} sm={6} md={4} key={periodo.id_periodo}>
                        <Card sx={{ 
                          height: '100%',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 25px rgba(0,0,0,0.12)'
                          },
                          border: '1px solid rgba(0,0,0,0.05)'
                        }}>
                          <CardHeader
                            avatar={
                              <Avatar sx={{ 
                                bgcolor: '#f37d16', 
                                width: 48, 
                                height: 48,
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                color: 'white'
                              }}>
                                {obtenerInicialMes(periodo.mes)}
                              </Avatar>
                            }
                            title={
                              <Typography variant="h6" component="div" sx={{ fontSize: '1rem' }}>
                                {periodo.descripcion}
                              </Typography>
                            }
                            subheader={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {periodo.mes}/{periodo.anio}
                                </Typography>
                                <Chip 
                                  label={periodo.estado} 
                                  color={periodo.estado === 'ACTIVO' ? 'success' : 'default'}
                                  size="small"
                                  sx={{ mt: 0.5 }}
                                />
                              </Box>
                            }
                          />
                          <CardContent sx={{ pt: 0 }}>
                            <Grid container spacing={1} sx={{ mb: 2, textAlign: 'center' }}>
                              <Grid item xs={4}>
                                <Typography variant="h6" color="primary" sx={{ fontSize: '1.1rem' }}>
                                  {periodo.total_registros || 0}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Registros
                                </Typography>
                              </Grid>
                              <Grid item xs={4}>
                                <Typography variant="h6" color="success.main" sx={{ fontSize: '1.1rem' }}>
                                  {periodo.empleados_encontrados || 0}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Empleados
                                </Typography>
                              </Grid>
                              <Grid item xs={4}>
                                <Typography variant="h6" color="warning.main" sx={{ fontSize: '1.1rem' }}>
                                  {periodo.empleados_faltantes || 0}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Faltantes
                                </Typography>
                              </Grid>
                            </Grid>

                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                <strong>Total Nómina:</strong> {formatMoney(periodo.suma_liquidos)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                <strong>Cargado:</strong> {periodo.fecha_carga ? 
                                  new Date(periodo.fecha_carga).toLocaleDateString('es-CL') : 
                                  'N/A'
                                }
                              </Typography>
                            </Box>
                            
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
                    ))}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        ))
      )}
    </Box>
  );

  // MODAL DE ASIGNACIÓN DE RAZÓN SOCIAL Y SUCURSAL
  const renderModalAsignacion = () => (
    <Dialog 
      open={activeStep === 6 && empleadosSinAsignacion.length > 0} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 3,
          background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
          minHeight: '70vh'
        }      
      }}
    >
      <DialogContent sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="h6">Empleados sin asignación completa</Typography>
          <Typography>
            Los siguientes empleados no tienen razón social o sucursal asignada. 
            Es necesario completar esta información antes de finalizar.
          </Typography>
        </Alert>

        <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Empleado</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>RUT</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Estado Actual</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Razón Social</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Sucursal</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {empleadosSinAsignacion.map((empleado) => (
                <TableRow key={empleado.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {empleado.nombre} {empleado.apellido}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{empleado.rut}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexDirection: 'column' }}>
                      {empleado.falta_razon_social && (
                        <Chip label="Sin Razón Social" size="small" color="error" />
                      )}
                      {empleado.falta_sucursal && (
                        <Chip label="Sin Sucursal" size="small" color="warning" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {empleado.falta_razon_social ? (
                      <FormControl fullWidth size="small">
                        <InputLabel>Seleccionar Razón Social</InputLabel>
                        <Select
                          value={asignacionesTemporales[empleado.id]?.id_razon_social || ''}
                          onChange={(e) => handleAsignacionChange(empleado.id, 'id_razon_social', e.target.value)}
                          label="Seleccionar Razón Social"
                        >
                          {razonesSociales.map(razon => (
                            <MenuItem key={razon.id} value={razon.id}>
                              {razon.nombre_razon}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : (
                      <Chip label={empleado.nombre_razon || 'N/A'} size="small" color="success" />
                    )}
                  </TableCell>
                  <TableCell>
                    {empleado.falta_sucursal ? (
                      <FormControl fullWidth size="small">
                        <InputLabel>Seleccionar Sucursal</InputLabel>
                        <Select
                          value={asignacionesTemporales[empleado.id]?.id_sucursal || ''}
                          onChange={(e) => handleAsignacionChange(empleado.id, 'id_sucursal', e.target.value)}
                          label="Seleccionar Sucursal"
                        >
                          {sucursales.map(sucursal => (
                            <MenuItem key={sucursal.id} value={sucursal.id}>
                              {sucursal.nombre}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : (
                      <Chip label="Asignada" size="small" color="success" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(243, 125, 22, 0.1)', borderRadius: 2 }}>
          <Typography variant="body2" color="primary">
            Una vez asignadas las razones sociales y sucursales, los empleados podrán 
            ser correctamente categorizados en futuros procesamientos.
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 0, justifyContent: 'space-between' }}>
        <Button 
          onClick={() => {
            // Permitir continuar sin asignar
            handleCloseExcelDialog();
          }}
          disabled={loading}
          startIcon={<DeleteIcon />}
        >
          Continuar sin Asignar
        </Button>
        
        <Button
          onClick={procesarAsignaciones}
          variant="contained"
          disabled={loading || Object.keys(asignacionesTemporales).length === 0}
          startIcon={loading ? <CircularProgress size={20} /> : <AssignmentIcon />}
          sx={{ 
            bgcolor: '#f37d16', 
            '&:hover': { bgcolor: '#e06c00' },
            minWidth: 160
          }}
        >
          {loading ? 'Procesando...' : 'Asignar y Finalizar'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // RENDER PRINCIPAL DEL COMPONENTE
  return (
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: '#f8f9fa' }}>
      {/* Header profesional mejorado */}
      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Box sx={{ position: 'absolute', top: -50, right: -50, opacity: 0.1 }}>
          <BusinessIcon sx={{ fontSize: 200 }} />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
              Sistema Profesional de Remuneraciones
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              Gestión integral de nóminas y liquidaciones de sueldo con filtros avanzados
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
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setOpenCreatePeriodoDialog(true)}
              sx={{ 
                borderColor: 'white', 
                color: 'white',
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
              }}
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
              sx={{ 
                borderColor: 'white', 
                color: 'white',
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
              }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Actualizar'}
            </Button>
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => setOpenExcelDialog(true)}
              sx={{ 
                bgcolor: '#f37d16', 
                '&:hover': { bgcolor: '#e06c00' },
                boxShadow: '0 4px 15px rgba(243, 125, 22, 0.3)'
              }}
            >
              Procesar Nómina
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Error Alert mejorado */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }} 
          onClose={() => setError(null)}
          icon={<ErrorIcon />}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => {
                setError(null);
                testConexion();
              }}
            >
              REINTENTAR
            </Button>
          }
        >
          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
            {error}
          </Typography>
        </Alert>
      )}

      {/* Estadísticas */}
      {estadisticas && renderEstadisticas()}

      {/* Filtros mejorados */}
      {renderFiltros()}

      {/* Toggle entre vista agrupada y vista normal */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
          <AccountTreeIcon sx={{ mr: 1, color: '#f37d16' }} />
          Períodos de Remuneración ({periodosFiltrados.length} total)
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={viewMode === 'grouped'}
                onChange={(e) => setViewMode(e.target.checked ? 'grouped' : 'cards')}
                color="primary"
              />
            }
            label="Vista Agrupada"
          />
          <FormControlLabel
            control={
              <Switch
                checked={viewMode === 'cards'}
                onChange={(e) => setViewMode(e.target.checked ? 'cards' : 'table')}
                color="primary"
                disabled={viewMode === 'grouped'}
              />
            }
            label="Vista Cards"
          />
        </Box>
      </Paper>

      {/* Contenido principal mejorado */}
      <Paper sx={{ overflow: 'hidden', minHeight: '400px', borderRadius: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 6 }}>
            <CircularProgress size={60} sx={{ mb: 2, color: '#f37d16' }} />
            <Typography variant="h6" color="text.secondary">
              Procesando datos...
            </Typography>
            {processingStatus && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {processingStatus}
              </Typography>
            )}
          </Box>
        ) : viewMode === 'grouped' ? (
          <Box sx={{ p: 3 }}>
            {renderPeriodosAgrupados()}
          </Box>
        ) : viewMode === 'cards' ? (
          <Box sx={{ p: 3 }}>
            {periodosFiltrados.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <CalendarTodayIcon sx={{ fontSize: 100, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h5" color="text.secondary" gutterBottom>
                  No hay períodos de remuneración
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  {Object.values(filtros).some(f => f !== 'todos') ? 
                    'No se encontraron períodos con los filtros aplicados. Intente modificar los criterios de búsqueda.' :
                    'Comience creando un período y luego cargue los archivos Excel con los datos de nómina'
                  }
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenCreatePeriodoDialog(true)}
                  sx={{ 
                    bgcolor: '#f37d16', 
                    '&:hover': { bgcolor: '#e06c00' },
                    boxShadow: '0 4px 15px rgba(243, 125, 22, 0.3)',
                    mr: 2
                  }}
                >
                  Crear Período
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  onClick={() => setOpenExcelDialog(true)}
                  sx={{ 
                    borderColor: '#f37d16', 
                    color: '#f37d16',
                    '&:hover': { borderColor: '#e06c00', bgcolor: 'rgba(243, 125, 22, 0.1)' }
                  }}
                >
                  Cargar Nómina
                </Button>
              </Box>
            ) : (
              renderPeriodosCards()
            )}
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Período</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Descripción</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Razón Social</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Sucursal</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Registros</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Total Nómina</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {periodosFiltrados.map((periodo) => (
                  <TableRow key={periodo.id_periodo} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ bgcolor: '#f37d16', width: 32, height: 32, mr: 2 }}>
                          <CalendarTodayIcon fontSize="small" />
                        </Avatar>
                        <strong>{periodo.mes}/{periodo.anio}</strong>
                      </Box>
                    </TableCell>
                    <TableCell>{periodo.descripcion}</TableCell>
                    <TableCell>
                      <Chip 
                        label={periodo.nombre_razon || 'Sin Razón Social'} 
                        size="small" 
                        color={periodo.nombre_razon && periodo.nombre_razon !== 'Sin Razón Social' ? 'info' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={periodo.sucursal_nombre || 'Sin Sucursal'} 
                        size="small" 
                        color={periodo.sucursal_nombre && periodo.sucursal_nombre !== 'Sin Sucursal' ? 'secondary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={periodo.estado} 
                        color={periodo.estado === 'ACTIVO' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {periodo.total_registros || 0}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                        {formatMoney(periodo.suma_liquidos)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Ver detalles">
                          <IconButton size="small" color="primary" onClick={() => handleVerPeriodo(periodo)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Análisis">
                          <IconButton size="small" color="info" onClick={() => handleAnalisisPeriodo(periodo)}>
                            <PieChartIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton size="small" color="primary" onClick={() => handleEditarPeriodo(periodo)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Descargar">
                          <IconButton size="small" color="success" onClick={() => descargarDatos(periodo)}>
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton size="small" color="error" onClick={() => handleEliminarPeriodo(periodo)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Modal de asignación */}
      {renderModalAsignacion()}

      {/* Dialog para crear nuevo período con razón social y sucursal */}
      <Dialog 
        open={openCreatePeriodoDialog} 
        onClose={() => setOpenCreatePeriodoDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', bgcolor: '#f8f9fa' }}>
          <AddIcon sx={{ mr: 1, color: '#f37d16' }} />
          Crear Nuevo Período
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Mes</InputLabel>
                  <Select
                    value={nuevoPeriodo.mes}
                    onChange={(e) => setNuevoPeriodo({...nuevoPeriodo, mes: e.target.value})}
                    label="Mes"
                  >
                    {Array.from({length: 12}, (_, i) => (
                      <MenuItem key={i+1} value={i+1}>
                        {new Date(2024, i, 1).toLocaleDateString('es-CL', { month: 'long' })}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Año"
                  type="number"
                  value={nuevoPeriodo.anio}
                  onChange={(e) => setNuevoPeriodo({...nuevoPeriodo, anio: parseInt(e.target.value) || new Date().getFullYear()})}
                  inputProps={{ min: 2020, max: 2030 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descripción (opcional)"
                  value={nuevoPeriodo.descripcion}
                  onChange={(e) => setNuevoPeriodo({...nuevoPeriodo, descripcion: e.target.value})}
                  placeholder="Ej: Enero 2024, Aguinaldo Diciembre, etc."
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Razón Social (opcional)</InputLabel>
                  <Select
                    value={nuevoPeriodo.id_razon_social}
                    onChange={(e) => setNuevoPeriodo({...nuevoPeriodo, id_razon_social: e.target.value})}
                    label="Razón Social (opcional)"
                  >
                    <MenuItem value="">-- Sin especificar --</MenuItem>
                    {razonesSociales.map(razon => (
                      <MenuItem key={razon.id} value={razon.id}>
                        {razon.nombre_razon}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Sucursal (opcional)</InputLabel>
                  <Select
                    value={nuevoPeriodo.id_sucursal}
                    onChange={(e) => setNuevoPeriodo({...nuevoPeriodo, id_sucursal: e.target.value})}
                    label="Sucursal (opcional)"
                  >
                    <MenuItem value="">-- Sin especificar --</MenuItem>
                    {sucursales.map(sucursal => (
                      <MenuItem key={sucursal.id} value={sucursal.id}>
                        {sucursal.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Nota:</strong> La razón social y sucursal son opcionales pero ayudan a 
                categorizar mejor los períodos. Si no se especifican, el período será general.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenCreatePeriodoDialog(false);
            resetNuevoPeriodo();
          }}>
            Cancelar
          </Button>
          <Button 
            variant="contained"
            onClick={crearPeriodo}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
            sx={{ bgcolor: '#f37d16', '&:hover': { bgcolor: '#e06c00' } }}
          >
            {loading ? 'Creando...' : 'Crear Período'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog profesional para cargar y analizar Excel CON PORCENTAJES OBLIGATORIOS */}
      <Dialog 
        open={openExcelDialog} 
        onClose={handleCloseExcelDialog} 
        maxWidth="xl" 
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: 3,
            background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
            minHeight: '80vh'
          }      
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textAlign: 'center',
          position: 'relative'
        }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
            Procesador Automático de Nóminas CORREGIDO CON PORCENTAJES
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
            Sistema con identificación automática de columnas - Porcentajes obligatorios
          </Typography>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          {/* Stepper profesional */}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }} alternativeLabel>
            {pasosCarga.map((label, index) => (
              <Step key={label}>
                <StepLabel 
                  StepIconProps={{
                    sx: { 
                      '&.Mui-active': { color: '#f37d16' },
                      '&.Mui-completed': { color: '#4caf50' }
                    }
                  }}
                >
                  <Typography variant="body2">{label}</Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Paso 0: Seleccionar período */}
          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <CalendarTodayIcon sx={{ mr: 1, color: '#f37d16' }} />
                Seleccionar Período de Destino
              </Typography>
              
              <Alert severity="info" sx={{ mb: 3 }}>
                Seleccione el período al cual desea cargar los datos del archivo Excel
              </Alert>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Período de Destino</InputLabel>
                <Select
                  value={periodoSeleccionado}
                  onChange={(e) => setPeriodoSeleccionado(e.target.value)}
                  label="Período de Destino"
                >
                  {periodos.map(periodo => (
                    <MenuItem key={periodo.id_periodo} value={periodo.id_periodo}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <CalendarTodayIcon sx={{ mr: 1, fontSize: 16 }} />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body1">
                            {periodo.descripcion}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {periodo.mes}/{periodo.anio} - {periodo.total_registros || 0} registros actuales
                          </Typography>
                        </Box>
                        <Chip 
                          label={periodo.estado} 
                          color={periodo.estado === 'ACTIVO' ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {periodoSeleccionado && (
                <Alert severity="success">
                  Los datos del Excel se cargarán al período seleccionado. Si ya existen datos en este período, se agregarán a los existentes.
                </Alert>
              )}
            </Box>
          )} 

          {/* Paso 1: Cargar archivo */}
          {activeStep === 1 && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                      id="excel-file-input"
                    />
                    <label htmlFor="excel-file-input">
                      <Card sx={{ 
                        p: 4, 
                        cursor: 'pointer',
                        border: '3px dashed #f37d16',
                        borderRadius: 3,
                        transition: 'all 0.3s ease',
                        '&:hover': { 
                          bgcolor: 'rgba(243, 125, 22, 0.05)',
                          borderColor: '#e06c00',
                          transform: 'translateY(-2px)'
                        }
                      }}>
                        <CloudUploadIcon sx={{ fontSize: 100, color: '#f37d16', mb: 2 }} />
                        <Typography variant="h5" gutterBottom>
                          {excelFile ? excelFile.name : 'Seleccionar Archivo de Nómina'}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                          Arrastra tu archivo Excel aquí o haz clic para seleccionar
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Formatos soportados: .xlsx, .xls (máximo 10MB)
                        </Typography>
                      </Card>
                    </label>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card sx={{ p: 3, bgcolor: '#f8f9fa' }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      <SecurityIcon sx={{ mr: 1, color: '#f37d16' }} />
                      Identificación Automática MEJORADA
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
                        <ListItemText 
                          primary="RUT del empleado" 
                          secondary="Se detecta automáticamente"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
                        <ListItemText 
                          primary="Nombre completo" 
                          secondary="Se identifica en cualquier posición"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
                        <ListItemText 
                          primary="Campos monetarios" 
                          secondary="Haberes, descuentos, líquidos"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="error" fontSize="small" /></ListItemIcon>
                        <ListItemText 
                          primary="DETECTA 'Líquido' CORREGIDO" 
                          secondary="Incluye todas las variaciones de encoding"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="info" fontSize="small" /></ListItemIcon>
                        <ListItemText 
                          primary="Creación automática de empleados" 
                          secondary="Si no existen en el sistema"
                        />
                      </ListItem>
                    </List>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Paso 2: Analizando archivo */}
          {activeStep === 2 && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <CircularProgress size={80} sx={{ mb: 3, color: '#f37d16' }} />
              <Typography variant="h5" gutterBottom>
                Analizando Archivo de Nómina
              </Typography>
              <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(243, 125, 22, 0.1)', borderRadius: 2 }}>
                <Typography variant="body2" color="primary">
                  El sistema detecta automáticamente la estructura de la planilla incluyendo todas las variaciones de "Líquido"
                </Typography>
              </Box>
              <LinearProgress sx={{ maxWidth: 400, mx: 'auto', height: 6, borderRadius: 3 }} />
              {processingStatus && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  {processingStatus}
                </Typography>
              )}
            </Box>
          )}

          {/* Paso 3: Análisis completado y configuración */}
          {activeStep === 3 && analisisExcel && (
            <Box>
              <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
                <Tab label="Análisis Automático" />
                <Tab label="Configurar Mapeo" />
                <Tab label="Vista Previa (sin sueldo base)" />
              </Tabs>

              {/* Tab 0: Análisis automático */}
              {tabValue === 0 && (
                <Box>
                  <Alert 
                    severity={analisisExcel.errores?.length > 0 ? 'error' : 
                             analisisExcel.advertencias?.length > 0 ? 'warning' : 'success'} 
                    sx={{ mb: 3 }}
                  >
                    <Typography variant="h6">
                      Análisis de Calidad: {analisisExcel.calidad_datos?.toUpperCase() || 'BUENA'}
                    </Typography>
                    <Typography>
                      Se encontraron {analisisExcel.total_columnas} columnas en el archivo
                    </Typography>
                    {mapeoColumnas.liquido_pagar && (
                      <Typography sx={{ mt: 1, fontWeight: 'bold', color: 'success.main' }}>
                        ✅ LÍQUIDO DETECTADO CORRECTAMENTE: "{mapeoColumnas.liquido_pagar}"
                      </Typography>
                    )}
                  </Alert>

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Card sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                          <DataUsageIcon sx={{ mr: 1, color: '#f37d16' }} />
                          Columnas Detectadas
                        </Typography>
                        <List>
                          {Object.entries(mapeoColumnas || {}).map(([campo, columna]) => 
                            columna && (
                              <ListItem key={campo}>
                                <ListItemIcon>
                                  <CheckCircleIcon color={campo === 'liquido_pagar' ? 'error' : 'success'} />
                                </ListItemIcon>
                                <ListItemText 
                                  primary={campo.replace('_', ' ').toUpperCase()}
                                  secondary={`Mapeado a: "${columna}"`}
                                  sx={{
                                    '& .MuiListItemText-primary': {
                                      fontWeight: campo === 'liquido_pagar' ? 'bold' : 'normal',
                                      color: campo === 'liquido_pagar' ? 'error.main' : 'inherit'
                                    }
                                  }}
                                />
                              </ListItem>
                            )
                          )}
                        </List>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Card sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                          <BugReportIcon sx={{ mr: 1, color: analisisExcel.errores?.length > 0 ? 'error.main' : 'warning.main' }} />
                          Problemas Detectados
                        </Typography>
                        
                        {analisisExcel.errores?.length > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="error">Errores Críticos:</Typography>
                            {analisisExcel.errores.map((error, index) => (
                              <Alert key={index} severity="error" sx={{ mt: 1 }}>
                                {error}
                              </Alert>
                            ))}
                          </Box>
                        )}

                        {analisisExcel.advertencias?.length > 0 && (
                          <Box>
                            <Typography variant="subtitle2" color="warning.main">Advertencias:</Typography>
                            {analisisExcel.advertencias.map((advertencia, index) => (
                              <Alert key={index} severity="warning" sx={{ mt: 1 }}>
                                {advertencia}
                              </Alert>
                            ))}
                          </Box>
                        )}

                        {(!analisisExcel.errores || analisisExcel.errores.length === 0) && 
                         (!analisisExcel.advertencias || analisisExcel.advertencias.length === 0) && (
                          <Alert severity="success">
                            No se detectaron problemas en el archivo
                          </Alert>
                        )}
                      </Card>
                    </Grid>

                    <Grid item xs={12}>
                      <Card sx={{ p: 3, bgcolor: '#f8f9fa' }}>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                          <TrendingUpIcon sx={{ mr: 1, color: '#f37d16' }} />
                          Mapeo Detectado - CRÍTICO CORREGIDO
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {Object.entries(mapeoColumnas || {}).map(([campo, columna]) => 
                            columna && (
                              <Chip 
                                key={campo}
                                label={`${campo}: "${columna}"`}
                                color={campo === 'liquido_pagar' ? 'error' : 'primary'}
                                variant={campo === 'liquido_pagar' ? 'filled' : 'outlined'}
                                size="small"
                              />
                            )
                          )}
                        </Box>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Tab 1: Configurar mapeo */}
              {tabValue === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <EditIcon sx={{ mr: 1, color: '#f37d16' }} />
                    Configurar Mapeo de Columnas - CORREGIDO
                  </Typography>
                  
                  <Alert severity="info" sx={{ mb: 3 }}>
                    El mapeo fue detectado automáticamente con mejoras para "Líquido". Puede ajustarlo si es necesario.
                  </Alert>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>RUT Empleado *</InputLabel>
                        <Select
                          value={mapeoColumnas.rut_empleado || ''}
                          onChange={(e) => setMapeoColumnas({...mapeoColumnas, rut_empleado: e.target.value})}
                          label="RUT Empleado *"
                        >
                          {columnasDetectadas.map(col => (
                            <MenuItem key={col} value={col}>{col}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Nombre Completo *</InputLabel>
                        <Select
                          value={mapeoColumnas.nombre_empleado || ''}
                          onChange={(e) => setMapeoColumnas({...mapeoColumnas, nombre_empleado: e.target.value})}
                          label="Nombre Completo *"
                        >
                          {columnasDetectadas.map(col => (
                            <MenuItem key={col} value={col}>{col}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Líquido a Pagar ⚠️ CRÍTICO</InputLabel>
                        <Select
                          value={mapeoColumnas.liquido_pagar || ''}
                          onChange={(e) => setMapeoColumnas({...mapeoColumnas, liquido_pagar: e.target.value})}
                          label="Líquido a Pagar ⚠️ CRÍTICO"
                          sx={{ 
                            '& .MuiOutlinedInput-root': {
                              borderColor: mapeoColumnas.liquido_pagar ? '#f44336' : 'default'
                            }
                          }}
                        >
                          <MenuItem value="">-- No mapear --</MenuItem>
                          {columnasDetectadas.map(col => (
                            <MenuItem key={col} value={col}>{col}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Total Haberes</InputLabel>
                        <Select
                          value={mapeoColumnas.total_haberes || ''}
                          onChange={(e) => setMapeoColumnas({...mapeoColumnas, total_haberes: e.target.value})}
                          label="Total Haberes"
                        >
                          <MenuItem value="">-- No mapear --</MenuItem>
                          {columnasDetectadas.map(col => (
                            <MenuItem key={col} value={col}>{col}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                  
                  <Alert severity={mapeoColumnas.liquido_pagar ? 'success' : 'error'} sx={{ mt: 3 }}>
                    <Typography variant="body2">
                      {mapeoColumnas.liquido_pagar ? 
                        `✅ LÍQUIDO MAPEADO CORRECTAMENTE: "${mapeoColumnas.liquido_pagar}" se guardará correctamente en la base de datos` :
                        '❌ CRÍTICO: Debe mapear la columna de Líquido para que los totales se calculen correctamente'
                      }
                    </Typography>
                  </Alert>
                </Box>
              )}

              {/* Tab 2: Vista previa CORREGIDA SIN MOSTRAR SUELDO BASE */}
              {tabValue === 2 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Vista Previa de Datos (primeras 20 filas - sin sueldo base)
                  </Typography>
                  
                  <Alert severity="info" sx={{ mb: 2 }}>
                    🚫 La columna "Sueldo Base" está oculta en esta vista previa para mayor claridad
                  </Alert>
                  
                  <TableContainer component={Paper} sx={{ maxHeight: 500, mb: 2 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', minWidth: 50 }}>
                            #
                          </TableCell>
                          {obtenerColumnasParaVistaPrevia().map((key) => {
                            const esMapeado = Object.values(mapeoColumnas).includes(key);
                            const esLiquido = mapeoColumnas.liquido_pagar === key;
                            return (
                              <TableCell 
                                key={key} 
                                sx={{ 
                                  fontWeight: 'bold', 
                                  bgcolor: esLiquido ? '#ffebee' : esMapeado ? '#e8f5e8' : '#f5f5f5',
                                  color: esLiquido ? '#d32f2f' : esMapeado ? '#2e7d32' : 'inherit',
                                  minWidth: 120
                                }}
                              >
                                {key}
                                {esLiquido && (
                                  <Chip 
                                    label="LÍQUIDO ✓" 
                                    size="small" 
                                    color="error" 
                                    sx={{ ml: 1, height: 16, fontSize: '0.65rem' }} 
                                  />
                                )}
                                {esMapeado && !esLiquido && (
                                  <Chip 
                                    label="✓" 
                                    size="small" 
                                    color="success" 
                                    sx={{ ml: 1, height: 16, fontSize: '0.65rem' }} 
                                  />
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {obtenerDatosVistaPrevia().map((row, index) => (
                          <TableRow key={index} hover>
                            <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                              {index + 1}
                            </TableCell>
                            {Object.entries(row).map(([key, value], i) => {
                              const esMapeado = Object.values(mapeoColumnas).includes(key);
                              const esLiquido = mapeoColumnas.liquido_pagar === key;
                              return (
                                <TableCell 
                                  key={i}
                                  sx={{
                                    bgcolor: esLiquido ? 'rgba(244, 67, 54, 0.04)' : 
                                             esMapeado ? 'rgba(46, 125, 50, 0.04)' : 'inherit',
                                    maxWidth: 200,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    fontWeight: esLiquido ? 'bold' : 'normal',
                                    color: esLiquido ? 'error.main' : 'inherit'
                                  }}
                                >
                                  {value}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Mostrando {obtenerColumnasParaVistaPrevia().length} de {columnasDetectadas.length} columnas totales
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Paso 4: CONFIGURACIÓN DE PORCENTAJES OBLIGATORIOS */}
          {activeStep === 4 && (
            renderConfiguracionPorcentajes()
          )}

          {/* Paso 5: Procesando */}
          {activeStep === 5 && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <CircularProgress size={80} sx={{ mb: 3, color: '#f37d16' }} />
              <Typography variant="h5" gutterBottom>
                Procesando Nómina con Porcentajes y Unicode
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Guardando datos en la base de datos con porcentajes y valores corregidos...
              </Typography>
              
              {uploadProgress > 0 && (
                <Box sx={{ width: '100%', maxWidth: 500, mx: 'auto', mb: 3 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={uploadProgress} 
                    sx={{ height: 12, borderRadius: 6, mb: 2 }}
                  />
                  <Typography variant="h6" color="primary">
                    {uploadProgress}% completado
                  </Typography>
                </Box>
              )}
              
              {processingStatus && (
                <Typography variant="body2" color="text.secondary">
                  {processingStatus}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 0, justifyContent: 'space-between' }}>
          <Button 
            onClick={handleCloseExcelDialog}
            disabled={loading}
            startIcon={<DeleteIcon />}
          >
            Cancelar Proceso
          </Button>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            {activeStep === 0 && (
              <Button
                onClick={() => setActiveStep(1)}
                variant="contained"
                disabled={!periodoSeleccionado}
                startIcon={<CheckCircleIcon />}
                sx={{ 
                  bgcolor: '#f37d16', 
                  '&:hover': { bgcolor: '#e06c00' },
                  minWidth: 160
                }}
              >
                Continuar
              </Button>
            )}

            {activeStep === 3 && (
              <>
                {tabValue < 2 && (
                  <Button
                    variant="outlined"
                    onClick={() => setTabValue(tabValue + 1)}
                    color="primary"
                  >
                    {tabValue === 0 ? 'Ver Configuración' : 'Ver Vista Previa'}
                  </Button>
                )}
                
                {tabValue === 2 && (
                  <Button
                    onClick={() => setActiveStep(4)}
                    variant="contained"
                    disabled={loading || analisisExcel?.errores?.length > 0 || !mapeoColumnas.liquido_pagar}
                    startIcon={<PercentIcon />}
                    sx={{ 
                      bgcolor: '#f37d16', 
                      '&:hover': { bgcolor: '#e06c00' },
                      minWidth: 160
                    }}
                  >
                    Configurar Porcentajes
                  </Button>
                )}
              </>
            )}

            {activeStep === 4 && (
              <Button
                onClick={procesarExcel}
                variant="contained"
                disabled={loading || !razonSocialSeleccionada || !porcentajesValidos}
                startIcon={loading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                sx={{ 
                  bgcolor: '#f37d16', 
                  '&:hover': { bgcolor: '#e06c00' },
                  minWidth: 160
                }}
              >
                {loading ? 'Procesando...' : 'Procesar Nómina'}
              </Button>
            )}
          </Box>
        </DialogActions>
      </Dialog>

      {/* Dialog para Ver Detalles del Período - MEJORADO CON FILTRADO ESPECÍFICO */}
      <Dialog 
        open={openViewDialog} 
        onClose={handleCloseViewDialog} 
        maxWidth="xl" 
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', bgcolor: '#f8f9fa' }}>
          <VisibilityIcon sx={{ mr: 1 }} />
          Detalles del Período: {selectedPeriodo?.descripcion}
          {selectedPeriodo && (
            <Box sx={{ ml: 2, display: 'flex', gap: 1 }}>
              {selectedPeriodo.nombre_razon && selectedPeriodo.nombre_razon !== 'Sin Razón Social' && (
                <Chip 
                  label={selectedPeriodo.nombre_razon} 
                  size="small" 
                  color="info"
                />
              )}
              {selectedPeriodo.sucursal_nombre && selectedPeriodo.sucursal_nombre !== 'Sin Sucursal' && (
                <Chip 
                  label={selectedPeriodo.sucursal_nombre} 
                  size="small" 
                  color="secondary"
                />
              )}
            </Box>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedPeriodo && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd' }}>
                    <Typography variant="h4" color="primary">
                      {selectedPeriodo.total_registros || 0}
                    </Typography>
                    <Typography variant="body2">Total Registros</Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e8' }}>
                    <Typography variant="h4" color="success.main">
                      {selectedPeriodo.empleados_encontrados || 0}
                    </Typography>
                    <Typography variant="body2">Empleados</Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0' }}>
                    <Typography variant="h4" color="warning.main">
                      {formatMoney(selectedPeriodo.suma_liquidos)}
                    </Typography>
                    <Typography variant="body2">Total Nómina</Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#fce4ec' }}>
                    <Typography variant="h4" color="error.main">
                      {selectedPeriodo.empleados_faltantes || 0}
                    </Typography>
                    <Typography variant="body2">Faltantes</Typography>
                  </Card>
                </Grid>

                {selectedPeriodo.datos && selectedPeriodo.datos.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Datos de Empleados ({selectedPeriodo.datos.length} total - {empleadosFiltrados.length} filtrados)
                    </Typography>
                    
                    {/* FILTROS ESPECÍFICOS MEJORADOS PARA EL PERÍODO */}
                    <Paper sx={{ p: 2, mb: 3, bgcolor: '#f8f9fa' }}>
                      <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        <FilterListIcon sx={{ mr: 1, color: '#f37d16' }} />
                        Filtros Específicos del Período
                      </Typography>
                      
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}>
                          <TextField
                            size="small"
                            placeholder="Buscar por nombre o RUT..."
                            value={filtroEmpleados || ''}
                            onChange={(e) => setFiltroEmpleados(e.target.value)}
                            fullWidth
                          />
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Razón Social</InputLabel>
                            <Select
                              value={filtroRazonSocialDetalle}
                              onChange={(e) => {
                                setFiltroRazonSocialDetalle(e.target.value);
                                setPaginaActual(1);
                              }}
                              label="Razón Social"
                            >
                              <MenuItem value="todos">Todas las razones sociales</MenuItem>
                              {opcionesFiltroDetalle.razonesSociales.map(razon => (
                                <MenuItem key={razon} value={razon}>
                                  {razon}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Sucursal</InputLabel>
                            <Select
                              value={filtroSucursalDetalle}
                              onChange={(e) => {
                                setFiltroSucursalDetalle(e.target.value);
                                setPaginaActual(1);
                              }}
                              label="Sucursal"
                            >
                              <MenuItem value="todos">Todas las sucursales</MenuItem>
                              {opcionesFiltroDetalle.sucursales.map(sucursal => (
                                <MenuItem key={sucursal} value={sucursal}>
                                  {sucursal}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Registros por página</InputLabel>
                            <Select
                              value={empleadosPorPagina}
                              onChange={(e) => {
                                setEmpleadosPorPagina(e.target.value);
                                setPaginaActual(1);
                              }}
                              label="Registros por página"
                            >
                              <MenuItem value={25}>25</MenuItem>
                              <MenuItem value={50}>50</MenuItem>
                              <MenuItem value={100}>100</MenuItem>
                              <MenuItem value={-1}>Todos</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                      
                      {/* Mostrar filtros activos específicos */}
                      {(filtroRazonSocialDetalle !== 'todos' || filtroSucursalDetalle !== 'todos' || filtroEmpleados) && (
                        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            Filtros activos:
                          </Typography>
                          {filtroRazonSocialDetalle !== 'todos' && (
                            <Chip 
                              label={`Razón: ${filtroRazonSocialDetalle}`}
                              size="small"
                              color="info"
                              onDelete={() => setFiltroRazonSocialDetalle('todos')}
                            />
                          )}
                          {filtroSucursalDetalle !== 'todos' && (
                            <Chip 
                              label={`Sucursal: ${filtroSucursalDetalle}`}
                              size="small"
                              color="secondary"
                              onDelete={() => setFiltroSucursalDetalle('todos')}
                            />
                          )}
                          {filtroEmpleados && (
                            <Chip 
                              label={`Búsqueda: "${filtroEmpleados}"`}
                              size="small"
                              color="primary"
                              onDelete={() => setFiltroEmpleados('')}
                            />
                          )}
                          <Button
                            size="small"
                            startIcon={<ClearAllIcon />}
                            onClick={() => {
                              setFiltroEmpleados('');
                              setFiltroRazonSocialDetalle('todos');
                              setFiltroSucursalDetalle('todos');
                              setPaginaActual(1);
                            }}
                          >
                            Limpiar todos
                          </Button>
                        </Box>
                      )}
                    </Paper>

                    <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>#</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>RUT</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Nombre</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Razón Social</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Sucursal</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Total Haberes</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Total Descuentos</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Liquido</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Estado</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {empleadosPaginados.map((empleado, index) => (
                            <TableRow key={empleado.id || index} hover>
                              <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                {empleadosPorPagina === -1 ? 
                                  empleadosFiltrados.indexOf(empleado) + 1 :
                                  ((paginaActual - 1) * empleadosPorPagina) + index + 1
                                }
                              </TableCell>
                              <TableCell>{empleado.rut_empleado}</TableCell>
                              <TableCell>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                    {empleado.nombre_empleado || empleado.nombre_completo || 'Sin nombre'}
                                  </Typography>
                                  {empleado.estado_relacion_empleado === 'EMPLEADO_NO_ENCONTRADO' && (
                                    <Chip 
                                      label="No encontrado" 
                                      size="small" 
                                      color="warning" 
                                      sx={{ mt: 0.5 }}
                                    />
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={empleado.nombre_razon || 'Sin Razón Social'} 
                                  size="small" 
                                  color={empleado.nombre_razon ? 'info' : 'default'}
                                />
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={empleado.sucursal_nombre || 'Sin Sucursal'} 
                                  size="small" 
                                  color={empleado.sucursal_nombre ? 'secondary' : 'default'}
                                />
                              </TableCell>
                              <TableCell>{formatMoney(empleado.total_haberes)}</TableCell>
                              <TableCell>{formatMoney(empleado.total_descuentos)}</TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                  {formatMoney(empleado.liquido_pagar)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={empleado.estado_relacion_empleado === 'EMPLEADO_ENCONTRADO' ? 'Encontrado' : 'No encontrado'}
                                  color={empleado.estado_relacion_empleado === 'EMPLEADO_ENCONTRADO' ? 'success' : 'warning'}
                                  size="small"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Paginación mejorada */}
                    {empleadosPorPagina !== -1 && totalPaginas > 1 && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2, gap: 2 }}>
                        <Button
                          disabled={paginaActual === 1}
                          onClick={() => setPaginaActual(paginaActual - 1)}
                          size="small"
                        >
                          Anterior
                        </Button>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">
                            Página {paginaActual} de {totalPaginas}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            ({empleadosFiltrados.length} registros filtrados de {selectedPeriodo.datos.length} total)
                          </Typography>
                        </Box>
                        
                        <Button
                          disabled={paginaActual === totalPaginas}
                          onClick={() => setPaginaActual(paginaActual + 1)}
                          size="small"
                        >
                          Siguiente
                        </Button>
                      </Box>
                    )}
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Cerrar</Button>
          {selectedPeriodo && (
            <>
              <Button 
                variant="outlined"
                startIcon={<PieChartIcon />}
                onClick={() => handleAnalisisPeriodo(selectedPeriodo)}
                color="info"
              >
                Análisis Estadístico
              </Button>
              <Button 
                variant="contained" 
                startIcon={<DownloadIcon />}
                onClick={() => descargarDatos(selectedPeriodo)}
                sx={{ bgcolor: '#f37d16', '&:hover': { bgcolor: '#e06c00' } }}
              >
                Descargar Datos
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Dialog para Análisis Estadístico */}
      <Dialog 
        open={openAnalysisDialog} 
        onClose={() => setOpenAnalysisDialog(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', bgcolor: '#f8f9fa' }}>
          <PieChartIcon sx={{ mr: 1, color: '#f37d16' }} />
          Análisis Estadístico - {selectedPeriodo?.descripcion}
        </DialogTitle>
        <DialogContent>
          {reporteAnalisis && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Card sx={{ p: 3, bgcolor: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
                    <Typography variant="h6" gutterBottom>
                      Resumen Ejecutivo
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="h4" color="primary">
                          {reporteAnalisis.resumen?.total_empleados || 0}
                        </Typography>
                        <Typography variant="body2">Empleados</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="h4" color="success.main">
                          {formatMoney(reporteAnalisis.resumen?.suma_liquidos)}
                        </Typography>
                        <Typography variant="body2">Total Nómina</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="h4" color="warning.main">
                          {formatMoney(reporteAnalisis.resumen?.sueldo_maximo)}
                        </Typography>
                        <Typography variant="body2">Sueldo Máximo</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="h4" color="error.main">
                          {formatMoney(reporteAnalisis.resumen?.sueldo_minimo)}
                        </Typography>
                        <Typography variant="body2">Sueldo Mínimo</Typography>
                      </Grid>
                    </Grid>
                  </Card>
                </Grid>

                {/* Estadísticas por razón social */}
                {reporteAnalisis.estadisticas_por_razon_social && 
                 Object.keys(reporteAnalisis.estadisticas_por_razon_social).length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Card sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Distribución por Razón Social
                      </Typography>
                      <List>
                        {Object.entries(reporteAnalisis.estadisticas_por_razon_social).map(([razon, stats]) => (
                          <ListItem key={razon} sx={{ border: '1px solid #e0e0e0', mb: 1, borderRadius: 1 }}>
                            <ListItemText 
                              primary={razon}
                              secondary={
                                <Box>
                                  <Typography variant="body2">
                                    {stats.cantidad} empleados - {formatMoney(stats.suma_liquidos)}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Promedio: {formatMoney(stats.promedio_sueldo)}
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Card>
                  </Grid>
                )}

                {/* Estadísticas por sucursal */}
                {reporteAnalisis.estadisticas_por_sucursal && 
                 Object.keys(reporteAnalisis.estadisticas_por_sucursal).length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Card sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Distribución por Sucursal
                      </Typography>
                      <List>
                        {Object.entries(reporteAnalisis.estadisticas_por_sucursal).map(([sucursal, stats]) => (
                          <ListItem key={sucursal} sx={{ border: '1px solid #e0e0e0', mb: 1, borderRadius: 1 }}>
                            <ListItemText 
                              primary={sucursal}
                              secondary={
                                <Box>
                                  <Typography variant="body2">
                                    {stats.cantidad} empleados - {formatMoney(stats.suma_liquidos)}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Promedio: {formatMoney(stats.promedio_sueldo)}
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Card>
                  </Grid>
                )}

                {/* Anomalías detalladas */}
                <Grid item xs={12}>
                  <Card sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Anomalías Detectadas ({reporteAnalisis.anomalias?.length || 0})
                    </Typography>
                    {reporteAnalisis.anomalias?.length > 0 ? (
                      <List>
                        {reporteAnalisis.anomalias.slice(0, 10).map((anomalia, index) => (
                          <ListItem key={index} sx={{ border: '1px solid #e0e0e0', mb: 1, borderRadius: 1 }}>
                            <ListItemIcon>
                              <WarningIcon color={anomalia.nivel_riesgo === 'CRÍTICO' ? 'error' : 
                                                   anomalia.nivel_riesgo === 'ALTO' ? 'warning' : 'info'} />
                            </ListItemIcon>
                            <ListItemText 
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                    {anomalia.empleado}
                                  </Typography>
                                  <Chip 
                                    label={anomalia.nivel_riesgo} 
                                    size="small" 
                                    color={anomalia.nivel_riesgo === 'CRÍTICO' ? 'error' : 
                                           anomalia.nivel_riesgo === 'ALTO' ? 'warning' : 'info'}
                                  />
                                  <Chip 
                                    label={anomalia.razon_social} 
                                    size="small" 
                                    color="info"
                                  />
                                  <Chip 
                                    label={anomalia.sucursal} 
                                    size="small" 
                                    color="secondary"
                                  />
                                </Box>
                              }
                              secondary={
                                <Box>
                                  <Typography variant="body2">
                                    {formatMoney(anomalia.sueldo)} - {anomalia.analisis_detallado}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Z-Score: {anomalia.z_score} | {anomalia.interpretacion_zscore}
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Alert severity="success">
                        No se detectaron anomalías significativas en los datos
                      </Alert>
                    )}
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAnalysisDialog(false)}>Cerrar</Button>
          <Button 
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => {
              const dataStr = JSON.stringify(reporteAnalisis, null, 2);
              const dataBlob = new Blob([dataStr], {type: 'application/json'});
              const url = URL.createObjectURL(dataBlob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `Analisis_${selectedPeriodo?.descripcion}.json`;
              link.click();
              showSnackbar('Reporte de análisis descargado', 'success');
            }}
            sx={{ bgcolor: '#f37d16', '&:hover': { bgcolor: '#e06c00' } }}
          >
            Descargar Reporte
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para Editar Período */}
      <Dialog 
        open={openEditDialog} 
        onClose={() => setOpenEditDialog(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <EditIcon sx={{ mr: 1 }} />
          Editar Período
        </DialogTitle>
        <DialogContent>
          {selectedPeriodo && (
            <Box component="form" sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Descripción"
                defaultValue={selectedPeriodo.descripcion}
                margin="normal"
                id="descripcion-edit"
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Estado</InputLabel>
                <Select
                  defaultValue={selectedPeriodo.estado}
                  label="Estado"
                  id="estado-edit"
                >
                  <MenuItem value="ACTIVO">Activo</MenuItem>
                  <MenuItem value="INACTIVO">Inactivo</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancelar</Button>
          <Button 
            variant="contained"
            onClick={() => {
              const descripcion = document.getElementById('descripcion-edit').value;
              const estado = document.getElementById('estado-edit').value;
              guardarEdicion({ descripcion, estado });
            }}
            sx={{ bgcolor: '#f37d16', '&:hover': { bgcolor: '#e06c00' } }}
          >
            Guardar Cambios
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para Confirmar Eliminación */}
      <Dialog 
        open={openDeleteDialog} 
        onClose={() => setOpenDeleteDialog(false)}
        maxWidth="sm"
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
          <WarningIcon sx={{ mr: 1 }} />
          Confirmar Eliminación
        </DialogTitle>
        <DialogContent>
          {selectedPeriodo && (
            <Box sx={{ mt: 1 }}>
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="h6">¡ATENCIÓN!</Typography>
                <Typography>Esta acción no se puede deshacer</Typography>
              </Alert>
              <Typography variant="body1" sx={{ mb: 2 }}>
                ¿Está seguro que desea eliminar el período <strong>{selectedPeriodo.descripcion}</strong>?
              </Typography>
              <Box sx={{ bgcolor: '#ffebee', p: 2, borderRadius: 1 }}>
                <Typography variant="body2" color="error.main">
                  <strong>Se eliminarán:</strong>
                </Typography>
                <ul>
                  <li>{selectedPeriodo.total_registros || 0} registros de remuneraciones</li>
                  <li>Todos los datos asociados al período</li>
                  <li>Historial de procesamiento</li>
                </ul>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>
            Cancelar
          </Button>
          <Button 
            variant="contained"
            color="error"
            onClick={confirmarEliminacion}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {loading ? 'Eliminando...' : 'Eliminar Definitivamente'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar profesional */}
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
          sx={{ 
            minWidth: 350,
            boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// NUEVA FUNCIÓN PARA RENDERIZAR PERÍODOS CARDS (que se usa en el renderizado principal)
const renderPeriodosCards = () => (
  <Grid container spacing={3}>
    {periodosFiltrados.map((periodo) => (
      <Grid item xs={12} sm={6} md={4} key={periodo.id_periodo}>
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
                {periodo.nombre_razon && periodo.nombre_razon !== 'Sin Razón Social' && (
                  <Chip 
                    label={periodo.nombre_razon} 
                    size="small" 
                    color="info"
                    sx={{ mt: 0.5, mr: 0.5 }}
                  />
                )}
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
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {periodo.total_registros || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Registros
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {periodo.empleados_encontrados || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Empleados
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    {periodo.empleados_faltantes || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Faltantes
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
    ))}
  </Grid>
);

export default RemuneracionesPage;