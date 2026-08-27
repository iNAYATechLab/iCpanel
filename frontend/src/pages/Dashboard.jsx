import { useEffect, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Cpu, MemoryStick, HardDrive, Clock } from 'lucide-react';
import api from '../api/client';
import StatCard from '../components/StatCard';

const POLL_INTERVAL_MS = 3000;
const MAX_POINTS = 40;

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const tooltipStyle = {
  background: '#18181b',
  border: '1px solid #3f3f46',
  borderRadius: 8,
  color: '#e4e4e7',
  fontSize: 12,
};

export default function Dashboard() {
  const [history, setHistory] = useState([]);
  const [latest, setLatest] = useState(null);
  const [info, setInfo] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const fetchMetrics = async () => {
      try {
        const res = await api.get('/system/metrics');
        if (cancelled) return;
        const m = res.data;
        setLatest(m);
        setHistory((prev) => {
          const point = {
            time: new Date(m.timestamp).toLocaleTimeString([], { hour12: false }),
            cpu: parseFloat(m.cpu_usage),
            ram: parseFloat(m.ram_percentage),
            disk: parseFloat(m.disk_percentage),
          };
          const next = [...prev, point];
          return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next;
        });
      } catch {
        /* transient polling errors are ignored; the next tick retries */
      }
    };

    fetchMetrics();
    timerRef.current = setInterval(fetchMetrics, POLL_INTERVAL_MS);
    api.get('/system/info').then((r) => setInfo(r.data)).catch(() => {});

    return () => {
      cancelled = true;
      clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-zinc-500">
          Live system metrics — refreshed every {POLL_INTERVAL_MS / 1000}s
          {info ? ` · ${info.hostname}` : ''}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="CPU Usage"
          value={latest ? `${latest.cpu_usage}%` : '—'}
          sub={info ? `${info.cpu_model} · ${info.cpu_cores} cores` : ''}
          icon={Cpu}
          accent="emerald"
        />
        <StatCard
          title="Memory"
          value={latest ? `${latest.ram_percentage}%` : '—'}
          sub={latest ? `${latest.ram_used} GB / ${latest.ram_total} GB used` : ''}
          icon={MemoryStick}
          accent="sky"
        />
        <StatCard
          title="Disk Usage"
          value={latest ? `${latest.disk_percentage}%` : '—'}
          sub={latest && latest.disks && latest.disks[0] ? `${latest.disks[0].mount} · ${latest.disks[0].used_gb} / ${latest.disks[0].size_gb} GB` : ''}
          icon={HardDrive}
          accent="pink"
        />
        <StatCard
          title="Uptime"
          value={latest ? formatUptime(latest.uptime_seconds) : '—'}
          sub={info ? `${info.distro} ${info.release}` : ''}
          icon={Clock}
          accent="amber"
        />
      </div>

      {/* Live chart */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-300">CPU / RAM / Disk — live history</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="time" stroke="#71717a" fontSize={11} minTickGap={48} />
            <YAxis domain={[0, 100]} stroke="#71717a" fontSize={11} unit="%" />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Line type="monotone" dataKey="cpu" name="CPU" stroke="#34d399" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="ram" name="RAM" stroke="#38bdf8" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="disk" name="Disk" stroke="#f472b6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Host info + disk table */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-300">Host Information</h2>
          {info ? (
            <dl className="space-y-2.5 text-sm">
              {[
                ['Hostname', info.hostname],
                ['OS', `${info.distro} ${info.release}`],
                ['Kernel', `${info.kernel} (${info.arch})`],
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

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-300">Mounted Filesystems</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                <th className="pb-2">Mount</th>
                <th className="pb-2">Used</th>
                <th className="pb-2">Size</th>
                <th className="pb-2 text-right">Usage</th>
              </tr>
            </thead>
            <tbody>
              {(latest?.disks || []).map((d) => (
                <tr key={d.mount} className="border-b border-zinc-800/50 last:border-0">
                  <td className="py-2 font-mono text-xs text-zinc-300">{d.mount}</td>
                  <td className="py-2 font-mono text-xs text-zinc-400">{d.used_gb} GB</td>
                  <td className="py-2 font-mono text-xs text-zinc-400">{d.size_gb} GB</td>
                  <td className="py-2 text-right font-mono text-xs text-zinc-300">{d.use}%</td>
                </tr>
              ))}
              {!latest?.disks?.length && (
                <tr>
                  <td colSpan={4} className="py-3 text-sm text-zinc-500">Loading…</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
