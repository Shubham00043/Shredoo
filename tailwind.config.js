/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        lounge: {
          bg: 'var(--lounge-bg)',
          surface: 'var(--lounge-surface)',
          card: 'var(--lounge-card)',
          cardHover: 'var(--lounge-card-hover)',
          border: 'var(--lounge-border)',
          borderSubtle: 'var(--lounge-border-subtle)',
          accent: '#d97706', // Warm Amber
          accentHover: '#b45309',
          accentLight: '#f59e0b',
          sage: '#84a98c',
          textMuted: 'var(--lounge-text-muted)',
          textSecondary: 'var(--lounge-text-secondary)',
          textPrimary: 'var(--lounge-text-primary)',
        },
        // Kept for backward compatibility mapping smoothly to lounge colors
        shred: {
          dark: 'var(--lounge-bg)',
          card: 'var(--lounge-surface)',
          cardHover: 'var(--lounge-card)',
          border: 'var(--lounge-border)',
          cyan: '#d97706', // Remapped to warm amber
          purple: '#b45309', // Remapped to warm amber deep
          pink: '#84a98c', // Remapped to sage
          amber: '#f59e0b',
          emerald: '#84a98c',
          danger: '#ef4444',
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
