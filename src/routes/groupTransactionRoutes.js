const express = require('express');
const router = express.Router();
const protect = require('../middleware/protect');
const ctrl = require('../controllers/groupTransactionController');

router.use(protect);

router.get('/group/:groupId', ctrl.listTransactions);
router.post('/group/:groupId', ctrl.createTransaction);
router.get('/:id', ctrl.getTransaction);
router.delete('/:id', ctrl.deleteTransaction);

module.exports = router;
