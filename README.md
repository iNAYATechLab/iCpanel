# iCpanel

A lightweight, web-based server control panel (cPanel alternative) built with
**Node.js + Express** and **React + Tailwind CSS**.

> ⚠️ This project gives a web UI access to sensitive server operations.
> Read the [Security model](#security-model) section before deploying.

## Features

- **JWT authentication** — bcrypt-hashed credentials, 24h tokens, brute-force rate limiting
- **Live system metrics** — CPU / RAM / Disk polled from the `systeminformation` package
- **Service control** — start / stop / restart / reload allowlisted systemd services
- **Secure file manager** — browse, edit, create and delete files under the web root
- **Nginx virtual host templates** — CRUD + safe placeholder rendering
- **Dark-mode dashboard** — Recharts live history, responsive layout

## Project structure

```
icpanel/
├── backend/                    # Node.js + Express API
│   ├── src/
│   │   ├── config/index.js     # Env-driven configuration
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT verification
│   │   │   └── errorHandler.js # Central error handling
│   │   ├── routes/
│   │   │   ├── auth.js         # Login / me / password change
│   │   │   ├── system.js       # CPU, RAM, disk metrics + host info
│   │   │   ├── services.js     # systemctl control (allowlisted)
│   │   │   ├── files.js        # File manager (sandboxed to base dir)
│   │   │   └── nginx.js        # Vhost template CRUD + generator
│   │   ├── utils/
│   │   │   ├── executor.js     # execFile-only command runner (no shell)
│   │   │   ├── sanitize.js     # Path traversal / symlink protection
│   │   │   ├── store.js        # JSON persistence (users, templates)
│   │   │   └── seed.js         # First-run bootstrap
│   │   └── server.js
│   ├── .env.example
│   └── package.json
└── frontend/                   # React + Vite + Tailwind dashboard
    ├── src/
    │   ├── api/client.js       # Axios instance + auth interceptor
    │   ├── context/AuthContext.jsx
    │   ├── components/         # Layout, StatCard, VhostTemplates
    │   └── pages/              # Login, Dashboard, FileManager,
    │                           # WebServices, Settings
    └── package.json
```

## Getting started (development)

```bash
# 1. Backend
cd backend
cp .env.example .env       # adjust values
npm install
npm run dev                # http://localhost:5000

# 2. Frontend (separate terminal)
cd frontend
npm install
npm run dev                # http://localhost:5173 (proxies /api -> :5000)
```

The first backend start seeds:

- a default admin account (`ADMIN_USERNAME` / `ADMIN_PASSWORD`, default `admin` / `admin123`)
- a default Nginx template
- sample files in the file manager root

**Change the default password immediately after first login.**

## API overview

| Method | Endpoint                        | Description                              |
| ------ | ------------------------------- | ---------------------------------------- |
| POST   | `/api/auth/login`               | Authenticate, returns JWT                |
| GET    | `/api/auth/me`                  | Current user from token                  |
| PUT    | `/api/auth/password`            | Change password                          |
| GET    | `/api/system/metrics`           | Live CPU / RAM / disk metrics            |
| GET    | `/api/system/info`              | Host information                         |
| GET    | `/api/services`                 | Allowlisted services + status            |
| POST   | `/api/services/:name/:action`  | start / stop / restart / reload / status |
| GET    | `/api/files/list?path=`         | List directory                           |
| GET    | `/api/files/file?path=`         | Read file (≤ 1 MB)                       |
| PUT    | `/api/files/file`               | Write file (≤ 1 MB)                      |
| POST   | `/api/files/mkdir`              | Create folder                            |
| DELETE | `/api/files/entry?path=`        | Delete file / empty folder               |
| GET    | `/api/nginx/templates`          | List templates                           |
| POST   | `/api/nginx/templates`          | Create template                          |
| PUT    | `/api/nginx/templates/:id`      | Update template                          |
| DELETE | `/api/nginx/templates/:id`      | Delete template                          |
| POST   | `/api/nginx/generate`           | Render template → nginx server block     |

## Security model

| Threat                    | Mitigation                                                                    |
| ------------------------- | ----------------------------------------------------------------------------- |
| OS command injection      | `execFile` with argument arrays (`shell: false`) — never a shell string; strict allowlists for service names and actions |
| Path traversal            | `path.resolve` + base-dir prefix check, null-byte rejection, per-segment name validation |
| Symlink escape            | `realpath` verification of the deepest existing ancestor                       |
| Credential theft          | bcrypt password hashing, uniform login errors, rate-limited login endpoint     |
| Token abuse               | JWT expiry, `Authorization: Bearer` on every private route, helmet + global rate limit |
| Runaway payloads          | 1 MB file read/write cap, 64 KB template cap, 2 MB JSON body cap               |
| Config injection (nginx)  | Placeholder values are stripped of control characters / newlines               |

### Service control mode

- `SERVICE_MODE=auto` (default) — uses real `systemctl` when systemd is detected,
  otherwise falls back to a **simulated** mode (safe for demos/containers)
- `SERVICE_MODE=real` — force real systemctl (production)
- `SERVICE_MODE=mock` — always simulated

## Production checklist

1. Generate a strong secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
2. Set `FILES_BASE_DIR=/var/www` and a minimal `ALLOWED_SERVICES` list
3. Serve the built frontend (`npm run build`) and proxy `/api` to the backend over HTTPS
4. Run the backend under a dedicated user; if `systemctl` needs privileges, grant
   narrow sudo rules for exactly the allowlisted services (no full root)
5. Set `CORS_ORIGIN` to your dashboard origin

## License

MIT
