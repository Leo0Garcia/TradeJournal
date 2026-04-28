import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, compact = false): string {
  const abs = Math.abs(value);
  if (compact && abs >= 1000) {
    const k = abs / 1000;
    // Use enough decimals to avoid lossy rounding (e.g. 1250 → 1.25k, not 1.3k)
    const decimals = k % 1 === 0 ? 0 : k * 10 % 1 === 0 ? 1 : 2;
    return (value < 0 ? '-' : '') + '$' + k.toFixed(decimals) + 'k';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  return value.toFixed(1) + '%';
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

export function pnlColor(value: number): string {
  if (value > 0) return 'text-profit';
  if (value < 0) return 'text-loss';
  return 'text-zinc-400';
}

export function pnlBg(value: number): string {
  if (value > 0) return 'bg-profit-muted text-profit-text';
  if (value < 0) return 'bg-loss-muted text-loss-text';
  return 'bg-zinc-800 text-zinc-400';
}

export function directionColor(direction: string): string {
  return direction === 'long' ? 'text-profit' : 'text-loss';
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export const TAG_COLORS = [
  '#7c3aed', '#2563eb', '#0891b2', '#059669', '#ca8a04',
  '#ea580c', '#dc2626', '#db2777', '#9333ea', '#6366f1',
];

export function getTagColorStyle(color: string) {
  return {
    backgroundColor: color + '33',
    color: color,
    borderColor: color + '55',
  };
}
