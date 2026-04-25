const express = require('express');
const router = express.Router();
const protect = require('../middleware/protect');
const ctrl = require('../controllers/settlementController');

router.use(protect);

router.get('/', ctrl.listSettlements);
router.post('/', ctrl.createSettlement);
router.patch('/:id/approve', ctrl.approveSettlement);
router.patch('/:id/reject', ctrl.rejectSettlement);

module.exports = router;
