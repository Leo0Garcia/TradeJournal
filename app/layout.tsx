import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TradeJournal',
  description: 'Professional trading journal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg-base text-zinc-100">
        {children}
      </body>
    </html>
  );
}
