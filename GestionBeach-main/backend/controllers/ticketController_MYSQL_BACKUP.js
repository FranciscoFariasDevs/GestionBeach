// backend/controllers/ticketController.js
const { sql, poolPromise } = require('../config/db');

// ============================================
// CREAR NUEVO TICKET (PÚBLICO)
// ============================================
exports.crearTicket = async (req, res) => {
  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    const {
      asunto,
      mensaje,
      nombre_reportante,
      email_reportante,
      telefono_reportante,
      departamento,
      prioridad = 'media',
      categoria
    } = req.body;

    // Validaciones
    if (!asunto || !mensaje || !nombre_reportante || !email_reportante) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios'
      });
    }

    // Obtener usuario_id y sucursal_id si está autenticado
    const usuario_id = req.usuario?.id || null;
    const sucursal_id = req.usuario?.sucursal_id || null;

    // Generar número de ticket
    const [resultNumero] = await connection.query('CALL generar_numero_ticket(@nuevo_numero)');
    const [numeroTicket] = await connection.query('SELECT @nuevo_numero as numero');
    const numero_ticket = numeroTicket[0].numero;

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

    // Insertar ticket
    const [result] = await connection.query(
      `INSERT INTO tickets (
        numero_ticket, asunto, mensaje, usuario_id, nombre_reportante,
        email_reportante, telefono_reportante, sucursal_id, departamento,
        estado, prioridad, categoria, fecha_vencimiento, ip_origen, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo', ?, ?, ?, ?, ?)`,
      [
        numero_ticket, asunto, mensaje, usuario_id, nombre_reportante,
        email_reportante, telefono_reportante, sucursal_id, departamento,
        prioridad, categoria, fecha_vencimiento, ip_origen, user_agent
      ]
    );

    const ticket_id = result.insertId;

    // Registrar en historial
    await connection.query(
      `INSERT INTO ticket_historial (ticket_id, usuario_id, accion, valor_nuevo, descripcion)
       VALUES (?, ?, 'creado', 'activo', 'Ticket creado')`,
      [ticket_id, usuario_id]
    );

    // Notificar a administradores y soporte técnico
    const [admins] = await connection.query(
      `SELECT DISTINCT u.id
       FROM usuarios u
       INNER JOIN perfil p ON u.perfil_id = p.id
       WHERE p.nombre IN ('SuperAdmin', 'Administrador', 'Soporte Técnico')`
    );

    for (const admin of admins) {
      await connection.query(
        `INSERT INTO ticket_notificaciones (ticket_id, usuario_id, tipo, mensaje)
         VALUES (?, ?, 'nuevo_ticket', ?)`,
        [ticket_id, admin.id, `Nuevo ticket: ${asunto}`]
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Ticket creado exitosamente',
      ticket: {
        id: ticket_id,
        numero_ticket,
        asunto,
        estado: 'activo',
        prioridad
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al crear ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el ticket',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// ============================================
// OBTENER MIS TICKETS (PRIVADO)
// ============================================
exports.obtenerMisTickets = async (req, res) => {
  try {
    const usuario_id = req.usuario.id;
    const { estado, limite = 50, pagina = 1 } = req.query;

    let whereClause = 'WHERE t.usuario_id = ?';
    let params = [usuario_id];

    if (estado && estado !== 'todos') {
      whereClause += ' AND t.estado = ?';
      params.push(estado);
    }

    const offset = (pagina - 1) * limite;

    const [tickets] = await db.query(
      `SELECT
        t.*,
        s.nombre as sucursal_nombre,
        u_asignado.nombre as asignado_nombre,
        tc.nombre as categoria_nombre,
        tc.color as categoria_color,
        tc.icono as categoria_icono,
        (SELECT COUNT(*) FROM ticket_respuestas WHERE ticket_id = t.id) as num_respuestas,
        (SELECT COUNT(*) FROM ticket_respuestas WHERE ticket_id = t.id AND es_interno = 0) as num_respuestas_publicas
      FROM tickets t
      LEFT JOIN sucursales s ON t.sucursal_id = s.id
      LEFT JOIN usuarios u_asignado ON t.asignado_a = u_asignado.id
      LEFT JOIN ticket_categorias tc ON t.categoria = tc.nombre
      ${whereClause}
      ORDER BY
        FIELD(t.prioridad, 'critica', 'alta', 'media', 'baja'),
        t.fecha_creacion DESC
      LIMIT ? OFFSET ?`,
      [...params, parseInt(limite), parseInt(offset)]
    );

    // Obtener conteo total
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM tickets t ${whereClause}`,
      params
    );

    res.json({
      success: true,
      tickets,
      pagination: {
        total: countResult[0].total,
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total_paginas: Math.ceil(countResult[0].total / limite)
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
    const { estado, prioridad, categoria, busqueda, limite = 50, pagina = 1 } = req.query;

    let whereConditions = [];
    let params = [];

    if (estado && estado !== 'todos') {
      whereConditions.push('t.estado = ?');
      params.push(estado);
    }

    if (prioridad) {
      whereConditions.push('t.prioridad = ?');
      params.push(prioridad);
    }

    if (categoria) {
      whereConditions.push('t.categoria = ?');
      params.push(categoria);
    }

    if (busqueda) {
      whereConditions.push('(t.numero_ticket LIKE ? OR t.asunto LIKE ? OR t.mensaje LIKE ? OR t.nombre_reportante LIKE ?)');
      const searchTerm = `%${busqueda}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    const offset = (pagina - 1) * limite;

    const [tickets] = await db.query(
      `SELECT
        t.*,
        s.nombre as sucursal_nombre,
        u_reportante.nombre as reportante_nombre,
        u_asignado.nombre as asignado_nombre,
        tc.nombre as categoria_nombre,
        tc.color as categoria_color,
        tc.icono as categoria_icono,
        (SELECT COUNT(*) FROM ticket_respuestas WHERE ticket_id = t.id) as num_respuestas
      FROM tickets t
      LEFT JOIN sucursales s ON t.sucursal_id = s.id
      LEFT JOIN usuarios u_reportante ON t.usuario_id = u_reportante.id
      LEFT JOIN usuarios u_asignado ON t.asignado_a = u_asignado.id
      LEFT JOIN ticket_categorias tc ON t.categoria = tc.nombre
      ${whereClause}
      ORDER BY
        FIELD(t.estado, 'activo', 'en_proceso', 'vencido', 'resuelto', 'cancelado'),
        FIELD(t.prioridad, 'critica', 'alta', 'media', 'baja'),
        t.fecha_creacion DESC
      LIMIT ? OFFSET ?`,
      [...params, parseInt(limite), parseInt(offset)]
    );

    // Conteo total
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM tickets t ${whereClause}`,
      params
    );

    res.json({
      success: true,
      tickets,
      pagination: {
        total: countResult[0].total,
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total_paginas: Math.ceil(countResult[0].total / limite)
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
    const { id } = req.params;
    const usuario_id = req.usuario?.id;

    // Obtener ticket con toda la información
    const [tickets] = await db.query(
      `SELECT
        t.*,
        s.nombre as sucursal_nombre,
        u_reportante.nombre as reportante_nombre,
        u_reportante.email as reportante_email,
        u_asignado.nombre as asignado_nombre,
        u_asignado.email as asignado_email,
        tc.nombre as categoria_nombre,
        tc.color as categoria_color,
        tc.icono as categoria_icono
      FROM tickets t
      LEFT JOIN sucursales s ON t.sucursal_id = s.id
      LEFT JOIN usuarios u_reportante ON t.usuario_id = u_reportante.id
      LEFT JOIN usuarios u_asignado ON t.asignado_a = u_asignado.id
      LEFT JOIN ticket_categorias tc ON t.categoria = tc.nombre
      WHERE t.id = ?`,
      [id]
    );

    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }

    const ticket = tickets[0];

    // Verificar permisos (solo el dueño o admins pueden ver)
    const esAdmin = req.usuario?.perfil === 'SuperAdmin' || req.usuario?.perfil === 'Administrador';
    if (!esAdmin && ticket.usuario_id !== usuario_id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver este ticket'
      });
    }

    // Obtener respuestas (filtrar internas si no es admin)
    const whereRespuestas = esAdmin ? '' : 'WHERE es_interno = 0';
    const [respuestas] = await db.query(
      `SELECT
        r.*,
        u.nombre as usuario_nombre,
        u.email as usuario_email
      FROM ticket_respuestas r
      LEFT JOIN usuarios u ON r.usuario_id = u.id
      ${whereRespuestas}
      ORDER BY r.fecha_creacion ASC`,
      [id]
    );

    // Obtener historial
    const [historial] = await db.query(
      `SELECT
        h.*,
        u.nombre as usuario_nombre
      FROM ticket_historial h
      LEFT JOIN usuarios u ON h.usuario_id = u.id
      WHERE h.ticket_id = ?
      ORDER BY h.fecha_cambio DESC`,
      [id]
    );

    res.json({
      success: true,
      ticket,
      respuestas,
      historial
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
// RESPONDER A UN TICKET
// ============================================
exports.responderTicket = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { mensaje, es_interno = false } = req.body;
    const usuario_id = req.usuario.id;
    const nombre_usuario = req.usuario.nombre;

    if (!mensaje) {
      return res.status(400).json({
        success: false,
        message: 'El mensaje es obligatorio'
      });
    }

    // Verificar que el ticket existe
    const [tickets] = await connection.query('SELECT * FROM tickets WHERE id = ?', [id]);
    if (tickets.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }

    // Insertar respuesta
    const [result] = await connection.query(
      `INSERT INTO ticket_respuestas (ticket_id, usuario_id, nombre_usuario, mensaje, es_interno)
       VALUES (?, ?, ?, ?, ?)`,
      [id, usuario_id, nombre_usuario, mensaje, es_interno]
    );

    // Actualizar estado a "en_proceso" si estaba activo
    if (tickets[0].estado === 'activo') {
      await connection.query(
        `UPDATE tickets SET estado = 'en_proceso' WHERE id = ?`,
        [id]
      );

      // Registrar cambio de estado
      await connection.query(
        `INSERT INTO ticket_historial (ticket_id, usuario_id, accion, valor_anterior, valor_nuevo)
         VALUES (?, ?, 'estado_cambiado', 'activo', 'en_proceso')`,
        [id, usuario_id]
      );
    }

    // Calcular tiempo de primera respuesta si aplica
    const [respuestas] = await connection.query(
      'SELECT COUNT(*) as count FROM ticket_respuestas WHERE ticket_id = ?',
      [id]
    );

    if (respuestas[0].count === 1) {
      const minutosRespuesta = Math.floor((new Date() - new Date(tickets[0].fecha_creacion)) / 60000);
      await connection.query(
        'UPDATE tickets SET tiempo_respuesta_minutos = ? WHERE id = ?',
        [minutosRespuesta, id]
      );
    }

    // Notificar al usuario del ticket (si no es nota interna)
    if (!es_interno && tickets[0].usuario_id) {
      await connection.query(
        `INSERT INTO ticket_notificaciones (ticket_id, usuario_id, tipo, mensaje)
         VALUES (?, ?, 'nueva_respuesta', ?)`,
        [id, tickets[0].usuario_id, `Nueva respuesta en tu ticket: ${tickets[0].asunto}`]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Respuesta agregada exitosamente',
      respuesta_id: result.insertId
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al responder ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error al responder ticket',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// ============================================
// CAMBIAR ESTADO DEL TICKET
// ============================================
exports.cambiarEstadoTicket = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { estado, comentario } = req.body;
    const usuario_id = req.usuario.id;

    const estadosValidos = ['activo', 'en_proceso', 'resuelto', 'cancelado', 'vencido'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido'
      });
    }

    // Obtener estado actual
    const [tickets] = await connection.query('SELECT estado FROM tickets WHERE id = ?', [id]);
    if (tickets.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }

    const estado_anterior = tickets[0].estado;

    // Actualizar estado
    const updates = ['estado = ?'];
    const params = [estado];

    // Si se marca como resuelto, guardar fecha
    if (estado === 'resuelto') {
      updates.push('fecha_resolucion = NOW()');
      // Calcular tiempo de resolución
      const [ticketInfo] = await connection.query(
        'SELECT TIMESTAMPDIFF(MINUTE, fecha_creacion, NOW()) as minutos FROM tickets WHERE id = ?',
        [id]
      );
      updates.push('tiempo_resolucion_minutos = ?');
      params.push(ticketInfo[0].minutos);
    }

    params.push(id);

    await connection.query(
      `UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Registrar en historial
    await connection.query(
      `INSERT INTO ticket_historial (ticket_id, usuario_id, accion, valor_anterior, valor_nuevo, descripcion)
       VALUES (?, ?, 'estado_cambiado', ?, ?, ?)`,
      [id, usuario_id, estado_anterior, estado, comentario || null]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Estado actualizado exitosamente'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al cambiar estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// ============================================
// ASIGNAR TICKET
// ============================================
exports.asignarTicket = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { asignado_a } = req.body;
    const usuario_id = req.usuario.id;

    await connection.query(
      'UPDATE tickets SET asignado_a = ? WHERE id = ?',
      [asignado_a, id]
    );

    // Registrar en historial
    await connection.query(
      `INSERT INTO ticket_historial (ticket_id, usuario_id, accion, valor_nuevo)
       VALUES (?, ?, 'asignado', ?)`,
      [id, usuario_id, asignado_a]
    );

    // Notificar al usuario asignado
    if (asignado_a) {
      const [tickets] = await connection.query('SELECT asunto FROM tickets WHERE id = ?', [id]);
      await connection.query(
        `INSERT INTO ticket_notificaciones (ticket_id, usuario_id, tipo, mensaje)
         VALUES (?, ?, 'asignacion', ?)`,
        [id, asignado_a, `Se te ha asignado el ticket: ${tickets[0].asunto}`]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Ticket asignado exitosamente'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al asignar ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error al asignar ticket',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// ============================================
// OBTENER ESTADÍSTICAS
// ============================================
exports.obtenerEstadisticas = async (req, res) => {
  try {
    const usuario_id = req.usuario.id;
    const esAdmin = req.usuario.perfil === 'SuperAdmin' || req.usuario.perfil === 'Administrador';

    let whereClause = '';
    let params = [];

    if (!esAdmin) {
      whereClause = 'WHERE usuario_id = ? OR asignado_a = ?';
      params = [usuario_id, usuario_id];
    }

    // Estadísticas generales
    const [stats] = await db.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as activos,
        SUM(CASE WHEN estado = 'en_proceso' THEN 1 ELSE 0 END) as en_proceso,
        SUM(CASE WHEN estado = 'resuelto' THEN 1 ELSE 0 END) as resueltos,
        SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) as cancelados,
        SUM(CASE WHEN estado = 'vencido' THEN 1 ELSE 0 END) as vencidos,
        SUM(CASE WHEN prioridad = 'critica' THEN 1 ELSE 0 END) as criticos,
        SUM(CASE WHEN prioridad = 'alta' THEN 1 ELSE 0 END) as alta_prioridad,
        AVG(tiempo_resolucion_minutos) as tiempo_promedio_resolucion,
        AVG(tiempo_respuesta_minutos) as tiempo_promedio_respuesta
      FROM tickets
      ${whereClause}`,
      params
    );

    // Tickets por categoría
    const [porCategoria] = await db.query(
      `SELECT
        COALESCE(categoria, 'Sin categoría') as categoria,
        COUNT(*) as cantidad,
        tc.color,
        tc.icono
      FROM tickets t
      LEFT JOIN ticket_categorias tc ON t.categoria = tc.nombre
      ${whereClause}
      GROUP BY categoria, tc.color, tc.icono
      ORDER BY cantidad DESC`,
      params
    );

    // Actividad reciente (últimos 7 días)
    const [actividad] = await db.query(
      `SELECT
        DATE(fecha_creacion) as fecha,
        COUNT(*) as cantidad
      FROM tickets
      ${whereClause}
      ${whereClause ? 'AND' : 'WHERE'} fecha_creacion >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(fecha_creacion)
      ORDER BY fecha ASC`,
      params
    );

    res.json({
      success: true,
      estadisticas: stats[0],
      por_categoria: porCategoria,
      actividad_reciente: actividad
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
    const [categorias] = await db.query(
      'SELECT * FROM ticket_categorias WHERE activo = 1 ORDER BY orden ASC'
    );

    res.json({
      success: true,
      categorias
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
