/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ─── Système noir/moutarde ───────────────────────────────────────────
        brand: {
          DEFAULT: '#D4A017',
          hover:   '#F2C94C',
          accent:  '#FFD95A',
          muted:   '#A07810',
          glow:    'rgba(212,160,23,0.35)',
          dim:     'rgba(212,160,23,0.08)',
        },
        surface: {
          bg:     '#0A0A0A',
          card:   '#121212',
          hover:  '#1A1A1A',
          border: '#242424',
          line:   '#1E1E1E',
        },
        ink: {
          primary:   '#FFFFFF',
          secondary: '#B3B3B3',
          muted:     '#666666',
          subtle:    '#3A3A3A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'brand':    '0 0 12px rgba(212,160,23,0.4)',
        'brand-sm': '0 0 6px rgba(212,160,23,0.25)',
        'brand-lg': '0 0 24px rgba(212,160,23,0.35)',
        'card':     '0 1px 3px rgba(0,0,0,0.6)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.8)',
      },
      animation: {
        'fade-in':    'fadeIn 0.25s ease-out',
        'slide-up':   'slideUp 0.25s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',   opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 6px rgba(212,160,23,0.25)' },
          '50%':      { boxShadow: '0 0 16px rgba(212,160,23,0.5)' },
        },
      },
    },
  },
  plugins: [],
}
