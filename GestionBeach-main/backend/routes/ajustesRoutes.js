const express = require('express');
const router = express.Router();
const controller = require('../controllers/ajustesController');
const authMiddleware = require('../middleware/authMiddleware');
router.use(authMiddleware);
router.get('/sucursales', controller.getSucursales);
router.get('/datos', controller.getAjustes);
module.exports = router;
