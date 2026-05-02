const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const pushController = require('../controllers/pushController');

router.get('/vapid-public-key', pushController.getPublicKey);
router.post('/subscribe', authMiddleware, pushController.subscribe);
router.delete('/unsubscribe', authMiddleware, pushController.unsubscribe);
router.post('/expo-subscribe', authMiddleware, pushController.expoSubscribe);
router.delete('/expo-unsubscribe', authMiddleware, pushController.expoUnsubscribe);

module.exports = router;
