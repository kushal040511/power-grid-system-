/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"] ,
  theme: {
    extend: {
      colors: {
        ink: "#0b0f17",
        slateblue: "#1c2230",
        teal: "#11b5b5",
        sun: "#ffb347",
        ember: "#ff5d5d"
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Satoshi'", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 40px rgba(17, 181, 181, 0.25)"
      }
    }
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")]
};
