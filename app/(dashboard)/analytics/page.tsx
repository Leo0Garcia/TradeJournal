'use client';

import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, AreaChart, Area
} from 'recharts';
import StatCard from '@/components/ui/StatCard';
import { formatCurrency, formatPercent, pnlColor } from '@/lib/utils';
import { useAccount } from '@/contexts/AccountContext';
import type { DashboardStats, PnLByTicker, PnLByDay, TagPerformance } from '@/types';
import { TrendingDown, Calendar, Tag, BarChart2 } from 'lucide-react';

interface AnalyticsData {
  stats: DashboardStats;
  pnlByTicker: PnLByTicker[];
  equityCurve: PnLByDay[];
  tagPerformance: TagPerformance[];
}

const CUSTOM_TOOLTIP_STYLE = {
  contentStyle: {
    background: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '10px',
    fontSize: 12,
    color: '#f4f4f5',
  },
  labelStyle: { color: '#71717a' },
};

export default function AnalyticsPage() {
  const { accountParams } = useAccount();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<'all' | '30d' | '7d'>('all');

  useEffect(() => {
    fetch(`/api/analytics?${accountParams}`).then(r => r.json()).then(setData);
  }, [accountParams]);

  const stats = data?.stats;

  // Filter equity curve by period
  const curve = (() => {
    const raw = data?.equityCurve ?? [];
    if (period === 'all') return raw;
    const days = period === '30d' ? 30 : 7;
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const filtered = raw.filter(d => d.date >= cutoff);
    // Recompute cumulative from 0 for the filtered window
    let cum = 0;
    return filtered.map(d => {
      cum += d.pnl;
      return { ...d, cumulative: cum };
    });
  })();

  // Daily P&L bars
  const dailyBars = curve.map(d => ({
    date: d.date,
    pnl: d.pnl,
  }));

  // Drawdown series
  const drawdownSeries = (() => {
    let peak = 0;
    return curve.map(d => {
      if (d.cumulative > peak) peak = d.cumulative;
      const dd = peak > 0 ? ((peak - d.cumulative) / peak) * 100 : 0;
      return { date: d.date, drawdown: -dd };
    });
  })();

  if (!data) {
    return (
      <div className="p-6 flex items-center justify-center h-96 text-zinc-600">
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Analytics</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{stats?.totalTrades ?? 0} closed trades analyzed</p>
        </div>
        <div className="flex rounded-xl border border-border overflow-hidden">
          {(['7d', '30d', 'all'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                period === p ? 'bg-accent text-white' : 'text-zinc-400 hover:text-zinc-100 bg-bg-surface'
              }`}
            >
              {p === 'all' ? 'All time' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Win Rate"
          value={stats ? formatPercent(stats.winRate) : '—'}
          sub={`${Math.round((stats?.winRate ?? 0) / 100 * (stats?.totalTrades ?? 0))}W / ${Math.round((1 - (stats?.winRate ?? 0) / 100) * (stats?.totalTrades ?? 0))}L`}
          trend={stats ? (stats.winRate >= 50 ? 'up' : 'down') : 'neutral'}
        />
        <StatCard
          label="Avg R:R"
          value={stats ? stats.avgRR.toFixed(2) + 'R' : '—'}
          sub="Realized win/loss"
          trend={stats ? (stats.avgRR >= 1 ? 'up' : 'neutral') : 'neutral'}
        />
        <StatCard
          label="Max Drawdown"
          value={stats ? formatCurrency(stats.maxDrawdown) : '—'}
          sub={`Current: ${formatCurrency(stats?.currentDrawdown ?? 0)}`}
          icon={TrendingDown}
          trend="down"
        />
        <StatCard
          label="Total P&L"
          value={stats ? formatCurrency(stats.totalPnl) : '—'}
          sub={`Largest win: ${formatCurrency(stats?.largestWin ?? 0)}`}
          trend={stats ? (stats.totalPnl >= 0 ? 'up' : 'down') : 'neutral'}
          accent
        />
      </div>

      {/* Equity curve + Drawdown */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          {/* Equity Curve */}
          <div className="bg-bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={14} className="text-accent-light" />
              <span className="text-sm font-semibold text-zinc-200">Equity Curve</span>
            </div>
            {curve.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-zinc-600 text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={curve}>
                  <defs>
                    <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false}
                    tickFormatter={d => { const dt = new Date(d); return (dt.getMonth()+1)+'/'+dt.getDate(); }} />
                  <YAxis tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false}
                    tickFormatter={v => formatCurrency(v, true)} width={55} />
                  <Tooltip {...CUSTOM_TOOLTIP_STYLE} formatter={(v: number) => [formatCurrency(v), 'Cumulative P&L']} />
                  <ReferenceLine y={0} stroke="#27272a" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="cumulative" stroke="#7c3aed" strokeWidth={2}
                    fill="url(#equityGrad)" dot={false} activeDot={{ r: 4, fill: '#7c3aed' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Daily P&L bars */}
          <div className="bg-bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={14} className="text-accent-light" />
              <span className="text-sm font-semibold text-zinc-200">Daily P&L</span>
            </div>
            {dailyBars.length === 0 ? (
              <div className="h-28 flex items-center justify-center text-zinc-600 text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={110}>
                <BarChart data={dailyBars} barSize={18}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false}
                    tickFormatter={d => { const dt = new Date(d); return (dt.getMonth()+1)+'/'+dt.getDate(); }} />
                  <YAxis tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false}
                    tickFormatter={v => formatCurrency(v, true)} width={55} />
                  <Tooltip {...CUSTOM_TOOLTIP_STYLE} formatter={(v: number) => [formatCurrency(v), 'Daily P&L']} />
                  <ReferenceLine y={0} stroke="#27272a" />
                  <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                    {dailyBars.map((entry, i) => (
                      <Cell key={i} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* P&L by Ticker */}
        <div className="bg-bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={14} className="text-accent-light" />
            <span className="text-sm font-semibold text-zinc-200">P&L by Symbol</span>
          </div>
          {(data?.pnlByTicker ?? []).length === 0 ? (
            <div className="h-40 flex items-center justify-center text-zinc-600 text-sm">No data</div>
          ) : (
            <div className="space-y-3">
              {data.pnlByTicker.map(item => (
                <div key={item.symbol}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-zinc-200">{item.symbol}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">{item.wins}/{item.trades}</span>
                      <span className={`text-xs font-mono font-bold ${pnlColor(item.pnl)}`}>
                        {item.pnl >= 0 ? '+' : ''}{formatCurrency(item.pnl, true)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-bg-overlay rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.pnl >= 0 ? 'bg-profit' : 'bg-loss'}`}
                      style={{
                        width: `${Math.min(100, Math.abs(item.pnl) / Math.max(...data.pnlByTicker.map(t => Math.abs(t.pnl))) * 100)}%`
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-zinc-600 mt-0.5">
                    {((item.wins / item.trades) * 100).toFixed(0)}% win rate
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Drawdown chart */}
      <div className="bg-bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown size={14} className="text-loss" />
          <span className="text-sm font-semibold text-zinc-200">Drawdown %</span>
        </div>
        {drawdownSeries.length === 0 ? (
          <div className="h-28 flex items-center justify-center text-zinc-600 text-sm">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={110}>
            <AreaChart data={drawdownSeries}>
              <defs>
                <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false}
                tickFormatter={d => { const dt = new Date(d); return (dt.getMonth()+1)+'/'+dt.getDate(); }} />
              <YAxis tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false}
                tickFormatter={v => v.toFixed(1) + '%'} width={45} />
              <Tooltip {...CUSTOM_TOOLTIP_STYLE} formatter={(v: number) => [Math.abs(v).toFixed(2) + '%', 'Drawdown']} />
              <Area type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={2}
                fill="url(#ddGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tag performance */}
      {(data?.tagPerformance ?? []).length > 0 && (
        <div className="bg-bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Tag size={14} className="text-accent-light" />
            <span className="text-sm font-semibold text-zinc-200">Setup Tag Performance</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.tagPerformance.map(tp => (
              <div key={tp.tag.id} className="bg-bg-overlay rounded-xl border border-border p-4">
                <div
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mb-3 border"
                  style={{
                    backgroundColor: tp.tag.color + '22',
                    color: tp.tag.color,
                    borderColor: tp.tag.color + '44',
                  }}
                >
                  {tp.tag.name}
                </div>
                <div className={`text-xl font-bold font-mono mb-1 ${pnlColor(tp.totalPnl)}`}>
                  {tp.totalPnl >= 0 ? '+' : ''}{formatCurrency(tp.totalPnl, true)}
                </div>
                <div className="text-xs text-zinc-500">
                  {tp.wins}/{tp.trades} wins · {formatPercent(tp.winRate)}
                </div>
                <div className="mt-2 h-1 bg-bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: formatPercent(tp.winRate) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
