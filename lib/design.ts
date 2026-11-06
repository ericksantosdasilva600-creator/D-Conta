import { Platform } from "react-native";

const BASE = {
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

export type Palette = { id: string; name: string; primary: string; secondary: string; paper: string };

/** Paletas prontas: o usuário escolhe em Configurações › Aparência. */
export const PALETTES: Palette[] = [
  { id: "nyvo", name: "Verde Dá Conta", primary: "#187A61", secondary: "#3478A9", paper: "#F7F5EF" },
  { id: "ocean", name: "Oceano", primary: "#1F6FB2", secondary: "#14918B", paper: "#F3F6F9" },
  { id: "violet", name: "Violeta", primary: "#6A4BC4", secondary: "#B4497F", paper: "#F6F4FA" },
  { id: "rose", name: "Rosa", primary: "#C2416F", secondary: "#7A55B8", paper: "#FBF4F6" },
  { id: "sunset", name: "Pôr do sol", primary: "#C8582B", secondary: "#B9851B", paper: "#FBF6F1" },
  { id: "forest", name: "Floresta", primary: "#3E6B2F", secondary: "#8A6B2E", paper: "#F5F4EC" },
  { id: "graphite", name: "Grafite", primary: "#34404A", secondary: "#5A7A8C", paper: "#F4F4F2" },
];

export const THEME_STORAGE_KEY = "nyvo.theme";
export type ThemeChoice = { palette: string; primary?: string; secondary?: string };

const hex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);
function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((x, i) => Math.round(x + (pb[i] - x) * t).toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function resolvePalette(choice: ThemeChoice | null): Palette {
  const preset = PALETTES.find((p) => p.id === choice?.palette) ?? PALETTES[0];
  if (choice?.palette === "custom" && choice.primary && hex(choice.primary)) {
    const secondary = choice.secondary && hex(choice.secondary) ? choice.secondary : mix(choice.primary, "#3478A9", 0.5);
    return { id: "custom", name: "Personalizada", primary: choice.primary.toUpperCase(), secondary: secondary.toUpperCase(), paper: mix(choice.primary, "#FAF9F6", 0.95) };
  }
  return preset;
}

export function paletteColors(p: Palette) {
  return {
    paper: p.paper,
    green: p.primary,
    greenDark: mix(p.primary, "#000000", 0.28),
    greenSoft: mix(p.primary, "#FFFFFF", 0.89),
    blue: p.secondary,
    blueDark: mix(p.secondary, "#000000", 0.28),
    blueSoft: mix(p.secondary, "#FFFFFF", 0.9),
  };
}

export function readThemeChoice(): ThemeChoice | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return raw ? JSON.parse(raw) as ThemeChoice : null;
  } catch { return null; }
}

/** A paleta é lida antes de qualquer tela ser montada; ao trocar, o app recarrega com as novas cores. */
export const ACTIVE_PALETTE = resolvePalette(Platform.OS === "web" ? readThemeChoice() : null);
export const C = { ...BASE, ...paletteColors(ACTIVE_PALETTE) };

export function saveThemeChoice(choice: ThemeChoice) {
  try { localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(choice)); } catch { /* sem armazenamento */ }
  if (Platform.OS === "web" && typeof window !== "undefined") window.location.reload();
}

export const SANS = Platform.select({ ios: "System", android: "sans-serif", default: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" });
export const SERIF = Platform.select({ ios: "Georgia", android: "serif", default: "Georgia, serif" });

export const PRIORITY_LABELS = { low: "Baixa", medium: "Média", high: "Alta" } as const;
export const PRIORITY_COLORS = {
  low: { bg: C.greenSoft, text: C.greenDark },
  medium: { bg: C.amberSoft, text: "#80611E" },
  high: { bg: C.coralSoft, text: C.danger },
} as const;
