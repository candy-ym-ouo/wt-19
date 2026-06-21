/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'film-black': '#0a0a0f',
        'film-dark': '#14141f',
        'film-gray': '#1f1f2e',
        'film-gold': '#d4af37',
        'film-cream': '#f5f0e8',
        'film-red': '#8b0000',
      },
      fontFamily: {
        'serif': ['Noto Serif SC', 'Georgia', 'serif'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
