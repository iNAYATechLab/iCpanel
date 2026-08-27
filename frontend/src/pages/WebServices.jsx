import { useCallback, useEffect, useState } from 'react';
import { Play, Square, RotateCw, RefreshCw, Activity } from 'lucide-react';
import api, { getError } from '../api/client';
import VhostTemplates from '../components/VhostTemplates';

const STATUS_STYLES = {
  active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  inactive: 'bg-zinc-500/15 text-zinc-400 border-zinc-600/40',
  failed: 'bg-red-500/15 text-red-300 border-red-500/30',
  activating: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  unknown: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
};

const ACTIONS = [
  { key: 'start', label: 'Start', icon: Play },
  { key: 'stop', label: 'Stop', icon: Square },
  { key: 'restart', label: 'Restart', icon: RotateCw },
  { key: 'reload', label: 'Reload', icon: RefreshCw },
];

export default function WebServices() {
  const [mode, setMode] = useState('mock');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(''); // "name:action" while a request is running
  const [output, setOutput] = useState(null); // { title, text, ok }
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/services');
      setMode(res.data.mode);
      setServices(res.data.services);
    } catch (err) {
      setError(getError(err, 'Failed to load services'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (name, action) => {
    setBusy(`${name}:${action}`);
    setError('');
    try {
      const res = await api.post(`/services/${name}/${action}`);
      setOutput({
        title: `systemctl ${action} ${name}`,
        text: res.data.output || `status: ${res.data.status}`,
        ok: res.data.ok,
      });
      load();
    } catch (err) {
      setError(getError(err, 'Action failed'));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Web Services</h1>
          <p className="text-sm text-zinc-500">
            Manage allowlisted systemd services and Nginx virtual hosts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              mode === 'real'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
            }`}
          >
            {mode === 'real' ? 'live systemd' : 'simulated (no systemd)'}
          </span>
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {mode === 'mock' && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          This environment has no systemd — service actions are simulated so the UI can be
          demonstrated safely. On a real server set <code className="font-mono">SERVICE_MODE=real</code>.
        </p>
      )}

      {/* Services table */}
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.map((svc) => (
              <tr key={svc.name} className="border-b border-zinc-800/50 last:border-0">
                <td className="px-4 py-2.5 font-mono text-xs text-zinc-200">{svc.name}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      STATUS_STYLES[svc.status] || STATUS_STYLES.unknown
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {svc.status}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1.5">
                    {ACTIONS.map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => runAction(svc.name, key)}
                        disabled={busy !== ''}
                        className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-40"
                      >
                        <Icon
                          size={13}
                          className={busy === `${svc.name}:${key}` ? 'animate-spin' : ''}
                        />
                        {label}
                      </button>
                    ))}
                    <button
                      onClick={() => runAction(svc.name, 'status')}
                      disabled={busy !== ''}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-sky-300 transition hover:bg-sky-500/10 disabled:opacity-40"
                    >
                      <Activity size={13} /> Status
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!services.length && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-zinc-500">
                  {loading ? 'Loading…' : 'No allowlisted services'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Last command output */}
      {output && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-300">
              Output — <span className="font-mono text-xs">{output.title}</span>
            </h2>
            <button
              onClick={() => setOutput(null)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              dismiss
            </button>
          </div>
          <pre className="max-h-60 overflow-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-300">
            {output.text}
          </pre>
        </div>
      )}

      {/* Nginx virtual host templates */}
      <VhostTemplates />
    </div>
  );
}
