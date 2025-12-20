/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        allstate: {
          blue: '#0033A0',
          lightblue: '#0077C8',
          gray: '#F4F4F4',
          darkgray: '#222222',
        },
        primary: '#0033A0',
        secondary: '#0077C8',
        accent: '#F4F4F4',
        destructive: '#D7263D',
      },
      fontFamily: {
        sans: ['Open Sans', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        lg: '1rem',
        xl: '1.5rem',
      },
      boxShadow: {
        allstate: '0 2px 8px 0 rgba(0, 51, 160, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
