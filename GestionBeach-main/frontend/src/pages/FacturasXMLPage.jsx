// FacturasXMLPage.jsx - CON COMPONENTE DE FILTRO NUEVO
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
  Snackbar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Tabs,
  Tab,
  Checkbox,
  TablePagination,
  IconButton,
  Tooltip,
  Badge,
  Fab,
  TextField,
  InputAdornment,
  Divider
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Refresh as RefreshIcon,
  AttachMoney as AttachMoneyIcon,
  Analytics as AnalyticsIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Print as PrintIcon,
  PendingActions as PendingIcon,
  PlaylistAddCheck as ProcessedIcon,
  PlayArrow as ProcessIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterListIcon,
  PictureAsPdf as PdfIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon
} from '@mui/icons-material';
import axios from 'axios';

// Configuración API
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'http://190.102.248.163:5000/api'
  : 'http://localhost:5000/api';

const getAuthToken = () => localStorage.getItem('token');

const axiosWithAuth = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000
});

axiosWithAuth.interceptors.request.use(config => {
  const token = getAuthToken();
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

axiosWithAuth.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
      console.error('Error de conexión:', error.message);
      return Promise.reject(new Error('No se puede conectar al servidor. Verifica que esté corriendo en puerto 5000.'));
    }
    
    if (error.response?.status === 401) {
      console.error('Error de autenticación:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// COMPONENTE DE FILTRO SIMPLE - INDEPENDIENTE
const SimpleSearchFilter = ({ onSearch, onClear, isLoading, activeFilter, totalResults }) => {
  const [searchText, setSearchText] = useState('');

  const handleTextChange = (event) => {
    setSearchText(event.target.value);
  };

  const handleSearch = () => {
    onSearch(searchText.trim());
  };

  const handleClear = () => {
    setSearchText('');
    onClear();
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 2, backgroundColor: '#fafafa' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <FilterListIcon sx={{ mr: 1, color: '#f37d16' }} />
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#333' }}>
          Filtro de Facturas
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Buscar facturas por folio, emisor, RUT..."
          value={searchText}
          onChange={handleTextChange}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          variant="outlined"
          size="medium"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color={isLoading ? 'disabled' : 'action'} />
              </InputAdornment>
            ),
            endAdornment: searchText && (
              <InputAdornment position="end">
                <IconButton 
                  size="small" 
                  onClick={() => setSearchText('')}
                  disabled={isLoading}
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
            sx: { backgroundColor: 'white' }
          }}
        />

        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={isLoading || !searchText.trim()}
          startIcon={<SearchIcon />}
          sx={{
            backgroundColor: '#f37d16',
            '&:hover': { backgroundColor: '#e06c00' },
            minWidth: 120,
            fontWeight: 'bold'
          }}
        >
          {isLoading ? 'Buscando...' : 'Buscar'}
        </Button>

        {activeFilter && (
          <Button
            variant="outlined"
            onClick={handleClear}
            disabled={isLoading}
            startIcon={<ClearIcon />}
            sx={{
              borderColor: '#999',
              color: '#666',
              '&:hover': { borderColor: '#666', backgroundColor: '#f5f5f5' }
            }}
          >
            Limpiar
          </Button>
        )}
      </Box>

      {activeFilter && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label={`Filtro: "${activeFilter}"`}
            onDelete={handleClear}
            color="primary"
            variant="filled"
            size="small"
            sx={{ fontWeight: 'bold' }}
          />
          <Typography variant="body2" color="text.secondary">
            {totalResults} resultados encontrados
          </Typography>
        </Box>
      )}

      {!activeFilter && (
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
          💡 Puedes buscar por número de folio, nombre del emisor, RUT del emisor o receptor
        </Typography>
      )}
    </Paper>
  );
};

const FacturasXMLPage = () => {
  // Estados principales
  const [currentTab, setCurrentTab] = useState(0);
  const [facturasPendientes, setFacturasPendientes] = useState([]);
  const [facturasProceadas, setFacturasProcesadas] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [centrosCostos, setCentrosCostos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estados para filtro SIMPLIFICADOS
  const [filtroActivo, setFiltroActivo] = useState('');
  const [buscandoFacturas, setBuscandoFacturas] = useState(false);
  
  // Estados para selección múltiple
  const [facturasSeleccionadas, setFacturasSeleccionadas] = useState([]);
  const [openProcesamientoDialog, setOpenProcesamientoDialog] = useState(false);
  const [centroCostoSeleccionado, setCentroCostoSeleccionado] = useState('');
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState('');
  
  // Estados para vista previa y PDF
  const [openPDFDialog, setOpenPDFDialog] = useState(false);
  const [facturaPreview, setFacturaPreview] = useState(null);
  
  // Estados para paginación
  const [paginationPendientes, setPaginationPendientes] = useState({
    page: 0,
    rowsPerPage: 1000,
    total: 0
  });
  
  const [paginationProcesadas, setPaginationProcesadas] = useState({
    page: 0,
    rowsPerPage: 1000,
    total: 0
  });
  
  // Estados para Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // ==================== FUNCIONES DE FILTRO SIMPLES ====================

  // Función para buscar facturas
  const buscarFacturas = async (textoBusqueda) => {
    console.log('🔍 Iniciando búsqueda:', textoBusqueda);
    setBuscandoFacturas(true);
    setFiltroActivo(textoBusqueda);
    
    // Resetear selección y paginación
    setFacturasSeleccionadas([]);
    setPaginationPendientes(prev => ({ ...prev, page: 0 }));
    
    try {
      await cargarFacturasPendientes(1, paginationPendientes.rowsPerPage, textoBusqueda);
    } catch (error) {
      console.error('Error en búsqueda:', error);
      showSnackbar('Error al buscar facturas', 'error');
    } finally {
      setBuscandoFacturas(false);
    }
  };

  // Función para limpiar filtro
  const limpiarFiltro = async () => {
    console.log('🧹 Limpiando filtro');
    setBuscandoFacturas(true);
    setFiltroActivo('');
    setFacturasSeleccionadas([]);
    setPaginationPendientes(prev => ({ ...prev, page: 0 }));
    
    try {
      await cargarFacturasPendientes(1, paginationPendientes.rowsPerPage, '');
    } catch (error) {
      console.error('Error al limpiar filtro:', error);
      showSnackbar('Error al cargar facturas', 'error');
    } finally {
      setBuscandoFacturas(false);
    }
  };

  // ==================== FUNCIONES DE CARGA DE DATOS ====================

  const cargarFacturasPendientes = async (pagina = null, limite = null, busqueda = null) => {
    setLoading(true);
    try {
      console.log('📄 Cargando facturas pendientes...');
      
      const page = pagina || (paginationPendientes.page + 1);
      const limit = limite || paginationPendientes.rowsPerPage;
      const search = busqueda !== null ? busqueda : filtroActivo;
      
      const params = {
        page: page,
        limit: limit
      };
      
      if (search && search.trim()) {
        params.search = search.trim();
      }
      
      const response = await axiosWithAuth.get('/facturas-xml/pendientes', { params });
      
      if (response.data.success) {
        setFacturasPendientes(response.data.data || []);
        
        setPaginationPendientes(prev => ({
          ...prev,
          total: response.data.pagination.totalRecords,
          page: response.data.pagination.currentPage - 1
        }));
        
        console.log(`✅ ${response.data.data.length || 0} facturas pendientes cargadas`);
        setError(null);
      } else {
        setFacturasPendientes([]);
        setPaginationPendientes(prev => ({ ...prev, total: 0 }));
      }
    } catch (err) {
      console.error('❌ Error al cargar facturas pendientes:', err);
      setError('Error al cargar facturas pendientes');
      setFacturasPendientes([]);
      setPaginationPendientes(prev => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  };

  const cargarFacturasProcesadas = async () => {
    setLoading(true);
    try {
      console.log('📄 Cargando facturas procesadas...');
      const response = await axiosWithAuth.get('/facturas-xml', {
        params: {
          page: paginationProcesadas.page + 1,
          limit: paginationProcesadas.rowsPerPage
        }
      });
      
      if (response.data.success) {
        setFacturasProcesadas(response.data.data || []);
        setPaginationProcesadas(prev => ({
          ...prev,
          total: response.data.pagination.totalRecords
        }));
        console.log(`✅ ${response.data.data.length || 0} facturas procesadas cargadas`);
      }
    } catch (err) {
      console.error('❌ Error al cargar facturas procesadas:', err);
      setFacturasProcesadas([]);
    } finally {
      setLoading(false);
    }
  };

  const cargarDatosIniciales = async () => {
    await Promise.all([
      cargarEstadisticas(),
      cargarCentrosCostosYSucursales()
    ]);
  };

  const cargarCentrosCostosYSucursales = async () => {
    try {
      // Cargar centros de costos
      try {
        const responseCentros = await axiosWithAuth.get('/facturas-xml/centros-costos/activos');
        
        if (responseCentros.data.success && responseCentros.data.data.length > 0) {
          setCentrosCostos(responseCentros.data.data);
          console.log(`✅ ${responseCentros.data.data.length} centros de costos cargados`);
        } else {
          setCentrosCostos([]);
          showSnackbar('No hay centros de costos configurados en la base de datos', 'warning');
        }
      } catch (centrosError) {
        setCentrosCostos([]);
        showSnackbar('Error al cargar centros de costos desde la base de datos', 'error');
      }

      // Cargar sucursales del usuario
      try {
        const responseSucursales = await axiosWithAuth.get('/facturas-xml/lista/sucursales');
        
        if (responseSucursales.data.success && responseSucursales.data.data.length > 0) {
          setSucursales(responseSucursales.data.data);
          console.log(`✅ ${responseSucursales.data.data.length} sucursales cargadas`);
        } else {
          setSucursales([]);
          showSnackbar('No hay sucursales configuradas para este usuario', 'warning');
        }
      } catch (sucursalError) {
        setSucursales([]);
        showSnackbar('Error al cargar las sucursales del usuario', 'error');
      }
      
    } catch (err) {
      showSnackbar('Error al cargar configuración del sistema', 'error');
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const response = await axiosWithAuth.get('/facturas-xml/estadisticas');
      
      if (response.data.success) {
        setEstadisticas(response.data.data);
      }
    } catch (err) {
      console.error('❌ Error al cargar estadísticas:', err);
      setEstadisticas({
        total_facturas: 0,
        total_facturas_procesadas: 0,
        total_facturas_pendientes: 0,
        total_proveedores: 0,
        monto_total: 0,
        por_sucursal: [],
        por_centro_costo: []
      });
    }
  };

  // ==================== FUNCIONES PARA SELECCIÓN MÚLTIPLE ====================

  const handleSelectFactura = useCallback((facturaId) => {
    setFacturasSeleccionadas(prev => {
      if (prev.includes(facturaId)) {
        return prev.filter(id => id !== facturaId);
      } else {
        return [...prev, facturaId];
      }
    });
  }, []);

  const handleSelectAll = useCallback((event) => {
    if (event.target.checked) {
      setFacturasSeleccionadas(facturasPendientes.map(f => f.ID));
    } else {
      setFacturasSeleccionadas([]);
    }
  }, [facturasPendientes]);

  const isIndeterminate = facturasSeleccionadas.length > 0 && facturasSeleccionadas.length < facturasPendientes.length;
  const isAllSelected = facturasPendientes.length > 0 && facturasSeleccionadas.length === facturasPendientes.length;

  const procesarFacturasSeleccionadas = async () => {
    if (facturasSeleccionadas.length === 0) {
      showSnackbar('Debe seleccionar al menos una factura', 'error');
      return;
    }

    if (!centroCostoSeleccionado || !sucursalSeleccionada) {
      showSnackbar('Debe seleccionar centro de costos y sucursal', 'error');
      return;
    }

    setLoading(true);

    try {
      const requestData = {
        facturasIds: facturasSeleccionadas,
        centroCostos: centroCostoSeleccionado,
        sucursal: sucursalSeleccionada
      };

      const response = await axiosWithAuth.post('/facturas-xml/procesar-seleccionadas', requestData, {
        timeout: 30000
      });

      if (response.data.success) {
        const { procesadas, errores, resumen } = response.data.data;
        
        if (resumen.exitosas > 0) {
          showSnackbar(`✅ ${resumen.exitosas} facturas procesadas exitosamente`, 'success');
        }
        
        if (resumen.errores > 0) {
          showSnackbar(`⚠️ ${resumen.errores} facturas tuvieron errores`, 'warning');
        }

        // Refrescar datos
        cargarFacturasPendientes();
        cargarEstadisticas();
        
        // Limpiar selección
        setFacturasSeleccionadas([]);
        setOpenProcesamientoDialog(false);
        setCentroCostoSeleccionado('');
        setSucursalSeleccionada('');
      } else {
        showSnackbar(response.data.message || 'Error al procesar facturas', 'error');
      }
    } catch (err) {
      console.error('❌ Error al procesar facturas:', err);
      showSnackbar('Error al procesar las facturas seleccionadas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const verFacturaCompleta = async (facturaId, esProcesada = false) => {
    try {
      setLoading(true);
      const endpoint = esProcesada 
        ? `/facturas-xml/${facturaId}`
        : `/facturas-xml/pendientes/${facturaId}`;
      
      const response = await axiosWithAuth.get(endpoint);
      
      if (response.data.success) {
        setFacturaPreview(response.data.data);
        setOpenPDFDialog(true);
      } else {
        showSnackbar('Error al cargar detalles de la factura', 'error');
      }
    } catch (err) {
      showSnackbar('Error al cargar factura', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ==================== EFECTOS ====================

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  useEffect(() => {
    if (currentTab === 0) {
      cargarFacturasPendientes();
    } else if (currentTab === 1) {
      cargarFacturasProcesadas();
    }
  }, [currentTab]);

  useEffect(() => {
    if (currentTab === 0) {
      cargarFacturasPendientes();
    }
  }, [paginationPendientes.page, paginationPendientes.rowsPerPage]);

  useEffect(() => {
    if (currentTab === 1) {
      cargarFacturasProcesadas();
    }
  }, [paginationProcesadas.page, paginationProcesadas.rowsPerPage]);

  // ==================== FUNCIONES DE UTILIDAD ====================

  const formatearRUT = (rut) => {
    if (!rut) return '';
    const cleanRut = rut.replace(/[.-]/g, '');
    if (cleanRut.length < 2) return rut;
    
    const body = cleanRut.slice(0, -1);
    const verifier = cleanRut.slice(-1);
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formattedBody}-${verifier}`;
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('es-CL').format(num);
  };

  const formatMoney = (amount) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-CL');
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ 
      open: true, 
      message: message, 
      severity 
    });
  };

  // ==================== FUNCIÓN PARA IMPRIMIR PDF ====================
  const imprimirFacturaPDF = () => {
    if (!facturaPreview) return;
    
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Factura ${facturaPreview.FOLIO || facturaPreview.folio}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 15px; 
            font-size: 11px;
            color: #333;
            line-height: 1.3;
          }
          .header { 
            text-align: center; 
            margin-bottom: 15px;
            border-bottom: 2px solid #d32f2f;
            padding-bottom: 10px;
          }
          .factura-numero {
            font-size: 18px;
            font-weight: bold;
            color: #d32f2f;
            margin-bottom: 5px;
          }
          .empresa-info {
            font-size: 10px;
            color: #666;
          }
          .datos-factura {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
          }
          .datos-emisor, .datos-receptor {
            width: 48%;
          }
          .section-title {
            font-weight: bold;
            font-size: 12px;
            color: #d32f2f;
            margin-bottom: 5px;
            border-bottom: 1px solid #eee;
            padding-bottom: 2px;
          }
          .info-row {
            margin-bottom: 3px;
          }
          .info-label {
            font-weight: bold;
            width: 100px;
            display: inline-block;
          }
          .productos-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 10px;
          }
          .productos-table th {
            background-color: #f5f5f5;
            border: 1px solid #ddd;
            padding: 6px;
            text-align: left;
            font-weight: bold;
          }
          .productos-table td {
            border: 1px solid #ddd;
            padding: 4px 6px;
          }
          .productos-table .text-center {
            text-align: center;
          }
          .productos-table .text-right {
            text-align: right;
          }
          .totales-section {
            margin-top: 15px;
            border-top: 2px solid #d32f2f;
            padding-top: 10px;
          }
          .totales-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          .total-final {
            font-size: 14px;
            font-weight: bold;
            color: #d32f2f;
            border-top: 1px solid #ddd;
            padding-top: 5px;
            margin-top: 5px;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 9px;
            color: #888;
            border-top: 1px solid #eee;
            padding-top: 10px;
          }
          .centro-sucursal {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 10px;
          }
          .centro-sucursal .chip {
            background-color: #f0f0f0;
            padding: 3px 8px;
            border-radius: 3px;
            border: 1px solid #ddd;
          }
          @media print {
            body { margin: 10px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="factura-numero">FACTURA ELECTRÓNICA N° ${facturaPreview.FOLIO || facturaPreview.folio}</div>
          <div class="empresa-info">Documento Tributario Electrónico - Chile</div>
        </div>

        ${facturaPreview.centro_costo_nombre || facturaPreview.sucursal_nombre ? `
        <div class="centro-sucursal">
          ${facturaPreview.centro_costo_nombre ? `<div class="chip"><strong>Centro de Costo:</strong> ${facturaPreview.centro_costo_nombre}</div>` : ''}
          ${facturaPreview.sucursal_nombre ? `<div class="chip"><strong>Sucursal:</strong> ${facturaPreview.sucursal_nombre}</div>` : ''}
        </div>
        ` : ''}

        <div class="datos-factura">
          <div class="datos-emisor">
            <div class="section-title">DATOS DEL EMISOR</div>
            <div class="info-row">
              <span class="info-label">Razón Social:</span>
              ${facturaPreview.RZN_EMISOR || facturaPreview.emisor_razon_social}
            </div>
            <div class="info-row">
              <span class="info-label">RUT:</span>
              ${formatearRUT(facturaPreview.RUT_EMISOR || facturaPreview.emisor_rut)}
            </div>
            <div class="info-row">
              <span class="info-label">Fecha Emisión:</span>
              ${formatDate(facturaPreview.FECHA_EMISION || facturaPreview.fecha_emision)}
            </div>
          </div>
          
          <div class="datos-receptor">
            <div class="section-title">DATOS DEL RECEPTOR</div>
            <div class="info-row">
              <span class="info-label">Razón Social:</span>
              ${facturaPreview.RZN_RECEPTOR || facturaPreview.receptor_razon_social}
            </div>
            <div class="info-row">
              <span class="info-label">RUT:</span>
              ${formatearRUT(facturaPreview.RUT_RECEPTOR || facturaPreview.receptor_rut)}
            </div>
            <div class="info-row">
              <span class="info-label">Estado:</span>
              ${facturaPreview.estado || 'PENDIENTE'}
            </div>
          </div>
        </div>

        ${facturaPreview.detalles && facturaPreview.detalles.length > 0 ? `
        <div class="section-title">DETALLE DE PRODUCTOS Y SERVICIOS</div>
        <table class="productos-table">
          <thead>
            <tr>
              <th style="width: 15%;">Código</th>
              <th style="width: 40%;">Descripción</th>
              <th style="width: 10%;" class="text-center">Cant.</th>
              <th style="width: 15%;" class="text-right">Precio Unit.</th>
              <th style="width: 20%;" class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${facturaPreview.detalles.map(detalle => `
              <tr>
                <td>${detalle.CODIGO_ITEM || detalle.codigo_item || ''}</td>
                <td>${detalle.NOMBRE_ITEM || detalle.nombre_item || 'Producto sin descripción'}</td>
                <td class="text-center">${formatNumber(detalle.CANTIDAD || detalle.cantidad || 1)}</td>
                <td class="text-right">${formatMoney(detalle.PRECIO || detalle.precio || 0)}</td>
                <td class="text-right">${formatMoney(detalle.MONTO || detalle.monto || 0)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}

        <div class="totales-section">
          <div class="section-title">RESUMEN DE TOTALES</div>
          <div class="totales-row">
            <span><strong>Monto Neto:</strong></span>
            <span>${formatMoney(facturaPreview.MONTO_NETO || facturaPreview.monto_neto || 0)}</span>
          </div>
          <div class="totales-row">
            <span><strong>IVA (19%):</strong></span>
            <span>${formatMoney(facturaPreview.IVA || facturaPreview.iva || 0)}</span>
          </div>
          <div class="totales-row total-final">
            <span><strong>TOTAL GENERAL:</strong></span>
            <span><strong>${formatMoney(facturaPreview.MONTO_TOTAL || facturaPreview.monto_total || 0)}</strong></span>
          </div>
        </div>

        <div class="footer">
          <p>Documento procesado digitalmente - Sistema de Gestión de Facturas</p>
          <p>Fecha de procesamiento: ${formatDate(facturaPreview.fecha_procesamiento || new Date())}</p>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };
  };

  // ==================== COMPONENTE TABLA PENDIENTES ====================

  const TablaPendientes = () => {
    const handleChangePage = (event, newPage) => {
      setPaginationPendientes(prev => ({ ...prev, page: newPage }));
    };

    const handleChangeRowsPerPage = (event) => {
      setPaginationPendientes(prev => ({ 
        ...prev, 
        rowsPerPage: parseInt(event.target.value, 10),
        page: 0 
      }));
    };

    return (
      <Box>
        {/* USAR EL NUEVO COMPONENTE DE FILTRO */}
        <SimpleSearchFilter
          onSearch={buscarFacturas}
          onClear={limpiarFiltro}
          isLoading={buscandoFacturas || loading}
          activeFilter={filtroActivo}
          totalResults={facturasPendientes.length}
        />
        
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={isIndeterminate}
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    color="primary"
                  />
                </TableCell>
                <TableCell><strong>Folio</strong></TableCell>
                <TableCell><strong>Emisor</strong></TableCell>
                <TableCell><strong>RUT Emisor</strong></TableCell>
                <TableCell><strong>Fecha</strong></TableCell>
                <TableCell align="right"><strong>Monto Total</strong></TableCell>
                <TableCell><strong>Productos</strong></TableCell>
                <TableCell align="center"><strong>Acciones</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(loading || buscandoFacturas) ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={40} />
                    <Typography variant="body2" sx={{ mt: 2 }}>
                      {buscandoFacturas ? 'Buscando facturas...' : 'Cargando facturas pendientes...'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : facturasPendientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    {filtroActivo ? (
                      <>
                        <SearchIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                        <Typography variant="h6" color="textSecondary">
                          No se encontraron resultados
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          No hay facturas que coincidan con "{filtroActivo}"
                        </Typography>
                        <Button 
                          onClick={limpiarFiltro} 
                          sx={{ mt: 2 }}
                          variant="outlined"
                        >
                          Ver todas las facturas
                        </Button>
                      </>
                    ) : (
                      <>
                        <PendingIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                        <Typography variant="h6" color="textSecondary">
                          No hay facturas pendientes
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Todas las facturas descargadas por el bot han sido procesadas
                        </Typography>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                facturasPendientes.map((factura) => (
                  <TableRow 
                    key={factura.ID}
                    hover
                    selected={facturasSeleccionadas.includes(factura.ID)}
                    sx={{ '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' } }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={facturasSeleccionadas.includes(factura.ID)}
                        onChange={() => handleSelectFactura(factura.ID)}
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {factura.FOLIO}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {factura.RZN_EMISOR}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {factura.RUT_EMISOR}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(factura.FECHA_EMISION)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                        {formatMoney(factura.MONTO_TOTAL)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={`${factura.total_productos} items`}
                        size="small"
                        color="info"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Ver factura completa (PDF)">
                        <IconButton
                          size="small"
                          onClick={() => verFacturaCompleta(factura.ID)}
                          color="primary"
                        >
                          <PdfIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Ver detalles">
                        <IconButton
                          size="small"
                          onClick={() => verFacturaCompleta(factura.ID)}
                          color="info"
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          <TablePagination
            component="div"
            count={paginationPendientes.total}
            page={paginationPendientes.page}
            onPageChange={handleChangePage}
            rowsPerPage={paginationPendientes.rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Filas por página:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}${filtroActivo ? ` (filtrados)` : ''}`}
            rowsPerPageOptions={[100, 500, 1000, 1500, 2000]}
            ActionsComponent={({ count, page, rowsPerPage, onPageChange }) => (
              <Box sx={{ display: 'flex', ml: 1 }}>
                <IconButton
                  onClick={(event) => onPageChange(event, 0)}
                  disabled={page === 0}
                  aria-label="primera página"
                >
                  <FirstPageIcon />
                </IconButton>
                <IconButton
                  onClick={(event) => onPageChange(event, page - 1)}
                  disabled={page === 0}
                  aria-label="página anterior"
                >
                  <PrevIcon />
                </IconButton>
                <IconButton
                  onClick={(event) => onPageChange(event, page + 1)}
                  disabled={page >= Math.ceil(count / rowsPerPage) - 1}
                  aria-label="página siguiente"
                >
                  <NextIcon />
                </IconButton>
                <IconButton
                  onClick={(event) => onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1))}
                  disabled={page >= Math.ceil(count / rowsPerPage) - 1}
                  aria-label="última página"
                >
                  <LastPageIcon />
                </IconButton>
              </Box>
            )}
          />
        </TableContainer>
      </Box>
    );
  };

  const TablaProcesadas = () => {
    const handleChangePage = (event, newPage) => {
      setPaginationProcesadas(prev => ({ ...prev, page: newPage }));
    };

    const handleChangeRowsPerPage = (event) => {
      setPaginationProcesadas(prev => ({ 
        ...prev, 
        rowsPerPage: parseInt(event.target.value, 10),
        page: 0 
      }));
    };

    return (
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell><strong>Folio</strong></TableCell>
              <TableCell><strong>Emisor</strong></TableCell>
              <TableCell><strong>Fecha</strong></TableCell>
              <TableCell align="right"><strong>Monto</strong></TableCell>
              <TableCell><strong>Centro Costo</strong></TableCell>
              <TableCell><strong>Sucursal</strong></TableCell>
              <TableCell><strong>Estado</strong></TableCell>
              <TableCell align="center"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={40} />
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    Cargando facturas procesadas...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : facturasProceadas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <ProcessedIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" color="textSecondary">
                    No hay facturas procesadas
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Las facturas procesadas aparecerán aquí
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              facturasProceadas.map((factura) => (
                <TableRow key={factura.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {factura.folio}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {factura.emisor_razon_social}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(factura.fecha_emision)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      {formatMoney(factura.monto_total)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={factura.centro_costo_nombre || 'Sin centro'}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={factura.sucursal_nombre || 'Sin sucursal'}
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={factura.estado || 'PROCESADA'}
                      size="small"
                      color="success"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Ver PDF de la factura">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => verFacturaCompleta(factura.id, true)}
                      >
                        <PdfIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Ver detalles">
                      <IconButton 
                        size="small" 
                        color="info"
                        onClick={() => verFacturaCompleta(factura.id, true)}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        <TablePagination
          component="div"
          count={paginationProcesadas.total}
          page={paginationProcesadas.page}
          onPageChange={handleChangePage}
          rowsPerPage={paginationProcesadas.rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          rowsPerPageOptions={[100, 500, 1000, 1500, 2000]}
          ActionsComponent={({ count, page, rowsPerPage, onPageChange }) => (
            <Box sx={{ display: 'flex', ml: 1 }}>
              <IconButton
                onClick={(event) => onPageChange(event, 0)}
                disabled={page === 0}
                aria-label="primera página"
              >
                <FirstPageIcon />
              </IconButton>
              <IconButton
                onClick={(event) => onPageChange(event, page - 1)}
                disabled={page === 0}
                aria-label="página anterior"
              >
                <PrevIcon />
              </IconButton>
              <IconButton
                onClick={(event) => onPageChange(event, page + 1)}
                disabled={page >= Math.ceil(count / rowsPerPage) - 1}
                aria-label="página siguiente"
              >
                <NextIcon />
              </IconButton>
              <IconButton
                onClick={(event) => onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1))}
                disabled={page >= Math.ceil(count / rowsPerPage) - 1}
                aria-label="última página"
              >
                <LastPageIcon />
              </IconButton>
            </Box>
          )}
        />
      </TableContainer>
    );
  };

  // ==================== RENDER PRINCIPAL ====================

  return (
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: '#f8f9fa' }}>
      {/* Header */}
      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        color: 'white'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
              Sistema de Facturas Electrónicas
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              Gestión completa de facturas con centros de costos y sucursales
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={cargarDatosIniciales}
              disabled={loading}
              sx={{ 
                borderColor: 'white', 
                color: 'white',
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
              }}
            >
              Actualizar
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }} 
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Alertas de configuración */}
      {centrosCostos.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Sin centros de costos:</strong> No se encontraron centros de costos en la base de datos.
            Es necesario configurar la tabla 'centros_costos' para poder procesar facturas.
          </Typography>
        </Alert>
      )}

      {sucursales.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Sin sucursales:</strong> No se encontraron sucursales asignadas al usuario.
            Es necesario configurar la tabla 'sucursales' para poder procesar facturas.
          </Typography>
        </Alert>
      )}

      {/* Estadísticas */}
      {estadisticas && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <AnalyticsIcon sx={{ mr: 1, color: '#f37d16' }} />
            Resumen del Sistema
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h4" component="div">
                        {estadisticas?.total_facturas || 0}
                      </Typography>
                      <Typography variant="body2">
                        Facturas Totales
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                      <ReceiptIcon />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white'
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h4" component="div">
                        {estadisticas?.total_facturas_pendientes || 0}
                      </Typography>
                      <Typography variant="body2">
                        Pendientes
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                      <PendingIcon />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white'
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h4" component="div">
                        {estadisticas?.total_facturas_procesadas || 0}
                      </Typography>
                      <Typography variant="body2">
                        Procesadas
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                      <ProcessedIcon />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                color: 'white'
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h5" component="div">
                        {formatMoney(estadisticas?.monto_total)}
                      </Typography>
                      <Typography variant="body2">
                        Monto Total
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                      <AttachMoneyIcon />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Tabs principales */}
      <Paper sx={{ width: '100%', mb: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={(_, newValue) => setCurrentTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab 
            icon={<Badge badgeContent={estadisticas?.total_facturas_pendientes || 0} color="error"><PendingIcon /></Badge>}
            label="Facturas Pendientes" 
            sx={{ fontWeight: 'bold' }}
          />
          <Tab 
            icon={<Badge badgeContent={estadisticas?.total_facturas_procesadas || 0} color="success"><ProcessedIcon /></Badge>}
            label="Facturas Procesadas" 
            sx={{ fontWeight: 'bold' }}
          />
        </Tabs>
      </Paper>

      {/* Contenido de tabs */}
      {currentTab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Facturas Pendientes de Procesamiento
            </Typography>
            {facturasSeleccionadas.length > 0 && (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Chip 
                  label={`${facturasSeleccionadas.length} seleccionadas`}
                  color="primary"
                  variant="outlined"
                />
                <Button
                  variant="contained"
                  startIcon={<ProcessIcon />}
                  onClick={() => setOpenProcesamientoDialog(true)}
                  disabled={loading || centrosCostos.length === 0 || sucursales.length === 0}
                  sx={{ 
                    bgcolor: '#f37d16', 
                    '&:hover': { bgcolor: '#e06c00' }
                  }}
                >
                  Procesar Seleccionadas
                </Button>
              </Box>
            )}
          </Box>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Facturas descargadas automáticamente por el bot desde correos</strong><br/>
              Selecciona una o varias facturas para asignarles centro de costos y sucursal.
              Una vez procesadas, aparecerán en la pestaña "Facturas Procesadas".
            </Typography>
          </Alert>

          <TablaPendientes />
        </Paper>
      )}

      {currentTab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
            Facturas Procesadas (Con Centro de Costos y Sucursal)
          </Typography>
          
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Facturas ya procesadas con centro de costos y sucursal asignados</strong><br/>
              Estas facturas están listas para uso en reportes contables y análisis financieros.
              Haz clic en el botón PDF para ver la factura profesional lista para imprimir.
            </Typography>
          </Alert>
          
          <TablaProcesadas />
        </Paper>
      )}

      {/* Dialog para procesamiento de facturas seleccionadas */}
      <Dialog 
        open={openProcesamientoDialog} 
        onClose={() => setOpenProcesamientoDialog(false)}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            Procesar Facturas Seleccionadas
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
            {facturasSeleccionadas.length} facturas seleccionadas
          </Typography>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          {/* Selección de centro de costos */}
          <FormControl component="fieldset" sx={{ width: '100%', mb: 3 }}>
            <FormLabel component="legend" sx={{ mb: 2, fontWeight: 'bold' }}>
              Centro de Costos:
            </FormLabel>
            {centrosCostos.length === 0 ? (
              <Alert severity="error">
                <Typography variant="body2">
                  No hay centros de costos configurados en la base de datos.
                  Es necesario configurar la tabla 'centros_costos' para continuar.
                </Typography>
              </Alert>
            ) : (
              <RadioGroup
                value={centroCostoSeleccionado}
                onChange={(e) => setCentroCostoSeleccionado(e.target.value)}
              >
                {centrosCostos.map((centro) => (
                  <FormControlLabel
                    key={centro.id}
                    value={centro.id}
                    control={<Radio color="primary" />}
                    label={
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                          {centro.nombre} ({centro.id})
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {centro.descripcion}
                        </Typography>
                      </Box>
                    }
                    sx={{ mb: 1, p: 1, borderRadius: 1, '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' } }}
                  />
                ))}
              </RadioGroup>
            )}
          </FormControl>

          {/* Selección de sucursal */}
          <FormControl component="fieldset" sx={{ width: '100%' }}>
            <FormLabel component="legend" sx={{ mb: 2, fontWeight: 'bold' }}>
              Sucursal:
            </FormLabel>
            {sucursales.length === 0 ? (
              <Alert severity="error">
                <Typography variant="body2">
                  No hay sucursales configuradas para este usuario.
                  Es necesario configurar la tabla 'sucursales' para continuar.
                </Typography>
              </Alert>
            ) : (
              <RadioGroup
                value={sucursalSeleccionada}
                onChange={(e) => setSucursalSeleccionada(e.target.value)}
              >
                {sucursales.map((sucursal) => (
                  <FormControlLabel
                    key={sucursal.id}
                    value={sucursal.id.toString()}
                    control={<Radio color="primary" />}
                    label={
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                            {sucursal.nombre}
                          </Typography>
                          {sucursal.tipo_sucursal && (
                            <Chip 
                              label={sucursal.tipo_sucursal} 
                              size="small" 
                              variant="outlined" 
                              color="primary"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                      </Box>
                    }
                    sx={{ mb: 1, p: 1, borderRadius: 1, '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' } }}
                  />
                ))}
              </RadioGroup>
            )}
          </FormControl>

          {centroCostoSeleccionado && sucursalSeleccionada && (
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Resumen:</strong><br/>
                • Facturas: {facturasSeleccionadas.length}<br/>
                • Centro: {centrosCostos.find(c => c.id === centroCostoSeleccionado)?.nombre}<br/>
                • Sucursal: {sucursales.find(s => s.id == sucursalSeleccionada)?.nombre}
              </Typography>
            </Alert>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setOpenProcesamientoDialog(false)}
            color="inherit"
          >
            Cancelar
          </Button>
          <Button
            onClick={procesarFacturasSeleccionadas}
            variant="contained"
            disabled={!centroCostoSeleccionado || !sucursalSeleccionada || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <ProcessIcon />}
            sx={{ 
              bgcolor: '#f37d16', 
              '&:hover': { bgcolor: '#e06c00' }
            }}
          >
            {loading ? 'Procesando...' : `Procesar ${facturasSeleccionadas.length} Facturas`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para PDF de factura */}
      <Dialog 
        open={openPDFDialog} 
        onClose={() => setOpenPDFDialog(false)}
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: { minHeight: '90vh' }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box>
            <Typography variant="h6">
              Factura Electrónica N° {facturaPreview?.FOLIO || facturaPreview?.folio}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {facturaPreview?.RZN_EMISOR || facturaPreview?.emisor_razon_social} - Lista para imprimir
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={imprimirFacturaPDF}
            sx={{ 
              bgcolor: 'rgba(255,255,255,0.2)', 
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
            }}
          >
            Imprimir PDF
          </Button>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          {facturaPreview && (
            <Box sx={{ 
              p: 3,
              bgcolor: 'white',
              minHeight: '600px',
              fontFamily: 'Arial, sans-serif'
            }}>
              {/* Header de la factura */}
              <Box sx={{ 
                textAlign: 'center', 
                mb: 3,
                borderBottom: '2px solid #d32f2f',
                pb: 2
              }}>
                <Typography variant="h4" sx={{ 
                  color: '#d32f2f', 
                  fontWeight: 'bold',
                  mb: 1
                }}>
                  FACTURA ELECTRÓNICA N° {facturaPreview.FOLIO || facturaPreview.folio}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Documento Tributario Electrónico - Chile
                </Typography>
              </Box>

              {/* Centro de costos y sucursal */}
              {(facturaPreview.centro_costo_nombre || facturaPreview.sucursal_nombre) && (
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  mb: 2,
                  p: 2,
                  bgcolor: '#f8f9fa',
                  borderRadius: 1
                }}>
                  {facturaPreview.centro_costo_nombre && (
                    <Chip 
                      label={`Centro de Costo: ${facturaPreview.centro_costo_nombre}`}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  )}
                  {facturaPreview.sucursal_nombre && (
                    <Chip 
                      label={`Sucursal: ${facturaPreview.sucursal_nombre}`}
                      color="secondary"
                      variant="outlined"
                      size="small"
                    />
                  )}
                </Box>
              )}

              {/* Datos principales */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, bgcolor: '#f8f9fa' }}>
                    <Typography variant="h6" sx={{ 
                      fontWeight: 'bold', 
                      mb: 2,
                      color: '#d32f2f',
                      borderBottom: '1px solid #eee',
                      pb: 1
                    }}>
                      DATOS DEL EMISOR
                    </Typography>
                    <Typography sx={{ mb: 1 }}>
                      <strong>Razón Social:</strong><br/>
                      {facturaPreview.RZN_EMISOR || facturaPreview.emisor_razon_social}
                    </Typography>
                    <Typography sx={{ mb: 1 }}>
                      <strong>RUT:</strong> {formatearRUT(facturaPreview.RUT_EMISOR || facturaPreview.emisor_rut)}
                    </Typography>
                    <Typography>
                      <strong>Fecha Emisión:</strong> {formatDate(facturaPreview.FECHA_EMISION || facturaPreview.fecha_emision)}
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, bgcolor: '#f8f9fa' }}>
                    <Typography variant="h6" sx={{ 
                      fontWeight: 'bold', 
                      mb: 2,
                      color: '#d32f2f',
                      borderBottom: '1px solid #eee',
                      pb: 1
                    }}>
                      DATOS DEL RECEPTOR
                    </Typography>
                    <Typography sx={{ mb: 1 }}>
                      <strong>Razón Social:</strong><br/>
                      {facturaPreview.RZN_RECEPTOR || facturaPreview.receptor_razon_social}
                    </Typography>
                    <Typography sx={{ mb: 1 }}>
                      <strong>RUT:</strong> {formatearRUT(facturaPreview.RUT_RECEPTOR || facturaPreview.receptor_rut)}
                    </Typography>
                    <Typography>
                      <strong>Estado:</strong> 
                      <Chip 
                        label={facturaPreview.estado || 'PENDIENTE'} 
                        size="small" 
                        color={facturaPreview.estado === 'PROCESADA' ? 'success' : 'warning'}
                        sx={{ ml: 1 }}
                      />
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Detalles de productos */}
              {facturaPreview.detalles && facturaPreview.detalles.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 'bold', 
                    mb: 2,
                    color: '#d32f2f',
                    borderBottom: '1px solid #eee',
                    pb: 1
                  }}>
                    DETALLE DE PRODUCTOS Y SERVICIOS
                  </Typography>
                  <TableContainer component={Paper} sx={{ mb: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Código</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', width: '40%' }}>Descripción</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', width: '10%' }}>Cant.</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', width: '15%' }}>Precio Unit.</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', width: '20%' }}>Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {facturaPreview.detalles.map((detalle, index) => (
                          <TableRow key={index}>
                            <TableCell>{detalle.CODIGO_ITEM || detalle.codigo_item || ''}</TableCell>
                            <TableCell>{detalle.NOMBRE_ITEM || detalle.nombre_item || 'Producto sin descripción'}</TableCell>
                            <TableCell align="center">{formatNumber(detalle.CANTIDAD || detalle.cantidad || 1)}</TableCell>
                            <TableCell align="right">{formatMoney(detalle.PRECIO || detalle.precio || 0)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                              {formatMoney(detalle.MONTO || detalle.monto || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Totales */}
              <Box sx={{ 
                borderTop: '2px solid #d32f2f',
                pt: 2,
                mt: 3
              }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 'bold', 
                  mb: 2,
                  color: '#d32f2f'
                }}>
                  RESUMEN DE TOTALES
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={8}></Grid>
                  <Grid item xs={4}>
                    <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography><strong>Monto Neto:</strong></Typography>
                        <Typography>{formatMoney(facturaPreview.MONTO_NETO || facturaPreview.monto_neto || 0)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography><strong>IVA (19%):</strong></Typography>
                        <Typography>{formatMoney(facturaPreview.IVA || facturaPreview.iva || 0)}</Typography>
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#d32f2f' }}>
                          <strong>TOTAL GENERAL:</strong>
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#d32f2f' }}>
                          <strong>{formatMoney(facturaPreview.MONTO_TOTAL || facturaPreview.monto_total || 0)}</strong>
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Footer */}
              <Box sx={{ 
                mt: 4,
                pt: 2,
                borderTop: '1px solid #eee',
                textAlign: 'center',
                color: 'text.secondary',
                fontSize: '0.875rem'
              }}>
                <Typography variant="body2">
                  Documento procesado digitalmente - Sistema de Gestión de Facturas
                </Typography>
                <Typography variant="body2">
                  Fecha de procesamiento: {formatDate(facturaPreview.fecha_procesamiento || new Date())}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 2, bgcolor: '#f8f9fa' }}>
          <Button 
            onClick={() => setOpenPDFDialog(false)}
            color="inherit"
          >
            Cerrar
          </Button>
          <Button
            variant="contained"
            startIcon={<PdfIcon />}
            onClick={imprimirFacturaPDF}
            sx={{ 
              bgcolor: '#d32f2f', 
              '&:hover': { bgcolor: '#b71c1c' }
            }}
          >
            Descargar/Imprimir PDF
          </Button>
        </DialogActions>
      </Dialog>

      {/* FAB para acciones rápidas */}
      {currentTab === 0 && facturasSeleccionadas.length > 0 && (
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            bgcolor: '#f37d16',
            '&:hover': { bgcolor: '#e06c00' }
          }}
          onClick={() => setOpenProcesamientoDialog(true)}
        >
          <Badge badgeContent={facturasSeleccionadas.length} color="error">
            <ProcessIcon />
          </Badge>
        </Fab>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FacturasXMLPage;