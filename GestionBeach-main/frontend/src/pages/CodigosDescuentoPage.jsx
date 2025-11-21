// frontend/src/pages/CodigosDescuentoPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  Snackbar,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ConfirmationNumber as CodeIcon
} from '@mui/icons-material';
import api from '../api/api';

const CodigosDescuentoPage = () => {
  const [codigos, setCodigos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedCodigo, setSelectedCodigo] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [formData, setFormData] = useState({
    codigo: '',
    descripcion: '',
    tipo_descuento: 'porcentaje',
    valor_descuento: '',
    fecha_inicio: '',
    fecha_fin: '',
    usos_maximos: '',
    activo: true
  });

  useEffect(() => {
    cargarCodigos();
  }, []);

  const cargarCodigos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/codigos-descuento');

      if (response.data.success) {
        setCodigos(response.data.data);
      }
    } catch (error) {
      console.error('Error al cargar códigos:', error);
      showSnackbar('Error al cargar códigos de descuento', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (codigo = null) => {
    if (codigo) {
      setSelectedCodigo(codigo);
      setFormData({
        codigo: codigo.codigo,
        descripcion: codigo.descripcion || '',
        tipo_descuento: codigo.tipo_descuento,
        valor_descuento: codigo.valor_descuento,
        fecha_inicio: codigo.fecha_inicio ? codigo.fecha_inicio.split('T')[0] : '',
        fecha_fin: codigo.fecha_fin ? codigo.fecha_fin.split('T')[0] : '',
        usos_maximos: codigo.usos_maximos || '',
        activo: codigo.activo
      });
    } else {
      setSelectedCodigo(null);
      setFormData({
        codigo: '',
        descripcion: '',
        tipo_descuento: 'porcentaje',
        valor_descuento: '',
        fecha_inicio: '',
        fecha_fin: '',
        usos_maximos: '',
        activo: true
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCodigo(null);
    setFormData({
      codigo: '',
      descripcion: '',
      tipo_descuento: 'porcentaje',
      valor_descuento: '',
      fecha_inicio: '',
      fecha_fin: '',
      usos_maximos: '',
      activo: true
    });
  };

  const handleInputChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async () => {
    try {
      // Validaciones
      if (!formData.codigo.trim()) {
        showSnackbar('El código es obligatorio', 'error');
        return;
      }

      if (!formData.valor_descuento || formData.valor_descuento <= 0) {
        showSnackbar('El valor del descuento debe ser mayor a 0', 'error');
        return;
      }

      if (formData.tipo_descuento === 'porcentaje' && formData.valor_descuento > 100) {
        showSnackbar('El porcentaje no puede ser mayor a 100', 'error');
        return;
      }

      const payload = {
        codigo: formData.codigo.trim().toUpperCase(),
        descripcion: formData.descripcion.trim(),
        tipo_descuento: formData.tipo_descuento,
        valor_descuento: parseFloat(formData.valor_descuento),
        fecha_inicio: formData.fecha_inicio || null,
        fecha_fin: formData.fecha_fin || null,
        usos_maximos: formData.usos_maximos ? parseInt(formData.usos_maximos) : null,
        activo: formData.activo
      };

      if (selectedCodigo) {
        // Actualizar
        const response = await api.put(`/codigos-descuento/${selectedCodigo.id}`, payload);
        if (response.data.success) {
          showSnackbar('Código actualizado exitosamente', 'success');
          cargarCodigos();
          handleCloseDialog();
        }
      } else {
        // Crear
        const response = await api.post('/codigos-descuento', payload);
        if (response.data.success) {
          showSnackbar('Código creado exitosamente', 'success');
          cargarCodigos();
          handleCloseDialog();
        }
      }
    } catch (error) {
      console.error('Error al guardar código:', error);
      showSnackbar(
        error.response?.data?.message || 'Error al guardar código',
        'error'
      );
    }
  };

  const handleDelete = async () => {
    try {
      const response = await api.delete(`/codigos-descuento/${selectedCodigo.id}`);
      if (response.data.success) {
        showSnackbar('Código eliminado exitosamente', 'success');
        cargarCodigos();
        setOpenDeleteDialog(false);
        setSelectedCodigo(null);
      }
    } catch (error) {
      console.error('Error al eliminar código:', error);
      showSnackbar('Error al eliminar código', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const getEstadoChip = (codigo) => {
    const estado = codigo.estado;
    const colors = {
      activo: 'success',
      inactivo: 'default',
      expirado: 'error',
      agotado: 'warning',
      pendiente: 'info'
    };

    const labels = {
      activo: 'Activo',
      inactivo: 'Inactivo',
      expirado: 'Expirado',
      agotado: 'Agotado',
      pendiente: 'Pendiente'
    };

    return (
      <Chip
        label={labels[estado] || estado}
        color={colors[estado] || 'default'}
        size="small"
      />
    );
  };

  const formatDescuento = (tipo, valor) => {
    if (tipo === 'porcentaje') {
      return `${valor}%`;
    }
    return `$${parseFloat(valor).toLocaleString('es-CL')}`;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CodeIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight="bold">
            Códigos de Descuento
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{
            background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
            color: 'white',
            px: 3
          }}
        >
          Nuevo Código
        </Button>
      </Box>

      {/* Tabla de códigos */}
      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell><strong>Código</strong></TableCell>
              <TableCell><strong>Descripción</strong></TableCell>
              <TableCell align="center"><strong>Descuento</strong></TableCell>
              <TableCell align="center"><strong>Vigencia</strong></TableCell>
              <TableCell align="center"><strong>Usos</strong></TableCell>
              <TableCell align="center"><strong>Estado</strong></TableCell>
              <TableCell align="center"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : codigos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No hay códigos de descuento registrados
                </TableCell>
              </TableRow>
            ) : (
              codigos.map((codigo) => (
                <TableRow key={codigo.id} hover>
                  <TableCell>
                    <Typography variant="body1" fontWeight="bold">
                      {codigo.codigo}
                    </Typography>
                  </TableCell>
                  <TableCell>{codigo.descripcion || '-'}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={formatDescuento(codigo.tipo_descuento, codigo.valor_descuento)}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    {codigo.fecha_inicio ? (
                      <Typography variant="caption" display="block">
                        Desde: {new Date(codigo.fecha_inicio).toLocaleDateString('es-CL')}
                      </Typography>
                    ) : null}
                    {codigo.fecha_fin ? (
                      <Typography variant="caption" display="block">
                        Hasta: {new Date(codigo.fecha_fin).toLocaleDateString('es-CL')}
                      </Typography>
                    ) : null}
                    {!codigo.fecha_inicio && !codigo.fecha_fin ? 'Sin límite' : null}
                  </TableCell>
                  <TableCell align="center">
                    {codigo.usos_actuales || 0} / {codigo.usos_maximos || '∞'}
                  </TableCell>
                  <TableCell align="center">
                    {getEstadoChip(codigo)}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleOpenDialog(codigo)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        setSelectedCodigo(codigo);
                        setOpenDeleteDialog(true);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog Crear/Editar */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedCodigo ? 'Editar Código' : 'Nuevo Código de Descuento'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Código"
                name="codigo"
                value={formData.codigo}
                onChange={handleInputChange}
                placeholder="Ej: VERANO2025"
                helperText="Se convertirá a mayúsculas automáticamente"
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleInputChange}
                multiline
                rows={2}
                placeholder="Descripción del código promocional"
              />
            </Grid>

            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de descuento</InputLabel>
                <Select
                  name="tipo_descuento"
                  value={formData.tipo_descuento}
                  onChange={handleInputChange}
                  label="Tipo de descuento"
                >
                  <MenuItem value="porcentaje">Porcentaje</MenuItem>
                  <MenuItem value="monto_fijo">Monto Fijo</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Valor del descuento"
                name="valor_descuento"
                type="number"
                value={formData.valor_descuento}
                onChange={handleInputChange}
                InputProps={{
                  endAdornment: formData.tipo_descuento === 'porcentaje' ? '%' : '$'
                }}
                required
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Fecha inicio"
                name="fecha_inicio"
                type="date"
                value={formData.fecha_inicio}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                helperText="Opcional"
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Fecha fin"
                name="fecha_fin"
                type="date"
                value={formData.fecha_fin}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                helperText="Opcional"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Usos máximos"
                name="usos_maximos"
                type="number"
                value={formData.usos_maximos}
                onChange={handleInputChange}
                placeholder="Dejar vacío para usos ilimitados"
                helperText="Opcional - Vacío = ilimitado"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    name="activo"
                    checked={formData.activo}
                    onChange={handleInputChange}
                    color="primary"
                  />
                }
                label="Código activo"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{
              background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)'
            }}
          >
            {selectedCodigo ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Eliminar */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Está seguro que desea eliminar el código <strong>{selectedCodigo?.codigo}</strong>?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Esta acción no se puede deshacer.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CodigosDescuentoPage;
