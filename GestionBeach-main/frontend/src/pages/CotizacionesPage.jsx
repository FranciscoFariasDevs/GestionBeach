// frontend/src/pages/CotizacionesPage.jsx
import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, Grid, IconButton, InputAdornment, LinearProgress, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography, Alert, Avatar, Link,
} from '@mui/material';
import {
  Add, Check, Close, Delete, AttachMoney, Receipt, HourglassEmpty,
  Visibility, CloudUpload, OpenInNew,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../api/api';
import { AuthContext } from '../contexts/AuthContext';

// ─── Perfiles ────────────────────────────────────────────────────────────────
const PERFILES_GERENTE  = [11, 10, 16];   // Gerencia + Admin
const PERFILES_FINANZAS = [12, 10, 16];   // Finanzas + Admin
const PERFILES_CREADOR  = [14, 10, 16];   // Jefe Local + Admin

const ESTADO_CHIP = {
  pendiente: { label: 'Pendiente',  color: 'warning' },
  aprobada:  { label: 'Aprobada',   color: 'success' },
  rechazada: { label: 'Rechazada',  color: 'error'   },
};

const fmtPeso = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n || 0);

const fmtFecha = (f) =>
  f ? new Date(f).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }) : '—';

// ─── Fila editable de ítem ────────────────────────────────────────────────────
function ItemRow({ item, index, onChange, onRemove, onUploadFoto }) {
  const subtotal = (Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0);

  return (
    <TableRow>
      {/* Foto */}
      <TableCell sx={{ width: 80 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
          {item.foto_url ? (
            <Avatar
              src={item.foto_url}
              variant="rounded"
              sx={{ width: 52, height: 52, cursor: 'pointer' }}
              onClick={() => window.open(item.foto_url, '_blank')}
            />
          ) : (
            <Avatar variant="rounded" sx={{ width: 52, height: 52, bgcolor: 'grey.100' }}>
              <CloudUpload sx={{ color: 'grey.400', fontSize: 20 }} />
            </Avatar>
          )}
          <Button
            component="label"
            size="small"
            variant="text"
            sx={{ fontSize: 10, p: 0, minWidth: 0 }}
          >
            Foto
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => onUploadFoto(index, e.target.files[0])}
            />
          </Button>
        </Box>
      </TableCell>

      {/* Producto */}
      <TableCell>
        <TextField
          size="small"
          fullWidth
          placeholder="Nombre del producto"
          value={item.producto}
          onChange={(e) => onChange(index, 'producto', e.target.value)}
        />
      </TableCell>

      {/* Link */}
      <TableCell sx={{ width: 180 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="https://..."
          value={item.link || ''}
          onChange={(e) => onChange(index, 'link', e.target.value)}
          InputProps={{
            endAdornment: item.link ? (
              <InputAdornment position="end">
                <IconButton size="small" href={item.link} target="_blank">
                  <OpenInNew fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
      </TableCell>

      {/* Cantidad */}
      <TableCell sx={{ width: 90 }}>
        <TextField
          size="small"
          type="number"
          value={item.cantidad}
          onChange={(e) => onChange(index, 'cantidad', e.target.value)}
          inputProps={{ min: 1 }}
        />
      </TableCell>

      {/* Precio unitario */}
      <TableCell sx={{ width: 130 }}>
        <TextField
          size="small"
          type="number"
          value={item.precio_unitario}
          onChange={(e) => onChange(index, 'precio_unitario', e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
          inputProps={{ min: 0, step: 100 }}
        />
      </TableCell>

      {/* Subtotal */}
      <TableCell sx={{ width: 120, fontWeight: 600, color: 'primary.main' }}>
        {fmtPeso(subtotal)}
      </TableCell>

      {/* Eliminar */}
      <TableCell sx={{ width: 40 }}>
        <IconButton size="small" color="error" onClick={() => onRemove(index)}>
          <Delete fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}

// ─── Modal: ver cotización ────────────────────────────────────────────────────
function ModalVer({ open, onClose, cotizacion, perfilId, onAprobar, onRechazar }) {
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [rechazando, setRechazando] = useState(false);

  if (!cotizacion) return null;

  const puedeAprobar = PERFILES_GERENTE.includes(perfilId) && cotizacion.estado === 'pendiente';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6">{cotizacion.asunto}</Typography>
          <Typography variant="caption" color="text.secondary">
            #{cotizacion.id} · {cotizacion.creado_por_nombre} · {cotizacion.sucursal_nombre}
          </Typography>
        </Box>
        <Chip
          label={ESTADO_CHIP[cotizacion.estado]?.label}
          color={ESTADO_CHIP[cotizacion.estado]?.color}
          size="small"
        />
      </DialogTitle>

      <DialogContent dividers>
        {cotizacion.descripcion && (
          <Alert severity="info" sx={{ mb: 2 }}>{cotizacion.descripcion}</Alert>
        )}

        {cotizacion.estado === 'rechazada' && cotizacion.motivo_rechazo && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>Motivo de rechazo:</strong> {cotizacion.motivo_rechazo}
          </Alert>
        )}

        {/* Tabla de ítems */}
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell>Foto</TableCell>
                <TableCell>Producto</TableCell>
                <TableCell>Link</TableCell>
                <TableCell align="center">Cant.</TableCell>
                <TableCell align="right">P. Unitario</TableCell>
                <TableCell align="right">Subtotal</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(cotizacion.items || []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.foto_url ? (
                      <Avatar
                        src={item.foto_url}
                        variant="rounded"
                        sx={{ width: 44, height: 44, cursor: 'pointer' }}
                        onClick={() => window.open(item.foto_url, '_blank')}
                      />
                    ) : (
                      <Avatar variant="rounded" sx={{ width: 44, height: 44, bgcolor: 'grey.100' }} />
                    )}
                  </TableCell>
                  <TableCell>{item.producto}</TableCell>
                  <TableCell>
                    {item.link ? (
                      <Link href={item.link} target="_blank" underline="hover" sx={{ fontSize: 13 }}>
                        Ver enlace
                      </Link>
                    ) : '—'}
                  </TableCell>
                  <TableCell align="center">{item.cantidad}</TableCell>
                  <TableCell align="right">{fmtPeso(item.precio_unitario)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{fmtPeso(item.subtotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
          <Typography variant="h6">
            Total: <strong>{fmtPeso(cotizacion.total)}</strong>
          </Typography>
        </Box>

        {/* Panel de rechazo */}
        {rechazando && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Motivo del rechazo"
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Explica por qué se rechaza esta cotización..."
              required
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined">Cerrar</Button>

        {puedeAprobar && !rechazando && (
          <>
            <Button
              startIcon={<Close />}
              color="error"
              variant="outlined"
              onClick={() => setRechazando(true)}
            >
              Rechazar
            </Button>
            <Button
              startIcon={<Check />}
              color="success"
              variant="contained"
              onClick={() => onAprobar(cotizacion.id)}
            >
              Aprobar
            </Button>
          </>
        )}

        {rechazando && (
          <>
            <Button onClick={() => { setRechazando(false); setMotivoRechazo(''); }}>
              Cancelar
            </Button>
            <Button
              startIcon={<Close />}
              color="error"
              variant="contained"
              disabled={!motivoRechazo.trim()}
              onClick={() => onRechazar(cotizacion.id, motivoRechazo)}
            >
              Confirmar rechazo
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function CotizacionesPage() {
  const { user } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const perfilId = user?.perfil_id;

  const [cotizaciones, setCotizaciones] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [modalCrear, setModalCrear]     = useState(false);
  const [cotSeleccionada, setCotSeleccionada] = useState(null);
  const [guardando, setGuardando]       = useState(false);

  // Form nueva cotización
  const [asunto, setAsunto]           = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [items, setItems]             = useState([
    { producto: '', foto_url: '', link: '', cantidad: 1, precio_unitario: 0 }
  ]);

  const puedeCrear = PERFILES_CREADOR.includes(perfilId);
  const total = items.reduce((s, i) => s + (Number(i.cantidad) || 0) * (Number(i.precio_unitario) || 0), 0);

  // ── Cargar lista ───────────────────────────────────────────────────────────
  const cargarCotizaciones = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/cotizaciones');
      setCotizaciones(data.data || []);
    } catch {
      enqueueSnackbar('Error al cargar cotizaciones', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => { cargarCotizaciones(); }, [cargarCotizaciones]);

  // ── Notificaciones en tiempo real ──────────────────────────────────────────
  useEffect(() => {
    const socket = window._socket;
    if (!socket) return;

    const handleNuevaCot = (data) => {
      if (!data.para_roles?.includes(perfilId) && !data.para_usuarios?.includes(user?.id)) return;
      enqueueSnackbar(`Nueva cotización: "${data.asunto}" de ${data.creado_por_nombre}`, {
        variant: 'info', persist: false,
      });
      cargarCotizaciones();
    };

    const handleAprobada = (data) => {
      if (!data.para_usuarios?.includes(user?.id)) return;
      enqueueSnackbar(`Cotización "${data.asunto}" fue APROBADA`, { variant: 'success' });
      cargarCotizaciones();
    };

    const handleRechazada = (data) => {
      if (!data.para_usuarios?.includes(user?.id)) return;
      enqueueSnackbar(`Cotización "${data.asunto}" fue rechazada: ${data.motivo}`, { variant: 'error', persist: true });
      cargarCotizaciones();
    };

    socket.on('nueva_cotizacion',    handleNuevaCot);
    socket.on('cotizacion_aprobada', handleAprobada);
    socket.on('cotizacion_rechazada',handleRechazada);

    return () => {
      socket.off('nueva_cotizacion',    handleNuevaCot);
      socket.off('cotizacion_aprobada', handleAprobada);
      socket.off('cotizacion_rechazada',handleRechazada);
    };
  }, [user, perfilId, enqueueSnackbar, cargarCotizaciones]);

  // ── Manejo de ítems ────────────────────────────────────────────────────────
  const agregarItem = () =>
    setItems(prev => [...prev, { producto: '', foto_url: '', link: '', cantidad: 1, precio_unitario: 0 }]);

  const cambiarItem = (index, field, value) =>
    setItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));

  const eliminarItem = (index) =>
    setItems(prev => prev.filter((_, i) => i !== index));

  const uploadFoto = async (index, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('foto', file);
    try {
      const { data } = await api.post('/cotizaciones/upload-foto', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      cambiarItem(index, 'foto_url', data.url);
    } catch {
      enqueueSnackbar('Error al subir imagen', { variant: 'error' });
    }
  };

  // ── Crear cotización ───────────────────────────────────────────────────────
  const handleCrear = async () => {
    if (!asunto.trim()) return enqueueSnackbar('El asunto es obligatorio', { variant: 'warning' });
    if (items.some(i => !i.producto.trim())) return enqueueSnackbar('Todos los ítems deben tener nombre', { variant: 'warning' });

    setGuardando(true);
    try {
      await api.post('/cotizaciones', { asunto, descripcion, items });
      enqueueSnackbar('Cotización enviada al gerente', { variant: 'success' });
      setModalCrear(false);
      resetForm();
      cargarCotizaciones();
    } catch {
      enqueueSnackbar('Error al crear cotización', { variant: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  const resetForm = () => {
    setAsunto('');
    setDescripcion('');
    setItems([{ producto: '', foto_url: '', link: '', cantidad: 1, precio_unitario: 0 }]);
  };

  // ── Ver cotización con ítems ───────────────────────────────────────────────
  const verCotizacion = async (id) => {
    try {
      const { data } = await api.get(`/cotizaciones/${id}`);
      setCotSeleccionada(data.data);
    } catch {
      enqueueSnackbar('Error al cargar cotización', { variant: 'error' });
    }
  };

  // ── Aprobar ────────────────────────────────────────────────────────────────
  const handleAprobar = async (id) => {
    try {
      await api.put(`/cotizaciones/${id}/aprobar`);
      enqueueSnackbar('Cotización aprobada. Finanzas fue notificada.', { variant: 'success' });
      setCotSeleccionada(null);
      cargarCotizaciones();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Error al aprobar', { variant: 'error' });
    }
  };

  // ── Rechazar ───────────────────────────────────────────────────────────────
  const handleRechazar = async (id, motivo) => {
    try {
      await api.put(`/cotizaciones/${id}/rechazar`, { motivo });
      enqueueSnackbar('Cotización rechazada', { variant: 'info' });
      setCotSeleccionada(null);
      cargarCotizaciones();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Error al rechazar', { variant: 'error' });
    }
  };

  // ── Contadores de estado ───────────────────────────────────────────────────
  const pendientes = cotizaciones.filter(c => c.estado === 'pendiente').length;
  const aprobadas  = cotizaciones.filter(c => c.estado === 'aprobada').length;
  const rechazadas = cotizaciones.filter(c => c.estado === 'rechazada').length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Receipt color="primary" /> Cotizaciones
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {PERFILES_GERENTE.includes(perfilId)
              ? 'Revisa y aprueba las cotizaciones del equipo'
              : PERFILES_FINANZAS.includes(perfilId)
              ? 'Cotizaciones aprobadas para procesar'
              : 'Envía cotizaciones para aprobación de gerencia'}
          </Typography>
        </Box>
        {puedeCrear && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setModalCrear(true)}
          >
            Nueva cotización
          </Button>
        )}
      </Box>

      {/* Chips resumen */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
        <Chip icon={<HourglassEmpty />} label={`${pendientes} pendiente${pendientes !== 1 ? 's' : ''}`} color="warning" variant="outlined" />
        <Chip icon={<Check />}          label={`${aprobadas} aprobada${aprobadas !== 1 ? 's' : ''}`}  color="success" variant="outlined" />
        <Chip icon={<Close />}          label={`${rechazadas} rechazada${rechazadas !== 1 ? 's' : ''}`} color="error" variant="outlined" />
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Tabla */}
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell>#</TableCell>
              <TableCell>Asunto</TableCell>
              <TableCell>Solicitante</TableCell>
              <TableCell>Sucursal</TableCell>
              <TableCell align="center">Ítems</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell align="center">Ver</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cotizaciones.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No hay cotizaciones para mostrar
                </TableCell>
              </TableRow>
            ) : cotizaciones.map((c) => {
              const chip = ESTADO_CHIP[c.estado] || {};
              return (
                <TableRow key={c.id} hover>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>#{c.id}</TableCell>
                  <TableCell sx={{ fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.asunto}
                  </TableCell>
                  <TableCell>{c.creado_por_nombre}</TableCell>
                  <TableCell>{c.sucursal_nombre || '—'}</TableCell>
                  <TableCell align="center">{c.num_items}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{fmtPeso(c.total)}</TableCell>
                  <TableCell>
                    <Chip label={chip.label} color={chip.color} size="small" />
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>{fmtFecha(c.fecha_creacion)}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Ver detalle">
                      <IconButton size="small" onClick={() => verCotizacion(c.id)}>
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Modal: Crear cotización ── */}
      <Dialog open={modalCrear} onClose={() => { setModalCrear(false); resetForm(); }} maxWidth="lg" fullWidth>
        <DialogTitle>Nueva cotización</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Asunto *"
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                placeholder="Ej: Compra de materiales para local Viña del Mar"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 1.5, bgcolor: 'primary.50', borderRadius: 2, border: '1px solid', borderColor: 'primary.200', textAlign: 'center' }}>
                <Typography variant="caption" color="primary.main">TOTAL COTIZACIÓN</Typography>
                <Typography variant="h5" fontWeight={700} color="primary.main">
                  {fmtPeso(total)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Descripción / observaciones"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Información adicional para gerencia..."
              />
            </Grid>
          </Grid>

          {/* Tabla de ítems */}
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
            Ítems de la cotización
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>Foto</TableCell>
                  <TableCell>Producto *</TableCell>
                  <TableCell>Link</TableCell>
                  <TableCell>Cantidad</TableCell>
                  <TableCell>Precio unit.</TableCell>
                  <TableCell>Subtotal</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => (
                  <ItemRow
                    key={index}
                    item={item}
                    index={index}
                    onChange={cambiarItem}
                    onRemove={eliminarItem}
                    onUploadFoto={uploadFoto}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Button
            startIcon={<Add />}
            onClick={agregarItem}
            sx={{ mt: 1.5 }}
            variant="outlined"
            size="small"
          >
            Agregar ítem
          </Button>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => { setModalCrear(false); resetForm(); }}>Cancelar</Button>
          <Button
            variant="contained"
            startIcon={<AttachMoney />}
            onClick={handleCrear}
            disabled={guardando || !asunto.trim() || items.length === 0}
          >
            {guardando ? 'Enviando...' : 'Enviar a gerente'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Modal: Ver cotización ── */}
      <ModalVer
        open={!!cotSeleccionada}
        onClose={() => setCotSeleccionada(null)}
        cotizacion={cotSeleccionada}
        perfilId={perfilId}
        onAprobar={handleAprobar}
        onRechazar={handleRechazar}
      />
    </Box>
  );
}
