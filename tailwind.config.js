/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('daisyui'),
  ],
  daisyui: {
    themes: [
      {
        gate: {
          'primary':          '#3b82f6',
          'primary-content':  '#ffffff',
          'secondary':        '#6366f1',
          'secondary-content':'#ffffff',
          'accent':           '#10b981',
          'accent-content':   '#ffffff',
          'neutral':          '#1e2030',
          'neutral-content':  '#a6adbb',
          'base-100':         '#0f1117',
          'base-200':         '#181a24',
          'base-300':         '#1e2030',
          'base-content':     '#e2e8f0',
          'info':             '#38bdf8',
          'info-content':     '#ffffff',
          'success':          '#10b981',
          'success-content':  '#ffffff',
          'warning':          '#f59e0b',
          'warning-content':  '#000000',
          'error':            '#ef4444',
          'error-content':    '#ffffff',
          '--rounded-box':    '0.75rem',
          '--rounded-btn':    '0.5rem',
          '--btn-text-case':  'none',
          '--animation-btn':  '0.2s',
        },
      },
    ],
  },
}
