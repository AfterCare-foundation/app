/** Keeps the last two words together so a text never ends with one word alone on a line. */
export function tidy(text: string): string {
  return text.replace(/ (\S+)$/, "\u00A0$1");
}
