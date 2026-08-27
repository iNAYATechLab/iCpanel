const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

const config = require('../config');
const authMiddleware = require('../middleware/auth');
const { readUsers, updateUsers } = require('../utils/store');

const router = express.Router();

// Brute-force protection for the login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate and return a JWT
 * @access  Public
 */
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body || {};

    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      username.length === 0 ||
      username.length > 100 ||
      password.length > 200
    ) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const key = username.toLowerCase();
    const users = readUsers();
    const user = users[key];

    // Uniform error message: never reveal whether the username exists
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { sub: key, role: user.role || 'admin' },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({ token, user: { username: key, role: user.role || 'admin' } });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Return the authenticated user from the token
 * @access  Private
 */
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: { username: req.user.sub, role: req.user.role } });
});

/**
 * @route   PUT /api/auth/password
 * @desc    Change the current user's password
 * @access  Private
 */
router.put('/password', authMiddleware, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (newPassword.length < 8 || newPassword.length > 200) {
      return res.status(400).json({ error: 'New password must be 8-200 characters long' });
    }

    const users = readUsers();
    const user = users[req.user.sub];
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.updatedAt = new Date().toISOString();
    users[req.user.sub] = user;
    updateUsers(users);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
