// "AfterCare" in the site gradient, violet to teal, Poppins 600.

import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from "react-native-svg";

import { fonts, gradients } from "../theme";

/**
 * `.logo-badge-name`: Poppins 600, letter-spacing -0.03em, line-height 1, so
 * the box is exactly `fontSize` tall. With line-height 1 the Poppins baseline
 * sits 0.85em below the top of the line box (ascent 1.05em, descent 0.35em).
 */
export function Wordmark({ fontSize = 32 }: { fontSize?: number }) {
  const height = fontSize;
  // Approximate advance width at -0.03em tracking.
  const width = fontSize * 4.9;
  return (
    <Svg width={width} height={height} accessibilityRole="header" accessibilityLabel="AfterCare">
      <Defs>
        <LinearGradient id="wordmark" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={gradients.wordmark[0]} />
          <Stop offset="1" stopColor={gradients.wordmark[1]} />
        </LinearGradient>
      </Defs>
      <SvgText
        fill="url(#wordmark)"
        fontFamily={fonts.semibold}
        fontSize={fontSize}
        letterSpacing={-0.03 * fontSize}
        x={0}
        y={fontSize * 0.85}
      >
        AfterCare
      </SvgText>
    </Svg>
  );
}
