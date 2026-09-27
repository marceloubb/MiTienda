import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FONT_VARIABLES,
  REGISTRATION_ALLOWLIST,
  checkTokenRegistration,
  parseStylesheet,
  readRootToken,
  registrationTargets,
} from './support/css-tokens';

/**
 * Theme registration guard, in both directions.
 *
 * Six `:root` tokens shipped with no `@theme inline` registration, so they
 * generated no utility at all — a silent omission that neither the build nor
 * the browser reports. This suite registers them (already done in
 * `app/globals.css`) and then keeps the forward and reverse directions honest
 * on every future edit.
 *
 * The token values are parsed out of the stylesheet that ships rather than
 * transcribed from the spec, so editing `app/globals.css` moves the numbers
 * under test. Sensitivity is proven twice over: three in-memory mutations
 * below, and the on-disk RED runs recorded in `apply-progress.md`.
 *
 * Verification limit: jsdom does not apply Tailwind's compiled output and
 * `@theme` is build-time only. Nothing here is browser verification.
 */

// jsdom serves test modules over http, so `import.meta.url` is not a file URL.
// Vitest roots the runner at the config directory, which `npm run test` reaches
// as the package root.
const GLOBALS_CSS = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');

/** The six tokens the requirement names as unregistered before this change. */
const SPEC_TOKENS = [
  '--tertiary',
  '--tertiary-container',
  '--on-tertiary',
  '--on-tertiary-container',
  '--on-background',
  '--surface-dim',
] as const;

/**
 * The registered radius ramp, frozen. This is the reason `--radius` is
 * allowlisted: registering it would repoint every one of these steps.
 */
const RADIUS_RAMP = {
  '--radius-sm': '0.25rem',
  '--radius-md': '0.375rem',
  '--radius-lg': '0.5rem',
  '--radius-xl': '0.75rem',
  '--radius-2xl': '1rem',
  '--radius-3xl': '1.5rem',
  '--radius-4xl': '2rem',
} as const;

describe('forward: every :root token is registered or allowlisted', () => {
  it('the stylesheet that ships has no unregistered token', () => {
    const { unregistered } = checkTokenRegistration(GLOBALS_CSS);
    expect(
      unregistered,
      `unregistered :root tokens in app/globals.css: ${unregistered.join(', ')}`,
    ).toEqual([]);
  });

  it.each(SPEC_TOKENS)('%s is registered in @theme inline', (token) => {
    const themeName = `--color-${token.slice('--'.length)}`;
    expect(
      parseStylesheet(GLOBALS_CSS).registrations.get(themeName),
      `${themeName} is not registered in @theme inline`,
    ).toBe(`var(${token})`);
  });
});

describe('reverse: every registration resolves', () => {
  it('the stylesheet that ships has no dangling var() target', () => {
    const { dangling } = checkTokenRegistration(GLOBALS_CSS);
    expect(dangling, `dangling registrations in app/globals.css: ${dangling.join(', ')}`).toEqual([]);
  });

  it('each target is a :root token or a declared next/font variable', () => {
    const { tokens } = parseStylesheet(GLOBALS_CSS);
    for (const target of registrationTargets(GLOBALS_CSS)) {
      expect(
        tokens.has(target) || FONT_VARIABLES.includes(target),
        `${target} resolves to neither a :root token nor one of ${FONT_VARIABLES.join(', ')}`,
      ).toBe(true);
    }
  });

  it('the next/font allowance is load-bearing, not a loophole', () => {
    // These are declared by next/font in app/layout.tsx. If one ever lands in
    // :root the allowance has to be revisited rather than left as dead slack.
    expect(FONT_VARIABLES).toEqual(['--font-jakarta', '--font-inter']);
    const { tokens } = parseStylesheet(GLOBALS_CSS);
    for (const name of FONT_VARIABLES) {
      expect(tokens.has(name), `${name} unexpectedly appears in the :root block`).toBe(false);
    }
  });
});

describe('the allowlist cannot mask an omission', () => {
  it('holds exactly one entry, --radius, with a non-empty reason', () => {
    expect(Object.keys(REGISTRATION_ALLOWLIST)).toEqual(['--radius']);
    expect(REGISTRATION_ALLOWLIST['--radius'].trim()).not.toBe('');
  });

  it('--radius is genuinely unreferenced by any registration', () => {
    expect(registrationTargets(GLOBALS_CSS)).not.toContain('--radius');
  });

  it('--radius really is declared in :root, so the entry is about registration, not a typo', () => {
    expect(readRootToken(GLOBALS_CSS, '--radius')).toBe('0.5rem');
  });

  it('the registered radius ramp is unchanged, which is the reason for the entry', () => {
    const { registrations } = parseStylesheet(GLOBALS_CSS);
    for (const [name, value] of Object.entries(RADIUS_RAMP)) {
      expect(registrations.get(name), `${name} in @theme inline`).toBe(value);
    }
  });
});

describe('the guard fails on a bad token (in memory, stylesheet never written)', () => {
  const withUnregistered = GLOBALS_CSS.replace(':root {', ':root {\n  --probe-unregistered: #000000;');
  const withRegistered = withUnregistered.replace(
    '@theme inline {',
    '@theme inline {\n  --color-probe-unregistered: var(--probe-unregistered);',
  );
  const withDangling = GLOBALS_CSS.replace(
    '@theme inline {',
    '@theme inline {\n  --color-probe-dangling: var(--probe-missing);',
  );

  it('both fixtures really mutated the source they were derived from', () => {
    expect(withUnregistered).not.toBe(GLOBALS_CSS);
    expect(withRegistered).not.toBe(withUnregistered);
    expect(withDangling).not.toBe(GLOBALS_CSS);
  });

  it('a :root token with no registration is reported by name', () => {
    expect(checkTokenRegistration(withUnregistered).unregistered).toEqual(['--probe-unregistered']);
  });

  it('registering that same token makes the guard pass again', () => {
    expect(checkTokenRegistration(withRegistered).unregistered).toEqual([]);
  });

  it('a registration pointing at nothing is reported by name, in the reverse direction', () => {
    expect(checkTokenRegistration(withDangling).dangling).toEqual(['--probe-missing']);
  });
});
