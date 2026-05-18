const express = require('express');
const router = express.Router();
const { consultar, getSucursales } = require('../controllers/aiConsultaController');

router.get('/sucursales', getSucursales);
router.post('/consultar', consultar);

module.exports = router;
