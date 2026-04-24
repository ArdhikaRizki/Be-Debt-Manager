const { User } = require('../../models');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');
const sendEmail = require('../utils/sendEmail');

exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // 1. Enkripsi password
    const hashedPassword = await hashPassword(password);

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    // 2. Simpan ke Postgres
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      otp_code: otp,
      otp_expires_at: otpExpires
    });

    try {
      await sendEmail({
        email: newUser.email,
        subject: 'Your Verification code OTP',
        message: `Hello ${newUser.username}, Your OTP code ${otp}. This code only available for 10 minutes. Dont give this code to anyone`
      });
    } catch (err) {
      console.error('OTP email error:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Gagal mengirim OTP ke email',
        ...(process.env.NODE_ENV === 'development' && { detail: err.message })
      });
    }

    // 3. Kirim respon (Jangan kirim password balik ke client)
    res.status(201).json({
      status: 'success',
      message: 'User berhasil didaftarkan!',
      data: { id: newUser.id, username: newUser.username }
    });
  } catch (err) {
    next(err); // Akan ditangkap Global Error Handler yang kita buat kemarin
  }
};

exports.verifyEmail = async (req, res, next) => {
    try {
    const { email, otp } = req.body;

    // 1. Cari user berdasarkan email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User tidak ditemukan' });
    }

    // 2. Cek apakah user sudah terverifikasi sebelumnya
    if (user.is_verified) {
      return res.status(400).json({ status: 'fail', message: 'Email sudah terverifikasi' });
    }

    // 3. Cek kesesuaian OTP dan waktu kedaluwarsa
    if (user.otp_code !== otp || user.otp_expires_at < new Date()) {
      return res.status(400).json({ status: 'fail', message: 'Kode OTP salah atau sudah kedaluwarsa' });
    }

    // 4. Update data user: Set terverifikasi dan hapus OTP
    user.is_verified = true;
    user.otp_code = null;
    user.otp_expires_at = null;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Email berhasil diverifikasi! Anda sekarang bisa login.',
    });
  } catch (error) {
    next(error);
  }
}

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Cari user berdasarkan email
    const user = await User.findOne({ where: { email } });
    if (!user || !(await comparePassword(password, user.password))) {
      return res.status(401).json({ status: 'fail', message: 'Email atau password salah' });
    }

    // 2. Buat Token (Session)
    const token = generateToken(user.id);

    res.status(200).json({
      status: 'success',
      token,
      data: { id: user.id, username: user.username,}
    });
  } catch (err) {
    next(err);
  }
};