import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Grid,
  Card,
  CardContent,
  Divider,
  IconButton,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PhotoCamera as PhotoCameraIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  Business as BusinessIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../api/api';

export default function MiPerfilPage() {
  const { enqueueSnackbar } = useSnackbar();

  // Estados principales
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Estados del perfil
  const [perfil, setPerfil] = useState({
    id: null,
    nombre: '',
    email: '',
    telefono: '',
    rut: '',
    cargo: '',
    perfil_nombre: '',
    sucursales: [],
    foto_perfil: null
  });

  const [editedPerfil, setEditedPerfil] = useState({});

  // Estados para cambio de contraseña
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    cargarPerfil();
  }, []);

  const cargarPerfil = async () => {
    try {
      setLoading(true);
      const response = await api.get('/empleados/mi-perfil');

      if (response.data.success) {
        setPerfil(response.data.data);
        setEditedPerfil(response.data.data);
      }
    } catch (error) {
      console.error('Error al cargar perfil:', error);
      enqueueSnackbar('Error al cargar tu perfil', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    if (editing) {
      // Cancelar edición
      setEditedPerfil(perfil);
      setEditing(false);
    } else {
      setEditing(true);
    }
  };

  const handleInputChange = (field) => (event) => {
    setEditedPerfil({
      ...editedPerfil,
      [field]: event.target.value
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const dataToUpdate = {
        nombre: editedPerfil.nombre,
        email: editedPerfil.email,
        telefono: editedPerfil.telefono
      };

      const response = await api.put('/empleados/mi-perfil', dataToUpdate);

      if (response.data.success) {
        setPerfil(editedPerfil);
        setEditing(false);
        enqueueSnackbar('Perfil actualizado correctamente', { variant: 'success' });
      }
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      enqueueSnackbar(
        error.response?.data?.message || 'Error al actualizar perfil',
        { variant: 'error' }
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      enqueueSnackbar('Por favor selecciona una imagen válida', { variant: 'error' });
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      enqueueSnackbar('La imagen no debe superar los 5MB', { variant: 'error' });
      return;
    }

    try {
      setUploadingPhoto(true);

      const formData = new FormData();
      formData.append('foto_perfil', file);

      const response = await api.post('/empleados/mi-perfil/foto', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setPerfil({
          ...perfil,
          foto_perfil: response.data.data.foto_perfil
        });
        setEditedPerfil({
          ...editedPerfil,
          foto_perfil: response.data.data.foto_perfil
        });
        enqueueSnackbar('Foto de perfil actualizada', { variant: 'success' });
      }
    } catch (error) {
      console.error('Error al subir foto:', error);
      enqueueSnackbar(
        error.response?.data?.message || 'Error al subir la foto',
        { variant: 'error' }
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePasswordChange = async () => {
    // Validaciones
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      enqueueSnackbar('Completa todos los campos', { variant: 'error' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      enqueueSnackbar('Las contraseñas nuevas no coinciden', { variant: 'error' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      enqueueSnackbar('La contraseña debe tener al menos 6 caracteres', { variant: 'error' });
      return;
    }

    try {
      setSaving(true);

      const response = await api.put('/empleados/mi-perfil/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (response.data.success) {
        setOpenPasswordDialog(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        enqueueSnackbar('Contraseña actualizada correctamente', { variant: 'success' });
      }
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      enqueueSnackbar(
        error.response?.data?.message || 'Error al cambiar la contraseña',
        { variant: 'error' }
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  const avatarUrl = perfil.foto_perfil
    ? `${api.defaults.baseURL}/uploads/perfiles/${perfil.foto_perfil}`
    : null;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Mi Perfil
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Administra tu información personal y configuración
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Card de Foto de Perfil */}
        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'visible'
            }}
          >
            <CardContent sx={{ textAlign: 'center', pt: 4, pb: 3 }}>
              <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                <Avatar
                  src={avatarUrl}
                  sx={{
                    width: 140,
                    height: 140,
                    border: '4px solid white',
                    boxShadow: 3,
                    fontSize: '3rem'
                  }}
                >
                  {!avatarUrl && perfil.nombre?.charAt(0).toUpperCase()}
                </Avatar>

                {uploadingPhoto && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha('#000', 0.5),
                      borderRadius: '50%'
                    }}
                  >
                    <CircularProgress size={40} sx={{ color: 'white' }} />
                  </Box>
                )}

                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="photo-upload"
                  type="file"
                  onChange={handlePhotoChange}
                  disabled={uploadingPhoto}
                />
                <label htmlFor="photo-upload">
                  <IconButton
                    component="span"
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      bgcolor: 'white',
                      color: '#667eea',
                      '&:hover': {
                        bgcolor: '#f5f5f5'
                      },
                      boxShadow: 2
                    }}
                    disabled={uploadingPhoto}
                  >
                    <PhotoCameraIcon />
                  </IconButton>
                </label>
              </Box>

              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {perfil.nombre}
              </Typography>

              <Chip
                label={perfil.perfil_nombre || 'Sin perfil asignado'}
                sx={{
                  bgcolor: alpha('#fff', 0.2),
                  color: 'white',
                  fontWeight: 'medium',
                  mb: 2
                }}
                icon={<BadgeIcon sx={{ color: 'white !important' }} />}
              />

              <Typography variant="body2" sx={{ mt: 2, opacity: 0.9 }}>
                {perfil.cargo || 'Empleado'}
              </Typography>
            </CardContent>
          </Card>

          {/* Card de Sucursales */}
          <Card elevation={0} sx={{ mt: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessIcon color="primary" />
                Sucursales Asignadas
              </Typography>
              <Divider sx={{ my: 2 }} />
              {perfil.sucursales && perfil.sucursales.length > 0 ? (
                <Stack spacing={1}>
                  {perfil.sucursales.map((sucursal, index) => (
                    <Chip
                      key={index}
                      label={sucursal}
                      variant="outlined"
                      color="primary"
                      sx={{ justifyContent: 'flex-start' }}
                    />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" fontStyle="italic">
                  No tienes sucursales asignadas
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Card de Información Personal */}
        <Grid item xs={12} md={8}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight="bold">
                  Información Personal
                </Typography>
                <Button
                  variant={editing ? 'outlined' : 'contained'}
                  startIcon={editing ? <CancelIcon /> : <EditIcon />}
                  onClick={handleEditToggle}
                  disabled={saving}
                >
                  {editing ? 'Cancelar' : 'Editar'}
                </Button>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Nombre Completo"
                    value={editing ? editedPerfil.nombre : perfil.nombre}
                    onChange={handleInputChange('nombre')}
                    disabled={!editing}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon color={editing ? 'primary' : 'action'} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={editing ? editedPerfil.email : perfil.email}
                    onChange={handleInputChange('email')}
                    disabled={!editing}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon color={editing ? 'primary' : 'action'} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Teléfono"
                    value={editing ? editedPerfil.telefono : perfil.telefono}
                    onChange={handleInputChange('telefono')}
                    disabled={!editing}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon color={editing ? 'primary' : 'action'} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="RUT"
                    value={perfil.rut}
                    disabled
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <BadgeIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                    helperText="El RUT no puede ser modificado"
                  />
                </Grid>
              </Grid>

              {editing && (
                <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={handleEditToggle}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Card de Seguridad */}
          <Card elevation={0} sx={{ mt: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LockIcon color="primary" />
                Seguridad
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight="medium">
                    Contraseña
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cambia tu contraseña regularmente para mayor seguridad
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<LockIcon />}
                  onClick={() => setOpenPasswordDialog(true)}
                >
                  Cambiar Contraseña
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog para Cambiar Contraseña */}
      <Dialog
        open={openPasswordDialog}
        onClose={() => !saving && setOpenPasswordDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockIcon color="primary" />
            Cambiar Contraseña
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              type={showPasswords.current ? 'text' : 'password'}
              label="Contraseña Actual"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      edge="end"
                    >
                      {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              type={showPasswords.new ? 'text' : 'password'}
              label="Nueva Contraseña"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              helperText="Mínimo 6 caracteres"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      edge="end"
                    >
                      {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              type={showPasswords.confirm ? 'text' : 'password'}
              label="Confirmar Nueva Contraseña"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              error={passwordData.confirmPassword !== '' && passwordData.newPassword !== passwordData.confirmPassword}
              helperText={
                passwordData.confirmPassword !== '' && passwordData.newPassword !== passwordData.confirmPassword
                  ? 'Las contraseñas no coinciden'
                  : ''
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      edge="end"
                    >
                      {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {passwordData.newPassword !== '' && passwordData.newPassword === passwordData.confirmPassword && (
              <Alert severity="success" icon={<CheckCircleIcon />}>
                Las contraseñas coinciden
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={() => setOpenPasswordDialog(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handlePasswordChange}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : <LockIcon />}
          >
            {saving ? 'Guardando...' : 'Cambiar Contraseña'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
