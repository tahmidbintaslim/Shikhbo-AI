import { heroui } from "@heroui/theme";

export default heroui({
  themes: {
    light: {
      layout: {
        radius: {
          small: "8px",
          medium: "14px",
          large: "24px",
        },
        borderWidth: {
          small: "1px",
          medium: "1px",
          large: "2px",
        },
      },
      colors: {
        background: "#FFFFFF",
        foreground: "#111827",
        primary: {
          DEFAULT: "#12355B",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#FCBA04",
          foreground: "#12355B",
        },
        default: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          DEFAULT: "#d1d5db",
          foreground: "#374151",
        },
        focus: "#12355B",
      },
    },
    dark: {
      layout: {
        radius: {
          small: "8px",
          medium: "14px",
          large: "24px",
        },
      },
      colors: {
        background: "#05070A",
        foreground: "#ECEDEE",
        primary: {
          DEFAULT: "#355DAB",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#FCBA04",
          foreground: "#000000",
        },
        default: {
          50: "#18181b",
          100: "#27272a",
          200: "#3f3f46",
          DEFAULT: "#52525b",
          foreground: "#d4d4d8",
        },
        focus: "#FCBA04",
      },
    },
  },
});
