// backend/controllers/ticketController.js - SQL SERVER VERSION
const { sql, poolPromise } = require('../config/db');

// ============================================
// CREAR NUEVO TICKET (PÚBLICO)
// ============================================
exports.crearTicket = async (req, res) => {
  try {
    const pool = await poolPromise;

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

    // Insertar ticket
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
      .query(`
        INSERT INTO tickets (
          numero_ticket, asunto, mensaje, usuario_id, nombre_reportante,
          email_reportante, telefono_reportante, sucursal_id, departamento,
          estado, prioridad, categoria, fecha_vencimiento, ip_origen, user_agent
        )
        OUTPUT INSERTED.id
        VALUES (
          @numero_ticket, @asunto, @mensaje, @usuario_id, @nombre_reportante,
          @email_reportante, @telefono_reportante, @sucursal_id, @departamento,
          'activo', @prioridad, @categoria, @fecha_vencimiento, @ip_origen, @user_agent
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
// ============================================
exports.obtenerMisTickets = async (req, res) => {
  try {
    const pool = await poolPromise;
    const usuario_id = req.usuario.id;
    const { estado, limite = 50, pagina = 1 } = req.query;

    let whereClause = 'WHERE t.usuario_id = @usuario_id';
    const request = pool.request().input('usuario_id', sql.Int, usuario_id);

    if (estado && estado !== 'todos') {
      whereClause += ' AND t.estado = @estado';
      request.input('estado', sql.VarChar(20), estado);
    }

    const offset = (pagina - 1) * limite;
    request.input('limite', sql.Int, parseInt(limite));
    request.input('offset', sql.Int, parseInt(offset));

    const result = await request.query(`
      SELECT
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
        CASE t.prioridad
          WHEN 'critica' THEN 1
          WHEN 'alta' THEN 2
          WHEN 'media' THEN 3
          WHEN 'baja' THEN 4
        END,
        t.fecha_creacion DESC
      OFFSET @offset ROWS
      FETCH NEXT @limite ROWS ONLY
    `);

    // Obtener conteo total
    const countRequest = pool.request().input('usuario_id', sql.Int, usuario_id);
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
      SELECT
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
      OFFSET @offset ROWS
      FETCH NEXT @limite ROWS ONLY
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
    const usuario_id = req.usuario?.id;

    // Obtener ticket
    const ticketResult = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT
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
    const esAdmin = req.usuario?.perfil === 'SuperAdmin' || req.usuario?.perfil === 'Administrador';
    if (!esAdmin && ticket.usuario_id !== usuario_id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver este ticket'
      });
    }

    // Obtener respuestas
    let whereRespuestas = '';
    if (!esAdmin) {
      whereRespuestas = 'WHERE es_interno = 0';
    }

    const respuestasResult = await pool.request()
      .input('ticket_id', sql.Int, id)
      .query(`
        SELECT
          r.*,
          u.nombre as usuario_nombre,
          u.email as usuario_email
        FROM ticket_respuestas r
        LEFT JOIN usuarios u ON r.usuario_id = u.id
        WHERE r.ticket_id = @ticket_id ${whereRespuestas && 'AND ' + whereRespuestas}
        ORDER BY r.fecha_creacion ASC
      `);

    // Obtener historial
    const historialResult = await pool.request()
      .input('ticket_id', sql.Int, id)
      .query(`
        SELECT
          h.*,
          u.nombre as usuario_nombre
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
// RESPONDER A UN TICKET
// ============================================
exports.responderTicket = async (req, res) => {
  try {
    const pool = await poolPromise;
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
    const ticketResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM tickets WHERE id = @id');

    if (ticketResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }

    const ticket = ticketResult.recordset[0];

    // Insertar respuesta
    const result = await pool.request()
      .input('ticket_id', sql.Int, id)
      .input('usuario_id', sql.Int, usuario_id)
      .input('nombre_usuario', sql.VarChar(100), nombre_usuario)
      .input('mensaje', sql.NVarChar(sql.MAX), mensaje)
      .input('es_interno', sql.Bit, es_interno)
      .query(`
        INSERT INTO ticket_respuestas (ticket_id, usuario_id, nombre_usuario, mensaje, es_interno)
        OUTPUT INSERTED.id
        VALUES (@ticket_id, @usuario_id, @nombre_usuario, @mensaje, @es_interno)
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

    res.json({
      success: true,
      message: 'Respuesta agregada exitosamente',
      respuesta_id: result.recordset[0].id
    });

  } catch (error) {
    console.error('Error al responder ticket:', error);
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
    const usuario_id = req.usuario.id;

    const estadosValidos = ['activo', 'en_proceso', 'resuelto', 'cancelado', 'vencido'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido'
      });
    }

    // Obtener estado actual
    const ticketResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT estado, fecha_creacion FROM tickets WHERE id = @id');

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
// ASIGNAR TICKET
// ============================================
exports.asignarTicket = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { id } = req.params;
    const { asignado_a } = req.body;
    const usuario_id = req.usuario.id;

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
    const usuario_id = req.usuario.id;
    const esAdmin = req.usuario.perfil === 'SuperAdmin' || req.usuario.perfil === 'Administrador';

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
