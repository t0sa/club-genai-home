/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        cream: '#faf9f5',
        'cream-card': '#f0ede6',
        charcoal: '#141413',
        stone: '#b0aea5',
        sand: '#e8e6dc',
        terracotta: '#d97757',
        'terracotta-dark': '#b85c3a',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
