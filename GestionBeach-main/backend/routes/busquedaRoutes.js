const express = require('express');
const router = express.Router();
const { buscar } = require('../controllers/busquedaController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, buscar);

module.exports = router;
