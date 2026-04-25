const { SettlementRequest, Debt, GroupTransaction, User } = require('../../models');
const { Op } = require('sequelize');
const sequelize = require('../../models').sequelize;

// GET /api/v1/settlement-requests — list semua milik user (as fromUser atau toUser)
exports.listSettlements = async (req, res, next) => {
  try {
    const settlements = await SettlementRequest.findAll({
      where: {
        [Op.or]: [{ fromUserId: req.user.id }, { toUserId: req.user.id }]
      },
      include: [
        { model: User, as: 'fromUser', attributes: ['id', 'username'] },
        { model: User, as: 'toUser', attributes: ['id', 'username'] },
        { model: Debt, as: 'debt', attributes: ['id', 'amount', 'description', 'status'] },
        { model: GroupTransaction, as: 'groupTransaction', attributes: ['id', 'amount', 'description'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ status: 'success', data: settlements });
  } catch (err) { next(err); }
};

// POST /api/v1/settlement-requests — buat request baru
exports.createSettlement = async (req, res, next) => {
  try {
    const { debtId, groupTransactionId } = req.body;

    // Validasi: tepat satu harus diisi
    const hasDebt = !!debtId;
    const hasGroupTx = !!groupTransactionId;
    if (hasDebt === hasGroupTx) {
      return res.status(400).json({
        status: 'fail',
        message: 'Isi salah satu: debtId (personal) ATAU groupTransactionId (grup). Tidak boleh keduanya atau keduanya kosong.'
      });
    }

    let toUserId;

    if (hasDebt) {
      const debt = await Debt.findOne({ where: { id: debtId, userId: req.user.id, status: 'confirmed' } });
      if (!debt) return res.status(404).json({ status: 'fail', message: 'Debt tidak ditemukan atau belum confirmed.' });
      toUserId = debt.otherUserId;

      const existing = await SettlementRequest.findOne({ where: { debtId, status: 'pending' } });
      if (existing) return res.status(400).json({ status: 'fail', message: 'Sudah ada settlement request pending untuk debt ini.' });

      // Update debt status
      debt.status = 'settlement_requested';
      await debt.save();
    }

    if (hasGroupTx) {
      const groupTx = await GroupTransaction.findOne({ where: { id: groupTransactionId, fromUserId: req.user.id } });
      if (!groupTx) return res.status(404).json({ status: 'fail', message: 'Group transaction tidak ditemukan atau bukan milikmu.' });
      toUserId = groupTx.toUserId;

      const existing = await SettlementRequest.findOne({ where: { groupTransactionId, status: 'pending' } });
      if (existing) return res.status(400).json({ status: 'fail', message: 'Sudah ada settlement request pending untuk transaksi ini.' });
    }

    const settlement = await SettlementRequest.create({
      debtId: debtId || null,
      groupTransactionId: groupTransactionId || null,
      fromUserId: req.user.id,
      toUserId,
      status: 'pending'
    });

    res.status(201).json({ status: 'success', data: settlement });
  } catch (err) { next(err); }
};

// PATCH /api/v1/settlement-requests/:id/approve
// Harus dilakukan oleh toUserId
exports.approveSettlement = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const settlement = await SettlementRequest.findOne({
      where: { id: req.params.id, toUserId: req.user.id, status: 'pending' }
    });
    if (!settlement) return res.status(404).json({ status: 'fail', message: 'Settlement request tidak ditemukan atau bukan untukmu.' });

    // ─── Personal Debt Flow ────────────────────────────────────────────────────
    if (settlement.debtId) {
      const debt = await Debt.findByPk(settlement.debtId, { transaction: t });
      if (!debt) { await t.rollback(); return res.status(404).json({ status: 'fail', message: 'Debt tidak ditemukan.' }); }

      // Update debt asli
      debt.is_paid = true;
      debt.status = 'settlement_requested'; // tetap di status ini, is_paid yang berubah
      await debt.save({ transaction: t });

      // Update counterpart (atomic)
      if (debt.counterpartId) {
        const counterpart = await Debt.findByPk(debt.counterpartId, { transaction: t });
        if (counterpart) {
          counterpart.is_paid = true;
          await counterpart.save({ transaction: t });
        }
      }
    }

    // ─── Group Transaction Flow ────────────────────────────────────────────────
    // (Group transaction sendiri tidak punya status, hanya settlement-nya yang selesai)

    // Update settlement status
    settlement.status = 'approved';
    await settlement.save({ transaction: t });

    await t.commit();
    res.status(200).json({ status: 'success', message: 'Settlement disetujui. Hutang telah lunas.', data: settlement });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// PATCH /api/v1/settlement-requests/:id/reject
exports.rejectSettlement = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const settlement = await SettlementRequest.findOne({
      where: { id: req.params.id, toUserId: req.user.id, status: 'pending' }
    });
    if (!settlement) return res.status(404).json({ status: 'fail', message: 'Settlement request tidak ditemukan atau bukan untukmu.' });

    // Kembalikan status debt ke confirmed
    if (settlement.debtId) {
      const debt = await Debt.findByPk(settlement.debtId, { transaction: t });
      if (debt) {
        debt.status = 'confirmed';
        await debt.save({ transaction: t });
      }
    }

    settlement.status = 'rejected';
    await settlement.save({ transaction: t });

    await t.commit();
    res.status(200).json({ status: 'success', message: 'Settlement ditolak.', data: settlement });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};
