import { Platform } from "react-native";

export const C = {
  paper: "#F7F5EF",
  surface: "#FFFFFF",
  ink: "#1E2B26",
  muted: "#718078",
  green: "#187A61",
  greenDark: "#105A48",
  greenSoft: "#E7F2ED",
  coral: "#E27A5E",
  coralSoft: "#F9ECE7",
  amber: "#C89A3C",
  amberSoft: "#F7F0DF",
  line: "#E8E5DC",
  danger: "#B94B42",
  dangerSoft: "#FBECE9",
  blue: "#3478A9",
  blueDark: "#235E84",
  blueSoft: "#EAF2F8",
};

export const SANS = Platform.select({ ios: "System", android: "sans-serif", default: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" });
export const SERIF = Platform.select({ ios: "Georgia", android: "serif", default: "Georgia, serif" });

export const PRIORITY_LABELS = { low: "Baixa", medium: "Média", high: "Alta" } as const;
export const PRIORITY_COLORS = {
  low: { bg: C.greenSoft, text: C.greenDark },
  medium: { bg: C.amberSoft, text: "#80611E" },
  high: { bg: C.coralSoft, text: C.danger },
} as const;
