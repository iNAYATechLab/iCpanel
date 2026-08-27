import { useState } from 'react';
import { Cpu, User, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getError } from '../api/client';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(username, password);
    } catch (err) {
      setError(getError(err, 'Login failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <Cpu size={26} />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold">iCpanel</h1>
            <p className="text-sm text-zinc-500">Server Control Panel</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-400">Username</span>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 focus-within:border-emerald-500/60">
              <User size={16} className="text-zinc-500" />
              <input
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-transparent py-2.5 text-sm outline-none"
                placeholder="admin"
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-400">Password</span>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 focus-within:border-emerald-500/60">
              <Lock size={16} className="text-zinc-500" />
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent py-2.5 text-sm outline-none"
                placeholder="••••••••"
                required
              />
            </div>
          </label>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
