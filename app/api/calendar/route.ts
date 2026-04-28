import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface CalendarDay {
  date: string;        // YYYY-MM-DD
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
}

export interface CalendarResponse {
  days: CalendarDay[];
  totalPnl: number;
  totalTrades: number;
  winDays: number;
  lossDays: number;
  bestDay: number;
  worstDay: number;
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('account_id');
  const accountType = searchParams.get('account_type');
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()));
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1)); // 1-based

  // Resolve account IDs
  let accountIds: string[] | null = null;
  if (accountType) {
    const { data: typeAccounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('account_type', accountType);
    accountIds = (typeAccounts ?? []).map((a: { id: string }) => a.id);
    if (accountIds.length === 0) return NextResponse.json(emptyResponse());
  }

  // Build date range for the month
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;

  let query = supabase
    .from('trades')
    .select('trade_date, net_pnl')
    .eq('status', 'closed')
    .gte('trade_date', startDate)
    .lt('trade_date', endMonth)
    .order('trade_date', { ascending: true });

  if (accountId) query = query.eq('account_id', accountId);
  else if (accountIds) query = query.in('account_id', accountIds);

  const { data: rawTrades, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const trades = rawTrades ?? [];

  // Aggregate by date
  const byDate: Record<string, { pnl: number; trades: number; wins: number; losses: number }> = {};
  for (const t of trades) {
    const date = t.trade_date.slice(0, 10);
    if (!byDate[date]) byDate[date] = { pnl: 0, trades: 0, wins: 0, losses: 0 };
    const pnl = parseFloat(String(t.net_pnl));
    byDate[date].pnl += pnl;
    byDate[date].trades += 1;
    if (pnl > 0) byDate[date].wins += 1;
    else if (pnl < 0) byDate[date].losses += 1;
  }

  const days: CalendarDay[] = Object.entries(byDate).map(([date, d]) => ({ date, ...d }));

  const totalPnl = days.reduce((s, d) => s + d.pnl, 0);
  const winDays = days.filter(d => d.pnl > 0).length;
  const lossDays = days.filter(d => d.pnl < 0).length;
  const bestDay = days.length ? Math.max(...days.map(d => d.pnl)) : 0;
  const worstDay = days.length ? Math.min(...days.map(d => d.pnl)) : 0;

  return NextResponse.json({
    days,
    totalPnl,
    totalTrades: trades.length,
    winDays,
    lossDays,
    bestDay,
    worstDay,
  } satisfies CalendarResponse);
}

function emptyResponse(): CalendarResponse {
  return { days: [], totalPnl: 0, totalTrades: 0, winDays: 0, lossDays: 0, bestDay: 0, worstDay: 0 };
}
