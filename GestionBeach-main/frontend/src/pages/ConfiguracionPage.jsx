// frontend/src/pages/ConfiguracionPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardHeader,
  CardContent,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  FormControlLabel,
  Switch,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Save as SaveIcon,
  DarkMode as DarkModeIcon,
  Accessibility as AccessibilityIcon,
  Notifications as NotificationsIcon,
  Language as LanguageIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../api/api';

const ConfiguracionPage = () => {
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Configuraciones
  const [tema, setTema] = useState('claro');
  const [modoAccesibilidad, setModoAccesibilidad] = useState(false);
  const [notificaciones, setNotificaciones] = useState(true);
  const [idioma, setIdioma] = useState('es');

  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const cargarConfiguraciones = async () => {
      try {
        setLoadingConfig(true);
        const response = await api.get('/configuraciones');
        const data = response.data;
        
        setTema(data.tema || 'claro');
        setModoAccesibilidad(data.modo_accesibilidad === true);
        setNotificaciones(data.notificaciones !== false);
        setIdioma(data.idioma || 'es');
      } catch (error) {
        console.error('Error al cargar configuraciones:', error);
        setError('No se pudieron cargar las configuraciones. Intente nuevamente más tarde.');
        enqueueSnackbar('Error al cargar configuraciones', { variant: 'error' });
      } finally {
        setLoadingConfig(false);
      }
    };
    
    cargarConfiguraciones();
  }, [enqueueSnackbar]);

  const handleGuardarConfiguraciones = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      
      const configuraciones = {
        tema,
        modo_accesibilidad: modoAccesibilidad,
        notificaciones,
        idioma
      };
      
      await api.post('/configuraciones', configuraciones);
      
      setSuccess(true);
      enqueueSnackbar('Configuraciones guardadas correctamente', { variant: 'success' });
    } catch (error) {
      console.error('Error al guardar configuraciones:', error);
      setError('No se pudieron guardar las configuraciones. Intente nuevamente más tarde.');
      enqueueSnackbar('Error al guardar configuraciones', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loadingConfig) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Configuraciones
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Personalice la apariencia y comportamiento de la aplicación
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 4 }}>Configuraciones guardadas correctamente</Alert>}

      <Grid container spacing={3}>
        {/* Tema */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              avatar={<DarkModeIcon />}
              title="Apariencia" 
            />
            <Divider />
            <CardContent>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="tema-label">Tema</InputLabel>
                <Select
                  labelId="tema-label"
                  value={tema}
                  onChange={(e) => setTema(e.target.value)}
                  label="Tema"
                >
                  <MenuItem value="claro">Claro</MenuItem>
                  <MenuItem value="oscuro">Oscuro</MenuItem>
                  <MenuItem value="sistema">Usar configuración del sistema</MenuItem>
                </Select>
              </FormControl>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={modoAccesibilidad}
                    onChange={(e) => setModoAccesibilidad(e.target.checked)}
                  />
                }
                label="Modo de accesibilidad"
              />
              <Typography variant="caption" color="textSecondary" display="block">
                Mejora la experiencia para usuarios con dificultades visuales
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Configuraciones generales */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              avatar={<NotificationsIcon />}
              title="Preferencias generales" 
            />
            <Divider />
            <CardContent>
              <FormControlLabel
                control={
                  <Switch
                    checked={notificaciones}
                    onChange={(e) => setNotificaciones(e.target.checked)}
                  />
                }
                label="Notificaciones"
                sx={{ mb: 2, display: 'block' }}
              />
              
              <FormControl fullWidth>
                <InputLabel id="idioma-label">Idioma</InputLabel>
                <Select
                  labelId="idioma-label"
                  value={idioma}
                  onChange={(e) => setIdioma(e.target.value)}
                  label="Idioma"
                >
                  <MenuItem value="es">Español</MenuItem>
                  <MenuItem value="en">Inglés</MenuItem>
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>

        {/* Botón guardar */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleGuardarConfiguraciones}
              disabled={loading}
              size="large"
            >
              {loading ? <CircularProgress size={24} /> : 'Guardar Cambios'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ConfiguracionPage;