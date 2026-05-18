// frontend/src/pages/OrganigramaPage.jsx
// Organigrama interactivo: drag & drop, zoom, pan, fotos, export PNG/PDF
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Paper, Typography, Button, IconButton, TextField,
  Avatar, Tooltip, CircularProgress, Snackbar, Alert,
  Chip, Divider, Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Tab, Tabs, Checkbox, List, ListItem, ListItemButton,
  ListItemAvatar, ListItemText, InputAdornment,
} from '@mui/material';
import {
  AccountTree as OrgIcon,
  Save as SaveIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  FitScreen as FitIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  GroupAdd as GroupAddIcon,
  Add as AddIcon,
  FileDownload as DownloadIcon,
  PictureAsPdf as PdfIcon,
  AutoFixHigh as AutoLayoutIcon,
  Close as CloseIcon,
  PhotoCamera as PhotoIcon,
  LinkOff as DisconnectIcon,
  SwapHoriz as PeerIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Map as MapIcon,
  Palette as PaletteIcon,
  Dashboard as DashboardIcon,
  AddCircleOutline as AddBoardIcon,
  Search as SearchIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxBlankIcon,
  ShowChart as CurvedIcon,
  TrendingFlat as StraightIcon,
  AccountTree as ElbowIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import api, { getStaticFileURL } from '../api/api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const NODE_W = 212;
const NODE_H = 256;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;
const SNAP_THRESHOLD = 12; // canvas pixels

// ── Fondos elegantes ──────────────────────────────────────────────────────────
const FONDOS = {
  cream: {
    label: 'Crema / Impresión',
    preview: 'linear-gradient(135deg,#fefaf2,#f7eddb)',
    canvasBg: 'linear-gradient(160deg, #fefaf3 0%, #fdf5e8 50%, #fef8f0 100%)',
    gridColor: 'rgba(170,140,95,0.18)',
    dark: false,
  },
  grid_light: {
    label: 'Azul Corporativo',
    preview: 'linear-gradient(135deg,#dce3f0,#e8edf5)',
    canvasBg: 'radial-gradient(ellipse at 30% 20%, #e8edf8 0%, #dce3f0 60%, #d4dced 100%)',
    gridColor: 'rgba(160,185,220,0.30)',
    dark: false,
  },
  print_white: {
    label: 'Blanco Puro',
    preview: 'linear-gradient(135deg,#f8f9fc,#eef1f7)',
    canvasBg: 'linear-gradient(160deg, #f8f9fc 0%, #eef1f7 50%, #f4f6fb 100%)',
    gridColor: 'rgba(180,195,215,0.20)',
    dark: false,
  },
  corporate_dark: {
    label: 'Corporativo Oscuro',
    preview: 'linear-gradient(135deg,#0a1628,#1a2f4a)',
    canvasBg: 'linear-gradient(150deg, #080f1e 0%, #0e1f38 50%, #0a1628 100%)',
    gridColor: 'rgba(80,130,210,0.12)',
    dark: true,
  },
  executive_gold: {
    label: 'Ejecutivo Dorado',
    preview: 'linear-gradient(135deg,#141414,#2a1f00)',
    canvasBg: 'linear-gradient(160deg, #0e0e0e 0%, #1c1600 50%, #111111 100%)',
    gridColor: 'rgba(212,170,50,0.15)',
    dark: true,
    accent: '#d4aa32',
  },
  modern_slate: {
    label: 'Slate Profesional',
    preview: 'linear-gradient(135deg,#0f172a,#1e293b)',
    canvasBg: 'linear-gradient(150deg, #0b1120 0%, #182032 50%, #0f1825 100%)',
    gridColor: 'rgba(148,163,184,0.10)',
    dark: true,
  },
  forest_elegant: {
    label: 'Verde Elegante',
    preview: 'linear-gradient(135deg,#0a1f0f,#1a3d1f)',
    canvasBg: 'linear-gradient(150deg, #080f0a 0%, #152a18 50%, #0a1a0d 100%)',
    gridColor: 'rgba(74,222,128,0.09)',
    dark: true,
  },
  indigo_pro: {
    label: 'Índigo Moderno',
    preview: 'linear-gradient(135deg,#1e1b4b,#312e81)',
    canvasBg: 'linear-gradient(150deg, #131030 0%, #1e1b4b 40%, #231f58 100%)',
    gridColor: 'rgba(165,180,252,0.10)',
    dark: true,
  },
};

// Returns { snappedX, snappedY, guideX, guideY, equidistX, equidistY }
function computeSnap(x, y, others) {
  const dragCX = x + NODE_W / 2;
  const dragCY = y + NODE_H / 2;

  let bestX = null, bestXDist = SNAP_THRESHOLD + 1, guideX = null, equidistX = false;
  let bestY = null, bestYDist = SNAP_THRESHOLD + 1, guideY = null, equidistY = false;

  // ── 1. Edge / center alignment ──────────────────────────────────
  const dragPtsX = [x, dragCX, x + NODE_W];       // left, centerX, right
  const dragPtsY = [y, dragCY, y + NODE_H];        // top, centerY, bottom

  others.forEach(n => {
    const refPtsX = [n.pos_x, n.pos_x + NODE_W / 2, n.pos_x + NODE_W];
    const refPtsY = [n.pos_y, n.pos_y + NODE_H / 2, n.pos_y + NODE_H];

    dragPtsX.forEach(dp => {
      refPtsX.forEach(rp => {
        const dist = Math.abs(dp - rp);
        if (dist < bestXDist) {
          bestXDist = dist;
          bestX = x + (rp - dp);
          guideX = rp;
          equidistX = false;
        }
      });
    });

    dragPtsY.forEach(dp => {
      refPtsY.forEach(rp => {
        const dist = Math.abs(dp - rp);
        if (dist < bestYDist) {
          bestYDist = dist;
          bestY = y + (rp - dp);
          guideY = rp;
          equidistY = false;
        }
      });
    });
  });

  // ── 2. Equidistant spacing snap ──────────────────────────────────
  // For each pair (A, B), snap drag node so it continues the series with equal gap
  for (let i = 0; i < others.length; i++) {
    for (let j = i + 1; j < others.length; j++) {
      const a = others[i], b = others[j];

      // Horizontal: center-to-center gap between A and B
      const gapX = (b.pos_x + NODE_W / 2) - (a.pos_x + NODE_W / 2);
      if (Math.abs(gapX) > NODE_W * 0.25) { // evitar snaps con nodos casi superpuestos
        // Extender la serie después de B
        const afterX = b.pos_x + NODE_W / 2 + gapX - NODE_W / 2;
        const dAfterX = Math.abs(x - afterX);
        if (dAfterX < bestXDist) {
          bestXDist = dAfterX;
          bestX = afterX;
          guideX = b.pos_x + NODE_W / 2;
          equidistX = true;
        }
        // Extender la serie antes de A
        const beforeX = a.pos_x + NODE_W / 2 - gapX - NODE_W / 2;
        const dBeforeX = Math.abs(x - beforeX);
        if (dBeforeX < bestXDist) {
          bestXDist = dBeforeX;
          bestX = beforeX;
          guideX = a.pos_x + NODE_W / 2;
          equidistX = true;
        }
      }

      // Vertical: center-to-center gap entre A y B
      const gapY = (b.pos_y + NODE_H / 2) - (a.pos_y + NODE_H / 2);
      if (Math.abs(gapY) > NODE_H * 0.25) {
        // Extender la serie después de B
        const afterY = b.pos_y + NODE_H / 2 + gapY - NODE_H / 2;
        const dAfterY = Math.abs(y - afterY);
        if (dAfterY < bestYDist) {
          bestYDist = dAfterY;
          bestY = afterY;
          guideY = b.pos_y + NODE_H / 2;
          equidistY = true;
        }
        // Extender la serie antes de A
        const beforeY = a.pos_y + NODE_H / 2 - gapY - NODE_H / 2;
        const dBeforeY = Math.abs(y - beforeY);
        if (dBeforeY < bestYDist) {
          bestYDist = dBeforeY;
          bestY = beforeY;
          guideY = a.pos_y + NODE_H / 2;
          equidistY = true;
        }
      }
    }
  }

  return {
    snappedX:  bestX !== null ? bestX : x,
    snappedY:  bestY !== null ? bestY : y,
    guideX:    bestX !== null ? guideX : null,
    guideY:    bestY !== null ? guideY : null,
    equidistX, equidistY,
  };
}

const PALETTE = [
  '#1565c0', '#0277bd', '#00695c', '#2e7d32', '#c62828',
  '#6a1b9a', '#e65100', '#283593', '#4e342e', '#37474f',
  '#ad1457', '#558b2f', '#F57C00', '#00838f', '#4527a0',
];

// ─────────────────────────────────────────────
// Tree auto-layout
// ─────────────────────────────────────────────
function calculateTreeLayout(nodes) {
  const H_GAP = 60;
  const V_GAP = 100;
  const START_X = 70;
  const START_Y = 70;

  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = { ...n, _children: [] }; });

  const roots = [];
  nodes.forEach(n => {
    if (n.parent_id && nodeMap[n.parent_id]) {
      nodeMap[n.parent_id]._children.push(n.id);
    } else {
      roots.push(n.id);
    }
  });

  // Preservar el orden izquierda→derecha que el usuario ya tenía
  Object.values(nodeMap).forEach(n => {
    n._children.sort((a, b) => (nodeMap[a].pos_x || 0) - (nodeMap[b].pos_x || 0));
  });
  roots.sort((a, b) => (nodeMap[a].pos_x || 0) - (nodeMap[b].pos_x || 0));

  function subtreeWidth(id) {
    const ch = nodeMap[id]._children;
    if (!ch.length) return NODE_W;
    const childrenTotal = ch.reduce((s, cid) => s + subtreeWidth(cid), 0);
    return Math.max(NODE_W, childrenTotal + H_GAP * (ch.length - 1));
  }

  const positions = {};
  function layout(id, x, y) {
    const sw = subtreeWidth(id);
    positions[id] = { x: x + (sw - NODE_W) / 2, y };
    let childX = x;
    nodeMap[id]._children.forEach(cid => {
      const csw = subtreeWidth(cid);
      layout(cid, childX, y + NODE_H + V_GAP);
      childX += csw + H_GAP;
    });
  }

  let rx = START_X;
  roots.forEach(rid => {
    const sw = subtreeWidth(rid);
    layout(rid, rx, START_Y);
    rx += sw + H_GAP * 2;
  });

  return positions;
}

// ─────────────────────────────────────────────
// NodeCard
// ─────────────────────────────────────────────
const CONN_HANDLES = [
  { id: 'left',   left: -7,              top: NODE_H / 2 - 7, anchorX: 0,          anchorY: NODE_H / 2 },
  { id: 'right',  left: NODE_W - 7,      top: NODE_H / 2 - 7, anchorX: NODE_W,      anchorY: NODE_H / 2 },
  { id: 'top',    left: NODE_W / 2 - 7,  top: -7,             anchorX: NODE_W / 2,  anchorY: 0          },
  { id: 'bottom', left: NODE_W / 2 - 7,  top: NODE_H - 7,     anchorX: NODE_W / 2,  anchorY: NODE_H     },
];

// Calcula los mejores puntos de conexión entre dos nodos según su posición relativa.
// Para conexiones jerárquicas (padre → hijo) donde el hijo está debajo del padre,
// siempre se usa dir:'v' (arriba/abajo) para que todas las ramas se vean uniformes,
// sin importar cuánto se desplace el hijo horizontalmente.
function getBestEdgePoints(parent, child) {
  const pCX = parent.pos_x + NODE_W / 2, pCY = parent.pos_y + NODE_H / 2;
  const cCX = child.pos_x  + NODE_W / 2, cCY = child.pos_y  + NODE_H / 2;
  const dy = cCY - pCY;
  // Si hay desplazamiento vertical significativo (hijo arriba o abajo del padre),
  // usar siempre conexión vertical para consistencia entre hermanos.
  if (Math.abs(dy) >= NODE_H * 0.3) {
    return dy >= 0
      ? { x1: pCX, y1: parent.pos_y + NODE_H, x2: cCX, y2: child.pos_y,          dir: 'v' }
      : { x1: pCX, y1: parent.pos_y,           x2: cCX, y2: child.pos_y + NODE_H, dir: 'v' };
  }
  // Solo usar conexión horizontal cuando los nodos están casi al mismo nivel vertical
  const dx = cCX - pCX;
  return dx >= 0
    ? { x1: parent.pos_x + NODE_W, y1: pCY, x2: child.pos_x,          y2: cCY, dir: 'h' }
    : { x1: parent.pos_x,          y1: pCY, x2: child.pos_x + NODE_W, y2: cCY, dir: 'h' };
}

function NodeCard({ node, isSelected, onMouseDown, onHoverChange, onStartConnect, isConnecting, isDropTarget }) {
  const fotoUrl = node.foto_url ? getStaticFileURL(node.foto_url) : null;
  const color = node.color || '#1565c0';
  const [hovered, setHovered] = useState(false);
  const showHandles = hovered || isConnecting;

  // Iniciales (2 letras máximo)
  const initials = node.nombre
    ? node.nombre.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?';

  // Sombra editorial según estado
  const cardShadow = isDropTarget
    ? `0 0 0 2.5px #f57c00, 0 12px 40px #f57c0030`
    : isSelected
      ? `0 0 0 2px ${color}, 0 16px 48px ${color}28, 0 4px 12px rgba(0,0,0,0.12)`
      : hovered
        ? `0 12px 36px ${color}1a, 0 4px 16px rgba(0,0,0,0.10)`
        : `0 4px 18px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.05)`;

  return (
    <Box
      onMouseDown={(e) => onMouseDown(e, node.id)}
      onMouseEnter={() => { setHovered(true);  onHoverChange?.(node.id); }}
      onMouseLeave={() => { setHovered(false); onHoverChange?.(null); }}
      sx={{
        position: 'absolute',
        left: node.pos_x,
        top: node.pos_y,
        width: NODE_W,
        height: NODE_H + 10,
        userSelect: 'none',
        cursor: isConnecting ? 'crosshair' : 'grab',
        zIndex: isSelected ? 10 : 5,
        '&:active': { cursor: isConnecting ? 'crosshair' : 'grabbing' },
        transition: 'filter 0.2s',
      }}
    >
      {/* ════════════════════════════════════════════
          TARJETA ESTILO EDITORIAL DE LUJO
          ════════════════════════════════════════════ */}
      <Box sx={{
        borderRadius: '14px',
        overflow: 'hidden',
        height: NODE_H,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: cardShadow,
        transition: 'box-shadow 0.25s ease',
        background: '#ffffff',
        position: 'relative',
      }}>

        {/* ── ZONA SUPERIOR: FOTO / AVATAR ──────────── */}
        {fotoUrl ? (
          <Box sx={{ position: 'relative', flexShrink: 0, height: 152, overflow: 'hidden' }}>
            {/* Foto full-bleed */}
            <Box
              component="img"
              src={fotoUrl}
              alt={node.nombre}
              sx={{
                width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: 'top center',
                display: 'block',
                transform: hovered ? 'scale(1.03)' : 'scale(1)',
                transition: 'transform 0.5s ease',
              }}
            />
            {/* Fade-to-white muy sutil al pie de la foto */}
            <Box sx={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 36,
              background: 'linear-gradient(to bottom, transparent 30%, rgba(255,255,255,0.18) 70%, rgba(255,255,255,0.50) 100%)',
              pointerEvents: 'none',
            }}/>
          </Box>
        ) : (
          /* ── Sin foto: fondo geométrico de lujo ── */
          <Box sx={{
            flexShrink: 0, height: 126, position: 'relative', overflow: 'hidden',
            background: `linear-gradient(145deg, #f8f9fc 0%, ${color}12 50%, #f0f2f8 100%)`,
          }}>
            {/* Círculos decorativos tipo editorial */}
            <Box sx={{
              position: 'absolute', width: 180, height: 180,
              borderRadius: '50%',
              border: `1px solid ${color}18`,
              top: -60, right: -50,
            }}/>
            <Box sx={{
              position: 'absolute', width: 110, height: 110,
              borderRadius: '50%',
              border: `1px solid ${color}12`,
              bottom: -40, left: -30,
            }}/>
            {/* Avatar editorial: círculo sólido con iniciales */}
            <Box sx={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Box sx={{
                width: 72, height: 72, borderRadius: '50%',
                background: `linear-gradient(145deg, ${color} 0%, ${color}bb 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 8px 28px ${color}44, inset 0 1px 1px rgba(255,255,255,0.25)`,
              }}>
                <Typography sx={{
                  color: '#fff', fontSize: '1.45rem', fontWeight: 800,
                  letterSpacing: '0.04em', lineHeight: 1,
                }}>
                  {initials}
                </Typography>
              </Box>
            </Box>
            {/* Fade inferior */}
            <Box sx={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
              background: 'linear-gradient(transparent, #ffffff)',
            }}/>
          </Box>
        )}

        {/* ── ZONA INFO: EDITORIAL ──────────────────── */}
        <Box sx={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          px: 1.5, pb: 1.2, pt: fotoUrl ? 0.5 : 0.8,
          // Fondo: blanco puro con sutilísimo tinte del color del nodo
          background: `linear-gradient(to bottom, #ffffff 0%, ${color}05 100%)`,
          gap: 0.4,
        }}>
          {/* Nombre — headline de revista */}
          <Typography
            title={node.nombre}
            sx={{
              fontSize: '0.87rem',
              fontWeight: 800,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: '#0d0d1f',
              textAlign: 'center',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}
          >
            {node.nombre || 'SIN NOMBRE'}
          </Typography>

          {/* Línea ornamental centrada — firma de diseño editorial */}
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 0.8, width: '100%', justifyContent: 'center',
            my: 0.2,
          }}>
            <Box sx={{ flex: 1, maxWidth: 22, height: '1px', background: `${color}55` }}/>
            <Box sx={{ width: 5, height: 5, borderRadius: '50%', background: color }}/>
            <Box sx={{ flex: 1, maxWidth: 22, height: '1px', background: `${color}55` }}/>
          </Box>

          {/* Cargo — small caps editorial */}
          {node.cargo && (
            <Typography
              title={node.cargo}
              sx={{
                fontSize: '0.70rem',
                fontWeight: 600,
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                color: color,
                textAlign: 'center',
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
              }}
            >
              {node.cargo}
            </Typography>
          )}

          {/* Departamento — caption de revista con separadores */}
          {node.departamento && (
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 0.6,
              mt: 0.4,
              px: 1.2, py: 0.35,
              borderRadius: '20px',
              background: `${color}0e`,
              border: `1px solid ${color}22`,
              maxWidth: '100%', overflow: 'hidden',
            }}>
              {/* Punto decorativo izquierdo */}
              <Box sx={{ width: 4, height: 4, borderRadius: '50%', background: `${color}88`, flexShrink: 0 }}/>
              <Typography
                title={node.departamento}
                sx={{
                  fontSize: '0.64rem',
                  fontWeight: 500,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: `${color}cc`,
                  lineHeight: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  textAlign: 'center',
                }}
              >
                {node.departamento}
              </Typography>
              {/* Punto decorativo derecho */}
              <Box sx={{ width: 4, height: 4, borderRadius: '50%', background: `${color}88`, flexShrink: 0 }}/>
            </Box>
          )}
        </Box>

        {/* ── FRANJA INFERIOR — sello de identidad ── */}
        <Box sx={{
          height: 5, flexShrink: 0,
          background: `linear-gradient(90deg, ${color} 0%, ${color}cc 55%, ${color}44 100%)`,
        }}/>
      </Box>

      {/* ── Handles de conexión ─────────────────────────────── */}
      {showHandles && CONN_HANDLES.map(h => (
        <Box
          key={h.id}
          onMouseDown={(e) => { e.stopPropagation(); onStartConnect?.(e, node.id, h); }}
          sx={{
            position: 'absolute', left: h.left, top: h.top,
            width: 14, height: 14, borderRadius: '50%',
            bgcolor: '#f57c00', border: '2.5px solid #fff',
            cursor: 'crosshair', zIndex: 20,
            boxShadow: '0 0 8px #f57c0099',
            transition: 'transform 0.12s',
            '&:hover': { transform: 'scale(1.55)', bgcolor: '#ff9800' },
          }}
        />
      ))}
    </Box>
  );
}

// ─────────────────────────────────────────────
// Edges SVG
// ─────────────────────────────────────────────
// Punto medio de una curva bezier cúbica a t=0.5
function bezierMid(x1, y1, cx1, cy1, cx2, cy2, x2, y2) {
  return {
    x: 0.125*x1 + 0.375*cx1 + 0.375*cx2 + 0.125*x2,
    y: 0.125*y1 + 0.375*cy1 + 0.375*cy2 + 0.125*y2,
  };
}

// ── Calcula el path SVG según el estilo de línea ──────────────────────────────
function computeEdgePath(x1, y1, x2, y2, dir, style = 'curved') {
  if (style === 'straight') {
    return {
      d: `M ${x1} ${y1} L ${x2} ${y2}`,
      mid: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 },
    };
  }
  if (style === 'elbow') {
    const R = 13; // radio del codo redondeado
    let d, mid;
    if (dir === 'v') {
      const midY = (y1 + y2) / 2;
      const sx = Math.sign(x2 - x1);
      const sy = Math.sign(y2 - y1);
      if (sx === 0) {
        d = `M ${x1} ${y1} L ${x2} ${y2}`;
      } else {
        const r = Math.min(R, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 4);
        d = `M ${x1} ${y1}` +
            ` L ${x1} ${midY - r * sy}` +
            ` Q ${x1} ${midY} ${x1 + sx * r} ${midY}` +
            ` L ${x2 - sx * r} ${midY}` +
            ` Q ${x2} ${midY} ${x2} ${midY + r * sy}` +
            ` L ${x2} ${y2}`;
      }
      mid = { x: (x1 + x2) / 2, y: midY };
    } else {
      const midX = (x1 + x2) / 2;
      const sx = Math.sign(x2 - x1);
      const sy = Math.sign(y2 - y1);
      if (sy === 0) {
        d = `M ${x1} ${y1} L ${x2} ${y2}`;
      } else {
        const r = Math.min(R, Math.abs(y2 - y1) / 2, Math.abs(x2 - x1) / 4);
        d = `M ${x1} ${y1}` +
            ` L ${midX - sx * r} ${y1}` +
            ` Q ${midX} ${y1} ${midX} ${y1 + sy * r}` +
            ` L ${midX} ${y2 - sy * r}` +
            ` Q ${midX} ${y2} ${midX + sx * r} ${y2}` +
            ` L ${x2} ${y2}`;
      }
      mid = { x: midX, y: (y1 + y2) / 2 };
    }
    return { d, mid };
  }
  // 'curved' — Bezier con glow magnético (default)
  if (dir === 'h') {
    const dx = Math.abs(x2 - x1) * 0.5;
    const cx1 = x1 + Math.sign(x2 - x1) * dx, cx2 = x2 - Math.sign(x2 - x1) * dx;
    return {
      d: `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`,
      mid: bezierMid(x1, y1, cx1, y1, cx2, y2, x2, y2),
    };
  } else {
    // Para dir:'v', blendear horizontalmente los puntos de control según el
    // desplazamiento lateral para evitar curvas en S cuando los hijos están
    // muy a los lados del padre. Todos los hermanos obtendrán curvas simétricas.
    const totalDy = Math.abs(y2 - y1);
    const totalDx = Math.abs(x2 - x1);
    const blend = Math.min(0.45, totalDx / (totalDy + totalDx + 1) * 0.9);
    const cp1x = x1 + (x2 - x1) * blend;
    const cp2x = x2 - (x2 - x1) * blend;
    const dy = totalDy * 0.45;
    const cp1y = y1 + Math.sign(y2 - y1) * dy;
    const cp2y = y2 - Math.sign(y2 - y1) * dy;
    return {
      d: `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`,
      mid: bezierMid(x1, y1, cp1x, cp1y, cp2x, cp2y, x2, y2),
    };
  }
}

function EdgesLayer({ nodes, peerLinks, connectingLine, selectedEdge, onEdgeClick, lineStyle = 'curved' }) {
  const hierEdges = nodes.flatMap(node => {
    if (!node.parent_id) return [];
    const parent = nodes.find(n => n.id === node.parent_id);
    if (!parent) return [];
    const { x1, y1, x2, y2, dir } = getBestEdgePoints(parent, node);
    const { d, mid } = computeEdgePath(x1, y1, x2, y2, dir, lineStyle);
    return [{
      key: `h-${parent.id}-${node.id}`,
      nodeId: node.id,
      d, mid,
      color: node.color || '#90a4ae',
      sinFlecha: !!node.sin_flecha,
    }];
  });

  const peerEdges = (peerLinks || []).flatMap(link => {
    const a = nodes.find(n => n.id === Number(link.nodo_a));
    const b = nodes.find(n => n.id === Number(link.nodo_b));
    if (!a || !b) return [];
    const aMidY = a.pos_y + NODE_H / 2, bMidY = b.pos_y + NODE_H / 2;
    const [x1, y1, x2, y2, dir] = (a.pos_x + NODE_W) < b.pos_x
      ? [a.pos_x + NODE_W, aMidY, b.pos_x, bMidY, 'h']
      : (b.pos_x + NODE_W) < a.pos_x
        ? [b.pos_x + NODE_W, bMidY, a.pos_x, aMidY, 'h']
        : [a.pos_x + NODE_W / 2, a.pos_y + NODE_H, b.pos_x + NODE_W / 2, b.pos_y + NODE_H, 'v'];
    const { d, mid } = computeEdgePath(x1, y1, x2, y2, dir, lineStyle);
    return [{
      key: `p-${link.id}`,
      linkId: link.id,
      d, mid,
      sinFlecha: !!link.sin_flecha,
    }];
  });

  return (
    <svg
      style={{
        position: 'absolute', left: 0, top: 0,
        width: 1, height: 1, overflow: 'visible',
        pointerEvents: 'none', zIndex: 2,
      }}
    >
      <defs>
        {/* Filtro glow para líneas jerárquicas */}
        <filter id="line-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="line-glow-strong" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        {PALETTE.map(c => (
          <marker key={c} id={`arr-${c.slice(1)}`} markerWidth="11" markerHeight="8"
            refX="10" refY="4" orient="auto">
            <polygon points="0 0, 11 4, 0 8, 2 4" fill={c} opacity="0.92" />
          </marker>
        ))}
        <marker id="arr-default" markerWidth="11" markerHeight="8" refX="10" refY="4" orient="auto">
          <polygon points="0 0, 11 4, 0 8, 2 4" fill="#90a4ae" opacity="0.92" />
        </marker>
        <marker id="arr-peer" markerWidth="11" markerHeight="8" refX="10" refY="4" orient="auto">
          <polygon points="0 0, 11 4, 0 8, 2 4" fill="#f57c00" opacity="0.95"/>
        </marker>
      </defs>

      {/* Relaciones jerárquicas (padre → hijo) */}
      {hierEdges.map(e => {
        const isSel = selectedEdge?.type === 'hier' && selectedEdge?.id === e.nodeId;
        const markerId = PALETTE.includes(e.color) ? `arr-${e.color.slice(1)}` : 'arr-default';
        return (
          <g key={e.key}>
            {/* Halo de glow detrás — efecto magnético */}
            <path d={e.d} fill="none"
              stroke={e.color}
              strokeWidth={isSel ? 8 : 6}
              strokeOpacity={isSel ? 0.22 : 0.14}
              filter="url(#line-glow)"
            />
            {/* Línea principal */}
            <path d={e.d} fill="none"
              stroke={isSel ? '#2196f3' : e.color}
              strokeWidth={isSel ? 3.2 : 2.4}
              strokeOpacity={isSel ? 1 : 0.90}
              markerEnd={e.sinFlecha ? undefined : `url(#${markerId})`}
            />
            {/* Área invisible de clic */}
            <path d={e.d} fill="none" stroke="transparent" strokeWidth={14}
              style={{ pointerEvents: 'all', cursor: 'pointer' }}
              onClick={(ev) => { ev.stopPropagation(); onEdgeClick?.({ type: 'hier', id: e.nodeId, mid: e.mid, sinFlecha: e.sinFlecha }); }}
            />
          </g>
        );
      })}

      {/* Relaciones de par (mismo nivel) — línea punteada */}
      {peerEdges.map(e => {
        const isSel = selectedEdge?.type === 'peer' && selectedEdge?.id === e.linkId;
        return (
          <g key={e.key}>
            {/* Halo glow */}
            <path d={e.d} fill="none"
              stroke="#f57c00"
              strokeWidth={isSel ? 7 : 5}
              strokeOpacity={isSel ? 0.22 : 0.12}
              strokeDasharray="7 4"
              filter="url(#line-glow)"
            />
            <path d={e.d} fill="none"
              stroke={isSel ? '#2196f3' : '#f57c00'}
              strokeWidth={isSel ? 3 : 2.2}
              strokeOpacity={isSel ? 1 : 0.92}
              strokeDasharray="7 4"
              markerEnd={e.sinFlecha ? undefined : 'url(#arr-peer)'}
            />
            <path d={e.d} fill="none" stroke="transparent" strokeWidth={14}
              style={{ pointerEvents: 'all', cursor: 'pointer' }}
              onClick={(ev) => { ev.stopPropagation(); onEdgeClick?.({ type: 'peer', id: e.linkId, mid: e.mid, sinFlecha: e.sinFlecha }); }}
            />
          </g>
        );
      })}

      {/* Línea de preview mientras se arrastra una conexión */}
      {connectingLine && (
        <line
          x1={connectingLine.x1} y1={connectingLine.y1}
          x2={connectingLine.x2} y2={connectingLine.y2}
          stroke="#f57c00" strokeWidth={2.5} strokeOpacity={0.9}
          strokeDasharray="6 3"
        />
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────
// Photo Crop Dialog
// ─────────────────────────────────────────────
function PhotoCropDialog({ file, src, open, onConfirm, onCancel }) {
  const CROP_W = NODE_W;   // 212 — ancho del nodo
  const CROP_H = 152;      // altura de foto visible en la tarjeta
  const DS = 2;            // escala de preview

  const [imgSrc, setImgSrc] = useState('');
  const [imgNat, setImgNat] = useState({ w: 1, h: 1 });
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const imgRef = useRef(null);
  const cropDragRef = useRef({ active: false, sx: 0, sy: 0, spx: 0, spy: 0 });
  const scaleRef = useRef(1);

  useEffect(() => {
    if (!open) return;
    if (src) {
      // Re-encuadrar foto ya subida: usar URL directa
      setImgSrc(src);
    } else if (file) {
      const url = URL.createObjectURL(file);
      setImgSrc(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, src, open]);

  const handleImgLoad = (e) => {
    const { naturalWidth: w, naturalHeight: h } = e.target;
    setImgNat({ w, h });
    const s = Math.max(CROP_W / w, CROP_H / h);
    scaleRef.current = s;
    setScale(s);
    setPos({ x: (CROP_W - w * s) / 2, y: (CROP_H - h * s) / 2 });
  };

  useEffect(() => {
    const move = (e) => {
      if (!cropDragRef.current.active) return;
      setPos({
        x: cropDragRef.current.spx + (e.clientX - cropDragRef.current.sx) / DS,
        y: cropDragRef.current.spy + (e.clientY - cropDragRef.current.sy) / DS,
      });
    };
    const up = () => { cropDragRef.current.active = false; };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, []);

  const handleMouseDown = (e) => {
    e.preventDefault();
    cropDragRef.current = { active: true, sx: e.clientX, sy: e.clientY, spx: pos.x, spy: pos.y };
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const minScale = Math.max(CROP_W / imgNat.w, CROP_H / imgNat.h);
    const newScale = Math.max(minScale * 0.8, scaleRef.current * factor);
    const cx = CROP_W / 2, cy = CROP_H / 2;
    setPos(p => ({
      x: cx - (cx - p.x) * (newScale / scaleRef.current),
      y: cy - (cy - p.y) * (newScale / scaleRef.current),
    }));
    scaleRef.current = newScale;
    setScale(newScale);
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;
    // Exportar a 3× para máxima nitidez en pantallas Retina e impresión
    const EXPORT = 3;
    const canvas = document.createElement('canvas');
    canvas.width  = CROP_W * EXPORT;
    canvas.height = CROP_H * EXPORT;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.scale(EXPORT, EXPORT);
    ctx.drawImage(
      img,
      -pos.x / scale, -pos.y / scale,
      CROP_W / scale, CROP_H / scale,
      0, 0, CROP_W, CROP_H
    );
    canvas.toBlob(blob => onConfirm(blob), 'image/jpeg', 0.95);
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs">
      <DialogTitle sx={{ bgcolor: '#1a1a2e', color: '#fff', fontSize: '0.9rem', py: 1.5 }}>
        Posicionar foto
      </DialogTitle>
      <DialogContent sx={{ p: 2, bgcolor: '#16213e' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)' }}>
            Arrastra para encuadrar · rueda del ratón para zoom
          </Typography>
          <Box
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
            sx={{
              width: CROP_W * DS, height: CROP_H * DS,
              overflow: 'hidden', position: 'relative',
              cursor: 'grab', '&:active': { cursor: 'grabbing' },
              borderRadius: '12px',
              border: '2.5px solid #F57C00',
              boxShadow: '0 0 24px #F57C0055',
              userSelect: 'none', bgcolor: '#0a0a1a',
            }}
          >
            {imgSrc && (
              <Box
                component="img"
                ref={imgRef}
                src={imgSrc}
                crossOrigin="anonymous"
                onLoad={handleImgLoad}
                draggable={false}
                sx={{
                  position: 'absolute',
                  left: pos.x * DS,
                  top: pos.y * DS,
                  width: imgNat.w * scale * DS,
                  height: imgNat.h * scale * DS,
                  pointerEvents: 'none',
                }}
              />
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ bgcolor: '#1a1a2e', px: 2, pb: 2 }}>
        <Button onClick={onCancel} sx={{ color: 'rgba(255,255,255,0.6)', textTransform: 'none' }}>Cancelar</Button>
        <Button onClick={handleConfirm} variant="contained"
          sx={{ bgcolor: '#F57C00', '&:hover': { bgcolor: '#e65100' }, textTransform: 'none', fontWeight: 700 }}>
          Usar esta posición
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// Minimap
// ─────────────────────────────────────────────
const MM_W = 210;
const MM_H = 130;

function Minimap({ nodes, peerLinks, pan, zoom, containerW, containerH, onPanTo }) {
  if (!nodes.length) return null;
  const PAD = 20;
  const xs = nodes.map(n => n.pos_x);
  const ys = nodes.map(n => n.pos_y);
  const minX = Math.min(...xs) - PAD;
  const minY = Math.min(...ys) - PAD;
  const maxX = Math.max(...xs) + NODE_W + PAD;
  const maxY = Math.max(...ys) + NODE_H + PAD;
  const cW = Math.max(maxX - minX, 1);
  const cH = Math.max(maxY - minY, 1);
  const scaleX = MM_W / cW;
  const scaleY = MM_H / cH;
  const sc = Math.min(scaleX, scaleY);
  const offsetX = (MM_W - cW * sc) / 2;
  const offsetY = (MM_H - cH * sc) / 2;

  const toMM = (cx, cy) => ({
    x: offsetX + (cx - minX) * sc,
    y: offsetY + (cy - minY) * sc,
  });

  // Viewport rectangle in minimap coords
  const vpCanvasX = -pan.x / zoom;
  const vpCanvasY = -pan.y / zoom;
  const vpCanvasW = containerW / zoom;
  const vpCanvasH = containerH / zoom;
  const vp = toMM(vpCanvasX, vpCanvasY);
  const vpW = vpCanvasW * sc;
  const vpH = vpCanvasH * sc;

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // Convert mm coords back to canvas coords
    const canvasX = (mx - offsetX) / sc + minX;
    const canvasY = (my - offsetY) / sc + minY;
    // Pan so that point is centered
    onPanTo(-(canvasX * zoom - containerW / 2), -(canvasY * zoom - containerH / 2));
  };

  return (
    <Box
      onClick={handleClick}
      sx={{
        position: 'absolute', bottom: 16, right: 16,
        width: MM_W, height: MM_H,
        bgcolor: 'rgba(15,20,35,0.92)',
        borderRadius: 2,
        border: '1px solid rgba(255,255,255,0.15)',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(6px)',
        zIndex: 10,
        cursor: 'crosshair',
        '&:hover': { border: '1px solid rgba(255,255,255,0.3)' },
      }}
    >
      {/* Label */}
      <Typography variant="caption" sx={{
        position: 'absolute', top: 4, left: 7,
        fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)',
        fontWeight: 700, letterSpacing: 1, userSelect: 'none', pointerEvents: 'none',
        zIndex: 2,
      }}>MAPA</Typography>

      <svg style={{ position: 'absolute', left: 0, top: 0, width: MM_W, height: MM_H, overflow: 'hidden' }}>
        {/* Edges */}
        {nodes.map(node => {
          if (!node.parent_id) return null;
          const parent = nodes.find(n => n.id === node.parent_id);
          if (!parent) return null;
          const p1 = toMM(parent.pos_x + NODE_W / 2, parent.pos_y + NODE_H / 2);
          const p2 = toMM(node.pos_x + NODE_W / 2, node.pos_y + NODE_H / 2);
          return (
            <line key={node.id}
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke={node.color || '#90a4ae'} strokeWidth={1} strokeOpacity={0.45}
            />
          );
        })}
        {/* Peer links */}
        {(peerLinks || []).map(link => {
          const a = nodes.find(n => n.id === Number(link.nodo_a));
          const b = nodes.find(n => n.id === Number(link.nodo_b));
          if (!a || !b) return null;
          const p1 = toMM(a.pos_x + NODE_W / 2, a.pos_y + NODE_H / 2);
          const p2 = toMM(b.pos_x + NODE_W / 2, b.pos_y + NODE_H / 2);
          return (
            <line key={link.id}
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke="#f57c00" strokeWidth={1} strokeOpacity={0.6} strokeDasharray="3 2"
            />
          );
        })}
        {/* Nodes */}
        {nodes.map(node => {
          const p = toMM(node.pos_x, node.pos_y);
          const w = Math.max(4, NODE_W * sc);
          const h = Math.max(3, NODE_H * sc);
          return (
            <rect key={node.id}
              x={p.x} y={p.y} width={w} height={h}
              rx={2} fill={node.color || '#90a4ae'} fillOpacity={0.75}
            />
          );
        })}
        {/* Viewport rectangle */}
        <rect
          x={vp.x} y={vp.y} width={Math.max(vpW, 4)} height={Math.max(vpH, 4)}
          fill="rgba(255,255,255,0.07)"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth={1.5}
          rx={2}
        />
      </svg>
    </Box>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function OrganigramaPage() {
  const [nodes, setNodes] = useState([]);
  const [peerLinks, setPeerLinks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [zoom, setZoomState] = useState(0.85);
  const [pan, _setPanState] = useState({ x: 60, y: 40 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [peerTarget, setPeerTarget] = useState('');
  const [connecting, setConnecting] = useState(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [cropFile, setCropFile] = useState(null);
  const [cropSrc, setCropSrc] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0); // triggers toolbar re-render
  const historyRef = useRef({ past: [], future: [] });
  const [showMinimap, setShowMinimap] = useState(true);
  const [containerSize, setContainerSize] = useState({ w: 1200, h: 700 });
  const [snapGuides, setSnapGuides] = useState({ guideX: null, guideY: null, equidistX: false, equidistY: false });
  const [selectedEdge, setSelectedEdge] = useState(null); // { type, id, mid, sinFlecha }
  // ── Título del canvas ────────────────────────────────────────────────────
  const [canvasTitle, setCanvasTitle]     = useState('ORGANIGRAMA EMPRESARIAL');
  const [titleEditing, setTitleEditing]   = useState(false);
  const [titleDraft, setTitleDraft]       = useState('');
  // ── Orientación de exportación PDF ──────────────────────────────────────
  const [exportOrientation, setExportOrientation] = useState('portrait'); // 'portrait' | 'landscape'
  // ── Estilo de líneas de conexión ─────────────────────────────────────────
  const [lineStyle, setLineStyle] = useState('curved'); // 'curved' | 'straight' | 'elbow'
  // ── Importar empleados existentes ────────────────────────────────────────
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importWorkers, setImportWorkers] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importSelected, setImportSelected] = useState([]);
  const [importSearch, setImportSearch] = useState('');

  // ── Boards & Fondos ───────────────────────────────────────────────────────
  const [boards, setBoards] = useState([]);
  const [currentBoardId, setCurrentBoardId] = useState(null); // null = organigrama global
  const [currentFondo, setCurrentFondo] = useState('cream');
  const [fondoOpen, setFondoOpen] = useState(false);
  const [boardDialogOpen, setBoardDialogOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDept, setNewBoardDept] = useState('');
  const [newBoardFondo, setNewBoardFondo] = useState('cream');
  const [newBoardCopiar, setNewBoardCopiar] = useState(true);
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [deleteBoardDialog, setDeleteBoardDialog] = useState(false);
  const [duplicateBoardDialogOpen, setDuplicateBoardDialogOpen] = useState(false);
  const [duplicateBoardName, setDuplicateBoardName] = useState('');
  const [duplicatingBoard, setDuplicatingBoard] = useState(false);
  // Picker de trabajadores existentes
  const [allWorkers, setAllWorkers] = useState([]);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState([]);
  const [workerSearch, setWorkerSearch] = useState('');

  const containerRef = useRef(null);
  const transformRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragRef = useRef({ active: false, nodeId: null, sMouseX: 0, sMouseY: 0, sNX: 0, sNY: 0 });
  const panRef = useRef({ active: false, sMouseX: 0, sMouseY: 0, sPX: 0, sPY: 0 });
  const panStateRef = useRef({ x: 60, y: 40 });
  const zoomRef = useRef(0.85);
  const connectingRef = useRef(null);
  const hoveredNodeRef = useRef(null);
  const nodesRef = useRef([]);

  // setPanState wrapper que mantiene panStateRef sincronizado
  const setPanState = useCallback((v) => {
    _setPanState(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      panStateRef.current = next;
      return next;
    });
  }, []);
  const tempId = useRef(-1);

  const selectedNode = nodes.find(n => n.id === selected) || null;
  nodesRef.current = nodes;

  // ── Load ──────────────────────────────────
  useEffect(() => { loadBoards(); loadAll(null); }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ w: width, h: height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const loadBoards = async () => {
    try {
      const res = await api.get('/organigrama/boards');
      if (res.data.success) setBoards(res.data.boards);
    } catch { /* silencioso */ }
  };

  const loadAll = async (boardId) => {
    try {
      setLoading(true);
      const params = boardId != null ? `?board_id=${boardId}` : '';
      const [resN, resR] = await Promise.all([
        api.get(`/organigrama${params}`),
        api.get(`/organigrama/relaciones${params}`),
      ]);
      if (resN.data.success) setNodes(resN.data.nodos);
      if (resR.data.success) setPeerLinks(resR.data.relaciones);
    } catch {
      toast('Error al cargar organigrama', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadNodes = async () => {
    try {
      const params = currentBoardId != null ? `?board_id=${currentBoardId}` : '';
      const res = await api.get(`/organigrama${params}`);
      if (res.data.success) setNodes(res.data.nodos);
    } catch {
      toast('Error al cargar organigrama', 'error');
    }
  };

  const switchBoard = async (boardId) => {
    setCurrentBoardId(boardId);
    setSelected(null);
    setSelectedEdge(null);
    historyRef.current = { past: [], future: [] };
    // Aplicar fondo y título del board seleccionado
    if (boardId == null) {
      setCurrentFondo('cream');
      setCanvasTitle('ORGANIGRAMA EMPRESARIAL');
    } else {
      const b = boards.find(b => b.id === boardId);
      if (b) {
        setCurrentFondo(b.fondo || 'corporate_dark');
        setCanvasTitle((b.descripcion || b.nombre || 'ORGANIGRAMA').toUpperCase());
      }
    }
    await loadAll(boardId);
    setTimeout(() => fitView(), 150);
  };

  const openBoardDialog = async () => {
    setBoardDialogOpen(true);
    setSelectedWorkerIds([]);
    setWorkerSearch('');
    try {
      setWorkersLoading(true);
      const res = await api.get('/organigrama/todos-trabajadores');
      if (res.data.success) setAllWorkers(res.data.trabajadores);
    } catch {
      setAllWorkers([]);
    } finally {
      setWorkersLoading(false);
    }
  };

  const toggleWorker = (id) => {
    setSelectedWorkerIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCrearBoard = async () => {
    if (!newBoardName.trim()) return;
    try {
      setCreatingBoard(true);
      const payload = {
        nombre: newBoardName.trim(),
        departamento: newBoardDept.trim() || null,
        fondo: newBoardFondo,
      };
      if (selectedWorkerIds.length > 0) {
        payload.trabajadoresIds = selectedWorkerIds;
      } else {
        payload.copiarDesdeGlobal = newBoardCopiar;
      }
      const res = await api.post('/organigrama/boards', payload);
      if (res.data.success) {
        await loadBoards();
        setBoardDialogOpen(false);
        setNewBoardName('');
        setNewBoardDept('');
        setNewBoardFondo('corporate_dark');
        setNewBoardCopiar(true);
        setSelectedWorkerIds([]);
        setWorkerSearch('');
        toast('Organigrama creado');
        await switchBoard(res.data.board.id);
      }
    } catch {
      toast('Error al crear organigrama', 'error');
    } finally {
      setCreatingBoard(false);
    }
  };

  const handleEliminarBoard = async () => {
    if (currentBoardId == null) return;
    try {
      await api.delete(`/organigrama/boards/${currentBoardId}`);
      setDeleteBoardDialog(false);
      await loadBoards();
      await switchBoard(null);
      toast('Organigrama eliminado');
    } catch {
      toast('Error al eliminar organigrama', 'error');
    }
  };

  const openDuplicateDialog = () => {
    const boardActual = boards.find(b => b.id === currentBoardId);
    setDuplicateBoardName(boardActual ? `${boardActual.nombre} (copia)` : 'Copia');
    setDuplicateBoardDialogOpen(true);
  };

  const handleDuplicarBoard = async () => {
    if (currentBoardId == null || !duplicateBoardName.trim()) return;
    try {
      setDuplicatingBoard(true);
      const res = await api.post(`/organigrama/boards/${currentBoardId}/duplicar`, {
        nombre: duplicateBoardName.trim(),
      });
      if (res.data.success) {
        setDuplicateBoardDialogOpen(false);
        await loadBoards();
        await switchBoard(res.data.board.id);
        toast(`Organigrama duplicado: "${res.data.board.nombre}"`);
      }
    } catch {
      toast('Error al duplicar organigrama', 'error');
    } finally {
      setDuplicatingBoard(false);
    }
  };

  const handleFondoChange = async (fondoKey) => {
    setCurrentFondo(fondoKey);
    setFondoOpen(false);
    if (currentBoardId != null) {
      try {
        await api.put(`/organigrama/boards/${currentBoardId}`, { fondo: fondoKey });
      } catch { /* silencioso */ }
    }
  };

  const toast = (msg, sev = 'success') => setSnack({ open: true, msg, sev });

  // ── Importar empleados existentes ────────────────────────────────────────
  const openImportDialog = async () => {
    setImportSelected([]);
    setImportSearch('');
    setImportDialogOpen(true);
    try {
      setImportLoading(true);
      const res = await api.get('/organigrama/todos-trabajadores');
      if (res.data.success) {
        // Filtrar los que ya están en el board actual
        const existingRuts = new Set(nodes.map(n => n.rut).filter(Boolean));
        const available = res.data.trabajadores.filter(w => !existingRuts.has(w.rut));
        setImportWorkers(available);
      }
    } catch {
      setImportWorkers([]);
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportWorkers = () => {
    if (importSelected.length === 0) return;
    const selected = importWorkers.filter(w => importSelected.includes(w.rut || w.id));
    // Calcular posición inicial: a la derecha/abajo del último nodo
    const maxX = nodes.length > 0 ? Math.max(...nodes.map(n => n.pos_x)) + NODE_W + 40 : 80;
    const startY = nodes.length > 0 ? Math.min(...nodes.map(n => n.pos_y)) : 80;
    const newNodes = selected.map((w, i) => ({
      id: `tmp-import-${Date.now()}-${i}`,
      rut: w.rut,
      nombre: w.nombre,
      cargo: w.cargo,
      departamento: w.departamento,
      foto_url: w.foto_url || null,
      color: PALETTE[i % PALETTE.length],
      pos_x: maxX + (i % 3) * (NODE_W + 40),
      pos_y: startY + Math.floor(i / 3) * (NODE_H + 60),
      parent_id: null,
      board_id: currentBoardId,
      sin_flecha: false,
    }));
    pushHistory();
    setNodes(prev => [...prev, ...newNodes]);
    setImportDialogOpen(false);
    toast(`${newNodes.length} empleado${newNodes.length !== 1 ? 's' : ''} importado${newNodes.length !== 1 ? 's' : ''}`);
  };

  // ── Título del canvas ────────────────────────────────────────────────────
  const startTitleEdit = () => {
    setTitleDraft(canvasTitle);
    setTitleEditing(true);
  };
  const confirmTitleEdit = async () => {
    const val = titleDraft.trim().toUpperCase() || canvasTitle;
    setCanvasTitle(val);
    setTitleEditing(false);
    if (currentBoardId != null) {
      try {
        await api.put(`/organigrama/boards/${currentBoardId}`, { descripcion: val });
      } catch { /* silencioso */ }
    }
  };

  // ── Peer connection helpers ────────────────
  const createPeerLink = useCallback(async (fromId, toId) => {
    try {
      const res = await api.post('/organigrama/relaciones', { nodo_a: fromId, nodo_b: toId, board_id: currentBoardId });
      if (res.data.success) {
        setPeerLinks(prev => {
          const exists = prev.some(l => l.id === res.data.relacion.id);
          return exists ? prev : [...prev, res.data.relacion];
        });
        toast('Relación creada');
      }
    } catch { toast('Error al crear relación', 'error'); }
  }, [currentBoardId]);

  const handleHoverChange = useCallback((nodeId) => {
    hoveredNodeRef.current = nodeId;
    setHoveredNodeId(nodeId);
  }, []);

  const handleStartConnect = useCallback((e, nodeId, handle) => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node) return;
    const ax = node.pos_x + (handle?.anchorX ?? NODE_W / 2);
    const ay = node.pos_y + (handle?.anchorY ?? NODE_H / 2);
    const state = { fromId: nodeId, x1: ax, y1: ay, x2: ax, y2: ay };
    connectingRef.current = state;
    setConnecting(state);
  }, []);

  // ── Zoom helpers ──────────────────────────
  const setZoom = (v) => {
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v));
    setZoomState(z);
    zoomRef.current = z;
  };

  // ── Undo / Redo ───────────────────────────
  const MAX_HISTORY = 60;
  const pushHistory = useCallback(() => {
    historyRef.current.past.push(nodesRef.current.map(n => ({ ...n })));
    if (historyRef.current.past.length > MAX_HISTORY) historyRef.current.past.shift();
    historyRef.current.future = [];
    setHistoryVersion(v => v + 1);
  }, []);

  const undo = useCallback(() => {
    const { past, future } = historyRef.current;
    if (!past.length) return;
    future.push(nodesRef.current.map(n => ({ ...n })));
    setNodes(past.pop());
    setHistoryVersion(v => v + 1);
  }, []);

  const redo = useCallback(() => {
    const { past, future } = historyRef.current;
    if (!future.length) return;
    past.push(nodesRef.current.map(n => ({ ...n })));
    setNodes(future.pop());
    setHistoryVersion(v => v + 1);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRef.current * factor));
    const zf = newZoom / zoomRef.current;
    setPanState(p => ({ x: mx - (mx - p.x) * zf, y: my - (my - p.y) * zf }));
    setZoom(newZoom);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ── Mouse events ──────────────────────────
  const handleNodeMouseDown = useCallback((e, nodeId) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setSelected(nodeId);
    setPeerTarget('');
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    dragRef.current = {
      active: true, nodeId,
      sMouseX: e.clientX, sMouseY: e.clientY,
      sNX: node.pos_x, sNY: node.pos_y,
    };
  }, [nodes]);

  const handleCanvasMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setSelected(null);
    setSelectedEdge(null);
    panRef.current = {
      active: true,
      sMouseX: e.clientX, sMouseY: e.clientY,
      sPX: panStateRef.current.x,
      sPY: panStateRef.current.y,
    };
  }, []);

  const handleMouseMove = useCallback((e) => {
    // Si estamos trazando una conexión, actualizar línea de preview
    if (connectingRef.current) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const p = panStateRef.current;
        const z = zoomRef.current;
        const cx = (e.clientX - rect.left - p.x) / z;
        const cy = (e.clientY - rect.top  - p.y) / z;
        const state = { ...connectingRef.current, x2: cx, y2: cy };
        connectingRef.current = state;
        setConnecting(state);
        // Calcular nodo destino por coordenadas (los handles sobresalen del Box,
        // por lo que onMouseEnter del Box no siempre dispara sobre los bordes)
        const MARGIN = 14;
        const fromId = connectingRef.current.fromId;
        const hit = nodesRef.current.find(n =>
          n.id !== fromId &&
          cx >= n.pos_x - MARGIN && cx <= n.pos_x + NODE_W + MARGIN &&
          cy >= n.pos_y - MARGIN && cy <= n.pos_y + NODE_H + MARGIN
        );
        hoveredNodeRef.current = hit ? hit.id : null;
        setHoveredNodeId(hit ? hit.id : null);
      }
      return;
    }
    const d = dragRef.current;
    if (d.active && d.nodeId !== null) {
      const dx = (e.clientX - d.sMouseX) / zoomRef.current;
      const dy = (e.clientY - d.sMouseY) / zoomRef.current;
      const rawX = d.sNX + dx;
      const rawY = d.sNY + dy;
      const others = nodesRef.current.filter(n => n.id !== d.nodeId);
      const { snappedX, snappedY, guideX, guideY, equidistX, equidistY } = computeSnap(rawX, rawY, others);
      setSnapGuides({ guideX, guideY, equidistX, equidistY });
      setNodes(prev => prev.map(n =>
        n.id === d.nodeId ? { ...n, pos_x: snappedX, pos_y: snappedY } : n
      ));
      return;
    }
    const p = panRef.current;
    if (p.active) {
      setPanState({
        x: p.sPX + (e.clientX - p.sMouseX),
        y: p.sPY + (e.clientY - p.sMouseY),
      });
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (connectingRef.current) {
      const fromId = connectingRef.current.fromId;
      const toId   = hoveredNodeRef.current;
      connectingRef.current = null;
      setConnecting(null);
      if (toId && toId !== fromId) {
        createPeerLink(fromId, toId);
      }
      return;
    }
    if (dragRef.current.active) {
      pushHistory();
      setSnapGuides({ guideX: null, guideY: null, equidistX: false, equidistY: false });
    }
    dragRef.current.active = false;
    panRef.current.active = false;
  }, [createPeerLink, pushHistory]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // ── Node operations ───────────────────────
  const addRootNode = () => {
    const id = tempId.current--;
    const bounds = getCanvasBounds();
    // place below last node
    const newNode = {
      id, nombre: 'Nuevo Empleado', cargo: '', departamento: '',
      color: PALETTE[Math.abs(id) % PALETTE.length],
      foto_url: null, parent_id: null,
      pos_x: bounds.maxX + 60 > 200 ? bounds.maxX + 60 : 60,
      pos_y: bounds.minY,
    };
    pushHistory();
    setNodes(prev => [...prev, newNode]);
    setSelected(id);
  };

  const addChildNode = () => {
    if (!selected) return;
    const parent = nodes.find(n => n.id === selected);
    if (!parent) return;
    const id = tempId.current--;
    const childrenOfParent = nodes.filter(n => n.parent_id === selected);
    const offsetX = (childrenOfParent.length - Math.floor((childrenOfParent.length) / 2)) * (NODE_W + 50);
    const newNode = {
      id, nombre: 'Nuevo Empleado', cargo: '', departamento: '',
      color: parent.color || PALETTE[0],
      foto_url: null, parent_id: selected,
      pos_x: parent.pos_x + offsetX,
      pos_y: parent.pos_y + NODE_H + 90,
    };
    pushHistory();
    setNodes(prev => [...prev, newNode]);
    setSelected(id);
  };

  const deleteNode = async () => {
    if (!selected) return;
    pushHistory();
    // Orphan children and remove from local state
    setNodes(prev =>
      prev
        .map(n => n.parent_id === selected ? { ...n, parent_id: null } : n)
        .filter(n => n.id !== selected)
    );
    // Remove peer links involving this node
    setPeerLinks(prev => prev.filter(l => l.nodo_a !== selected && l.nodo_b !== selected));
    // If real node (positive ID), delete from backend immediately
    if (selected > 0) {
      try {
        await api.delete(`/organigrama/${selected}`);
      } catch {
        toast('Error al eliminar del servidor', 'error');
      }
    }
    setSelected(null);
    setDeleteDialog(false);
  };

  // ── Edit node field ───────────────────────
  const updateField = (field, value) => {
    if (!selected) return;
    setNodes(prev => prev.map(n => n.id === selected ? { ...n, [field]: value } : n));
  };

  // ── Photo upload ──────────────────────────
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    setCropFile(file);
    setCropOpen(true);
    e.target.value = '';
  };

  const handleRecrop = () => {
    if (!selectedNode?.foto_url) return;
    setCropFile(null);
    setCropSrc(getStaticFileURL(selectedNode.foto_url));
    setCropOpen(true);
  };

  const handleCropConfirm = async (blob) => {
    setCropOpen(false);
    setCropFile(null);
    setCropSrc(null);
    try {
      setPhotoUploading(true);
      const form = new FormData();
      form.append('foto', blob, 'foto.jpg');
      const res = await api.post('/organigrama/foto', form);
      if (res.data.success) {
        updateField('foto_url', res.data.foto_url);
        toast('Foto actualizada');
      }
    } catch {
      toast('Error al subir foto', 'error');
    } finally {
      setPhotoUploading(false);
    }
  };

  // ── Toggle arrowhead on edge ──────────────
  const toggleEdgeArrow = async () => {
    if (!selectedEdge) return;
    const nuevoValor = !selectedEdge.sinFlecha;
    setSelectedEdge(prev => ({ ...prev, sinFlecha: nuevoValor }));

    if (selectedEdge.type === 'hier') {
      // Actualizar estado local y guardar inmediatamente al servidor
      const nodosActualizados = nodesRef.current.map(n =>
        n.id === selectedEdge.id ? { ...n, sin_flecha: nuevoValor } : n
      );
      setNodes(nodosActualizados);
      try {
        await api.post('/organigrama/guardar', { nodos: nodosActualizados });
      } catch {
        toast('Error al actualizar flecha', 'error');
      }
    } else {
      setPeerLinks(prev => prev.map(l =>
        l.id === selectedEdge.id ? { ...l, sin_flecha: nuevoValor } : l
      ));
      try {
        await api.put(`/organigrama/relaciones/${selectedEdge.id}`, { sin_flecha: nuevoValor });
      } catch {
        toast('Error al actualizar flecha', 'error');
      }
    }
  };

  // ── Save ──────────────────────────────────
  const saveNodes = async () => {
    try {
      setSaving(true);
      const res = await api.post('/organigrama/guardar', { nodos: nodes, board_id: currentBoardId });
      if (res.data.success) {
        setNodes(res.data.nodos);
        toast('Organigrama guardado');
      }
    } catch {
      toast('Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Auto-layout ───────────────────────────
  const autoLayout = () => {
    const positions = calculateTreeLayout(nodes);
    pushHistory();
    setNodes(prev => prev.map(n =>
      positions[n.id]
        ? { ...n, pos_x: positions[n.id].x, pos_y: positions[n.id].y }
        : n
    ));
    // Fit view after layout
    setTimeout(() => fitView(), 100);
  };

  // ── Fit view ──────────────────────────────
  const fitView = () => {
    if (!nodes.length || !containerRef.current) return;
    const bounds = getCanvasBounds();
    const rect = containerRef.current.getBoundingClientRect();
    const padding = 80;
    const scaleX = (rect.width - padding * 2) / (bounds.width + NODE_W);
    const scaleY = (rect.height - padding * 2) / (bounds.height + NODE_H);
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(scaleX, scaleY)));
    const cx = rect.width / 2 - (bounds.minX + bounds.width / 2) * newZoom;
    const cy = rect.height / 2 - (bounds.minY + bounds.height / 2) * newZoom;
    setZoom(newZoom);
    setPanState({ x: cx + NODE_W / 2 * newZoom, y: cy + NODE_H / 2 * newZoom });
  };

  const getCanvasBounds = () => {
    if (!nodes.length) return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };
    const xs = nodes.map(n => n.pos_x);
    const ys = nodes.map(n => n.pos_y);
    const minX = Math.min(...xs), minY = Math.min(...ys);
    const maxX = Math.max(...xs), maxY = Math.max(...ys);
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  };

  // ── Helper: genera canvas compuesto (SVG lines + nodos DOM) ──────────────────
  const buildExportCanvas = async () => {
    const el = transformRef.current;
    const orig = el.style.transform;
    el.style.transform = 'translate(0,0) scale(1)';
    const bounds = getCanvasBounds();
    const PAD_H  = 70;   // horizontal (izquierda/derecha)
    const PAD_T  = 175;  // superior — incluye título + ornamento (130px) + margen (45px)
    const PAD_B  = 70;   // inferior
    const OX     = bounds.minX - PAD_H;
    const OY     = bounds.minY - PAD_T;
    const W      = bounds.width  + NODE_W + PAD_H * 2;
    const H      = bounds.height + NODE_H + PAD_T + PAD_B;
    const SCALE = 4; // 4× Ultra-HD para impresión A3/A4 nítida

    await new Promise(r => setTimeout(r, 200));

    // 1. Canvas final — fondo tipo papel premium
    const final = document.createElement('canvas');
    final.width  = W * SCALE;
    final.height = H * SCALE;
    const ctx = final.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // ── Fondo crema / papel premium ──────────────────────────
    const bgGrad = ctx.createLinearGradient(0, 0, final.width * 0.6, final.height);
    bgGrad.addColorStop(0,   '#fefaf3');
    bgGrad.addColorStop(0.5, '#fdf6ec');
    bgGrad.addColorStop(1,   '#fef8f0');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, final.width, final.height);

    // Textura de puntos tipo papel japonés — muy sutil, color cálido
    ctx.save();
    ctx.globalAlpha = 0.045;
    const DOT_GAP = 28 * SCALE;
    for (let gx = 0; gx < final.width; gx += DOT_GAP) {
      for (let gy = 0; gy < final.height; gy += DOT_GAP) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1.1 * SCALE, 0, Math.PI * 2);
        ctx.fillStyle = '#8a6a40';
        ctx.fill();
      }
    }
    ctx.restore();

    // 2. Dibujar líneas elegantes en canvas (respetando lineStyle)
    ctx.save();
    ctx.scale(SCALE, SCALE);
    ctx.translate(-OX, -OY);

    // Convierte un SVG path string a comandos Canvas 2D
    const applyPath2D = (d) => {
      const p = new Path2D(d);
      ctx.beginPath();
      // Path2D se puede pasar directamente a stroke/fill
      return p;
    };

    // Punta de flecha elegante — calcula la dirección desde el penúltimo punto del path
    const drawArrowTip = (ex, ey, fromX, fromY, clr) => {
      const angle = Math.atan2(ey - fromY, ex - fromX);
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(angle - Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-4.5, -10);
      ctx.lineTo(0, -7);
      ctx.lineTo(4.5, -10);
      ctx.closePath();
      ctx.fillStyle = clr;
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.restore();
    };

    // Dibuja una línea elegante con sombra usando Path2D
    const drawElegantLine = (d, clr, lineWidth, alpha, dashed = false) => {
      ctx.save();
      ctx.shadowColor = 'rgba(30,60,120,0.12)';
      ctx.shadowBlur  = 8;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 3;
      ctx.strokeStyle = clr;
      ctx.lineWidth   = lineWidth;
      ctx.globalAlpha = alpha;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      if (dashed) ctx.setLineDash([7, 5]);
      ctx.stroke(new Path2D(d));
      ctx.setLineDash([]);
      ctx.restore();
    };

    // Extrae el punto final de un SVG path string para orientar la punta de flecha
    const getPathEndTangent = (d) => {
      // Parsear últimas coordenadas del path para la dirección final
      const tokens = d.trim().split(/[\s,]+/);
      const n = tokens.length;
      // Último punto es siempre los dos últimos números
      const ex = parseFloat(tokens[n - 2]);
      const ey = parseFloat(tokens[n - 1]);
      // Punto previo para calcular ángulo (penúltimo par de coordenadas)
      const fx = parseFloat(tokens[n - 4]);
      const fy = parseFloat(tokens[n - 3]);
      return { ex, ey, fx, fy };
    };

    // ── Relaciones jerárquicas ──
    nodes.forEach(node => {
      if (!node.parent_id) return;
      const parent = nodes.find(n => n.id === node.parent_id);
      if (!parent) return;
      const { x1, y1, x2, y2, dir } = getBestEdgePoints(parent, node);
      const clr = node.color || '#90a4ae';
      const { d } = computeEdgePath(x1, y1, x2, y2, dir, lineStyle);

      drawElegantLine(d, clr, 2.2, 0.78);

      if (!node.sin_flecha) {
        const { ex, ey, fx, fy } = getPathEndTangent(d);
        drawArrowTip(ex, ey, fx, fy, clr);
      }
    });

    // ── Peer links — línea punteada ──
    (peerLinks || []).forEach(link => {
      const a = nodes.find(n => n.id === Number(link.nodo_a));
      const b = nodes.find(n => n.id === Number(link.nodo_b));
      if (!a || !b) return;
      const aMidY = a.pos_y + NODE_H / 2, bMidY = b.pos_y + NODE_H / 2;
      const [x1, y1, x2, y2, dir] = (a.pos_x + NODE_W) < b.pos_x
        ? [a.pos_x + NODE_W, aMidY, b.pos_x, bMidY, 'h']
        : (b.pos_x + NODE_W) < a.pos_x
          ? [b.pos_x + NODE_W, bMidY, a.pos_x, aMidY, 'h']
          : [a.pos_x + NODE_W / 2, a.pos_y + NODE_H, b.pos_x + NODE_W / 2, b.pos_y + NODE_H, 'v'];
      const { d } = computeEdgePath(x1, y1, x2, y2, dir, lineStyle);

      drawElegantLine(d, '#d06000', 1.8, 0.80, true);

      if (!link.sin_flecha) {
        const { ex, ey, fx, fy } = getPathEndTangent(d);
        drawArrowTip(ex, ey, fx, fy, '#d06000');
      }
    });

    ctx.globalAlpha = 1;
    ctx.restore();

    // 3. html2canvas para los nodos DOM (sin el SVG)
    const svgEl = el.querySelector('svg');
    if (svgEl) svgEl.style.display = 'none';

    const htmlCanvas = await html2canvas(el, {
      x: OX, y: OY, width: W, height: H,
      scale: SCALE, backgroundColor: null,
      useCORS: true, allowTaint: true,
      logging: false,
    });

    if (svgEl) svgEl.style.display = '';

    // 4. Compositar nodos sobre las líneas
    ctx.drawImage(htmlCanvas, 0, 0);

    el.style.transform = orig;
    return final;
  };

  // ── Export PNG ────────────────────────────
  const exportPNG = async () => {
    try {
      const canvas = await buildExportCanvas();
      const link = document.createElement('a');
      link.download = `organigrama_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast('Imagen exportada');
    } catch (err) {
      console.error(err);
      toast('Error al exportar imagen', 'error');
    }
  };

  // ── Export PDF Ultra-HD A4 ───────────────
  // El título ya está capturado dentro de la imagen (buildExportCanvas lo incluye).
  // Aquí solo colocamos la imagen centrada en el A4 con márgenes simétricos.
  const exportPDF = async (orientation = exportOrientation) => {
    try {
      toast('Generando PDF en alta resolución…', 'info');
      const canvas = await buildExportCanvas();
      const imgData = canvas.toDataURL('image/png');

      const isLandscape = orientation === 'landscape';
      const A4_W = isLandscape ? 297 : 210;  // mm
      const A4_H = isLandscape ? 210 : 297;
      const MARGIN = 12;  // margen uniforme en mm

      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4',
        compress: false,
      });

      // Fondo crema del PDF — mismo tono que la imagen exportada
      pdf.setFillColor(254, 250, 243);
      pdf.rect(0, 0, A4_W, A4_H, 'F');

      // Imagen centrada — ocupa todo el espacio disponible dentro de márgenes
      const availW = A4_W - MARGIN * 2;
      const availH = A4_H - MARGIN * 2;
      const ratio  = canvas.width / canvas.height;

      let imgW, imgH;
      if (ratio > availW / availH) {
        imgW = availW;
        imgH = availW / ratio;
      } else {
        imgH = availH;
        imgW = availH * ratio;
      }

      // Centrado perfecto horizontal y vertical
      const imgX = MARGIN + (availW - imgW) / 2;
      const imgY = MARGIN + (availH - imgH) / 2;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgW, imgH, undefined, 'FAST');

      // Pie de página muy sutil
      pdf.setFontSize(6.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(190, 175, 155);
      pdf.text(
        new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }),
        A4_W / 2, A4_H - 5, { align: 'center' }
      );

      pdf.save(`organigrama_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast('PDF exportado');
    } catch (err) {
      console.error(err);
      toast('Error al exportar PDF', 'error');
    }
  };

  // Variables para el sidebar (calculadas aquí para usarlas inline en el render)
  const sidebarFotoUrl = selectedNode?.foto_url ? getStaticFileURL(selectedNode.foto_url) : null;
  const sidebarOtherNodes = selectedNode ? nodes.filter(n => n.id !== selectedNode.id) : [];

  // ── Toolbar ───────────────────────────────
  const toolbarBg = 'linear-gradient(90deg, #1a1a2e 0%, #16213e 100%)';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400 }}>
        <CircularProgress size={48} sx={{ color: '#F57C00' }} />
      </Box>
    );
  }

  const fondo = FONDOS[currentFondo] || FONDOS.grid_light;
  const deptOptions = [...new Set(
    [...boards.map(b => b.departamento), ...nodes.map(n => n.departamento)]
      .filter(Boolean)
  )].sort();

  return (
    <Box sx={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', bgcolor: '#f0f4fa' }}>

      {/* ── Board Selector Bar ── */}
      <Box sx={{
        display: 'flex', alignItems: 'center',
        background: 'linear-gradient(90deg,#0d0d1a 0%,#12121f 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        px: 1.5, minHeight: 42, gap: 0.5,
      }}>
        {/* Tab General */}
        <Chip
          icon={<DashboardIcon sx={{ fontSize: 14 }} />}
          label="General"
          size="small"
          onClick={() => switchBoard(null)}
          sx={{
            cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
            bgcolor: currentBoardId == null ? '#F57C00' : 'rgba(255,255,255,0.07)',
            color: currentBoardId == null ? '#fff' : 'rgba(255,255,255,0.55)',
            border: currentBoardId == null ? 'none' : '1px solid rgba(255,255,255,0.12)',
            '&:hover': { bgcolor: currentBoardId == null ? '#e65100' : 'rgba(255,255,255,0.13)' },
          }}
        />

        {/* Tabs de boards */}
        {boards.map(b => (
          <Chip
            key={b.id}
            label={b.nombre}
            size="small"
            onClick={() => switchBoard(b.id)}
            sx={{
              cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600,
              bgcolor: currentBoardId === b.id ? 'rgba(245,124,0,0.85)' : 'rgba(255,255,255,0.07)',
              color: currentBoardId === b.id ? '#fff' : 'rgba(255,255,255,0.55)',
              border: currentBoardId === b.id ? 'none' : '1px solid rgba(255,255,255,0.12)',
              '&:hover': { bgcolor: currentBoardId === b.id ? '#e65100' : 'rgba(255,255,255,0.13)' },
            }}
          />
        ))}

        {/* Botón nuevo board */}
        <Tooltip title="Nuevo organigrama por departamento">
          <IconButton
            size="small"
            onClick={openBoardDialog}
            sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#F57C00' }, ml: 0.5 }}
          >
            <AddBoardIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

        <Box sx={{ flex: 1 }} />

        {/* Duplicar / Eliminar board actual (solo si no es el general) */}
        {currentBoardId != null && (
          <>
            <Tooltip title="Duplicar este organigrama">
              <IconButton size="small" onClick={openDuplicateDialog}
                sx={{ color: 'rgba(100,180,255,0.5)', '&:hover': { color: '#64b5f6' } }}>
                <CopyIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Eliminar este organigrama">
              <IconButton size="small" onClick={() => setDeleteBoardDialog(true)}
                sx={{ color: 'rgba(255,80,80,0.5)', '&:hover': { color: '#ef5350' } }}>
                <DeleteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>

      {/* ── Toolbar ── */}
      <Paper
        elevation={4}
        sx={{
          display: 'flex', alignItems: 'center', px: 2, py: 1,
          gap: 1, flexWrap: 'wrap',
          background: toolbarBg,
          borderRadius: 0, zIndex: 100,
        }}
      >
        {/* Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
          <OrgIcon sx={{ color: '#F57C00', fontSize: 26 }} />
          <Typography fontWeight="bold" fontSize="1rem" sx={{ color: '#fff' }}>
            {currentBoardId == null
              ? 'Organigrama Empresarial'
              : (boards.find(b => b.id === currentBoardId)?.nombre || 'Organigrama')}
          </Typography>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.2)', mx: 0.5 }} />

        {/* Node actions */}
        <Tooltip title="Agregar nodo raíz">
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addRootNode}
            size="small"
            sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', textTransform: 'none', fontSize: '0.75rem' }}
          >
            Añadir
          </Button>
        </Tooltip>

        {selected && (
          <Tooltip title="Añadir subordinado al nodo seleccionado">
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={addChildNode}
              size="small"
              sx={{ bgcolor: '#F57C00', '&:hover': { bgcolor: '#e65100' }, textTransform: 'none', fontSize: '0.75rem' }}
            >
              + Subordinado
            </Button>
          </Tooltip>
        )}

        <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.2)', mx: 0.5 }} />

        {/* Layout */}
        <Tooltip title="Auto-organizar en árbol">
          <IconButton onClick={autoLayout} size="small" sx={{ color: '#a5d6a7' }}>
            <AutoLayoutIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Deshacer (Ctrl+Z)">
          <span>
            <IconButton onClick={undo} size="small" disabled={historyRef.current.past.length === 0}
              sx={{ color: historyRef.current.past.length ? '#ce93d8' : 'rgba(255,255,255,0.2)' }}>
              <UndoIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Rehacer (Ctrl+Y)">
          <span>
            <IconButton onClick={redo} size="small" disabled={historyRef.current.future.length === 0}
              sx={{ color: historyRef.current.future.length ? '#80cbc4' : 'rgba(255,255,255,0.2)' }}>
              <RedoIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={showMinimap ? 'Ocultar mapa' : 'Mostrar mapa'}>
          <IconButton onClick={() => setShowMinimap(v => !v)} size="small"
            sx={{ color: showMinimap ? '#ffcc02' : 'rgba(255,255,255,0.3)' }}>
            <MapIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Ajustar vista">
          <IconButton onClick={fitView} size="small" sx={{ color: '#90caf9' }}>
            <FitIcon />
          </IconButton>
        </Tooltip>

        {/* Zoom */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Alejar">
            <IconButton onClick={() => setZoom(zoom - 0.1)} size="small" sx={{ color: '#fff' }}>
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          <Chip
            label={`${Math.round(zoom * 100)}%`}
            size="small"
            onClick={() => { setZoom(0.85); setPanState({ x: 60, y: 40 }); }}
            sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.12)', fontSize: '0.7rem', cursor: 'pointer' }}
          />
          <Tooltip title="Acercar">
            <IconButton onClick={() => setZoom(zoom + 0.1)} size="small" sx={{ color: '#fff' }}>
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Estilo de líneas */}
        <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '8px', overflow: 'hidden', ml: 0.5 }}>
          <Tooltip title="Líneas curvas (magnéticas)">
            <IconButton
              size="small"
              onClick={() => setLineStyle('curved')}
              sx={{
                color: lineStyle === 'curved' ? '#80cbc4' : 'rgba(255,255,255,0.35)',
                bgcolor: lineStyle === 'curved' ? 'rgba(128,203,196,0.12)' : 'transparent',
                borderRadius: 0, px: 1,
              }}
            >
              <CurvedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Líneas rectas">
            <IconButton
              size="small"
              onClick={() => setLineStyle('straight')}
              sx={{
                color: lineStyle === 'straight' ? '#80cbc4' : 'rgba(255,255,255,0.35)',
                bgcolor: lineStyle === 'straight' ? 'rgba(128,203,196,0.12)' : 'transparent',
                borderRadius: 0, px: 1,
              }}
            >
              <StraightIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Líneas formales (codo)">
            <IconButton
              size="small"
              onClick={() => setLineStyle('elbow')}
              sx={{
                color: lineStyle === 'elbow' ? '#80cbc4' : 'rgba(255,255,255,0.35)',
                bgcolor: lineStyle === 'elbow' ? 'rgba(128,203,196,0.12)' : 'transparent',
                borderRadius: 0, px: 1,
              }}
            >
              <ElbowIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ flex: 1 }} />

        {/* Importar empleados existentes */}
        {currentBoardId != null && (
          <Tooltip title="Importar empleados existentes">
            <IconButton onClick={openImportDialog} size="small" sx={{ color: '#a5d6a7' }}>
              <GroupAddIcon />
            </IconButton>
          </Tooltip>
        )}

        {/* Save / Export */}
        <Tooltip title="Exportar PNG">
          <IconButton onClick={exportPNG} size="small" sx={{ color: '#80cbc4' }}>
            <DownloadIcon />
          </IconButton>
        </Tooltip>

        {/* PDF — selector de orientación A4 */}
        <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '8px', overflow: 'hidden' }}>
          <Tooltip title="PDF A4 Vertical">
            <IconButton
              onClick={() => { setExportOrientation('portrait'); exportPDF('portrait'); }}
              size="small"
              sx={{
                color: exportOrientation === 'portrait' ? '#ef9a9a' : 'rgba(255,255,255,0.35)',
                bgcolor: exportOrientation === 'portrait' ? 'rgba(239,154,154,0.12)' : 'transparent',
                borderRadius: 0, px: 1,
              }}
            >
              <PdfIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="PDF A4 Horizontal">
            <IconButton
              onClick={() => { setExportOrientation('landscape'); exportPDF('landscape'); }}
              size="small"
              sx={{
                color: exportOrientation === 'landscape' ? '#ef9a9a' : 'rgba(255,255,255,0.35)',
                bgcolor: exportOrientation === 'landscape' ? 'rgba(239,154,154,0.12)' : 'transparent',
                borderRadius: 0, px: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                <PdfIcon sx={{ fontSize: 18, transform: 'rotate(90deg)' }} />
              </Box>
            </IconButton>
          </Tooltip>
        </Box>

        {/* Fondo del canvas */}
        <Tooltip title="Cambiar fondo del organigrama">
          <IconButton onClick={() => setFondoOpen(true)} size="small"
            sx={{ color: fondo.dark ? '#ce93d8' : '#9c27b0' }}>
            <PaletteIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Guardar organigrama">
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
            onClick={saveNodes}
            disabled={saving}
            size="small"
            sx={{
              bgcolor: '#F57C00', '&:hover': { bgcolor: '#e65100' },
              textTransform: 'none', fontWeight: 700, fontSize: '0.78rem',
              ml: 1,
            }}
          >
            Guardar
          </Button>
        </Tooltip>
      </Paper>

      {/* ── Main area ── */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Canvas */}
        <Box
          ref={containerRef}
          onMouseDown={handleCanvasMouseDown}
          sx={{
            flex: 1, overflow: 'hidden', position: 'relative',
            cursor: 'default',
            background: fondo.canvasBg,
            transition: 'background 0.4s ease',
          }}
        >
          {/* Grid de puntos elegante según fondo */}
          <Box sx={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: `radial-gradient(circle, ${fondo.gridColor} 1.5px, transparent 1.5px)`,
            backgroundSize: '28px 28px',
          }} />

          {/* Empty state */}
          {nodes.length === 0 && (
            <Box sx={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 2,
              pointerEvents: 'none',
            }}>
              <OrgIcon sx={{ fontSize: 80, color: 'rgba(100,120,160,0.2)' }} />
              <Typography sx={{ color: 'rgba(100,120,160,0.4)', fontSize: '1.1rem', fontWeight: 500 }}>
                Haz clic en "Añadir" para crear el primer nodo
              </Typography>
            </Box>
          )}

          {/* Transform content */}
          <Box
            ref={transformRef}
            sx={{
              position: 'absolute',
              transformOrigin: '0 0',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              width: 1, height: 1,
            }}
          >
            {/* Snap alignment guides */}
            {snapGuides.guideX !== null && (
              <Box sx={{
                position: 'absolute',
                left: snapGuides.guideX,
                top: -5000,
                width: '1px',
                height: '10000px',
                background: snapGuides.equidistX ? '#f57c00' : '#1976d2',
                opacity: 0.75,
                pointerEvents: 'none',
                zIndex: 9999,
              }} />
            )}
            {snapGuides.guideY !== null && (
              <Box sx={{
                position: 'absolute',
                top: snapGuides.guideY,
                left: -5000,
                height: '1px',
                width: '10000px',
                background: snapGuides.equidistY ? '#f57c00' : '#1976d2',
                opacity: 0.75,
                pointerEvents: 'none',
                zIndex: 9999,
              }} />
            )}

            {/* ── Título del organigrama ── */}
            {nodes.length > 0 && (() => {
              const b = getCanvasBounds();
              const titleW = Math.max(b.width + NODE_W, 400);
              return (
                <Box
                  onMouseDown={e => e.stopPropagation()}
                  sx={{
                    position: 'absolute',
                    left: b.minX,
                    top: b.minY - 140,
                    width: titleW,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.8,
                    pointerEvents: 'all',
                  }}
                >
                  {titleEditing ? (
                    <input
                      autoFocus
                      value={titleDraft}
                      onChange={e => setTitleDraft(e.target.value.toUpperCase())}
                      onBlur={confirmTitleEdit}
                      onKeyDown={e => { if (e.key === 'Enter') confirmTitleEdit(); if (e.key === 'Escape') setTitleEditing(false); }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        borderBottom: `2px solid ${fondo.dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}`,
                        outline: 'none',
                        fontSize: '1.6rem',
                        fontWeight: 800,
                        letterSpacing: '0.14em',
                        textAlign: 'center',
                        color: fondo.dark ? '#ffffff' : '#0d0d1f',
                        width: '100%',
                        maxWidth: 560,
                        padding: '4px 8px',
                      }}
                    />
                  ) : (
                    <Typography
                      onDoubleClick={startTitleEdit}
                      title="Doble clic para editar el título"
                      sx={{
                        fontSize: '1.6rem',
                        fontWeight: 800,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: fondo.dark ? 'rgba(255,255,255,0.92)' : '#0d0d1f',
                        textAlign: 'center',
                        lineHeight: 1,
                        cursor: 'text',
                        userSelect: 'none',
                        textShadow: fondo.dark
                          ? '0 2px 16px rgba(0,0,0,0.6)'
                          : '0 2px 12px rgba(0,0,0,0.08)',
                        transition: 'opacity 0.2s',
                        '&:hover': { opacity: 0.75 },
                      }}
                    >
                      {canvasTitle}
                    </Typography>
                  )}
                  {/* Línea ornamental bajo el título */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 48, height: 1.5, background: fondo.dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)', borderRadius: 1 }}/>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: fondo.dark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.22)' }}/>
                    <Box sx={{ width: 48, height: 1.5, background: fondo.dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)', borderRadius: 1 }}/>
                  </Box>
                </Box>
              );
            })()}

            {/* Edges SVG */}
            <EdgesLayer
              nodes={nodes}
              peerLinks={peerLinks}
              connectingLine={connecting}
              selectedEdge={selectedEdge}
              onEdgeClick={setSelectedEdge}
              lineStyle={lineStyle}
            />

            {/* Nodes */}
            {nodes.map(node => (
              <NodeCard
                key={node.id}
                node={node}
                isSelected={node.id === selected}
                onMouseDown={handleNodeMouseDown}
                onHoverChange={handleHoverChange}
                onStartConnect={handleStartConnect}
                isConnecting={!!connecting && connecting.fromId !== node.id}
                isDropTarget={!!connecting && connecting.fromId !== node.id && hoveredNodeId === node.id}
              />
            ))}

            {/* Toolbar flotante sobre la arista seleccionada */}
            {selectedEdge?.mid && (
              <Box
                onMouseDown={e => e.stopPropagation()}
                sx={{
                  position: 'absolute',
                  left: selectedEdge.mid.x - 60,
                  top: selectedEdge.mid.y - 20,
                  zIndex: 10000,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  background: '#fff',
                  border: '1.5px solid #2196f3',
                  borderRadius: '20px',
                  px: 1, py: 0.4,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
                  pointerEvents: 'all',
                }}
              >
                <Tooltip title={selectedEdge.sinFlecha ? 'Agregar punta' : 'Quitar punta'}>
                  <IconButton
                    size="small"
                    onClick={toggleEdgeArrow}
                    sx={{
                      color: selectedEdge.sinFlecha ? '#bbb' : '#1976d2',
                      fontSize: 13, fontWeight: 700,
                      width: 28, height: 28,
                    }}
                  >
                    {selectedEdge.sinFlecha ? '—' : '→'}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Cerrar">
                  <IconButton
                    size="small"
                    onClick={() => setSelectedEdge(null)}
                    sx={{ width: 22, height: 22, color: '#999' }}
                  >
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>

          {/* Minimap */}
          {showMinimap && (
            <Minimap
              nodes={nodes}
              peerLinks={peerLinks}
              pan={pan}
              zoom={zoom}
              containerW={containerSize.w}
              containerH={containerSize.h}
              onPanTo={(x, y) => setPanState({ x, y })}
            />
          )}
        </Box>

        {/* Sidebar — JSX inline para evitar desmonte en cada render */}
        {selectedNode && (
          <Paper
            elevation={4}
            sx={{
              width: 240, flexShrink: 0,
              display: 'flex', flexDirection: 'column',
              background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
              color: '#fff', overflow: 'hidden',
            }}
          >
            {/* Header */}
            <Box sx={{
              p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              background: `linear-gradient(90deg, ${selectedNode.color}cc, ${selectedNode.color}44)`,
            }}>
              <Typography fontWeight="bold" fontSize="0.85rem">Editar nodo</Typography>
              <IconButton size="small" onClick={() => setSelected(null)} sx={{ color: '#fff' }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            <Box sx={{ p: 1.5, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* Photo */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <Box sx={{ position: 'relative' }}>
                  <Avatar
                    src={sidebarFotoUrl}
                    sx={{
                      width: 72, height: 72,
                      border: `3px solid ${selectedNode.color}`,
                      bgcolor: selectedNode.color, fontSize: 26,
                      boxShadow: `0 0 20px ${selectedNode.color}88`,
                    }}
                  >
                    {!sidebarFotoUrl && (selectedNode.nombre?.[0]?.toUpperCase() || '?')}
                  </Avatar>
                  <Tooltip title="Cambiar foto">
                    <IconButton
                      size="small"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={photoUploading}
                      sx={{
                        position: 'absolute', bottom: -4, right: -4,
                        bgcolor: selectedNode.color, color: '#fff',
                        width: 24, height: 24,
                        '&:hover': { bgcolor: selectedNode.color },
                        boxShadow: 2,
                      }}
                    >
                      {photoUploading ? <CircularProgress size={12} color="inherit" /> : <PhotoIcon sx={{ fontSize: 14 }} />}
                    </IconButton>
                  </Tooltip>
                </Box>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                {sidebarFotoUrl && (
                  <Tooltip title="Reencuadrar foto existente">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleRecrop}
                      startIcon={<PhotoIcon sx={{ fontSize: 13 }} />}
                      sx={{
                        fontSize: '0.68rem', textTransform: 'none', py: 0.3,
                        borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.7)',
                        '&:hover': { borderColor: selectedNode.color, color: selectedNode.color },
                      }}
                    >
                      Reencuadrar
                    </Button>
                  </Tooltip>
                )}
              </Box>

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />

              {/* Fields */}
              <TextField
                label="Nombre"
                value={selectedNode.nombre || ''}
                onChange={e => updateField('nombre', e.target.value)}
                size="small" fullWidth
                InputLabelProps={{ style: { color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' } }}
                inputProps={{ style: { color: '#fff', fontSize: '0.82rem' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' }, '&.Mui-focused fieldset': { borderColor: selectedNode.color } } }}
              />
              <TextField
                label="Cargo"
                value={selectedNode.cargo || ''}
                onChange={e => updateField('cargo', e.target.value)}
                size="small" fullWidth
                InputLabelProps={{ style: { color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' } }}
                inputProps={{ style: { color: '#fff', fontSize: '0.82rem' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' }, '&.Mui-focused fieldset': { borderColor: selectedNode.color } } }}
              />
              <TextField
                label="Departamento"
                value={selectedNode.departamento || ''}
                onChange={e => updateField('departamento', e.target.value)}
                size="small" fullWidth
                InputLabelProps={{ style: { color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' } }}
                inputProps={{ style: { color: '#fff', fontSize: '0.82rem' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' }, '&.Mui-focused fieldset': { borderColor: selectedNode.color } } }}
              />

              {/* Parent */}
              <FormControl size="small" fullWidth>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>Reporta a</InputLabel>
                <Select
                  value={selectedNode.parent_id ?? ''}
                  label="Reporta a"
                  onChange={e => updateField('parent_id', e.target.value || null)}
                  sx={{
                    color: '#fff', fontSize: '0.82rem',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                    '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.6)' },
                  }}
                >
                  <MenuItem value="">— Sin jefe (raíz) —</MenuItem>
                  {sidebarOtherNodes.map(n => (
                    <MenuItem key={n.id} value={n.id}>{n.nombre || `Nodo ${n.id}`}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Color palette */}
              <Box>
                <Typography fontSize="0.72rem" sx={{ color: 'rgba(255,255,255,0.5)', mb: 0.5 }}>Color del nodo</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
                  {PALETTE.map(c => (
                    <Box
                      key={c}
                      onClick={() => updateField('color', c)}
                      sx={{
                        width: 22, height: 22, borderRadius: '50%',
                        bgcolor: c, cursor: 'pointer',
                        border: selectedNode.color === c ? '3px solid #fff' : '2px solid transparent',
                        boxShadow: selectedNode.color === c ? `0 0 8px ${c}` : 'none',
                        transition: 'all 0.15s',
                        '&:hover': { transform: 'scale(1.25)' },
                      }}
                    />
                  ))}
                </Box>
              </Box>

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />

              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={addChildNode}
                size="small"
                sx={{ bgcolor: selectedNode.color, '&:hover': { bgcolor: selectedNode.color, filter: 'brightness(1.2)' }, textTransform: 'none', fontWeight: 600, fontSize: '0.78rem' }}
              >
                Agregar subordinado
              </Button>
              <Button
                variant="outlined"
                startIcon={<DeleteIcon />}
                onClick={() => setDeleteDialog(true)}
                size="small"
                sx={{ borderColor: '#ef5350', color: '#ef5350', '&:hover': { bgcolor: '#ef535015', borderColor: '#ef5350' }, textTransform: 'none', fontSize: '0.78rem' }}
              >
                Eliminar nodo
              </Button>

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />

              {/* Relaciones de par (mismo nivel) */}
              <Box>
                <Typography fontSize="0.72rem" sx={{ color: 'rgba(255,255,255,0.5)', mb: 0.8, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PeerIcon sx={{ fontSize: 14, color: '#f57c00' }} />
                  Relaciones al mismo nivel
                </Typography>

                {/* Existing peer links for this node */}
                {peerLinks.filter(l => Number(l.nodo_a) === selectedNode.id || Number(l.nodo_b) === selectedNode.id).map(link => {
                  const peerId = Number(link.nodo_a) === selectedNode.id ? Number(link.nodo_b) : Number(link.nodo_a);
                  const peerNode = nodes.find(n => n.id === peerId);
                  return (
                    <Box key={link.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, bgcolor: 'rgba(245,124,0,0.12)', borderRadius: 1, px: 1, py: 0.3 }}>
                      <Typography fontSize="0.72rem" sx={{ color: '#ffcc80' }}>
                        {peerNode?.nombre || `Nodo ${peerId}`}
                      </Typography>
                      <Tooltip title="Quitar relación">
                        <IconButton size="small" sx={{ color: '#ef9a9a', p: 0.3 }}
                          onClick={async () => {
                            try {
                              await api.delete(`/organigrama/relaciones/${link.id}`);
                              setPeerLinks(prev => prev.filter(l => l.id !== link.id));
                            } catch { toast('Error al eliminar relación', 'error'); }
                          }}
                        >
                          <DisconnectIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  );
                })}

                {/* Add new peer */}
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <Select
                      value={peerTarget}
                      onChange={e => setPeerTarget(e.target.value === '' ? '' : Number(e.target.value))}
                      displayEmpty
                      sx={{
                        color: '#fff', fontSize: '0.75rem',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                        '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.6)' },
                      }}
                    >
                      <MenuItem value="" sx={{ fontSize: '0.75rem' }}>— Seleccionar —</MenuItem>
                      {nodes.filter(n => {
                        if (n.id === selectedNode.id) return false;
                        return !peerLinks.some(l =>
                          (Number(l.nodo_a) === selectedNode.id && Number(l.nodo_b) === n.id) ||
                          (Number(l.nodo_b) === selectedNode.id && Number(l.nodo_a) === n.id)
                        );
                      }).map(n => (
                        <MenuItem key={n.id} value={n.id} sx={{ fontSize: '0.75rem' }}>{n.nombre || `Nodo ${n.id}`}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Tooltip title="Conectar como pares">
                    <span>
                      <IconButton
                        size="small"
                        disabled={!peerTarget}
                        sx={{ color: '#f57c00', bgcolor: 'rgba(245,124,0,0.15)', borderRadius: 1, '&:hover': { bgcolor: 'rgba(245,124,0,0.3)' } }}
                        onClick={async () => {
                          if (!peerTarget) return;
                          try {
                            const res = await api.post('/organigrama/relaciones', { nodo_a: selectedNode.id, nodo_b: peerTarget });
                            if (res.data.success) {
                              setPeerLinks(prev => {
                                const exists = prev.some(l => l.id === res.data.relacion.id);
                                return exists ? prev : [...prev, res.data.relacion];
                              });
                              setPeerTarget('');
                              toast('Relación creada');
                            }
                          } catch { toast('Error al crear relación', 'error'); }
                        }}
                      >
                        <AddIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
            </Box>
          </Paper>
        )}
      </Box>

      {/* Crop photo dialog */}
      <PhotoCropDialog
        file={cropFile}
        src={cropSrc}
        open={cropOpen}
        onConfirm={handleCropConfirm}
        onCancel={() => { setCropOpen(false); setCropFile(null); setCropSrc(null); }}
      />

      {/* Delete node confirm */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)} maxWidth="xs">
        <DialogTitle sx={{ bgcolor: '#1a1a2e', color: '#fff' }}>Eliminar nodo</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <Typography>
            ¿Eliminar a <b>{selectedNode?.nombre}</b>? Sus subordinados quedarán sin jefe.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancelar</Button>
          <Button onClick={deleteNode} color="error" variant="contained">Eliminar</Button>
        </DialogActions>
      </Dialog>

      {/* ── Fondo Picker ── */}
      <Dialog open={fondoOpen} onClose={() => setFondoOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { background: 'linear-gradient(135deg,#0d0d1a,#1a1a2e)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3 } }}>
        <DialogTitle sx={{ color: '#fff', pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PaletteIcon sx={{ color: '#F57C00' }} />
          Fondo del Organigrama
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', mb: 2 }}>
            Elige un fondo elegante para este organigrama.
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1.5 }}>
            {Object.entries(FONDOS).map(([key, f]) => (
              <Box
                key={key}
                onClick={() => handleFondoChange(key)}
                sx={{
                  cursor: 'pointer',
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: currentFondo === key ? '2.5px solid #F57C00' : '2px solid rgba(255,255,255,0.1)',
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'scale(1.03)', border: '2px solid rgba(245,124,0,0.6)' },
                }}
              >
                {/* Preview */}
                <Box sx={{ height: 70, background: f.canvasBg, position: 'relative' }}>
                  <Box sx={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `
                      repeating-linear-gradient(0deg,transparent,transparent 9px,${f.gridColor} 10px),
                      repeating-linear-gradient(90deg,transparent,transparent 9px,${f.gridColor} 10px)
                    `,
                  }} />
                  {/* Nodo de ejemplo */}
                  <Box sx={{
                    position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                    width: 50, height: 36, borderRadius: 1.5,
                    bgcolor: f.dark ? 'rgba(255,255,255,0.12)' : 'rgba(21,101,192,0.75)',
                    border: `1px solid ${f.dark ? 'rgba(255,255,255,0.2)' : 'rgba(21,101,192,0.4)'}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.3,
                  }}>
                    <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: f.dark ? 'rgba(255,255,255,0.2)' : 'rgba(21,101,192,0.5)' }} />
                    <Box sx={{ width: 30, height: 4, borderRadius: 1, bgcolor: f.dark ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.8)' }} />
                  </Box>
                  {currentFondo === key && (
                    <Box sx={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', bgcolor: '#F57C00', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography sx={{ fontSize: 11, color: '#fff', fontWeight: 900 }}>✓</Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ px: 1, py: 0.8, bgcolor: 'rgba(0,0,0,0.4)' }}>
                  <Typography sx={{ fontSize: '0.72rem', color: '#fff', fontWeight: 600 }}>
                    {f.label}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFondoOpen(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* ── Crear Board ── */}
      <Dialog open={boardDialogOpen} onClose={() => setBoardDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { background: 'linear-gradient(135deg,#0d0d1a,#1a1a2e)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3 } }}>
        <DialogTitle sx={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <AddBoardIcon sx={{ color: '#F57C00' }} />
          Nuevo Organigrama
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Nombre"
            value={newBoardName}
            onChange={e => setNewBoardName(e.target.value)}
            size="small" autoFocus fullWidth
            placeholder="Ej: Administración, Operaciones..."
            InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }}
            InputProps={{ sx: { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
          />
          <TextField
            label="Departamento (opcional)"
            value={newBoardDept}
            onChange={e => setNewBoardDept(e.target.value)}
            size="small" fullWidth
            placeholder="Etiqueta para identificar este organigrama"
            InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }}
            InputProps={{ sx: { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
          />

          {/* ── Importar trabajadores existentes ── */}
          <Box>
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontWeight: 600, mb: 0.5 }}>
              Importar trabajadores existentes
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', mb: 1 }}>
              Selecciona personas de otros organigramas para incluirlas en este nuevo. Se copian con su foto y cargo.
            </Typography>
            <TextField
              size="small" fullWidth
              placeholder="Buscar por nombre, cargo o departamento..."
              value={workerSearch}
              onChange={e => setWorkerSearch(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }} /></InputAdornment>,
                sx: { color: '#fff', fontSize: '0.8rem', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } },
              }}
            />
            {/* Chips de seleccionados */}
            {selectedWorkerIds.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {allWorkers.filter(w => selectedWorkerIds.includes(w.id)).map(w => (
                  <Chip
                    key={w.id}
                    label={w.nombre}
                    size="small"
                    onDelete={() => toggleWorker(w.id)}
                    avatar={w.foto_url ? <Avatar src={getStaticFileURL(w.foto_url)} /> : <Avatar sx={{ bgcolor: w.color, fontSize: '0.6rem' }}>{w.nombre[0]}</Avatar>}
                    sx={{ bgcolor: 'rgba(245,124,0,0.15)', color: '#F57C00', border: '1px solid rgba(245,124,0,0.3)', '& .MuiChip-deleteIcon': { color: 'rgba(245,124,0,0.6)' } }}
                  />
                ))}
                <Chip
                  label="Limpiar selección"
                  size="small"
                  onClick={() => setSelectedWorkerIds([])}
                  sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', cursor: 'pointer' }}
                />
              </Box>
            )}
            {/* Lista de trabajadores */}
            <Box sx={{
              maxHeight: 220, overflowY: 'auto', mt: 0.5, borderRadius: 1,
              border: '1px solid rgba(255,255,255,0.1)',
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2 },
            }}>
              {workersLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={20} sx={{ color: '#F57C00' }} />
                </Box>
              ) : allWorkers.length === 0 ? (
                <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', textAlign: 'center', py: 2 }}>
                  No hay trabajadores creados aún
                </Typography>
              ) : (() => {
                const filtered = allWorkers.filter(w => {
                  const q = workerSearch.toLowerCase();
                  return !q || w.nombre.toLowerCase().includes(q)
                    || (w.cargo || '').toLowerCase().includes(q)
                    || (w.departamento || '').toLowerCase().includes(q)
                    || w.board_nombre.toLowerCase().includes(q);
                });
                if (filtered.length === 0) return (
                  <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', textAlign: 'center', py: 2 }}>
                    Sin resultados
                  </Typography>
                );
                return (
                  <List dense disablePadding>
                    {filtered.map(w => {
                      const checked = selectedWorkerIds.includes(w.id);
                      return (
                        <ListItem key={w.id} disablePadding secondaryAction={
                          <Checkbox
                            edge="end"
                            checked={checked}
                            onChange={() => toggleWorker(w.id)}
                            icon={<CheckBoxBlankIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.2)' }} />}
                            checkedIcon={<CheckBoxIcon sx={{ fontSize: 18, color: '#F57C00' }} />}
                          />
                        }>
                          <ListItemButton onClick={() => toggleWorker(w.id)} sx={{ py: 0.5, px: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                            <ListItemAvatar sx={{ minWidth: 36 }}>
                              {w.foto_url
                                ? <Avatar src={getStaticFileURL(w.foto_url)} sx={{ width: 28, height: 28 }} />
                                : <Avatar sx={{ width: 28, height: 28, bgcolor: w.color || '#1565c0', fontSize: '0.7rem' }}>{w.nombre[0]}</Avatar>
                              }
                            </ListItemAvatar>
                            <ListItemText
                              primary={<Typography sx={{ fontSize: '0.8rem', color: '#fff', fontWeight: checked ? 600 : 400 }}>{w.nombre}</Typography>}
                              secondary={
                                <Typography sx={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>
                                  {w.cargo}{w.cargo && w.board_nombre ? ' · ' : ''}{w.board_nombre}
                                </Typography>
                              }
                            />
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                  </List>
                );
              })()}
            </Box>
          </Box>

          {/* Fondo inicial */}
          <Box>
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', mb: 1 }}>Fondo inicial</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {Object.entries(FONDOS).map(([key, f]) => (
                <Tooltip key={key} title={f.label}>
                  <Box
                    onClick={() => setNewBoardFondo(key)}
                    sx={{
                      width: 36, height: 24, borderRadius: 1, cursor: 'pointer',
                      background: f.canvasBg,
                      border: newBoardFondo === key ? '2px solid #F57C00' : '2px solid rgba(255,255,255,0.15)',
                      transition: 'all 0.15s',
                    }}
                  />
                </Tooltip>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setBoardDialogOpen(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCrearBoard}
            disabled={!newBoardName.trim() || creatingBoard}
            startIcon={creatingBoard ? <CircularProgress size={14} color="inherit" /> : <AddBoardIcon />}
            sx={{ bgcolor: '#F57C00', '&:hover': { bgcolor: '#e65100' }, textTransform: 'none', fontWeight: 700 }}
          >
            {selectedWorkerIds.length > 0 ? `Crear con ${selectedWorkerIds.length} trabajador${selectedWorkerIds.length > 1 ? 'es' : ''}` : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Confirmar eliminar board ── */}
      <Dialog open={deleteBoardDialog} onClose={() => setDeleteBoardDialog(false)} maxWidth="xs"
        PaperProps={{ sx: { background: '#1a1a2e', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 3 } }}>
        <DialogTitle sx={{ color: '#ef5350' }}>Eliminar organigrama</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>
            ¿Eliminar el organigrama <b style={{ color: '#fff' }}>
              {boards.find(b => b.id === currentBoardId)?.nombre}
            </b>?<br />
            <Typography component="span" sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem' }}>
              Esta acción no se puede deshacer.
            </Typography>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteBoardDialog(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancelar</Button>
          <Button onClick={handleEliminarBoard} color="error" variant="contained">Eliminar</Button>
        </DialogActions>
      </Dialog>

      {/* ── Duplicar board ── */}
      <Dialog open={duplicateBoardDialogOpen} onClose={() => setDuplicateBoardDialogOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { background: 'linear-gradient(135deg,#0d0d1a,#1a1a2e)', border: '1px solid rgba(100,180,255,0.2)', borderRadius: 3 } }}>
        <DialogTitle sx={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <CopyIcon sx={{ color: '#64b5f6' }} />
          Duplicar organigrama
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>
            Se creará una copia exacta con todos sus nodos y conexiones.
          </Typography>
          <TextField
            label="Nombre de la copia"
            value={duplicateBoardName}
            onChange={e => setDuplicateBoardName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleDuplicarBoard()}
            size="small" autoFocus fullWidth
            InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }}
            InputProps={{ sx: { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDuplicateBoardDialogOpen(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleDuplicarBoard}
            disabled={!duplicateBoardName.trim() || duplicatingBoard}
            startIcon={duplicatingBoard ? <CircularProgress size={14} color="inherit" /> : <CopyIcon />}
            sx={{ bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' }, textTransform: 'none', fontWeight: 700 }}
          >
            Duplicar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Importar empleados existentes ── */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 3 } }}
      >
        <DialogTitle sx={{ color: '#fff', fontWeight: 700, pb: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GroupAddIcon sx={{ color: '#a5d6a7' }} />
            Importar empleados existentes
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', mb: 2 }}>
            Selecciona empleados de otros organigramas para añadirlos a este tablero.
          </Typography>
          <TextField
            fullWidth size="small"
            placeholder="Buscar por nombre, cargo o departamento…"
            value={importSearch}
            onChange={e => setImportSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }} /></InputAdornment> }}
            sx={{
              mb: 1.5,
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.18)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.35)' },
              },
            }}
          />
          {importLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} sx={{ color: '#a5d6a7' }} />
            </Box>
          ) : (
            <List dense sx={{ maxHeight: 360, overflowY: 'auto', mx: -1 }}>
              {importWorkers
                .filter(w => {
                  const q = importSearch.toLowerCase();
                  return !q || (w.nombre || '').toLowerCase().includes(q) ||
                    (w.cargo || '').toLowerCase().includes(q) ||
                    (w.departamento || '').toLowerCase().includes(q) ||
                    (w.board_nombre || '').toLowerCase().includes(q);
                })
                .map(w => {
                  const wId = w.rut || w.id;
                  const checked = importSelected.includes(wId);
                  return (
                    <ListItem key={wId} disablePadding>
                      <ListItemButton
                        onClick={() => setImportSelected(prev => checked ? prev.filter(x => x !== wId) : [...prev, wId])}
                        dense
                        sx={{ borderRadius: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}
                      >
                        <Checkbox
                          size="small"
                          checked={checked}
                          icon={<CheckBoxBlankIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }} />}
                          checkedIcon={<CheckBoxIcon sx={{ color: '#a5d6a7', fontSize: 18 }} />}
                          tabIndex={-1}
                          disableRipple
                        />
                        <ListItemAvatar sx={{ minWidth: 44 }}>
                          <Avatar
                            src={w.foto_url ? getStaticFileURL(w.foto_url) : undefined}
                            sx={{ width: 32, height: 32, fontSize: '0.75rem', bgcolor: PALETTE[Math.abs((w.nombre || '').charCodeAt(0) || 0) % PALETTE.length] }}
                          >
                            {(w.nombre || '?')[0].toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={<Typography sx={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>{w.nombre}</Typography>}
                          secondary={
                            <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.73rem' }}>
                              {[w.cargo, w.departamento].filter(Boolean).join(' · ')}
                              {w.board_nombre && <> &nbsp;·&nbsp; <span style={{ color: 'rgba(165,214,167,0.7)' }}>{w.board_nombre}</span></>}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              {!importLoading && importWorkers.filter(w => {
                const q = importSearch.toLowerCase();
                return !q || (w.nombre || '').toLowerCase().includes(q) ||
                  (w.cargo || '').toLowerCase().includes(q) ||
                  (w.departamento || '').toLowerCase().includes(q) ||
                  (w.board_nombre || '').toLowerCase().includes(q);
              }).length === 0 && (
                <Box sx={{ py: 4, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
                  {importWorkers.length === 0 ? 'No hay empleados disponibles en otros organigramas' : 'Sin resultados para esa búsqueda'}
                </Box>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', mr: 'auto' }}>
            {importSelected.length > 0 ? `${importSelected.length} seleccionado${importSelected.length !== 1 ? 's' : ''}` : ''}
          </Typography>
          <Button onClick={() => setImportDialogOpen(false)} sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            onClick={handleImportWorkers}
            disabled={importSelected.length === 0}
            variant="contained"
            sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' }, textTransform: 'none', fontWeight: 700 }}
          >
            Importar {importSelected.length > 0 ? `(${importSelected.length})` : ''}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snack */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snack.sev} variant="filled" onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
