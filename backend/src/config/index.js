require('dotenv').config();

const fs = require('fs');
const path = require('path');

// Detect whether this host actually runs systemd (real server vs sandbox)
const hasSystemd =
  fs.existsSync('/run/systemd/system') || fs.existsSync('/bin/systemctl');

const env = process.env;

const config = {
  port: parseInt(env.PORT || '5000', 10),

  // Authentication
  jwtSecret: env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: env.JWT_EXPIRES_IN || '24h',
  adminUsername: (env.ADMIN_USERNAME || 'admin').toLowerCase(),
  adminPassword: env.ADMIN_PASSWORD || 'admin123',

  // File manager root (production: /var/www, sandbox fallback: ./data/www)
  filesBaseDir: path.resolve(
    env.FILES_BASE_DIR || path.join(__dirname, '..', '..', 'data', 'www')
  ),

  // Runtime storage (users, nginx templates)
  dataDir: path.join(__dirname, '..', '..', 'data'),

  // Service control: 'auto' resolves to systemctl only when systemd is present
  serviceMode:
    (env.SERVICE_MODE || 'auto') === 'auto'
      ? hasSystemd
        ? 'real'
        : 'mock'
      : env.SERVICE_MODE,

  // Strict allowlist — only these services can ever be touched via the API
  allowedServices: (env.ALLOWED_SERVICES ||
    'nginx,mysql,mariadb,postgresql,redis-server,docker,php8.3-fpm,apache2'
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  corsOrigin: env.CORS_ORIGIN || '*',
};

module.exports = config;
