import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../api/api';
import { useAuth } from '../contexts/AuthContext';
import { getStaticFileURL } from '../api/api';

// ─── Paleta roja + glassmorphism ────────────────────────────────────────────
const R = {
  red:       '#ef233c',
  redDark:   '#d90429',
  redLight:  '#ff6b81',
  redGlow:   'rgba(239,35,60,0.18)',
  bg:        'linear-gradient(135deg, #ffeaea 0%, #fff0f0 40%, #ffe4e4 100%)',
  glass:     'rgba(255,255,255,0.55)',
  glassDark: 'rgba(255,255,255,0.35)',
  glassBorder:'rgba(239,35,60,0.18)',
  glassBorderBright:'rgba(239,35,60,0.45)',
  text:      '#2b2d42',
  textMid:   '#6b7280',
  textLight: '#9ca3af',
  shadow:    '0 8px 32px rgba(239,35,60,0.10), 0 2px 8px rgba(0,0,0,0.08)',
  shadowHov: '0 16px 48px rgba(239,35,60,0.18), 0 4px 16px rgba(0,0,0,0.12)',
};

const COL_CFG = {
  'Por Hacer': { color: '#6c757d', bg: 'rgba(108,117,125,0.08)', dot: '#adb5bd' },
  'En Curso':  { color: R.red,    bg: 'rgba(239,35,60,0.07)',   dot: R.red    },
  'Listo':     { color: '#2dc653', bg: 'rgba(45,198,83,0.07)',   dot: '#2dc653'},
};

const PRIORIDAD_CFG = {
  critica: { color: '#ef233c', bg: 'rgba(239,35,60,0.1)',  label: 'Crítica'  },
  alta:    { color: '#f97316', bg: 'rgba(249,115,22,0.1)', label: 'Alta'     },
  media:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', label: 'Media'    },
  baja:    { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  label: 'Baja'     },
};

const fmtDate = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
};
const isOverdue = (d) => d && new Date(d) < new Date();

// ─── Glass card base ─────────────────────────────────────────────────────────
const glassStyle = (extra = {}) => ({
  background: R.glass,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: `1px solid ${R.glassBorder}`,
  borderRadius: 16,
  boxShadow: R.shadow,
  ...extra,
});

// ─── Avatar ──────────────────────────────────────────────────────────────────
function Avatar({ foto, nombre, size = 30 }) {
  const url = foto ? getStaticFileURL(foto) : null;
  const initials = (nombre || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid ${R.red}`,
      overflow: 'hidden', flexShrink: 0,
      background: R.redGlow,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: R.red,
      boxShadow: `0 0 0 2px rgba(239,35,60,0.15)`,
    }}>
      {url
        ? <img src={url} alt={nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.target.style.display = 'none'; }} />
        : initials}
    </div>
  );
}

// ─── Modal confirmar con contraseña ──────────────────────────────────────────
function ModalConfirmPassword({ open, onClose, onConfirm, mensaje, username }) {
  const [pass, setPass]     = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (open) { setPass(''); setError(''); } }, [open]);

  const handleConfirm = async () => {
    if (!pass) { setError('Ingresa tu contraseña'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/login', { username, password: pass });
      onConfirm();
      onClose();
    } catch {
      setError('Contraseña incorrecta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(43,45,66,0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            onClick={e => e.stopPropagation()}
            style={{ ...glassStyle(), background: 'rgba(255,255,255,0.93)', width: 380, maxWidth: '95vw', padding: 28, boxShadow: `0 24px 64px rgba(239,35,60,0.18)` }}
          >
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔒</div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: R.text, marginBottom: 6 }}>Confirmar eliminación</div>
              {mensaje && <div style={{ fontSize: '0.82rem', color: R.textMid, lineHeight: 1.4 }}>{mensaje}</div>}
            </div>
            <div style={{ marginBottom: 14 }}>
              <Label>Ingresa tu contraseña</Label>
              <input
                type="password"
                value={pass}
                onChange={e => setPass(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                autoFocus
                placeholder="••••••••"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.7)',
                  border: `1.5px solid ${error ? R.red : 'rgba(239,35,60,0.2)'}`,
                  borderRadius: 10, padding: '9px 13px',
                  fontSize: '0.88rem', color: R.text, outline: 'none', fontFamily: 'inherit',
                }}
              />
              {error && <div style={{ fontSize: '0.75rem', color: R.red, marginTop: 5, fontWeight: 600 }}>{error}</div>}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <RedButton secondary onClick={onClose} style={{ flex: 1 }}>Cancelar</RedButton>
              <RedButton onClick={handleConfirm} disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Verificando...' : 'Eliminar'}
              </RedButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Modal glassmorphism ──────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, width = 500 }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(43,45,66,0.45)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            style={{
              ...glassStyle(),
              background: 'rgba(255,255,255,0.85)',
              width, maxWidth: '95vw', maxHeight: '88vh',
              overflowY: 'auto', padding: 28,
              boxShadow: `0 24px 64px rgba(239,35,60,0.14), 0 4px 24px rgba(0,0,0,0.1)`,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ color: R.red, fontWeight: 800, fontSize: '1rem', letterSpacing: '0.01em' }}>
                {title}
              </span>
              <button onClick={onClose} style={{
                background: 'rgba(239,35,60,0.08)', border: 'none', borderRadius: 8,
                color: R.red, width: 28, height: 28, cursor: 'pointer',
                fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Input / Select glassmorphism ─────────────────────────────────────────────
function GlassInput({ value, onChange, placeholder, type = 'text', multiline, rows = 3, style }) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <Tag
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={multiline ? rows : undefined}
      style={{
        width: '100%', boxSizing: 'border-box',
        background: 'rgba(255,255,255,0.7)',
        border: `1.5px solid rgba(239,35,60,0.2)`,
        borderRadius: 10, padding: '9px 13px',
        fontSize: '0.88rem', color: R.text,
        outline: 'none', resize: multiline ? 'vertical' : 'none',
        transition: 'border-color 0.2s',
        fontFamily: 'inherit',
        ...style,
      }}
      onFocus={e => { e.target.style.borderColor = R.red; e.target.style.boxShadow = `0 0 0 3px ${R.redGlow}`; }}
      onBlur={e => { e.target.style.borderColor = 'rgba(239,35,60,0.2)'; e.target.style.boxShadow = 'none'; }}
    />
  );
}

function GlassSelect({ value, onChange, children, style }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        width: '100%', boxSizing: 'border-box',
        background: 'rgba(255,255,255,0.7)',
        border: `1.5px solid rgba(239,35,60,0.2)`,
        borderRadius: 10, padding: '9px 13px',
        fontSize: '0.88rem', color: R.text,
        outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </select>
  );
}

// ─── Botón rojo ──────────────────────────────────────────────────────────────
function RedButton({ children, onClick, disabled, secondary, small, style }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.03 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      style={{
        background: secondary
          ? 'rgba(239,35,60,0.06)'
          : disabled ? '#e5e7eb' : `linear-gradient(135deg, ${R.red}, ${R.redDark})`,
        border: secondary ? `1.5px solid ${R.glassBorder}` : 'none',
        color: disabled ? '#9ca3af' : secondary ? R.red : '#fff',
        padding: small ? '6px 14px' : '9px 22px',
        fontSize: small ? '0.78rem' : '0.86rem',
        fontWeight: 700,
        borderRadius: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: !secondary && !disabled ? `0 4px 14px ${R.redGlow}` : 'none',
        letterSpacing: '0.01em',
        ...style,
      }}
    >
      {children}
    </motion.button>
  );
}

// ─── Label de formulario ──────────────────────────────────────────────────────
const Label = ({ children }) => (
  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: R.textMid, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
    {children}
  </div>
);

// ─── Buscador de usuarios ─────────────────────────────────────────────────────
function UserSearchPicker({ todos, seleccionados, onChange }) {
  const [search, setSearch] = useState('');
  const filtrados = todos.filter(u =>
    (u.nombre || '').toLowerCase().includes(search.toLowerCase())
  );
  const toggle = (id) => onChange(seleccionados.includes(id)
    ? seleccionados.filter(x => x !== id)
    : [...seleccionados, id]
  );
  return (
    <div>
      <GlassInput
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar usuario..."
        style={{ marginBottom: 8 }}
      />
      <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filtrados.map(u => {
          const sel = seleccionados.includes(u.id);
          return (
            <motion.div
              key={u.id}
              onClick={() => toggle(u.id)}
              whileHover={{ scale: 1.01 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 10px', borderRadius: 10, cursor: 'pointer',
                background: sel ? 'rgba(239,35,60,0.08)' : 'rgba(255,255,255,0.5)',
                border: `1.5px solid ${sel ? R.red : 'rgba(0,0,0,0.06)'}`,
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: 4,
                border: `2px solid ${sel ? R.red : '#d1d5db'}`,
                background: sel ? R.red : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.15s',
              }}>
                {sel && <span style={{ color: 'white', fontSize: 10, fontWeight: 900 }}>✓</span>}
              </div>
              <Avatar foto={u.foto_perfil} nombre={u.nombre} size={28} />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: R.text }}>{u.nombre}</div>
                <div style={{ fontSize: '0.72rem', color: R.textLight }}>{u.username || ''}</div>
              </div>
            </motion.div>
          );
        })}
        {filtrados.length === 0 && (
          <div style={{ textAlign: 'center', padding: '16px', color: R.textLight, fontSize: '0.82rem' }}>
            Sin resultados
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Add card inline ──────────────────────────────────────────────────────────
function InlineAddCard({ columnaId, miembros, todos, onSave, onCancel }) {
  const [titulo, setTitulo]     = useState('');
  const [prioridad, setPrioridad] = useState('media');
  const [asignado, setAsignado]   = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSave = () => {
    if (!titulo.trim()) return;
    onSave({
      columna_id: columnaId,
      titulo: titulo.trim(),
      prioridad,
      asignado_a: asignado ? Number(asignado) : null,
    });
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); }
    if (e.key === 'Escape') onCancel();
  };

  const miembrosMap = new Map(miembros.map(m => [m.usuario_id, m]));
  todos.forEach(u => { if (!miembrosMap.has(u.id)) miembrosMap.set(u.id, { usuario_id: u.id, nombre: u.nombre || u.nombre_completo, foto_perfil: u.foto_perfil }); });
  const miembrosDisp = Array.from(miembrosMap.values()).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      style={{
        ...glassStyle(),
        background: 'rgba(255,255,255,0.85)',
        padding: '12px 14px',
        marginBottom: 8,
      }}
    >
      <textarea
        ref={inputRef}
        value={titulo}
        onChange={e => setTitulo(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Título de la tarea... (Enter para guardar)"
        rows={2}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'transparent', border: 'none',
          borderBottom: `2px solid ${R.red}`,
          fontSize: '0.86rem', color: R.text, resize: 'none',
          outline: 'none', padding: '4px 0', marginBottom: 10,
          fontFamily: 'inherit',
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <GlassSelect value={prioridad} onChange={e => setPrioridad(e.target.value)} style={{ flex: 1 }}>
          <option value="baja">🟢 Baja</option>
          <option value="media">🔵 Media</option>
          <option value="alta">🟠 Alta</option>
          <option value="critica">🔴 Crítica</option>
        </GlassSelect>
        <GlassSelect value={asignado} onChange={e => setAsignado(e.target.value)} style={{ flex: 1 }}>
          <option value="">Sin asignar</option>
          {miembrosDisp.map(m => (
            <option key={m.usuario_id} value={m.usuario_id}>{m.nombre}</option>
          ))}
        </GlassSelect>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <RedButton small onClick={handleSave} disabled={!titulo.trim()}>Agregar</RedButton>
        <RedButton small secondary onClick={onCancel}>Cancelar</RedButton>
      </div>
    </motion.div>
  );
}

// ─── Card de tarea ───────────────────────────────────────────────────────────
function TareaCard({ tarea, index, miembros, todos, onEdit, onDelete }) {
  const pCfg = PRIORIDAD_CFG[tarea.prioridad] || PRIORIDAD_CFG.media;
  const overdue = isOverdue(tarea.fecha_vencimiento);
  const asignado = miembros.find(m => m.usuario_id === tarea.asignado_a)
    || (tarea.asignado_a ? todos.find(u => u.id === tarea.asignado_a) : null);

  return (
    <Draggable draggableId={String(tarea.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            ...glassStyle({
              background: snapshot.isDragging
                ? 'rgba(255,255,255,0.92)'
                : 'rgba(255,255,255,0.72)',
              boxShadow: snapshot.isDragging
                ? `0 20px 60px rgba(239,35,60,0.2), 0 4px 16px rgba(0,0,0,0.14)`
                : R.shadow,
              borderLeft: `3.5px solid ${pCfg.color}`,
              borderRadius: 12,
              padding: '11px 13px',
              marginBottom: 8,
              cursor: snapshot.isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
            }),
          }}
        >
          {/* Prioridad + acciones */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 7 }}>
            <span style={{
              fontSize: '0.62rem', fontWeight: 700,
              color: pCfg.color, background: pCfg.bg,
              padding: '2px 8px', borderRadius: 20,
            }}>{pCfg.label}</span>
            <div style={{ display: 'flex', gap: 2 }}>
              <button
                onClick={e => { e.stopPropagation(); onEdit(tarea); }}
                style={{ background: 'none', border: 'none', color: R.textLight, cursor: 'pointer', fontSize: 13, padding: '2px 4px', borderRadius: 4, transition: 'color 0.15s' }}
                onMouseEnter={e => e.target.style.color = R.red}
                onMouseLeave={e => e.target.style.color = R.textLight}
              >✎</button>
              <button
                onClick={e => { e.stopPropagation(); onDelete(tarea.id); }}
                style={{ background: 'none', border: 'none', color: R.textLight, cursor: 'pointer', fontSize: 13, padding: '2px 4px', borderRadius: 4, transition: 'color 0.15s' }}
                onMouseEnter={e => e.target.style.color = R.red}
                onMouseLeave={e => e.target.style.color = R.textLight}
              >✕</button>
            </div>
          </div>

          {/* Título */}
          <div style={{ fontSize: '0.87rem', fontWeight: 600, color: R.text, marginBottom: 6, lineHeight: 1.45 }}>
            {tarea.titulo}
          </div>

          {/* Descripción truncada */}
          {tarea.descripcion && (
            <div style={{
              fontSize: '0.75rem', color: R.textMid, lineHeight: 1.4, marginBottom: 8,
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>{tarea.descripcion}</div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {tarea.fecha_vencimiento ? (
                <span style={{
                  fontSize: '0.68rem', fontWeight: 600,
                  color: overdue ? R.red : R.textLight,
                  background: overdue ? 'rgba(239,35,60,0.08)' : 'transparent',
                  padding: overdue ? '2px 6px' : '0', borderRadius: 6,
                }}>
                  {overdue ? '⚠ ' : '📅 '}{fmtDate(tarea.fecha_vencimiento)}
                </span>
              ) : null}
              {tarea.creador_nombre && (
                <span style={{ fontSize: '0.62rem', color: R.textLight }}>
                  ✏ {tarea.creador_nombre.split(' ')[0]}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {asignado && (
                <div title={`Asignado: ${asignado.nombre}`}>
                  <Avatar foto={asignado.foto_perfil} nombre={asignado.nombre} size={26} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ─── Modal crear/editar tarea ─────────────────────────────────────────────────
function ModalTarea({ open, onClose, columnas, miembros, todos, onSave, tarea }) {
  const [form, setForm] = useState({ columna_id: '', titulo: '', descripcion: '', prioridad: 'media', asignado_a: '', fecha_vencimiento: '' });

  useEffect(() => {
    if (!open) return;
    if (tarea) {
      setForm({
        columna_id: tarea.columna_id || '',
        titulo: tarea.titulo || '',
        descripcion: tarea.descripcion || '',
        prioridad: tarea.prioridad || 'media',
        asignado_a: tarea.asignado_a || '',
        fecha_vencimiento: tarea.fecha_vencimiento ? tarea.fecha_vencimiento.split('T')[0] : '',
      });
    } else {
      setForm(f => ({ ...f, columna_id: columnas[0]?.id || '', titulo: '', descripcion: '', asignado_a: '', fecha_vencimiento: '' }));
    }
  }, [open, tarea, columnas]);

  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }));
  // Combinar miembros del tablero + resto de usuarios (todos pueden ser asignados)
  const miembrosMap = new Map(miembros.map(m => [m.usuario_id, m]));
  todos.forEach(u => { if (!miembrosMap.has(u.id)) miembrosMap.set(u.id, { usuario_id: u.id, nombre: u.nombre || u.nombre_completo, foto_perfil: u.foto_perfil }); });
  const miembrosDisp = Array.from(miembrosMap.values()).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

  return (
    <Modal open={open} onClose={onClose} title={tarea ? 'Editar Tarea' : 'Nueva Tarea'} width={520}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <Label>Columna</Label>
            <GlassSelect value={form.columna_id} onChange={e => fld('columna_id', e.target.value)}>
              {columnas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </GlassSelect>
          </div>
          <div>
            <Label>Prioridad</Label>
            <GlassSelect value={form.prioridad} onChange={e => fld('prioridad', e.target.value)}>
              <option value="baja">🟢 Baja</option>
              <option value="media">🔵 Media</option>
              <option value="alta">🟠 Alta</option>
              <option value="critica">🔴 Crítica</option>
            </GlassSelect>
          </div>
        </div>
        <div>
          <Label>Título *</Label>
          <GlassInput value={form.titulo} onChange={e => fld('titulo', e.target.value)} placeholder="¿Qué hay que hacer?" />
        </div>
        <div>
          <Label>Descripción</Label>
          <GlassInput value={form.descripcion} onChange={e => fld('descripcion', e.target.value)} placeholder="Detalles adicionales..." multiline rows={3} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <Label>Asignar a</Label>
            <GlassSelect value={form.asignado_a} onChange={e => fld('asignado_a', e.target.value)}>
              <option value="">— Sin asignar —</option>
              {miembrosDisp.map(m => <option key={m.usuario_id} value={m.usuario_id}>{m.nombre}</option>)}
            </GlassSelect>
          </div>
          <div>
            <Label>Vencimiento</Label>
            <GlassInput type="date" value={form.fecha_vencimiento} onChange={e => fld('fecha_vencimiento', e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <RedButton secondary onClick={onClose}>Cancelar</RedButton>
          <RedButton onClick={() => { if (form.titulo.trim()) onSave({ ...form, columna_id: Number(form.columna_id), asignado_a: form.asignado_a ? Number(form.asignado_a) : null }); }} disabled={!form.titulo.trim()}>
            {tarea ? 'Guardar cambios' : 'Crear tarea'}
          </RedButton>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal crear board ────────────────────────────────────────────────────────
function ModalBoard({ open, onClose, todos, onSave }) {
  const [nombre, setNombre]         = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [selMiembros, setSelMiembros] = useState([]);

  useEffect(() => {
    if (open) { setNombre(''); setDescripcion(''); setSelMiembros([]); }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Nuevo Tablero" width={500}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <Label>Nombre *</Label>
          <GlassInput value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Sprint Abril, Proyecto X..." />
        </div>
        <div>
          <Label>Descripción</Label>
          <GlassInput value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Objetivo del tablero..." multiline rows={2} />
        </div>
        <div>
          <Label>Agregar miembros del equipo</Label>
          <UserSearchPicker todos={todos} seleccionados={selMiembros} onChange={setSelMiembros} />
          {selMiembros.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {selMiembros.map(id => {
                const u = todos.find(x => x.id === id);
                return u ? (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 5, background: R.redGlow, border: `1px solid ${R.glassBorder}`, borderRadius: 20, padding: '3px 10px 3px 5px' }}>
                    <Avatar foto={u.foto_perfil} nombre={u.nombre} size={20} />
                    <span style={{ fontSize: '0.75rem', color: R.red, fontWeight: 600 }}>{u.nombre.split(' ')[0]}</span>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
          <RedButton secondary onClick={onClose}>Cancelar</RedButton>
          <RedButton onClick={() => { if (nombre.trim()) onSave({ nombre, descripcion, color: R.red, miembros: selMiembros }); }} disabled={!nombre.trim()}>
            Crear tablero
          </RedButton>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal gestionar miembros ──────────────────────────────────────────────────
function ModalMiembros({ open, onClose, boardId, miembros, todos, onRefresh, creadorId }) {
  const [seleccionados, setSeleccionados] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setSeleccionados(miembros.map(m => m.usuario_id));
  }, [open, miembros]);

  // No permitir quitar al creador
  const handleChange = (nuevos) => {
    if (creadorId && !nuevos.includes(creadorId)) return;
    setSeleccionados(nuevos);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const actuales = miembros.map(m => m.usuario_id);
      const agregar  = seleccionados.filter(id => !actuales.includes(id));
      const quitar   = actuales.filter(id => !seleccionados.includes(id) && id !== creadorId);
      await Promise.all([
        ...agregar.map(id => api.post(`/kanban/${boardId}/miembros`, { usuario_id: id })),
        ...quitar.map(id => api.delete(`/kanban/${boardId}/miembros/${id}`)),
      ]);
      onRefresh();
      onClose();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Gestionar miembros" width={480}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: '0.82rem', color: R.textMid }}>
          Selecciona cualquier usuario del sistema para agregar al tablero.
        </div>
        <UserSearchPicker todos={todos} seleccionados={seleccionados} onChange={handleChange} />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <RedButton secondary onClick={onClose}>Cancelar</RedButton>
          <RedButton onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </RedButton>
        </div>
      </div>
    </Modal>
  );
}

// ─── Columna ──────────────────────────────────────────────────────────────────
function Columna({ columna, tareas, miembros, todos, onEditTarea, onDeleteTarea, onAddTarea }) {
  const [addOpen, setAddOpen] = useState(false);
  const cfg = COL_CFG[columna.nombre] || { color: R.red, bg: R.redGlow, dot: R.red };

  const handleSave = (form) => {
    onAddTarea({ ...form, columna_id: columna.id });
    setAddOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        width: 300, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        alignSelf: 'flex-start',
        minHeight: 200,
        ...glassStyle({ background: 'rgba(255,255,255,0.42)', borderRadius: 18, padding: '0 0 12px 0' }),
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 16px 12px',
        borderBottom: `1px solid rgba(0,0,0,0.06)`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: cfg.color }}>{columna.nombre}</span>
        </div>
        <span style={{
          fontSize: '0.72rem', fontWeight: 700,
          background: cfg.bg, color: cfg.color,
          padding: '2px 9px', borderRadius: 20,
        }}>{tareas.length}</span>
      </div>

      {/* Tareas droppable */}
      <Droppable droppableId={String(columna.id)}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              flex: 1, padding: '10px 10px 0',
              minHeight: 120,
              background: snapshot.isDraggingOver ? 'rgba(239,35,60,0.06)' : 'transparent',
              borderRadius: 12,
              transition: 'background 0.15s',
              overflowY: 'auto',
              maxHeight: 'calc(100vh - 260px)',
            }}
          >
            {tareas.map((t, i) => (
              <TareaCard
                key={t.id} tarea={t} index={i}
                miembros={miembros} todos={todos}
                onEdit={onEditTarea}
                onDelete={onDeleteTarea}
              />
            ))}

            {provided.placeholder}

            {addOpen && (
              <InlineAddCard
                columnaId={columna.id}
                miembros={miembros}
                todos={todos}
                onSave={handleSave}
                onCancel={() => setAddOpen(false)}
              />
            )}
          </div>
        )}
      </Droppable>

      {/* Botón + Agregar tarea */}
      {!addOpen && (
        <motion.button
          onClick={() => setAddOpen(true)}
          whileHover={{ scale: 1.02, background: 'rgba(239,35,60,0.08)' }}
          whileTap={{ scale: 0.98 }}
          style={{
            margin: '8px 10px 0',
            background: 'transparent',
            border: `1.5px dashed rgba(239,35,60,0.25)`,
            borderRadius: 10, padding: '8px',
            color: R.textLight, fontSize: '0.82rem',
            cursor: 'pointer', transition: 'all 0.18s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1, color: R.red }}>+</span>
          <span>Agregar tarea</span>
        </motion.button>
      )}
    </motion.div>
  );
}

// ─── Lobby de boards ──────────────────────────────────────────────────────────
function BoardsLobby({ boards, onSelect, onCreate, onDelete, loading }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ flex: 1, overflowY: 'auto', padding: '36px 40px' }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: R.red, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
              Gestión de proyectos
            </div>
            <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 900, color: R.text }}>
              Mis Tableros
            </h1>
          </div>
          <RedButton onClick={onCreate}>+ Nuevo tablero</RedButton>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${R.redGlow}`, borderTop: `3px solid ${R.red}` }} />
          </div>
        ) : boards.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📋</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: R.text, marginBottom: 6 }}>Sin tableros todavía</div>
            <div style={{ fontSize: '0.85rem', color: R.textLight }}>Crea el primer tablero para comenzar a organizar tareas</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 20 }}>
            <AnimatePresence>
              {boards.map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => onSelect(b)}
                  whileHover={{ y: -4, boxShadow: R.shadowHov }}
                  style={{
                    ...glassStyle({ background: 'rgba(255,255,255,0.65)', borderRadius: 18, padding: '22px 22px', cursor: 'pointer', position: 'relative' }),
                    borderTop: `4px solid ${b.color || R.red}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: b.color || R.red, boxShadow: `0 0 8px ${b.color || R.red}` }} />
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: R.text, flex: 1 }}>{b.nombre}</span>
                    <button
                      onClick={e => { e.stopPropagation(); onDelete(b); }}
                      title="Eliminar tablero"
                      style={{
                        background: 'rgba(239,35,60,0.08)', border: 'none', borderRadius: 7,
                        color: R.red, width: 26, height: 26, cursor: 'pointer',
                        fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,35,60,0.18)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,35,60,0.08)'}
                    >✕</button>
                  </div>
                  {b.descripcion && (
                    <div style={{ fontSize: '0.78rem', color: R.textMid, lineHeight: 1.4, marginBottom: 14, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {b.descripcion}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 18, borderTop: `1px solid rgba(0,0,0,0.06)`, paddingTop: 12, marginTop: 8 }}>
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: b.color || R.red }}>{b.total_tareas || 0}</div>
                      <div style={{ fontSize: '0.65rem', color: R.textLight, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tareas</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: b.color || R.red }}>{b.total_miembros || 0}</div>
                      <div style={{ fontSize: '0.65rem', color: R.textLight, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Miembros</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Vista del tablero ────────────────────────────────────────────────────────
function BoardView({ board, onBack, todos, openConfirm }) {
  const [columnas, setColumnas]   = useState([]);
  const [tareas, setTareas]       = useState([]);
  const [miembros, setMiembros]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modalTarea, setModalTarea] = useState({ open: false, tarea: null });
  const [modalMiembros, setModalMiembros] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [rCol, rTar, rMiem] = await Promise.all([
        api.get(`/kanban/${board.id}/columnas`),
        api.get(`/kanban/${board.id}/tareas`),
        api.get(`/kanban/${board.id}/miembros`),
      ]);
      setColumnas(rCol.data.columnas || []);
      setTareas(rTar.data.tareas || []);
      setMiembros(rMiem.data.miembros || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [board.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const tareasPorCol = (colId) =>
    tareas.filter(t => t.columna_id === colId).sort((a, b) => a.orden - b.orden);

  const handleDragEnd = async ({ source, destination, draggableId }) => {
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    const id = Number(draggableId);
    const colId = Number(destination.droppableId);
    setTareas(prev => prev.map(t => t.id === id ? { ...t, columna_id: colId, orden: destination.index } : t));
    try {
      await api.patch(`/kanban/tareas/${id}/mover`, { columna_id: colId, orden: destination.index });
    } catch { loadData(); }
  };

  const handleAddTarea = async (form) => {
    try {
      await api.post(`/kanban/${board.id}/tareas`, form);
      loadData();
    } catch (e) { console.error(e); }
  };

  const handleSaveTarea = async (form) => {
    try {
      if (modalTarea.tarea) {
        await api.put(`/kanban/tareas/${modalTarea.tarea.id}`, form);
      } else {
        await api.post(`/kanban/${board.id}/tareas`, form);
      }
      setModalTarea({ open: false, tarea: null });
      loadData();
    } catch (e) { console.error(e); }
  };

  const handleDelete = (id) => {
    openConfirm({
      open: true,
      mensaje: 'Se eliminará esta tarea permanentemente.',
      onConfirm: async () => {
        try {
          await api.delete(`/kanban/tareas/${id}`);
          setTareas(p => p.filter(t => t.id !== id));
        } catch (e) { console.error(e); }
      },
    });
  };

  const completadas = tareas.filter(t => {
    const col = columnas.find(c => c.id === t.columna_id);
    return col?.nombre === 'Listo';
  }).length;
  const pct = tareas.length > 0 ? Math.round(completadas / tareas.length * 100) : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        ...glassStyle({ background: 'rgba(255,255,255,0.6)', borderRadius: 0, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }),
        padding: '14px 28px', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <motion.button
          onClick={onBack}
          whileHover={{ x: -3 }}
          style={{ background: 'none', border: 'none', color: R.red, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          ← Tableros
        </motion.button>

        <div style={{ width: 1, height: 24, background: 'rgba(0,0,0,0.1)' }} />

        <div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: R.text }}>{board.nombre}</div>
          {board.descripcion && <div style={{ fontSize: '0.74rem', color: R.textMid }}>{board.descripcion}</div>}
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
          <div style={{ width: 120, height: 6, background: 'rgba(0,0,0,0.08)', borderRadius: 10, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ height: '100%', background: `linear-gradient(90deg, ${R.red}, #ff6b81)`, borderRadius: 10 }}
            />
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: R.red }}>{pct}%</span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Avatares */}
          <div style={{ display: 'flex' }}>
            {miembros.slice(0, 5).map((m, i) => (
              <div key={m.usuario_id} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 5 - i }}>
                <Avatar foto={m.foto_perfil} nombre={m.nombre} size={30} />
              </div>
            ))}
          </div>
          <RedButton small secondary onClick={() => setModalMiembros(true)}>
            + Miembros
          </RedButton>
          <RedButton small onClick={() => setModalTarea({ open: true, tarea: null })}>
            + Tarea
          </RedButton>
        </div>
      </div>

      {/* Tablero */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${R.redGlow}`, borderTop: `3px solid ${R.red}` }} />
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div style={{ flex: 1, overflowX: 'auto', overflowY: 'visible', padding: '24px 28px', display: 'flex', gap: 18, alignItems: 'flex-start' }}>
            {columnas.map(col => (
              <Columna
                key={col.id}
                columna={col}
                tareas={tareasPorCol(col.id)}
                miembros={miembros}
                todos={todos}
                onEditTarea={(t) => setModalTarea({ open: true, tarea: t })}
                onDeleteTarea={handleDelete}
                onAddTarea={handleAddTarea}
              />
            ))}
          </div>
        </DragDropContext>
      )}

      <ModalTarea
        open={modalTarea.open}
        onClose={() => setModalTarea({ open: false, tarea: null })}
        columnas={columnas}
        miembros={miembros}
        todos={todos}
        onSave={handleSaveTarea}
        tarea={modalTarea.tarea}
      />

      <ModalMiembros
        open={modalMiembros}
        onClose={() => setModalMiembros(false)}
        boardId={board.id}
        miembros={miembros}
        todos={todos}
        onRefresh={loadData}
        creadorId={board.creado_por}
      />
    </motion.div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function KanbanPage() {
  const { user } = useAuth();
  const [boards, setBoards]           = useState([]);
  const [todos, setTodos]             = useState([]);
  const [activeBoard, setActiveBoard] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [modalBoard, setModalBoard]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, mensaje: '', onConfirm: null });

  const loadBoards = useCallback(async () => {
    try {
      setLoading(true);
      const r = await api.get('/kanban');
      setBoards(r.data.boards || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadBoards(); }, [loadBoards]);
  useEffect(() => {
    api.get('/usuarios').then(r => setTodos(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const handleCreateBoard = async (form) => {
    try {
      await api.post('/kanban', form);
      setModalBoard(false);
      loadBoards();
    } catch (e) { console.error(e); }
  };

  const handleDeleteBoard = (board) => {
    setConfirmDelete({
      open: true,
      mensaje: `Se eliminará el tablero "${board.nombre}" y todas sus tareas permanentemente.`,
      onConfirm: async () => {
        try { await api.delete(`/kanban/${board.id}`); loadBoards(); } catch (e) { console.error(e); }
      },
    });
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; }
        select option { background: #fff; color: #2b2d42; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.04); }
        ::-webkit-scrollbar-thumb { background: rgba(239,35,60,0.25); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(239,35,60,0.45); }
      `}</style>

      <div style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        height: '100%', minHeight: '100vh', overflow: 'hidden',
        background: R.bg,
      }}>
        {/* Círculos de fondo decorativos */}
        <div style={{ position: 'fixed', top: -120, right: -120, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(239,35,60,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'fixed', bottom: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(239,35,60,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* TopBar */}
        <div style={{
          ...glassStyle({ background: 'rgba(255,255,255,0.7)', borderRadius: 0, boxShadow: '0 1px 0 rgba(239,35,60,0.1), 0 2px 12px rgba(0,0,0,0.04)' }),
          height: 52, flexShrink: 0, padding: '0 24px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${R.red}, ${R.redDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
            📋
          </div>
          <span style={{ fontWeight: 800, fontSize: '0.92rem', color: R.text }}>Kanban</span>
          <span style={{ color: R.textLight, fontSize: '0.8rem' }}>Beach Market</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar foto={user?.foto_perfil} nombre={user?.nombre} size={28} />
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: R.text }}>{user?.nombre?.split(' ')[0]}</span>
          </div>
        </div>

        {/* Contenido */}
        {activeBoard ? (
          <BoardView board={activeBoard} onBack={() => setActiveBoard(null)} todos={todos} openConfirm={setConfirmDelete} />
        ) : (
          <BoardsLobby boards={boards} onSelect={setActiveBoard} onCreate={() => setModalBoard(true)} onDelete={handleDeleteBoard} loading={loading} />
        )}
      </div>

      <ModalBoard open={modalBoard} onClose={() => setModalBoard(false)} todos={todos} onSave={handleCreateBoard} />
      <ModalConfirmPassword
        open={confirmDelete.open}
        onClose={() => setConfirmDelete(c => ({ ...c, open: false }))}
        onConfirm={confirmDelete.onConfirm || (() => {})}
        mensaje={confirmDelete.mensaje}
        username={user?.username}
      />
    </>
  );
}
