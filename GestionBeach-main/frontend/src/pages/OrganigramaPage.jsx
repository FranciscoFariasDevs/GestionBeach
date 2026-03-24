// frontend/src/pages/OrganigramaPage.jsx
// Organigrama interactivo: drag & drop, zoom, pan, fotos, export PNG/PDF
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Paper, Typography, Button, IconButton, TextField,
  Avatar, Tooltip, CircularProgress, Snackbar, Alert,
  Chip, Divider, Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  AccountTree as OrgIcon,
  Save as SaveIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  FitScreen as FitIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
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
} from '@mui/icons-material';
import api, { getStaticFileURL } from '../api/api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const NODE_W = 180;
const NODE_H = 210;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;
const SNAP_THRESHOLD = 12; // canvas pixels

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
  const H_GAP = 50;
  const V_GAP = 90;
  const START_X = 60;
  const START_Y = 60;

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

// Calcula los mejores puntos de conexión entre dos nodos según su posición relativa
function getBestEdgePoints(parent, child) {
  const pCX = parent.pos_x + NODE_W / 2, pCY = parent.pos_y + NODE_H / 2;
  const cCX = child.pos_x  + NODE_W / 2, cCY = child.pos_y  + NODE_H / 2;
  const dx = cCX - pCX, dy = cCY - pCY;
  if (Math.abs(dy) >= Math.abs(dx)) {
    // Más vertical → conectar por arriba/abajo
    return dy >= 0
      ? { x1: pCX, y1: parent.pos_y + NODE_H, x2: cCX, y2: child.pos_y,          dir: 'v' }
      : { x1: pCX, y1: parent.pos_y,           x2: cCX, y2: child.pos_y + NODE_H, dir: 'v' };
  } else {
    // Más horizontal → conectar por los lados
    return dx >= 0
      ? { x1: parent.pos_x + NODE_W, y1: pCY, x2: child.pos_x,          y2: cCY, dir: 'h' }
      : { x1: parent.pos_x,          y1: pCY, x2: child.pos_x + NODE_W, y2: cCY, dir: 'h' };
  }
}

function NodeCard({ node, isSelected, onMouseDown, onHoverChange, onStartConnect, isConnecting, isDropTarget }) {
  const fotoUrl = node.foto_url ? getStaticFileURL(node.foto_url) : null;
  const color = node.color || '#1565c0';
  const [hovered, setHovered] = useState(false);
  const showHandles = hovered || isConnecting;

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
        height: NODE_H + 10, // incluye zona del handle inferior
        userSelect: 'none',
        cursor: isConnecting ? 'crosshair' : 'grab',
        zIndex: isSelected ? 10 : 5,
        '&:active': { cursor: isConnecting ? 'crosshair' : 'grabbing' },
        filter: isDropTarget
          ? 'drop-shadow(0 0 14px #f57c00)'
          : isSelected ? `drop-shadow(0 0 10px ${color}99)` : 'none',
        transition: 'filter 0.2s',
      }}
    >
      <Paper
        elevation={isSelected ? 10 : 3}
        sx={{
          borderRadius: '14px',
          overflow: 'hidden',
          height: NODE_H,
          display: 'flex',
          flexDirection: 'column',
          border: isDropTarget
            ? '2.5px solid #f57c00'
            : isSelected ? `2.5px solid ${color}` : '2px solid #e0e0e0',
          transition: 'all 0.2s',
          background: '#ffffff',
        }}
      >
        {/* Foto ocupa la mayor parte de la tarjeta */}
        {fotoUrl ? (
          <Box sx={{
            width: '100%', height: 130, overflow: 'hidden',
            position: 'relative',
          }}>
            <Box
              component="img"
              src={fotoUrl}
              alt={node.nombre}
              sx={{
                width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: 'top',
                display: 'block',
              }}
            />
            {/* Franja de color en el borde inferior de la foto */}
            <Box sx={{ position:'absolute', bottom:0, left:0, right:0, height:4, background: color }}/>
          </Box>
        ) : (
          <Box sx={{
            width: '100%', height: 100,
            background: `linear-gradient(135deg, ${color}22 0%, ${color}44 100%)`,
            display:'flex', alignItems:'center', justifyContent:'center',
            borderBottom: `4px solid ${color}`,
          }}>
            <Avatar sx={{
              width: 70, height: 70,
              bgcolor: color, fontSize: 28, fontWeight: 'bold',
              boxShadow: `0 4px 14px ${color}66`,
              border: '3px solid white',
            }}>
              {node.nombre?.[0]?.toUpperCase() || '?'}
            </Avatar>
          </Box>
        )}

        {/* Texto compacto debajo */}
        <Box sx={{
          px: 1.5, py: 0.8,
          flex: 1,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.3,
        }}>
          {/* Nombre */}
          <Typography
            variant="subtitle2" fontWeight="bold" textAlign="center"
            sx={{ lineHeight: 1.2, color: '#1a1a2e', fontSize: '0.8rem', maxWidth: '100%' }}
            title={node.nombre}
          >
            {node.nombre || 'Sin nombre'}
          </Typography>

          {/* Cargo */}
          {node.cargo && (
            <Typography variant="caption" textAlign="center"
              sx={{ color: color, fontWeight: 700, fontSize: '0.66rem', lineHeight: 1.1 }}
              title={node.cargo}
            >
              {node.cargo}
            </Typography>
          )}

          {/* Departamento */}
          {node.departamento && (
            <Chip label={node.departamento} size="small" sx={{
              fontSize: '0.57rem', height: 16,
              bgcolor: `${color}18`, color: color,
              fontWeight: 700, maxWidth: NODE_W - 20,
              border: `1px solid ${color}44`,
            }}/>
          )}
        </Box>
      </Paper>

      {/* Handles de conexión estilo Lucidchart */}
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

function EdgesLayer({ nodes, peerLinks, connectingLine, selectedEdge, onEdgeClick }) {
  const hierEdges = nodes.flatMap(node => {
    if (!node.parent_id) return [];
    const parent = nodes.find(n => n.id === node.parent_id);
    if (!parent) return [];
    const { x1, y1, x2, y2, dir } = getBestEdgePoints(parent, node);
    let d, mid;
    if (dir === 'h') {
      const dx = Math.abs(x2 - x1) * 0.5;
      const cx1 = x1 + Math.sign(x2 - x1) * dx, cx2 = x2 - Math.sign(x2 - x1) * dx;
      d = `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;
      mid = bezierMid(x1, y1, cx1, y1, cx2, y2, x2, y2);
    } else {
      const dy = Math.abs(y2 - y1) * 0.45;
      const cy1 = y1 + Math.sign(y2 - y1) * dy, cy2 = y2 - Math.sign(y2 - y1) * dy;
      d = `M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`;
      mid = bezierMid(x1, y1, x1, cy1, x2, cy2, x2, y2);
    }
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
    const [x1, y1, x2, y2] = (a.pos_x + NODE_W) < b.pos_x
      ? [a.pos_x + NODE_W, aMidY, b.pos_x, bMidY]
      : (b.pos_x + NODE_W) < a.pos_x
        ? [b.pos_x + NODE_W, bMidY, a.pos_x, aMidY]
        : [a.pos_x + NODE_W / 2, a.pos_y + NODE_H, b.pos_x + NODE_W / 2, b.pos_y + NODE_H];
    const mx = (x1 + x2) / 2;
    const mid = bezierMid(x1, y1, mx, y1, mx, y2, x2, y2);
    return [{
      key: `p-${link.id}`,
      linkId: link.id,
      d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`,
      mid,
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
        {PALETTE.map(c => (
          <marker key={c} id={`arr-${c.slice(1)}`} markerWidth="8" markerHeight="6"
            refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={c} opacity="0.7" />
          </marker>
        ))}
        <marker id="arr-default" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#90a4ae" opacity="0.7" />
        </marker>
        <marker id="arr-peer" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#f57c00" opacity="0.8"/>
        </marker>
      </defs>

      {/* Relaciones jerárquicas (padre → hijo) */}
      {hierEdges.map(e => {
        const isSel = selectedEdge?.type === 'hier' && selectedEdge?.id === e.nodeId;
        const markerId = PALETTE.includes(e.color) ? `arr-${e.color.slice(1)}` : 'arr-default';
        return (
          <g key={e.key}>
            <path d={e.d} fill="none"
              stroke={isSel ? '#2196f3' : e.color}
              strokeWidth={isSel ? 3.5 : 2.5}
              strokeOpacity={isSel ? 1 : 0.65}
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

      {/* Relaciones de par (mismo nivel) — línea punteada naranja */}
      {peerEdges.map(e => {
        const isSel = selectedEdge?.type === 'peer' && selectedEdge?.id === e.linkId;
        return (
          <g key={e.key}>
            <path d={e.d} fill="none"
              stroke={isSel ? '#2196f3' : '#f57c00'}
              strokeWidth={isSel ? 3 : 2}
              strokeOpacity={isSel ? 1 : 0.8}
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
  const CROP_W = NODE_W;   // 180
  const CROP_H = 130;
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
    const canvas = document.createElement('canvas');
    canvas.width = CROP_W;
    canvas.height = CROP_H;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      img,
      -pos.x / scale, -pos.y / scale,
      CROP_W / scale, CROP_H / scale,
      0, 0, CROP_W, CROP_H
    );
    canvas.toBlob(blob => onConfirm(blob), 'image/jpeg', 0.93);
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
  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ w: width, h: height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [resN, resR] = await Promise.all([
        api.get('/organigrama'),
        api.get('/organigrama/relaciones'),
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
      const res = await api.get('/organigrama');
      if (res.data.success) setNodes(res.data.nodos);
    } catch {
      toast('Error al cargar organigrama', 'error');
    }
  };

  const toast = (msg, sev = 'success') => setSnack({ open: true, msg, sev });

  // ── Peer connection helpers ────────────────
  const createPeerLink = useCallback(async (fromId, toId) => {
    try {
      const res = await api.post('/organigrama/relaciones', { nodo_a: fromId, nodo_b: toId });
      if (res.data.success) {
        setPeerLinks(prev => {
          const exists = prev.some(l => l.id === res.data.relacion.id);
          return exists ? prev : [...prev, res.data.relacion];
        });
        toast('Relación creada');
      }
    } catch { toast('Error al crear relación', 'error'); }
  }, []);

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
      const res = await api.post('/organigrama/guardar', { nodos: nodes });
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
    const PAD   = 40;
    const OX    = bounds.minX - PAD;
    const OY    = bounds.minY - PAD;
    const W     = bounds.width  + NODE_W + PAD * 2;
    const H     = bounds.height + NODE_H + PAD * 2;
    const SCALE = 2;

    await new Promise(r => setTimeout(r, 120));

    // 1. Canvas final — fondo degradado sereno
    const final = document.createElement('canvas');
    final.width  = W * SCALE;
    final.height = H * SCALE;
    const ctx = final.getContext('2d');

    // Fondo: degradado vertical suave (azul muy claro → blanco cálido)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, final.height);
    bgGrad.addColorStop(0,   '#eef3fb');
    bgGrad.addColorStop(0.5, '#f7f9fe');
    bgGrad.addColorStop(1,   '#f0f5f0');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, final.width, final.height);

    // Patrón de puntos sutiles (grid)
    ctx.save();
    ctx.globalAlpha = 0.06;
    for (let gx = 0; gx < final.width; gx += 28 * SCALE) {
      for (let gy = 0; gy < final.height; gy += 28 * SCALE) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1.2 * SCALE, 0, Math.PI * 2);
        ctx.fillStyle = '#4a6fa5';
        ctx.fill();
      }
    }
    ctx.restore();

    // 2. Dibujar líneas elegantes en canvas
    ctx.save();
    ctx.scale(SCALE, SCALE);
    ctx.translate(-OX, -OY);

    // Punta de flecha elegante: delgada y refinada
    const drawArrowTip = (ex, ey, cp2x, cp2y, color) => {
      const angle = Math.atan2(ey - cp2y, ex - cp2x);
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(angle - Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-4, -9);
      ctx.lineTo(0, -6);   // muesca interior → flecha tipo "chevron"
      ctx.lineTo(4, -9);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.restore();
    };

    // Dibuja una línea elegante con sombra difuminada
    const drawElegantLine = (path, color, lineWidth, alpha, dashed = false) => {
      // Sombra sutil
      ctx.save();
      ctx.shadowColor = 'rgba(30,60,120,0.10)';
      ctx.shadowBlur  = 6;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 2;
      ctx.beginPath();
      path();
      ctx.strokeStyle = color;
      ctx.lineWidth   = lineWidth;
      ctx.globalAlpha = alpha;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      if (dashed) ctx.setLineDash([6, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    };

    // ── Relaciones jerárquicas — usa getBestEdgePoints igual que el SVG ──
    nodes.forEach(node => {
      if (!node.parent_id) return;
      const parent = nodes.find(n => n.id === node.parent_id);
      if (!parent) return;
      const { x1, y1, x2, y2, dir } = getBestEdgePoints(parent, node);
      const color = node.color || '#90a4ae';

      let cp1x, cp1y, cp2x, cp2y;
      if (dir === 'h') {
        const dx = Math.abs(x2 - x1) * 0.5;
        cp1x = x1 + Math.sign(x2 - x1) * dx; cp1y = y1;
        cp2x = x2 - Math.sign(x2 - x1) * dx; cp2y = y2;
      } else {
        const dy = Math.abs(y2 - y1) * 0.45;
        cp1x = x1; cp1y = y1 + Math.sign(y2 - y1) * dy;
        cp2x = x2; cp2y = y2 - Math.sign(y2 - y1) * dy;
      }

      drawElegantLine(
        () => { ctx.moveTo(x1, y1); ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2); },
        color, 2, 0.7
      );
      if (!node.sin_flecha) drawArrowTip(x2, y2, cp2x, cp2y, color);
    });

    // ── Peer links — línea punteada elegante ──
    (peerLinks || []).forEach(link => {
      const a = nodes.find(n => n.id === Number(link.nodo_a));
      const b = nodes.find(n => n.id === Number(link.nodo_b));
      if (!a || !b) return;
      const aMidY = a.pos_y + NODE_H / 2, bMidY = b.pos_y + NODE_H / 2;
      const [x1, y1, x2, y2] = (a.pos_x + NODE_W) < b.pos_x
        ? [a.pos_x + NODE_W, aMidY, b.pos_x,          bMidY]
        : (b.pos_x + NODE_W) < a.pos_x
          ? [b.pos_x + NODE_W, bMidY, a.pos_x,         aMidY]
          : [a.pos_x + NODE_W / 2, a.pos_y + NODE_H, b.pos_x + NODE_W / 2, b.pos_y + NODE_H];
      const mx = (x1 + x2) / 2;

      drawElegantLine(
        () => { ctx.moveTo(x1, y1); ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2); },
        '#e07000', 1.5, 0.75, true
      );
      if (!link.sin_flecha) drawArrowTip(x2, y2, mx, y2, '#e07000');
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

  // ── Export PDF ────────────────────────────
  const exportPDF = async () => {
    try {
      const canvas = await buildExportCanvas();
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2],
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
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

  return (
    <Box sx={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', bgcolor: '#f0f4fa' }}>

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
            Organigrama Empresarial
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

        <Box sx={{ flex: 1 }} />

        {/* Save / Export */}
        <Tooltip title="Exportar PNG">
          <IconButton onClick={exportPNG} size="small" sx={{ color: '#80cbc4' }}>
            <DownloadIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Exportar PDF">
          <IconButton onClick={exportPDF} size="small" sx={{ color: '#ef9a9a' }}>
            <PdfIcon />
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
            background: 'radial-gradient(circle at 50% 50%, #e8edf5 0%, #dce3f0 100%)',
            backgroundImage: `
              radial-gradient(circle at 50% 50%, #e8edf5 0%, #dce3f0 100%),
              repeating-linear-gradient(0deg, transparent, transparent 39px, #c8d0e044 40px),
              repeating-linear-gradient(90deg, transparent, transparent 39px, #c8d0e044 40px)
            `,
          }}
        >
          {/* Grid pattern */}
          <Box sx={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(180,195,220,0.35) 40px),
              repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(180,195,220,0.35) 40px)
            `,
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

            {/* Edges SVG */}
            <EdgesLayer
              nodes={nodes}
              peerLinks={peerLinks}
              connectingLine={connecting}
              selectedEdge={selectedEdge}
              onEdgeClick={setSelectedEdge}
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

      {/* Delete confirm */}
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
