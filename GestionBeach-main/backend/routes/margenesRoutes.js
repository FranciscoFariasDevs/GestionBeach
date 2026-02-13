const express = require('express');
const router = express.Router();
const controller = require('../controllers/margenesController');

router.get('/sucursales', controller.getSucursales);
router.get('/datos', controller.getMargenes);

module.exports = router;
