/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#FFFEF7',
        line: '#D1E5F4',
        ink: '#2C3E50',
      },
      fontFamily: {
        journal: ['Kalam', 'Patrick Hand', 'Caveat', 'cursive'],
        handwriting: ['Caveat', 'cursive'],
      },
    },
  },
  plugins: [],
}
