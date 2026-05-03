const { Debt, User, SettlementRequest } = require('../../models');
const { Op } = require('sequelize');
const { sendNotification } = require('../utils/fcm');
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
    const { amount, description, due_date, otherUsername, otherEmail } = req.body;

    if (!amount) return res.status(400).json({ status: 'fail', message: 'amount wajib diisi.' });

    // 👇 DEKLARASIKAN DI SINI AGAR BISA DIAKSES SAMPAI BAWAH 👇
    let otherUserId = null;
    let otherUser = null; 
    
    if (otherUsername || otherEmail) {
      // Cari user berdasarkan email atau username
      if (otherEmail) {
        otherUser = await User.findOne({ where: { email: otherEmail } });
        if (!otherUser) return res.status(404).json({ status: 'fail', message: `User dengan email ${otherEmail} tidak ditemukan.` });
      } else if (otherUsername) {
        otherUser = await User.findOne({ where: { username: otherUsername } });
        if (!otherUser) return res.status(404).json({ status: 'fail', message: `User @${otherUsername} tidak ditemukan.` });
      }
      
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

    // Sekarang variabel otherUser dikenali di sini!
    if (otherUser && otherUser.fcm_token) {
      await sendNotification(
        otherUser.fcm_token,
        'Tagihan Baru! 💸',
        `Kamu mendapat tagihan hutang sebesar Rp${amount}. Buka aplikasi untuk mengeceknya.`
      );
    }

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
// PATCH /api/v1/debts/:id/confirm
// // Debt dikonfirmasi oleh pihak lawan (otherUserId == req.user.id)
// exports.confirmDebt = async (req, res, next) => {
//   try {
//     // Debt yang dikonfirmasi adalah milik orang lain, kita (otherUser) yang konfirmasi
//     const debt = await Debt.findOne({ where: { id: req.params.id, otherUserId: req.user.id, status: 'pending' } });
//     if (!debt) return res.status(404).json({ status: 'fail', message: 'Debt tidak ditemukan atau tidak bisa dikonfirmasi.' });

//     // Update debt asli langsung menjadi confirmed
//     debt.status = 'confirmed';
//     await debt.save();

//     res.status(200).json({
//       status: 'success',
//       message: 'Debt berhasil dikonfirmasi.',
//       data: debt
//     });
//   } catch (err) { next(err); }
// };

// // POST /api/v1/debts/:id/settlement-request
// // Hanya bisa jika status == confirmed
// exports.requestSettlement = async (req, res, next) => {
//   try {
//     const debt = await Debt.findOne({
//       where: { id: req.params.id, userId: req.user.id, status: 'confirmed' }
//     });
//     if (!debt) return res.status(404).json({ status: 'fail', message: 'Debt tidak ditemukan atau belum confirmed.' });

//     // Cek duplikat pending settlement request
//     const existing = await SettlementRequest.findOne({
//       where: { debtId: debt.id, status: 'pending' }
//     });
//     if (existing) return res.status(400).json({ status: 'fail', message: 'Sudah ada settlement request yang sedang pending.' });

//     const settlement = await SettlementRequest.create({
//       debtId: debt.id,
//       fromUserId: req.user.id,
//       toUserId: debt.otherUserId
//     });

//     // Update status debt ke settlement_requested
//     debt.status = 'settlement_requested';
//     await debt.save();

//     res.status(201).json({ status: 'success', data: settlement });
//   } catch (err) { next(err); }
// };

// 1. B Konfirmasi Hutang (ACC)
// exports.confirmDebt = async (req, res, next) => {
//   try {
//     // Yang konfirmasi haruslah B (otherUserId)
//     const debt = await Debt.findOne({ where: { id: req.params.id, otherUserId: req.user.id, status: 'pending' } });
//     if (!debt) return res.status(404).json({ status: 'fail', message: 'Data tidak valid' });

//     debt.status = 'confirmed';
//     await debt.save();
//     res.status(200).json({ status: 'success', data: debt });
//   } catch (err) { next(err); }
// };
exports.confirmDebt = async (req, res, next) => {
  try {
    // UBAH FIND ONE JADI SEPERTI INI:
    const debt = await Debt.findOne({ 
      where: { id: req.params.id, otherUserId: req.user.id, status: 'pending' },
      include: [{ model: User, as: 'owner' }] // Tarik data si A
    });
    if (!debt) return res.status(404).json({ status: 'fail', message: 'Data tidak valid' });

    debt.status = 'confirmed';
    await debt.save();

    // --- TAMBAHKAN KODE INI ---
    if (debt.owner && debt.owner.fcm_token) {
      await sendNotification(
        debt.owner.fcm_token,
        'Hutang Disetujui !',
        `Peminjam telah menyetujui tagihan hutang sebesar Rp${debt.amount}.`
      );
    }
    // -------------------------

    res.status(200).json({ status: 'success', data: debt });
  } catch (err) { next(err); }
};
// 2. B Tolak Hutang (TOLAK)
exports.rejectDebt = async (req, res, next) => {
  try {
    const debt = await Debt.findOne({ 
      where: { id: req.params.id, otherUserId: req.user.id, status: 'pending' },
      include: [{ model: User, as: 'owner' }] // <-- Tambahkan ini agar debt.owner terbaca
    });
    if (!debt) return res.status(404).json({ status: 'fail', message: 'Data tidak valid' });

    debt.status = 'rejected';
    await debt.save();

    if (debt.owner && debt.owner.fcm_token) {
      await sendNotification(
        debt.owner.fcm_token,
        'Tagihan Ditolak ',
        `Peminjam menolak tagihan hutang sebesar Rp${debt.amount} yang kamu buat.`
      );
    }
    res.status(200).json({ status: 'success', data: debt });
  } catch (err) { next(err); }
};

// POST /api/v1/debts/:id/settlement-request
exports.requestSettlement = async (req, res, next) => {
  try {
    const debt = await Debt.findOne({
      where: { id: req.params.id, otherUserId: req.user.id, status: 'confirmed' },
      include: [{ model: User, as: 'owner' }] // <-- Tambahkan ini agar debt.owner terbaca
    });
    
    if (!debt) return res.status(404).json({ status: 'fail', message: 'Debt tidak ditemukan atau belum confirmed.' });

    // Update status debt ke settlement_requested
    debt.status = 'settlement_requested';
    await debt.save();

    if (debt.owner && debt.owner.fcm_token) {
      await sendNotification(
        debt.owner.fcm_token,
        'Pengajuan Pelunasan ',
        `Peminjam telah mengajukan pelunasan. Segera cek apakah uang Rp${debt.amount} sudah masuk.`
      );
    }

    res.status(200).json({ status: 'success', data: debt });
  } catch (err) { next(err); }
};

// 4. A Konfirmasi Pelunasan (Uang diterima, LUNAS)
exports.confirmSettlement = async (req, res, next) => {
  try {
    const debt = await Debt.findOne({ 
      where: { id: req.params.id, userId: req.user.id, status: 'settlement_requested' },
      include: [{ model: User, as: 'otherUser' }] // <-- Tambahkan ini agar debt.otherUser terbaca
    });
    if (!debt) return res.status(404).json({ status: 'fail', message: 'Data tidak valid' });

    debt.status = 'settled';
    await debt.save();

    if (debt.otherUser && debt.otherUser.fcm_token) {
      await sendNotification(
        debt.otherUser.fcm_token,
        'Hutang Lunas! ',
        `Pemilik telah mengonfirmasi pembayaranmu. Hutang Rp${debt.amount} sudah LUNAS.`
      );
    }
    res.status(200).json({ status: 'success', data: debt });
  } catch (err) { next(err); }
};

// 5. A Tolak Pelunasan (Uang belum masuk)
exports.rejectSettlement = async (req, res, next) => {
  try {
    const debt = await Debt.findOne({ 
      where: { id: req.params.id, userId: req.user.id, status: 'settlement_requested' },
      include: [{ model: User, as: 'otherUser' }] // <-- MASUKKAN DI SINI (sebelumnya malah di luar)
    });

    if (!debt) return res.status(404).json({ status: 'fail', message: 'Data tidak valid' });

    // Balikin status ke confirmed karena pelunasan batal/ditolak
    debt.status = 'confirmed';
    await debt.save();

    if (debt.otherUser && debt.otherUser.fcm_token) {
      await sendNotification(
        debt.otherUser.fcm_token,
        'Pelunasan Ditolak ',
        `Pemilik menolak pelunasanmu karena dana Rp${debt.amount} belum diterima. Cek kembali transaksimu.`
      );
    }
    res.status(200).json({ status: 'success', data: debt });
  } catch (err) { next(err); }
};