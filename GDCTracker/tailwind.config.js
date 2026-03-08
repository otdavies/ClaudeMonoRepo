/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gdc: {
          bg: '#0f1117',
          surface: '#1a1d27',
          surfaceHover: '#232736',
          border: '#2a2e3d',
          accent: '#6366f1',
          accentHover: '#818cf8',
          gold: '#f59e0b',
          text: '#e2e8f0',
          textMuted: '#94a3b8',
          danger: '#ef4444',
          success: '#22c55e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
