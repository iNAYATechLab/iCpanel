const { execFile } = require('child_process');

/**
 * Safely execute a binary with an argument array — NEVER a shell string.
 * Because `shell: false` and user input is always validated against an
 * allowlist before reaching this function, shell metacharacters
 * (; | && $( ) ` ) have no effect — OS command injection is not possible.
 *
 * @param {string} command  Binary to execute (fixed, e.g. "systemctl")
 * @param {string[]} args   Argument array (validated values only)
 * @param {number} timeoutMs
 * @returns {Promise<{ok: boolean, code: number, stdout: string, stderr: string}>}
 */
function runCommand(command, args, timeoutMs = 10000) {
  return new Promise((resolve) => {
    execFile(
      command,
      args,
      { timeout: timeoutMs, maxBuffer: 512 * 1024, shell: false },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          code: error ? error.code || 1 : 0,
          stdout: (stdout || '').toString(),
          stderr: error && error.code === 'ENOENT'
            ? `Command not found: ${command}`
            : (stderr || '').toString(),
        });
      }
    );
  });
}

module.exports = { runCommand };
