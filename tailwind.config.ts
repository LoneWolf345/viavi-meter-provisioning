import type { Config } from "tailwindcss"
import animatePlugin from "tailwindcss-animate"

import sparklightPreset from "./presets/sparklight.preset"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  presets: [sparklightPreset],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {},
  },
  plugins: [animatePlugin],
} satisfies Config

export default config
