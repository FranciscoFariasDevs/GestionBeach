// backend/controllers/authController.js - FIX PARA PERFILID
const { sql, poolPromise } = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
const JWT_EXPIRES_IN = '24h';

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Usuario y contraseña son requeridos' });
    }
    
    const pool = await poolPromise;
    
    // ✅ ACTUALIZAR CONSULTA PARA INCLUIR PERFIL_ID
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .query(`
        SELECT 
          u.id, 
          u.username, 
          u.password, 
          u.perfil_id,
          p.nombre as perfil_nombre
        FROM usuarios u
        LEFT JOIN perfiles p ON u.perfil_id = p.id
        WHERE u.username = @username
      `);
    
    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }
    
    const user = result.recordset[0];
    
    // Verificar contraseña
    if (password === user.password) {
      // Obtener módulos permitidos (opcional)
      let modules = [];
      try {
        const modulesResult = await pool.request()
          .input('userId', sql.Int, user.id)
          .query('SELECT distinct modulo_id FROM permisos_usuario WHERE usuario_id = @userId');

        modules = modulesResult.recordset.map(row => row.modulo_id);
      } catch (error) {
        console.log('⚠️ No se pudieron obtener módulos de permisos_usuario, continuando...');
      }
      
      // Generar token JWT
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username,
          perfilId: user.perfil_id  // ✅ INCLUIR EN TOKEN
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      
      // ✅ RESPUESTA CON PERFILID INCLUIDO
      return res.status(200).json({
        message: 'Login exitoso',
        token,
        user: {
          id: user.id,
          username: user.username,
          perfilId: user.perfil_id,        // ✅ CRÍTICO: INCLUIR PERFILID
          perfil: user.perfil_nombre,      // ✅ BONUS: NOMBRE DEL PERFIL
          modules
        }
      });
    } else {
      return res.status(401).json({ message: 'Contraseña incorreta' });
    }
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
};

// ✅ ACTUALIZAR CHECK TAMBIÉN
exports.check = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(200).json({ authenticated: false });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const pool = await poolPromise;
    const userResult = await pool.request()
      .input('userId', sql.Int, decoded.id)
      .query(`
        SELECT 
          u.id, 
          u.username, 
          u.perfil_id,
          p.nombre as perfil_nombre
        FROM usuarios u
        LEFT JOIN perfiles p ON u.perfil_id = p.id
        WHERE u.id = @userId
      `);
    
    if (userResult.recordset.length === 0) {
      return res.status(200).json({ authenticated: false });
    }
    
    const user = userResult.recordset[0];
    
    // Obtener módulos permitidos
    let modules = [];
    try {
      const modulesResult = await pool.request()
        .input('userId', sql.Int, decoded.id)
        .query('SELECT distinct modulo_id FROM permisos_usuario WHERE usuario_id = @userId');

      modules = modulesResult.recordset.map(row => row.modulo_id);
    } catch (error) {
      console.log('⚠️ No se pudieron obtener módulos, continuando...');
    }
    
    // ✅ INCLUIR PERFILID EN CHECK TAMBIÉN
    return res.status(200).json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        perfilId: user.perfil_id,        // ✅ INCLUIR PERFILID
        perfil: user.perfil_nombre,      // ✅ NOMBRE DEL PERFIL
        modules
      }
    });
  } catch (error) {
    console.error('Error en auth check:', error);
    return res.status(200).json({ authenticated: false });
  }
};

exports.logout = (req, res) => {
  res.status(200).json({ message: 'Logout exitoso' });
};