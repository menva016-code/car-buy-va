/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef2f3',
          100: '#fce4e7',
          200: '#f9c9ce',
          300: '#f29da6',
          400: '#e0556a',
          500: '#b01525',
          600: '#9d1220',
          700: '#830f1b',
          800: '#6b0d17',
          900: '#580b13',
        },
        ink: {
          DEFAULT: '#1a1a1a',
          light: '#4a4a4a',
          faint: '#7a7a7a',
        },
      },
    },
  },
  plugins: [],
};
