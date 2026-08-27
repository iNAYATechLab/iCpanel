const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { readTemplates, updateTemplates } = require('../utils/store');
const { HttpError } = require('../utils/sanitize');

const NAME_PATTERN = /^[\w\s.-]{1,100}$/;
const DOMAIN_PATTERN = /^[a-zA-Z0-9*._-]{1,253}$/;
const MAX_CONTENT_CHARS = 64 * 1024;

/** Strip control characters so a value can never inject extra config lines. */
function stripUnsafe(value) {
  return String(value).replace(/[\r\n\t\0]/g, '');
}

function validateTemplatePayload(body) {
  const { name, content } = body || {};
  if (typeof name !== 'string' || !NAME_PATTERN.test(name.trim())) {
    throw new HttpError(400, 'Template name must be 1-100 characters (letters, digits, dot, dash, space)');
  }
  if (typeof content !== 'string' || content.length === 0) {
    throw new HttpError(400, 'Template content is required');
  }
  if (content.length > MAX_CONTENT_CHARS) {
    throw new HttpError(413, 'Template content exceeds the 64 KB limit');
  }
  return { name: name.trim(), content };
}

/**
 * @route   GET /api/nginx/templates
 * @desc    List saved virtual host templates
 * @access  Private
 */
router.get('/templates', authMiddleware, (req, res) => {
  res.json({ templates: readTemplates() });
});

/**
 * @route   POST /api/nginx/templates
 * @desc    Create a new virtual host template
 * @access  Private
 */
router.post('/templates', authMiddleware, (req, res, next) => {
  try {
    const { name, content } = validateTemplatePayload(req.body);
    const templates = readTemplates();
    const template = { id: crypto.randomUUID(), name, content, createdAt: new Date().toISOString() };
    templates.push(template);
    updateTemplates(templates);
    res.status(201).json({ message: 'Template created', template });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   PUT /api/nginx/templates/:id
 * @desc    Update an existing template
 * @access  Private
 */
router.put('/templates/:id', authMiddleware, (req, res, next) => {
  try {
    const { name, content } = validateTemplatePayload(req.body);
    const templates = readTemplates();
    const template = templates.find((t) => t.id === req.params.id);
    if (!template) throw new HttpError(404, 'Template not found');

    template.name = name;
    template.content = content;
    template.updatedAt = new Date().toISOString();
    updateTemplates(templates);
    res.json({ message: 'Template updated', template });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   DELETE /api/nginx/templates/:id
 * @desc    Delete a template
 * @access  Private
 */
router.delete('/templates/:id', authMiddleware, (req, res, next) => {
  try {
    const templates = readTemplates();
    const next = templates.filter((t) => t.id !== req.params.id);
    if (next.length === templates.length) throw new HttpError(404, 'Template not found');
    updateTemplates(next);
    res.json({ message: 'Template deleted' });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/nginx/generate
 * @desc    Render a template with sanitized values into an nginx
 *          server block. The result is returned as text only — the
 *          panel never writes into /etc/nginx directly.
 * @access  Private
 */
router.post('/generate', authMiddleware, (req, res, next) => {
  try {
    const { templateId, domain, root, port } = req.body || {};

    const template = readTemplates().find((t) => t.id === templateId);
    if (!template) throw new HttpError(404, 'Template not found');
    if (typeof domain !== 'string' || !DOMAIN_PATTERN.test(domain)) {
      throw new HttpError(400, 'Invalid domain name');
    }

    const portNumber = parseInt(port, 10);
    if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) {
      throw new HttpError(400, 'Port must be an integer between 1 and 65535');
    }

    const safeDomain = stripUnsafe(domain);
    const safeRoot = stripUnsafe(typeof root === 'string' && root ? root : `/var/www/${safeDomain}/html`);

    const configText = template.content
      .replaceAll('{{domain}}', safeDomain)
      .replaceAll('{{root}}', safeRoot)
      .replaceAll('{{port}}', String(portNumber));

    res.json({ config: configText });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
