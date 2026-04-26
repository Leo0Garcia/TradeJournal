import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  accent?: boolean;
  className?: string;
}

export default function StatCard({ label, value, sub, icon: Icon, trend, accent, className }: StatCardProps) {
  const valueColor = trend === 'up'
    ? 'text-profit'
    : trend === 'down'
    ? 'text-loss'
    : 'text-zinc-100';

  return (
    <div className={cn(
      'relative rounded-xl border p-4 bg-bg-surface overflow-hidden transition-colors',
      accent ? 'border-accent/40 bg-accent/5' : 'border-border hover:border-border-strong',
      className
    )}>
      {accent && (
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">{label}</div>
          <div className={cn('text-2xl font-bold font-mono truncate', valueColor)}>{value}</div>
          {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
        </div>
        {Icon && (
          <div className={cn(
            'p-2 rounded-lg shrink-0',
            accent ? 'bg-accent/20' : 'bg-bg-elevated'
          )}>
            <Icon size={16} className={accent ? 'text-accent-light' : 'text-zinc-400'} />
          </div>
        )}
      </div>
    </div>
  );
}
