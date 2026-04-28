'use client';

import { useState } from 'react';
import { Menu, X, Plus } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import { AccountProvider } from '@/contexts/AccountContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <AccountProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Backdrop for mobile nav */}
        {mobileNavOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Mobile top bar */}
          <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-bg-surface shrink-0 z-30">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-bg-elevated transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center">
                <span className="text-white text-xs font-bold">T</span>
              </div>
              <span className="text-sm font-bold text-zinc-100">TradeJournal</span>
            </div>
            {/* Empty right side for balance */}
            <div className="w-9" />
          </div>

          <main className="flex-1 overflow-y-auto overflow-x-hidden w-full">
            {children}
          </main>
        </div>
      </div>
    </AccountProvider>
  );
}
