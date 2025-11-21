// backend/controllers/webpayController.js
const { tx, RETURN_URL, FRONTEND_URL, isDevelopment } = require('../config/webpay');
const { sql, poolPromise } = require('../config/db');

// ============================================
// CREAR TRANSACCIÓN WEBPAY
// ============================================

exports.crearTransaccion = async (req, res) => {
  try {
    const {
      reserva_id,
      monto,
      descripcion
    } = req.body;

    // Validaciones
    if (!reserva_id || !monto) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos: reserva_id y monto'
      });
    }

    if (monto <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El monto debe ser mayor a 0'
      });
    }

    const pool = await poolPromise;

    // Verificar que la reserva existe
    const reservaResult = await pool.request()
      .input('reserva_id', sql.Int, reserva_id)
      .query('SELECT * FROM reservas_cabanas WHERE id = @reserva_id');

    if (reservaResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    const reserva = reservaResult.recordset[0];

    // Generar un número de orden único (buy_order)
    // Formato: RESERVA-{id}-{timestamp}
    const buyOrder = `RESERVA-${reserva_id}-${Date.now()}`;

    // Session ID: identificador único de la sesión
    const sessionId = `SESSION-${reserva_id}-${Date.now()}`;

    console.log(`📦 Creando transacción Webpay:`);
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

    // Guardar la transacción en la base de datos
    await pool.request()
      .input('reserva_id', sql.Int, reserva_id)
      .input('buy_order', sql.NVarChar, buyOrder)
      .input('session_id', sql.NVarChar, sessionId)
      .input('token', sql.NVarChar, createResponse.token)
      .input('monto', sql.Decimal(10, 2), monto)
      .input('estado', sql.VarChar, 'INICIADO')
      .query(`
        INSERT INTO transacciones_webpay (
          reserva_id, buy_order, session_id, token, monto, estado, fecha_creacion
        )
        VALUES (
          @reserva_id, @buy_order, @session_id, @token, @monto, @estado, GETDATE()
        )
      `);

    console.log('✅ Transacción guardada en BD');

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
      return res.redirect(`${FRONTEND_URL}/pago-error?error=no_token`);
    }

    console.log(`🔍 Confirmando transacción con token: ${token}`);

    // Confirmar la transacción con Webpay
    const commitResponse = await tx.commit(token);

    console.log('📋 Respuesta de Webpay:', JSON.stringify(commitResponse, null, 2));

    const pool = await poolPromise;

    // Buscar la transacción en la BD
    const transaccionResult = await pool.request()
      .input('token', sql.NVarChar, token)
      .query('SELECT * FROM transacciones_webpay WHERE token = @token');

    if (transaccionResult.recordset.length === 0) {
      console.error('❌ Transacción no encontrada en BD');
      return res.redirect(`${FRONTEND_URL}/pago-error?error=transaccion_no_encontrada`);
    }

    const transaccion = transaccionResult.recordset[0];
    const reservaId = transaccion.reserva_id;

    // Verificar el estado de la transacción
    const aprobada = commitResponse.status === 'AUTHORIZED' && commitResponse.response_code === 0;

    if (aprobada) {
      console.log('✅ Pago APROBADO');

      // Actualizar la transacción en BD
      await pool.request()
        .input('token', sql.NVarChar, token)
        .input('estado', sql.VarChar, 'APROBADO')
        .input('authorization_code', sql.NVarChar, commitResponse.authorization_code || null)
        .input('payment_type_code', sql.VarChar, commitResponse.payment_type_code || null)
        .input('response_code', sql.Int, commitResponse.response_code)
        .query(`
          UPDATE transacciones_webpay
          SET
            estado = @estado,
            authorization_code = @authorization_code,
            payment_type_code = @payment_type_code,
            response_code = @response_code,
            fecha_confirmacion = GETDATE()
          WHERE token = @token
        `);

      // Obtener información de la reserva para verificar tipo de pago
      const reservaResult = await pool.request()
        .input('reserva_id', sql.Int, reservaId)
        .query('SELECT precio_total, tipo_pago, monto_pagado FROM reservas_cabanas WHERE id = @reserva_id');

      const reserva = reservaResult.recordset[0];
      const nuevoMontoPagado = parseFloat(reserva.monto_pagado || 0) + parseFloat(commitResponse.amount);
      const precioTotal = parseFloat(reserva.precio_total);

      // Determinar estado de pago según tipo_pago y monto pagado
      let estadoPago = 'pendiente';

      if (reserva.tipo_pago === 'mitad') {
        // Si el tipo es "mitad", verificar si ya pagó todo o solo la mitad
        if (nuevoMontoPagado >= precioTotal) {
          estadoPago = 'pagado'; // Ya pagó todo
        } else {
          estadoPago = 'pago_parcial'; // Solo pagó la mitad
        }
      } else {
        // Si el tipo es "completo", debe estar pagado
        estadoPago = 'pagado';
      }

      // Actualizar la reserva
      await pool.request()
        .input('reserva_id', sql.Int, reservaId)
        .input('monto_pagado', sql.Decimal(10, 2), nuevoMontoPagado)
        .input('estado_pago', sql.VarChar, estadoPago)
        .query(`
          UPDATE reservas_cabanas
          SET
            estado_pago = @estado_pago,
            monto_pagado = @monto_pagado,
            estado = 'confirmada'
          WHERE id = @reserva_id
        `);

      console.log(`✅ Reserva ${reservaId} actualizada como PAGADA`);

      // Redirigir al frontend con éxito
      return res.redirect(`${FRONTEND_URL}/pago-exitoso?reserva_id=${reservaId}&token=${token}`);

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

      // Redirigir al frontend con error
      return res.redirect(`${FRONTEND_URL}/pago-error?reserva_id=${reservaId}&codigo=${commitResponse.response_code}`);
    }

  } catch (error) {
    console.error('❌ Error al confirmar transacción:', error);
    return res.redirect(`${FRONTEND_URL}/pago-error?error=exception`);
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
