const express = require('express');
const router = express.Router();
const controller = require('../controllers/stocksController');

router.get('/sucursales', controller.getSucursales);
router.get('/datos', controller.getStocks);

module.exports = router;
