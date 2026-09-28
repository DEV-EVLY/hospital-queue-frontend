/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary institutional blue
        primary: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
          950: '#172554',
        },
        // Health teal — success, active states
        health: {
          50:  '#F0FDF9',
          100: '#CCFBEF',
          200: '#99F6E0',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        // Neutral surface palette — used for backgrounds and borders
        surface: {
          50:  '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        // Ticket / queue status semantic colors
        status: {
          waiting:    '#F59E0B',
          called:     '#3B82F6',
          attending:  '#10B981',
          attended:   '#6B7280',
          absent:     '#EF4444',
          derived:    '#8B5CF6',
          cancelled:  '#9CA3AF',
        },
        // Priority level colors
        priority: {
          urgent:       '#EF4444',
          preferential: '#F59E0B',
          normal:       '#3B82F6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        // Display sizes for cartelera / kiosko
        'display-xl': ['6rem',  { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg': ['4rem',  { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-md': ['2.5rem',{ lineHeight: '1.1', letterSpacing: '-0.01em', fontWeight: '600' }],
      },
      boxShadow: {
        'card':       '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
        'card-md':    '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        'card-lg':    '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.06)',
        'modal':      '0 20px 25px -5px rgb(0 0 0 / 0.15), 0 8px 10px -6px rgb(0 0 0 / 0.12)',
        'inner-sm':   'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)',
      },
      borderRadius: {
        'xl2': '1rem',
        'xl3': '1.25rem',
      },
      keyframes: {
        marquee: {
          '0%':   { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        flashBg: {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%':      { backgroundColor: 'rgb(59 130 246 / 0.15)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        ticker: {
          '0%':   { transform: 'translateX(100vw)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
      animation: {
        'marquee':     'ticker 30s linear infinite',
        'fade-up':     'fadeUp 0.3s ease-out forwards',
        'scale-in':    'scaleIn 0.2s ease-out forwards',
        'flash-bg':    'flashBg 0.8s ease-in-out 3',
        'pulse-slow':  'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer':     'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
}
