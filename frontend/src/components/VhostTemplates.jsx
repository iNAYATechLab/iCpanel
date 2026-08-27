import { useCallback, useEffect, useState } from 'react';
import { Plus, Save, Trash2, Copy, Check, FileCode2 } from 'lucide-react';
import api, { getError } from '../api/client';

const EMPTY_TEMPLATE = `server {
    listen {{port}};
    server_name {{domain}};

    root {{root}};
    index index.html index.htm;

    location / {
        try_files $uri $uri/ =404;
    }
}
`;

export default function VhostTemplates() {
  // Template editor state
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Generator state
  const [genDomain, setGenDomain] = useState('');
  const [genRoot, setGenRoot] = useState('');
  const [genPort, setGenPort] = useState('80');
  const [generated, setGenerated] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/nginx/templates');
      setTemplates(res.data.templates);
      if (res.data.templates.length && !res.data.templates.some((t) => t.id === selectedId)) {
        select(res.data.templates[0]);
      }
    } catch (err) {
      setError(getError(err, 'Failed to load templates'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const select = (t) => {
    setSelectedId(t.id);
    setName(t.name);
    setContent(t.content);
    setMessage('');
    setError('');
  };

  const newTemplate = () => {
    setSelectedId(null);
    setName('New Template');
    setContent(EMPTY_TEMPLATE);
    setMessage('');
    setError('');
  };

  const saveTemplate = async () => {
    setError('');
    setMessage('');
    try {
      if (selectedId) {
        await api.put(`/nginx/templates/${selectedId}`, { name, content });
        setMessage('Template updated');
      } else {
        const res = await api.post('/nginx/templates', { name, content });
        setSelectedId(res.data.template.id);
        setMessage('Template created');
      }
      load();
    } catch (err) {
      setError(getError(err, 'Failed to save template'));
    }
  };

  const deleteTemplate = async () => {
    if (!selectedId) return;
    if (!window.confirm(`Delete template "${name}"?`)) return;
    try {
      await api.delete(`/nginx/templates/${selectedId}`);
      setSelectedId(null);
      load();
    } catch (err) {
      setError(getError(err, 'Failed to delete template'));
    }
  };

  const generate = async (e) => {
    e.preventDefault();
    setError('');
    setGenerated('');
    setCopied(false);
    try {
      const res = await api.post('/nginx/generate', {
        templateId: selectedId,
        domain: genDomain,
        root: genRoot,
        port: genPort,
      });
      setGenerated(res.data.config);
    } catch (err) {
      setError(getError(err, 'Failed to generate config'));
    }
  };

  const copyGenerated = async () => {
    await navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
            <FileCode2 size={16} className="text-emerald-400" /> Nginx Virtual Host Templates
          </h2>
          <p className="text-xs text-zinc-500">
            Placeholders: <code className="font-mono">{'{{domain}}'}</code>{' '}
            <code className="font-mono">{'{{root}}'}</code>{' '}
            <code className="font-mono">{'{{port}}'}</code>
          </p>
        </div>
        <button
          onClick={newTemplate}
          className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          <Plus size={14} /> New template
        </button>
      </div>

      {message && (
        <p className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Template list */}
        <div className="space-y-1.5">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => select(t)}
              className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                t.id === selectedId
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                  : 'border-zinc-800 bg-zinc-950/50 text-zinc-300 hover:border-zinc-700'
              }`}
            >
              <span className="block truncate">{t.name}</span>
              <span className="block truncate font-mono text-[10px] text-zinc-500">
                {t.id}
              </span>
            </button>
          ))}
          {!templates.length && (
            <p className="rounded-lg border border-dashed border-zinc-800 px-3 py-6 text-center text-xs text-zinc-500">
              No templates yet
            </p>
          )}
        </div>

        {/* Editor */}
        <div className="space-y-3 lg:col-span-2">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template name"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-500/60"
            />
            <button
              onClick={saveTemplate}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-emerald-950 hover:bg-emerald-400"
            >
              <Save size={14} /> {selectedId ? 'Update' : 'Create'}
            </button>
            {selectedId && (
              <button
                onClick={deleteTemplate}
                className="rounded-lg border border-zinc-700 p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-400"
                title="Delete template"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            rows={10}
            className="w-full resize-y rounded-lg bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-200 outline-none ring-1 ring-zinc-800 focus:ring-emerald-500/50"
          />
        </div>
      </div>

      {/* Generator */}
      <form onSubmit={generate} className="mt-6 border-t border-zinc-800 pt-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Generate virtual host config
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input
            value={genDomain}
            onChange={(e) => setGenDomain(e.target.value)}
            placeholder="example.com"
            required
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs outline-none focus:border-emerald-500/60"
          />
          <input
            value={genRoot}
            onChange={(e) => setGenRoot(e.target.value)}
            placeholder="/var/www/example.com/html"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs outline-none focus:border-emerald-500/60"
          />
          <input
            value={genPort}
            onChange={(e) => setGenPort(e.target.value)}
            placeholder="80"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs outline-none focus:border-emerald-500/60"
          />
          <button
            type="submit"
            disabled={!selectedId}
            className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-sky-950 hover:bg-sky-400 disabled:opacity-40"
          >
            Generate
          </button>
        </div>

        {generated && (
          <div className="relative mt-4">
            <button
              onClick={copyGenerated}
              className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <pre className="max-h-72 overflow-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-emerald-200/90 ring-1 ring-zinc-800">
              {generated}
            </pre>
            <p className="mt-2 text-[11px] text-zinc-500">
              Save it to <span className="font-mono">/etc/nginx/sites-available/</span>, enable
              with <span className="font-mono">ln -s</span>, test with{' '}
              <span className="font-mono">nginx -t</span>, then reload nginx.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
