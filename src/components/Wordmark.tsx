// "AfterCare" in the site gradient, violet to teal, Poppins 600.

import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from "react-native-svg";

import { fonts, gradients } from "../theme";

export function Wordmark({ fontSize = 30 }: { fontSize?: number }) {
  // Approximate advance width for Poppins SemiBold at -0.03em tracking.
  const width = fontSize * 4.9;
  const height = fontSize * 1.25;
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
        y={fontSize}
      >
        AfterCare
      </SvgText>
    </Svg>
  );
}
