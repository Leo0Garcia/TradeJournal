import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { DashboardStats, PnLByTicker, PnLByDay, TagPerformance, Tag } from '@/types';

export async function GET() {
  const supabase = createClient();

  // Fetch all closed trades with exits and tags
  const { data: rawTrades, error } = await supabase
    .from('trades')
    .select('*, exits(*), trade_tags(tags(*))')
    .eq('status', 'closed')
    .order('trade_date', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const trades = (rawTrades ?? []).map(t => ({
    ...t,
    net_pnl: parseFloat(String(t.net_pnl)),
    gross_pnl: parseFloat(String(t.gross_pnl)),
    tags: ((t.trade_tags as { tags: Tag }[]) ?? []).map(tt => tt.tags).filter(Boolean) as Tag[],
  }));

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const todayTrades = trades.filter(t => t.trade_date.slice(0, 10) === today);
  const weekTrades = trades.filter(t => t.trade_date.slice(0, 10) >= weekAgo);
  const wins = trades.filter(t => t.net_pnl > 0);
  const losses = trades.filter(t => t.net_pnl < 0);

  const totalPnl = trades.reduce((s, t) => s + t.net_pnl, 0);
  const todayPnl = todayTrades.reduce((s, t) => s + t.net_pnl, 0);
  const weekPnl = weekTrades.reduce((s, t) => s + t.net_pnl, 0);

  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.net_pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.net_pnl, 0) / losses.length) : 0;
  const avgRR = avgLoss > 0 ? avgWin / avgLoss : 0;

  const largestWin = wins.length > 0 ? Math.max(...wins.map(t => t.net_pnl)) : 0;
  const largestLoss = losses.length > 0 ? Math.min(...losses.map(t => t.net_pnl)) : 0;

  // Drawdown
  let peak = 0, maxDrawdown = 0, runningPnl = 0;
  for (const t of trades) {
    runningPnl += t.net_pnl;
    if (runningPnl > peak) peak = runningPnl;
    const dd = peak - runningPnl;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }
  const currentDrawdown = peak - totalPnl > 0 ? peak - totalPnl : 0;

  const { count: openTrades } = await supabase
    .from('trades')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'open');

  const stats: DashboardStats = {
    todayPnl,
    todayTrades: todayTrades.length,
    todayWins: todayTrades.filter(t => t.net_pnl > 0).length,
    weekPnl,
    totalPnl,
    totalTrades: trades.length,
    winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
    avgRR,
    largestWin,
    largestLoss,
    currentDrawdown,
    maxDrawdown,
    openTrades: openTrades ?? 0,
  };

  // P&L by ticker
  const tickerMap: Record<string, PnLByTicker> = {};
  for (const t of trades) {
    if (!tickerMap[t.symbol]) tickerMap[t.symbol] = { symbol: t.symbol, pnl: 0, trades: 0, wins: 0 };
    tickerMap[t.symbol].pnl += t.net_pnl;
    tickerMap[t.symbol].trades++;
    if (t.net_pnl > 0) tickerMap[t.symbol].wins++;
  }
  const pnlByTicker = Object.values(tickerMap).sort((a, b) => b.pnl - a.pnl);

  // Equity curve (by day)
  const dayMap: Record<string, number> = {};
  for (const t of trades) {
    const date = t.trade_date.slice(0, 10);
    dayMap[date] = (dayMap[date] ?? 0) + t.net_pnl;
  }
  let cumulative = 0;
  const equityCurve: PnLByDay[] = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, pnl]) => {
      cumulative += pnl;
      return { date, pnl, cumulative };
    });

  // Tag performance
  const tagMap: Record<string, { tag: Tag; trades: number; wins: number; totalPnl: number }> = {};
  for (const trade of trades) {
    for (const tag of trade.tags) {
      if (!tagMap[tag.id]) tagMap[tag.id] = { tag, trades: 0, wins: 0, totalPnl: 0 };
      tagMap[tag.id].trades++;
      tagMap[tag.id].totalPnl += trade.net_pnl;
      if (trade.net_pnl > 0) tagMap[tag.id].wins++;
    }
  }
  const tagPerformance: TagPerformance[] = Object.values(tagMap)
    .map(tp => ({
      ...tp,
      winRate: tp.trades > 0 ? (tp.wins / tp.trades) * 100 : 0,
    }))
    .sort((a, b) => b.totalPnl - a.totalPnl);

  return NextResponse.json({ stats, pnlByTicker, equityCurve, tagPerformance });
}
