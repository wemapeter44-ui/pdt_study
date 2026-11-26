import colors from 'tailwindcss/colors';
import typography from '@tailwindcss/typography';

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#05070D', surface: '#0B0F1A', surface2: '#111827',
        border: '#1F2937', fg: '#FFFFFF', muted: '#9CA3AF',
        // keeps your `text-cyan` / `bg-cyan` working AND restores cyan-50 … cyan-950
        cyan: { ...colors.cyan, DEFAULT: '#22D3EE' },
        purple: '#6366F1',
        success: '#10B981', danger: '#EF4444', warning: '#F59E0B',
      },
      boxShadow: { card: '0 4px 24px rgba(0,0,0,0.25)' },
    },
  },
  plugins: [typography],
};