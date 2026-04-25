const { Debt, User, SettlementRequest } = require('../../models');
const { Op } = require('sequelize');

// ─── Helper: pastikan debt milik req.user ─────────────────────────────────────
const findOwnDebt = async (id, userId) => {
  const debt = await Debt.findOne({ where: { id, userId } });
  return debt;
};

// GET /api/v1/debts — list semua debt milik user (sebagai pemilik atau pihak lain)
exports.listDebts = async (req, res, next) => {
  try {
    const debts = await Debt.findAll({
      where: {
        [Op.or]: [{ userId: req.user.id }, { otherUserId: req.user.id }]
      },
      include: [
        { model: User, as: 'owner', attributes: ['id', 'username'] },
        { model: User, as: 'otherUser', attributes: ['id', 'username'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ status: 'success', data: debts });
  } catch (err) { next(err); }
};

// POST /api/v1/debts — buat debt baru
exports.createDebt = async (req, res, next) => {
  try {
    const { amount, description, due_date, otherUsername } = req.body;

    if (!amount) return res.status(400).json({ status: 'fail', message: 'amount wajib diisi.' });

    let otherUserId = null;
    if (otherUsername) {
      const otherUser = await User.findOne({ where: { username: otherUsername } });
      if (!otherUser) return res.status(404).json({ status: 'fail', message: `User @${otherUsername} tidak ditemukan.` });
      if (otherUser.id === req.user.id) return res.status(400).json({ status: 'fail', message: 'Tidak bisa membuat debt ke diri sendiri.' });
      otherUserId = otherUser.id;
    }

    const debt = await Debt.create({
      userId: req.user.id,
      otherUserId,
      amount,
      description: description || null,
      due_date: due_date || null,
      status: 'pending'
    });

    res.status(201).json({ status: 'success', data: debt });
  } catch (err) { next(err); }
};

// GET /api/v1/debts/:id
exports.getDebt = async (req, res, next) => {
  try {
    const debt = await Debt.findOne({
      where: {
        id: req.params.id,
        [Op.or]: [{ userId: req.user.id }, { otherUserId: req.user.id }]
      },
      include: [
        { model: User, as: 'owner', attributes: ['id', 'username'] },
        { model: User, as: 'otherUser', attributes: ['id', 'username'] }
      ]
    });
    if (!debt) return res.status(404).json({ status: 'fail', message: 'Debt tidak ditemukan.' });
    res.status(200).json({ status: 'success', data: debt });
  } catch (err) { next(err); }
};

// PATCH /api/v1/debts/:id — update (hanya status pending)
exports.updateDebt = async (req, res, next) => {
  try {
    const debt = await findOwnDebt(req.params.id, req.user.id);
    if (!debt) return res.status(404).json({ status: 'fail', message: 'Debt tidak ditemukan.' });
    if (debt.status !== 'pending') return res.status(400).json({ status: 'fail', message: 'Hanya debt berstatus pending yang bisa diubah.' });

    const { description, due_date } = req.body;
    if (description !== undefined) debt.description = description;
    if (due_date !== undefined) debt.due_date = due_date;
    await debt.save();

    res.status(200).json({ status: 'success', data: debt });
  } catch (err) { next(err); }
};

// DELETE /api/v1/debts/:id
exports.deleteDebt = async (req, res, next) => {
  try {
    const debt = await findOwnDebt(req.params.id, req.user.id);
    if (!debt) return res.status(404).json({ status: 'fail', message: 'Debt tidak ditemukan.' });
    if (debt.status !== 'pending') return res.status(400).json({ status: 'fail', message: 'Hanya debt berstatus pending yang bisa dihapus.' });

    await debt.destroy();
    res.status(200).json({ status: 'success', message: 'Debt berhasil dihapus.' });
  } catch (err) { next(err); }
};

// PATCH /api/v1/debts/:id/confirm
// Debt dikonfirmasi oleh pihak lawan (otherUserId == req.user.id)
// Setelah confirm: debt asli + counterpart langsung jadi "confirmed"
exports.confirmDebt = async (req, res, next) => {
  try {
    // Debt yang dikonfirmasi adalah milik orang lain, kita (otherUser) yang konfirmasi
    const debt = await Debt.findOne({ where: { id: req.params.id, otherUserId: req.user.id, status: 'pending' } });
    if (!debt) return res.status(404).json({ status: 'fail', message: 'Debt tidak ditemukan atau tidak bisa dikonfirmasi.' });

    // Buat counterpart debt untuk diri sendiri (req.user)
    const counterpart = await Debt.create({
      userId: req.user.id,
      otherUserId: debt.userId,
      counterpartId: debt.id,
      amount: debt.amount,
      description: debt.description,
      due_date: debt.due_date,
      status: 'confirmed'
    });

    // Update debt asli: confirmed + simpan ref ke counterpart
    debt.status = 'confirmed';
    debt.counterpartId = counterpart.id;
    await debt.save();

    res.status(200).json({
      status: 'success',
      message: 'Debt berhasil dikonfirmasi.',
      data: { debt, counterpart }
    });
  } catch (err) { next(err); }
};

// POST /api/v1/debts/:id/settlement-request
// Hanya bisa jika status == confirmed
exports.requestSettlement = async (req, res, next) => {
  try {
    const debt = await Debt.findOne({
      where: { id: req.params.id, userId: req.user.id, status: 'confirmed' }
    });
    if (!debt) return res.status(404).json({ status: 'fail', message: 'Debt tidak ditemukan atau belum confirmed.' });

    // Cek duplikat pending settlement request
    const existing = await SettlementRequest.findOne({
      where: { debtId: debt.id, status: 'pending' }
    });
    if (existing) return res.status(400).json({ status: 'fail', message: 'Sudah ada settlement request yang sedang pending.' });

    const settlement = await SettlementRequest.create({
      debtId: debt.id,
      fromUserId: req.user.id,
      toUserId: debt.otherUserId
    });

    // Update status debt ke settlement_requested
    debt.status = 'settlement_requested';
    await debt.save();

    res.status(201).json({ status: 'success', data: settlement });
  } catch (err) { next(err); }
};
