/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        vimpl: {
          DEFAULT: '#65c434',
          dark:    '#3d7a1f',
          light:   '#a3e085',
        },
        craft: {
          DEFAULT: '#E67E22',
          dark:    '#CA6F1E',
          light:   '#F0A500',
        },
      },
    },
  },
  plugins: [],
};
