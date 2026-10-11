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
          // Surfaces (Apple light)
          bg: "#FFFFFF",          // page background (surface-base)
          panel: "#F5F5F7",       // grouped / panel surface
          card: "#FFFFFF",        // raised card on panel
          surface: "#E9E9EE",     // pressed / subtle fill
          // Lines
          border: "#D2D2D7",      // default 1px border
          borderLight: "#AEAEB5", // emphasized border
          // Accent (primary actions, focus, active states)
          accent: "#155BD0",
          accentHover: "#2E6FDE", // primary hover (lightened ~10%)
          accentTint: "#EAF1FC",  // soft blue tint for hovers / selected-soft
          // Text
          text: "#1D1D1F",        // headings, body
          muted: "#6E6E73",       // secondary text (>= 4.5:1 on white)
          faint: "#8E8E93",       // tertiary / decorative
          // Domain colors
          chord: "#B45309",       // chord text on white (amber-700, AA)
          // Functional status hues (solid fills / text)
          green: "#16A34A",
          red: "#DC2626",
          cyan: "#0E7490"
        }
      },
      borderRadius: {
        stage: "21px"
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
