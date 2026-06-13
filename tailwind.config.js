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
        sport: {
          tennis: '#006400',
          badminton: '#001A57',
          squash: '#4B0082',
          pickleball: '#C9A84C',
          tabletennis: '#10B981',
        },
        club: {
          bg: '#0A101D',
          surface: '#111827',
          surface_hover: '#1F2937',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(100vw)' },
          '100%': { transform: 'translateX(-100%)' }
        },
        marquee: {
          '0%': { transform: 'translate3d(0, 0, 0)' },
          '100%': { transform: 'translate3d(-50%, 0, 0)' }
        }
      },
      animation: {
        ticker: 'ticker 30s linear infinite',
        marquee: 'marquee 30s linear infinite',
      }
    },
  },
  plugins: [],
}
