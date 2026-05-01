const db = require('../../models');
const { GameSession, Debt, User, DebtGroup, GroupMember } = db;
const { Op, literal } = require('sequelize');
const { sequelize } = db;

// Kolom include standar untuk respons GameSession
const gameSessionIncludes = [
  { model: User, as: 'loser', attributes: ['id', 'username'] },
  { model: User, as: 'winner', attributes: ['id', 'username'] },
  { model: DebtGroup, as: 'group', attributes: ['id', 'name'] },
  { model: Debt, as: 'debt', attributes: ['id', 'amount', 'status', 'description'] }
];

// ─── POST /api/v1/games/result ────────────────────────────────────────────────
// Simpan hasil game + otomatis buat 1 debt pending untuk si loser
exports.postGameResult = async (req, res, next) => {
  try {
    const {
      game_type,
      group_id,
      participants,
      loser_id,
      winner_id,
      amount,
      description
    } = req.body;

    // ── 1. Validasi field wajib ──
    if (!game_type) {
      return res.status(400).json({ status: 'fail', message: 'game_type wajib diisi.' });
    }
    if (!participants || !Array.isArray(participants) || participants.length < 2) {
      return res.status(400).json({ status: 'fail', message: 'participants harus berupa array minimal 2 user.' });
    }
    if (loser_id === undefined || loser_id === null) {
      return res.status(400).json({ status: 'fail', message: 'loser_id wajib diisi.' });
    }
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ status: 'fail', message: 'amount harus lebih dari 0.' });
    }
    if (!description) {
      return res.status(400).json({ status: 'fail', message: 'description wajib diisi.' });
    }

    // ── 2. Validasi loser_id harus ada di dalam participants ──
    const participantIds = participants.map(Number);
    if (!participantIds.includes(Number(loser_id))) {
      return res.status(400).json({ status: 'fail', message: 'loser_id harus ada di dalam array participants.' });
    }

    // ── 3. Jika groupId dikirim: validasi semua peserta adalah member grup ──
    if (group_id) {
      const group = await DebtGroup.findByPk(group_id);
      if (!group) {
        return res.status(404).json({ status: 'fail', message: 'Grup tidak ditemukan.' });
      }

      const groupMembers = await GroupMember.findAll({
        where: { groupId: group_id },
        attributes: ['userId']
      });
      const memberIds = groupMembers.map(m => m.userId);

      const nonMember = participantIds.find(pid => !memberIds.includes(pid));
      if (nonMember) {
        return res.status(400).json({
          status: 'fail',
          message: `User ID ${nonMember} bukan member grup ini.`
        });
      }
    }

    // ── 4. Validasi semua participant ID benar-benar ada di tabel Users ──
    const existingUsers = await User.findAll({
      where: { id: { [Op.in]: participantIds } },
      attributes: ['id']
    });
    if (existingUsers.length !== participantIds.length) {
      return res.status(400).json({ status: 'fail', message: 'Satu atau lebih participant ID tidak valid.' });
    }

    // ── 5. Simpan GameSession dulu (debtId = null sementara) ──
    const gameSession = await GameSession.create({
      groupId: group_id || null,
      gameType: game_type,
      participants: participantIds,
      loserId: Number(loser_id),
      winnerId: winner_id ? Number(winner_id) : null,
      amount: Number(amount),
      description,
      debtId: null
    });

    // ── 6. Buat 1 debt pending untuk si loser ──
    // userId = loser, otherUserId = winner (jika ada) atau creator game
    const debt = await Debt.create({
      userId: Number(loser_id),
      otherUserId: winner_id ? Number(winner_id) : req.user.id,
      amount: Number(amount),
      description,
      status: 'pending'
    });

    // ── 7. Update GameSession dengan debtId yang baru dibuat ──
    await gameSession.update({ debtId: debt.id });

    // ── 8. Ambil ulang dengan include untuk respons lengkap ──
    const result = await GameSession.findByPk(gameSession.id, { include: gameSessionIncludes });

    return res.status(201).json({
      status: 'success',
      message: 'Hasil game berhasil disimpan dan debt otomatis dibuat.',
      data: result
    });
  } catch (err) { next(err); }
};

// ─── GET /api/v1/games/history ────────────────────────────────────────────────
// Semua game session yang melibatkan req.user (ada di participants)
exports.getGameHistory = async (req, res, next) => {
  try {
    // participants kolom adalah json (bukan jsonb), sehingga Op.contains (@>) tidak bisa dipakai.
    // Solusi: cast eksplisit ke jsonb via literal agar operator @> berfungsi.
    const sessions = await GameSession.findAll({
      where: sequelize.literal(`"participants"::jsonb @> '[${Number(req.user.id)}]'`),
      include: gameSessionIncludes,
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({ status: 'success', results: sessions.length, data: sessions });
  } catch (err) { next(err); }
};

// ─── GET /api/v1/games/history/group/:groupId ────────────────────────────────
// Game sessions dalam 1 grup tertentu (req.user harus member grup)
exports.getGroupGameHistory = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    // Pastikan grup ada
    const group = await DebtGroup.findByPk(groupId);
    if (!group) {
      return res.status(404).json({ status: 'fail', message: 'Grup tidak ditemukan.' });
    }

    // Otorisasi: req.user harus member grup
    const membership = await GroupMember.findOne({
      where: { groupId, userId: req.user.id }
    });
    if (!membership) {
      return res.status(403).json({ status: 'fail', message: 'Kamu bukan member grup ini.' });
    }

    const sessions = await GameSession.findAll({
      where: { groupId },
      include: gameSessionIncludes,
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({ status: 'success', results: sessions.length, data: sessions });
  } catch (err) { next(err); }
};

// ─── GET /api/v1/games/:id ────────────────────────────────────────────────────
// Detail 1 game session — req.user harus ada di participants
exports.getGameById = async (req, res, next) => {
  try {
    const session = await GameSession.findByPk(req.params.id, { include: gameSessionIncludes });

    if (!session) {
      return res.status(404).json({ status: 'fail', message: 'Game session tidak ditemukan.' });
    }

    // Otorisasi: hanya peserta yang boleh melihat detail
    if (!session.participants.map(Number).includes(req.user.id)) {
      return res.status(403).json({ status: 'fail', message: 'Kamu bukan peserta game ini.' });
    }

    return res.status(200).json({ status: 'success', data: session });
  } catch (err) { next(err); }
};
