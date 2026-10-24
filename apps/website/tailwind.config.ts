import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff7ed",
          600: "#ea580c",
          700: "#c2410c",
          900: "#7c2d12",
        },
      },
    },
  },
  plugins: [],
};
export default config;
