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

// Colores ÚNICOS para cada cabaña (tonos naranjas/cálidos diferentes)
const COLORES_CABANAS = {
  'cabaña1': '#FF6B35',
  'cabaña2': '#FF8C42',
  'cabaña3': '#FFA351',
  'cabaña4': '#FFB961',
  'cabaña5': '#FFCF70',
  'cabaña6': '#FF7E5F',
  'cabaña7': '#FEB47B',
  'cabaña8': '#FF9A56',
  'departamentoA': '#FF5722',
  'departamentoB': '#FF7043',
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

  // IDs de las cabañas en el SVG (CORREGIDOS - encontrados en CABANAS-clickable.svg)
  const cabanaIds = [
    'cabaña1',
    'cabaña2',
    'cabaña3',
    'cabaña4',
    'cabaña5',
    'cabaña6',
    'cabaña7',
    'cabaña8',
    'departamentoA',
    'departamentoB'
  ];

  const steps = [
    'Info de Cabaña',
    'Personas y Fechas',
    'Tinajas (Opcional)',
    'Resumen y Pago'
  ];

  const WHATSAPP_NUMBER = '+56942652034';

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
    return d >= start && d <= end;
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

  const cargarImagenesCabana = async (nombreCabana) => {
    try {
      // Normalizar el nombre de la cabaña: "Cabaña 1" -> "cabaña1"
      const nombreNormalizado = nombreCabana.toLowerCase().replace(/\s+/g, '');

      console.log('🖼️ Intentando cargar imágenes para:', nombreNormalizado);

      const imagenes = [];
      const extensiones = ['jpg', 'jpeg', 'png', 'webp'];
      const numeros = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      for (const num of numeros) {
        for (const ext of extensiones) {
          try {
            const path = `/src/images/${nombreNormalizado}/${num}.${ext}`;
            const response = await fetch(path, { method: 'HEAD' });
            if (response.ok) {
              imagenes.push(path);
              console.log('✅ Imagen encontrada:', path);
            }
          } catch (e) {
            // Imagen no existe, continuar
          }
        }
      }

      console.log(`📸 Total de imágenes cargadas para ${nombreNormalizado}:`, imagenes.length);
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
      // Usar CABANAS-clickable.svg que tiene los IDs correctos
      const response = await fetch('/CABANA-clickable.svg');
      if (!response.ok) throw new Error(`Error al cargar SVG: ${response.status}`);

      const svgText = await response.text();

      if (svgContainerRef.current && svgText) {
        svgContainerRef.current.innerHTML = svgText;

        setTimeout(() => {
          const svgElement = svgContainerRef.current.querySelector('svg');
          if (svgElement) {
            console.log('✅ SVG cargado correctamente');
            aplicarColores();
            configurarEventos();
            setSvgLoaded(true);
          } else {
            console.error('❌ No se encontró elemento SVG');
          }
        }, 300);
      }
    } catch (error) {
      console.error('Error al cargar SVG:', error);
      enqueueSnackbar(`Error al cargar mapa: ${error.message}`, { variant: 'error' });
    }
  };

  const obtenerEstadoCabana = (cabanaId) => {
    const cabana = cabanas.find(c => {
      const nombreNormalizado = c.nombre.toLowerCase().replace(/\s+/g, '');
      const idNormalizado = cabanaId.toLowerCase().replace(/\s+/g, '');
      return nombreNormalizado === idNormalizado ||
             nombreNormalizado.includes(idNormalizado) ||
             idNormalizado.includes(nombreNormalizado);
    });

    if (!cabana) return { estado: 'disponible', color: COLORES_CABANAS[cabanaId] || '#FF8C42' };

    const hoy = getTodayDate();
    const reservaActiva = reservas.find(r => {
      if (r.cabana_id !== cabana.id) return false;
      if (r.estado === 'cancelada') return false;

      const fechaInicio = parseServerDate(r.fecha_inicio);
      const fechaFin = parseServerDate(r.fecha_fin);

      return isDateInRange(hoy, fechaInicio, fechaFin);
    });

    if (!reservaActiva) {
      return { estado: 'disponible', color: COLORES_CABANAS[cabanaId] || '#FF8C42', cabana };
    }

    if (reservaActiva.estado_pago === 'pagado' || reservaActiva.estado === 'confirmada') {
      return { estado: 'reservada-pagada', color: '#4CAF50', cabana, reserva: reservaActiva };
    } else {
      return { estado: 'reservada-pendiente', color: '#FFC107', cabana, reserva: reservaActiva };
    }
  };

  const aplicarColores = () => {
    console.log('🎨 Aplicando colores a las cabañas...');
    cabanaIds.forEach(id => {
      const elemento = document.getElementById(id);
      if (elemento) {
        console.log(`✅ Encontrado: ${id}`);
        const { color } = obtenerEstadoCabana(id);

        const paths = elemento.querySelectorAll('path, rect, circle, polygon, ellipse');
        paths.forEach(path => {
          path.style.fill = color;
          path.style.transition = 'fill 0.3s ease';
        });

        if (elemento.tagName.toLowerCase() !== 'g') {
          elemento.style.fill = color;
          elemento.style.transition = 'fill 0.3s ease';
        }
      } else {
        console.warn(`❌ No encontrado: ${id}`);
      }
    });
  };

  const configurarEventos = () => {
    cabanaIds.forEach(id => {
      const elemento = document.getElementById(id);
      if (elemento) {
        elemento.style.cursor = 'pointer';

        elemento.addEventListener('click', async () => {
          const { cabana } = obtenerEstadoCabana(id);
          if (cabana) {
            setSelectedCabana(cabana);

            // Cargar imágenes desde la carpeta
            const imagenes = await cargarImagenesCabana(cabana.nombre);
            setCarouselImages(imagenes);

            // Abrir stepper directamente
            setFormData({
              cantidad_personas: cabana.capacidad_personas || 1,
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
          }
        });

        elemento.addEventListener('mouseenter', () => {
          const paths = elemento.querySelectorAll('path, rect, circle, polygon, ellipse');
          paths.forEach(path => {
            path.style.opacity = '0.8';
            path.style.filter = 'brightness(1.2)';
          });
        });

        elemento.addEventListener('mouseleave', () => {
          const paths = elemento.querySelectorAll('path, rect, circle, polygon, ellipse');
          paths.forEach(path => {
            path.style.opacity = '1';
            path.style.filter = 'brightness(1)';
          });
        });
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

    const reservasEnDia = reservas.filter(r => {
      if (r.cabana_id !== selectedCabana.id) return false;
      if (r.estado === 'cancelada') return false;

      const fechaInicio = parseServerDate(r.fecha_inicio);
      const fechaFin = parseServerDate(r.fecha_fin);

      return isDateInRange(date, fechaInicio, fechaFin);
    });

    if (reservasEnDia.length > 0) {
      const reserva = reservasEnDia[0];
      if (reserva.estado_pago === 'pagado') {
        dayColor = '#4CAF50';
        dayLabel = 'Pagada';
      } else {
        dayColor = '#FFC107';
        dayLabel = 'Pendiente';
      }
    }

    return (
      <Tooltip title={dayLabel} arrow>
        <PickersDay
          {...pickersDayProps}
          sx={{
            ...(dayColor && {
              backgroundColor: dayColor,
              color: 'white',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: dayColor,
                opacity: 0.8,
              },
            }),
          }}
        />
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

    const fechas = [];
    let currentDate = new Date(formData.fecha_inicio);
    const endDate = new Date(formData.fecha_fin);

    while (currentDate <= endDate) {
      fechas.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, textAlign: 'center' }}>
          🛁 Selecciona Tinajas y Fechas
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
                      const estaOcupada = reservasTinajas.some(rt =>
                        rt.tinaja_id === tinaja.id &&
                        formatDateForServer(parseServerDate(rt.fecha_uso)) === fechaStr
                      );

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
              ✅ Tinajas Seleccionadas ({formData.tinajas_seleccionadas.length})
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
    if (!selectedCabana) return 0;
    const capacidad = selectedCabana.capacidad_personas || 0;
    const personasExtra = Math.max(0, formData.cantidad_personas - capacidad);
    return personasExtra * 20000;
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

  const handleNext = () => {
    if (activeStep === 0) {
      setActiveStep((prev) => prev + 1);
      return;
    }

    if (activeStep === 1) {
      if (!formData.cantidad_personas || formData.cantidad_personas < 1) {
        enqueueSnackbar('Debe ingresar al menos 1 persona', { variant: 'warning' });
        return;
      }
      if (!formData.cliente_nombre || !formData.cliente_telefono) {
        enqueueSnackbar('Nombre y teléfono son requeridos', { variant: 'warning' });
        return;
      }
      if (!formData.fecha_inicio || !formData.fecha_fin) {
        enqueueSnackbar('Debe seleccionar fechas de inicio y fin', { variant: 'warning' });
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
      const mensaje = `¡Reserva confirmada!\n\nEnvía el comprobante de pago por $${montoPagar.toLocaleString('es-CL')} a WhatsApp`;
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
    const mensaje = `Hola, quiero enviar el comprobante de pago de mi reserva por $${montoPagar.toLocaleString('es-CL')}`;
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
                background: `linear-gradient(135deg, ${COLORES_CABANAS[selectedCabana?.nombre.toLowerCase().replace(/\s+/g, '')] || '#FF8C42'} 0%, ${COLORES_CABANAS[selectedCabana?.nombre.toLowerCase().replace(/\s+/g, '')] || '#FF8C42'}CC 100%)`,
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
                  Carpeta esperada: /images/{selectedCabana?.nombre.toLowerCase().replace(/\s+/g, '')}
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
        // PASO 2: Personas y Fechas (MEJORADO CON UI ELEGANTE)
        const capacidad = selectedCabana?.capacidad_personas || 0;
        const personasExtra = Math.max(0, formData.cantidad_personas - capacidad);
        const costoExtra = personasExtra * 20000;

        return (
          <Stack spacing={4}>
            {/* Cantidad de personas con botones +/- */}
            <Paper elevation={3} sx={{ p: 4, borderRadius: 3, bgcolor: '#FFF3E0' }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: '#FF8C42', width: 72, height: 72, margin: '0 auto', mb: 2 }}>
                  <PeopleIcon sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                  👥 ¿Cuántas personas?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Capacidad de la cabaña: <strong>{capacidad} personas</strong>
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 3 }}>
                <IconButton
                  onClick={() => setFormData({ ...formData, cantidad_personas: Math.max(1, formData.cantidad_personas - 1) })}
                  disabled={formData.cantidad_personas <= 1}
                  sx={{
                    bgcolor: '#FF8C42',
                    color: 'white',
                    width: 56,
                    height: 56,
                    '&:hover': { bgcolor: '#FF7722' },
                    '&:disabled': { bgcolor: '#E0E0E0' }
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
                    border: '3px solid #FF8C42'
                  }}
                >
                  <Typography variant="h2" sx={{ fontWeight: 900, color: '#FF8C42', minWidth: '80px', textAlign: 'center' }}>
                    {formData.cantidad_personas}
                  </Typography>
                </Paper>

                <IconButton
                  onClick={() => setFormData({ ...formData, cantidad_personas: formData.cantidad_personas + 1 })}
                  sx={{
                    bgcolor: '#FF8C42',
                    color: 'white',
                    width: 56,
                    height: 56,
                    '&:hover': { bgcolor: '#FF7722' }
                  }}
                >
                  <AddIcon fontSize="large" />
                </IconButton>
              </Box>

              {personasExtra > 0 && (
                <Paper elevation={0} sx={{ mt: 3, p: 3, bgcolor: '#FFF8E1', borderRadius: 2, border: '2px solid #FFB74D' }}>
                  <Typography variant="h6" color="warning.main" sx={{ fontWeight: 700, mb: 1 }}>
                    ⚠️ Personas Extra: {personasExtra}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Costo adicional: <strong>${costoExtra.toLocaleString('es-CL')}</strong>
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                    ($20,000 por persona adicional)
                  </Typography>
                </Paper>
              )}
            </Paper>

            {/* Datos del cliente */}
            <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: '#2196F3', width: 72, height: 72, margin: '0 auto', mb: 2 }}>
                  <PersonIcon sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  📋 Datos del Cliente
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
                    onChange={(e) => setFormData({ ...formData, cliente_telefono: e.target.value })}
                    required
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
                    onChange={(e) => setFormData({ ...formData, cliente_rut: e.target.value })}
                    InputProps={{
                      startAdornment: <BadgeIcon sx={{ mr: 1, color: 'action.active' }} />,
                    }}
                    variant="outlined"
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Fechas */}
            <Paper elevation={3} sx={{ p: 4, borderRadius: 3, bgcolor: '#E3F2FD' }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: '#1976D2', width: 72, height: 72, margin: '0 auto', mb: 2 }}>
                  <CalendarIcon sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                  📅 Fechas de Reserva
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong style={{ color: '#4CAF50' }}>Verde</strong>: Reservado y pagado •
                  <strong style={{ color: '#FFC107' }}> Amarillo</strong>: Pago pendiente
                </Typography>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Fecha Check-In"
                    value={formData.fecha_inicio}
                    onChange={(newValue) => setFormData({ ...formData, fecha_inicio: newValue })}
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

        return (
          <Stack spacing={3}>
            {/* Resumen */}
            <Paper elevation={3} sx={{ p: 4, borderRadius: 3, bgcolor: '#F5F5F5' }}>
              <Typography variant="h5" sx={{ fontWeight: 900, mb: 3, textAlign: 'center' }}>
                📋 Resumen de la Reserva
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
                    {calcularCostoPersonasExtra() > 0 &&
                      ` (+$${calcularCostoPersonasExtra().toLocaleString('es-CL')} extra)`
                    }
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

                {formData.tinajas_seleccionadas.length > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'white', borderRadius: 2 }}>
                    <Typography variant="body1" color="text.secondary">Tinajas:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                      {formData.tinajas_seleccionadas.length} seleccionada(s)
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
                💳 Selecciona tu Forma de Pago
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
                  📱 Enviar Comprobante de Pago
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
          background: 'linear-gradient(135deg, #FFE5D9 0%, #FFDDC1 50%, #FFC4A3 100%)',
          py: 4,
        }}
      >
        <Container maxWidth="xl">
          {/* Header */}
          <Fade in timeout={800}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 900,
                  color: '#D84315',
                  mb: 2,
                  textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                🏡 Mapa Interactivo de Cabañas
              </Typography>
              <Typography variant="h6" sx={{ color: '#E64A19', fontWeight: 600 }}>
                Click en una cabaña para ver fotos y crear reservas
              </Typography>
            </Box>
          </Fade>

          {/* Mapa SVG */}
          <Zoom in timeout={1200}>
            <Paper
              elevation={4}
              sx={{
                p: 3,
                background: 'white',
                borderRadius: 2,
                minHeight: '600px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
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
                    '& svg': {
                      width: '100%',
                      height: 'auto',
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
              🏡 Nueva Reserva - {selectedCabana?.nombre}
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
