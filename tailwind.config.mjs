/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Light mode palette
        cream: '#faf9f5',
        'cream-card': '#f0ede6',
        charcoal: '#141413',
        stone: '#b0aea5',
        sand: '#e8e6dc',
        terracotta: '#d97757',
        'terracotta-dark': '#b85c3a',
        // Dark mode palette (warm, no cold grays)
        'dark-bg': '#141210',
        'dark-card': '#1e1c18',
        'dark-text': '#f0ede6',
        'dark-muted': '#8a8580',
        'dark-border': '#2d2b26',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
