import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio, parseHex, relativeLuminance } from './support/contrast';
import { readRootToken } from './support/css-tokens';

/**
 * WCAG contrast floors for the design-system text and control-border tokens.
 *
 * Two properties make this a real guard rather than a transcription of the
 * spec: the token values are read from the stylesheet that ships, so editing
 * `app/globals.css` moves the numbers under test, and the threshold
 * comparison is proven unrounded three separate ways.
 *
 * Verification limit: jsdom does not apply Tailwind's compiled stylesheet and
 * `@theme` is a build-time construct. Nothing here is browser verification.
 */

// jsdom serves test modules over http, so `import.meta.url` is not a file URL.
// Vitest roots the runner at the config directory, which `npm run test` reaches
// as the package root.
const fromPackageRoot = (relative: string) => readFileSync(resolve(process.cwd(), relative), 'utf8');
const GLOBALS_CSS = fromPackageRoot('app/globals.css');
const CONTRAST_HELPER = fromPackageRoot('tests/support/contrast.ts');

/**
 * Raw `:root` custom property value as written in the stylesheet.
 *
 * W1 read this with a whole-file regex. It now goes through
 * `tests/support/css-tokens.ts`, the same scoped parser the registration guard
 * uses, so the values under test and the tokens the guard checks cannot come
 * from two different readings of the file.
 */
const rootToken = (name: string) => readRootToken(GLOBALS_CSS, name);

/** The 7-surface ramp a text token can land on, lightest to binding-darkest. */
const SURFACE_RAMP = [
  ['--surface', '#faf8ff'],
  ['--surface-container-lowest', '#ffffff'],
  ['--surface-container-low', '#f2f3ff'],
  ['--surface-container', '#eaedff'],
  ['--surface-container-high', '#e2e7ff'],
  ['--surface-container-highest', '#dae2fd'],
  ['--surface-dim', '#d2d9f4'],
] as const;

const BINDING_SURFACE_TOKEN = '--surface-dim';
const BINDING_SURFACE = '#d2d9f4';
const TEXT_FLOOR = 4.5; // SC 1.4.3, text
const CONTROL_BORDER_FLOOR = 3; // SC 1.4.11, non-text boundaries

const TEXT_TOKENS = ['--text-primary', '--text-secondary', '--text-muted'] as const;
/** `--control-border` re-points at this value in a later work unit. */
const CONTROL_BORDER_TOKEN = '--outline';
const DECORATIVE_OUTLINE_TOKEN = '--outline-variant';
const DECORATIVE_OUTLINE_HEX = '#c4c5d5';

const SUPERSEDED_MUTED = '#757684';
const CURRENT_MUTED = '#5c5d72';

function worstCase(token: string): { surface: string; ratio: number } {
  return SURFACE_RAMP.map(([, hex]) => ({ surface: hex, ratio: contrastRatio(token, hex) })).reduce(
    (worst, current) => (current.ratio < worst.ratio ? current : worst),
  );
}

describe('surface ramp', () => {
  it('matches the stylesheet, so the ramp cannot drift from what ships', () => {
    for (const [token, hex] of SURFACE_RAMP) {
      expect(rootToken(token), `${token} in app/globals.css`).toBe(hex);
    }
  });

  it('names --surface-dim as the binding surface and it is the darkest of the ramp', () => {
    const surfaces = SURFACE_RAMP.map(([, hex]) => hex);
    expect(surfaces).toHaveLength(7);
    expect(surfaces).toContain(BINDING_SURFACE);
    expect(rootToken(BINDING_SURFACE_TOKEN)).toBe(BINDING_SURFACE);
    const binding = relativeLuminance(BINDING_SURFACE);
    for (const [, hex] of SURFACE_RAMP) {
      if (hex !== BINDING_SURFACE) {
        expect(
          relativeLuminance(hex),
          `${hex} is not lighter than the binding surface ${BINDING_SURFACE}`,
        ).toBeGreaterThan(binding);
      }
    }
  });
});

describe('Text Token Contrast Floor (SC 1.4.3)', () => {
  it.each(TEXT_TOKENS)('%s reaches 4.5:1 on every ramp surface', (token) => {
    const value = rootToken(token);
    for (const [surfaceToken, surface] of SURFACE_RAMP) {
      const ratio = contrastRatio(value, surface);
      expect(
        ratio,
        `${token} ${value} on ${surfaceToken} ${surface} computes ${ratio}, below ${TEXT_FLOOR}`,
      ).toBeGreaterThanOrEqual(TEXT_FLOOR);
    }
  });

  it.each(TEXT_TOKENS)('%s is worst on the binding surface, not merely asserted there', (token) => {
    const { surface, ratio } = worstCase(rootToken(token));
    expect(surface, `${token} worst case is not the binding surface`).toBe(BINDING_SURFACE);
    expect(ratio).toBeGreaterThanOrEqual(TEXT_FLOOR);
  });

  it('--text-muted is the value the spec names, at 4.587:1 on the binding surface', () => {
    expect(rootToken('--text-muted')).toBe(CURRENT_MUTED);
    expect(contrastRatio(CURRENT_MUTED, BINDING_SURFACE)).toBeCloseTo(4.587, 2);
  });
});

describe('Control Border Contrast Floor (SC 1.4.11)', () => {
  it('the control-border value reaches 3:1 on every ramp surface', () => {
    const value = rootToken(CONTROL_BORDER_TOKEN);
    for (const [surfaceToken, surface] of SURFACE_RAMP) {
      const ratio = contrastRatio(value, surface);
      expect(
        ratio,
        `${CONTROL_BORDER_TOKEN} ${value} on ${surfaceToken} ${surface} computes ${ratio}, below ${CONTROL_BORDER_FLOOR}`,
      ).toBeGreaterThanOrEqual(CONTROL_BORDER_FLOOR);
    }
    expect(worstCase(value).ratio).toBeCloseTo(3.198, 2);
  });

  it('the decorative outline is not darkened', () => {
    expect(rootToken(DECORATIVE_OUTLINE_TOKEN)).toBe(DECORATIVE_OUTLINE_HEX);
    // Deliberately below the control floor: SC 1.4.11 does not require a
    // visible boundary where the control's own content identifies it.
    const ratio = contrastRatio(DECORATIVE_OUTLINE_HEX, BINDING_SURFACE);
    expect(ratio).toBeCloseTo(1.218, 2);
    expect(ratio).toBeLessThan(CONTROL_BORDER_FLOOR);
  });
});

describe('the threshold is not rounded (SC 1.4.3)', () => {
  it('the comparison path in the helper applies no rounding', () => {
    expect(CONTRAST_HELPER).not.toMatch(/toFixed|Math\.round|toPrecision/);
  });

  it('4.499:1 fails while 4.5:1 passes, on the same surface', () => {
    // Found by search over the 24-bit color space for the closest pair that
    // straddles 4.5 on white. Both report as 4.50 to two decimals, so a
    // rounding implementation would pass the first one and this would be
    // vacuous.
    const below = contrastRatio('#6c7b67', '#ffffff');
    const above = contrastRatio('#7c7290', '#ffffff');

    expect(below).toBeLessThan(TEXT_FLOOR);
    expect(above).toBeGreaterThanOrEqual(TEXT_FLOOR);
    expect(Math.round(below * 100) / 100).toBe(TEXT_FLOOR);
    expect(Math.round(above * 100) / 100).toBe(TEXT_FLOOR);
  });

  it('the superseded muted value fails the binding surface, so the floor is sensitive', () => {
    expect(contrastRatio(SUPERSEDED_MUTED, BINDING_SURFACE)).toBeLessThan(TEXT_FLOOR);
    expect(contrastRatio(SUPERSEDED_MUTED, BINDING_SURFACE)).toBeCloseTo(3.198, 2);
    expect(contrastRatio(rootToken('--text-muted'), BINDING_SURFACE)).toBeGreaterThanOrEqual(
      TEXT_FLOOR,
    );
    // The superseded value is not a one-surface miss: it fails ramp-wide.
    for (const [surfaceToken, surface] of SURFACE_RAMP) {
      expect(
        contrastRatio(SUPERSEDED_MUTED, surface),
        `superseded --text-muted unexpectedly passed on ${surfaceToken}`,
      ).toBeLessThan(TEXT_FLOOR);
    }
  });
});

describe('parseHex is strict', () => {
  it.each(['var(--text-muted)', '#fff', '#757684ff', '757684', '#gggggg', ''])(
    'rejects %j instead of defaulting',
    (value) => {
      expect(() => parseHex(value)).toThrow();
    },
  );

  it('accepts a 6-digit hex', () => {
    expect(parseHex('#5c5d72')).toEqual([92, 93, 114]);
  });
});
