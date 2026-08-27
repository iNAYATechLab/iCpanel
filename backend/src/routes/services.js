const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const config = require('../config');
const { runCommand } = require('../utils/executor');

// Strict allowlists — the ONLY actions and services the panel can ever touch
const ALLOWED_ACTIONS = new Set(['start', 'stop', 'restart', 'reload', 'status']);
const SERVICE_NAME_PATTERN = /^[a-zA-Z0-9@._-]{1,64}$/;

// In-memory state for mock mode (demos/sandboxes without systemd)
const DEFAULT_RUNNING = new Set(['nginx', 'mysql', 'php8.3-fpm', 'redis-server']);
const mockState = new Map();

function isAllowedService(name) {
  return config.allowedServices.includes(name) && SERVICE_NAME_PATTERN.test(name);
}

async function getRealStatus(name) {
  // NOTE: systemctl is-active exits non-zero for inactive/failed units,
  // so the status must be parsed from stdout rather than the exit code.
  const { stdout } = await runCommand('systemctl', ['is-active', name], 5000);
  const status = (stdout || '').trim();
  return ['active', 'inactive', 'failed', 'activating'].includes(status)
    ? status
    : 'unknown';
}

function getMockStatus(name) {
  if (!mockState.has(name)) {
    mockState.set(name, DEFAULT_RUNNING.has(name) ? 'active' : 'inactive');
  }
  return mockState.get(name);
}

/**
 * @route   GET /api/services
 * @desc    List allowlisted services with their current status
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const services = [];
    for (const name of config.allowedServices) {
      const status =
        config.serviceMode === 'mock'
          ? getMockStatus(name)
          : await getRealStatus(name);
      services.push({ name, status });
    }
    res.json({ mode: config.serviceMode, services });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/services/:name/:action
 * @desc    Run start/stop/restart/reload/status on an allowlisted service.
 *          Uses execFile (no shell) with allowlisted values only —
 *          OS command injection is structurally impossible here.
 * @access  Private
 */
router.post('/:name/:action', authMiddleware, async (req, res, next) => {
  try {
    const { name, action } = req.params;

    if (!isAllowedService(name)) {
      return res.status(400).json({ error: `Service "${name}" is not allowlisted` });
    }
    if (!ALLOWED_ACTIONS.has(action)) {
      return res.status(400).json({ error: `Action "${action}" is not allowed` });
    }

    // Simulated mode (no systemd in this environment)
    if (config.serviceMode === 'mock') {
      if (['start', 'restart', 'reload'].includes(action)) mockState.set(name, 'active');
      if (action === 'stop') mockState.set(name, 'inactive');
      return res.json({
        ok: true,
        mode: 'mock',
        name,
        action,
        status: mockState.get(name),
        output: `[simulated] systemctl ${action} ${name}`,
      });
    }

    // Real mode: fixed binary + argument array, never a shell string
    const args =
      action === 'status'
        ? ['status', name, '--no-pager', '-l']
        : [action, name];
    const result = await runCommand('systemctl', args, 15000);

    res.json({
      ok: result.ok,
      mode: 'real',
      name,
      action,
      status: await getRealStatus(name),
      output: `${result.stdout}\n${result.stderr}`.trim().slice(0, 20000),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
