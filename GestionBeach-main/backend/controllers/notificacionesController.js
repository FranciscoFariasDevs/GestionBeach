// backend/controllers/notificacionesController.js
const { sql, poolPromise } = require('../config/db');

// GET /api/notificaciones — las mías (últimas 50)
exports.getMisNotificaciones = async (req, res) => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ message: 'No autenticado' });

    const pool = await poolPromise;
    const r = await pool.request()
      .input('uid', sql.Int, usuarioId)
      .query(`
        SELECT TOP 50 id, tipo, titulo, mensaje, ruta, icono, leida, fecha_creacion
        FROM notificaciones
        WHERE usuario_id = @uid
        ORDER BY fecha_creacion DESC
      `);

    const noLeidas = r.recordset.filter(n => !n.leida).length;
    res.json({ notificaciones: r.recordset, no_leidas: noLeidas });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/notificaciones/:id/leer — marcar una como leída
exports.marcarLeida = async (req, res) => {
  try {
    const usuarioId = req.user?.id;
    const { id } = req.params;
    const pool = await poolPromise;
    await pool.request()
      .input('id',  sql.Int, id)
      .input('uid', sql.Int, usuarioId)
      .query(`
        UPDATE notificaciones
        SET leida = 1, fecha_lectura = GETDATE()
        WHERE id = @id AND usuario_id = @uid
      `);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/notificaciones/leer-todas
exports.marcarTodasLeidas = async (req, res) => {
  try {
    const usuarioId = req.user?.id;
    const pool = await poolPromise;
    await pool.request()
      .input('uid', sql.Int, usuarioId)
      .query(`
        UPDATE notificaciones
        SET leida = 1, fecha_lectura = GETDATE()
        WHERE usuario_id = @uid AND leida = 0
      `);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/notificaciones/:id
exports.eliminarNotificacion = async (req, res) => {
  try {
    const usuarioId = req.user?.id;
    const { id } = req.params;
    const pool = await poolPromise;
    await pool.request()
      .input('id',  sql.Int, id)
      .input('uid', sql.Int, usuarioId)
      .query('DELETE FROM notificaciones WHERE id = @id AND usuario_id = @uid');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
