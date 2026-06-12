/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wimbledon: {
          navy: '#001A57',
          green: '#006400',
          purple: '#4B0082',
          gold: '#C9A84C',       /* Stitch Dark mode accent */
          green_accent: '#10B981', /* Pop green for dark mode */
        },
        club: {
          bg: '#0A101D',
          surface: '#111827',
          surface_hover: '#1F2937',
        },
        /* Deep tennis greens — the dark canvas ramp */
        court: {
          950: '#050A07',
          900: '#0A140E',
          800: '#0F2016',
          700: '#16301F',
          600: '#1E452C',
          500: '#2B5E3E',
          400: '#3E7D55',
          accent: '#34D399',
          line: '#F4EFE2', /* chalk / court-line white */
        },
        /* Rich clay / terracotta ramp */
        clay: {
          50: '#FCF2EC',
          100: '#F7E0D2',
          200: '#EFC2A8',
          300: '#E59E7C',
          400: '#D97A55',
          500: '#C75D3D',
          600: '#A8482E',
          700: '#853723',
          800: '#5F271A',
          900: '#3D1A12',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(100vw)' },
          '100%': { transform: 'translateX(-100%)' }
        },
        marquee: {
          '0%': { transform: 'translate3d(0, 0, 0)' },
          '100%': { transform: 'translate3d(-50%, 0, 0)' }
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(52, 211, 153, 0.35)' },
          '50%': { boxShadow: '0 0 0 9px rgba(52, 211, 153, 0)' }
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' }
        },
        'ball-bounce': {
          '0%, 100%': { transform: 'translateY(0) scale(1, 1)' },
          '45%': { transform: 'translateY(22px) scale(1, 1)' },
          '50%': { transform: 'translateY(24px) scale(1.15, 0.85)' },
          '55%': { transform: 'translateY(22px) scale(1, 1)' }
        },
      },
      animation: {
        ticker: 'ticker 30s linear infinite',
        marquee: 'marquee 30s linear infinite',
        'fade-in': 'fade-in 0.8s ease-out both',
        rise: 'rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'glow-pulse': 'glow-pulse 2.4s ease-in-out infinite',
        'float-slow': 'float-slow 7s ease-in-out infinite',
        'ball-bounce': 'ball-bounce 1.1s cubic-bezier(0.36, 0, 0.66, 1) infinite',
      }
    },
  },
  plugins: [],
}
