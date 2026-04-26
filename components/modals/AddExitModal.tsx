'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/utils';
import type { Trade, NewExitInput } from '@/types';

interface Props {
  trade: Trade | null;
  open: boolean;
  onClose: () => void;
  onSave: (tradeId: string, data: NewExitInput) => Promise<void>;
}

const NOW = () => new Date().toISOString().slice(0, 16);

export default function AddExitModal({ trade, open, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    exit_price: '',
    size: '',
    exit_date: NOW(),
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  if (!trade) return null;

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  const exitSize = parseFloat(form.size) || 0;
  const exitPrice = parseFloat(form.exit_price) || 0;
  const dirMultiplier = trade.direction === 'long' ? 1 : -1;
  const estimatedPnl = exitSize > 0 && exitPrice > 0
    ? (exitPrice - trade.entry_price) * exitSize * dirMultiplier
    : null;

  const isFinalExit = exitSize >= trade.remaining_size;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.exit_price || !form.size || !trade) return;
    setLoading(true);
    try {
      await onSave(trade.id, {
        exit_price: parseFloat(form.exit_price),
        size: parseFloat(form.size),
        exit_date: form.exit_date,
        notes: form.notes,
      });
      onClose();
      setForm({ exit_price: '', size: '', exit_date: NOW(), notes: '' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Exit"
      subtitle={`${trade.symbol} ${trade.direction.toUpperCase()} — ${trade.remaining_size} contracts remaining`}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Trade summary */}
        <div className="bg-bg-overlay rounded-xl p-3 border border-border">
          <div className="flex justify-between text-xs">
            <div className="text-zinc-500">Entry</div>
            <div className="font-mono text-zinc-300">{trade.entry_price.toLocaleString()}</div>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <div className="text-zinc-500">Remaining size</div>
            <div className="font-mono text-zinc-300">{trade.remaining_size}</div>
          </div>
          {trade.exits.length > 0 && (
            <div className="flex justify-between text-xs mt-1">
              <div className="text-zinc-500">Realized so far</div>
              <div className={`font-mono ${trade.gross_pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                {formatCurrency(trade.gross_pnl)}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Exit Price</label>
            <input
              type="number"
              step="any"
              value={form.exit_price}
              onChange={e => set('exit_price', e.target.value)}
              required
              placeholder="0.00"
              className="w-full bg-bg-overlay border border-border rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-accent placeholder:text-zinc-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Exit Size
              <button
                type="button"
                onClick={() => set('size', String(trade.remaining_size))}
                className="ml-1 text-accent hover:text-accent-light text-[11px] font-normal"
              >
                (full)
              </button>
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              max={trade.remaining_size}
              value={form.size}
              onChange={e => set('size', e.target.value)}
              required
              placeholder="1"
              className="w-full bg-bg-overlay border border-border rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-accent placeholder:text-zinc-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Date & Time</label>
          <input
            type="datetime-local"
            value={form.exit_date}
            onChange={e => set('exit_date', e.target.value)}
            required
            className="w-full bg-bg-overlay border border-border rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-accent"
          />
        </div>

        {/* P&L preview */}
        {estimatedPnl !== null && (
          <div className={`rounded-xl p-3 border ${estimatedPnl >= 0 ? 'bg-profit-muted border-profit/20' : 'bg-loss-muted border-loss/20'}`}>
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-400">Estimated P&L (excl. fees)</span>
              <span className={`font-mono font-bold text-sm ${estimatedPnl >= 0 ? 'text-profit-text' : 'text-loss-text'}`}>
                {estimatedPnl >= 0 ? '+' : ''}{formatCurrency(estimatedPnl)}
              </span>
            </div>
            {isFinalExit && (
              <div className="text-xs text-zinc-500 mt-1">This will close the trade</div>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Notes <span className="text-zinc-600">(optional)</span></label>
          <input
            type="text"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Target hit, reversal signal..."
            className="w-full bg-bg-overlay border border-border rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-accent placeholder:text-zinc-600"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shadow-lg ${
              isFinalExit
                ? 'bg-accent hover:bg-accent-hover text-white shadow-accent/25'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25'
            }`}
          >
            {loading ? 'Saving...' : isFinalExit ? 'Close Trade' : 'Add Partial Exit'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
