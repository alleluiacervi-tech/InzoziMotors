require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || '*').split(',').map((s) => s.trim());
app.use(cors({
  origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
  credentials: true,
}));

// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    methods: ['GET', 'POST'],
  },
});
require('./src/socket')(io);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded car photos publicly; KYC identity docs are NEVER served here —
// they go through the admin-gated GET /id-verification/doc/:filename route.
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
app.use('/uploads/id-docs', (req, res) => res.status(403).json({ error: 'Forbidden' }));
app.use('/uploads', express.static(uploadDir));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/auth',            require('./src/routes/auth'));
app.use('/cars',            require('./src/routes/cars'));
app.use('/submissions',     require('./src/routes/submissions'));
app.use('/handovers',       require('./src/routes/handovers'));
app.use('/messages',        require('./src/routes/messages'));
app.use('/notifications',   require('./src/routes/notifications'));
app.use('/inspections',     require('./src/routes/inspections'));
app.use('/id-verification', require('./src/routes/id-verification'));
app.use('/saved-searches',  require('./src/routes/saved-searches'));
app.use('/reviews',         require('./src/routes/reviews'));
app.use('/rentals',         require('./src/routes/rentals'));
app.use('/referrals',       require('./src/routes/referrals'));
app.use('/disputes',        require('./src/routes/disputes'));
app.use('/devices',         require('./src/routes/devices'));
app.use('/admin',           require('./src/routes/admin'));

// Health check — PM2 / load balancer uses this
app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV, ts: new Date().toISOString() });
});

// ─── 404 & error handler ──────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  // Multer and file-filter errors are client mistakes, not server faults
  if (err && (err.name === 'MulterError' || /image files/i.test(err.message || ''))) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000');
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Inzozi Motors API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
