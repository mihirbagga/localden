/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        neon: {
          magenta: '#ff2e6d',
          cyan:    '#00e5ff',
          gold:    '#ffd23f',
          purple:  '#bf00ff',
          green:   '#00ff94',
        },
        dark: {
          950: '#04040a',
          900: '#0a0a14',
          800: '#0f0f1e',
          700: '#14142a',
          600: '#1c1c38',
          500: '#252545',
        },
      },
      fontFamily: {
        bungee:  ['"Bungee"', 'cursive'],
        display: ['"Rajdhani"', 'sans-serif'],
        body:    ['"Inter"', 'sans-serif'],
      },
      animation: {
        'float':         'float 6s ease-in-out infinite',
        'float-slow':    'float 9s ease-in-out infinite',
        'neon-pulse':    'neonPulse 2.5s ease-in-out infinite',
        'gradient-x':    'gradientX 4s ease infinite',
        'grid-move':     'gridMove 20s linear infinite',
        'slide-up':      'slideUp 0.6s ease forwards',
        'fade-in':       'fadeIn 0.5s ease forwards',
        'btn-shimmer':   'btnShimmer 2.5s ease infinite',
        'flicker':       'flicker 4s step-start infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-18px)' },
        },
        neonPulse: {
          '0%, 100%': {
            textShadow: '0 0 8px #ff2e6d, 0 0 20px #ff2e6daa, 0 0 40px #ff2e6d55',
          },
          '50%': {
            textShadow: '0 0 8px #00e5ff, 0 0 20px #00e5ffaa, 0 0 40px #00e5ff55',
          },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
        gridMove: {
          '0%':   { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '50px 50px' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(32px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        btnShimmer: {
          '0%':   { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
        flicker: {
          '0%, 95%, 100%': { opacity: '1' },
          '96%':           { opacity: '0.4' },
          '97%':           { opacity: '1' },
          '98%':           { opacity: '0.6' },
          '99%':           { opacity: '1' },
        },
      },
      backgroundSize: {
        '300%': '300%',
        '400%': '400%',
      },
    },
  },
  plugins: [],
}
