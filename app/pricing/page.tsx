import Link from 'next/link';
import { Check, Lock, Zap, BarChart2, BookOpen, Calendar, Tag, TrendingUp, ArrowLeft } from 'lucide-react';

const FREE_FEATURES = [
  { icon: BookOpen,  text: 'Unlimited trade journal entries' },
  { icon: BarChart2, text: 'Analytics & equity curve' },
  { icon: Calendar,  text: 'P&L calendar view' },
  { icon: Tag,       text: 'Setup tags & trade notes' },
  { icon: TrendingUp,text: 'Win rate, R:R & drawdown stats' },
  { icon: Zap,       text: 'Multiple account support' },
];

const PRO_FEATURES = [
  { text: 'Everything in Free' },
  { text: 'Broker auto-sync (Tradovate, IBKR & more)' },
  { text: 'AI trade review & pattern detection' },
  { text: 'Advanced risk management alerts' },
  { text: 'Custom dashboards & layouts' },
  { text: 'Export to CSV / PDF reports' },
  { text: 'Priority support' },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      {/* Top bar */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <TrendingUp size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold text-zinc-100">TradeJournal</span>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft size={13} />
          Back to app
        </Link>
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center px-6 pt-16 pb-24">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 mb-6">
          <Zap size={11} className="text-accent-light" />
          <span className="text-xs font-medium text-accent-light">Simple, transparent pricing</span>
        </div>

        <h1 className="text-3xl font-bold text-zinc-100 text-center mb-3">
          Start free. Scale when ready.
        </h1>
        <p className="text-zinc-500 text-center max-w-md mb-14 text-sm leading-relaxed">
          Every feature you need to journal and analyse your trades is free. Pro unlocks automation and advanced tools for serious traders.
        </p>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">

          {/* Free */}
          <div className="bg-bg-surface border border-border rounded-2xl p-8 flex flex-col">
            <div className="mb-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">Free</div>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-zinc-100">$0</span>
                <span className="text-zinc-500 text-sm mb-1.5">/ month</span>
              </div>
              <p className="text-zinc-500 text-xs mt-2">No credit card required. Always free.</p>
            </div>

            <Link
              href="/"
              className="w-full py-2.5 rounded-xl border border-border text-sm font-semibold text-zinc-200 text-center hover:bg-bg-elevated transition-colors mb-8"
            >
              Get started free
            </Link>

            <ul className="space-y-3 flex-1">
              {FREE_FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-profit/10 flex items-center justify-center shrink-0">
                    <Check size={11} className="text-profit" />
                  </div>
                  <span className="text-sm text-zinc-300">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="relative bg-bg-surface border-2 border-accent/40 rounded-2xl p-8 flex flex-col overflow-hidden">
            {/* Glow */}
            <div className="absolute inset-0 bg-accent/5 pointer-events-none" />

            {/* Coming soon badge */}
            <div className="absolute top-5 right-5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/15 border border-accent/30 text-[11px] font-semibold text-accent-light">
                <Zap size={10} />
                Coming soon
              </span>
            </div>

            <div className="mb-6 relative">
              <div className="text-xs font-semibold uppercase tracking-widest text-accent-light mb-2">Pro</div>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-zinc-100">$14.99</span>
                <span className="text-zinc-500 text-sm mb-1.5">/ month</span>
              </div>
              <p className="text-zinc-500 text-xs mt-2">Billed monthly. Cancel anytime.</p>
            </div>

            <button
              disabled
              className="w-full py-2.5 rounded-xl bg-accent/30 text-sm font-semibold text-accent-light/60 text-center cursor-not-allowed mb-8 flex items-center justify-center gap-2 relative"
            >
              <Lock size={13} />
              Notify me when available
            </button>

            <ul className="space-y-3 flex-1 relative">
              {PRO_FEATURES.map(({ text }) => (
                <li key={text} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                    <Check size={11} className="text-accent-light" />
                  </div>
                  <span className="text-sm text-zinc-300">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-10 text-xs text-zinc-600 text-center">
          Questions? Reach out at{' '}
          <a href="mailto:support@tradejournal.app" className="text-zinc-500 hover:text-zinc-300 transition-colors">
            support@tradejournal.app
          </a>
        </p>
      </div>
    </div>
  );
}
