/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        svef: {
          green: '#99CC33',
          purple: '#A44886',
          brown: '#BF7845',
          beige: '#F2E4DA',
          gray: '#53585A',
        },
      },
      fontFamily: {
        oswald: ['Oswald', 'sans-serif'],
        'open-sans': ['Open Sans', 'sans-serif'],
        roboto: ['Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};