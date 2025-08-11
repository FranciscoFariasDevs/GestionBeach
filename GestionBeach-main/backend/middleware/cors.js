// backend/middleware/cors.js
const cors = require('cors');

const corsOptions = {
  origin: ['http://192.168.100.150:3000'], // Permitir solo el origen de React
  credentials: true, // Para enviar cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

module.exports = cors(corsOptions);