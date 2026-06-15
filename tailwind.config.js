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
          gold: '#C9A84C',
          green_accent: '#10B981',
        },
        court: {
          950: '#050A07',
          900: '#0A140E',
          800: '#0F2016',
          700: '#16301F',
          600: '#1E452C',
          500: '#2B5E3E',
          400: '#3E7D55',
          accent: '#34D399',
          line: '#F4EFE2',
        },
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
        chalk: '#EDF2E4',
        carbon: {
          DEFAULT: '#0C100D',
          2: '#131814',
        },
        club: {
          bg: '#0A101D',
          surface: '#111827',
          surface_hover: '#1F2937',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      letterSpacing: {
        hud: '0.22em',
        editorial: '0.35em',
      },
      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(100vw)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        marquee: {
          '0%': { transform: 'translate3d(0, 0, 0)' },
          '100%': { transform: 'translate3d(-50%, 0, 0)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-18px) rotate(3deg)' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(28px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        ticker: 'ticker 30s linear infinite',
        marquee: 'marquee 30s linear infinite',
        'float-slow': 'float-slow 6s ease-in-out infinite',
        rise: 'rise 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'fade-in': 'fade-in 0.6s ease-out forwards',
        blink: 'blink 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
