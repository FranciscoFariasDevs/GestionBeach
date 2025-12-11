// backend/controllers/webpayController.js
const { tx, RETURN_URL, FRONTEND_URL, isDevelopment } = require('../config/webpay');
const { sql, poolPromise } = require('../config/db');

// ============================================
// CREAR TRANSACCIÓN WEBPAY
// ============================================

exports.crearTransaccion = async (req, res) => {
  try {
    const {
      monto,
      descripcion,
      // Datos de la reserva (ahora NO se crea hasta confirmar pago)
      reservaData
    } = req.body;

    // Validaciones
    if (!monto || !reservaData) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos: monto y reservaData'
      });
    }

    if (monto <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El monto debe ser mayor a 0'
      });
    }

    const pool = await poolPromise;

    // Generar un número de orden único (buy_order)
    const timestamp = Date.now();
    const buyOrder = `PENDIENTE-${timestamp}`;
    const sessionId = `SESSION-${timestamp}`;

    console.log(`📦 Creando transacción Webpay (sin reserva previa):`);
    console.log(`   - Buy Order: ${buyOrder}`);
    console.log(`   - Session ID: ${sessionId}`);
    console.log(`   - Monto: $${monto}`);
    console.log(`   - Return URL: ${RETURN_URL}`);

    // Crear la transacción en Webpay
    const createResponse = await tx.create(
      buyOrder,
      sessionId,
      Math.round(monto), // Webpay requiere monto entero (sin decimales)
      RETURN_URL
    );

    console.log('✅ Transacción creada en Webpay:', createResponse);

    // Guardar la RESERVA PENDIENTE (no la reserva final)
    const fechaExpiracion = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

    await pool.request()
      .input('cabana_id', sql.Int, reservaData.cabana_id)
      .input('fecha_inicio', sql.Date, reservaData.fecha_inicio)
      .input('fecha_fin', sql.Date, reservaData.fecha_fin)
      .input('cantidad_noches', sql.Int, reservaData.cantidad_noches)
      .input('cantidad_personas', sql.Int, reservaData.cantidad_personas)
      .input('personas_extra', sql.Int, reservaData.personas_extra || 0)
      .input('precio_noche', sql.Decimal(10, 2), reservaData.precio_noche)
      .input('precio_total', sql.Decimal(10, 2), reservaData.precio_total)
      .input('costo_personas_extra', sql.Decimal(10, 2), reservaData.costo_personas_extra || 0)
      .input('cliente_nombre', sql.NVarChar, reservaData.cliente_nombre)
      .input('cliente_apellido', sql.NVarChar, reservaData.cliente_apellido)
      .input('cliente_telefono', sql.NVarChar, reservaData.cliente_telefono)
      .input('cliente_email', sql.NVarChar, reservaData.cliente_email)
      .input('cliente_rut', sql.NVarChar, reservaData.cliente_rut || null)
      .input('procedencia', sql.NVarChar, reservaData.procedencia || null)
      .input('tiene_auto', sql.Bit, reservaData.tiene_auto || 0)
      .input('matriculas_auto', sql.NVarChar, JSON.stringify(reservaData.matriculas_auto || []))
      .input('metodo_pago', sql.VarChar, 'webpay')
      .input('tipo_pago', sql.VarChar, reservaData.tipo_pago || 'completo')
      .input('monto_a_pagar', sql.Decimal(10, 2), monto)
      .input('codigo_descuento', sql.NVarChar, reservaData.codigo_descuento || null)
      .input('descuento_aplicado', sql.Decimal(10, 2), reservaData.descuento_aplicado || 0)
      .input('tinajas', sql.NVarChar, JSON.stringify(reservaData.tinajas || []))
      .input('notas', sql.NVarChar, reservaData.notas || null)
      .input('webpay_token', sql.NVarChar, createResponse.token)
      .input('fecha_expiracion', sql.DateTime, fechaExpiracion)
      .query(`
        INSERT INTO reservas_pendientes (
          cabana_id, fecha_inicio, fecha_fin, cantidad_noches, cantidad_personas, personas_extra,
          precio_noche, precio_total, costo_personas_extra,
          cliente_nombre, cliente_apellido, cliente_telefono, cliente_email, cliente_rut, procedencia,
          tiene_auto, matriculas_auto,
          metodo_pago, tipo_pago, monto_a_pagar,
          codigo_descuento, descuento_aplicado, tinajas, notas,
          webpay_token, fecha_expiracion, estado
        )
        VALUES (
          @cabana_id, @fecha_inicio, @fecha_fin, @cantidad_noches, @cantidad_personas, @personas_extra,
          @precio_noche, @precio_total, @costo_personas_extra,
          @cliente_nombre, @cliente_apellido, @cliente_telefono, @cliente_email, @cliente_rut, @procedencia,
          @tiene_auto, @matriculas_auto,
          @metodo_pago, @tipo_pago, @monto_a_pagar,
          @codigo_descuento, @descuento_aplicado, @tinajas, @notas,
          @webpay_token, @fecha_expiracion, 'pendiente'
        )
      `);

    // Guardar la transacción en la BD (sin reserva_id por ahora)
    await pool.request()
      .input('buy_order', sql.NVarChar, buyOrder)
      .input('session_id', sql.NVarChar, sessionId)
      .input('token', sql.NVarChar, createResponse.token)
      .input('monto', sql.Decimal(10, 2), monto)
      .input('estado', sql.VarChar, 'INICIADO')
      .query(`
        INSERT INTO transacciones_webpay (
          buy_order, session_id, token, monto, estado, fecha_creacion
        )
        VALUES (
          @buy_order, @session_id, @token, @monto, @estado, GETDATE()
        )
      `);

    console.log('✅ Reserva pendiente y transacción guardadas en BD');

    // Retornar la URL y token para redirigir al usuario
    return res.json({
      success: true,
      data: {
        token: createResponse.token,
        url: createResponse.url
      }
    });

  } catch (error) {
    console.error('❌ Error al crear transacción Webpay:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear transacción de pago',
      error: error.message
    });
  }
};

// ============================================
// CONFIRMAR TRANSACCIÓN (Callback de Webpay)
// ============================================

exports.confirmarTransaccion = async (req, res) => {
  try {
    // Webpay envía el token en la query string o en el body
    const token = req.body.token_ws || req.query.token_ws;

    if (!token) {
      console.error('❌ No se recibió token de Webpay');
      return res.redirect(`${FRONTEND_URL}/?pago=error&error=no_token`);
    }

    console.log(`🔍 Confirmando transacción con token: ${token}`);

    // Confirmar la transacción con Webpay
    const commitResponse = await tx.commit(token);

    console.log('📋 Respuesta de Webpay:', JSON.stringify(commitResponse, null, 2));

    const pool = await poolPromise;

    // Buscar la reserva pendiente por token
    const pendienteResult = await pool.request()
      .input('token', sql.NVarChar, token)
      .query('SELECT * FROM reservas_pendientes WHERE webpay_token = @token AND estado = \'pendiente\'');

    if (pendienteResult.recordset.length === 0) {
      console.error('❌ Reserva pendiente no encontrada');
      return res.redirect(`${FRONTEND_URL}/reserva-cabanas?pago=error&error=reserva_no_encontrada`);
    }

    const reservaPendiente = pendienteResult.recordset[0];

    // Verificar el estado de la transacción
    const aprobada = commitResponse.status === 'AUTHORIZED' && commitResponse.response_code === 0;

    if (aprobada) {
      console.log('✅ Pago APROBADO - Creando reserva real...');

      // CREAR LA RESERVA REAL AHORA QUE EL PAGO FUE EXITOSO
      const tinajas = JSON.parse(reservaPendiente.tinajas || '[]');
      const matriculas = JSON.parse(reservaPendiente.matriculas_auto || '[]');

      // Determinar estado de pago
      const montoPagado = parseFloat(commitResponse.amount);
      const precioTotal = parseFloat(reservaPendiente.precio_total);
      let estadoPago = 'pagado';

      if (reservaPendiente.tipo_pago === 'mitad') {
        estadoPago = montoPagado >= precioTotal ? 'pagado' : 'pago_parcial';
      }

      // Insertar la reserva REAL
      const reservaResult = await pool.request()
        .input('cabana_id', sql.Int, reservaPendiente.cabana_id)
        .input('fecha_inicio', sql.Date, reservaPendiente.fecha_inicio)
        .input('fecha_fin', sql.Date, reservaPendiente.fecha_fin)
        .input('cantidad_noches', sql.Int, reservaPendiente.cantidad_noches)
        .input('cantidad_personas', sql.Int, reservaPendiente.cantidad_personas)
        .input('personas_extra', sql.Int, reservaPendiente.personas_extra)
        .input('precio_noche', sql.Decimal(10, 2), reservaPendiente.precio_noche)
        .input('precio_total', sql.Decimal(10, 2), reservaPendiente.precio_total)
        .input('costo_personas_extra', sql.Decimal(10, 2), reservaPendiente.costo_personas_extra)
        .input('cliente_nombre', sql.NVarChar, reservaPendiente.cliente_nombre)
        .input('cliente_apellido', sql.NVarChar, reservaPendiente.cliente_apellido)
        .input('cliente_telefono', sql.NVarChar, reservaPendiente.cliente_telefono)
        .input('cliente_email', sql.NVarChar, reservaPendiente.cliente_email)
        .input('cliente_rut', sql.NVarChar, reservaPendiente.cliente_rut)
        .input('procedencia', sql.NVarChar, reservaPendiente.procedencia)
        .input('tiene_auto', sql.Bit, reservaPendiente.tiene_auto)
        .input('matriculas_auto', sql.NVarChar, reservaPendiente.matriculas_auto)
        .input('metodo_pago', sql.VarChar, 'webpay')
        .input('tipo_pago', sql.VarChar, reservaPendiente.tipo_pago)
        .input('estado_pago', sql.VarChar, estadoPago)
        .input('monto_pagado', sql.Decimal(10, 2), montoPagado)
        .input('notas', sql.NVarChar, reservaPendiente.notas)
        .input('estado', sql.VarChar, 'confirmada')
        .input('origen', sql.VarChar, 'webpay')
        .input('usuario_creacion', sql.VarChar, 'webpay_sistema')
        .query(`
          INSERT INTO reservas_cabanas (
            cabana_id, fecha_inicio, fecha_fin, cantidad_noches, cantidad_personas, personas_extra,
            precio_noche, precio_total, costo_personas_extra,
            cliente_nombre, cliente_apellido, cliente_telefono, cliente_email, cliente_rut, procedencia,
            tiene_auto, matriculas_auto,
            metodo_pago, tipo_pago, estado_pago, monto_pagado,
            notas, estado, origen, usuario_creacion, fecha_creacion
          )
          OUTPUT INSERTED.id
          VALUES (
            @cabana_id, @fecha_inicio, @fecha_fin, @cantidad_noches, @cantidad_personas, @personas_extra,
            @precio_noche, @precio_total, @costo_personas_extra,
            @cliente_nombre, @cliente_apellido, @cliente_telefono, @cliente_email, @cliente_rut, @procedencia,
            @tiene_auto, @matriculas_auto,
            @metodo_pago, @tipo_pago, @estado_pago, @monto_pagado,
            @notas, @estado, @origen, @usuario_creacion, GETDATE()
          )
        `);

      const reservaId = reservaResult.recordset[0].id;
      console.log(`✅ Reserva ${reservaId} creada exitosamente`);

      // Insertar tinajas si existen
      if (tinajas.length > 0) {
        for (const tinaja of tinajas) {
          await pool.request()
            .input('reserva_id', sql.Int, reservaId)
            .input('tinaja_id', sql.Int, tinaja.tinaja_id)
            .input('fecha_uso', sql.Date, tinaja.fecha_uso)
            .input('precio_dia', sql.Decimal(10, 2), tinaja.precio_dia)
            .query(`
              INSERT INTO reserva_tinajas (reserva_id, tinaja_id, fecha_uso, precio_dia)
              VALUES (@reserva_id, @tinaja_id, @fecha_uso, @precio_dia)
            `);
        }
        console.log(`✅ ${tinajas.length} tinaja(s) asociada(s)`);
      }

      // Actualizar la transacción con el reserva_id
      await pool.request()
        .input('token', sql.NVarChar, token)
        .input('reserva_id', sql.Int, reservaId)
        .input('estado', sql.VarChar, 'APROBADO')
        .input('authorization_code', sql.NVarChar, commitResponse.authorization_code || null)
        .input('payment_type_code', sql.VarChar, commitResponse.payment_type_code || null)
        .input('response_code', sql.Int, commitResponse.response_code)
        .query(`
          UPDATE transacciones_webpay
          SET
            reserva_id = @reserva_id,
            estado = @estado,
            authorization_code = @authorization_code,
            payment_type_code = @payment_type_code,
            response_code = @response_code,
            fecha_confirmacion = GETDATE()
          WHERE token = @token
        `);

      // Marcar la reserva pendiente como procesada
      await pool.request()
        .input('token', sql.NVarChar, token)
        .query(`
          UPDATE reservas_pendientes
          SET estado = 'procesada'
          WHERE webpay_token = @token
        `);

      console.log(`✅ Pago procesado completamente - Reserva ID: ${reservaId}`);

      // Redirigir al frontend con éxito
      return res.redirect(`${FRONTEND_URL}/reserva-cabanas?pago=exitoso&reserva_id=${reservaId}`);

    } else {
      console.log('❌ Pago RECHAZADO o FALLIDO');

      // Actualizar la transacción como rechazada
      await pool.request()
        .input('token', sql.NVarChar, token)
        .input('estado', sql.VarChar, 'RECHAZADO')
        .input('response_code', sql.Int, commitResponse.response_code || -1)
        .query(`
          UPDATE transacciones_webpay
          SET
            estado = @estado,
            response_code = @response_code,
            fecha_confirmacion = GETDATE()
          WHERE token = @token
        `);

      // Marcar la reserva pendiente como cancelada (NO se crea la reserva)
      await pool.request()
        .input('token', sql.NVarChar, token)
        .query(`
          UPDATE reservas_pendientes
          SET estado = 'cancelada'
          WHERE webpay_token = @token
        `);

      console.log('✅ Reserva pendiente marcada como cancelada - NO se creó reserva');

      // Redirigir al frontend con error
      return res.redirect(`${FRONTEND_URL}/reserva-cabanas?pago=error&codigo=${commitResponse.response_code}`);
    }

  } catch (error) {
    console.error('❌ Error al confirmar transacción:', error);
    return res.redirect(`${FRONTEND_URL}/?pago=error&error=exception`);
  }
};

// ============================================
// CONSULTAR ESTADO DE TRANSACCIÓN
// ============================================

exports.consultarTransaccion = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }

    const pool = await poolPromise;

    const result = await pool.request()
      .input('token', sql.NVarChar, token)
      .query(`
        SELECT
          t.*,
          r.cliente_nombre,
          r.cliente_apellido,
          r.precio_total
        FROM transacciones_webpay t
        LEFT JOIN reservas_cabanas r ON t.reserva_id = r.id
        WHERE t.token = @token
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
    }

    return res.json({
      success: true,
      data: result.recordset[0]
    });

  } catch (error) {
    console.error('❌ Error al consultar transacción:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al consultar transacción',
      error: error.message
    });
  }
};

// ============================================
// OBTENER TRANSACCIONES DE UNA RESERVA
// ============================================

exports.getTransaccionesByReserva = async (req, res) => {
  try {
    const { reserva_id } = req.params;

    const pool = await poolPromise;

    const result = await pool.request()
      .input('reserva_id', sql.Int, reserva_id)
      .query(`
        SELECT * FROM transacciones_webpay
        WHERE reserva_id = @reserva_id
        ORDER BY fecha_creacion DESC
      `);

    return res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('❌ Error al obtener transacciones:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener transacciones',
      error: error.message
    });
  }
};

// ============================================
// REEMBOLSO / ANULACIÓN DE TRANSACCIÓN
// ============================================

exports.reembolsarTransaccion = async (req, res) => {
  try {
    const { token, monto, motivo } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token de transacción requerido'
      });
    }

    console.log(`💰 Iniciando reembolso para token: ${token}`);

    const pool = await poolPromise;

    // Buscar la transacción
    const transaccionResult = await pool.request()
      .input('token', sql.NVarChar, token)
      .query('SELECT * FROM transacciones_webpay WHERE token = @token');

    if (transaccionResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
    }

    const transaccion = transaccionResult.recordset[0];

    if (transaccion.estado !== 'APROBADO') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden reembolsar transacciones aprobadas'
      });
    }

    // Determinar el monto del reembolso
    const montoReembolso = monto || transaccion.monto;

    // Ejecutar reembolso con Webpay
    const refundResponse = await tx.refund(token, parseFloat(montoReembolso));

    console.log('📋 Respuesta de reembolso Webpay:', JSON.stringify(refundResponse, null, 2));

    // Actualizar la transacción en BD
    await pool.request()
      .input('token', sql.NVarChar, token)
      .input('estado', sql.VarChar, 'REEMBOLSADO')
      .query(`
        UPDATE transacciones_webpay
        SET estado = @estado
        WHERE token = @token
      `);

    // Actualizar la reserva
    const reservaId = transaccion.reserva_id;

    // Obtener reserva actual
    const reservaResult = await pool.request()
      .input('reserva_id', sql.Int, reservaId)
      .query('SELECT monto_pagado, precio_total, estado_pago FROM reservas_cabanas WHERE id = @reserva_id');

    const reserva = reservaResult.recordset[0];
    const nuevoMontoPagado = Math.max(0, parseFloat(reserva.monto_pagado) - parseFloat(montoReembolso));
    const precioTotal = parseFloat(reserva.precio_total);

    // Determinar nuevo estado de pago
    let nuevoEstadoPago = 'pendiente';
    if (nuevoMontoPagado >= precioTotal) {
      nuevoEstadoPago = 'pagado';
    } else if (nuevoMontoPagado > 0) {
      nuevoEstadoPago = 'pago_parcial';
    }

    await pool.request()
      .input('reserva_id', sql.Int, reservaId)
      .input('monto_pagado', sql.Decimal(10, 2), nuevoMontoPagado)
      .input('estado_pago', sql.VarChar, nuevoEstadoPago)
      .query(`
        UPDATE reservas_cabanas
        SET
          monto_pagado = @monto_pagado,
          estado_pago = @estado_pago
        WHERE id = @reserva_id
      `);

    console.log(`✅ Reembolso exitoso: $${montoReembolso}`);

    return res.json({
      success: true,
      message: 'Reembolso procesado exitosamente',
      data: {
        monto_reembolsado: montoReembolso,
        nuevo_monto_pagado: nuevoMontoPagado,
        nuevo_estado_pago: nuevoEstadoPago,
        refund_response: refundResponse
      }
    });

  } catch (error) {
    console.error('❌ Error al procesar reembolso:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar reembolso',
      error: error.message
    });
  }
};

module.exports = exports;
