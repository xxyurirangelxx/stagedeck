/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./public/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        stage: {
          bg: "#0A0C0F",
          panel: "#12151B",
          card: "#181D24",
          surface: "#1E242E",
          border: "#2A3240",
          borderLight: "#394456",
          amber: "#F59E0B",
          amberGlow: "#F59E0B33",
          cyan: "#06B6D4",
          green: "#10B981",
          red: "#EF4444",
          chord: "#FBBF24",
          text: "#F8FAFC",
          muted: "#94A3B8"
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
