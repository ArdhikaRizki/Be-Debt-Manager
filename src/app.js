const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const { ZodError } = require('zod');
const authRouter = require('./routes/authRoutes');
const debtRouter = require('./routes/debtRoutes');
const groupRouter = require('./routes/groupRoutes');
const groupTransactionRouter = require('./routes/groupTransactionRoutes');
const settlementRouter = require('./routes/settlementRoutes');
const userRouter = require('./routes/userRoutes');

require('dotenv').config();

const app = express();

// 1. GLOBAL MIDDLEWARES (Security & Utility)
app.use(helmet()); // Security headers
app.use(express.json({ limit: '10kb' })); // Body parser
app.use(hpp()); // Mencegah Parameter Pollution
app.use(cors()); // Izin akses untuk Flutter
app.use(morgan('dev')); // Logger terminal

// Rate Limiter — dipasang SEBELUM route agar efektif
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Terlalu banyak request, coba lagi nanti.'
});
app.use('/api', limiter);

// 2. ROUTES
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/debts', debtRouter);
app.use('/api/v1/groups', groupRouter);
app.use('/api/v1/group-transactions', groupTransactionRouter);
app.use('/api/v1/settlement-requests', settlementRouter);
app.use('/api/v1/users', userRouter);

// Health check
app.get('/', (req, res) => {
  res.status(200).json({ message: 'API is Running!' });
});

// 3. GLOBAL ERROR HANDLER (Senjata Rahasia Kamu)
app.use((err, req, res, next) => {
  console.error('ERROR :', err);

  // A. Error Validasi ZOD (Dari Input Flutter)
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'fail',
      message: 'Validasi gagal',
      errors: err.errors.map(e => ({ path: e.path[0], message: e.message }))
    });
  }

  // B. Error Database POSTGRES (Sequelize)
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({ status: 'fail', message: 'Data sudah ada (Duplicate Error)' });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({ status: 'fail', message: 'Relasi data tidak ditemukan' });
  }

  // C. Error Default (Server Error)
  res.status(err.statusCode || 500).json({
    status: err.status || 'error',
    message: err.message || 'Terjadi kesalahan pada server'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server jalan di port ${PORT}...`);
});