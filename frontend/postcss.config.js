const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  plugins: [tailwindcss, autoprefixer, ...(isProduction ? [cssnano({ preset: 'default' })] : [])],
};
