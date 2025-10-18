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
} from '@mui/icons-material';
import Carousel from 'react-material-ui-carousel';
import api from '../api/api';

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

  const WHATSAPP_NUMBER = '+56942652034';

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

  const isDateInRange = (date, startDate, endDate) => {
    if (!date || !startDate || !endDate) return false;
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    // El día de checkout no cuenta como ocupado (< en vez de <=)
    return d >= start && d < end;
  };

  // ============================================
  // CARGA DE DATOS
  // ============================================

  useEffect(() => {
    cargarDatos();
    const interval = setInterval(cargarDatos, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (cabanas.length > 0 && !svgLoaded) {
      cargarSVG();
    }
  }, [cabanas, svgLoaded]);

  const cargarDatos = async () => {
    try {
      const [cabanasRes, reservasRes, tinajasRes, reservasTinajasRes] = await Promise.all([
        api.get('/cabanas/cabanas'),
        api.get('/cabanas/reservas'),
        api.get('/cabanas/tinajas'),
        api.get('/cabanas/tinajas/reservas'),
      ]);

      setCabanas(cabanasRes.data?.cabanas || []);
      setReservas(reservasRes.data?.reservas || []);
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
        const { color } = obtenerEstadoCabana(id);

        console.log(`✅ ENCONTRADO: "${id}" - Aplicando color: ${color}`);

        // 🔥 FORZAR aplicación de color con máxima prioridad
        elemento.setAttribute('fill', color);
        elemento.setAttribute('fill-opacity', '0.15');  // Súper transparente
        elemento.setAttribute('stroke', '#A5D6A7');  // Verde pastel suave para bordes
        elemento.setAttribute('stroke-width', '1');  // Borde muy delgado
        elemento.style.setProperty('fill', color, 'important');
        elemento.style.setProperty('fill-opacity', '0.15', 'important');  // Súper transparente
        elemento.style.setProperty('stroke', '#A5D6A7', 'important');
        elemento.style.setProperty('stroke-width', '1', 'important');
        elemento.style.opacity = '1';
        elemento.style.transition = 'all 0.3s ease';
        elemento.style.cursor = 'pointer';
        elemento.style.filter = 'brightness(1.2)';  // Más claro

        // Verificar que se aplicó
        const computedStyle = window.getComputedStyle(elemento);
        console.log(`   → Fill aplicado: ${computedStyle.fill}, Stroke: ${computedStyle.stroke}`);
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
          elemento.setAttribute('fill-opacity', '0.3');
          elemento.setAttribute('stroke-width', '2');
          elemento.style.setProperty('fill-opacity', '0.3', 'important');
          elemento.style.setProperty('stroke-width', '2', 'important');
          elemento.style.filter = 'brightness(1.3) drop-shadow(0 0 12px rgba(165, 214, 167, 0.5))';
        });

        elemento.addEventListener('mouseleave', () => {
          elemento.setAttribute('fill-opacity', '0.15');
          elemento.setAttribute('stroke-width', '1');
          elemento.style.setProperty('fill-opacity', '0.15', 'important');
          elemento.style.setProperty('stroke-width', '1', 'important');
          elemento.style.filter = 'brightness(1.2)';
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

    // Buscar reservas en esta fecha para esta cabaña
    const reservasEnDia = reservas.filter(r => {
      if (r.cabana_id !== selectedCabana.id) return false;
      if (r.estado === 'cancelada') return false;

      const fechaInicio = parseServerDate(r.fecha_inicio);
      const fechaFin = parseServerDate(r.fecha_fin);

      return isDateInRange(date, fechaInicio, fechaFin);
    });

    // Si hay reservas en esta fecha, deshabilitar y colorear
    if (reservasEnDia.length > 0) {
      const reserva = reservasEnDia[0];
      isDisabled = true; // ⚠️ DESHABILITAR FECHA OCUPADA

      // Validar por estado de pago O por estado de reserva
      if (reserva.estado_pago === 'pagado' || reserva.estado === 'confirmada' || reserva.check_in_realizado) {
        dayColor = '#F44336'; // Rojo fuerte para fechas OCUPADAS
        dayLabel = '🚫 Ocupada (Pagada o Check-in)';
      } else if (reserva.estado_pago === 'pendiente' || reserva.estado === 'pendiente') {
        dayColor = '#FFC107'; // Amarillo para pendientes
        dayLabel = '⚠️ Pendiente de pago';
        isDisabled = true; // También deshabilitar las pendientes
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

      // Validar email (si está presente)
      if (formData.cliente_email && formData.cliente_email.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.cliente_email)) {
          enqueueSnackbar('El email no tiene un formato válido', { variant: 'warning' });
          return;
        }
      }

      // Validar RUT (si está presente)
      if (formData.cliente_rut && formData.cliente_rut.trim() !== '') {
        if (!validarRUT(formData.cliente_rut)) {
          enqueueSnackbar('El RUT no es válido', { variant: 'warning' });
          return;
        }
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
        // PASO 1: Info de Cabaña (carousel de fotos + info)
        return (
          <Box>
            <Paper
              elevation={0}
              sx={{
                mb: 3,
                p: 3,
                textAlign: 'center',
                background: `linear-gradient(135deg, ${COLORES_CABANAS[normalizarNombre(selectedCabana?.nombre)] || '#FF8C42'} 0%, ${COLORES_CABANAS[normalizarNombre(selectedCabana?.nombre)] || '#FF8C42'}CC 100%)`,
                color: 'white',
                borderRadius: 3,
              }}
            >
              <BedIcon sx={{ fontSize: 60, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 900, textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>
                {selectedCabana?.nombre}
              </Typography>
            </Paper>

            {/* Carousel de imágenes */}
            {carouselImages.length > 0 ? (
              <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
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
                        height: '450px',
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
                  p: 6,
                  textAlign: 'center',
                  bgcolor: '#F5F5F5',
                  borderRadius: 3,
                  mb: 3,
                  border: '2px dashed #BDBDBD'
                }}
              >
                <KingBedIcon sx={{ fontSize: 80, color: '#BDBDBD', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No hay imágenes disponibles para esta cabaña
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Carpeta esperada: /images/{ID_TO_FOLDER[normalizarNombre(selectedCabana?.nombre)]}
                </Typography>
              </Paper>
            )}

            {/* Info de la cabaña */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Paper
                  elevation={3}
                  sx={{
                    p: 3,
                    bgcolor: '#FFF3E0',
                    borderRadius: 3,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Avatar sx={{ bgcolor: '#FF8C42', width: 64, height: 64, mb: 2 }}>
                    <PeopleIcon sx={{ fontSize: 32 }} />
                  </Avatar>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Capacidad Máxima
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: '#FF8C42' }}>
                    {selectedCabana?.capacidad_personas}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    personas
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper
                  elevation={3}
                  sx={{
                    p: 3,
                    bgcolor: '#E8F5E9',
                    borderRadius: 3,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Avatar sx={{ bgcolor: '#4CAF50', width: 64, height: 64, mb: 2 }}>
                    <MoneyIcon sx={{ fontSize: 32 }} />
                  </Avatar>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Precio por Noche
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: '#2E7D32' }}>
                    ${getPrecioActual(selectedCabana).toLocaleString('es-CL')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Temporada {getTemporadaActual() === 'alta' ? 'Alta' : 'Baja'}
                  </Typography>
                </Paper>
              </Grid>
              {selectedCabana?.descripcion && (
                <Grid item xs={12}>
                  <Paper elevation={3} sx={{ p: 3, bgcolor: '#F5F5F5', borderRadius: 3 }}>
                    <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                      {selectedCabana.descripcion}
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
        );

      case 1:
        // PASO 2: Fechas, Personas y Datos del Cliente
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
          <Stack spacing={4}>
            {/* PRIMERO: Fechas */}
            <Paper elevation={3} sx={{ p: 4, borderRadius: 3, bgcolor: '#E3F2FD' }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: '#1976D2', width: 72, height: 72, margin: '0 auto', mb: 2 }}>
                  <CalendarIcon sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                  Fechas de Reserva
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong style={{ color: '#F44336' }}>Rojo</strong>: Ocupada (no seleccionable) •
                  <strong style={{ color: '#FFC107' }}> Amarillo</strong>: Pendiente (no seleccionable)
                </Typography>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Fecha Check-In"
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
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Fecha Check-Out"
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
                      }
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* SEGUNDO: Cantidad de personas con resumen de costos */}
            <Paper elevation={3} sx={{ p: 4, borderRadius: 3, bgcolor: '#FFF3E0' }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: '#FF8C42', width: 72, height: 72, margin: '0 auto', mb: 2 }}>
                  <PeopleIcon sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                  ¿Cuántas personas?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Capacidad de la cabaña: <strong>{capacidad} personas</strong>
                </Typography>
              </Box>

              {/* Mensaje de ayuda si no hay fechas seleccionadas */}
              {!formData.fecha_inicio || !formData.fecha_fin ? (
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    bgcolor: '#FFF3E0',
                    borderRadius: 2,
                    border: '2px dashed #FFB74D'
                  }}
                >
                  <CalendarIcon sx={{ fontSize: 48, color: '#FFB74D', mb: 1 }} />
                  <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Primero selecciona las fechas de tu reserva
                  </Typography>
                </Paper>
              ) : null}

              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 3 }}>
                <IconButton
                  onClick={() => setFormData({ ...formData, cantidad_personas: Math.max(1, formData.cantidad_personas - 1) })}
                  disabled={!formData.fecha_inicio || !formData.fecha_fin || formData.cantidad_personas <= 1}
                  sx={{
                    bgcolor: '#FF8C42',
                    color: 'white',
                    width: 56,
                    height: 56,
                    '&:hover': { bgcolor: '#FF7722' },
                    '&:disabled': { bgcolor: '#E0E0E0', color: '#9E9E9E' }
                  }}
                >
                  <RemoveIcon fontSize="large" />
                </IconButton>

                <Paper
                  elevation={0}
                  sx={{
                    px: 6,
                    py: 3,
                    bgcolor: 'white',
                    borderRadius: 2,
                    border: `3px solid ${!formData.fecha_inicio || !formData.fecha_fin ? '#E0E0E0' : '#FF8C42'}`,
                    opacity: !formData.fecha_inicio || !formData.fecha_fin ? 0.5 : 1
                  }}
                >
                  <Typography variant="h2" sx={{ fontWeight: 900, color: !formData.fecha_inicio || !formData.fecha_fin ? '#E0E0E0' : '#FF8C42', minWidth: '80px', textAlign: 'center' }}>
                    {formData.cantidad_personas}
                  </Typography>
                </Paper>

                <IconButton
                  onClick={() => setFormData({ ...formData, cantidad_personas: formData.cantidad_personas + 1 })}
                  disabled={!formData.fecha_inicio || !formData.fecha_fin}
                  sx={{
                    bgcolor: '#FF8C42',
                    color: 'white',
                    width: 56,
                    height: 56,
                    '&:hover': { bgcolor: '#FF7722' },
                    '&:disabled': { bgcolor: '#E0E0E0', color: '#9E9E9E' }
                  }}
                >
                  <AddIcon fontSize="large" />
                </IconButton>
              </Box>

              {/* Resumen de costos */}
              {cantidadNoches > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Paper elevation={2} sx={{ p: 3, bgcolor: 'white', borderRadius: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, textAlign: 'center', color: '#1976D2' }}>
                      Costo de la Estadía
                    </Typography>

                    {/* Costo base de la cabaña */}
                    <Box sx={{ mb: 2, p: 2, bgcolor: '#E3F2FD', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Cabaña × Noches:
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        ${precioNocheCabana.toLocaleString('es-CL')} × {cantidadNoches} noche{cantidadNoches !== 1 ? 's' : ''} = ${(precioNocheCabana * cantidadNoches).toLocaleString('es-CL')}
                      </Typography>
                    </Box>

                    {/* Personas extra */}
                    {personasExtra > 0 && (
                      <Box sx={{ mb: 2, p: 2, bgcolor: '#FFF8E1', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Personas Extra:
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#F57C00' }}>
                          {personasExtra} persona{personasExtra !== 1 ? 's' : ''} × {cantidadNoches} noche{cantidadNoches !== 1 ? 's' : ''} × $20,000 = ${costoExtra.toLocaleString('es-CL')}
                        </Typography>
                      </Box>
                    )}

                    {/* Total */}
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ p: 2, bgcolor: '#E8F5E9', borderRadius: 1 }}>
                      <Typography variant="h5" sx={{ fontWeight: 900, color: '#2E7D32', textAlign: 'center' }}>
                        TOTAL: ${costoTotalNoche.toLocaleString('es-CL')}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 0.5, color: 'text.secondary' }}>
                        (sin incluir tinajas)
                      </Typography>
                    </Box>
                  </Paper>
                </Box>
              )}
            </Paper>

            {/* TERCERO: Datos del cliente */}
            <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: '#2196F3', width: 72, height: 72, margin: '0 auto', mb: 2 }}>
                  <PersonIcon sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Tus Datos
                </Typography>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Nombre"
                    value={formData.cliente_nombre}
                    onChange={(e) => setFormData({ ...formData, cliente_nombre: e.target.value })}
                    required
                    InputProps={{
                      startAdornment: <PersonIcon sx={{ mr: 1, color: 'action.active' }} />,
                    }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Apellido"
                    value={formData.cliente_apellido}
                    onChange={(e) => setFormData({ ...formData, cliente_apellido: e.target.value })}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Teléfono"
                    value={formData.cliente_telefono}
                    onChange={handleTelefonoChange}
                    required
                    placeholder="+569XXXXXXXX"
                    helperText="Se formatea automáticamente"
                    InputProps={{
                      startAdornment: <PhoneIcon sx={{ mr: 1, color: 'action.active' }} />,
                    }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={formData.cliente_email}
                    onChange={(e) => setFormData({ ...formData, cliente_email: e.target.value })}
                    placeholder="ejemplo@correo.com"
                    helperText="Opcional"
                    InputProps={{
                      startAdornment: <EmailIcon sx={{ mr: 1, color: 'action.active' }} />,
                    }}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="RUT"
                    value={formData.cliente_rut}
                    onChange={handleRUTChange}
                    placeholder="12.345.678-9"
                    helperText="Opcional - Se formatea automáticamente"
                    InputProps={{
                      startAdornment: <BadgeIcon sx={{ mr: 1, color: 'action.active' }} />,
                    }}
                    variant="outlined"
                  />
                </Grid>
              </Grid>
            </Paper>
          </Stack>
        );

      case 2:
        // PASO 3: Tinajas
        return (
          <Box>
            <Paper elevation={3} sx={{ p: 4, mb: 4, textAlign: 'center', borderRadius: 3, bgcolor: '#F3E5F5' }}>
              <Avatar sx={{ bgcolor: '#9C27B0', width: 80, height: 80, margin: '0 auto', mb: 2 }}>
                <HotTubIcon sx={{ fontSize: 48 }} />
              </Avatar>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
                ¿Deseas agregar tinajas a tu reserva?
              </Typography>
              <ButtonGroup size="large" variant="contained" sx={{ mt: 2 }}>
                <Button
                  onClick={() => setFormData({ ...formData, quiere_tinajas: true })}
                  variant={formData.quiere_tinajas ? 'contained' : 'outlined'}
                  sx={{
                    px: 4,
                    py: 2,
                    fontSize: '1.1rem',
                    bgcolor: formData.quiere_tinajas ? '#9C27B0' : 'transparent',
                    '&:hover': { bgcolor: formData.quiere_tinajas ? '#7B1FA2' : 'rgba(156, 39, 176, 0.1)' }
                  }}
                >
                  Sí, quiero tinajas
                </Button>
                <Button
                  onClick={() => setFormData({ ...formData, quiere_tinajas: false, tinajas_seleccionadas: [] })}
                  variant={!formData.quiere_tinajas ? 'contained' : 'outlined'}
                  sx={{
                    px: 4,
                    py: 2,
                    fontSize: '1.1rem',
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
          <Stack spacing={3}>
            {/* Resumen */}
            <Paper elevation={3} sx={{ p: 4, borderRadius: 3, bgcolor: '#F5F5F5' }}>
              <Typography variant="h5" sx={{ fontWeight: 900, mb: 3, textAlign: 'center' }}>
                Resumen de la Reserva
              </Typography>

              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'white', borderRadius: 2 }}>
                  <Typography variant="body1" color="text.secondary">Cabaña:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>{selectedCabana?.nombre}</Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'white', borderRadius: 2 }}>
                  <Typography variant="body1" color="text.secondary">Cliente:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    {formData.cliente_nombre} {formData.cliente_apellido}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'white', borderRadius: 2 }}>
                  <Typography variant="body1" color="text.secondary">Personas:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    {formData.cantidad_personas}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'white', borderRadius: 2 }}>
                  <Typography variant="body1" color="text.secondary">Check-In:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    {formData.fecha_inicio ? formatDateForServer(formData.fecha_inicio) : '-'}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'white', borderRadius: 2 }}>
                  <Typography variant="body1" color="text.secondary">Check-Out:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    {formData.fecha_fin ? formatDateForServer(formData.fecha_fin) : '-'}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Desglose detallado de costos */}
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, textAlign: 'center', color: '#1976D2' }}>
                  Desglose de Costos
                </Typography>

                {/* Costo de la cabaña */}
                <Box sx={{ p: 2, bgcolor: '#E3F2FD', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Cabaña {selectedCabana?.nombre}:
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                    ${precioNoche.toLocaleString('es-CL')} × {nochesReserva} noche{nochesReserva !== 1 ? 's' : ''}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976D2' }}>
                    = ${subtotalCabana.toLocaleString('es-CL')}
                  </Typography>
                </Box>

                {/* Personas extra */}
                {personasExtraResumen > 0 && (
                  <Box sx={{ p: 2, bgcolor: '#FFF8E1', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Personas Extra:
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {personasExtraResumen} persona{personasExtraResumen !== 1 ? 's' : ''} × {nochesReserva} noche{nochesReserva !== 1 ? 's' : ''} × $20,000
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#F57C00' }}>
                      = ${costoPersonasExtra.toLocaleString('es-CL')}
                    </Typography>
                  </Box>
                )}

                {/* Tinajas */}
                {formData.tinajas_seleccionadas.length > 0 && (
                  <Box sx={{ p: 2, bgcolor: '#F3E5F5', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Tinajas:
                    </Typography>
                    <Stack spacing={0.5}>
                      {formData.tinajas_seleccionadas.map((ts, idx) => (
                        <Typography key={idx} variant="body2" sx={{ fontWeight: 500, pl: 1 }}>
                          • {ts.tinaja_nombre} ({formatDateForServer(ts.fecha_uso)}): ${ts.precio_dia?.toLocaleString('es-CL')}
                        </Typography>
                      ))}
                    </Stack>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#9C27B0', mt: 1 }}>
                      = ${costoTinajas.toLocaleString('es-CL')}
                    </Typography>
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                <Box sx={{ p: 3, bgcolor: '#E8F5E9', borderRadius: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#2E7D32', textAlign: 'center' }}>
                    TOTAL: ${total.toLocaleString('es-CL')}
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            {/* Opciones de Pago */}
            <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, textAlign: 'center' }}>
                Selecciona tu Forma de Pago
              </Typography>

              <FormControl component="fieldset" fullWidth>
                <RadioGroup
                  value={formData.tipo_pago}
                  onChange={(e) => setFormData({ ...formData, tipo_pago: e.target.value })}
                >
                  <Paper elevation={0} sx={{ p: 3, mb: 2, bgcolor: formData.tipo_pago === 'completo' ? '#E8F5E9' : '#F5F5F5', border: formData.tipo_pago === 'completo' ? '3px solid #4CAF50' : '1px solid #E0E0E0', borderRadius: 2 }}>
                    <FormControlLabel
                      value="completo"
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            Pagar completo: ${total.toLocaleString('es-CL')}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Pago total de la reserva
                          </Typography>
                        </Box>
                      }
                    />
                  </Paper>

                  <Paper elevation={0} sx={{ p: 3, bgcolor: formData.tipo_pago === 'mitad' ? '#E8F5E9' : '#F5F5F5', border: formData.tipo_pago === 'mitad' ? '3px solid #4CAF50' : '1px solid #E0E0E0', borderRadius: 2 }}>
                    <FormControlLabel
                      value="mitad"
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            Pagar la mitad: ${(total / 2).toLocaleString('es-CL')}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            50% ahora, 50% al check-in
                          </Typography>
                        </Box>
                      }
                    />
                  </Paper>
                </RadioGroup>
              </FormControl>
            </Paper>

            {/* WhatsApp */}
            <Paper elevation={3} sx={{ p: 4, bgcolor: '#E3F2FD', borderRadius: 3 }}>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <WhatsAppIcon sx={{ fontSize: 60, color: '#25D366', mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Enviar Comprobante de Pago
                </Typography>
                <Typography variant="body1" sx={{ mb: 3 }}>
                  Realiza la transferencia por <strong>${montoPagar.toLocaleString('es-CL')}</strong> y envía tu comprobante:
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<WhatsAppIcon />}
                onClick={abrirWhatsApp}
                sx={{
                  bgcolor: '#25D366',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  py: 2,
                  '&:hover': { bgcolor: '#20BA5A' }
                }}
              >
                Enviar al {WHATSAPP_NUMBER}
              </Button>
            </Paper>

            {/* Notas */}
            <TextField
              fullWidth
              label="Notas adicionales (opcional)"
              multiline
              rows={4}
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              variant="outlined"
              placeholder="¿Alguna solicitud especial?"
            />
          </Stack>
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
          background: 'linear-gradient(180deg, #B3E5FC 0%, #E1F5FE 12%, #FFF9C4 25%, #FFECB3 40%, #FFE082 55%, #FFCC80 70%, #FFB74D 85%, #FFA726 100%)',
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
            background: 'radial-gradient(circle at 15% 15%, rgba(255, 255, 255, 0.5) 0%, transparent 40%), radial-gradient(circle at 85% 85%, rgba(255, 248, 225, 0.4) 0%, transparent 50%)',
            pointerEvents: 'none',
          }
        }}
      >
        <Container maxWidth="xl">
          {/* Header */}
          <Fade in timeout={800}>
            <Box sx={{ textAlign: 'center', mb: 4, position: 'relative', zIndex: 1 }}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, #4DD0E1 0%, #26C6DA 50%, #00ACC1 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  mb: 2,
                  textShadow: '0 2px 10px rgba(77, 208, 225, 0.3)',
                  filter: 'drop-shadow(0 2px 6px rgba(255, 255, 255, 0.9))',
                }}
              >
                Mapa Interactivo de Cabañas
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: '#26A69A',
                  fontWeight: 600,
                  textShadow: '0 1px 4px rgba(255, 255, 255, 0.9)',
                }}
              >
                Selecciona una cabaña para ver detalles y crear tu reserva
              </Typography>
            </Box>
          </Fade>

          {/* Mapa SVG */}
          <Zoom in timeout={1200}>
            <Paper
              elevation={4}
              sx={{
                p: 3,
                background: 'rgba(255, 255, 255, 0.75)',
                backdropFilter: 'blur(8px)',
                borderRadius: 5,
                minHeight: '600px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                border: '2px solid rgba(255, 255, 255, 0.8)',
                boxShadow: '0 6px 24px rgba(77, 208, 225, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.6)',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {loading ? (
                <Typography variant="h6" color="text.secondary">
                  Cargando mapa...
                </Typography>
              ) : (
                <Box
                  ref={svgContainerRef}
                  sx={{
                    width: '100%',
                    height: 'auto',
                    filter: 'brightness(1.15) contrast(1.05) saturate(1.1)',
                    '& svg': {
                      width: '100%',
                      height: 'auto',
                      filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))',
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
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 3 }
          }}
        >
          <DialogTitle sx={{ bgcolor: '#FFF3E0', borderBottom: '3px solid #FF8C42' }}>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#D84315' }}>
              Nueva Reserva - {selectedCabana?.nombre}
            </Typography>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 4 }}>
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            <Box sx={{ mt: 2 }}>
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