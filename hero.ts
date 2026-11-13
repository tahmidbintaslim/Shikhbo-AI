import { heroui } from "@heroui/theme";

// HeroUI is used only for the class picker. Its colours and corners follow
// the tokens in src/app/globals.css; the site has one (light) theme.
export default heroui({
  themes: {
    light: {
      layout: {
        radius: { small: "8px", medium: "10px", large: "14px" },
        borderWidth: { small: "1px", medium: "1px", large: "2px" },
      },
      colors: {
        background: "#ffffff",
        foreground: "#0f172a",
        primary: { DEFAULT: "#007a7a", foreground: "#ffffff" },
        danger: { DEFAULT: "#b42318", foreground: "#ffffff" },
        default: {
          100: "#f1f5f9",
          200: "#e0f7f5",
          DEFAULT: "#d5dbe3",
          foreground: "#0f172a",
        },
        focus: "#007a7a",
      },
    },
  },
});
