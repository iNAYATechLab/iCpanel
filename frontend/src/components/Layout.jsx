import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  Server,
  Settings as SettingsIcon,
  LogOut,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/files', label: 'File Manager', icon: FolderOpen },
  { to: '/services', label: 'Web Services', icon: Server },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900/60">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
            <Cpu size={20} />
          </div>
          <div>
            <p className="font-semibold leading-tight">iCpanel</p>
            <p className="text-xs text-zinc-500">Server Control Panel</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-zinc-800 p-3">
          <p className="mb-2 px-3 text-xs text-zinc-500">
            Signed in as{' '}
            <span className="font-medium text-zinc-300">{user?.username}</span>
          </p>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800/60 hover:text-red-300"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
