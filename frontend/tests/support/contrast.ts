/**
 * WCAG 2.1 contrast arithmetic (SC 1.4.3).
 *
 * Two rules are load-bearing here and are asserted by `contrast.test.ts`:
 *
 * 1. Nothing in the comparison path rounds. SC 1.4.3 is a threshold on the
 *    exact ratio, so a computed 4.4999:1 fails even though it reports as
 *    4.50 when rounded to two decimals.
 * 2. `parseHex` rejects anything that is not a 6-digit hex color instead of
 *    defaulting, so an unparseable token fails the test loudly rather than
 *    being silently skipped.
 */

const HEX_6_DIGIT = /^#[0-9a-fA-F]{6}$/;

/** Channels of a 6-digit hex color, each in 0-255. Throws on any other input. */
export function parseHex(value: string): [number, number, number] {
  if (!HEX_6_DIGIT.test(value)) {
    throw new Error(`Not a 6-digit hex color: ${JSON.stringify(value)}`);
  }
  return [
    parseInt(value.slice(1, 3), 16),
    parseInt(value.slice(3, 5), 16),
    parseInt(value.slice(5, 7), 16),
  ];
}

/** SC 1.4.3 relative luminance. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** SC 1.4.3 contrast ratio, unrounded. Order of arguments is irrelevant. */
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
