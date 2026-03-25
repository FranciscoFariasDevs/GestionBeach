const { poolPromise, sql } = require('../config/db');

// ─── Crear tablas si no existen ──────────────────────────────────────────────
const asegurarTablas = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='kanban_boards' AND xtype='U')
    CREATE TABLE kanban_boards (
      id          INT IDENTITY(1,1) PRIMARY KEY,
      nombre      NVARCHAR(100) NOT NULL,
      descripcion NVARCHAR(500),
      color       NVARCHAR(20)  DEFAULT '#00e5ff',
      creado_por  INT,
      fecha_creacion DATETIME   DEFAULT GETDATE(),
      activo      BIT           DEFAULT 1
    );

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='kanban_columnas' AND xtype='U')
    CREATE TABLE kanban_columnas (
      id       INT IDENTITY(1,1) PRIMARY KEY,
      board_id INT NOT NULL,
      nombre   NVARCHAR(100) NOT NULL,
      orden    INT           DEFAULT 0,
      color    NVARCHAR(20)  DEFAULT '#00e5ff'
    );

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='kanban_tareas' AND xtype='U')
    CREATE TABLE kanban_tareas (
      id               INT IDENTITY(1,1) PRIMARY KEY,
      board_id         INT          NOT NULL,
      columna_id       INT          NOT NULL,
      titulo           NVARCHAR(200) NOT NULL,
      descripcion      NVARCHAR(MAX),
      prioridad        NVARCHAR(20)  DEFAULT 'media',
      asignado_a       INT,
      creado_por       INT,
      fecha_creacion   DATETIME      DEFAULT GETDATE(),
      fecha_vencimiento DATE,
      orden            INT           DEFAULT 0,
      activo           BIT           DEFAULT 1
    );

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='kanban_miembros' AND xtype='U')
    CREATE TABLE kanban_miembros (
      id         INT IDENTITY(1,1) PRIMARY KEY,
      board_id   INT NOT NULL,
      usuario_id INT NOT NULL,
      rol        NVARCHAR(20) DEFAULT 'miembro'
    );
  `);
};

// ─── BOARDS ─────────────────────────────────────────────────────────────────

exports.getBoards = async (req, res) => {
  try {
    const pool = await poolPromise;
    await asegurarTablas(pool);
    const userId = req.user?.id;
    const result = await pool.request()
      .input('uid', sql.Int, userId)
      .query(`
        SELECT b.*, u.nombre_completo AS creador_nombre,
          (SELECT COUNT(*) FROM kanban_tareas t WHERE t.board_id = b.id AND t.activo = 1) AS total_tareas,
          (SELECT COUNT(*) FROM kanban_miembros m WHERE m.board_id = b.id) AS total_miembros
        FROM kanban_boards b
        LEFT JOIN usuarios u ON u.id = b.creado_por
        WHERE b.activo = 1
          AND (b.creado_por = @uid OR EXISTS (
            SELECT 1 FROM kanban_miembros m WHERE m.board_id = b.id AND m.usuario_id = @uid
          ))
        ORDER BY b.fecha_creacion DESC
      `);
    res.json({ success: true, boards: result.recordset });
  } catch (e) {
    console.error('getBoards:', e);
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.createBoard = async (req, res) => {
  try {
    const pool = await poolPromise;
    await asegurarTablas(pool);
    const { nombre, descripcion, color, miembros } = req.body;
    const userId = req.user?.id;

    const r = await pool.request()
      .input('nombre', sql.NVarChar, nombre)
      .input('descripcion', sql.NVarChar, descripcion || '')
      .input('color', sql.NVarChar, color || '#00e5ff')
      .input('uid', sql.Int, userId)
      .query(`
        INSERT INTO kanban_boards (nombre, descripcion, color, creado_por)
        OUTPUT INSERTED.id
        VALUES (@nombre, @descripcion, @color, @uid)
      `);

    const boardId = r.recordset[0].id;

    // Columnas por defecto
    const columnasDef = [
      { nombre: 'Por Hacer',  orden: 0, color: '#6c757d' },
      { nombre: 'En Curso',   orden: 1, color: '#ef233c' },
      { nombre: 'Listo',      orden: 2, color: '#2dc653' },
    ];
    for (const col of columnasDef) {
      await pool.request()
        .input('bid', sql.Int, boardId)
        .input('nombre', sql.NVarChar, col.nombre)
        .input('orden', sql.Int, col.orden)
        .input('color', sql.NVarChar, col.color)
        .query(`INSERT INTO kanban_columnas (board_id, nombre, orden, color) VALUES (@bid, @nombre, @orden, @color)`);
    }

    // Agregar creador como admin
    await pool.request()
      .input('bid', sql.Int, boardId)
      .input('uid', sql.Int, userId)
      .query(`INSERT INTO kanban_miembros (board_id, usuario_id, rol) VALUES (@bid, @uid, 'admin')`);

    // Agregar miembros seleccionados (sin duplicar al creador)
    const ids = Array.isArray(miembros) ? miembros : [];
    for (const uid of ids) {
      if (Number(uid) !== Number(userId)) {
        await pool.request()
          .input('bid', sql.Int, boardId)
          .input('uid', sql.Int, uid)
          .query(`INSERT INTO kanban_miembros (board_id, usuario_id) VALUES (@bid, @uid)`);
      }
    }

    res.json({ success: true, id: boardId });
  } catch (e) {
    console.error('createBoard:', e);
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.deleteBoard = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { id } = req.params;
    await pool.request()
      .input('id', sql.Int, id)
      .query(`UPDATE kanban_boards SET activo = 0 WHERE id = @id`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── COLUMNAS ────────────────────────────────────────────────────────────────

exports.getColumnas = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { boardId } = req.params;
    const result = await pool.request()
      .input('bid', sql.Int, boardId)
      .query(`SELECT * FROM kanban_columnas WHERE board_id = @bid ORDER BY orden ASC`);
    res.json({ success: true, columnas: result.recordset });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.createColumna = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { boardId } = req.params;
    const { nombre, color } = req.body;
    const orden = await pool.request()
      .input('bid', sql.Int, boardId)
      .query(`SELECT ISNULL(MAX(orden),0)+1 AS o FROM kanban_columnas WHERE board_id = @bid`);
    const r = await pool.request()
      .input('bid', sql.Int, boardId)
      .input('nombre', sql.NVarChar, nombre)
      .input('color', sql.NVarChar, color || '#00e5ff')
      .input('orden', sql.Int, orden.recordset[0].o)
      .query(`INSERT INTO kanban_columnas (board_id, nombre, orden, color) OUTPUT INSERTED.* VALUES (@bid, @nombre, @orden, @color)`);
    res.json({ success: true, columna: r.recordset[0] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── TAREAS ──────────────────────────────────────────────────────────────────

exports.getTareas = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { boardId } = req.params;
    const result = await pool.request()
      .input('bid', sql.Int, boardId)
      .query(`
        SELECT t.*, u.nombre_completo AS asignado_nombre, u.foto_perfil AS asignado_foto,
               uc.nombre_completo AS creador_nombre
        FROM kanban_tareas t
        LEFT JOIN usuarios u  ON u.id  = t.asignado_a
        LEFT JOIN usuarios uc ON uc.id = t.creado_por
        WHERE t.board_id = @bid AND t.activo = 1
        ORDER BY t.columna_id, t.orden ASC, t.fecha_creacion DESC
      `);
    res.json({ success: true, tareas: result.recordset });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.createTarea = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { boardId } = req.params;
    const { columna_id, titulo, descripcion, prioridad, asignado_a, fecha_vencimiento } = req.body;
    const userId = req.user?.id;

    const r = await pool.request()
      .input('bid', sql.Int, boardId)
      .input('cid', sql.Int, columna_id)
      .input('titulo', sql.NVarChar, titulo)
      .input('descripcion', sql.NVarChar, descripcion || '')
      .input('prioridad', sql.NVarChar, prioridad || 'media')
      .input('asignado', sql.Int, asignado_a || null)
      .input('uid', sql.Int, userId)
      .input('venc', sql.Date, fecha_vencimiento || null)
      .query(`
        INSERT INTO kanban_tareas (board_id, columna_id, titulo, descripcion, prioridad, asignado_a, creado_por, fecha_vencimiento, orden)
        OUTPUT INSERTED.*
        VALUES (@bid, @cid, @titulo, @descripcion, @prioridad, @asignado, @uid, @venc,
          ISNULL((SELECT MAX(orden)+1 FROM kanban_tareas WHERE columna_id=@cid AND activo=1), 0))
      `);
    res.json({ success: true, tarea: r.recordset[0] });
  } catch (e) {
    console.error('createTarea:', e);
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.updateTarea = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { id } = req.params;
    const { columna_id, titulo, descripcion, prioridad, asignado_a, fecha_vencimiento, orden } = req.body;
    await pool.request()
      .input('id', sql.Int, id)
      .input('cid', sql.Int, columna_id)
      .input('titulo', sql.NVarChar, titulo)
      .input('descripcion', sql.NVarChar, descripcion || '')
      .input('prioridad', sql.NVarChar, prioridad || 'media')
      .input('asignado', sql.Int, asignado_a || null)
      .input('venc', sql.Date, fecha_vencimiento || null)
      .input('orden', sql.Int, orden ?? 0)
      .query(`
        UPDATE kanban_tareas SET
          columna_id = @cid, titulo = @titulo, descripcion = @descripcion,
          prioridad = @prioridad, asignado_a = @asignado,
          fecha_vencimiento = @venc, orden = @orden
        WHERE id = @id
      `);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.deleteTarea = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { id } = req.params;
    await pool.request()
      .input('id', sql.Int, id)
      .query(`UPDATE kanban_tareas SET activo = 0 WHERE id = @id`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// Mover tarea (drag & drop)
exports.moverTarea = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { id } = req.params;
    const { columna_id, orden } = req.body;
    await pool.request()
      .input('id', sql.Int, id)
      .input('cid', sql.Int, columna_id)
      .input('orden', sql.Int, orden ?? 0)
      .query(`UPDATE kanban_tareas SET columna_id = @cid, orden = @orden WHERE id = @id`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── MIEMBROS ────────────────────────────────────────────────────────────────

exports.getMiembros = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { boardId } = req.params;
    const r = await pool.request()
      .input('bid', sql.Int, boardId)
      .query(`
        SELECT m.*, u.nombre_completo AS nombre, u.foto_perfil
        FROM kanban_miembros m
        JOIN usuarios u ON u.id = m.usuario_id
        WHERE m.board_id = @bid
      `);
    res.json({ success: true, miembros: r.recordset });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.addMiembro = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { boardId } = req.params;
    const { usuario_id } = req.body;
    const exists = await pool.request()
      .input('bid', sql.Int, boardId)
      .input('uid', sql.Int, usuario_id)
      .query(`SELECT 1 FROM kanban_miembros WHERE board_id=@bid AND usuario_id=@uid`);
    if (!exists.recordset.length) {
      await pool.request()
        .input('bid', sql.Int, boardId)
        .input('uid', sql.Int, usuario_id)
        .query(`INSERT INTO kanban_miembros (board_id, usuario_id) VALUES (@bid, @uid)`);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.removeMiembro = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { boardId, userId } = req.params;
    await pool.request()
      .input('bid', sql.Int, boardId)
      .input('uid', sql.Int, userId)
      .query(`DELETE FROM kanban_miembros WHERE board_id=@bid AND usuario_id=@uid`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
