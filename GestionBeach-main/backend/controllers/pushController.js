const webpush = require('web-push');
const { sql, poolPromise } = require('../config/db');

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:soporte@beachmarket.cl',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// GET /api/push/vapid-public-key  → devuelve la clave pública para el cliente
exports.getPublicKey = (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};

// POST /api/push/subscribe  → guarda/actualiza la suscripción del usuario
exports.subscribe = async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    const usuario_id = req.user.id;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ success: false, message: 'Suscripción inválida' });
    }

    const pool = await poolPromise;

    await pool.request()
      .input('uid', sql.Int, usuario_id)
      .input('endpoint', sql.VarChar(500), endpoint)
      .input('p256dh', sql.VarChar(500), keys.p256dh)
      .input('auth', sql.VarChar(200), keys.auth)
      .query(`
        MERGE push_subscriptions AS target
        USING (SELECT @uid AS usuario_id, @endpoint AS endpoint) AS src
          ON target.usuario_id = src.usuario_id AND target.endpoint = src.endpoint
        WHEN MATCHED THEN
          UPDATE SET p256dh = @p256dh, auth = @auth, activo = 1, fecha_actualizacion = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (usuario_id, endpoint, p256dh, auth, activo)
          VALUES (@uid, @endpoint, @p256dh, @auth, 1);
      `);

    res.json({ success: true, message: 'Suscripción registrada' });
  } catch (error) {
    console.error('Error al suscribir push:', error);
    res.status(500).json({ success: false, message: 'Error al registrar suscripción' });
  }
};

// DELETE /api/push/unsubscribe  → elimina la suscripción
exports.unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    const usuario_id = req.user.id;
    const pool = await poolPromise;

    await pool.request()
      .input('uid', sql.Int, usuario_id)
      .input('endpoint', sql.VarChar(500), endpoint)
      .query(`UPDATE push_subscriptions SET activo = 0 WHERE usuario_id = @uid AND endpoint = @endpoint`);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

// POST /api/push/expo-subscribe  → guarda/actualiza token Expo
exports.expoSubscribe = async (req, res) => {
  try {
    const { expoPushToken } = req.body;
    const usuario_id = req.user.id;

    if (!expoPushToken) {
      return res.status(400).json({ success: false, message: 'Token requerido' });
    }

    const pool = await poolPromise;

    await pool.request()
      .input('uid', sql.Int, usuario_id)
      .input('token', sql.VarChar(300), expoPushToken)
      .query(`
        MERGE expo_push_tokens AS target
        USING (SELECT @uid AS usuario_id) AS src ON target.usuario_id = src.usuario_id
        WHEN MATCHED THEN
          UPDATE SET token = @token, activo = 1, fecha_actualizacion = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (usuario_id, token, activo) VALUES (@uid, @token, 1);
      `);

    res.json({ success: true });
  } catch (error) {
    console.error('Error expo-subscribe:', error);
    res.status(500).json({ success: false });
  }
};

// DELETE /api/push/expo-unsubscribe
exports.expoUnsubscribe = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const pool = await poolPromise;
    await pool.request()
      .input('uid', sql.Int, usuario_id)
      .query(`UPDATE expo_push_tokens SET activo = 0 WHERE usuario_id = @uid`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};
