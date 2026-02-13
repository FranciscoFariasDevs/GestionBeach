const express = require('express');
const router = express.Router();
const controller = require('../controllers/resumenValorizadoController');

router.get('/datos', controller.getDatos);

module.exports = router;
