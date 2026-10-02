// Colours and type taken from after-care.eu and the hero mockup.
// The site's `--purple` (#1d4ed8) is blue and is not the app accent.

export const colors = {
  bg: "#0a0a10",
  bg2: "#0f0f17",
  surface: "rgba(255, 255, 255, 0.05)",
  surfaceStrong: "rgba(28, 25, 52, 0.92)",
  border: "rgba(255, 255, 255, 0.08)",
  borderStrong: "rgba(255, 255, 255, 0.14)",
  text: "#f4f4f6",
  textMuted: "#9ca3af",
  textSoft: "#d1d5db",
  violet: "#7d47e0",
  violetDeep: "#4b32ab",
  violetLight: "#a78bfa",
  teal: "#2dd4bf",
  danger: "#f87171",
} as const;

export const gradients = {
  wordmark: ["#7d47e0", "#2dd4bf"] as const,
  primary: ["#8b5cf6", "#2dd4bf"] as const,
  notify: ["#8b5cf6", "#6d28d9"] as const,
  sent: ["#20b486", "#138a72"] as const,
  glow: ["rgba(125, 71, 224, 0.42)", "rgba(125, 71, 224, 0)"] as const,
} as const;

export const fonts = {
  regular: "Poppins-Regular",
  semibold: "Poppins-SemiBold",
} as const;

export const radius = {
  card: 20,
  button: 14,
  chip: 999,
} as const;
