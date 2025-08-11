// backend/controllers/authController.js
const { sql, poolPromise } = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Configuración del token JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
const JWT_EXPIRES_IN = '24h';

// Función para iniciar sesión
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validar campos
    if (!username || !password) {
      return res.status(400).json({ message: 'Usuario y contraseña son requeridos' });
    }
    
    // Obtener pool de conexión
    const pool = await poolPromise;
    
    // Consultar usuario
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .query('SELECT id, username, password FROM usuarios WHERE username = @username');
    
    // Verificar si existe el usuario
    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }
    
    const user = result.recordset[0];
    
    // Verificar contraseña (aquí usamos comparación directa como en PHP)
    // En un sistema real, usarías bcrypt para comparar hashes
    if (password === user.password) {
      // Obtener módulos permitidos
      const modulesResult = await pool.request()
        .input('userId', sql.Int, user.id)
        .query('SELECT distinct modulo_id FROM permisos_usuario WHERE usuario_id = @userId');
      
      const modules = modulesResult.recordset.map(row => row.modulo_id);
      
      // Generar token JWT
      const token = jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      
      // Enviar respuesta exitosa
      return res.status(200).json({
        message: 'Login exitoso',
        token,
        user: {
          id: user.id,
          username: user.username,
          modules
        }
      });
    } else {
      // Contraseña incorrecta
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
};

// Función para verificar estado de autenticación
exports.check = async (req, res) => {
  try {
    // Verificar si hay token
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(200).json({ authenticated: false });
    }
    
    // Verificar token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Obtener datos del usuario
    const pool = await poolPromise;
    const userResult = await pool.request()
      .input('userId', sql.Int, decoded.id)
      .query('SELECT id, username FROM usuarios WHERE id = @userId');
    
    if (userResult.recordset.length === 0) {
      return res.status(200).json({ authenticated: false });
    }
    
    // Obtener módulos permitidos
    const modulesResult = await pool.request()
      .input('userId', sql.Int, decoded.id)
      .query('SELECT distinct modulo_id FROM permisos_usuario WHERE usuario_id = @userId');
    
    const modules = modulesResult.recordset.map(row => row.modulo_id);
    
    // Enviar información del usuario
    return res.status(200).json({
      authenticated: true,
      user: {
        id: decoded.id,
        username: decoded.username,
        modules
      }
    });
  } catch (error) {
    console.error('Error en auth check:', error);
    return res.status(200).json({ authenticated: false });
  }
};

// Función para cerrar sesión (en JWT solo se hace en el cliente)
exports.logout = (req, res) => {
  res.status(200).json({ message: 'Logout exitoso' });
};