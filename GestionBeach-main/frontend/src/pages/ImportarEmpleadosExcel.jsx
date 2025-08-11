// ImportarEmpleadosExcel.jsx
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
import axios from 'axios';

// URL base para las peticiones API
const API_URL = 'http://localhost:5000/api';

// Recuperar token guardado del localStorage
const getAuthToken = () => localStorage.getItem('token');

// Crear instancia de axios con config por defecto
const axiosWithAuth = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para añadir el token a cada petición
axiosWithAuth.interceptors.request.use(
  config => {
    const token = getAuthToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

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

// Campos disponibles en la entidad de empleados
const camposEmpleado = [
  { id: 'rut', nombre: 'RUT', requerido: true, descripcion: 'Número de identificación del empleado (RUT)' },
  { id: 'nombre', nombre: 'Nombre', requerido: true, descripcion: 'Primer nombre del empleado' },
  { id: 'apellido', nombre: 'Apellido', requerido: true, descripcion: 'Apellido del empleado' },
  { id: 'id_sucursal', nombre: 'ID Sucursal', requerido: false, descripcion: 'ID numérico o nombre de la sucursal donde trabaja' },
  { id: 'nombre_sucursal', nombre: 'Nombre Sucursal', requerido: false, descripcion: 'Nombre de la sucursal (se convertirá automáticamente a ID)' },
  { id: 'cargo', nombre: 'Cargo', requerido: false, descripcion: 'Puesto o cargo del empleado' },
  { id: 'direccion', nombre: 'Dirección', requerido: false, descripcion: 'Dirección residencial' },
  { id: 'telefono', nombre: 'Teléfono', requerido: false, descripcion: 'Número de teléfono de contacto' },
  { id: 'nacionalidad', nombre: 'Nacionalidad', requerido: false, descripcion: 'País de nacionalidad' },
  { id: 'correo_electronico', nombre: 'Correo Electrónico', requerido: false, descripcion: 'Email de contacto' },
  { id: 'fecha_nacimiento', nombre: 'Fecha de Nacimiento', requerido: false, descripcion: 'Fecha de nacimiento (YYYY-MM-DD)' },
  { id: 'fecha_ingreso', nombre: 'Fecha de Ingreso', requerido: false, descripcion: 'Fecha de incorporación a la empresa (YYYY-MM-DD)' },
  { id: 'estado_civil', nombre: 'Estado Civil', requerido: false, descripcion: 'Estado civil (Soltero, Casado, etc.)' },
  { id: 'activo', nombre: 'Activo', requerido: false, descripcion: 'Indica si el empleado está activo (true/false)' },
  { id: 'rut_empresa', nombre: 'RUT Empresa', requerido: false, descripcion: 'RUT de la empresa a la que pertenece' },
  { id: 'discapacidad', nombre: 'Discapacidad', requerido: false, descripcion: 'Indica si tiene alguna discapacidad (true/false)' }
];

// Obtener los campos obligatorios
const camposRequeridos = camposEmpleado.filter(campo => campo.requerido).map(campo => campo.id);

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
  const [sucursalMappingWarnings, setSucursalMappingWarnings] = useState([]);
  const [sucursalPorDefecto, setSucursalPorDefecto] = useState(''); // Nueva: Sucursal por defecto
  const [empleadosSinSucursal, setEmpleadosSinSucursal] = useState(0); // Nueva: Contador de empleados sin sucursal

  // Efectos
  useEffect(() => {
    // Reiniciar estado al abrir el modal
    if (open) {
      resetState();
    }
  }, [open]);

  // Debug: Log sucursales cuando cambien
  useEffect(() => {
    console.log('Sucursales recibidas en ImportarEmpleadosExcel:', sucursales);
  }, [sucursales]);

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
    setSucursalMappingWarnings([]);
    setSucursalPorDefecto('');
    setEmpleadosSinSucursal(0);
  };

  // Función para convertir nombre de sucursal a ID
  const convertirNombreSucursalAId = (nombreSucursal) => {
    console.log('🔍 Buscando sucursal por nombre:', nombreSucursal);
    console.log('🏢 Sucursales disponibles:', sucursales);
    
    if (!nombreSucursal || typeof nombreSucursal !== 'string') {
      console.log('❌ Nombre de sucursal inválido:', nombreSucursal);
      return null; // Cambio: retorna null en lugar de -1 para manejar mejor
    }
    
    const nombreLimpio = nombreSucursal.toString().trim().toLowerCase();
    console.log('🧹 Nombre limpio a buscar:', nombreLimpio);
    
    // Buscar por coincidencia exacta
    let sucursalEncontrada = sucursales.find(s => 
      s.nombre && s.nombre.toLowerCase().trim() === nombreLimpio
    );
    
    if (sucursalEncontrada) {
      console.log('✅ Encontrada por coincidencia exacta:', sucursalEncontrada);
      return sucursalEncontrada.id_sucursal || sucursalEncontrada.id;
    }
    
    // Buscar por coincidencia parcial
    sucursalEncontrada = sucursales.find(s => 
      s.nombre && (
        s.nombre.toLowerCase().includes(nombreLimpio) ||
        nombreLimpio.includes(s.nombre.toLowerCase())
      )
    );
    
    if (sucursalEncontrada) {
      console.log('✅ Encontrada por coincidencia parcial:', sucursalEncontrada);
      return sucursalEncontrada.id_sucursal || sucursalEncontrada.id;
    }
    
    // Buscar variaciones comunes
    const variaciones = {
      'central': ['matriz', 'principal', 'centro'],
      'norte': ['zona norte', 'sucursal norte'],
      'sur': ['zona sur', 'sucursal sur'],
      'oriente': ['este', 'zona oriente'],
      'poniente': ['oeste', 'zona poniente']
    };
    
    for (const [variacion, sinonimos] of Object.entries(variaciones)) {
      if (nombreLimpio.includes(variacion) || sinonimos.some(s => nombreLimpio.includes(s))) {
        sucursalEncontrada = sucursales.find(s => 
          s.nombre && s.nombre.toLowerCase().includes(variacion)
        );
        if (sucursalEncontrada) {
          console.log('✅ Encontrada por variación:', sucursalEncontrada);
          return sucursalEncontrada.id_sucursal || sucursalEncontrada.id;
        }
      }
    }
    
    console.log('❌ No se encontró sucursal, retornando null');
    return null; // Cambio: retorna null para manejar mejor
  };

  // Función para validar y convertir valor de sucursal
  const procesarValorSucursal = (valor) => {
    console.log('🔄 Procesando valor de sucursal:', valor, 'tipo:', typeof valor);
    
    if (!valor || valor === '') {
      console.log('📝 Valor vacío, retornando null');
      return null;
    }
    
    // Si es un número, validar que sea válido
    const numeroId = parseInt(valor);
    if (!isNaN(numeroId) && numeroId > 0) {
      // Verificar que la sucursal existe
      const sucursalExiste = sucursales.find(s => 
        (s.id_sucursal === numeroId) || (s.id === numeroId)
      );
      if (sucursalExiste) {
        console.log('✅ ID numérico válido encontrado:', numeroId);
        return numeroId;
      } else {
        console.log('⚠️ ID numérico no encontrado en sucursales:', numeroId);
        return null;
      }
    }
    
    // Si es texto, convertir nombre a ID
    const idConvertido = convertirNombreSucursalAId(valor);
    console.log('🔄 Resultado de conversión:', idConvertido);
    return idConvertido;
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
        
        // Obtener primera hoja
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Opciones especiales para manejar tablas Excel
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          blankrows: false,
          defval: '' 
        });
        
        console.log("Excel data:", jsonData); // Para depuración
        
        if (jsonData.length < 1) {
          setAlert({
            show: true,
            message: 'El archivo no contiene datos para importar.',
            severity: 'error'
          });
          setLoading(false);
          return;
        }

        // Buscar la primera fila con datos que puedan ser encabezados
        let headerRowIndex = 0;
        while (headerRowIndex < Math.min(5, jsonData.length)) {
          const row = jsonData[headerRowIndex];
          if (row && row.length > 0 && row.filter(cell => cell && cell !== "").length > 1) {
            // Esta fila tiene múltiples celdas con datos, probablemente son encabezados
            break;
          }
          headerRowIndex++;
        }
        
        // Si no encontramos una fila adecuada para encabezados
        if (headerRowIndex >= Math.min(5, jsonData.length)) {
          setAlert({
            show: true,
            message: 'No se pudieron detectar encabezados en las primeras filas del Excel.',
            severity: 'error'
          });
          setLoading(false);
          return;
        }
        
        // Usar la fila encontrada como encabezados
        const headers = jsonData[headerRowIndex].map(header => 
          header === "" ? `Columna_${Math.random().toString(36).substr(2, 5)}` : String(header)
        );
        
        // Datos a partir de la siguiente fila
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
        
        // Preparar datos para vista previa
        const preview = rows.slice(0, 5).map(row => {
          const rowData = {};
          headers.forEach((header, index) => {
            rowData[header] = index < row.length && row[index] !== undefined ? row[index] : '';
          });
          return rowData;
        });

        // Convertir a array de objetos para todos los datos
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

        // Inicializar mapeo vacío
        const initialMappings = {};
        headers.forEach(header => {
          initialMappings[header] = '';
        });
        setMappings(initialMappings);
        
        // Auto-mapeo básico basado en nombres de columnas
        const autoMappings = {...initialMappings};
        headers.forEach(header => {
          const headerLower = String(header).toLowerCase().trim();
          
          // Mapeo básico por coincidencia de nombre
          camposEmpleado.forEach(campo => {
            if (headerLower === campo.id.toLowerCase() || 
                headerLower === campo.nombre.toLowerCase() ||
                headerLower.includes(campo.id.toLowerCase()) ||
                headerLower.includes(campo.nombre.toLowerCase())) {
              // Verificar que no esté ya mapeado
              if (!Object.values(autoMappings).includes(campo.id)) {
                autoMappings[header] = campo.id;
              }
            }
          });
          
          // Mapeo especial para sucursales
          if (headerLower.includes('sucursal') && !Object.values(autoMappings).includes('id_sucursal')) {
            if (headerLower.includes('id') || headerLower.includes('codigo')) {
              autoMappings[header] = 'id_sucursal';
            } else {
              autoMappings[header] = 'nombre_sucursal';
            }
          }
        });
        
        setMappings(autoMappings);
        
        setLoading(false);
        setActiveStep(1); // Avanzar al paso de mapeo
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
    // Verificar si ya existe este campo en otro mapeo
    if (value && Object.values(mappings).includes(value)) {
      // Encontrar la columna que tenía este valor y eliminarla
      Object.keys(mappings).forEach(key => {
        if (mappings[key] === value && key !== column) {
          setMappings(prev => ({
            ...prev,
            [key]: '' // Resetear el mapeo anterior
          }));
        }
      });
    }

    // Actualizar el mapeo actual
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

  // Condición para habilitar el botón Siguiente en paso de mapeo
  const canProceedFromMapping = () => {
    const mappedFields = Object.values(mappings).filter(field => field); // Campos mapeados (no vacíos)
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

  // Cerrar alerta
  const handleAlertClose = () => {
    setAlert({ show: false, message: '', severity: 'info' });
  };

  // Preparar los datos para la revisión
  const prepararDatosEmpleados = () => {
    if (!excelData || !excelData.rows || !mappings) return;
    
    const datos = [];
    const warnings = [];
    let empleadosSinSucursalCount = 0;
    
    excelData.rows.forEach((row, index) => {
      const mapped = {};
      let hasWarning = false;
      let warningMessage = '';
      let tieneSucursalValida = false;
      
      // Aplicar el mapeo a cada fila
      Object.entries(mappings).forEach(([columnaExcel, campoSistema]) => {
        if (campoSistema) { // Solo mapear si se seleccionó un campo destino
          const valorOriginal = row[columnaExcel];
          
          // Manejo especial para sucursales
          if (campoSistema === 'id_sucursal' || campoSistema === 'nombre_sucursal') {
            const idSucursal = procesarValorSucursal(valorOriginal);
            if (idSucursal !== null) {
              mapped.id_sucursal = idSucursal;
              tieneSucursalValida = true;
            }
            
            // Agregar warning si no se pudo mapear la sucursal
            if (valorOriginal && valorOriginal !== '' && idSucursal === null) {
              hasWarning = true;
              warningMessage = `Sucursal "${valorOriginal}" no encontrada`;
            }
          } else {
            mapped[campoSistema] = valorOriginal;
          }
        }
      });
      
      // Si no tiene sucursal válida, contar para mostrar al usuario
      if (!tieneSucursalValida) {
        empleadosSinSucursalCount++;
      }
      
      datos.push(mapped);
      
      if (hasWarning) {
        warnings.push({
          fila: index + 1,
          empleado: `${mapped.nombre || ''} ${mapped.apellido || ''}`.trim() || `Fila ${index + 1}`,
          warning: warningMessage
        });
      }
    });
    
    setDatosEmpleados(datos);
    setSucursalMappingWarnings(warnings);
    setEmpleadosSinSucursal(empleadosSinSucursalCount);
    
    // Si hay empleados sin sucursal, sugerir la primera sucursal disponible
    if (empleadosSinSucursalCount > 0 && sucursales.length > 0 && !sucursalPorDefecto) {
      setSucursalPorDefecto((sucursales[0].id_sucursal || sucursales[0].id).toString());
    }
  };

  // Obtener el nombre de la sucursal por ID
  const getSucursalNombre = (idSucursal) => {
    if (!idSucursal) return 'No especificada';
    
    const sucursal = sucursales.find(s => 
      (s.id_sucursal === idSucursal) || (s.id === idSucursal)
    );
    return sucursal ? sucursal.nombre : `ID: ${idSucursal}`;
  };

  // Importar datos desde el Excel con el mapeo configurado
  const importData = async () => {
    setLoading(true);
    
    console.log('🚀 INICIANDO IMPORTACIÓN');
    console.log('📊 Datos de empleados a importar:', datosEmpleados);
    console.log('🗺️ Mapeos configurados:', mappings);
    console.log('🏢 Sucursales disponibles:', sucursales);
    console.log('🏢 Sucursal por defecto seleccionada:', sucursalPorDefecto);
    
    // Verificar que se han mapeado los campos obligatorios
    if (!canProceedFromMapping()) {
      console.log('❌ ERROR: Faltan campos obligatorios por mapear');
      setAlert({
        show: true,
        message: `Faltan campos obligatorios por mapear: ${getMissingRequiredFields()}`,
        severity: 'error'
      });
      setLoading(false);
      return;
    }

    // Verificar que se ha seleccionado sucursal por defecto si hay empleados sin sucursal
    if (empleadosSinSucursal > 0 && !sucursalPorDefecto) {
      setAlert({
        show: true,
        message: `Hay ${empleadosSinSucursal} empleados sin sucursal válida. Debe seleccionar una sucursal por defecto.`,
        severity: 'error'
      });
      setLoading(false);
      return;
    }

    try {
      let exitosos = 0;
      let fallidos = 0;
      const errores = [];
      
      console.log(`📈 Procesando ${datosEmpleados.length} empleados...`);
      
      for (let i = 0; i < datosEmpleados.length; i++) {
        console.log(`\n🔄 PROCESANDO EMPLEADO ${i + 1}/${datosEmpleados.length}`);
        console.log('📋 Datos originales:', datosEmpleados[i]);
        
        let empleadoData = null;
        
        try {
          // Preparar los datos para enviar
          empleadoData = { ...datosEmpleados[i] };
          console.log('📝 Datos después de clonar:', empleadoData);
          
          // IMPORTANTE: Remover el campo 'id' si existe (es autoincremental)
          if (empleadoData.id) {
            console.log('🗑️ Eliminando campo id autoincremental:', empleadoData.id);
            delete empleadoData.id;
          }
          
          // NUEVO: Aplicar sucursal por defecto si no tiene sucursal válida
          if (!empleadoData.id_sucursal && sucursalPorDefecto) {
            empleadoData.id_sucursal = parseInt(sucursalPorDefecto);
            console.log('🏢 Aplicando sucursal por defecto:', empleadoData.id_sucursal);
          }
          
          // Validar que tiene sucursal válida
          if (!empleadoData.id_sucursal) {
            throw new Error('No se pudo asignar una sucursal válida al empleado');
          }
          
          console.log('✅ id_sucursal final:', empleadoData.id_sucursal);
          
          // Validar campos obligatorios (SOLO RUT, nombre y apellido)
          console.log('🔍 Validando campos obligatorios...');
          if (!empleadoData.rut) {
            throw new Error('RUT es obligatorio');
          }
          console.log('✅ RUT válido:', empleadoData.rut);
          
          if (!empleadoData.nombre) {
            throw new Error('Nombre es obligatorio');
          }
          console.log('✅ Nombre válido:', empleadoData.nombre);
          
          if (!empleadoData.apellido) {
            throw new Error('Apellido es obligatorio');
          }
          console.log('✅ Apellido válido:', empleadoData.apellido);
          
          // Limpiar campos vacíos (convertir strings vacíos a null)
          console.log('🧹 Limpiando campos vacíos...');
          Object.keys(empleadoData).forEach(key => {
            const valorOriginal = empleadoData[key];
            if (empleadoData[key] === '' || empleadoData[key] === undefined) {
              empleadoData[key] = null;
              console.log(`🧹 Campo '${key}' cambiado de '${valorOriginal}' a null`);
            }
          });
          
          console.log('📤 Datos finales a enviar:', empleadoData);
          
          // Verificar si ya existe un empleado con ese RUT
          console.log('🔍 Verificando si existe empleado con RUT:', empleadoData.rut);
          try {
            const checkResponse = await axiosWithAuth.get(`/empleados/search?query=${empleadoData.rut}`);
            console.log('📋 Respuesta de búsqueda:', checkResponse);
            
            const empleadosExistentes = checkResponse.data.empleados || [];
            console.log('👥 Empleados existentes encontrados:', empleadosExistentes);
            
            const existe = empleadosExistentes.some(emp => emp.rut === empleadoData.rut);
            console.log('❓ ¿Empleado ya existe?', existe);
            
            if (existe) {
              throw new Error(`Empleado con RUT ${empleadoData.rut} ya existe`);
            }
          } catch (searchError) {
            console.log('⚠️ Error en búsqueda (continuando):', searchError.message);
            // Si hay error en la búsqueda, continuamos con la creación
          }
          
          console.log('🚀 Enviando POST a /empleados con datos:', empleadoData);
          
          // Crear el empleado
          const createResponse = await axiosWithAuth.post('/empleados', empleadoData);
          console.log('✅ Empleado creado exitosamente:', createResponse.data);
          
          exitosos++;
          console.log(`🎉 ÉXITO - Empleado ${i + 1} importado correctamente`);
          
        } catch (error) {
          console.log(`❌ ERROR al importar empleado ${i + 1}:`);
          console.log('🔴 Error completo:', error);
          console.log('🔴 Mensaje de error:', error.message);
          console.log('🔴 Respuesta del servidor:', error.response);
          
          // Guardar información del error para mostrar al usuario
          const empleadoInfo = datosEmpleados[i];
          const errorInfo = {
            fila: i + 1,
            rut: empleadoInfo.rut || 'Sin RUT',
            nombre: empleadoInfo.nombre || 'Sin nombre',
            error: error.response?.data?.message || error.response?.data?.error || error.message || 'Error desconocido',
            datosEnviados: empleadoData || empleadoInfo,
            errorCompleto: error.response?.data || error
          };
          errores.push(errorInfo);
          fallidos++;
          
          console.log('💾 Error guardado:', errorInfo);
        }
        
        // Actualizar progreso
        setImportProgress(Math.round(((i + 1) / datosEmpleados.length) * 100));
        console.log(`📊 Progreso: ${Math.round(((i + 1) / datosEmpleados.length) * 100)}%`);
      }
      
      console.log('\n🏁 IMPORTACIÓN COMPLETADA');
      console.log(`✅ Exitosos: ${exitosos}`);
      console.log(`❌ Fallidos: ${fallidos}`);
      console.log('📋 Errores detallados:', errores);
      
      // Mostrar errores detallados si los hay
      if (errores.length > 0 && errores.length <= 5) {
        const errorMessages = errores.map(err => 
          `Fila ${err.fila} (${err.rut} - ${err.nombre}): ${err.error}`
        ).join('\n');
        
        console.log('📢 Mostrando errores al usuario:', errorMessages);
        
        setAlert({
          show: true,
          message: `Importación completada: ${exitosos} exitosos, ${fallidos} fallidos.\n\nErrores:\n${errorMessages}`,
          severity: exitosos > 0 ? 'warning' : 'error'
        });
      } else {
        // Mensaje general
        setAlert({
          show: true,
          message: `Importación completada: ${exitosos} exitosos, ${fallidos} fallidos.${fallidos > 0 ? ' Revise la consola del navegador para más detalles.' : ''}`,
          severity: exitosos > 0 ? (fallidos > 0 ? 'warning' : 'success') : 'error'
        });
      }
      
      // Notificar al componente padre
      if (onImportComplete) {
        console.log('📞 Notificando al componente padre...');
        onImportComplete({
          total: datosEmpleados.length,
          successful: exitosos,
          failed: fallidos
        });
      }
      
      setActiveStep(3); // Avanzar al paso final
    } catch (error) {
      console.log('💥 ERROR GENERAL en la importación:');
      console.log('🔴 Error completo:', error);
      console.log('🔴 Stack trace:', error.stack);
      
      setAlert({
        show: true,
        message: `Error general en la importación: ${error.message}. Revise la consola del navegador para más detalles.`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
      console.log('🔚 Función importData terminada');
    }
  };

  // Renderizar vista previa de los datos del Excel
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
                  {columns.map((col, colIndex) => (
                    <TableCell key={`${rowIndex}-${colIndex}`}>
                      {row[col] !== undefined ? String(row[col]) : ''}
                    </TableCell>
                  ))}
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
                        {/* Primero los campos obligatorios */}
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
                        {/* Luego los campos opcionales */}
                        <MenuItem disabled style={{ opacity: 0.7, fontWeight: 'bold' }}>
                          -- Campos opcionales --
                        </MenuItem>
                        {camposEmpleado.filter(campo => !campo.requerido).map((campo) => (
                          <MenuItem 
                            key={campo.id} 
                            value={campo.id}
                            disabled={Object.values(mappings).includes(campo.id) && mappings[column] !== campo.id}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {(campo.id === 'id_sucursal' || campo.id === 'nombre_sucursal') && (
                                <BusinessIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                              )}
                              {campo.nombre}
                            </Box>
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

        {/* Información sobre sucursales */}
        {sucursales.length > 0 && (
          <Card sx={{ mt: 3, backgroundColor: 'rgba(243, 125, 22, 0.05)' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
                Sucursales Disponibles
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Las siguientes sucursales están disponibles para mapear:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {sucursales.map((sucursal) => (
                  <Chip
                    key={sucursal.id_sucursal || sucursal.id}
                    label={`${sucursal.nombre} (ID: ${sucursal.id_sucursal || sucursal.id})`}
                    variant="outlined"
                    size="small"
                    color="primary"
                  />
                ))}
              </Box>
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  💡 <strong>Consejos para mapear sucursales:</strong>
                  <br />• Si su Excel contiene IDs numéricos de sucursal, mapee a "ID Sucursal"
                  <br />• Si su Excel contiene nombres de sucursal, mapee a "Nombre Sucursal"
                  <br />• El sistema intentará encontrar coincidencias automáticamente
                  <br />• En el siguiente paso podrá asignar una sucursal por defecto
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        )}
      </Box>
    );
  };

  // Renderizar vista previa de los datos mapeados
  const renderMappedDataPreview = () => {
    if (!datosEmpleados.length) return null;
    
    // Obtener todos los campos que tienen datos
    const camposConDatos = new Set();
    datosEmpleados.forEach(empleado => {
      Object.keys(empleado).forEach(key => {
        if (empleado[key] !== undefined && empleado[key] !== '') {
          camposConDatos.add(key);
        }
      });
    });
    
    // Convertir a array y ordenar: primero los requeridos, luego el resto
    const camposOrdenados = [...camposConDatos].sort((a, b) => {
      const aRequerido = camposRequeridos.includes(a);
      const bRequerido = camposRequeridos.includes(b);
      
      if (aRequerido && !bRequerido) return -1;
      if (!aRequerido && bRequerido) return 1;
      
      // Si ambos son requeridos o ambos son opcionales, ordenar alfabéticamente
      return a.localeCompare(b);
    });
    
    return (
      <Box sx={{ mt: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Vista previa de datos a importar ({datosEmpleados.length} empleados)
        </Typography>
        
        {/* NUEVA SECCIÓN: Selector de Sucursal por Defecto */}
        {empleadosSinSucursal > 0 && (
          <Card sx={{ mb: 3, backgroundColor: 'rgba(243, 125, 22, 0.05)', border: '2px solid #f37d16' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: '#f37d16' }}>
                <AssignmentIcon sx={{ mr: 1 }} />
                Asignación de Sucursal por Defecto
              </Typography>
              
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>{empleadosSinSucursal} empleados</strong> no tienen una sucursal válida asignada.
                  Seleccione una sucursal por defecto para estos empleados:
                </Typography>
              </Alert>
              
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel id="sucursal-defecto-label">Sucursal por Defecto</InputLabel>
                    <Select
                      labelId="sucursal-defecto-label"
                      value={sucursalPorDefecto}
                      onChange={(e) => setSucursalPorDefecto(e.target.value)}
                      label="Sucursal por Defecto"
                    >
                      <MenuItem value="">
                        <em>Seleccione una sucursal</em>
                      </MenuItem>
                      {sucursales.map((sucursal) => (
                        <MenuItem 
                          key={sucursal.id_sucursal || sucursal.id} 
                          value={(sucursal.id_sucursal || sucursal.id).toString()}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <BusinessIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                            {sucursal.nombre} (ID: {sucursal.id_sucursal || sucursal.id})
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      Esta sucursal se asignará a los {empleadosSinSucursal} empleados que no tienen sucursal válida
                    </FormHelperText>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  {sucursalPorDefecto && (
                    <Alert severity="success">
                      <Typography variant="body2">
                        <GroupsIcon fontSize="small" sx={{ mb: -0.5, mr: 1 }} />
                        {empleadosSinSucursal} empleados serán asignados a: 
                        <strong> {getSucursalNombre(parseInt(sucursalPorDefecto))}</strong>
                      </Typography>
                    </Alert>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
        
        {/* Mostrar warnings de mapeo de sucursales */}
        {sucursalMappingWarnings.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>Advertencias de Mapeo de Sucursales</AlertTitle>
            <List dense>
              {sucursalMappingWarnings.slice(0, 5).map((warning, index) => (
                <ListItem key={index} sx={{ py: 0 }}>
                  <ListItemIcon>
                    <WarningIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={warning.empleado}
                    secondary={warning.warning}
                  />
                </ListItem>
              ))}
            </List>
            {sucursalMappingWarnings.length > 5 && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                ... y {sucursalMappingWarnings.length - 5} advertencias más.
              </Typography>
            )}
          </Alert>
        )}
        
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
                      {campo === 'id_sucursal' ? 
                        (empleado[campo] ? getSucursalNombre(empleado[campo]) : 
                         sucursalPorDefecto ? `${getSucursalNombre(parseInt(sucursalPorDefecto))} (por defecto)` : 
                         'Sin asignar') :
                        empleado[campo] !== undefined ? String(empleado[campo]) : ''
                      }
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
      case 0: // Cargar archivo
        return (
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="body1" gutterBottom>
              Cargue un archivo Excel (.xlsx, .xls) con los datos de los empleados a importar.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              El Excel debe tener encabezados en la primera fila y datos a partir de la segunda fila.
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
              <AlertTitle>Formato requerido del Excel</AlertTitle>
              <Typography variant="body2">
                Para que la importación funcione correctamente, su Excel debe tener:
              </Typography>
              <ul>
                <li>Primera fila con nombres de columnas (encabezados)</li>
                <li>Datos a partir de la segunda fila</li>
                <li>Sin filas vacías al inicio del archivo</li>
                <li>Sin subtítulos o información adicional antes de la tabla</li>
              </ul>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Ejemplo de formato correcto:
              </Typography>
              <Box sx={{ bgcolor: '#f5f5f5', p: 2, mt: 1, borderRadius: 1 }}>
                <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre' }}>
                  RUT       |  Nombre   |  Apellido  |  Sucursal{'\n'}
                  ----------|-----------|------------|------------{'\n'}
                  12345678-9|  Juan     |  Pérez     |  Central{'\n'}
                  98765432-1|  María    |  González  |  Norte
                </Typography>
              </Box>
            </Alert>

            <Alert severity="success" sx={{ mt: 2 }}>
              <AlertTitle>✨ Nuevo: Asignación Automática de Sucursales</AlertTitle>
              <Typography variant="body2">
                <strong>Campos obligatorios:</strong> Solo RUT, Nombre y Apellido
              </Typography>
              <Typography variant="body2">
                <strong>Sucursales:</strong> Si no se pueden mapear automáticamente, podrá asignar una sucursal por defecto a todos los empleados.
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                ✅ ¡Ya no necesita preocuparse por los errores de sucursal!
              </Typography>
            </Alert>
          </Box>
        );
      
      case 1: // Mapear campos
        return (
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="body1" gutterBottom>
              Asigne las columnas del archivo Excel a los campos correspondientes en el sistema.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Los campos marcados con * son obligatorios. Se encontraron {excelData?.rows.length || 0} filas en el archivo.
            </Typography>
            
            {/* Mapeo de columnas */}
            {renderColumnMapping()}
            
            <Divider sx={{ my: 2 }} />
            
            {/* Vista previa del Excel */}
            {renderExcelPreview()}
            
            {/* Mostrar campos pendientes de mapear */}
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
      
      case 2: // Revisar datos
        return (
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="body1" gutterBottom>
              Revise los datos que se importarán antes de continuar.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Se importarán {datosEmpleados.length} empleados. Verifique que los datos estén correctamente mapeados.
            </Typography>
            
            {/* Vista previa de datos mapeados con selector de sucursal */}
            {renderMappedDataPreview()}
            
            <Alert severity="info" sx={{ mt: 2 }}>
              <AlertTitle>Información importante</AlertTitle>
              <ul>
                <li>Los empleados con RUT duplicado no serán importados.</li>
                <li>Los campos vacíos se guardarán como nulos en la base de datos.</li>
                <li>Todos los empleados tendrán una sucursal válida asignada.</li>
                <li>Los empleados se pueden editar después para cambiar de sucursal.</li>
                <li>Puede volver al paso anterior para ajustar el mapeo si es necesario.</li>
              </ul>
            </Alert>
          </Box>
        );
      
      case 3: // Resultados
        return (
          <Box sx={{ mt: 2, mb: 2, textAlign: 'center' }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Importación Completada
            </Typography>
            <Typography variant="body1" paragraph>
              La importación de empleados se ha completado correctamente.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Puede cerrar esta ventana y continuar trabajando con los empleados importados.
            </Typography>
            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Todos los empleados han sido asignados a una sucursal valida, puede editar estos campos si es necesario.
              </Typography>
            </Alert>
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
                (activeStep === 1 && !canProceedFromMapping()) ||
                (activeStep === 2 && empleadosSinSucursal > 0 && !sucursalPorDefecto)
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