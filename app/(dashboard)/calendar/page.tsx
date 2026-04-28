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

  function dayBg(pnl: number) {
    const intensity = Math.min(Math.abs(pnl) / maxAbs, 1);
    if (pnl > 0) {
      if (intensity > 0.7) return 'bg-profit/30 border-profit/40';
      if (intensity > 0.35) return 'bg-profit/20 border-profit/25';
      return 'bg-profit/10 border-profit/15';
    } else if (pnl < 0) {
      if (intensity > 0.7) return 'bg-loss/30 border-loss/40';
      if (intensity > 0.35) return 'bg-loss/20 border-loss/25';
      return 'bg-loss/10 border-loss/15';
    }
    return 'bg-transparent border-border/50';
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
      <div className="bg-bg-surface border border-border rounded-xl overflow-hidden min-w-[600px]">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-8 border-b border-border">
          {DAYS_OF_WEEK.map(d => (
            <div key={d} className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
              {d}
            </div>
          ))}
          <div className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-zinc-600 border-l border-border">
            Week
          </div>
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => {
          const wPnl = weekPnl(week);
          const hasActivity = week.some(d => d && dayMap[dateStr(d)]);
          return (
            <div key={wi} className={cn('grid grid-cols-8', wi < weeks.length - 1 && 'border-b border-border')}>
              {week.map((dayNum, di) => {
                if (!dayNum) {
                  return <div key={di} className="min-h-[80px] bg-bg-overlay/30 border-r border-border/30" />;
                }
                const ds = dateStr(dayNum);
                const day = dayMap[ds];
                const isToday = isCurrentMonth && ds === todayStr;
                const isWeekend = di >= 5; // Sat/Sun

                return (
                  <div
                    key={di}
                    className={cn(
                      'min-h-[64px] p-1.5 border border-transparent transition-all group relative',
                      di < 6 && 'border-r border-border/30',
                      isWeekend && !day && 'bg-bg-overlay/20',
                      day ? dayBg(day.pnl) : 'hover:bg-bg-elevated/50',
                      isToday && 'ring-1 ring-inset ring-accent/50'
                    )}
                  >
                    {/* Day number */}
                    <div className={cn(
                      'text-xs font-semibold mb-1.5',
                      isToday
                        ? 'text-accent-light'
                        : isWeekend
                        ? 'text-zinc-600'
                        : 'text-zinc-500'
                    )}>
                      {dayNum}
                    </div>

                    {/* P&L value */}
                    {day && (
                      <>
                        <div className={cn(
                          'text-sm font-bold font-mono leading-tight',
                          day.pnl >= 0 ? 'text-profit' : 'text-loss'
                        )}>
                          {day.pnl >= 0 ? '+' : ''}{formatCurrency(day.pnl)}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          {day.trades} trade{day.trades !== 1 ? 's' : ''}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {/* Week total */}
              <div className={cn(
                'min-h-[64px] p-1.5 border-l border-border flex flex-col justify-center items-center',
                hasActivity ? '' : 'opacity-30'
              )}>
                {hasActivity ? (
                  <>
                    <div className={cn(
                      'text-xs font-bold font-mono',
                      wPnl >= 0 ? 'text-profit' : 'text-loss'
                    )}>
                      {wPnl >= 0 ? '+' : ''}{formatCurrency(wPnl)}
                    </div>
                    <div className="text-[10px] text-zinc-600 mt-0.5">week</div>
                  </>
                ) : (
                  <span className="text-[10px] text-zinc-700">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      </div>{/* end scroll wrapper */}

      {/* Legend */}
      <div className="flex items-center gap-4 justify-end">
        <span className="text-xs text-zinc-600">Intensity:</span>
        {[0.1, 0.25, 0.5, 1].map((opacity, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm`} style={{ background: `rgba(var(--color-profit-rgb, 52 211 153) / ${opacity})` }} />
            <div className={`w-3 h-3 rounded-sm`} style={{ background: `rgba(var(--color-loss-rgb, 239 68 68) / ${opacity})` }} />
          </div>
        ))}
        <span className="text-xs text-zinc-600">→ higher</span>
      </div>
    </div>
  );
}
