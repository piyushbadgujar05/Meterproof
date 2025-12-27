const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();

/* ------------------ BASIC MIDDLEWARE ------------------ */

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Minimal request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

/* ------------------ CORS (FIXED) ------------------ */

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://meterproof.vercel.app'
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow server-to-server / curl / postman
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
  })
);

// IMPORTANT: explicitly handle preflight
app.options('/*', cors(corsOptions));


/* ------------------ HEALTH CHECK ------------------ */

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/* ------------------ ROUTES ------------------ */

app.use('/api/auth', require('./routes/auth'));
app.use('/api/tenant', require('./routes/tenant'));
app.use('/api/bill', require('./routes/bill'));

/* ------------------ DATABASE ------------------ */

if (!process.env.MONGO_URI) {
  console.error('❌ Missing MONGO_URI');
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000
  })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

/* ------------------ ERROR HANDLER ------------------ */

app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    msg: err.message || 'Server error'
  });
});

/* ------------------ SERVER ------------------ */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
