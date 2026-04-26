'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, BookOpen, BarChart2, TrendingUp,
  Settings, Zap, LogOut, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/journal', label: 'Journal', icon: BookOpen },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Trader';
  const avatarLetter = displayName[0]?.toUpperCase() ?? 'T';

  return (
    <aside className="flex flex-col w-56 shrink-0 border-r border-border bg-bg-surface">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-border">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent">
          <Zap size={14} className="text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-zinc-100 leading-none">TradeJournal</div>
          <div className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-wider">Pro</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-100',
                active
                  ? 'bg-accent text-white shadow-lg shadow-accent/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-bg-elevated'
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Market indicator */}
      <div className="px-4 py-3 mx-3 mb-3 rounded-lg bg-bg-elevated border border-border">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={12} className="text-profit" />
          <span className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider">Markets</span>
        </div>
        <div className="text-xs text-zinc-500">Manual tracking mode</div>
      </div>

      {/* Footer: settings + user */}
      <div className="p-3 border-t border-border space-y-0.5">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
            pathname === '/settings'
              ? 'bg-accent text-white'
              : 'text-zinc-500 hover:text-zinc-100 hover:bg-bg-elevated'
          )}
        >
          <Settings size={15} />
          Settings
        </Link>

        {/* User row */}
        <div className="flex items-center justify-between px-3 py-2 mt-1">
          <div className="flex items-center gap-2 min-w-0">
            {user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt={displayName}
                className="w-6 h-6 rounded-full shrink-0"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-accent/30 border border-accent/50 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-accent-light">{avatarLetter}</span>
              </div>
            )}
            <span className="text-xs text-zinc-400 truncate">{displayName}</span>
          </div>
          <button
            onClick={signOut}
            className="p-1.5 text-zinc-600 hover:text-zinc-100 hover:bg-bg-elevated rounded-lg transition-all"
            title="Sign out"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
