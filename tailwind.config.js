/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {keyframes: {
  'slide-up': {
    '0%': { transform: 'translateY(100%)' },
    '100%': { transform: 'translateY(0)' },
  }
},
animation: {
  'slide-up': 'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
}},
  },
  plugins: [],
}