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
        brand: {
          DEFAULT: '#FFD700',
          bright:  '#FFED4A',
          deep:    '#E6BE00',
          dim:     'rgba(255,215,0,0.08)',
          glow:    'rgba(255,215,0,0.25)',
        },
        black: {
          DEFAULT: '#000000',
          shine:   '#0C0C0C',
          card:    '#111111',
          surface: '#161616',
          border:  '#222222',
          subtle:  '#2A2A2A',
        },
        gray: {
          1: '#FFFFFF',
          2: '#C0C0C0',
          3: '#888888',
          4: '#555555',
          5: '#333333',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'glow-sm':  '0 0 12px rgba(255,215,0,0.25)',
        'glow':     '0 0 20px rgba(255,215,0,0.35), 0 0 40px rgba(255,215,0,0.1)',
        'glow-lg':  '0 0 40px rgba(255,215,0,0.4), 0 0 80px rgba(255,215,0,0.15)',
        'glass':    '0 1px 0 rgba(255,255,255,0.06) inset, 0 -1px 0 rgba(0,0,0,0.5) inset',
        'shine':    '0 1px 0 rgba(255,255,255,0.1) inset',
        'card':     '0 0 0 1px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.6)',
        'card-hover': '0 0 0 1px rgba(255,215,0,0.2), 0 12px 40px rgba(0,0,0,0.7), 0 0 20px rgba(255,215,0,0.08)',
        'btn':      '0 1px 0 rgba(255,255,255,0.25) inset, 0 4px 12px rgba(255,215,0,0.3)',
        'btn-hover':'0 1px 0 rgba(255,255,255,0.35) inset, 0 6px 20px rgba(255,215,0,0.45)',
        'input':    '0 0 0 1px rgba(255,255,255,0.06) inset',
        'input-focus': '0 0 0 3px rgba(255,215,0,0.15), 0 0 0 1px rgba(255,215,0,0.5)',
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-out both',
        'slide-up':   'slideUp 0.3s ease-out both',
        'shine-slide':'shineSlide 2s ease-in-out infinite',
        'pulse-slow': 'pulse 4s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'float':      'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:     { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:    { '0%': { transform: 'translateY(12px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        shineSlide: {
          '0%':   { transform: 'translateX(-100%) skewX(-15deg)' },
          '100%': { transform: 'translateX(300%) skewX(-15deg)' },
        },
        glowPulse: {
          '0%,100%': { boxShadow: '0 0 12px rgba(255,215,0,0.2)' },
          '50%':     { boxShadow: '0 0 28px rgba(255,215,0,0.45), 0 0 50px rgba(255,215,0,0.1)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
}
