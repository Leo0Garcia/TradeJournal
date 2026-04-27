'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Activity,
  Target, ArrowUpRight, ArrowDownRight, Plus, RefreshCw
} from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import TagBadge from '@/components/ui/TagBadge';
import NewTradeModal from '@/components/modals/NewTradeModal';
import AddExitModal from '@/components/modals/AddExitModal';
import TradeDetailPanel from '@/components/journal/TradeDetailPanel';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatCurrency, formatPercent, pnlColor, cn } from '@/lib/utils';
import { useAccount } from '@/contexts/AccountContext';
import type { DashboardStats, Trade, Tag, PnLByDay, NewTradeInput, NewExitInput } from '@/types';

interface AnalyticsData {
  stats: DashboardStats;
  equityCurve: PnLByDay[];
}

export default function DashboardPage() {
  const { accountParams, selection, accounts, loaded, mustSelectAccount } = useAccount();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showNewTrade, setShowNewTrade] = useState(false);
  const [exitTrade, setExitTrade] = useState<Trade | null>(null);
  const [detailTrade, setDetailTrade] = useState<Trade | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const accountParamsStr = accountParams.toString();

  const load = useCallback(async () => {
    const ap = accountParamsStr ? `&${accountParamsStr}` : '';
    const [analytics, open, recent, tags] = await Promise.all([
      fetch(`/api/analytics?${accountParamsStr}`).then(r => r.json()),
      fetch(`/api/trades?status=open${ap}`).then(r => r.json()),
      fetch(`/api/trades?status=closed${ap}`).then(r => r.json()),
      fetch('/api/tags').then(r => r.json()),
    ]);
    setData(analytics);
    setOpenTrades(open);
    setRecentTrades(recent.slice(0, 10));
    setAllTags(tags);
  }, [accountParamsStr]);

  useEffect(() => { load(); }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

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

  async function handleTagsChange(tradeId: string, tagIds: string[]) {
    await fetch(`/api/trades/${tradeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_ids: tagIds }),
    });
    await load();
  }

  async function handleNotesChange(tradeId: string, notes: string) {
    await fetch(`/api/trades/${tradeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
  }

  async function handleDelete(trade: Trade) {
    if (!confirm(`Delete ${trade.symbol} trade?`)) return;
    await fetch(`/api/trades/${trade.id}`, { method: 'DELETE' });
    await load();
  }

  const stats = data?.stats;
  const curve = data?.equityCurve ?? [];

  // Account balance section
  const relevantAccounts = selection.type === 'account'
    ? accounts.filter(a => a.id === selection.id)
    : accounts.filter(a => a.account_type === selection.accountType);
  const accountsWithSize = relevantAccounts.filter(a => a.account_size != null);
  const totalStarting = accountsWithSize.reduce((s, a) => s + (a.account_size ?? 0), 0);
  const totalPnl = stats?.totalPnl ?? 0;
  const currentBalance = totalStarting + totalPnl;
  const pnlPct = totalStarting > 0 ? (totalPnl / totalStarting) * 100 : null;
  const showBalanceCard = accountsWithSize.length > 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className={cn(
              'p-2 rounded-lg border border-border text-zinc-400 hover:text-zinc-100 hover:bg-bg-elevated transition-all',
              refreshing && 'animate-spin'
            )}
          >
            <RefreshCw size={15} />
          </button>
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
      </div>

      {/* Account balance card */}
      {showBalanceCard && (
        <div className="mb-6 bg-bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold text-zinc-200">Account Balance</div>
              <div className="text-xs text-zinc-500 mt-0.5">
                {selection.type === 'account'
                  ? relevantAccounts[0]?.name
                  : `All ${selection.accountType.charAt(0).toUpperCase() + selection.accountType.slice(1)} · ${accountsWithSize.length} account${accountsWithSize.length !== 1 ? 's' : ''}`}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold font-mono text-zinc-100">{formatCurrency(currentBalance, true)}</div>
              <div className={cn('text-sm font-mono font-semibold', totalPnl >= 0 ? 'text-profit-text' : 'text-loss-text')}>
                {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
                {pnlPct !== null && <span className="text-xs ml-1 opacity-75">({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)</span>}
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="relative">
            <div className="w-full h-2 bg-bg-overlay rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', totalPnl >= 0 ? 'bg-profit' : 'bg-loss')}
                style={{ width: `${Math.min(100, Math.abs(pnlPct ?? 0))}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[11px] text-zinc-600">
              <span>Starting: {formatCurrency(totalStarting, true)}</span>
              <span>Current: {formatCurrency(currentBalance, true)}</span>
            </div>
          </div>
          {/* Per-account breakdown when viewing a group */}
          {selection.type === 'account_type' && accountsWithSize.length > 1 && (
            <div className="mt-3 pt-3 border-t border-border space-y-1.5">
              {accountsWithSize.map(a => (
                <div key={a.id} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">{a.name}{a.broker ? ` · ${a.broker}` : ''}</span>
                  <span className="text-zinc-400 font-mono">{formatCurrency(a.account_size ?? 0, true)} starting</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Today's P&L"
          value={stats ? formatCurrency(stats.todayPnl) : '—'}
          sub={stats ? `${stats.todayTrades} trades · ${stats.todayWins}W` : ''}
          icon={DollarSign}
          trend={stats ? (stats.todayPnl >= 0 ? 'up' : 'down') : 'neutral'}
          accent
        />
        <StatCard
          label="Win Rate"
          value={stats ? formatPercent(stats.winRate) : '—'}
          sub={stats ? `${stats.totalTrades} closed trades` : ''}
          icon={Target}
          trend={stats ? (stats.winRate >= 50 ? 'up' : 'down') : 'neutral'}
        />
        <StatCard
          label="Avg R:R"
          value={stats ? (stats.avgRR === 0 ? '—' : stats.avgRR.toFixed(2) + 'R') : '—'}
          sub={stats && stats.avgRR === 0 ? 'No SL data to calculate R' : 'Avg R multiple (SL-based)'}
          icon={Activity}
        />
        <StatCard
          label="Total P&L"
          value={stats ? formatCurrency(stats.totalPnl, true) : '—'}
          sub={stats ? `Max DD: ${formatCurrency(stats.maxDrawdown, true)}` : ''}
          icon={TrendingUp}
          trend={stats ? (stats.totalPnl >= 0 ? 'up' : 'down') : 'neutral'}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatCard label="Week P&L" value={stats ? formatCurrency(stats.weekPnl) : '—'} trend={stats ? (stats.weekPnl >= 0 ? 'up' : 'down') : 'neutral'} />
        <StatCard label="Largest Win" value={stats ? formatCurrency(stats.largestWin) : '—'} icon={ArrowUpRight} trend="up" />
        <StatCard label="Largest Loss" value={stats ? formatCurrency(stats.largestLoss) : '—'} icon={ArrowDownRight} trend="down" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Equity curve */}
        <div className="col-span-2 bg-bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-zinc-200">Equity Curve</div>
            <div className="text-xs text-zinc-500">{curve.length} trading days</div>
          </div>
          {curve.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-zinc-600 text-sm">
              No closed trades yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={curve}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={d => {
                    const date = new Date(d);
                    return (date.getMonth() + 1) + '/' + date.getDate();
                  }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => formatCurrency(v, true)}
                  width={55}
                />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: 12 }}
                  labelStyle={{ color: '#a1a1aa' }}
                  formatter={(value: number) => [formatCurrency(value), 'Cumulative P&L']}
                />
                <ReferenceLine y={0} stroke="#27272a" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#7c3aed' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Open positions */}
        <div className="bg-bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-zinc-200">Open Positions</div>
            {openTrades.length > 0 && (
              <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full font-medium">
                {openTrades.length}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {openTrades.length === 0 ? (
              <div className="text-xs text-zinc-600 text-center py-6">No open positions</div>
            ) : (
              openTrades.map(trade => (
                <button
                  key={trade.id}
                  onClick={() => setDetailTrade(trade)}
                  className="w-full flex items-center justify-between p-3 bg-bg-elevated rounded-xl border border-border hover:border-accent/40 transition-all text-left"
                >
                  <div className="flex items-center gap-2">
                    {trade.direction === 'long'
                      ? <ArrowUpRight size={14} className="text-profit" />
                      : <ArrowDownRight size={14} className="text-loss" />
                    }
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">{trade.symbol}</div>
                      <div className="text-xs text-zinc-500 font-mono">{trade.remaining_size} left</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono text-zinc-400">{trade.entry_price.toLocaleString()}</div>
                    <button
                      onClick={e => { e.stopPropagation(); setExitTrade(trade); }}
                      className="text-[11px] text-accent hover:text-accent-light mt-0.5 transition-colors"
                    >
                      Add exit
                    </button>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent trades */}
      <div className="mt-4 bg-bg-surface border border-border rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="text-sm font-semibold text-zinc-200">Recent Trades</div>
          <a href="/journal" className="text-xs text-accent hover:text-accent-light transition-colors">View all →</a>
        </div>
        <div className="divide-y divide-border">
          {recentTrades.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-zinc-600">
              No closed trades yet. Log your first trade!
            </div>
          ) : (
            recentTrades.map(trade => (
              <button
                key={trade.id}
                onClick={() => setDetailTrade(trade)}
                className="w-full flex items-center gap-4 px-5 py-3 hover:bg-bg-elevated transition-colors text-left"
              >
                <div className={`text-sm font-bold ${trade.direction === 'long' ? 'text-profit' : 'text-loss'} w-12`}>
                  {trade.direction === 'long' ? 'LONG' : 'SHORT'}
                </div>
                <div className="font-semibold text-zinc-100 w-20">{trade.symbol}</div>
                <div className="font-mono text-sm text-zinc-400 flex-1">
                  {trade.entry_price.toLocaleString()} → {trade.exits.length > 0 ? trade.exits[trade.exits.length - 1].exit_price.toLocaleString() : '—'}
                </div>
                <div className="flex flex-wrap gap-1 flex-1">
                  {trade.tags.slice(0, 3).map(tag => <TagBadge key={tag.id} tag={tag} />)}
                </div>
                <div className={cn('font-mono font-bold text-sm w-24 text-right', pnlColor(trade.net_pnl))}>
                  {trade.net_pnl >= 0 ? '+' : ''}{formatCurrency(trade.net_pnl)}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      <NewTradeModal open={showNewTrade} onClose={() => setShowNewTrade(false)} onSave={handleNewTrade} />
      <AddExitModal
        trade={exitTrade}
        open={!!exitTrade}
        onClose={() => setExitTrade(null)}
        onSave={handleAddExit}
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
