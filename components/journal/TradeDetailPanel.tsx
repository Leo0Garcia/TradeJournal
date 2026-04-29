'use client';

import { useState } from 'react';
import { X, LogOut, Trash2, ChevronRight, ArrowUpRight, ArrowDownRight, Pencil, Check } from 'lucide-react';
import TagBadge from '@/components/ui/TagBadge';
import { formatCurrency, formatDateTime, formatDate, pnlColor, cn } from '@/lib/utils';
import type { Trade, Tag } from '@/types';

interface Props {
  trade: Trade | null;
  allTags: Tag[];
  onClose: () => void;
  onAddExit: (trade: Trade) => void;
  onDelete: (trade: Trade) => void;
  onTagsChange: (tradeId: string, tagIds: string[]) => void;
  onNotesChange: (tradeId: string, notes: string) => void;
  onRefresh?: () => void;
}

interface ExitEditForm {
  exit_price: string;
  size: string;
  pnl: string;
  notes: string;
  exit_date: string;
}

export default function TradeDetailPanel({ trade, allTags, onClose, onAddExit, onDelete, onTagsChange, onNotesChange, onRefresh }: Props) {
  const [notes, setNotes] = useState(trade?.notes ?? '');
  const [notesSaved, setNotesSaved] = useState(false);
  const [editingExitId, setEditingExitId] = useState<string | null>(null);
  const [exitForm, setExitForm] = useState<ExitEditForm>({ exit_price: '', size: '', pnl: '', notes: '', exit_date: '' });
  const [savingExit, setSavingExit] = useState(false);

  if (!trade) return null;

  const DirIcon = trade.direction === 'long' ? ArrowUpRight : ArrowDownRight;

  async function saveNotes() {
    onNotesChange(trade!.id, notes);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 1500);
  }

  function toggleTag(tagId: string) {
    const current = trade!.tags.map(t => t.id);
    const next = current.includes(tagId)
      ? current.filter(id => id !== tagId)
      : [...current, tagId];
    onTagsChange(trade!.id, next);
  }

  function startEditExit(exit: Trade['exits'][0]) {
    setEditingExitId(exit.id);
    setExitForm({
      exit_price: String(exit.exit_price),
      size: String(exit.size),
      pnl: String(exit.pnl),
      notes: exit.notes ?? '',
      exit_date: exit.exit_date.slice(0, 16), // datetime-local format
    });
  }

  async function saveExitEdit(exitId: string) {
    setSavingExit(true);
    await fetch(`/api/trades/${trade!.id}/exits/${exitId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exit_price: parseFloat(exitForm.exit_price),
        size: parseFloat(exitForm.size),
        pnl: parseFloat(exitForm.pnl),
        notes: exitForm.notes,
        exit_date: exitForm.exit_date,
      }),
    });
    setSavingExit(false);
    setEditingExitId(null);
    onRefresh?.();
  }

  const tradeTagIds = trade.tags.map(t => t.id);
  const availableTags = allTags.filter(t => !tradeTagIds.includes(t.id));

  const inputCls = 'w-full bg-bg-base border border-border rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-accent';

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end animate-fade-in"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm sm:max-w-md h-full bg-bg-elevated border-l border-border overflow-y-auto animate-slide-up flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border sticky top-0 bg-bg-elevated z-10">
          <div>
            <div className="flex items-center gap-2">
              <DirIcon size={18} className={trade.direction === 'long' ? 'text-profit' : 'text-loss'} />
              <span className="text-lg font-bold text-zinc-100">{trade.symbol}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                trade.status === 'open' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-700/50 text-zinc-400'
              }`}>
                {trade.status}
              </span>
            </div>
            <div className="text-xs text-zinc-500 mt-1">{formatDate(trade.trade_date)}</div>
          </div>
          <div className="flex items-center gap-1">
            {trade.status === 'open' && (
              <button
                onClick={() => onAddExit(trade)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg transition-colors"
              >
                <LogOut size={12} /> Exit
              </button>
            )}
            <button
              onClick={() => { onDelete(trade); onClose(); }}
              className="p-1.5 text-zinc-600 hover:text-loss hover:bg-loss-muted rounded-lg transition-colors"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-bg-overlay rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* P&L */}
          <div className={cn(
            'rounded-xl p-4 border',
            trade.net_pnl > 0 ? 'bg-profit-muted border-profit/20'
            : trade.net_pnl < 0 ? 'bg-loss-muted border-loss/20'
            : 'bg-bg-overlay border-border'
          )}>
            <div className="text-xs text-zinc-400 mb-1">Net P&L</div>
            <div className={cn('text-3xl font-bold font-mono', pnlColor(trade.net_pnl))}>
              {trade.net_pnl >= 0 ? '+' : ''}{formatCurrency(trade.net_pnl)}
            </div>
            {trade.fees > 0 && (
              <div className="text-xs text-zinc-500 mt-1">
                Gross: {formatCurrency(trade.gross_pnl)} · Fees: {formatCurrency(trade.fees)}
              </div>
            )}
          </div>

          {/* Trade details */}
          <div className="bg-bg-overlay rounded-xl border border-border p-4 space-y-2.5">
            <Row label="Direction" value={
              <span className={trade.direction === 'long' ? 'text-profit font-semibold' : 'text-loss font-semibold'}>
                {trade.direction === 'long' ? '▲ Long' : '▼ Short'}
              </span>
            } />
            <Row label="Entry Price" value={<span className="font-mono">{trade.entry_price.toLocaleString()}</span>} />
            <Row label="Initial Size" value={<span className="font-mono">{trade.initial_size}</span>} />
            {trade.remaining_size > 0 && (
              <Row label="Remaining" value={<span className="font-mono text-blue-400">{trade.remaining_size}</span>} />
            )}
            {trade.stop_loss != null && (
              <Row label="Stop Loss" value={<span className="font-mono text-loss">{trade.stop_loss.toLocaleString()}</span>} />
            )}
            {trade.take_profit != null && (
              <Row label="Take Profit" value={<span className="font-mono text-profit">{trade.take_profit.toLocaleString()}</span>} />
            )}
            {trade.closed_at && (
              <Row label="Closed" value={<span className="text-zinc-400">{formatDateTime(trade.closed_at)}</span>} />
            )}
          </div>

          {/* Exits */}
          {trade.exits.length > 0 && (
            <div>
              <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Exits</div>
              <div className="space-y-2">
                {trade.exits.map((exit, i) => (
                  <div key={exit.id} className="bg-bg-overlay rounded-xl border border-border p-3">
                    {editingExitId === exit.id ? (
                      /* ── Edit mode ── */
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-zinc-500 mb-1">Exit Price</label>
                            <input
                              type="number" step="any"
                              value={exitForm.exit_price}
                              onChange={e => setExitForm(f => ({ ...f, exit_price: e.target.value }))}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-zinc-500 mb-1">Size</label>
                            <input
                              type="number" step="any" min="0"
                              value={exitForm.size}
                              onChange={e => setExitForm(f => ({ ...f, size: e.target.value }))}
                              className={inputCls}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">P&L (override)</label>
                          <input
                            type="number" step="any"
                            value={exitForm.pnl}
                            onChange={e => setExitForm(f => ({ ...f, pnl: e.target.value }))}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Notes</label>
                          <input
                            value={exitForm.notes}
                            onChange={e => setExitForm(f => ({ ...f, notes: e.target.value }))}
                            className={inputCls}
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => setEditingExitId(null)}
                            className="flex-1 py-1.5 border border-border rounded-lg text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveExitEdit(exit.id)}
                            disabled={savingExit}
                            className="flex-1 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40 flex items-center justify-center gap-1"
                          >
                            <Check size={11} /> {savingExit ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── View mode ── */
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-600">#{i + 1}</span>
                            <ChevronRight size={12} className="text-zinc-600" />
                            <span className="text-sm font-mono text-zinc-200">{exit.exit_price.toLocaleString()}</span>
                            <span className="text-xs text-zinc-500">× {exit.size}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn('text-sm font-mono font-semibold', pnlColor(exit.pnl))}>
                              {exit.pnl >= 0 ? '+' : ''}{formatCurrency(exit.pnl)}
                            </span>
                            <button
                              onClick={() => startEditExit(exit)}
                              className="p-1 text-zinc-600 hover:text-zinc-300 hover:bg-bg-elevated rounded transition-colors"
                              title="Edit exit"
                            >
                              <Pencil size={11} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-zinc-600">{formatDateTime(exit.exit_date)}</span>
                          {exit.notes && <span className="text-xs text-zinc-500 italic">{exit.notes}</span>}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Setup Tags</div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {trade.tags.map(tag => (
                <TagBadge key={tag.id} tag={tag} onRemove={() => toggleTag(tag.id)} size="md" />
              ))}
              {trade.tags.length === 0 && (
                <span className="text-xs text-zinc-600">No tags added</span>
              )}
            </div>
            {availableTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className="text-xs px-2 py-0.5 rounded-full border border-dashed border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    + {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Notes</div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Add your trade notes..."
              rows={4}
              className="w-full bg-bg-overlay border border-border rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-accent placeholder:text-zinc-600 resize-none"
            />
            {notesSaved && <p className="text-xs text-profit mt-1">Saved</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-xs">{value}</span>
    </div>
  );
}
