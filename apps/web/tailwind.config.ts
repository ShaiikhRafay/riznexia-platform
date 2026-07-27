import type { Config } from 'tailwindcss';

// Design tokens transcribed from docs/17-ui-ux-wireframes.md §2-4.
// Colors are defined as CSS variables in globals.css so the same class
// (e.g. bg-canvas) resolves differently in light vs dark mode.
const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-bg-canvas)',
        surface: 'var(--color-bg-surface)',
        'surface-raised': 'var(--color-bg-surface-raised)',
        border: 'var(--color-border-default)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        accent: 'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        info: 'var(--color-info)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
