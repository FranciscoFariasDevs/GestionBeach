// backend/controllers/organigramaController.js
const { sql, poolPromise } = require('../config/db');
const path = require('path');
const fs = require('fs');

const asegurarTabla = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='organigrama_nodos' AND xtype='U')
    BEGIN
      CREATE TABLE organigrama_nodos (
        id           INT IDENTITY(1,1) PRIMARY KEY,
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
  // COL_LENGTH devuelve NULL si la columna NO existe → más fiable que Object_ID+sys.columns
  await pool.request().query(`
    IF COL_LENGTH('organigrama_nodos', 'sin_flecha') IS NULL
      ALTER TABLE organigrama_nodos ADD sin_flecha BIT NOT NULL DEFAULT 0
  `);
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='organigrama_relaciones' AND xtype='U')
    BEGIN
      CREATE TABLE organigrama_relaciones (
        id         INT IDENTITY(1,1) PRIMARY KEY,
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
};

// GET /api/organigrama
exports.getNodos = async (req, res) => {
  try {
    const pool = await poolPromise;
    await asegurarTabla(pool);
    const result = await pool.request().query(`
      SELECT id, nombre, cargo, departamento, color, foto_url, parent_id, pos_x, pos_y, sin_flecha
      FROM organigrama_nodos
      WHERE activo = 1
      ORDER BY id
    `);
    res.json({ success: true, nodos: result.recordset });
  } catch (error) {
    console.error('Error getNodos organigrama:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/organigrama/guardar  — bulk upsert
exports.guardarNodos = async (req, res) => {
  try {
    const { nodos } = req.body;
    if (!Array.isArray(nodos)) return res.status(400).json({ success: false, message: 'nodos debe ser un array' });
    const pool = await poolPromise;
    await asegurarTabla(pool);

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
        const ins = await pool.request()
          .input('nombre',       sql.NVarChar(200),  n.nombre || 'Empleado')
          .input('cargo',        sql.NVarChar(200),  n.cargo || '')
          .input('departamento', sql.NVarChar(100),  n.departamento || '')
          .input('color',        sql.NVarChar(20),   n.color || '#1565c0')
          .input('foto_url',     sql.NVarChar(500),  n.foto_url || null)
          .input('parent_id',    sql.Int,            n.parent_id || null)
          .input('pos_x',        sql.Float,          n.pos_x || 200)
          .input('pos_y',        sql.Float,          n.pos_y || 200)
          .input('sin_flecha',   sql.Bit,            n.sin_flecha ? 1 : 0)
          .query(`INSERT INTO organigrama_nodos
                    (nombre,cargo,departamento,color,foto_url,parent_id,pos_x,pos_y,sin_flecha)
                  OUTPUT INSERTED.id
                  VALUES (@nombre,@cargo,@departamento,@color,@foto_url,@parent_id,@pos_x,@pos_y,@sin_flecha)`);
        n._savedId = ins.recordset[0]?.id;
      }
    }

    // Return fresh data
    const fresh = await pool.request().query(`
      SELECT id, nombre, cargo, departamento, color, foto_url, parent_id, pos_x, pos_y, sin_flecha
      FROM organigrama_nodos WHERE activo=1 ORDER BY id
    `);
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
    // Orphan direct children
    await pool.request().input('pid', sql.Int, id)
      .query('UPDATE organigrama_nodos SET parent_id = NULL WHERE parent_id = @pid');
    // Soft delete
    await pool.request().input('id', sql.Int, id)
      .query('UPDATE organigrama_nodos SET activo = 0 WHERE id = @id');
    res.json({ success: true });
  } catch (error) {
    console.error('Error eliminarNodo organigrama:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/organigrama/foto  — multer handled in route
exports.subirFoto = (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No se recibió archivo' });
  const foto_url = `/uploads/organigrama/${req.file.filename}`;
  res.json({ success: true, foto_url });
};

// GET /api/organigrama/relaciones
exports.getRelaciones = async (req, res) => {
  try {
    const pool = await poolPromise;
    await asegurarTabla(pool);
    const r = await pool.request().query('SELECT id, nodo_a, nodo_b, sin_flecha FROM organigrama_relaciones');
    res.json({ success: true, relaciones: r.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/organigrama/relaciones
exports.crearRelacion = async (req, res) => {
  try {
    const { nodo_a, nodo_b } = req.body;
    if (!nodo_a || !nodo_b) return res.status(400).json({ success: false, message: 'nodo_a y nodo_b requeridos' });
    const pool = await poolPromise;
    await asegurarTabla(pool);
    // Evitar duplicados
    const existe = await pool.request()
      .input('a', sql.Int, nodo_a).input('b', sql.Int, nodo_b)
      .query(`SELECT id FROM organigrama_relaciones
              WHERE (nodo_a=@a AND nodo_b=@b) OR (nodo_a=@b AND nodo_b=@a)`);
    if (existe.recordset.length > 0)
      return res.json({ success: true, relacion: existe.recordset[0] });
    const ins = await pool.request()
      .input('a', sql.Int, nodo_a).input('b', sql.Int, nodo_b)
      .query('INSERT INTO organigrama_relaciones(nodo_a,nodo_b) OUTPUT INSERTED.id VALUES(@a,@b)');
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
