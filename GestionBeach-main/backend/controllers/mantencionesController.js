// backend/controllers/mantencionesController.js
const { sql, poolPromise } = require('../config/db');

// ============================================
// OBTENER TODAS LAS MANTENCIONES
// ============================================
exports.obtenerMantenciones = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        m.id,
        m.cabana_id,
        c.nombre as cabana_nombre,
        m.fecha_inicio,
        m.fecha_fin,
        m.motivo,
        m.notas,
        m.creado_por,
        m.fecha_creacion,
        m.estado
      FROM mantenciones_cabanas m
      INNER JOIN cabanas c ON m.cabana_id = c.id
      ORDER BY m.fecha_inicio DESC
    `);

    res.json({
      success: true,
      mantenciones: result.recordset
    });
  } catch (error) {
    console.error('Error al obtener mantenciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener mantenciones',
      error: error.message
    });
  }
};

// ============================================
// OBTENER MANTENCIONES ACTIVAS (para calendario)
// ============================================
exports.obtenerMantencionesActivas = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        m.id,
        m.cabana_id,
        m.fecha_inicio,
        m.fecha_fin,
        m.motivo
      FROM mantenciones_cabanas m
      WHERE m.estado = 'activa'
      AND m.fecha_fin >= CAST(GETDATE() AS DATE)
      ORDER BY m.fecha_inicio
    `);

    res.json({
      success: true,
      mantenciones: result.recordset
    });
  } catch (error) {
    console.error('Error al obtener mantenciones activas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener mantenciones activas',
      error: error.message
    });
  }
};

// ============================================
// VALIDAR SI HAY RESERVAS EN FECHAS DE MANTENCIÓN
// ============================================
const validarDisponibilidadParaMantencion = async (cabana_id, fecha_inicio, fecha_fin) => {
  try {
    const pool = await poolPromise;

    // Buscar reservas que se solapen con las fechas de mantención
    const result = await pool.request()
      .input('cabana_id', sql.Int, cabana_id)
      .input('fecha_inicio', sql.Date, fecha_inicio)
      .input('fecha_fin', sql.Date, fecha_fin)
      .query(`
        SELECT COUNT(*) as total
        FROM dbo.reservas_cabanas
        WHERE cabana_id = @cabana_id
        AND estado NOT IN ('cancelada', 'check-out')
        AND (
          (fecha_inicio <= @fecha_fin AND fecha_fin >= @fecha_inicio)
        )
      `);

    const hayReservas = result.recordset[0].total > 0;

    return {
      disponible: !hayReservas,
      reservasConflicto: result.recordset[0].total
    };
  } catch (error) {
    throw error;
  }
};

// ============================================
// CREAR NUEVA MANTENCIÓN
// ============================================
exports.crearMantencion = async (req, res) => {
  try {
    const { cabana_id, fecha_inicio, fecha_fin, motivo, notas, creado_por } = req.body;

    // Validaciones básicas
    if (!cabana_id || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios: cabana_id, fecha_inicio, fecha_fin'
      });
    }

    // Validar que fecha_fin >= fecha_inicio
    if (new Date(fecha_fin) < new Date(fecha_inicio)) {
      return res.status(400).json({
        success: false,
        message: 'La fecha de fin debe ser mayor o igual a la fecha de inicio'
      });
    }

    // Validar que no haya reservas en esas fechas
    const disponibilidad = await validarDisponibilidadParaMantencion(cabana_id, fecha_inicio, fecha_fin);

    if (!disponibilidad.disponible) {
      return res.status(409).json({
        success: false,
        message: `No se puede crear mantención. Hay ${disponibilidad.reservasConflicto} reserva(s) activa(s) en esas fechas.`,
        reservasConflicto: disponibilidad.reservasConflicto
      });
    }

    // Crear mantención
    const pool = await poolPromise;

    const result = await pool.request()
      .input('cabana_id', sql.Int, cabana_id)
      .input('fecha_inicio', sql.Date, fecha_inicio)
      .input('fecha_fin', sql.Date, fecha_fin)
      .input('motivo', sql.VarChar, motivo || null)
      .input('notas', sql.Text, notas || null)
      .input('creado_por', sql.VarChar, creado_por || 'Sistema')
      .query(`
        INSERT INTO mantenciones_cabanas (
          cabana_id, fecha_inicio, fecha_fin, motivo, notas, creado_por
        )
        OUTPUT INSERTED.*
        VALUES (
          @cabana_id, @fecha_inicio, @fecha_fin, @motivo, @notas, @creado_por
        )
      `);

    const mantencionCreada = result.recordset[0];

    res.status(201).json({
      success: true,
      message: 'Mantención creada exitosamente',
      mantencion: mantencionCreada
    });

  } catch (error) {
    console.error('Error al crear mantención:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear mantención',
      error: error.message
    });
  }
};

// ============================================
// CANCELAR MANTENCIÓN
// ============================================
exports.cancelarMantencion = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID de mantención requerido'
      });
    }

    const pool = await poolPromise;

    // Verificar que existe
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id, estado FROM mantenciones_cabanas WHERE id = @id');

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mantención no encontrada'
      });
    }

    if (checkResult.recordset[0].estado === 'cancelada') {
      return res.status(400).json({
        success: false,
        message: 'La mantención ya está cancelada'
      });
    }

    // Cancelar (cambiar estado)
    await pool.request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE mantenciones_cabanas
        SET estado = 'cancelada'
        WHERE id = @id
      `);

    res.json({
      success: true,
      message: 'Mantención cancelada exitosamente'
    });

  } catch (error) {
    console.error('Error al cancelar mantención:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar mantención',
      error: error.message
    });
  }
};

// ============================================
// OBTENER MANTENCIÓN POR ID
// ============================================
exports.obtenerMantencionPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await poolPromise;

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT
          m.*,
          c.nombre as cabana_nombre
        FROM mantenciones_cabanas m
        INNER JOIN cabanas c ON m.cabana_id = c.id
        WHERE m.id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mantención no encontrada'
      });
    }

    res.json({
      success: true,
      mantencion: result.recordset[0]
    });

  } catch (error) {
    console.error('Error al obtener mantención:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener mantención',
      error: error.message
    });
  }
};

module.exports = exports;
