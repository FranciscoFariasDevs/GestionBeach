// backend/routes/productoRoutes.js
const express = require('express');
const router = express.Router();
const { buscarProducto } = require('../controllers/productoController');

router.get('/', buscarProducto);

module.exports = router;
