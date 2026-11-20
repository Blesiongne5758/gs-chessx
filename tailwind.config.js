/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#0D0F14',
        graphite: '#1A1D26',
        slate: '#2A2F3A',
        gold: '#D4AF37',
        champagne: '#F5E6A8',
        emerald: '#10B981',
        crimson: '#EF4444',
        azure: '#3B82F6',
        amber: '#F59E0B',
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        inter: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
