'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, ChevronDown, ArrowUpRight, ArrowDownRight, X } from 'lucide-react';
import TagBadge from '@/components/ui/TagBadge';
import NewTradeModal from '@/components/modals/NewTradeModal';
import AddExitModal from '@/components/modals/AddExitModal';
import TradeDetailPanel from '@/components/journal/TradeDetailPanel';
import { formatCurrency, formatDate, pnlColor, cn } from '@/lib/utils';
import { useAccount } from '@/contexts/AccountContext';
import type { Trade, Tag, Instrument, NewTradeInput, NewExitInput } from '@/types';

type SortKey = 'trade_date' | 'symbol' | 'net_pnl' | 'initial_size';
type SortDir = 'asc' | 'desc';

export default function JournalPage() {
  const { accountParams, selection, accounts, loaded, mustSelectAccount } = useAccount();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [showNewTrade, setShowNewTrade] = useState(false);
  const [exitTrade, setExitTrade] = useState<Trade | null>(null);
  const [detailTrade, setDetailTrade] = useState<Trade | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [symbolFilter, setSymbolFilter] = useState('all');
  const [dirFilter, setDirFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>('trade_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const accountParamsStr = accountParams.toString();

  const load = useCallback(async () => {
    const params = new URLSearchParams(accountParamsStr);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (symbolFilter !== 'all') params.set('symbol', symbolFilter);
    if (dirFilter !== 'all') params.set('direction', dirFilter);
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);

    const [tradesData, tagsData, instrData] = await Promise.all([
      fetch(`/api/trades?${params}`).then(r => r.json()),
      fetch('/api/tags').then(r => r.json()),
      fetch('/api/instruments').then(r => r.json()),
    ]);
    setTrades(tradesData);
    setAllTags(tagsData);
    setInstruments(instrData);
  }, [accountParamsStr, statusFilter, symbolFilter, dirFilter, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  async function handleNewTrade(input: NewTradeInput) {
    await fetch('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    await load();
  }

  async function handleAddExit(tradeId: string, input: NewExitInput) {
    await fetch(`/api/trades/${tradeId}/exits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    await load();
  }

  async function handleDelete(trade: Trade) {
    if (!confirm(`Delete ${trade.symbol} trade?`)) return;
    await fetch(`/api/trades/${trade.id}`, { method: 'DELETE' });
    setDetailTrade(null);
    await load();
  }

  async function handleTagsChange(tradeId: string, tagIds: string[]) {
    await fetch(`/api/trades/${tradeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_ids: tagIds }),
    });
    await load();
    if (detailTrade?.id === tradeId) {
      const updated = await fetch(`/api/trades/${tradeId}`).then(r => r.json());
      setDetailTrade(updated);
    }
  }

  async function handleNotesChange(tradeId: string, notes: string) {
    await fetch(`/api/trades/${tradeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  // Client-side search & tag filter
  let filtered = trades.filter(t => {
    if (search && !t.symbol.toLowerCase().includes(search.toLowerCase()) &&
      !t.notes.toLowerCase().includes(search.toLowerCase())) return false;
    if (tagFilter !== 'all' && !t.tags.some(tag => tag.id === tagFilter)) return false;
    return true;
  });

  // Sort
  filtered = [...filtered].sort((a, b) => {
    let av: number | string = a[sortKey] as number | string;
    let bv: number | string = b[sortKey] as number | string;
    if (sortKey === 'trade_date') {
      av = a.trade_date; bv = b.trade_date;
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const symbols = Array.from(new Set(trades.map(t => t.symbol))).sort();
  const activeFilters = [statusFilter, symbolFilter, dirFilter, tagFilter].filter(f => f !== 'all').length
    + (fromDate ? 1 : 0) + (toDate ? 1 : 0);

  function clearFilters() {
    setStatusFilter('all'); setSymbolFilter('all'); setDirFilter('all');
    setTagFilter('all'); setFromDate(''); setToDate(''); setSearch('');
  }

  function SortHeader({ label, field }: { label: string; field: SortKey }) {
    const active = sortKey === field;
    return (
      <button
        onClick={() => toggleSort(field)}
        className={cn(
          'flex items-center gap-1 text-xs font-medium uppercase tracking-wider transition-colors',
          active ? 'text-accent-light' : 'text-zinc-500 hover:text-zinc-300'
        )}
      >
        {label}
        <ChevronDown size={12} className={cn('transition-transform', active && sortDir === 'asc' ? 'rotate-180' : '')} />
      </button>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Trade Journal</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{filtered.length} of {trades.length} trades</p>
        </div>
        <div className="relative group">
          <button
            onClick={() => !mustSelectAccount && setShowNewTrade(true)}
            disabled={mustSelectAccount}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-accent/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <Plus size={15} /> New Trade
          </button>
          {mustSelectAccount && loaded && (
            <div className="absolute right-0 top-full mt-2 w-52 px-3 py-2 bg-bg-elevated border border-border rounded-xl text-xs text-zinc-400 shadow-xl z-10 hidden group-hover:block">
              {accounts.length === 0 ? 'Create an account in Settings first' : 'Select a specific account first'}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-bg-surface border border-border rounded-xl p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search symbol or notes..."
              className="w-full pl-9 pr-3 py-2 bg-bg-overlay border border-border rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-accent placeholder:text-zinc-600"
            />
          </div>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-bg-overlay border border-border rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-accent"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>

          {/* Symbol */}
          <select
            value={symbolFilter}
            onChange={e => setSymbolFilter(e.target.value)}
            className="bg-bg-overlay border border-border rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-accent"
          >
            <option value="all">All Symbols</option>
            {symbols.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Direction */}
          <select
            value={dirFilter}
            onChange={e => setDirFilter(e.target.value)}
            className="bg-bg-overlay border border-border rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-accent"
          >
            <option value="all">Both Directions</option>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>

          {/* Tag filter */}
          <select
            value={tagFilter}
            onChange={e => setTagFilter(e.target.value)}
            className="bg-bg-overlay border border-border rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-accent"
          >
            <option value="all">All Tags</option>
            {allTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          {/* Date range */}
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="bg-bg-overlay border border-border rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-accent"
          />
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="bg-bg-overlay border border-border rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-accent"
          />

          {activeFilters > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-100 bg-bg-overlay border border-border rounded-lg transition-colors"
            >
              <X size={12} /> Clear ({activeFilters})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left"><SortHeader label="Date" field="trade_date" /></th>
                <th className="px-4 py-3 text-left"><SortHeader label="Symbol" field="symbol" /></th>
                <th className="px-4 py-3 text-left">
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Dir</span>
                </th>
                <th className="px-4 py-3 text-right">
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Entry</span>
                </th>
                <th className="px-4 py-3 text-right">
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Exit(s)</span>
                </th>
                <th className="px-4 py-3 text-right"><SortHeader label="Size" field="initial_size" /></th>
                <th className="px-4 py-3 text-left">
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Tags</span>
                </th>
                <th className="px-4 py-3 text-right"><SortHeader label="P&L" field="net_pnl" /></th>
                <th className="px-4 py-3 text-center">
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Status</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-zinc-600">
                    {trades.length === 0 ? 'No trades yet. Log your first trade!' : 'No trades match your filters.'}
                  </td>
                </tr>
              )}
              {filtered.map(trade => (
                <tr
                  key={trade.id}
                  onClick={() => setDetailTrade(trade)}
                  className="hover:bg-bg-elevated cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3 text-sm text-zinc-400 whitespace-nowrap">
                    {formatDate(trade.trade_date)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-zinc-100">{trade.symbol}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {trade.direction === 'long'
                        ? <ArrowUpRight size={14} className="text-profit" />
                        : <ArrowDownRight size={14} className="text-loss" />
                      }
                      <span className={`text-xs font-semibold ${trade.direction === 'long' ? 'text-profit' : 'text-loss'}`}>
                        {trade.direction === 'long' ? 'L' : 'S'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-mono text-zinc-300">{trade.entry_price.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {trade.exits.length === 0 ? (
                      <span className="text-xs text-zinc-600">—</span>
                    ) : trade.exits.length === 1 ? (
                      <span className="text-sm font-mono text-zinc-300">{trade.exits[0].exit_price.toLocaleString()}</span>
                    ) : (
                      <span className="text-xs text-zinc-400">{trade.exits.length} exits</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-mono text-zinc-400">{trade.initial_size}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {trade.tags.slice(0, 2).map(tag => <TagBadge key={tag.id} tag={tag} />)}
                      {trade.tags.length > 2 && (
                        <span className="text-xs text-zinc-600">+{trade.tags.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {trade.status === 'open' ? (
                      <button
                        onClick={e => { e.stopPropagation(); setExitTrade(trade); }}
                        className="text-xs px-2 py-1 bg-accent/20 hover:bg-accent/30 text-accent-light rounded-lg transition-colors font-medium"
                      >
                        + Exit
                      </button>
                    ) : (
                      <span className={cn('text-sm font-mono font-bold', pnlColor(trade.net_pnl))}>
                        {trade.net_pnl >= 0 ? '+' : ''}{formatCurrency(trade.net_pnl)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      trade.status === 'open'
                        ? 'bg-blue-500/20 text-blue-400'
                        : trade.net_pnl > 0
                        ? 'bg-profit-muted text-profit-text'
                        : trade.net_pnl < 0
                        ? 'bg-loss-muted text-loss-text'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {trade.status === 'open' ? 'Open' : trade.net_pnl > 0 ? 'Win' : 'Loss'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <NewTradeModal open={showNewTrade} onClose={() => setShowNewTrade(false)} onSave={handleNewTrade} />
      <AddExitModal
        trade={exitTrade}
        open={!!exitTrade}
        onClose={() => setExitTrade(null)}
        onSave={handleAddExit}
        pointValue={exitTrade ? (instruments.find(i => i.symbol === exitTrade.symbol)?.point_value ?? 1) : 1}
      />
      {detailTrade && (
        <TradeDetailPanel
          trade={detailTrade}
          allTags={allTags}
          onClose={() => setDetailTrade(null)}
          onAddExit={t => { setDetailTrade(null); setExitTrade(t); }}
          onDelete={handleDelete}
          onTagsChange={handleTagsChange}
          onNotesChange={handleNotesChange}
        />
      )}
    </div>
  );
}
