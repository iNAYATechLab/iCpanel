const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const seed = require('./utils/seed');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const systemRoutes = require('./routes/system');
const serviceRoutes = require('./routes/services');
const fileRoutes = require('./routes/files');
const nginxRoutes = require('./routes/nginx');

const app = express();

// --- Core security & parsing middleware ---
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '2mb' }));

// --- Global rate limiting (light, protects the whole API surface) ---
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please slow down' },
  })
);

// --- Public health check (used by monitors, no auth required) ---
app.get('/api/health', (req, res) => res.json({ status: 'ok', name: 'iCpanel API' }));

// --- API routes ---
app.use('/api/auth', authRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/nginx', nginxRoutes);

// --- 404 + error handling ---
app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));
app.use(errorHandler);

// Create data dirs, default admin user and sample files on first start
seed();

app.listen(config.port, '0.0.0.0', () => {
  console.log(`iCpanel backend listening on http://0.0.0.0:${config.port}`);
  console.log(`Service mode : ${config.serviceMode}`);
  console.log(`Files base   : ${config.filesBaseDir}`);
  if (config.jwtSecret.startsWith('dev')) {
    console.warn('[warn] A development JWT secret is in use. Set JWT_SECRET in production!');
  }
});

module.exports = app;
