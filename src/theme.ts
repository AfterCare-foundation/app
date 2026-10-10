// Colours and type taken from after-care.eu and the hero mockup.
// The site's `--purple` (#1d4ed8) is blue and is not the app accent.

export const colors = {
  bg: "#0a0a10",
  bg2: "#0f0f17",
  surface: "rgba(255, 255, 255, 0.03)",
  surfaceStrong: "rgba(28, 25, 52, 0.92)",
  border: "rgba(255, 255, 255, 0.1)",
  borderStrong: "rgba(255, 255, 255, 0.14)",
  text: "#f4f4f6",
  textMuted: "#9ca3af",
  textSoft: "#d1d5db",
  violet: "#7d47e0",
  violetDeep: "#4b32ab",
  violetLight: "#a78bfa",
  teal: "#2dd4bf",
  danger: "#f87171",
  dangerTint: "rgba(248, 113, 113, 0.12)",
  dangerBorder: "rgba(248, 113, 113, 0.5)",
} as const;

export const gradients = {
  wordmark: ["#8b5cf6", "#2dd4bf"] as const,
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
  panel: 18, // .trust li
  card: 20,
  button: 10, // .why-btn
  chip: 999,
} as const;

/** `.trust li` drop shadow. */
export const panelShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.3,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
} as const;

/**
 * Type scale from the site, at phone widths (px at a 16px root).
 *   sectionTitle  .section-title      clamp(1.5rem, ...) -> 24, 600, -0.03em, line 1.08
 *   slideTitle    .why-slide-title    1.25rem, 600, -0.02em, 85% white
 *   slideDesc     .why-slide-desc     0.875rem, line 1.55, 78% white
 *   cardTitle     .trust-title        0.9375rem, 600, -0.01em, white
 *   cardDesc      .trust-desc         0.8125rem, line 1.45, --gray
 */
export const type = {
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 24,
    lineHeight: 26,
    letterSpacing: -0.72,
    color: colors.text,
  },
  slideTitle: {
    fontFamily: fonts.semibold,
    fontSize: 20,
    letterSpacing: -0.4,
    color: "rgba(244, 244, 246, 0.85)",
  },
  slideDesc: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21.7,
    color: "rgba(244, 244, 246, 0.78)",
  },
  cardTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    letterSpacing: -0.15,
    color: colors.text,
  },
  cardDesc: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18.85,
    color: colors.textMuted,
  },
} as const;
