const express = require('express');
const router = express.Router();
const protect = require('../middleware/protect');
const ctrl = require('../controllers/userController');

router.use(protect);

router.get('/me', ctrl.getMe);
router.patch('/me', ctrl.updateMe);
router.get('/search', ctrl.searchUser);
router.get('/me/payment-methods', ctrl.listPaymentMethods);
router.post('/me/payment-methods', ctrl.createPaymentMethod);
router.patch('/me/payment-methods/:id', ctrl.updatePaymentMethod);
router.delete('/me/payment-methods/:id', ctrl.deletePaymentMethod);

module.exports = router;
