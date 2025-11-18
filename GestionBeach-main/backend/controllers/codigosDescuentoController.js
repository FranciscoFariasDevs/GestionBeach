// backend/controllers/codigosDescuentoController.js
const { sql, poolPromise } = require('../config/db');

// ✅ Obtener todos los códigos de descuento
exports.getCodigosDescuento = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        id,
        codigo,
        descripcion,
        tipo_descuento,
        valor_descuento,
        fecha_inicio,
        fecha_fin,
        usos_maximos,
        usos_actuales,
        activo,
        fecha_creacion,
        fecha_actualizacion,
        CASE
          WHEN usos_maximos IS NOT NULL AND usos_actuales >= usos_maximos THEN 'agotado'
          WHEN fecha_fin IS NOT NULL AND fecha_fin < GETDATE() THEN 'expirado'
          WHEN fecha_inicio IS NOT NULL AND fecha_inicio > GETDATE() THEN 'pendiente'
          WHEN activo = 0 THEN 'inactivo'
          ELSE 'activo'
        END as estado
      FROM codigos_descuento
      ORDER BY fecha_creacion DESC
    `);

    return res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('❌ Error al obtener códigos de descuento:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener códigos de descuento',
      error: error.message
    });
  }
};

// ✅ Obtener un código por ID
exports.getCodigoById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM codigos_descuento WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Código de descuento no encontrado'
      });
    }

    return res.json({
      success: true,
      data: result.recordset[0]
    });

  } catch (error) {
    console.error('❌ Error al obtener código:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener código',
      error: error.message
    });
  }
};

// ✅ Validar un código de descuento
exports.validarCodigo = async (req, res) => {
  try {
    const { codigo } = req.body;

    if (!codigo || codigo.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un código'
      });
    }

    const pool = await poolPromise;

    const result = await pool.request()
      .input('codigo', sql.NVarChar, codigo.trim().toUpperCase())
      .query(`
        SELECT
          id,
          codigo,
          descripcion,
          tipo_descuento,
          valor_descuento,
          fecha_inicio,
          fecha_fin,
          usos_maximos,
          usos_actuales,
          activo
        FROM codigos_descuento
        WHERE codigo = @codigo
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Código de descuento no válido',
        valido: false
      });
    }

    const codigoData = result.recordset[0];

    // Validaciones
    if (!codigoData.activo) {
      return res.status(400).json({
        success: false,
        message: 'Este código está inactivo',
        valido: false
      });
    }

    // Verificar fecha de inicio
    if (codigoData.fecha_inicio && new Date(codigoData.fecha_inicio) > new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Este código aún no está disponible',
        valido: false
      });
    }

    // Verificar fecha de fin
    if (codigoData.fecha_fin && new Date(codigoData.fecha_fin) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Este código ha expirado',
        valido: false
      });
    }

    // Verificar usos máximos
    if (codigoData.usos_maximos !== null && codigoData.usos_actuales >= codigoData.usos_maximos) {
      return res.status(400).json({
        success: false,
        message: 'Este código ha alcanzado su límite de usos',
        valido: false
      });
    }

    // Código válido
    return res.json({
      success: true,
      message: 'Código válido',
      valido: true,
      data: {
        id: codigoData.id,
        codigo: codigoData.codigo,
        descripcion: codigoData.descripcion,
        tipo_descuento: codigoData.tipo_descuento,
        valor_descuento: codigoData.valor_descuento
      }
    });

  } catch (error) {
    console.error('❌ Error al validar código:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al validar código',
      error: error.message
    });
  }
};

// ✅ Crear un nuevo código de descuento
exports.crearCodigo = async (req, res) => {
  try {
    const {
      codigo,
      descripcion,
      tipo_descuento,
      valor_descuento,
      fecha_inicio,
      fecha_fin,
      usos_maximos,
      activo
    } = req.body;

    // Validaciones
    if (!codigo || codigo.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El código es obligatorio'
      });
    }

    if (!tipo_descuento || !['porcentaje', 'monto_fijo'].includes(tipo_descuento)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de descuento inválido'
      });
    }

    if (!valor_descuento || valor_descuento <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El valor del descuento debe ser mayor a 0'
      });
    }

    if (tipo_descuento === 'porcentaje' && valor_descuento > 100) {
      return res.status(400).json({
        success: false,
        message: 'El porcentaje no puede ser mayor a 100'
      });
    }

    const pool = await poolPromise;

    // Verificar si el código ya existe
    const existeResult = await pool.request()
      .input('codigo', sql.NVarChar, codigo.trim().toUpperCase())
      .query('SELECT id FROM codigos_descuento WHERE codigo = @codigo');

    if (existeResult.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Este código ya existe'
      });
    }

    // Insertar nuevo código
    const result = await pool.request()
      .input('codigo', sql.NVarChar, codigo.trim().toUpperCase())
      .input('descripcion', sql.NVarChar, descripcion || null)
      .input('tipo_descuento', sql.VarChar, tipo_descuento)
      .input('valor_descuento', sql.Decimal(10, 2), valor_descuento)
      .input('fecha_inicio', sql.Date, fecha_inicio || null)
      .input('fecha_fin', sql.Date, fecha_fin || null)
      .input('usos_maximos', sql.Int, usos_maximos || null)
      .input('activo', sql.Bit, activo !== undefined ? activo : true)
      .query(`
        INSERT INTO codigos_descuento (
          codigo, descripcion, tipo_descuento, valor_descuento,
          fecha_inicio, fecha_fin, usos_maximos, activo
        )
        VALUES (
          @codigo, @descripcion, @tipo_descuento, @valor_descuento,
          @fecha_inicio, @fecha_fin, @usos_maximos, @activo
        );
        SELECT SCOPE_IDENTITY() as id;
      `);

    console.log(`✅ Código de descuento creado: ${codigo}`);

    return res.json({
      success: true,
      message: 'Código de descuento creado exitosamente',
      data: {
        id: result.recordset[0].id
      }
    });

  } catch (error) {
    console.error('❌ Error al crear código:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear código de descuento',
      error: error.message
    });
  }
};

// ✅ Actualizar un código de descuento
exports.actualizarCodigo = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      codigo,
      descripcion,
      tipo_descuento,
      valor_descuento,
      fecha_inicio,
      fecha_fin,
      usos_maximos,
      activo
    } = req.body;

    const pool = await poolPromise;

    // Verificar que existe
    const existeResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id FROM codigos_descuento WHERE id = @id');

    if (existeResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Código de descuento no encontrado'
      });
    }

    // Actualizar
    await pool.request()
      .input('id', sql.Int, id)
      .input('codigo', sql.NVarChar, codigo?.trim().toUpperCase())
      .input('descripcion', sql.NVarChar, descripcion || null)
      .input('tipo_descuento', sql.VarChar, tipo_descuento)
      .input('valor_descuento', sql.Decimal(10, 2), valor_descuento)
      .input('fecha_inicio', sql.Date, fecha_inicio || null)
      .input('fecha_fin', sql.Date, fecha_fin || null)
      .input('usos_maximos', sql.Int, usos_maximos || null)
      .input('activo', sql.Bit, activo !== undefined ? activo : true)
      .query(`
        UPDATE codigos_descuento
        SET
          codigo = @codigo,
          descripcion = @descripcion,
          tipo_descuento = @tipo_descuento,
          valor_descuento = @valor_descuento,
          fecha_inicio = @fecha_inicio,
          fecha_fin = @fecha_fin,
          usos_maximos = @usos_maximos,
          activo = @activo,
          fecha_actualizacion = GETDATE()
        WHERE id = @id
      `);

    console.log(`✅ Código de descuento actualizado: ${id}`);

    return res.json({
      success: true,
      message: 'Código de descuento actualizado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al actualizar código:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar código',
      error: error.message
    });
  }
};

// ✅ Eliminar un código de descuento
exports.eliminarCodigo = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM codigos_descuento WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Código de descuento no encontrado'
      });
    }

    console.log(`✅ Código de descuento eliminado: ${id}`);

    return res.json({
      success: true,
      message: 'Código de descuento eliminado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al eliminar código:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar código',
      error: error.message
    });
  }
};

// ✅ Incrementar uso de un código (llamar cuando se completa una reserva)
exports.incrementarUso = async (req, res) => {
  try {
    const { codigo_id } = req.body;

    const pool = await poolPromise;

    await pool.request()
      .input('id', sql.Int, codigo_id)
      .query(`
        UPDATE codigos_descuento
        SET usos_actuales = usos_actuales + 1
        WHERE id = @id
      `);

    console.log(`✅ Uso incrementado para código: ${codigo_id}`);

    return res.json({
      success: true,
      message: 'Uso registrado'
    });

  } catch (error) {
    console.error('❌ Error al incrementar uso:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar uso',
      error: error.message
    });
  }
};

module.exports = exports;
