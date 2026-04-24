const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Fungsi enkripsi password
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

// Fungsi cek password (saat login)
const comparePassword = async (password, hashed) => {
  return await bcrypt.compare(password, hashed);
};

// Fungsi generate token JWT (Session)
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

module.exports = { hashPassword, comparePassword, generateToken };