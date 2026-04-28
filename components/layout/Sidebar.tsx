'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, BookOpen, BarChart2, TrendingUp,
  Settings, Zap, LogOut, CalendarDays, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import AccountSwitcher from './AccountSwitcher';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/journal', label: 'Journal', icon: BookOpen },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/calendar', label: 'P&L Calendar', icon: CalendarDays },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // Restore collapsed state from localStorage
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored === 'true') setCollapsed(true);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  function toggleCollapsed() {
    setCollapsed(c => {
      localStorage.setItem('sidebar-collapsed', String(!c));
      return !c;
    });
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Trader';
  const avatarLetter = displayName[0]?.toUpperCase() ?? 'T';

  // Close mobile nav when a link is clicked
  function handleNavClick() {
    if (onMobileClose) onMobileClose();
  }

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-border bg-bg-surface transition-all duration-300 ease-in-out',
        // Mobile: fixed full-height drawer
        'fixed inset-y-0 left-0 z-50 w-72',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        // Desktop: relative inline sidebar, no transform
        'lg:relative lg:translate-x-0 lg:z-auto lg:inset-y-auto lg:left-auto',
        collapsed ? 'lg:w-14' : 'lg:w-56',
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 border-b border-border shrink-0',
        collapsed ? 'justify-center px-0' : 'gap-2.5 px-5'
      )}>
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent shrink-0">
          <Zap size={14} className="text-white" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-zinc-100 leading-none">TradeJournal</div>
            <div className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-wider">Free Plan</div>
          </div>
        )}
        {/* Mobile close button */}
        {!collapsed && (
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1.5 text-zinc-500 hover:text-zinc-100 rounded-lg transition-colors shrink-0"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className={cn('flex-1 py-4 space-y-0.5', collapsed ? 'px-2' : 'px-3')}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              onClick={handleNavClick}
              className={cn(
                'flex items-center rounded-lg text-sm font-medium transition-all duration-100',
                collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2',
                active
                  ? 'bg-accent text-white shadow-lg shadow-accent/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-bg-elevated'
              )}
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      {/* Account switcher */}
      {!collapsed && <AccountSwitcher />}
      {collapsed && (
        <div className="mx-2 mb-3 flex justify-center">
          <div className="w-2 h-2 rounded-full bg-accent/60" title="Account" />
        </div>
      )}

      {/* Market indicator */}
      {!collapsed && (
        <div className="px-4 py-3 mx-3 mb-3 rounded-lg bg-bg-elevated border border-border">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={12} className="text-profit" />
            <span className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider">Markets</span>
          </div>
          <div className="text-xs text-zinc-500">Manual tracking mode</div>
        </div>
      )}

      {/* Footer: settings + user */}
      <div className={cn('border-t border-border space-y-0.5', collapsed ? 'p-2' : 'p-3')}>
        <Link
          href="/pricing"
          title={collapsed ? 'Pricing' : undefined}
          onClick={handleNavClick}
          className={cn(
            'flex items-center rounded-lg text-sm transition-all',
            collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2',
            pathname === '/pricing'
              ? 'bg-bg-elevated text-zinc-300'
              : 'text-zinc-500 hover:text-zinc-100 hover:bg-bg-elevated'
          )}
        >
          <Zap size={15} className="shrink-0" />
          {!collapsed && (
            <span className="flex items-center gap-2">
              Upgrade
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-700/60 text-zinc-400 border border-zinc-600/40 font-medium leading-none">
                Free
              </span>
            </span>
          )}
        </Link>
        <Link
          href="/settings"
          title={collapsed ? 'Settings' : undefined}
          onClick={handleNavClick}
          className={cn(
            'flex items-center rounded-lg text-sm transition-all',
            collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2',
            pathname === '/settings'
              ? 'bg-bg-elevated text-zinc-300'
              : 'text-zinc-500 hover:text-zinc-100 hover:bg-bg-elevated'
          )}
        >
          <Settings size={15} className="shrink-0" />
          {!collapsed && 'Settings'}
        </Link>

        {/* User row */}
        {!collapsed ? (
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
        ) : (
          <button
            onClick={signOut}
            title="Sign out"
            className="flex items-center justify-center w-full p-2.5 text-zinc-600 hover:text-zinc-100 hover:bg-bg-elevated rounded-lg transition-all"
          >
            <LogOut size={14} />
          </button>
        )}
      </div>

      {/* Collapse toggle button — desktop only */}
      <button
        onClick={toggleCollapsed}
        className="hidden lg:flex absolute -right-3 top-[72px] z-10 items-center justify-center w-6 h-6 rounded-full bg-bg-elevated border border-border text-zinc-500 hover:text-zinc-100 hover:bg-bg-overlay transition-all shadow-md"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRight size={12} />
          : <ChevronLeft size={12} />
        }
      </button>
    </aside>
  );
}
