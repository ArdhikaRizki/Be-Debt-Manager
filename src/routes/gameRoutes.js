const express = require('express');
const router = express.Router();
const protect = require('../middleware/protect');
const gameController = require('../controllers/gameController');

// Semua route game memerlukan autentikasi JWT
router.use(protect);

// POST   /api/v1/games/result                  — simpan hasil game + buat debt otomatis
router.post('/result', gameController.postGameResult);

// GET    /api/v1/games/history                 — semua game yang melibatkan req.user
router.get('/history', gameController.getGameHistory);

// GET    /api/v1/games/history/group/:groupId  — game sessions dalam 1 grup
router.get('/history/group/:groupId', gameController.getGroupGameHistory);

// GET    /api/v1/games/:id                     — detail 1 game session
router.get('/:id', gameController.getGameById);

module.exports = router;
