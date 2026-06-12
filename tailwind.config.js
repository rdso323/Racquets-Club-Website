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
        // ── FRC "AFTER DARK" SYSTEM ─────────────────────────────
        court: '#070907',        // page void — green-tinted black
        carbon: '#0C100D',       // raised surface
        'carbon-2': '#131814',   // hover surface
        chalk: '#EDF2E4',        // service-line white
        ace: '#D7FF3E',          // fluoro ball lime  → TENNIS
        shuttle: '#6FA8FF',      // electric feather  → BADMINTON
        ember: '#FF6A3D',        // hot clay          → SQUASH
        duke: '#2148C0',         // heritage thread
        alert: '#FF4D4D',
      },
      fontFamily: {
        display: ['Archivo', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        sans: ['Archivo', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        hud: '0.18em',
        wide2: '0.32em',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.15' },
        },
        sweep: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'pulse-node': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.9' },
          '50%': { transform: 'scale(1.6)', opacity: '0.35' },
        },
        marquee: {
          '0%': { transform: 'translate3d(0, 0, 0)' },
          '100%': { transform: 'translate3d(-50%, 0, 0)' },
        },
      },
      animation: {
        blink: 'blink 1.1s steps(2) infinite',
        sweep: 'sweep 3.2s cubic-bezier(.6,.05,.3,.95) infinite',
        'spin-slow': 'spin-slow 14s linear infinite',
        'pulse-node': 'pulse-node 2s ease-in-out infinite',
        marquee: 'marquee 28s linear infinite',
      },
    },
  },
  plugins: [],
}
