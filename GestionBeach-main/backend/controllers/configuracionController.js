// backend/controllers/configuracionController.js
const { sql, poolPromise } = require('../config/db');

// Obtener temporada actual
exports.getTemporadaActual = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT valor FROM configuracion_sistema WHERE clave = 'temporada_actual'
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Configuración de temporada no encontrada'
      });
    }

    return res.json({
      success: true,
      temporada: result.recordset[0].valor
    });

  } catch (error) {
    console.error('❌ Error al obtener temporada:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener temporada',
      error: error.message
    });
  }
};

// Actualizar temporada actual (solo admin)
exports.actualizarTemporada = async (req, res) => {
  try {
    const { temporada } = req.body;

    if (!temporada || !['baja', 'alta'].includes(temporada)) {
      return res.status(400).json({
        success: false,
        message: 'Temporada inválida. Debe ser "baja" o "alta"'
      });
    }

    const pool = await poolPromise;

    await pool.request()
      .input('temporada', sql.NVarChar, temporada)
      .query(`
        UPDATE configuracion_sistema
        SET valor = @temporada,
            fecha_actualizacion = GETDATE()
        WHERE clave = 'temporada_actual'
      `);

    console.log(`✅ Temporada actualizada a: ${temporada}`);

    return res.json({
      success: true,
      message: `Temporada actualizada a ${temporada}`,
      temporada: temporada
    });

  } catch (error) {
    console.error('❌ Error al actualizar temporada:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar temporada',
      error: error.message
    });
  }
};
