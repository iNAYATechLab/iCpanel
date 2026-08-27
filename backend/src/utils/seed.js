const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const config = require('../config');
const store = require('./store');

const DEFAULT_TEMPLATE = `# iCpanel virtual host template
# Placeholders: {{domain}}, {{root}}, {{port}}
server {
    listen {{port}};
    server_name {{domain}};

    root {{root}};
    index index.html index.htm index.php;

    access_log /var/log/nginx/{{domain}}.access.log;
    error_log  /var/log/nginx/{{domain}}.error.log;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~ \\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
    }
}
`;

const SAMPLE_INDEX = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Welcome to iCpanel</title>
    <link rel="stylesheet" href="css/site.css" />
  </head>
  <body>
    <main class="hero">
      <h1>It works!</h1>
      <p>This sample site was seeded by iCpanel. Manage it from the File Manager.</p>
    </main>
  </body>
</html>
`;

const SAMPLE_CSS = `/* Sample stylesheet seeded by iCpanel */
body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  background: #09090b;
  color: #e4e4e7;
  display: grid;
  place-items: center;
  min-height: 100vh;
}
.hero h1 { font-size: 3rem; margin: 0 0 .5rem; }
.hero p  { color: #a1a1aa; }
`;

/**
 * Creates runtime data directories, a default admin user, a default
 * Nginx template and sample web files — only when they do not exist yet.
 */
function seed() {
  try {
    fs.mkdirSync(config.dataDir, { recursive: true });
    fs.mkdirSync(config.filesBaseDir, { recursive: true });

    // Default admin account
    const users = store.readUsers();
    if (!users[config.adminUsername]) {
      users[config.adminUsername] = {
        passwordHash: bcrypt.hashSync(config.adminPassword, 10),
        role: 'admin',
        createdAt: new Date().toISOString(),
      };
      store.updateUsers(users);
      console.log(
        `[seed] Created default admin user "${config.adminUsername}" — change the password after first login.`
      );
    }

    // Default Nginx template
    if (store.readTemplates().length === 0) {
      store.updateTemplates([
        {
          id: 'default-static',
          name: 'PHP + Static Site (default)',
          createdAt: new Date().toISOString(),
          content: DEFAULT_TEMPLATE,
        },
      ]);
    }

    // Sample files so the File Manager is not empty on first open
    const index = path.join(config.filesBaseDir, 'index.html');
    if (!fs.existsSync(index)) fs.writeFileSync(index, SAMPLE_INDEX);

    const cssDir = path.join(config.filesBaseDir, 'css');
    fs.mkdirSync(cssDir, { recursive: true });
    const css = path.join(cssDir, 'site.css');
    if (!fs.existsSync(css)) fs.writeFileSync(css, SAMPLE_CSS);
  } catch (err) {
    console.error('[seed] Failed:', err.message);
  }
}

module.exports = seed;
