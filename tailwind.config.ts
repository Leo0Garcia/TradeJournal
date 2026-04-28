import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base:     'rgb(var(--bg-base) / <alpha-value>)',
          surface:  'rgb(var(--bg-surface) / <alpha-value>)',
          elevated: 'rgb(var(--bg-elevated) / <alpha-value>)',
          overlay:  'rgb(var(--bg-overlay) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--border) / <alpha-value>)',
          subtle:  'rgb(var(--border-subtle) / <alpha-value>)',
          strong:  'rgb(var(--border-strong) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          hover:   'rgb(var(--accent-hover) / <alpha-value>)',
          light:   'rgb(var(--accent-light) / <alpha-value>)',
          muted:   'rgb(var(--accent-muted) / <alpha-value>)',
        },
        profit: {
          DEFAULT: '#22c55e',
          muted: '#16a34a33',
          text: '#86efac',
        },
        loss: {
          DEFAULT: '#ef4444',
          muted: '#dc262633',
          text: '#fca5a5',
        },
        neutral: {
          muted: '#3f3f46',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
