const express = require('express');
const router = express.Router();
const protect = require('../middleware/protect');
const ctrl = require('../controllers/groupController');

router.use(protect);

router.get('/', ctrl.listGroups);
router.post('/', ctrl.createGroup);
router.get('/:id', ctrl.getGroup);
router.patch('/:id', ctrl.updateGroup);
router.delete('/:id', ctrl.deleteGroup);
router.post('/:id/members', ctrl.addMember);
router.delete('/:id/members/:userId', ctrl.removeMember);

module.exports = router;
