'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import TagBadge from '@/components/ui/TagBadge';
import { TAG_COLORS } from '@/lib/utils';
import type { Tag, Instrument, NewTradeInput } from '@/types';
import { Plus, ChevronDown } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: NewTradeInput) => Promise<void>;
}

const TODAY = new Date().toISOString().slice(0, 16);

export default function NewTradeModal({ open, onClose, onSave }: Props) {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    symbol: 'MNQ',
    direction: 'long' as 'long' | 'short',
    trade_date: TODAY,
    entry_price: '',
    initial_size: '',
    stop_loss: '',
    take_profit: '',
    notes: '',
    fees: '',
  });
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [customSymbol, setCustomSymbol] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch('/api/instruments').then(r => r.json()),
      fetch('/api/tags').then(r => r.json()),
    ]).then(([instr, tags]) => {
      setInstruments(instr);
      setAllTags(tags);
    });
  }, [open]);

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function toggleTag(id: string) {
    setSelectedTagIds(ids =>
      ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]
    );
  }

  async function createTag() {
    if (!newTagName.trim()) return;
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
    });
    const tag = await res.json();
    setAllTags(t => [...t, tag]);
    setSelectedTagIds(ids => [...ids, tag.id]);
    setNewTagName('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.entry_price || !form.initial_size) return;
    setLoading(true);
    try {
      await onSave({
        symbol: showCustom ? customSymbol.toUpperCase() : form.symbol,
        direction: form.direction,
        trade_date: form.trade_date,
        entry_price: parseFloat(form.entry_price),
        initial_size: parseFloat(form.initial_size),
        stop_loss: form.stop_loss ? parseFloat(form.stop_loss) : undefined,
        take_profit: form.take_profit ? parseFloat(form.take_profit) : undefined,
        notes: form.notes,
        fees: form.fees ? parseFloat(form.fees) : 0,
        tag_ids: selectedTagIds,
      });
      onClose();
      setForm({ symbol: 'MNQ', direction: 'long', trade_date: TODAY, entry_price: '', initial_size: '', stop_loss: '', take_profit: '', notes: '', fees: '' });
      setSelectedTagIds([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredTags = allTags.filter(t =>
    t.name.toLowerCase().includes(tagSearch.toLowerCase()) &&
    !selectedTagIds.includes(t.id)
  );
  const selectedTags = allTags.filter(t => selectedTagIds.includes(t.id));

  const grouped = instruments.reduce((acc, i) => {
    (acc[i.category] = acc[i.category] || []).push(i);
    return acc;
  }, {} as Record<string, Instrument[]>);

  return (
    <Modal open={open} onClose={onClose} title="New Trade" subtitle="Log a new trade entry" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Symbol + Direction */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Instrument</label>
            {!showCustom ? (
              <div className="relative">
                <select
                  value={form.symbol}
                  onChange={e => set('symbol', e.target.value)}
                  className="w-full bg-bg-overlay border border-border rounded-lg px-3 py-2 text-sm text-zinc-100 appearance-none focus:outline-none focus:border-accent pr-8"
                >
                  {Object.entries(grouped).map(([cat, items]) => (
                    <optgroup key={cat} label={cat.toUpperCase()}>
                      {items.map(i => (
                        <option key={i.symbol} value={i.symbol}>{i.symbol}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              </div>
            ) : (
              <input
                value={customSymbol}
                onChange={e => setCustomSymbol(e.target.value)}
                placeholder="e.g. AAPL"
                className="w-full bg-bg-overlay border border-border rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-accent uppercase"
              />
            )}
            <button
              type="button"
              onClick={() => setShowCustom(!showCustom)}
              className="text-[11px] text-accent hover:text-accent-light mt-1 transition-colors"
            >
              {showCustom ? '← Pick from list' : '+ Custom symbol'}
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Direction</label>
            <div className="flex rounded-lg overflow-hidden border border-border">
              {(['long', 'short'] as const).map(dir => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => set('direction', dir)}
                  className={`flex-1 py-2 text-sm font-semibold capitalize transition-all ${
                    form.direction === dir
                      ? dir === 'long'
                        ? 'bg-profit-muted text-profit-text border-0'
                        : 'bg-loss-muted text-loss-text border-0'
                      : 'bg-bg-overlay text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {dir === 'long' ? '▲ Long' : '▼ Short'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Date + Entry + Size */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Date & Time</label>
            <input
              type="datetime-local"
              value={form.trade_date}
              onChange={e => set('trade_date', e.target.value)}
              required
              className="w-full bg-bg-overlay border border-border rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Entry Price</label>
            <input
              type="number"
              step="any"
              value={form.entry_price}
              onChange={e => set('entry_price', e.target.value)}
              required
              placeholder="0.00"
              className="w-full bg-bg-overlay border border-border rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-accent placeholder:text-zinc-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Size (contracts)</label>
            <input
              type="number"
              step="any"
              min="0.01"
              value={form.initial_size}
              onChange={e => set('initial_size', e.target.value)}
              required
              placeholder="1"
              className="w-full bg-bg-overlay border border-border rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-accent placeholder:text-zinc-600"
            />
          </div>
        </div>

        {/* SL / TP / Fees */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Stop Loss <span className="text-zinc-600">(optional)</span></label>
            <input
              type="number"
              step="any"
              value={form.stop_loss}
              onChange={e => set('stop_loss', e.target.value)}
              placeholder="0.00"
              className="w-full bg-bg-overlay border border-border rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-accent placeholder:text-zinc-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Take Profit <span className="text-zinc-600">(optional)</span></label>
            <input
              type="number"
              step="any"
              value={form.take_profit}
              onChange={e => set('take_profit', e.target.value)}
              placeholder="0.00"
              className="w-full bg-bg-overlay border border-border rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-accent placeholder:text-zinc-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Fees / Commissions</label>
            <input
              type="number"
              step="any"
              min="0"
              value={form.fees}
              onChange={e => set('fees', e.target.value)}
              placeholder="0.00"
              className="w-full bg-bg-overlay border border-border rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-accent placeholder:text-zinc-600"
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Setup Tags</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTagDropdown(!showTagDropdown)}
              className="w-full bg-bg-overlay border border-border rounded-lg px-3 py-2 text-sm text-zinc-400 text-left hover:border-accent/50 focus:outline-none focus:border-accent transition-colors flex items-center justify-between"
            >
              <span className="flex flex-wrap gap-1">
                {selectedTags.length === 0 ? 'Add tags...' : selectedTags.map(t => (
                  <TagBadge key={t.id} tag={t} onRemove={() => toggleTag(t.id)} />
                ))}
              </span>
              <ChevronDown size={14} className="shrink-0 ml-2" />
            </button>

            {showTagDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-bg-elevated border border-border rounded-xl shadow-xl z-20 p-2">
                <input
                  value={tagSearch}
                  onChange={e => setTagSearch(e.target.value)}
                  placeholder="Search or create..."
                  className="w-full bg-bg-overlay border border-border rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-accent placeholder:text-zinc-600 mb-2"
                  autoFocus
                />
                <div className="max-h-36 overflow-y-auto space-y-0.5">
                  {filteredTags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => { toggleTag(tag.id); setShowTagDropdown(false); setTagSearch(''); }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg-overlay text-left transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                      <span className="text-sm text-zinc-300">{tag.name}</span>
                    </button>
                  ))}
                  {filteredTags.length === 0 && !tagSearch && (
                    <p className="text-xs text-zinc-600 px-2 py-1">No more tags to add</p>
                  )}
                </div>
                {/* Create new tag */}
                {tagSearch && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <input
                        value={tagSearch}
                        onChange={e => { setTagSearch(e.target.value); setNewTagName(e.target.value); }}
                        placeholder="New tag name"
                        className="flex-1 bg-bg-overlay border border-border rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-accent"
                      />
                      <div className="flex gap-1">
                        {TAG_COLORS.slice(0, 5).map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewTagColor(c)}
                            className={`w-5 h-5 rounded-full transition-transform ${newTagColor === c ? 'scale-125 ring-2 ring-white/30' : ''}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={async () => { setNewTagName(tagSearch); await createTag(); setTagSearch(''); setShowTagDropdown(false); }}
                        className="flex items-center gap-1 px-2 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs rounded-lg font-medium transition-colors"
                      >
                        <Plus size={12} /> Create
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Setup rationale, market context, emotional state..."
            rows={3}
            className="w-full bg-bg-overlay border border-border rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-accent placeholder:text-zinc-600 resize-none"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:border-border-strong transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-all disabled:opacity-50 shadow-lg shadow-accent/25"
          >
            {loading ? 'Saving...' : 'Open Trade'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
