// backend/controllers/codigosDescuentoController.js
const { sql, poolPromise } = require('../config/db');

// ✅ Obtener todos los códigos de descuento
exports.getCodigosDescuento = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        cd.id,
        cd.codigo,
        cd.descripcion,
        cd.tipo_descuento,
        cd.valor_descuento,
        cd.fecha_inicio,
        cd.fecha_fin,
        cd.usos_maximos,
        cd.usos_actuales,
        cd.activo,
        cd.aplica_todas_cabanas,
        cd.fecha_creacion,
        cd.fecha_actualizacion,
        CASE
          WHEN cd.usos_maximos IS NOT NULL AND cd.usos_actuales >= cd.usos_maximos THEN 'agotado'
          WHEN cd.fecha_fin IS NOT NULL AND cd.fecha_fin < GETDATE() THEN 'expirado'
          WHEN cd.fecha_inicio IS NOT NULL AND cd.fecha_inicio > GETDATE() THEN 'pendiente'
          WHEN cd.activo = 0 THEN 'inactivo'
          ELSE 'activo'
        END as estado,
        (SELECT COUNT(*) FROM codigos_descuento_cabanas WHERE codigo_descuento_id = cd.id) as cantidad_cabanas
      FROM codigos_descuento cd
      ORDER BY cd.fecha_creacion DESC
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
    const { codigo, cabana_id, fecha_inicio_reserva, fecha_fin_reserva } = req.body;

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
          activo,
          aplica_todas_cabanas
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

    // ============================================
    // VERIFICAR SI APLICA A LA CABAÑA ESPECÍFICA
    // ============================================
    if (cabana_id && !codigoData.aplica_todas_cabanas) {
      // El código NO aplica a todas las cabañas, verificar si aplica a esta específica
      const cabanaResult = await pool.request()
        .input('codigo_descuento_id', sql.Int, codigoData.id)
        .input('cabana_id', sql.Int, cabana_id)
        .query(`
          SELECT COUNT(*) as existe
          FROM codigos_descuento_cabanas
          WHERE codigo_descuento_id = @codigo_descuento_id
            AND cabana_id = @cabana_id
        `);

      if (cabanaResult.recordset[0].existe === 0) {
        return res.status(400).json({
          success: false,
          message: 'Este código no es válido para esta cabaña',
          valido: false
        });
      }
    }

    // Validaciones
    if (!codigoData.activo) {
      return res.status(400).json({
        success: false,
        message: 'Este código está inactivo',
        valido: false
      });
    }

    // ============================================
    // VALIDAR FECHAS DE LA RESERVA
    // ============================================
    // Si el código tiene fechas de vigencia Y se proporcionan fechas de reserva,
    // verificar que TODAS las fechas de la reserva estén dentro del rango del código
    if (fecha_inicio_reserva && fecha_fin_reserva) {
      const fechaInicioReserva = new Date(fecha_inicio_reserva);
      const fechaFinReserva = new Date(fecha_fin_reserva);

      // Si el código tiene fecha_inicio, la reserva debe iniciar DESPUÉS de esa fecha
      if (codigoData.fecha_inicio) {
        const fechaInicioCodigo = new Date(codigoData.fecha_inicio);
        fechaInicioCodigo.setHours(0, 0, 0, 0);

        if (fechaInicioReserva < fechaInicioCodigo) {
          return res.status(400).json({
            success: false,
            message: `Este código solo es válido desde el ${fechaInicioCodigo.toLocaleDateString('es-CL')}`,
            valido: false
          });
        }
      }

      // Si el código tiene fecha_fin, la reserva debe terminar ANTES de esa fecha
      if (codigoData.fecha_fin) {
        const fechaFinCodigo = new Date(codigoData.fecha_fin);
        fechaFinCodigo.setHours(23, 59, 59, 999);

        if (fechaFinReserva > fechaFinCodigo) {
          return res.status(400).json({
            success: false,
            message: `Este código solo es válido hasta el ${fechaFinCodigo.toLocaleDateString('es-CL')}`,
            valido: false
          });
        }
      }
    } else {
      // Si no se proporcionan fechas de reserva, validar con fecha actual
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      // Verificar fecha de inicio
      if (codigoData.fecha_inicio && new Date(codigoData.fecha_inicio) > hoy) {
        return res.status(400).json({
          success: false,
          message: 'Este código aún no está disponible',
          valido: false
        });
      }

      // Verificar fecha de fin
      if (codigoData.fecha_fin && new Date(codigoData.fecha_fin) < hoy) {
        return res.status(400).json({
          success: false,
          message: 'Este código ha expirado',
          valido: false
        });
      }
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
        valor_descuento: parseFloat(codigoData.valor_descuento) // Convertir a número
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
      activo,
      aplica_todas_cabanas,
      cabanas_ids // Array de IDs de cabañas si aplica_todas_cabanas = false
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
      .input('aplica_todas_cabanas', sql.Bit, aplica_todas_cabanas !== undefined ? aplica_todas_cabanas : true)
      .query(`
        INSERT INTO codigos_descuento (
          codigo, descripcion, tipo_descuento, valor_descuento,
          fecha_inicio, fecha_fin, usos_maximos, activo, aplica_todas_cabanas
        )
        VALUES (
          @codigo, @descripcion, @tipo_descuento, @valor_descuento,
          @fecha_inicio, @fecha_fin, @usos_maximos, @activo, @aplica_todas_cabanas
        );
        SELECT SCOPE_IDENTITY() as id;
      `);

    const codigoId = result.recordset[0].id;

    // Si NO aplica a todas las cabañas, insertar relaciones
    if (!aplica_todas_cabanas && cabanas_ids && cabanas_ids.length > 0) {
      for (const cabanaId of cabanas_ids) {
        await pool.request()
          .input('codigo_descuento_id', sql.Int, codigoId)
          .input('cabana_id', sql.Int, cabanaId)
          .query(`
            INSERT INTO codigos_descuento_cabanas (codigo_descuento_id, cabana_id)
            VALUES (@codigo_descuento_id, @cabana_id)
          `);
      }
      console.log(`✅ Código ${codigo} asignado a ${cabanas_ids.length} cabaña(s)`);
    }

    console.log(`✅ Código de descuento creado: ${codigo}`);

    return res.json({
      success: true,
      message: 'Código de descuento creado exitosamente',
      data: {
        id: codigoId
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
      activo,
      aplica_todas_cabanas,
      cabanas_ids
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
      .input('aplica_todas_cabanas', sql.Bit, aplica_todas_cabanas !== undefined ? aplica_todas_cabanas : true)
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
          aplica_todas_cabanas = @aplica_todas_cabanas,
          fecha_actualizacion = GETDATE()
        WHERE id = @id
      `);

    // Actualizar las relaciones con cabañas
    // Primero eliminar las existentes
    await pool.request()
      .input('codigo_descuento_id', sql.Int, id)
      .query('DELETE FROM codigos_descuento_cabanas WHERE codigo_descuento_id = @codigo_descuento_id');

    // Si NO aplica a todas las cabañas, insertar nuevas relaciones
    if (!aplica_todas_cabanas && cabanas_ids && cabanas_ids.length > 0) {
      for (const cabanaId of cabanas_ids) {
        await pool.request()
          .input('codigo_descuento_id', sql.Int, id)
          .input('cabana_id', sql.Int, cabanaId)
          .query(`
            INSERT INTO codigos_descuento_cabanas (codigo_descuento_id, cabana_id)
            VALUES (@codigo_descuento_id, @cabana_id)
          `);
      }
      console.log(`✅ Código ${codigo} asignado a ${cabanas_ids.length} cabaña(s)`);
    }

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

// ✅ Obtener las cabañas asociadas a un código de descuento
exports.getCabanasByCodigo = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    // Verificar que el código existe
    const codigoResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id, aplica_todas_cabanas FROM codigos_descuento WHERE id = @id');

    if (codigoResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Código de descuento no encontrado'
      });
    }

    const codigo = codigoResult.recordset[0];

    // Si aplica a todas las cabañas, devolver array vacío
    if (codigo.aplica_todas_cabanas) {
      return res.json({
        success: true,
        cabanas: []
      });
    }

    // Obtener las cabañas asociadas
    const result = await pool.request()
      .input('codigo_descuento_id', sql.Int, id)
      .query(`
        SELECT c.id, c.nombre
        FROM codigos_descuento_cabanas cdc
        INNER JOIN cabanas c ON cdc.cabana_id = c.id
        WHERE cdc.codigo_descuento_id = @codigo_descuento_id
      `);

    return res.json({
      success: true,
      cabanas: result.recordset
    });

  } catch (error) {
    console.error('❌ Error al obtener cabañas del código:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener cabañas del código',
      error: error.message
    });
  }
};

module.exports = exports;
