/** @type {import('tailwindcss').Config} */
module.exports = {
  // 'class' = we toggle dark mode by adding/removing the `dark` class on <html>.
  darkMode: "class",
  // Files Tailwind scans to decide which utility classes to generate.
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      // Custom font families wired up in globals.css via CSS variables.
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-sora)", "var(--font-inter)", "sans-serif"],
      },
      keyframes: {
        // Entrance animation for chat bubbles.
        bubble: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // The three bouncing dots in the typing indicator.
        blink: {
          "0%,80%,100%": { opacity: ".25", transform: "translateY(0)" },
          "40%": { opacity: "1", transform: "translateY(-3px)" },
        },
      },
      animation: {
        bubble: "bubble .35s cubic-bezier(.2,.8,.2,1) both",
        blink: "blink 1.2s infinite both",
      },
    },
  },
  plugins: [],
};
