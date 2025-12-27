const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

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

/* ------------------ CORS (FIXED - EXACT BLOCK) ------------------ */

// Determine allowed origin based on environment
const isProduction = process.env.NODE_ENV === 'production';

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // In production: only allow Vercel frontend
  // In development: allow localhost origins
  const allowedOrigins = isProduction 
    ? ['https://meterproof.vercel.app']
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  } else if (!isProduction) {
    // Allow all in dev if no origin (like curl/postman)
    res.header("Access-Control-Allow-Origin", "*");
  } else {
    // Production: set to vercel app regardless
    res.header("Access-Control-Allow-Origin", "https://meterproof.vercel.app");
  }
  
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-auth-token"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

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
