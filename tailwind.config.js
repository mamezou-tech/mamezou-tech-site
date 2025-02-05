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
      fontFamily: {
        zh: ["Noto Sans SC", "sans-serif"],
        en: ["Roboto", "sans-serif"],
        ja: ["Helvetica Neue", "Arial", "Hiragino Kaku Gothic ProN", "Hiragino Sans", "sans-serif", "serif"]
      },
      colors: {
        mz: "#815685"
      }
    },
  },
  plugins: [],
}

