// RemuneracionesPage.jsx - VERSIÓN COMPLETA CON FILTROS Y MODAL DE ASIGNACIÓN
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
  TablePagination
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
  Store as StoreIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import api from '../api/api';

// 🔧 CONFIGURACIÓN COMPLETA - API centralizada con nuevos endpoints
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
  asignarRazonSocialYSucursal: (asignaciones) => api.post('/remuneraciones/asignar-razon-social-sucursal', { asignaciones })
};

// API para razones sociales y sucursales
const catalogosAPI = {
  getRazonesSociales: () => api.get('/razonessociales'),
  getSucursales: () => api.get('/sucursales')
};

// Pasos del proceso de carga profesional
const pasosCarga = [
  'Seleccionar Período',
  'Cargar Archivo',
  'Análisis Automático',
  'Configurar Mapeo',
  'Procesar Nómina',
  'Asignar Empleados'
];

const RemuneracionesPage = () => {
  // 🔧 ESTADOS PRINCIPALES
  const [periodos, setPeriodos] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 🆕 ESTADOS PARA FILTROS
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
  const [viewMode, setViewMode] = useState('cards');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [analisisExcel, setAnalisisExcel] = useState(null);
  const [mapeoColumnas, setMapeoColumnas] = useState({});
  const [columnasDetectadas, setColumnasDetectadas] = useState([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('');
  
  // 🆕 ESTADOS PARA MODAL DE ASIGNACIÓN
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
  
  // Estados para Snackbar mejorado
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // 🔧 FUNCIONES DE CARGA MEJORADAS CON MANEJO DE ERRORES
  const testConexion = useCallback(async () => {
    try {
      console.log('🔧 Iniciando test de conexión...');
      const response = await remuneracionesAPI.test();
      console.log('✅ Test de conexión exitoso:', response.data);
      
      if (!response.data.success) {
        setError('Error en la conexión a la base de datos');
        return false;
      }
      return true;
    } catch (err) {
      console.error('❌ Error en test de conexión:', err);
      const errorMsg = err.response?.data?.message || 'No se puede conectar con el servidor de remuneraciones';
      setError(errorMsg);
      showSnackbar(errorMsg, 'error');
      return false;
    }
  }, []);

  // 🆕 CARGAR OPCIONES PARA FILTROS
  const cargarOpcionesFiltros = useCallback(async () => {
    try {
      console.log('📊 Cargando opciones para filtros...');
      const response = await remuneracionesAPI.obtenerOpcionesFiltros();
      
      if (response.data.success) {
        setOpcionesFiltros(response.data.data);
        console.log('✅ Opciones de filtros cargadas:', response.data.data);
      }
    } catch (err) {
      console.error('❌ Error al cargar opciones de filtros:', err);
    }
  }, []);

  // 🆕 CARGAR CATÁLOGOS PARA MODAL DE ASIGNACIÓN
  const cargarCatalogos = useCallback(async () => {
    try {
      console.log('📚 Cargando catálogos...');
      const [razonesResponse, sucursalesResponse] = await Promise.all([
        catalogosAPI.getRazonesSociales(),
        catalogosAPI.getSucursales()
      ]);
      
      setRazonesSociales(razonesResponse.data || []);
      setSucursales(sucursalesResponse.data || []);
      console.log('✅ Catálogos cargados');
    } catch (err) {
      console.error('❌ Error al cargar catálogos:', err);
    }
  }, []);

  const cargarPeriodos = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📅 Cargando períodos con filtros:', filtros);
      
      const response = await remuneracionesAPI.obtenerPeriodos(filtros);
      
      if (response.data.success) {
        setPeriodos(response.data.data || []);
        console.log(`✅ ${response.data.data?.length || 0} períodos cargados`);
      } else {
        throw new Error(response.data.message || 'Error al cargar períodos');
      }
    } catch (err) {
      console.error('❌ Error al cargar períodos:', err);
      const errorMsg = err.response?.data?.message || 'Error al cargar períodos de remuneraciones';
      setError(errorMsg);
      showSnackbar(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  const cargarEstadisticas = useCallback(async () => {
    try {
      console.log('📊 Cargando estadísticas...');
      const response = await remuneracionesAPI.obtenerEstadisticas();
      
      if (response.data.success) {
        setEstadisticas(response.data.data);
        console.log('✅ Estadísticas cargadas:', response.data.data);
      } else {
        console.warn('⚠️ Error en estadísticas:', response.data.message);
      }
    } catch (err) {
      console.error('❌ Error al cargar estadísticas:', err);
    }
  }, []);

  // 🔧 EFFECT MEJORADO CON MEJOR MANEJO DE ERRORES
  useEffect(() => {
    const inicializar = async () => {
      console.log('🚀 Inicializando RemuneracionesPage...');
      
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

  // 🆕 EFFECT PARA RECARGAR PERÍODOS CUANDO CAMBIAN LOS FILTROS
  useEffect(() => {
    cargarPeriodos();
  }, [cargarPeriodos]);

  // 🆕 FUNCIONES PARA MANEJO DE FILTROS
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

  // 🔧 CREAR NUEVO PERÍODO MEJORADO
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
      console.log('📅 Creando período:', nuevoPeriodo);
      
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
      console.error('❌ Error creando período:', err);
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

  // 🔧 FUNCIONES PARA ACCIONES DE PERÍODOS MEJORADAS
  const handleVerPeriodo = async (periodo) => {
    try {
      setLoading(true);
      setSelectedPeriodo(periodo);
      
      // Resetear filtros y paginación
      setFiltroEmpleados('');
      setPaginaActual(1);
      setEmpleadosPorPagina(50);
      
      console.log(`👁️ Cargando detalles del período ${periodo.id_periodo}...`);
      
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
      console.error('❌ Error cargando datos del período:', err);
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
    setPaginaActual(1);
    setEmpleadosPorPagina(50);
  };

  const handleAnalisisPeriodo = async (periodo) => {
    try {
      setLoading(true);
      setSelectedPeriodo(periodo);
      
      console.log(`📊 Generando análisis del período ${periodo.id_periodo}...`);
      
      const response = await remuneracionesAPI.obtenerAnalisisPeriodo(periodo.id_periodo);
      
      if (response.data.success) {
        setReporteAnalisis(response.data.data);
        setOpenAnalysisDialog(true);
        showSnackbar('Análisis generado exitosamente', 'success');
      } else {
        throw new Error(response.data.message || 'Error al generar análisis del período');
      }
    } catch (err) {
      console.error('❌ Error generando análisis:', err);
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
      console.log(`🗑️ Eliminando período ${selectedPeriodo.id_periodo}...`);
      
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
      console.error('❌ Error eliminando período:', err);
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
      console.log(`✏️ Actualizando período ${selectedPeriodo.id_periodo}:`, datosEditados);
      
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
      console.error('❌ Error actualizando período:', err);
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
      console.log(`📥 Descargando datos del período ${periodo.id_periodo}...`);
      
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
      console.error('❌ Error descargando datos:', err);
      const errorMsg = err.response?.data?.message || 'Error al descargar datos';
      showSnackbar(errorMsg, 'error');
    }
  };

  // 🔧 PROCESAMIENTO DE EXCEL COMPLETAMENTE MEJORADO
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
        
        setProcessingStatus('Procesando datos...');
        
        // 🆕 LEER CON MANEJO MEJORADO DE DATOS VACÍOS
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, 
          defval: '', 
          blankrows: false,
          raw: false
        });
        
        console.log('📊 Datos raw del Excel (primeras 10 filas):', jsonData.slice(0, 10));
        
        if (jsonData.length < 2) {
          throw new Error('El archivo debe tener al menos 2 filas (encabezados + datos)');
        }

        // 🆕 BÚSQUEDA INTELIGENTE DE HEADERS MEJORADA
        let headerRowIndex = await buscarFilaHeaders(jsonData);

        if (headerRowIndex === -1) {
          throw new Error('No se encontraron encabezados válidos. El archivo debe contener columnas RUT, NOMBRE y campos monetarios');
        }

        const headers = jsonData[headerRowIndex]
          .map(h => h ? String(h).trim() : '')
          .filter(h => h && h !== '');
        
        const rows = await procesarFilasDatos(jsonData, headerRowIndex);
        
        console.log(`📋 Headers detectados (${headers.length}):`, headers.slice(0, 10));
        console.log(`📊 Filas de datos válidas: ${rows.length}`);
        
        if (headers.length < 3) {
          throw new Error('No se detectaron suficientes columnas válidas en los encabezados');
        }

        // 🆕 CONVERSIÓN MEJORADA A OBJETOS
        const formattedData = await convertirDatosAObjetos(rows, headers);

        console.log('✅ Datos formateados (primeros 3):', formattedData.slice(0, 3));

        if (formattedData.length === 0) {
          throw new Error('No se encontraron filas de datos válidas después del procesamiento');
        }

        setExcelData(formattedData);
        setPreviewData(formattedData.slice(0, 20));
        setColumnasDetectadas(headers);
        
        // Realizar análisis automático
        setProcessingStatus('Realizando análisis automático...');
        await realizarAnalisisAutomatico(headers, formattedData.slice(0, 5));
        
        setActiveStep(3);
        
        showSnackbar(`Excel cargado exitosamente: ${formattedData.length} registros encontrados`, 'success');
      } catch (error) {
        console.error('❌ Error al leer Excel:', error);
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

  // 🆕 FUNCIÓN AUXILIAR: Buscar fila de headers
  const buscarFilaHeaders = async (jsonData) => {
    for (let i = 0; i < Math.min(15, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && Array.isArray(row) && row.length > 5) {
        const rowStr = row.join(' ').toUpperCase();
        // Buscar patrones específicos de nómina chilena
        if ((rowStr.includes('RUT') || rowStr.includes('R.U.T')) && 
            rowStr.includes('NOMBRE') && 
            (rowStr.includes('BASE') || rowStr.includes('LIQUIDO') || 
             rowStr.includes('LÍQUIDO') || rowStr.includes('HABERES'))) {
          console.log(`📋 Headers encontrados en fila ${i + 1}: ${row.slice(0, 8).join(', ')}...`);
          return i;
        }
      }
    }
    return -1;
  };

  // 🆕 FUNCIÓN AUXILIAR: Procesar filas de datos
  const procesarFilasDatos = async (jsonData, headerRowIndex) => {
    return jsonData.slice(headerRowIndex + 1)
      .filter(row => {
        if (!row || !Array.isArray(row) || row.length < 3) return false;
        
        // Debe tener al menos 3 celdas con contenido
        const cellsWithData = row.filter(cell => 
          cell !== null && cell !== undefined && 
          String(cell).trim() !== '' && String(cell).trim() !== '0'
        );
        
        return cellsWithData.length >= 3;
      });
  };

  // 🆕 FUNCIÓN AUXILIAR: Convertir datos a objetos
  const convertirDatosAObjetos = async (rows, headers) => {
    return rows
      .map((row, index) => {
        const obj = {};
        headers.forEach((header, colIndex) => {
          const value = row[colIndex];
          obj[header] = (value !== null && value !== undefined) ? 
            String(value).trim() : '';
        });
        return obj;
      })
      .filter(obj => {
        // Solo objetos que tengan RUT o nombre válidos
        const rutValue = Object.values(obj).find(val => 
          val && String(val).match(/\d{7,8}[-]?[0-9kK]/i)
        );
        const nombreValue = Object.values(obj).find(val => 
          val && String(val).length > 5 && /[a-zA-Z]/.test(val)
        );
        
        return rutValue || nombreValue;
      });
  };

  // 🔧 ANÁLISIS AUTOMÁTICO MEJORADO
  const realizarAnalisisAutomatico = async (headers, sampleData) => {
    try {
      console.log('🔍 Realizando análisis automático...');
      
      const response = await remuneracionesAPI.validarExcel({
        headers,
        sampleData
      });

      if (response.data.success) {
        const analisis = response.data.data;
        setAnalisisExcel(analisis);
        setMapeoColumnas(analisis.mapeo_sugerido);
        
        // Mostrar resultados del análisis
        if (analisis.errores.length > 0) {
          showSnackbar(`Análisis completado con ${analisis.errores.length} errores críticos`, 'error');
        } else if (analisis.advertencias.length > 0) {
          showSnackbar(`Análisis completado con ${analisis.advertencias.length} advertencias`, 'warning');
        } else {
          showSnackbar('Análisis completado - Excel válido para procesar', 'success');
        }

        console.log('✅ Análisis automático completado:', analisis);
      } else {
        throw new Error(response.data.message || 'Error en el análisis automático');
      }
    } catch (err) {
      console.error('❌ Error en análisis automático:', err);
      const errorMsg = err.response?.data?.message || 'Error al analizar el archivo';
      showSnackbar(errorMsg, 'error');
    }
  };

  // 🆕 PROCESAR EXCEL CON VALIDACIÓN DE EMPLEADOS SIN ASIGNACIÓN
  const procesarExcel = async () => {
    if (!excelData.length) {
      showSnackbar('No hay datos para procesar', 'error');
      return;
    }

    if (!periodoSeleccionado) {
      showSnackbar('Debe seleccionar un período', 'error');
      return;
    }

    // Validar mapeo crítico
    if (!mapeoColumnas.rut_empleado || !mapeoColumnas.nombre_empleado) {
      showSnackbar('RUT y Nombre son campos obligatorios para el procesamiento', 'error');
      return;
    }

    setLoading(true);
    setActiveStep(4);
    setUploadProgress(0);

    try {
      // 🆕 PROGRESO REALISTA CON VALIDACIÓN PREVIA
      const etapas = [
        { progreso: 15, mensaje: 'Validando datos...', delay: 200 },
        { progreso: 30, mensaje: 'Verificando período...', delay: 300 },
        { progreso: 50, mensaje: 'Procesando empleados...', delay: 500 },
        { progreso: 75, mensaje: 'Guardando remuneraciones...', delay: 800 },
        { progreso: 90, mensaje: 'Finalizando proceso...', delay: 400 },
        { progreso: 100, mensaje: 'Completado', delay: 200 }
      ];

      // Simular progreso visual
      for (const etapa of etapas) {
        setUploadProgress(etapa.progreso);
        setProcessingStatus(etapa.mensaje);
        await new Promise(resolve => setTimeout(resolve, etapa.delay));
      }

      console.log('📊 Enviando datos al servidor:', {
        totalFilas: excelData.length,
        periodo: periodoSeleccionado,
        archivo: excelFile.name,
        primeraFila: excelData[0]
      });

      const response = await remuneracionesAPI.procesarExcel({
        datosExcel: excelData,
        archivoNombre: excelFile.name,
        validarDuplicados,
        id_periodo: periodoSeleccionado
      });

      if (response.data.success) {
        const resultado = response.data.data;
        setResultadoProcesamiento(resultado);
        
        // 🆕 VALIDAR SI HAY EMPLEADOS SIN ASIGNACIÓN
        if (resultado.empleados_para_validar && resultado.empleados_para_validar.length > 0) {
          console.log('🔍 Validando empleados sin asignación...');
          
          const validacionResponse = await remuneracionesAPI.validarEmpleadosSinAsignacion(
            resultado.empleados_para_validar
          );
          
          if (validacionResponse.data.success && validacionResponse.data.data.requiere_asignacion) {
            setEmpleadosSinAsignacion(validacionResponse.data.data.empleados_sin_asignacion);
            setActiveStep(5); // Ir al paso de asignación
            return; // No cerrar el dialog aún
          }
        }
        
        // 🆕 MENSAJE MEJORADO CON ESTADÍSTICAS DETALLADAS
        let mensaje = `✅ Procesamiento exitoso: ${resultado.procesados}/${resultado.total_filas} registros`;
        
        if (resultado.empleados_creados > 0) {
          mensaje += `\n👤 ${resultado.empleados_creados} empleados nuevos creados`;
        }
        
        if (resultado.empleados_encontrados > 0) {
          mensaje += `\n🔍 ${resultado.empleados_encontrados} empleados existentes`;
        }
        
        if (resultado.errores > 0) {
          mensaje += `\n⚠️ ${resultado.errores} registros con errores`;
        }
        
        const severity = resultado.errores > resultado.procesados * 0.1 ? 'warning' : 'success';
        showSnackbar(mensaje, severity);
        
        // 🆕 MOSTRAR ERRORES DETALLADOS SI EXISTEN
        if (resultado.errores_detalle && resultado.errores_detalle.length > 0) {
          console.log('📋 Errores detallados:', resultado.errores_detalle);
          
          setTimeout(() => {
            const erroresResumen = resultado.errores_detalle
              .slice(0, 5)
              .map(err => `Fila ${err.fila}: ${err.error}`)
              .join('\n');
            
            showSnackbar(`Detalles de errores:\n${erroresResumen}`, 'info');
          }, 2000);
        }
        
        // Actualizar datos
        await Promise.all([
          cargarPeriodos(),
          cargarEstadisticas()
        ]);
        
        handleCloseExcelDialog();
      } else {
        throw new Error(response.data.message || 'Error al procesar Excel');
      }
    } catch (err) {
      console.error('❌ Error al procesar Excel:', err);
      
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

  // 🆕 MANEJAR ASIGNACIÓN DE RAZÓN SOCIAL Y SUCURSAL
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
      
      console.log('📝 Procesando asignaciones:', asignaciones);
      
      const response = await remuneracionesAPI.asignarRazonSocialYSucursal(asignaciones);
      
      if (response.data.success) {
        showSnackbar(`✅ ${response.data.data.empleados_actualizados} empleados actualizados`, 'success');
        
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
      console.error('❌ Error en asignaciones:', err);
      showSnackbar(err.response?.data?.message || 'Error al procesar asignaciones', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 🔧 FUNCIONES AUXILIARES MEJORADAS
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
  };

  const handleCloseExcelDialog = () => {
    setOpenExcelDialog(false);
    setPeriodoSeleccionado('');
    resetExcelState();
  };

  // 🔧 FUNCIONES DE UTILIDAD MEJORADAS
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

  // 🔧 CÁLCULOS MEJORADOS
  const periodosFiltrados = React.useMemo(() => {
    return periodos.filter(periodo => {
      if (filtroEstado === 'todos') return true;
      return periodo.estado === filtroEstado;
    });
  }, [periodos, filtroEstado]);

  // Cálculos para paginación de empleados optimizados
  const empleadosFiltrados = React.useMemo(() => {
    if (!selectedPeriodo?.datos) return [];
    
    return selectedPeriodo.datos.filter(empleado => {
      if (!filtroEmpleados) return true;
      const filtro = filtroEmpleados.toLowerCase();
      const nombre = (empleado.nombre_empleado || empleado.nombre_completo || '').toLowerCase();
      const rut = (empleado.rut_empleado || '').toLowerCase();
      return nombre.includes(filtro) || rut.includes(filtro);
    });
  }, [selectedPeriodo?.datos, filtroEmpleados]);

  const totalPaginas = React.useMemo(() => {
    return empleadosPorPagina === -1 ? 1 : Math.ceil(empleadosFiltrados.length / empleadosPorPagina);
  }, [empleadosFiltrados.length, empleadosPorPagina]);

  const empleadosPaginados = React.useMemo(() => {
    if (empleadosPorPagina === -1) return empleadosFiltrados;
    
    const inicio = (paginaActual - 1) * empleadosPorPagina;
    const fin = inicio + empleadosPorPagina;
    return empleadosFiltrados.slice(inicio, fin);
  }, [empleadosFiltrados, paginaActual, empleadosPorPagina]);

  // 🔧 COMPONENTES DE RENDERIZADO MEJORADOS
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

  // 🆕 MODAL DE ASIGNACIÓN DE RAZÓN SOCIAL Y SUCURSAL
  const renderModalAsignacion = () => (
    <Dialog 
      open={activeStep === 5 && empleadosSinAsignacion.length > 0} 
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
      <DialogTitle sx={{ 
        background: 'linear-gradient(135deg, #f37d16 0%, #e06c00 100%)',
        color: 'white',
        textAlign: 'center'
      }}>
        <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
          Asignar Razón Social y Sucursal
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
          {empleadosSinAsignacion.length} empleados requieren asignación
        </Typography>
      </DialogTitle>
      
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
            💡 Una vez asignadas las razones sociales y sucursales, los empleados podrán 
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

  // 🔧 RENDER PRINCIPAL DEL COMPONENTE
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

      {/* 🆕 Filtros mejorados */}
      {renderFiltros()}

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

      {/* 🆕 Modal de asignación */}
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

      {/* Dialog profesional para cargar y analizar Excel */}
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
            Procesador Automático de Nóminas
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
            Sistema con identificación automática de columnas
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
                      Identificación Automática
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
                          primary="Todos los campos monetarios" 
                          secondary="Haberes, descuentos, líquidos"
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
                  💡 El sistema detecta automáticamente la estructura de la planilla
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
                <Tab label="Vista Previa" />
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
                  </Alert>

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Card sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                          <DataUsageIcon sx={{ mr: 1, color: '#f37d16' }} />
                          Columnas Detectadas
                        </Typography>
                        <List>
                          {Object.entries(analisisExcel.mapeo_sugerido || {}).map(([campo, columna]) => 
                            columna && (
                              <ListItem key={campo}>
                                <ListItemIcon>
                                  <CheckCircleIcon color="success" />
                                </ListItemIcon>
                                <ListItemText 
                                  primary={campo.replace('_', ' ').toUpperCase()}
                                  secondary={`Mapeado a: "${columna}"`}
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
                          Recomendaciones
                        </Typography>
                        <List>
                          {analisisExcel.recomendaciones?.map((recomendacion, index) => (
                            <ListItem key={index}>
                              <ListItemIcon>
                                <CheckCircleIcon color="info" />
                              </ListItemIcon>
                              <ListItemText primary={recomendacion} />
                            </ListItem>
                          ))}
                        </List>
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
                    Configurar Mapeo de Columnas
                  </Typography>
                  
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
                        <InputLabel>Sueldo Base</InputLabel>
                        <Select
                          value={mapeoColumnas.sueldo_base || ''}
                          onChange={(e) => setMapeoColumnas({...mapeoColumnas, sueldo_base: e.target.value})}
                          label="Sueldo Base"
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
                        <InputLabel>Líquido a Pagar</InputLabel>
                        <Select
                          value={mapeoColumnas.liquido_pagar || ''}
                          onChange={(e) => setMapeoColumnas({...mapeoColumnas, liquido_pagar: e.target.value})}
                          label="Líquido a Pagar"
                        >
                          <MenuItem value="">-- No mapear --</MenuItem>
                          {columnasDetectadas.map(col => (
                            <MenuItem key={col} value={col}>{col}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                  
                  <Alert severity="info" sx={{ mt: 3 }}>
                    <Typography variant="body2">
                      <strong>* Campos obligatorios:</strong> RUT y Nombre son necesarios para procesar los datos.
                    </Typography>
                  </Alert>
                </Box>
              )}

              {/* Tab 2: Vista previa */}
              {tabValue === 2 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Vista Previa de Datos (primeras 20 filas)
                  </Typography>
                  
                  <TableContainer component={Paper} sx={{ maxHeight: 500, mb: 2 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', minWidth: 50 }}>
                            #
                          </TableCell>
                          {Object.keys(previewData[0] || {}).map((key) => {
                            const esMapeado = Object.values(mapeoColumnas).includes(key);
                            return (
                              <TableCell 
                                key={key} 
                                sx={{ 
                                  fontWeight: 'bold', 
                                  bgcolor: esMapeado ? '#e8f5e8' : '#f5f5f5',
                                  color: esMapeado ? '#2e7d32' : 'inherit',
                                  minWidth: 120
                                }}
                              >
                                {key}
                                {esMapeado && (
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
                        {previewData.map((row, index) => (
                          <TableRow key={index} hover>
                            <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                              {index + 1}
                            </TableCell>
                            {Object.entries(row).map(([key, value], i) => {
                              const esMapeado = Object.values(mapeoColumnas).includes(key);
                              return (
                                <TableCell 
                                  key={i}
                                  sx={{
                                    bgcolor: esMapeado ? 'rgba(46, 125, 50, 0.04)' : 'inherit',
                                    maxWidth: 200,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
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
                </Box>
              )}
            </Box>
          )}

          {/* Paso 4: Procesando */}
          {activeStep === 4 && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <CircularProgress size={80} sx={{ mb: 3, color: '#f37d16' }} />
              <Typography variant="h5" gutterBottom>
                Procesando Nómina
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                📄 Guardando datos en la base de datos...
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
                    {tabValue === 0 ? 'Ver Vista Previa' : 'Ver Configuración'}
                  </Button>
                )}
                
                {tabValue === 2 && (
                  <Button
                    onClick={procesarExcel}
                    variant="contained"
                    disabled={loading || analisisExcel?.errores?.length > 0}
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
              </>
            )}
          </Box>
        </DialogActions>
      </Dialog>

      {/* Dialog para Ver Detalles del Período */}
      <Dialog 
        open={openViewDialog} 
        onClose={handleCloseViewDialog} 
        maxWidth="xl" 
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', bgcolor: '#f8f9fa' }}>
          <VisibilityIcon sx={{ mr: 1 }} />
          Detalles del Período: {selectedPeriodo?.descripcion}
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
                      Datos de Empleados ({selectedPeriodo.datos.length} total)
                    </Typography>
                    
                    {/* Filtro y búsqueda */}
                    <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                      <TextField
                        size="small"
                        placeholder="Buscar por nombre o RUT..."
                        value={filtroEmpleados || ''}
                        onChange={(e) => setFiltroEmpleados(e.target.value)}
                        sx={{ minWidth: 300 }}
                      />
                      <FormControl size="small" sx={{ minWidth: 120 }}>
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
                    </Box>

                    <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>#</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>RUT</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Nombre</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Razón Social</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Sucursal</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Sueldo Base</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Total Haberes</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Total Descuentos</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Líquido</TableCell>
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
                              <TableCell>{formatMoney(empleado.sueldo_base)}</TableCell>
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

                    {/* Paginación */}
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
                            ({empleadosFiltrados.length} registros)
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

export default RemuneracionesPage;