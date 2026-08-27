const fs = require('fs');
const path = require('path');
const config = require('../config');

/** HTTP-aware error that the central error handler understands. */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * Validate and resolve a user-supplied relative path inside the files
 * base directory.
 * Blocks: null bytes, absolute paths and traversal sequences like
 * "../../etc/passwd" (path.resolve + prefix check makes escape impossible).
 */
function resolveSafePath(relativePath) {
  if (typeof relativePath !== 'string') {
    throw new HttpError(400, 'Path must be a string');
  }
  if (relativePath.includes('\0')) {
    throw new HttpError(400, 'Path contains invalid characters');
  }

  const base = config.filesBaseDir;
  const abs = path.resolve(base, relativePath.trim());

  if (abs !== base && !abs.startsWith(base + path.sep)) {
    throw new HttpError(403, 'Access denied: path escapes the allowed directory');
  }
  return abs;
}

/**
 * Resolve symlinks on the deepest existing ancestor and verify the real
 * path still stays inside the base directory (blocks symlink escapes
 * such as /var/www/link -> /etc).
 */
function assertNoSymlinkEscape(absPath) {
  let target = absPath;
  while (!fs.existsSync(target)) {
    const parent = path.dirname(target);
    if (parent === target) break;
    target = parent;
  }
  const real = fs.realpathSync(target);
  const base = fs.realpathSync(config.filesBaseDir);

  if (real !== base && !real.startsWith(base + path.sep)) {
    throw new HttpError(403, 'Access denied: symlink escapes the allowed directory');
  }
}

module.exports = { HttpError, resolveSafePath, assertNoSymlinkEscape };
