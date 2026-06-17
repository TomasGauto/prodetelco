/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Bebas Neue', 'sans-serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
