/** @type {import('tailwindcss').Config} */
const config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["var(--font-geist-sans)", "sans-serif"],
            },
        },
    },
    darkMode: "class",
    plugins: [
        require("@tailwindcss/typography"),
    ],
};

export default config;
