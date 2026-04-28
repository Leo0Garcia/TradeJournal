'use client';

import { useEffect } from 'react';

export type AccentColor = 'purple' | 'blue' | 'cyan' | 'emerald' | 'rose' | 'orange';
export type ThemeMode = 'dark' | 'light';

export const ACCENT_PRESETS: { id: AccentColor; label: string; hex: string }[] = [
  { id: 'purple',  label: 'Purple',  hex: '#7c3aed' },
  { id: 'blue',    label: 'Blue',    hex: '#2563eb' },
  { id: 'cyan',    label: 'Cyan',    hex: '#0891b2' },
  { id: 'emerald', label: 'Emerald', hex: '#059669' },
  { id: 'rose',    label: 'Rose',    hex: '#e11d48' },
  { id: 'orange',  label: 'Orange',  hex: '#ea580c' },
];

export function applyTheme(mode: ThemeMode, accent: AccentColor) {
  document.documentElement.setAttribute('data-theme', mode);
  document.documentElement.setAttribute('data-accent', accent);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const mode = (localStorage.getItem('theme-mode') as ThemeMode) ?? 'dark';
    const accent = (localStorage.getItem('theme-accent') as AccentColor) ?? 'purple';
    applyTheme(mode, accent);
  }, []);

  return <>{children}</>;
}
