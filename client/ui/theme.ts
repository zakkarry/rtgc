// Define semantic color palettes
const colors = {
  primary: {
    50: "#e6f7ff",
    100: "#bae7ff",
    200: "#91d5ff",
    300: "#69c0ff",
    400: "#40a9ff",
    500: "#1890ff", // Primary color
    600: "#096dd9",
    700: "#0050b3",
    800: "#003a8c",
    900: "#002766",
  },
  secondary: {
    50: "#f0f5ff",
    100: "#d6e4ff",
    200: "#adc6ff",
    300: "#85a5ff",
    400: "#597ef7",
    500: "#2f54eb", // Secondary color
    600: "#1d39c4",
    700: "#10239e",
    800: "#061178",
    900: "#030852",
  },
  success: {
    50: "#f6ffed",
    100: "#d9f7be",
    200: "#b7eb8f",
    300: "#95de64",
    400: "#73d13d",
    500: "#52c41a", // Success color
    600: "#389e0d",
    700: "#237804",
    800: "#135200",
    900: "#092b00",
  },
  warning: {
    50: "#fffbe6",
    100: "#fff1b8",
    200: "#ffe58f",
    300: "#ffd666",
    400: "#ffc53d",
    500: "#faad14", // Warning color
    600: "#d48806",
    700: "#ad6800",
    800: "#874d00",
    900: "#613400",
  },
  danger: {
    50: "#fff1f0",
    100: "#ffccc7",
    200: "#ffa39e",
    300: "#ff7875",
    400: "#ff4d4f",
    500: "#f5222d", // Danger color
    600: "#cf1322",
    700: "#a8071a",
    800: "#820014",
    900: "#5c0011",
  },
};

// Define semantic tokens
const semanticTokens = {
  colors: {
    // Background colors
    "bg.default": { _light: "white", _dark: "gray.800" },
    "bg.muted": { _light: "gray.50", _dark: "gray.700" },
    "bg.subtle": { _light: "gray.100", _dark: "gray.700" },

    // Text colors
    "text.default": { _light: "gray.900", _dark: "gray.50" },
    "text.muted": { _light: "gray.600", _dark: "gray.400" },

    // Border colors
    "border.default": { _light: "gray.200", _dark: "gray.600" },

    // Component defaults
    "nav.bg": { _light: "gray.100", _dark: "gray.700" },
  },
};

// Export the theme elements
export default {
  colors,
  semanticTokens,
};
