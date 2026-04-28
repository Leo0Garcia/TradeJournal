'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
// Note: useSearchParams kept for future use
import { useSearchParams } from 'next/navigation';
import { Plus, Trash2, Pencil, Check, X, AlertTriangle, Moon, Sun } from 'lucide-react';
import { ACCENT_PRESETS, applyTheme, type AccentColor, type ThemeMode } from '@/components/ThemeProvider';
import { TAG_COLORS, getTagColorStyle, cn } from '@/lib/utils';
import { useAccount, ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_COLORS } from '@/contexts/AccountContext';
import type { Tag, Account, AccountType } from '@/types';

const ACCOUNT_TYPES: AccountType[] = ['live', 'funded', 'demo'];

const inputCls = 'w-full bg-bg-overlay border border-border rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-accent placeholder:text-zinc-600';

function ChallengeFields({
  form,
  setForm,
}: {
  form: typeof emptyAccountForm;
  setForm: (f: typeof emptyAccountForm) => void;
}) {
  if (form.account_type !== 'funded') return null;
  return (
    <div className="space-y-3 pt-1 border-t border-border/50">
      <div>
        <label className="block text-xs text-zinc-500 mb-1.5">Account Status</label>
        <div className="flex gap-2">
          {([false, true] as const).map(isChallenge => (
            <button key={String(isChallenge)} type="button"
              onClick={() => setForm({ ...form, is_challenge: isChallenge })}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                form.is_challenge === isChallenge
                  ? 'border-accent bg-accent/10 text-accent-light'
                  : 'border-border text-zinc-500 hover:text-zinc-300 hover:border-border-strong'
              )}
            >
              {isChallenge ? 'Challenge / Eval' : 'Passed / Instant Funded'}
            </button>
          ))}
        </div>
      </div>
      {form.is_challenge && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Profit Target ($)</label>
            <input type="number" step="any" min="0" value={form.profit_target}
              onChange={e => setForm({ ...form, profit_target: e.target.value })}
              placeholder="e.g. 1500" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Daily Loss Limit ($)</label>
            <input type="number" step="any" min="0" value={form.daily_loss_limit}
              onChange={e => setForm({ ...form, daily_loss_limit: e.target.value })}
              placeholder="e.g. 500" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Max Loss Limit ($)</label>
            <input type="number" step="any" min="0" value={form.total_loss_limit}
              onChange={e => setForm({ ...form, total_loss_limit: e.target.value })}
              placeholder="e.g. 1500" className={inputCls} />
          </div>
        </div>
      )}
    </div>
  );
}

const emptyAccountForm = {
  name: '', broker: '', description: '', currency: 'USD',
  account_type: 'live' as AccountType, account_size: '',
  is_challenge: false, profit_target: '', daily_loss_limit: '', total_loss_limit: '',
};

export default function SettingsPageWrapper() {
  return <Suspense><SettingsPage /></Suspense>;
}

function SettingsPage() {
  const { accounts, reload: reloadAccounts } = useAccount();
  const searchParams = useSearchParams();

  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [creatingTag, setCreatingTag] = useState(false);

  const [showNewAccount, setShowNewAccount] = useState(false);
  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [savingAccount, setSavingAccount] = useState(false);
  const [editAccountId, setEditAccountId] = useState<string | null>(null);
  const [editAccountForm, setEditAccountForm] = useState(emptyAccountForm);

  // Theme state
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [accentColor, setAccentColor] = useState<AccentColor>('purple');

  useEffect(() => {
    setThemeMode((localStorage.getItem('theme-mode') as ThemeMode) ?? 'dark');
    setAccentColor((localStorage.getItem('theme-accent') as AccentColor) ?? 'purple');
  }, []);

  function setTheme(mode: ThemeMode, accent: AccentColor) {
    setThemeMode(mode);
    setAccentColor(accent);
    localStorage.setItem('theme-mode', mode);
    localStorage.setItem('theme-accent', accent);
    applyTheme(mode, accent);
  }

  const loadTags = useCallback(async () => {
    const data = await fetch('/api/tags').then(r => r.json());
    setTags(data);
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  async function createTag() {
    if (!newTagName.trim()) return;
    setCreatingTag(true);
    await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
    });
    setNewTagName('');
    await loadTags();
    setCreatingTag(false);
  }

  async function deleteTag(id: string, name: string) {
    if (!confirm(`Delete tag "${name}"? This will remove it from all trades.`)) return;
    await fetch('/api/tags', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await loadTags();
  }

  async function createAccount() {
    if (!accountForm.name.trim()) return;
    setSavingAccount(true);
    await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(accountForm),
    });
    setAccountForm(emptyAccountForm);
    setShowNewAccount(false);
    setSavingAccount(false);
    await reloadAccounts();
  }

  async function saveAccountEdit(id: string) {
    await fetch(`/api/accounts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editAccountForm),
    });
    setEditAccountId(null);
    await reloadAccounts();
  }

  async function deleteAccount(id: string, name: string) {
    if (!confirm(`Delete account "${name}"? Trades linked to it will be unlinked.`)) return;
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    await reloadAccounts();
  }

  function startEditAccount(a: Account) {
    setEditAccountId(a.id);
    setEditAccountForm({
      name: a.name,
      broker: a.broker ?? '',
      description: a.description ?? '',
      currency: a.currency,
      account_type: a.account_type,
      account_size: a.account_size != null ? String(a.account_size) : '',
      is_challenge: a.is_challenge ?? false,
      profit_target: a.profit_target != null ? String(a.profit_target) : '',
      daily_loss_limit: a.daily_loss_limit != null ? String(a.daily_loss_limit) : '',
      total_loss_limit: a.total_loss_limit != null ? String(a.total_loss_limit) : '',
    });
  }

  // Group accounts by type for display
  const grouped = ACCOUNT_TYPES
    .map(t => ({ type: t, accs: accounts.filter(a => a.account_type === t) }))
    .filter(g => g.accs.length > 0);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-zinc-100 mb-1">Settings</h1>
        <p className="text-sm text-zinc-500">Manage accounts, integrations, tags, and preferences</p>
      </div>

      {/* ── Accounts ── */}
      <section className="bg-bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Trading Accounts</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Organize by type — Live, Funded, or Demo</p>
          </div>
          <button onClick={() => setShowNewAccount(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg transition-colors">
            <Plus size={13} /> Add Account
          </button>
        </div>

        {showNewAccount && (
          <div className="mb-4 p-4 bg-bg-overlay rounded-xl border border-border space-y-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Account Type</label>
              <div className="flex gap-2">
                {ACCOUNT_TYPES.map(t => (
                  <button key={t} type="button"
                    onClick={() => setAccountForm(f => ({ ...f, account_type: t, is_challenge: false }))}
                    className={cn('flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                      accountForm.account_type === t
                        ? ACCOUNT_TYPE_COLORS[t]
                        : 'border-border text-zinc-500 hover:text-zinc-300 hover:border-border-strong'
                    )}>
                    {ACCOUNT_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Name *</label>
                <input value={accountForm.name} onChange={e => setAccountForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Apex MNQ" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Broker / Firm</label>
                <input value={accountForm.broker} onChange={e => setAccountForm(f => ({ ...f, broker: e.target.value }))} placeholder="e.g. Apex, Lucid, Tradovate" className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Starting Balance</label>
                <input type="number" step="any" min="0" value={accountForm.account_size}
                  onChange={e => setAccountForm(f => ({ ...f, account_size: e.target.value }))} placeholder="e.g. 50000" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Currency</label>
                <input value={accountForm.currency} onChange={e => setAccountForm(f => ({ ...f, currency: e.target.value }))} placeholder="USD" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Description</label>
                <input value={accountForm.description} onChange={e => setAccountForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional notes" className={inputCls} />
              </div>
            </div>
            <ChallengeFields form={accountForm} setForm={setAccountForm} />
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowNewAccount(false)} className="flex-1 py-2 border border-border rounded-lg text-xs text-zinc-400 hover:text-zinc-100 transition-colors">Cancel</button>
              <button onClick={createAccount} disabled={!accountForm.name.trim() || savingAccount}
                className="flex-1 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40">
                {savingAccount ? 'Saving...' : 'Create Account'}
              </button>
            </div>
          </div>
        )}

        {accounts.length === 0 && (
          <p className="text-sm text-zinc-600 text-center py-6">No accounts yet. Add one to start organizing your trades.</p>
        )}

        <div className="space-y-4">
          {grouped.map(({ type, accs }) => (
            <div key={type}>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn('text-[10px] uppercase tracking-widest font-bold', ACCOUNT_TYPE_COLORS[type].split(' ')[0])}>
                  {ACCOUNT_TYPE_LABELS[type]}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-2">
                {accs.map(a => (
                  <div key={a.id} className={cn('rounded-xl border transition-colors group', a.is_disabled ? 'border-loss/40 bg-loss-muted/20' : 'border-border hover:border-border-strong')}>
                    {editAccountId === a.id ? (
                      <div className="p-3 space-y-3">
                        <div className="flex gap-2">
                          {ACCOUNT_TYPES.map(t => (
                            <button key={t} type="button"
                              onClick={() => setEditAccountForm(f => ({ ...f, account_type: t, is_challenge: false }))}
                              className={cn('flex-1 py-1 rounded-lg text-xs font-semibold border transition-all',
                                editAccountForm.account_type === t ? ACCOUNT_TYPE_COLORS[t] : 'border-border text-zinc-500 hover:text-zinc-300')}>
                              {ACCOUNT_TYPE_LABELS[t]}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input value={editAccountForm.name} onChange={e => setEditAccountForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Name" />
                          <input value={editAccountForm.broker} onChange={e => setEditAccountForm(f => ({ ...f, broker: e.target.value }))} className={inputCls} placeholder="Broker" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input type="number" step="any" min="0" value={editAccountForm.account_size} onChange={e => setEditAccountForm(f => ({ ...f, account_size: e.target.value }))} className={inputCls} placeholder="Starting balance" />
                          <input value={editAccountForm.currency} onChange={e => setEditAccountForm(f => ({ ...f, currency: e.target.value }))} className={inputCls} placeholder="Currency" />
                          <input value={editAccountForm.description} onChange={e => setEditAccountForm(f => ({ ...f, description: e.target.value }))} className={inputCls} placeholder="Description" />
                        </div>
                        <ChallengeFields form={editAccountForm} setForm={setEditAccountForm} />
                        <div className="flex gap-2">
                          <button onClick={() => setEditAccountId(null)} className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-xs text-zinc-400 hover:text-zinc-100 transition-colors"><X size={12} /> Cancel</button>
                          <button onClick={() => saveAccountEdit(a.id)} className="flex items-center gap-1 px-3 py-1.5 bg-accent text-white text-xs rounded-lg transition-colors"><Check size={12} /> Save</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-3 py-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-zinc-200">{a.name}</div>
                            {a.is_disabled && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-loss/20 text-loss uppercase tracking-wider">Disabled</span>
                            )}
                            {a.is_challenge && !a.is_disabled && !a.challenge_passed && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 uppercase tracking-wider">Eval</span>
                            )}
                            {a.challenge_passed && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-profit/10 text-profit uppercase tracking-wider">Passed</span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {[a.broker, a.currency, a.description].filter(Boolean).join(' · ')}
                            {a.is_challenge && a.profit_target && (
                              <span className="ml-1">· Target ${a.profit_target.toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEditAccount(a)} className="p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-bg-elevated rounded-lg transition-colors"><Pencil size={13} /></button>
                          <button onClick={() => deleteAccount(a.id, a.name)} className="p-1.5 text-zinc-500 hover:text-loss hover:bg-loss-muted rounded-lg transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Appearance ── */}
      <section className="bg-bg-surface border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-zinc-200 mb-4">Appearance</h2>

        {/* Dark / Light toggle */}
        <div className="mb-5">
          <label className="block text-xs text-zinc-500 mb-2">Theme</label>
          <div className="flex gap-2">
            {(['dark', 'light'] as ThemeMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setTheme(mode, accentColor)}
                className={cn(
                  'flex items-center gap-2 flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all',
                  themeMode === mode
                    ? 'border-accent bg-accent/10 text-accent-light'
                    : 'border-border text-zinc-500 hover:text-zinc-300 hover:border-border-strong'
                )}
              >
                {mode === 'dark' ? <Moon size={13} /> : <Sun size={13} />}
                {mode === 'dark' ? 'Dark' : 'Light'}
              </button>
            ))}
          </div>
        </div>

        {/* Accent colour palette */}
        <div>
          <label className="block text-xs text-zinc-500 mb-2">Accent Colour</label>
          <div className="flex gap-2 flex-wrap">
            {ACCENT_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => setTheme(themeMode, preset.id)}
                title={preset.label}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                  accentColor === preset.id
                    ? 'border-current text-zinc-100 shadow-lg'
                    : 'border-border text-zinc-500 hover:text-zinc-300 hover:border-border-strong'
                )}
                style={accentColor === preset.id
                  ? { borderColor: preset.hex, boxShadow: `0 0 0 1px ${preset.hex}40` }
                  : undefined
                }
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: preset.hex }}
                />
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tags ── */}
      <section className="bg-bg-surface border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-zinc-200 mb-4">Setup Tags</h2>
        <div className="flex items-center gap-3 mb-5 p-4 bg-bg-overlay rounded-xl border border-border">
          <input value={newTagName} onChange={e => setNewTagName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createTag()}
            placeholder="Tag name (e.g. Liquidity Sweep, BOS, FVG)"
            className="flex-1 bg-transparent text-sm text-zinc-100 focus:outline-none placeholder:text-zinc-600" />
          <div className="flex gap-1.5">
            {TAG_COLORS.map(c => (
              <button key={c} onClick={() => setNewTagColor(c)}
                className={`w-5 h-5 rounded-full transition-all ${newTagColor === c ? 'scale-125 ring-2 ring-white/40' : 'opacity-60 hover:opacity-100'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
          <button onClick={createTag} disabled={!newTagName.trim() || creatingTag}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40">
            <Plus size={13} /> Add
          </button>
        </div>
        <div className="space-y-2">
          {tags.length === 0 && <p className="text-sm text-zinc-600 text-center py-4">No tags yet.</p>}
          {tags.map(tag => (
            <div key={tag.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-bg-elevated transition-colors group">
              <span className="px-2.5 py-1 rounded-full text-xs font-medium border" style={getTagColorStyle(tag.color)}>{tag.name}</span>
              <button onClick={() => deleteTag(tag.id, tag.name)} className="p-1.5 text-zinc-700 hover:text-loss hover:bg-loss-muted rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Instruments ── */}
      <section className="bg-bg-surface border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-zinc-200 mb-1">Instrument Point Values</h2>
        <p className="text-xs text-zinc-500 mb-3">Used for P&L calculation. $ per 1-point move per contract.</p>
        <div className="grid grid-cols-2 gap-x-6 text-xs font-mono">
          {[
            { sym: 'MNQ',    val: '$2 / pt  (0.25 tick = $0.50)',    cat: 'Micro E-mini Nasdaq' },
            { sym: 'MES',    val: '$5 / pt  (0.25 tick = $1.25)',    cat: 'Micro E-mini S&P 500' },
            { sym: 'MYM',    val: '$0.50 / pt  (1 tick = $0.50)',    cat: 'Micro E-mini Dow' },
            { sym: 'M2K',    val: '$5 / pt  (0.10 tick = $0.50)',    cat: 'Micro E-mini Russell 2000' },
            { sym: 'NQ',     val: '$20 / pt  (0.25 tick = $5)',      cat: 'E-mini Nasdaq-100' },
            { sym: 'ES',     val: '$50 / pt  (0.25 tick = $12.50)',  cat: 'E-mini S&P 500' },
            { sym: 'YM',     val: '$5 / pt  (1 tick = $5)',          cat: 'E-mini Dow ($5)' },
            { sym: 'RTY',    val: '$50 / pt  (0.10 tick = $5)',      cat: 'E-mini Russell 2000' },
            { sym: 'GC',     val: '$100 / pt  (0.1 tick = $10)',     cat: 'Gold Futures (100 oz)' },
            { sym: 'MGC',    val: '$10 / pt  (0.1 tick = $1)',       cat: 'Micro Gold (10 oz)' },
            { sym: 'SI',     val: '$5,000 / pt  (0.005 tick = $25)', cat: 'Silver Futures (5,000 oz)' },
            { sym: 'CL',     val: '$1,000 / pt  (0.01 tick = $10)', cat: 'Crude Oil (1,000 bbl)' },
            { sym: 'MCL',    val: '$100 / pt  (0.01 tick = $1)',    cat: 'Micro WTI (100 bbl)' },
            { sym: 'NG',     val: '$10,000 / pt  (0.001 tick = $10)', cat: 'Natural Gas' },
            { sym: 'XAUUSD', val: '$100 / $1 move',                  cat: 'Gold Spot (100 oz/lot)' },
            { sym: 'XAGUSD', val: '$5,000 / $1 move',                cat: 'Silver Spot (5,000 oz/lot)' },
            { sym: 'BTCUSDT',val: '$1 / $1 move',                    cat: 'Bitcoin (per BTC)' },
            { sym: 'ETHUSDT',val: '$1 / $1 move',                    cat: 'Ethereum (per ETH)' },
          ].map(({ sym, val, cat }) => (
            <div key={sym} className="flex items-start justify-between py-1.5 border-b border-border/50 gap-2">
              <div>
                <span className="text-zinc-300 font-bold">{sym}</span>
                <div className="text-[10px] text-zinc-600">{cat}</div>
              </div>
              <span className="text-zinc-400 shrink-0">{val}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Security note ── */}
      <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
        <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-500">
          Tradovate credentials are encrypted with AES-256 before storage. They are never transmitted to any third party and are only used to authenticate with Tradovate's official API.
        </p>
      </div>
    </div>
  );
}
