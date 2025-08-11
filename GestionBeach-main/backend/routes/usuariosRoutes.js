// backend/routes/usuariosRoutes.js
const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

// GET todos los usuarios con información del perfil
router.get('/', authMiddleware, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`
        SELECT 
          u.id, 
          u.username, 
          u.nombre_completo,
          u.perfil_id,
          p.nombre as perfil_nombre
        FROM usuarios u
        LEFT JOIN perfiles p ON u.perfil_id = p.id
        ORDER BY u.id
      `);
    
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ 
      message: 'Error al obtener usuarios', 
      error: error.message 
    });
  }
});

// GET un usuario específico con módulos disponibles
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const pool = await poolPromise;
    
    // Obtener usuario
    const userResult = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          u.id, 
          u.username, 
          u.nombre_completo,
          u.perfil_id,
          p.nombre as perfil_nombre
        FROM usuarios u
        LEFT JOIN perfiles p ON u.perfil_id = p.id
        WHERE u.id = @id
      `);
    
    if (userResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const usuario = userResult.recordset[0];

    // Obtener módulos disponibles a través del perfil
    if (usuario.perfil_id) {
      const modulesResult = await pool.request()
        .input('perfilId', sql.Int, usuario.perfil_id)
        .query(`
          SELECT m.id, m.nombre, m.ruta FROM modulos m
          INNER JOIN perfil_modulo pm ON pm.modulo_id = m.id
          WHERE pm.perfil_id = @perfilId
          ORDER BY m.nombre
        `);
      
      usuario.modules = modulesResult.recordset.map(m => m.id);
      usuario.moduleNames = modulesResult.recordset.map(m => m.nombre);
    } else {
      usuario.modules = [];
      usuario.moduleNames = [];
    }
    
    res.status(200).json(usuario);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ 
      message: 'Error al obtener usuario', 
      error: error.message 
    });
  }
});

// POST crear un usuario
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { username, password, nombre_completo, perfil_id } = req.body;
    
    if (!username || !password || !nombre_completo || !perfil_id) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }
    
    const pool = await poolPromise;
    
    // Verificar que el username no exista
    const checkUsername = await pool.request()
      .input('username', sql.VarChar, username)
      .query('SELECT id FROM usuarios WHERE username = @username');
    
    if (checkUsername.recordset.length > 0) {
      return res.status(400).json({ message: 'El nombre de usuario ya existe' });
    }

    // Verificar que el perfil exista
    const checkPerfil = await pool.request()
      .input('perfilId', sql.Int, perfil_id)
      .query('SELECT id FROM perfiles WHERE id = @perfilId');
    
    if (checkPerfil.recordset.length === 0) {
      return res.status(400).json({ message: 'El perfil seleccionado no existe' });
    }
    
    // Crear usuario
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, password)
      .input('nombre_completo', sql.VarChar, nombre_completo)
      .input('perfil_id', sql.Int, perfil_id)
      .query(`
        INSERT INTO usuarios (username, password, nombre_completo, perfil_id)
        VALUES (@username, @password, @nombre_completo, @perfil_id);
        SELECT SCOPE_IDENTITY() AS id
      `);
    
    const id = result.recordset[0].id;
    
    res.status(201).json({ 
      id, 
      username, 
      nombre_completo, 
      perfil_id
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ 
      message: 'Error al crear usuario', 
      error: error.message 
    });
  }
});

// PUT actualizar un usuario
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, nombre_completo, perfil_id } = req.body;
    
    if (!username || !nombre_completo || !perfil_id) {
      return res.status(400).json({ message: 'Username, nombre completo y perfil son requeridos' });
    }
    
    const pool = await poolPromise;
    
    // Verificar que el usuario exista
    const checkUser = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id FROM usuarios WHERE id = @id');
    
    if (checkUser.recordset.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Verificar que el username no exista (excepto para el mismo usuario)
    const checkUsername = await pool.request()
      .input('username', sql.VarChar, username)
      .input('id', sql.Int, id)
      .query('SELECT id FROM usuarios WHERE username = @username AND id != @id');
    
    if (checkUsername.recordset.length > 0) {
      return res.status(400).json({ message: 'El nombre de usuario ya existe' });
    }

    // Verificar que el perfil exista
    const checkPerfil = await pool.request()
      .input('perfilId', sql.Int, perfil_id)
      .query('SELECT id FROM perfiles WHERE id = @perfilId');
    
    if (checkPerfil.recordset.length === 0) {
      return res.status(400).json({ message: 'El perfil seleccionado no existe' });
    }
    
    // Preparar la consulta
    let query = `
      UPDATE usuarios
      SET username = @username,
          nombre_completo = @nombre_completo,
          perfil_id = @perfil_id
    `;
    
    // Si se proporciona una contraseña, actualizarla
    if (password && password.trim() !== '') {
      query += `, password = @password`;
    }
    
    query += ` WHERE id = @id`;
    
    // Crear la solicitud
    const request = pool.request()
      .input('id', sql.Int, id)
      .input('username', sql.VarChar, username)
      .input('nombre_completo', sql.VarChar, nombre_completo)
      .input('perfil_id', sql.Int, perfil_id);
    
    if (password && password.trim() !== '') {
      request.input('password', sql.VarChar, password);
    }
    
    // Ejecutar la actualización
    await request.query(query);
    
    res.status(200).json({ 
      id: parseInt(id), 
      username, 
      nombre_completo, 
      perfil_id
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ 
      message: 'Error al actualizar usuario', 
      error: error.message 
    });
  }
});

// DELETE eliminar un usuario
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const pool = await poolPromise;
    
    // Verificar que el usuario exista
    const checkUser = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id FROM usuarios WHERE id = @id');
    
    if (checkUser.recordset.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Eliminar usuario
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM usuarios WHERE id = @id');
    
    res.status(200).json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ 
      message: 'Error al eliminar usuario', 
      error: error.message 
    });
  }
});

module.exports = router;