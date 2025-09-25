// EmpleadosPage.jsx - VERSIÓN COMPLETA CORREGIDA CON FILTRO "SIN RAZÓN SOCIAL"
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, 
  Typography, 
  Paper, 
  Button, 
  TextField, 
  IconButton, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogContentText, 
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Snackbar,
  Alert,
  CircularProgress,
  Tooltip,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Switch,
  FormControlLabel,
  Chip,
  FormHelperText,
  InputAdornment,
  Link,
  Card,
  CardContent,
  Autocomplete,
  Checkbox,
  ListItemText
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Work as WorkIcon,
  Fingerprint as FingerprintIcon,
  CloudUpload as CloudUploadIcon,
  Warning as WarningIcon,
  DeleteSweep as DeleteSweepIcon,
  SelectAll as SelectAllIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import api from '../api/api';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { es } from 'date-fns/locale';
import { format, parseISO } from 'date-fns';
import ImportarEmpleadosExcel from './ImportarEmpleadosExcel';

// CONFIGURACIÓN DE API COMPLETA CON ASIGNACIÓN MASIVA DE RAZÓN SOCIAL
const empleadosAPI = {
  obtenerEmpleados: (showInactive = false) => api.get(`/empleados${showInactive ? '?showInactive=true' : ''}`),
  obtenerEmpleadoPorId: (id) => api.get(`/empleados/${id}`),
  crearEmpleado: (datos) => api.post('/empleados', datos),
  actualizarEmpleado: (id, datos) => api.put(`/empleados/${id}`, datos),
  eliminarEmpleado: (id) => api.delete(`/empleados/${id}`),
  buscarEmpleados: (query, showInactive = false) => api.get(`/empleados/search?query=${query}${showInactive ? '&showInactive=true' : ''}`),
  obtenerSucursalesEmpleado: (id) => api.get(`/empleados/${id}/sucursales`),
  actualizarSucursalesEmpleado: (id, sucursales_ids) => api.put(`/empleados/${id}/sucursales`, { sucursales_ids }),
  obtenerEstadisticas: () => api.get('/empleados/stats'),
  cambiarEstadoActivo: (id, activo) => api.patch(`/empleados/${id}/toggle-active`, { activo }),
  cambiarEstadoDiscapacidad: (id, discapacidad) => api.patch(`/empleados/${id}/toggle-discapacidad`, { discapacidad }),
  validarRUT: (rut) => api.post('/empleados/validate-rut', { rut }),
  obtenerSucursales: () => api.get('/sucursales'),
  obtenerRazonesSociales: () => api.get('/razonessociales'),
  obtenerCentrosCostos: () => api.get('/centros-costos'),
  obtenerEmpresas: () => api.get('/empresas'),
  obtenerJefes: () => api.get('/empleados?cargo=jefe'),
  importarEmpleadosExcel: (datosExcel, validarDuplicados = true) => 
    api.post('/empleados/import-excel', { datosExcel, validarDuplicados }),
  updateRazonSocialMasiva: (empleados_ids, id_razon_social) => 
    api.put('/empleados/razon-social-masiva', { empleados_ids, id_razon_social })
};
 
// Función para formatear fecha evitando problemas de zona horaria
const formatDateForBackend = (date) => {
  if (!date) return null;
  
  const dateObj = date instanceof Date ? date : new Date(date);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

// Lista de estados civiles
const estadosCiviles = [
  'Soltero/a',
  'Casado/a',
  'Divorciado/a',
  'Viudo/a',
  'Unión civil'
];

// Lista de nacionalidades comunes
const nacionalidadesComunes = [
  'Chilena',
  'Argentina',
  'Peruana',
  'Boliviana',
  'Colombiana',
  'Venezolana',
  'Brasileña',
  'Otra'
];

// Función para formatear RUT chileno (XX.XXX.XXX-X)
const formatearRut = (rut) => {
  if (!rut) return '';
  
  let rutLimpio = rut.replace(/[.-]/g, '');
  rutLimpio = rutLimpio.replace(/[^0-9kK]/g, '');
  
  if (rutLimpio.length <= 1) return rutLimpio;
  
  const dv = rutLimpio.slice(-1);
  const cuerpo = rutLimpio.slice(0, -1);
  
  let resultado = '';
  let i = cuerpo.length;
  while (i > 0) {
    const limite = Math.max(i - 3, 0);
    resultado = '.' + cuerpo.substring(limite, i) + resultado;
    i = limite;
  }
  
  return resultado.substring(1) + '-' + dv;
};

// Función para validar RUT chileno
const validarRut = (rut) => {
  if (!rut) return false;
  
  const rutLimpio = rut.replace(/[.-]/g, '');
  
  if (rutLimpio.length < 8) return false;
  
  const cuerpo = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1).toUpperCase();
  
  if (!/^\d+$/.test(cuerpo)) return false;
  if (dv !== 'K' && !/^\d$/.test(dv)) return false;
  
  let suma = 0;
  let multiplicador = 2;
  
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo.charAt(i)) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  
  const resto = suma % 11;
  const dvCalculado = resto === 0 ? '0' : resto === 1 ? 'K' : (11 - resto).toString();
  
  return dv === dvCalculado;
};

// Función para validar email
const validarEmail = (email) => {
  if (!email) return true; // Opcional
  const re = /\S+@\S+\.\S+/;
  return re.test(email);
};

const EmpleadosPage = () => {
  // Estados principales
  const [empleados, setEmpleados] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [razonesSociales, setRazonesSociales] = useState([]);
  const [centrosCostos, setCentrosCostos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [jefes, setJefes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // ESTADOS PARA SELECCIÓN MÚLTIPLE
  const [selectedEmpleados, setSelectedEmpleados] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Estados de diálogos
  const [openForm, setOpenForm] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openDeleteMultiple, setOpenDeleteMultiple] = useState(false);
  const [openRazonSocialMasiva, setOpenRazonSocialMasiva] = useState(false);
  const [openDetalles, setOpenDetalles] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [selectedEmpleado, setSelectedEmpleado] = useState(null);
  
  // Estados específicos para asignación masiva de razón social
  const [razonSocialSeleccionada, setRazonSocialSeleccionada] = useState('');
  
  // Estados de filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showDiscapacidad, setShowDiscapacidad] = useState(false);
  const [razonSocialFilter, setRazonSocialFilter] = useState('todas');
  
  // Estados del formulario - COMPLETO CON TODOS LOS CAMPOS
  const [formData, setFormData] = useState({
    rut: '',
    nombre: '',
    apellido: '',
    sucursales_ids: [],
    id_razon_social: '',
    id_centro_costo: '',
    id_empresa: '',
    id_jefe: '',
    codigo_empleado: '',
    numero_empleado: '',
    cargo: '',
    cargo_descripcion: '',
    direccion: '',
    nacionalidad: 'Chilena',
    correo_electronico: '',
    fecha_nacimiento: null,
    fecha_ingreso: new Date(),
    fecha_termino: null,
    estado_civil: '',
    activo: true,
    discapacidad: false,
    telefono: '',
    descripcion: '',
    sueldo_base: '',
    monto_pensiones: '',
    propinas_promedio_12m: '',
    otros_descuentos_legales: '',
    total_ingresos: '',
    total_descuentos_legales: '',
    total_haberes: '',
    descuento_prestamo: '',
    descuento_sindicato: ''
  });

  const [formErrors, setFormErrors] = useState({});
  
  // Estados de paginación
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Estado de snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Función para mostrar mensajes
  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({
      open: true,
      message: message.length > 200 ? message.substring(0, 200) + '...' : message,
      severity
    });
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  // Función para obtener sucursales del empleado
  const fetchEmpleadoSucursales = useCallback(async (empleadoId) => {
    try {
      console.log(`🏢 Obteniendo sucursales para empleado ${empleadoId}`);
      const response = await empleadosAPI.obtenerSucursalesEmpleado(empleadoId);
      
      if (response.data && response.data.success && Array.isArray(response.data.sucursales)) {
        console.log(`✅ Sucursales obtenidas:`, response.data.sucursales);
        return response.data.sucursales;
      }
      
      return [];
    } catch (error) {
      console.error('❌ Error al obtener sucursales del empleado:', error);
      return [];
    }
  }, []);

  // Funciones de carga de datos - DECLARADAS PRIMERO
  const fetchEmpleados = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📊 Cargando empleados...', { showInactive });
      
      const response = await empleadosAPI.obtenerEmpleados(showInactive);
      
      if (response.data && response.data.success === true && Array.isArray(response.data.empleados)) {
        console.log('✅ Empleados cargados:', response.data.empleados.length);
        
        const empleadosConSucursales = await Promise.all(
          response.data.empleados.map(async (empleado) => {
            try {
              const sucursales = await fetchEmpleadoSucursales(empleado.id);
              return { ...empleado, sucursales_detalle: sucursales };
            } catch (error) {
              console.error(`❌ Error cargando sucursales para empleado ${empleado.id}:`, error);
              return empleado;
            }
          })
        );
        
        setEmpleados(empleadosConSucursales);
        setError(null);
        
        // Limpiar selección al recargar
        setSelectedEmpleados([]);
        setSelectAll(false);
      } else {
        setEmpleados([]);
        setError('No se encontraron empleados');
      }
      
    } catch (err) {
      console.error('❌ Error al cargar empleados:', err);
      const errorMsg = err.response?.data?.message || 'Error al cargar los empleados';
      setError(errorMsg);
      setEmpleados([]);
      showSnackbar(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  }, [showInactive, fetchEmpleadoSucursales, showSnackbar]);

  const fetchSucursales = useCallback(async () => {
    try {
      console.log('🏢 Cargando sucursales...');
      const response = await empleadosAPI.obtenerSucursales();
      
      if (response.data && Array.isArray(response.data)) {
        const sucursalesFormateadas = response.data.map(sucursal => ({
          id: sucursal.id,
          nombre: sucursal.nombre || `Sucursal ${sucursal.id}`,
          tipo: sucursal.tipo_sucursal || ''
        }));
        setSucursales(sucursalesFormateadas);
        console.log('✅ Sucursales cargadas:', sucursalesFormateadas.length);
      } else {
        setSucursales([]);
      }
    } catch (err) {
      console.error('❌ Error al cargar sucursales:', err);
      setSucursales([]);
      showSnackbar('Error al cargar las sucursales', 'error');
    }
  }, [showSnackbar]);

  const fetchRazonesSociales = useCallback(async () => {
    try {
      console.log('🏭 Cargando razones sociales...');
      const response = await empleadosAPI.obtenerRazonesSociales();
      
      if (response.data && Array.isArray(response.data)) {
        setRazonesSociales(response.data);
        console.log('✅ Razones sociales cargadas:', response.data.length);
      } else {
        setRazonesSociales([]);
      }
    } catch (err) {
      console.error('❌ Error al cargar razones sociales:', err);
      setRazonesSociales([]);
      showSnackbar('Error al cargar las razones sociales', 'error');
    }
  }, [showSnackbar]);

  const fetchCentrosCostos = useCallback(async () => {
    try {
      console.log('🏢 Cargando centros de costos...');
      const response = await empleadosAPI.obtenerCentrosCostos();
      
      if (response.data && Array.isArray(response.data)) {
        setCentrosCostos(response.data);
        console.log('✅ Centros de costos cargados:', response.data.length);
      } else {
        setCentrosCostos([]);
      }
    } catch (err) {
      console.error('❌ Error al cargar centros de costos:', err);
      setCentrosCostos([]);
    }
  }, []);

  const fetchEmpresas = useCallback(async () => {
    try {
      console.log('🏭 Cargando empresas...');
      const response = await empleadosAPI.obtenerEmpresas();
      
      if (response.data && Array.isArray(response.data)) {
        setEmpresas(response.data);
        console.log('✅ Empresas cargadas:', response.data.length);
      } else {
        setEmpresas([]);
      }
    } catch (err) {
      console.error('❌ Error al cargar empresas:', err);
      setEmpresas([]);
    }
  }, []);

  const fetchJefes = useCallback(async () => {
    try {
      console.log('👨‍💼 Cargando jefes...');
      const response = await empleadosAPI.obtenerJefes();
      
      if (response.data && response.data.success && Array.isArray(response.data.empleados)) {
        setJefes(response.data.empleados);
        console.log('✅ Jefes cargados:', response.data.empleados.length);
      } else {
        setJefes([]);
      }
    } catch (err) {
      console.error('❌ Error al cargar jefes:', err);
      setJefes([]);
    }
  }, []);

  // FUNCIÓN: Buscar sucursal por nombre mapeado
  const buscarSucursalPorNombre = useCallback((nombreMapeado) => {
    if (!nombreMapeado || !sucursales.length) return null;
    
    // Buscar coincidencia exacta primero
    let sucursalEncontrada = sucursales.find(s => 
      s.nombre === nombreMapeado || 
      s.nombre.toLowerCase() === nombreMapeado.toLowerCase()
    );
    
    if (sucursalEncontrada) {
      console.log(`✅ Sucursal encontrada (exacta): ${nombreMapeado} -> ID: ${sucursalEncontrada.id}`);
      return sucursalEncontrada;
    }
    
    // Buscar coincidencia parcial
    sucursalEncontrada = sucursales.find(s => 
      s.nombre.toLowerCase().includes(nombreMapeado.toLowerCase()) ||
      nombreMapeado.toLowerCase().includes(s.nombre.toLowerCase())
    );
    
    if (sucursalEncontrada) {
      console.log(`✅ Sucursal encontrada (parcial): ${nombreMapeado} -> ID: ${sucursalEncontrada.id}`);
      return sucursalEncontrada;
    }
    
    console.log(`⚠️ No se encontró sucursal para: ${nombreMapeado}`);
    return null;
  }, [sucursales]);

  // 🔧 FUNCIÓN CORREGIDA: Aplicar filtros con filtro para empleados sin razón social
  const empleadosArray = Array.isArray(empleados) ? empleados : [];
  
  const filteredEmpleados = React.useMemo(() => {
    return empleadosArray.filter(empleado => {
      // Filtro por estado activo/inactivo
      if (!showInactive && !empleado.activo) return false;
      
      // 🆕 FILTRO POR RAZÓN SOCIAL CON OPCIÓN "SIN ASIGNAR"
      if (razonSocialFilter !== 'todas') {
        if (razonSocialFilter === 'sin_asignar') {
          // Mostrar empleados sin razón social asignada
          if (empleado.id_razon_social && empleado.id_razon_social !== 0) return false;
        } else {
          // Mostrar empleados con la razón social específica
          if (empleado.id_razon_social !== parseInt(razonSocialFilter)) return false;
        }
      }
      
      // Filtro por discapacidad
      if (showDiscapacidad && !empleado.discapacidad) return false;
      
      return true;
    });
  }, [empleadosArray, showInactive, razonSocialFilter, showDiscapacidad]);
  
  const paginatedEmpleados = React.useMemo(() => {
    return filteredEmpleados.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [filteredEmpleados, page, rowsPerPage]);

  // FUNCIONES PARA SELECCIÓN MÚLTIPLE
  
  // Seleccionar/deseleccionar un empleado
  const handleSelectEmpleado = useCallback((empleadoId, checked) => {
    setSelectedEmpleados(prev => {
      if (checked) {
        return [...prev, empleadoId];
      } else {
        return prev.filter(id => id !== empleadoId);
      }
    });
  }, []);

  // Seleccionar/deseleccionar todos los empleados de la página actual
  const handleSelectAll = useCallback((checked) => {
    setSelectAll(checked);
    if (checked) {
      const allIds = paginatedEmpleados.map(emp => emp.id);
      setSelectedEmpleados(prev => {
        // Agregar todos los IDs de la página actual, evitando duplicados
        const newIds = allIds.filter(id => !prev.includes(id));
        return [...prev, ...newIds];
      });
    } else {
      // Remover solo los IDs de la página actual
      const currentPageIds = paginatedEmpleados.map(emp => emp.id);
      setSelectedEmpleados(prev => prev.filter(id => !currentPageIds.includes(id)));
    }
  }, [paginatedEmpleados]);

  // Verificar si un empleado está seleccionado
  const isEmpleadoSelected = useCallback((empleadoId) => {
    return selectedEmpleados.includes(empleadoId);
  }, [selectedEmpleados]);

  // Abrir diálogo de eliminación múltiple
  const handleOpenDeleteMultiple = useCallback(() => {
    if (selectedEmpleados.length === 0) {
      showSnackbar('Debe seleccionar al menos un empleado para eliminar', 'warning');
      return;
    }
    setOpenDeleteMultiple(true);
  }, [selectedEmpleados.length, showSnackbar]);

  // NUEVA FUNCIÓN: Abrir diálogo de asignación masiva de razón social
  const handleOpenRazonSocialMasiva = useCallback(() => {
    if (selectedEmpleados.length === 0) {
      showSnackbar('Debe seleccionar al menos un empleado para asignar razón social', 'warning');
      return;
    }
    setRazonSocialSeleccionada('');
    setOpenRazonSocialMasiva(true);
  }, [selectedEmpleados.length, showSnackbar]);

  // 🔧 FUNCIÓN CORREGIDA: Realizar la asignación masiva de razón social
  const handleUpdateRazonSocialMasiva = useCallback(async () => {
    if (selectedEmpleados.length === 0) return;
    
    if (!razonSocialSeleccionada || razonSocialSeleccionada === '') {
      showSnackbar('Debe seleccionar una razón social', 'error');
      return;
    }
    
    try {
      setLoading(true);
      console.log(`🏢 Asignando razón social ${razonSocialSeleccionada} a ${selectedEmpleados.length} empleados`);
      console.log('🔍 IDs de empleados seleccionados:', selectedEmpleados);
      console.log('🔍 Tipo de IDs:', selectedEmpleados.map(id => typeof id));
      
      // 🚨 CORRECCIÓN: Asegurar que todos los IDs sean números enteros válidos
      const empleadosIdsValidados = selectedEmpleados
        .map(id => {
          const numericId = parseInt(id, 10);
          console.log(`🔄 Convirtiendo ID ${id} (${typeof id}) -> ${numericId} (${typeof numericId})`);
          return numericId;
        })
        .filter(id => !isNaN(id) && id > 0); // Filtrar IDs válidos
      
      console.log('✅ IDs validados:', empleadosIdsValidados);
      
      if (empleadosIdsValidados.length === 0) {
        showSnackbar('No se encontraron empleados válidos para actualizar', 'error');
        return;
      }
      
      if (empleadosIdsValidados.length !== selectedEmpleados.length) {
        console.warn(`⚠️ Se perdieron ${selectedEmpleados.length - empleadosIdsValidados.length} empleados por IDs inválidos`);
      }
      
      // 🚨 CORRECCIÓN: Convertir razonSocialSeleccionada a número
      const razonSocialId = parseInt(razonSocialSeleccionada, 10);
      if (isNaN(razonSocialId) || razonSocialId <= 0) {
        showSnackbar('ID de razón social inválido', 'error');
        return;
      }
      
      console.log('🎯 Enviando al backend:', {
        empleados_ids: empleadosIdsValidados,
        id_razon_social: razonSocialId
      });
      
      const response = await empleadosAPI.updateRazonSocialMasiva(empleadosIdsValidados, razonSocialId);
      
      if (response.data && response.data.success) {
        await fetchEmpleados();
        
        // Limpiar selección
        setSelectedEmpleados([]);
        setSelectAll(false);
        
        showSnackbar(
          response.data.message,
          response.data.errores > 0 ? 'warning' : 'success'
        );
        
        setOpenRazonSocialMasiva(false);
        setRazonSocialSeleccionada('');
      } else {
        throw new Error(response.data?.message || 'Error desconocido');
      }
      
    } catch (err) {
      console.error('❌ Error en asignación masiva de razón social:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Error al asignar razón social';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedEmpleados, razonSocialSeleccionada, showSnackbar, fetchEmpleados]);

  // Eliminar empleados seleccionados
  const handleDeleteSelectedEmpleados = useCallback(async () => {
    if (selectedEmpleados.length === 0) return;
    
    try {
      setLoading(true);
      console.log(`🗑️ Eliminando ${selectedEmpleados.length} empleados`);
      
      let eliminados = 0;
      let errores = 0;
      
      for (const empleadoId of selectedEmpleados) {
        try {
          await empleadosAPI.eliminarEmpleado(empleadoId);
          eliminados++;
        } catch (error) {
          console.error(`Error eliminando empleado ${empleadoId}:`, error);
          errores++;
        }
      }
      
      await fetchEmpleados();
      
      // Limpiar selección
      setSelectedEmpleados([]);
      setSelectAll(false);
      
      showSnackbar(
        `Eliminación completada: ${eliminados} empleados eliminados${errores > 0 ? `, ${errores} errores` : ''}`, 
        errores > 0 ? 'warning' : 'success'
      );
      
      setOpenDeleteMultiple(false);
    } catch (err) {
      console.error('❌ Error en eliminación múltiple:', err);
      showSnackbar('Error al eliminar empleados seleccionados', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedEmpleados, showSnackbar, fetchEmpleados]);

  // Manejar la finalización de la importación CON ASIGNACIÓN AUTOMÁTICA DE SUCURSALES
  const handleImportComplete = useCallback(async (result) => {
    console.log('✅ Importación completada:', result);
    
    if (result && result.successful > 0) {
      showSnackbar(
        `Importación exitosa: ${result.successful} empleados importados${result.failed > 0 ? `, ${result.failed} errores` : ''}`,
        result.failed > 0 ? 'warning' : 'success'
      );
      
      // Recargar la lista de empleados
      await fetchEmpleados();
      
      // NUEVO: Asignar sucursales automáticamente a los empleados importados
      try {
        console.log('🏢 Iniciando asignación automática de sucursales...');
        
        // Obtener empleados recién importados (últimos por fecha de creación)
        const response = await empleadosAPI.obtenerEmpleados(false);
        if (response.data && response.data.success && Array.isArray(response.data.empleados)) {
          const empleadosRecientes = response.data.empleados
            .filter(emp => emp.establecimiento) // Solo los que tienen establecimiento
            .slice(-result.successful); // Tomar los últimos importados
          
          console.log(`🏢 Procesando ${empleadosRecientes.length} empleados para asignación de sucursales`);
          
          let asignacionesExitosas = 0;
          
          for (const empleado of empleadosRecientes) {
            try {
              const sucursalEncontrada = buscarSucursalPorNombre(empleado.establecimiento);
              
              if (sucursalEncontrada) {
                await empleadosAPI.actualizarSucursalesEmpleado(empleado.id, [sucursalEncontrada.id]);
                asignacionesExitosas++;
                console.log(`✅ Sucursal asignada: ${empleado.nombre} -> ${sucursalEncontrada.nombre}`);
              }
            } catch (error) {
              console.error(`❌ Error asignando sucursal a ${empleado.nombre}:`, error);
            }
          }
          
          if (asignacionesExitosas > 0) {
            showSnackbar(
              `🏢 Sucursales asignadas automáticamente a ${asignacionesExitosas} empleados`,
              'info'
            );
            
            // Recargar empleados para mostrar las sucursales asignadas
            await fetchEmpleados();
          }
        }
      } catch (error) {
        console.error('❌ Error en asignación automática de sucursales:', error);
      }
    } else {
      showSnackbar(
        `Error en la importación: ${result?.failed || 'Desconocido'} empleados fallaron`,
        'error'
      );
    }
    
    // Cerrar el diálogo
    setOpenImportDialog(false);
  }, [showSnackbar, buscarSucursalPorNombre, fetchEmpleados]);

  // FUNCIONES PARA EL MODAL DE IMPORTACIÓN:
  
  // Abrir modal de importación
  const handleOpenImportDialog = useCallback(() => {
    console.log('📤 Abriendo diálogo de importación de Excel');
    setOpenImportDialog(true);
  }, []);

  // Cerrar modal de importación
  const handleCloseImportDialog = useCallback(() => {
    console.log('❌ Cerrando diálogo de importación');
    setOpenImportDialog(false);
  }, []);

  // Actualizar selectAll cuando cambia la selección
  useEffect(() => {
    if (paginatedEmpleados.length > 0) {
      const currentPageIds = paginatedEmpleados.map(emp => emp.id);
      const allCurrentPageSelected = currentPageIds.every(id => selectedEmpleados.includes(id));
      setSelectAll(allCurrentPageSelected);
    } else {
      setSelectAll(false);
    }
  }, [selectedEmpleados, paginatedEmpleados]);

  // Effect de inicialización
  useEffect(() => {
    const inicializar = async () => {
      console.log('🚀 Inicializando EmpleadosPage...');
      
      await Promise.all([
        fetchSucursales(),
        fetchRazonesSociales(),
        fetchCentrosCostos(),
        fetchEmpresas(),
        fetchJefes()
      ]);
      
      await fetchEmpleados();
    };

    inicializar();
  }, [fetchEmpleados, fetchSucursales, fetchRazonesSociales, fetchCentrosCostos, fetchEmpresas, fetchJefes]);

  // Cargar sucursales al abrir formulario de edición
  useEffect(() => {
    const loadSucursalesForEdit = async () => {
      if (openForm && selectedEmpleado && formData.sucursales_ids.length === 0) {
        try {
          const sucursalesDelEmpleado = await fetchEmpleadoSucursales(selectedEmpleado.id);
          const sucursalesIds = sucursalesDelEmpleado.map(s => s.id);
          
          setFormData(prev => ({
            ...prev,
            sucursales_ids: sucursalesIds
          }));
          
          console.log('🏢 Sucursales cargadas en edición:', sucursalesIds);
        } catch (error) {
          console.error('❌ Error al cargar sucursales para edición:', error);
        }
      }
    };

    loadSucursalesForEdit();
  }, [openForm, selectedEmpleado, fetchEmpleadoSucursales, formData.sucursales_ids.length]);

  // Función de búsqueda
  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      fetchEmpleados();
      return;
    }
    
    try {
      setLoading(true);
      console.log('🔍 Buscando empleados:', searchTerm);
      
      const response = await empleadosAPI.buscarEmpleados(searchTerm, showInactive);
      
      if (response.data && response.data.success === true && Array.isArray(response.data.empleados)) {
        const empleadosConSucursales = await Promise.all(
          response.data.empleados.map(async (empleado) => {
            try {
              const sucursales = await fetchEmpleadoSucursales(empleado.id);
              return { ...empleado, sucursales_detalle: sucursales };
            } catch (error) {
              console.error(`❌ Error cargando sucursales para empleado ${empleado.id}:`, error);
              return empleado;
            }
          })
        );
        setEmpleados(empleadosConSucursales);
        setError(null);
        console.log('✅ Búsqueda completada:', empleadosConSucursales.length, 'resultados');
        
        // Limpiar selección al buscar
        setSelectedEmpleados([]);
        setSelectAll(false);
      } else {
        setEmpleados([]);
        setError('No se encontraron empleados');
      }
      
    } catch (err) {
      console.error('❌ Error al buscar empleados:', err);
      const errorMsg = err.response?.data?.message || 'Error al buscar empleados';
      setError(errorMsg);
      setEmpleados([]);
      showSnackbar(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, showInactive, fetchEmpleados, fetchEmpleadoSucursales, showSnackbar]);

  // Funciones de validación
  const validateField = useCallback((fieldName, value) => {
    let error = null;

    switch (fieldName) {
      case 'rut':
        if (!value) {
          error = 'El RUT es obligatorio';
        } else if (!validarRut(value)) {
          error = 'Formato de RUT inválido';
        }
        break;
        
      case 'nombre':
        if (!value) {
          error = 'El nombre es obligatorio';
        } else if (value.length > 100) {
          error = 'Máximo 100 caracteres';
        }
        break;
        
      case 'apellido':
        if (!value) {
          error = 'El apellido es obligatorio';
        } else if (value.length > 100) {
          error = 'Máximo 100 caracteres';
        }
        break;
        
      case 'id_razon_social':
        if (!value || value === '' || value === null || value === undefined) {
          error = 'La razón social es obligatoria';
        } else {
          const razonSocialId = typeof value === 'string' ? parseInt(value, 10) : value;
          if (isNaN(razonSocialId) || razonSocialId <= 0) {
            error = 'Debe seleccionar una razón social válida';
          }
        }
        break;
        
      case 'correo_electronico':
        if (value && !validarEmail(value)) {
          error = 'Formato de correo electrónico inválido';
        } else if (value && value.length > 150) {
          error = 'Máximo 150 caracteres';
        }
        break;
        
      default:
        break;
    }

    setFormErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
    return error === null || error === undefined;
  }, []);

  const validateForm = useCallback(() => {
    const fieldsToValidate = [
      'rut', 
      'nombre', 
      'apellido', 
      'id_razon_social',
      'correo_electronico'
    ];
    
    let isValid = true;
    
    fieldsToValidate.forEach(field => {
      const fieldIsValid = validateField(field, formData[field]);
      if (!fieldIsValid) isValid = false;
    });
    
    return isValid;
  }, [formData, validateField]);

  // Manejadores de eventos del formulario
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    
    if (name === 'rut') {
      let valorLimpio = value.replace(/[.-]/g, '');
      valorLimpio = valorLimpio.replace(/[^0-9kK]/g, '');
      
      if (valorLimpio.length > 9) {
        valorLimpio = valorLimpio.substring(0, 9);
      }
      
      const valorFormateado = formatearRut(valorLimpio);
      setFormData(prev => ({ ...prev, [name]: valorFormateado }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  }, []);

  const handleSwitchChange = useCallback((e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  }, []);

  const handleDateChange = useCallback((name, date) => {
    setFormData(prev => ({ ...prev, [name]: date }));
  }, []);

  const handleSucursalesChange = useCallback((event, newValue) => {
    if (!Array.isArray(newValue)) {
      return;
    }
    
    const sucursalesIds = newValue
      .map(sucursal => sucursal?.id)
      .filter(id => id && !isNaN(parseInt(id)));
    
    console.log('🏢 Sucursales seleccionadas:', sucursalesIds);
    
    setFormData(prev => ({ 
      ...prev, 
      sucursales_ids: sucursalesIds 
    }));
  }, []);

  // Función para resetear formulario
  const resetFormData = useCallback(() => {
    setFormData({
      rut: '',
      nombre: '',
      apellido: '',
      sucursales_ids: [],
      id_razon_social: '',
      id_centro_costo: '',
      id_empresa: '',
      id_jefe: '',
      codigo_empleado: '',
      numero_empleado: '',
      cargo: '',
      cargo_descripcion: '',
      direccion: '',
      nacionalidad: 'Chilena',
      correo_electronico: '',
      fecha_nacimiento: null,
      fecha_ingreso: new Date(),
      fecha_termino: null,
      estado_civil: '',
      activo: true,
      discapacidad: false,
      telefono: '',
      descripcion: '',
      sueldo_base: '',
      monto_pensiones: '',
      propinas_promedio_12m: '',
      otros_descuentos_legales: '',
      total_ingresos: '',
      total_descuentos_legales: '',
      total_haberes: '',
      descuento_prestamo: '',
      descuento_sindicato: ''
    });
  }, []);

  // Manejadores de diálogos ACTUALIZADO
  const handleCloseDialogs = useCallback(() => {
    setOpenForm(false);
    setOpenDelete(false);
    setOpenDeleteMultiple(false);
    setOpenRazonSocialMasiva(false);
    setOpenDetalles(false);
    setSelectedEmpleado(null);
    setRazonSocialSeleccionada('');
    resetFormData();
    setFormErrors({});
  }, [resetFormData]);

  const handleOpenNew = useCallback(() => {
    console.log('➕ Abriendo formulario para nuevo empleado');
    setSelectedEmpleado(null);
    resetFormData();
    setFormErrors({});
    setOpenForm(true);
  }, [resetFormData]);

  const handleOpenEdit = useCallback(async (empleado) => {
    try {
      setSelectedEmpleado(empleado);
      setLoading(true);

      console.log('✏️ Abriendo formulario para editar empleado:', empleado.id);

      const response = await empleadosAPI.obtenerEmpleadoPorId(empleado.id);
      
      if (!response.data || !response.data.success) {
        throw new Error('Respuesta inválida del servidor');
      }
      
      const empleadoCompleto = response.data.empleado;
      const rutFormateado = empleadoCompleto.rut ? formatearRut(empleadoCompleto.rut) : '';
      
      const sucursalesDelEmpleado = await fetchEmpleadoSucursales(empleado.id);
      const sucursalesIds = sucursalesDelEmpleado.map(s => s.id);
      
      console.log('🏢 Sucursales del empleado cargadas:', sucursalesIds);

      let razonSocialIdString = '';
      if (empleadoCompleto.id_razon_social) {
        razonSocialIdString = empleadoCompleto.id_razon_social.toString();
      }

      setFormData({
        rut: rutFormateado,
        nombre: empleadoCompleto.nombre || '',
        apellido: empleadoCompleto.apellido || '',
        sucursales_ids: sucursalesIds,
        id_razon_social: razonSocialIdString,
        id_centro_costo: empleadoCompleto.id_centro_costo ? empleadoCompleto.id_centro_costo.toString() : '',
        id_empresa: empleadoCompleto.id_empresa ? empleadoCompleto.id_empresa.toString() : '',
        id_jefe: empleadoCompleto.id_jefe ? empleadoCompleto.id_jefe.toString() : '',
        codigo_empleado: empleadoCompleto.codigo_empleado || '',
        numero_empleado: empleadoCompleto.numero_empleado || '',
        cargo: empleadoCompleto.cargo || '',
        cargo_descripcion: empleadoCompleto.cargo_descripcion || '',
        direccion: empleadoCompleto.direccion || '',
        nacionalidad: empleadoCompleto.nacionalidad || 'Chilena',
        correo_electronico: empleadoCompleto.correo_electronico || '',
        fecha_nacimiento: empleadoCompleto.fecha_nacimiento ? parseISO(empleadoCompleto.fecha_nacimiento) : null,
        fecha_ingreso: empleadoCompleto.fecha_ingreso ? parseISO(empleadoCompleto.fecha_ingreso) : new Date(),
        fecha_termino: empleadoCompleto.fecha_termino ? parseISO(empleadoCompleto.fecha_termino) : null,
        estado_civil: empleadoCompleto.estado_civil || '',
        activo: empleadoCompleto.activo !== undefined ? empleadoCompleto.activo : true,
        discapacidad: empleadoCompleto.discapacidad || false,
        telefono: empleadoCompleto.telefono || '',
        descripcion: empleadoCompleto.descripcion || '',
        sueldo_base: empleadoCompleto.sueldo_base || '',
        monto_pensiones: empleadoCompleto.monto_pensiones || '',
        propinas_promedio_12m: empleadoCompleto.propinas_promedio_12m || '',
        otros_descuentos_legales: empleadoCompleto.otros_descuentos_legales || '',
        total_ingresos: empleadoCompleto.total_ingresos || '',
        total_descuentos_legales: empleadoCompleto.total_descuentos_legales || '',
        total_haberes: empleadoCompleto.total_haberes || '',
        descuento_prestamo: empleadoCompleto.descuento_prestamo || '',
        descuento_sindicato: empleadoCompleto.descuento_sindicato || ''
      });
      
      setFormErrors({});
      setOpenForm(true);
      
    } catch (error) {
      console.error('❌ Error al obtener detalles del empleado:', error);
      
      let errorMessage = 'Error al cargar los detalles del empleado';
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = 'Empleado no encontrado';
        } else if (error.response.status === 500) {
          errorMessage = 'Error interno del servidor';
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      }
      
      showSnackbar(errorMessage, 'error');
      
      // Fallback: abrir formulario con datos básicos
      setFormData({
        rut: empleado.rut ? formatearRut(empleado.rut) : '',
        nombre: empleado.nombre || '',
        apellido: empleado.apellido || '',
        sucursales_ids: [],
        id_razon_social: empleado.id_razon_social ? empleado.id_razon_social.toString() : '',
        id_centro_costo: empleado.id_centro_costo ? empleado.id_centro_costo.toString() : '',
        id_empresa: empleado.id_empresa ? empleado.id_empresa.toString() : '',
        id_jefe: empleado.id_jefe ? empleado.id_jefe.toString() : '',
        codigo_empleado: empleado.codigo_empleado || '',
        numero_empleado: empleado.numero_empleado || '',
        cargo: empleado.cargo || '',
        cargo_descripcion: empleado.cargo_descripcion || '',
        direccion: empleado.direccion || '',
        nacionalidad: empleado.nacionalidad || 'Chilena',
        correo_electronico: empleado.correo_electronico || '',
        fecha_nacimiento: empleado.fecha_nacimiento ? parseISO(empleado.fecha_nacimiento) : null,
        fecha_ingreso: empleado.fecha_ingreso ? parseISO(empleado.fecha_ingreso) : new Date(),
        fecha_termino: empleado.fecha_termino ? parseISO(empleado.fecha_termino) : null,
        estado_civil: empleado.estado_civil || '',
        activo: empleado.activo !== undefined ? empleado.activo : true,
        discapacidad: empleado.discapacidad || false,
        telefono: empleado.telefono || '',
        descripcion: empleado.descripcion || '',
        sueldo_base: empleado.sueldo_base || '',
        monto_pensiones: empleado.monto_pensiones || '',
        propinas_promedio_12m: empleado.propinas_promedio_12m || '',
        otros_descuentos_legales: empleado.otros_descuentos_legales || '',
        total_ingresos: empleado.total_ingresos || '',
        total_descuentos_legales: empleado.total_descuentos_legales || '',
        total_haberes: empleado.total_haberes || '',
        descuento_prestamo: empleado.descuento_prestamo || '',
        descuento_sindicato: empleado.descuento_sindicato || ''
      });
      setFormErrors({});
      setOpenForm(true);
    } finally {
      setLoading(false);
    }
  }, [fetchEmpleadoSucursales, showSnackbar]);

  const handleOpenDetalles = useCallback(async (empleado) => {
    try {
      setSelectedEmpleado(empleado);
      setLoading(true);

      console.log('👁️ Abriendo detalles del empleado:', empleado.id);

      const sucursalesDelEmpleado = await fetchEmpleadoSucursales(empleado.id);
      
      setSelectedEmpleado({
        ...empleado,
        sucursales_detalle: sucursalesDelEmpleado
      });
      
      setOpenDetalles(true);
      
    } catch (error) {
      console.error('❌ Error al abrir detalles:', error);
      setSelectedEmpleado(empleado);
      setOpenDetalles(true);
    } finally {
      setLoading(false);
    }
  }, [fetchEmpleadoSucursales]);

  const handleOpenDelete = useCallback((empleado) => {
    console.log('🗑️ Abriendo confirmación de eliminación para:', empleado.id);
    setSelectedEmpleado(empleado);
    setOpenDelete(true);
  }, []);

  // Función para guardar empleado
  const handleSaveEmpleado = useCallback(async () => {
    if (!validateForm()) {
      showSnackbar('Por favor complete correctamente todos los campos obligatorios', 'error');
      return;
    }

    if (!formData.rut || !formData.nombre || !formData.apellido) {
      showSnackbar('Por favor complete los campos obligatorios', 'error');
      return;
    }

    try {
      setLoading(true);
      
      const empleadoData = {
        ...formData,
        fecha_nacimiento: formData.fecha_nacimiento ? formatDateForBackend(formData.fecha_nacimiento) : null,
        fecha_ingreso: formData.fecha_ingreso ? formatDateForBackend(formData.fecha_ingreso) : null,
        fecha_termino: formData.fecha_termino ? formatDateForBackend(formData.fecha_termino) : null,
        sucursales_ids: formData.sucursales_ids || []
      };

      console.log('🔧 Datos enviados al backend:', empleadoData);

      let response;
      if (selectedEmpleado) {
        console.log(`✏️ Actualizando empleado ${selectedEmpleado.id}`);
        response = await empleadosAPI.actualizarEmpleado(selectedEmpleado.id, empleadoData);
      } else {
        console.log('➕ Creando nuevo empleado');
        response = await empleadosAPI.crearEmpleado(empleadoData);
      }

      if (response.data && response.data.success) {
        showSnackbar(
          `Empleado ${selectedEmpleado ? 'actualizado' : 'creado'} exitosamente`, 
          'success'
        );
        await fetchEmpleados();
        handleCloseDialogs();
      } else {
        throw new Error(response.data?.message || 'Error desconocido');
      }
    } catch (error) {
      console.error('❌ Error al guardar empleado:', error);
      
      let errorMessage = 'Error al guardar el empleado';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [formData, selectedEmpleado, validateForm, fetchEmpleados, handleCloseDialogs, showSnackbar]);

  const handleDeleteEmpleado = useCallback(async () => {
    if (!selectedEmpleado) return;
    
    try {
      setLoading(true);
      console.log(`🗑️ Eliminando empleado ${selectedEmpleado.id}`);
      
      await empleadosAPI.eliminarEmpleado(selectedEmpleado.id);
      
      await fetchEmpleados();
      showSnackbar(
        `Empleado ${selectedEmpleado.nombre} ${selectedEmpleado.apellido} eliminado permanentemente`, 
        'success'
      );
      handleCloseDialogs();
    } catch (err) {
      console.error('❌ Error al eliminar empleado:', err);
      
      let errorMessage = 'Error al eliminar el empleado';
      
      if (err.response?.data?.error === 'FOREIGN_KEY_CONSTRAINT') {
        errorMessage = 'No se puede eliminar el empleado porque tiene registros relacionados en otras tablas.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedEmpleado, fetchEmpleados, handleCloseDialogs, showSnackbar]);

  // Funciones auxiliares
  const getSucursalesNombres = useCallback((empleado) => {
    if (!empleado) return 'Sin datos';
    
    if (empleado.sucursales_detalle && Array.isArray(empleado.sucursales_detalle) && empleado.sucursales_detalle.length > 0) {
      return empleado.sucursales_detalle.map(s => s.nombre || `Sucursal ${s.id}`).join(', ');
    }
    
    if (empleado.sucursales_nombres && empleado.sucursales_nombres.trim()) {
      return empleado.sucursales_nombres;
    }
    
    if (empleado.sucursales && Array.isArray(empleado.sucursales) && empleado.sucursales.length > 0) {
      return empleado.sucursales.map(s => s.nombre || `Sucursal ${s.id}`).join(', ');
    }
    
    if (empleado.id_sucursal && empleado.id_sucursal > 0) {
      const sucursal = sucursales.find(s => s.id === empleado.id_sucursal);
      return sucursal ? sucursal.nombre : `Sucursal ${empleado.id_sucursal}`;
    }
    
    return 'Sin asignar';
  }, [sucursales]);

  const getRazonSocialNombre = useCallback((empleado) => {
    if (!empleado || !empleado.id_razon_social) return 'Sin razón social';
    
    const razonSocial = razonesSociales.find(rs => rs.id === empleado.id_razon_social);
    return razonSocial ? razonSocial.nombre_razon : `Razón Social ${empleado.id_razon_social}`;
  }, [razonesSociales]);

  const renderSucursalesDetalles = useCallback((empleado) => {
    if (!empleado) return 'Sin datos';
    
    if (empleado.sucursales_detalle && Array.isArray(empleado.sucursales_detalle)) {
      if (empleado.sucursales_detalle.length === 0) {
        return <Typography variant="body2" color="text.secondary">Sin sucursales asignadas</Typography>;
      }
      
      return empleado.sucursales_detalle.map(sucursal => (
        <Chip 
          key={sucursal.id}
          label={sucursal.nombre || `Sucursal ${sucursal.id}`}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ mr: 1, mb: 1 }}
        />
      ));
    }
    
    const nombres = getSucursalesNombres(empleado);
    if (nombres === 'Sin asignar') {
      return <Typography variant="body2" color="text.secondary">Sin sucursales asignadas</Typography>;
    }
    
    return nombres.split(',').map((nombre, index) => (
      <Chip 
        key={index}
        label={nombre.trim()}
        size="small"
        color="primary"
        variant="outlined"
        sx={{ mr: 1, mb: 1 }}
      />
    ));
  }, [getSucursalesNombres]);

  const formatDateForDisplay = useCallback((dateString) => {
    if (!dateString) return 'No especificada';
    
    try {
      const date = parseISO(dateString);
      return format(date, 'dd/MM/yyyy');
    } catch (error) {
      return dateString;
    }
  }, []);

  const renderValidationIcon = useCallback((fieldName) => {
    const error = formErrors[fieldName];
    const value = formData[fieldName];
    
    if (!value) return null;
    
    if (error) {
      return (
        <InputAdornment position="end">
          <Tooltip title={error}>
            <ErrorIcon color="error" fontSize="small" />
          </Tooltip>
        </InputAdornment>
      );
    } else if (fieldName === 'rut' || fieldName === 'id_razon_social' || 
               fieldName === 'nombre' || fieldName === 'apellido') {
      return (
        <InputAdornment position="end">
          <Tooltip title="Correcto">
            <CheckCircleIcon color="success" fontSize="small" />
          </Tooltip>
        </InputAdornment>
      );
    }
    
    return null;
  }, [formErrors, formData]);

  // Utilidades de paginación
  const handleChangePage = useCallback((event, newPage) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // RENDER PRINCIPAL
  return (
    <Box sx={{ p: 3 }}>
      {/* Título y botones principales */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', color: '#333' }}>
          Gestión de Empleados
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {/* BOTONES DE OPERACIONES MASIVAS */}
          {selectedEmpleados.length > 0 && (
            <>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<BusinessIcon />}
                onClick={handleOpenRazonSocialMasiva}
                disabled={loading}
              >
                Asignar Razón Social ({selectedEmpleados.length})
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteSweepIcon />}
                onClick={handleOpenDeleteMultiple}
                disabled={loading}
              >
                Eliminar Seleccionados ({selectedEmpleados.length})
              </Button>
            </>
          )}
          {/* BOTONES NORMALES */}
          <Button
            variant="outlined"
            color="primary"
            startIcon={<CloudUploadIcon />}
            onClick={handleOpenImportDialog}
            disabled={loading}
          >
            Importar Excel
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenNew}
            disabled={loading}
            sx={{ backgroundColor: '#f37d16', '&:hover': { backgroundColor: '#e06c00' } }}
          >
            Nuevo Empleado
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
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
                fetchEmpleados();
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

      {/* Barra de búsqueda y filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Buscar empleados"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                endAdornment: (
                  <IconButton size="small" onClick={handleSearch} disabled={loading}>
                    {loading ? <CircularProgress size={20} /> : <SearchIcon />}
                  </IconButton>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Filtrar por Razón Social</InputLabel>
              <Select
                value={razonSocialFilter}
                onChange={(e) => setRazonSocialFilter(e.target.value)}
                label="Filtrar por Razón Social"
              >
                <MenuItem value="todas">
                  <Typography fontWeight="bold">Todas las Razones Sociales</Typography>
                </MenuItem>
                {/* 🆕 OPCIÓN PARA EMPLEADOS SIN RAZÓN SOCIAL */}
                <MenuItem value="sin_asignar">
                  <Typography fontWeight="bold" color="warning.main">
                    Sin Razón Social Asignada
                  </Typography>
                </MenuItem>
                {razonesSociales.map((razonSocial) => (
                  <MenuItem key={razonSocial.id} value={razonSocial.id}>
                    {razonSocial.nombre_razon}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item>
            <FormControlLabel
              control={
                <Switch
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  color="primary"
                  size="small"
                />
              }
              label="Inactivos"
            />
          </Grid>
          <Grid item>
            <FormControlLabel
              control={
                <Switch
                  checked={showDiscapacidad}
                  onChange={(e) => setShowDiscapacidad(e.target.checked)}
                  color="primary"
                  size="small"
                />
              }
              label="Discapacidad"
            />
          </Grid>
          <Grid item>
            <Tooltip title="Actualizar">
              <IconButton 
                onClick={() => {
                  console.log('🔄 Recargando empleados...');
                  fetchEmpleados();
                }} 
                color="primary" 
                size="small"
                disabled={loading}
              >
                {loading ? (
                  <CircularProgress size={20} />
                ) : (
                  <RefreshIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </Grid>
        </Grid>
      </Paper>

      {/* Estadísticas rápidas */}
      {filteredEmpleados.length > 0 && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#f8f9fa' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Typography variant="body2" color="text.secondary">
                <strong>Total:</strong> {filteredEmpleados.length} empleados
              </Typography>
            </Grid>
            <Grid item>
              <Typography variant="body2" color="success.main">
                <strong>Activos:</strong> {filteredEmpleados.filter(e => e.activo).length}
              </Typography>
            </Grid>
            <Grid item>
              <Typography variant="body2" color="warning.main">
                <strong>Inactivos:</strong> {filteredEmpleados.filter(e => !e.activo).length}
              </Typography>
            </Grid>
            <Grid item>
              <Typography variant="body2" color="info.main">
                <strong>Con discapacidad:</strong> {filteredEmpleados.filter(e => e.discapacidad).length}
              </Typography>
            </Grid>
            {/* 🆕 ESTADÍSTICA DE EMPLEADOS SIN RAZÓN SOCIAL */}
            <Grid item>
              <Typography variant="body2" color="error.main">
                <strong>Sin razón social:</strong> {filteredEmpleados.filter(e => !e.id_razon_social || e.id_razon_social === 0).length}
              </Typography>
            </Grid>
            {/* ESTADÍSTICA DE SELECCIÓN */}
            {selectedEmpleados.length > 0 && (
              <Grid item>
                <Typography variant="body2" color="primary.main">
                  <strong>Seleccionados:</strong> {selectedEmpleados.length}
                </Typography>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      {/* Tabla de empleados CON CHECKBOXES */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                {/* COLUMNA DE SELECCIÓN */}
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem', padding: '8px', width: '50px' }}>
                  <Tooltip title="Seleccionar todos en esta página">
                    <Checkbox
                      checked={selectAll}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      indeterminate={selectedEmpleados.length > 0 && !selectAll}
                      size="small"
                      disabled={loading || paginatedEmpleados.length === 0}
                    />
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem', padding: '8px' }}>RUT</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem', padding: '8px' }}>Código</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem', padding: '8px' }}>Nombre</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem', padding: '8px' }}>Apellido</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem', padding: '8px' }}>Razón Social</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem', padding: '8px' }}>Sucursales</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem', padding: '8px' }}>Cargo</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem', padding: '8px' }}>Sueldo Base</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem', padding: '8px' }}>Fecha Ingreso</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem', padding: '8px' }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem', padding: '8px' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && !paginatedEmpleados.length ? (
                <TableRow>
                  <TableCell colSpan={12} align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
                      <CircularProgress size={30} sx={{ mr: 2 }} />
                      <Typography>Cargando empleados...</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ color: 'error.main' }}>
                    <Box sx={{ p: 3 }}>
                      <ErrorIcon sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="h6">{error}</Typography>
                      <Button 
                        variant="outlined" 
                        onClick={fetchEmpleados} 
                        sx={{ mt: 2 }}
                        startIcon={<RefreshIcon />}
                      >
                        Reintentar
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : !paginatedEmpleados.length ? (
                <TableRow>
                  <TableCell colSpan={12} align="center">
                    <Box sx={{ p: 3 }}>
                      <Typography variant="h6" color="text.secondary">
                        No hay empleados para mostrar
                      </Typography>
                      {searchTerm && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          No se encontraron empleados que coincidan con "{searchTerm}"
                        </Typography>
                      )}
                      <Button 
                        variant="contained" 
                        onClick={handleOpenNew} 
                        sx={{ 
                          mt: 2, 
                          backgroundColor: '#f37d16', 
                          '&:hover': { backgroundColor: '#e06c00' } 
                        }}
                        startIcon={<AddIcon />}
                      >
                        Crear primer empleado
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEmpleados.map((empleado) => (
                  <TableRow 
                    key={empleado.id} 
                    hover
                    sx={{ 
                      backgroundColor: !empleado.activo ? 'rgba(0, 0, 0, 0.04)' : 
                                      isEmpleadoSelected(empleado.id) ? 'rgba(243, 125, 22, 0.1)' : 'inherit',
                      opacity: !empleado.activo ? 0.7 : 1,
                      "&:hover": {
                        backgroundColor: isEmpleadoSelected(empleado.id) ? 'rgba(243, 125, 22, 0.2)' : 'rgba(243, 125, 22, 0.1)'
                      }
                    }}
                  >
                    {/* CELDA CON CHECKBOX */}
                    <TableCell sx={{ padding: '4px 8px' }}>
                      <Checkbox
                        checked={isEmpleadoSelected(empleado.id)}
                        onChange={(e) => handleSelectEmpleado(empleado.id, e.target.checked)}
                        size="small"
                        disabled={loading}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', padding: '4px 8px' }}>
                      <Link
                        component="button"
                        variant="body2"
                        onClick={() => handleOpenDetalles(empleado)}
                        sx={{ 
                          color: '#f37d16', 
                          fontWeight: 'bold',
                          textDecoration: 'none',
                          '&:hover': { 
                            textDecoration: 'underline',
                            cursor: 'pointer'
                          }
                        }}
                      >
                        {formatearRut(empleado.rut) || ''}
                      </Link>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', padding: '4px 8px' }}>
                      {empleado.codigo_empleado || empleado.numero_empleado || '-'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', padding: '4px 8px' }}>{empleado.nombre || ''}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', padding: '4px 8px' }}>{empleado.apellido || ''}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', padding: '4px 8px' }}>
                      {/* 🔧 MOSTRAR INDICADOR VISUAL PARA EMPLEADOS SIN RAZÓN SOCIAL */}
                      {!empleado.id_razon_social || empleado.id_razon_social === 0 ? (
                        <Chip 
                          label="Sin asignar" 
                          size="small" 
                          color="error" 
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ) : (
                        empleado.nombre_razon || getRazonSocialNombre(empleado)
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', padding: '4px 8px', maxWidth: '150px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {getSucursalesNombres(empleado)}
                      </div>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', padding: '4px 8px' }}>{empleado.cargo || ''}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', padding: '4px 8px' }}>
                      {empleado.sueldo_base ? 
                        new Intl.NumberFormat('es-CL', { 
                          style: 'currency', 
                          currency: 'CLP' 
                        }).format(empleado.sueldo_base) : '-'
                      }
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', padding: '4px 8px' }}>
                      {formatDateForDisplay(empleado.fecha_ingreso)}
                    </TableCell>
                    <TableCell sx={{ padding: '4px 8px' }}>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <Chip 
                          label={empleado.activo ? 'Activo' : 'Inactivo'} 
                          color={empleado.activo ? 'success' : 'default'}
                          size="small"
                          sx={{ fontSize: '0.7rem', height: '20px' }}
                        />
                        {empleado.discapacidad && (
                          <Chip 
                            label="Discapacidad" 
                            color="info"
                            size="small"
                            sx={{ fontSize: '0.7rem', height: '20px' }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ padding: '4px 8px' }}>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Editar">
                          <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={() => handleOpenEdit(empleado)}
                            sx={{ padding: '2px' }}
                            disabled={loading}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar permanentemente">
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleOpenDelete(empleado)}
                            sx={{ padding: '2px' }}
                            disabled={loading}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredEmpleados.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </Paper>

      {/* DIÁLOGO DE ASIGNACIÓN MASIVA DE RAZÓN SOCIAL */}
      <Dialog
        open={openRazonSocialMasiva}
        onClose={handleCloseDialogs}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', color: 'primary.main' }}>
          <BusinessIcon sx={{ mr: 1 }} />
          Asignar Razón Social Masivamente
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              Asignación masiva de razón social
            </Typography>
            <Typography variant="body2">
              Se asignará la razón social seleccionada a los {selectedEmpleados.length} empleados seleccionados.
            </Typography>
          </Alert>
          
          <DialogContentText sx={{ mb: 2 }}>
            Empleados seleccionados: {selectedEmpleados.length}
          </DialogContentText>
          
          <Box sx={{ maxHeight: 200, overflow: 'auto', mb: 2 }}>
            {selectedEmpleados.slice(0, 10).map(empleadoId => {
              const empleado = empleados.find(e => e.id === empleadoId);
              return empleado ? (
                <Typography key={empleadoId} variant="body2" sx={{ mb: 1 }}>
                  • {empleado.nombre} {empleado.apellido} ({formatearRut(empleado.rut)})
                </Typography>
              ) : null;
            })}
            {selectedEmpleados.length > 10 && (
              <Typography variant="body2" color="text.secondary">
                ... y {selectedEmpleados.length - 10} más
              </Typography>
            )}
          </Box>
          
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Razón Social</InputLabel>
            <Select
              value={razonSocialSeleccionada}
              onChange={(e) => setRazonSocialSeleccionada(e.target.value)}
              label="Razón Social"
              disabled={loading}
            >
              <MenuItem value="">
                <em>Seleccione una razón social</em>
              </MenuItem>
              {razonesSociales.map((razonSocial) => (
                <MenuItem key={razonSocial.id} value={razonSocial.id.toString()}>
                  {razonSocial.nombre_razon}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              Esta razón social se asignará a todos los empleados seleccionados
            </FormHelperText>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={handleCloseDialogs} 
            color="primary" 
            variant="outlined"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleUpdateRazonSocialMasiva} 
            color="primary" 
            variant="contained"
            disabled={loading || !razonSocialSeleccionada}
            startIcon={loading ? <CircularProgress size={16} /> : <BusinessIcon />}
            sx={{ backgroundColor: '#f37d16', '&:hover': { backgroundColor: '#e06c00' } }}
          >
            {loading ? 'Asignando...' : `Asignar a ${selectedEmpleados.length} Empleados`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIÁLOGO DE CONFIRMACIÓN PARA ELIMINACIÓN MÚLTIPLE */}
      <Dialog
        open={openDeleteMultiple}
        onClose={handleCloseDialogs}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
          <WarningIcon sx={{ mr: 1 }} />
          Confirmar Eliminación Múltiple
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              ¡ATENCIÓN! Esta acción es IRREVERSIBLE
            </Typography>
          </Alert>
          <DialogContentText sx={{ mb: 2 }}>
            Está a punto de eliminar permanentemente {selectedEmpleados.length} empleado{selectedEmpleados.length > 1 ? 's' : ''}:
          </DialogContentText>
          <Box sx={{ maxHeight: 200, overflow: 'auto', mb: 2 }}>
            {selectedEmpleados.slice(0, 10).map(empleadoId => {
              const empleado = empleados.find(e => e.id === empleadoId);
              return empleado ? (
                <Typography key={empleadoId} variant="body2" sx={{ mb: 1 }}>
                  • {empleado.nombre} {empleado.apellido} ({formatearRut(empleado.rut)})
                </Typography>
              ) : null;
            })}
            {selectedEmpleados.length > 10 && (
              <Typography variant="body2" color="text.secondary">
                ... y {selectedEmpleados.length - 10} más
              </Typography>
            )}
          </Box>
          <DialogContentText>
            Los empleados serán eliminados permanentemente de la base de datos. 
            Esta acción <strong>NO SE PUEDE DESHACER</strong>.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={handleCloseDialogs} 
            color="primary" 
            variant="outlined"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleDeleteSelectedEmpleados} 
            color="error" 
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <DeleteSweepIcon />}
          >
            {loading ? 'Eliminando...' : `Eliminar ${selectedEmpleados.length} Empleados`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Formulario de empleado (crear/editar) - COMPLETO */}
      <Dialog open={openForm} onClose={handleCloseDialogs} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ backgroundColor: '#f37d16', color: 'white' }}>
          {selectedEmpleado ? 'Editar Empleado' : 'Nuevo Empleado'}
          <IconButton
            aria-label="close"
            onClick={handleCloseDialogs}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'white',
            }}
            disabled={loading}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              {/* RUT del empleado */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  required
                  label="RUT"
                  name="rut"
                  value={formData.rut}
                  onChange={handleInputChange}
                  margin="normal"
                  variant="outlined"
                  size="small"
                  error={!!formErrors.rut}
                  helperText={formErrors.rut || "Formato: 12.345.678-9"}
                  InputProps={{
                    endAdornment: renderValidationIcon('rut')
                  }}
                  disabled={loading}
                />
              </Grid>
              
              {/* Nombre */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  required
                  label="Nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  margin="normal"
                  variant="outlined"
                  size="small"
                  error={!!formErrors.nombre}
                  helperText={formErrors.nombre || "Máximo 100 caracteres"}
                  InputProps={{
                    endAdornment: renderValidationIcon('nombre')
                  }}
                  disabled={loading}
                />
              </Grid>
              
              {/* Apellido */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  required
                  label="Apellido"
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleInputChange}
                  margin="normal"
                  variant="outlined"
                  size="small"
                  error={!!formErrors.apellido}
                  helperText={formErrors.apellido || "Máximo 100 caracteres"}
                  InputProps={{
                    endAdornment: renderValidationIcon('apellido')
                  }}
                  disabled={loading}
                />
              </Grid>
              
              {/* Razón Social */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl 
                  fullWidth 
                  margin="normal" 
                  size="small" 
                  required
                  error={!!formErrors.id_razon_social}
                  disabled={loading}
                >
                  <InputLabel>Razón Social</InputLabel>
                  <Select
                    name="id_razon_social"
                    value={formData.id_razon_social}
                    onChange={handleInputChange}
                    label="Razón Social"
                  >
                    <MenuItem value="">
                      <em>Seleccione una razón social</em>
                    </MenuItem>
                    {razonesSociales.map((razonSocial) => (
                      <MenuItem key={razonSocial.id} value={razonSocial.id.toString()}>
                        {razonSocial.nombre_razon}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {formErrors.id_razon_social || "Seleccione la empresa a la que pertenece"}
                  </FormHelperText>
                </FormControl>
              </Grid>
              
              {/* Sucursales (múltiple selección) */}
              <Grid item xs={12} sm={6} md={4}>
                <Autocomplete
                  multiple
                  size="small"
                  options={sucursales}
                  getOptionLabel={(option) => option.nombre || `Sucursal ${option.id}`}
                  value={sucursales.filter(s => formData.sucursales_ids && formData.sucursales_ids.includes(s.id))}
                  onChange={handleSucursalesChange}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  disabled={loading}
                  renderOption={(props, option, { selected }) => {
                    const { key, ...otherProps } = props;
                    return (
                      <li key={key || option.id} {...otherProps}>
                        <Checkbox
                          style={{ marginRight: 8 }}
                          checked={selected}
                        />
                        <ListItemText primary={option.nombre || `Sucursal ${option.id}`} />
                      </li>
                    );
                  }}
                  renderTags={(tagValue, getTagProps) => {
                    return tagValue.map((option, index) => {
                      const { key, ...tagProps } = getTagProps({ index });
                      return (
                        <Chip
                          key={key || `${option.id}-${index}`}
                          label={option.nombre || `Sucursal ${option.id}`}
                          {...tagProps}
                        />
                      );
                    });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Sucursales"
                      margin="normal"
                      helperText="Seleccione las sucursales donde trabajará"
                    />
                  )}
                />
              </Grid>

              {/* Código Empleado */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Código Empleado"
                  name="codigo_empleado"
                  value={formData.codigo_empleado}
                  onChange={handleInputChange}
                  margin="normal"
                  variant="outlined"
                  size="small"
                  helperText="Código único del empleado"
                  disabled={loading}
                />
              </Grid>

              {/* Número Empleado */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Número Empleado"
                  name="numero_empleado"
                  value={formData.numero_empleado}
                  onChange={handleInputChange}
                  margin="normal"
                  variant="outlined"
                  size="small"
                  helperText="Número de identificación interno"
                  disabled={loading}
                />
              </Grid>

              {/* Centro de Costo */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth margin="normal" size="small" disabled={loading}>
                  <InputLabel>Centro de Costo</InputLabel>
                  <Select
                    name="id_centro_costo"
                    value={formData.id_centro_costo}
                    onChange={handleInputChange}
                    label="Centro de Costo"
                  >
                    <MenuItem value="">
                      <em>Seleccione centro de costo</em>
                    </MenuItem>
                    {centrosCostos.map((centro) => (
                      <MenuItem key={centro.id} value={centro.id.toString()}>
                        {centro.nombre || centro.descripcion || `Centro ${centro.id}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Empresa */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth margin="normal" size="small" disabled={loading}>
                  <InputLabel>Empresa</InputLabel>
                  <Select
                    name="id_empresa"
                    value={formData.id_empresa}
                    onChange={handleInputChange}
                    label="Empresa"
                  >
                    <MenuItem value="">
                      <em>Seleccione empresa</em>
                    </MenuItem>
                    {empresas.map((empresa) => (
                      <MenuItem key={empresa.id} value={empresa.id.toString()}>
                        {empresa.nombre || empresa.razon_social || `Empresa ${empresa.id}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Jefe */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth margin="normal" size="small" disabled={loading}>
                  <InputLabel>Jefe Directo</InputLabel>
                  <Select
                    name="id_jefe"
                    value={formData.id_jefe}
                    onChange={handleInputChange}
                    label="Jefe Directo"
                  >
                    <MenuItem value="">
                      <em>Sin jefe asignado</em>
                    </MenuItem>
                    {jefes.map((jefe) => (
                      <MenuItem key={jefe.id} value={jefe.id.toString()}>
                        {`${jefe.nombre} ${jefe.apellido}` || `Empleado ${jefe.id}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Teléfono */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Teléfono"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  margin="normal"
                  variant="outlined"
                  size="small"
                  helperText="Número de teléfono de contacto"
                  disabled={loading}
                />
              </Grid>
              
              {/* Cargo */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Cargo"
                  name="cargo"
                  value={formData.cargo}
                  onChange={handleInputChange}
                  margin="normal"
                  variant="outlined"
                  size="small"
                  helperText="Máximo 100 caracteres"
                  disabled={loading}
                />
              </Grid>

              {/* Descripción del Cargo */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Descripción del Cargo"
                  name="cargo_descripcion"
                  value={formData.cargo_descripcion}
                  onChange={handleInputChange}
                  margin="normal"
                  variant="outlined"
                  size="small"
                  multiline
                  rows={2}
                  helperText="Descripción detallada del cargo"
                  disabled={loading}
                />
              </Grid>
              
              {/* Dirección */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Dirección"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleInputChange}
                  margin="normal"
                  variant="outlined"
                  size="small"
                  helperText="Máximo 255 caracteres"
                  disabled={loading}
                />
              </Grid>
              
              {/* Nacionalidad */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth margin="normal" size="small" disabled={loading}>
                  <InputLabel>Nacionalidad</InputLabel>
                  <Select
                    name="nacionalidad"
                    value={formData.nacionalidad}
                    onChange={handleInputChange}
                    label="Nacionalidad"
                  >
                    {nacionalidadesComunes.map((nacionalidad) => (
                      <MenuItem key={nacionalidad} value={nacionalidad}>
                        {nacionalidad}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Correo Electrónico */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Correo Electrónico"
                  name="correo_electronico"
                  type="email"
                  value={formData.correo_electronico}
                  onChange={handleInputChange}
                  margin="normal"
                  variant="outlined"
                  size="small"
                  error={!!formErrors.correo_electronico}
                  helperText={formErrors.correo_electronico || "ejemplo@dominio.com"}
                  InputProps={{
                    endAdornment: renderValidationIcon('correo_electronico')
                  }}
                  disabled={loading}
                />
              </Grid>
              
              {/* Fecha de Nacimiento */}
              <Grid item xs={12} sm={6} md={4}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                  <DatePicker
                    label="Fecha de Nacimiento"
                    value={formData.fecha_nacimiento}
                    onChange={(date) => handleDateChange('fecha_nacimiento', date)}
                    disabled={loading}
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        fullWidth 
                        margin="normal" 
                        size="small"
                        helperText="DD/MM/AAAA"
                      />
                    )}
                  />
                </LocalizationProvider>
              </Grid>
              
              {/* Fecha de Ingreso */}
              <Grid item xs={12} sm={6} md={4}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                  <DatePicker
                    label="Fecha de Ingreso"
                    value={formData.fecha_ingreso}
                    onChange={(date) => handleDateChange('fecha_ingreso', date)}
                    disabled={loading}
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        fullWidth 
                        margin="normal" 
                        size="small"
                        helperText="DD/MM/AAAA"
                      />
                    )}
                  />
                </LocalizationProvider>
              </Grid>

              {/* Fecha de Término */}
              <Grid item xs={12} sm={6} md={4}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                  <DatePicker
                    label="Fecha de Término"
                    value={formData.fecha_termino}
                    onChange={(date) => handleDateChange('fecha_termino', date)}
                    disabled={loading}
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        fullWidth 
                        margin="normal" 
                        size="small"
                        helperText="DD/MM/AAAA (opcional)"
                      />
                    )}
                  />
                </LocalizationProvider>
              </Grid>

              {/* SECCIÓN REMUNERACIONES */}
              <Grid item xs={12}>
                <Box sx={{ 
                  borderTop: '2px solid #f37d16', 
                  paddingTop: 2,
                  marginTop: 2,
                  marginBottom: 1
                }}>
                  <Typography variant="h6" sx={{ color: '#f37d16', fontWeight: 'bold' }}>
                    Información de Remuneraciones
                  </Typography>
                </Box>
              </Grid>

              {/* Sueldo Base */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Sueldo Base"
                  name="sueldo_base"
                  type="number"
                  value={formData.sueldo_base}
                  onChange={handleInputChange}
                  margin="normal"
                  variant="outlined"
                  size="small"
                  helperText="Sueldo base en CLP"
                  disabled={loading}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>

              {/* Monto Pensiones */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Monto Pensiones"
                  name="monto_pensiones"
                  type="number"
                  value={formData.monto_pensiones}
                  onChange={handleInputChange}
                  margin="normal"
                  variant="outlined"
                  size="small"
                  helperText="Descuento de pensiones"
                  disabled={loading}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>

              {/* Propinas Promedio 12 Meses */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Propinas Promedio (12m)"
                  name="propinas_promedio_12m"
                  type="number"
                  value={formData.propinas_promedio_12m}
                  onChange={handleInputChange}
                  margin="normal"
                  variant="outlined"
                  size="small"
                  helperText="Promedio de propinas últimos 12 meses"
                  disabled={loading}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>

              {/* Otros Descuentos Legales */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Otros Descuentos Legales"
                  name="otros_descuentos_legales"
                  type="number"
                  value={formData.otros_descuentos_legales}
                  onChange={handleInputChange}
                  margin="normal"
                  variant="outlined"
                  size="small"
                  helperText="Otros descuentos legales"
                  disabled={loading}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>

              {/* Total Ingresos */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Total Ingresos"
                  name="total_ingresos"
                  type="number"
                  value={formData.total_ingresos}
                  onChange={handleInputChange}
                  margin="normal"
                  variant="outlined"
                  size="small"
                  helperText="Total de ingresos"
                  disabled={loading}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>

              {/* Total Descuentos Legales */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Total Descuentos Legales"
                  name="total_descuentos_legales"
                  type="number"
                  value={formData.total_descuentos_legales}
                  onChange={handleInputChange}
                  margin="normal"
                  variant="outlined"
                  size="small"
                  helperText="Total descuentos legales"
                  disabled={loading}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>

              {/* Total Haberes */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Total Haberes"
                  name="total_haberes"
                  type="number"
                  value={formData.total_haberes}
                  onChange={handleInputChange}
                  margin="normal"
                  variant="outlined"
                  size="small"
                  helperText="Total de haberes"
                  disabled={loading}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>

              {/* Descuento Préstamo */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Descuento Préstamo"
                  name="descuento_prestamo"
                  type="number"
                  value={formData.descuento_prestamo}
                  onChange={handleInputChange}
                  margin="normal"
                  variant="outlined"
                  size="small"
                  helperText="Descuento por préstamo"
                  disabled={loading}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>

              {/* Descuento Sindicato */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Descuento Sindicato"
                  name="descuento_sindicato"
                  type="number"
                  value={formData.descuento_sindicato}
                  onChange={handleInputChange}
                  margin="normal"
                  variant="outlined"
                  size="small"
                  helperText="Descuento sindical"
                  disabled={loading}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>

              {/* Descripción */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descripción/Observaciones"
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  margin="normal"
                  variant="outlined"
                  size="small"
                  multiline
                  rows={3}
                  helperText="Descripción adicional u observaciones"
                  disabled={loading}
                />
              </Grid>
              
              {/* Estado Civil */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth margin="normal" size="small" disabled={loading}>
                  <InputLabel>Estado Civil</InputLabel>
                  <Select
                    name="estado_civil"
                    value={formData.estado_civil}
                    onChange={handleInputChange}
                    label="Estado Civil"
                  >
                    <MenuItem value="">
                      <em>No especificado</em>
                    </MenuItem>
                    {estadosCiviles.map((estado) => (
                      <MenuItem key={estado} value={estado}>
                        {estado}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Empleado Activo */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.activo}
                      onChange={handleSwitchChange}
                      name="activo"
                      color="success"
                      disabled={loading}
                    />
                  }
                  label="Empleado Activo"
                  sx={{ mt: 2 }}
                />
              </Grid>
              
              {/* Persona con Discapacidad */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.discapacidad}
                      onChange={handleSwitchChange}
                      name="discapacidad"
                      color="primary"
                      disabled={loading}
                    />
                  }
                  label="Persona con Discapacidad"
                  sx={{ mt: 2 }}
                />
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Los campos marcados con * son obligatorios.
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={handleCloseDialogs} 
            variant="outlined"
            color="secondary"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveEmpleado} 
            variant="contained" 
            color="primary"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
            sx={{ backgroundColor: '#f37d16', '&:hover': { backgroundColor: '#e06c00' } }}
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de detalles de empleado */}
      <Dialog 
        open={openDetalles} 
        onClose={handleCloseDialogs} 
        maxWidth="md" 
        fullWidth
      >
        {selectedEmpleado && (
          <>
            <DialogTitle sx={{ 
              backgroundColor: '#f37d16', 
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Box component="span" sx={{ fontSize: '1.25rem', fontWeight: 'medium' }}>
                Detalles del Empleado: {selectedEmpleado.nombre} {selectedEmpleado.apellido}
              </Box>
              <IconButton
                onClick={handleCloseDialogs}
                sx={{ color: 'white' }}
                disabled={loading}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Box sx={{ 
                      borderBottom: '2px solid #f37d16', 
                      paddingBottom: 1,
                      color: '#f37d16',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '1.25rem',
                      fontWeight: 'medium',
                      mb: 2
                    }}>
                      <FingerprintIcon fontSize="small" sx={{ mr: 1 }} />
                      Información Personal
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="subtitle2" color="text.secondary">Cargo:</Typography>
                        <Typography variant="body1">
                          {selectedEmpleado.cargo || 'No especificado'}
                        </Typography>
                      </Grid>

                      {selectedEmpleado.cargo_descripcion && (
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" color="text.secondary">Descripción del Cargo:</Typography>
                          <Typography variant="body1">
                            {selectedEmpleado.cargo_descripcion}
                          </Typography>
                        </Grid>
                      )}
                      
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="subtitle2" color="text.secondary">Razón Social:</Typography>
                        <Typography variant="body1">
                          {selectedEmpleado.nombre_razon || getRazonSocialNombre(selectedEmpleado)}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="subtitle2" color="text.secondary">Centro de Costo:</Typography>
                        <Typography variant="body1">
                          {selectedEmpleado.centro_costo_nombre || 'No asignado'}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="subtitle2" color="text.secondary">Empresa:</Typography>
                        <Typography variant="body1">
                          {selectedEmpleado.empresa_nombre || 'No asignada'}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="subtitle2" color="text.secondary">Jefe Directo:</Typography>
                        <Typography variant="body1">
                          {selectedEmpleado.jefe_nombre || 'Sin jefe asignado'}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">Sucursales Asignadas:</Typography>
                        <Box sx={{ mt: 1 }}>
                          {renderSucursalesDetalles(selectedEmpleado)}
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="subtitle2" color="text.secondary">Fecha de Ingreso:</Typography>
                        <Typography variant="body1">
                          {formatDateForDisplay(selectedEmpleado.fecha_ingreso)}
                        </Typography>
                      </Grid>

                      {selectedEmpleado.fecha_termino && (
                        <Grid item xs={12} sm={6} md={4}>
                          <Typography variant="subtitle2" color="text.secondary">Fecha de Término:</Typography>
                          <Typography variant="body1">
                            {formatDateForDisplay(selectedEmpleado.fecha_termino)}
                          </Typography>
                        </Grid>
                      )}
                      
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="subtitle2" color="text.secondary">Estado:</Typography>
                        <Chip 
                          label={selectedEmpleado.activo ? 'Activo' : 'Inactivo'} 
                          color={selectedEmpleado.activo ? 'success' : 'default'}
                          size="small"
                        />
                      </Grid>

                      {/* SECCIÓN REMUNERACIONES EN DETALLES */}
                      {(selectedEmpleado.sueldo_base || selectedEmpleado.total_ingresos || selectedEmpleado.monto_pensiones) && (
                        <>
                          <Grid item xs={12} sx={{ mt: 2 }}>
                            <Box sx={{ 
                              borderTop: '1px solid #e0e0e0', 
                              paddingTop: 2 
                            }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#f37d16' }}>
                                Información Salarial
                              </Typography>
                            </Box>
                          </Grid>

                          {selectedEmpleado.sueldo_base && (
                            <Grid item xs={12} sm={6} md={4}>
                              <Typography variant="subtitle2" color="text.secondary">Sueldo Base:</Typography>
                              <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'green' }}>
                                {new Intl.NumberFormat('es-CL', { 
                                  style: 'currency', 
                                  currency: 'CLP' 
                                }).format(selectedEmpleado.sueldo_base)}
                              </Typography>
                            </Grid>
                          )}

                          {selectedEmpleado.total_ingresos && (
                            <Grid item xs={12} sm={6} md={4}>
                              <Typography variant="subtitle2" color="text.secondary">Total Ingresos:</Typography>
                              <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'green' }}>
                                {new Intl.NumberFormat('es-CL', { 
                                  style: 'currency', 
                                  currency: 'CLP' 
                                }).format(selectedEmpleado.total_ingresos)}
                              </Typography>
                            </Grid>
                          )}

                          {selectedEmpleado.monto_pensiones && (
                            <Grid item xs={12} sm={6} md={4}>
                              <Typography variant="subtitle2" color="text.secondary">Descuento Pensiones:</Typography>
                              <Typography variant="body1" sx={{ color: 'red' }}>
                                {new Intl.NumberFormat('es-CL', { 
                                  style: 'currency', 
                                  currency: 'CLP' 
                                }).format(selectedEmpleado.monto_pensiones)}
                              </Typography>
                            </Grid>
                          )}

                          {selectedEmpleado.propinas_promedio_12m && (
                            <Grid item xs={12} sm={6} md={4}>
                              <Typography variant="subtitle2" color="text.secondary">Propinas Promedio (12m):</Typography>
                              <Typography variant="body1">
                                {new Intl.NumberFormat('es-CL', { 
                                  style: 'currency', 
                                  currency: 'CLP' 
                                }).format(selectedEmpleado.propinas_promedio_12m)}
                              </Typography>
                            </Grid>
                          )}

                          {selectedEmpleado.total_haberes && (
                            <Grid item xs={12} sm={6} md={4}>
                              <Typography variant="subtitle2" color="text.secondary">Total Haberes:</Typography>
                              <Typography variant="body1" sx={{ color: 'green' }}>
                                {new Intl.NumberFormat('es-CL', { 
                                  style: 'currency', 
                                  currency: 'CLP' 
                                }).format(selectedEmpleado.total_haberes)}
                              </Typography>
                            </Grid>
                          )}

                          {selectedEmpleado.total_descuentos_legales && (
                            <Grid item xs={12} sm={6} md={4}>
                              <Typography variant="subtitle2" color="text.secondary">Total Descuentos Legales:</Typography>
                              <Typography variant="body1" sx={{ color: 'red' }}>
                                {new Intl.NumberFormat('es-CL', { 
                                  style: 'currency', 
                                  currency: 'CLP' 
                                }).format(selectedEmpleado.total_descuentos_legales)}
                              </Typography>
                            </Grid>
                          )}
                        </>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button 
                onClick={() => handleOpenEdit(selectedEmpleado)} 
                variant="outlined" 
                color="primary"
                startIcon={<EditIcon />}
                disabled={loading}
              >
                Editar
              </Button>
              <Button 
                onClick={handleCloseDialogs} 
                variant="contained" 
                color="primary"
                sx={{ backgroundColor: '#f37d16', '&:hover': { backgroundColor: '#e06c00' } }}
              >
                Cerrar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Diálogo de confirmación para eliminar */}
      <Dialog
        open={openDelete}
        onClose={handleCloseDialogs}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
          <WarningIcon sx={{ mr: 1 }} />
          Confirmar Eliminación Permanente
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              ¡ATENCIÓN! Esta acción es IRREVERSIBLE
            </Typography>
          </Alert>
          <DialogContentText sx={{ mb: 2 }}>
            Está a punto de eliminar permanentemente al empleado:
          </DialogContentText>
          <Card sx={{ mb: 2, backgroundColor: 'rgba(244, 67, 54, 0.05)' }}>
            <CardContent>
              <Typography variant="h6" color="error.main">
                {selectedEmpleado?.nombre} {selectedEmpleado?.apellido}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                RUT: {selectedEmpleado?.rut ? formatearRut(selectedEmpleado.rut) : 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cargo: {selectedEmpleado?.cargo || 'No especificado'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Razón Social: {selectedEmpleado?.nombre_razon || getRazonSocialNombre(selectedEmpleado)}
              </Typography>
            </CardContent>
          </Card>
          <DialogContentText>
            El empleado sera eliminado de la base de datos.
            Esta acción <strong>NO SE PUEDE DESHACER</strong>.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={handleCloseDialogs} 
            color="primary" 
            variant="outlined"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleDeleteEmpleado} 
            color="error" 
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {loading ? 'Eliminando...' : 'Eliminar Permanentemente'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL DE IMPORTACIÓN DE EXCEL - CON ASIGNACIÓN AUTOMÁTICA DE SUCURSALES */}
      <ImportarEmpleadosExcel
        open={openImportDialog}
        handleClose={handleCloseImportDialog}
        onImportComplete={handleImportComplete}
        sucursales={sucursales} // Pasar sucursales disponibles para el mapeo
      />

      {/* Snackbar para mensajes */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ 
            width: '100%',
            boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EmpleadosPage;                                  