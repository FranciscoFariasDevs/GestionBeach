// backend/controllers/khipuController.js
const axios = require('axios');
const { sql, poolPromise } = require('../config/db');

const KHIPU_API = 'https://payment-api.khipu.com/v3';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://reservas.beach.cl';
const BASE_URL = process.env.WEBPAY_BASE_URL || 'https://api.beach.cl';

function khipuHeaders() {
  return {
    'x-api-key': process.env.KHIPU_SECRET,
    'Content-Type': 'application/json',
  };
}

// ============================================
// CREAR PAGO KHIPU
// ============================================
exports.crearPago = async (req, res) => {
  try {
    const { monto, descripcion, reservaData } = req.body;

    if (!monto || !reservaData) {
      return res.status(400).json({ success: false, message: 'Faltan datos requeridos: monto y reservaData' });
    }
    if (monto <= 0) {
      return res.status(400).json({ success: false, message: 'El monto debe ser mayor a 0' });
    }

    const pool = await poolPromise;
    const timestamp = Date.now();

    console.log(`📦 Creando pago Khipu - Monto: $${monto}`);

    const khipuResponse = await axios.post(
      `${KHIPU_API}/payments`,
      {
        subject: descripcion || 'Reserva Cabaña El Mirador',
        amount: Math.round(monto),
        currency: 'CLP',
        return_url: `${FRONTEND_URL}/reserva-cabanas?pago=khipu_exitoso&payment_id={payment_id}`,
        cancel_url: `${FRONTEND_URL}/reserva-cabanas?pago=khipu_cancelado`,
        notify_url: `${BASE_URL}/api/khipu/confirmar`,
        notify_api_version: '1.3',
      },
      { headers: khipuHeaders() }
    );

    const { payment_id, payment_url } = khipuResponse.data;
    console.log(`✅ Pago Khipu creado: ${payment_id} → ${payment_url}`);

    // Guardar reserva pendiente
    const fechaExpiracion = new Date(Date.now() + 30 * 60 * 1000);
    const matriculasStr = JSON.stringify(reservaData.matriculas_auto || []);

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
      .input('matriculas_auto', sql.NVarChar, matriculasStr)
      .input('metodo_pago', sql.VarChar, 'khipu')
      .input('tipo_pago', sql.VarChar, reservaData.tipo_pago || 'completo')
      .input('monto_a_pagar', sql.Decimal(10, 2), monto)
      .input('codigo_descuento', sql.NVarChar, reservaData.codigo_descuento || null)
      .input('descuento_aplicado', sql.Decimal(10, 2), reservaData.descuento_aplicado || 0)
      .input('tinajas', sql.NVarChar, JSON.stringify(reservaData.tinajas || []))
      .input('notas', sql.NVarChar, reservaData.notas || null)
      .input('webpay_token', sql.NVarChar, payment_id) // reutilizamos el campo para el payment_id de khipu
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

    return res.json({ success: true, data: { payment_id, payment_url } });

  } catch (error) {
    console.error('❌ Error al crear pago Khipu:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: 'Error al crear pago con Khipu',
      error: error.response?.data?.message || error.message
    });
  }
};

// ============================================
// CONFIRMAR PAGO (Webhook de Khipu)
// ============================================
exports.confirmarPago = async (req, res) => {
  try {
    const { payment_id } = req.body;

    if (!payment_id) {
      console.error('❌ Webhook Khipu sin payment_id');
      return res.status(200).send('OK'); // Khipu requiere 200 siempre
    }

    console.log(`🔔 Webhook Khipu recibido: payment_id=${payment_id}`);

    // Verificar estado real con la API de Khipu
    const verificacion = await axios.get(
      `${KHIPU_API}/payments/${payment_id}`,
      { headers: khipuHeaders() }
    );

    const { status, amount } = verificacion.data;
    console.log(`📋 Estado Khipu: ${status} - Monto: ${amount}`);

    if (status !== 'done') {
      console.log(`⚠️ Pago Khipu no completado (status: ${status}), ignorando`);
      return res.status(200).send('OK');
    }

    const pool = await poolPromise;

    // Buscar reserva pendiente por payment_id (guardado en webpay_token)
    const pendienteResult = await pool.request()
      .input('payment_id', sql.NVarChar, payment_id)
      .query(`SELECT * FROM reservas_pendientes WHERE webpay_token = @payment_id AND estado = 'pendiente'`);

    if (pendienteResult.recordset.length === 0) {
      console.log('⚠️ Reserva pendiente no encontrada (posiblemente ya procesada)');
      return res.status(200).send('OK');
    }

    const rp = pendienteResult.recordset[0];

    // Determinar estado de pago
    const montoPagado = parseFloat(amount);
    const precioTotal = parseFloat(rp.precio_total);
    let estadoPago = 'pagado';
    if (rp.tipo_pago === 'mitad' && montoPagado < precioTotal) {
      estadoPago = 'pago_parcial';
    }

    const tinajas = JSON.parse(rp.tinajas || '[]');
    const matriculas = JSON.parse(rp.matriculas_auto || '[]');

    const reservaResult = await pool.request()
      .input('cabana_id', sql.Int, rp.cabana_id)
      .input('fecha_inicio', sql.Date, rp.fecha_inicio)
      .input('fecha_fin', sql.Date, rp.fecha_fin)
      .input('cantidad_noches', sql.Int, rp.cantidad_noches)
      .input('cantidad_personas', sql.Int, rp.cantidad_personas)
      .input('personas_extra', sql.Int, rp.personas_extra)
      .input('precio_noche', sql.Decimal(10, 2), rp.precio_noche)
      .input('precio_total', sql.Decimal(10, 2), rp.precio_total)
      .input('costo_personas_extra', sql.Decimal(10, 2), rp.costo_personas_extra)
      .input('cliente_nombre', sql.NVarChar, rp.cliente_nombre)
      .input('cliente_apellido', sql.NVarChar, rp.cliente_apellido)
      .input('cliente_telefono', sql.NVarChar, rp.cliente_telefono)
      .input('cliente_email', sql.NVarChar, rp.cliente_email)
      .input('cliente_rut', sql.NVarChar, rp.cliente_rut)
      .input('procedencia', sql.NVarChar, rp.procedencia)
      .input('tiene_auto', sql.Bit, rp.tiene_auto)
      .input('matriculas_auto', sql.NVarChar, rp.matriculas_auto)
      .input('metodo_pago', sql.VarChar, 'khipu')
      .input('tipo_pago', sql.VarChar, rp.tipo_pago)
      .input('estado_pago', sql.VarChar, estadoPago)
      .input('monto_pagado', sql.Decimal(10, 2), montoPagado)
      .input('notas', sql.NVarChar, rp.notas)
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
          @notas, 'confirmada', 'khipu', 'khipu_sistema', GETDATE()
        )
      `);

    const reservaId = reservaResult.recordset[0].id;
    console.log(`✅ Reserva ${reservaId} creada desde Khipu`);

    if (tinajas.length > 0) {
      for (const t of tinajas) {
        await pool.request()
          .input('reserva_id', sql.Int, reservaId)
          .input('tinaja_id', sql.Int, t.tinaja_id)
          .input('fecha_uso', sql.Date, t.fecha_uso)
          .input('precio_dia', sql.Decimal(10, 2), t.precio_dia)
          .query(`
            INSERT INTO reserva_tinajas (reserva_id, tinaja_id, fecha_uso, precio_dia)
            VALUES (@reserva_id, @tinaja_id, @fecha_uso, @precio_dia)
          `);
      }
    }

    await pool.request()
      .input('payment_id', sql.NVarChar, payment_id)
      .query(`UPDATE reservas_pendientes SET estado = 'procesada' WHERE webpay_token = @payment_id`);

    console.log(`✅ Webhook Khipu procesado. Reserva ID: ${reservaId}`);
    return res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Error en webhook Khipu:', error.message);
    return res.status(200).send('OK'); // Siempre 200 para que Khipu no reintente indefinidamente
  }
};

// ============================================
// VERIFICAR PAGO (para return_url del cliente)
// ============================================
exports.verificarPago = async (req, res) => {
  try {
    const { payment_id } = req.params;

    if (!payment_id) {
      return res.status(400).json({ success: false, message: 'payment_id requerido' });
    }

    // Verificar con Khipu
    const verificacion = await axios.get(
      `${KHIPU_API}/payments/${payment_id}`,
      { headers: khipuHeaders() }
    );

    const { status, amount } = verificacion.data;

    if (status !== 'done') {
      return res.json({ success: false, status, message: 'Pago no completado aún' });
    }

    const pool = await poolPromise;

    // Buscar si la reserva ya fue creada por el webhook
    const reservaResult = await pool.request()
      .input('payment_id', sql.NVarChar, payment_id)
      .query(`
        SELECT rp.id as pendiente_id, rp.estado,
               rc.id as reserva_id
        FROM reservas_pendientes rp
        LEFT JOIN reservas_cabanas rc ON rc.origen = 'khipu' AND rc.cliente_nombre = rp.cliente_nombre
          AND rc.fecha_inicio = rp.fecha_inicio AND rc.cabana_id = rp.cabana_id
        WHERE rp.webpay_token = @payment_id
      `);

    if (reservaResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Pago no encontrado en sistema' });
    }

    const rp = reservaResult.recordset[0];

    if (rp.estado === 'procesada' && rp.reserva_id) {
      return res.json({ success: true, status: 'done', reserva_id: rp.reserva_id });
    }

    // El webhook aún no procesó — forzar creación aquí
    return res.json({ success: true, status: 'done', processing: true, message: 'Procesando reserva...' });

  } catch (error) {
    console.error('❌ Error al verificar pago Khipu:', error.message);
    return res.status(500).json({ success: false, message: 'Error al verificar pago', error: error.message });
  }
};

module.exports = exports;
