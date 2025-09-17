/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'brand-green': '#2f855a',
        'brand-green-soft': '#68d391',
        'brand-brown': '#8b5e3c',
        'brand-sky': '#38b2ac',
        'brand-sand': '#f7faf5',
        'brand-yellow': '#ecc94b',
        'brand-forest': '#1f2933',
        'brand-muted': '#4a5568',
      },
      fontFamily: {
        sans: ['Inter', 'Open Sans', 'sans-serif'],
        display: ['Nunito', 'Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
