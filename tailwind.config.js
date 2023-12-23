/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.njk",
    "./src/**/*.html",
    "./src/**/*.md",
  ],
  theme: {
    fontFamily: {
      sans: ["Fonarto", "Kosugi Maru", 'sans-serif']
    },
    extend: {
      colors: {
        mz: "#815685"
      }
    },
  },
  plugins: [],
}

