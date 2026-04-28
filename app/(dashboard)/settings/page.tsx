'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Plus, Trash2, Pencil, Check, X, AlertTriangle,
  Moon, Sun, User, CreditCard, Palette, Tag as TagIcon,
  Briefcase, BookOpen, ChevronRight, Lock, Zap, Camera, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { ACCENT_PRESETS, applyTheme, type AccentColor, type ThemeMode } from '@/components/ThemeProvider';
import { TAG_COLORS, getTagColorStyle, cn } from '@/lib/utils';
import { useAccount, ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_COLORS } from '@/contexts/AccountContext';
import { createClient } from '@/lib/supabase/client';
import type { Tag, Account, AccountType } from '@/types';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const ACCOUNT_TYPES: AccountType[] = ['live', 'funded', 'demo'];

const inputCls = 'w-full bg-bg-overlay border border-border rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-accent placeholder:text-zinc-600';

type Section = 'general' | 'accounts' | 'appearance' | 'tags' | 'billing';

const SECTIONS: { id: Section; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: 'general',    label: 'General',          icon: User },
  { id: 'accounts',  label: 'Trading Accounts',  icon: Briefcase },
  { id: 'appearance',label: 'Appearance',        icon: Palette },
  { id: 'tags',      label: 'Setup Tags',        icon: TagIcon },
  { id: 'billing',   label: 'Billing',           icon: CreditCard, badge: 'coming soon' },
];

function ChallengeFields({ form, setForm }: { form: typeof emptyAccountForm; setForm: (f: typeof emptyAccountForm) => void }) {
  if (form.account_type !== 'funded') return null;
  return (
    <div className="space-y-3 pt-1 border-t border-border/50">
      <div>
        <label className="block text-xs text-zinc-500 mb-1.5">Account Status</label>
        <div className="flex gap-2">
          {([false, true] as const).map(isChallenge => (
            <button key={String(isChallenge)} type="button"
              onClick={() => setForm({ ...form, is_challenge: isChallenge })}
              className={cn('flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                form.is_challenge === isChallenge
                  ? 'border-accent bg-accent/10 text-accent-light'
                  : 'border-border text-zinc-500 hover:text-zinc-300 hover:border-border-strong')}>
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
  const [section, setSection] = useState<Section>('general');
  const [user, setUser] = useState<SupabaseUser | null>(null);

  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [creatingTag, setCreatingTag] = useState(false);

  const [showNewAccount, setShowNewAccount] = useState(false);
  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [savingAccount, setSavingAccount] = useState(false);
  const [editAccountId, setEditAccountId] = useState<string | null>(null);
  const [editAccountForm, setEditAccountForm] = useState(emptyAccountForm);

  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [accentColor, setAccentColor] = useState<AccentColor>('purple');

  // Profile editing
  const [profileName, setProfileName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    setThemeMode((localStorage.getItem('theme-mode') as ThemeMode) ?? 'dark');
    setAccentColor((localStorage.getItem('theme-accent') as AccentColor) ?? 'purple');
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setProfileName(user?.user_metadata?.full_name || user?.email?.split('@')[0] || '');
    });
  }, []);

  async function saveProfile() {
    setProfileSaving(true);
    setProfileError('');
    const supabase = createClient();
    const { data, error } = await supabase.auth.updateUser({
      data: { full_name: profileName.trim() },
    });
    if (error) {
      setProfileError(error.message);
    } else {
      setUser(data.user);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    }
    setProfileSaving(false);
  }

  async function uploadAvatar(file: File) {
    setAvatarUploading(true);
    setProfileError('');
    try {
      const supabase = createClient();
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      const ext = file.name.split('.').pop();
      const path = `${currentUser.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const avatarUrl = urlData.publicUrl + `?t=${Date.now()}`;

      const { data, error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl },
      });
      if (updateError) throw updateError;
      setUser(data.user);
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Upload failed');
    }
    setAvatarUploading(false);
  }

  // Respect ?section= query param
  useEffect(() => {
    const s = searchParams.get('section') as Section | null;
    if (s && SECTIONS.find(x => x.id === s)) setSection(s);
  }, [searchParams]);

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

  useEffect(() => { loadTags(); }, [loadTags]);

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
    await fetch('/api/tags', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    await loadTags();
  }

  async function createAccount() {
    if (!accountForm.name.trim()) return;
    setSavingAccount(true);
    await fetch('/api/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(accountForm) });
    setAccountForm(emptyAccountForm);
    setShowNewAccount(false);
    setSavingAccount(false);
    await reloadAccounts();
  }

  async function saveAccountEdit(id: string) {
    await fetch(`/api/accounts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editAccountForm) });
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
      name: a.name, broker: a.broker ?? '', description: a.description ?? '',
      currency: a.currency, account_type: a.account_type,
      account_size: a.account_size != null ? String(a.account_size) : '',
      is_challenge: a.is_challenge ?? false,
      profit_target: a.profit_target != null ? String(a.profit_target) : '',
      daily_loss_limit: a.daily_loss_limit != null ? String(a.daily_loss_limit) : '',
      total_loss_limit: a.total_loss_limit != null ? String(a.total_loss_limit) : '',
    });
  }

  const grouped = ACCOUNT_TYPES
    .map(t => ({ type: t, accs: accounts.filter(a => a.account_type === t) }))
    .filter(g => g.accs.length > 0);

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Trader';
  const avatarLetter = displayName[0]?.toUpperCase() ?? 'T';

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-screen">
      {/* ── Section nav: sidebar on desktop, horizontal tabs on mobile ── */}
      <div className="lg:w-52 lg:shrink-0 lg:border-r border-b lg:border-b-0 border-border bg-bg-surface lg:flex lg:flex-col p-3 gap-0.5">
        <div className="px-3 py-2 mb-1 hidden lg:block">
          <h1 className="text-sm font-bold text-zinc-100">Settings</h1>
          <p className="text-[11px] text-zinc-500 mt-0.5">Manage your workspace</p>
        </div>
        {/* Mobile: horizontal scrolling tab row */}
        <div className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                'flex items-center gap-2 shrink-0 lg:w-full px-3 py-2 rounded-lg text-sm transition-all text-left whitespace-nowrap',
                section === s.id
                  ? 'bg-accent/10 text-accent-light font-medium'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-bg-elevated'
              )}
            >
              <s.icon size={14} className="shrink-0" />
              <span className="flex-1">{s.label}</span>
              {s.badge && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-700/60 text-zinc-500 border border-zinc-600/40 font-medium leading-none uppercase tracking-wide hidden lg:inline">
                  soon
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Right content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl p-4 lg:p-8 space-y-6">

          {/* ── GENERAL ── */}
          {section === 'general' && (
            <>
              <SectionHeader title="General" sub="Your profile and account information" />

              {/* Profile card */}
              <div className="bg-bg-surface border border-border rounded-xl p-5">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Profile</h3>

                {/* Avatar */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative group shrink-0">
                    <div className="w-16 h-16 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center overflow-hidden">
                      {user?.user_metadata?.avatar_url
                        ? <img src={user.user_metadata.avatar_url} alt="" className="w-16 h-16 object-cover" />
                        : <span className="text-2xl font-bold text-accent-light">{avatarLetter}</span>
                      }
                      {avatarUploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                          <Loader2 size={18} className="text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <label className={cn(
                      'absolute inset-0 flex items-center justify-center rounded-xl cursor-pointer transition-all',
                      'bg-black/0 group-hover:bg-black/50',
                      avatarUploading && 'pointer-events-none'
                    )}>
                      <Camera size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) uploadAvatar(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-100">{displayName}</div>
                    <div className="text-xs text-zinc-500 mb-1.5">{user?.email}</div>
                    <div className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-zinc-700/50 text-zinc-400 border border-zinc-600/40 font-medium uppercase tracking-wide">
                      Free Plan
                    </div>
                    <p className="text-[11px] text-zinc-600 mt-1.5">Click avatar to upload a new photo</p>
                  </div>
                </div>

                {/* Editable fields */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1.5">Display Name</label>
                    <input
                      value={profileName}
                      onChange={e => setProfileName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveProfile()}
                      placeholder="Your name"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1.5">Email</label>
                    <input value={user?.email ?? ''} className={cn(inputCls, 'opacity-50 cursor-not-allowed')} disabled />
                  </div>
                </div>

                {profileError && (
                  <p className="text-xs text-loss mb-3">{profileError}</p>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={saveProfile}
                    disabled={profileSaving || !profileName.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                  >
                    {profileSaving
                      ? <><Loader2 size={12} className="animate-spin" /> Saving...</>
                      : profileSaved
                      ? <><Check size={12} /> Saved</>
                      : 'Save Changes'
                    }
                  </button>
                  <p className="text-[11px] text-zinc-600">Email changes are managed through your auth provider.</p>
                </div>
              </div>

              {/* Instrument reference */}
              <div className="bg-bg-surface border border-border rounded-xl p-5">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Instrument Point Values</h3>
                <p className="text-xs text-zinc-500 mb-4">$ per 1-point move per contract — used for P&amp;L calculation.</p>
                <div className="grid grid-cols-2 gap-x-6 text-xs font-mono">
                  {[
                    { sym: 'MNQ',     val: '$2 / pt',      cat: 'Micro E-mini Nasdaq' },
                    { sym: 'MES',     val: '$5 / pt',      cat: 'Micro E-mini S&P 500' },
                    { sym: 'MYM',     val: '$0.50 / pt',   cat: 'Micro E-mini Dow' },
                    { sym: 'M2K',     val: '$5 / pt',      cat: 'Micro E-mini Russell 2000' },
                    { sym: 'NQ',      val: '$20 / pt',     cat: 'E-mini Nasdaq-100' },
                    { sym: 'ES',      val: '$50 / pt',     cat: 'E-mini S&P 500' },
                    { sym: 'YM',      val: '$5 / pt',      cat: 'E-mini Dow' },
                    { sym: 'RTY',     val: '$50 / pt',     cat: 'E-mini Russell 2000' },
                    { sym: 'GC',      val: '$100 / pt',    cat: 'Gold Futures' },
                    { sym: 'MGC',     val: '$10 / pt',     cat: 'Micro Gold' },
                    { sym: 'SI',      val: '$5,000 / pt',  cat: 'Silver Futures' },
                    { sym: 'CL',      val: '$1,000 / pt',  cat: 'Crude Oil' },
                    { sym: 'MCL',     val: '$100 / pt',    cat: 'Micro WTI' },
                    { sym: 'NG',      val: '$10,000 / pt', cat: 'Natural Gas' },
                    { sym: 'XAUUSD', val: '$100 / $1',    cat: 'Gold Spot' },
                    { sym: 'XAGUSD', val: '$5,000 / $1',  cat: 'Silver Spot' },
                    { sym: 'BTCUSDT',val: '$1 / $1',      cat: 'Bitcoin' },
                    { sym: 'ETHUSDT',val: '$1 / $1',      cat: 'Ethereum' },
                  ].map(({ sym, val, cat }) => (
                    <div key={sym} className="flex items-center justify-between py-1.5 border-b border-border/50 gap-2">
                      <div>
                        <span className="text-zinc-300 font-bold">{sym}</span>
                        <div className="text-[10px] text-zinc-600">{cat}</div>
                      </div>
                      <span className="text-zinc-400 shrink-0">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-500">
                  Tradovate credentials are encrypted with AES-256 before storage and never transmitted to any third party.
                </p>
              </div>
            </>
          )}

          {/* ── TRADING ACCOUNTS ── */}
          {section === 'accounts' && (
            <>
              <SectionHeader title="Trading Accounts" sub="Organize your live, funded, and demo accounts" />
              <div className="bg-bg-surface border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-zinc-500">Group trades by account for separate P&amp;L tracking.</p>
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
                              accountForm.account_type === t ? ACCOUNT_TYPE_COLORS[t] : 'border-border text-zinc-500 hover:text-zinc-300 hover:border-border-strong')}>
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
                                    {a.is_disabled && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-loss/20 text-loss uppercase tracking-wider">Disabled</span>}
                                    {a.is_challenge && !a.is_disabled && !a.challenge_passed && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 uppercase tracking-wider">Eval</span>}
                                    {a.challenge_passed && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-profit/10 text-profit uppercase tracking-wider">Passed</span>}
                                  </div>
                                  <div className="text-xs text-zinc-500">
                                    {[a.broker, a.currency, a.description].filter(Boolean).join(' · ')}
                                    {a.is_challenge && a.profit_target && <span className="ml-1">· Target ${a.profit_target.toLocaleString()}</span>}
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
              </div>
            </>
          )}

          {/* ── APPEARANCE ── */}
          {section === 'appearance' && (
            <>
              <SectionHeader title="Appearance" sub="Customise how TradeJournal looks for you" />
              <div className="bg-bg-surface border border-border rounded-xl p-5 space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Theme</label>
                  <div className="flex gap-2">
                    {(['dark', 'light'] as ThemeMode[]).map(mode => (
                      <button key={mode} onClick={() => setTheme(mode, accentColor)}
                        className={cn('flex items-center gap-2 flex-1 py-2.5 px-4 rounded-xl border text-sm font-medium transition-all',
                          themeMode === mode ? 'border-accent bg-accent/10 text-accent-light' : 'border-border text-zinc-500 hover:text-zinc-300 hover:border-border-strong')}>
                        {mode === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
                        {mode === 'dark' ? 'Dark' : 'Light'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Accent Colour</label>
                  <div className="flex gap-2 flex-wrap">
                    {ACCENT_PRESETS.map(preset => (
                      <button key={preset.id} onClick={() => setTheme(themeMode, preset.id)} title={preset.label}
                        className={cn('flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all',
                          accentColor === preset.id ? 'border-current text-zinc-100 shadow-lg' : 'border-border text-zinc-500 hover:text-zinc-300 hover:border-border-strong')}
                        style={accentColor === preset.id ? { borderColor: preset.hex, boxShadow: `0 0 0 1px ${preset.hex}40` } : undefined}>
                        <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: preset.hex }} />
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── TAGS ── */}
          {section === 'tags' && (
            <>
              <SectionHeader title="Setup Tags" sub="Label your trades with strategy tags for performance analysis" />
              <div className="bg-bg-surface border border-border rounded-xl p-5">
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
                  {tags.length === 0 && <p className="text-sm text-zinc-600 text-center py-4">No tags yet. Add your first setup tag above.</p>}
                  {tags.map(tag => (
                    <div key={tag.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-bg-elevated transition-colors group">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium border" style={getTagColorStyle(tag.color)}>{tag.name}</span>
                      <button onClick={() => deleteTag(tag.id, tag.name)} className="p-1.5 text-zinc-700 hover:text-loss hover:bg-loss-muted rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── BILLING ── */}
          {section === 'billing' && (
            <>
              <SectionHeader title="Billing" sub="Manage your subscription and plan" />

              {/* Current plan */}
              <div className="bg-bg-surface border border-border rounded-xl p-5">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Current Plan</h3>
                <div className="flex items-center justify-between p-4 rounded-xl bg-bg-overlay border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-zinc-700/50 flex items-center justify-center">
                      <BookOpen size={16} className="text-zinc-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">Free Plan</div>
                      <div className="text-xs text-zinc-500">Full journal, analytics &amp; calendar</div>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-zinc-100">$0 / mo</span>
                </div>
              </div>

              {/* Pro coming soon */}
              <div className="relative bg-bg-surface border-2 border-accent/30 rounded-xl p-5 overflow-hidden">
                <div className="absolute inset-0 bg-accent/5 pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold text-accent-light uppercase tracking-wider">Pro Plan</h3>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/15 border border-accent/30 text-[11px] font-semibold text-accent-light">
                      <Zap size={10} /> Coming soon
                    </span>
                  </div>
                  <ul className="space-y-2 mb-5">
                    {['Broker auto-sync (Tradovate, IBKR & more)', 'AI trade review & pattern detection', 'Advanced risk management alerts', 'Custom dashboards & layouts', 'Export to CSV / PDF reports', 'Priority support'].map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-zinc-400">
                        <div className="w-4 h-4 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                          <Check size={10} className="text-accent-light" />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button disabled className="w-full py-2.5 rounded-xl bg-accent/20 text-sm font-semibold text-accent-light/50 flex items-center justify-center gap-2 cursor-not-allowed">
                    <Lock size={13} /> Available soon — $14.99 / month
                  </button>
                </div>
              </div>

              <Link href="/pricing" className="flex items-center justify-between p-4 bg-bg-surface border border-border rounded-xl hover:border-border-strong transition-colors group">
                <span className="text-sm text-zinc-300">View full pricing details</span>
                <ChevronRight size={15} className="text-zinc-500 group-hover:text-zinc-200 transition-colors" />
              </Link>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-2">
      <h2 className="text-lg font-bold text-zinc-100">{title}</h2>
      <p className="text-sm text-zinc-500 mt-0.5">{sub}</p>
    </div>
  );
}
