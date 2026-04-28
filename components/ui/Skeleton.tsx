import React from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn('animate-pulse rounded-lg bg-bg-elevated', className)} style={style} />
  );
}

/** A row of stat cards shaped as skeletons */
export function StatRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-${count} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-bg-surface border border-border rounded-xl p-4 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

/** A chart-area shaped skeleton */
export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div className="bg-bg-surface border border-border rounded-xl p-5">
      <Skeleton className="h-4 w-36 mb-4" />
      <Skeleton style={{ height }} />
    </div>
  );
}

/** Table row skeletons */
export function TableSkeleton({ rows = 8, cols = 7 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-bg-surface border border-border rounded-xl overflow-hidden">
      {/* header */}
      <div className="flex gap-4 px-4 py-3 border-b border-border">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3" style={{ width: `${60 + (i % 3) * 20}px` }} />
        ))}
      </div>
      {/* rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-b border-border/50">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4" style={{ width: `${50 + ((i + j) % 4) * 15}px` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Calendar day-grid skeleton */
export function CalendarSkeleton() {
  return (
    <div className="bg-bg-surface border border-border rounded-xl overflow-hidden">
      <div className="grid grid-cols-8 border-b border-border">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-2 py-2 flex justify-center">
            <Skeleton className="h-3 w-8" />
          </div>
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, wi) => (
        <div key={wi} className={cn('grid grid-cols-8', wi < 4 && 'border-b border-border')}>
          {Array.from({ length: 8 }).map((_, di) => (
            <div key={di} className={cn('min-h-[80px] p-2', di < 7 && 'border-r border-border/30')}>
              <Skeleton className="h-3 w-4 mb-2" />
              {Math.random() > 0.5 && <Skeleton className="h-4 w-16 mt-1" />}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
