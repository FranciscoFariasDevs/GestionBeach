// backend/controllers/usuariosController.js
const { sql, poolPromise } = require('../config/db');

// Obtener todos los usuarios
exports.getAllUsuarios = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`
        SELECT 
          u.id, 
          u.username, 
          u.nombre_completo as nombre, 
          u.email, 
          u.perfil_id as perfilId,
          p.nombre as perfil
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
};

// Obtener un usuario por ID
exports.getUsuarioById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          u.id, 
          u.username, 
          u.nombre_completo as nombre, 
          u.email, 
          u.perfil_id as perfilId,
          p.nombre as perfil
        FROM usuarios u
        LEFT JOIN perfiles p ON u.perfil_id = p.id
        WHERE u.id = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.status(200).json(result.recordset[0]);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ 
      message: 'Error al obtener usuario', 
      error: error.message 
    });
  }
};

// Crear un nuevo usuario
exports.createUsuario = async (req, res) => {
  try {
    const { username, password, nombre, email, perfilId } = req.body;
    
    // Validar datos requeridos
    if (!username || !password || !nombre || !perfilId) {
      return res.status(400).json({ 
        message: 'Se requieren los campos: username, password, nombre y perfilId' 
      });
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
      .input('perfilId', sql.Int, perfilId)
      .query('SELECT id FROM perfiles WHERE id = @perfilId');
    
    if (checkPerfil.recordset.length === 0) {
      return res.status(400).json({ message: 'El perfil seleccionado no existe' });
    }
    
    // Insertar el nuevo usuario
    const insertResult = await pool.request()
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, password)
      .input('nombre', sql.VarChar, nombre)
      .input('email', sql.VarChar, email || null)
      .input('perfilId', sql.Int, perfilId)
      .query(`
        INSERT INTO usuarios (username, password, nombre_completo, email, perfil_id)
        VALUES (@username, @password, @nombre, @email, @perfilId);
        
        SELECT SCOPE_IDENTITY() AS id;
      `);
    
    const newUserId = insertResult.recordset[0].id;
    
    // Obtener el usuario recién creado
    const newUser = await pool.request()
      .input('id', sql.Int, newUserId)
      .query(`
        SELECT 
          u.id, 
          u.username, 
          u.nombre_completo as nombre, 
          u.email, 
          u.perfil_id as perfilId,
          p.nombre as perfil
        FROM usuarios u
        LEFT JOIN perfiles p ON u.perfil_id = p.id
        WHERE u.id = @id
      `);
    
    res.status(201).json(newUser.recordset[0]);
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ 
      message: 'Error al crear usuario', 
      error: error.message 
    });
  }
};

// Actualizar un usuario
exports.updateUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, nombre, email, perfilId } = req.body;
    
    // Validar datos requeridos
    if (!username || !nombre || !perfilId) {
      return res.status(400).json({ 
        message: 'Se requieren los campos: username, nombre y perfilId' 
      });
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
      .input('perfilId', sql.Int, perfilId)
      .query('SELECT id FROM perfiles WHERE id = @perfilId');
    
    if (checkPerfil.recordset.length === 0) {
      return res.status(400).json({ message: 'El perfil seleccionado no existe' });
    }
    
    // Preparar la consulta SQL
    let updateQuery = `
      UPDATE usuarios
      SET username = @username,
          nombre_completo = @nombre,
          email = @email,
          perfil_id = @perfilId
    `;
    
    // Si se proporciona una contraseña, actualizarla
    if (password) {
      updateQuery += `, password = @password`;
    }
    
    updateQuery += ` WHERE id = @id`;
    
    // Ejecutar la actualización
    const request = pool.request()
      .input('id', sql.Int, id)
      .input('username', sql.VarChar, username)
      .input('nombre', sql.VarChar, nombre)
      .input('email', sql.VarChar, email || null)
      .input('perfilId', sql.Int, perfilId);
    
    if (password) {
      request.input('password', sql.VarChar, password);
    }
    
    await request.query(updateQuery);
    
    // Obtener el usuario actualizado
    const updatedUser = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          u.id, 
          u.username, 
          u.nombre_completo as nombre, 
          u.email, 
          u.perfil_id as perfilId,
          p.nombre as perfil
        FROM usuarios u
        LEFT JOIN perfiles p ON u.perfil_id = p.id
        WHERE u.id = @id
      `);
    
    res.status(200).json(updatedUser.recordset[0]);
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ 
      message: 'Error al actualizar usuario', 
      error: error.message 
    });
  }
};

// Eliminar un usuario
exports.deleteUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    
    const pool = await poolPromise;
    
    // Verificar que el usuario exista
    const checkUser = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id, perfil_id FROM usuarios WHERE id = @id');
    
    if (checkUser.recordset.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Verificar si es el último usuario administrador (asumiendo perfil_id = 1 para administradores)
    if (checkUser.recordset[0].perfil_id === 1) {
      const adminCount = await pool.request()
        .query('SELECT COUNT(*) as count FROM usuarios WHERE perfil_id = 1');
      
      if (adminCount.recordset[0].count <= 1) {
        return res.status(400).json({ 
          message: 'No se puede eliminar el último usuario administrador' 
        });
      }
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
};