// backend/controllers/ticketController.js - SQL SERVER VERSION
const { sql, poolPromise } = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ioInstance = require('../config/ioInstance');

// Departamentos fijos del sistema
const DEPARTAMENTOS = [
  { id: 1, nombre: 'Electricidad',       color: '#FF9800', icono: 'ElectricBolt' },
  { id: 2, nombre: 'Informática',        color: '#2196F3', icono: 'Computer'     },
  { id: 3, nombre: 'Mantenciones',       color: '#4CAF50', icono: 'Build'        },
  { id: 4, nombre: 'Recursos Humanos',   color: '#9C27B0', icono: 'People'       },
  { id: 5, nombre: 'Finanzas',           color: '#F44336', icono: 'AccountBalance'},
];

// ============================================
// CONFIGURACIÓN DE MULTER PARA IMÁGENES
// ============================================
const uploadsDir = path.join(__dirname, '../uploads/tickets');

// Crear directorio si no existe
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Directorio uploads/tickets creado');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `ticket-${uniqueSuffix}${ext}`);
  }
});

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|heic|heif|bmp|tiff?|avif)$/i;

const fileFilter = (req, file, cb) => {
  const mimeOk = file.mimetype && file.mimetype.startsWith('image/');
  const extOk  = IMAGE_EXTENSIONS.test(path.extname(file.originalname || ''));
  if (mimeOk || extOk) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo imágenes (jpg, png, gif, webp)'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB máximo
});

// Middleware que captura errores de multer y devuelve JSON en vez de 500
exports.uploadMiddleware = (req, res, next) => {
  upload.single('imagen')(req, res, (err) => {
    if (!err) return next();
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const msg    = err.code === 'LIMIT_FILE_SIZE'
      ? 'La imagen supera el límite de 5 MB'
      : err.message || 'Error al procesar el archivo';
    return res.status(status).json({ success: false, message: msg });
  });
};

// ============================================
// FUNCIÓN AUXILIAR: Crear notificación
// ============================================
const crearNotificacion = async (pool, usuario_id, ticket_id, tipo, titulo, mensaje) => {
  try {
    await pool.request()
      .input('usuario_id', sql.Int, usuario_id)
      .input('ticket_id', sql.Int, ticket_id)
      .input('tipo', sql.VarChar(50), tipo)
      .input('titulo', sql.VarChar(255), titulo)
      .input('mensaje', sql.NVarChar(sql.MAX), mensaje)
      .query(`
        INSERT INTO ticket_notificaciones (usuario_id, ticket_id, tipo, titulo, mensaje)
        VALUES (@usuario_id, @ticket_id, @tipo, @titulo, @mensaje)
      `);

    // Emitir en tiempo real via Socket.IO
    const io = ioInstance.getIO();
    if (io) {
      io.to(`user_${usuario_id}`).emit('nueva_notificacion', {
        tipo,
        titulo,
        mensaje,
        ticket_id,
        ruta: '/mis-tickets',
        leida: false,
        fecha_creacion: new Date()
      });
    }

    // Enviar Web Push si el usuario tiene suscripción activa
    try {
      const subResult = await pool.request()
        .input('uid', sql.Int, usuario_id)
        .query(`SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE usuario_id = @uid AND activo = 1`);
      if (subResult.recordset.length > 0) {
        const webpush = require('web-push');
        webpush.setVapidDetails(
          process.env.VAPID_SUBJECT || 'mailto:soporte@beachmarket.cl',
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );
        const payload = JSON.stringify({ titulo, mensaje, ruta: '/mis-tickets' });
        for (const sub of subResult.recordset) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload
            );
          } catch (pushErr) {
            // Suscripción expirada → desactivar
            if (pushErr.statusCode === 410) {
              await pool.request()
                .input('ep', sql.VarChar(500), sub.endpoint)
                .query(`UPDATE push_subscriptions SET activo = 0 WHERE endpoint = @ep`);
            }
          }
        }
      }
    } catch (_) { /* no interrumpir si falla web push */ }

    // Enviar Expo Push Notification (app móvil)
    try {
      const expoResult = await pool.request()
        .input('uid', sql.Int, usuario_id)
        .query(`SELECT token FROM expo_push_tokens WHERE usuario_id = @uid AND activo = 1`);
      if (expoResult.recordset.length > 0) {
        const { Expo } = require('expo-server-sdk');
        const expo = new Expo();
        const messages = expoResult.recordset
          .filter(r => Expo.isExpoPushToken(r.token))
          .map(r => ({
            to: r.token,
            sound: 'default',
            title: titulo,
            body: mensaje,
            data: { ticket_id, tipo },
          }));
        if (messages.length > 0) {
          const chunks = expo.chunkPushNotifications(messages);
          for (const chunk of chunks) {
            try { await expo.sendPushNotificationsAsync(chunk); } catch (_) {}
          }
        }
      }
    } catch (_) { /* no interrumpir si falla expo push */ }

    console.log(`📬 Notificación creada para usuario ${usuario_id}: ${titulo}`);
  } catch (error) {
    console.error('Error al crear notificación:', error.message);
  }
};

// ============================================
// FUNCIÓN AUXILIAR: Notificar a SuperAdmins
// ============================================
const notificarSuperAdmins = async (pool, ticket_id, titulo, mensaje, excluirUsuarioId = null) => {
  try {
    // Obtener todos los SuperAdmins (perfil_id = 1)
    const adminsResult = await pool.request().query(`
      SELECT id FROM usuarios WHERE perfil_id = 1
    `);

    for (const admin of adminsResult.recordset) {
      // No notificar al mismo usuario que creó/respondió
      if (admin.id !== excluirUsuarioId) {
        await crearNotificacion(pool, admin.id, ticket_id, 'nuevo_ticket', titulo, mensaje);
      }
    }
  } catch (error) {
    console.error('Error al notificar a SuperAdmins:', error.message);
  }
};

// ============================================
// CREAR NUEVO TICKET (PÚBLICO)
// ============================================
exports.crearTicket = async (req, res) => {
  try {
    const pool = await poolPromise;

    console.log('📥 Datos recibidos en body:', req.body);
    console.log('👤 Usuario autenticado:', req.user);

    const {
      asunto,
      mensaje,
      prioridad = 'media',
      categoria
    } = req.body;

    // Verificar que el usuario esté autenticado
    if (!req.user) {
      console.error('❌ No hay usuario autenticado');
      return res.status(401).json({
        success: false,
        message: 'Debes estar autenticado para crear un ticket'
      });
    }

    // Obtener datos del usuario autenticado
    const usuario_id = req.user.id;
    const sucursal_id = req.user.sucursal_id || null;
    const nombre_reportante = req.user.nombre_completo || req.user.username;
    const email_reportante = null; // No se requiere email para usuarios autenticados
    const telefono_reportante = null;
    const departamento = null;

    // Obtener imagen si fue subida
    const imagen_url = req.file ? `/uploads/tickets/${req.file.filename}` : null;

    console.log('✅ Datos del ticket a crear:', { asunto, mensaje, prioridad, categoria, usuario_id, nombre_reportante, imagen_url });

    // Validaciones
    if (!asunto || !mensaje) {
      console.error('❌ Faltan campos obligatorios');
      return res.status(400).json({
        success: false,
        message: 'Asunto y mensaje son obligatorios'
      });
    }

    // Generar número de ticket usando el procedimiento almacenado
    const resultNumero = await pool.request()
      .output('nuevo_numero', sql.VarChar(20))
      .execute('generar_numero_ticket');

    const numero_ticket = resultNumero.output.nuevo_numero;

    // Obtener IP y User Agent
    const ip_origen = req.ip || req.connection.remoteAddress;
    const user_agent = req.headers['user-agent'];

    // Calcular fecha de vencimiento según prioridad
    let horas_vencimiento;
    switch (prioridad) {
      case 'critica': horas_vencimiento = 1; break;
      case 'alta': horas_vencimiento = 4; break;
      case 'media': horas_vencimiento = 24; break;
      case 'baja': horas_vencimiento = 72; break;
      default: horas_vencimiento = 24;
    }

    const fecha_vencimiento = new Date();
    fecha_vencimiento.setHours(fecha_vencimiento.getHours() + horas_vencimiento);

    // Insertar ticket (con imagen si existe)
    const result = await pool.request()
      .input('numero_ticket', sql.VarChar(20), numero_ticket)
      .input('asunto', sql.VarChar(255), asunto)
      .input('mensaje', sql.NVarChar(sql.MAX), mensaje)
      .input('usuario_id', sql.Int, usuario_id)
      .input('nombre_reportante', sql.VarChar(100), nombre_reportante)
      .input('email_reportante', sql.VarChar(100), email_reportante)
      .input('telefono_reportante', sql.VarChar(20), telefono_reportante)
      .input('sucursal_id', sql.Int, sucursal_id)
      .input('departamento', sql.VarChar(100), departamento)
      .input('prioridad', sql.VarChar(20), prioridad)
      .input('categoria', sql.VarChar(50), categoria)
      .input('fecha_vencimiento', sql.DateTime, fecha_vencimiento)
      .input('ip_origen', sql.VarChar(45), ip_origen)
      .input('user_agent', sql.NVarChar(sql.MAX), user_agent)
      .input('imagen_url', sql.VarChar(500), imagen_url)
      .query(`
        INSERT INTO tickets (
          numero_ticket, asunto, mensaje, usuario_id, nombre_reportante,
          email_reportante, telefono_reportante, sucursal_id, departamento,
          estado, prioridad, categoria, fecha_vencimiento, ip_origen, user_agent, imagen_url
        )
        OUTPUT INSERTED.id
        VALUES (
          @numero_ticket, @asunto, @mensaje, @usuario_id, @nombre_reportante,
          @email_reportante, @telefono_reportante, @sucursal_id, @departamento,
          'activo', @prioridad, @categoria, @fecha_vencimiento, @ip_origen, @user_agent, @imagen_url
        )
      `);

    const ticket_id = result.recordset[0].id;

    // Registrar en historial
    await pool.request()
      .input('ticket_id', sql.Int, ticket_id)
      .input('usuario_id', sql.Int, usuario_id)
      .input('accion', sql.VarChar(50), 'creado')
      .input('valor_nuevo', sql.VarChar(255), 'activo')
      .input('descripcion', sql.NVarChar(sql.MAX), 'Ticket creado')
      .query(`
        INSERT INTO ticket_historial (ticket_id, usuario_id, accion, valor_nuevo, descripcion)
        VALUES (@ticket_id, @usuario_id, @accion, @valor_nuevo, @descripcion)
      `);

    // 📬 Notificar a SuperAdmins sobre el nuevo ticket
    await notificarSuperAdmins(
      pool,
      ticket_id,
      `🎫 Nuevo ticket: ${numero_ticket}`,
      `${nombre_reportante} ha creado un ticket: "${asunto}" (Prioridad: ${prioridad})`,
      usuario_id  // No notificar al creador si es admin
    );

    res.status(201).json({
      success: true,
      message: 'Ticket creado exitosamente',
      ticket: {
        id: ticket_id,
        numero_ticket,
        asunto,
        estado: 'activo',
        prioridad,
        imagen_url
      }
    });

  } catch (error) {
    console.error('Error al crear ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el ticket',
      error: error.message
    });
  }
};

// ============================================
// OBTENER MIS TICKETS (PRIVADO)
// SuperAdmins ven todos, usuarios normales solo los suyos
// ============================================
exports.obtenerMisTickets = async (req, res) => {
  try {
    const pool = await poolPromise;
    const usuario_id = req.user.id;
    const { estado, limite = 50, pagina = 1 } = req.query;

    // Verificar si es admin
    const perfilNombre = req.user?.perfil || '';
    const perfilId = req.user?.perfilId;
    const esAdmin = perfilId === 1 ||
                    perfilNombre.toLowerCase().includes('superadmin') ||
                    perfilNombre.toLowerCase().includes('administrador');

    // Construir WHERE clause
    let whereConditions = [];
    const request = pool.request();

    // Si NO es admin, verificar si tiene departamentos asignados
    if (!esAdmin) {
      const deptResult = await pool.request()
        .input('uid', sql.Int, usuario_id)
        .query(`SELECT departamento_id FROM usuario_departamentos WHERE usuario_id = @uid`);
      const misDeptIds = deptResult.recordset.map(r => r.departamento_id);

      if (misDeptIds.length > 0) {
        // Usuario con departamentos: ve tickets de sus departamentos O creados por él
        const deptList = misDeptIds.join(',');
        whereConditions.push(`(t.usuario_id = @usuario_id OR EXISTS (
          SELECT 1 FROM ticket_dept_asignaciones tda
          WHERE tda.ticket_id = t.id AND tda.departamento_id IN (${deptList})
        ))`);
        request.input('usuario_id', sql.Int, usuario_id);
      } else {
        // Sin departamentos: solo sus propios tickets
        whereConditions.push('t.usuario_id = @usuario_id');
        request.input('usuario_id', sql.Int, usuario_id);
      }
    }

    if (estado && estado !== 'todos') {
      whereConditions.push('t.estado = @estado');
      request.input('estado', sql.VarChar(20), estado);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const offset = (pagina - 1) * limite;
    request.input('limite', sql.Int, parseInt(limite));
    request.input('offset', sql.Int, parseInt(offset));

    const result = await request.query(`
      SELECT * FROM (
        SELECT TOP (@limite + @offset)
          t.*,
          s.nombre as sucursal_nombre,
          u_asignado.nombre_completo as asignado_nombre,
          u_reportante.nombre_completo as reportante_nombre,
          u_resuelto.nombre_completo as resuelto_nombre,
          tc.nombre as categoria_nombre,
          tc.color as categoria_color,
          tc.icono as categoria_icono,
          (SELECT COUNT(*) FROM ticket_respuestas WHERE ticket_id = t.id) as num_respuestas,
          (SELECT COUNT(*) FROM ticket_respuestas WHERE ticket_id = t.id AND es_interno = 0) as num_respuestas_publicas,
          ROW_NUMBER() OVER (
            ORDER BY
              CASE t.prioridad
                WHEN 'critica' THEN 1
                WHEN 'alta' THEN 2
                WHEN 'media' THEN 3
                WHEN 'baja' THEN 4
              END,
              t.fecha_creacion DESC
          ) as RowNum
        FROM tickets t
        LEFT JOIN sucursales s ON t.sucursal_id = s.id
        LEFT JOIN usuarios u_asignado ON t.asignado_a = u_asignado.id
        LEFT JOIN usuarios u_reportante ON t.usuario_id = u_reportante.id
        LEFT JOIN usuarios u_resuelto ON t.resuelto_por = u_resuelto.id
        LEFT JOIN ticket_categorias tc ON t.categoria = tc.nombre
        ${whereClause}
      ) AS ResultadosConFilas
      WHERE RowNum > @offset
      ORDER BY RowNum
    `);

    // Obtener conteo total (con los mismos filtros)
    const countRequest = pool.request();
    if (!esAdmin) {
      countRequest.input('usuario_id', sql.Int, usuario_id);
    }
    if (estado && estado !== 'todos') {
      countRequest.input('estado', sql.VarChar(20), estado);
    }

    const countResult = await countRequest.query(`
      SELECT COUNT(*) as total FROM tickets t ${whereClause}
    `);

    res.json({
      success: true,
      tickets: result.recordset,
      pagination: {
        total: countResult.recordset[0].total,
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total_paginas: Math.ceil(countResult.recordset[0].total / limite)
      }
    });

  } catch (error) {
    console.error('Error al obtener tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tickets',
      error: error.message
    });
  }
};

// ============================================
// OBTENER TODOS LOS TICKETS (ADMIN)
// ============================================
exports.obtenerTodosLosTickets = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { estado, prioridad, categoria, busqueda, limite = 50, pagina = 1 } = req.query;

    let whereConditions = [];
    const request = pool.request();

    if (estado && estado !== 'todos') {
      whereConditions.push('t.estado = @estado');
      request.input('estado', sql.VarChar(20), estado);
    }

    if (prioridad) {
      whereConditions.push('t.prioridad = @prioridad');
      request.input('prioridad', sql.VarChar(20), prioridad);
    }

    if (categoria) {
      whereConditions.push('t.categoria = @categoria');
      request.input('categoria', sql.VarChar(50), categoria);
    }

    if (busqueda) {
      whereConditions.push('(t.numero_ticket LIKE @busqueda OR t.asunto LIKE @busqueda OR t.mensaje LIKE @busqueda OR t.nombre_reportante LIKE @busqueda)');
      request.input('busqueda', sql.VarChar(255), `%${busqueda}%`);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    const offset = (pagina - 1) * limite;

    request.input('limite', sql.Int, parseInt(limite));
    request.input('offset', sql.Int, parseInt(offset));

    const result = await request.query(`
      SELECT * FROM (
        SELECT TOP (@limite + @offset)
          t.*,
          s.nombre as sucursal_nombre,
          u_reportante.nombre_completo as reportante_nombre,
          u_asignado.nombre_completo as asignado_nombre,
          tc.nombre as categoria_nombre,
          tc.color as categoria_color,
          tc.icono as categoria_icono,
          (SELECT COUNT(*) FROM ticket_respuestas WHERE ticket_id = t.id) as num_respuestas,
          ROW_NUMBER() OVER (
            ORDER BY
              CASE t.estado
                WHEN 'activo' THEN 1
                WHEN 'en_proceso' THEN 2
                WHEN 'vencido' THEN 3
                WHEN 'resuelto' THEN 4
                WHEN 'cancelado' THEN 5
              END,
              CASE t.prioridad
                WHEN 'critica' THEN 1
                WHEN 'alta' THEN 2
                WHEN 'media' THEN 3
                WHEN 'baja' THEN 4
              END,
              t.fecha_creacion DESC
          ) as RowNum
        FROM tickets t
        LEFT JOIN sucursales s ON t.sucursal_id = s.id
        LEFT JOIN usuarios u_reportante ON t.usuario_id = u_reportante.id
        LEFT JOIN usuarios u_asignado ON t.asignado_a = u_asignado.id
        LEFT JOIN ticket_categorias tc ON t.categoria = tc.nombre
        ${whereClause}
      ) AS ResultadosConFilas
      WHERE RowNum > @offset
      ORDER BY RowNum
    `);

    // Conteo total
    const countRequest = pool.request();
    if (estado && estado !== 'todos') countRequest.input('estado', sql.VarChar(20), estado);
    if (prioridad) countRequest.input('prioridad', sql.VarChar(20), prioridad);
    if (categoria) countRequest.input('categoria', sql.VarChar(50), categoria);
    if (busqueda) countRequest.input('busqueda', sql.VarChar(255), `%${busqueda}%`);

    const countResult = await countRequest.query(`
      SELECT COUNT(*) as total FROM tickets t ${whereClause}
    `);

    res.json({
      success: true,
      tickets: result.recordset,
      pagination: {
        total: countResult.recordset[0].total,
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total_paginas: Math.ceil(countResult.recordset[0].total / limite)
      }
    });

  } catch (error) {
    console.error('Error al obtener todos los tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tickets',
      error: error.message
    });
  }
};

// ============================================
// OBTENER DETALLE DE UN TICKET
// ============================================
exports.obtenerDetalleTicket = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { id } = req.params;
    const usuario_id = req.user?.id;

    // Obtener ticket
    const ticketResult = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT
          t.*,
          s.nombre as sucursal_nombre,
          u_reportante.nombre_completo as reportante_nombre,
          u_asignado.nombre_completo as asignado_nombre,
          u_resuelto.nombre_completo as resuelto_nombre,
          tc.nombre as categoria_nombre,
          tc.color as categoria_color,
          tc.icono as categoria_icono
        FROM tickets t
        LEFT JOIN sucursales s ON t.sucursal_id = s.id
        LEFT JOIN usuarios u_reportante ON t.usuario_id = u_reportante.id
        LEFT JOIN usuarios u_asignado ON t.asignado_a = u_asignado.id
        LEFT JOIN usuarios u_resuelto ON t.resuelto_por = u_resuelto.id
        LEFT JOIN ticket_categorias tc ON t.categoria = tc.nombre
        WHERE t.id = @id
      `);

    if (ticketResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }

    const ticket = ticketResult.recordset[0];

    // Verificar permisos
    const perfilNombre = req.user?.perfil || '';
    const perfilId = req.user?.perfilId;
    const esAdmin = perfilId === 1 ||
                    perfilId === 11 ||   // Gerencia puede ver todos los tickets
                    perfilNombre.toLowerCase().includes('superadmin') ||
                    perfilNombre.toLowerCase().includes('administrador') ||
                    perfilNombre.toLowerCase().includes('gerencia');

    // Verificar si el usuario pertenece a algún departamento asignado al ticket
    let tieneAccesoDepto = false;
    if (!esAdmin) {
      try {
        const deptCheck = await pool.request()
          .input('tid', sql.Int, id)
          .input('uid', sql.Int, usuario_id)
          .query(`
            SELECT COUNT(*) as total
            FROM ticket_dept_asignaciones tda
            INNER JOIN usuario_departamentos ud ON ud.departamento_id = tda.departamento_id
            WHERE tda.ticket_id = @tid AND ud.usuario_id = @uid
          `);
        tieneAccesoDepto = deptCheck.recordset[0].total > 0;
      } catch (_) {
        tieneAccesoDepto = false;
      }
    }

    if (!esAdmin && ticket.usuario_id !== usuario_id && !tieneAccesoDepto) {
      console.log('🔒 Acceso denegado:', { perfilId, perfilNombre, usuario_id, ticket_usuario_id: ticket.usuario_id, tieneAccesoDepto });
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver este ticket'
      });
    }

    // Obtener respuestas
    let whereRespuestas = '';
    if (!esAdmin) {
      whereRespuestas = 'AND es_interno = 0';
    }

    const respuestasResult = await pool.request()
      .input('ticket_id', sql.Int, id)
      .query(`
        SELECT
          r.*,
          COALESCE(u.nombre_completo, r.nombre_usuario) as nombre_real
        FROM ticket_respuestas r
        LEFT JOIN usuarios u ON r.usuario_id = u.id
        WHERE r.ticket_id = @ticket_id ${whereRespuestas}
        ORDER BY r.fecha_creacion ASC
      `);

    // Obtener historial
    const historialResult = await pool.request()
      .input('ticket_id', sql.Int, id)
      .query(`
        SELECT
          h.*,
          u.nombre_completo as usuario_nombre
        FROM ticket_historial h
        LEFT JOIN usuarios u ON h.usuario_id = u.id
        WHERE h.ticket_id = @ticket_id
        ORDER BY h.fecha_cambio DESC
      `);

    res.json({
      success: true,
      ticket,
      respuestas: respuestasResult.recordset,
      historial: historialResult.recordset
    });

  } catch (error) {
    console.error('Error al obtener detalle del ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener detalle del ticket',
      error: error.message
    });
  }
};

// ============================================
// RESPONDER A UN TICKET (con soporte para imágenes)
// ============================================
exports.responderTicket = async (req, res) => {
  try {
    console.log('📥 RESPONDER - START:', {
      method: req.method,
      url: req.url,
      headers: { 'content-type': req.headers['content-type'] },
      hasFile: !!req.file,
      file: req.file ? { fieldname: req.file.fieldname, originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size, path: req.file.path } : null,
      body: req.body,
    });

    const pool = await poolPromise;
    const { id } = req.params;

    // Normalizar valores que vienen como string (multipart los envía así)
    const es_interno_raw = req.body.es_interno;
    const es_interno = es_interno_raw === 'true' || es_interno_raw === true || es_interno_raw === 1 || es_interno_raw === '1';
    const mensaje = req.body.mensaje ? String(req.body.mensaje).trim() : '';
    const usuario_id = req.user.id;
    const nombre_usuario = req.user.nombre_completo || req.user.username || 'Usuario';
    const imagen_url = req.file ? `/uploads/tickets/${req.file.filename}` : null;

    console.log('📥 RESPONDER - Datos normalizados:', { ticket_id: id, usuario_id, nombre_usuario, mensaje, imagen_url, es_interno });

    if (!mensaje && !imagen_url) {
      return res.status(400).json({
        success: false,
        message: 'Debes incluir un mensaje o una imagen'
      });
    }

    // Verificar que el ticket existe
    console.log('📥 RESPONDER - Paso 1: Verificando ticket...');
    const ticketResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM tickets WHERE id = @id');

    if (ticketResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }

    const ticket = ticketResult.recordset[0];
    console.log('📥 RESPONDER - Paso 2: Ticket encontrado:', ticket.numero_ticket);

    // Insertar respuesta (con imagen si existe)
    console.log('📥 RESPONDER - Paso 3: Insertando respuesta...');
    const result = await pool.request()
      .input('ticket_id', sql.Int, id)
      .input('usuario_id', sql.Int, usuario_id)
      .input('nombre_usuario', sql.VarChar(100), nombre_usuario)
      .input('mensaje', sql.NVarChar(sql.MAX), mensaje)
      .input('es_interno', sql.Bit, es_interno)
      .input('imagen_url', sql.VarChar(500), imagen_url)
      .query(`
        INSERT INTO ticket_respuestas (ticket_id, usuario_id, nombre_usuario, mensaje, es_interno, imagen_url)
        OUTPUT INSERTED.id
        VALUES (@ticket_id, @usuario_id, @nombre_usuario, @mensaje, @es_interno, @imagen_url)
      `);
    console.log('📥 RESPONDER - Paso 3: Respuesta insertada, id:', result.recordset[0].id);

    // Actualizar estado si estaba activo
    if (ticket.estado === 'activo') {
      console.log('📥 RESPONDER - Paso 4: Cambiando estado a en_proceso...');
      await pool.request()
        .input('id', sql.Int, id)
        .query(`UPDATE tickets SET estado = 'en_proceso' WHERE id = @id`);

      await pool.request()
        .input('ticket_id', sql.Int, id)
        .input('usuario_id', sql.Int, usuario_id)
        .query(`
          INSERT INTO ticket_historial (ticket_id, usuario_id, accion, valor_anterior, valor_nuevo)
          VALUES (@ticket_id, @usuario_id, 'estado_cambiado', 'activo', 'en_proceso')
        `);
    }

    // 📬 Notificar al reportante si la respuesta NO es interna y NO es del mismo usuario
    if (!es_interno && ticket.usuario_id !== usuario_id) {
      console.log('📥 RESPONDER - Paso 5: Notificando al reportante...');
      await crearNotificacion(
        pool,
        ticket.usuario_id,
        parseInt(id),
        'respuesta',
        `💬 Nueva respuesta en tu ticket ${ticket.numero_ticket}`,
        `${nombre_usuario} ha respondido a tu ticket: "${ticket.asunto}"`
      );
    }

    // 📬 Si el que responde es el usuario normal, notificar a los SuperAdmins
    if (ticket.usuario_id === usuario_id) {
      console.log('📥 RESPONDER - Paso 6: Notificando a SuperAdmins...');
      await notificarSuperAdmins(
        pool,
        parseInt(id),
        `💬 Respuesta del usuario en ${ticket.numero_ticket}`,
        `El usuario ha agregado información a su ticket: "${ticket.asunto}"`,
        usuario_id
      );
    }

    console.log('📥 RESPONDER - ÉXITO');
    res.json({
      success: true,
      message: 'Respuesta agregada exitosamente',
      respuesta_id: result.recordset[0].id
    });

  } catch (error) {
    console.error('❌ RESPONDER - ERROR:', error);
    console.error('❌ RESPONDER - Mensaje:', error.message);
    console.error('❌ RESPONDER - Stack:', error.stack);
    if (error.originalError) {
      console.error('❌ RESPONDER - SQL Error:', error.originalError);
    }
    res.status(500).json({
      success: false,
      message: 'Error al responder: ' + error.message,
      error: error.message
    });
  }
};

// ============================================
// CAMBIAR ESTADO DEL TICKET
// ============================================
exports.cambiarEstadoTicket = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { id } = req.params;
    const { estado, comentario } = req.body;
    const usuario_id = req.user.id;

    const estadosValidos = ['activo', 'en_proceso', 'resuelto', 'cancelado', 'vencido'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido'
      });
    }

    // Obtener estado actual y datos del ticket
    const ticketResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT estado, fecha_creacion, usuario_id, numero_ticket, asunto FROM tickets WHERE id = @id');

    if (ticketResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }

    const ticket = ticketResult.recordset[0];
    const estado_anterior = ticket.estado;

    // Actualizar estado
    const request = pool.request()
      .input('id', sql.Int, id)
      .input('estado', sql.VarChar(20), estado);

    let query = 'UPDATE tickets SET estado = @estado';

    if (estado === 'resuelto') {
      query += ', fecha_resolucion = GETDATE()';
      // Guardar quién resolvió el ticket
      query += `, resuelto_por = ${usuario_id}`;
      // Calcular tiempo de resolución
      const minutos = Math.floor((new Date() - new Date(ticket.fecha_creacion)) / 60000);
      query += `, tiempo_resolucion_minutos = ${minutos}`;
    }

    query += ' WHERE id = @id';
    await request.query(query);

    // Registrar en historial
    await pool.request()
      .input('ticket_id', sql.Int, id)
      .input('usuario_id', sql.Int, usuario_id)
      .input('valor_anterior', sql.VarChar(255), estado_anterior)
      .input('valor_nuevo', sql.VarChar(255), estado)
      .input('descripcion', sql.NVarChar(sql.MAX), comentario || null)
      .query(`
        INSERT INTO ticket_historial (ticket_id, usuario_id, accion, valor_anterior, valor_nuevo, descripcion)
        VALUES (@ticket_id, @usuario_id, 'estado_cambiado', @valor_anterior, @valor_nuevo, @descripcion)
      `);

    // 📬 Notificar al reportante sobre el cambio de estado
    if (ticket.usuario_id !== usuario_id) {
      let titulo, mensaje;
      if (estado === 'resuelto') {
        titulo = `✅ Tu ticket ${ticket.numero_ticket} ha sido resuelto`;
        mensaje = `Tu ticket "${ticket.asunto}" ha sido marcado como resuelto.`;
      } else if (estado === 'en_proceso') {
        titulo = `🔄 Tu ticket ${ticket.numero_ticket} está en proceso`;
        mensaje = `Tu ticket "${ticket.asunto}" está siendo atendido.`;
      } else if (estado === 'cancelado') {
        titulo = `❌ Tu ticket ${ticket.numero_ticket} ha sido cancelado`;
        mensaje = `Tu ticket "${ticket.asunto}" ha sido cancelado.`;
      } else {
        titulo = `📋 Actualización en ticket ${ticket.numero_ticket}`;
        mensaje = `El estado de tu ticket "${ticket.asunto}" cambió a: ${estado}`;
      }

      await crearNotificacion(
        pool,
        ticket.usuario_id,
        parseInt(id),
        'estado_cambiado',
        titulo,
        mensaje
      );
    }

    res.json({
      success: true,
      message: 'Estado actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error al cambiar estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado',
      error: error.message
    });
  }
};

// ============================================
// OBTENER NOTIFICACIONES DE TICKETS RESUELTOS (solo para el usuario que creó el ticket)
// ============================================
exports.obtenerNotificacionesTickets = async (req, res) => {
  try {
    const pool = await poolPromise;
    const usuario_id = req.user.id;

    // Obtener tickets resueltos del usuario que aún no han sido "leídos"
    // Consideramos "recientes" los resueltos en los últimos 7 días
    const result = await pool.request()
      .input('usuario_id', sql.Int, usuario_id)
      .query(`
        SELECT
          t.id,
          t.numero_ticket,
          t.asunto,
          t.estado,
          t.fecha_resolucion,
          u_resuelto.nombre_completo as resuelto_por_nombre
        FROM tickets t
        LEFT JOIN usuarios u_resuelto ON t.resuelto_por = u_resuelto.id
        WHERE t.usuario_id = @usuario_id
          AND t.estado = 'resuelto'
          AND t.fecha_resolucion >= DATEADD(day, -7, GETDATE())
        ORDER BY t.fecha_resolucion DESC
      `);

    res.json({
      success: true,
      notificaciones: result.recordset
    });

  } catch (error) {
    console.error('Error al obtener notificaciones de tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones',
      error: error.message
    });
  }
};

// ============================================
// ASIGNAR TICKET
// ============================================
exports.asignarTicket = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { id } = req.params;
    const { asignado_a } = req.body;
    const usuario_id = req.user.id;

    await pool.request()
      .input('id', sql.Int, id)
      .input('asignado_a', sql.Int, asignado_a)
      .query('UPDATE tickets SET asignado_a = @asignado_a WHERE id = @id');

    await pool.request()
      .input('ticket_id', sql.Int, id)
      .input('usuario_id', sql.Int, usuario_id)
      .input('asignado_a', sql.Int, asignado_a)
      .query(`
        INSERT INTO ticket_historial (ticket_id, usuario_id, accion, valor_nuevo)
        VALUES (@ticket_id, @usuario_id, 'asignado', @asignado_a)
      `);

    res.json({
      success: true,
      message: 'Ticket asignado exitosamente'
    });

  } catch (error) {
    console.error('Error al asignar ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error al asignar ticket',
      error: error.message
    });
  }
};

// ============================================
// OBTENER ESTADÍSTICAS
// ============================================
exports.obtenerEstadisticas = async (req, res) => {
  try {
    const pool = await poolPromise;
    const usuario_id = req.user.id;
    const perfilNombre = req.user?.perfil || '';
    const perfilId = req.user?.perfilId;
    const esAdmin = perfilId === 1 ||
                    perfilNombre.toLowerCase().includes('superadmin') ||
                    perfilNombre.toLowerCase().includes('administrador');

    let whereClause = '';
    if (!esAdmin) {
      whereClause = 'WHERE usuario_id = ' + usuario_id + ' OR asignado_a = ' + usuario_id;
    }

    const statsResult = await pool.request().query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as activos,
        SUM(CASE WHEN estado = 'en_proceso' THEN 1 ELSE 0 END) as en_proceso,
        SUM(CASE WHEN estado = 'resuelto' THEN 1 ELSE 0 END) as resueltos,
        SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) as cancelados,
        SUM(CASE WHEN estado = 'vencido' THEN 1 ELSE 0 END) as vencidos,
        SUM(CASE WHEN prioridad = 'critica' THEN 1 ELSE 0 END) as criticos,
        SUM(CASE WHEN prioridad = 'alta' THEN 1 ELSE 0 END) as alta_prioridad,
        AVG(CAST(tiempo_resolucion_minutos AS FLOAT)) as tiempo_promedio_resolucion,
        AVG(CAST(tiempo_respuesta_minutos AS FLOAT)) as tiempo_promedio_respuesta
      FROM tickets
      ${whereClause}
    `);

    const porCategoriaResult = await pool.request().query(`
      SELECT
        ISNULL(t.categoria, 'Sin categoría') as categoria,
        COUNT(*) as cantidad,
        tc.color,
        tc.icono
      FROM tickets t
      LEFT JOIN ticket_categorias tc ON t.categoria = tc.nombre
      ${whereClause}
      GROUP BY t.categoria, tc.color, tc.icono
      ORDER BY cantidad DESC
    `);

    res.json({
      success: true,
      estadisticas: statsResult.recordset[0],
      por_categoria: porCategoriaResult.recordset
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};

// ============================================
// OBTENER CATEGORÍAS
// ============================================
exports.obtenerCategorias = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT * FROM ticket_categorias WHERE activo = 1 ORDER BY orden ASC
    `);

    res.json({
      success: true,
      categorias: result.recordset
    });

  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener categorías',
      error: error.message
    });
  }
};

// ============================================
// OBTENER NOTIFICACIONES DEL USUARIO
// ============================================
exports.obtenerNotificaciones = async (req, res) => {
  try {
    const pool = await poolPromise;
    const usuario_id = req.user.id;
    const { solo_no_leidas = 'true' } = req.query;

    let whereClause = 'WHERE n.usuario_id = @usuario_id';
    if (solo_no_leidas === 'true') {
      whereClause += ' AND n.leida = 0';
    }

    const result = await pool.request()
      .input('usuario_id', sql.Int, usuario_id)
      .query(`
        SELECT
          n.*,
          t.numero_ticket,
          t.asunto as ticket_asunto,
          t.estado as ticket_estado
        FROM ticket_notificaciones n
        LEFT JOIN tickets t ON n.ticket_id = t.id
        ${whereClause}
        ORDER BY n.fecha_creacion DESC
      `);

    // Contar no leídas
    const countResult = await pool.request()
      .input('usuario_id', sql.Int, usuario_id)
      .query(`
        SELECT COUNT(*) as no_leidas
        FROM ticket_notificaciones
        WHERE usuario_id = @usuario_id AND leida = 0
      `);

    res.json({
      success: true,
      notificaciones: result.recordset,
      no_leidas: countResult.recordset[0].no_leidas
    });

  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones',
      error: error.message
    });
  }
};

// ============================================
// MARCAR NOTIFICACIÓN COMO LEÍDA
// ============================================
exports.marcarNotificacionLeida = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { id } = req.params;
    const usuario_id = req.user.id;

    await pool.request()
      .input('id', sql.Int, id)
      .input('usuario_id', sql.Int, usuario_id)
      .query(`
        UPDATE ticket_notificaciones
        SET leida = 1, fecha_lectura = GETDATE()
        WHERE id = @id AND usuario_id = @usuario_id
      `);

    res.json({
      success: true,
      message: 'Notificación marcada como leída'
    });

  } catch (error) {
    console.error('Error al marcar notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar notificación',
      error: error.message
    });
  }
};

// ============================================
// MARCAR TODAS LAS NOTIFICACIONES COMO LEÍDAS
// ============================================
exports.marcarTodasLeidas = async (req, res) => {
  try {
    const pool = await poolPromise;
    const usuario_id = req.user.id;

    const result = await pool.request()
      .input('usuario_id', sql.Int, usuario_id)
      .query(`
        UPDATE ticket_notificaciones
        SET leida = 1, fecha_lectura = GETDATE()
        WHERE usuario_id = @usuario_id AND leida = 0
      `);

    res.json({
      success: true,
      message: 'Todas las notificaciones marcadas como leídas',
      cantidad: result.rowsAffected[0]
    });

  } catch (error) {
    console.error('Error al marcar notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar notificaciones',
      error: error.message
    });
  }
};

// ============================================
// SUBIR IMAGEN A UN TICKET EXISTENTE
// ============================================
exports.subirImagenTicket = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { id } = req.params;
    const usuario_id = req.user.id;

    // Verificar que se subió una imagen
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha proporcionado ninguna imagen'
      });
    }

    const imagen_url = `/uploads/tickets/${req.file.filename}`;

    // Verificar que el ticket existe
    const ticketResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id, usuario_id, numero_ticket FROM tickets WHERE id = @id');

    if (ticketResult.recordset.length === 0) {
      // Eliminar archivo subido si el ticket no existe
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }

    const ticket = ticketResult.recordset[0];

    // Verificar permisos (solo el creador o admin pueden subir imagen)
    const perfilNombre = req.user?.perfil || '';
    const perfilId = req.user?.perfilId;
    const esAdmin = perfilId === 1 ||
                    perfilNombre.toLowerCase().includes('superadmin') ||
                    perfilNombre.toLowerCase().includes('administrador');

    if (!esAdmin && ticket.usuario_id !== usuario_id) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para modificar este ticket'
      });
    }

    // Actualizar el ticket con la imagen
    await pool.request()
      .input('id', sql.Int, id)
      .input('imagen_url', sql.VarChar(500), imagen_url)
      .query('UPDATE tickets SET imagen_url = @imagen_url WHERE id = @id');

    // Registrar en historial
    await pool.request()
      .input('ticket_id', sql.Int, id)
      .input('usuario_id', sql.Int, usuario_id)
      .input('accion', sql.VarChar(50), 'imagen_agregada')
      .input('valor_nuevo', sql.VarChar(255), imagen_url)
      .query(`
        INSERT INTO ticket_historial (ticket_id, usuario_id, accion, valor_nuevo, descripcion)
        VALUES (@ticket_id, @usuario_id, @accion, @valor_nuevo, 'Imagen agregada al ticket')
      `);

    res.json({
      success: true,
      message: 'Imagen subida exitosamente',
      imagen_url
    });

  } catch (error) {
    console.error('Error al subir imagen:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Error al subir imagen',
      error: error.message
    });
  }
};

// ============================================
// OBTENER DEPARTAMENTOS
// ============================================
exports.obtenerDepartamentos = async (req, res) => {
  res.json({ success: true, departamentos: DEPARTAMENTOS });
};

// ============================================
// HELPER: es usuario de departamento o admin
// ============================================
const esAdminOGerencia = (user) => {
  const perfil = (user?.perfil || '').toLowerCase();
  const perfilId = user?.perfilId;
  return perfilId === 1 ||
    perfil.includes('superadmin') ||
    perfil.includes('administrador') ||
    perfil.includes('gerencia');
};

// ============================================
// CREAR TICKET CON DEPARTAMENTOS (REEMPLAZA crearTicket)
// ============================================
exports.crearTicketDept = async (req, res) => {
  try {
    const pool = await poolPromise;

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Debes estar autenticado' });
    }

    const { asunto, mensaje, prioridad = 'media', categoria, departamentos = [] } = req.body;

    if (!asunto || !mensaje) {
      return res.status(400).json({ success: false, message: 'Asunto y mensaje son obligatorios' });
    }

    // departamentos es un array de IDs: [1,2] = mixto, [1] = simple
    let deptIds = [];
    if (typeof departamentos === 'string') {
      try { deptIds = JSON.parse(departamentos); } catch { deptIds = []; }
    } else {
      deptIds = Array.isArray(departamentos) ? departamentos.map(Number) : [];
    }

    const usuario_id = req.user.id;
    const sucursal_id = req.body.sucursal_id ? Number(req.body.sucursal_id) : (req.user.sucursal_id || null);
    const nombre_reportante = req.user.nombre_completo || req.user.username;
    const imagen_url = req.file ? `/uploads/tickets/${req.file.filename}` : null;
    const es_mixto = deptIds.length > 1 ? 1 : 0;
    const dept_nombre_principal = deptIds.length > 0
      ? (DEPARTAMENTOS.find(d => d.id === deptIds[0])?.nombre || null)
      : null;

    const resultNumero = await pool.request()
      .output('nuevo_numero', sql.VarChar(20))
      .execute('generar_numero_ticket');
    const numero_ticket = resultNumero.output.nuevo_numero;

    const ip_origen = req.ip || req.connection.remoteAddress;
    const user_agent = req.headers['user-agent'];

    let horas_vencimiento;
    switch (prioridad) {
      case 'critica': horas_vencimiento = 1; break;
      case 'alta': horas_vencimiento = 4; break;
      case 'media': horas_vencimiento = 24; break;
      default: horas_vencimiento = 72;
    }
    const fecha_vencimiento = new Date();
    fecha_vencimiento.setHours(fecha_vencimiento.getHours() + horas_vencimiento);

    const result = await pool.request()
      .input('numero_ticket', sql.VarChar(20), numero_ticket)
      .input('asunto', sql.VarChar(255), asunto)
      .input('mensaje', sql.NVarChar(sql.MAX), mensaje)
      .input('usuario_id', sql.Int, usuario_id)
      .input('nombre_reportante', sql.VarChar(100), nombre_reportante)
      .input('sucursal_id', sql.Int, sucursal_id)
      .input('departamento', sql.VarChar(100), dept_nombre_principal)
      .input('es_mixto', sql.Bit, es_mixto)
      .input('prioridad', sql.VarChar(20), prioridad)
      .input('categoria', sql.VarChar(50), categoria || null)
      .input('fecha_vencimiento', sql.DateTime, fecha_vencimiento)
      .input('ip_origen', sql.VarChar(45), ip_origen)
      .input('user_agent', sql.NVarChar(sql.MAX), user_agent)
      .input('imagen_url', sql.VarChar(500), imagen_url)
      .query(`
        INSERT INTO tickets (
          numero_ticket, asunto, mensaje, usuario_id, nombre_reportante,
          sucursal_id, departamento, es_mixto,
          estado, prioridad, categoria, fecha_vencimiento, ip_origen, user_agent, imagen_url
        )
        OUTPUT INSERTED.id
        VALUES (
          @numero_ticket, @asunto, @mensaje, @usuario_id, @nombre_reportante,
          @sucursal_id, @departamento, @es_mixto,
          'activo', @prioridad, @categoria, @fecha_vencimiento, @ip_origen, @user_agent, @imagen_url
        )
      `);

    const ticket_id = result.recordset[0].id;

    // Insertar asignaciones de departamentos en orden
    for (let i = 0; i < deptIds.length; i++) {
      const deptId = deptIds[i];
      const dept = DEPARTAMENTOS.find(d => d.id === deptId);
      if (!dept) continue;
      const estadoInicial = i === 0 ? 'pendiente' : 'bloqueado';
      await pool.request()
        .input('ticket_id', sql.Int, ticket_id)
        .input('departamento_id', sql.Int, deptId)
        .input('departamento_nombre', sql.VarChar(100), dept.nombre)
        .input('orden', sql.Int, i + 1)
        .input('estado', sql.VarChar(20), estadoInicial)
        .query(`
          INSERT INTO ticket_dept_asignaciones (ticket_id, departamento_id, departamento_nombre, orden, estado)
          VALUES (@ticket_id, @departamento_id, @departamento_nombre, @orden, @estado)
        `);

      // Notificar a usuarios del departamento
      const usuariosDept = await pool.request()
        .input('departamento_id', sql.Int, deptId)
        .query(`SELECT usuario_id FROM usuario_departamentos WHERE departamento_id = @departamento_id`);

      for (const u of usuariosDept.recordset) {
        if (u.usuario_id !== usuario_id) {
          await crearNotificacion(pool, u.usuario_id, ticket_id, 'nuevo_ticket',
            `🎫 Nuevo ticket para ${dept.nombre}: ${numero_ticket}`,
            `${nombre_reportante} reportó: "${asunto}"`);
        }
      }
    }

    // Historial
    await pool.request()
      .input('ticket_id', sql.Int, ticket_id)
      .input('usuario_id', sql.Int, usuario_id)
      .input('accion', sql.VarChar(50), 'creado')
      .input('valor_nuevo', sql.VarChar(255), 'activo')
      .input('descripcion', sql.NVarChar(sql.MAX), `Ticket creado${es_mixto ? ' (mixto)' : ''}`)
      .query(`INSERT INTO ticket_historial (ticket_id, usuario_id, accion, valor_nuevo, descripcion)
              VALUES (@ticket_id, @usuario_id, @accion, @valor_nuevo, @descripcion)`);

    await notificarSuperAdmins(pool, ticket_id,
      `🎫 Nuevo ticket: ${numero_ticket}`,
      `${nombre_reportante} creó: "${asunto}" (${prioridad})`, usuario_id);

    res.status(201).json({
      success: true,
      message: 'Ticket creado exitosamente',
      ticket: { id: ticket_id, numero_ticket, asunto, estado: 'activo', prioridad, imagen_url, es_mixto }
    });

  } catch (error) {
    console.error('Error al crear ticket con dept:', error);
    res.status(500).json({ success: false, message: 'Error al crear el ticket', error: error.message });
  }
};

// ============================================
// MIS TICKETS — filtra por departamentos del usuario
// ============================================
exports.obtenerMisTicketsDept = async (req, res) => {
  try {
    const pool = await poolPromise;
    const usuario_id = req.user.id;
    const { estado, limite = 100, pagina = 1 } = req.query;
    const offset = (pagina - 1) * limite;

    const esAdmin = esAdminOGerencia(req.user);

    // Obtener departamentos asignados al usuario
    const deptResult = await pool.request()
      .input('uid', sql.Int, usuario_id)
      .query(`SELECT departamento_id FROM usuario_departamentos WHERE usuario_id = @uid`);
    const misDeptIds = deptResult.recordset.map(r => r.departamento_id);

    let whereConditions = [];
    const request = pool.request();
    request.input('limite', sql.Int, parseInt(limite));
    request.input('offset', sql.Int, parseInt(offset));

    if (estado && estado !== 'todos') {
      whereConditions.push('t.estado = @estado');
      request.input('estado', sql.VarChar(20), estado);
    }

    if (esAdmin) {
      // Admin y Gerencia ven todos
    } else if (misDeptIds.length > 0) {
      // Técnico con departamentos: ve tickets de sus departamentos O creados por él
      const deptList = misDeptIds.join(',');
      whereConditions.push(`(t.usuario_id = @uid OR EXISTS (
        SELECT 1 FROM ticket_dept_asignaciones tda
        WHERE tda.ticket_id = t.id AND tda.departamento_id IN (${deptList})
      ))`);
      request.input('uid', sql.Int, usuario_id);
    } else {
      // Sin departamentos: solo sus propios tickets
      whereConditions.push('t.usuario_id = @uid');
      request.input('uid', sql.Int, usuario_id);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const result = await request.query(`
      SELECT * FROM (
        SELECT TOP (@limite + @offset)
          t.*,
          s.nombre as sucursal_nombre,
          u_asignado.nombre_completo as asignado_nombre,
          u_reportante.nombre_completo as reportante_nombre,
          u_resuelto.nombre_completo as resuelto_nombre,
          tc.nombre as categoria_nombre, tc.color as categoria_color, tc.icono as categoria_icono,
          (SELECT COUNT(*) FROM ticket_respuestas WHERE ticket_id = t.id) as num_respuestas,
          ROW_NUMBER() OVER (ORDER BY
            CASE t.prioridad WHEN 'critica' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 ELSE 4 END,
            t.fecha_creacion DESC
          ) as RowNum
        FROM tickets t
        LEFT JOIN sucursales s ON t.sucursal_id = s.id
        LEFT JOIN usuarios u_asignado ON t.asignado_a = u_asignado.id
        LEFT JOIN usuarios u_reportante ON t.usuario_id = u_reportante.id
        LEFT JOIN usuarios u_resuelto ON t.resuelto_por = u_resuelto.id
        LEFT JOIN ticket_categorias tc ON t.categoria = tc.nombre
        ${whereClause}
      ) AS R WHERE RowNum > @offset ORDER BY RowNum
    `);

    // Agregar info de departamentos a cada ticket
    const ticketsConDept = await Promise.all(result.recordset.map(async (t) => {
      const deptAsig = await pool.request()
        .input('tid', sql.Int, t.id)
        .query(`SELECT * FROM ticket_dept_asignaciones WHERE ticket_id = @tid ORDER BY orden ASC`);
      return { ...t, dept_asignaciones: deptAsig.recordset };
    }));

    res.json({ success: true, tickets: ticketsConDept });

  } catch (error) {
    console.error('Error obtenerMisTicketsDept:', error);
    res.status(500).json({ success: false, message: 'Error al obtener tickets', error: error.message });
  }
};

// ============================================
// MARCAR DEPARTAMENTO COMO ENTREGADO
// ============================================
exports.marcarDeptEntregado = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { ticket_id, dept_id } = req.params;
    const usuario_id = req.user.id;
    const { notas } = req.body;

    // Verificar que el usuario pertenece a ese departamento o es admin
    if (!esAdminOGerencia(req.user)) {
      const check = await pool.request()
        .input('uid', sql.Int, usuario_id)
        .input('did', sql.Int, parseInt(dept_id))
        .query(`SELECT 1 FROM usuario_departamentos WHERE usuario_id = @uid AND departamento_id = @did`);
      if (check.recordset.length === 0) {
        return res.status(403).json({ success: false, message: 'No perteneces a este departamento' });
      }
    }

    // Marcar esta asignación como entregada
    await pool.request()
      .input('ticket_id', sql.Int, parseInt(ticket_id))
      .input('dept_id', sql.Int, parseInt(dept_id))
      .input('uid', sql.Int, usuario_id)
      .input('notas', sql.NVarChar(sql.MAX), notas || null)
      .query(`
        UPDATE ticket_dept_asignaciones
        SET estado = 'entregado', usuario_asignado = @uid, fecha_entrega = GETDATE(), notas = @notas
        WHERE ticket_id = @ticket_id AND departamento_id = @dept_id
      `);

    // Desbloquear el siguiente departamento en orden
    const siguiente = await pool.request()
      .input('ticket_id', sql.Int, parseInt(ticket_id))
      .input('dept_id', sql.Int, parseInt(dept_id))
      .query(`
        SELECT TOP 1 id FROM ticket_dept_asignaciones
        WHERE ticket_id = @ticket_id
          AND estado = 'bloqueado'
          AND orden > (SELECT orden FROM ticket_dept_asignaciones WHERE ticket_id = @ticket_id AND departamento_id = @dept_id)
        ORDER BY orden ASC
      `);

    if (siguiente.recordset.length > 0) {
      await pool.request()
        .input('id', sql.Int, siguiente.recordset[0].id)
        .query(`UPDATE ticket_dept_asignaciones SET estado = 'pendiente' WHERE id = @id`);
    } else {
      // No hay más departamentos pendientes → cerrar ticket
      const todosEntregados = await pool.request()
        .input('ticket_id', sql.Int, parseInt(ticket_id))
        .query(`SELECT COUNT(*) as restantes FROM ticket_dept_asignaciones
                WHERE ticket_id = @ticket_id AND estado != 'entregado'`);

      if (todosEntregados.recordset[0].restantes === 0) {
        await pool.request()
          .input('id', sql.Int, parseInt(ticket_id))
          .input('uid', sql.Int, usuario_id)
          .query(`
            UPDATE tickets SET estado = 'resuelto', resuelto_por = @uid, fecha_resolucion = GETDATE()
            WHERE id = @id
          `);
        await pool.request()
          .input('tid', sql.Int, parseInt(ticket_id))
          .input('uid', sql.Int, usuario_id)
          .query(`INSERT INTO ticket_historial (ticket_id, usuario_id, accion, valor_anterior, valor_nuevo, descripcion)
                  VALUES (@tid, @uid, 'estado_cambiado', 'en_proceso', 'resuelto', 'Todos los departamentos entregaron')`);
      }
    }

    await pool.request()
      .input('tid', sql.Int, parseInt(ticket_id))
      .input('uid', sql.Int, usuario_id)
      .input('did', sql.VarChar(50), dept_id)
      .query(`INSERT INTO ticket_historial (ticket_id, usuario_id, accion, valor_nuevo, descripcion)
              VALUES (@tid, @uid, 'dept_entregado', @did, 'Departamento marcó su parte como entregada')`);

    res.json({ success: true, message: 'Parte entregada correctamente' });

  } catch (error) {
    console.error('Error marcarDeptEntregado:', error);
    res.status(500).json({ success: false, message: 'Error al entregar', error: error.message });
  }
};

// ============================================
// TABLERO GERENCIA — tickets por día
// ============================================
exports.obtenerTableroGerencia = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { dias = 30 } = req.query;

    // Tickets por día
    const porDia = await pool.request()
      .input('dias', sql.Int, parseInt(dias))
      .query(`
        SELECT
          CAST(fecha_creacion AS DATE) as fecha,
          COUNT(*) as total,
          SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as activos,
          SUM(CASE WHEN estado = 'en_proceso' THEN 1 ELSE 0 END) as en_proceso,
          SUM(CASE WHEN estado = 'resuelto' THEN 1 ELSE 0 END) as resueltos,
          SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) as cancelados,
          SUM(CASE WHEN estado = 'vencido' THEN 1 ELSE 0 END) as vencidos,
          SUM(CASE WHEN es_mixto = 1 THEN 1 ELSE 0 END) as mixtos
        FROM tickets
        WHERE fecha_creacion >= DATEADD(DAY, -@dias, GETDATE())
        GROUP BY CAST(fecha_creacion AS DATE)
        ORDER BY fecha DESC
      `);

    // Tickets por departamento
    const porDept = await pool.request()
      .input('dias', sql.Int, parseInt(dias))
      .query(`
        SELECT
          tda.departamento_nombre,
          COUNT(*) as total,
          SUM(CASE WHEN tda.estado = 'entregado' THEN 1 ELSE 0 END) as entregados,
          SUM(CASE WHEN tda.estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
          SUM(CASE WHEN tda.estado = 'bloqueado' THEN 1 ELSE 0 END) as bloqueados
        FROM ticket_dept_asignaciones tda
        INNER JOIN tickets t ON tda.ticket_id = t.id
        WHERE t.fecha_creacion >= DATEADD(DAY, -@dias, GETDATE())
        GROUP BY tda.departamento_nombre
      `);

    // Últimos 50 tickets con sus asignaciones
    const ultimos = await pool.request()
      .input('dias', sql.Int, parseInt(dias))
      .query(`
        SELECT TOP 50
          t.id, t.numero_ticket, t.asunto, t.estado, t.prioridad,
          t.es_mixto, t.departamento, t.fecha_creacion,
          s.nombre as sucursal_nombre,
          u.nombre_completo as reportante_nombre
        FROM tickets t
        LEFT JOIN sucursales s ON t.sucursal_id = s.id
        LEFT JOIN usuarios u ON t.usuario_id = u.id
        WHERE t.fecha_creacion >= DATEADD(DAY, -@dias, GETDATE())
        ORDER BY t.fecha_creacion DESC
      `);

    const ticketsConDept = await Promise.all(ultimos.recordset.map(async (t) => {
      const deptAsig = await pool.request()
        .input('tid', sql.Int, t.id)
        .query(`SELECT * FROM ticket_dept_asignaciones WHERE ticket_id = @tid ORDER BY orden ASC`);
      return { ...t, dept_asignaciones: deptAsig.recordset };
    }));

    res.json({
      success: true,
      por_dia: porDia.recordset,
      por_departamento: porDept.recordset,
      tickets: ticketsConDept
    });

  } catch (error) {
    console.error('Error tablero gerencia:', error);
    res.status(500).json({ success: false, message: 'Error al obtener tablero', error: error.message });
  }
};

// ============================================
// OBTENER USUARIOS DE UN DEPARTAMENTO
// ============================================
exports.obtenerUsuariosDept = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { dept_id } = req.params;

    const result = await pool.request()
      .input('did', sql.Int, parseInt(dept_id))
      .query(`
        SELECT u.id, u.nombre_completo, u.username, ud.departamento_id
        FROM usuario_departamentos ud
        INNER JOIN usuarios u ON ud.usuario_id = u.id
        WHERE ud.departamento_id = @did
      `);

    res.json({ success: true, usuarios: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};

// ============================================
// ASIGNAR / QUITAR USUARIO A DEPARTAMENTO (Admin)
// ============================================
exports.asignarUsuarioDept = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { usuario_id, departamento_id, accion } = req.body; // accion: 'agregar' | 'quitar'

    if (accion === 'agregar') {
      await pool.request()
        .input('uid', sql.Int, usuario_id)
        .input('did', sql.Int, departamento_id)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM usuario_departamentos WHERE usuario_id = @uid AND departamento_id = @did)
            INSERT INTO usuario_departamentos (usuario_id, departamento_id) VALUES (@uid, @did)
        `);
    } else {
      await pool.request()
        .input('uid', sql.Int, usuario_id)
        .input('did', sql.Int, departamento_id)
        .query(`DELETE FROM usuario_departamentos WHERE usuario_id = @uid AND departamento_id = @did`);
    }

    res.json({ success: true, message: `Usuario ${accion === 'agregar' ? 'asignado a' : 'quitado de'} departamento` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};

// ============================================
// MIS DEPARTAMENTOS (para el usuario actual)
// ============================================
// ============================================
// ADMIN: TODAS LAS SOLICITUDES (MANTENCIONES)
// ============================================
exports.obtenerMantencionesAdmin = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { estado, departamento_id, prioridad, sucursal_id, busqueda, limite = 100 } = req.query;

    const request = pool.request().input('limite', sql.Int, parseInt(limite));
    const where = ['1=1'];

    if (estado)        { where.push('t.estado = @estado');            request.input('estado',        sql.VarChar, estado); }
    if (prioridad)     { where.push('t.prioridad = @prioridad');      request.input('prioridad',     sql.VarChar, prioridad); }
    if (sucursal_id)   { where.push('t.sucursal_id = @sucursal_id'); request.input('sucursal_id',  sql.Int,     parseInt(sucursal_id)); }
    if (departamento_id) {
      where.push(`EXISTS (SELECT 1 FROM ticket_dept_asignaciones tda WHERE tda.ticket_id=t.id AND tda.departamento_id=@dept_id)`);
      request.input('dept_id', sql.Int, parseInt(departamento_id));
    }
    if (busqueda) {
      where.push(`(t.asunto LIKE @bus OR t.mensaje LIKE @bus OR t.numero_ticket LIKE @bus OR u_r.nombre_completo LIKE @bus)`);
      request.input('bus', sql.VarChar, `%${busqueda}%`);
    }

    const result = await request.query(`
      SELECT TOP (@limite)
        t.id, t.numero_ticket, t.asunto, t.mensaje, t.estado, t.prioridad, t.tipo,
        t.es_mixto, t.imagen_url, t.fecha_creacion, t.fecha_vencimiento,
        t.sucursal_id, s.nombre AS sucursal_nombre,
        t.usuario_id, u_r.nombre_completo AS reportante_nombre,
        t.asignado_a, u_a.nombre_completo AS asignado_nombre,
        (SELECT COUNT(*) FROM ticket_respuestas WHERE ticket_id=t.id) AS num_respuestas
      FROM tickets t
      LEFT JOIN sucursales s   ON t.sucursal_id = s.id
      LEFT JOIN usuarios u_r   ON t.usuario_id  = u_r.id
      LEFT JOIN usuarios u_a   ON t.asignado_a  = u_a.id
      WHERE ${where.join(' AND ')}
      ORDER BY
        CASE t.prioridad WHEN 'critica' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 ELSE 4 END,
        t.fecha_creacion DESC
    `);

    const tickets = await Promise.all(result.recordset.map(async (t) => {
      const deptAsig = await pool.request()
        .input('tid', sql.Int, t.id)
        .query(`SELECT * FROM ticket_dept_asignaciones WHERE ticket_id=@tid ORDER BY orden ASC`);
      return { ...t, dept_asignaciones: deptAsig.recordset };
    }));

    // Stats
    const stats = await pool.request().query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN estado='activo'     THEN 1 ELSE 0 END) AS activos,
        SUM(CASE WHEN estado='en_proceso' THEN 1 ELSE 0 END) AS en_proceso,
        SUM(CASE WHEN estado='resuelto'   THEN 1 ELSE 0 END) AS resueltos,
        SUM(CASE WHEN prioridad='critica' THEN 1 ELSE 0 END) AS criticos
      FROM tickets
    `);

    res.json({ success: true, tickets, stats: stats.recordset[0] });
  } catch (error) {
    console.error('obtenerMantencionesAdmin:', error);
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};

// ============================================
// ANALYTICS DE DEPARTAMENTOS
// ============================================
exports.obtenerAnalyticsDept = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { dias = 30 } = req.query;

    // Tickets por departamento con conteos de estado
    const porDept = await pool.request()
      .input('dias', sql.Int, parseInt(dias))
      .query(`
        SELECT
          tda.departamento_id,
          tda.departamento_nombre,
          COUNT(DISTINCT tda.ticket_id)                                             AS total,
          SUM(CASE WHEN tda.estado = 'entregado' THEN 1 ELSE 0 END)               AS resueltos,
          SUM(CASE WHEN tda.estado = 'pendiente' THEN 1 ELSE 0 END)               AS pendientes,
          SUM(CASE WHEN tda.estado = 'bloqueado' THEN 1 ELSE 0 END)               AS bloqueados,
          SUM(CASE WHEN t.prioridad = 'critica' THEN 1 ELSE 0 END)                AS criticos,
          AVG(CAST(t.tiempo_resolucion_minutos AS FLOAT))                          AS tiempo_promedio_min
        FROM ticket_dept_asignaciones tda
        INNER JOIN tickets t ON tda.ticket_id = t.id
        WHERE t.fecha_creacion >= DATEADD(DAY, -@dias, GETDATE())
        GROUP BY tda.departamento_id, tda.departamento_nombre
        ORDER BY total DESC
      `);

    // Tickets por día (últimos N días)
    const porDia = await pool.request()
      .input('dias', sql.Int, parseInt(dias))
      .query(`
        SELECT
          CAST(t.fecha_creacion AS DATE) AS fecha,
          COUNT(*) AS total,
          SUM(CASE WHEN t.estado='resuelto'   THEN 1 ELSE 0 END) AS resueltos,
          SUM(CASE WHEN t.estado='activo'     THEN 1 ELSE 0 END) AS activos,
          SUM(CASE WHEN t.estado='en_proceso' THEN 1 ELSE 0 END) AS en_proceso
        FROM tickets t
        WHERE t.fecha_creacion >= DATEADD(DAY, -@dias, GETDATE())
        GROUP BY CAST(t.fecha_creacion AS DATE)
        ORDER BY fecha ASC
      `);

    // Top resolvedores (usuarios que más dept_entregado tienen)
    const topResolvedores = await pool.request()
      .input('dias', sql.Int, parseInt(dias))
      .query(`
        SELECT TOP 10
          u.id,
          u.nombre_completo,
          COUNT(*) AS resueltos
        FROM ticket_dept_asignaciones tda
        INNER JOIN tickets t ON tda.ticket_id = t.id
        INNER JOIN usuarios u ON tda.usuario_asignado = u.id
        WHERE tda.estado = 'entregado'
          AND t.fecha_creacion >= DATEADD(DAY, -@dias, GETDATE())
        GROUP BY u.id, u.nombre_completo
        ORDER BY resueltos DESC
      `);

    // Distribución por prioridad
    const porPrioridad = await pool.request()
      .input('dias', sql.Int, parseInt(dias))
      .query(`
        SELECT prioridad, COUNT(*) AS total
        FROM tickets
        WHERE fecha_creacion >= DATEADD(DAY, -@dias, GETDATE())
        GROUP BY prioridad
      `);

    // Distribución por sucursal
    const porSucursal = await pool.request()
      .input('dias', sql.Int, parseInt(dias))
      .query(`
        SELECT
          ISNULL(s.nombre, 'Sin sucursal') AS sucursal,
          COUNT(*) AS total
        FROM tickets t
        LEFT JOIN sucursales s ON t.sucursal_id = s.id
        WHERE t.fecha_creacion >= DATEADD(DAY, -@dias, GETDATE())
        GROUP BY s.nombre
        ORDER BY total DESC
      `);

    res.json({
      success: true,
      por_departamento: porDept.recordset,
      por_dia: porDia.recordset,
      top_resolvedores: topResolvedores.recordset,
      por_prioridad: porPrioridad.recordset,
      por_sucursal: porSucursal.recordset,
    });
  } catch (error) {
    console.error('obtenerAnalyticsDept:', error);
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};

exports.obtenerMisDepartamentos = async (req, res) => {
  try {
    const pool = await poolPromise;
    const usuario_id = req.user.id;

    const result = await pool.request()
      .input('uid', sql.Int, usuario_id)
      .query(`SELECT departamento_id FROM usuario_departamentos WHERE usuario_id = @uid`);

    const misDeptIds = result.recordset.map(r => r.departamento_id);
    const misDepts = DEPARTAMENTOS.filter(d => misDeptIds.includes(d.id));

    res.json({ success: true, departamentos: misDepts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error :(', error: error.message });
  }
};

// ─── ELIMINAR TICKET (Gerencia + SuperAdmin) ──────────────────────────────────
exports.eliminarTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario   = req.user;
    const isSuperAdmin = usuario.superadmin === true || usuario.superadmin === 1;
    const perfilId  = usuario.perfilId;

    // Perfiles gerencia: 11 (Gerencia). SuperAdmin también puede.
    const GERENCIA = [11];
    if (!GERENCIA.includes(perfilId) && !isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Sin permisos para eliminar tickets' });
    }

    const pool = await poolPromise;

    const r = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id FROM tickets WHERE id = @id');

    if (r.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }

    // Eliminar datos relacionados antes del ticket (FK)
    await pool.request().input('id', sql.Int, id).query('DELETE FROM ticket_imagenes      WHERE ticket_id = @id');
    await pool.request().input('id', sql.Int, id).query('DELETE FROM ticket_respuestas    WHERE ticket_id = @id');
    await pool.request().input('id', sql.Int, id).query('DELETE FROM ticket_notificaciones WHERE ticket_id = @id');
    await pool.request().input('id', sql.Int, id).query('DELETE FROM ticket_dept_asignaciones WHERE ticket_id = @id');
    await pool.request().input('id', sql.Int, id).query('DELETE FROM tickets WHERE id = @id');

    console.log(`🗑️ Ticket #${id} eliminado por ${usuario.nombre || usuario.username}`);
    res.json({ success: true, message: 'Ticket eliminado' });

  } catch (error) {
    console.error('❌ Error al eliminar ticket:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar ticket', error: error.message });
  }
};
