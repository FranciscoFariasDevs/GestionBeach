// src/pages/EstadoResultados/IngresoGastosPage.jsx
// Pantalla para personas con permiso de INGRESAR GASTOS
// Permite cargar datos del período, ingresar gastos operativos, guardar borrador y enviar al sistema
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardHeader,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  useTheme,
  Fade,
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
  alpha,
  Stack,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useSnackbar } from 'notistack';
import api from '../../api/api';
import WeatherBar from '../../components/WeatherBar';
import DynamicExpenseSection from '../../components/DynamicExpenseSection.jsx';
import {
  obtenerRangoDeFechas,
  formatCurrency
} from './utils';

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

const IngresoGastosPage = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedSucursal, setSelectedSucursal] = useState('');
  const [selectedRazonSocial, setSelectedRazonSocial] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [sucursalesDisponibles, setSucursalesDisponibles] = useState([]);
  const [razonesSocialesDisponibles, setRazonesSocialesDisponibles] = useState([]);

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

  const loadComprasData = async () => {
    try {
      const { fechaDesde, fechaHasta } = obtenerRangoDeFechas(selectedMonth);
      const comprasResponse = await api.get('/estado-resultados/compras', {
        params: {
          fecha_desde: fechaDesde,
          fecha_hasta: fechaHasta,
          sucursal_id: selectedSucursal,
          razon_social_id: selectedRazonSocial === 'todos' ? 'todos' : selectedRazonSocial
        }
      });
      if (comprasResponse.data.success) {
        const { resumen } = comprasResponse.data.data;
        return { data: comprasResponse.data.data.compras, total: resumen.total_compras, cantidad: resumen.cantidad_facturas };
      }
      return { data: [], total: 0, cantidad: 0 };
    } catch (error) {
      try {
        const { fechaDesde, fechaHasta } = obtenerRangoDeFechas(selectedMonth);
        const comprasResponse = await api.get('/facturas-xml', {
          params: { fecha_desde: fechaDesde, fecha_hasta: fechaHasta, estado: 'PROCESADA', page: 1, limit: 1000 }
        });
        let comprasData = [];
        if (comprasResponse?.data?.success && Array.isArray(comprasResponse.data.data)) {
          comprasData = comprasResponse.data.data.filter(f => {
            const s = f.id_sucursal || f.sucursal_id;
            return s && s.toString() === selectedSucursal.toString();
          });
        }
        const total = comprasData.reduce((sum, f) => sum + (Number(f.monto_total || 0)), 0);
        return { data: comprasData, total, cantidad: comprasData.length };
      } catch {
        return { data: [], total: 0, cantidad: 0 };
      }
    }
  };

  const loadRemuneracionesData = async () => {
    try {
      const mesSeleccionado = selectedMonth.getMonth() + 1;
      const anioSeleccionado = selectedMonth.getFullYear();
      const remuneracionesResponse = await api.get('/estado-resultados/remuneraciones', {
        params: {
          anio: anioSeleccionado,
          mes: mesSeleccionado,
          sucursal_id: selectedSucursal,
          razon_social_id: selectedRazonSocial === 'todos' ? 'todos' : selectedRazonSocial
        }
      });
      if (remuneracionesResponse.data.success) {
        const { resumen, porcentajes_aplicados } = remuneracionesResponse.data.data;
        const totalCargoAdmin = resumen.administrativos?.total_cargo || 0;
        const totalCargoVentas = resumen.ventas?.total_cargo || 0;
        const totalCargo = resumen.total_cargo || (totalCargoAdmin + totalCargoVentas);
        return {
          data: remuneracionesResponse.data.data.remuneraciones,
          total: totalCargo,
          total_cargo: totalCargo,
          seguros_cesantia: 0,
          cantidad: resumen.cantidad_empleados || 0,
          resumen,
          porcentajes_aplicados
        };
      }
      return { data: [], total: 0, total_cargo: 0, seguros_cesantia: 0, cantidad: 0, resumen: null, porcentajes_aplicados: null };
    } catch {
      return { data: [], total: 0, total_cargo: 0, seguros_cesantia: 0, cantidad: 0, resumen: null, porcentajes_aplicados: null };
    }
  };

  const loadVentasData = async () => {
    try {
      const { fechaDesde, fechaHasta } = obtenerRangoDeFechas(selectedMonth);
      const ventasBody = {
        sucursal_id: parseInt(selectedSucursal),
        razon_social_id: selectedRazonSocial && selectedRazonSocial !== 'todos' ? parseInt(selectedRazonSocial) : null,
        start_date: fechaDesde,
        end_date: fechaHasta
      };
      const ventasResponse = await api.post('/ventas', ventasBody);
      let ventasData = [];
      let totalVentas = 0;
      if (ventasResponse?.data?.success && Array.isArray(ventasResponse.data.ventas)) {
        ventasData = ventasResponse.data.ventas;
        totalVentas = ventasData.reduce((sum, v) => sum + Number(v.Total || v.total || v.monto_total || v.valor_total || 0), 0);
      } else if (Array.isArray(ventasResponse?.data?.ventas)) {
        ventasData = ventasResponse.data.ventas;
        totalVentas = ventasData.reduce((sum, v) => sum + Number(v.Total || v.total || v.monto_total || v.valor_total || 0), 0);
      }
      return { data: ventasData, total: totalVentas };
    } catch {
      return { data: [], total: 0 };
    }
  };

  const loadCostosVenta = async () => {
    try {
      const { fechaDesde, fechaHasta } = obtenerRangoDeFechas(selectedMonth);
      const dashboardResponse = await api.get(`/dashboard?startDate=${fechaDesde}&endDate=${fechaHasta}`);
      if (dashboardResponse?.data) {
        const d = dashboardResponse.data;
        const sucursalNombre = sucursalesDisponibles.find(s => s.id.toString() === selectedSucursal)?.nombre || '';
        let costos = 0, utilidad = 0;
        ['supermercados', 'ferreterias', 'multitiendas'].forEach(cat => {
          if (d[cat]?.sucursales) {
            const suc = d[cat].sucursales.find(s =>
              s.nombre?.toLowerCase().includes(sucursalNombre.toLowerCase()) ||
              sucursalNombre.toLowerCase().includes(s.nombre?.toLowerCase())
            );
            if (suc) { costos = suc.costos || 0; utilidad = suc.utilidad || 0; }
          }
        });
        return { costos, utilidad };
      }
      return { costos: 0, utilidad: 0 };
    } catch {
      return { costos: 0, utilidad: 0 };
    }
  };

  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);
      let sucursalesCargadas = false;
      try {
        const res = await api.get('/facturas-xml/lista/sucursales');
        if (res.data.success && Array.isArray(res.data.data)) {
          setSucursalesDisponibles(res.data.data);
          if (res.data.data.length > 0) setSelectedSucursal(res.data.data[0].id.toString());
          sucursalesCargadas = true;
        }
      } catch {}
      if (!sucursalesCargadas) {
        try {
          const res = await api.get('/sucursales');
          if (Array.isArray(res.data)) {
            setSucursalesDisponibles(res.data);
            if (res.data.length > 0) setSelectedSucursal(res.data[0].id.toString());
            sucursalesCargadas = true;
          }
        } catch {}
      }
      if (!sucursalesCargadas) {
        setSucursalesDisponibles([{ id: 1, nombre: 'Sucursal Principal' }]);
        setSelectedSucursal('1');
      }
      try {
        const res = await api.get('/razonessociales');
        const list = Array.isArray(res.data) ? res.data : (res.data.success ? res.data.data : []);
        setRazonesSocialesDisponibles([{ id: 'todos', nombre_razon: 'Todas las Razones Sociales' }, ...list]);
        setSelectedRazonSocial('todos');
      } catch {
        setRazonesSocialesDisponibles([{ id: 'todos', nombre_razon: 'Todas las Razones Sociales' }]);
        setSelectedRazonSocial('todos');
      }

    } catch {
      enqueueSnackbar('Error al cargar configuración inicial', { variant: 'warning' });
      setSucursalesDisponibles([{ id: 1, nombre: 'Sucursal Principal' }]);
      setSelectedSucursal('1');
    } finally {
      setLoading(false);
    }
  };

  const loadResultadosData = async () => {
    if (!selectedSucursal) return;
    setLoading(true);
    setLoadingStep('');
    setLoadingProgress(0);
    setError(null);
    const sucursalNombreCarga = sucursalesDisponibles.find(s => s.id?.toString() === selectedSucursal)?.nombre || `sucursal #${selectedSucursal}`;
    try {
      setLoadingStep(`Cargando ventas de ${sucursalNombreCarga}…`);
      setLoadingProgress(10);
      const [comprasResult, remuneracionesResult, ventasResult, costosResult] = await Promise.allSettled([
        loadComprasData().then(r => { setLoadingStep(`Cargando compras de ${sucursalNombreCarga}…`); setLoadingProgress(35); return r; }),
        loadRemuneracionesData().then(r => { setLoadingStep(`Cargando remuneraciones de ${sucursalNombreCarga}…`); setLoadingProgress(60); return r; }),
        loadVentasData().then(r => { setLoadingStep(`Calculando costos de ${sucursalNombreCarga}…`); setLoadingProgress(80); return r; }),
        loadCostosVenta(),
      ]).then(results => results.map((r, i) => r.status === 'fulfilled' ? r.value : [
        { data: [], total: 0, cantidad: 0 },
        { data: [], total: 0, total_cargo: 0, cantidad: 0, resumen: null },
        { data: [], total: 0 },
        { costos: 0, utilidad: 0 },
      ][i]));

      let estadoResultados = construirEstadoResultados({ compras: comprasResult, remuneraciones: remuneracionesResult, ventas: ventasResult, costos: costosResult });

      // Restaurar gastos manuales guardados previamente para este período
      try {
        const mes = selectedMonth.getMonth() + 1;
        const anio = selectedMonth.getFullYear();
        const savedRes = await api.get('/estado-resultados', { params: { anio, mes, sucursal_id: selectedSucursal } });
        if (savedRes.data.success && savedRes.data.data.length > 0) {
          const rec = savedRes.data.data[0];
          estadoResultados.id = rec.id;
          estadoResultados.estado = rec.estado;
          const ga = estadoResultados.gastosOperativos.gastosAdministrativos;
          const gv = estadoResultados.gastosOperativos.gastosVenta;
          ga.seguros        = Number(rec.gastos_admin_seguros) || 0;
          ga.gastosComunes  = Number(rec.gastos_admin_gastos_comunes) || 0;
          ga.electricidad   = Number(rec.gastos_admin_electricidad) || 0;
          ga.agua           = Number(rec.gastos_admin_agua) || 0;
          ga.telefonia      = Number(rec.gastos_admin_telefonia) || 0;
          ga.alarma         = Number(rec.gastos_admin_alarma) || 0;
          ga.internet       = Number(rec.gastos_admin_internet) || 0;
          ga.facturasNet    = Number(rec.gastos_admin_facturas_net) || 0;
          ga.transbank      = Number(rec.gastos_admin_transbank) || 0;
          ga.patenteMunicipal = Number(rec.gastos_admin_patente_municipal) || 0;
          ga.contribuciones = Number(rec.gastos_admin_contribuciones) || 0;
          ga.petroleo       = Number(rec.gastos_admin_petroleo) || 0;
          ga.otros          = Number(rec.gastos_admin_otros) || 0;
          gv.fletes         = Number(rec.gastos_venta_fletes) || 0;
          gv.finiquitos     = Number(rec.gastos_venta_finiquitos) || 0;
          gv.mantenciones   = Number(rec.gastos_venta_mantenciones) || 0;
          gv.publicidad     = Number(rec.gastos_venta_publicidad) || 0;
          estadoResultados.costos.mermaVenta           = Number(rec.merma_venta) || 0;
          estadoResultados.costoArriendo               = Number(rec.costo_arriendo) || 0;
          estadoResultados.ingresos.otrosIngresos.fletes = Number(rec.otros_ingresos_fletes) || 0;
          estadoResultados.otrosIngresosFinancieros    = Number(rec.otros_ingresos_financieros) || 0;
          const adminFields = ['seguros','gastosComunes','electricidad','agua','telefonia','alarma','internet','facturasNet','transbank','patenteMunicipal','contribuciones','petroleo','otros'];
          ga.total = adminFields.reduce((s, k) => s + (ga[k] || 0), 0) + ga.sueldos;
          const ventaFields = ['fletes','finiquitos','mantenciones','publicidad'];
          gv.total = ventaFields.reduce((s, k) => s + (gv[k] || 0), 0) + gv.sueldos;
          estadoResultados.gastosOperativos.totalGastosOperativos = ga.total + gv.total;
          estadoResultados.costos.totalCostos = estadoResultados.costos.costoVentas + estadoResultados.costos.mermaVenta;
          estadoResultados.ingresos.otrosIngresos.total = estadoResultados.ingresos.otrosIngresos.fletes;
          estadoResultados.ingresos.totalIngresos = estadoResultados.ingresos.ventas + estadoResultados.ingresos.otrosIngresos.total;
          estadoResultados.utilidadBruta = estadoResultados.ingresos.totalIngresos - estadoResultados.costos.totalCostos;
          estadoResultados.utilidadOperativa = estadoResultados.utilidadBruta - estadoResultados.gastosOperativos.totalGastosOperativos;
          estadoResultados.utilidadAntesImpuestos = estadoResultados.utilidadOperativa - estadoResultados.costoArriendo + estadoResultados.otrosIngresosFinancieros;
          estadoResultados.impuestos = Math.max(0, Math.round(estadoResultados.utilidadAntesImpuestos * 0.19));
          estadoResultados.utilidadNeta = estadoResultados.utilidadAntesImpuestos - estadoResultados.impuestos;
        }
      } catch {}

      setLoadingStep('Construyendo estado de resultados…');
      setLoadingProgress(95);
      setData(estadoResultados);
      initializeExpensesFromData(estadoResultados);
      setHasChanges(false);
      setLoadingProgress(100);
      const sucursalNombre = sucursalesDisponibles.find(s => s.id.toString() === selectedSucursal)?.nombre || selectedSucursal;
      if (ventasResult.total === 0 && comprasResult.total === 0 && remuneracionesResult.total === 0) {
        enqueueSnackbar(`Sin datos para ${sucursalNombre} en el período seleccionado`, { variant: 'info' });
      } else {
        enqueueSnackbar(`${sucursalNombre}: datos cargados correctamente`, { variant: 'success' });
      }
    } catch (err) {
      setError(`Error al cargar los datos de ${sucursalNombreCarga}: ${err.message}`);
      enqueueSnackbar(`Error al conectar con ${sucursalNombreCarga} — ${err.message || 'verifique la red'}`, { variant: 'error' });
      const estadoVacio = construirEstadoResultados({
        compras: { data: [], total: 0 },
        remuneraciones: { data: [], total: 0, total_cargo: 0, resumen: null },
        ventas: { data: [], total: 0 },
        costos: { costos: 0, utilidad: 0 }
      });
      setData(estadoVacio);
      initializeExpensesFromData(estadoVacio);
    } finally {
      setLoading(false);
      setLoadingStep('');
      setLoadingProgress(0);
    }
  };

  const construirEstadoResultados = ({ compras, remuneraciones, ventas, costos }) => {
    const sucursalSeleccionada = sucursalesDisponibles.find(s => s.id.toString() === selectedSucursal);
    const sueldosAdministrativos = remuneraciones.resumen?.administrativos?.total_cargo || 0;
    const sueldosVentas = remuneraciones.resumen?.ventas?.total_cargo || 0;
    const totalCargo = sueldosAdministrativos + sueldosVentas;
    const estadoResultados = {
      sucursal: sucursalSeleccionada?.nombre || 'Sucursal Desconocida',
      periodo: selectedMonth.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }),
      ingresos: { ventas: ventas.total || 0, otrosIngresos: { fletes: 0, total: 0 }, totalIngresos: ventas.total || 0 },
      costos: { costoVentas: costos?.costos || 0, compras: compras.total || 0, mermaVenta: 0, totalCostos: costos?.costos || 0 },
      utilidadBruta: (ventas.total || 0) - (costos?.costos || 0),
      gastosOperativos: {
        gastosVenta: { sueldos: sueldosVentas, fletes: 0, finiquitos: 0, mantenciones: 0, publicidad: 0, total: sueldosVentas },
        gastosAdministrativos: {
          sueldos: sueldosAdministrativos, seguros: 0, gastosComunes: 0, electricidad: 0, agua: 0,
          telefonia: 0, alarma: 0, internet: 0, facturasNet: 0, transbank: 0, patenteMunicipal: 0,
          contribuciones: 0, petroleo: 0, otros: 0, total: sueldosAdministrativos
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
        periodo: { mes: selectedMonth.getMonth() + 1, año: selectedMonth.getFullYear() },
        detalleRemuneraciones: remuneraciones.resumen || null,
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
    return estadoResultados;
  };

  const initializeExpensesFromData = (data) => {
    const adminKeys = ['seguros', 'gastosComunes', 'electricidad', 'agua', 'telefonia', 'alarma', 'internet', 'facturasNet', 'transbank', 'patenteMunicipal', 'contribuciones', 'petroleo', 'otros'];
    const adminExpenses = adminKeys.filter(k => data.gastosOperativos.gastosAdministrativos[k] > 0).map(k => ({
      id: k, label: getExpenseLabel('administrativos', k), amount: data.gastosOperativos.gastosAdministrativos[k]
    }));
    const ventaKeys = ['fletes', 'finiquitos', 'mantenciones', 'publicidad'];
    const ventaExpenses = ventaKeys.filter(k => data.gastosOperativos.gastosVenta[k] > 0).map(k => ({
      id: k, label: getExpenseLabel('venta', k), amount: data.gastosOperativos.gastosVenta[k]
    }));
    const otrosExpensesList = [];
    if (data.costos.mermaVenta > 0) otrosExpensesList.push({ id: 'mermaVenta', label: 'Merma Venta', amount: data.costos.mermaVenta });
    if (data.costoArriendo > 0) otrosExpensesList.push({ id: 'costoArriendo', label: 'Costo de Arriendo', amount: data.costoArriendo });
    if (data.ingresos.otrosIngresos.fletes > 0) otrosExpensesList.push({ id: 'ingresoFletes', label: 'Ingresos por Fletes', amount: data.ingresos.otrosIngresos.fletes });
    if (data.otrosIngresosFinancieros > 0) otrosExpensesList.push({ id: 'otrosIngresos', label: 'Otros Ingresos Financieros', amount: data.otrosIngresosFinancieros });
    setGastosAdministrativos(adminExpenses);
    setGastosVenta(ventaExpenses);
    setOtrosGastos(otrosExpensesList);
  };

  const getExpenseLabel = (category, id) => {
    const catalog = {
      administrativos: [
        { id: 'seguros', label: 'Seguros' }, { id: 'gastosComunes', label: 'Gastos Comunes' },
        { id: 'electricidad', label: 'Electricidad' }, { id: 'agua', label: 'Agua' },
        { id: 'telefonia', label: 'Telefonía Celular' }, { id: 'alarma', label: 'Alarma' },
        { id: 'internet', label: 'Internet' }, { id: 'facturasNet', label: 'Facturas Net' },
        { id: 'transbank', label: 'Transbank' }, { id: 'patenteMunicipal', label: 'Patente Municipal' },
        { id: 'contribuciones', label: 'Contribuciones' }, { id: 'petroleo', label: 'Petróleo' },
        { id: 'otros', label: 'Otros Gastos' },
      ],
      venta: [
        { id: 'fletes', label: 'Costo por Fletes' }, { id: 'finiquitos', label: 'Finiquitos' },
        { id: 'mantenciones', label: 'Mantenciones' }, { id: 'publicidad', label: 'Publicidad' },
      ],
      otros: [
        { id: 'mermaVenta', label: 'Merma Venta' }, { id: 'costoArriendo', label: 'Costo de Arriendo' },
        { id: 'ingresoFletes', label: 'Ingresos por Fletes' }, { id: 'otrosIngresos', label: 'Otros Ingresos Financieros' },
      ]
    };
    const found = catalog[category]?.find(item => item.id === id);
    return found ? found.label : id;
  };

  const updateDataFromExpenses = () => {
    if (!data) {
      enqueueSnackbar('No hay datos cargados para actualizar', { variant: 'warning' });
      return null;
    }
    const newData = JSON.parse(JSON.stringify(data));
    const adminFields = ['seguros', 'gastosComunes', 'electricidad', 'agua', 'telefonia', 'alarma', 'internet', 'facturasNet', 'transbank', 'patenteMunicipal', 'contribuciones', 'petroleo', 'otros'];
    adminFields.forEach(f => { newData.gastosOperativos.gastosAdministrativos[f] = 0; });
    const ventaFields = ['fletes', 'finiquitos', 'mantenciones', 'publicidad'];
    ventaFields.forEach(f => { newData.gastosOperativos.gastosVenta[f] = 0; });
    gastosAdministrativos.forEach(e => {
      if (adminFields.includes(e.id)) newData.gastosOperativos.gastosAdministrativos[e.id] = Number(e.amount) || 0;
    });
    gastosVenta.forEach(e => {
      if (ventaFields.includes(e.id)) newData.gastosOperativos.gastosVenta[e.id] = Number(e.amount) || 0;
    });
    otrosGastos.forEach(e => {
      if (e.id === 'mermaVenta') newData.costos.mermaVenta = Number(e.amount) || 0;
      else if (e.id === 'costoArriendo') newData.costoArriendo = Number(e.amount) || 0;
      else if (e.id === 'ingresoFletes') newData.ingresos.otrosIngresos.fletes = Number(e.amount) || 0;
      else if (e.id === 'otrosIngresos') newData.otrosIngresosFinancieros = Number(e.amount) || 0;
    });
    newData.gastosOperativos.gastosAdministrativos.total =
      adminFields.reduce((sum, k) => sum + (Number(newData.gastosOperativos.gastosAdministrativos[k]) || 0), 0) +
      (Number(newData.gastosOperativos.gastosAdministrativos.sueldos) || 0);
    newData.gastosOperativos.gastosVenta.total =
      ventaFields.reduce((sum, k) => sum + (Number(newData.gastosOperativos.gastosVenta[k]) || 0), 0) +
      (Number(newData.gastosOperativos.gastosVenta.sueldos) || 0);
    newData.gastosOperativos.totalGastosOperativos =
      newData.gastosOperativos.gastosAdministrativos.total + newData.gastosOperativos.gastosVenta.total;
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

  const handleAddGastoAdministrativo = (expense) => { setGastosAdministrativos([...gastosAdministrativos, expense]); setHasChanges(true); };
  const handleUpdateGastoAdministrativo = (expense) => { setGastosAdministrativos(gastosAdministrativos.map(e => e.id === expense.id ? expense : e)); setHasChanges(true); };
  const handleRemoveGastoAdministrativo = (expense) => { setGastosAdministrativos(gastosAdministrativos.filter(e => e.id !== expense.id)); setHasChanges(true); };
  const handleAddGastoVenta = (expense) => { setGastosVenta([...gastosVenta, expense]); setHasChanges(true); };
  const handleUpdateGastoVenta = (expense) => { setGastosVenta(gastosVenta.map(e => e.id === expense.id ? expense : e)); setHasChanges(true); };
  const handleRemoveGastoVenta = (expense) => { setGastosVenta(gastosVenta.filter(e => e.id !== expense.id)); setHasChanges(true); };
  const handleAddOtroGasto = (expense) => { setOtrosGastos([...otrosGastos, expense]); setHasChanges(true); };
  const handleUpdateOtroGasto = (expense) => { setOtrosGastos(otrosGastos.map(e => e.id === expense.id ? expense : e)); setHasChanges(true); };
  const handleRemoveOtroGasto = (expense) => { setOtrosGastos(otrosGastos.filter(e => e.id !== expense.id)); setHasChanges(true); };
  const handleTabChange = (event, newValue) => { setTabValue(newValue); };

  useEffect(() => {
    if (data && hasChanges) {
      const updatedData = updateDataFromExpenses();
      if (updatedData) setData(updatedData);
    }
  }, [gastosAdministrativos, gastosVenta, otrosGastos, hasChanges]);

  const handleSaveResultados = async () => {
    setLoading(true);
    const updatedData = updateDataFromExpenses();
    if (!updatedData) { setLoading(false); return; }
    try {
      const payload = { data: updatedData, usuario: 'Usuario' };
      let response;
      if (updatedData.id) {
        response = await api.put(`/estado-resultados/${updatedData.id}`, payload);
      } else {
        response = await api.post('/estado-resultados', payload);
      }
      if (response.data.success) {
        const newData = { ...updatedData, estado: "guardado", id: response.data.data?.id || updatedData.id };
        setData(newData);
        setHasChanges(false);
        enqueueSnackbar('Estado de resultados guardado como borrador', { variant: 'success' });
      } else {
        throw new Error(response.data.message || 'Error al guardar');
      }
    } catch (error) {
      enqueueSnackbar(`Error al guardar: ${error.response?.data?.message || error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendResultados = () => {
    setConfirmDialog({
      open: true,
      title: "Confirmar Envío al Sistema",
      message: "Una vez enviado, no podrá modificar los datos. ¿Está seguro de que desea enviar el estado de resultados al sistema?",
      onConfirm: async () => {
        setLoading(true);
        const updatedData = updateDataFromExpenses();
        if (!updatedData) { setLoading(false); return; }
        try {
          if (hasChanges || !updatedData.id) {
            const payload = { data: updatedData, usuario: 'Usuario' };
            let saveResponse;
            if (updatedData.id) {
              saveResponse = await api.put(`/estado-resultados/${updatedData.id}`, payload);
            } else {
              saveResponse = await api.post('/estado-resultados', payload);
            }
            if (!saveResponse.data.success) throw new Error('Error al guardar antes de enviar');
            updatedData.id = saveResponse.data.data?.id || updatedData.id;
          }
          if (!updatedData.id) throw new Error('No se pudo obtener el ID del estado de resultados');
          const enviarResponse = await api.post(`/estado-resultados/${updatedData.id}/enviar`, { usuario: 'Usuario' });
          if (enviarResponse.data.success) {
            const newData = { ...updatedData, estado: "enviado", fechaEnvio: new Date().toISOString() };
            setData(newData);
            setHasChanges(false);
            enqueueSnackbar('Estado de resultados enviado correctamente al sistema', { variant: 'success' });
          } else {
            throw new Error(enviarResponse.data.message || 'Error al enviar');
          }
        } catch (error) {
          enqueueSnackbar(`Error al enviar: ${error.response?.data?.message || error.message}`, { variant: 'error' });
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

  const StatusChip = () => {
    if (!data) return null;
    const config = {
      borrador: { label: 'Borrador', color: 'warning' },
      guardado: { label: 'Guardado', color: 'info' },
      enviado: { label: 'Enviado al Sistema', color: 'success' },
    };
    const { label, color } = config[data.estado] || { label: data.estado, color: 'default' };
    return <Chip label={label} color={color} size="small" sx={{ fontWeight: 'bold' }} />;
  };


  const ConfirmDialog = () => (
    <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ ...confirmDialog, open: false })} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight="bold">{confirmDialog.title}</Typography>
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: 'text.primary' }}>{confirmDialog.message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button
          onClick={() => { confirmDialog.onConfirm(); setConfirmDialog({ ...confirmDialog, open: false }); }}
          variant="contained" sx={{ textTransform: 'none', borderRadius: 2 }} autoFocus
        >
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box sx={{ position: 'relative', minHeight: '100vh' }}>
      <WeatherBar />
      {/* Barra de progreso superior — visible cuando recarga con datos ya presentes */}
      {loading && data && (
        <Box sx={{ position: 'sticky', top: 0, zIndex: 1200 }}>
          <LinearProgress
            variant={loadingProgress > 0 ? 'determinate' : 'indeterminate'}
            value={loadingProgress}
            sx={{ height: 3 }}
          />
          {loadingStep && (
            <Box sx={{ bgcolor: 'primary.main', px: 2, py: 0.5 }}>
              <Typography variant="caption" color="white">
                {loadingStep}
              </Typography>
            </Box>
          )}
        </Box>
      )}
      <Box sx={{ py: 4, mt: 4 }}>

        {/* Header */}
        <Fade in>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AddCircleOutlineIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h4" component="h1" fontWeight="bold">
                    Ingreso de Gastos
                  </Typography>
                  <Typography variant="subtitle1" color="textSecondary">
                    Cargue los datos del período, ingrese gastos y envíe al sistema
                  </Typography>
                </Box>
              </Box>
              {data && (
                <Chip
                  label={`${data.sucursal} — ${data.periodo}`}
                  variant="outlined"
                  color="primary"
                  sx={{ fontWeight: 'medium' }}
                />
              )}
            </Box>
          </Box>
        </Fade>

        {/* Filtros */}
        <Fade in>
          <Paper elevation={2} sx={{
            p: 3, mb: 4, borderRadius: 3,
            background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[50]} 100%)`,
            border: `1px solid ${theme.palette.divider}`,
          }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Seleccionar Período y Sucursal</Typography>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} sm={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                  <DatePicker
                    label="Período"
                    views={['year', 'month']}
                    value={selectedMonth}
                    onChange={(v) => setSelectedMonth(v)}
                    disabled={loading}
                    slotProps={{ textField: { fullWidth: true, size: "small", variant: "outlined", InputProps: { sx: { borderRadius: 2 } } } }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sucursal</InputLabel>
                  <Select value={selectedSucursal} label="Sucursal" onChange={(e) => setSelectedSucursal(e.target.value)} disabled={loading} sx={{ borderRadius: 2 }}>
                    {sucursalesDisponibles.map(s => <MenuItem key={s.id} value={s.id.toString()}>{s.nombre}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Razón Social</InputLabel>
                  <Select value={selectedRazonSocial} label="Razón Social" onChange={(e) => setSelectedRazonSocial(e.target.value)} disabled={loading} sx={{ borderRadius: 2 }}>
                    {razonesSocialesDisponibles.map(r => <MenuItem key={r.id} value={r.id.toString()}>{r.nombre_razon}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Button
                  variant="contained" fullWidth onClick={handleConfirmNewQuery}
                  disabled={loading || !selectedSucursal}
                  startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                  sx={{
                    py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 'bold',
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    boxShadow: `0 4px 20px ${theme.palette.primary.main}25`
                  }}
                >
                  {loading ? 'Cargando...' : 'Cargar Datos'}
                </Button>
              </Grid>
            </Grid>
            {loading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress sx={{ borderRadius: 1, height: 6 }} />
              </Box>
            )}
          </Paper>
        </Fade>

        {error && (
          <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }}>{error}</Alert>
        )}

        {loading && !data && (
          <Box py={8} px={2}>
            <Box display="flex" flexDirection="column" alignItems="center" gap={3}>
              <CircularProgress size={48} />
              {loadingStep && (
                <Box sx={{ width: '100%', maxWidth: 420 }}>
                  <LinearProgress
                    variant="determinate"
                    value={loadingProgress}
                    sx={{ height: 6, borderRadius: 3, mb: 1.5 }}
                  />
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    {loadingStep}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {!data && !loading && (
          <Fade in>
            <Paper elevation={0} sx={{
              p: 6, textAlign: 'center', borderRadius: 3,
              border: `2px dashed ${theme.palette.divider}`,
              background: alpha(theme.palette.primary.main, 0.02)
            }}>
              <EditIcon sx={{ fontSize: 64, color: theme.palette.text.disabled, mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Seleccione un período y sucursal para comenzar
              </Typography>
              <Typography variant="body2" color="text.disabled">
                Los datos de ventas, compras y remuneraciones se cargarán automáticamente
              </Typography>
            </Paper>
          </Fade>
        )}

        {data && (
          <>
            {/* Barra de resumen del sistema */}
            <Paper elevation={1} sx={{ p: 2.5, mb: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" gap={1}>
                <Typography variant="subtitle2" color="textSecondary" sx={{ fontWeight: 600 }}>
                  Sistema ({data.sucursal}):
                </Typography>
                <Chip label={`Ventas ${formatCurrency(data.ingresos.ventas)}`} color="success" size="small" />
                <Chip label={`Compras ${formatCurrency(data.datosOriginales?.totalCompras || 0)}`} color="info" size="small" />
                <Chip
                  label={`Sueldos ${formatCurrency((data.gastosOperativos?.gastosAdministrativos?.sueldos || 0) + (data.gastosOperativos?.gastosVenta?.sueldos || 0))}`}
                  color="warning" size="small"
                />
                <Box sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center' }}>
                  <StatusChip />
                  {hasChanges && <Chip label="Cambios sin guardar" color="warning" variant="outlined" size="small" />}
                </Box>
              </Stack>
            </Paper>

            {/* Sección de ingreso de gastos (ancho completo) */}
            <Card sx={{
              borderRadius: 3,
              boxShadow: `0 8px 32px ${theme.palette.grey[500]}15`,
              background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[50]} 100%)`,
            }}>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EditIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight="bold">Gestión de Gastos e Ingresos</Typography>
                  </Box>
                }
                subheader="Ingrese los gastos variables y otros ingresos del período"
                sx={{ backgroundColor: 'transparent', borderBottom: `1px solid ${theme.palette.divider}`, pb: 2 }}
              />
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth" sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 'medium', minHeight: 60 } }}>
                  <Tab label="Gastos Admin." />
                  <Tab label="Gastos Venta" />
                  <Tab label="Otros" />
                </Tabs>
              </Box>
              <TabPanel value={tabValue} index={0}>
                <Box sx={{ p: 3 }}>
                  <DynamicExpenseSection
                    category="administrativos" title="Gastos Administrativos"
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
                    category="venta" title="Gastos de Venta"
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
                    category="otros" title="Otros Gastos e Ingresos"
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

            {/* Botones de acción */}
            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={handleSaveResultados}
                disabled={loading || data.estado === "enviado" || !hasChanges}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'medium' }}
              >
                Guardar Borrador
              </Button>
              <Button
                variant="contained"
                startIcon={data.estado === "enviado" ? <CheckCircleIcon /> : <SendIcon />}
                onClick={handleSendResultados}
                disabled={loading || data.estado === "enviado"}
                color={data.estado === "enviado" ? "success" : "primary"}
                sx={{
                  borderRadius: 2, textTransform: 'none', fontWeight: 'medium',
                  background: data.estado === "enviado" ? undefined : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  boxShadow: `0 4px 20px ${theme.palette.primary.main}25`
                }}
              >
                {data.estado === "enviado" ? "Enviado al Sistema" : "Enviar al Sistema"}
              </Button>
            </Box>
          </>
        )}

        <ConfirmDialog />
      </Box>
    </Box>
  );
};

export default IngresoGastosPage;
