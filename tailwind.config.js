/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#EBF5FB', 100: '#D6EAF8', 500: '#2E86C1', 600: '#2874A6', 700: '#1A5276', 800: '#154360', 900: '#0E2F44' },
        accent: { 50: '#E8F8F5', 100: '#D1F2EB', 500: '#17A589', 600: '#148F77' },
      }
    },
  },
  plugins: [],
};
