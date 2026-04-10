// frontend/src/pages/CotizacionesPage.jsx
import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import {
  Autocomplete, Box, Button, Chip, Collapse, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, Grid, IconButton, InputAdornment,
  LinearProgress, Paper, Stack, Switch, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
  Alert, Avatar, Link, ToggleButton, ToggleButtonGroup, Badge,
} from '@mui/material';
import {
  Add, Check, Close, Delete, AttachMoney, Receipt, HourglassEmpty,
  Visibility, CloudUpload, OpenInNew, ShoppingCart, Block,
  FilterList, CalendarMonth, Search, Clear, PictureAsPdf,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../api/api';
import AuthContext from '../contexts/AuthContext';

// ─── Perfiles ────────────────────────────────────────────────────────────────
const PERFILES_GERENTE  = [11];       // Solo Gerencia puede aprobar/rechazar
const PERFILES_FINANZAS = [12];       // Finanzas: ve solo aprobadas, no aprueba
const PERFILES_CREADOR  = [10, 14];   // SuperAdmin + Jefes de Local

const ESTADO_CHIP = {
  pendiente: { label: 'Pendiente',  color: 'warning'  },
  aprobada:  { label: 'Aprobada',   color: 'success'  },
  rechazada: { label: 'Rechazada',  color: 'error'    },
  comprado:  { label: 'Comprado',   color: 'primary'  },
  anulado:   { label: 'Anulado',    color: 'default'  },
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

      {/* Destino */}
      <TableCell sx={{ width: 150 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Ej: Local Viña"
          value={item.destino || ''}
          onChange={(e) => onChange(index, 'destino', e.target.value)}
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

// ─── Exportar cotización a PDF ────────────────────────────────────────────────
function exportarCotizacionPDF(cotizacion) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const primary = [22, 93, 170];   // azul corporativo
  const dark    = [30, 30, 30];
  const gray    = [120, 120, 120];
  const light   = [245, 247, 250];

  // ── Banda superior ──────────────────────────────────────────────────────────
  doc.setFillColor(...primary);
  doc.rect(0, 0, pageW, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('BEACH MARKET', 14, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Gestión de Cotizaciones', 14, 19);

  // Número de cotización (derecha)
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(`COT-${String(cotizacion.id).padStart(4, '0')}`, pageW - 14, 16, { align: 'right' });

  // ── Bloque de información ───────────────────────────────────────────────────
  doc.setTextColor(...dark);
  let y = 36;

  // Cuadro izquierdo: datos cotización
  doc.setFillColor(...light);
  doc.roundedRect(14, y, 115, 36, 2, 2, 'F');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...gray);
  doc.text('ASUNTO', 18, y + 7);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...dark);
  doc.text(cotizacion.asunto || '—', 18, y + 13, { maxWidth: 107 });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...gray);
  doc.text('SOLICITANTE', 18, y + 23);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...dark);
  doc.text(cotizacion.creado_por_nombre || '—', 18, y + 28);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...gray);
  doc.text('FECHA', 80, y + 23);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...dark);
  const fechaStr = cotizacion.fecha_creacion
    ? new Date(cotizacion.fecha_creacion).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';
  doc.text(fechaStr, 80, y + 28);

  // Cuadro derecho: estado y total
  const estadoColores = {
    pendiente: [255, 152, 0],
    aprobada:  [46, 125, 50],
    rechazada: [198, 40, 40],
    comprado:  [21, 101, 192],
    anulado:   [97, 97, 97],
  };
  const estadoLabels = {
    pendiente: 'PENDIENTE', aprobada: 'APROBADA', rechazada: 'RECHAZADA',
    comprado: 'COMPRADO', anulado: 'ANULADO',
  };
  const color = estadoColores[cotizacion.estado] || [97, 97, 97];

  doc.setFillColor(...color);
  doc.roundedRect(133, y, 63, 17, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(estadoLabels[cotizacion.estado] || cotizacion.estado?.toUpperCase() || '—', 164, y + 11, { align: 'center' });

  doc.setFillColor(...light);
  doc.roundedRect(133, y + 20, 63, 16, 2, 2, 'F');
  doc.setTextColor(...gray);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', 164, y + 26, { align: 'center' });
  doc.setTextColor(...primary);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(fmtPeso(cotizacion.total), 164, y + 33, { align: 'center' });

  y += 44;

  // ── Descripción (si existe) ─────────────────────────────────────────────────
  if (cotizacion.descripcion) {
    doc.setFillColor(255, 248, 225);
    doc.roundedRect(14, y, 182, 10, 2, 2, 'F');
    doc.setTextColor(120, 80, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(`Observaciones: ${cotizacion.descripcion}`, 18, y + 7, { maxWidth: 174 });
    y += 14;
  }

  // ── Tabla de ítems ──────────────────────────────────────────────────────────
  const rows = (cotizacion.items || []).map((item, i) => [
    i + 1,
    item.producto || '—',
    item.destino  || '—',
    item.cantidad,
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(item.precio_unitario || 0),
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(item.subtotal || 0),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Producto', 'Destino', 'Cant.', 'P. Unitario', 'Subtotal']],
    body: rows,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: {
      fillColor: primary,
      textColor: 255,
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'right',  cellWidth: 32 },
      5: { halign: 'right',  cellWidth: 32, fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [249, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  // ── Fila de total ──────────────────────────────────────────────────────────
  const finalY = doc.lastAutoTable.finalY + 4;
  doc.setFillColor(...primary);
  doc.roundedRect(pageW - 14 - 80, finalY, 80, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', pageW - 14 - 55, finalY + 8);
  doc.text(fmtPeso(cotizacion.total), pageW - 16, finalY + 8, { align: 'right' });

  // ── Motivo rechazo/anulación ────────────────────────────────────────────────
  if (cotizacion.motivo_rechazo) {
    const my = finalY + 18;
    doc.setFillColor(255, 235, 238);
    doc.roundedRect(14, my, 182, 10, 2, 2, 'F');
    doc.setTextColor(198, 40, 40);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(`Motivo de rechazo: ${cotizacion.motivo_rechazo}`, 18, my + 7, { maxWidth: 174 });
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(...primary);
  doc.rect(0, pageH - 12, pageW, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const now = new Date().toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
  doc.text(`Generado el ${now} · Beach Market Gestión`, 14, pageH - 4);
  doc.text(`Pág. 1`, pageW - 14, pageH - 4, { align: 'right' });

  doc.save(`Cotizacion-${String(cotizacion.id).padStart(4, '0')}-${cotizacion.asunto?.replace(/\s+/g, '_').slice(0, 30) || 'sin_asunto'}.pdf`);
}

// ─── Modal: ver cotización ────────────────────────────────────────────────────
function ModalVer({ open, onClose, cotizacion, perfilId, onAprobar, onRechazar, onComprar, onAnular }) {
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [rechazando, setRechazando]       = useState(false);
  const [anulando, setAnulando]           = useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');

  if (!cotizacion) return null;

  const puedeAprobar   = PERFILES_GERENTE.includes(perfilId) && cotizacion.estado === 'pendiente';
  const puedeFinanzas  = PERFILES_FINANZAS.includes(perfilId) && cotizacion.estado === 'aprobada';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6">{cotizacion.asunto}</Typography>
          <Typography variant="caption" color="text.secondary">
            #{cotizacion.id} · {cotizacion.creado_por_nombre}
            {cotizacion.destino ? ` · Destino: ${cotizacion.destino}` : ''}
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
                <TableCell>Destino</TableCell>
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
                  <TableCell sx={{ fontSize: 13, color: item.destino ? 'text.primary' : 'text.disabled' }}>
                    {item.destino || '—'}
                  </TableCell>
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

        {/* Panel de rechazo (Gerencia) */}
        {rechazando && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <TextField
              fullWidth multiline rows={3}
              label="Motivo del rechazo"
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Explica por qué se rechaza esta cotización..."
              required
            />
          </Box>
        )}

        {/* Panel de anulación (Finanzas) */}
        {anulando && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <TextField
              fullWidth multiline rows={2}
              label="Motivo de anulación (opcional)"
              value={motivoAnulacion}
              onChange={(e) => setMotivoAnulacion(e.target.value)}
              placeholder="Indica el motivo de la anulación..."
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined">Cerrar</Button>

        {(PERFILES_GERENTE.includes(perfilId) || PERFILES_FINANZAS.includes(perfilId)) && (
          <Button
            startIcon={<PictureAsPdf />}
            color="secondary"
            variant="outlined"
            onClick={() => exportarCotizacionPDF(cotizacion)}
          >
            Descargar PDF
          </Button>
        )}

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
            <Button onClick={() => { setRechazando(false); setMotivoRechazo(''); }}>Cancelar</Button>
            <Button
              startIcon={<Close />} color="error" variant="contained"
              disabled={!motivoRechazo.trim()}
              onClick={() => onRechazar(cotizacion.id, motivoRechazo)}
            >
              Confirmar rechazo
            </Button>
          </>
        )}

        {/* Botones Finanzas */}
        {puedeFinanzas && !anulando && (
          <>
            <Button
              startIcon={<Block />} color="warning" variant="outlined"
              onClick={() => setAnulando(true)}
            >
              Anular
            </Button>
            <Button
              startIcon={<ShoppingCart />} color="primary" variant="contained"
              onClick={() => onComprar(cotizacion.id)}
            >
              Marcar como Comprado
            </Button>
          </>
        )}

        {anulando && (
          <>
            <Button onClick={() => { setAnulando(false); setMotivoAnulacion(''); }}>Cancelar</Button>
            <Button
              startIcon={<Block />} color="warning" variant="contained"
              onClick={() => onAnular(cotizacion.id, motivoAnulacion)}
            >
              Confirmar anulación
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ─── Fila de cotización (reutilizable para vista plana y agrupada) ────────────
function FilaCotizacion({ c, onVer }) {
  const chip = ESTADO_CHIP[c.estado] || {};
  return (
    <TableRow hover>
      <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>#{c.id}</TableCell>
      <TableCell sx={{ fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {c.asunto}
      </TableCell>
      <TableCell sx={{ fontSize: 13 }}>{c.creado_por_nombre}</TableCell>
      <TableCell sx={{ maxWidth: 160 }}>
        {c.destinos ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
            {c.destinos.split(', ').map((d, i) => (
              <Chip key={i} label={d} size="small" variant="outlined" sx={{ fontSize: 11, height: 20 }} />
            ))}
          </Box>
        ) : <Typography variant="caption" color="text.disabled">—</Typography>}
      </TableCell>
      <TableCell align="center">{c.num_items}</TableCell>
      <TableCell align="right" sx={{ fontWeight: 600, fontSize: 13 }}>{fmtPeso(c.total)}</TableCell>
      <TableCell>
        <Chip label={chip.label} color={chip.color} size="small" />
      </TableCell>
      <TableCell sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>{fmtFecha(c.fecha_creacion)}</TableCell>
      <TableCell align="center">
        <Tooltip title="Ver detalle">
          <IconButton size="small" onClick={() => onVer(c.id)}>
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function CotizacionesPage() {
  const { user } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const perfilId = user?.perfilId;

  const [cotizaciones, setCotizaciones] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [modalCrear, setModalCrear]     = useState(false);
  const [cotSeleccionada, setCotSeleccionada] = useState(null);
  const [guardando, setGuardando]       = useState(false);

  // Form nueva cotización
  const [asunto, setAsunto]           = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [items, setItems]             = useState([
    { producto: '', destino: '', foto_url: '', link: '', cantidad: 1, precio_unitario: 0 }
  ]);

  const puedeCrear   = PERFILES_CREADOR.includes(perfilId);
  const esGerFinanzas = PERFILES_GERENTE.includes(perfilId) || PERFILES_FINANZAS.includes(perfilId);
  const total = items.reduce((s, i) => s + (Number(i.cantidad) || 0) * (Number(i.precio_unitario) || 0), 0);

  // ── Filtros (solo para Gerencia y Finanzas) ────────────────────────────────
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [filtroDestino,  setFiltroDestino]  = useState(null);
  const [filtroEstados,  setFiltroEstados]  = useState([]);
  const [agruparFecha,   setAgruparFecha]   = useState(false);
  const [panelFiltros,   setPanelFiltros]   = useState(false);

  const destinosUnicos = useMemo(() => {
    const set = new Set();
    cotizaciones.forEach(c => {
      (c.destinos || '').split(', ').filter(Boolean).forEach(d => set.add(d.trim()));
    });
    return [...set].sort();
  }, [cotizaciones]);

  const filtrosActivos = (filtroBusqueda ? 1 : 0) + (filtroDestino ? 1 : 0) + filtroEstados.length;

  const cotizacionesFiltradas = useMemo(() => {
    if (!esGerFinanzas) return cotizaciones;
    return cotizaciones.filter(c => {
      if (filtroBusqueda) {
        const q = filtroBusqueda.toLowerCase();
        if (!c.asunto?.toLowerCase().includes(q) && !c.creado_por_nombre?.toLowerCase().includes(q))
          return false;
      }
      if (filtroDestino && !(c.destinos || '').toLowerCase().includes(filtroDestino.toLowerCase()))
        return false;
      if (filtroEstados.length > 0 && !filtroEstados.includes(c.estado))
        return false;
      return true;
    });
  }, [cotizaciones, filtroBusqueda, filtroDestino, filtroEstados, esGerFinanzas]);

  const cotizacionesAgrupadas = useMemo(() => {
    if (!agruparFecha) return null;
    const groups = {};
    cotizacionesFiltradas.forEach(c => {
      const fecha = new Date(c.fecha_creacion);
      const hoy   = new Date();
      const ayer  = new Date(); ayer.setDate(hoy.getDate() - 1);
      let key;
      if (fecha.toDateString() === hoy.toDateString())  key = 'Hoy';
      else if (fecha.toDateString() === ayer.toDateString()) key = 'Ayer';
      else key = fecha.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return groups;
  }, [cotizacionesFiltradas, agruparFecha]);

  const limpiarFiltros = () => {
    setFiltroBusqueda('');
    setFiltroDestino(null);
    setFiltroEstados([]);
  };

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
    setItems(prev => [...prev, { producto: '', destino: '', foto_url: '', link: '', cantidad: 1, precio_unitario: 0 }]);

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
    setItems([{ producto: '', destino: '', foto_url: '', link: '', cantidad: 1, precio_unitario: 0 }]);
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

  // ── Comprar ────────────────────────────────────────────────────────────────
  const handleComprar = async (id) => {
    try {
      await api.put(`/cotizaciones/${id}/comprar`);
      enqueueSnackbar('Cotización marcada como Comprada', { variant: 'success' });
      setCotSeleccionada(null);
      cargarCotizaciones();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Error al marcar como comprado', { variant: 'error' });
    }
  };

  // ── Anular ─────────────────────────────────────────────────────────────────
  const handleAnular = async (id, motivo) => {
    try {
      await api.put(`/cotizaciones/${id}/anular`, { motivo });
      enqueueSnackbar('Cotización anulada', { variant: 'warning' });
      setCotSeleccionada(null);
      cargarCotizaciones();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Error al anular', { variant: 'error' });
    }
  };

  // ── Contadores de estado ───────────────────────────────────────────────────
  const pendientes = cotizaciones.filter(c => c.estado === 'pendiente').length;
  const aprobadas  = cotizaciones.filter(c => c.estado === 'aprobada').length;
  const rechazadas = cotizaciones.filter(c => c.estado === 'rechazada').length;
  const compradas  = cotizaciones.filter(c => c.estado === 'comprado').length;
  const anuladas   = cotizaciones.filter(c => c.estado === 'anulado').length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Receipt color="primary" /> Cotizaciones
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {PERFILES_GERENTE.includes(perfilId)
              ? 'Revisa y aprueba las cotizaciones del equipo'
              : PERFILES_FINANZAS.includes(perfilId)
              ? 'Gestiona las cotizaciones aprobadas'
              : 'Envía cotizaciones para aprobación de gerencia'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {esGerFinanzas && (
            <Badge badgeContent={filtrosActivos} color="error">
              <Button
                variant={panelFiltros ? 'contained' : 'outlined'}
                startIcon={<FilterList />}
                onClick={() => setPanelFiltros(p => !p)}
              >
                Filtros
              </Button>
            </Badge>
          )}
          {puedeCrear && (
            <Button variant="contained" startIcon={<Add />} onClick={() => setModalCrear(true)}>
              Nueva cotización
            </Button>
          )}
        </Stack>
      </Box>

      {/* Chips resumen */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Chip icon={<HourglassEmpty />} label={`${pendientes} pendiente${pendientes !== 1 ? 's' : ''}`} color="warning" variant="outlined" size="small" />
        <Chip icon={<Check />}         label={`${aprobadas} aprobada${aprobadas !== 1 ? 's' : ''}`}    color="success" variant="outlined" size="small" />
        <Chip icon={<Close />}         label={`${rechazadas} rechazada${rechazadas !== 1 ? 's' : ''}`} color="error"   variant="outlined" size="small" />
        <Chip icon={<ShoppingCart />}  label={`${compradas} comprada${compradas !== 1 ? 's' : ''}`}    color="primary" variant="outlined" size="small" />
        <Chip icon={<Block />}         label={`${anuladas} anulada${anuladas !== 1 ? 's' : ''}`}        color="default" variant="outlined" size="small" />
        {esGerFinanzas && cotizacionesFiltradas.length !== cotizaciones.length && (
          <Chip label={`${cotizacionesFiltradas.length} resultados filtrados`} color="info" size="small" onDelete={limpiarFiltros} />
        )}
      </Box>

      {/* Panel de filtros (solo Gerencia y Finanzas) */}
      {esGerFinanzas && (
        <Collapse in={panelFiltros}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
            <Grid container spacing={2} alignItems="center">
              {/* Búsqueda */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth size="small"
                  label="Buscar por asunto o solicitante"
                  value={filtroBusqueda}
                  onChange={e => setFiltroBusqueda(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
                    endAdornment: filtroBusqueda ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setFiltroBusqueda('')}><Clear fontSize="small" /></IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                />
              </Grid>

              {/* Filtro por destino */}
              <Grid item xs={12} md={3}>
                <Autocomplete
                  size="small"
                  options={destinosUnicos}
                  value={filtroDestino}
                  onChange={(_, v) => setFiltroDestino(v)}
                  renderInput={params => (
                    <TextField {...params} label="Destino" placeholder="Todos los destinos" />
                  )}
                  clearOnEscape
                />
              </Grid>

              {/* Filtro por estado */}
              <Grid item xs={12} md={4}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Estado</Typography>
                <ToggleButtonGroup
                  size="small"
                  value={filtroEstados}
                  onChange={(_, v) => setFiltroEstados(v)}
                  sx={{ flexWrap: 'wrap', gap: 0.5 }}
                >
                  {Object.entries(ESTADO_CHIP).map(([key, val]) => (
                    <ToggleButton key={key} value={key} sx={{ py: 0.3, px: 1, fontSize: 12 }}>
                      {val.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Grid>

              {/* Agrupar por fecha + limpiar */}
              <Grid item xs={12} md={1} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <Tooltip title="Agrupar por fecha">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CalendarMonth fontSize="small" color={agruparFecha ? 'primary' : 'disabled'} />
                    <Switch size="small" checked={agruparFecha} onChange={e => setAgruparFecha(e.target.checked)} />
                  </Box>
                </Tooltip>
                {filtrosActivos > 0 && (
                  <Button size="small" color="error" onClick={limpiarFiltros} startIcon={<Clear />}>
                    Limpiar
                  </Button>
                )}
              </Grid>
            </Grid>
          </Paper>
        </Collapse>
      )}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Tabla */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell>#</TableCell>
              <TableCell>Asunto</TableCell>
              <TableCell>Solicitante</TableCell>
              <TableCell>Destinos</TableCell>
              <TableCell align="center">Ítems</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell align="center">Ver</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cotizacionesFiltradas.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  {filtrosActivos > 0 ? 'No hay resultados con los filtros aplicados' : 'No hay cotizaciones para mostrar'}
                </TableCell>
              </TableRow>
            ) : cotizacionesAgrupadas ? (
              // ── Vista agrupada por fecha ──────────────────────────────────
              Object.entries(cotizacionesAgrupadas).map(([fecha, grupo]) => (
                <React.Fragment key={fecha}>
                  <TableRow>
                    <TableCell colSpan={9} sx={{
                      bgcolor: 'primary.50', py: 0.8, px: 2,
                      borderLeft: '4px solid', borderColor: 'primary.main',
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2" fontWeight={700} color="primary.dark" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CalendarMonth fontSize="small" /> {fecha}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {grupo.length} cotizacion{grupo.length !== 1 ? 'es' : ''} · {fmtPeso(grupo.reduce((s, c) => s + (c.total || 0), 0))}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                  {grupo.map(c => <FilaCotizacion key={c.id} c={c} onVer={verCotizacion} />)}
                </React.Fragment>
              ))
            ) : (
              // ── Vista plana ───────────────────────────────────────────────
              cotizacionesFiltradas.map(c => <FilaCotizacion key={c.id} c={c} onVer={verCotizacion} />)
            )}
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
                placeholder="Ej: Compra de materiales de limpieza"
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
                  <TableCell>Destino</TableCell>
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
        onComprar={handleComprar}
        onAnular={handleAnular}
      />
    </Box>
  );
}
