// backend/controllers/organigramaController.js
const { sql, poolPromise } = require('../config/db');
const path = require('path');
const fs = require('fs');

// ─── Migración de tablas ───────────────────────────────────────────────────────
const asegurarTabla = async (pool) => {
  // Tabla de boards (organigrama por departamento)
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='organigrama_boards' AND xtype='U')
    BEGIN
      CREATE TABLE organigrama_boards (
        id           INT IDENTITY(1,1) PRIMARY KEY,
        nombre       NVARCHAR(200) NOT NULL,
        descripcion  NVARCHAR(500) NULL,
        departamento NVARCHAR(100) NULL,
        fondo        NVARCHAR(50)  NOT NULL DEFAULT 'grid_light',
        creado_en    DATETIME      NOT NULL DEFAULT GETDATE()
      )
    END
  `);

  // Nodos
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='organigrama_nodos' AND xtype='U')
    BEGIN
      CREATE TABLE organigrama_nodos (
        id           INT IDENTITY(1,1) PRIMARY KEY,
        board_id     INT NULL,
        nombre       NVARCHAR(200) NOT NULL DEFAULT 'Nuevo Empleado',
        cargo        NVARCHAR(200) NOT NULL DEFAULT '',
        departamento NVARCHAR(100) NOT NULL DEFAULT '',
        color        NVARCHAR(20)  NOT NULL DEFAULT '#1565c0',
        foto_url     NVARCHAR(500) NULL,
        parent_id    INT NULL,
        pos_x        FLOAT NOT NULL DEFAULT 200,
        pos_y        FLOAT NOT NULL DEFAULT 200,
        activo       BIT   NOT NULL DEFAULT 1,
        sin_flecha   BIT   NOT NULL DEFAULT 0
      )
    END
  `);
  await pool.request().query(`
    IF COL_LENGTH('organigrama_nodos', 'sin_flecha') IS NULL
      ALTER TABLE organigrama_nodos ADD sin_flecha BIT NOT NULL DEFAULT 0
  `);
  await pool.request().query(`
    IF COL_LENGTH('organigrama_nodos', 'board_id') IS NULL
      ALTER TABLE organigrama_nodos ADD board_id INT NULL
  `);

  // Relaciones
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='organigrama_relaciones' AND xtype='U')
    BEGIN
      CREATE TABLE organigrama_relaciones (
        id         INT IDENTITY(1,1) PRIMARY KEY,
        board_id   INT NULL,
        nodo_a     INT NOT NULL,
        nodo_b     INT NOT NULL,
        sin_flecha BIT NOT NULL DEFAULT 0
      )
    END
  `);
  await pool.request().query(`
    IF COL_LENGTH('organigrama_relaciones', 'sin_flecha') IS NULL
      ALTER TABLE organigrama_relaciones ADD sin_flecha BIT NOT NULL DEFAULT 0
  `);
  await pool.request().query(`
    IF COL_LENGTH('organigrama_relaciones', 'board_id') IS NULL
      ALTER TABLE organigrama_relaciones ADD board_id INT NULL
  `);
};

// ─── Boards ───────────────────────────────────────────────────────────────────

// GET /api/organigrama/boards
exports.getBoards = async (req, res) => {
  try {
    const pool = await poolPromise;
    await asegurarTabla(pool);
    const r = await pool.request().query(
      'SELECT id, nombre, descripcion, departamento, fondo, creado_en FROM organigrama_boards ORDER BY id'
    );
    res.json({ success: true, boards: r.recordset });
  } catch (error) {
    console.error('Error getBoards:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/organigrama/boards
exports.crearBoard = async (req, res) => {
  try {
    const { nombre, descripcion, departamento, fondo, copiarDesdeGlobal, trabajadoresIds } = req.body;
    if (!nombre) return res.status(400).json({ success: false, message: 'nombre requerido' });
    const pool = await poolPromise;
    await asegurarTabla(pool);

    const ins = await pool.request()
      .input('nombre',       sql.NVarChar(200), nombre)
      .input('descripcion',  sql.NVarChar(500), descripcion || null)
      .input('departamento', sql.NVarChar(100), departamento || null)
      .input('fondo',        sql.NVarChar(50),  fondo || 'corporate_dark')
      .query(`INSERT INTO organigrama_boards (nombre, descripcion, departamento, fondo)
              OUTPUT INSERTED.id
              VALUES (@nombre, @descripcion, @departamento, @fondo)`);

    const newBoardId = ins.recordset[0].id;

    // ── Opción A: Importar trabajadores seleccionados por ID ─────────────────
    if (Array.isArray(trabajadoresIds) && trabajadoresIds.length > 0) {
      const ids = trabajadoresIds.map(id => parseInt(id)).filter(id => !isNaN(id));
      if (ids.length > 0) {
        const placeholders = ids.map((_, i) => `@id${i}`).join(',');
        const req2 = pool.request();
        ids.forEach((id, i) => req2.input(`id${i}`, sql.Int, id));
        const nodosSelec = await req2.query(
          `SELECT id, nombre, cargo, departamento, color, foto_url, sin_flecha
           FROM organigrama_nodos
           WHERE activo = 1 AND id IN (${placeholders})`
        );

        // Distribuir en grid automáticamente (5 columnas, separadas 220x240px)
        const COLS = 5;
        const GAP_X = 220, GAP_Y = 250;
        let col = 0, row = 0;
        for (const n of nodosSelec.recordset) {
          await pool.request()
            .input('board_id',     sql.Int,          newBoardId)
            .input('nombre',       sql.NVarChar(200), n.nombre)
            .input('cargo',        sql.NVarChar(200), n.cargo)
            .input('departamento', sql.NVarChar(100), n.departamento)
            .input('color',        sql.NVarChar(20),  n.color)
            .input('foto_url',     sql.NVarChar(500), n.foto_url || null)
            .input('pos_x',        sql.Float,         80 + col * GAP_X)
            .input('pos_y',        sql.Float,         80 + row * GAP_Y)
            .input('sin_flecha',   sql.Bit,            n.sin_flecha ? 1 : 0)
            .query(`INSERT INTO organigrama_nodos
                      (board_id, nombre, cargo, departamento, color, foto_url, parent_id, pos_x, pos_y, sin_flecha)
                    OUTPUT INSERTED.id
                    VALUES (@board_id,@nombre,@cargo,@departamento,@color,@foto_url,NULL,@pos_x,@pos_y,@sin_flecha)`);
          col++;
          if (col >= COLS) { col = 0; row++; }
        }
      }
    }
    // ── Opción B: Copiar desde global filtrando por departamento (comportamiento anterior) ──
    else if (copiarDesdeGlobal && departamento) {
      const nodosGlobal = await pool.request()
        .input('dept', sql.NVarChar(100), departamento)
        .query(`SELECT id, nombre, cargo, departamento, color, foto_url, parent_id, pos_x, pos_y, sin_flecha
                FROM organigrama_nodos
                WHERE activo = 1 AND board_id IS NULL AND departamento = @dept`);

      const idMap = {}; // old_id → new_id

      for (const n of nodosGlobal.recordset) {
        const result = await pool.request()
          .input('board_id',     sql.Int,          newBoardId)
          .input('nombre',       sql.NVarChar(200), n.nombre)
          .input('cargo',        sql.NVarChar(200), n.cargo)
          .input('departamento', sql.NVarChar(100), n.departamento)
          .input('color',        sql.NVarChar(20),  n.color)
          .input('foto_url',     sql.NVarChar(500), n.foto_url || null)
          .input('pos_x',        sql.Float,         n.pos_x)
          .input('pos_y',        sql.Float,         n.pos_y)
          .input('sin_flecha',   sql.Bit,            n.sin_flecha ? 1 : 0)
          .query(`INSERT INTO organigrama_nodos
                    (board_id, nombre, cargo, departamento, color, foto_url, parent_id, pos_x, pos_y, sin_flecha)
                  OUTPUT INSERTED.id
                  VALUES (@board_id,@nombre,@cargo,@departamento,@color,@foto_url,NULL,@pos_x,@pos_y,@sin_flecha)`);
        idMap[n.id] = result.recordset[0].id;
      }

      for (const n of nodosGlobal.recordset) {
        if (n.parent_id && idMap[n.parent_id]) {
          await pool.request()
            .input('id',        sql.Int, idMap[n.id])
            .input('parent_id', sql.Int, idMap[n.parent_id])
            .query('UPDATE organigrama_nodos SET parent_id = @parent_id WHERE id = @id');
        }
      }
    }

    const board = await pool.request()
      .input('id', sql.Int, newBoardId)
      .query('SELECT id, nombre, descripcion, departamento, fondo FROM organigrama_boards WHERE id = @id');

    res.json({ success: true, board: board.recordset[0] });
  } catch (error) {
    console.error('Error crearBoard:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/organigrama/boards/:id
exports.actualizarBoard = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, fondo } = req.body;
    const pool = await poolPromise;
    const sets = [];
    const request = pool.request().input('id', sql.Int, parseInt(id));
    if (nombre !== undefined)      { sets.push('nombre = @nombre');           request.input('nombre', sql.NVarChar(200), nombre); }
    if (descripcion !== undefined) { sets.push('descripcion = @descripcion'); request.input('descripcion', sql.NVarChar(500), descripcion); }
    if (fondo !== undefined)       { sets.push('fondo = @fondo');             request.input('fondo', sql.NVarChar(50), fondo); }
    if (sets.length === 0) return res.status(400).json({ success: false, message: 'Nada que actualizar' });
    await request.query(`UPDATE organigrama_boards SET ${sets.join(', ')} WHERE id = @id`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error actualizarBoard:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/organigrama/boards/:id
exports.eliminarBoard = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    // Eliminar relaciones del board
    await pool.request().input('id', sql.Int, parseInt(id))
      .query('DELETE FROM organigrama_relaciones WHERE board_id = @id');
    // Soft-delete nodos del board
    await pool.request().input('id', sql.Int, parseInt(id))
      .query('UPDATE organigrama_nodos SET activo = 0 WHERE board_id = @id');
    // Eliminar el board
    await pool.request().input('id', sql.Int, parseInt(id))
      .query('DELETE FROM organigrama_boards WHERE id = @id');
    res.json({ success: true });
  } catch (error) {
    console.error('Error eliminarBoard:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Todos los trabajadores (para reutilizar en nuevos boards) ────────────────

// GET /api/organigrama/todos-trabajadores
exports.getTodosLosTrabajadores = async (req, res) => {
  try {
    const pool = await poolPromise;
    await asegurarTabla(pool);
    const result = await pool.request().query(`
      SELECT n.id, n.nombre, n.cargo, n.departamento, n.color, n.foto_url, n.board_id,
             ISNULL(b.nombre, 'General') AS board_nombre
      FROM organigrama_nodos n
      LEFT JOIN organigrama_boards b ON b.id = n.board_id
      WHERE n.activo = 1
      ORDER BY n.nombre
    `);
    res.json({ success: true, trabajadores: result.recordset });
  } catch (error) {
    console.error('Error getTodosLosTrabajadores:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Nodos ────────────────────────────────────────────────────────────────────

// GET /api/organigrama?board_id=X  (null/omitido = global)
exports.getNodos = async (req, res) => {
  try {
    const pool = await poolPromise;
    await asegurarTabla(pool);
    const boardId = req.query.board_id ? parseInt(req.query.board_id) : null;

    let result;
    if (boardId !== null) {
      result = await pool.request()
        .input('board_id', sql.Int, boardId)
        .query(`SELECT id, nombre, cargo, departamento, color, foto_url, parent_id, pos_x, pos_y, sin_flecha
                FROM organigrama_nodos
                WHERE activo = 1 AND board_id = @board_id
                ORDER BY id`);
    } else {
      result = await pool.request()
        .query(`SELECT id, nombre, cargo, departamento, color, foto_url, parent_id, pos_x, pos_y, sin_flecha
                FROM organigrama_nodos
                WHERE activo = 1 AND board_id IS NULL
                ORDER BY id`);
    }
    res.json({ success: true, nodos: result.recordset });
  } catch (error) {
    console.error('Error getNodos organigrama:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/organigrama/guardar  — bulk upsert
exports.guardarNodos = async (req, res) => {
  try {
    const { nodos, board_id } = req.body;
    if (!Array.isArray(nodos)) return res.status(400).json({ success: false, message: 'nodos debe ser un array' });
    const pool = await poolPromise;
    await asegurarTabla(pool);
    const boardId = board_id != null ? parseInt(board_id) : null;

    for (const n of nodos) {
      const isNew = !n.id || n.id <= 0;
      if (!isNew) {
        await pool.request()
          .input('id',           sql.Int,           n.id)
          .input('nombre',       sql.NVarChar(200),  n.nombre || 'Empleado')
          .input('cargo',        sql.NVarChar(200),  n.cargo || '')
          .input('departamento', sql.NVarChar(100),  n.departamento || '')
          .input('color',        sql.NVarChar(20),   n.color || '#1565c0')
          .input('foto_url',     sql.NVarChar(500),  n.foto_url || null)
          .input('parent_id',    sql.Int,            n.parent_id || null)
          .input('pos_x',        sql.Float,          n.pos_x || 200)
          .input('pos_y',        sql.Float,          n.pos_y || 200)
          .input('sin_flecha',   sql.Bit,            n.sin_flecha ? 1 : 0)
          .query(`UPDATE organigrama_nodos
                  SET nombre=@nombre, cargo=@cargo, departamento=@departamento,
                      color=@color, foto_url=@foto_url, parent_id=@parent_id,
                      pos_x=@pos_x, pos_y=@pos_y, sin_flecha=@sin_flecha
                  WHERE id=@id`);
      } else {
        const req2 = pool.request()
          .input('nombre',       sql.NVarChar(200),  n.nombre || 'Empleado')
          .input('cargo',        sql.NVarChar(200),  n.cargo || '')
          .input('departamento', sql.NVarChar(100),  n.departamento || '')
          .input('color',        sql.NVarChar(20),   n.color || '#1565c0')
          .input('foto_url',     sql.NVarChar(500),  n.foto_url || null)
          .input('parent_id',    sql.Int,            n.parent_id || null)
          .input('pos_x',        sql.Float,          n.pos_x || 200)
          .input('pos_y',        sql.Float,          n.pos_y || 200)
          .input('sin_flecha',   sql.Bit,            n.sin_flecha ? 1 : 0);
        if (boardId !== null) req2.input('board_id', sql.Int, boardId);
        const ins = await req2.query(`
          INSERT INTO organigrama_nodos
            (${boardId !== null ? 'board_id,' : ''}nombre,cargo,departamento,color,foto_url,parent_id,pos_x,pos_y,sin_flecha)
          OUTPUT INSERTED.id
          VALUES (${boardId !== null ? '@board_id,' : ''}@nombre,@cargo,@departamento,@color,@foto_url,@parent_id,@pos_x,@pos_y,@sin_flecha)
        `);
        n._savedId = ins.recordset[0]?.id;
      }
    }

    // Return fresh data for this board
    let fresh;
    if (boardId !== null) {
      fresh = await pool.request()
        .input('board_id', sql.Int, boardId)
        .query(`SELECT id, nombre, cargo, departamento, color, foto_url, parent_id, pos_x, pos_y, sin_flecha
                FROM organigrama_nodos WHERE activo=1 AND board_id=@board_id ORDER BY id`);
    } else {
      fresh = await pool.request()
        .query(`SELECT id, nombre, cargo, departamento, color, foto_url, parent_id, pos_x, pos_y, sin_flecha
                FROM organigrama_nodos WHERE activo=1 AND board_id IS NULL ORDER BY id`);
    }
    res.json({ success: true, nodos: fresh.recordset });
  } catch (error) {
    console.error('Error guardarNodos organigrama:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/organigrama/:id
exports.eliminarNodo = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    await pool.request().input('pid', sql.Int, id)
      .query('UPDATE organigrama_nodos SET parent_id = NULL WHERE parent_id = @pid');
    await pool.request().input('id', sql.Int, id)
      .query('UPDATE organigrama_nodos SET activo = 0 WHERE id = @id');
    res.json({ success: true });
  } catch (error) {
    console.error('Error eliminarNodo organigrama:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/organigrama/foto
exports.subirFoto = (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No se recibió archivo' });
  const foto_url = `/uploads/organigrama/${req.file.filename}`;
  res.json({ success: true, foto_url });
};

// ─── Relaciones ───────────────────────────────────────────────────────────────

// GET /api/organigrama/relaciones?board_id=X
exports.getRelaciones = async (req, res) => {
  try {
    const pool = await poolPromise;
    await asegurarTabla(pool);
    const boardId = req.query.board_id ? parseInt(req.query.board_id) : null;
    let r;
    if (boardId !== null) {
      r = await pool.request()
        .input('board_id', sql.Int, boardId)
        .query('SELECT id, nodo_a, nodo_b, sin_flecha FROM organigrama_relaciones WHERE board_id = @board_id');
    } else {
      r = await pool.request()
        .query('SELECT id, nodo_a, nodo_b, sin_flecha FROM organigrama_relaciones WHERE board_id IS NULL');
    }
    res.json({ success: true, relaciones: r.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/organigrama/relaciones
exports.crearRelacion = async (req, res) => {
  try {
    const { nodo_a, nodo_b, board_id } = req.body;
    if (!nodo_a || !nodo_b) return res.status(400).json({ success: false, message: 'nodo_a y nodo_b requeridos' });
    const pool = await poolPromise;
    await asegurarTabla(pool);
    const boardId = board_id != null ? parseInt(board_id) : null;

    let existeQ;
    if (boardId !== null) {
      existeQ = await pool.request()
        .input('a', sql.Int, nodo_a).input('b', sql.Int, nodo_b).input('bid', sql.Int, boardId)
        .query(`SELECT id FROM organigrama_relaciones
                WHERE board_id = @bid AND ((nodo_a=@a AND nodo_b=@b) OR (nodo_a=@b AND nodo_b=@a))`);
    } else {
      existeQ = await pool.request()
        .input('a', sql.Int, nodo_a).input('b', sql.Int, nodo_b)
        .query(`SELECT id FROM organigrama_relaciones
                WHERE board_id IS NULL AND ((nodo_a=@a AND nodo_b=@b) OR (nodo_a=@b AND nodo_b=@a))`);
    }
    if (existeQ.recordset.length > 0)
      return res.json({ success: true, relacion: existeQ.recordset[0] });

    const req2 = pool.request().input('a', sql.Int, nodo_a).input('b', sql.Int, nodo_b);
    if (boardId !== null) req2.input('bid', sql.Int, boardId);
    const ins = await req2.query(
      boardId !== null
        ? 'INSERT INTO organigrama_relaciones(board_id,nodo_a,nodo_b) OUTPUT INSERTED.id VALUES(@bid,@a,@b)'
        : 'INSERT INTO organigrama_relaciones(nodo_a,nodo_b) OUTPUT INSERTED.id VALUES(@a,@b)'
    );
    res.json({ success: true, relacion: { id: ins.recordset[0].id, nodo_a, nodo_b } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/organigrama/relaciones/:id
exports.actualizarRelacion = async (req, res) => {
  try {
    const pool = await poolPromise;
    await asegurarTabla(pool);
    await pool.request()
      .input('id',         sql.Int, req.params.id)
      .input('sin_flecha', sql.Bit, req.body.sin_flecha ? 1 : 0)
      .query('UPDATE organigrama_relaciones SET sin_flecha=@sin_flecha WHERE id=@id');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/organigrama/relaciones/:id
exports.eliminarRelacion = async (req, res) => {
  try {
    const pool = await poolPromise;
    await pool.request().input('id', sql.Int, req.params.id)
      .query('DELETE FROM organigrama_relaciones WHERE id=@id');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
