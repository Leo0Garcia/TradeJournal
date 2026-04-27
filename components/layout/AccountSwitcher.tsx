'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, CreditCard, Check } from 'lucide-react';
import { useAccount, ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_COLORS } from '@/contexts/AccountContext';
import { cn } from '@/lib/utils';
import type { AccountSelection, AccountType } from '@/types';

const ACCOUNT_TYPES: AccountType[] = ['live', 'funded', 'demo'];

export default function AccountSwitcher() {
  const { accounts, selection, setSelection, loaded } = useAccount();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function select(s: AccountSelection) {
    setSelection(s);
    setOpen(false);
  }

  function isActive(s: AccountSelection) {
    if (s.type !== selection.type) return false;
    if (s.type === 'account_type' && selection.type === 'account_type') {
      return s.accountType === selection.accountType;
    }
    if (s.type === 'account' && selection.type === 'account') {
      return s.id === selection.id;
    }
    return false;
  }

  function label() {
    if (selection.type === 'account_type') {
      return `All ${ACCOUNT_TYPE_LABELS[selection.accountType]}`;
    }
    return accounts.find(a => a.id === selection.id)?.name ?? 'Account';
  }

  function labelColor() {
    const type = selection.type === 'account'
      ? accounts.find(a => a.id === selection.id)?.account_type
      : selection.accountType;
    return type ? ACCOUNT_TYPE_COLORS[type].split(' ')[0] : 'text-zinc-200';
  }

  // Group accounts by type, only show types that have accounts
  const typeGroups = ACCOUNT_TYPES
    .map(t => ({ type: t, accs: accounts.filter(a => a.account_type === t) }))
    .filter(g => g.accs.length > 0);

  return (
    <div ref={ref} className="relative mx-3 mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-bg-overlay border border-border hover:border-border-strong transition-all text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('text-xs font-semibold shrink-0', labelColor())}>●</span>
          <span className="text-xs font-medium text-zinc-200 truncate">{loaded ? label() : '...'}</span>
        </div>
        <ChevronDown size={12} className={cn('text-zinc-500 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 bottom-full mb-1 z-50 bg-bg-surface border border-border rounded-xl shadow-2xl overflow-y-auto max-h-72 py-1">
          {typeGroups.length === 0 && (
            <p className="px-3 py-3 text-xs text-zinc-600">No accounts yet — add one in Settings.</p>
          )}

          {typeGroups.map(({ type, accs }) => (
            <div key={type}>
              {/* Section header + "All [Type]" row */}
              <div className="px-3 pt-2.5 pb-1 flex items-center justify-between">
                <span className={cn('text-[10px] uppercase tracking-widest font-bold', ACCOUNT_TYPE_COLORS[type].split(' ')[0])}>
                  {ACCOUNT_TYPE_LABELS[type]}
                </span>
              </div>

              {/* All [Type] aggregate row */}
              <Item
                dotColor={ACCOUNT_TYPE_COLORS[type].split(' ')[0]}
                label={`All ${ACCOUNT_TYPE_LABELS[type]}`}
                sublabel={`${accs.length} account${accs.length !== 1 ? 's' : ''}`}
                active={isActive({ type: 'account_type', accountType: type })}
                onClick={() => select({ type: 'account_type', accountType: type })}
              />

              {/* Individual accounts */}
              {accs.map(a => (
                <Item
                  key={a.id}
                  icon={<CreditCard size={12} className="text-zinc-500 ml-2" />}
                  label={a.name}
                  sublabel={a.broker ?? undefined}
                  active={isActive({ type: 'account', id: a.id })}
                  onClick={() => select({ type: 'account', id: a.id })}
                  indent
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Item({
  icon, dotColor, label, sublabel, active, onClick, indent,
}: {
  icon?: React.ReactNode;
  dotColor?: string;
  label: string;
  sublabel?: string;
  active: boolean;
  onClick: () => void;
  indent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors',
        indent && 'pl-5',
        active ? 'bg-accent/10' : 'hover:bg-bg-elevated'
      )}
    >
      {icon ?? (dotColor && <span className={cn('text-[8px] shrink-0', dotColor)}>●</span>)}
      <div className="flex-1 min-w-0">
        <div className={cn('text-xs font-medium truncate', active ? 'text-accent-light' : 'text-zinc-300')}>
          {label}
        </div>
        {sublabel && <div className="text-[10px] text-zinc-600 truncate">{sublabel}</div>}
      </div>
      {active && <Check size={11} className="text-accent shrink-0" />}
    </button>
  );
}
