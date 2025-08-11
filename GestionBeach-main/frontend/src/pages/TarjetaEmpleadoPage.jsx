// frontend/src/pages/TarjetaEmpleadoPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Grid,
  Card,
  CardHeader,
  CardContent,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Avatar,
  useTheme,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Chip,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  PictureAsPdf as FilePdfIcon,
  Badge as BadgeIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Clear as ClearIcon,
  VpnKey as VpnKeyIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import Barcode from 'react-barcode';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import api from '../api/api';
import logoImg from '../pages/logo.png';

const TarjetaEmpleadoPage = () => {
  const [sucursales, setSucursales] = useState([]);
  const [selectedSucursal, setSelectedSucursal] = useState('');
  const [nombre, setNombre] = useState('');
  const [cargo, setCargo] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSucursales, setLoadingSucursales] = useState(true);
  const [loadingCodigoBarras, setLoadingCodigoBarras] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados para código manual
  const [modalCodigoManual, setModalCodigoManual] = useState(false);
  const [codigoManual, setCodigoManual] = useState('');
  const [esCodigoManual, setEsCodigoManual] = useState(false);
  const [clickSecretoCount, setClickSecretoCount] = useState(0);
  
  // Lista para almacenar múltiples tarjetas
  const [tarjetas, setTarjetas] = useState([]);

  // Referencias para las tarjetas a exportar
  const tarjetaFrontalRef = useRef(null);
  const tarjetaTraseroRef = useRef(null);

  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const loadSucursales = async () => {
      try {
        const response = await api.get('/sucursales');
        setSucursales(response.data);
      } catch (error) {
        enqueueSnackbar('Error al cargar sucursales', { variant: 'error' });
      } finally {
        setLoadingSucursales(false);
      }
    };

    loadSucursales();
  }, [enqueueSnackbar]);

  const handleSucursalChange = async (e) => {
    const sucursalId = e.target.value;
    setSelectedSucursal(sucursalId);

    // Solo obtener código automático si no estamos usando código manual y no es genérico
    if (sucursalId && sucursalId !== 'GENERICO' && !esCodigoManual) {
      setLoadingCodigoBarras(true);
      try {
        const response = await api.get(`/tarjeta/barcode?sucursal_id=${sucursalId}`);
        setCodigoBarras(response.data.barcode);
      } catch (error) {
        enqueueSnackbar('Error al obtener código de barras', { variant: 'error' });
      } finally {
        setLoadingCodigoBarras(false);
      }
    } else if (sucursalId === 'GENERICO') {
      // Para genérico, limpiar el código para forzar uso manual
      setCodigoBarras('');
      enqueueSnackbar('Sucursal genérica seleccionada. Use el código especial.', { 
        variant: 'info',
        autoHideDuration: 3000 
      });
    }
  };

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Función para manejar clics en el campo de código de barras (botón secreto)
  const handleClickSecretoCodigoBarras = () => {
    setClickSecretoCount(prev => prev + 1);
    
    // Resetear contador después de 3 segundos
    setTimeout(() => {
      setClickSecretoCount(0);
    }, 3000);
    
    // Si hace 5 clics rápidos, mostrar modal para código manual
    if (clickSecretoCount >= 4) {
      setModalCodigoManual(true);
      setClickSecretoCount(0);
    }
  };

  // Función para aplicar código manual
  const handleAplicarCodigoManual = () => {
    if (!codigoManual.trim()) {
      enqueueSnackbar('Por favor ingrese un código válido', { variant: 'warning' });
      return;
    }
    
    // Validar que el código tenga al menos 8 caracteres
    if (codigoManual.trim().length < 8) {
      enqueueSnackbar('El código debe tener al menos 8 caracteres', { variant: 'warning' });
      return;
    }
    
    setCodigoBarras(codigoManual.trim());
    setEsCodigoManual(true);
    setModalCodigoManual(false);
    
    enqueueSnackbar('Código manual aplicado para tarjeta especial', { 
      variant: 'success',
      autoHideDuration: 2000 
    });
  };

  // Función para volver al código automático
  const handleVolverCodigoAutomatico = async () => {
    setEsCodigoManual(false);
    setCodigoManual('');
    
    if (selectedSucursal && selectedSucursal !== 'GENERICO') {
      setLoadingCodigoBarras(true);
      try {
        const response = await api.get(`/tarjeta/barcode?sucursal_id=${selectedSucursal}`);
        setCodigoBarras(response.data.barcode);
        enqueueSnackbar('Código automático restaurado', { variant: 'info' });
      } catch (error) {
        enqueueSnackbar('Error al obtener código automático', { variant: 'error' });
      } finally {
        setLoadingCodigoBarras(false);
      }
    } else {
      setCodigoBarras('');
      if (selectedSucursal === 'GENERICO') {
        enqueueSnackbar('Sucursal genérica mantiene código vacío', { variant: 'info' });
      }
    }
  };

  // Obtener el nombre de la sucursal seleccionada
  const getSucursalNombre = (sucursalId) => {
    if (sucursalId === 'GENERICO') {
      return 'ACCESO GENÉRICO';
    }
    return sucursales.find(s => s.id === sucursalId)?.nombre || '';
  };

  // Función para añadir la tarjeta actual a la lista
  const handleAgregarTarjeta = () => {
    if (!selectedSucursal || !nombre || !cargo) {
      enqueueSnackbar('Complete los campos requeridos', { variant: 'warning' });
      return;
    }
  
    if (!fotoPreview) {
      enqueueSnackbar('Por favor seleccione una foto de empleado', { variant: 'warning' });
      return;
    }

    if (!codigoBarras) {
      enqueueSnackbar('Por favor genere o ingrese un código de barras', { variant: 'warning' });
      return;
    }

    // Encontrar el nombre de la sucursal seleccionada
    const sucursalNombre = getSucursalNombre(selectedSucursal);

    // Crear objeto con los datos de la tarjeta
    const nuevaTarjeta = {
      id: Date.now().toString(), // Identificador único
      sucursalId: selectedSucursal,
      sucursalNombre,
      nombre,
      cargo,
      codigoBarras,
      fotoPreview,
      esCodigoManual, // Agregar flag para identificar tarjetas especiales
      fechaCreacion: new Date().toISOString(),
    };

    // Añadir tarjeta a la lista
    setTarjetas(prevTarjetas => [...prevTarjetas, nuevaTarjeta]);
    
    // Limpiar formulario
    limpiarFormulario();
    
    const tipoTarjeta = esCodigoManual ? 'especial (1 día)' : 'normal';
    enqueueSnackbar(`Tarjeta ${tipoTarjeta} añadida correctamente`, { variant: 'success' });
  };

  // Función para eliminar una tarjeta de la lista
  const handleEliminarTarjeta = (id) => {
    setTarjetas(prevTarjetas => prevTarjetas.filter(tarjeta => tarjeta.id !== id));
    enqueueSnackbar('Tarjeta eliminada', { variant: 'info' });
  };

  // Función para limpiar el formulario
  const limpiarFormulario = () => {
    setNombre('');
    setCargo('');
    setFotoPreview('');
    setFoto(null);
    // Si era código manual, también limpiamos eso
    if (esCodigoManual) {
      setEsCodigoManual(false);
      setCodigoManual('');
      setCodigoBarras('');
    }
    // No reseteamos sucursal para facilitar la creación de múltiples tarjetas
  };

  // Función para limpiar todas las tarjetas de la lista
  const handleLimpiarTarjetas = () => {
    setTarjetas([]);
    enqueueSnackbar('Lista de tarjetas limpiada', { variant: 'info' });
  };

  // Dibuja línea punteada alrededor de la tarjeta
  const dibujarContornoRecorte = (doc, x, y, width, height) => {
    // Guardar configuración actual
    doc.saveGraphicsState();
    
    // Configurar estilo de línea punteada
    doc.setLineDashPattern([2, 2], 0);
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0); // Color negro
    
    // Dibujar rectángulo con línea punteada
    doc.rect(x, y, width, height);
    
    // Restaurar configuración
    doc.restoreGraphicsState();
  };

  // Función para generar PDF con todas las tarjetas agregadas
  const handleGenerarPDF = async () => {
    // Verificar si hay tarjetas para generar
    if (tarjetas.length === 0) {
      // Si no hay tarjetas en la lista pero hay una en el formulario, preguntar al usuario
      if (selectedSucursal && nombre && cargo && fotoPreview && codigoBarras) {
        // Añadir la tarjeta actual a la lista
        handleAgregarTarjeta();
        // Pequeña espera para asegurar que la lista se actualizó
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        enqueueSnackbar('No hay tarjetas para generar', { variant: 'warning' });
        return;
      }
    }
  
    try {
      setLoading(true);
      setError(null);
  
      // Crear un nuevo documento PDF con tamaño carta
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter', // Tamaño carta: 216 x 279 mm
      });
      
      // Configuración de la página
      const pageWidth = 216;  // Ancho de la página en mm
      const pageHeight = 279; // Alto de la página en mm
      const margin = 20;      // Margen desde los bordes
      
      // Tamaño de cada tarjeta en el PDF
      const cardWidth = 85.6;  // Ancho de una tarjeta ID estándar
      const cardHeight = 54;   // Alto de una tarjeta ID estándar
      
      // Datos para organizar las tarjetas en la página
      const espacioEntreTarjetas = 10; // Espacio vertical entre tarjetas
      const tarjetasPorPagina = 4;     // Cuántas tarjetas por página (una debajo de otra)
      
      // Contar tarjetas especiales
      const tarjetasEspeciales = tarjetas.filter(t => t.esCodigoManual).length;
      const tarjetasNormales = tarjetas.filter(t => !t.esCodigoManual).length;
      
      // Agregar título y subtítulo
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Tarjetas de Identificación - Total: ${tarjetas.length}`, pageWidth/2, margin, { align: 'center' });
      
      pdf.setFontSize(11);
      pdf.text('Recorte por el borde punteado y doble por el centro para crear cada tarjeta.', pageWidth/2, margin + 10, { align: 'center' });
      
      // Mostrar resumen de tipos de tarjetas si hay especiales
      if (tarjetasEspeciales > 0) {
        pdf.setFontSize(10);
        pdf.setTextColor(255, 87, 34); // Color naranja para tarjetas especiales
        pdf.text(`📅 Tarjetas especiales (1 día): ${tarjetasEspeciales} | Tarjetas normales: ${tarjetasNormales}`, pageWidth/2, margin + 18, { align: 'center' });
      }
      
      // Posición inicial para la primera tarjeta
      let yPos = margin + (tarjetasEspeciales > 0 ? 35 : 25);
      let paginaActual = 1;
      
      // Procesar cada tarjeta
      for (let i = 0; i < tarjetas.length; i++) {
        // Calcular posición vertical
        const indiceEnPagina = i % tarjetasPorPagina;
        
        // Si necesitamos una nueva página
        if (indiceEnPagina === 0 && i > 0) {
          pdf.addPage();
          paginaActual++;
          yPos = margin + 10;
        }
        
        // Calcular posición Y para esta tarjeta
        const currentYPos = yPos + indiceEnPagina * (cardHeight + espacioEntreTarjetas);
        
        // Capturar la tarjeta actual utilizando una función auxiliar
        const frontalImgData = await captureCardFromDOM('frontal', tarjetas[i]);
        const traseroImgData = await captureCardFromDOM('trasero', tarjetas[i]);
        
        // Posición X centrada con la tarjeta frontal y trasera una al lado de la otra
        const xPos = (pageWidth - (cardWidth * 2)) / 2;
        
        // Añadir imágenes al PDF (lado a lado)
        pdf.addImage(frontalImgData, 'PNG', xPos, currentYPos, cardWidth, cardHeight);
        pdf.addImage(traseroImgData, 'PNG', xPos + cardWidth, currentYPos, cardWidth, cardHeight);
        
        // Añadir el nombre del empleado y tipo de tarjeta debajo
        pdf.setFontSize(8);
        pdf.setTextColor(0, 0, 0);
        let infoTexto = tarjetas[i].nombre;
        if (tarjetas[i].esCodigoManual) {
          pdf.setTextColor(255, 87, 34); // Color naranja para especiales
          infoTexto += ' (ESPECIAL - 1 DÍA)';
        }
        pdf.text(infoTexto, pageWidth/2, currentYPos + cardHeight + 5, { align: 'center' });
        
        // Dibujar contorno punteado para recorte
        // Contorno alrededor de la tarjeta frontal
        dibujarContornoRecorte(pdf, xPos, currentYPos, cardWidth, cardHeight);
        
        // Contorno alrededor de la tarjeta trasera
        dibujarContornoRecorte(pdf, xPos + cardWidth, currentYPos, cardWidth, cardHeight);
      }
      
      // Añadir instrucciones para imprimir al final
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Imprimir a tamaño real (100%) sin ajustar a la página.', pageWidth/2, pageHeight - 20, { align: 'center' });
      if (tarjetasEspeciales > 0) {
        pdf.setTextColor(255, 87, 34);
        pdf.text(`⚠️ ${tarjetasEspeciales} tarjetas especiales con validez de 1 día únicamente.`, pageWidth/2, pageHeight - 17, { align: 'center' });
      }
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generado: ${new Date().toLocaleDateString()}`, pageWidth/2, pageHeight - 10, { align: 'center' });
      
      // Guardar PDF
      const fileName = tarjetasEspeciales > 0 ? 
        `tarjetas_empleados_${tarjetasEspeciales}especiales_${new Date().toISOString().slice(0,10)}.pdf` :
        `tarjetas_empleados_${new Date().toISOString().slice(0,10)}.pdf`;
      pdf.save(fileName);
      
      enqueueSnackbar(`PDF con ${tarjetas.length} tarjetas generado correctamente${tarjetasEspeciales > 0 ? ` (${tarjetasEspeciales} especiales)` : ''}`, { variant: 'success' });
    } catch (error) {
      console.error('Error al generar PDF:', error);
      setError(`Error al generar PDF: ${error.message}`);
      enqueueSnackbar('Error al generar PDF', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  // Función auxiliar para capturar una tarjeta como imagen
  const captureCardFromDOM = async (tipo, tarjeta) => {
    const targetRef = tipo === 'frontal' ? tarjetaFrontalRef : tarjetaTraseroRef;
    const tempNombre = nombre;
    const tempCargo = cargo;
    const tempFoto = fotoPreview;
    const tempCodigo = codigoBarras;
    const tempSucursal = selectedSucursal;
    const tempEsManual = esCodigoManual;
    
    // Temporalmente cambiamos los datos de vista previa
    setNombre(tarjeta.nombre);
    setCargo(tarjeta.cargo);
    setFotoPreview(tarjeta.fotoPreview);
    setCodigoBarras(tarjeta.codigoBarras);
    setSelectedSucursal(tarjeta.sucursalId);
    setEsCodigoManual(tarjeta.esCodigoManual);
    
    // Dar tiempo para que React actualice el DOM
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Capturar la imagen
    const canvas = await html2canvas(targetRef.current, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#f8f8f8',
    });
    
    // Restaurar datos originales
    setNombre(tempNombre);
    setCargo(tempCargo);
    setFotoPreview(tempFoto);
    setCodigoBarras(tempCodigo);
    setSelectedSucursal(tempSucursal);
    setEsCodigoManual(tempEsManual);
    
    // Retornar la imagen como data URL
    return canvas.toDataURL('image/png');
  };

  // Función para generar PDF de una sola tarjeta (la actual)
  const handleGenerarTarjetaSingular = async () => {
    if (!selectedSucursal || !nombre || !cargo) {
      enqueueSnackbar('Complete los campos requeridos', { variant: 'warning' });
      return;
    }
  
    if (!fotoPreview) {
      enqueueSnackbar('Por favor seleccione una foto de empleado', { variant: 'warning' });
      return;
    }

    if (!codigoBarras) {
      enqueueSnackbar('Por favor genere o ingrese un código de barras', { variant: 'warning' });
      return;
    }
  
    try {
      setLoading(true);
      setError(null);
  
      // Capturar imagen frontal
      const frontalCanvas = await html2canvas(tarjetaFrontalRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f8f8f8',
      });
      const frontalImgData = frontalCanvas.toDataURL('image/png');
  
      // Capturar imagen trasera
      const traseroCanvas = await html2canvas(tarjetaTraseroRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f8f8f8',
      });
      const traseroImgData = traseroCanvas.toDataURL('image/png');
  
      // Crear un nuevo documento PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
      });
      
      // Configuración de la página
      const pageWidth = 216;
      const margin = 20;
      const cardWidth = 85.6;
      const cardHeight = 54;
      const cardsY = 80;
      
      // Agregar título y subtítulo
      pdf.setFontSize(16);
      const tipoTarjeta = esCodigoManual ? ` - ESPECIAL (1 DÍA)` : '';
      pdf.text(`Tarjeta de Identificación${tipoTarjeta} - ${nombre}`, pageWidth/2, 20, { align: 'center' });
      
      pdf.setFontSize(11);
      pdf.text('Recorte por el borde punteado y doble por el centro para crear la tarjeta.', pageWidth/2, 40, { align: 'center' });
      
      if (esCodigoManual) {
        pdf.setFontSize(10);
        pdf.setTextColor(255, 87, 34);
        pdf.text('⚠️ TARJETA ESPECIAL - VALIDEZ: 1 DÍA ÚNICAMENTE', pageWidth/2, 55, { align: 'center' });
      }
      
      // Posición X centrada para las tarjetas
      const xPos = (pageWidth - (cardWidth * 2)) / 2;
      
      // Añadir imágenes al PDF (lado a lado)
      pdf.addImage(frontalImgData, 'PNG', xPos, cardsY, cardWidth, cardHeight);
      pdf.addImage(traseroImgData, 'PNG', xPos + cardWidth, cardsY, cardWidth, cardHeight);
      
      // Dibujar contorno punteado para recorte
      // Contorno alrededor de la tarjeta frontal
      dibujarContornoRecorte(pdf, xPos, cardsY, cardWidth, cardHeight);
      
      // Contorno alrededor de la tarjeta trasera
      dibujarContornoRecorte(pdf, xPos + cardWidth, cardsY, cardWidth, cardHeight);
      
      // Añadir instrucciones para imprimir
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Imprimir a tamaño real (100%) sin ajustar a la página.', pageWidth/2, 150, { align: 'center' });
      pdf.text(`Generado: ${new Date().toLocaleDateString()}`, pageWidth/2, 155, { align: 'center' });
  
      // Guardar PDF
      const fileName = esCodigoManual ? 
        `tarjeta_especial_${nombre.replace(/\s+/g, '_')}.pdf` :
        `tarjeta_${nombre.replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);
  
      const tipoMensaje = esCodigoManual ? 'especial' : 'normal';
      enqueueSnackbar(`Tarjeta ${tipoMensaje} generada correctamente`, { variant: 'success' });
    } catch (error) {
      console.error('Error al generar PDF:', error);
      setError(`Error al generar la tarjeta: ${error.message}`);
      enqueueSnackbar('Error al generar tarjeta', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Generar Tarjetas de Empleado
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Complete el formulario para crear tarjetas de identificación para empleados
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Información del Empleado" />
            <Divider />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="sucursal-label">Sucursal</InputLabel>
                    <Select
                      labelId="sucursal-label"
                      value={selectedSucursal}
                      onChange={handleSucursalChange}
                      label="Sucursal"
                      disabled={loadingSucursales || loading}
                    >
                      <MenuItem value=""><em>Seleccione una sucursal</em></MenuItem>
                      <MenuItem value="GENERICO">
                        <Box sx={{ display: 'flex', alignItems: 'center', color: '#ff9800' }}>
                          <VpnKeyIcon sx={{ mr: 1, fontSize: 18 }} />
                          GENÉRICO (Para códigos especiales)
                        </Box>
                      </MenuItem>
                      <Divider />
                      {sucursales.map((sucursal) => (
                        <MenuItem key={sucursal.id} value={sucursal.id}>{sucursal.nombre}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nombre Completo"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value.toUpperCase())}
                    disabled={loading}
                    inputProps={{ style: { textTransform: 'uppercase' } }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Cargo"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value.toUpperCase())}
                    disabled={loading}
                    inputProps={{ style: { textTransform: 'uppercase' } }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Código de Barras"
                    value={codigoBarras}
                    onClick={handleClickSecretoCodigoBarras}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          {loadingCodigoBarras && <CircularProgress size={20} />}
                          {esCodigoManual && (
                            <Tooltip title="Código manual para tarjeta especial (1 día)">
                              <Chip 
                                icon={<ScheduleIcon />}
                                label="ESPECIAL"
                                size="small"
                                color="warning"
                                variant="outlined"
                              />
                            </Tooltip>
                          )}
                          {esCodigoManual && (
                            <Tooltip title="Volver a código automático">
                              <IconButton
                                size="small"
                                onClick={handleVolverCodigoAutomatico}
                                sx={{ ml: 1 }}
                              >
                                <LockIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: esCodigoManual ? 'rgba(255, 152, 0, 0.1)' : 'inherit',
                        '&:hover': {
                          backgroundColor: esCodigoManual ? 'rgba(255, 152, 0, 0.15)' : 'rgba(0, 0, 0, 0.04)',
                        }
                      }
                    }}
                  />
                  {clickSecretoCount > 0 && clickSecretoCount < 5 && (
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                      Clics: {clickSecretoCount}/5 para acceder a código manual
                    </Typography>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    fullWidth
                    disabled={loading}
                  >
                    Subir Foto del Empleado
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleFotoChange}
                    />
                  </Button>
                </Grid>

                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    fullWidth
                    onClick={handleAgregarTarjeta}
                    disabled={loading || !selectedSucursal || !nombre || !cargo || !fotoPreview || !codigoBarras}
                  >
                    Agregar a la Lista
                  </Button>
                </Grid>

                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<FilePdfIcon />}
                    fullWidth
                    onClick={handleGenerarPDF}
                    disabled={loading || (tarjetas.length === 0 && (!selectedSucursal || !nombre || !cargo || !fotoPreview || !codigoBarras))}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Generar PDF con Todas las Tarjetas'}
                  </Button>
                </Grid>

                <Grid item xs={12}>
                  <Tooltip title="Generar solo la tarjeta actual sin agregarla a la lista">
                    <Button
                      variant="outlined"
                      color="info"
                      startIcon={<FilePdfIcon />}
                      fullWidth
                      onClick={handleGenerarTarjetaSingular}
                      disabled={loading || !selectedSucursal || !nombre || !cargo || !fotoPreview || !codigoBarras}
                    >
                      Generar Solo Esta Tarjeta
                    </Button>
                  </Tooltip>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Card>
                <CardHeader 
                  title="Vista Previa de la Tarjeta Actual" 
                  action={
                    <Button
                      color="primary"
                      startIcon={<ClearIcon />}
                      onClick={limpiarFormulario}
                      disabled={loading}
                    >
                      Limpiar
                    </Button>
                  }
                />
                <Divider />
                <CardContent>
                  {esCodigoManual && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <ScheduleIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                        <strong>Tarjeta Especial:</strong> Esta tarjeta tendrá validez de 1 día únicamente.
                      </Typography>
                    </Alert>
                  )}
                  
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: 2,
                    flexWrap: 'wrap',
                    justifyContent: 'center'
                  }}>
                    {/* Tarjeta Frontal */}
                    <Paper
                      ref={tarjetaFrontalRef}
                      elevation={4}
                      sx={{
                        width: 340,
                        height: 216,
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: '#f8f8f8',
                        overflow: 'hidden',
                        position: 'relative',
                        border: esCodigoManual ? '2px solid #ff9800' : 'none',
                      }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '37%',
                          backgroundColor: esCodigoManual ? '#ff9800' : theme.palette.primary.main,
                          opacity: 0.5,
                          zIndex: 0,
                        }}
                      />

                      {esCodigoManual && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 5,
                            right: 5,
                            backgroundColor: '#ff9800',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            zIndex: 2,
                          }}
                        >
                          1 DÍA
                        </Box>
                      )}

                      <Box sx={{ position: 'relative', zIndex: 1 }}>
                        {/* Primera fila - Foto y Logo en línea */}
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                          <Grid item xs={6} sx={{ display: 'flex', justifyContent: 'center' }}>
                            {fotoPreview ? (
                              <Avatar
                                src={fotoPreview}
                                alt="Foto del empleado"
                                sx={{
                                  width: 80,
                                  height: 80,
                                  border: `2px solid ${esCodigoManual ? '#ff9800' : 'white'}`,
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                }}
                              />
                            ) : (
                              <Avatar
                                sx={{
                                  width: 80,
                                  height: 80,
                                  backgroundColor: theme.palette.grey[300],
                                  color: theme.palette.grey[600],
                                }}
                              >
                                <BadgeIcon sx={{ fontSize: 40 }} />
                              </Avatar>
                            )}
                          </Grid>
                          <Grid item xs={6} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <img
                                src={logoImg}
                                alt="Logo Empresa"
                                style={{ maxWidth: '100%', maxHeight: 80 }}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'block';
                                }}
                              />
                              <Typography 
                                variant="body1" 
                                style={{ display: 'none', color: '#0066cc', fontWeight: 'bold' }}
                              >
                                LOGO
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>

                        {/* Segunda fila - Nombre y cargo */}
                        <Box sx={{ textAlign: 'center', mb: 0.2 }}>
                          <Typography 
                            variant="subtitle1" 
                            fontWeight="bold" 
                            sx={{ 
                              color: esCodigoManual ? '#e65100' : theme.palette.primary.dark 
                            }}
                          >
                            {nombre || 'NOMBRE COMPLETO'}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: esCodigoManual ? '#ff9800' : theme.palette.secondary.main 
                            }}
                          >
                            {cargo || 'CARGO'}
                          </Typography>
                        </Box>

                        {/* Tercera fila - Sucursal */}
                        <Box sx={{ textAlign: 'center', mt: 1 }}>
                          <Typography 
                            variant="body2" 
                            fontWeight="medium" 
                            sx={{ 
                              color: esCodigoManual ? '#e65100' : 
                                     selectedSucursal === 'GENERICO' ? '#ff9800' : 
                                     theme.palette.primary.main,
                              backgroundColor: esCodigoManual ? 'rgba(255, 152, 0, 0.1)' : 
                                              selectedSucursal === 'GENERICO' ? 'rgba(255, 152, 0, 0.1)' : 
                                              'rgba(0,0,0,0.05)',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              display: 'inline-block'
                            }}
                          >
                            {getSucursalNombre(selectedSucursal) || 'SUCURSAL'}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>

                    {/* Tarjeta Trasera - Código de barras */}
                    <Paper
                      ref={tarjetaTraseroRef}
                      elevation={2}
                      sx={{
                        width: 340,
                        height: 216,
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: '#f8f8f8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        border: esCodigoManual ? '2px solid #ff9800' : 'none',
                        position: 'relative',
                      }}
                    >
                      {esCodigoManual && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 5,
                            right: 5,
                            backgroundColor: '#ff9800',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                          }}
                        >
                          ESPECIAL
                        </Box>
                      )}
                      
                      {codigoBarras && (
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center',
                          width: '100%',
                          height: '100%',
                          flexDirection: 'column'
                        }}>
                          <Barcode 
                            value={codigoBarras || '0000000000'}
                            height={45}
                            width={1.4}
                            fontSize={12}
                            margin={5}
                            displayValue={false}
                            textPosition="bottom"
                            background={esCodigoManual ? '#fff3e0' : '#ffffff'}
                          />
                          {esCodigoManual && (
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: '#e65100', 
                                fontWeight: 'bold',
                                mt: 1,
                                textAlign: 'center'
                              }}
                            >
                              CÓDIGO ESPECIAL - VALIDEZ: 1 DÍA
                            </Typography>
                          )}
                        </Box>
                      )}
                      {!codigoBarras && (
                        <Typography variant="body2" color="textSecondary">
                          El código de barras aparecerá aquí
                        </Typography>
                      )}
                    </Paper>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Lista de Tarjetas Agregadas */}
            <Grid item xs={12}>
              <Card>
                <CardHeader 
                  title={`Tarjetas Agregadas (${tarjetas.length})`} 
                  action={
                    <Button
                      color="error"
                      disabled={tarjetas.length === 0 || loading}
                      startIcon={<ClearIcon />}
                      onClick={handleLimpiarTarjetas}
                    >
                      Limpiar Todo
                    </Button>
                  }
                />
                <Divider />
                <CardContent>
                  {tarjetas.length === 0 ? (
                    <Box sx={{ py: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="textSecondary">
                        No hay tarjetas agregadas. Complete el formulario y presione "Agregar a la Lista".
                      </Typography>
                    </Box>
                  ) : (
                    <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                      {tarjetas.map((tarjeta) => (
                        <ListItem key={tarjeta.id} divider>
                          <ListItemAvatar>
                            <Avatar 
                              src={tarjeta.fotoPreview} 
                              alt={tarjeta.nombre}
                              sx={{
                                border: tarjeta.esCodigoManual ? '2px solid #ff9800' : 'none'
                              }}
                            >
                              <BadgeIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body1">
                                  {tarjeta.nombre}
                                </Typography>
                                {tarjeta.esCodigoManual && (
                                  <Chip 
                                    icon={<ScheduleIcon />}
                                    label="1 DÍA"
                                    size="small"
                                    color="warning"
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            }
                            secondary={
                              <>
                                {tarjeta.cargo} - {tarjeta.sucursalNombre}
                                {tarjeta.esCodigoManual && (
                                  <Typography 
                                    component="span" 
                                    variant="caption" 
                                    sx={{ 
                                      display: 'block', 
                                      color: '#e65100', 
                                      fontWeight: 'medium' 
                                    }}
                                  >
                                    Código especial: {tarjeta.codigoBarras}
                                  </Typography>
                                )}
                              </>
                            }
                          />
                          <ListItemSecondaryAction>
                            <IconButton 
                              edge="end" 
                              color="error"
                              onClick={() => handleEliminarTarjeta(tarjeta.id)}
                              disabled={loading}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Modal para código manual */}
      <Dialog
        open={modalCodigoManual}
        onClose={() => setModalCodigoManual(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          bgcolor: '#ff9800', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <VpnKeyIcon />
          Código Manual para Tarjeta Especial
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
                            <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="body2">
                      <strong>💡 Consejo:</strong>
                      <br />
                      • Seleccione "GENÉRICO" si desea usar solo códigos especiales
                      <br />
                      • Para tarjetas especiales, haga 5 clics en el campo "Código de Barras"
                      <br />
                      • Las tarjetas genéricas son ideales para visitantes temporales
                    </Typography>
                  </Alert>
          
          <TextField
            fullWidth
            label="Código de Barras Manual"
            value={codigoManual}
            onChange={(e) => setCodigoManual(e.target.value)}
            placeholder="Ingrese el código de barras (mínimo 8 caracteres)"
            helperText="El código debe tener al menos 8 caracteres alfanuméricos"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EditIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ 
            bgcolor: '#fff3e0', 
            p: 2, 
            borderRadius: 1,
            border: '1px solid #ffcc02'
          }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Instrucciones:</strong>
              <br />
              • Ingrese un código único de al menos 8 caracteres
              • Este código será válido por 1 día únicamente
              • Use solo para casos especiales o temporales
              • El código aparecerá en el PDF con marca "ESPECIAL"
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setModalCodigoManual(false)}
            color="inherit"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleAplicarCodigoManual}
            variant="contained"
            color="warning"
            startIcon={<VpnKeyIcon />}
            disabled={!codigoManual.trim() || codigoManual.trim().length < 8}
          >
            Aplicar Código Especial
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TarjetaEmpleadoPage;