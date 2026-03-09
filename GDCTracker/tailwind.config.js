/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gdc: {
          bg: '#131620',
          surface: '#1e2230',
          surfaceHover: '#2a2f42',
          border: '#3a3f54',
          accent: '#6366f1',
          accentHover: '#818cf8',
          gold: '#f59e0b',
          text: '#e2e8f0',
          textMuted: '#b8c7d8',
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
