const jwt = require('jsonwebtoken');
const { User } = require('../../models');

/**
 * Middleware JWT — wajib dipasang di semua route yang butuh autentikasi.
 * Membaca header: Authorization: Bearer <token>
 * Jika valid, inject req.user = data user dari DB (tanpa password).
 */
const protect = async (req, res, next) => {
  try {
    // 1. Ambil token dari header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'fail', message: 'Akses ditolak. Token tidak ditemukan.' });
    }

    const token = authHeader.split(' ')[1];

    // 2. Verifikasi token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Cari user berdasarkan ID dari token
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password', 'biometric_key'] }
    });

    if (!user) {
      return res.status(401).json({ status: 'fail', message: 'User tidak ditemukan. Token tidak valid.' });
    }

    // 4. Inject ke request
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ status: 'fail', message: 'Token tidak valid.' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ status: 'fail', message: 'Token sudah kedaluwarsa. Silakan login ulang.' });
    }
    next(err);
  }
};

module.exports = protect;
