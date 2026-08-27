export default function StatCard({ title, value, sub, icon: Icon, accent = 'emerald' }) {
  const accents = {
    emerald: 'bg-emerald-500/15 text-emerald-400',
    sky: 'bg-sky-500/15 text-sky-400',
    pink: 'bg-pink-500/15 text-pink-400',
    amber: 'bg-amber-500/15 text-amber-400',
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-400">{title}</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-zinc-50">{value}</p>
          {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
        </div>
        {Icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accents[accent]}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
