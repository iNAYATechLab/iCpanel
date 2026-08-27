import { useCallback, useEffect, useState } from 'react';
import {
  Folder,
  FileText,
  Trash2,
  FolderPlus,
  Save,
  X,
  ArrowUp,
  RefreshCw,
} from 'lucide-react';
import api, { getError } from '../api/client';

const join = (a, b) => (a ? `${a}/${b}` : b);
const parentOf = (p) => p.split('/').slice(0, -1).join('/');

function formatSize(bytes) {
  if (bytes === 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function FileManager() {
  const [path, setPath] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Editor state
  const [editor, setEditor] = useState(null); // { path, content, original }
  const [saving, setSaving] = useState(false);

  // New folder state
  const [newFolder, setNewFolder] = useState('');

  const load = useCallback(async (dir) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/files/list', { params: { path: dir } });
      setEntries(res.data.entries);
    } catch (err) {
      setError(getError(err, 'Failed to list files'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(path);
  }, [path, load]);

  const openFile = async (name) => {
    const filePath = join(path, name);
    setError('');
    try {
      const res = await api.get('/files/file', { params: { path: filePath } });
      setEditor({ path: filePath, content: res.data.content, original: res.data.content });
    } catch (err) {
      setError(getError(err, 'Failed to open file'));
    }
  };

  const saveFile = async () => {
    if (!editor) return;
    setSaving(true);
    try {
      await api.put('/files/file', { path: editor.path, content: editor.content });
      setEditor({ ...editor, original: editor.content });
      load(path);
    } catch (err) {
      setError(getError(err, 'Failed to save file'));
    } finally {
      setSaving(false);
    }
  };

  const createFolder = async (e) => {
    e.preventDefault();
    const name = newFolder.trim();
    if (!name) return;
    try {
      await api.post('/files/mkdir', { path: join(path, name) });
      setNewFolder('');
      load(path);
    } catch (err) {
      setError(getError(err, 'Failed to create folder'));
    }
  };

  const deleteEntry = async (entry) => {
    if (!window.confirm(`Delete "${entry.name}"${entry.is_dir ? ' (folder must be empty)' : ''}?`)) return;
    try {
      await api.delete('/files/entry', { params: { path: join(path, entry.name) } });
      load(path);
    } catch (err) {
      setError(getError(err, 'Failed to delete'));
    }
  };

  const segments = path ? path.split('/') : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">File Manager</h1>
          <p className="text-sm text-zinc-500">Browse and edit files inside the web root</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(path)}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Toolbar: breadcrumbs + new folder */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
        <div className="flex items-center gap-1.5 text-sm">
          <button
            onClick={() => setPath('')}
            className="rounded px-2 py-1 font-mono text-xs text-emerald-300 hover:bg-zinc-800"
          >
            /
          </button>
          {segments.map((seg, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="text-zinc-600">/</span>
              <button
                onClick={() => setPath(segments.slice(0, i + 1).join('/'))}
                className="rounded px-2 py-1 font-mono text-xs text-zinc-300 hover:bg-zinc-800"
              >
                {seg}
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {path && (
            <button
              onClick={() => setPath(parentOf(path))}
              className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              <ArrowUp size={14} /> Up
            </button>
          )}
          <form onSubmit={createFolder} className="flex items-center gap-2">
            <FolderPlus size={15} className="text-zinc-500" />
            <input
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              placeholder="new-folder"
              className="w-40 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 font-mono text-xs outline-none focus:border-emerald-500/60"
            />
            <button
              type="submit"
              className="rounded-lg bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-emerald-950 hover:bg-emerald-400"
            >
              Create
            </button>
          </form>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* Entries */}
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Modified</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.name} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/40">
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => (entry.is_dir ? setPath(join(path, entry.name)) : openFile(entry.name))}
                    className="flex items-center gap-2.5 text-left hover:text-emerald-300"
                  >
                    {entry.is_dir ? (
                      <Folder size={16} className="text-sky-400" />
                    ) : (
                      <FileText size={16} className="text-zinc-500" />
                    )}
                    <span className="font-mono text-xs">{entry.name}</span>
                  </button>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">
                  {entry.is_dir ? '—' : formatSize(entry.size)}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">
                  {entry.mtime ? new Date(entry.mtime).toLocaleString() : '—'}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => deleteEntry(entry)}
                    className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {!entries.length && !loading && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-zinc-500">
                  This folder is empty
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Editor modal */}
      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="flex h-[80vh] w-full max-w-3xl flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
              <div>
                <p className="text-sm font-semibold">Edit file</p>
                <p className="font-mono text-xs text-zinc-500">/{editor.path}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={saveFile}
                  disabled={saving || editor.content === editor.original}
                  className="flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-40"
                >
                  <Save size={14} /> {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditor(null)}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <textarea
              value={editor.content}
              onChange={(e) => setEditor({ ...editor, content: e.target.value })}
              spellCheck={false}
              className="flex-1 resize-none bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-200 outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
