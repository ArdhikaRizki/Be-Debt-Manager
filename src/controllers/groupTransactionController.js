const { GroupTransaction, GroupMember, DebtGroup, User, SettlementRequest } = require('../../models');

// ─── Helper ───────────────────────────────────────────────────────────────────
const isMember = async (groupId, userId) => {
  return await GroupMember.findOne({ where: { groupId, userId } });
};

// GET /api/v1/group-transactions/group/:groupId — list transaksi grup
exports.listTransactions = async (req, res, next) => {
  try {
    const membership = await isMember(req.params.groupId, req.user.id);
    if (!membership) return res.status(403).json({ status: 'fail', message: 'Kamu bukan anggota grup ini.' });

    const transactions = await GroupTransaction.findAll({
      where: { groupId: req.params.groupId },
      include: [
        { model: User, as: 'fromUser', attributes: ['id', 'username'] },
        { model: User, as: 'toUser', attributes: ['id', 'username'] },
        { model: SettlementRequest, as: 'settlementRequests', attributes: ['id', 'status'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ status: 'success', data: transactions });
  } catch (err) { next(err); }
};

// POST /api/v1/group-transactions/group/:groupId — buat transaksi
exports.createTransaction = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    // fromUsername opsional, jika kosong berarti user yang sedang login
    const { fromUsername, toUsername, amount, description } = req.body;

    const membership = await isMember(groupId, req.user.id);
    if (!membership) return res.status(403).json({ status: 'fail', message: 'Kamu bukan anggota grup ini.' });

    if (!toUsername || !amount) return res.status(400).json({ status: 'fail', message: 'toUsername dan amount wajib diisi.' });

    // Cari toUser
    const toUser = await User.findOne({ where: { username: toUsername } });
    if (!toUser) return res.status(404).json({ status: 'fail', message: `User @${toUsername} tidak ditemukan.` });

    // Cari fromUser (bisa diri sendiri atau orang lain di grup)
    let fromUserId = req.user.id;
    if (fromUsername) {
      const fromUser = await User.findOne({ where: { username: fromUsername } });
      if (!fromUser) return res.status(404).json({ status: 'fail', message: `User @${fromUsername} tidak ditemukan.` });
      fromUserId = fromUser.id;
    }

    if (toUser.id === fromUserId) return res.status(400).json({ status: 'fail', message: 'Tidak bisa transaksi ke diri sendiri.' });

    const toMembership = await isMember(groupId, toUser.id);
    if (!toMembership) return res.status(400).json({ status: 'fail', message: `@${toUsername} bukan anggota grup ini.` });
    
    const fromMembership = await isMember(groupId, fromUserId);
    if (!fromMembership) return res.status(400).json({ status: 'fail', message: `Pihak berhutang bukan anggota grup ini.` });

    const transaction = await GroupTransaction.create({
      groupId: parseInt(groupId),
      fromUserId: fromUserId,
      toUserId: toUser.id,
      amount,
      description: description || null
    });

    res.status(201).json({ status: 'success', data: transaction });
  } catch (err) { next(err); }
};

// GET /api/v1/group-transactions/:id — detail transaksi
exports.getTransaction = async (req, res, next) => {
  try {
    const transaction = await GroupTransaction.findByPk(req.params.id, {
      include: [
        { model: User, as: 'fromUser', attributes: ['id', 'username'] },
        { model: User, as: 'toUser', attributes: ['id', 'username'] },
        { model: DebtGroup, as: 'group', attributes: ['id', 'name'] }
      ]
    });
    if (!transaction) return res.status(404).json({ status: 'fail', message: 'Transaksi tidak ditemukan.' });

    // Pastikan req.user adalah member dari grup transaksi ini
    const membership = await isMember(transaction.groupId, req.user.id);
    if (!membership) return res.status(403).json({ status: 'fail', message: 'Akses ditolak.' });

    res.status(200).json({ status: 'success', data: transaction });
  } catch (err) { next(err); }
};

// DELETE /api/v1/group-transactions/:id — hapus (hanya pembuat)
exports.deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await GroupTransaction.findOne({ where: { id: req.params.id, fromUserId: req.user.id } });
    if (!transaction) return res.status(404).json({ status: 'fail', message: 'Transaksi tidak ditemukan atau bukan milikmu.' });

    await transaction.destroy();
    res.status(200).json({ status: 'success', message: 'Transaksi berhasil dihapus.' });
  } catch (err) { next(err); }
};
