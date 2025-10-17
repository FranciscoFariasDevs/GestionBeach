// backend/controllers/reservasController.js
const { sql, poolPromise } = require('../config/db');

// ============================================
// CRUD DE RESERVAS
// ============================================

// Obtener todas las reservas
exports.obtenerReservas = async (req, res) => {
  try {
    const { estado, cabana_id, fecha_desde, fecha_hasta } = req.query;

    const pool = await poolPromise;

    let query = `
      SELECT
        r.id, r.cabana_id, r.cliente_nombre, r.cliente_apellido,
        r.cliente_telefono, r.cliente_email, r.cliente_rut,
        r.fecha_inicio, r.fecha_fin, r.cantidad_personas, r.cantidad_noches,
        r.precio_por_noche, r.precio_total, r.descuento, r.precio_final,
        r.estado, r.metodo_pago, r.estado_pago, r.monto_pagado,
        r.origen, r.numero_whatsapp, r.notas,
        r.check_in_realizado, r.check_out_realizado,
        r.fecha_creacion,
        c.nombre as nombre_cabana,
        c.capacidad_personas as capacidad_cabana,
        (
          SELECT COUNT(*)
          FROM dbo.reservas_tinajas rt
          WHERE rt.reserva_cabana_id = r.id
            AND rt.estado = 'confirmada'
        ) as cantidad_tinajas,
        (
          SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END
          FROM dbo.reservas_tinajas rt
          WHERE rt.reserva_cabana_id = r.id
            AND rt.estado = 'confirmada'
        ) as tiene_tinaja
      FROM dbo.reservas_cabanas r
      INNER JOIN dbo.cabanas c ON r.cabana_id = c.id
      WHERE 1=1
    `;

    const request = pool.request();

    if (estado) {
      query += ` AND r.estado = @estado`;
      request.input('estado', sql.VarChar, estado);
    }

    if (cabana_id) {
      query += ` AND r.cabana_id = @cabana_id`;
      request.input('cabana_id', sql.Int, cabana_id);
    }

    if (fecha_desde) {
      query += ` AND r.fecha_inicio >= @fecha_desde`;
      request.input('fecha_desde', sql.Date, fecha_desde);
    }

    if (fecha_hasta) {
      query += ` AND r.fecha_fin <= @fecha_hasta`;
      request.input('fecha_hasta', sql.Date, fecha_hasta);
    }

    query += ` ORDER BY r.fecha_inicio DESC`;

    const resultado = await request.query(query);

    return res.json({
      success: true,
      reservas: resultado.recordset
    });

  } catch (error) {
    console.error('❌ Error al obtener reservas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener reservas',
      error: error.message
    });
  }
};

// Obtener una reserva por ID
exports.obtenerReservaPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    const resultado = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT
          r.*,
          c.nombre as nombre_cabana,
          c.descripcion as descripcion_cabana
        FROM dbo.reservas_cabanas r
        INNER JOIN dbo.cabanas c ON r.cabana_id = c.id
        WHERE r.id = @id
      `);

    if (resultado.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    return res.json({
      success: true,
      reserva: resultado.recordset[0]
    });

  } catch (error) {
    console.error('❌ Error al obtener reserva:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener reserva',
      error: error.message
    });
  }
};

// Crear reserva manual
exports.crearReserva = async (req, res) => {
  try {
    const {
      cabana_id,
      cliente_nombre,
      cliente_apellido,
      cliente_telefono,
      cliente_email,
      cliente_rut,
      fecha_inicio,
      fecha_fin,
      cantidad_personas,
      personas_extra,
      costo_personas_extra,
      precio_por_noche,
      precio_total,
      cantidad_noches,
      precio_final,
      descuento,
      estado,
      metodo_pago,
      estado_pago,
      monto_pagado,
      origen,
      numero_whatsapp,
      notas,
      usuario_creacion,
      tinajas
    } = req.body;

    // Validaciones básicas
    if (!cabana_id || !cliente_nombre || !cliente_telefono || !fecha_inicio || !fecha_fin || !cantidad_personas) {
      return res.status(400).json({
        success: false,
        message: 'Datos requeridos: cabaña, nombre cliente, teléfono, fechas y cantidad de personas'
      });
    }

    const pool = await poolPromise;

    // Verificar disponibilidad
    const disponibilidad = await pool.request()
      .input('cabana_id', sql.Int, cabana_id)
      .input('fecha_inicio', sql.Date, fecha_inicio)
      .input('fecha_fin', sql.Date, fecha_fin)
      .query(`
        SELECT COUNT(*) as total_bloqueos
        FROM dbo.bloqueos_cabanas
        WHERE cabana_id = @cabana_id
          AND (fecha_inicio <= @fecha_fin AND fecha_fin >= @fecha_inicio)
      `);

    if (disponibilidad.recordset[0].total_bloqueos > 0) {
      return res.status(400).json({
        success: false,
        message: 'La cabaña no está disponible para las fechas seleccionadas'
      });
    }

    // VERIFICAR disponibilidad de tinajas ANTES de crear la reserva
    if (tinajas && Array.isArray(tinajas) && tinajas.length > 0) {
      for (const tinaja of tinajas) {
        const verificacionTinaja = await pool.request()
          .input('tinaja_id', sql.Int, tinaja.tinaja_id)
          .input('fecha_uso', sql.Date, tinaja.fecha_uso)
          .query(`
            SELECT COUNT(*) as reservadas
            FROM dbo.reservas_tinajas
            WHERE tinaja_id = @tinaja_id
              AND fecha_uso = @fecha_uso
              AND estado = 'confirmada'
          `);

        if (verificacionTinaja.recordset[0].reservadas > 0) {
          return res.status(400).json({
            success: false,
            message: `La tinaja ${tinaja.tinaja_id} no está disponible para la fecha ${tinaja.fecha_uso}`
          });
        }
      }
    }

    // Crear reserva (SIN cantidad_noches y precio_final porque son columnas calculadas)
    const resultado = await pool.request()
      .input('cabana_id', sql.Int, cabana_id)
      .input('cliente_nombre', sql.VarChar, cliente_nombre)
      .input('cliente_apellido', sql.VarChar, cliente_apellido || null)
      .input('cliente_telefono', sql.VarChar, cliente_telefono)
      .input('cliente_email', sql.VarChar, cliente_email || null)
      .input('cliente_rut', sql.VarChar, cliente_rut || null)
      .input('fecha_inicio', sql.Date, fecha_inicio)
      .input('fecha_fin', sql.Date, fecha_fin)
      .input('cantidad_personas', sql.Int, cantidad_personas)
      .input('personas_extra', sql.Int, personas_extra || 0)
      .input('costo_personas_extra', sql.Decimal(18, 2), costo_personas_extra || 0)
      .input('precio_por_noche', sql.Decimal(18, 2), precio_por_noche)
      .input('precio_total', sql.Decimal(18, 2), precio_total)
      .input('descuento', sql.Decimal(18, 2), descuento || 0)
      .input('estado', sql.VarChar, estado || 'pendiente')
      .input('metodo_pago', sql.VarChar, metodo_pago || null)
      .input('estado_pago', sql.VarChar, estado_pago || 'pendiente')
      .input('monto_pagado', sql.Decimal(18, 2), monto_pagado || 0)
      .input('origen', sql.VarChar, origen || 'manual')
      .input('numero_whatsapp', sql.VarChar, numero_whatsapp || null)
      .input('notas', sql.Text, notas || null)
      .input('usuario_creacion', sql.VarChar, usuario_creacion || 'sistema')
      .query(`
        INSERT INTO dbo.reservas_cabanas (
          cabana_id, cliente_nombre, cliente_apellido, cliente_telefono, cliente_email, cliente_rut,
          fecha_inicio, fecha_fin, cantidad_personas, personas_extra, costo_personas_extra,
          precio_por_noche, precio_total, descuento,
          estado, metodo_pago, estado_pago, monto_pagado,
          origen, numero_whatsapp, notas, usuario_creacion
        )
        OUTPUT INSERTED.id
        VALUES (
          @cabana_id, @cliente_nombre, @cliente_apellido, @cliente_telefono, @cliente_email, @cliente_rut,
          @fecha_inicio, @fecha_fin, @cantidad_personas, @personas_extra, @costo_personas_extra,
          @precio_por_noche, @precio_total, @descuento,
          @estado, @metodo_pago, @estado_pago, @monto_pagado,
          @origen, @numero_whatsapp, @notas, @usuario_creacion
        )
      `);

    const reserva_id = resultado.recordset[0].id;

    // Crear reservas de tinajas (ya verificamos disponibilidad antes)
    if (tinajas && Array.isArray(tinajas) && tinajas.length > 0) {
      for (const tinaja of tinajas) {
        await pool.request()
          .input('reserva_cabana_id', sql.Int, reserva_id)
          .input('tinaja_id', sql.Int, tinaja.tinaja_id)
          .input('fecha_uso', sql.Date, tinaja.fecha_uso)
          .input('precio_dia', sql.Decimal(18, 2), tinaja.precio_dia)
          .query(`
            INSERT INTO dbo.reservas_tinajas (reserva_cabana_id, tinaja_id, fecha_uso, precio_dia, estado)
            VALUES (@reserva_cabana_id, @tinaja_id, @fecha_uso, @precio_dia, 'confirmada')
          `);
      }
    }

    // Crear bloqueo en calendario
    await pool.request()
      .input('cabana_id', sql.Int, cabana_id)
      .input('fecha_inicio', sql.Date, fecha_inicio)
      .input('fecha_fin', sql.Date, fecha_fin)
      .input('motivo', sql.VarChar, 'reserva')
      .input('reserva_id', sql.Int, reserva_id)
      .query(`
        INSERT INTO dbo.bloqueos_cabanas (cabana_id, fecha_inicio, fecha_fin, motivo, reserva_id)
        VALUES (@cabana_id, @fecha_inicio, @fecha_fin, @motivo, @reserva_id)
      `);

    return res.status(201).json({
      success: true,
      message: 'Reserva creada exitosamente',
      reserva_id: reserva_id
    });

  } catch (error) {
    console.error('❌ Error al crear reserva:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear reserva',
      error: error.message
    });
  }
};

// Actualizar reserva
exports.actualizarReserva = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      estado,
      metodo_pago,
      estado_pago,
      monto_pagado,
      notas,
      usuario_modificacion
    } = req.body;

    const pool = await poolPromise;

    // Construir query dinámicamente para solo actualizar campos enviados
    let updateFields = [];
    const request = pool.request().input('id', sql.Int, id);

    if (estado !== undefined) {
      updateFields.push('estado = @estado');
      request.input('estado', sql.VarChar, estado);
    }
    if (metodo_pago !== undefined) {
      updateFields.push('metodo_pago = @metodo_pago');
      request.input('metodo_pago', sql.VarChar, metodo_pago);
    }
    if (estado_pago !== undefined) {
      updateFields.push('estado_pago = @estado_pago');
      request.input('estado_pago', sql.VarChar, estado_pago);
    }
    if (monto_pagado !== undefined) {
      updateFields.push('monto_pagado = @monto_pagado');
      request.input('monto_pagado', sql.Decimal(18, 2), monto_pagado);
    }
    if (notas !== undefined) {
      updateFields.push('notas = @notas');
      request.input('notas', sql.Text, notas);
    }

    updateFields.push('usuario_modificacion = @usuario_modificacion');
    updateFields.push('fecha_modificacion = GETDATE()');
    request.input('usuario_modificacion', sql.VarChar, usuario_modificacion || 'sistema');

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay campos para actualizar'
      });
    }

    const query = `
      UPDATE dbo.reservas_cabanas
      SET ${updateFields.join(', ')}
      WHERE id = @id
    `;

    await request.query(query);

    return res.json({
      success: true,
      message: 'Reserva actualizada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al actualizar reserva:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar reserva',
      error: error.message
    });
  }
};

// Cancelar reserva
exports.cancelarReserva = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo_cancelacion, usuario_modificacion } = req.body;

    const pool = await poolPromise;

    // Actualizar estado de reserva
    await pool.request()
      .input('id', sql.Int, id)
      .input('motivo_cancelacion', sql.Text, motivo_cancelacion || 'Sin motivo especificado')
      .input('usuario_modificacion', sql.VarChar, usuario_modificacion || 'sistema')
      .query(`
        UPDATE dbo.reservas_cabanas
        SET estado = 'cancelada',
            fecha_cancelacion = GETDATE(),
            motivo_cancelacion = @motivo_cancelacion,
            usuario_modificacion = @usuario_modificacion,
            fecha_modificacion = GETDATE()
        WHERE id = @id
      `);

    // Eliminar bloqueo de calendario
    await pool.request()
      .input('reserva_id', sql.Int, id)
      .query(`
        DELETE FROM dbo.bloqueos_cabanas
        WHERE reserva_id = @reserva_id
      `);

    return res.json({
      success: true,
      message: 'Reserva cancelada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al cancelar reserva:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cancelar reserva',
      error: error.message
    });
  }
};

// Realizar check-in
exports.realizarCheckIn = async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await poolPromise;

    await pool.request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE dbo.reservas_cabanas
        SET check_in_realizado = 1,
            fecha_check_in = GETDATE(),
            estado = 'en_curso'
        WHERE id = @id
      `);

    return res.json({
      success: true,
      message: 'Check-in realizado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al realizar check-in:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al realizar check-in',
      error: error.message
    });
  }
};

// Realizar check-out
exports.realizarCheckOut = async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await poolPromise;

    await pool.request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE dbo.reservas_cabanas
        SET check_out_realizado = 1,
            fecha_check_out = GETDATE(),
            estado = 'completada'
        WHERE id = @id
      `);

    return res.json({
      success: true,
      message: 'Check-out realizado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al realizar check-out:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al realizar check-out',
      error: error.message
    });
  }
};

// ============================================
// ESTADÍSTICAS
// ============================================

exports.obtenerEstadisticas = async (req, res) => {
  try {
    const pool = await poolPromise;

    const stats = await pool.request()
      .query(`
        SELECT
          COUNT(*) as total_reservas,
          COUNT(CASE WHEN estado = 'confirmada' THEN 1 END) as confirmadas,
          COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
          COUNT(CASE WHEN estado = 'en_curso' THEN 1 END) as en_curso,
          COUNT(CASE WHEN estado = 'completada' THEN 1 END) as completadas,
          COUNT(CASE WHEN estado = 'cancelada' THEN 1 END) as canceladas,
          SUM(precio_final) as ingresos_totales,
          SUM(monto_pagado) as monto_pagado_total,
          AVG(cantidad_personas) as promedio_personas
        FROM dbo.reservas_cabanas
        WHERE YEAR(fecha_creacion) = YEAR(GETDATE())
      `);

    return res.json({
      success: true,
      estadisticas: stats.recordset[0]
    });

  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};

module.exports = exports;
