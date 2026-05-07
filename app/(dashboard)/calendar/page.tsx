'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Calendar, Trophy, Target } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { StatRowSkeleton, CalendarSkeleton } from '@/components/ui/Skeleton';
import { useAccount } from '@/contexts/AccountContext';
import type { CalendarResponse, CalendarDay } from '@/app/api/calendar/route';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function StatCard({ label, value, icon: Icon, positive }: {
  label: string;
  value: string;
  icon: React.ElementType;
  positive?: boolean;
}) {
  return (
    <div className="bg-bg-surface border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={13} className="text-zinc-500" />
        <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{label}</span>
      </div>
      <div className={cn(
        'text-lg font-bold font-mono',
        positive === true ? 'text-profit' : positive === false ? 'text-loss' : 'text-zinc-100'
      )}>
        {value}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const { accountParams } = useAccount();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-based
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams(accountParams);
    params.set('year', String(year));
    params.set('month', String(month));
    fetch(`/api/calendar?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, [accountParams, year, month]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();

  // Mon=0 ... Sun=6 offset
  const startOffset = (firstDay.getDay() + 6) % 7; // getDay: Sun=0, so Mon=1 → offset=0

  const dayMap: Record<string, CalendarDay> = {};
  if (data) {
    for (const d of data.days) dayMap[d.date] = d;
  }

  // Build weeks
  const totalCells = startOffset + daysInMonth;
  const totalRows = Math.ceil(totalCells / 7);

  const weeks: (number | null)[][] = [];
  for (let row = 0; row < totalRows; row++) {
    const week: (number | null)[] = [];
    for (let col = 0; col < 7; col++) {
      const dayNum = row * 7 + col - startOffset + 1;
      week.push(dayNum >= 1 && dayNum <= daysInMonth ? dayNum : null);
    }
    weeks.push(week);
  }

  function dateStr(dayNum: number) {
    return `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
  }

  function weekPnl(week: (number | null)[]): number {
    return week.reduce<number>((sum, d) => {
      if (!d) return sum;
      return sum + (dayMap[dateStr(d)]?.pnl ?? 0);
    }, 0);
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;

  // Intensity scale for colours
  const maxAbs = data?.days.length
    ? Math.max(...data.days.map(d => Math.abs(d.pnl)), 1)
    : 1;

  function dayBg(pnl: number): string {
    const intensity = Math.min(Math.abs(pnl) / maxAbs, 1);
    if (pnl > 0) {
      if (intensity > 0.7) return 'bg-profit/[28%]';
      if (intensity > 0.35) return 'bg-profit/[15%]';
      return 'bg-profit/[7%]';
    } else if (pnl < 0) {
      if (intensity > 0.7) return 'bg-loss/[28%]';
      if (intensity > 0.35) return 'bg-loss/[15%]';
      return 'bg-loss/[7%]';
    }
    return '';
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2"><div className="h-6 w-36 animate-pulse rounded-lg bg-bg-elevated" /><div className="h-4 w-48 animate-pulse rounded-lg bg-bg-elevated" /></div>
          <div className="flex gap-2"><div className="h-9 w-9 animate-pulse rounded-lg bg-bg-elevated" /><div className="h-9 w-36 animate-pulse rounded-lg bg-bg-elevated" /><div className="h-9 w-9 animate-pulse rounded-lg bg-bg-elevated" /></div>
        </div>
        <StatRowSkeleton count={6} />
        <CalendarSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">P&amp;L Calendar</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Daily performance overview</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg border border-border text-zinc-400 hover:text-zinc-100 hover:bg-bg-elevated transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="min-w-36 text-center">
            <span className="text-sm font-semibold text-zinc-100">{MONTHS[month - 1]} {year}</span>
          </div>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg border border-border text-zinc-400 hover:text-zinc-100 hover:bg-bg-elevated transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-3">
        <StatCard
          label="Monthly P&L"
          value={data ? (data.totalPnl >= 0 ? '+' : '') + formatCurrency(data.totalPnl) : '—'}
          icon={data?.totalPnl && data.totalPnl >= 0 ? TrendingUp : TrendingDown}
          positive={data?.totalPnl !== undefined ? data.totalPnl > 0 ? true : data.totalPnl < 0 ? false : undefined : undefined}
        />
        <StatCard
          label="Total Trades"
          value={data ? String(data.totalTrades) : '—'}
          icon={Calendar}
        />
        <StatCard
          label="Win Days"
          value={data ? String(data.winDays) : '—'}
          icon={Trophy}
          positive={true}
        />
        <StatCard
          label="Loss Days"
          value={data ? String(data.lossDays) : '—'}
          icon={Target}
          positive={false}
        />
        <StatCard
          label="Best Day"
          value={data && data.bestDay !== 0 ? '+' + formatCurrency(data.bestDay) : '—'}
          icon={TrendingUp}
          positive={true}
        />
        <StatCard
          label="Worst Day"
          value={data && data.worstDay !== 0 ? formatCurrency(data.worstDay) : '—'}
          icon={TrendingDown}
          positive={false}
        />
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
      <div className="bg-bg-surface border border-border rounded-xl overflow-hidden min-w-[580px]">
        {/* Day-of-week headers */}
        <div className="border-b border-border" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr) 80px' }}>
          {DAYS_OF_WEEK.map(d => (
            <div key={d} style={{ padding: '10px 6px', textAlign: 'center', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }} className="text-zinc-600">
              {d}
            </div>
          ))}
          <div style={{ padding: '10px 6px', textAlign: 'center', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }} className="text-zinc-600 border-l border-border">
            Week
          </div>
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => {
          const wPnl = weekPnl(week);
          const hasActivity = week.some(d => d && dayMap[dateStr(d)]);
          return (
            <div key={wi} className={cn(wi < weeks.length - 1 && 'border-b border-border')} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr) 80px' }}>
              {week.map((dayNum, di) => {
                if (!dayNum) {
                  return (
                    <div key={di} className="bg-bg-overlay/20 border-r border-b border-border/20"
                      style={{ minHeight: 60, borderRight: di < 6 ? '1px solid rgba(var(--border)/0.3)' : undefined, borderBottom: wi < weeks.length - 1 ? '1px solid rgba(var(--border)/0.2)' : undefined }} />
                  );
                }
                const ds = dateStr(dayNum);
                const day = dayMap[ds];
                const isToday = isCurrentMonth && ds === todayStr;
                const isWeekend = di >= 5;

                return (
                  <div
                    key={di}
                    style={{
                      minHeight: 60,
                      padding: 6,
                      borderRight: di < 6 ? '1px solid rgb(var(--border) / 0.25)' : undefined,
                      borderBottom: wi < weeks.length - 1 ? '1px solid rgb(var(--border) / 0.2)' : undefined,
                      transition: 'background 0.12s',
                      boxShadow: isToday ? 'inset 0 0 0 2px rgb(var(--accent))' : undefined,
                    }}
                    className={cn(
                      'relative',
                      isWeekend && !day ? 'bg-black/[0.12] dark:bg-black/[0.15]' : '',
                      day ? dayBg(day.pnl) : '',
                    )}
                  >
                    {/* Day number */}
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 3 }} className={cn(
                      isToday ? 'text-accent-light' : isWeekend ? 'text-zinc-600' : 'text-zinc-500'
                    )}>
                      {dayNum}
                    </div>

                    {/* P&L value */}
                    {day && (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.15 }} className={cn(
                          'font-mono',
                          day.pnl >= 0 ? 'text-profit' : 'text-loss'
                        )}>
                          {day.pnl >= 0 ? '+' : ''}{formatCurrency(day.pnl, true)}
                        </div>
                        <div style={{ fontSize: 10, marginTop: 2 }} className="text-zinc-500">
                          {day.trades} trade{day.trades !== 1 ? 's' : ''}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {/* Week total */}
              <div
                style={{ minHeight: 60, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 6 }}
                className={cn('border-l border-border', !hasActivity && 'opacity-30')}
              >
                {hasActivity ? (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700 }} className={cn('font-mono', wPnl >= 0 ? 'text-profit' : 'text-loss')}>
                      {wPnl >= 0 ? '+' : ''}{formatCurrency(wPnl, true)}
                    </div>
                    <div style={{ fontSize: 9, marginTop: 2 }} className="text-zinc-600">week</div>
                  </>
                ) : (
                  <span style={{ fontSize: 10 }} className="text-zinc-700">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </div>{/* end scroll wrapper */}

      {/* Legend */}
      <div className="flex items-center gap-3 justify-end text-xs text-zinc-600">
        <span>Intensity:</span>
        <div className="flex items-center gap-1.5">
          {[
            { label: 'Low', profitOpacity: '7%', lossOpacity: '7%' },
            { label: 'Mid', profitOpacity: '15%', lossOpacity: '15%' },
            { label: 'High', profitOpacity: '28%', lossOpacity: '28%' },
          ].map(({ label, profitOpacity, lossOpacity }, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ background: `rgb(var(--profit) / ${profitOpacity})` }} />
              <div className="w-3 h-3 rounded-sm" style={{ background: `rgb(var(--loss) / ${lossOpacity})` }} />
            </div>
          ))}
        </div>
        <span>→ higher</span>
      </div>
    </div>
  );
}
