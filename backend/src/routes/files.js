const express = require('express');
const fsp = require('fs/promises');
const path = require('path');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const config = require('../config');
const { resolveSafePath, assertNoSymlinkEscape, HttpError } = require('../utils/sanitize');

const MAX_FILE_BYTES = 1024 * 1024; // 1 MB read/write limit through the panel
const NAME_PATTERN = /^[^/\\:\0]+$/; // single path segment, no separators

/**
 * @route   GET /api/files/list?path=
 * @desc    List entries of a directory inside the files base dir
 * @access  Private
 */
router.get('/list', authMiddleware, async (req, res, next) => {
  try {
    const abs = resolveSafePath(typeof req.query.path === 'string' ? req.query.path : '');
    assertNoSymlinkEscape(abs);

    const dirents = await fsp.readdir(abs, { withFileTypes: true });
    const entries = [];

    for (const dirent of dirents) {
      const full = path.join(abs, dirent.name);
      try {
        const st = await fsp.stat(full);
        entries.push({
          name: dirent.name,
          is_dir: dirent.isDirectory(),
          size: st.size,
          mtime: st.mtime.toISOString(),
        });
      } catch {
        entries.push({ name: dirent.name, is_dir: dirent.isDirectory(), size: 0, mtime: null });
      }
    }

    // Directories first, then alphabetical
    entries.sort((a, b) => Number(b.is_dir) - Number(a.is_dir) || a.name.localeCompare(b.name));

    res.json({ base_dir: config.filesBaseDir, entries });
  } catch (err) {
    next(err.code === 'ENOENT' ? new HttpError(404, 'Directory not found') : err);
  }
});

/**
 * @route   GET /api/files/file?path=
 * @desc    Read the text content of a file (max 1 MB)
 * @access  Private
 */
router.get('/file', authMiddleware, async (req, res, next) => {
  try {
    const abs = resolveSafePath(typeof req.query.path === 'string' ? req.query.path : '');

    let st;
    try {
      st = await fsp.stat(abs);
    } catch {
      throw new HttpError(404, 'File not found');
    }

    if (st.isDirectory()) throw new HttpError(400, 'Path points to a directory');
    if (st.size > MAX_FILE_BYTES) throw new HttpError(413, 'File exceeds the 1 MB limit');

    assertNoSymlinkEscape(abs);
    const content = await fsp.readFile(abs, 'utf8');

    res.json({
      path: path.relative(config.filesBaseDir, abs),
      size: st.size,
      content,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   PUT /api/files/file
 * @desc    Create or overwrite a text file (max 1 MB)
 * @access  Private
 */
router.put('/file', authMiddleware, async (req, res, next) => {
  try {
    const { path: relPath, content } = req.body || {};

    if (typeof relPath !== 'string' || relPath.trim().length === 0) {
      throw new HttpError(400, 'File path is required');
    }
    if (typeof content !== 'string') {
      throw new HttpError(400, 'File content must be a string');
    }
    if (Buffer.byteLength(content, 'utf8') > MAX_FILE_BYTES) {
      throw new HttpError(413, 'Content exceeds the 1 MB limit');
    }
    if (relPath.split('/').some((s) => s && (!NAME_PATTERN.test(s) || s === '.' || s === '..'))) {
      throw new HttpError(400, 'File path contains invalid segments');
    }

    const abs = resolveSafePath(relPath);
    const parent = path.dirname(abs);
    assertNoSymlinkEscape(parent);

    await fsp.mkdir(parent, { recursive: true });
    await fsp.writeFile(abs, content, 'utf8');

    res.json({ message: 'File saved', path: path.relative(config.filesBaseDir, abs) });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/files/mkdir
 * @desc    Create a folder inside the files base dir
 * @access  Private
 */
router.post('/mkdir', authMiddleware, async (req, res, next) => {
  try {
    const { path: dirPath } = req.body || {};

    if (typeof dirPath !== 'string' || dirPath.trim().length === 0) {
      throw new HttpError(400, 'Folder path is required');
    }
    if (dirPath.split('/').some((s) => s && (!NAME_PATTERN.test(s) || s === '.' || s === '..'))) {
      throw new HttpError(400, 'Folder name contains invalid characters');
    }

    const abs = resolveSafePath(dirPath);
    assertNoSymlinkEscape(path.dirname(abs));
    await fsp.mkdir(abs, { recursive: true });

    res.json({ message: 'Folder created', path: path.relative(config.filesBaseDir, abs) });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   DELETE /api/files/entry?path=
 * @desc    Delete a file or an EMPTY folder
 * @access  Private
 */
router.delete('/entry', authMiddleware, async (req, res, next) => {
  try {
    const relPath = typeof req.query.path === 'string' ? req.query.path : '';
    const abs = resolveSafePath(relPath);

    if (abs === config.filesBaseDir) {
      throw new HttpError(400, 'Cannot delete the root directory');
    }

    let st;
    try {
      st = await fsp.stat(abs);
    } catch {
      throw new HttpError(404, 'Not found');
    }

    assertNoSymlinkEscape(abs);

    if (st.isDirectory()) {
      const inner = await fsp.readdir(abs);
      if (inner.length > 0) throw new HttpError(400, 'Folder is not empty');
      await fsp.rm(abs, { recursive: false });
    } else {
      await fsp.unlink(abs);
    }

    res.json({ message: 'Deleted', path: relPath });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
