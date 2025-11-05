// ===================================================================
// EJEMPLO DE INTEGRACIÓN DEL ImageCropperUpload
// ===================================================================
// Este es un ejemplo de cómo integrar el componente ImageCropperUpload
// en tu ConcursoPiscinasPage.jsx
// ===================================================================

import React, { useState } from 'react';
import { Box, Grid, TextField, Button, Typography } from '@mui/material';
import ImageCropperUpload from '../components/ImageCropperUpload';
import { useSnackbar } from 'notistack';
import api from '../api/api';

const EjemploIntegracion = () => {
  const { enqueueSnackbar } = useSnackbar();

  // Estados del formulario
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    rut: '',
    email: '',
    telefono: '',
    direccion: '',
    numero_boleta: '',
    fecha_boleta: '',
  });

  const [archivoImagen, setArchivoImagen] = useState(null);
  const [enviando, setEnviando] = useState(false);

  // Callback cuando se detecta el número de boleta
  const handleNumeroDetectado = (numero) => {
    console.log('📄 Número detectado:', numero);
    setFormData((prev) => ({
      ...prev,
      numero_boleta: numero,
    }));
  };

  // Callback cuando se selecciona la imagen
  const handleImagenSeleccionada = (file) => {
    console.log('📸 Imagen seleccionada:', file?.name);
    setArchivoImagen(file);
  };

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Enviar participación
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!formData.numero_boleta) {
      enqueueSnackbar('Por favor detecta o ingresa el número de boleta', { variant: 'error' });
      return;
    }

    if (!archivoImagen) {
      enqueueSnackbar('Por favor carga la imagen de la boleta', { variant: 'error' });
      return;
    }

    if (!formData.nombres || !formData.apellidos || !formData.rut || !formData.email || !formData.telefono) {
      enqueueSnackbar('Por favor completa todos los campos', { variant: 'error' });
      return;
    }

    setEnviando(true);

    try {
      // Crear FormData con todos los datos
      const formDataToSend = new FormData();
      formDataToSend.append('imagen_boleta', archivoImagen);
      formDataToSend.append('numero_boleta', formData.numero_boleta);
      formDataToSend.append('nombres', formData.nombres);
      formDataToSend.append('apellidos', formData.apellidos);
      formDataToSend.append('rut', formData.rut);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('telefono', formData.telefono);
      formDataToSend.append('direccion', formData.direccion);
      formDataToSend.append('fecha_boleta', formData.fecha_boleta || new Date().toISOString());
      formDataToSend.append('tipo_sucursal', 'Supermercado');

      // Enviar al backend
      const response = await api.post('/concurso-piscinas/participar', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        enqueueSnackbar('🎉 ' + response.data.message, { variant: 'success', autoHideDuration: 5000 });

        // Limpiar formulario
        setFormData({
          nombres: '',
          apellidos: '',
          rut: '',
          email: '',
          telefono: '',
          direccion: '',
          numero_boleta: '',
          fecha_boleta: '',
        });
        setArchivoImagen(null);
      }
    } catch (error) {
      console.error('❌ Error al enviar participación:', error);
      const mensaje = error.response?.data?.message || 'Error al registrar participación';
      enqueueSnackbar(mensaje, { variant: 'error', autoHideDuration: 6000 });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom align="center">
        Participa en el Concurso
      </Typography>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Columna izquierda: Datos personales */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Datos Personales
            </Typography>

            <TextField
              fullWidth
              label="Nombres"
              name="nombres"
              value={formData.nombres}
              onChange={handleInputChange}
              required
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Apellidos"
              name="apellidos"
              value={formData.apellidos}
              onChange={handleInputChange}
              required
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="RUT"
              name="rut"
              value={formData.rut}
              onChange={handleInputChange}
              required
              placeholder="12.345.678-9"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Teléfono"
              name="telefono"
              value={formData.telefono}
              onChange={handleInputChange}
              required
              placeholder="+56 9 1234 5678"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Dirección"
              name="direccion"
              value={formData.direccion}
              onChange={handleInputChange}
              required
              multiline
              rows={2}
            />
          </Grid>

          {/* Columna derecha: Imagen con cropper */}
          <Grid item xs={12} md={6}>
            <ImageCropperUpload
              onNumeroDetectado={handleNumeroDetectado}
              onImagenSeleccionada={handleImagenSeleccionada}
            />

            {formData.numero_boleta && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'success.lighter', borderRadius: 1 }}>
                <Typography variant="body2" color="success.dark">
                  ✅ Número de boleta: <strong>{formData.numero_boleta}</strong>
                </Typography>
              </Box>
            )}
          </Grid>

          {/* Botón de envío */}
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              disabled={enviando || !formData.numero_boleta || !archivoImagen}
              sx={{ py: 1.5 }}
            >
              {enviando ? 'Enviando...' : 'Participar en el Concurso'}
            </Button>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};

export default EjemploIntegracion;

// ===================================================================
// PASOS PARA INTEGRAR EN TU PÁGINA:
// ===================================================================
// 1. Importa el componente ImageCropperUpload
// 2. Agrega estados para numero_boleta y archivoImagen
// 3. Usa las callbacks onNumeroDetectado y onImagenSeleccionada
// 4. En el submit, incluye la imagen en el FormData
// 5. Envía todo junto al endpoint /participar
// ===================================================================
