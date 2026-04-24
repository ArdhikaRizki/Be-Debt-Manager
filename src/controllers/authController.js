const { User, EmailVerification } = require('../../models');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');
const sendEmail = require('../utils/sendEmail');


exports.requestOtp = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ status: 'fail', message: 'Email wajib diisi.' });
    }

    // 1. Pastikan email belum terdaftar di tabel utama
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ status: 'fail', message: 'Email sudah terdaftar. Silakan login.' });
    }

    // 2. Generate OTP & Expired (10 Menit)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // 3. Simpan/Update ke Tabel Sementara (Upsert)
    let verification = await EmailVerification.findOne({ where: { email } });
    if (verification) {
      verification.otp_code = otpCode;
      verification.expires_at = expiresAt;
      verification.is_verified = false;
      await verification.save();
    } else {
      await EmailVerification.create({ email, otp_code: otpCode, expires_at: expiresAt, is_verified: false });
    }

    // 4. Kirim Email
    await sendEmail({
      email,
      subject: 'Kode OTP Kamu',
      message: `Kode OTP kamu adalah: ${otpCode}. Berlaku 10 menit.`
    });

    res.status(200).json({ status: 'success', message: 'OTP berhasil dikirim ke email.' });
  } catch (err) {
    next(err);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const otp = String(req.body.otp ?? req.body.otp_code ?? '').trim();

    if (!email || !otp) {
      return res.status(400).json({ status: 'fail', message: 'Email dan OTP wajib diisi.' });
    }

    const verification = await EmailVerification.findOne({ where: { email } });
    const storedOtp = String(verification?.otp_code ?? '').trim();

    if (!verification) return res.status(404).json({ status: 'fail', message: 'Minta OTP terlebih dahulu.' });
    if (storedOtp !== otp) return res.status(400).json({ status: 'fail', message: 'OTP salah.' });
    if (verification.expires_at < new Date()) return res.status(400).json({ status: 'fail', message: 'OTP kedaluwarsa.' });

    // Tandai email ini SUDAH VALID
    verification.is_verified = true;
    verification.otp_code = null; // Hapus jejak OTP biar aman
    await verification.save();

    res.status(200).json({ status: 'success', message: 'Email valid! Silakan lanjut isi form pendaftaran.' });
  } catch (err) {
    next(err);
  }
};



exports.register = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ status: 'fail', message: 'Email wajib diisi.' });
    }
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ 
        status: 'fail', 
        message: 'Email sudah terdaftar. Silakan gunakan email lain atau langsung Login.' 
      });
    }

    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(400).json({ 
        status: 'fail', 
        message: 'Username sudah dipakai oleh pengguna lain.' 
      });
    }

    const verification = await EmailVerification.findOne({ where: { email, is_verified: true } });
    if (!verification) {
      return res.status(403).json({ status: 'fail', message: 'Email belum diverifikasi. Jangan curang!' });
    }

    // 1. Enkripsi password
    const hashedPassword = await hashPassword(password);

    // 2. Simpan ke Postgres
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      is_verified: true
    });

    await EmailVerification.destroy({ where: { email } });

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


exports.login = async (req, res, next) => {
  try {
    const { password } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({ status: 'fail', message: 'Email dan password wajib diisi.' });
    }

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