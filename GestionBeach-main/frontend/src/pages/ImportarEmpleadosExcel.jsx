// ImportarEmpleadosExcel.jsx - VERSIÓN CORREGIDA PARA BD REAL CON SUELDO_BASE DECIMAL - COMPLETA
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  Select,
  MenuItem,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Alert,
  AlertTitle,
  CircularProgress,
  Chip,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  InputLabel,
  FormHelperText,
  Grid
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  TouchApp as TouchAppIcon,
  Business as BusinessIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Assignment as AssignmentIcon,
  Groups as GroupsIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { styled } from '@mui/material/styles';
import api from '../api/api';

// Estilos personalizados
const DropZone = styled(Box)(({ theme, isDragging }) => ({
  border: `2px dashed ${isDragging ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(6),
  textAlign: 'center',
  cursor: 'pointer',
  backgroundColor: isDragging ? 'rgba(243, 125, 22, 0.1)' : theme.palette.background.paper,
  transition: 'all 0.3s ease',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: 'rgba(243, 125, 22, 0.05)'
  }
}));

// Pasos del proceso de importación
const steps = ['Cargar archivo', 'Mapear campos', 'Revisar datos', 'Importar'];

// MAPEO DE SUCURSALES ACTUALIZADO - EXCEL -> NOMBRE REAL
const MAPEO_SUCURSALES = {
  'FERRETERIA BEACH MARKET': 'VICENTE PALACIOS 2908, TOME',
  'FERRETERIA COELEMU BEACH': 'TRES ESQUINAS S/N, COELEMU FE',
  'FERRETERIA CHILLAN': 'RIO VIEJO 999, CHILLAN',
  'FERRETERIA COELEMU': 'TRES ESQUINAS S/N, COELEMU FE',
  'FERRETERIA TOME CENTRO': 'LAS CAMELIAS 39, TOME',
  'MULTITIENDA TOME BEACH': 'VICENTE PALACIOS 3088, TOME',
  'FERRETERIA QUIRIHUE': 'RUTA EL CONQUISTADOR 1002, QUIRIHUE',
  'SUPER COELEMU': 'TRES ESQUINAS S/N, COELEMU MU',
  'SUPER ENRIQUE MOLINA': 'ENRIQUE MOLINA 596, TOME',
  'SUPER LORD COCHRANE': 'LORD COCHRANE 1127,TOME',
  'FERRETERIA DICHATO': 'DANIEL VERA 876, DICHATO',
  'MINIMARKET': 'DANIEL VERA 890, DICHATO',
  'PANADERIA': 'DANIEL VERA 891, DICHATO',
  'RANGUELMO': 'LOS CIPRESES 77, RANGUELMO'
};

// CAMPOS REALES DE LA BASE DE DATOS SEGÚN EL ESQUEMA PROPORCIONADO
const camposEmpleado = [
  // CAMPOS OBLIGATORIOS
  { id: 'rut', nombre: 'RUT', requerido: true, descripcion: 'RUT del empleado' },
  { id: 'nombre', nombre: 'NOMBRE', requerido: true, descripcion: 'Nombre del empleado' },
  { id: 'apellido_paterno', nombre: 'A. PATERNO', requerido: true, descripcion: 'Apellido paterno' },
  
  // CAMPOS OPCIONALES - DATOS PERSONALES
  { id: 'apellido_materno', nombre: 'A. MATERNO', requerido: false, descripcion: 'Apellido materno' },
  { id: 'codigo', nombre: 'CODIGO', requerido: false, descripcion: 'Código del empleado' },
  { id: 'fecha_nacimiento', nombre: 'FECHA NAC.', requerido: false, descripcion: 'Fecha de nacimiento' },
  { id: 'sexo', nombre: 'SEXO', requerido: false, descripcion: 'Sexo (M/F)' },
  { id: 'estado_civil', nombre: 'ESTADO CIVIL', requerido: false, descripcion: 'Estado civil' },
  { id: 'nacionalidad', nombre: 'NACIONALIDAD', requerido: false, descripcion: 'Nacionalidad' },
  { id: 'direccion', nombre: 'DIRECCION', requerido: false, descripcion: 'Dirección residencial' },
  { id: 'telefono', nombre: 'TELEFONO', requerido: false, descripcion: 'Teléfono de contacto' },
  { id: 'email', nombre: 'EMAIL', requerido: false, descripcion: 'Correo electrónico' },
  { id: 'persona_discapacidad', nombre: 'PERSONA CON DISCAPACIDAD', requerido: false, descripcion: 'Tiene discapacidad (Si/No)' },
  
  // CAMPOS LABORALES
  { id: 'fecha_ingreso', nombre: 'FECHA INGRESO', requerido: false, descripcion: 'Fecha de ingreso' },
  { id: 'fecha_termino', nombre: 'FECHA TERMINO', requerido: false, descripcion: 'Fecha de término' },
  { id: 'estado_contrato', nombre: 'ESTADO CONTRATO', requerido: false, descripcion: 'Estado del contrato' },
  { id: 'tipo_contrato', nombre: 'TIPO DE CONTRATO', requerido: false, descripcion: 'Tipo de contrato' },
  { id: 'cod_departamento', nombre: 'COD. DEPARTAMENTO', requerido: false, descripcion: 'Código del departamento' },
  { id: 'desc_departamento', nombre: 'DESC. DEPARTAMENTO', requerido: false, descripcion: 'Descripción departamento' },
  { id: 'cargo', nombre: 'CARGO', requerido: false, descripcion: 'Cargo o puesto' },
  { id: 'establecimiento', nombre: 'ESTABLECIMIENTO', requerido: false, descripcion: 'Establecimiento/Sucursal' },
  { id: 'tipo_jornada', nombre: 'TIPO DE JORNADA', requerido: false, descripcion: 'Tipo de jornada laboral' },
  { id: 'horas_semanales_pactadas', nombre: 'HORAS SEMANALES PACTADAS', requerido: false, descripcion: 'Horas semanales pactadas' },
  
  // CAMPOS DE REMUNERACIÓN
  { id: 'afecto_ajuste', nombre: 'AFECTO AJUSTE', requerido: false, descripcion: 'Afecto a ajuste' },
  { id: 'sueldo_base', nombre: 'SUELDO BASE', requerido: false, descripcion: 'Sueldo base' },
  { id: 'afecto_benef_semana_corrida', nombre: 'AFECTO BENEF. SEMANA CORRIDA', requerido: false, descripcion: 'Afecto beneficio semana corrida' },
  { id: 'dia_inicio_periodo', nombre: 'DIA INICIO PERIODO', requerido: false, descripcion: 'Día inicio período' },
  { id: 'dias_trabajados_semana', nombre: 'DIAS TRABAJADOS POR SEMANA', requerido: false, descripcion: 'Días trabajados por semana' },
  { id: 'dia_inicio_semana', nombre: 'DIA INICIO SEMANA', requerido: false, descripcion: 'Día inicio semana' },
  { id: 'dia_descanso_convencional', nombre: 'DIA DESCANSO CONVENCIONAL', requerido: false, descripcion: 'Día descanso convencional' },
  { id: 'tipo_sueldo_base', nombre: 'TIPO SUELDO BASE', requerido: false, descripcion: 'Tipo sueldo base' },
  { id: 'valor_sueldo_base', nombre: 'VALOR SUELDO BASE', requerido: false, descripcion: 'Valor sueldo base' },
  { id: 'comision_porcentaje', nombre: 'COMISION (%)', requerido: false, descripcion: 'Porcentaje de comisión' },
  { id: 'valor_hora', nombre: 'VALOR HORA', requerido: false, descripcion: 'Valor por hora' },
  { id: 'cantidad_horas', nombre: 'CANTIDAD DE HORAS', requerido: false, descripcion: 'Cantidad de horas' },
  { id: 'valor_dia', nombre: 'VALOR DIA', requerido: false, descripcion: 'Valor por día' },
  { id: 'cantidad_dias', nombre: 'CANTIDAD DE DIAS', requerido: false, descripcion: 'Cantidad de días' },
  { id: 'asig_zona_extrema', nombre: 'ASIG. ZONA EXTREMA', requerido: false, descripcion: 'Asignación zona extrema' },
  { id: 'gratificacion_legal', nombre: 'GRATIFICACION LEGAL', requerido: false, descripcion: 'Gratificación legal' },
  { id: 'porcentaje_gratif', nombre: 'PORCENTAJE GRATIF.', requerido: false, descripcion: 'Porcentaje gratificación' },
  
  // CAMPOS DE PREVISIÓN Y SALUD
  { id: 'prevision', nombre: 'PREVISION', requerido: false, descripcion: 'Sistema previsional' },
  { id: 'cotiz_especial', nombre: 'COTIZ. ESPECIAL', requerido: false, descripcion: 'Cotización especial' },
  { id: 'porcentaje_cotiz', nombre: 'PORCENTAJE COTIZ.', requerido: false, descripcion: 'Porcentaje cotización' },
  { id: 'tramo_asig_familiar', nombre: 'TRAMO ASIG. FAMILIAR', requerido: false, descripcion: 'Tramo asignación familiar' },
  { id: 'es_jubilado', nombre: 'ES JUBILADO', requerido: false, descripcion: 'Es jubilado (Si/No)' },
  { id: 'cargas_normales', nombre: 'CARGAS NORMALES', requerido: false, descripcion: 'Número de cargas normales' },
  { id: 'cargas_maternales', nombre: 'CARGAS MATERNALES', requerido: false, descripcion: 'Número de cargas maternales' },
  { id: 'cargas_invalidas', nombre: 'CARGAS INVALIDAS', requerido: false, descripcion: 'Número de cargas inválidas' },
  { id: 'seguro_cesantia', nombre: 'SEGURO CESANTIA', requerido: false, descripcion: 'Seguro de cesantía' },
  { id: 'afecto_seguro_accidentes', nombre: 'AFECTO SEGURO ACCIDENTES', requerido: false, descripcion: 'Afecto seguro accidentes' },
  { id: 'isapre', nombre: 'ISAPRE', requerido: false, descripcion: 'ISAPRE' },
  { id: 'tipo_pacto_isapre', nombre: 'TIPO PACTO ISAPRE', requerido: false, descripcion: 'Tipo pacto ISAPRE' },
  { id: 'monto_pactado', nombre: 'MONTO PACTADO', requerido: false, descripcion: 'Monto pactado ISAPRE' },
  { id: 'moneda', nombre: 'MONEDA', requerido: false, descripcion: 'Moneda' },
  { id: 'monto_ges', nombre: 'MONTO GES', requerido: false, descripcion: 'Monto GES' },
  { id: 'monto_ges_n', nombre: 'MONTO GES N°', requerido: false, descripcion: 'Monto GES número' },
  { id: 'cuenta_par', nombre: 'CUENTA PAR', requerido: false, descripcion: 'Número cuenta PAR' },
  { id: 'institucion_par', nombre: 'INSTITUCION PAR', requerido: false, descripcion: 'Institución PAR' },
  { id: 'moneda_par', nombre: 'MONEDA PAR', requerido: false, descripcion: 'Moneda PAR' },
  
  // CAMPOS APVI
  { id: 'aporte_apvi_1', nombre: 'APORTE APVI 1', requerido: false, descripcion: 'Aporte APVI 1' },
  { id: 'monto_aporte_apvi_1', nombre: 'MONTO APORTE APVI 1', requerido: false, descripcion: 'Monto aporte APVI 1' },
  { id: 'regimen_apvi_1', nombre: 'REGIMEN APVI 1', requerido: false, descripcion: 'Régimen APVI 1' },
  { id: 'forma_apvi_1', nombre: 'FORMA APVI 1', requerido: false, descripcion: 'Forma APVI 1' },
  { id: 'institucion_apvi_1', nombre: 'INSTITUCION APVI 1', requerido: false, descripcion: 'Institución APVI 1' },
  { id: 'inicio_apvi_1', nombre: 'INICIO APVI 1', requerido: false, descripcion: 'Inicio APVI 1' },
  { id: 'moneda_apvi_1', nombre: 'MONEDA APVI 1', requerido: false, descripcion: 'Moneda APVI 1' },
  
  { id: 'aporte_apvi_2', nombre: 'APORTE APVI 2', requerido: false, descripcion: 'Aporte APVI 2' },
  { id: 'monto_aporte_apvi_2', nombre: 'MONTO APORTE APVI 2', requerido: false, descripcion: 'Monto aporte APVI 2' },
  { id: 'regimen_apvi_2', nombre: 'REGIMEN APVI 2', requerido: false, descripcion: 'Régimen APVI 2' },
  { id: 'forma_apvi_2', nombre: 'FORMA APVI 2', requerido: false, descripcion: 'Forma APVI 2' },
  { id: 'institucion_apvi_2', nombre: 'INSTITUCION APVI 2', requerido: false, descripcion: 'Institución APVI 2' },
  { id: 'inicio_apvi_2', nombre: 'INICIO APVI 2', requerido: false, descripcion: 'Inicio APVI 2' },
  { id: 'moneda_apvi_2', nombre: 'MONEDA APVI 2', requerido: false, descripcion: 'Moneda APVI 2' },
  
  // CAMPOS APVC
  { id: 'aporte_apvc', nombre: 'APORTE APVC', requerido: false, descripcion: 'Aporte APVC' },
  { id: 'monto_aporte_apvc', nombre: 'MONTO APORTE APVC', requerido: false, descripcion: 'Monto aporte APVC' },
  { id: 'regimen_apvc', nombre: 'REGIMEN APVC', requerido: false, descripcion: 'Régimen APVC' },
  { id: 'forma_apvc', nombre: 'FORMA APVC', requerido: false, descripcion: 'Forma APVC' },
  { id: 'institucion_apvc', nombre: 'INSTITUCION APVC', requerido: false, descripcion: 'Institución APVC' },
  { id: 'inicio_apvc', nombre: 'INICIO APVC', requerido: false, descripcion: 'Inicio APVC' },
  
  // CAMPOS AFILIACIÓN VOLUNTARIA
  { id: 'rut_afil_vol', nombre: 'RUT AFIL. VOL.', requerido: false, descripcion: 'RUT afiliación voluntaria' },
  { id: 'nombre_afil_vol', nombre: 'NOMBRE AFIL. VOL.', requerido: false, descripcion: 'Nombre afiliación voluntaria' },
  { id: 'apellido_paterno_afil_vol', nombre: 'A. PATERNO AFIL. VOL.', requerido: false, descripcion: 'Apellido paterno afiliación voluntaria' },
  { id: 'apellido_materno_afil_vol', nombre: 'A. MATERNO AFIL. VOL.', requerido: false, descripcion: 'Apellido materno afiliación voluntaria' },
  { id: 'afp_afil_vol', nombre: 'AFP AFIL. VOL.', requerido: false, descripcion: 'AFP afiliación voluntaria' },
  { id: 'cotiz_afil_vol', nombre: 'COTIZ. AFIL VOL.', requerido: false, descripcion: 'Cotización afiliación voluntaria' },
  { id: 'inicio_afil_vol', nombre: 'INICIO AFIL. VOL.', requerido: false, descripcion: 'Inicio afiliación voluntaria' }
];

// Obtener los campos obligatorios
const camposRequeridos = camposEmpleado.filter(campo => campo.requerido).map(campo => campo.id);

// Función para mapear nombre de sucursal
const mapearSucursal = (nombreExcel) => {
  if (!nombreExcel) return null;
  
  const nombreLimpio = String(nombreExcel).trim().toUpperCase();
  
  // Buscar coincidencia exacta
  for (const [nombreOriginal, nombreMapeado] of Object.entries(MAPEO_SUCURSALES)) {
    if (nombreLimpio === nombreOriginal.toUpperCase()) {
      return nombreMapeado;
    }
  }
  
  // Buscar coincidencia parcial
  for (const [nombreOriginal, nombreMapeado] of Object.entries(MAPEO_SUCURSALES)) {
    if (nombreLimpio.includes(nombreOriginal.toUpperCase()) || nombreOriginal.toUpperCase().includes(nombreLimpio)) {
      return nombreMapeado;
    }
  }
  
  // Si no encuentra mapeo, retornar el valor original
  return nombreExcel;
};

// Componente principal ImportarEmpleadosExcel
const ImportarEmpleadosExcel = ({ open, handleClose, onImportComplete, sucursales = [] }) => {
  // Estados
  const [activeStep, setActiveStep] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [excelData, setExcelData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [mappings, setMappings] = useState({});
  const [loading, setLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });
  const [previewData, setPreviewData] = useState([]);
  const [datosEmpleados, setDatosEmpleados] = useState([]);

  // Efectos
  useEffect(() => {
    if (open) {
      resetState();
    }
  }, [open]);

  // Reiniciar todos los estados
  const resetState = () => {
    setActiveStep(0);
    setFile(null);
    setExcelData(null);
    setColumns([]);
    setMappings({});
    setLoading(false);
    setImportProgress(0);
    setAlert({ show: false, message: '', severity: 'info' });
    setPreviewData([]);
    setDatosEmpleados([]);
  };

  // Manejadores para cargar archivo
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processExcelFile(files[0]);
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      processExcelFile(files[0]);
    }
  };

  // Procesar archivo Excel
  const processExcelFile = (file) => {
    setLoading(true);
    setFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          blankrows: false,
          defval: '' 
        });
        
        if (jsonData.length < 1) {
          setAlert({
            show: true,
            message: 'El archivo no contiene datos para importar.',
            severity: 'error'
          });
          setLoading(false);
          return;
        }

        // Detectar encabezados
        let headerRowIndex = 0;
        while (headerRowIndex < Math.min(5, jsonData.length)) {
          const row = jsonData[headerRowIndex];
          if (row && row.length > 0 && row.filter(cell => cell && cell !== "").length > 1) {
            break;
          }
          headerRowIndex++;
        }
        
        if (headerRowIndex >= Math.min(5, jsonData.length)) {
          setAlert({
            show: true,
            message: 'No se pudieron detectar encabezados en las primeras filas del Excel.',
            severity: 'error'
          });
          setLoading(false);
          return;
        }
        
        const headers = jsonData[headerRowIndex].map(header => 
          header === "" ? `Columna_${Math.random().toString(36).substr(2, 5)}` : String(header)
        );
        
        const rows = jsonData.slice(headerRowIndex + 1).filter(row => 
          row.length > 0 && row.some(cell => cell !== "")
        );
        
        if (rows.length === 0) {
          setAlert({
            show: true,
            message: 'El archivo no contiene datos después de los encabezados.',
            severity: 'error'
          });
          setLoading(false);
          return;
        }
        
        const preview = rows.slice(0, 5).map(row => {
          const rowData = {};
          headers.forEach((header, index) => {
            rowData[header] = index < row.length && row[index] !== undefined ? row[index] : '';
          });
          return rowData;
        });

        const formattedData = rows.map(row => {
          const rowData = {};
          headers.forEach((header, index) => {
            rowData[header] = index < row.length && row[index] !== undefined ? row[index] : '';
          });
          return rowData;
        });

        setExcelData({ headers, rows: formattedData });
        setColumns(headers);
        setPreviewData(preview);

        // Auto-mapeo inteligente MEJORADO para los campos reales
        const autoMappings = {};
        headers.forEach(header => {
          autoMappings[header] = '';
        });

        headers.forEach(header => {
          const headerLower = String(header).toLowerCase().trim();
          
          camposEmpleado.forEach(campo => {
            const campoLower = campo.nombre.toLowerCase();
            const campoId = campo.id.toLowerCase();
            
            // Mapeo específico mejorado para campos reales
            if (
              (headerLower.includes('rut') && !headerLower.includes('afil') && campo.id === 'rut') ||
              (headerLower.includes('nombre') && !headerLower.includes('paterno') && !headerLower.includes('materno') && !headerLower.includes('afil') && campo.id === 'nombre') ||
              (headerLower.includes('paterno') && !headerLower.includes('afil') && campo.id === 'apellido_paterno') ||
              (headerLower.includes('materno') && !headerLower.includes('afil') && campo.id === 'apellido_materno') ||
              (headerLower.includes('codigo') && campo.id === 'codigo') ||
              (headerLower.includes('telefono') && campo.id === 'telefono') ||
              (headerLower.includes('direccion') && campo.id === 'direccion') ||
              (headerLower.includes('nacionalidad') && campo.id === 'nacionalidad') ||
              (headerLower.includes('email') && campo.id === 'email') ||
              (headerLower.includes('cargo') && campo.id === 'cargo') ||
              (headerLower.includes('sueldo') && headerLower.includes('base') && campo.id === 'sueldo_base') ||
              (headerLower.includes('establecimiento') && campo.id === 'establecimiento') ||
              (headerLower.includes('sucursal') && campo.id === 'establecimiento') ||
              (headerLower.includes('fecha') && headerLower.includes('nac') && campo.id === 'fecha_nacimiento') ||
              (headerLower.includes('fecha') && headerLower.includes('ingr') && campo.id === 'fecha_ingreso') ||
              (headerLower.includes('fecha') && headerLower.includes('term') && campo.id === 'fecha_termino') ||
              (headerLower.includes('estado') && headerLower.includes('civil') && campo.id === 'estado_civil') ||
              (headerLower.includes('estado') && headerLower.includes('contrato') && campo.id === 'estado_contrato') ||
              (headerLower.includes('tipo') && headerLower.includes('contrato') && campo.id === 'tipo_contrato') ||
              (headerLower.includes('sexo') && campo.id === 'sexo') ||
              (headerLower.includes('discapacidad') && campo.id === 'persona_discapacidad') ||
              (headerLower.includes('jornada') && campo.id === 'tipo_jornada') ||
              (headerLower.includes('horas') && headerLower.includes('semanales') && campo.id === 'horas_semanales_pactadas') ||
              (headerLower.includes('departamento') && headerLower.includes('cod') && campo.id === 'cod_departamento') ||
              (headerLower.includes('departamento') && headerLower.includes('desc') && campo.id === 'desc_departamento')
            ) {
              if (!Object.values(autoMappings).includes(campo.id)) {
                autoMappings[header] = campo.id;
              }
            }
          });
        });
        
        setMappings(autoMappings);
        setLoading(false);
        setActiveStep(1);
      } catch (error) {
        console.error('Error al procesar archivo Excel:', error);
        setAlert({
          show: true,
          message: 'Error al procesar el archivo. Asegúrese de que sea un archivo Excel válido.',
          severity: 'error'
        });
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Actualizar mapeo de un campo
  const handleMappingChange = (column, value) => {
    if (value && Object.values(mappings).includes(value)) {
      Object.keys(mappings).forEach(key => {
        if (mappings[key] === value && key !== column) {
          setMappings(prev => ({
            ...prev,
            [key]: ''
          }));
        }
      });
    }

    setMappings(prev => ({
      ...prev,
      [column]: value
    }));
  };

  // Verificar campos obligatorios mapeados
  const getMissingRequiredFields = () => {
    const mappedFields = Object.values(mappings);
    return camposRequeridos.filter(campo => !mappedFields.includes(campo))
      .map(campo => camposEmpleado.find(c => c.id === campo)?.nombre || campo)
      .join(', ');
  };

  const canProceedFromMapping = () => {
    const mappedFields = Object.values(mappings).filter(field => field);
    const allRequiredMapped = camposRequeridos.every(campo => mappedFields.includes(campo));
    return allRequiredMapped;
  };

  // Navegar entre pasos
  const handleNext = () => {
    if (activeStep === 1) {
      prepararDatosEmpleados();
      setActiveStep(2);
    } else if (activeStep === 2) {
      importData();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleAlertClose = () => {
    setAlert({ show: false, message: '', severity: 'info' });
  };

  // Preparar los datos para la revisión
  const prepararDatosEmpleados = () => {
    if (!excelData || !excelData.rows || !mappings) return;
    
    const datos = [];
    
    excelData.rows.forEach((row, index) => {
      const mapped = {};
      
      Object.entries(mappings).forEach(([columnaExcel, campoSistema]) => {
        if (campoSistema) {
          const valorOriginal = row[columnaExcel];
          
          // Conversiones específicas para tipos de datos
          if (campoSistema === 'persona_discapacidad' || campoSistema === 'es_jubilado' || 
              campoSistema === 'afecto_ajuste' || campoSistema === 'afecto_benef_semana_corrida' ||
              campoSistema === 'seguro_cesantia' || campoSistema === 'afecto_seguro_accidentes') {
            // Convertir a boolean - MUY ESPECÍFICO PARA EVITAR FALSOS POSITIVOS
            if (typeof valorOriginal === 'boolean') {
              mapped[campoSistema] = valorOriginal;
            } else if (typeof valorOriginal === 'string') {
              const valorLower = valorOriginal.toLowerCase().trim();
              // Solo valores explícitamente positivos
              mapped[campoSistema] = ['si', 'sí', 'yes', 'true', '1', 's', 'verdadero', 'x'].includes(valorLower);
            } else if (typeof valorOriginal === 'number') {
              mapped[campoSistema] = valorOriginal === 1;
            } else {
              mapped[campoSistema] = false; // Por defecto SIEMPRE false
            }
          } else if (campoSistema.includes('fecha')) {
            // Manejar fechas
            if (valorOriginal && valorOriginal !== '') {
              try {
                let fecha = null;
                if (valorOriginal instanceof Date) {
                  fecha = valorOriginal;
                } else if (typeof valorOriginal === 'string') {
                  const fechaStr = valorOriginal.trim();
                  if (fechaStr.includes('/')) {
                    const partes = fechaStr.split('/');
                    if (partes.length === 3) {
                      fecha = new Date(partes[2], partes[1] - 1, partes[0]);
                    }
                  } else if (fechaStr.includes('-')) {
                    fecha = new Date(fechaStr);
                  }
                }
                
                if (fecha && !isNaN(fecha.getTime())) {
                  const year = fecha.getFullYear();
                  const month = String(fecha.getMonth() + 1).padStart(2, '0');
                  const day = String(fecha.getDate()).padStart(2, '0');
                  mapped[campoSistema] = `${year}-${month}-${day}`;
                }
              } catch (error) {
                console.warn(`Error procesando fecha ${valorOriginal}:`, error);
                mapped[campoSistema] = null;
              }
            }
          } else if (campoSistema === 'establecimiento') {
            // Mapear sucursales usando la tabla de mapeo
            const sucursalMapeada = mapearSucursal(valorOriginal);
            mapped[campoSistema] = sucursalMapeada;
          } else if (campoSistema === 'sueldo_base') {
            // CORRIGIDO: SUELDO_BASE AHORA ES DECIMAL - PROCESAMIENTO SIMPLIFICADO
            if (valorOriginal && valorOriginal !== '') {
              // Limpiar el valor de caracteres no numéricos excepto punto y coma
              const valorLimpio = String(valorOriginal).replace(/[^0-9.,\-]/g, '');
              // Reemplazar coma por punto si existe (formato europeo)
              const valorConPunto = valorLimpio.replace(',', '.');
              const valorNumerico = parseFloat(valorConPunto);
              
              if (!isNaN(valorNumerico)) {
                // Mantener como decimal - no redondear
                mapped[campoSistema] = valorNumerico;
              } else {
                mapped[campoSistema] = null;
              }
            } else {
              mapped[campoSistema] = null;
            }
          } else if (campoSistema.includes('valor') || campoSistema.includes('monto') || 
                     campoSistema.includes('comision') || campoSistema.includes('porcentaje') || 
                     campoSistema.includes('aporte')) {
            // Convertir valores numéricos
            if (valorOriginal && valorOriginal !== '') {
              const valorNumerico = parseFloat(String(valorOriginal).replace(/[^0-9.-]/g, ''));
              mapped[campoSistema] = isNaN(valorNumerico) ? null : valorNumerico;
            }
          } else if (campoSistema.includes('cargas') || campoSistema.includes('cantidad') || 
                     campoSistema.includes('horas') || campoSistema.includes('dias')) {
            // Convertir a enteros
            if (valorOriginal && valorOriginal !== '') {
              const valorEntero = parseInt(String(valorOriginal).replace(/[^0-9]/g, ''));
              mapped[campoSistema] = isNaN(valorEntero) ? null : valorEntero;
            }
          } else {
            // Campo de texto normal
            mapped[campoSistema] = valorOriginal && valorOriginal !== '' ? String(valorOriginal).trim() : null;
          }
        }
      });
      
      datos.push(mapped);
    });
    
    setDatosEmpleados(datos);
  };

  // Importar datos usando el endpoint del backend
  const importData = async () => {
    setLoading(true);
    
    if (!canProceedFromMapping()) {
      setAlert({
        show: true,
        message: `Faltan campos obligatorios por mapear: ${getMissingRequiredFields()}`,
        severity: 'error'
      });
      setLoading(false);
      return;
    }

    try {
      let exitosos = 0;
      let fallidos = 0;
      const errores = [];
      
      for (let i = 0; i < datosEmpleados.length; i++) {
        try {
          const empleadoData = { ...datosEmpleados[i] };
          
          // Validar campos obligatorios
          if (!empleadoData.rut) {
            throw new Error('RUT es obligatorio');
          }
          if (!empleadoData.nombre) {
            throw new Error('Nombre es obligatorio');
          }
          if (!empleadoData.apellido_paterno) {
            throw new Error('Apellido paterno es obligatorio');
          }
          
          // Activar por defecto
          empleadoData.activo = true;
          
          // Remover campos vacíos
          Object.keys(empleadoData).forEach(key => {
            if (empleadoData[key] === '' || empleadoData[key] === undefined) {
              empleadoData[key] = null;
            }
          });
          
          const response = await api.post('/empleados', empleadoData);
          
          if (response.data && response.data.success) {
            exitosos++;
          } else {
            throw new Error(response.data?.message || 'Error desconocido');
          }
          
        } catch (error) {
          const empleadoInfo = datosEmpleados[i];
          const errorInfo = {
            fila: i + 1,
            rut: empleadoInfo.rut || 'Sin RUT',
            nombre: empleadoInfo.nombre || 'Sin nombre',
            error: error.response?.data?.message || error.message || 'Error desconocido'
          };
          errores.push(errorInfo);
          fallidos++;
        }
        
        setImportProgress(Math.round(((i + 1) / datosEmpleados.length) * 100));
      }
      
      if (errores.length > 0 && errores.length <= 5) {
        const errorMessages = errores.map(err => 
          `Fila ${err.fila} (${err.rut} - ${err.nombre}): ${err.error}`
        ).join('\n');
        
        setAlert({
          show: true,
          message: `Importación completada: ${exitosos} exitosos, ${fallidos} fallidos.\n\nErrores:\n${errorMessages}`,
          severity: exitosos > 0 ? 'warning' : 'error'
        });
      } else {
        setAlert({
          show: true,
          message: `Importación completada: ${exitosos} exitosos, ${fallidos} fallidos.${fallidos > 0 ? ' Revise la consola para más detalles.' : ''}`,
          severity: exitosos > 0 ? (fallidos > 0 ? 'warning' : 'success') : 'error'
        });
      }
      
      if (onImportComplete) {
        onImportComplete({
          total: datosEmpleados.length,
          successful: exitosos,
          failed: fallidos
        });
      }
      
      setActiveStep(3);
    } catch (error) {
      setAlert({
        show: true,
        message: `Error general en la importación: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Renderizar vista previa del Excel
  const renderExcelPreview = () => {
    if (!previewData.length || !columns.length) return null;
    
    return (
      <Box sx={{ mt: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Vista previa del Excel
        </Typography>
        <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {columns.map((col, index) => {
                  const isMapped = mappings[col] && mappings[col] !== '';
                  const mappedField = camposEmpleado.find(campo => campo.id === mappings[col]);
                  
                  return (
                    <TableCell 
                      key={index} 
                      sx={{ 
                        fontWeight: 'bold', 
                        backgroundColor: isMapped ? 'rgba(76, 175, 80, 0.1)' : '#f5f5f5',
                        position: 'relative'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                          {col}
                        </Typography>
                        
                        {isMapped && (
                          <Chip 
                            size="small" 
                            label={mappedField?.nombre || mappings[col]} 
                            color="success" 
                            variant="outlined"
                            sx={{ ml: 1, maxWidth: 100 }}
                          />
                        )}
                      </Box>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {previewData.map((row, rowIndex) => (
                <TableRow key={rowIndex} hover>
                  {columns.map((col, colIndex) => {
                    let valorMostrar = row[col] !== undefined ? String(row[col]) : '';
                    
                    // Si es establecimiento, mostrar también el mapeo
                    if (mappings[col] === 'establecimiento' && valorMostrar) {
                      const valorMapeado = mapearSucursal(valorMostrar);
                      if (valorMapeado !== valorMostrar) {
                        valorMostrar = `${valorMostrar} → ${valorMapeado}`;
                      }
                    }
                    
                    return (
                      <TableCell key={`${rowIndex}-${colIndex}`}>
                        {valorMostrar}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  // Renderizar vista del mapeo de campos
  const renderColumnMapping = () => {
    if (!columns.length) return null;
    
    return (
      <Box>
        <TableContainer component={Paper} sx={{ mt: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', width: '40%' }}>
                  Columna en Excel
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', width: '50%' }}>
                  Campo en Sistema
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', width: '10%' }}>
                  Vista Previa
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {columns.map((column, index) => (
                <TableRow 
                  key={index} 
                  hover
                  sx={{ 
                    backgroundColor: mappings[column] ? 'rgba(76, 175, 80, 0.05)' : 'inherit',
                    '&:hover': {
                      backgroundColor: mappings[column] ? 'rgba(76, 175, 80, 0.1)' : 'rgba(0, 0, 0, 0.04)'
                    }
                  }}
                >
                  <TableCell sx={{
                    borderLeft: mappings[column] ? '3px solid #4caf50' : 'none',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2">
                        {column}
                      </Typography>
                      <TouchAppIcon 
                        fontSize="small" 
                        color="action" 
                        sx={{ ml: 1, opacity: 0.5 }} 
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <FormControl fullWidth size="small">
                      <Select
                        value={mappings[column] || ''}
                        onChange={(e) => handleMappingChange(column, e.target.value)}
                        displayEmpty
                      >
                        <MenuItem value="">
                          <em>No mapear</em>
                        </MenuItem>
                        <MenuItem disabled style={{ opacity: 0.7, fontWeight: 'bold' }}>
                          -- Campos obligatorios --
                        </MenuItem>
                        {camposEmpleado.filter(campo => campo.requerido).map((campo) => (
                          <MenuItem 
                            key={campo.id} 
                            value={campo.id}
                            disabled={Object.values(mappings).includes(campo.id) && mappings[column] !== campo.id}
                          >
                            {campo.nombre} *
                          </MenuItem>
                        ))}
                        <MenuItem disabled style={{ opacity: 0.7, fontWeight: 'bold' }}>
                          -- Datos personales --
                        </MenuItem>
                        {camposEmpleado.filter(campo => !campo.requerido && (
                          ['apellido_materno', 'codigo', 'fecha_nacimiento', 'sexo', 'estado_civil', 
                           'nacionalidad', 'direccion', 'telefono', 'email', 'persona_discapacidad'].includes(campo.id)
                        )).map((campo) => (
                          <MenuItem 
                            key={campo.id} 
                            value={campo.id}
                            disabled={Object.values(mappings).includes(campo.id) && mappings[column] !== campo.id}
                          >
                            {campo.nombre}
                          </MenuItem>
                        ))}
                        <MenuItem disabled style={{ opacity: 0.7, fontWeight: 'bold' }}>
                          -- Datos laborales --
                        </MenuItem>
                        {camposEmpleado.filter(campo => !campo.requerido && (
                          ['fecha_ingreso', 'fecha_termino', 'estado_contrato', 'tipo_contrato',
                           'cod_departamento', 'desc_departamento', 'cargo', 'establecimiento', 
                           'tipo_jornada', 'horas_semanales_pactadas'].includes(campo.id)
                        )).map((campo) => (
                          <MenuItem 
                            key={campo.id} 
                            value={campo.id}
                            disabled={Object.values(mappings).includes(campo.id) && mappings[column] !== campo.id}
                          >
                            {campo.nombre}
                          </MenuItem>
                        ))}
                        <MenuItem disabled style={{ opacity: 0.7, fontWeight: 'bold' }}>
                          -- Remuneraciones --
                        </MenuItem>
                        {camposEmpleado.filter(campo => !campo.requerido && (
                          campo.id.includes('sueldo') || campo.id.includes('valor') ||
                          campo.id.includes('comision') || campo.id.includes('gratificacion') ||
                          campo.id.includes('asig') || campo.id.includes('afecto') ||
                          campo.id.includes('dia_') || campo.id.includes('cantidad') ||
                          campo.id.includes('tipo_sueldo')
                        )).map((campo) => (
                          <MenuItem 
                            key={campo.id} 
                            value={campo.id}
                            disabled={Object.values(mappings).includes(campo.id) && mappings[column] !== campo.id}
                          >
                            {campo.nombre}
                          </MenuItem>
                        ))}
                        <MenuItem disabled style={{ opacity: 0.7, fontWeight: 'bold' }}>
                          -- Previsión y Salud --
                        </MenuItem>
                        {camposEmpleado.filter(campo => !campo.requerido && (
                          campo.id.includes('prevision') || campo.id.includes('cotiz') ||
                          campo.id.includes('cargas') || campo.id.includes('jubilado') ||
                          campo.id.includes('seguro') || campo.id.includes('isapre') ||
                          campo.id.includes('tramo') || campo.id.includes('ges') ||
                          campo.id.includes('par') || campo.id.includes('moneda')
                        )).map((campo) => (
                          <MenuItem 
                            key={campo.id} 
                            value={campo.id}
                            disabled={Object.values(mappings).includes(campo.id) && mappings[column] !== campo.id}
                          >
                            {campo.nombre}
                          </MenuItem>
                        ))}
                        <MenuItem disabled style={{ opacity: 0.7, fontWeight: 'bold' }}>
                          -- APVI y APVC --
                        </MenuItem>
                        {camposEmpleado.filter(campo => !campo.requerido && (
                          campo.id.includes('apvi') || campo.id.includes('apvc') ||
                          campo.id.includes('afil_vol')
                        )).map((campo) => (
                          <MenuItem 
                            key={campo.id} 
                            value={campo.id}
                            disabled={Object.values(mappings).includes(campo.id) && mappings[column] !== campo.id}
                          >
                            {campo.nombre}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ 
                      maxWidth: 100, 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      display: 'block'
                    }}>
                      {previewData.length > 0 ? String(previewData[0][column] || '') : ''}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Información sobre el mapeo:</strong><br/>
            • Los campos con * son obligatorios: RUT, NOMBRE y A. PATERNO<br/>
            • El campo ESTABLECIMIENTO se mapeará automáticamente usando la tabla de sucursales<br/>
            • Las fechas se pueden importar en formato DD/MM/YYYY o YYYY-MM-DD<br/>
            • Los campos de Si/No se detectan automáticamente (Si, Sí, S, 1 = Verdadero)<br/>
            • SUELDO BASE ahora acepta decimales (ej: 450500.50)
          </Typography>
        </Alert>

        {/* Mostrar mapeo de sucursales */}
        <Alert severity="success" sx={{ mt: 2 }}>
          <AlertTitle>Mapeo de Sucursales Configurado</AlertTitle>
          <Typography variant="body2">
            Las sucursales se mapearán automáticamente según esta tabla:<br/>
            {Object.entries(MAPEO_SUCURSALES).slice(0, 3).map(([original, mapeado]) => (
              <span key={original}><strong>{original}</strong> → {mapeado}<br/></span>
            ))}
            <em>... y {Object.keys(MAPEO_SUCURSALES).length - 3} más</em>
          </Typography>
        </Alert>
      </Box>
    );
  };

  // Renderizar vista previa de los datos mapeados
  const renderMappedDataPreview = () => {
    if (!datosEmpleados.length) return null;
    
    const camposConDatos = new Set();
    datosEmpleados.forEach(empleado => {
      Object.keys(empleado).forEach(key => {
        if (empleado[key] !== undefined && empleado[key] !== null && empleado[key] !== '') {
          camposConDatos.add(key);
        }
      });
    });
    
    const camposOrdenados = [...camposConDatos].sort((a, b) => {
      const aRequerido = camposRequeridos.includes(a);
      const bRequerido = camposRequeridos.includes(b);
      
      if (aRequerido && !bRequerido) return -1;
      if (!aRequerido && bRequerido) return 1;
      
      return a.localeCompare(b);
    });
    
    return (
      <Box sx={{ mt: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Vista previa de datos a importar ({datosEmpleados.length} empleados)
        </Typography>
        
        <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {camposOrdenados.map((campo, index) => (
                  <TableCell 
                    key={index} 
                    sx={{ 
                      fontWeight: 'bold', 
                      backgroundColor: camposRequeridos.includes(campo) ? 'rgba(243, 125, 22, 0.1)' : '#f5f5f5'
                    }}
                  >
                    <Typography variant="body2">
                      {camposEmpleado.find(c => c.id === campo)?.nombre || campo}
                      {camposRequeridos.includes(campo) ? ' *' : ''}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {datosEmpleados.slice(0, 10).map((empleado, rowIndex) => (
                <TableRow key={rowIndex} hover>
                  {camposOrdenados.map((campo, colIndex) => (
                    <TableCell key={`${rowIndex}-${colIndex}`}>
                      {empleado[campo] !== undefined && empleado[campo] !== null ? String(empleado[campo]) : '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        {datosEmpleados.length > 10 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
            Mostrando 10 de {datosEmpleados.length} registros.
          </Typography>
        )}
      </Box>
    );
  };

  // Renderizar contenido según el paso actual
  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="body1" gutterBottom>
              Cargue un archivo Excel (.xlsx, .xls) con los datos de los empleados a importar.
            </Typography>
            
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="excel-upload"
            />
            
            <DropZone
              isDragging={isDragging}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('excel-upload').click()}
              sx={{ my: 3 }}
            >
              <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Arrastre su archivo aquí o haga clic para seleccionar
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Formatos soportados: .xlsx, .xls
              </Typography>
              {file && (
                <Chip 
                  label={file.name} 
                  color="primary" 
                  variant="outlined" 
                  sx={{ mt: 2 }} 
                />
              )}
            </DropZone>
            
            <Alert severity="info" sx={{ mt: 3 }}>
              <AlertTitle>Campos requeridos mínimos</AlertTitle>
              <Typography variant="body2">
                Solo son obligatorios: <strong>RUT, NOMBRE y A. PATERNO</strong>
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                El sistema mapeará automáticamente las sucursales según la tabla configurada.
              </Typography>
            </Alert>
          </Box>
        );
      
      case 1:
        return (
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="body1" gutterBottom>
              Asigne las columnas del archivo Excel a los campos correspondientes en el sistema.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Se encontraron {excelData?.rows.length || 0} filas en el archivo.
            </Typography>
            
            {renderColumnMapping()}
            
            <Divider sx={{ my: 2 }} />
            
            {renderExcelPreview()}
            
            {!canProceedFromMapping() && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <AlertTitle>Campos obligatorios sin mapear</AlertTitle>
                <Typography variant="body2">
                  Aún falta mapear los siguientes campos obligatorios: {getMissingRequiredFields()}
                </Typography>
              </Alert>
            )}
          </Box>
        );
      
      case 2:
        return (
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="body1" gutterBottom>
              Revise los datos que se importarán antes de continuar.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Se importarán {datosEmpleados.length} empleados. Verifique que los datos estén correctamente mapeados.
            </Typography>
            
            {renderMappedDataPreview()}
            
            <Alert severity="info" sx={{ mt: 2 }}>
              <AlertTitle>Información importante</AlertTitle>
              <ul>
                <li>Los empleados con RUT duplicado no serán importados.</li>
                <li>Las sucursales se mapearán automáticamente según la tabla configurada.</li>
                <li>Los campos vacíos se guardarán como nulos en la base de datos.</li>
                <li>Puede volver al paso anterior para ajustar el mapeo si es necesario.</li>
                <li>Se creará automáticamente la relación empleado-sucursal si corresponde.</li>
                <li>SUELDO BASE se guardará como decimal con hasta 2 decimales.</li>
              </ul>
            </Alert>
          </Box>
        );
      
      case 3:
        return (
          <Box sx={{ mt: 2, mb: 2, textAlign: 'center' }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Importación Completada
            </Typography>
            <Typography variant="body1" paragraph>
              La importación de empleados se ha completado exitosamente.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Puede cerrar esta ventana y continuar trabajando con los empleados importados.
            </Typography>
          </Box>
        );
      
      default:
        return 'Paso desconocido';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { 
          bgcolor: 'background.paper',
          boxShadow: 5,
          borderRadius: 2
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          backgroundColor: '#f37d16', 
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 1.5
        }}
      >
        <Typography variant="h6">
          Importar Empleados desde Excel
        </Typography>
        {!loading && (
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ pt: 3, pb: 2 }}>
          {steps.map((label, index) => (
            <Step key={label} completed={activeStep > index}>
              <StepLabel
                StepIconProps={{
                  icon: (
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: activeStep === index ? '#f37d16' : 
                                        activeStep > index ? '#4caf50' : '#bdbdbd',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                      }}
                    >
                      {index + 1}
                    </Box>
                  )
                }}
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
        
        <Divider sx={{ my: 1 }} />
        
        {alert.show && (
          <Alert 
            severity={alert.severity} 
            sx={{ my: 2 }}
            onClose={handleAlertClose}
          >
            {alert.message}
          </Alert>
        )}
        
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 4 }}>
            <CircularProgress />
            <Typography variant="body1" sx={{ mt: 2 }}>
              {activeStep === 0 ? 'Procesando archivo...' : 
               activeStep === 1 ? 'Procesando datos...' : 
               activeStep === 2 ? 'Importando datos...' : 
               'Finalizando importación...'}
            </Typography>
            {activeStep === 2 && importProgress > 0 && (
              <Box sx={{ width: '100%', mt: 2 }}>
                <Typography variant="body2" align="center" gutterBottom>
                  {importProgress}%
                </Typography>
                <Box sx={{ width: '100%', backgroundColor: '#e0e0e0', borderRadius: 1 }}>
                  <Box
                    sx={{
                      width: `${importProgress}%`,
                      backgroundColor: '#4caf50',
                      height: 10,
                      borderRadius: 1
                    }}
                  />
                </Box>
              </Box>
            )}
          </Box>
        ) : (
          getStepContent(activeStep)
        )}
      </DialogContent>
      
      {!loading && (
        <DialogActions sx={{ px: 3, pb: 3 }}>
          {activeStep !== 3 && (
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              sx={{ mr: 1 }}
              startIcon={<ArrowBackIcon />}
            >
              Atrás
            </Button>
          )}
          
          <Box sx={{ flex: '1 1 auto' }} />
          
          {activeStep === 3 ? (
            <Button 
              variant="contained"
              onClick={handleClose}
              sx={{ backgroundColor: '#f37d16', '&:hover': { backgroundColor: '#e06c00' } }}
            >
              Cerrar
            </Button>
          ) : (
            <Button
              disabled={
                (activeStep === 0 && !file) ||
                (activeStep === 1 && !canProceedFromMapping())
              }
              variant="contained"
              onClick={handleNext}
              endIcon={activeStep < 2 ? <ArrowForwardIcon /> : null}
              sx={{ backgroundColor: '#f37d16', '&:hover': { backgroundColor: '#e06c00' } }}
            >
              {activeStep === 2 ? 'Importar' : 'Siguiente'}
            </Button>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
};

export default ImportarEmpleadosExcel;