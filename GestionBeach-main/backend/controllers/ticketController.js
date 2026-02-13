// backend/controllers/ticketController.js - SQL SERVER VERSION
const { sql, poolPromise } = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
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

// Exportar middleware de upload
exports.uploadMiddleware = upload.single('imagen');

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
    console.log(`📬 Notificación creada para usuario ${usuario_id}: ${titulo}`);
  } catch (error) {
    console.error('Error al crear notificación:', error.message);
    // No lanzamos error para no interrumpir el flujo principal
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

    // Si NO es admin, solo mostrar sus propios tickets
    if (!esAdmin) {
      whereConditions.push('t.usuario_id = @usuario_id');
      request.input('usuario_id', sql.Int, usuario_id);
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

    // Verificar permisos - Los SuperAdmins pueden ver todos los tickets
    // perfilId 1 = SuperAdmin (Lnova, Pancho)
    const perfilNombre = req.user?.perfil || '';
    const perfilId = req.user?.perfilId;
    const esAdmin = perfilId === 1 ||
                    perfilNombre.toLowerCase().includes('superadmin') ||
                    perfilNombre.toLowerCase().includes('administrador');

    if (!esAdmin && ticket.usuario_id !== usuario_id) {
      console.log('🔒 Acceso denegado:', { perfilId, perfilNombre, usuario_id, ticket_usuario_id: ticket.usuario_id });
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
          u.nombre_completo as nombre_usuario
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
    const pool = await poolPromise;
    const { id } = req.params;
    const { mensaje, es_interno = false } = req.body;
    const usuario_id = req.user.id;
    const nombre_usuario = req.user.nombre_completo || req.user.username || 'Usuario';

    // Obtener imagen si fue subida
    const imagen_url = req.file ? `/uploads/tickets/${req.file.filename}` : null;

    console.log('📥 Responder ticket:', { ticket_id: id, usuario_id, nombre_usuario, mensaje, imagen_url });

    if (!mensaje && !imagen_url) {
      return res.status(400).json({
        success: false,
        message: 'Debes incluir un mensaje o una imagen'
      });
    }

    // Verificar que el ticket existe
    const ticketResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM tickets WHERE id = @id');

    if (ticketResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }

    const ticket = ticketResult.recordset[0];

    // Insertar respuesta (con imagen si existe)
    const result = await pool.request()
      .input('ticket_id', sql.Int, id)
      .input('usuario_id', sql.Int, usuario_id)
      .input('nombre_usuario', sql.VarChar(100), nombre_usuario)
      .input('mensaje', sql.NVarChar(sql.MAX), mensaje || '')
      .input('es_interno', sql.Bit, es_interno)
      .input('imagen_url', sql.VarChar(500), imagen_url)
      .query(`
        INSERT INTO ticket_respuestas (ticket_id, usuario_id, nombre_usuario, mensaje, es_interno, imagen_url)
        OUTPUT INSERTED.id
        VALUES (@ticket_id, @usuario_id, @nombre_usuario, @mensaje, @es_interno, @imagen_url)
      `);

    // Actualizar estado si estaba activo
    if (ticket.estado === 'activo') {
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
      await notificarSuperAdmins(
        pool,
        parseInt(id),
        `💬 Respuesta del usuario en ${ticket.numero_ticket}`,
        `El usuario ha agregado información a su ticket: "${ticket.asunto}"`,
        usuario_id
      );
    }

    res.json({
      success: true,
      message: 'Respuesta agregada exitosamente',
      respuesta_id: result.recordset[0].id
    });

  } catch (error) {
    console.error('❌ Error al responder ticket:', error);
    console.error('❌ Detalles del error:', {
      message: error.message,
      stack: error.stack,
      originalError: error.originalError
    });
    res.status(500).json({
      success: false,
      message: 'Error al responder ticket',
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
      .input('descripcion', sql.NVarChar(sql.MAX), comentario)
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
    // Eliminar archivo si hubo error
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
