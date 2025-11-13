// frontend/src/components/InventoryManagementSystem.jsx
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Checkbox,
  Badge,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  InputAdornment,
  TablePagination,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  FormControlLabel
} from '@mui/material';
import {
  Search as SearchIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  CalendarToday as CalendarTodayIcon,
  Thermostat as ThermostatIcon,
  Dashboard as DashboardIcon,
  Refresh as RefreshIcon,
  Business as BusinessIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  VerifiedUser as VerifiedUserIcon,
  NotificationsActive as NotificationsActiveIcon,
  Assessment as AssessmentIcon,
  Save as SaveIcon,
  ExpandMore as ExpandMoreIcon,
  Done as DoneIcon,
  Pending as PendingIcon,
  Email as EmailIcon,
  Send as SendIcon,
  Person as PersonIcon,
  Delete as DeleteIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import api from '../api/api';
import SucursalSelect from './SucursalSelect';

const InventoryManagementSystem = () => {
  // Estados principales
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados para productos
  const [productos, setProductos] = useState([]);
  const [productosExtendidos, setProductosExtendidos] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productosAgrupados, setProductosAgrupados] = useState({});
  
  // Estados para búsqueda y filtros
  const [selectedSucursal, setSelectedSucursal] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [alertDays, setAlertDays] = useState(7);
  const [showProcessed, setShowProcessed] = useState(true);
  const [showPending, setShowPending] = useState(true);
  
  // Estados para paginación
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);
  
  // Estados para modales
  const [openAddDataModal, setOpenAddDataModal] = useState(false);
  const [openProductModal, setOpenProductModal] = useState(false);
  const [openReportModal, setOpenReportModal] = useState(false);
  const [openEmailModal, setOpenEmailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Estados para datos adicionales
  const [newProductData, setNewProductData] = useState({
    fechaVencimiento: '',
    temperatura: '',
    observaciones: ''
  });
  const [requiereTemperatura, setRequiereTemperatura] = useState(false);
  
  // Estados para email
  const [emailData, setEmailData] = useState({
    tipo: 'vencimientos',
    destinatarios: [''],
    diasAlerta: 7
  });
  
  // Estados para estadísticas
  const [estadisticas, setEstadisticas] = useState({
    totalProductos: 0,
    productosVenciendo: 0,
    productosPendientes: 0,
    productosProcesados: 0
  });
  
  // Estado para Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Función para mostrar snackbar
  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  // Función para cerrar snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Función para verificar si un producto está procesado
  const isProductProcessed = (productId) => {
    return productosExtendidos.some(p => p.codigo === productId.replace('prod_', '').split('_')[0]);
  };

  // Función para obtener color de estado
  const getStatusColor = (diasVencimiento) => {
    if (diasVencimiento <= 3) return 'error';
    if (diasVencimiento <= 7) return 'warning';
    return 'success';
  };

  // Función para obtener icono de estado
  const getStatusIcon = (diasVencimiento) => {
    if (diasVencimiento <= 3) return <ErrorIcon />;
    if (diasVencimiento <= 7) return <WarningIcon />;
    return <CheckCircleIcon />;
  };

  // Función para formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('es-CL');
    } catch {
      return 'N/A';
    }
  };

  // Función para agrupar productos por fecha
  const agruparProductosPorFecha = (productos) => {
    const agrupados = productos.reduce((grupos, producto) => {
      const fecha = producto.fechaIngreso || 'Sin fecha';
      if (!grupos[fecha]) {
        grupos[fecha] = [];
      }
      grupos[fecha].push(producto);
      return grupos;
    }, {});

    const fechasOrdenadas = Object.keys(agrupados).sort((a, b) => {
      if (a === 'Sin fecha') return 1;
      if (b === 'Sin fecha') return -1;
      return new Date(b) - new Date(a);
    });

    const resultado = {};
    fechasOrdenadas.forEach(fecha => {
      resultado[fecha] = agrupados[fecha];
    });

    return resultado;
  };

  // FUNCIONES DE EMAIL

  // Función para agregar destinatario
  const handleAgregarDestinatario = () => {
    setEmailData({
      ...emailData,
      destinatarios: [...emailData.destinatarios, '']
    });
  };

  // Función para eliminar destinatario
  const handleEliminarDestinatario = (index) => {
    const nuevosDestinatarios = emailData.destinatarios.filter((_, i) => i !== index);
    setEmailData({
      ...emailData,
      destinatarios: nuevosDestinatarios
    });
  };

  // Función para actualizar destinatario
  const handleActualizarDestinatario = (index, valor) => {
    const nuevosDestinatarios = [...emailData.destinatarios];
    nuevosDestinatarios[index] = valor;
    setEmailData({
      ...emailData,
      destinatarios: nuevosDestinatarios
    });
  };

  // Función para generar reporte en texto plano
  const generarReporteTextoPlano = (productos, tipo, diasAlerta) => {
    const criticos = productos.filter(p => p.diasVencimiento <= 3);
    const warnings = productos.filter(p => p.diasVencimiento > 3 && p.diasVencimiento <= 7);
    const buenos = productos.filter(p => p.diasVencimiento > 7);
    
    const fecha = new Date().toLocaleDateString('es-CL', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const hora = new Date().toLocaleTimeString('es-CL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    const config = {
      vencimientos: {
        titulo: '🚨 ALERTA CRÍTICA DE VENCIMIENTOS',
        subtitulo: `Productos que vencen en ${diasAlerta} días o menos`,
        prioridad: 'URGENTE'
      },
      inventario: {
        titulo: '📊 ESTADO DEL INVENTARIO',
        subtitulo: 'Resumen ejecutivo del inventario completo',
        prioridad: 'INFORMACIÓN'
      }
    };

    const reportConfig = config[tipo];
    
    let reporte = `
═══════════════════════════════════════════════════════════════
${reportConfig.titulo}
═══════════════════════════════════════════════════════════════

${reportConfig.subtitulo}
📅 ${fecha} • ⏰ ${hora}
Prioridad: ${reportConfig.prioridad}

═══════════════════════════════════════════════════════════════
📊 RESUMEN EJECUTIVO
═══════════════════════════════════════════════════════════════

Total de productos: ${productos.length}
├─ 🚨 Críticos (≤3 días): ${criticos.length}
├─ ⚠️  En advertencia (4-7 días): ${warnings.length}
├─ ✅ En buen estado (>7 días): ${buenos.length}
└─ 🌡️  Con control temperatura: ${productos.filter(p => p.temperatura).length}

`;

    // Alertas críticas
    if (criticos.length > 0) {
      reporte += `
🚨 ¡ACCIÓN INMEDIATA REQUERIDA!
───────────────────────────────────────────────────────────────
${criticos.length} productos vencen en los próximos 3 días.
Requieren liquidación o descarte urgente.

`;
    }

    if (warnings.length > 0) {
      reporte += `
⚠️  PLANIFICAR LIQUIDACIÓN
───────────────────────────────────────────────────────────────
${warnings.length} productos vencen entre 4-7 días.
Considerar promociones especiales.

`;
    }

    if (productos.length === 0) {
      reporte += `
✅ ¡SITUACIÓN BAJO CONTROL!
───────────────────────────────────────────────────────────────
No hay productos que requieran atención inmediata en este momento.

`;
    }

    // Lista detallada de productos
    if (productos.length > 0) {
      reporte += `
═══════════════════════════════════════════════════════════════
📋 ${tipo === 'vencimientos' ? 'PRODUCTOS CRÍTICOS' : 'DETALLE DE INVENTARIO'}
═══════════════════════════════════════════════════════════════

`;

      const productosOrdenados = productos
        .sort((a, b) => a.diasVencimiento - b.diasVencimiento)
        .slice(0, 20); // Mostrar hasta 20 productos

      productosOrdenados.forEach((producto, index) => {
        const estado = producto.diasVencimiento <= 3 ? '🚨 CRÍTICO' : 
                     producto.diasVencimiento <= 7 ? '⚠️ URGENTE' : '✅ NORMAL';
        
        const accion = producto.diasVencimiento <= 3 ? '🔥 LIQUIDAR YA' : 
                      producto.diasVencimiento <= 7 ? '📢 PROMOCIONAR' : '📦 NORMAL';

        reporte += `
${index + 1}. ${producto.nombre}
   ├─ Código: ${producto.codigo}
   ├─ Vencimiento: ${producto.fechaVencimiento}
   ├─ Estado: ${estado}
   ├─ Días restantes: ${producto.diasVencimiento} días
   ├─ Acción: ${accion}`;
        
        if (producto.temperatura) {
          reporte += `\n   └─ Temperatura: ${producto.temperatura}`;
        } else {
          reporte += `\n   └─ Temperatura: No requiere control`;
        }
        
        reporte += `\n`;
      });

      if (productos.length > 20) {
        reporte += `
📊 Mostrando los 20 productos más críticos de ${productos.length} totales.
   Para ver el reporte completo, consultar el sistema de inventario.

`;
      }
    }

    // Recomendaciones
    if (productos.length > 0) {
      reporte += `
═══════════════════════════════════════════════════════════════
💡 RECOMENDACIONES ESTRATÉGICAS
═══════════════════════════════════════════════════════════════

`;

      if (tipo === 'vencimientos') {
        if (criticos.length > 0) {
          reporte += `🚨 PRIORIDAD 1: Liquidar inmediatamente ${criticos.length} productos críticos\n`;
        }
        if (warnings.length > 0) {
          reporte += `⚠️  PRIORIDAD 2: Crear promociones para ${warnings.length} productos en advertencia\n`;
        }
        reporte += `📊 REVISAR: Políticas de compra para reducir desperdicios
📈 IMPLEMENTAR: Sistema de rotación FIFO más estricto
🔄 OPTIMIZAR: Frecuencia de pedidos y cantidades mínimas
📱 AUTOMATIZAR: Alertas tempranas de vencimiento`;
      } else {
        reporte += `📊 ESTADO: Inventario bajo control con ${productos.length} productos activos
🔄 OPTIMIZAR: Proceso de rotación de inventario
📈 ANALIZAR: Patrones de consumo para mejores compras
⚡ AUTOMATIZAR: Alertas tempranas de vencimiento
🎯 IMPLEMENTAR: KPIs de control de desperdicios`;
      }
    }

    reporte += `

═══════════════════════════════════════════════════════════════
Sistema de Gestión de Inventario
Reporte generado automáticamente
${new Date().toLocaleString('es-CL')}
${tipo === 'vencimientos' ? 'Alerta de Vencimientos' : 'Estado de Inventario'}
═══════════════════════════════════════════════════════════════`;

    return reporte;
  };

  // Función principal para enviar con Web3Forms
  const handleEnviarReporteWeb3Forms = async () => {
    try {
      setLoading(true);
      
      const destinatarios = emailData.destinatarios.filter(email => email.trim() !== '');
      
      if (destinatarios.length === 0) {
        showSnackbar('Debe agregar al menos un destinatario', 'error');
        return;
      }
      
      console.log('📧 Enviando reporte con Web3Forms...');
      
      let productosParaEmail = [];
      let tituloReporte = '';
      
      switch (emailData.tipo) {
        case 'vencimientos':
          productosParaEmail = productosExtendidos.filter(p => p.diasVencimiento <= emailData.diasAlerta);
          tituloReporte = `🚨 Alerta de Vencimientos - ${productosParaEmail.length} productos`;
          break;
        case 'inventario':
          productosParaEmail = productosExtendidos;
          tituloReporte = `📊 Inventario Completo - ${productosParaEmail.length} productos`;
          break;
        default:
          productosParaEmail = productosExtendidos.filter(p => p.diasVencimiento <= emailData.diasAlerta);
          tituloReporte = `🚨 Alerta de Vencimientos - ${productosParaEmail.length} productos`;
      }
      
      const reporteTextoPlano = generarReporteTextoPlano(productosParaEmail, emailData.tipo, emailData.diasAlerta);
      
      // Enviar usando JSON en lugar de FormData para mejor compatibilidad
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          access_key: '6831c4e3-4a0a-49ab-9e0b-795f3a65678e',
          subject: tituloReporte,
          email: destinatarios.join(', '),
          from_name: 'Sistema de Inventario',
          message: reporteTextoPlano,
          _cc: '',
          _autoresponse: 'Gracias por solicitar el reporte. Su reporte de inventario ha sido generado exitosamente.'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        showSnackbar(
          `✅ Reporte enviado exitosamente a ${destinatarios.length} destinatarios`, 
          'success'
        );
        
        // Abrir preview del reporte
        const nuevaVentana = window.open('', '_blank');
        nuevaVentana.document.write(`
          <html>
          <head>
            <title>Preview del Reporte</title>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                padding: 20px; 
                background: #f5f5f5; 
                line-height: 1.4;
                white-space: pre-wrap;
              }
            </style>
          </head>
          <body>${reporteTextoPlano}</body>
          </html>
        `);
        nuevaVentana.document.close();
        
        setOpenEmailModal(false);
      } else {
        throw new Error(result.message || 'Error al enviar el reporte');
      }
      
    } catch (error) {
      console.error('❌ Error enviando reporte:', error);
      showSnackbar('Error al enviar reporte: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Efecto para recargar datos cuando cambia la sucursal
  useEffect(() => {
    const recargarDatos = async () => {
      // Solo cargar si hay una sucursal seleccionada
      if (selectedSucursal) {
        console.log('🔄 Sucursal cambiada, recargando datos...', selectedSucursal);
        try {
          setLoading(true);
          // Recargar según la pestaña activa
          if (tabValue === 0) {
            await cargarProductosSinfowin();
          } else if (tabValue === 1) {
            await cargarProductosExtendidos();
          }
        } catch (err) {
          console.error('Error al recargar datos:', err);
          showSnackbar('Error al cargar datos: ' + err.message, 'error');
        } finally {
          setLoading(false);
        }
      } else {
        // Si no hay sucursal seleccionada, limpiar productos
        console.log('ℹ️ No hay sucursal seleccionada');
        setProductos([]);
        setProductosExtendidos([]);
        setProductosAgrupados({});
        setEstadisticas({
          totalProductos: 0,
          productosVenciendo: 0,
          productosPendientes: 0,
          productosProcesados: 0
        });
      }
    };

    recargarDatos();
  }, [selectedSucursal]);

  // Efecto para recalcular estadísticas cuando cambian los productos
  useEffect(() => {
    if (selectedSucursal) {
      cargarEstadisticas();
    }
  }, [productos, productosExtendidos]);

  // FUNCIONES DE API

  // Cargar productos desde Sinfowin
  const cargarProductosSinfowin = async () => {
    try {
      // Validar que haya sucursal seleccionada
      if (!selectedSucursal) {
        showSnackbar('Por favor seleccione una sucursal primero', 'warning');
        return;
      }

      setLoading(true);
      setError(null);

      console.log('📦 Cargando productos desde Sinfowin...', {
        sucursal_id: selectedSucursal,
        search: searchTerm,
        filterDate
      });

      const response = await api.get('/inventario/productos-recientes', {
        params: {
          sucursal_id: selectedSucursal,
          limit: 200,
          search: searchTerm,
          fechaDesde: filterDate,
          fechaHasta: filterDate
        }
      });
      
      if (response.data.success) {
        setProductos(response.data.data);
        
        const agrupados = agruparProductosPorFecha(response.data.data);
        setProductosAgrupados(agrupados);
        
        showSnackbar(`${response.data.data.length} productos cargados desde Sinfowin`, 'success');
      } else {
        throw new Error(response.data.message || 'Error al cargar productos');
      }
      
    } catch (err) {
      console.error('❌ Error al cargar productos:', err);
      const errorMsg = err.response?.data?.message || 'Error al cargar productos desde Sinfowin';
      setError(errorMsg);
      showSnackbar(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cargar productos extendidos
  const cargarProductosExtendidos = async () => {
    try {
      console.log('📋 Cargando productos extendidos...', {
        sucursal_id: selectedSucursal,
        search: searchTerm,
        filterStatus,
        alertDays
      });

      const response = await api.get('/inventario/productos-extendidos', {
        params: {
          sucursal_id: selectedSucursal || undefined,
          search: searchTerm,
          diasVencimiento: filterStatus === 'venciendo' ? alertDays : undefined
        }
      });
      
      if (response.data.success) {
        setProductosExtendidos(response.data.data);
        console.log(`✅ ${response.data.data.length} productos extendidos cargados`);
      } else {
        throw new Error(response.data.message || 'Error al cargar productos extendidos');
      }
      
    } catch (err) {
      console.error('❌ Error al cargar productos extendidos:', err);
      showSnackbar('Error al cargar productos extendidos', 'error');
    }
  };

  // Cargar estadísticas (calculadas desde los datos actuales)
  const cargarEstadisticas = async () => {
    try {
      console.log('📊 Calculando estadísticas desde datos locales...');

      // Calcular estadísticas desde los datos que ya tenemos
      const productosPendientes = productos.filter(p => !isProductProcessed(p.id)).length;
      const productosProcesados = productos.filter(p => isProductProcessed(p.id)).length;

      // Calcular productos venciendo (próximos 7 días)
      const productosVenciendo = productosExtendidos.filter(p => {
        if (!p.diasVencimiento) return false;
        return p.diasVencimiento <= 7 && p.diasVencimiento >= 0;
      }).length;

      setEstadisticas({
        totalProductos: productosExtendidos.length,
        productosVenciendo: productosVenciendo,
        productosPendientes: productosPendientes,
        productosProcesados: productosProcesados
      });

      console.log('✅ Estadísticas calculadas:', {
        totalProductos: productosExtendidos.length,
        productosVenciendo,
        productosPendientes,
        productosProcesados
      });

    } catch (err) {
      console.error('❌ Error al calcular estadísticas:', err);
    }
  };

  // Función para eliminar producto del inventario extendido
  const handleEliminarProducto = async (productId) => {
    try {
      console.log(`🗑️ Eliminando producto ${productId} del inventario extendido...`);
      
      const response = await api.delete(`/inventario/producto/${productId}`);
      
      if (response.data.success) {
        showSnackbar('Producto eliminado exitosamente del seguimiento', 'success');
        
        setProductosExtendidos(prev => prev.filter(product => product.id !== productId));
        await cargarEstadisticas();
        
      } else {
        throw new Error(response.data.message || 'Error al eliminar producto');
      }
      
    } catch (err) {
      console.error('❌ Error al eliminar producto:', err);
      const errorMsg = err.response?.data?.message || 'Error al eliminar producto';
      showSnackbar(errorMsg, 'error');
    }
  };

  // Efecto para cargar datos iniciales
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      await Promise.all([
        cargarProductosSinfowin(),
        cargarProductosExtendidos(),
        cargarEstadisticas()
      ]);
    };
    
    cargarDatosIniciales();
  }, []);

  // Efecto para filtros con debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (productos.length > 0 || searchTerm) {
        cargarProductosSinfowin();
      }
      if (productosExtendidos.length > 0 || searchTerm) {
        cargarProductosExtendidos();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filterDate, filterStatus, alertDays]);

  // Efecto para actualizar estadísticas cuando cambian los productos
  useEffect(() => {
    if (productos.length > 0 && productosExtendidos.length >= 0) {
      cargarEstadisticas();
    }
  }, [productos, productosExtendidos]);

  // Productos filtrados
  const productosFiltrados = productos.filter(product => {
    const matchesSearch = !searchTerm || (
      product.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const isProcessed = isProductProcessed(product.id);
    const matchesStatus = (showProcessed && isProcessed) || (showPending && !isProcessed);
    
    return matchesSearch && matchesStatus;
  });

  // Productos extendidos filtrados
  const productosExtendidosFiltrados = productosExtendidos.filter(product => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      product.nombre?.toLowerCase().includes(search) ||
      product.codigo?.toLowerCase().includes(search)
    );
  });

  // Productos próximos a vencer
  const productosVenciendo = productosExtendidos.filter(p => p.diasVencimiento <= alertDays);

  // Función para seleccionar producto
  const handleSelectProduct = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Función para seleccionar todos los productos de un grupo
  const handleSelectGroup = (productos, checked) => {
    const productIds = productos.map(p => p.id);
    if (checked) {
      setSelectedProducts(prev => [...new Set([...prev, ...productIds])]);
    } else {
      setSelectedProducts(prev => prev.filter(id => !productIds.includes(id)));
    }
  };

  // Función para agregar datos
  const handleAddData = () => {
    if (selectedProducts.length === 0) {
      showSnackbar('Por favor seleccione al menos un producto', 'error');
      return;
    }
    setOpenAddDataModal(true);
  };

  // Función para guardar datos
  const handleSaveData = async () => {
    if (!newProductData.fechaVencimiento) {
      showSnackbar('Fecha de vencimiento es obligatoria', 'error');
      return;
    }

    if (requiereTemperatura && !newProductData.temperatura.trim()) {
      showSnackbar('Temperatura es obligatoria cuando está habilitada', 'error');
      return;
    }

    try {
      setLoading(true);
      
      console.log('💾 Guardando datos adicionales...', {
        productosIds: selectedProducts,
        ...newProductData,
        temperatura: requiereTemperatura ? newProductData.temperatura : null
      });
      
      const response = await api.post('/inventario/agregar-datos', {
        productosIds: selectedProducts,
        ...newProductData,
        temperatura: requiereTemperatura ? newProductData.temperatura : null
      });
      
      if (response.data.success) {
        const result = response.data.data;
        showSnackbar(
          `${result.insertados} productos procesados exitosamente. ${result.errores} errores.`, 
          result.errores > 0 ? 'warning' : 'success'
        );
        
        await Promise.all([
          cargarProductosExtendidos(),
          cargarEstadisticas()
        ]);
        
        setOpenAddDataModal(false);
        setSelectedProducts([]);
        setNewProductData({
          fechaVencimiento: '',
          temperatura: '',
          observaciones: ''
        });
        setRequiereTemperatura(false);
        
      } else {
        throw new Error(response.data.message || 'Error al guardar datos');
      }
      
    } catch (err) {
      console.error('❌ Error al guardar datos:', err);
      const errorMsg = err.response?.data?.message || 'Error al guardar datos adicionales';
      showSnackbar(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Función para refrescar todos los datos
  const handleRefreshAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        cargarProductosSinfowin(),
        cargarProductosExtendidos(),
        cargarEstadisticas()
      ]);
      showSnackbar('Datos actualizados exitosamente', 'success');
    } catch (err) {
      showSnackbar('Error al actualizar datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Renderizar estadísticas
  const renderEstadisticas = () => (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <DashboardIcon sx={{ mr: 1, color: '#f37d16' }} />
        Dashboard de Inventario y Trazabilidad
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
                    {estadisticas.totalProductos}
                  </Typography>
                  <Typography color="inherit" variant="body2">
                    Productos Gestionados
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                  <InventoryIcon fontSize="large" />
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
                    {estadisticas.productosVenciendo}
                  </Typography>
                  <Typography color="inherit" variant="body2">
                    Próximos a Vencer
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                  <WarningIcon fontSize="large" />
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
                    {estadisticas.productosPendientes}
                  </Typography>
                  <Typography color="inherit" variant="body2">
                    Pendientes Procesar
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                  <PendingIcon fontSize="large" />
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
                  <Typography color="inherit" variant="h4" component="div">
                    {estadisticas.productosProcesados}
                  </Typography>
                  <Typography color="inherit" variant="body2">
                    Procesados
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                  <DoneIcon fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: '#f8f9fa' }}>
      {/* Header profesional */}
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
              Sistema de Gestión de Inventario
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              Control de vencimientos y trazabilidad de productos perecibles
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
                label="Eficiente" 
                size="small" 
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} 
              />
              <Chip 
                icon={<VerifiedUserIcon />} 
                label="Trazable" 
                size="small" 
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} 
              />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefreshAll}
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
              startIcon={<EmailIcon />}
              onClick={() => setOpenEmailModal(true)}
              sx={{ 
                bgcolor: '#25D366', 
                '&:hover': { bgcolor: '#1DA851' },
                color: 'white',
                mr: 1
              }}
            >
              Enviar Reporte por Email
            </Button>
            <Button
              variant="contained"
              startIcon={<AssessmentIcon />}
              onClick={() => setOpenReportModal(true)}
              sx={{ 
                bgcolor: '#f37d16', 
                '&:hover': { bgcolor: '#e06c00' },
                boxShadow: '0 4px 15px rgba(243, 125, 22, 0.3)'
              }}
            >
              Generar Reporte
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
          icon={<ErrorIcon />}
        >
          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
            {error}
          </Typography>
        </Alert>
      )}

      {/* Estadísticas */}
      {renderEstadisticas()}

      {/* Navigation Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <InventoryIcon sx={{ mr: 1 }} />
                Productos Recientes
                <Badge badgeContent={estadisticas.productosPendientes} color="warning" sx={{ ml: 1 }}>
                  <span></span>
                </Badge>
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <VisibilityIcon sx={{ mr: 1 }} />
                Inventario Extendido
                <Badge badgeContent={productosExtendidos.length} color="primary" sx={{ ml: 1 }}>
                  <span></span>
                </Badge>
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <NotificationsActiveIcon sx={{ mr: 1 }} />
                Alertas y Vencimientos
                <Badge badgeContent={productosVenciendo.length} color="error" sx={{ ml: 1 }}>
                  <span></span>
                </Badge>
              </Box>
            } 
          />
        </Tabs>
      </Paper>

      {/* Controles y filtros */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={3}>
            <SucursalSelect
              value={selectedSucursal}
              onChange={(e) => setSelectedSucursal(e.target.value)}
              label="Filtrar por Sucursal"
              showAll={true}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              placeholder="Buscar por código o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {tabValue === 0 && (
            <>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  type="date"
                  label="Fecha Ingreso"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Stack direction="row" spacing={1}>
                  <Checkbox
                    checked={showPending}
                    onChange={(e) => setShowPending(e.target.checked)}
                    size="small"
                  />
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Pendientes
                  </Typography>
                  <Checkbox
                    checked={showProcessed}
                    onChange={(e) => setShowProcessed(e.target.checked)}
                    size="small"
                  />
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Procesados
                  </Typography>
                </Stack>
              </Grid>
              <Grid item xs={12} md={3}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddData}
                  disabled={selectedProducts.length === 0}
                  sx={{ 
                    bgcolor: '#f37d16', 
                    '&:hover': { bgcolor: '#e06c00' },
                    height: 56
                  }}
                >
                  Agregar Datos ({selectedProducts.length})
                </Button>
              </Grid>
            </>
          )}

          {tabValue === 1 && (
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Estado"
                >
                  <MenuItem value="todos">Todos</MenuItem>
                  <MenuItem value="venciendo">Próximos a vencer</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}

          {tabValue === 2 && (
            <>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Alertar cuando falten</InputLabel>
                  <Select
                    value={alertDays}
                    onChange={(e) => setAlertDays(e.target.value)}
                    label="Alertar cuando falten"
                  >
                    <MenuItem value={3}>3 días</MenuItem>
                    <MenuItem value={7}>7 días</MenuItem>
                    <MenuItem value={15}>15 días</MenuItem>
                    <MenuItem value={30}>30 días</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={async () => {
                    await Promise.all([
                      cargarProductosExtendidos(),
                      cargarEstadisticas()
                    ]);
                    showSnackbar('Alertas actualizadas', 'success');
                  }}
                  disabled={loading}
                  sx={{ height: 56 }}
                >
                  Actualizar Alertas
                </Button>
              </Grid>
            </>
          )}
        </Grid>
      </Paper>

      {/* Contenido principal */}
      <Paper sx={{ overflow: 'hidden', minHeight: '400px', borderRadius: 3 }}>
        {!selectedSucursal ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 6, gap: 2 }}>
            <BusinessIcon sx={{ fontSize: 80, color: '#667eea', opacity: 0.5 }} />
            <Typography variant="h5" color="text.secondary" fontWeight="medium">
              Seleccione una sucursal
            </Typography>
            <Typography variant="body1" color="text.secondary" textAlign="center">
              Para visualizar los productos del inventario, primero debe seleccionar una sucursal en el filtro superior.
            </Typography>
          </Box>
        ) : loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 6 }}>
            <CircularProgress size={60} sx={{ mb: 2, color: '#f37d16' }} />
            <Typography variant="h6" color="text.secondary">
              Cargando datos...
            </Typography>
          </Box>
        ) : (
          <>
            {/* Tab 0: Productos Recientes AGRUPADOS POR FECHA */}
            {tabValue === 0 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Productos Recientes Agrupados por Fecha de Ingreso
                </Typography>
                
                {Object.keys(productosAgrupados).length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <InventoryIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      No hay productos disponibles
                    </Typography>
                  </Box>
                ) : (
                  Object.entries(productosAgrupados).map(([fecha, productos]) => {
                    const productosFiltradosGrupo = productos.filter(product => {
                      const matchesSearch = !searchTerm || (
                        product.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        product.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
                      );
                      
                      const isProcessed = isProductProcessed(product.id);
                      const matchesStatus = (showProcessed && isProcessed) || (showPending && !isProcessed);
                      
                      return matchesSearch && matchesStatus;
                    });

                    if (productosFiltradosGrupo.length === 0) return null;

                    const procesados = productosFiltradosGrupo.filter(p => isProductProcessed(p.id)).length;
                    const pendientes = productosFiltradosGrupo.length - procesados;

                    return (
                      <Accordion key={fecha} defaultExpanded sx={{ mb: 2 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <CalendarTodayIcon sx={{ mr: 2, color: '#f37d16' }} />
                              <Typography variant="h6">
                                {fecha === 'Sin fecha' ? 'Sin fecha de ingreso' : formatDate(fecha)}
                              </Typography>
                              <Chip 
                                label={`${productosFiltradosGrupo.length} productos`} 
                                size="small" 
                                sx={{ ml: 2 }}
                              />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
                              {pendientes > 0 && (
                                <Chip 
                                  label={`${pendientes} pendientes`} 
                                  size="small" 
                                  color="warning"
                                  icon={<PendingIcon />}
                                />
                              )}
                              {procesados > 0 && (
                                <Chip 
                                  label={`${procesados} procesados`} 
                                  size="small" 
                                  color="success"
                                  icon={<DoneIcon />}
                                />
                              )}
                            </Box>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box sx={{ mb: 2 }}>
                            <Button
                              size="small"
                              startIcon={<Checkbox 
                                checked={productosFiltradosGrupo.every(p => selectedProducts.includes(p.id))}
                                indeterminate={
                                  productosFiltradosGrupo.some(p => selectedProducts.includes(p.id)) &&
                                  !productosFiltradosGrupo.every(p => selectedProducts.includes(p.id))
                                }
                              />}
                              onClick={() => handleSelectGroup(
                                productosFiltradosGrupo, 
                                !productosFiltradosGrupo.every(p => selectedProducts.includes(p.id))
                              )}
                            >
                              Seleccionar todos del grupo
                            </Button>
                          </Box>
                          
                          <TableContainer>
                            <Table>
                              <TableHead>
                                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                  <TableCell padding="checkbox">
                                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                      Sel.
                                    </Typography>
                                  </TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Código</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Cantidad</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Categoría</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {productosFiltradosGrupo.map((product) => {
                                  const processed = isProductProcessed(product.id);
                                  return (
                                    <TableRow 
                                      key={product.id} 
                                      hover
                                      sx={{
                                        bgcolor: processed ? '#fff3e0' : 'inherit',
                                        '&:hover': {
                                          bgcolor: processed ? '#ffe0b2' : '#f5f5f5'
                                        }
                                      }}
                                    >
                                      <TableCell padding="checkbox">
                                        <Checkbox
                                          checked={selectedProducts.includes(product.id)}
                                          onChange={() => handleSelectProduct(product.id)}
                                          disabled={processed}
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Chip
                                          label={processed ? 'Procesado' : 'Pendiente'}
                                          color={processed ? 'success' : 'warning'}
                                          size="small"
                                          icon={processed ? <DoneIcon /> : <PendingIcon />}
                                        />
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 'medium', color: 'primary.main' }}>
                                        {product.codigo}
                                      </TableCell>
                                      <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                          {product.nombre}
                                        </Typography>
                                      </TableCell>
                                      <TableCell>
                                        <Chip 
                                          label={product.cantidad} 
                                          size="small" 
                                          variant="outlined"
                                          color="primary"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Chip 
                                          label={product.categoria} 
                                          size="small" 
                                          variant="outlined"
                                        />
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </AccordionDetails>
                      </Accordion>
                    );
                  })
                )}
              </Box>
            )}

            {/* Tab 1: Inventario Extendido */}
            {tabValue === 1 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Productos con Datos Extendidos
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Código</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Fecha Vencimiento</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Días Restantes</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Temperatura</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {productosExtendidosFiltrados.slice(page * pageSize, page * pageSize + pageSize).map((product) => (
                        <TableRow key={product.id} hover>
                          <TableCell sx={{ fontWeight: 'medium' }}>{product.nombre}</TableCell>
                          <TableCell sx={{ color: 'primary.main' }}>{product.codigo}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <CalendarTodayIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                              {product.fechaVencimiento}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={`${product.diasVencimiento} días`}
                              color={getStatusColor(product.diasVencimiento)}
                              size="small"
                              icon={getStatusIcon(product.diasVencimiento)}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <ThermostatIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                              {product.temperatura || 'No aplica'}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Tooltip title="Ver detalles">
                                <IconButton size="small" onClick={() => {
                                  setSelectedProduct(product);
                                  setOpenProductModal(true);
                                }}>
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Eliminar del seguimiento (Ya atendido)">
                                <IconButton 
                                  size="small" 
                                  color="error"
                                  onClick={() => {
                                    if (window.confirm(`¿Confirma que ya atendió el producto "${product.nombre}" y desea eliminarlo del seguimiento?`)) {
                                      handleEliminarProducto(product.id);
                                    }
                                  }}
                                >
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
                
                {productosExtendidosFiltrados.length > pageSize && (
                  <TablePagination
                    component="div"
                    count={productosExtendidosFiltrados.length}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    rowsPerPage={pageSize}
                    onRowsPerPageChange={(e) => {
                      setPageSize(parseInt(e.target.value, 10));
                      setPage(0);
                    }}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    labelRowsPerPage="Filas por página:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                  />
                )}
              </Box>
            )}

            {/* Tab 2: Alertas y Vencimientos */}
            {tabValue === 2 && (
              <Box sx={{ p: 3 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                        <WarningIcon sx={{ mr: 1, color: '#f37d16' }} />
                        Productos Próximos a Vencer ({productosVenciendo.length})
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                          variant="outlined"
                          startIcon={<DownloadIcon />}
                          onClick={async () => {
                            try {
                              setLoading(true);
                              const response = await api.get('/inventario/reporte/vencimientos', {
                                params: { diasAlerta: alertDays }
                              });
                              
                              if (response.data.success) {
                                window.open(`http://localhost:5000${response.data.data.url}`, '_blank');
                                showSnackbar('Reporte PDF generado exitosamente', 'success');
                              }
                            } catch (error) {
                              showSnackbar('Error al generar reporte PDF', 'error');
                            } finally {
                              setLoading(false);
                            }
                          }}
                        >
                          Exportar PDF
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<PrintIcon />}
                          onClick={async () => {
                            try {
                              const response = await api.get('/inventario/impresion', {
                                params: { tipo: 'vencimientos', diasAlerta: alertDays }
                              });
                              
                              if (response.data.success) {
                                const printWindow = window.open('', '_blank');
                                const printData = response.data.data;
                                
                                printWindow.document.write(`
                                  <!DOCTYPE html>
                                  <html>
                                  <head>
                                    <title>${printData.titulo}</title>
                                    <style>
                                      body { font-family: Arial, sans-serif; margin: 20px; }
                                      h1 { color: #333; border-bottom: 2px solid #f37d16; padding-bottom: 10px; }
                                      .header { margin-bottom: 20px; }
                                      .info { background: #f5f5f5; padding: 10px; margin: 10px 0; }
                                      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                                      th { background-color: #f37d16; color: white; }
                                      .critico { background-color: #ffebee; }
                                      .warning { background-color: #fff3e0; }
                                      .normal { background-color: #e8f5e8; }
                                      @media print { .no-print { display: none; } }
                                    </style>
                                  </head>
                                  <body>
                                    <h1>${printData.titulo}</h1>
                                    <div class="header">
                                      <div class="info">
                                        <strong>Fecha:</strong> ${printData.fecha} - ${printData.hora}<br>
                                        <strong>Total productos:</strong> ${printData.totalProductos}<br>
                                        ${printData.criterio ? `<strong>Criterio:</strong> ${printData.criterio}<br>` : ''}
                                        <strong>Críticos:</strong> ${printData.resumen.criticos} | 
                                        <strong>Advertencia:</strong> ${printData.resumen.warnings}
                                      </div>
                                    </div>
                                    
                                    <table>
                                      <thead>
                                        <tr>
                                          <th>Código</th>
                                          <th>Producto</th>
                                          <th>Fecha Vencimiento</th>
                                          <th>Días Restantes</th>
                                          <th>Temperatura</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        ${printData.productos.map(p => `
                                          <tr class="${p.diasVencimiento <= 3 ? 'critico' : p.diasVencimiento <= 7 ? 'warning' : 'normal'}">
                                            <td>${p.codigo}</td>
                                            <td>${p.nombre}</td>
                                            <td>${p.fechaVencimiento}</td>
                                            <td>${p.diasVencimiento} días</td>
                                            <td>${p.temperatura || 'No aplica'}</td>
                                          </tr>
                                        `).join('')}
                                      </tbody>
                                    </table>
                                    
                                    <div style="margin-top: 30px; font-size: 12px; color: #666;">
                                      Sistema de Gestión de Inventario - Generado automáticamente
                                    </div>
                                    
                                    <script>
                                      window.onload = function() {
                                        window.print();
                                        window.onafterprint = function() {
                                          window.close();
                                        }
                                      }
                                    </script>
                                  </body>
                                  </html>
                                `);
                                printWindow.document.close();
                                showSnackbar('Enviado a impresora', 'success');
                              }
                            } catch (error) {
                              showSnackbar('Error al generar datos de impresión', 'error');
                            }
                          }}
                        >
                          Imprimir
                        </Button>
                      </Box>
                    </Box>
                  </Grid>

                  {productosVenciendo.length === 0 ? (
                    <Grid item xs={12}>
                      <Paper sx={{ p: 6, textAlign: 'center', bgcolor: '#f8f9fa' }}>
                        <CheckCircleIcon sx={{ fontSize: 100, color: 'success.main', mb: 2 }} />
                        <Typography variant="h5" color="success.main" gutterBottom>
                          ¡Todo en orden!
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          No hay productos próximos a vencer en los próximos {alertDays} días
                        </Typography>
                      </Paper>
                    </Grid>
                  ) : (
                    <Grid item xs={12}>
                      <List>
                        {productosVenciendo.map((product) => (
                          <Paper key={product.id} sx={{ mb: 2 }}>
                            <ListItem
                              sx={{
                                borderLeft: `6px solid ${
                                  product.diasVencimiento <= 3 ? '#f44336' : '#ff9800'
                                }`,
                                bgcolor: product.diasVencimiento <= 3 ? '#ffebee' : '#fff3e0'
                              }}
                            >
                              <ListItemIcon>
                                <Avatar sx={{ 
                                  bgcolor: product.diasVencimiento <= 3 ? 'error.main' : 'warning.main' 
                                }}>
                                  {getStatusIcon(product.diasVencimiento)}
                                </Avatar>
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant="h6">{product.nombre}</Typography>
                                    <Chip 
                                      label={`${product.diasVencimiento} días`}
                                      color={getStatusColor(product.diasVencimiento)}
                                      size="small"
                                    />
                                  </Box>
                                }
                                secondary={
                                  <Box sx={{ mt: 1 }}>
                                    <Typography variant="body2" color="text.secondary">
                                      <strong>Código:</strong> {product.codigo} | 
                                      <strong> Vence:</strong> {product.fechaVencimiento}
                                      {product.temperatura && (
                                        <>
                                          <br />
                                          <strong>Temperatura:</strong> {product.temperatura}
                                        </>
                                      )}
                                    </Typography>
                                  </Box>
                                }
                              />
                              <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<VisibilityIcon />}
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setOpenProductModal(true);
                                  }}
                                >
                                  Ver Detalles
                                </Button>
                                <Button
                                  variant="outlined"
                                  color="error"
                                  size="small"
                                  startIcon={<CloseIcon />}
                                  onClick={() => {
                                    if (window.confirm(`¿Confirma que ya atendió "${product.nombre}" y desea eliminarlo de las alertas?`)) {
                                      handleEliminarProducto(product.id);
                                    }
                                  }}
                                >
                                  Ya Atendido
                                </Button>
                              </Box>
                            </ListItem>
                          </Paper>
                        ))}
                      </List>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
          </>
        )}
      </Paper>

      {/* Modal para Agregar Datos */}
      <Dialog 
        open={openAddDataModal} 
        onClose={() => setOpenAddDataModal(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center'
        }}>
          <AddIcon sx={{ mr: 1 }} />
          Agregar Datos de Trazabilidad ({selectedProducts.length} productos)
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Fecha de Vencimiento"
                type="date"
                required
                value={newProductData.fechaVencimiento}
                onChange={(e) => setNewProductData({...newProductData, fechaVencimiento: e.target.value})}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><CalendarTodayIcon /></InputAdornment>
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Checkbox
                  checked={requiereTemperatura}
                  onChange={(e) => {
                    setRequiereTemperatura(e.target.checked);
                    if (!e.target.checked) {
                      setNewProductData({...newProductData, temperatura: ''});
                    }
                  }}
                  sx={{ mr: 1 }}
                />
                <Typography variant="body1">
                  Este producto requiere control de temperatura
                </Typography>
              </Box>
              
              {requiereTemperatura && (
                <TextField
                  fullWidth
                  label="Temperatura de Almacenamiento"
                  placeholder="Ej: 4°C, -18°C, Ambiente"
                  required={requiereTemperatura}
                  value={newProductData.temperatura}
                  onChange={(e) => setNewProductData({...newProductData, temperatura: e.target.value})}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><ThermostatIcon /></InputAdornment>
                  }}
                  helperText="Especifica la temperatura requerida para el almacenamiento seguro"
                />
              )}
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observaciones"
                multiline
                rows={3}
                placeholder="Información adicional sobre el producto, condiciones especiales, etc..."
                value={newProductData.observaciones}
                onChange={(e) => setNewProductData({...newProductData, observaciones: e.target.value})}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setOpenAddDataModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveData}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            sx={{ 
              bgcolor: '#f37d16', 
              '&:hover': { bgcolor: '#e06c00' }
            }}
          >
            {loading ? 'Guardando...' : 'Guardar Datos'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para Ver Producto */}
      <Dialog 
        open={openProductModal} 
        onClose={() => setOpenProductModal(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <VisibilityIcon sx={{ mr: 1 }} />
          Detalles del Producto
        </DialogTitle>
        <DialogContent>
          {selectedProduct && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Card sx={{ p: 3, bgcolor: '#f8f9fa' }}>
                    <Typography variant="h5" gutterBottom>{selectedProduct.nombre}</Typography>
                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                      Código: {selectedProduct.codigo}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">Cantidad</Typography>
                        <Typography variant="h6">{selectedProduct.cantidad || 'N/A'}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="text.secondary">Días hasta vencimiento</Typography>
                        <Chip 
                          label={`${selectedProduct.diasVencimiento} días`}
                          color={getStatusColor(selectedProduct.diasVencimiento)}
                          icon={getStatusIcon(selectedProduct.diasVencimiento)}
                        />
                      </Grid>
                    </Grid>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>Información de Trazabilidad</Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon><CalendarTodayIcon /></ListItemIcon>
                        <ListItemText 
                          primary="Fecha de Vencimiento" 
                          secondary={selectedProduct.fechaVencimiento} 
                        />
                      </ListItem>
                    </List>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>Condiciones de Almacenamiento</Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon><ThermostatIcon /></ListItemIcon>
                        <ListItemText 
                          primary="Temperatura" 
                          secondary={selectedProduct.temperatura || 'No requiere control de temperatura'} 
                        />
                      </ListItem>
                    </List>
                  </Card>
                </Grid>
                
                {selectedProduct.observaciones && (
                  <Grid item xs={12}>
                    <Card sx={{ p: 2 }}>
                      <Typography variant="h6" gutterBottom>Observaciones</Typography>
                      <Typography variant="body1">{selectedProduct.observaciones}</Typography>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenProductModal(false)}>Cerrar</Button>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => showSnackbar('Función de edición no disponible en demo', 'info')}
          >
            Editar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para Reportes */}
      <Dialog 
        open={openReportModal} 
        onClose={() => setOpenReportModal(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <AssessmentIcon sx={{ mr: 1 }} />
          Generar Reporte
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>Tipo de Reporte</Typography>
            <List>
              <ListItem button onClick={async () => {
                setOpenReportModal(false);
                try {
                  setLoading(true);
                  const response = await api.get('/inventario/reporte/vencimientos');
                  if (response.data.success) {
                    window.open(`http://localhost:5000${response.data.data.url}`, '_blank');
                    showSnackbar('Reporte de vencimientos generado', 'success');
                  }
                } catch (error) {
                  showSnackbar('Error al generar reporte', 'error');
                } finally {
                  setLoading(false);
                }
              }}>
                <ListItemIcon><WarningIcon color="warning" /></ListItemIcon>
                <ListItemText 
                  primary="Reporte de Vencimientos" 
                  secondary="Productos próximos a vencer"
                />
              </ListItem>
              <ListItem button onClick={async () => {
                setOpenReportModal(false);
                try {
                  setLoading(true);
                  const response = await api.get('/inventario/reporte/inventario');
                  if (response.data.success) {
                    window.open(`http://localhost:5000${response.data.data.url}`, '_blank');
                    showSnackbar('Reporte de inventario generado', 'success');
                  }
                } catch (error) {
                  showSnackbar('Error al generar reporte', 'error');
                } finally {
                  setLoading(false);
                }
              }}>
                <ListItemIcon><InventoryIcon color="primary" /></ListItemIcon>
                <ListItemText 
                  primary="Reporte de Inventario Completo" 
                  secondary="Todos los productos con datos extendidos"
                />
              </ListItem>
            </List>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReportModal(false)}>Cancelar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal para Enviar por Email */}
      <Dialog 
        open={openEmailModal} 
        onClose={() => setOpenEmailModal(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #25D366 0%, #1DA851 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center'
        }}>
          <EmailIcon sx={{ mr: 1 }} />
          Enviar Reporte por Email
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Tipo de Reporte */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Reporte</InputLabel>
                <Select
                  value={emailData.tipo}
                  onChange={(e) => setEmailData({...emailData, tipo: e.target.value})}
                  label="Tipo de Reporte"
                >
                  <MenuItem value="vencimientos">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <WarningIcon sx={{ mr: 1, color: 'warning.main' }} />
                      Productos Próximos a Vencer
                    </Box>
                  </MenuItem>
                  <MenuItem value="inventario">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <InventoryIcon sx={{ mr: 1, color: 'primary.main' }} />
                      Inventario Completo
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Días de Alerta (solo para vencimientos) */}
            {emailData.tipo === 'vencimientos' && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Alertar cuando falten</InputLabel>
                  <Select
                    value={emailData.diasAlerta}
                    onChange={(e) => setEmailData({...emailData, diasAlerta: e.target.value})}
                    label="Alertar cuando falten"
                  >
                    <MenuItem value={3}>3 días</MenuItem>
                    <MenuItem value={7}>7 días</MenuItem>
                    <MenuItem value={15}>15 días</MenuItem>
                    <MenuItem value={30}>30 días</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}

            {/* Destinatarios */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ mr: 1 }} />
                Destinatarios
              </Typography>
              
              {emailData.destinatarios.map((email, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TextField
                    fullWidth
                    label={`Email ${index + 1}`}
                    type="email"
                    value={email}
                    onChange={(e) => handleActualizarDestinatario(index, e.target.value)}
                    placeholder="ejemplo@correo.com"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon />
                        </InputAdornment>
                      ),
                    }}
                    error={email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
                    helperText={
                      email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) 
                        ? 'Email inválido' 
                        : ''
                    }
                  />
                  {emailData.destinatarios.length > 1 && (
                    <IconButton 
                      onClick={() => handleEliminarDestinatario(index)}
                      sx={{ ml: 1 }}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              ))}
              
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAgregarDestinatario}
                sx={{ mt: 1 }}
              >
                Agregar Destinatario
              </Button>
            </Grid>

            {/* Preview del Reporte */}
            <Grid item xs={12}>
              <Card sx={{ p: 2, bgcolor: '#f8f9fa' }}>
                <Typography variant="h6" gutterBottom>
                  📋 Vista Previa del Reporte
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Tipo:</strong> {
                    emailData.tipo === 'vencimientos' ? 'Productos Próximos a Vencer' :
                    'Inventario Completo'
                  }
                </Typography>
                {emailData.tipo === 'vencimientos' && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Criterio:</strong> Productos que vencen en {emailData.diasAlerta} días o menos
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  <strong>Destinatarios:</strong> {emailData.destinatarios.filter(e => e.trim() !== '').length} emails
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Incluye:</strong> Reporte HTML ejecutivo + opción de imprimir/descargar
                </Typography>
                <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                  <strong>✅ Web3Forms:</strong> Envío gratuito (1000 emails/mes)
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setOpenEmailModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleEnviarReporteWeb3Forms}
            disabled={loading || emailData.destinatarios.filter(e => e.trim() !== '').length === 0}
            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
            sx={{ 
              bgcolor: '#25D366', 
              '&:hover': { bgcolor: '#1DA851' }
            }}
          >
            {loading ? 'Enviando...' : 'Enviar Reporte'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ minWidth: 300 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default InventoryManagementSystem;