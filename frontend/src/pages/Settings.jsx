import { useEffect, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import api, { getError } from '../api/client';

export default function Settings() {
  const [info, setInfo] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/system/info').then((r) => setInfo(r.data)).catch(() => {});
  }, []);

  const changePassword = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    setBusy(true);
    try {
      const res = await api.put('/auth/password', { currentPassword, newPassword });
      setMessage(res.data.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(getError(err, 'Failed to change password'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-zinc-500">Account and panel configuration</p>
      </div>

      {/* Change password */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-300">
          <KeyRound size={16} className="text-emerald-400" /> Change Password
        </h2>
        <form onSubmit={changePassword} className="space-y-4">
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-emerald-500/60"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              type="password"
              autoComplete="new-password"
              placeholder="New password (min 8 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-emerald-500/60"
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-emerald-500/60"
            />
          </div>
          {message && (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              {message}
            </p>
          )}
          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {busy ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>

      {/* Panel info */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-300">Panel & Server</h2>
        {info ? (
          <dl className="space-y-2.5 text-sm">
            {[
              ['Hostname', info.hostname],
              ['Operating system', `${info.distro} ${info.release} (${info.arch})`],
              ['Kernel', info.kernel],
              ['Node.js', info.node_version],
              ['Service mode', info.service_mode],
              ['Files base dir', info.files_base_dir],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-zinc-500">{k}</dt>
                <dd className="truncate font-mono text-xs text-zinc-300">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-zinc-500">Loading…</p>
        )}
      </div>

      {/* Production checklist */}
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-300">
          <ShieldCheck size={16} /> Production checklist
        </h2>
        <ul className="list-inside list-disc space-y-1.5 text-xs leading-relaxed text-amber-200/80">
          <li>Set a strong <code className="font-mono">JWT_SECRET</code> (48+ random bytes) in <code className="font-mono">backend/.env</code>.</li>
          <li>Change the default admin password immediately after first login.</li>
          <li>Run the API behind HTTPS (Nginx reverse proxy + Let's Encrypt).</li>
          <li>Set <code className="font-mono">CORS_ORIGIN</code> to your dashboard URL instead of <code className="font-mono">*</code>.</li>
          <li>Trim <code className="font-mono">ALLOWED_SERVICES</code> to only the services this panel should control.</li>
          <li>Run the backend as a dedicated unprivileged user; grant only the specific sudo rules it needs.</li>
        </ul>
      </div>
    </div>
  );
}
