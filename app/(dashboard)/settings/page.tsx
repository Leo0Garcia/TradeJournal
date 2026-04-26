'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { TAG_COLORS, getTagColorStyle } from '@/lib/utils';
import type { Tag } from '@/types';

export default function SettingsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [creating, setCreating] = useState(false);

  async function load() {
    const data = await fetch('/api/tags').then(r => r.json());
    setTags(data);
  }

  useEffect(() => { load(); }, []);

  async function createTag() {
    if (!newName.trim()) return;
    setCreating(true);
    await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    setNewName('');
    await load();
    setCreating(false);
  }

  async function deleteTag(id: string, name: string) {
    if (!confirm(`Delete tag "${name}"? This will remove it from all trades.`)) return;
    await fetch('/api/tags', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-zinc-100 mb-1">Settings</h1>
      <p className="text-sm text-zinc-500 mb-8">Manage your tags and preferences</p>

      {/* Tags */}
      <section className="bg-bg-surface border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-zinc-200 mb-4">Setup Tags</h2>

        {/* Create */}
        <div className="flex items-center gap-3 mb-5 p-4 bg-bg-overlay rounded-xl border border-border">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createTag()}
            placeholder="Tag name (e.g. Liquidity Sweep, BOS, FVG)"
            className="flex-1 bg-transparent text-sm text-zinc-100 focus:outline-none placeholder:text-zinc-600"
          />
          <div className="flex gap-1.5">
            {TAG_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`w-5 h-5 rounded-full transition-all ${newColor === c ? 'scale-125 ring-2 ring-white/40' : 'opacity-60 hover:opacity-100'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            onClick={createTag}
            disabled={!newName.trim() || creating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
          >
            <Plus size={13} /> Add
          </button>
        </div>

        {/* List */}
        <div className="space-y-2">
          {tags.length === 0 && (
            <p className="text-sm text-zinc-600 text-center py-4">No tags yet. Create your first tag above.</p>
          )}
          {tags.map(tag => (
            <div key={tag.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-bg-elevated transition-colors group">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-medium border"
                style={getTagColorStyle(tag.color)}
              >
                {tag.name}
              </span>
              <button
                onClick={() => deleteTag(tag.id, tag.name)}
                className="p-1.5 text-zinc-700 hover:text-loss hover:bg-loss-muted rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Instruments info */}
      <section className="mt-4 bg-bg-surface border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-zinc-200 mb-2">Pre-configured Instruments</h2>
        <p className="text-xs text-zinc-500 mb-3">
          Point values are used for P&L calculation. Custom instruments can be added when logging trades.
        </p>
        <div className="text-xs text-zinc-600 space-y-1 font-mono">
          <div className="grid grid-cols-3 gap-x-4">
            {[
              ['MNQ', '$2/point'], ['MES', '$5/point'], ['NQ', '$20/point'],
              ['ES', '$50/point'], ['XAUUSD', '$1/point'], ['BTCUSDT', '$1/point'],
            ].map(([sym, val]) => (
              <div key={sym} className="flex justify-between py-1 border-b border-border-subtle">
                <span className="text-zinc-400">{sym}</span>
                <span>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
