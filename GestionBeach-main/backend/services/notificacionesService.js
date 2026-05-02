// backend/services/notificacionesService.js
const { sql, poolPromise } = require('../config/db');
const ioInstance = require('../config/ioInstance');

// Crea la tabla si no existe (se llama una vez al arrancar)
const asegurarTabla = async () => {
  const pool = await poolPromise;
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='notificaciones' AND xtype='U')
    CREATE TABLE notificaciones (
      id             INT IDENTITY(1,1) PRIMARY KEY,
      usuario_id     INT           NOT NULL,
      tipo           VARCHAR(60)   NOT NULL,
      titulo         VARCHAR(255)  NOT NULL,
      mensaje        NVARCHAR(MAX) NULL,
      ruta           VARCHAR(255)  NULL,
      icono          VARCHAR(50)   NULL DEFAULT 'notifications',
      leida          BIT           NOT NULL DEFAULT 0,
      fecha_creacion DATETIME      NOT NULL DEFAULT GETDATE(),
      fecha_lectura  DATETIME      NULL
    );
    IF NOT EXISTS (SELECT name FROM sys.indexes WHERE name='IX_notif_usuario_leida')
      CREATE INDEX IX_notif_usuario_leida ON notificaciones(usuario_id, leida);
  `);
};

/**
 * Crea una notificación para un usuario y la emite por Socket.IO si está conectado.
 */
const crearNotificacion = async ({ usuarioId, tipo, titulo, mensaje = null, ruta = null, icono = 'notifications' }) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('usuarioId', sql.Int,      usuarioId)
      .input('tipo',      sql.VarChar,  tipo)
      .input('titulo',    sql.VarChar,  titulo)
      .input('mensaje',   sql.NVarChar, mensaje)
      .input('ruta',      sql.VarChar,  ruta)
      .input('icono',     sql.VarChar,  icono)
      .query(`
        INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, ruta, icono)
        OUTPUT INSERTED.*
        VALUES (@usuarioId, @tipo, @titulo, @mensaje, @ruta, @icono)
      `);

    const notif = result.recordset[0];

    // Emitir en tiempo real al usuario conectado
    const io = ioInstance.getIO();
    if (io) {
      io.to(`user_${usuarioId}`).emit('nueva_notificacion', notif);
    }

    return notif;
  } catch (err) {
    console.error('[notificaciones] Error creando notificación:', err.message);
  }
};

/**
 * Notifica a todos los usuarios que tengan un módulo específico asignado.
 */
const notificarModulo = async (moduloNombre, tipo, titulo, mensaje, ruta, icono = 'notifications') => {
  try {
    const pool = await poolPromise;
    const r = await pool.request()
      .input('modulo', sql.VarChar, moduloNombre)
      .query(`
        SELECT DISTINCT u.id
        FROM usuarios u
        JOIN perfiles p ON p.id = u.perfil_id
        JOIN perfil_modulo pm ON pm.perfil_id = p.id
        JOIN modulos m ON m.id = pm.modulo_id
        WHERE m.nombre = @modulo AND u.activo = 1
      `);

    for (const row of r.recordset) {
      await crearNotificacion({ usuarioId: row.id, tipo, titulo, mensaje, ruta, icono });
    }
  } catch (err) {
    console.error('[notificaciones] Error en notificarModulo:', err.message);
  }
};

/**
 * Notifica a todos los usuarios con uno de los perfiles indicados.
 */
const notificarPerfiles = async (perfilIds, tipo, titulo, mensaje, ruta, icono = 'notifications') => {
  try {
    const pool = await poolPromise;
    const placeholders = perfilIds.map((_, i) => `@p${i}`).join(',');
    const req = pool.request();
    perfilIds.forEach((id, i) => req.input(`p${i}`, sql.Int, id));
    const r = await req.query(
      `SELECT id FROM usuarios WHERE perfil_id IN (${placeholders}) AND activo = 1`
    );
    for (const row of r.recordset) {
      await crearNotificacion({ usuarioId: row.id, tipo, titulo, mensaje, ruta, icono });
    }
  } catch (err) {
    console.error('[notificaciones] Error en notificarPerfiles:', err.message);
  }
};

module.exports = { asegurarTabla, crearNotificacion, notificarModulo, notificarPerfiles };
