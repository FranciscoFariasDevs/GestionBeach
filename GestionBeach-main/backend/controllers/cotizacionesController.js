/**
 * backend/controllers/cotizacionesController.js
 * Módulo de Cotizaciones — flujo: Jefe crea → Gerente aprueba/rechaza → Finanzas recibe
 */

const { sql, poolPromise } = require('../config/db');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// ─── Upload de fotos de ítems ────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', 'uploads', 'cotizaciones');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename:    (_req, file,  cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `foto_${Date.now()}${ext}`);
  }
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  cb(null, allowed.includes(file.mimetype));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
exports.uploadFoto = upload.single('foto');

// ─── Perfiles que pueden aprobar (Gerencia + Admin + SuperAdmin) ─────────────
const PERFILES_GERENTE  = [11];      // Solo Gerencia puede aprobar/rechazar
const PERFILES_FINANZAS = [12];      // Finanzas: ve solo aprobadas
const PERFILES_ADMIN    = [10, 16];  // SuperAdmin/Admin: ven todo pero no aprueban
const PERFILES_CREADOR  = [10, 14];  // SuperAdmin + Jefes de Local pueden crear

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Emite una notificación a todos los clientes; el frontend filtra por rol/id */
function notificar(req, evento, data) {
  const io = req.app.get('io');
  if (io) io.emit(evento, data);
}

/** Obtiene todos los usuarios de ciertos perfiles para incluirlos en la notificación */
async function getUsuariosPorPerfiles(pool, perfilesIds) {
  const r = await pool.request()
    .query(`
      SELECT id, nombre_completo AS nombre
      FROM usuarios
      WHERE perfil_id IN (${perfilesIds.join(',')})
    `);
  return r.recordset;
}

// ─── SUBIR FOTO DE ÍTEM ──────────────────────────────────────────────────────
exports.subirFoto = (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No se recibió imagen' });
  const url = `/uploads/cotizaciones/${req.file.filename}`;
  res.json({ success: true, url });
};

// ─── CREAR COTIZACIÓN ────────────────────────────────────────────────────────
exports.crearCotizacion = async (req, res) => {
  try {
    const { asunto, descripcion, items } = req.body;
    const usuario = req.user;

    if (!asunto || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Asunto e ítems son requeridos' });
    }

    // Calcular total
    const total = items.reduce((sum, item) => {
      const subtotal = (Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0);
      return sum + subtotal;
    }, 0);

    const pool = await poolPromise;

    // Insertar cotización
    const cotResult = await pool.request()
      .input('asunto',           sql.NVarChar(200), asunto)
      .input('descripcion',      sql.NVarChar(sql.MAX), descripcion || '')
      .input('creado_por',       sql.Int, usuario.id)
      .input('creado_por_nombre',sql.NVarChar(100), usuario.nombre || usuario.username)
      .input('sucursal_nombre',  sql.NVarChar(100), usuario.sucursal || '')
      .input('total',            sql.Decimal(18, 2), total)
      .query(`
        INSERT INTO cotizaciones
          (asunto, descripcion, creado_por, creado_por_nombre, sucursal_nombre, total)
        OUTPUT INSERTED.id
        VALUES
          (@asunto, @descripcion, @creado_por, @creado_por_nombre, @sucursal_nombre, @total)
      `);

    const cotizacionId = cotResult.recordset[0].id;

    // Insertar ítems
    for (const item of items) {
      const subtotal = (Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0);
      await pool.request()
        .input('cotizacion_id',   sql.Int, cotizacionId)
        .input('producto',        sql.NVarChar(200), item.producto || '')
        .input('destino',         sql.NVarChar(200), item.destino || null)
        .input('foto_url',        sql.NVarChar(500), item.foto_url || null)
        .input('link',            sql.NVarChar(500), item.link || null)
        .input('cantidad',        sql.Int, Number(item.cantidad) || 1)
        .input('precio_unitario', sql.Decimal(18, 2), Number(item.precio_unitario) || 0)
        .input('subtotal',        sql.Decimal(18, 2), subtotal)
        .query(`
          INSERT INTO cotizacion_items
            (cotizacion_id, producto, destino, foto_url, link, cantidad, precio_unitario, subtotal)
          VALUES
            (@cotizacion_id, @producto, @destino, @foto_url, @link, @cantidad, @precio_unitario, @subtotal)
        `);
    }

    // Obtener gerentes para notificar
    const gerentes = await getUsuariosPorPerfiles(pool, [...PERFILES_GERENTE, ...PERFILES_ADMIN]);

    // Notificar en tiempo real
    notificar(req, 'nueva_cotizacion', {
      cotizacion_id:    cotizacionId,
      asunto,
      creado_por_nombre: usuario.nombre || usuario.username,
      sucursal_nombre:  usuario.sucursal || '',
      total,
      para_usuarios:    gerentes.map(u => u.id),
      para_roles:       [...PERFILES_GERENTE, ...PERFILES_ADMIN],
    });

    console.log(`✅ Cotización #${cotizacionId} creada por ${usuario.nombre || usuario.username}`);
    res.status(201).json({ success: true, id: cotizacionId, message: 'Cotización enviada al gerente' });

  } catch (error) {
    console.error('❌ Error al crear cotización:', error);
    res.status(500).json({ success: false, message: 'Error al crear cotización', error: error.message });
  }
};

// ─── LISTAR COTIZACIONES ─────────────────────────────────────────────────────
exports.getCotizaciones = async (req, res) => {
  try {
    const usuario  = req.user;
    const perfilId = usuario.perfilId;
    const pool     = await poolPromise;

    let whereClause = '';

    // Gerentes y admins ven todas; finanzas solo las aprobadas; creadores solo las suyas
    if ([...PERFILES_ADMIN].includes(perfilId)) {
      whereClause = ''; // ven todas
    } else if (PERFILES_GERENTE.includes(perfilId)) {
      whereClause = ''; // ven todas para poder aprobar
    } else if (PERFILES_FINANZAS.includes(perfilId)) {
      whereClause = "WHERE c.estado IN ('aprobada', 'comprado', 'anulado')";
    } else {
      whereClause = `WHERE c.creado_por = ${usuario.id}`;
    }

    const result = await pool.request().query(`
      SELECT
        c.id, c.asunto, c.estado, c.creado_por_nombre, c.sucursal_nombre,
        c.aprobado_por_nombre, c.fecha_creacion, c.fecha_respuesta,
        c.total, c.motivo_rechazo,
        (SELECT COUNT(*) FROM cotizacion_items ci WHERE ci.cotizacion_id = c.id) AS num_items,
        STUFF((SELECT DISTINCT ', ' + ci2.destino
               FROM cotizacion_items ci2
               WHERE ci2.cotizacion_id = c.id AND ci2.destino IS NOT NULL AND ci2.destino != ''
               FOR XML PATH(''), TYPE).value('.','NVARCHAR(MAX)'), 1, 2, '') AS destinos
      FROM cotizaciones c
      ${whereClause}
      ORDER BY c.fecha_creacion DESC
    `);

    res.json({ success: true, data: result.recordset });

  } catch (error) {
    console.error('❌ Error al obtener cotizaciones:', error);
    res.status(500).json({ success: false, message: 'Error al obtener cotizaciones', error: error.message });
  }
};

// ─── VER UNA COTIZACIÓN CON SUS ÍTEMS ───────────────────────────────────────
exports.getCotizacionById = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario  = req.user;
    const perfilId = usuario.perfilId;
    const pool     = await poolPromise;

    const cotResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM cotizaciones WHERE id = @id');

    if (cotResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Cotización no encontrada' });
    }

    const cotizacion = cotResult.recordset[0];

    // Verificar acceso: creador, gerente, finanzas (solo aprobadas), admin
    const esCreador  = cotizacion.creado_por === usuario.id;
    const esGerente  = [...PERFILES_GERENTE, ...PERFILES_ADMIN].includes(perfilId);
    const esFinanzas = PERFILES_FINANZAS.includes(perfilId) && cotizacion.estado === 'aprobada';

    if (!esCreador && !esGerente && !esFinanzas) {
      return res.status(403).json({ success: false, message: 'Sin acceso a esta cotización' });
    }

    const itemsResult = await pool.request()
      .input('cotizacion_id', sql.Int, id)
      .query('SELECT * FROM cotizacion_items WHERE cotizacion_id = @cotizacion_id ORDER BY id');

    res.json({
      success: true,
      data: {
        ...cotizacion,
        items: itemsResult.recordset
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener cotización:', error);
    res.status(500).json({ success: false, message: 'Error al obtener cotización', error: error.message });
  }
};

// ─── APROBAR COTIZACIÓN ──────────────────────────────────────────────────────
exports.aprobarCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario  = req.user;
    const perfilId = usuario.perfilId;

    if (!PERFILES_GERENTE.includes(perfilId)) {
      return res.status(403).json({ success: false, message: 'Solo Gerencia puede aprobar cotizaciones' });
    }

    const pool = await poolPromise;

    const cotResult = await pool.request()
      .input('id', sql.Int, id)
      .query("SELECT * FROM cotizaciones WHERE id = @id");

    if (cotResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Cotización no encontrada' });
    }

    const cot = cotResult.recordset[0];
    if (cot.estado !== 'pendiente') {
      return res.status(400).json({ success: false, message: `La cotización ya está ${cot.estado}` });
    }

    await pool.request()
      .input('id',                 sql.Int, id)
      .input('aprobado_por',       sql.Int, usuario.id)
      .input('aprobado_por_nombre',sql.NVarChar(100), usuario.nombre || usuario.username)
      .query(`
        UPDATE cotizaciones
        SET estado = 'aprobada',
            aprobado_por = @aprobado_por,
            aprobado_por_nombre = @aprobado_por_nombre,
            fecha_respuesta = GETDATE()
        WHERE id = @id
      `);

    // Obtener usuarios de finanzas para notificar
    const finanzas = await getUsuariosPorPerfiles(pool, PERFILES_FINANZAS);

    // Notificar al creador
    notificar(req, 'cotizacion_aprobada', {
      cotizacion_id:       id,
      asunto:              cot.asunto,
      aprobado_por_nombre: usuario.nombre || usuario.username,
      para_usuario:        cot.creado_por,
      para_roles:          PERFILES_FINANZAS,
      para_usuarios:       [cot.creado_por, ...finanzas.map(u => u.id)],
    });

    console.log(`✅ Cotización #${id} aprobada por ${usuario.nombre || usuario.username}`);
    res.json({ success: true, message: 'Cotización aprobada. Finanzas fue notificada.' });

  } catch (error) {
    console.error('❌ Error al aprobar cotización:', error);
    res.status(500).json({ success: false, message: 'Error al aprobar cotización', error: error.message });
  }
};

// ─── RECHAZAR COTIZACIÓN ─────────────────────────────────────────────────────
exports.rechazarCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const usuario  = req.user;
    const perfilId = usuario.perfilId;

    if (!PERFILES_GERENTE.includes(perfilId)) {
      return res.status(403).json({ success: false, message: 'Solo Gerencia puede rechazar cotizaciones' });
    }

    if (!motivo || motivo.trim() === '') {
      return res.status(400).json({ success: false, message: 'Debe indicar el motivo del rechazo' });
    }

    const pool = await poolPromise;

    const cotResult = await pool.request()
      .input('id', sql.Int, id)
      .query("SELECT * FROM cotizaciones WHERE id = @id");

    if (cotResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Cotización no encontrada' });
    }

    const cot = cotResult.recordset[0];
    if (cot.estado !== 'pendiente') {
      return res.status(400).json({ success: false, message: `La cotización ya está ${cot.estado}` });
    }

    await pool.request()
      .input('id',                 sql.Int, id)
      .input('motivo',             sql.NVarChar(sql.MAX), motivo)
      .input('aprobado_por',       sql.Int, usuario.id)
      .input('aprobado_por_nombre',sql.NVarChar(100), usuario.nombre || usuario.username)
      .query(`
        UPDATE cotizaciones
        SET estado = 'rechazada',
            motivo_rechazo = @motivo,
            aprobado_por = @aprobado_por,
            aprobado_por_nombre = @aprobado_por_nombre,
            fecha_respuesta = GETDATE()
        WHERE id = @id
      `);

    // Notificar al creador
    notificar(req, 'cotizacion_rechazada', {
      cotizacion_id:       id,
      asunto:              cot.asunto,
      motivo,
      aprobado_por_nombre: usuario.nombre || usuario.username,
      para_usuario:        cot.creado_por,
      para_usuarios:       [cot.creado_por],
    });

    console.log(`✅ Cotización #${id} rechazada por ${usuario.nombre || usuario.username}`);
    res.json({ success: true, message: 'Cotización rechazada. El solicitante fue notificado.' });

  } catch (error) {
    console.error('❌ Error al rechazar cotización:', error);
    res.status(500).json({ success: false, message: 'Error al rechazar cotización', error: error.message });
  }
};

// ─── MARCAR COMO COMPRADO (solo Finanzas) ────────────────────────────────────
exports.comprarCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario  = req.user;
    const perfilId = usuario.perfilId;

    if (!PERFILES_FINANZAS.includes(perfilId)) {
      return res.status(403).json({ success: false, message: 'Solo Finanzas puede marcar como comprado' });
    }

    const pool = await poolPromise;
    const cotResult = await pool.request().input('id', sql.Int, id).query('SELECT * FROM cotizaciones WHERE id = @id');
    if (cotResult.recordset.length === 0)
      return res.status(404).json({ success: false, message: 'Cotización no encontrada' });

    const cot = cotResult.recordset[0];
    if (cot.estado !== 'aprobada')
      return res.status(400).json({ success: false, message: `Solo se pueden marcar como compradas las cotizaciones aprobadas (estado actual: ${cot.estado})` });

    await pool.request()
      .input('id', sql.Int, id)
      .input('nombre', sql.NVarChar(100), usuario.nombre || usuario.username)
      .query(`
        UPDATE cotizaciones
        SET estado = 'comprado', aprobado_por_nombre = @nombre, fecha_respuesta = GETDATE()
        WHERE id = @id
      `);

    notificar(req, 'cotizacion_comprada', {
      cotizacion_id: id, asunto: cot.asunto,
      para_usuarios: [cot.creado_por],
    });

    console.log(`✅ Cotización #${id} marcada como COMPRADO por ${usuario.nombre || usuario.username}`);
    res.json({ success: true, message: 'Cotización marcada como comprada.' });

  } catch (error) {
    console.error('❌ Error al marcar como comprado:', error);
    res.status(500).json({ success: false, message: 'Error al marcar como comprado', error: error.message });
  }
};

// ─── ANULAR COTIZACIÓN (solo Finanzas) ───────────────────────────────────────
exports.anularCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const usuario  = req.user;
    const perfilId = usuario.perfilId;

    if (!PERFILES_FINANZAS.includes(perfilId)) {
      return res.status(403).json({ success: false, message: 'Solo Finanzas puede anular cotizaciones' });
    }

    const pool = await poolPromise;
    const cotResult = await pool.request().input('id', sql.Int, id).query('SELECT * FROM cotizaciones WHERE id = @id');
    if (cotResult.recordset.length === 0)
      return res.status(404).json({ success: false, message: 'Cotización no encontrada' });

    const cot = cotResult.recordset[0];
    if (cot.estado !== 'aprobada')
      return res.status(400).json({ success: false, message: `Solo se pueden anular cotizaciones aprobadas (estado actual: ${cot.estado})` });

    await pool.request()
      .input('id', sql.Int, id)
      .input('motivo', sql.NVarChar(sql.MAX), motivo || '')
      .input('nombre', sql.NVarChar(100), usuario.nombre || usuario.username)
      .query(`
        UPDATE cotizaciones
        SET estado = 'anulado', motivo_rechazo = @motivo,
            aprobado_por_nombre = @nombre, fecha_respuesta = GETDATE()
        WHERE id = @id
      `);

    notificar(req, 'cotizacion_anulada', {
      cotizacion_id: id, asunto: cot.asunto, motivo,
      para_usuarios: [cot.creado_por],
    });

    console.log(`✅ Cotización #${id} ANULADA por ${usuario.nombre || usuario.username}`);
    res.json({ success: true, message: 'Cotización anulada.' });

  } catch (error) {
    console.error('❌ Error al anular cotización:', error);
    res.status(500).json({ success: false, message: 'Error al anular cotización', error: error.message });
  }
};
