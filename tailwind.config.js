import animate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Numans", "sans-serif"],
      },
      screens: {
        xs: "30rem",
      },
      spacing: {
        4.5: "1.125rem",
        7.5: "1.875rem",
      },
      colors: {
        "blue-primary": "#1954FF",
        "green-primary": "#44E0C3",
      },
    },
  },
  plugins: [animate],
}
