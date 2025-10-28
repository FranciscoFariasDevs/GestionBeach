import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  Button,
  Fade,
  Zoom,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  Tooltip,
  Chip,
  Avatar,
  Divider,
  Stack,
  ButtonGroup,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { useSnackbar } from 'notistack';
import {
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  HotTub as HotTubIcon,
  Close as CloseIcon,
  NavigateBefore,
  NavigateNext,
  WhatsApp as WhatsAppIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  CalendarMonth as CalendarIcon,
  Bed as BedIcon,
  KingBed as KingBedIcon,
  DirectionsCar as CarIcon,
  LocationOn as LocationIcon,
  ContentCopy as CopyIcon,
  AccountBalance as BankIcon,
} from '@mui/icons-material';
import Carousel from 'react-material-ui-carousel';
import api from '../api/api';
import { enviarConfirmacionReservaCabana } from '../services/emailService';

// Colores ÚNICOS para cada cabaña (tonos VIBRANTES y brillantes)
const COLORES_CABANAS = {
  'path1': '#FF1744',  // Rojo vibrante
  'path2': '#FF6F00',  // Naranja intenso
  'path3': '#FFD600',  // Amarillo brillante
  'path4': '#00E676',  // Verde lima
  'path5': '#00BCD4',  // Cyan brillante
  'path6': '#2979FF',  // Azul eléctrico
  'path7': '#D500F9',  // Morado vibrante
  'path8': '#FF6D00',  // Naranja fuego
  'departamentoa': '#E91E63',  // Rosa fuerte
  'departamentob': '#9C27B0',  // Púrpura
  'departamentoA': '#E91E63',  // Rosa fuerte
  'departamentoB': '#9C27B0',  // Púrpura
};

// Mapeo de IDs del SVG a nombres de carpetas de imágenes
const ID_TO_FOLDER = {
  'path1': 'Cabaña 1',
  'path2': 'Cabaña 2',
  'path3': 'Cabaña 3',
  'path4': 'Cabaña 4',
  'path5': 'Cabaña 5',
  'path6': 'Cabaña 6',
  'path7': 'Cabaña 7',
  'path8': 'Cabaña 8',
  'departamentoa': 'Departamento A',
  'departamentob': 'Departamento B',
  'departamentoA': 'Departamento A',  // Con mayúscula también
  'departamentoB': 'Departamento B',  // Con mayúscula también
};

// Mapeo de IDs del SVG a nombres de cabañas para mostrar
const ID_TO_NOMBRE = {
  'path1': 'Cabaña 1',
  'path2': 'Cabaña 2',
  'path3': 'Cabaña 3',
  'path4': 'Cabaña 4',
  'path5': 'Cabaña 5',
  'path6': 'Cabaña 6',
  'path7': 'Cabaña 7',
  'path8': 'Cabaña 8',
  'departamentoa': 'Departamento A',
  'departamentob': 'Departamento B',
  'departamentoA': 'Departamento A',  // Con mayúscula también
  'departamentoB': 'Departamento B',  // Con mayúscula también
};

const ReservaCabanasPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const svgContainerRef = useRef(null);

  // Estados principales
  const [cabanas, setCabanas] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [mantenciones, setMantenciones] = useState([]);
  const [tinajas, setTinajas] = useState([]);
  const [reservasTinajas, setReservasTinajas] = useState([]);
  const [selectedCabana, setSelectedCabana] = useState(null);
  const [loading, setLoading] = useState(true);
  const [svgLoaded, setSvgLoaded] = useState(false);

  // Estados para diálogo de reserva con Stepper
  const [openReservaDialog, setOpenReservaDialog] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    cantidad_personas: 1,
    personas_extra: 0,
    cliente_nombre: '',
    cliente_apellido: '',
    cliente_telefono: '',
    cliente_email: '',
    cliente_rut: '',
    procedencia: '',
    tiene_auto: true,
    matriculas_auto: [''],
    fecha_inicio: null,
    fecha_fin: null,
    quiere_tinajas: false,
    tinajas_seleccionadas: [],
    metodo_pago: 'transferencia',
    tipo_pago: 'completo',
    estado_pago: 'pendiente',
    monto_pagado: 0,
    notas: '',
  });

  // Estado para carousel de imágenes
  const [carouselImages, setCarouselImages] = useState([]);
  // Estado para imágenes del carrusel hero
  const [heroCarouselImages, setHeroCarouselImages] = useState([]);

  // IDs de las cabañas en el SVG (exactamente como están en el archivo)
  const cabanaIds = [
    'path1',
    'path2',
    'path3',
    'path4',
    'path5',
    'path6',
    'path7',
    'path8',
    'departamentoA',  // ⚠️ MAYÚSCULA A
    'departamentoB'   // ⚠️ MAYÚSCULA B
  ];

  

  const steps = [
    'Info de Cabaña',
    'Personas y Fechas',
    'Tinajas (Opcional)',
    'Resumen y Pago'
  ];
  
  React.useEffect(() => {
    document.title = 'Reservas';

    // Restaurar título original al desmontar
    return () => {
      document.title = 'Intranet';
    };
  }, []);

  const WHATSAPP_NUMBER = '+56942652034';

  // ============================================
  // FUNCIÓN PARA COPIAR AL PORTAPAPELES (Con fallback para HTTP)
  // ============================================

  const copiarAlPortapapeles = (texto) => {
    return new Promise((resolve) => {
      // Método 1: Clipboard API (solo funciona en HTTPS)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto)
          .then(() => resolve(true))
          .catch(() => {
            // Si falla, intentar con el método fallback
            resolve(copiarConFallback(texto));
          });
      } else {
        // Si no existe clipboard API, usar fallback directamente
        resolve(copiarConFallback(texto));
      }
    });
  };

  const copiarConFallback = (texto) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = texto;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);

      // Seleccionar el texto
      if (navigator.userAgent.match(/ipad|iphone/i)) {
        // Para iOS
        const range = document.createRange();
        range.selectNodeContents(textarea);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        textarea.setSelectionRange(0, 999999);
      } else {
        textarea.select();
      }

      // Copiar
      const exitoso = document.execCommand('copy');
      document.body.removeChild(textarea);
      return exitoso;
    } catch (err) {
      console.error('Error en fallback:', err);
      return false;
    }
  };

  // ============================================
  // FUNCIÓN PARA NORMALIZAR NOMBRES
  // ============================================

  const normalizarNombre = (nombre) => {
    if (!nombre) return '';
    return nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
      .replace(/\s+/g, ''); // Eliminar espacios
  };

  // ============================================
  // FUNCIONES AUXILIARES PARA MANEJO DE FECHAS
  // ============================================

  const parseServerDate = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('T')[0].split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  const formatDateForServer = (date) => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Función para MOSTRAR fechas (sin problemas de zona horaria)
  const formatDateForDisplay = (date) => {
    if (!date) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getTodayDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false;
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  const isDateInRange = (date, startDate, endDate, includeEnd = false) => {
    if (!date || !startDate || !endDate) return false;
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    // Para mantenciones (includeEnd=true): incluir ambas fechas
    // Para reservas (includeEnd=false): el día de checkout no cuenta como ocupado
    if (includeEnd) {
      return d >= start && d <= end;
    } else {
      return d >= start && d < end;
    }
  };

  // ============================================
  // CARGA DE DATOS
  // ============================================

  useEffect(() => {
    cargarDatos();
    cargarImagenesHero();
    const interval = setInterval(cargarDatos, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cargar imágenes del carrusel hero
  const cargarImagenesHero = () => {
    try {
      // Importar todas las imágenes de la carpeta carrusel
      const imageContext = require.context('../images/carrusel', false, /\.(png|jpe?g|svg|webp)$/);
      const images = imageContext.keys().map(imageContext);
      setHeroCarouselImages(images);
      console.log('📸 Imágenes del carrusel hero cargadas:', images.length);
    } catch (error) {
      console.error('Error al cargar imágenes del carrusel hero:', error);
    }
  };

  useEffect(() => {
    if (cabanas.length > 0 && !svgLoaded) {
      cargarSVG();
    }
  }, [cabanas, svgLoaded]);

  const cargarDatos = async () => {
    try {
      const [cabanasRes, reservasRes, mantencionesRes, tinajasRes, reservasTinajasRes] = await Promise.all([
        api.get('/cabanas/cabanas'),
        api.get('/cabanas/reservas'),
        api.get('/cabanas/mantenciones/activas'),
        api.get('/cabanas/tinajas'),
        api.get('/cabanas/tinajas/reservas'),
      ]);

      setCabanas(cabanasRes.data?.cabanas || []);
      setReservas(reservasRes.data?.reservas || []);
      setMantenciones(mantencionesRes.data?.mantenciones || []);
      setTinajas(tinajasRes.data?.tinajas || []);
      setReservasTinajas(reservasTinajasRes.data?.reservas || []);
      setLoading(false);

      if (svgLoaded) {
        setTimeout(() => aplicarColores(), 100);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      enqueueSnackbar('Error al cargar datos', { variant: 'error' });
      setLoading(false);
    }
  };

  // ============================================
  // FUNCIÓN PARA CARGAR IMÁGENES DESDE CARPETAS
  // ============================================

  const cargarImagenesCabana = async (idCabana) => {
    try {
      // Obtener el nombre de carpeta correcto usando el mapeo
      const nombreCarpeta = ID_TO_FOLDER[idCabana.toLowerCase()];

      if (!nombreCarpeta) {
        console.warn(`❌ No se encontró mapeo para: ${idCabana}`);
        return [];
      }

      console.log(`🖼️ Cargando imágenes para: ${nombreCarpeta}`);

      // 🎯 Cargar el manifest de imágenes (generado con el script)
      const response = await fetch('/images-manifest.json');

      if (!response.ok) {
        console.error('❌ No se pudo cargar images-manifest.json');
        return [];
      }

      const manifest = await response.json();
      const imagenes = manifest[nombreCarpeta] || [];

      console.log(`📸 Imágenes cargadas para ${nombreCarpeta}:`, imagenes.length);
      console.log('   Imágenes:', imagenes);

      return imagenes;
    } catch (error) {
      console.error('Error al cargar imágenes:', error);
      return [];
    }
  };

  // ============================================
  // MANEJO DEL SVG
  // ============================================

  const cargarSVG = async () => {
    try {
      console.log('📥 Cargando SVG desde /plano1.svg...');
      const response = await fetch('/plano1.svg');
      if (!response.ok) throw new Error(`Error al cargar SVG: ${response.status}`);

      const svgText = await response.text();
      console.log('✅ SVG descargado, tamaño:', svgText.length, 'caracteres');

      if (svgContainerRef.current && svgText) {
        svgContainerRef.current.innerHTML = svgText;
        console.log('✅ SVG insertado en el DOM');

        // ⚡ Esperar múltiples ciclos de render para asegurar que el SVG esté completamente cargado
        setTimeout(() => {
          const svgElement = svgContainerRef.current.querySelector('svg');

          if (svgElement) {
            console.log('✅ Elemento SVG encontrado en el DOM');

            // 🔍 DEBUG: Listar TODOS los IDs encontrados
            console.log('🔍 === DEBUGGING IDS DEL SVG ===');
            const todosLosElementos = svgElement.querySelectorAll('[id]');
            console.log(`📊 Total de elementos con ID: ${todosLosElementos.length}`);
            todosLosElementos.forEach((el, idx) => {
              console.log(`${idx + 1}. ID: "${el.id}" - Tag: <${el.tagName.toLowerCase()}>`);
            });
            console.log('🔍 === FIN DEBUG ===');

            // 🎨 Aplicar colores INMEDIATAMENTE
            aplicarColores();

            // 🖱️ Configurar eventos de click
            configurarEventos();

            // ✅ Marcar como cargado
            setSvgLoaded(true);

            console.log('✅ SVG completamente inicializado');
          } else {
            console.error('❌ No se encontró elemento <svg> después de insertar');
          }
        }, 500);  // Aumentar el tiempo de espera a 500ms
      }
    } catch (error) {
      console.error('❌ Error al cargar SVG:', error);
      enqueueSnackbar(`Error al cargar mapa: ${error.message}`, { variant: 'error' });
    }
  };

  const obtenerEstadoCabana = (cabanaId) => {
    const idNormalizado = cabanaId.toLowerCase();
    const nombreCabana = ID_TO_NOMBRE[idNormalizado];
    
    if (!nombreCabana) {
      console.warn(`⚠️ No se encontró mapeo para ID: ${cabanaId}`);
      return { 
        estado: 'disponible', 
        color: COLORES_CABANAS[idNormalizado] || '#FF8C42',
        idOriginal: cabanaId
      };
    }
    
    const cabana = cabanas.find(c => {
      const nombreNormalizado = normalizarNombre(c.nombre);
      const nombreBuscado = normalizarNombre(nombreCabana);
      return nombreNormalizado === nombreBuscado ||
             nombreNormalizado.includes(nombreBuscado) ||
             nombreBuscado.includes(nombreNormalizado);
    });

    if (!cabana) {
      return { 
        estado: 'disponible', 
        color: COLORES_CABANAS[idNormalizado] || '#FF8C42',
        idOriginal: cabanaId,
        nombreCabana
      };
    }

    const hoy = getTodayDate();
    const reservaActiva = reservas.find(r => {
      if (r.cabana_id !== cabana.id) return false;
      if (r.estado === 'cancelada') return false;

      const fechaInicio = parseServerDate(r.fecha_inicio);
      const fechaFin = parseServerDate(r.fecha_fin);

      return isDateInRange(hoy, fechaInicio, fechaFin);
    });

    if (!reservaActiva) {
      return { 
        estado: 'disponible', 
        color: COLORES_CABANAS[idNormalizado] || '#FF8C42', 
        cabana,
        idOriginal: cabanaId,
        nombreCabana
      };
    }

    if (reservaActiva.estado_pago === 'pagado' || reservaActiva.estado === 'confirmada') {
      return { 
        estado: 'reservada-pagada', 
        color: '#4CAF50', 
        cabana, 
        reserva: reservaActiva,
        idOriginal: cabanaId,
        nombreCabana
      };
    } else {
      return { 
        estado: 'reservada-pendiente', 
        color: '#FFC107', 
        cabana, 
        reserva: reservaActiva,
        idOriginal: cabanaId,
        nombreCabana
      };
    }
  };

  const aplicarColores = () => {
    console.log('🎨 === APLICANDO COLORES ===');
    console.log('🎯 IDs que estamos buscando:', cabanaIds);

    // 🔥 Obtener el elemento SVG del contenedor
    const svgElement = svgContainerRef.current?.querySelector('svg');
    if (!svgElement) {
      console.error('❌ No se encontró elemento SVG en el contenedor');
      return;
    }

    cabanaIds.forEach(id => {
      // 🎯 Buscar usando querySelector en el contexto del SVG
      const elemento = svgElement.querySelector(`#${id}`);

      if (elemento) {
        const { color, nombreCabana } = obtenerEstadoCabana(id);

        console.log(`✅ ENCONTRADO: "${id}" - Aplicando color: ${color}`);

        // 🔥 FORZAR aplicación de color con máxima prioridad y contorno negro visible
        elemento.setAttribute('fill', color);
        elemento.setAttribute('fill-opacity', '0.25');  // Más opacidad para mejor visibilidad
        elemento.setAttribute('stroke', '#000000');  // Contorno NEGRO para mejor definición
        elemento.setAttribute('stroke-width', '2.5');  // Borde más grueso para mejor visibilidad
        elemento.style.setProperty('fill', color, 'important');
        elemento.style.setProperty('fill-opacity', '0.25', 'important');  // Más opacidad
        elemento.style.setProperty('stroke', '#000000', 'important');  // Negro
        elemento.style.setProperty('stroke-width', '2.5', 'important');  // Más grueso
        elemento.style.opacity = '1';
        elemento.style.transition = 'all 0.3s ease';
        elemento.style.cursor = 'pointer';
        elemento.style.filter = 'brightness(1.0) contrast(1.1)';  // Mejor contraste

        // 🔢 AGREGAR NÚMERO/LETRA EN EL CENTRO DEL POLÍGONO
        const bbox = elemento.getBBox();
        const centerX = bbox.x + bbox.width / 2;
        const centerY = bbox.y + bbox.height / 2;

        // Extraer número o letra del nombre
        let label = nombreCabana;
        if (nombreCabana.includes('Path')) {
          label = nombreCabana.replace('Path', '').trim();
        } else if (nombreCabana.includes('Departamento')) {
          label = nombreCabana.replace('Departamento', '').trim();
        } else if (nombreCabana.includes('Cabaña')) {
          label = nombreCabana.replace('Cabaña', '').trim();
        }

        // Remover texto anterior si existe
        const existingText = svgElement.querySelector(`#text-${id}`);
        if (existingText) {
          existingText.remove();
        }

        // Crear texto SVG
        const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textElement.setAttribute('id', `text-${id}`);
        textElement.setAttribute('x', centerX);
        textElement.setAttribute('y', centerY);
        textElement.setAttribute('text-anchor', 'middle');
        textElement.setAttribute('dominant-baseline', 'central');
        textElement.setAttribute('font-size', '24');
        textElement.setAttribute('font-weight', 'bold');
        textElement.setAttribute('fill', '#000000');
        textElement.setAttribute('stroke', '#FFFFFF');
        textElement.setAttribute('stroke-width', '3');
        textElement.setAttribute('paint-order', 'stroke');
        textElement.setAttribute('pointer-events', 'none');
        textElement.style.fontFamily = 'Arial, sans-serif';
        textElement.textContent = label;

        svgElement.appendChild(textElement);

        // Verificar que se aplicó
        const computedStyle = window.getComputedStyle(elemento);
        console.log(`   → Fill aplicado: ${computedStyle.fill}, Stroke: ${computedStyle.stroke}, Label: ${label}`);
      } else {
        console.error(`❌ NO ENCONTRADO: "${id}"`);
      }
    });

    console.log('🎨 === FIN APLICAR COLORES ===');
  };

  const configurarEventos = () => {
    console.log('🖱️ Configurando eventos click...');

    // 🔥 Obtener el elemento SVG del contenedor
    const svgElement = svgContainerRef.current?.querySelector('svg');
    if (!svgElement) {
      console.error('❌ No se encontró elemento SVG en el contenedor');
      return;
    }

    cabanaIds.forEach(id => {
      // 🎯 Buscar usando querySelector en el contexto del SVG
      const elemento = svgElement.querySelector(`#${id}`);

      if (elemento) {
        console.log(`✅ Click configurado para: "${id}"`);
        elemento.style.cursor = 'pointer';

        // Agregar atributo para debugging
        elemento.setAttribute('data-clickeable', 'true');
        elemento.setAttribute('data-cabana-id', id);

        elemento.addEventListener('click', async (e) => {
          console.log(`🖱️ CLICK detectado en: "${id}"`);
          e.stopPropagation();

          const { cabana, nombreCabana, estado, reserva } = obtenerEstadoCabana(id);

          // Si no existe cabaña en BD, mostrar error
          if (!cabana) {
            enqueueSnackbar(`⚠️ La cabaña "${nombreCabana || id}" no está registrada en el sistema. Contacta al administrador.`, {
              variant: 'warning',
              autoHideDuration: 5000
            });
            return;
          }

          const cabanaData = cabana;

          console.log('📦 Cabaña:', cabanaData);
          setSelectedCabana(cabanaData);

          // Cargar imágenes usando el ID
          const imagenes = await cargarImagenesCabana(id);
          console.log(`📸 Imágenes cargadas: ${imagenes.length}`);
          setCarouselImages(imagenes);

          // Abrir stepper directamente
          setFormData({
            cantidad_personas: cabanaData.capacidad_personas || 1,
            personas_extra: 0,
            cliente_nombre: '',
            cliente_apellido: '',
            cliente_telefono: '',
            cliente_email: '',
            cliente_rut: '',
            procedencia: '',
            tiene_auto: true,
            matriculas_auto: [''],
            fecha_inicio: null,
            fecha_fin: null,
            quiere_tinajas: false,
            tinajas_seleccionadas: [],
            metodo_pago: 'transferencia',
            tipo_pago: 'completo',
            estado_pago: 'pendiente',
            monto_pagado: 0,
            notas: '',
          });
          setActiveStep(0);
          setOpenReservaDialog(true);
        });

        elemento.addEventListener('mouseenter', () => {
          elemento.setAttribute('fill-opacity', '0.45');
          elemento.setAttribute('stroke-width', '3.5');
          elemento.style.setProperty('fill-opacity', '0.45', 'important');
          elemento.style.setProperty('stroke-width', '3.5', 'important');
          elemento.style.setProperty('stroke', '#000000', 'important');  // Mantener negro
          elemento.style.filter = 'brightness(1.1) contrast(1.15) drop-shadow(0 0 10px rgba(0, 0, 0, 0.3))';
        });

        elemento.addEventListener('mouseleave', () => {
          elemento.setAttribute('fill-opacity', '0.25');
          elemento.setAttribute('stroke-width', '2.5');
          elemento.style.setProperty('fill-opacity', '0.25', 'important');
          elemento.style.setProperty('stroke-width', '2.5', 'important');
          elemento.style.setProperty('stroke', '#000000', 'important');  // Mantener negro
          elemento.style.filter = 'brightness(1.0) contrast(1.1)';
        });
      } else {
        console.warn(`❌ No se pudo configurar click para: "${id}"`);
      }
    });
  };

  // ============================================
  // CUSTOM DAY COMPONENT PARA CALENDAR
  // ============================================

  const renderDayWithStatus = (date, selectedDates, pickersDayProps, tipo) => {
    if (!selectedCabana) return <PickersDay {...pickersDayProps} />;

    let dayColor = null;
    let dayLabel = '';
    let isDisabled = false;
    let isCheckoutDay = false;

    // ============================================
    // PRIORIDAD 1: MANTENCIONES (Máxima prioridad)
    // ============================================
    const mantencionesEnDia = mantenciones.filter(m => {
      if (m.cabana_id !== selectedCabana.id) return false;
      if (m.estado === 'cancelada') return false;

      const fechaInicio = parseServerDate(m.fecha_inicio);
      const fechaFin = parseServerDate(m.fecha_fin);

      // Para mantenciones: incluir tanto fecha_inicio como fecha_fin (ambos días bloqueados)
      return isDateInRange(date, fechaInicio, fechaFin, true);
    });

    if (mantencionesEnDia.length > 0) {
      const mantencion = mantencionesEnDia[0];
      dayColor = '#8D6E63'; // Color café/marrón para mantención
      dayLabel = `🔧 En Mantención: ${mantencion.motivo || 'Mantención preventiva'}`;
      isDisabled = true;

      return (
        <Tooltip title={dayLabel} arrow>
          <span>
            <PickersDay
              {...pickersDayProps}
              disabled={true}
              sx={{
                backgroundColor: dayColor,
                color: '#fff',
                fontWeight: 'bold',
                textDecoration: 'line-through',
                '&:hover': {
                  backgroundColor: dayColor,
                  filter: 'brightness(0.9)',
                },
              }}
            />
          </span>
        </Tooltip>
      );
    }

    // ============================================
    // CALENDARIO DE CHECKOUT - Lógica especial
    // ============================================
    if (tipo === 'fin' && formData.fecha_inicio) {
      const fechaInicioUsuario = new Date(formData.fecha_inicio);

      // Verificar si el usuario seleccionó un día de checkout (naranja) como check-in
      const reservaCheckoutEnInicio = reservas.find(r => {
        if (r.cabana_id !== selectedCabana.id) return false;
        if (r.estado === 'cancelada') return false;

        const fechaFin = parseServerDate(r.fecha_fin);
        return isSameDay(fechaInicioUsuario, fechaFin);
      });

      if (reservaCheckoutEnInicio) {
        // El usuario entró en un día de checkout (naranja)
        // AUTOMÁTICAMENTE: El día siguiente debe ser celeste (su checkout coincide con check-in existente)
        const diaSiguiente = new Date(fechaInicioUsuario);
        diaSiguiente.setDate(diaSiguiente.getDate() + 1);

        // Verificar si hay una reserva que empieza el día siguiente
        const reservaDiaSiguiente = reservas.find(r => {
          if (r.cabana_id !== selectedCabana.id) return false;
          if (r.estado === 'cancelada') return false;

          const fechaInicio = parseServerDate(r.fecha_inicio);
          return isSameDay(diaSiguiente, fechaInicio);
        });

        if (reservaDiaSiguiente && isSameDay(date, diaSiguiente)) {
          // Este día (día siguiente al check-in) es CELESTE
          dayColor = '#00BCD4'; // Celeste
          dayLabel = '✅ Checkout a las 12hrs / Check-in del otro reservante a las 14hrs';
          isDisabled = false;

          return (
            <Tooltip title={dayLabel} arrow>
              <span>
                <PickersDay
                  {...pickersDayProps}
                  disabled={isDisabled || pickersDayProps.disabled}
                  sx={{
                    backgroundColor: dayColor,
                    color: '#fff',
                    fontWeight: 'bold',
                    '&:hover': {
                      backgroundColor: dayColor,
                      filter: 'brightness(1.1)',
                    },
                  }}
                />
              </span>
            </Tooltip>
          );
        }

        // RESTRINGIR: Bloquear TODOS los checkouts (morados y naranjas) excepto el celeste
        const esOtroCheckout = reservas.some(r => {
          if (r.cabana_id !== selectedCabana.id) return false;
          if (r.estado === 'cancelada') return false;

          const fechaFin = parseServerDate(r.fecha_fin);
          // Bloquear cualquier checkout que NO sea el día siguiente (celeste)
          return isSameDay(date, fechaFin) && !isSameDay(date, diaSiguiente);
        });

        if (esOtroCheckout) {
          // Deshabilitar todos los checkouts excepto el celeste
          isDisabled = true;
        }
      }
    }

    // PRIMERO: Buscar reservas activas en este día (días ocupados entre check-in y check-out)
    const reservasEnDia = reservas.filter(r => {
      if (r.cabana_id !== selectedCabana.id) return false;
      if (r.estado === 'cancelada') return false;

      const fechaInicio = parseServerDate(r.fecha_inicio);
      const fechaFin = parseServerDate(r.fecha_fin);

      // Un día está ocupado si está ENTRE check-in (inclusive) y check-out (exclusive)
      return isDateInRange(date, fechaInicio, fechaFin);
    });

    if (reservasEnDia.length > 0) {
      // ⛔ Día OCUPADO (entre check-in y check-out)
      const reserva = reservasEnDia[0];
      isDisabled = true;

      // Validar por estado de pago O por estado de reserva
      if (reserva.estado_pago === 'pagado' || reserva.estado === 'confirmada' || reserva.check_in_realizado) {
        dayColor = '#F44336'; // Rojo fuerte para fechas OCUPADAS
        dayLabel = '🚫 Ocupada (Pagada o Check-in)';
      } else if (reserva.estado_pago === 'pendiente' || reserva.estado === 'pendiente') {
        dayColor = '#FFC107'; // Amarillo para pendientes
        dayLabel = '⚠️ Pendiente de pago';
      }
    } else {
      // SEGUNDO: Verificar si es día de CHECKOUT (disponible para nuevo check-in)
      const reservasCheckout = reservas.filter(r => {
        if (r.cabana_id !== selectedCabana.id) return false;
        if (r.estado === 'cancelada') return false;

        const fechaFin = parseServerDate(r.fecha_fin);
        return isSameDay(date, fechaFin);
      });

      if (reservasCheckout.length > 0) {
        // Verificar si hay una reserva que empieza el día siguiente (conflicto de mismo día)
        const diaSiguiente = new Date(date);
        diaSiguiente.setDate(diaSiguiente.getDate() + 1);

        const reservaDiaSiguiente = reservas.find(r => {
          if (r.cabana_id !== selectedCabana.id) return false;
          if (r.estado === 'cancelada') return false;

          const fechaInicio = parseServerDate(r.fecha_inicio);
          return isSameDay(diaSiguiente, fechaInicio);
        });

        if (reservaDiaSiguiente) {
          // ⚠️ DISPONIBLE pero con horarios ajustados: Hay una reserva que empieza al día siguiente
          // Checkout a las 12hrs, puede ingresar desde las 14hrs
          isCheckoutDay = true;
          dayColor = '#FF9800'; // Naranja para indicar checkout con reserva siguiente
          dayLabel = '✅ Disponible - Checkout 12hrs / Check-in desde 14hrs';
          isDisabled = false; // ✅ PERMITIR SELECCIONAR
        } else {
          // ✅ Es día de CHECKOUT - DISPONIBLE para nueva reserva
          isCheckoutDay = true;
          dayColor = '#9C27B0'; // Morado para checkout
          dayLabel = '✅ Disponible (Checkout)';
          isDisabled = false; // ✅ PERMITIR SELECCIONAR
        }
      }
    }

    return (
      <Tooltip title={dayLabel || 'Disponible'} arrow>
        <span>
          <PickersDay
            {...pickersDayProps}
            disabled={isDisabled || pickersDayProps.disabled}
            sx={{
              ...(dayColor && {
                backgroundColor: dayColor,
                color: 'white',
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: dayColor,
                  opacity: 0.8,
                },
                '&.Mui-disabled': {
                  backgroundColor: dayColor,
                  color: 'white',
                  opacity: 0.7,
                },
                // Estilo especial para días de checkout (no disabled)
                ...(isCheckoutDay && {
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: '#7B1FA2',
                    opacity: 1,
                  },
                }),
              }),
            }}
          />
        </span>
      </Tooltip>
    );
  };

  // ============================================
  // RENDERIZADO DE TINAJAS GRÁFICO
  // ============================================

  const renderTinajasVisual = () => {
    if (!formData.fecha_inicio || !formData.fecha_fin) {
      return (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            bgcolor: '#FFF3E0',
            borderRadius: 3,
            border: '2px dashed #FFB74D'
          }}
        >
          <CalendarIcon sx={{ fontSize: 60, color: '#FFB74D', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Primero selecciona las fechas de la reserva
          </Typography>
        </Paper>
      );
    }

    // 🔍 DEBUG: Log TODAS las reservas de tinajas cargadas
    console.log('🔍 === DEBUG RESERVAS TINAJAS ===');
    console.log(`📊 Total reservas tinajas: ${reservasTinajas.length}`);
    reservasTinajas.forEach((rt, idx) => {
      console.log(`${idx + 1}. Tinaja ID: ${rt.tinaja_id}, Fecha: ${rt.fecha_uso}`);
    });
    console.log('🔍 === FIN DEBUG ===');

    const fechas = [];
    let currentDate = new Date(formData.fecha_inicio);
    const endDate = new Date(formData.fecha_fin);

    // Excluir el último día (checkout)
    while (currentDate < endDate) {
      fechas.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, textAlign: 'center' }}>
          Selecciona Tinajas y Fechas
        </Typography>

        <Grid container spacing={3}>
          {tinajas.map(tinaja => (
            <Grid item xs={12} sm={6} md={4} key={tinaja.id}>
              <Card
                elevation={3}
                sx={{
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6,
                  },
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <Box sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  p: 2,
                  color: 'white'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HotTubIcon sx={{ fontSize: 32 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {tinaja.nombre || `Tinaja ${tinaja.numero}`}
                    </Typography>
                  </Box>
                </Box>

                <CardContent>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {fechas.map((fecha, idx) => {
                      const fechaStr = formatDateForServer(fecha);

                      // 🔍 DEBUG detallado de comparación de fechas
                      console.log(`\n🔍 Verificando fecha ${fechaStr} para tinaja "${tinaja.nombre}" (ID: ${tinaja.id})`);

                      // Verificar si esta fecha está ocupada
                      const estaOcupada = reservasTinajas.some(rt => {
                        // Log cada reserva que se está verificando
                        console.log(`  📋 Comparando con reserva: Tinaja ID ${rt.tinaja_id}, Fecha original: "${rt.fecha_uso}"`);

                        if (rt.tinaja_id !== tinaja.id) {
                          console.log(`  ⏩ SKIP - Diferente tinaja (${rt.tinaja_id} vs ${tinaja.id})`);
                          return false;
                        }

                        const fechaUsoReserva = formatDateForServer(parseServerDate(rt.fecha_uso));
                        const ocupada = fechaUsoReserva === fechaStr;

                        console.log(`  ⚙️ Procesada: "${rt.fecha_uso}" → Parseada → Formateada: "${fechaUsoReserva}"`);
                        console.log(`  🔍 Comparación: "${fechaUsoReserva}" === "${fechaStr}" → ${ocupada ? '✅ OCUPADA' : '❌ Libre'}`);

                        // Debug: mostrar en consola las comparaciones
                        if (ocupada) {
                          console.log(`  🚫 ¡¡¡FECHA OCUPADA!!! Tinaja ${tinaja.nombre}:`, {
                            fechaReserva: fechaUsoReserva,
                            fechaSeleccionada: fechaStr,
                            tinaja_id: rt.tinaja_id
                          });
                        }

                        return ocupada;
                      });

                      const estaSeleccionada = formData.tinajas_seleccionadas.some(ts =>
                        ts.tinaja_id === tinaja.id && formatDateForServer(ts.fecha_uso) === fechaStr
                      );

                      const handleClickFecha = () => {
                        if (estaOcupada) return;

                        if (estaSeleccionada) {
                          setFormData(prev => ({
                            ...prev,
                            tinajas_seleccionadas: prev.tinajas_seleccionadas.filter(ts =>
                              !(ts.tinaja_id === tinaja.id && formatDateForServer(ts.fecha_uso) === fechaStr)
                            )
                          }));
                        } else {
                          const temporada = getTemporadaActual();
                          const precio = temporada === 'alta'
                            ? tinaja.precio_temporada_alta
                            : tinaja.precio_temporada_baja;

                          setFormData(prev => ({
                            ...prev,
                            tinajas_seleccionadas: [
                              ...prev.tinajas_seleccionadas,
                              {
                                tinaja_id: tinaja.id,
                                tinaja_nombre: tinaja.nombre || `Tinaja ${tinaja.numero}`,
                                fecha_uso: fecha,
                                precio_dia: precio,
                              }
                            ]
                          }));
                        }
                      };

                      return (
                        <Chip
                          key={idx}
                          label={`${fecha.getDate()}/${fecha.getMonth() + 1}`}
                          size="medium"
                          onClick={handleClickFecha}
                          disabled={estaOcupada}
                          sx={{
                            bgcolor: estaOcupada ? '#FFCDD2' : estaSeleccionada ? '#4CAF50' : '#E0E0E0',
                            color: estaSeleccionada || estaOcupada ? 'white' : 'inherit',
                            fontWeight: estaSeleccionada ? 700 : 400,
                            cursor: estaOcupada ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem',
                            '&:hover': !estaOcupada ? {
                              bgcolor: estaSeleccionada ? '#45a049' : '#BDBDBD',
                            } : {},
                          }}
                        />
                      );
                    })}
                  </Box>

                  <Divider sx={{ my: 1 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Precio:
                    </Typography>
                    <Chip
                      label={`$${(getTemporadaActual() === 'alta'
                        ? tinaja.precio_temporada_alta
                        : tinaja.precio_temporada_baja)?.toLocaleString('es-CL')}/día`}
                      color="primary"
                      size="small"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {formData.tinajas_seleccionadas.length > 0 && (
          <Paper elevation={3} sx={{ mt: 4, p: 3, bgcolor: '#E8F5E9', borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#2E7D32' }}>
              Tinajas Seleccionadas ({formData.tinajas_seleccionadas.length})
            </Typography>
            <Stack spacing={1}>
              {formData.tinajas_seleccionadas.map((ts, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    p: 2,
                    bgcolor: 'white',
                    borderRadius: 2,
                    boxShadow: 1
                  }}
                >
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {ts.tinaja_nombre} - {formatDateForServer(ts.fecha_uso)}
                  </Typography>
                  <Chip
                    label={`$${ts.precio_dia?.toLocaleString('es-CL')}`}
                    color="success"
                    size="small"
                  />
                </Box>
              ))}
            </Stack>
          </Paper>
        )}
      </Box>
    );
  };

  // ============================================
  // LÓGICA DE STEPPER Y RESERVA
  // ============================================

  const getTemporadaActual = () => {
    const mes = new Date().getMonth() + 1;
    return (mes === 12 || mes === 1 || mes === 2) ? 'alta' : 'baja';
  };

  const getPrecioActual = (cabana) => {
    if (!cabana) return 0;
    const temporada = getTemporadaActual();
    return temporada === 'alta' ? cabana.precio_fin_semana : cabana.precio_noche;
  };

  const calcularCostoPersonasExtra = () => {
    if (!selectedCabana || !formData.fecha_inicio || !formData.fecha_fin) return 0;

    const capacidad = selectedCabana.capacidad_personas || 0;
    const personasExtra = Math.max(0, formData.cantidad_personas - capacidad);

    // Calcular cantidad de noches
    const fechaInicio = new Date(formData.fecha_inicio);
    const fechaFin = new Date(formData.fecha_fin);
    const diffTime = Math.abs(fechaFin - fechaInicio);
    const cantidadNoches = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // $20,000 por persona extra POR NOCHE
    return personasExtra * 20000 * cantidadNoches;
  };

  const calcularPrecioTotal = () => {
    if (!selectedCabana || !formData.fecha_inicio || !formData.fecha_fin) return 0;

    const fechaInicio = new Date(formData.fecha_inicio);
    const fechaFin = new Date(formData.fecha_fin);
    const diffTime = Math.abs(fechaFin - fechaInicio);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const precioNoche = getPrecioActual(selectedCabana);
    const costoPersonasExtra = calcularCostoPersonasExtra();
    const costoTinajas = formData.tinajas_seleccionadas.reduce((sum, t) => sum + parseFloat(t.precio_dia || 0), 0);

    return (precioNoche * diffDays) + costoPersonasExtra + costoTinajas;
  };

  const calcularMontoAPagar = () => {
    const total = calcularPrecioTotal();
    return formData.tipo_pago === 'mitad' ? total / 2 : total;
  };

  // Función para formatear RUT chileno mientras el usuario escribe
  const formatearRUT = (rut) => {
    // Eliminar caracteres no válidos
    const rutLimpio = rut.replace(/[^0-9kK]/g, '');

    if (rutLimpio.length === 0) return '';
    if (rutLimpio.length === 1) return rutLimpio;

    // Separar cuerpo y dígito verificador
    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1).toUpperCase();

    // Formatear el cuerpo con puntos
    let cuerpoFormateado = '';
    let contador = 0;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
      if (contador > 0 && contador % 3 === 0) {
        cuerpoFormateado = '.' + cuerpoFormateado;
      }
      cuerpoFormateado = cuerpo[i] + cuerpoFormateado;
      contador++;
    }

    return `${cuerpoFormateado}-${dv}`;
  };

  // Función para validar RUT chileno
  const validarRUT = (rut) => {
    if (!rut) return true; // RUT es opcional

    // Limpiar RUT
    const rutLimpio = rut.replace(/[^0-9kK]/g, '');
    if (rutLimpio.length < 2) return false;

    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1).toUpperCase();

    // Calcular dígito verificador
    let suma = 0;
    let multiplo = 2;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo.charAt(i)) * multiplo;
      multiplo = multiplo === 7 ? 2 : multiplo + 1;
    }

    const dvEsperado = 11 - (suma % 11);
    const dvCalculado = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();

    return dv === dvCalculado;
  };

  // Handler para el cambio de RUT con formateo en vivo
  const handleRUTChange = (e) => {
    const valor = e.target.value;
    const rutFormateado = formatearRUT(valor);
    setFormData({ ...formData, cliente_rut: rutFormateado });
  };

  // Función para formatear teléfono chileno mientras el usuario escribe
  const formatearTelefono = (telefono) => {
    // Eliminar todo excepto números
    const numeroLimpio = telefono.replace(/\D/g, '');

    // Si está vacío, retornar el prefijo
    if (numeroLimpio.length === 0) return '+569';

    // Si empieza con 56, quitar ese prefijo
    let numero = numeroLimpio;
    if (numero.startsWith('56')) {
      numero = numero.slice(2);
    }

    // Si empieza con 9, mantenerlo
    if (numero.startsWith('9')) {
      // Limitar a 9 dígitos (9 + 8 dígitos)
      numero = numero.slice(0, 9);
      return `+569${numero.slice(1)}`;
    }

    // Si no empieza con 9, agregarlo
    numero = numero.slice(0, 8);
    return `+569${numero}`;
  };

  // Handler para el cambio de teléfono con formateo en vivo
  const handleTelefonoChange = (e) => {
    const valor = e.target.value;

    // Si el usuario borra todo, dejar el campo vacío (no forzar +569)
    if (valor === '' || valor === '+' || valor === '+5' || valor === '+56') {
      setFormData({ ...formData, cliente_telefono: '' });
      return;
    }

    // Si el usuario está escribiendo y tiene contenido, formatear
    if (valor.length > 0) {
      const telefonoFormateado = formatearTelefono(valor);
      setFormData({ ...formData, cliente_telefono: telefonoFormateado });
    }
  };

  const handleNext = () => {
    if (activeStep === 0) {
      setActiveStep((prev) => prev + 1);
      return;
    }

    if (activeStep === 1) {
      // Validar cantidad de personas
      if (!formData.cantidad_personas || formData.cantidad_personas < 1) {
        enqueueSnackbar('Debe ingresar al menos 1 persona', { variant: 'warning' });
        return;
      }

      // Validar nombre (sin números)
      if (!formData.cliente_nombre || formData.cliente_nombre.trim() === '') {
        enqueueSnackbar('El nombre es requerido', { variant: 'warning' });
        return;
      }
      if (/\d/.test(formData.cliente_nombre)) {
        enqueueSnackbar('El nombre no puede contener números', { variant: 'warning' });
        return;
      }

      // Validar teléfono (formato +569XXXXXXXX)
      if (!formData.cliente_telefono || formData.cliente_telefono.trim() === '') {
        enqueueSnackbar('El teléfono es requerido', { variant: 'warning' });
        return;
      }
      const telefonoLimpio = formData.cliente_telefono.replace(/\s/g, '');
      if (!/^\+569\d{8}$/.test(telefonoLimpio)) {
        enqueueSnackbar('El teléfono debe tener formato +569XXXXXXXX (ejemplo: +56912345678)', { variant: 'warning' });
        return;
      }

      // Validar email (OBLIGATORIO)
      if (!formData.cliente_email || formData.cliente_email.trim() === '') {
        enqueueSnackbar('El email es requerido para enviar la confirmación', { variant: 'warning' });
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.cliente_email)) {
        enqueueSnackbar('El email no tiene un formato válido', { variant: 'warning' });
        return;
      }

      // Validar RUT (OBLIGATORIO)
      if (!formData.cliente_rut || formData.cliente_rut.trim() === '') {
        enqueueSnackbar('El RUT es requerido', { variant: 'warning' });
        return;
      }
      if (!validarRUT(formData.cliente_rut)) {
        enqueueSnackbar('El RUT no es válido', { variant: 'warning' });
        return;
      }

      // Validar fechas
      if (!formData.fecha_inicio || !formData.fecha_fin) {
        enqueueSnackbar('Debe seleccionar fechas de inicio y fin', { variant: 'warning' });
        return;
      }

      // Validar que no sean fechas pasadas
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const fechaInicio = new Date(formData.fecha_inicio);
      fechaInicio.setHours(0, 0, 0, 0);

      if (fechaInicio < hoy) {
        enqueueSnackbar('No se pueden hacer reservas en fechas pasadas', { variant: 'warning' });
        return;
      }

      if (formData.fecha_fin <= formData.fecha_inicio) {
        enqueueSnackbar('La fecha de fin debe ser posterior a la fecha de inicio', { variant: 'warning' });
        return;
      }

      // Validar que las fechas seleccionadas no tengan conflictos con reservas existentes
      const fechaInicioSeleccionada = new Date(formData.fecha_inicio);
      const fechaFinSeleccionada = new Date(formData.fecha_fin);
      fechaInicioSeleccionada.setHours(0, 0, 0, 0);
      fechaFinSeleccionada.setHours(0, 0, 0, 0);

      const reservaConflicto = reservas.find(r => {
        if (r.cabana_id !== selectedCabana.id) return false;
        if (r.estado === 'cancelada') return false;

        const fechaInicio = parseServerDate(r.fecha_inicio);
        const fechaFin = parseServerDate(r.fecha_fin);

        // Verificar si hay solapamiento de fechas
        return (
          (fechaInicioSeleccionada >= fechaInicio && fechaInicioSeleccionada < fechaFin) ||
          (fechaFinSeleccionada > fechaInicio && fechaFinSeleccionada <= fechaFin) ||
          (fechaInicioSeleccionada <= fechaInicio && fechaFinSeleccionada >= fechaFin)
        );
      });

      if (reservaConflicto) {
        const estadoReserva = reservaConflicto.estado_pago === 'pagado' ? 'Pagada' : 'Pago Pendiente';
        enqueueSnackbar(
          `❌ Las fechas seleccionadas están ocupadas. La cabaña tiene una reserva del ${formatDateForServer(parseServerDate(reservaConflicto.fecha_inicio))} al ${formatDateForServer(parseServerDate(reservaConflicto.fecha_fin))} (${estadoReserva})`,
          { variant: 'error', autoHideDuration: 7000 }
        );
        return;
      }
    }

    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleCrearReserva = async () => {
    try {
      const fechaInicio = new Date(formData.fecha_inicio);
      const fechaFin = new Date(formData.fecha_fin);
      const diffTime = Math.abs(fechaFin - fechaInicio);
      const cantidadNoches = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const precioNoche = getPrecioActual(selectedCabana);
      const costoPersonasExtra = calcularCostoPersonasExtra();
      const precioTotal = calcularPrecioTotal();
      const capacidad = selectedCabana.capacidad_personas || 0;
      const personasExtra = Math.max(0, formData.cantidad_personas - capacidad);

      const reservaData = {
        cabana_id: selectedCabana.id,
        cliente_nombre: formData.cliente_nombre,
        cliente_apellido: formData.cliente_apellido,
        cliente_telefono: formData.cliente_telefono,
        cliente_email: formData.cliente_email,
        cliente_rut: formData.cliente_rut,
        procedencia: formData.procedencia,
        matriculas_auto: formData.matriculas_auto.filter(m => m.trim() !== ''),
        fecha_inicio: formatDateForServer(formData.fecha_inicio),
        fecha_fin: formatDateForServer(formData.fecha_fin),
        cantidad_personas: formData.cantidad_personas,
        personas_extra: personasExtra,
        costo_personas_extra: costoPersonasExtra,
        cantidad_noches: cantidadNoches,
        precio_por_noche: precioNoche,
        precio_total: precioTotal,
        precio_final: precioTotal,
        descuento: 0,
        estado: 'pendiente',
        metodo_pago: formData.metodo_pago,
        estado_pago: 'pendiente',
        monto_pagado: 0,
        origen: 'manual',
        notas: formData.notas,
        usuario_creacion: 'cliente',
        tinajas: formData.tinajas_seleccionadas.map(t => ({
          tinaja_id: t.tinaja_id,
          fecha_uso: formatDateForServer(t.fecha_uso),
          precio_dia: t.precio_dia,
        })),
      };

      await api.post('/cabanas/reservas', reservaData);

      enqueueSnackbar('✅ Reserva creada exitosamente en estado PENDIENTE', { variant: 'success' });

      // Enviar email de confirmación
      const emailData = {
        ...reservaData,
        cabana_nombre: selectedCabana.nombre,
        cantidad_noches: cantidadNoches,
        precio_por_noche: precioNoche,
        costo_personas_extra: costoPersonasExtra,
        precio_total: precioTotal,
        personas_extra: personasExtra,
      };

      const emailResult = await enviarConfirmacionReservaCabana(emailData);
      if (emailResult.success) {
        enqueueSnackbar('📧 Email de confirmación enviado exitosamente', { variant: 'success' });
      } else {
        console.error('Error al enviar email:', emailResult.error);
        enqueueSnackbar('⚠️ Reserva creada pero no se pudo enviar el email de confirmación', { variant: 'warning' });
      }

      const montoPagar = calcularMontoAPagar();
      const mensaje = `¡Reserva confirmada!\n\nEnvía el comprobante de pago por ${montoPagar.toLocaleString('es-CL')} a WhatsApp`;
      enqueueSnackbar(mensaje, { variant: 'info', autoHideDuration: 10000 });

      setOpenReservaDialog(false);
      cargarDatos();
      setSelectedCabana(null);
    } catch (error) {
      console.error('Error al crear reserva:', error);
      enqueueSnackbar(
        error.response?.data?.message || 'Error al crear reserva',
        { variant: 'error' }
      );
    }
  };

  const abrirWhatsApp = () => {
    const montoPagar = calcularMontoAPagar();
    const mensaje = `Hola, quiero enviar el comprobante de pago de mi reserva por ${montoPagar.toLocaleString('es-CL')}`;
    const url = `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  // ============================================
  // RENDERIZADO DEL STEPPER CON UI ELEGANTE
  // ============================================

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Paper
              elevation={2}
              sx={{
                mb: 2,
                p: 2,
                background: `linear-gradient(135deg, ${COLORES_CABANAS[normalizarNombre(selectedCabana?.nombre)] || '#FF8C42'} 0%, ${COLORES_CABANAS[normalizarNombre(selectedCabana?.nombre)] || '#FF8C42'}CC 100%)`,
                color: 'white',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BedIcon sx={{ fontSize: 36 }} />
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  {selectedCabana?.nombre}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                <Box sx={{ textAlign: 'center', bgcolor: 'rgba(255,255,255,0.2)', px: 2, py: 1, borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
                    Capacidad
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>
                    {selectedCabana?.capacidad_personas} personas
                  </Typography>
                </Box>

                <Box sx={{ textAlign: 'center', bgcolor: 'rgba(255,255,255,0.2)', px: 2, py: 1, borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
                    Precio por Noche
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>
                    ${getPrecioActual(selectedCabana).toLocaleString('es-CL')}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
                    Temporada {getTemporadaActual() === 'alta' ? 'Alta' : 'Baja'}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {carouselImages.length > 0 ? (
              <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden', mb: 2 }}>
                <Carousel
                  navButtonsAlwaysVisible
                  indicators
                  animation="slide"
                  duration={500}
                  NextIcon={<NavigateNext />}
                  PrevIcon={<NavigateBefore />}
                >
                  {carouselImages.map((img, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        width: '100%',
                        height: '300px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        bgcolor: '#000',
                      }}
                    >
                      <img
                        src={img}
                        alt={`${selectedCabana?.nombre} - Imagen ${idx + 1}`}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                        }}
                        onError={(e) => {
                          console.error('Error cargando imagen:', img);
                          e.target.style.display = 'none';
                        }}
                      />
                    </Box>
                  ))}
                </Carousel>
              </Paper>
            ) : (
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  textAlign: 'center',
                  bgcolor: '#F5F5F5',
                  borderRadius: 2,
                  border: '2px dashed #BDBDBD',
                  height: '300px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  mb: 2
                }}
              >
                <KingBedIcon sx={{ fontSize: 80, color: '#BDBDBD', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No hay imágenes disponibles
                </Typography>
              </Paper>
            )}

            {/* Información detallada con iconos y colores */}
            <Grid container spacing={2}>
              {/* Detalles rápidos con iconos */}
              <Grid item xs={12} sm={4}>
                <Paper elevation={2} sx={{ p: 1.5, bgcolor: '#E3F2FD', borderRadius: 2, textAlign: 'center' }}>
                  <BedIcon sx={{ fontSize: 32, color: '#1976D2', mb: 0.5 }} />
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Habitaciones
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: '#1976D2' }}>
                    {selectedCabana?.numero_habitaciones || 0}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Paper elevation={2} sx={{ p: 1.5, bgcolor: '#F3E5F5', borderRadius: 2, textAlign: 'center' }}>
                  <Box sx={{ fontSize: 32, mb: 0.5 }}>🚿</Box>
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Baños
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: '#7B1FA2' }}>
                    {selectedCabana?.numero_banos || 0}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Paper elevation={2} sx={{ p: 1.5, bgcolor: '#FFF3E0', borderRadius: 2, textAlign: 'center' }}>
                  <LocationIcon sx={{ fontSize: 32, color: '#F57C00', mb: 0.5 }} />
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Ubicación
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#F57C00', fontSize: '0.75rem' }}>
                    {selectedCabana?.ubicacion || 'N/A'}
                  </Typography>
                </Paper>
              </Grid>

              {/* Amenidades con chips coloridos */}
              {selectedCabana?.amenidades && (
                <Grid item xs={12}>
                  <Paper elevation={3} sx={{ p: 2, bgcolor: '#FAFAFA', borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#424242', display: 'flex', alignItems: 'center', gap: 1 }}>
                      ✨ Amenidades e Incluye
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {(() => {
                        try {
                          const amenidadesArray = typeof selectedCabana.amenidades === 'string'
                            ? JSON.parse(selectedCabana.amenidades)
                            : selectedCabana.amenidades;

                          const coloresAmenidades = [
                            '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
                            '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
                            '#F8B739', '#52B788', '#E63946', '#A8DADC'
                          ];

                          return amenidadesArray.map((amenidad, index) => (
                            <Chip
                              key={index}
                              label={amenidad}
                              size="small"
                              sx={{
                                bgcolor: coloresAmenidades[index % coloresAmenidades.length],
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                '& .MuiChip-label': {
                                  px: 1.5
                                },
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                              }}
                            />
                          ));
                        } catch (e) {
                          console.error('Error parsing amenidades:', e);
                          return null;
                        }
                      })()}
                    </Box>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
        );

      case 1:
        // PASO 2: Fechas, Personas y Datos del Cliente - LAYOUT COMPACTO
        const capacidad = selectedCabana?.capacidad_personas || 0;
        const personasExtra = Math.max(0, formData.cantidad_personas - capacidad);

        // Calcular noches si hay fechas seleccionadas
        let cantidadNoches = 0;
        if (formData.fecha_inicio && formData.fecha_fin) {
          const fechaInicioCalc = new Date(formData.fecha_inicio);
          const fechaFinCalc = new Date(formData.fecha_fin);
          const diffTime = Math.abs(fechaFinCalc - fechaInicioCalc);
          cantidadNoches = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        const precioNocheCabana = getPrecioActual(selectedCabana);
        const costoExtra = personasExtra * 20000 * (cantidadNoches || 1);
        const costoTotalNoche = (cantidadNoches > 0) ? (precioNocheCabana * cantidadNoches) + costoExtra : 0;

        return (
          <Box>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={7}>
                <Paper elevation={3} sx={{ p: 2, borderRadius: 2, bgcolor: '#E3F2FD' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Avatar sx={{ bgcolor: '#1976D2', width: 40, height: 40 }}>
                      <CalendarIcon sx={{ fontSize: 24 }} />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Fechas de Reserva
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        <strong style={{ color: '#F44336' }}>Rojo</strong>: Ocupada • <strong style={{ color: '#FFC107' }}>Amarillo</strong>: Pendiente • <strong style={{ color: '#9C27B0' }}>Morado</strong>: Checkout
                      </Typography>
                    </Box>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={6}>
                      <DatePicker
                        label="Check-In"
                        value={formData.fecha_inicio}
                        onChange={(newValue) => setFormData({ ...formData, fecha_inicio: newValue })}
                        minDate={new Date()}
                        slots={{
                          day: (props) => renderDayWithStatus(props.day, [], props, 'inicio'),
                        }}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            variant: 'outlined',
                            size: 'small'
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={6}>
                      <DatePicker
                        label="Check-Out"
                        value={formData.fecha_fin}
                        onChange={(newValue) => setFormData({ ...formData, fecha_fin: newValue })}
                        minDate={formData.fecha_inicio || new Date()}
                        slots={{
                          day: (props) => renderDayWithStatus(props.day, [], props, 'fin'),
                        }}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            variant: 'outlined',
                            size: 'small'
                          }
                        }}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              <Grid item xs={12} md={5}>
                <Paper elevation={3} sx={{ p: 2, borderRadius: 2, bgcolor: '#FFF3E0', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Avatar sx={{ bgcolor: '#FF8C42', width: 40, height: 40 }}>
                      <PeopleIcon sx={{ fontSize: 24 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        ¿Cuántas personas?
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Capacidad: <strong>{capacidad}</strong> {personasExtra > 0 && `(+${personasExtra} extra)`}
                      </Typography>
                    </Box>
                  </Box>

                  {!formData.fecha_inicio || !formData.fecha_fin ? (
                    <Paper elevation={0} sx={{ p: 1.5, textAlign: 'center', bgcolor: '#FFF3E0', borderRadius: 1, border: '2px dashed #FFB74D' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Selecciona las fechas primero
                      </Typography>
                    </Paper>
                  ) : (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                        <IconButton
                          onClick={() => setFormData({ ...formData, cantidad_personas: Math.max(1, formData.cantidad_personas - 1) })}
                          disabled={formData.cantidad_personas <= 1}
                          sx={{
                            bgcolor: '#FF8C42',
                            color: 'white',
                            width: 40,
                            height: 40,
                            '&:hover': { bgcolor: '#FF7722' },
                            '&:disabled': { bgcolor: '#E0E0E0' }
                          }}
                        >
                          <RemoveIcon />
                        </IconButton>

                        <Paper elevation={0} sx={{ px: 3, py: 1, bgcolor: 'white', borderRadius: 1, border: `3px solid #FF8C42` }}>
                          <Typography variant="h3" sx={{ fontWeight: 900, color: '#FF8C42', minWidth: '50px', textAlign: 'center' }}>
                            {formData.cantidad_personas}
                          </Typography>
                        </Paper>

                        <IconButton
                          onClick={() => setFormData({ ...formData, cantidad_personas: formData.cantidad_personas + 1 })}
                          disabled={personasExtra >= 3}
                          sx={{
                            bgcolor: '#FF8C42',
                            color: 'white',
                            width: 40,
                            height: 40,
                            '&:hover': { bgcolor: '#FF7722' },
                            '&:disabled': { bgcolor: '#E0E0E0' }
                          }}
                        >
                          <AddIcon />
                        </IconButton>
                      </Box>
                      {personasExtra >= 3 && (
                        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1, color: '#F57C00', fontWeight: 600 }}>
                          ⚠️ Máximo 3 extra
                        </Typography>
                      )}
                    </>
                  )}
                </Paper>
              </Grid>
            </Grid>

            {cantidadNoches > 0 && (
              <Paper elevation={3} sx={{ p: 2, bgcolor: '#E8F5E9', borderRadius: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={8}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 1, flex: '1 1 auto' }}>
                        <Typography variant="caption" color="text.secondary">Cabaña × Noches:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          ${precioNocheCabana.toLocaleString('es-CL')} × {cantidadNoches} = ${(precioNocheCabana * cantidadNoches).toLocaleString('es-CL')}
                        </Typography>
                      </Box>

                      {personasExtra > 0 && (
                        <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 1, flex: '1 1 auto' }}>
                          <Typography variant="caption" color="text.secondary">Personas Extra:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#F57C00' }}>
                            {personasExtra} × {cantidadNoches} × $20k = ${costoExtra.toLocaleString('es-CL')}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'white', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">TOTAL</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, color: '#2E7D32' }}>
                        ${costoTotalNoche.toLocaleString('es-CL')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">(sin tinajas)</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            )}

            <Paper elevation={3} sx={{ p: 2, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Avatar sx={{ bgcolor: '#2196F3', width: 40, height: 40 }}>
                  <PersonIcon sx={{ fontSize: 24 }} />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Tus Datos
                </Typography>
              </Box>

              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Nombre"
                    value={formData.cliente_nombre}
                    onChange={(e) => setFormData({ ...formData, cliente_nombre: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Apellido"
                    value={formData.cliente_apellido}
                    onChange={(e) => setFormData({ ...formData, cliente_apellido: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Teléfono"
                    value={formData.cliente_telefono}
                    onChange={handleTelefonoChange}
                    required
                    placeholder="+569XXXXXXXX"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Email"
                    type="email"
                    value={formData.cliente_email}
                    onChange={(e) => setFormData({ ...formData, cliente_email: e.target.value })}
                    placeholder="ejemplo@correo.com"
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="RUT"
                    value={formData.cliente_rut}
                    onChange={handleRUTChange}
                    required
                    placeholder="12.345.678-9"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Procedencia"
                    value={formData.procedencia}
                    onChange={(e) => setFormData({ ...formData, procedencia: e.target.value })}
                    placeholder="Ciudad de origen"
                  />
                </Grid>
              </Grid>
            </Paper>

            <Paper elevation={3} sx={{ p: 2, borderRadius: 2, mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CarIcon sx={{ fontSize: 20 }} />
                Información de Vehículo
              </Typography>

              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={!formData.tiene_auto}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        tiene_auto: !e.target.checked,
                        matriculas_auto: e.target.checked ? [] : ['']
                      });
                    }}
                  />
                }
                label={<Typography variant="body2">No voy en auto particular</Typography>}
              />

              {formData.tiene_auto && (
                <Box sx={{ mt: 1 }}>
                  {formData.matriculas_auto.map((matricula, index) => (
                    <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                      <TextField
                        fullWidth
                        size="small"
                        label={`Matrícula ${index + 1}`}
                        value={matricula}
                        onChange={(e) => {
                          const nuevasMatriculas = [...formData.matriculas_auto];
                          nuevasMatriculas[index] = e.target.value.toUpperCase();
                          setFormData({ ...formData, matriculas_auto: nuevasMatriculas });
                        }}
                        placeholder="AA-BB-12"
                      />
                      {formData.matriculas_auto.length > 1 && (
                        <IconButton
                          size="small"
                          onClick={() => {
                            const nuevasMatriculas = formData.matriculas_auto.filter((_, i) => i !== index);
                            setFormData({ ...formData, matriculas_auto: nuevasMatriculas });
                          }}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setFormData({ ...formData, matriculas_auto: [...formData.matriculas_auto, ''] });
                    }}
                  >
                    Agregar vehículo
                  </Button>
                </Box>
              )}
            </Paper>
          </Box>
        );

      case 2:
        // PASO 3: Tinajas - COMPACTO
        return (
          <Box>
            <Paper elevation={3} sx={{ p: 2, mb: 2, textAlign: 'center', borderRadius: 2, bgcolor: '#F3E5F5' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1.5 }}>
                <Avatar sx={{ bgcolor: '#9C27B0', width: 50, height: 50 }}>
                  <HotTubIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  ¿Deseas agregar tinajas?
                </Typography>
              </Box>
              <ButtonGroup size="medium" variant="contained">
                <Button
                  onClick={() => setFormData({ ...formData, quiere_tinajas: true })}
                  variant={formData.quiere_tinajas ? 'contained' : 'outlined'}
                  sx={{
                    px: 3,
                    py: 1,
                    bgcolor: formData.quiere_tinajas ? '#9C27B0' : 'transparent',
                    '&:hover': { bgcolor: formData.quiere_tinajas ? '#7B1FA2' : 'rgba(156, 39, 176, 0.1)' }
                  }}
                >
                  Sí, quiero
                </Button>
                <Button
                  onClick={() => setFormData({ ...formData, quiere_tinajas: false, tinajas_seleccionadas: [] })}
                  variant={!formData.quiere_tinajas ? 'contained' : 'outlined'}
                  sx={{
                    px: 3,
                    py: 1,
                    bgcolor: !formData.quiere_tinajas ? '#9C27B0' : 'transparent',
                    '&:hover': { bgcolor: !formData.quiere_tinajas ? '#7B1FA2' : 'rgba(156, 39, 176, 0.1)' }
                  }}
                >
                  No, gracias
                </Button>
              </ButtonGroup>
            </Paper>

            {formData.quiere_tinajas && renderTinajasVisual()}
          </Box>
        );

      case 3:
        // PASO 4: Resumen y Pago
        const total = calcularPrecioTotal();
        const montoPagar = calcularMontoAPagar();

        // Calcular desglose detallado
        const fechaInicioResumen = new Date(formData.fecha_inicio);
        const fechaFinResumen = new Date(formData.fecha_fin);
        const diffTimeResumen = Math.abs(fechaFinResumen - fechaInicioResumen);
        const nochesReserva = Math.ceil(diffTimeResumen / (1000 * 60 * 60 * 24));
        const precioNoche = getPrecioActual(selectedCabana);
        const subtotalCabana = precioNoche * nochesReserva;
        const costoPersonasExtra = calcularCostoPersonasExtra();
        const capacidadCabana = selectedCabana?.capacidad_personas || 0;
        const personasExtraResumen = Math.max(0, formData.cantidad_personas - capacidadCabana);
        const costoTinajas = formData.tinajas_seleccionadas.reduce((sum, t) => sum + parseFloat(t.precio_dia || 0), 0);

        return (
          <Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Paper elevation={3} sx={{ p: 2, borderRadius: 2, bgcolor: '#F5F5F5', height: '100%' }}>
                  <Typography variant="h6" sx={{ fontWeight: 900, mb: 1.5, textAlign: 'center' }}>
                    Resumen de la Reserva
                  </Typography>

                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: 'white', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">Cabaña:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedCabana?.nombre}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: 'white', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">Cliente:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {formData.cliente_nombre} {formData.cliente_apellido}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: 'white', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">Personas:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{formData.cantidad_personas}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: 'white', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">Check-In:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {formData.fecha_inicio ? formatDateForDisplay(formData.fecha_inicio) : '-'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: 'white', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">Check-Out:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {formData.fecha_fin ? formatDateForDisplay(formData.fecha_fin) : '-'}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper elevation={3} sx={{ p: 2, borderRadius: 2, bgcolor: '#E8F5E9', height: '100%' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#2E7D32', textAlign: 'center' }}>
                    Desglose de Costos
                  </Typography>

                  <Stack spacing={1}>
                    <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">Cabaña {selectedCabana?.nombre}:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        ${precioNoche.toLocaleString('es-CL')} × {nochesReserva} = ${subtotalCabana.toLocaleString('es-CL')}
                      </Typography>
                    </Box>

                    {personasExtraResumen > 0 && (
                      <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Personas Extra:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#F57C00' }}>
                          {personasExtraResumen} × {nochesReserva} × $20k = ${costoPersonasExtra.toLocaleString('es-CL')}
                        </Typography>
                      </Box>
                    )}

                    {formData.tinajas_seleccionadas.length > 0 && (
                      <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Tinajas:</Typography>
                        {formData.tinajas_seleccionadas.map((ts, idx) => (
                          <Typography key={idx} variant="caption" sx={{ display: 'block', pl: 1 }}>
                            • {ts.tinaja_nombre}: ${ts.precio_dia?.toLocaleString('es-CL')}
                          </Typography>
                        ))}
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#9C27B0', mt: 0.5 }}>
                          = ${costoTinajas.toLocaleString('es-CL')}
                        </Typography>
                      </Box>
                    )}

                    <Divider />

                    <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: '#2E7D32' }}>
                        TOTAL: ${total.toLocaleString('es-CL')}
                      </Typography>
                    </Box>

                    <Paper elevation={0} sx={{ p: 1.5, mt: 1, bgcolor: formData.tipo_pago === 'completo' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)', border: `2px solid ${formData.tipo_pago === 'completo' ? '#4CAF50' : '#FF9800'}`, borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, textAlign: 'center' }}>
                    Forma de Pago
                  </Typography>

                  <FormControl component="fieldset" fullWidth>
                    <RadioGroup
                      value={formData.tipo_pago}
                      onChange={(e) => setFormData({ ...formData, tipo_pago: e.target.value })}
                    >
                      <Paper elevation={0} sx={{ p: 1.5, mb: 1, bgcolor: formData.tipo_pago === 'completo' ? '#E8F5E9' : '#F5F5F5', border: formData.tipo_pago === 'completo' ? '2px solid #4CAF50' : '1px solid #E0E0E0', borderRadius: 1 }}>
                        <FormControlLabel
                          value="completo"
                          control={<Radio size="small" />}
                          label={
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                Completo: ${total.toLocaleString('es-CL')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Pago total
                              </Typography>
                            </Box>
                          }
                        />
                      </Paper>

                      <Paper elevation={0} sx={{ p: 1.5, bgcolor: formData.tipo_pago === 'mitad' ? '#E8F5E9' : '#F5F5F5', border: formData.tipo_pago === 'mitad' ? '2px solid #4CAF50' : '1px solid #E0E0E0', borderRadius: 1 }}>
                        <FormControlLabel
                          value="mitad"
                          control={<Radio size="small" />}
                          label={
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                Mitad: ${(total / 2).toLocaleString('es-CL')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                50% ahora, 50% al check-in
                              </Typography>
                            </Box>
                          }
                        />
                      </Paper>
                    </RadioGroup>
                  </FormControl>
                    </Paper>
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper elevation={3} sx={{ p: 2, bgcolor: '#E8F5E9', borderRadius: 2, border: '2px solid #4CAF50', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                    <BankIcon sx={{ fontSize: 40, color: '#4CAF50' }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#2E7D32' }}>
                      Datos Bancarios
                    </Typography>
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#D32F2F' }}>
                    Transferir: ${montoPagar.toLocaleString('es-CL')}
                  </Typography>
                </Box>

                <Box sx={{ bgcolor: 'white', p: 2, borderRadius: 1, mb: 2, flex: 1 }}>
                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">BANCO</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>SANTANDER</Typography>
                    </Box>
                    <Divider />
                    <Box>
                      <Typography variant="caption" color="text.secondary">CUENTA CORRIENTE N°</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>67498593</Typography>
                    </Box>
                    <Divider />
                    <Box>
                      <Typography variant="caption" color="text.secondary">RAZÓN SOCIAL</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>BEACH MARKET LTDA.</Typography>
                    </Box>
                    <Divider />
                    <Box>
                      <Typography variant="caption" color="text.secondary">RUT</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>76.236.893-5</Typography>
                    </Box>
                    <Divider />
                    <Box>
                      <Typography variant="caption" color="text.secondary">EMAIL</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>ELMIRADORDICHATO@GMAIL.COM</Typography>
                    </Box>
                  </Stack>
                </Box>

                <Stack spacing={1}>
                  <Button
                    variant="contained"
                    size="medium"
                    fullWidth
                    startIcon={<CopyIcon />}
                    onClick={async () => {
                      const datosBancarios = `DATOS BANCARIOS CABAÑAS EL MIRADOR
BANCO: SANTANDER
CUENTA CORRIENTE N°: 67498593
RAZÓN SOCIAL / NOMBRE: BEACH MARKET LTDA.
RUT: 76.236.893-5
CORREO ELECTRÓNICO: ELMIRADORDICHATO@GMAIL.COM`;

                      try {
                        const exitoso = await copiarAlPortapapeles(datosBancarios);
                        if (exitoso) {
                          enqueueSnackbar('✅ Datos copiados', { variant: 'success' });
                        } else {
                          enqueueSnackbar('❌ Error al copiar', { variant: 'error' });
                        }
                      } catch (err) {
                        console.error('Error al copiar:', err);
                        enqueueSnackbar('❌ Error al copiar', { variant: 'error' });
                      }
                    }}
                    sx={{
                      bgcolor: '#1976D2',
                      fontWeight: 700,
                      '&:hover': { bgcolor: '#1565C0' }
                    }}
                  >
                    Copiar Datos
                  </Button>

                  <Button
                    variant="outlined"
                    size="medium"
                    fullWidth
                  startIcon={<CopyIcon />}
                  onClick={async () => {
                    try {
                      const exitoso = await copiarAlPortapapeles('ELMIRADORDICHATO@GMAIL.COM');
                      if (exitoso) {
                        enqueueSnackbar('✅ Correo copiado al portapapeles', { variant: 'success' });
                      } else {
                        enqueueSnackbar('❌ Error al copiar. Intenta de nuevo.', { variant: 'error' });
                      }
                    } catch (err) {
                      console.error('Error al copiar:', err);
                      enqueueSnackbar('❌ Error al copiar. Intenta de nuevo.', { variant: 'error' });
                    }
                  }}
                  sx={{
                    borderColor: '#1976D2',
                    color: '#1976D2',
                    fontWeight: 700,
                    py: 1.5,
                    '&:hover': { borderColor: '#1565C0', bgcolor: '#E3F2FD' }
                  }}
                >
                  Copiar solo Correo
                </Button>
              </Stack>
            </Paper>
              </Grid>
            </Grid>

            <Stack spacing={2} sx={{ mt: 2 }}>
              <Paper elevation={3} sx={{ p: 2, bgcolor: '#E3F2FD', borderRadius: 2 }}>
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                    <WhatsAppIcon sx={{ fontSize: 40, color: '#25D366' }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Enviar Comprobante
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Transfiere <strong>${montoPagar.toLocaleString('es-CL')}</strong> y envía tu comprobante:
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="medium"
                  fullWidth
                  startIcon={<WhatsAppIcon />}
                  onClick={abrirWhatsApp}
                  sx={{
                    bgcolor: '#25D366',
                    color: 'white',
                    fontWeight: 700,
                    '&:hover': { bgcolor: '#20BA5A' }
                  }}
                >
                  Enviar al {WHATSAPP_NUMBER}
                </Button>
              </Paper>

              <TextField
                fullWidth
                size="small"
                label="Notas adicionales (opcional)"
                multiline
                rows={3}
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                variant="outlined"
                placeholder="¿Alguna solicitud especial?"
              />

              <Paper elevation={1} sx={{ p: 2, bgcolor: '#FFF3E0', borderRadius: 2, border: '1px solid #FFB74D' }}>
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mb: 1, color: '#E65100' }}>
                  POLÍTICAS DE CANCELACIÓN
                </Typography>
                <Stack spacing={0.5}>
                  <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', lineHeight: 1.4 }}>
                    <strong>1.</strong> Cancelación con <strong>10+ días</strong>: reembolso 100%
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', lineHeight: 1.4 }}>
                    <strong>2.</strong> Cancelación con <strong>5 días</strong>: reembolso 50%
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', lineHeight: 1.4 }}>
                    <strong>3.</strong> Cancelación con <strong>1 día</strong>: sin reembolso
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', lineHeight: 1.4 }}>
                    <strong>4.</strong> Salida anticipada: sin devolución
                  </Typography>
                </Stack>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', fontSize: '0.65rem', fontStyle: 'italic', color: '#6D4C41' }}>
                  Atte. Cabañas El Mirador de Dichato
                </Typography>
              </Paper>
            </Stack>
          </Box>
        );

      default:
        return 'Paso desconocido';
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #B3E5FC 0%, #81D4FA 10%, #4FC3F7 20%, #E1F5FE 40%, #FFFFFF 70%, #FFFFFF 100%)',
          backgroundAttachment: 'fixed',
          py: 4,
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 10%, rgba(129, 212, 250, 0.3) 0%, transparent 40%), radial-gradient(circle at 80% 30%, rgba(179, 229, 252, 0.25) 0%, transparent 50%)',
            pointerEvents: 'none',
          }
        }}
      >
        <Container maxWidth="xl">
          {/* Hero Section - Presentación Elegante con Carrusel */}
          <Fade in timeout={1000}>
            <Box sx={{ textAlign: 'center', mb: 6, position: 'relative', zIndex: 1 }}>
              <Paper
                elevation={8}
                sx={{
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)',
                  borderRadius: 4,
                  border: '3px solid #2196F3',
                  boxShadow: '0 12px 40px rgba(33, 150, 243, 0.3)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '6px',
                    background: 'linear-gradient(90deg, #2196F3 0%, #64B5F6 50%, #2196F3 100%)',
                  }
                }}
              >
                {/* Carrusel de Imágenes Hero */}
                {heroCarouselImages.length > 0 ? (
                  <Box sx={{ position: 'relative', mb: 4 }}>
                    <Carousel
                      navButtonsAlwaysVisible
                      indicators
                      animation="fade"
                      duration={700}
                      interval={5000}
                      NextIcon={<NavigateNext />}
                      PrevIcon={<NavigateBefore />}
                      navButtonsProps={{
                        style: {
                          backgroundColor: 'rgba(33, 150, 243, 0.8)',
                          borderRadius: '50%',
                          margin: '0 20px',
                        }
                      }}
                      indicatorIconButtonProps={{
                        style: {
                          color: 'rgba(255, 255, 255, 0.5)',
                          margin: '0 5px',
                        }
                      }}
                      activeIndicatorIconButtonProps={{
                        style: {
                          color: '#2196F3',
                        }
                      }}
                    >
                      {heroCarouselImages.map((img, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            width: '100%',
                            height: '500px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            bgcolor: '#000',
                            position: 'relative',
                          }}
                        >
                          <img
                            src={img}
                            alt={`Vista de cabañas ${idx + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                            onError={(e) => {
                              console.error('Error cargando imagen del carrusel:', img);
                              e.target.style.display = 'none';
                            }}
                          />
                          {/* Overlay con gradiente para mejor legibilidad */}
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: '50%',
                              background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
                              pointerEvents: 'none',
                            }}
                          />
                        </Box>
                      ))}
                    </Carousel>
                  </Box>
                ) : null}

                {/* Contenido Textual */}
                <Box sx={{ p: 6, pt: heroCarouselImages.length > 0 ? 2 : 6 }}>
                  <Typography
                    variant="h2"
                    sx={{
                      fontWeight: 900,
                      background: 'linear-gradient(135deg, #1976D2 0%, #2196F3 50%, #64B5F6 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      mb: 3,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Bienvenidos a Cabañas El Mirador
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      color: '#455A64',
                      fontWeight: 400,
                      mb: 4,
                      lineHeight: 1.6,
                      maxWidth: '900px',
                      margin: '0 auto',
                      mb: 4,
                    }}
                  >
                    Experimenta la comodidad y tranquilidad de nuestras cabañas frente al hermoso mar,
                    con vista privilegiada a la playa en la costa de Dichato. Un refugio perfecto donde el
                    descanso se encuentra con la belleza natural del océano Pacífico.
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4} justifyContent="center" sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: '#2196F3', width: 56, height: 56 }}>
                        <BedIcon sx={{ fontSize: 28 }} />
                      </Avatar>
                      <Box sx={{ textAlign: 'left' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976D2' }}>
                          Diseño Moderno
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Arquitectura contemporánea
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: '#2196F3', width: 56, height: 56 }}>
                        <HotTubIcon sx={{ fontSize: 28 }} />
                      </Avatar>
                      <Box sx={{ textAlign: 'left' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976D2' }}>
                          Comodidades Premium
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Tinajas y amenidades
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: '#2196F3', width: 56, height: 56 }}>
                        <PeopleIcon sx={{ fontSize: 28 }} />
                      </Avatar>
                      <Box sx={{ textAlign: 'left' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976D2' }}>
                          Para Ti y Tu Familia
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Espacios amplios
                        </Typography>
                      </Box>
                    </Box>
                  </Stack>
                  <Divider sx={{ my: 4, borderColor: '#E3F2FD' }} />
                  <Typography
                    variant="h6"
                    sx={{
                      color: '#1976D2',
                      fontWeight: 600,
                      mb: 1,
                    }}
                  >
                    Selecciona tu Cabaña Ideal
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: '#546E7A',
                      fontWeight: 400,
                    }}
                  >
                    Haz clic en cualquier cabaña del mapa para conocer más detalles y realizar tu reserva
                  </Typography>
                </Box>
              </Paper>
            </Box>
          </Fade>

          {/* Mapa SVG - Reducido y con mejor contraste */}
          <Zoom in timeout={1200}>
            <Paper
              elevation={10}
              sx={{
                p: 2,
                background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)',
                backdropFilter: 'blur(10px)',
                borderRadius: 4,
                maxWidth: '900px',
                margin: '0 auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                border: '3px solid #2196F3',
                boxShadow: '0 12px 40px rgba(33, 150, 243, 0.25)',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {loading ? (
                <Box sx={{ p: 6, textAlign: 'center' }}>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                    Cargando mapa interactivo...
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Preparando tu experiencia
                  </Typography>
                </Box>
              ) : (
                <Box
                  ref={svgContainerRef}
                  sx={{
                    width: '100%',
                    height: 'auto',
                    filter: 'brightness(1.1) contrast(1.0) saturate(1.3)',
                    '& svg': {
                      width: '100%',
                      height: 'auto',
                      maxHeight: '500px',
                      filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.15))',
                    },
                  }}
                />
              )}
            </Paper>
          </Zoom>
        </Container>

        {/* Dialog de Reserva con Stepper */}
        <Dialog
          open={openReservaDialog}
          onClose={() => setOpenReservaDialog(false)}
          maxWidth="xl"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              width: '95vw',
              maxWidth: '1400px'
            }
          }}
        >
          <DialogTitle sx={{ bgcolor: '#FFF3E0', borderBottom: '3px solid #FF8C42' }}>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#D84315' }}>
              Nueva Reserva - {selectedCabana?.nombre}
            </Typography>
          </DialogTitle>
          <DialogContent
            dividers
            sx={{
              p: 2,
              maxHeight: '75vh',
              overflowY: 'auto'
            }}
          >
            <Stepper activeStep={activeStep} sx={{ mb: 2 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            <Box>
              {getStepContent(activeStep)}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, justifyContent: 'space-between', bgcolor: '#F5F5F5' }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              startIcon={<ArrowBackIcon />}
              size="large"
              sx={{ fontWeight: 600 }}
            >
              Atrás
            </Button>

            <Box>
              <Button
                onClick={() => setOpenReservaDialog(false)}
                sx={{ mr: 2, fontWeight: 600 }}
                size="large"
              >
                Cancelar
              </Button>

              {activeStep === steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleCrearReserva}
                  size="large"
                  sx={{
                    bgcolor: '#4CAF50',
                    fontWeight: 700,
                    px: 4,
                    '&:hover': { bgcolor: '#45A049' },
                  }}
                >
                  Confirmar Reserva
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  endIcon={<ArrowForwardIcon />}
                  size="large"
                  sx={{
                    bgcolor: '#FF8C42',
                    fontWeight: 700,
                    px: 4,
                    '&:hover': { bgcolor: '#FF7722' },
                  }}
                >
                  Siguiente
                </Button>
              )}
            </Box>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default ReservaCabanasPage;