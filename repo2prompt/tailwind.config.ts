// tailwind.config.ts (ESM для v4)
import type { Config } from "tailwindcss";
import { heroui } from "@heroui/theme";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    // важно: чтобы сгенерировались стили для компонентов HeroUI
    "./node_modules/@heroui/theme/dist/**/*.{js,mjs,ts,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {}
  },
  plugins: [heroui()]
} satisfies Config;
