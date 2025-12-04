/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Ubuntu", "system-ui", "sans-serif"],
      },
      colors: {
        background: "#05060A",
        surface: "#0B0D13",
        accent: "#3B82F6",
        accentSoft: "#1D2433",
        danger: "#EF4444",
        success: "#22C55E",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
