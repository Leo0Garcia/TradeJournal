'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { Account, AccountSelection, AccountType } from '@/types';

interface AccountContextValue {
  accounts: Account[];
  selection: AccountSelection;
  loaded: boolean;
  setSelection: (s: AccountSelection) => void;
  reload: () => Promise<void>;
  accountParams: URLSearchParams;
  mustSelectAccount: boolean;
}

const AccountContext = createContext<AccountContextValue | null>(null);

const STORAGE_KEY = 'tj_account_selection';

function loadSelection(): AccountSelection {
  if (typeof window === 'undefined') return { type: 'account_type', accountType: 'live' };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { type: string; id?: string; accountType?: string };
      // Migrate old 'all' or 'group' selection types
      if (parsed.type === 'all' || parsed.type === 'group') {
        return { type: 'account_type', accountType: 'live' };
      }
      return parsed as unknown as AccountSelection;
    }
  } catch {}
  return { type: 'account_type', accountType: 'live' };
}

function saveSelection(s: AccountSelection) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selection, setSelectionState] = useState<AccountSelection>({ type: 'account_type', accountType: 'live' });
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const accs = await fetch('/api/accounts').then(r => r.json());
    setAccounts(Array.isArray(accs) ? accs : []);
    setLoaded(true);
  }, []);

  useEffect(() => {
    setSelectionState(loadSelection());
    reload();
  }, [reload]);

  function setSelection(s: AccountSelection) {
    setSelectionState(s);
    saveSelection(s);
  }

  const accountParams = new URLSearchParams();
  if (selection.type === 'account') accountParams.set('account_id', selection.id);
  if (selection.type === 'account_type') accountParams.set('account_type', selection.accountType);

  // Must select a specific account that actually exists before adding trades
  const mustSelectAccount =
    !loaded ||
    selection.type !== 'account' ||
    !accounts.some(a => a.id === (selection as { type: 'account'; id: string }).id);

  return (
    <AccountContext.Provider value={{ accounts, selection, loaded, setSelection, reload, accountParams, mustSelectAccount }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used within AccountProvider');
  return ctx;
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  live: 'Live',
  funded: 'Funded',
  demo: 'Demo',
};

export const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  live:   'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  funded: 'text-violet-400 bg-violet-400/10 border-violet-400/30',
  demo:   'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
};
