const { User, PaymentMethod } = require('../../models');
const { Op } = require('sequelize');

// GET /api/v1/users/me — profil sendiri
exports.getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      status: 'success',
      data: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        photo_path: req.user.photo_path,
        is_verified: req.user.is_verified
      }
    });
  } catch (err) { next(err); }
};

// PATCH /api/v1/users/me — update profil
exports.updateMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    const { username, photo_path } = req.body;

    if (username && username !== user.username) {
      const taken = await User.findOne({ where: { username, id: { [Op.ne]: user.id } } });
      if (taken) return res.status(400).json({ status: 'fail', message: 'Username sudah dipakai pengguna lain.' });
      user.username = username;
    }
    if (photo_path !== undefined) user.photo_path = photo_path;

    await user.save();
    res.status(200).json({
      status: 'success',
      data: { id: user.id, username: user.username, photo_path: user.photo_path }
    });
  } catch (err) { next(err); }
};

// GET /api/v1/users/search?username=john — cari user untuk keperluan debt
exports.searchUser = async (req, res, next) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ status: 'fail', message: 'Query username wajib diisi.' });

    const users = await User.findAll({
      where: { username: { [Op.iLike]: `%${username}%` }, id: { [Op.ne]: req.user.id } },
      attributes: ['id', 'username'],
      limit: 10
    });
    res.status(200).json({ status: 'success', data: users });
  } catch (err) { next(err); }
};

// GET /api/v1/users/me/payment-methods
exports.listPaymentMethods = async (req, res, next) => {
  try {
    const methods = await PaymentMethod.findAll({ where: { userId: req.user.id }, order: [['is_primary', 'DESC']] });
    res.status(200).json({ status: 'success', data: methods });
  } catch (err) { next(err); }
};

// POST /api/v1/users/me/payment-methods
exports.createPaymentMethod = async (req, res, next) => {
  try {
    const { type, label, account_number, is_primary } = req.body;
    if (!type || !label) return res.status(400).json({ status: 'fail', message: 'type dan label wajib diisi.' });

    // Jika set sebagai primary, reset yang lain
    if (is_primary) {
      await PaymentMethod.update({ is_primary: false }, { where: { userId: req.user.id } });
    }

    const method = await PaymentMethod.create({
      userId: req.user.id, type, label, account_number: account_number || null, is_primary: !!is_primary
    });
    res.status(201).json({ status: 'success', data: method });
  } catch (err) { next(err); }
};

// PATCH /api/v1/users/me/payment-methods/:id
exports.updatePaymentMethod = async (req, res, next) => {
  try {
    const method = await PaymentMethod.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!method) return res.status(404).json({ status: 'fail', message: 'Metode pembayaran tidak ditemukan.' });

    const { label, account_number, is_primary } = req.body;
    if (label) method.label = label;
    if (account_number !== undefined) method.account_number = account_number;

    if (is_primary) {
      await PaymentMethod.update({ is_primary: false }, { where: { userId: req.user.id } });
      method.is_primary = true;
    }

    await method.save();
    res.status(200).json({ status: 'success', data: method });
  } catch (err) { next(err); }
};

// DELETE /api/v1/users/me/payment-methods/:id
exports.deletePaymentMethod = async (req, res, next) => {
  try {
    const method = await PaymentMethod.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!method) return res.status(404).json({ status: 'fail', message: 'Metode pembayaran tidak ditemukan.' });
    await method.destroy();
    res.status(200).json({ status: 'success', message: 'Metode pembayaran berhasil dihapus.' });
  } catch (err) { next(err); }
};

// Update FCM Token untuk user yang sedang login
exports.updateFcmToken = async (req, res, next) => {
  try {
    const { fcm_token } = req.body;
    
    if (!fcm_token) {
      return res.status(400).json({ status: 'fail', message: 'FCM Token wajib diisi.' });
    }

    // req.user.id didapat dari middleware protect
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User tidak ditemukan.' });
    }

    user.fcm_token = fcm_token;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'FCM Token berhasil diperbarui.'
    });
  } catch (err) {
    next(err);
  }
};
