/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'brand-green': '#6b4f33',
        'brand-green-soft': '#a47148',
        'brand-brown': '#5c4033',
        'brand-sky': '#c2b280',
        'brand-sand': '#f4ede1',
        'brand-yellow': '#d4a373',
        'brand-forest': '#2f2419',
        'brand-muted': '#6e5849',
      },
      fontFamily: {
        sans: ['Inter', 'Open Sans', 'sans-serif'],
        display: ['Nunito', 'Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
