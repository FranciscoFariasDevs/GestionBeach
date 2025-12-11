// backend/controllers/cabanasController.js
const { sql, poolPromise } = require('../config/db');

// ============================================
// CRUD DE CABAÑAS
// ============================================

// Obtener todas las cabañas
exports.obtenerCabanas = async (req, res) => {
  try {
    const pool = await poolPromise;

    const resultado = await pool.request()
      .query(`
        SELECT
          id, nombre, descripcion, capacidad_personas,
          numero_habitaciones, numero_banos,
          precio_noche, precio_fin_semana,
          precio_temporada_baja, precio_temporada_alta,
          imagenes, amenidades, estado, ubicacion,
          fecha_creacion
        FROM dbo.cabanas
        ORDER BY nombre ASC
      `);

    return res.json({
      success: true,
      cabanas: resultado.recordset
    });

  } catch (error) {
    console.error('❌ Error al obtener cabañas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener cabañas',
      error: error.message
    });
  }
};

// Obtener una cabaña por ID
exports.obtenerCabanaPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    const resultado = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT * FROM dbo.cabanas WHERE id = @id
      `);

    if (resultado.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cabaña no encontrada'
      });
    }

    return res.json({
      success: true,
      cabana: resultado.recordset[0]
    });

  } catch (error) {
    console.error('❌ Error al obtener cabaña:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener cabaña',
      error: error.message
    });
  }
};

// Crear cabaña
exports.crearCabana = async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      capacidad_personas,
      numero_habitaciones,
      numero_banos,
      precio_noche,
      precio_fin_semana,
      imagenes,
      amenidades,
      estado,
      ubicacion
    } = req.body;

    if (!nombre || !capacidad_personas || !precio_noche) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, capacidad y precio son requeridos'
      });
    }

    const pool = await poolPromise;

    const resultado = await pool.request()
      .input('nombre', sql.VarChar, nombre)
      .input('descripcion', sql.Text, descripcion || null)
      .input('capacidad_personas', sql.Int, capacidad_personas)
      .input('numero_habitaciones', sql.Int, numero_habitaciones || null)
      .input('numero_banos', sql.Int, numero_banos || null)
      .input('precio_noche', sql.Decimal(18, 2), precio_noche)
      .input('precio_fin_semana', sql.Decimal(18, 2), precio_fin_semana || null)
      .input('imagenes', sql.Text, imagenes ? JSON.stringify(imagenes) : null)
      .input('amenidades', sql.Text, amenidades ? JSON.stringify(amenidades) : null)
      .input('estado', sql.VarChar, estado || 'disponible')
      .input('ubicacion', sql.VarChar, ubicacion || null)
      .query(`
        INSERT INTO dbo.cabanas (
          nombre, descripcion, capacidad_personas, numero_habitaciones, numero_banos,
          precio_noche, precio_fin_semana, imagenes, amenidades, estado, ubicacion
        )
        OUTPUT INSERTED.id
        VALUES (
          @nombre, @descripcion, @capacidad_personas, @numero_habitaciones, @numero_banos,
          @precio_noche, @precio_fin_semana, @imagenes, @amenidades, @estado, @ubicacion
        )
      `);

    return res.status(201).json({
      success: true,
      message: 'Cabaña creada exitosamente',
      id: resultado.recordset[0].id
    });

  } catch (error) {
    console.error('❌ Error al crear cabaña:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear cabaña',
      error: error.message
    });
  }
};

// Actualizar cabaña
exports.actualizarCabana = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      descripcion,
      capacidad_personas,
      numero_habitaciones,
      numero_banos,
      precio_noche,
      precio_fin_semana,
      imagenes,
      amenidades,
      estado,
      ubicacion
    } = req.body;

    const pool = await poolPromise;

    await pool.request()
      .input('id', sql.Int, id)
      .input('nombre', sql.VarChar, nombre)
      .input('descripcion', sql.Text, descripcion)
      .input('capacidad_personas', sql.Int, capacidad_personas)
      .input('numero_habitaciones', sql.Int, numero_habitaciones)
      .input('numero_banos', sql.Int, numero_banos)
      .input('precio_noche', sql.Decimal(18, 2), precio_noche)
      .input('precio_fin_semana', sql.Decimal(18, 2), precio_fin_semana)
      .input('imagenes', sql.Text, imagenes ? JSON.stringify(imagenes) : null)
      .input('amenidades', sql.Text, amenidades ? JSON.stringify(amenidades) : null)
      .input('estado', sql.VarChar, estado)
      .input('ubicacion', sql.VarChar, ubicacion)
      .query(`
        UPDATE dbo.cabanas
        SET nombre = @nombre,
            descripcion = @descripcion,
            capacidad_personas = @capacidad_personas,
            numero_habitaciones = @numero_habitaciones,
            numero_banos = @numero_banos,
            precio_noche = @precio_noche,
            precio_fin_semana = @precio_fin_semana,
            imagenes = @imagenes,
            amenidades = @amenidades,
            estado = @estado,
            ubicacion = @ubicacion,
            fecha_modificacion = GETDATE()
        WHERE id = @id
      `);

    return res.json({
      success: true,
      message: 'Cabaña actualizada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al actualizar cabaña:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar cabaña',
      error: error.message
    });
  }
};

// Eliminar cabaña
exports.eliminarCabana = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    // Verificar si tiene reservas activas
    const reservasActivas = await pool.request()
      .input('cabana_id', sql.Int, id)
      .query(`
        SELECT COUNT(*) as total
        FROM dbo.reservas_cabanas
        WHERE cabana_id = @cabana_id
          AND estado IN ('confirmada', 'en_curso')
          AND fecha_fin >= CAST(GETDATE() AS DATE)
      `);

    if (reservasActivas.recordset[0].total > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar la cabaña porque tiene reservas activas'
      });
    }

    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM dbo.cabanas WHERE id = @id');

    return res.json({
      success: true,
      message: 'Cabaña eliminada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al eliminar cabaña:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar cabaña',
      error: error.message
    });
  }
};

// ============================================
// DISPONIBILIDAD
// ============================================

// Verificar disponibilidad de una cabaña
exports.verificarDisponibilidad = async (req, res) => {
  try {
    const { cabana_id, fecha_inicio, fecha_fin } = req.query;

    if (!cabana_id || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({
        success: false,
        message: 'Cabaña ID, fecha inicio y fecha fin son requeridos'
      });
    }

    const pool = await poolPromise;

    // Buscar bloqueos/reservas que se traslapen con las fechas
    const resultado = await pool.request()
      .input('cabana_id', sql.Int, cabana_id)
      .input('fecha_inicio', sql.Date, fecha_inicio)
      .input('fecha_fin', sql.Date, fecha_fin)
      .query(`
        SELECT COUNT(*) as total_bloqueos
        FROM dbo.bloqueos_cabanas
        WHERE cabana_id = @cabana_id
          AND (
            (fecha_inicio <= @fecha_fin AND fecha_fin >= @fecha_inicio)
          )
      `);

    const disponible = resultado.recordset[0].total_bloqueos === 0;

    return res.json({
      success: true,
      disponible: disponible,
      mensaje: disponible
        ? 'La cabaña está disponible para las fechas seleccionadas'
        : 'La cabaña no está disponible para las fechas seleccionadas'
    });

  } catch (error) {
    console.error('❌ Error al verificar disponibilidad:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar disponibilidad',
      error: error.message
    });
  }
};

// Obtener calendario de disponibilidad
exports.obtenerCalendarioDisponibilidad = async (req, res) => {
  try {
    const { cabana_id, mes, anio } = req.query;

    const pool = await poolPromise;

    const bloqueos = await pool.request()
      .input('cabana_id', sql.Int, cabana_id || null)
      .query(`
        SELECT
          b.id, b.cabana_id, b.fecha_inicio, b.fecha_fin, b.motivo,
          c.nombre as nombre_cabana,
          r.cliente_nombre, r.estado as estado_reserva
        FROM dbo.bloqueos_cabanas b
        INNER JOIN dbo.cabanas c ON b.cabana_id = c.id
        LEFT JOIN dbo.reservas_cabanas r ON b.reserva_id = r.id
        WHERE (@cabana_id IS NULL OR b.cabana_id = @cabana_id)
        ORDER BY b.fecha_inicio ASC
      `);

    return res.json({
      success: true,
      bloqueos: bloqueos.recordset
    });

  } catch (error) {
    console.error('❌ Error al obtener calendario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener calendario',
      error: error.message
    });
  }
};

// ============================================
// TINAJAS
// ============================================

// Obtener reservas de tinajas
exports.obtenerReservasTinajas = async (req, res) => {
  try {
    const pool = await poolPromise;

    // Verificar si la tabla existe
    const tablaExiste = await pool.request()
      .query(`
        SELECT COUNT(*) as existe
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME = 'reservas_tinajas'
      `);

    // Si la tabla no existe, devolver array vacío
    if (tablaExiste.recordset[0].existe === 0) {
      console.log('⚠️ Tabla reservas_tinajas no existe, devolviendo array vacío');
      return res.json({
        success: true,
        reservas: []
      });
    }

    const resultado = await pool.request()
      .query(`
        SELECT
          rt.id, rt.tinaja_id, rt.fecha_uso, rt.precio_dia, rt.estado,
          rt.reserva_cabana_id,
          rc.estado as estado_reserva_cabana
        FROM dbo.reservas_tinajas rt
        INNER JOIN dbo.reservas_cabanas rc ON rt.reserva_cabana_id = rc.id
        WHERE rt.estado = 'confirmada'
          AND rc.estado IN ('pendiente', 'confirmada', 'en_curso')
        ORDER BY rt.fecha_uso ASC
      `);

    return res.json({
      success: true,
      reservas: resultado.recordset
    });

  } catch (error) {
    console.error('❌ Error al obtener reservas de tinajas:', error);
    // Devolver array vacío en caso de error para que no rompa el frontend
    return res.json({
      success: true,
      reservas: []
    });
  }
};

// ============================================
// GESTIÓN DE TINAJAS
// ============================================

// Obtener todas las tinajas con sus precios
exports.obtenerTinajas = async (req, res) => {
  try {
    const pool = await poolPromise;

    const resultado = await pool.request()
      .query(`
        SELECT
          id, numero, nombre, descripcion,
          precio_temporada_alta, precio_temporada_baja,
          estado, ubicacion, notas_internas,
          fecha_creacion, fecha_modificacion
        FROM dbo.tinajas
        ORDER BY numero ASC
      `);

    return res.json({
      success: true,
      tinajas: resultado.recordset
    });

  } catch (error) {
    console.error('❌ Error al obtener tinajas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener tinajas',
      error: error.message
    });
  }
};

// Actualizar precios de una tinaja
exports.actualizarPreciosTinaja = async (req, res) => {
  try {
    const { id } = req.params;
    const { precio_temporada_alta, precio_temporada_baja } = req.body;

    if (!precio_temporada_alta || !precio_temporada_baja) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren ambos precios (temporada alta y baja)'
      });
    }

    const pool = await poolPromise;

    await pool.request()
      .input('id', sql.Int, id)
      .input('precio_temporada_alta', sql.Decimal(18, 2), precio_temporada_alta)
      .input('precio_temporada_baja', sql.Decimal(18, 2), precio_temporada_baja)
      .query(`
        UPDATE dbo.tinajas
        SET precio_temporada_alta = @precio_temporada_alta,
            precio_temporada_baja = @precio_temporada_baja,
            fecha_modificacion = GETDATE()
        WHERE id = @id
      `);

    return res.json({
      success: true,
      message: 'Precios de tinaja actualizados exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al actualizar precios de tinaja:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar precios de tinaja',
      error: error.message
    });
  }
};

module.exports = exports;
