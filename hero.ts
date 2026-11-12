import { heroui } from "@heroui/theme";

// HeroUI is used only for the class picker. Its colours and corners follow
// the exercise-copy palette in src/app/globals.css; the site has one theme.
export default heroui({
  themes: {
    light: {
      layout: {
        radius: { small: "2px", medium: "2px", large: "2px" },
        borderWidth: { small: "1px", medium: "1.5px", large: "2px" },
      },
      colors: {
        background: "#FDFEFF",
        foreground: "#1C2333",
        primary: { DEFAULT: "#1D3A9E", foreground: "#ffffff" },
        danger: { DEFAULT: "#C21F30", foreground: "#ffffff" },
        default: {
          100: "#E7F0FA",
          200: "#C3DAF2",
          DEFAULT: "#C3DAF2",
          foreground: "#1C2333",
        },
        focus: "#132769",
      },
    },
  },
});
