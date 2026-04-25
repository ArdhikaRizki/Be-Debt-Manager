const express = require('express');
const router = express.Router();
const protect = require('../middleware/protect');
const ctrl = require('../controllers/debtController');

router.use(protect); // Semua route debt butuh JWT

router.get('/', ctrl.listDebts);
router.post('/', ctrl.createDebt);
router.get('/:id', ctrl.getDebt);
router.patch('/:id', ctrl.updateDebt);
router.delete('/:id', ctrl.deleteDebt);
router.patch('/:id/confirm', ctrl.confirmDebt);
router.post('/:id/settlement-request', ctrl.requestSettlement);

module.exports = router;
